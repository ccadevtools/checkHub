// Modèle de données CheckHub (multi-sport) + jeu de données de démonstration.

export type Format = 'match' | 'cours' | 'location' | 'tournoi';
export const FORMAT_LABEL: Record<Format, string> = {
  match: 'Match',
  cours: 'Cours',
  location: 'Location libre',
  tournoi: 'Tournoi',
};

export interface Sport {
  id: string;
  name: string;
  color: string;
  slotMinutes: number; // durée par défaut d'un créneau
  minPlayers: number;
  maxPlayers: number;
  formats: Format[];
  pricePerSlot: number; // TND, heures creuses
  peakPricePerSlot: number; // TND, heures pleines
  creditsPerSlot: number;
  active: boolean;
}

export type SpaceType = 'terrain' | 'salle' | 'studio' | 'bassin';
export const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  terrain: 'Terrain',
  salle: 'Salle',
  studio: 'Studio',
  bassin: 'Bassin',
};

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  sports: string[]; // ids
  capacity: number;
  open: string; // HH:MM
  close: string; // HH:MM
  indoor: boolean;
  status: 'ok' | 'maintenance' | 'ferme';
}

export type Role = 'joueur' | 'coach' | 'staff';
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  levels: Record<string, number>; // sportId -> niveau 1..10
  credits: number;
  status: 'actif' | 'inactif' | 'bloque';
  since: string; // ISO date
}

export type BookingStatus = 'confirmee' | 'en_attente' | 'annulee' | 'terminee';
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmee: 'Confirmée',
  en_attente: 'En attente',
  annulee: 'Annulée',
  terminee: 'Terminée',
};

export interface Booking {
  id: string;
  spaceId: string;
  sportId: string;
  format: Format;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
  memberIds: string[];
  coachId?: string;
  title?: string;
  status: BookingStatus;
  price: number;
  paidWith: 'credits' | 'especes' | 'carte' | 'non_paye';
  isPublic: boolean;
  notes?: string;
  createdAt: string;
}

export type WorkStatus = 'a_faire' | 'en_cours' | 'resolu';
export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  resolu: 'Résolu',
};
export type Priority = 'basse' | 'normale' | 'haute' | 'critique';

export interface WorkOrder {
  id: string;
  spaceId: string;
  kind: 'incident' | 'preventif';
  title: string;
  description: string;
  priority: Priority;
  status: WorkStatus;
  assignee: string;
  // Si renseigné, l'espace est bloqué dans le planning sur cette plage
  blockDate?: string;
  blockStart?: string;
  blockEnd?: string;
  cost?: number;
  createdAt: string;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  validityDays: number;
  sports: string[]; // vide = tous
  formats: Format[];
  audience: Role;
  active: boolean;
  sold: number;
}

// ---------------------------------------------------------------- utilitaires
export const uid = () => Math.random().toString(36).slice(2, 10);
export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
export const todayISO = () => isoDate(new Date());

// ---------------------------------------------------------------- démo
const sports: Sport[] = [
  { id: 'padel', name: 'Padel', color: '#22c55e', slotMinutes: 90, minPlayers: 2, maxPlayers: 4, formats: ['match', 'cours', 'tournoi'], pricePerSlot: 60, peakPricePerSlot: 80, creditsPerSlot: 1, active: true },
  { id: 'tennis', name: 'Tennis', color: '#f59e0b', slotMinutes: 60, minPlayers: 2, maxPlayers: 4, formats: ['match', 'cours', 'location'], pricePerSlot: 40, peakPricePerSlot: 55, creditsPerSlot: 1, active: true },
  { id: 'foot5', name: 'Foot à 5', color: '#3b82f6', slotMinutes: 60, minPlayers: 6, maxPlayers: 10, formats: ['match', 'location', 'tournoi'], pricePerSlot: 120, peakPricePerSlot: 160, creditsPerSlot: 2, active: true },
  { id: 'yoga', name: 'Yoga', color: '#a855f7', slotMinutes: 60, minPlayers: 1, maxPlayers: 12, formats: ['cours'], pricePerSlot: 25, peakPricePerSlot: 25, creditsPerSlot: 1, active: true },
  { id: 'pilates', name: 'Pilates', color: '#ec4899', slotMinutes: 60, minPlayers: 1, maxPlayers: 8, formats: ['cours'], pricePerSlot: 30, peakPricePerSlot: 30, creditsPerSlot: 1, active: true },
  { id: 'boxe', name: 'Boxe', color: '#ef4444', slotMinutes: 60, minPlayers: 1, maxPlayers: 10, formats: ['cours', 'location'], pricePerSlot: 25, peakPricePerSlot: 30, creditsPerSlot: 1, active: true },
];

const spaces: Space[] = [
  { id: 'p1', name: 'Padel 1', type: 'terrain', sports: ['padel'], capacity: 4, open: '07:00', close: '23:30', indoor: true, status: 'ok' },
  { id: 'p2', name: 'Padel 2', type: 'terrain', sports: ['padel'], capacity: 4, open: '07:00', close: '23:30', indoor: true, status: 'ok' },
  { id: 'p3', name: 'Padel 3', type: 'terrain', sports: ['padel'], capacity: 4, open: '07:00', close: '23:30', indoor: true, status: 'maintenance' },
  { id: 'p4', name: 'Padel 4', type: 'terrain', sports: ['padel'], capacity: 4, open: '07:00', close: '23:30', indoor: true, status: 'ok' },
  { id: 't1', name: 'Tennis Central', type: 'terrain', sports: ['tennis'], capacity: 4, open: '07:00', close: '22:00', indoor: false, status: 'ok' },
  { id: 'f1', name: 'Five A', type: 'terrain', sports: ['foot5'], capacity: 10, open: '09:00', close: '23:30', indoor: false, status: 'ok' },
  { id: 's1', name: 'Studio Zen', type: 'studio', sports: ['yoga', 'pilates'], capacity: 12, open: '07:00', close: '21:00', indoor: true, status: 'ok' },
  { id: 's2', name: 'Salle Combat', type: 'salle', sports: ['boxe'], capacity: 10, open: '08:00', close: '22:00', indoor: true, status: 'ok' },
];

const first = ['Youssef', 'Amine', 'Rim', 'Kais', 'Sana', 'Tarak', 'Ines', 'Mehdi', 'Nour', 'Farah', 'Skander', 'Meriem', 'Ahmed', 'Selima', 'Rami', 'Hela'];
const last = ['Ben Salem', 'Briki', 'Trabelsi', 'Letaief', 'Khamassi', 'Bouzguenda', 'Gharbi', 'Mzid', 'Allani', 'Jemaa', 'Kallel', 'Chemli', 'Fendri', 'Becheur', 'Ouali', 'Saidi'];

function makeMembers(): Member[] {
  const out: Member[] = [];
  for (let i = 0; i < 16; i++) {
    const role: Role = i < 12 ? 'joueur' : i < 15 ? 'coach' : 'staff';
    const levels: Record<string, number> = {};
    sports.forEach((s, j) => {
      if ((i + j) % 3 !== 0) levels[s.id] = ((i * 7 + j * 3) % 9) + 1;
    });
    out.push({
      id: 'm' + i,
      firstName: first[i],
      lastName: last[i],
      email: `${first[i].toLowerCase()}.${last[i].toLowerCase().replace(/\s/g, '')}@exemple.tn`,
      phone: `+216 ${20 + i} ${100 + i * 3} ${300 + i * 7}`,
      role,
      levels,
      credits: role === 'joueur' ? (i * 5) % 23 : 0,
      status: i === 9 ? 'inactif' : i === 11 ? 'bloque' : 'actif',
      since: addDays(todayISO(), -30 * (i + 1)),
    });
  }
  return out;
}

function makeBookings(): Booking[] {
  const t = todayISO();
  const b: Booking[] = [];
  const add = (dayOffset: number, spaceId: string, sportId: string, format: Format, start: string, dur: number, memberIds: string[], extra: Partial<Booking> = {}) => {
    const sport = sports.find((s) => s.id === sportId)!;
    const peak = toMin(start) >= 17 * 60;
    b.push({
      id: uid(),
      spaceId,
      sportId,
      format,
      date: addDays(t, dayOffset),
      start,
      end: toHHMM(toMin(start) + dur),
      memberIds,
      status: dayOffset < 0 ? 'terminee' : 'confirmee',
      price: peak ? sport.peakPricePerSlot : sport.pricePerSlot,
      paidWith: 'credits',
      isPublic: false,
      createdAt: addDays(t, dayOffset - 2),
      ...extra,
    });
  };
  for (const d of [-2, -1, 0, 1, 2, 3]) {
    add(d, 'p1', 'padel', 'match', '08:00', 90, ['m0', 'm1', 'm2', 'm3']);
    add(d, 'p1', 'padel', 'match', '18:30', 90, ['m4', 'm5', 'm6', 'm7'], { isPublic: d % 2 === 0 });
    add(d, 'p2', 'padel', 'cours', '10:00', 60, ['m8', 'm10'], { coachId: 'm12', title: 'Académie débutants' });
    add(d, 'p2', 'padel', 'match', '20:00', 90, ['m1', 'm3'], { status: d >= 0 ? 'en_attente' : 'terminee', isPublic: true, paidWith: 'non_paye' });
    add(d, 'p4', 'padel', 'match', '17:00', 90, ['m2', 'm6', 'm8', 'm0']);
    add(d, 't1', 'tennis', 'match', '09:00', 60, ['m5', 'm7']);
    add(d, 't1', 'tennis', 'cours', '17:00', 60, ['m10'], { coachId: 'm13', title: 'Cours particulier' });
    add(d, 'f1', 'foot5', 'location', '19:00', 60, ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm10'], { paidWith: 'especes' });
    add(d, 'f1', 'foot5', 'match', '21:00', 60, ['m4', 'm5', 'm6', 'm7', 'm8', 'm10']);
    add(d, 's1', 'yoga', 'cours', '08:00', 60, ['m1', 'm3', 'm5', 'm7', 'm9'], { coachId: 'm14', title: 'Yoga Vinyasa' });
    add(d, 's1', 'pilates', 'cours', '18:00', 60, ['m2', 'm4', 'm6'], { coachId: 'm14', title: 'Pilates sol' });
    add(d, 's2', 'boxe', 'cours', '19:00', 60, ['m0', 'm8', 'm10'], { coachId: 'm13', title: 'Boxe fitness' });
  }
  add(1, 'p4', 'padel', 'match', '12:00', 90, ['m6'], { status: 'annulee' });
  add(0, 't1', 'tennis', 'match', '19:00', 60, ['m3'], { status: 'annulee' });
  return b;
}

const workOrders = (): WorkOrder[] => {
  const t = todayISO();
  return [
    { id: uid(), spaceId: 'p3', kind: 'incident', title: 'Vitre arrière fissurée', description: 'Signalée par un joueur après le match de 20h. Zone sécurisée, terrain fermé.', priority: 'critique', status: 'en_cours', assignee: 'Équipe technique', blockDate: t, blockStart: '07:00', blockEnd: '23:30', cost: 1800, createdAt: addDays(t, -1) },
    { id: uid(), spaceId: 'p1', kind: 'preventif', title: 'Brossage et sablage du gazon', description: 'Entretien mensuel du gazon synthétique.', priority: 'normale', status: 'a_faire', assignee: 'Équipe technique', blockDate: addDays(t, 1), blockStart: '07:00', blockEnd: '08:00', cost: 150, createdAt: addDays(t, -5) },
    { id: uid(), spaceId: 't1', kind: 'incident', title: 'Projecteur nord défaillant', description: 'Deux spots éteints côté nord, gênant après 19h.', priority: 'haute', status: 'a_faire', assignee: 'Électricien', createdAt: t },
    { id: uid(), spaceId: 's1', kind: 'preventif', title: 'Désinfection des tapis', description: 'Hebdomadaire.', priority: 'basse', status: 'resolu', assignee: 'Ménage', cost: 40, createdAt: addDays(t, -3) },
    { id: uid(), spaceId: 'f1', kind: 'incident', title: 'Filet de but déchiré', description: 'But côté parking.', priority: 'normale', status: 'a_faire', assignee: 'Accueil', createdAt: addDays(t, -2) },
  ];
};

const offers: Offer[] = [
  { id: 'o1', name: 'Pass Découverte', description: '1 crédit, valable sur tous les sports.', credits: 1, price: 30, validityDays: 30, sports: [], formats: ['match', 'cours', 'location'], audience: 'joueur', active: true, sold: 42 },
  { id: 'o2', name: 'Carnet Padel 10', description: '10 matchs de padel.', credits: 10, price: 280, validityDays: 180, sports: ['padel'], formats: ['match'], audience: 'joueur', active: true, sold: 18 },
  { id: 'o3', name: 'Studio Illimité', description: 'Yoga et Pilates, 20 séances par mois.', credits: 20, price: 150, validityDays: 30, sports: ['yoga', 'pilates'], formats: ['cours'], audience: 'joueur', active: true, sold: 11 },
  { id: 'o4', name: 'Multi-sport 25', description: '25 crédits, tous les sports et tous les formats.', credits: 25, price: 550, validityDays: 365, sports: [], formats: ['match', 'cours', 'location'], audience: 'joueur', active: true, sold: 7 },
  { id: 'o5', name: 'Pack Coach', description: 'Réservation de terrains pour les cours particuliers.', credits: 8, price: 70, validityDays: 30, sports: ['padel', 'tennis'], formats: ['cours'], audience: 'coach', active: true, sold: 4 },
];

export interface DB {
  version: number;
  sports: Sport[];
  spaces: Space[];
  members: Member[];
  bookings: Booking[];
  workOrders: WorkOrder[];
  offers: Offer[];
}

export const DB_VERSION = 1;
export const seed = (): DB => ({
  version: DB_VERSION,
  sports,
  spaces,
  members: makeMembers(),
  bookings: makeBookings(),
  workOrders: workOrders(),
  offers,
});
