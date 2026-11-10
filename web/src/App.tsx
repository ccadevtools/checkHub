import { Building2, CalendarDays, Command, LayoutDashboard, ListChecks, Menu, Moon, Plus, Search, Sun, Tags, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookingDrawer, type BookingDraft } from './BookingDrawer';
import { Dashboard } from './pages/Dashboard';
import { Installations } from './pages/Installations';
import { Membres } from './pages/Membres';
import { Offres } from './pages/Offres';
import { Planning } from './pages/Planning';
import { Reservations } from './pages/Reservations';
import { Sports } from './pages/Sports';
import { fullName, StoreProvider, useStore } from './store';

export type Page = 'dashboard' | 'planning' | 'reservations' | 'membres' | 'installations' | 'offres' | 'sports';

const NAV: { id: Page; label: string; icon: ReactNode; group: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={18} />, group: 'Pilotage' },
  { id: 'planning', label: 'Planning', icon: <CalendarDays size={18} />, group: 'Exploitation' },
  { id: 'reservations', label: 'Réservations', icon: <ListChecks size={18} />, group: 'Exploitation' },
  { id: 'membres', label: 'Membres', icon: <Users size={18} />, group: 'Exploitation' },
  { id: 'installations', label: 'Installations', icon: <Building2 size={18} />, group: 'Facility' },
  { id: 'offres', label: 'Offres', icon: <Tags size={18} />, group: 'Commercial' },
  { id: 'sports', label: 'Sports', icon: <Trophy size={18} />, group: 'Configuration' },
];

const readPage = (): Page => {
  const h = location.hash.slice(1) as Page;
  return NAV.some((n) => n.id === h) ? h : 'dashboard';
};

function Shell() {
  const { db, toastMsg } = useStore();
  const [page, setPage] = useState<Page>(readPage);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [palette, setPalette] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('checkhub-theme') as 'light' | 'dark') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('checkhub-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const onHash = () => setPage(readPage());
    window.addEventListener('hashchange', onHash);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const go = (p: Page) => {
    location.hash = p;
    setPage(p);
    setNavOpen(false);
  };

  const pendingCount = db.bookings.filter((b) => b.status === 'en_attente').length;
  const woCount = db.workOrders.filter((w) => w.status !== 'resolu').length;
  const badge: Partial<Record<Page, number>> = { reservations: pendingCount, installations: woCount };

  return (
    <div className={`app ${navOpen ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">✓</span> CheckHub
        </div>
        <button className="search-btn" onClick={() => setPalette(true)}>
          <Search size={15} /> Rechercher… <kbd>Ctrl K</kbd>
        </button>
        <nav>
          {NAV.map((n, i) => {
            const head = i === 0 || NAV[i - 1].group !== n.group ? n.group : null;
            return (
              <div key={n.id}>
                {head && <div className="nav-group">{head}</div>}
                <button className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => go(n.id)}>
                  {n.icon}
                  <span className="grow">{n.label}</span>
                  {badge[n.id] ? <span className="nav-badge">{badge[n.id]}</span> : null}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} {theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          </button>
          <small className="muted">Prototype · données de démo</small>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} />

      <main>
        <div className="topbar">
          <button className="icon-btn mobile-only" aria-label="Menu" onClick={() => setNavOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="grow" />
          <button className="btn btn-primary sm" onClick={() => setDraft({})}>
            <Plus size={15} /> Réservation rapide
          </button>
        </div>
        <div className="content">
          {page === 'dashboard' && <Dashboard go={go} openBooking={setDraft} />}
          {page === 'planning' && <Planning openBooking={setDraft} />}
          {page === 'reservations' && <Reservations openBooking={setDraft} />}
          {page === 'membres' && <Membres />}
          {page === 'installations' && <Installations />}
          {page === 'offres' && <Offres />}
          {page === 'sports' && <Sports />}
        </div>
      </main>

      <BookingDrawer draft={draft} onClose={() => setDraft(null)} />
      {palette && <Palette onClose={() => setPalette(false)} go={go} openBooking={setDraft} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}

function Palette({ onClose, go, openBooking }: { onClose: () => void; go: (p: Page) => void; openBooking: (d: BookingDraft) => void }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  const items = useMemo(() => {
    const all: { label: string; hint: string; run: () => void }[] = [
      { label: 'Nouvelle réservation', hint: 'Action', run: () => openBooking({}) },
      ...NAV.map((n) => ({ label: n.label, hint: 'Aller à', run: () => go(n.id) })),
      ...db.members.map((m) => ({ label: fullName(m), hint: `Membre · ${m.email}`, run: () => go('membres') })),
      ...db.spaces.map((s) => ({ label: s.name, hint: 'Espace · réserver', run: () => openBooking({ spaceId: s.id }) })),
    ];
    const f = q.toLowerCase();
    return all.filter((i) => (i.label + ' ' + i.hint).toLowerCase().includes(f)).slice(0, 8);
  }, [q, db, go, openBooking]);

  const run = (i: number) => {
    items[i]?.run();
    onClose();
  };

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Palette de commandes">
        <div className="input-icon big">
          <Command size={16} />
          <input
            autoFocus
            value={q}
            placeholder="Aller à une page, chercher un membre, réserver un espace…"
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setIdx((i) => Math.min(items.length - 1, i + 1));
              else if (e.key === 'ArrowUp') setIdx((i) => Math.max(0, i - 1));
              else if (e.key === 'Enter') run(idx);
              else if (e.key === 'Escape') onClose();
            }}
          />
        </div>
        <ul>
          {items.map((it, i) => (
            <li key={it.label + it.hint}>
              <button className={i === idx ? 'active' : ''} onMouseEnter={() => setIdx(i)} onClick={() => run(i)}>
                <span>{it.label}</span>
                <small className="muted">{it.hint}</small>
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="muted pad">Aucun résultat</li>}
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
