import { Download, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BOOKING_STATUS_LABEL, FORMAT_LABEL, todayISO, type BookingStatus } from '../data';
import { fullName, useStore } from '../store';
import { Badge, Empty, frDate, money, PageHeader, SportTag, Tabs } from '../ui';
import type { BookingDraft } from '../BookingDrawer';

type Tab = 'avenir' | 'attente' | 'passees' | 'annulees' | 'toutes';
const tone: Record<BookingStatus, 'ok' | 'warn' | 'bad' | 'neutral'> = { confirmee: 'ok', en_attente: 'warn', annulee: 'bad', terminee: 'neutral' };

export function Reservations({ openBooking }: { openBooking: (d: BookingDraft) => void }) {
  const { db, sport, space, member } = useStore();
  const [tab, setTab] = useState<Tab>('avenir');
  const [q, setQ] = useState('');
  const [sportId, setSportId] = useState('');
  const today = todayISO();

  const groups = useMemo(() => {
    const g: Record<Tab, typeof db.bookings> = { avenir: [], attente: [], passees: [], annulees: [], toutes: db.bookings };
    db.bookings.forEach((b) => {
      if (b.status === 'annulee') g.annulees.push(b);
      else if (b.status === 'en_attente' && b.date >= today) g.attente.push(b);
      else if (b.date >= today) g.avenir.push(b);
      else g.passees.push(b);
    });
    return g;
  }, [db.bookings, today]);

  const rows = groups[tab]
    .filter((b) => !sportId || b.sportId === sportId)
    .filter((b) => {
      if (!q) return true;
      const hay = [space(b.spaceId)?.name, b.title, ...b.memberIds.map((id) => fullName(member(id)) + ' ' + member(id)?.email)].join(' ').toLowerCase();
      return hay.includes(q.toLowerCase());
    })
    .sort((a, b) => (tab === 'passees' ? -1 : 1) * (a.date + a.start).localeCompare(b.date + b.start));

  const exportCsv = () => {
    const head = ['Date', 'Début', 'Fin', 'Espace', 'Sport', 'Format', 'Titulaire', 'Participants', 'Statut', 'Prix', 'Paiement'];
    const lines = rows.map((b) => [b.date, b.start, b.end, space(b.spaceId)?.name, sport(b.sportId)?.name, FORMAT_LABEL[b.format], fullName(member(b.memberIds[0])), b.memberIds.length, BOOKING_STATUS_LABEL[b.status], b.price, b.paidWith]);
    const csv = [head, ...lines].map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `reservations-${tab}-${today}.csv`;
    a.click();
  };

  return (
    <>
      <PageHeader
        title="Réservations"
        subtitle="Matchs, cours et locations, tous sports confondus, dans une seule liste."
        actions={
          <>
            <button className="btn btn-ghost" onClick={exportCsv}>
              <Download size={16} /> Export CSV
            </button>
            <button className="btn btn-primary" onClick={() => openBooking({})}>
              <Plus size={16} /> Réserver
            </button>
          </>
        }
      />
      <div className="card">
        <div className="table-tools">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'avenir', label: 'À venir', count: groups.avenir.length },
              { id: 'attente', label: 'En attente', count: groups.attente.length },
              { id: 'passees', label: 'Passées', count: groups.passees.length },
              { id: 'annulees', label: 'Annulées', count: groups.annulees.length },
              { id: 'toutes', label: 'Toutes', count: groups.toutes.length },
            ]}
          />
          <div className="row gap">
            <div className="input-icon">
              <Search size={15} />
              <input placeholder="Membre, email, espace…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select value={sportId} onChange={(e) => setSportId(e.target.value)}>
              <option value="">Tous les sports</option>
              {db.sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {rows.length === 0 ? (
          <Empty>Aucune réservation ne correspond à ces filtres.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Horaire</th>
                  <th>Espace</th>
                  <th>Sport · format</th>
                  <th>Titulaire</th>
                  <th>Joueurs</th>
                  <th>Statut</th>
                  <th className="num">Prix</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const sp = sport(b.sportId);
                  return (
                    <tr key={b.id} className="clickable" onClick={() => openBooking({ id: b.id })}>
                      <td>{frDate(b.date)}</td>
                      <td className="mono">
                        {b.start}–{b.end}
                      </td>
                      <td>{space(b.spaceId)?.name}</td>
                      <td>
                        {sp && <SportTag name={sp.name} color={sp.color} />} <span className="muted">{FORMAT_LABEL[b.format]}</span>
                      </td>
                      <td>{b.title ? <span>{b.title}</span> : fullName(member(b.memberIds[0]))}</td>
                      <td>
                        {b.memberIds.length}/{sp?.maxPlayers}
                        {b.isPublic && (
                          <>
                            {' '}
                            <Badge tone="info">Ouvert</Badge>
                          </>
                        )}
                      </td>
                      <td>
                        <Badge tone={tone[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                        {b.paidWith === 'non_paye' && b.status !== 'annulee' && (
                          <>
                            {' '}
                            <Badge tone="bad">À encaisser</Badge>
                          </>
                        )}
                      </td>
                      <td className="num">{money(b.price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
