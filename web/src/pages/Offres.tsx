import { Plus } from 'lucide-react';
import { useState } from 'react';
import { FORMAT_LABEL, uid, type Format, type Offer, type Role } from '../data';
import { useStore } from '../store';
import { Badge, Drawer, Field, money, PageHeader, SportTag, Stat } from '../ui';

const FORMATS: Format[] = ['match', 'cours', 'location', 'tournoi'];

export function Offres() {
  const { db, update, toast, sport } = useStore();
  const [edit, setEdit] = useState<Offer | null>(null);
  const revenue = db.offers.reduce((s, o) => s + o.sold * o.price, 0);
  const sold = db.offers.reduce((s, o) => s + o.sold, 0);

  const save = () => {
    if (!edit || !edit.name.trim() || edit.credits <= 0) return toast('Nom et nombre de crédits requis');
    update((d) => {
      const i = d.offers.findIndex((o) => o.id === edit.id);
      if (i >= 0) d.offers[i] = edit;
      else d.offers.push(edit);
      return d;
    });
    toast('Offre enregistrée');
    setEdit(null);
  };

  return (
    <>
      <PageHeader
        title="Offres & abonnements"
        subtitle="Un seul portefeuille de crédits par membre. Chaque offre précise les sports et formats sur lesquels ses crédits sont valables."
        actions={
          <button className="btn btn-primary" onClick={() => setEdit({ id: uid(), name: '', description: '', credits: 10, price: 100, validityDays: 90, sports: [], formats: ['match', 'cours'], audience: 'joueur', active: true, sold: 0 })}>
            <Plus size={16} /> Nouvelle offre
          </button>
        }
      />
      <div className="stats">
        <Stat label="Offres actives" value={db.offers.filter((o) => o.active).length} />
        <Stat label="Ventes totales" value={sold} />
        <Stat label="Chiffre d'affaires" value={money(revenue)} tone="ok" />
        <Stat label="Prix moyen / crédit" value={money(Math.round(db.offers.reduce((s, o) => s + o.price / o.credits, 0) / Math.max(1, db.offers.length)))} />
      </div>
      <div className="cards">
        {db.offers.map((o) => (
          <button key={o.id} className={`card offer ${o.active ? '' : 'inactive'}`} onClick={() => setEdit(structuredClone(o))}>
            <div className="row between">
              <strong>{o.name}</strong>
              <Badge tone={o.active ? 'ok' : 'neutral'}>{o.active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div className="offer-price">
              {money(o.price)} <small className="muted">· {o.credits} crédits · {o.validityDays} j</small>
            </div>
            <small className="muted">{o.description}</small>
            <div className="row gap-xs wrap">
              {o.sports.length === 0 ? <Badge tone="info">Tous sports</Badge> : o.sports.map((id) => (sport(id) ? <SportTag key={id} name={sport(id)!.name} color={sport(id)!.color} /> : null))}
            </div>
            <small className="muted">
              {o.formats.map((f) => FORMAT_LABEL[f]).join(' · ')} · {o.audience === 'coach' ? 'Coachs' : 'Joueurs'} · {o.sold} vendue(s)
            </small>
          </button>
        ))}
      </div>

      <Drawer
        open={!!edit}
        title={edit?.name || 'Nouvelle offre'}
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
            <Field label="Nom">
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Description">
              <textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <div className="grid3">
              <Field label="Crédits">
                <input type="number" min={1} value={edit.credits} onChange={(e) => setEdit({ ...edit, credits: +e.target.value })} />
              </Field>
              <Field label="Prix (TND)">
                <input type="number" min={0} value={edit.price} onChange={(e) => setEdit({ ...edit, price: +e.target.value })} />
              </Field>
              <Field label="Validité (jours)">
                <input type="number" min={1} value={edit.validityDays} onChange={(e) => setEdit({ ...edit, validityDays: +e.target.value })} />
              </Field>
            </div>
            <Field label="Sports couverts" hint="Aucun sport sélectionné = valable sur tous les sports.">
              <div className="chips">
                {db.sports.map((s) => (
                  <button key={s.id} type="button" className={`chip ${edit.sports.includes(s.id) ? 'active' : ''}`} style={{ ['--c' as string]: s.color }} onClick={() => setEdit({ ...edit, sports: edit.sports.includes(s.id) ? edit.sports.filter((x) => x !== s.id) : [...edit.sports, s.id] })}>
                    <i className="dot" /> {s.name}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Formats couverts">
              <div className="chips">
                {FORMATS.map((f) => (
                  <button key={f} type="button" className={`chip ${edit.formats.includes(f) ? 'active' : ''}`} onClick={() => setEdit({ ...edit, formats: edit.formats.includes(f) ? edit.formats.filter((x) => x !== f) : [...edit.formats, f] })}>
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid2">
              <Field label="Public">
                <select value={edit.audience} onChange={(e) => setEdit({ ...edit, audience: e.target.value as Role })}>
                  <option value="joueur">Joueurs</option>
                  <option value="coach">Coachs</option>
                </select>
              </Field>
              <Field label="Statut">
                <label className="switch">
                  <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
                  <span>Offre en vente</span>
                </label>
              </Field>
            </div>
            <p className="muted">
              Prix par crédit : <b>{money(Math.round((edit.price / Math.max(1, edit.credits)) * 10) / 10)}</b>
            </p>
          </>
        )}
      </Drawer>
    </>
  );
}
