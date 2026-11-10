import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DB_VERSION, seed, toMin, type Booking, type DB, type Member, type Space, type Sport } from './data';

const KEY = 'checkhub-db';

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const db = JSON.parse(raw) as DB;
      if (db.version === DB_VERSION) return db;
    }
  } catch {
    /* stockage indisponible : on repart du jeu de démo */
  }
  return seed();
}

interface Store {
  db: DB;
  update: (fn: (db: DB) => DB) => void;
  reset: () => void;
  sport: (id: string) => Sport | undefined;
  space: (id: string) => Space | undefined;
  member: (id: string) => Member | undefined;
  toast: (msg: string) => void;
  toastMsg: string | null;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [toastMsg, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }, [db]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const value = useMemo<Store>(() => {
    const sportMap = new Map(db.sports.map((s) => [s.id, s]));
    const spaceMap = new Map(db.spaces.map((s) => [s.id, s]));
    const memberMap = new Map(db.members.map((m) => [m.id, m]));
    return {
      db,
      update: (fn) => setDb((d) => fn(structuredClone(d))),
      reset: () => setDb(seed()),
      sport: (id) => sportMap.get(id),
      space: (id) => spaceMap.get(id),
      member: (id) => memberMap.get(id),
      toast: setToast,
      toastMsg,
    };
  }, [db, toastMsg]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore hors StoreProvider');
  return s;
}

export const fullName = (m?: Member) => (m ? `${m.firstName} ${m.lastName}` : '—');

const overlaps = (aS: string, aE: string, bS: string, bE: string) =>
  toMin(aS) < toMin(bE) && toMin(bS) < toMin(aE);

/** Retourne la liste des problèmes empêchant de placer la réservation. */
export function checkConflicts(db: DB, b: Pick<Booking, 'id' | 'spaceId' | 'sportId' | 'date' | 'start' | 'end' | 'memberIds'>): string[] {
  const issues: string[] = [];
  const space = db.spaces.find((s) => s.id === b.spaceId);
  const sport = db.sports.find((s) => s.id === b.sportId);
  if (!space) return ['Espace introuvable'];
  if (toMin(b.end) <= toMin(b.start)) issues.push("L'heure de fin doit être après l'heure de début.");
  if (space.status === 'ferme') issues.push(`${space.name} est fermé.`);
  if (sport && !space.sports.includes(sport.id)) issues.push(`${space.name} n'accueille pas le ${sport.name}.`);
  if (toMin(b.start) < toMin(space.open) || toMin(b.end) > toMin(space.close))
    issues.push(`Hors horaires d'ouverture (${space.open} – ${space.close}).`);
  if (sport && b.memberIds.length > sport.maxPlayers)
    issues.push(`${sport.name} : ${sport.maxPlayers} participants maximum.`);
  const clash = db.bookings.find(
    (o) => o.id !== b.id && o.spaceId === b.spaceId && o.date === b.date && o.status !== 'annulee' && overlaps(o.start, o.end, b.start, b.end),
  );
  if (clash) issues.push(`Chevauche une réservation existante (${clash.start} – ${clash.end}).`);
  const block = db.workOrders.find(
    (w) => w.spaceId === b.spaceId && w.status !== 'resolu' && w.blockDate === b.date && w.blockStart && w.blockEnd && overlaps(w.blockStart, w.blockEnd, b.start, b.end),
  );
  if (block) issues.push(`Créneau bloqué par une intervention : « ${block.title} ».`);
  return issues;
}
