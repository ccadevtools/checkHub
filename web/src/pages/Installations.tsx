import { ArrowLeft, ArrowRight, Plus, Wrench } from 'lucide-react';
import { useState } from 'react';
import { SPACE_TYPE_LABEL, todayISO, toMin, uid, WORK_STATUS_LABEL, type Priority, type Space, type SpaceType, type WorkOrder, type WorkStatus } from '../data';
import { checkConflicts, useStore } from '../store';
import { Badge, Drawer, Field, frDate, money, PageHeader, SportTag, Tabs } from '../ui';

const PRIO_TONE: Record<Priority, 'neutral' | 'info' | 'warn' | 'bad'> = { basse: 'neutral', normale: 'info', haute: 'warn', critique: 'bad' };
const STATUSES: WorkStatus[] = ['a_faire', 'en_cours', 'resolu'];

export function Installations() {
  const [tab, setTab] = useState<'espaces' | 'maintenance'>('espaces');
  const { db } = useStore();
  const open = db.workOrders.filter((w) => w.status !== 'resolu').length;
  return (
    <>
      <PageHeader title="Installations" subtitle="Les espaces (terrains, salles, studios) et leur maintenance. Une intervention bloque automatiquement le planning." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'espaces', label: 'Espaces', count: db.spaces.length },
          { id: 'maintenance', label: 'Maintenance & incidents', count: open },
        ]}
      />
      {tab === 'espaces' ? <Spaces /> : <Maintenance />}
    </>
  );
}

function Spaces() {
  const { db, update, toast, sport } = useStore();
  const [edit, setEdit] = useState<Space | null>(null);
  const today = todayISO();

  const save = () => {
    if (!edit) return;
    if (!edit.name.trim() || edit.sports.length === 0) return toast('Nom et au moins un sport requis');
    update((d) => {
      const i = d.spaces.findIndex((s) => s.id === edit.id);
      if (i >= 0) d.spaces[i] = edit;
      else d.spaces.push(edit);
      return d;
    });
    toast('Espace enregistré');
    setEdit(null);
  };

  return (
    <>
      <div className="row end mb">
        <button className="btn btn-primary" onClick={() => setEdit({ id: uid(), name: '', type: 'terrain', sports: [], capacity: 4, open: '08:00', close: '22:00', indoor: true, status: 'ok' })}>
          <Plus size={16} /> Ajouter un espace
        </button>
      </div>
      <div className="cards">
        {db.spaces.map((s) => {
          const books = db.bookings.filter((b) => b.spaceId === s.id && b.date === today && b.status !== 'annulee');
          const used = books.reduce((a, b) => a + toMin(b.end) - toMin(b.start), 0);
          const rate = Math.round((used / (toMin(s.close) - toMin(s.open))) * 100);
          const wos = db.workOrders.filter((w) => w.spaceId === s.id && w.status !== 'resolu');
          return (
            <button key={s.id} className="card space-card" onClick={() => setEdit(structuredClone(s))}>
              <div className="row between">
                <strong>{s.name}</strong>
                <Badge tone={s.status === 'ok' ? 'ok' : s.status === 'maintenance' ? 'warn' : 'bad'}>{s.status === 'ok' ? 'Disponible' : s.status === 'maintenance' ? 'Maintenance' : 'Fermé'}</Badge>
              </div>
              <small className="muted">
                {SPACE_TYPE_LABEL[s.type]} · {s.indoor ? 'Intérieur' : 'Extérieur'} · {s.capacity} pers. · {s.open}–{s.close}
              </small>
              <div className="row gap-xs wrap">
                {s.sports.map((id) => {
                  const sp = sport(id);
                  return sp ? <SportTag key={id} name={sp.name} color={sp.color} /> : null;
                })}
              </div>
              <div className="occupancy compact">
                <span>Aujourd'hui</span>
                <div className="bar">
                  <div style={{ width: rate + '%' }} />
                </div>
                <b>{rate}%</b>
              </div>
              {wos.length > 0 && (
                <small className="c-warn row gap-xs">
                  <Wrench size={13} /> {wos.length} intervention(s) ouverte(s)
                </small>
              )}
            </button>
          );
        })}
      </div>

      <Drawer
        open={!!edit}
        title={edit && db.spaces.some((s) => s.id === edit.id) ? `Modifier ${edit.name}` : 'Nouvel espace'}
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
              <Field label="Nom">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
              </Field>
              <Field label="Type">
                <select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as SpaceType })}>
                  {Object.entries(SPACE_TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Sports pratiqués" hint="Un espace peut accueillir plusieurs sports, par exemple un studio pour le yoga et le pilates.">
              <div className="chips">
                {db.sports.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip ${edit.sports.includes(s.id) ? 'active' : ''}`}
                    style={{ ['--c' as string]: s.color }}
                    onClick={() => setEdit({ ...edit, sports: edit.sports.includes(s.id) ? edit.sports.filter((x) => x !== s.id) : [...edit.sports, s.id] })}
                  >
                    <i className="dot" /> {s.name}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid3">
              <Field label="Ouverture">
                <input type="time" step={900} value={edit.open} onChange={(e) => setEdit({ ...edit, open: e.target.value })} />
              </Field>
              <Field label="Fermeture">
                <input type="time" step={900} value={edit.close} onChange={(e) => setEdit({ ...edit, close: e.target.value })} />
              </Field>
              <Field label="Capacité">
                <input type="number" min={1} value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: +e.target.value })} />
              </Field>
            </div>
            <div className="grid2">
              <Field label="Statut">
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Space['status'] })}>
                  <option value="ok">Disponible</option>
                  <option value="maintenance">Maintenance (réservable)</option>
                  <option value="ferme">Fermé (non réservable)</option>
                </select>
              </Field>
              <Field label="Environnement">
                <label className="switch">
                  <input type="checkbox" checked={edit.indoor} onChange={(e) => setEdit({ ...edit, indoor: e.target.checked })} />
                  <span>Intérieur / couvert</span>
                </label>
              </Field>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}

function Maintenance() {
  const { db, update, toast, space } = useStore();
  const [edit, setEdit] = useState<WorkOrder | null>(null);
  const [block, setBlock] = useState(false);

  const move = (w: WorkOrder, dir: 1 | -1) => {
    const next = STATUSES[STATUSES.indexOf(w.status) + dir];
    if (!next) return;
    update((d) => {
      const x = d.workOrders.find((y) => y.id === w.id)!;
      x.status = next;
      return d;
    });
    toast(`« ${w.title} » → ${WORK_STATUS_LABEL[next]}`);
  };

  const conflicts =
    edit && block && edit.blockDate && edit.blockStart && edit.blockEnd
      ? db.bookings.filter((b) => {
          if (b.spaceId !== edit.spaceId || b.date !== edit.blockDate || b.status === 'annulee') return false;
          return checkConflicts({ ...db, workOrders: [] }, { ...b, start: edit.blockStart!, end: edit.blockEnd!, id: 'x' }).some((i) => i.startsWith('Chevauche'));
        })
      : [];

  const save = () => {
    if (!edit || !edit.title.trim()) return toast('Titre requis');
    const final = block ? edit : { ...edit, blockDate: undefined, blockStart: undefined, blockEnd: undefined };
    update((d) => {
      const i = d.workOrders.findIndex((w) => w.id === final.id);
      if (i >= 0) d.workOrders[i] = final;
      else d.workOrders.push(final);
      return d;
    });
    toast(block ? 'Intervention enregistrée, créneau bloqué au planning' : 'Intervention enregistrée');
    setEdit(null);
  };

  const openEdit = (w: WorkOrder) => {
    setEdit(structuredClone(w));
    setBlock(!!w.blockDate);
  };

  return (
    <>
      <div className="row end mb">
        <button
          className="btn btn-primary"
          onClick={() => {
            setBlock(false);
            setEdit({ id: uid(), spaceId: db.spaces[0].id, kind: 'incident', title: '', description: '', priority: 'normale', status: 'a_faire', assignee: 'Équipe technique', createdAt: todayISO(), blockDate: todayISO(), blockStart: '08:00', blockEnd: '10:00' });
          }}
        >
          <Plus size={16} /> Signaler / planifier
        </button>
      </div>
      <div className="kanban">
        {STATUSES.map((st) => {
          const items = db.workOrders.filter((w) => w.status === st);
          return (
            <section key={st} className="kanban-col">
              <h3>
                {WORK_STATUS_LABEL[st]} <span className="count">{items.length}</span>
              </h3>
              {items.map((w) => (
                <article key={w.id} className="card wo">
                  <button className="wo-main" onClick={() => openEdit(w)}>
                    <div className="row between">
                      <Badge tone={PRIO_TONE[w.priority]}>{w.priority}</Badge>
                      <small className="muted">{w.kind === 'incident' ? 'Incident' : 'Préventif'}</small>
                    </div>
                    <strong>{w.title}</strong>
                    <small className="muted">
                      {space(w.spaceId)?.name} · {w.assignee}
                    </small>
                    {w.blockDate && (
                      <small className="c-warn">
                        Bloque {frDate(w.blockDate)} {w.blockStart}–{w.blockEnd}
                      </small>
                    )}
                    {w.cost ? <small className="muted">Coût : {money(w.cost)}</small> : null}
                  </button>
                  <div className="row between">
                    <button className="icon-btn sm" disabled={st === 'a_faire'} onClick={() => move(w, -1)} aria-label="Étape précédente">
                      <ArrowLeft size={14} />
                    </button>
                    <button className="icon-btn sm" disabled={st === 'resolu'} onClick={() => move(w, 1)} aria-label="Étape suivante">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>

      <Drawer
        open={!!edit}
        title={edit && db.workOrders.some((w) => w.id === edit.id) ? 'Intervention' : 'Nouvelle intervention'}
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
            <div className="segmented">
              <button type="button" className={edit.kind === 'incident' ? 'active' : ''} onClick={() => setEdit({ ...edit, kind: 'incident' })}>
                Incident
              </button>
              <button type="button" className={edit.kind === 'preventif' ? 'active' : ''} onClick={() => setEdit({ ...edit, kind: 'preventif' })}>
                Maintenance préventive
              </button>
            </div>
            <Field label="Titre">
              <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="ex. Projecteur défaillant" autoFocus />
            </Field>
            <div className="grid2">
              <Field label="Espace">
                <select value={edit.spaceId} onChange={(e) => setEdit({ ...edit, spaceId: e.target.value })}>
                  {db.spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priorité">
                <select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value as Priority })}>
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                </select>
              </Field>
            </div>
            <div className="grid2">
              <Field label="Assigné à">
                <input value={edit.assignee} onChange={(e) => setEdit({ ...edit, assignee: e.target.value })} />
              </Field>
              <Field label="Coût estimé (TND)">
                <input type="number" min={0} value={edit.cost ?? ''} onChange={(e) => setEdit({ ...edit, cost: e.target.value ? +e.target.value : undefined })} />
              </Field>
            </div>
            <Field label="Description">
              <textarea rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <label className="switch">
              <input
                type="checkbox"
                checked={block}
                onChange={(e) => {
                  setBlock(e.target.checked);
                  if (e.target.checked && !edit.blockDate) setEdit({ ...edit, blockDate: todayISO(), blockStart: '08:00', blockEnd: '10:00' });
                }}
              />
              <span>Bloquer l'espace dans le planning</span>
            </label>
            {block && (
              <div className="grid3">
                <Field label="Date">
                  <input type="date" value={edit.blockDate ?? ''} onChange={(e) => setEdit({ ...edit, blockDate: e.target.value })} />
                </Field>
                <Field label="De">
                  <input type="time" step={900} value={edit.blockStart ?? ''} onChange={(e) => setEdit({ ...edit, blockStart: e.target.value })} />
                </Field>
                <Field label="À">
                  <input type="time" step={900} value={edit.blockEnd ?? ''} onChange={(e) => setEdit({ ...edit, blockEnd: e.target.value })} />
                </Field>
              </div>
            )}
            {conflicts.length > 0 && (
              <div className="alert">
                ⚠ {conflicts.length} réservation(s) déjà sur ce créneau ({conflicts.map((c) => `${c.start}–${c.end}`).join(', ')}). Il faudra les déplacer ou prévenir les joueurs.
              </div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
