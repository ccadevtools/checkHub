# CheckHub : analyse de l'existant et proposition d'amélioration

> Source : exploration du back-office de test `yolo.4prod.tn` (compte administrateur), le 10/11/2026.
> Exploration en **lecture seule** : tous les appels d'écriture vers l'API étaient bloqués pendant l'audit.

---

## 1. Cartographie fonctionnelle de l'existant

Stack observée : **Nuxt 3 / Nuxt UI** en front, API REST `/api/*` (identifiants de type MongoDB), authentification par session (`/api/_auth/session`), permissions par rôle (`/api/user/permissions` : 27 permissions de type `xxx.manage`).

| Module (menu) | Écran(s) | Contenu |
|---|---|---|
| **Mon espace** | `/staff/dashboard` | KPI membres (total / actifs / inactifs / coachs), revenus terrains et cours, réservations actives, taux d'utilisation, 3 graphiques avec filtre de période (aujourd'hui → 90 j) |
| **Utilisateurs** | Personnel, Entraîneurs, Joueurs | Listes avec compteurs (actifs, bloqués, liste noire, classés…). Coach : sports, spécialités, type (Match / Cours / Abonnement), créneaux de disponibilité |
| **Terrains** | `/staff/courts` | Nom, ordre, public cible (joueur / coach / tous), horaires, **tarification en tickets** (fixe ou dynamique, distincte joueur / coach), photos, image sponsor, suppression logique |
| **Salles** | `/staff/halls` | Nom, **prix/heure en TND**, capacité, dimensions, sports, horaires |
| **Cours** | `/staff/courses` | Cours ponctuels ou récurrents (assistant en 4 étapes : date, heure, salle, détails), sport, coach, niveau ; vues liste et calendrier par salle |
| **Quiz** | `/staff/quiz` | Quiz de positionnement (1 quiz « Padel », 4 questions), qui fixe le niveau du joueur |
| **Réservations** | Matchs, Cours, Annulées | Synthèse horaire, occupation, liste d'attente, liste / calendrier par terrain, création de match (terrain, date, heures, public / privé, joueurs placés en équipes A/B gauche/droite, 4 joueurs max) |
| **Scores** | `/staff/scores` | Validation des scores déclarés (en attente / valide / invalide) |
| **Classements** | `/staff/rankings`, niveaux de rang | Import Excel du classement fédéral (1 249 joueurs), niveaux de rang par plage et par genre |
| **Abonnements** | Offres, abonnements joueurs, historique des tickets | Carnets de tickets (match / cours / mixte), public joueur ou coach, restrictions (délai minimum, durée calendrier, réservations par jour, simultanées) ; solde et historique des tickets par joueur |
| **Réclamations** | `/staff/reclamations` | Sujet, catégorie, statut (en attente / en cours / résolue) |
| **Tournois** | `/staff/tournaments` | *« En cours de développement »* |
| **CMS** | Accueil, Installations, Contact, SEO | Édition du site vitrine section par section, aperçu Google |
| **Paramètres** | Sports, Niveaux, Rôles, Temps (×2), Activité, Contact, FAQ, Logs | Règles d'annulation et de remboursement des tickets, inactivité des joueurs, plage de niveau pour rejoindre un match, SMTP, clubs géolocalisés, journal d'audit |
| **Caisse** | bouton flottant 🧮 | Point de vente (`/api/pos/checkout`) |

---

## 2. Problèmes relevés

### 2.1 Modèle de données : pensé pour le padel, pas multi-sport
- **Deux objets différents pour la même chose.** Les *Terrains* sont tarifés en tickets, sans sport. Les *Salles* sont tarifées en TND/heure et portent des sports. Ajouter un terrain de foot à 5, de tennis ou une piscine oblige à choisir l'un des deux modèles, et aucun ne convient.
- **Le sport n'est qu'un nom** (`{name, description}`). Il ne définit ni la durée de créneau, ni le nombre de joueurs, ni le format (match, cours, location libre), ni l'échelle de niveaux.
- **La logique padel est codée en dur** : 4 joueurs par ticket, équipes A/B, côté gauche ou droit, créneaux fixes de 90 min, quiz « Padel ».
- **Les niveaux sont globaux** (Débutant → Expert en %). Un joueur ne peut pas être confirmé en padel et débutant en tennis. On trouve aussi des trous dans les plages (45 % → 60 %) et un champ « Titre » à 0.

### 2.2 Navigation et ergonomie
- **15 entrées au premier niveau et environ 35 écrans.** Les libellés sont incohérents : « subscription » est en anglais, « Gérer les abonnements … » est tronqué, « Tournois* » est inachevé. Deux pages s'appellent « Paramètres de temps », et la page « Temps » reprend la description de la page « Activité ».
- **Des clés de traduction s'affichent à l'écran** : `subscriptions.fields.title`, `contact-details-and-emails`, `smtp-configuration-subtitle`, `summary`, `details`, `order`.
- **La réservation est éclatée sur 4 écrans** (matchs, cours, annulées, liste d'attente), plus un calendrier distinct dans « Cours ». Il n'existe aucune vue qui montre terrains **et** salles ensemble.
- **La liste des réservations est filtrée sur aujourd'hui par défaut**, donc elle affiche « Aucune donnée » alors que la base contient 169 réservations.
- **La grille du calendrier a des heures décalées** (06:59, 08:29, 09:59…) et des horaires à 23:59 ou 23:01. On ne peut ni glisser-déposer, ni voir la semaine.
- **Les sélecteurs d'heure sont des listes de 00 à 59** au lieu de champs `HH:MM` ou de pas de 15 min.
- **Il y a des incohérences de chiffres** : le tableau de bord affiche 0 TND de revenu alors que des abonnements ont été vendus, l'occupation « 0 / 117.92 » h a deux décimales, on lit « 7 / 9 terrains » alors qu'il y a 7 terrains, et le cours « boxing » va de 22:59 à 00:29.
- **Il manque des noms** : dans « Abonnements joueurs », plusieurs cartes affichent « U » sans nom de joueur.
- **Le classement mélange hommes et femmes** dans une seule liste, ce qui fait apparaître deux « #1 ».
- **Le bouton caisse flottant** recouvre les contrôles de la vue (Liste / Calendrier).
- **Les réclamations ne sont pas traitées** : 17 sur 18 sont « en attente », sans responsable, sans délai cible (SLA), sans fil de réponse.

### 2.3 Facility management : le cœur du besoin est absent
L'outil gère des **réservations**, mais pas les **installations** elles-mêmes :
- il n'y a ni maintenance préventive ni curative (éclairage, filets, gazon, vitres, climatisation) ;
- les incidents ne peuvent pas être signalés depuis un terrain, ni bloquer le terrain dans le planning ;
- il n'y a pas d'inventaire d'équipements (raquettes en location, balles, tapis) ;
- il n'y a pas de planning des équipes (accueil, ménage, techniciens) ;
- il n'y a pas d'indicateurs d'exploitation : disponibilité réelle, temps d'arrêt, coût de maintenance par espace.

---

## 3. Proposition : CheckHub

### 3.1 Principes
1. **Un seul planning** pour tout : espaces, cours, matchs, maintenance, en vue jour ou semaine, filtrable par sport ou par site.
2. **Le sport est une configuration, pas du code.** Chaque sport définit sa durée de créneau, son nombre de joueurs, ses formats, son échelle de niveau et sa tarification.
3. **Un objet « Espace » générique** : terrain, salle, studio, couloir de piscine… avec ses sports compatibles, sa capacité, ses horaires et son statut.
4. **Un portefeuille de crédits unique** par membre, qui remplace les tickets match / cours / mixte. Chaque offre précise sur quels sports et formats ses crédits sont valables.
5. **Moins de clics** : création rapide en cliquant un créneau vide, palette de commandes (Ctrl+K), filtres conservés, valeurs par défaut cohérentes (aujourd'hui **et** à venir).
6. **Le facility management fait partie du produit** : un incident ou une maintenance **bloque automatiquement le créneau** concerné dans le planning.

### 3.2 Nouvelle navigation : 7 sections au lieu de 15

| Section | Contenu | Remplace |
|---|---|---|
| **Tableau de bord** | KPI temps réel, occupation par sport, alertes | Mon espace |
| **Planning** | Grille unifiée (tous espaces), création rapide, liste d'attente | Réservations ×3, calendrier Cours |
| **Réservations** | Liste unique avec onglets de statut (à venir, passées, annulées, liste d'attente) | Réservations, Annulées, Rés. cours |
| **Membres** | Joueurs, coachs, personnel ; niveau **par sport** ; portefeuille de crédits | Utilisateurs ×3, Abonnements joueurs, Historique tickets |
| **Installations** | Espaces, maintenance et incidents (kanban), équipements | Terrains, Salles + *nouveau* |
| **Offres** | Abonnements, carnets, tarifs heures pleines / creuses | subscription |
| **Paramètres** | Sports (config complète), règles de réservation, rôles, site | Paramètres ×9 |

Les modules Communauté (classements par sport et par genre, tournois, scores), Support (réclamations avec SLA) et CMS restent prévus, à brancher dans un second temps.

### 3.3 Modèle de données cible

```
Site ─┬─ Espace (type, sports[], capacité, horaires, statut, photos)
      │
Sport (nom, couleur, durée créneau, joueurs min/max, formats[], tarif base)
      │
Réservation (espace, sport, format, début, fin, membres[], statut, prix, crédits)
      │
Membre (rôle, niveaux{sport: niveau}, crédits, statut)
Offre (crédits, prix, sports[], formats[], validité, restrictions)
Intervention (espace, type: incident|préventif, priorité, statut, bloque_de→à, assigné)
```

### 3.4 Feuille de route proposée
1. **MVP (ce dépôt)** : prototype front interactif avec planning unifié, réservations, installations et maintenance, membres et crédits, offres, configuration des sports.
2. **V1** : API (NestJS ou Nuxt server + PostgreSQL), authentification et rôles, reprise des données de l'existant (export MongoDB vers le nouveau schéma), paiement et caisse.
3. **V2** : application joueur (réservation, matchs ouverts par niveau et par sport), tournois, classements, notifications, CMS.
