import { AlertTriangle, Check, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FORMAT_LABEL, toHHMM, toMin, todayISO, uid, type Booking, type Format } from './data';
import { checkConflicts, fullName, useStore } from './store';
import { Drawer, Field, money } from './ui';

export interface BookingDraft {
  id?: string;
  spaceId?: string;
  sportId?: string;
  date?: string;
  start?: string;
}

export function BookingDrawer({ draft, onClose }: { draft: BookingDraft | null; onClose: () => void }) {
  const { db, update, toast, sport: getSport } = useStore();
  const existing = draft?.id ? db.bookings.find((b) => b.id === draft.id) : undefined;

  const [b, setB] = useState<Booking | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!draft) return setB(null);
    if (existing) return setB(structuredClone(existing));
    const space = db.spaces.find((s) => s.id === draft.spaceId) ?? db.spaces[0];
    const sportId = draft.sportId && space.sports.includes(draft.sportId) ? draft.sportId : space.sports[0];
    const sport = getSport(sportId)!;
    const start = draft.start ?? '18:00';
    setB({
      id: uid(),
      spaceId: space.id,
      sportId,
      format: sport.formats[0],
      date: draft.date ?? todayISO(),
      start,
      end: toHHMM(toMin(start) + sport.slotMinutes),
      memberIds: [],
      status: 'confirmee',
      price: 0,
      paidWith: 'credits',
      isPublic: false,
      createdAt: todayISO(),
    });
    setQ('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const sport = b ? getSport(b.sportId) : undefined;
  const space = b ? db.spaces.find((s) => s.id === b.spaceId) : undefined;

  const price = useMemo(() => {
    if (!b || !sport) return 0;
    const slots = (toMin(b.end) - toMin(b.start)) / sport.slotMinutes;
    const unit = toMin(b.start) >= 17 * 60 ? sport.peakPricePerSlot : sport.pricePerSlot;
    return Math.max(0, Math.round(unit * slots));
  }, [b, sport]);

  const issues = b ? checkConflicts(db, b) : [];
  if (!b || !sport || !space) return null;

  const set = (patch: Partial<Booking>) => setB({ ...b, ...patch });
  const duration = toMin(b.end) - toMin(b.start);
  const durations = [sport.slotMinutes / 2, sport.slotMinutes, sport.slotMinutes * 1.5, sport.slotMinutes * 2].filter((d) => d >= 30);
  const players = db.members.filter((m) => m.role === 'joueur');
  const coaches = db.members.filter((m) => m.role === 'coach');
  const candidates = players
    .filter((m) => !b.memberIds.includes(m.id))
    .filter((m) => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 6);

  const changeSpace = (spaceId: string) => {
    const sp = db.spaces.find((s) => s.id === spaceId)!;
    const sportId = sp.sports.includes(b.sportId) ? b.sportId : sp.sports[0];
    const s = getSport(sportId)!;
    set({ spaceId, sportId, format: s.formats.includes(b.format) ? b.format : s.formats[0], end: toHHMM(toMin(b.start) + s.slotMinutes) });
  };
  const changeSport = (sportId: string) => {
    const s = getSport(sportId)!;
    set({ sportId, format: s.formats.includes(b.format) ? b.format : s.formats[0], end: toHHMM(toMin(b.start) + s.slotMinutes) });
  };

  const save = () => {
    const final: Booking = { ...b, price };
    update((d) => {
      const i = d.bookings.findIndex((x) => x.id === final.id);
      if (i >= 0) d.bookings[i] = final;
      else d.bookings.push(final);
      if (!existing && final.paidWith === 'credits') {
        final.memberIds.slice(0, 1).forEach((id) => {
          const m = d.members.find((x) => x.id === id);
          if (m) m.credits = Math.max(0, m.credits - sport.creditsPerSlot);
        });
      }
      return d;
    });
    toast(existing ? 'Réservation mise à jour' : 'Réservation créée');
    onClose();
  };

  const cancel = () => {
    update((d) => {
      const x = d.bookings.find((y) => y.id === b.id);
      if (x) x.status = 'annulee';
      return d;
    });
    toast('Réservation annulée');
    onClose();
  };

  return (
    <Drawer
      open={!!draft}
      onClose={onClose}
      title={existing ? 'Modifier la réservation' : 'Nouvelle réservation'}
      footer={
        <>
          {existing && existing.status !== 'annulee' && (
            <button className="btn btn-danger-ghost" onClick={cancel}>
              <Trash2 size={16} /> Annuler la résa
            </button>
          )}
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
          <button className="btn btn-primary" disabled={issues.length > 0 || b.memberIds.length === 0} onClick={save}>
            <Check size={16} /> {existing ? 'Enregistrer' : 'Confirmer'} · {money(price)}
          </button>
        </>
      }
    >
      <div className="grid2">
        <Field label="Espace">
          <select value={b.spaceId} onChange={(e) => changeSpace(e.target.value)}>
            {db.spaces.map((s) => (
              <option key={s.id} value={s.id} disabled={s.status === 'ferme'}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sport">
          <select value={b.sportId} onChange={(e) => changeSport(e.target.value)}>
            {space.sports.map((id) => (
              <option key={id} value={id}>
                {getSport(id)?.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Format">
        <div className="segmented">
          {sport.formats.map((f: Format) => (
            <button key={f} type="button" className={b.format === f ? 'active' : ''} onClick={() => set({ format: f })}>
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid3">
        <Field label="Date">
          <input type="date" value={b.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label="Début">
          <input type="time" step={900} value={b.start} onChange={(e) => set({ start: e.target.value, end: toHHMM(toMin(e.target.value) + duration) })} />
        </Field>
        <Field label="Fin">
          <input type="time" step={900} value={b.end} onChange={(e) => set({ end: e.target.value })} />
        </Field>
      </div>
      <div className="chips">
        {durations.map((d) => (
          <button key={d} type="button" className={`chip ${duration === d ? 'active' : ''}`} onClick={() => set({ end: toHHMM(toMin(b.start) + d) })}>
            {d >= 60 ? `${Math.floor(d / 60)}h${d % 60 ? String(d % 60).padStart(2, '0') : ''}` : `${d} min`}
          </button>
        ))}
      </div>

      {b.format === 'cours' && (
        <div className="grid2">
          <Field label="Coach">
            <select value={b.coachId ?? ''} onChange={(e) => set({ coachId: e.target.value || undefined })}>
              <option value="">—</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {fullName(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Intitulé">
            <input value={b.title ?? ''} placeholder="ex. Académie débutants" onChange={(e) => set({ title: e.target.value })} />
          </Field>
        </div>
      )}

      <Field label={`Participants (${b.memberIds.length} / ${sport.maxPlayers})`}>
        <div className="people">
          {b.memberIds.map((id, i) => {
            const m = db.members.find((x) => x.id === id);
            return (
              <span key={id} className="person">
                {i === 0 && <b className="owner">Titulaire</b>}
                {fullName(m)}
                {m && <small className="muted">{m.credits} cr.</small>}
                <button type="button" aria-label="Retirer" onClick={() => set({ memberIds: b.memberIds.filter((x) => x !== id) })}>
                  ×
                </button>
              </span>
            );
          })}
        </div>
        {b.memberIds.length < sport.maxPlayers && (
          <div className="search-pick">
            <div className="input-icon">
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ajouter un membre (nom, email)…" />
            </div>
            {q && (
              <ul>
                {candidates.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        set({ memberIds: [...b.memberIds, m.id] });
                        setQ('');
                      }}
                    >
                      {fullName(m)} <small className="muted">niv. {m.levels[b.sportId] ?? '—'} · {m.credits} cr.</small>
                    </button>
                  </li>
                ))}
                {candidates.length === 0 && <li className="muted pad">Aucun membre trouvé</li>}
              </ul>
            )}
          </div>
        )}
        {b.memberIds.length > 0 && b.memberIds.length < sport.minPlayers && (
          <small className="warn-text">
            {sport.name} : {sport.minPlayers} joueurs minimum. Activez « Match ouvert » pour compléter l'équipe.
          </small>
        )}
      </Field>

      <div className="grid2">
        <Field label="Paiement">
          <select value={b.paidWith} onChange={(e) => set({ paidWith: e.target.value as Booking['paidWith'] })}>
            <option value="credits">Crédits ({sport.creditsPerSlot} / créneau)</option>
            <option value="carte">Carte</option>
            <option value="especes">Espèces</option>
            <option value="non_paye">À encaisser</option>
          </select>
        </Field>
        <Field label="Visibilité">
          <label className="switch">
            <input type="checkbox" checked={b.isPublic} onChange={(e) => set({ isPublic: e.target.checked })} />
            <span>Match ouvert (visible dans l'app)</span>
          </label>
        </Field>
      </div>
      <Field label="Notes">
        <textarea rows={2} value={b.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
      </Field>

      {issues.length > 0 && (
        <div className="alert">
          <AlertTriangle size={16} />
          <ul>
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}
