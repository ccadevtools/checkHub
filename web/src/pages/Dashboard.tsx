import { AlertTriangle, ArrowRight, CalendarClock, Wrench } from 'lucide-react';
import { addDays, FORMAT_LABEL, toMin, todayISO } from '../data';
import { fullName, useStore } from '../store';
import { Badge, money, PageHeader, Stat } from '../ui';
import type { Page } from '../App';
import type { BookingDraft } from '../BookingDrawer';

export function Dashboard({ go, openBooking }: { go: (p: Page) => void; openBooking: (d: BookingDraft) => void }) {
  const { db, sport, space, member } = useStore();
  const today = todayISO();
  const todays = db.bookings.filter((b) => b.date === today && b.status !== 'annulee');
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const upcoming = todays.filter((b) => toMin(b.end) > nowMin).sort((a, b) => toMin(a.start) - toMin(b.start)).slice(0, 7);
  const revenue7 = db.bookings
    .filter((b) => b.status !== 'annulee' && b.date <= today && b.date > addDays(today, -7))
    .reduce((s, b) => s + b.price, 0);
  const offersRevenue = db.offers.reduce((s, o) => s + o.sold * o.price, 0);
  const openWO = db.workOrders.filter((w) => w.status !== 'resolu');
  const critical = openWO.filter((w) => w.priority === 'critique' || w.priority === 'haute');
  const pending = db.bookings.filter((b) => b.status === 'en_attente' && b.date >= today);
  const lowCredit = db.members.filter((m) => m.role === 'joueur' && m.status === 'actif' && m.credits <= 2);

  const bySport = db.sports
    .filter((s) => s.active)
    .map((s) => {
      const spaces = db.spaces.filter((sp) => sp.sports.includes(s.id) && sp.status !== 'ferme');
      const open = spaces.reduce((acc, sp) => acc + (toMin(sp.close) - toMin(sp.open)) / sp.sports.length, 0);
      const used = todays.filter((b) => b.sportId === s.id).reduce((acc, b) => acc + toMin(b.end) - toMin(b.start), 0);
      return { s, rate: open ? Math.min(100, Math.round((used / open) * 100)) : 0, count: todays.filter((b) => b.sportId === s.id).length };
    });

  const totalOpen = db.spaces.filter((s) => s.status !== 'ferme').reduce((a, s) => a + toMin(s.close) - toMin(s.open), 0);
  const totalUsed = todays.reduce((a, b) => a + toMin(b.end) - toMin(b.start), 0);

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />

      <div className="stats">
        <Stat label="Réservations aujourd'hui" value={todays.length} hint={`${pending.length} en attente de validation`} tone="info" />
        <Stat label="Occupation du jour" value={`${totalOpen ? Math.round((totalUsed / totalOpen) * 100) : 0}%`} hint={`${Math.round(totalUsed / 60)} h réservées sur ${Math.round(totalOpen / 60)} h ouvertes`} tone="ok" />
        <Stat label="CA réservations · 7 j" value={money(revenue7)} hint={`+ ${money(offersRevenue)} d'offres vendues`} />
        <Stat label="Interventions ouvertes" value={openWO.length} hint={`${critical.length} prioritaires`} tone={critical.length ? 'bad' : 'ok'} />
      </div>

      <div className="grid-dash">
        <section className="card">
          <div className="card-head">
            <h2>
              <CalendarClock size={18} /> Prochains créneaux
            </h2>
            <button className="btn btn-ghost sm" onClick={() => go('planning')}>
              Planning <ArrowRight size={14} />
            </button>
          </div>
          <ul className="list">
            {upcoming.map((b) => {
              const sp = sport(b.sportId);
              return (
                <li key={b.id}>
                  <button className="list-row" onClick={() => openBooking({ id: b.id })}>
                    <span className="time">{b.start}</span>
                    <i className="dot" style={{ ['--c' as string]: sp?.color }} />
                    <span className="grow">
                      <strong>{b.title || `${FORMAT_LABEL[b.format]} ${sp?.name}`}</strong>
                      <small className="muted">
                        {space(b.spaceId)?.name} · {fullName(member(b.memberIds[0]))}
                        {b.memberIds.length > 1 ? ` +${b.memberIds.length - 1}` : ''}
                      </small>
                    </span>
                    {b.status === 'en_attente' && <Badge tone="warn">En attente</Badge>}
                    {b.paidWith === 'non_paye' && <Badge tone="bad">À encaisser</Badge>}
                  </button>
                </li>
              );
            })}
            {upcoming.length === 0 && <li className="muted pad">Plus aucun créneau aujourd'hui.</li>}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Occupation par sport</h2>
          </div>
          <ul className="bars">
            {bySport.map(({ s, rate, count }) => (
              <li key={s.id}>
                <span className="bars-label">
                  <i className="dot" style={{ ['--c' as string]: s.color }} /> {s.name}
                </span>
                <div className="bar">
                  <div style={{ width: rate + '%', background: s.color }} />
                </div>
                <span className="bars-val">
                  {rate}% <small className="muted">· {count}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>
              <AlertTriangle size={18} /> À traiter
            </h2>
          </div>
          <ul className="list">
            {critical.map((w) => (
              <li key={w.id}>
                <button className="list-row" onClick={() => go('installations')}>
                  <Wrench size={16} className="c-bad" />
                  <span className="grow">
                    <strong>{w.title}</strong>
                    <small className="muted">
                      {space(w.spaceId)?.name} · {w.assignee}
                    </small>
                  </span>
                  <Badge tone={w.priority === 'critique' ? 'bad' : 'warn'}>{w.priority}</Badge>
                </button>
              </li>
            ))}
            {pending.length > 0 && (
              <li>
                <button className="list-row" onClick={() => go('reservations')}>
                  <CalendarClock size={16} className="c-warn" />
                  <span className="grow">
                    <strong>{pending.length} réservations en attente</strong>
                    <small className="muted">Matchs ouverts incomplets ou non payés</small>
                  </span>
                  <ArrowRight size={14} />
                </button>
              </li>
            )}
            {lowCredit.length > 0 && (
              <li>
                <button className="list-row" onClick={() => go('membres')}>
                  <span className="c-info">◎</span>
                  <span className="grow">
                    <strong>{lowCredit.length} membres avec 2 crédits ou moins</strong>
                    <small className="muted">À relancer pour un renouvellement</small>
                  </span>
                  <ArrowRight size={14} />
                </button>
              </li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
