import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Bell, CalendarDays, ChevronDown, ChevronsLeft, Command, LayoutDashboard, Luggage, Menu, Moon, Plane, Search, Settings, ShieldCheck, Sun, Ticket, UserRound, Users, Wallet, X, ArrowRight, Globe2, PlaneTakeoff } from 'lucide-react';
import { getDatabase } from './api/mock';
import { Dashboard } from './pages/Dashboard';
import { BookingWizard } from './pages/BookingWizard';
import { EntityPage } from './pages/Entities';
import { IconButton, Toast } from './components/ui';
import { BookingDetail, FlightDetail, PassengerDetail } from './pages/Details';
import type { AirportDatabase } from './types';

const navGroups = [
  { label:'WORKSPACE', items:[{path:'/',label:'Overview',icon:LayoutDashboard},{path:'/flights',label:'Flights',icon:Plane},{path:'/booking',label:'New booking',icon:Ticket},{path:'/bookings',label:'Bookings',icon:CalendarDays}] },
  { label:'DIRECTORY', items:[{path:'/passengers',label:'Passengers',icon:Users},{path:'/airports',label:'Airports',icon:Globe2},{path:'/fleet',label:'Airlines & fleet',icon:PlaneTakeoff},{path:'/crew',label:'Crew',icon:UserRound},{path:'/baggage',label:'Baggage',icon:Luggage}] },
  { label:'FINANCE & ADMIN', items:[{path:'/payments',label:'Payments',icon:Wallet},{path:'/staff',label:'Staff & roles',icon:ShieldCheck},{path:'/audit',label:'Audit log',icon:Activity}] }
];
const titles:Record<string,string>={'/':'Overview','/flights':'Flights','/booking':'New booking','/bookings':'Bookings','/passengers':'Passengers','/airports':'Airport network','/fleet':'Airlines & fleet','/crew':'Crew management','/baggage':'Baggage tracking','/payments':'Payments & revenue','/staff':'Staff & roles','/audit':'Audit log'};
const readPreference=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const savePreference=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* Storage may be disabled by the browser. */}};

export function App() {
  const [collapsed,setCollapsed]=useState(false); const [mobileOpen,setMobileOpen]=useState(false); const [dark,setDark]=useState(()=>readPreference('aeropulse.theme')==='dark');
  const [searchOpen,setSearchOpen]=useState(false); const [query,setQuery]=useState(''); const [noticeOpen,setNoticeOpen]=useState(false);
  const [toastMessage,setToastMessage]=useState(''); const [role,setRole]=useState<'admin'|'operations'|'agent'|'finance'>(()=>{const saved=readPreference('aeropulse.role');return saved==='operations'||saved==='agent'||saved==='finance'?saved:'admin'});
  const queryClient=useQueryClient(); const location=useLocation(); const navigate=useNavigate();
  const dbQuery=useQuery({queryKey:['airport-db'],queryFn:getDatabase,staleTime:30_000});
  const db=dbQuery.data as AirportDatabase|undefined;
  const sections=useMemo(()=>navGroups.flatMap(g=>g.items),[]);
  const filtered=sections.filter(x=>x.label.toLowerCase().includes(query.toLowerCase()));
  const recordMatches=useMemo(()=>{if(!db||query.trim().length<2)return [];const q=query.toLowerCase();return [
    ...db.flights.filter(f=>{const a=db.airlines.find(x=>x.airline_id===f.airline_id),o=db.airports.find(x=>x.airport_id===f.origin_airport_id),d=db.airports.find(x=>x.airport_id===f.destination_airport_id);return `${f.flight_number} ${a?.iata_code} ${o?.iata_code} ${d?.iata_code}`.toLowerCase().includes(q)}).slice(0,5).map(f=>({label:`${db.airlines.find(x=>x.airline_id===f.airline_id)?.iata_code} ${f.flight_number}`,detail:`${db.airports.find(x=>x.airport_id===f.origin_airport_id)?.iata_code} → ${db.airports.find(x=>x.airport_id===f.destination_airport_id)?.iata_code}`,path:`/flights/${f.flight_id}`})),
    ...db.passengers.filter(p=>`${p.first_name} ${p.last_name} ${p.email} ${p.passport_number??''}`.toLowerCase().includes(q)).slice(0,5).map(p=>({label:`${p.first_name} ${p.last_name}`,detail:p.email,path:`/passengers/${p.passenger_id}`})),
    ...db.bookings.filter(b=>b.booking_reference.toLowerCase().includes(q)).slice(0,5).map(b=>({label:b.booking_reference,detail:`Booking · ${b.status}`,path:`/bookings/${b.booking_id}`})),
    ...db.airports.filter(a=>`${a.iata_code} ${a.name} ${a.city}`.toLowerCase().includes(q)).slice(0,5).map(a=>({label:`${a.iata_code} · ${a.city}`,detail:'Airport',path:'/airports'}))
  ].slice(0,10)},[db,query]);
  const showToast=(text:string)=>{setToastMessage(text);window.setTimeout(()=>setToastMessage(''),3600)};
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearchOpen(v=>!v)}if(e.key==='Escape'){setSearchOpen(false);setNoticeOpen(false)}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
  useEffect(()=>{document.documentElement.classList.toggle('dark-theme',dark);savePreference('aeropulse.theme',dark?'dark':'light')},[dark]);
  useEffect(()=>{savePreference('aeropulse.role',role)},[role]);
  useEffect(()=>{setMobileOpen(false)},[location.pathname]);
  const go=(path:string)=>{navigate(path);setSearchOpen(false);setQuery('')};
  const pageTitle=titles[location.pathname]??'Overview';
  const roleAllowed=(path:string)=>role==='admin'||(role==='operations'?!['/payments','/staff'].includes(path):role==='agent'?['/','/flights','/booking','/bookings','/passengers','/airports','/baggage'].includes(path):['/','/bookings','/payments','/audit'].includes(path));
  useEffect(()=>{const base=location.pathname.split('/').filter(Boolean)[0];const path=base?`/${base}`:'/';if(path!=='/login'&&!roleAllowed(path))navigate('/unauthorized',{replace:true})},[location.pathname,role]);
  const shellClass=`app-shell ${collapsed?'sidebar-collapsed':''} ${mobileOpen?'mobile-nav-open':''}`;
  if(location.pathname==='/login')return <LoginPage/>;
  return <div className={shellClass}>
    <aside className="sidebar">
      <Link to="/" className="brand-lockup"><span className="brand-logo"><Plane size={19} fill="currentColor"/></span><span className="brand-name">aero<span>pulse</span><small>OPERATIONS</small></span></Link>
      <div className="workspace-switch"><div className="workspace-avatar">N</div><div className="workspace-copy"><b>Northstar Air</b><span>Enterprise plan</span></div><ChevronDown size={14}/></div>
      <nav className="side-nav" aria-label="Main navigation">{navGroups.map(group=><div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.filter(item=>roleAllowed(item.path)).map(item=>{const Icon=item.icon;const active=location.pathname===item.path;return <Link key={item.path} to={item.path} className={`nav-item ${active?'active':''}`} title={collapsed?item.label:undefined} aria-current={active?'page':undefined}><Icon size={18}/><span>{item.label}</span>{item.path==='/flights'&&<i className="nav-pulse"/>}</Link>})}</div>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-shine"/><div className="support-icon"><ShieldCheck size={16}/></div><b>Need a hand?</b><span>Our operations team is here for you.</span><button onClick={()=>showToast('Support center opened in a new workspace.')}>Visit help center <ArrowRight size={13}/></button></div><button className="sidebar-settings" onClick={()=>showToast('Workspace settings are ready to configure.')}><Settings size={17}/><span>Workspace settings</span></button><button className="collapse-button" aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setCollapsed(v=>!v)}><ChevronsLeft size={16}/></button></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileOpen(v=>!v)} aria-label="Open navigation">{mobileOpen?<X size={19}/>:<Menu size={19}/>}</button><div className="breadcrumbs"><span>Workspace</span><i>/</i><b>{pageTitle}</b></div><div className="topbar-actions"><button className="global-search" onClick={()=>setSearchOpen(true)}><Search size={16}/><span>Search anything...</span><kbd><Command size={11}/> K</kbd></button><div className="top-divider"/><div className="notice-anchor"><IconButton label="Notifications" onClick={()=>setNoticeOpen(v=>!v)}><Bell size={18}/><i className="notice-dot"/></IconButton>{noticeOpen&&<div className="notice-popover"><div className="popover-title"><b>Notifications</b><span>3 new</span></div><div className="notice-item"><span className="notice-icon amber"><Plane size={15}/></span><div><b>Flight delayed</b><small>AA303 is running 35 minutes late.</small><em>12 min ago</em></div></div><div className="notice-item"><span className="notice-icon blue"><Ticket size={15}/></span><div><b>New booking</b><small>Passenger added to BA202.</small><em>48 min ago</em></div></div><button className="popover-footer" onClick={()=>{setNoticeOpen(false);go('/audit')}}>View activity <ArrowRight size={13}/></button></div>}</div><IconButton label={dark?'Switch to light mode':'Switch to dark mode'} onClick={()=>setDark(v=>!v)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</IconButton><div className="top-divider"/><button className="profile-button" onClick={()=>setRole(current=>({admin:'operations',operations:'agent',agent:'finance',finance:'admin'} as const)[current])} title="Cycle demo role"><span className="profile-avatar">MC</span><span className="profile-text"><b>Morgan Chen</b><small>{role==='admin'?'Administrator':role.charAt(0).toUpperCase()+role.slice(1)}</small></span><ChevronDown size={14}/></button></div></header>
      <main className="content-area"><AnimatePresence mode="wait">{dbQuery.isLoading?<motion.div key="loading" className="loading-state" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><div className="skeleton skeleton-title"/><div className="skeleton-grid">{Array.from({length:5},(_,i)=><div className="skeleton skeleton-card" key={i}/>)}</div><div className="skeleton skeleton-wide"/></motion.div>:dbQuery.isError?<div className="error-state card"><div className="empty-art">!</div><h2>We couldn’t load your workspace.</h2><p>The demo data service returned an error. Try loading it again.</p><button className="button button-primary" onClick={()=>void dbQuery.refetch()}>Try again</button></div>:db&&<motion.div key={location.pathname} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.2}}><Routes>
        <Route path="/" element={<Dashboard db={db}/>}/>
        <Route path="/booking" element={<BookingWizard db={db} onToast={showToast} onComplete={()=>void queryClient.invalidateQueries({queryKey:['airport-db']})}/>}/>
        <Route path="/flights" element={<EntityPage section="flights" db={db} onToast={showToast}/>}/>
        <Route path="/flights/:id" element={<FlightDetail db={db} onToast={showToast}/>}/>
        <Route path="/bookings" element={<EntityPage section="bookings" db={db} onToast={showToast}/>}/>
        <Route path="/bookings/:id" element={<BookingDetail db={db} onToast={showToast}/>}/>
        <Route path="/passengers" element={<EntityPage section="passengers" db={db} onToast={showToast}/>}/>
        <Route path="/passengers/:id" element={<PassengerDetail db={db}/>}/>
        <Route path="/airports" element={<EntityPage section="airports" db={db} onToast={showToast}/>}/>
        <Route path="/fleet" element={<EntityPage section="fleet" db={db} onToast={showToast}/>}/>
        <Route path="/crew" element={<EntityPage section="crew" db={db} onToast={showToast}/>}/>
        <Route path="/baggage" element={<EntityPage section="baggage" db={db} onToast={showToast}/>}/>
        <Route path="/payments" element={<EntityPage section="payments" db={db} onToast={showToast}/>}/>
        <Route path="/staff" element={<EntityPage section="staff" db={db} onToast={showToast}/>}/>
        <Route path="/audit" element={<EntityPage section="audit" db={db} onToast={showToast}/>}/>
        <Route path="/unauthorized" element={<div className="page-stack"><h1>Access restricted</h1><p>Your current demo role cannot open this area. Switch roles from the profile menu.</p><button className="button button-light" onClick={()=>go('/')}>Return to overview</button></div>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes></motion.div>}</AnimatePresence></main>
      <footer className="app-footer"><span>© 2026 Aeropulse Operations</span><span><i className="footer-pulse"/> All systems operational</span><span>v1.0.0 · <button onClick={()=>showToast('Mock data layer active. Connect your REST API in src/api/mock.ts.')}>API status</button></span></footer>
    </div>
    {mobileOpen&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>}
    {searchOpen&&<div className="command-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSearchOpen(false)}}><div className="command-palette"><div className="command-input"><Search size={18}/><input autoFocus placeholder="Search pages and records..." value={query} onChange={e=>setQuery(e.target.value)}/><kbd>ESC</kbd></div>{recordMatches.length>0&&<><div className="command-label">RECORDS</div>{recordMatches.map((item,i)=><button className="command-result" key={`${item.path}-${i}`} onClick={()=>go(item.path)}><Search size={16}/><span>{item.label}<small className="command-detail">{item.detail}</small></span><kbd>↵</kbd></button>)}</>}<div className="command-label">PAGES</div>{filtered.map(item=>{const Icon=item.icon;return <button className="command-result" key={item.path} onClick={()=>go(item.path)}><Icon size={17}/><span>{item.label}</span><kbd>↵</kbd></button>})}{query&&!recordMatches.length&&filtered.length===0&&<div className="command-hint">No matching pages or records.</div>}<div className="command-foot"><span>Search records and pages</span><span>ESC to close</span></div></div></div>}
    {toastMessage&&<Toast message={toastMessage} onClose={()=>setToastMessage('')}/>}
  </div>;
}

export function LoginPage() {
  const navigate=useNavigate();
  return <div className="login-page"><div className="login-art"><Link to="/" className="brand-lockup"><span className="brand-logo"><Plane size={19} fill="currentColor"/></span><span className="brand-name">aero<span>pulse</span><small>OPERATIONS</small></span></Link><div className="login-visual"><div className="login-lines"/><div className="login-globe"><Globe2 size={210} strokeWidth={.5}/></div><div className="login-flight-line"><PlaneTakeoff size={24}/></div><div className="login-caption"><span>FLIGHT NETWORK · LIVE</span><b>Keep every journey<br/>moving forward.</b></div><div className="login-metric"><b>96.8%</b><small>On-time performance</small></div></div><div className="login-foot"><span>© Aeropulse Operations 2026</span><span>Security · Privacy</span></div></div><div className="login-form-side"><div className="login-form"><span className="welcome-kicker">WELCOME BACK</span><h1>Sign in to your<br/>workspace</h1><p>Enter your details to access the operations center.</p><label>WORK EMAIL<input type="email" defaultValue="morgan.chen@aeropulse.example"/></label><label>PASSWORD<div className="password-input"><input type="password" defaultValue="aeropulse-demo"/><a href="#forgot">Forgot password?</a></div></label><button className="button button-primary login-submit" onClick={()=>navigate('/')}>Sign in to Aeropulse <ArrowRight size={16}/></button><div className="login-separator"><span>or continue with</span></div><button className="sso-button" onClick={()=>navigate('/')}>◉ Continue with SSO</button><small className="login-help">Having trouble? <a href="#support">Contact your workspace admin</a></small></div></div></div>;
}
