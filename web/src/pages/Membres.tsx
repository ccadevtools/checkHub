import { Minus, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { todayISO, uid, type Member, type Role } from '../data';
import { fullName, useStore } from '../store';
import { Badge, Drawer, Field, frDate, Initials, PageHeader, Tabs } from '../ui';

const ROLE_LABEL: Record<Role, string> = { joueur: 'Joueurs', coach: 'Coachs', staff: 'Personnel' };

export function Membres() {
  const { db, update, toast, sport } = useStore();
  const offers = db.offers;
  const [role, setRole] = useState<Role>('joueur');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [edit, setEdit] = useState<Member | null>(null);
  const [sellOffer, setSellOffer] = useState('');

  const rows = db.members
    .filter((m) => m.role === role)
    .filter((m) => !status || m.status === status)
    .filter((m) => `${m.firstName} ${m.lastName} ${m.email} ${m.phone}`.toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    if (!edit) return;
    if (!edit.firstName.trim() || !edit.email.includes('@')) return toast('Prénom et email valides requis');
    update((d) => {
      const i = d.members.findIndex((m) => m.id === edit.id);
      if (i >= 0) d.members[i] = edit;
      else d.members.push(edit);
      return d;
    });
    toast('Membre enregistré');
    setEdit(null);
  };

  const sell = () => {
    const o = offers.find((x) => x.id === sellOffer);
    if (!o || !edit) return;
    setEdit({ ...edit, credits: edit.credits + o.credits });
    update((d) => {
      const x = d.offers.find((y) => y.id === o.id);
      if (x) x.sold += 1;
      return d;
    });
    toast(`${o.name} vendu : +${o.credits} crédits (pensez à enregistrer)`);
    setSellOffer('');
  };

  const history = edit ? db.bookings.filter((b) => b.memberIds.includes(edit.id) || b.coachId === edit.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6) : [];

  return (
    <>
      <PageHeader
        title="Membres"
        subtitle="Joueurs, coachs et personnel. Le niveau est suivi pour chaque sport."
        actions={
          <button className="btn btn-primary" onClick={() => setEdit({ id: uid(), firstName: '', lastName: '', email: '', phone: '', role, levels: {}, credits: 0, status: 'actif', since: todayISO() })}>
            <Plus size={16} /> Nouveau membre
          </button>
        }
      />
      <div className="card">
        <div className="table-tools">
          <Tabs value={role} onChange={setRole} items={(['joueur', 'coach', 'staff'] as Role[]).map((r) => ({ id: r, label: ROLE_LABEL[r], count: db.members.filter((m) => m.role === r).length }))} />
          <div className="row gap">
            <div className="input-icon">
              <Search size={15} />
              <input placeholder="Nom, email, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
              <option value="bloque">Bloqués</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Membre</th>
                <th>Contact</th>
                <th>Niveaux par sport</th>
                {role === 'joueur' && <th className="num">Crédits</th>}
                <th>Statut</th>
                <th>Membre depuis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => setEdit(structuredClone(m))}>
                  <td>
                    <span className="row gap-xs">
                      <Initials first={m.firstName} last={m.lastName} />
                      <strong>{fullName(m)}</strong>
                    </span>
                  </td>
                  <td>
                    <div>{m.email}</div>
                    <small className="muted">{m.phone}</small>
                  </td>
                  <td>
                    <div className="row gap-xs wrap">
                      {Object.entries(m.levels).map(([sid, lvl]) => (
                        <span key={sid} className="level" style={{ ['--c' as string]: sport(sid)?.color }}>
                          {sport(sid)?.name} <b>{lvl}</b>
                        </span>
                      ))}
                    </div>
                  </td>
                  {role === 'joueur' && <td className={`num ${m.credits <= 2 ? 'c-bad' : ''}`}>{m.credits}</td>}
                  <td>
                    <Badge tone={m.status === 'actif' ? 'ok' : m.status === 'inactif' ? 'neutral' : 'bad'}>{m.status}</Badge>
                  </td>
                  <td>{frDate(m.since, { month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer
        open={!!edit}
        title={edit?.firstName ? fullName(edit) : 'Nouveau membre'}
        onClose={() => setEdit(null)}
        footer={
          <>
            <span className="grow" />
            <button className="btn btn-ghost" onClick={() => setEdit(null)}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={save}>
              Enregistrer
            </button>
          </>
        }
      >
        {edit && (
          <>
            <div className="grid2">
              <Field label="Prénom">
                <input value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} />
              </Field>
              <Field label="Nom">
                <input value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              </Field>
              <Field label="Téléphone">
                <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </Field>
              <Field label="Rôle">
                <select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}>
                  <option value="joueur">Joueur</option>
                  <option value="coach">Coach</option>
                  <option value="staff">Personnel</option>
                </select>
              </Field>
              <Field label="Statut">
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Member['status'] })}>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="bloque">Bloqué</option>
                </select>
              </Field>
            </div>

            <Field label="Niveau par sport (1 à 10)" hint="Laisser vide si le membre ne pratique pas ce sport.">
              <div className="levels-grid">
                {db.sports.map((s) => (
                  <label key={s.id} className="level-input" style={{ ['--c' as string]: s.color }}>
                    <span>
                      <i className="dot" /> {s.name}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      value={edit.levels[s.id] ?? ''}
                      onChange={(e) => {
                        const levels = { ...edit.levels };
                        if (e.target.value === '') delete levels[s.id];
                        else levels[s.id] = Math.min(10, Math.max(1, +e.target.value));
                        setEdit({ ...edit, levels });
                      }}
                    />
                  </label>
                ))}
              </div>
            </Field>

            {edit.role !== 'staff' && (
              <Field label="Portefeuille de crédits">
                <div className="wallet">
                  <button type="button" className="icon-btn" onClick={() => setEdit({ ...edit, credits: Math.max(0, edit.credits - 1) })} aria-label="Retirer un crédit">
                    <Minus size={16} />
                  </button>
                  <b>{edit.credits}</b>
                  <button type="button" className="icon-btn" onClick={() => setEdit({ ...edit, credits: edit.credits + 1 })} aria-label="Ajouter un crédit">
                    <Plus size={16} />
                  </button>
                  <select value={sellOffer} onChange={(e) => setSellOffer(e.target.value)}>
                    <option value="">Vendre une offre…</option>
                    {offers
                      .filter((o) => o.active && o.audience === (edit.role === 'coach' ? 'coach' : 'joueur'))
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} · {o.credits} cr. · {o.price} TND
                        </option>
                      ))}
                  </select>
                  <button type="button" className="btn btn-ghost sm" disabled={!sellOffer} onClick={sell}>
                    Encaisser
                  </button>
                </div>
              </Field>
            )}

            {history.length > 0 && (
              <Field label="Dernières activités">
                <ul className="list compact">
                  {history.map((b) => (
                    <li key={b.id} className="list-row static">
                      <i className="dot" style={{ ['--c' as string]: sport(b.sportId)?.color }} />
                      <span className="grow">
                        {frDate(b.date)} · {b.start} · {sport(b.sportId)?.name}
                      </span>
                      <Badge tone={b.status === 'annulee' ? 'bad' : 'neutral'}>{b.status}</Badge>
                    </li>
                  ))}
                </ul>
              </Field>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
