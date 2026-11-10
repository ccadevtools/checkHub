import { ChevronLeft, ChevronRight, Plus, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, FORMAT_LABEL, SPACE_TYPE_LABEL, toHHMM, toMin, todayISO } from '../data';
import { checkConflicts, fullName, useStore } from '../store';
import { frDate, PageHeader } from '../ui';
import type { BookingDraft } from '../BookingDrawer';

const PX_PER_MIN = 1; // 60px par heure
const SNAP = 15;

export function Planning({ openBooking }: { openBooking: (d: BookingDraft) => void }) {
  const { db, update, toast, sport, member, space: getSpace } = useStore();
  const [date, setDate] = useState(todayISO());
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [dragId, setDragId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const spaces = db.spaces.filter((s) => !sportFilter || s.sports.includes(sportFilter));
  const dayStart = Math.min(...db.spaces.map((s) => toMin(s.open)));
  const dayEnd = Math.max(...db.spaces.map((s) => toMin(s.close)));
  const hours: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m < dayEnd; m += 60) hours.push(m);

  const bookings = db.bookings.filter((b) => b.date === date && b.status !== 'annulee');
  const blocks = db.workOrders.filter((w) => w.blockDate === date && w.status !== 'resolu' && w.blockStart && w.blockEnd);

  // Défilement initial vers l'heure courante
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = date === todayISO() ? now.getHours() * 60 - dayStart - 90 : 0;
    el.scrollTop = Math.max(0, target * PX_PER_MIN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const stats = useMemo(() => {
    let open = 0;
    let used = 0;
    spaces.forEach((s) => {
      if (s.status === 'ferme') return;
      open += toMin(s.close) - toMin(s.open);
    });
    bookings.filter((b) => spaces.some((s) => s.id === b.spaceId)).forEach((b) => (used += toMin(b.end) - toMin(b.start)));
    return { open, used, rate: open ? Math.round((used / open) * 100) : 0 };
  }, [spaces, bookings]);

  const minuteFromEvent = (e: React.MouseEvent | React.DragEvent, el: HTMLElement) => {
    const y = e.clientY - el.getBoundingClientRect().top;
    return dayStart + Math.floor(y / PX_PER_MIN / SNAP) * SNAP;
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, spaceId: string) => {
    e.preventDefault();
    const id = dragId;
    setDragId(null);
    const b = db.bookings.find((x) => x.id === id);
    if (!b) return;
    const startMin = minuteFromEvent(e, e.currentTarget);
    const dur = toMin(b.end) - toMin(b.start);
    const sp = getSpace(spaceId)!;
    const moved = {
      ...b,
      spaceId,
      date,
      sportId: sp.sports.includes(b.sportId) ? b.sportId : sp.sports[0],
      start: toHHMM(startMin),
      end: toHHMM(startMin + dur),
    };
    const issues = checkConflicts(db, moved);
    if (issues.length) return toast('Déplacement impossible : ' + issues[0]);
    update((d) => {
      d.bookings = d.bookings.map((x) => (x.id === moved.id ? moved : x));
      return d;
    });
    toast(`Déplacée sur ${sp.name} à ${moved.start}`);
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <>
      <PageHeader
        title="Planning"
        subtitle="Tous les espaces et tous les sports sur une seule grille. Cliquez sur un créneau libre pour réserver, faites glisser une réservation pour la déplacer."
        actions={
          <button className="btn btn-primary" onClick={() => openBooking({ date, sportId: sportFilter ?? undefined, spaceId: spaces[0]?.id })}>
            <Plus size={16} /> Réserver
          </button>
        }
      />

      <div className="toolbar card">
        <div className="row gap">
          <button className="icon-btn" aria-label="Jour précédent" onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft size={18} />
          </button>
          <strong className="date-title">{frDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
          <button className="icon-btn" aria-label="Jour suivant" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight size={18} />
          </button>
          <button className="btn btn-ghost sm" onClick={() => setDate(todayISO())} disabled={date === todayISO()}>
            Aujourd'hui
          </button>
          <input type="date" className="sm" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div className="chips">
          <button className={`chip ${!sportFilter ? 'active' : ''}`} onClick={() => setSportFilter(null)}>
            Tous les sports
          </button>
          {db.sports
            .filter((s) => s.active)
            .map((s) => (
              <button key={s.id} className={`chip ${sportFilter === s.id ? 'active' : ''}`} style={{ ['--c' as string]: s.color }} onClick={() => setSportFilter(sportFilter === s.id ? null : s.id)}>
                <i className="dot" /> {s.name}
              </button>
            ))}
        </div>
        <div className="occupancy" title="Minutes réservées / minutes d'ouverture">
          <span>Occupation</span>
          <div className="bar">
            <div style={{ width: stats.rate + '%' }} />
          </div>
          <b>{stats.rate}%</b>
        </div>
      </div>

      <div className="planning card">
        <div className="planning-scroll" ref={scroller}>
          <div className="planning-grid" style={{ gridTemplateColumns: `64px repeat(${spaces.length}, minmax(150px, 1fr))` }}>
            {/* En-têtes */}
            <div className="pl-head pl-corner" />
            {spaces.map((s) => (
              <div key={s.id} className="pl-head">
                <strong>{s.name}</strong>
                <small className="muted">
                  {SPACE_TYPE_LABEL[s.type]} · {s.open}–{s.close}
                </small>
                <div className="row gap-xs">
                  {s.sports.map((id) => (
                    <i key={id} className="dot" style={{ ['--c' as string]: sport(id)?.color }} title={sport(id)?.name} />
                  ))}
                  {s.status !== 'ok' && <span className="badge badge-warn">{s.status === 'maintenance' ? 'Maintenance' : 'Fermé'}</span>}
                </div>
              </div>
            ))}

            {/* Axe horaire */}
            <div className="pl-axis" style={{ height: (dayEnd - dayStart) * PX_PER_MIN }}>
              {hours.map((h) => (
                <span key={h} style={{ top: (h - dayStart) * PX_PER_MIN }}>
                  {toHHMM(h)}
                </span>
              ))}
            </div>

            {/* Colonnes */}
            {spaces.map((s) => (
              <div
                key={s.id}
                className="pl-col"
                style={{ height: (dayEnd - dayStart) * PX_PER_MIN }}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const m = minuteFromEvent(e, e.currentTarget);
                  openBooking({ spaceId: s.id, date, start: toHHMM(Math.max(m, toMin(s.open))), sportId: sportFilter ?? undefined });
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, s.id)}
              >
                {hours.map((h) => (
                  <div key={h} className="pl-hour" style={{ top: (h - dayStart) * PX_PER_MIN }} />
                ))}
                <div className="pl-closed" style={{ top: 0, height: (toMin(s.open) - dayStart) * PX_PER_MIN }} />
                <div className="pl-closed" style={{ top: (toMin(s.close) - dayStart) * PX_PER_MIN, bottom: 0 }} />

                {blocks
                  .filter((w) => w.spaceId === s.id)
                  .map((w) => (
                    <div key={w.id} className="pl-block" style={{ top: (toMin(w.blockStart!) - dayStart) * PX_PER_MIN, height: (toMin(w.blockEnd!) - toMin(w.blockStart!)) * PX_PER_MIN }} title={w.description}>
                      <Wrench size={13} /> {w.title}
                    </div>
                  ))}

                {bookings
                  .filter((b) => b.spaceId === s.id)
                  .map((b) => {
                    const sp = sport(b.sportId);
                    const h = (toMin(b.end) - toMin(b.start)) * PX_PER_MIN;
                    const owner = member(b.memberIds[0]);
                    return (
                      <button
                        key={b.id}
                        draggable
                        onDragStart={() => setDragId(b.id)}
                        onDragEnd={() => setDragId(null)}
                        className={`pl-booking ${b.status === 'en_attente' ? 'pending' : ''} ${dragId === b.id ? 'dragging' : ''}`}
                        style={{ top: (toMin(b.start) - dayStart) * PX_PER_MIN, height: h, ['--c' as string]: sp?.color }}
                        onClick={() => openBooking({ id: b.id })}
                      >
                        <span className="pl-time">
                          {b.start}–{b.end}
                        </span>
                        <strong>{b.title || `${FORMAT_LABEL[b.format]} ${sp?.name}`}</strong>
                        {h > 50 && (
                          <small>
                            {fullName(owner)}
                            {b.memberIds.length > 1 && ` +${b.memberIds.length - 1}`} · {b.memberIds.length}/{sp?.maxPlayers}
                          </small>
                        )}
                        {b.isPublic && <span className="pl-flag">Ouvert</span>}
                      </button>
                    );
                  })}

                {date === todayISO() && nowMin > dayStart && nowMin < dayEnd && <div className="pl-now" style={{ top: (nowMin - dayStart) * PX_PER_MIN }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
