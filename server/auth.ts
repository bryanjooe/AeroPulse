import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.ts';

type Session = { email: string; role: 'admin'; exp: number };
const cookieName = 'aeropulse_session';
const b64 = (value: string) => Buffer.from(value).toString('base64url');
const signature = (payload: string) => createHmac('sha256', config.SESSION_SECRET).update(payload).digest('base64url');

function checkPassword(password: string): boolean {
  const [salt, expectedHex] = config.AUTH_PASSWORD_HASH.split(':');
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function authenticate(email: string, password: string): boolean {
  const given = Buffer.from(email.toLowerCase());
  const expected = Buffer.from(config.AUTH_EMAIL.toLowerCase());
  return given.length === expected.length && timingSafeEqual(given, expected) && checkPassword(password);
}

export function issueSession(email: string): string {
  const payload = b64(JSON.stringify({ email, role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 } satisfies Session));
  return `${payload}.${signature(payload)}`;
}

function sessionFromRequest(req: Request): Session | null {
  const raw = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!raw) return null;
  const [payload, signed] = raw.split('.');
  if (!payload || !signed) return null;
  const expected = Buffer.from(signature(payload)); const actual = Buffer.from(signed);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
    return session.exp > Date.now() && session.role === 'admin' ? session : null;
  } catch { return null; }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: config.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 * 1000 });
}
export function clearSessionCookie(res: Response): void { res.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', secure: config.NODE_ENV === 'production', path: '/' }); }
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = sessionFromRequest(req);
  if (!session) { res.status(401).json({ error: { code: 'unauthenticated', message: 'Sign in to continue.' } }); return; }
  res.locals.session = session;
  next();
}

export function requireSameOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('origin');
  if (origin) {
    const host = req.get('x-forwarded-host') ?? req.get('host');
    try {
      const parsed = new URL(origin);
      const configuredOrigins = config.APP_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
      const localDevOrigins = config.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : [];
      const trusted = [...configuredOrigins, ...localDevOrigins].some(value => {
        try { return new URL(value).origin === parsed.origin; } catch { return false; }
      });
      if (!trusted && (!host || parsed.host.toLowerCase() !== host.toLowerCase())) {
        res.status(403).json({ error: { code: 'bad_origin', message: 'Request origin is not allowed.' } }); return;
      }
    }
    catch { res.status(403).json({ error: { code: 'bad_origin', message: 'Request origin is not allowed.' } }); return; }
  }
  next();
}

export function loggedInUser(req: Request): Session | null { return sessionFromRequest(req); }
