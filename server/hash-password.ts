import { randomBytes, scryptSync } from 'node:crypto';

const stdin=process.stdin;const stdout=process.stdout;let password='';
stdout.write('New local admin password (minimum 12 characters): ');
stdin.setRawMode?.(true);stdin.resume();
stdin.on('data',chunk=>{for(const char of chunk.toString('utf8')){if(char==='\u0003'){stdout.write('\n');process.exit(1)}if(char==='\r'||char==='\n'){stdin.setRawMode?.(false);stdin.pause();stdout.write('\n');if(password.length<12){stdout.write('Password must be at least 12 characters.\n');process.exit(1)}const salt=randomBytes(16).toString('hex');const hash=scryptSync(password,salt,64).toString('hex');password='';stdout.write(`AUTH_PASSWORD_HASH=${salt}:${hash}\n`);process.exit(0)}if(char==="\u007f"){password=password.slice(0,-1);continue}password+=char}});
