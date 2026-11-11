# CheckHub

Application de **facility management multi-sport** : planning unifié des espaces, réservations, membres et crédits, offres, maintenance des installations.

Ce dépôt contient :

| Dossier | Contenu |
|---|---|
| [`docs/ANALYSE.md`](docs/ANALYSE.md) | Audit de l'application de test existante (fonctionnalités, problèmes relevés) et cahier des améliorations |
| [`web/`](web/) | Prototype interactif (React + TypeScript + Vite), avec données de démonstration enregistrées dans le navigateur |
| [`deploy/`](deploy/DEPLOIEMENT-PLESK.md) | Mise en ligne : [Plesk](deploy/DEPLOIEMENT-PLESK.md) (yolo.werun.tn) ou [VPS sans Plesk](deploy/DEPLOIEMENT.md), avec déploiement automatique par GitHub Actions |

## Lancer le prototype

```bash
cd web
npm install
npm run dev
```

Puis ouvrir http://localhost:5173.

## Ce que montre le prototype

- **Planning unifié** : tous les espaces (padel, tennis, foot à 5, studio, salle de combat) sur une seule grille jour.
  - Clic sur un créneau libre : création rapide.
  - Glisser-déposer pour déplacer une réservation.
  - Ligne « maintenant », plages fermées hachurées, filtre par sport.
- **Réservation intelligente** : la durée, le nombre de joueurs, les formats et le prix s'adaptent au sport choisi.
  - Le tarif heures pleines s'applique automatiquement.
  - Les conflits sont détectés et bloquent la validation : chevauchement, horaires d'ouverture, intervention en cours, sport non pratiqué sur l'espace, capacité.
- **Réservations** : une seule liste avec des onglets (à venir, en attente, passées, annulées), une recherche et un export CSV.
- **Installations** :
  - fiches espaces multi-sport ;
  - **kanban maintenance et incidents** : une intervention peut bloquer un créneau, qui apparaît alors dans le planning, et les réservations impactées sont signalées.
- **Membres** : niveau **par sport**, portefeuille de crédits unique, vente d'offres, historique.
- **Offres** : carnets de crédits limités à certains sports et formats, prix par crédit.
- **Sports** : chaque sport se configure sans code (créneau, joueurs, formats, tarifs creuses / pleines, crédits).
- Palette de commandes **Ctrl+K**, thème clair et sombre, interface responsive (mobile et tablette).

Le bouton « Réinitialiser la démo » (page Sports) restaure les données de départ.
