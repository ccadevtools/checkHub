import { Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { FORMAT_LABEL, uid, type Format, type Sport } from '../data';
import { useStore } from '../store';
import { Badge, Drawer, Field, money, PageHeader } from '../ui';

const FORMATS: Format[] = ['match', 'cours', 'location', 'tournoi'];
const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899', '#ef4444', '#14b8a6', '#eab308', '#6366f1', '#f97316'];

export function Sports() {
  const { db, update, toast, reset } = useStore();
  const [edit, setEdit] = useState<Sport | null>(null);

  const save = () => {
    if (!edit || !edit.name.trim()) return toast('Nom requis');
    if (edit.minPlayers > edit.maxPlayers) return toast('Le minimum de joueurs dépasse le maximum');
    if (edit.formats.length === 0) return toast('Au moins un format requis');
    update((d) => {
      const i = d.sports.findIndex((s) => s.id === edit.id);
      if (i >= 0) d.sports[i] = edit;
      else d.sports.push(edit);
      return d;
    });
    toast('Sport enregistré');
    setEdit(null);
  };

  return (
    <>
      <PageHeader
        title="Sports"
        subtitle="Chaque sport porte ses propres règles : durée de créneau, nombre de joueurs, formats et tarifs. Ajouter un sport ne demande aucun développement."
        actions={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (confirm('Réinitialiser toutes les données de démonstration ?')) {
                  reset();
                  toast('Données de démo réinitialisées');
                }
              }}
            >
              <RotateCcw size={16} /> Réinitialiser la démo
            </button>
            <button className="btn btn-primary" onClick={() => setEdit({ id: uid(), name: '', color: COLORS[db.sports.length % COLORS.length], slotMinutes: 60, minPlayers: 2, maxPlayers: 4, formats: ['match'], pricePerSlot: 40, peakPricePerSlot: 50, creditsPerSlot: 1, active: true })}>
              <Plus size={16} /> Ajouter un sport
            </button>
          </>
        }
      />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sport</th>
              <th>Créneau</th>
              <th>Joueurs</th>
              <th>Formats</th>
              <th className="num">Creuse / pleine</th>
              <th className="num">Crédits</th>
              <th>Espaces</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {db.sports.map((s) => (
              <tr key={s.id} className="clickable" onClick={() => setEdit(structuredClone(s))}>
                <td>
                  <span className="row gap-xs">
                    <i className="dot lg" style={{ ['--c' as string]: s.color }} /> <strong>{s.name}</strong>
                  </span>
                </td>
                <td>{s.slotMinutes} min</td>
                <td>
                  {s.minPlayers}–{s.maxPlayers}
                </td>
                <td>{s.formats.map((f) => FORMAT_LABEL[f]).join(', ')}</td>
                <td className="num">
                  {money(s.pricePerSlot)} / {money(s.peakPricePerSlot)}
                </td>
                <td className="num">{s.creditsPerSlot}</td>
                <td>{db.spaces.filter((sp) => sp.sports.includes(s.id)).length}</td>
                <td>
                  <Badge tone={s.active ? 'ok' : 'neutral'}>{s.active ? 'Actif' : 'Inactif'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small mt">Heures pleines : à partir de 17h00 (paramétrable par site dans la V1).</p>

      <Drawer
        open={!!edit}
        title={edit?.name || 'Nouveau sport'}
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
              <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus placeholder="ex. Basket 3x3" />
            </Field>
            <Field label="Couleur dans le planning">
              <div className="row gap-xs wrap">
                {COLORS.map((c) => (
                  <button key={c} type="button" aria-label={c} className={`swatch ${edit.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setEdit({ ...edit, color: c })} />
                ))}
              </div>
            </Field>
            <div className="grid3">
              <Field label="Durée du créneau (min)">
                <select value={edit.slotMinutes} onChange={(e) => setEdit({ ...edit, slotMinutes: +e.target.value })}>
                  {[30, 45, 60, 75, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Joueurs min">
                <input type="number" min={1} value={edit.minPlayers} onChange={(e) => setEdit({ ...edit, minPlayers: +e.target.value })} />
              </Field>
              <Field label="Joueurs max">
                <input type="number" min={1} value={edit.maxPlayers} onChange={(e) => setEdit({ ...edit, maxPlayers: +e.target.value })} />
              </Field>
            </div>
            <Field label="Formats proposés">
              <div className="chips">
                {FORMATS.map((f) => (
                  <button key={f} type="button" className={`chip ${edit.formats.includes(f) ? 'active' : ''}`} onClick={() => setEdit({ ...edit, formats: edit.formats.includes(f) ? edit.formats.filter((x) => x !== f) : [...edit.formats, f] })}>
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid3">
              <Field label="Prix heures creuses (TND)">
                <input type="number" min={0} value={edit.pricePerSlot} onChange={(e) => setEdit({ ...edit, pricePerSlot: +e.target.value })} />
              </Field>
              <Field label="Prix heures pleines (TND)">
                <input type="number" min={0} value={edit.peakPricePerSlot} onChange={(e) => setEdit({ ...edit, peakPricePerSlot: +e.target.value })} />
              </Field>
              <Field label="Crédits / créneau">
                <input type="number" min={0} value={edit.creditsPerSlot} onChange={(e) => setEdit({ ...edit, creditsPerSlot: +e.target.value })} />
              </Field>
            </div>
            <label className="switch">
              <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
              <span>Sport actif (réservable)</span>
            </label>
          </>
        )}
      </Drawer>
    </>
  );
}
