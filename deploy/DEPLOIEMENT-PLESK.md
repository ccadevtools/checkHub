# Mettre le prototype en ligne sur Plesk : https://yolo.werun.tn

Serveur : **Plesk Obsidian 18 sur Debian 12**.

## Comment ça marche

```
push sur GitHub ──► GitHub Actions construit web/ ──► branche `site` (site prêt à servir)
                                                         │
                                         webhook GitHub ▼
                                Plesk › Git récupère `site` ──► dossier du sous-domaine
```

- Rien n'est à installer sur le serveur : pas de Node ni de clé SSH à gérer. Plesk récupère simplement des fichiers HTML, CSS et JS.
- Le prototype utilise des URL avec `#` (`/#planning`), donc aucune règle de réécriture n'est nécessaire.

---

## Étape 1 : générer la branche `site` (une première fois)

Sur GitHub, dans le dépôt **ccadevtools/checkHub**, ouvrez l'onglet **Actions**. Choisissez le workflow **Déploiement**, puis **Run workflow** sur la branche `claude/elegant-maxwell-ih2pz3`.

Quand le workflow est au vert (environ 1 minute), la branche **`site`** apparaît dans le dépôt. Elle est ensuite régénérée automatiquement à chaque push qui modifie `web/`.

> Si le workflow échoue à l'étape « Publier sur la branche site » avec une erreur 403, ouvrez **Settings → Actions → General → Workflow permissions**, cochez **Read and write permissions**, puis enregistrez.

## Étape 2 : créer le sous-domaine dans Plesk

Si `yolo.werun.tn` existe déjà dans Plesk, passez à l'étape 3.

1. Ouvrez **Sites Web & Domaines**, puis **Ajouter un sous-domaine**.
2. Saisissez le nom `yolo`, avec `werun.tn` comme domaine parent.
3. Gardez la racine des documents proposée, par exemple `/yolo.werun.tn`, et **notez-la** : elle servira à l'étape 4.
4. Pour le HTTPS : ouvrez **yolo.werun.tn → Certificats SSL/TLS → Let's Encrypt**, cochez la sécurisation du domaine, puis **Obtenir gratuitement**.

**Videz la racine des documents** (Gestionnaire de fichiers) pour supprimer la page par défaut de Plesk (`index.html`, `css/`, `img/`…). Sinon, des fichiers en trop restent à côté du prototype.

## Étape 3 : autoriser Plesk à lire le dépôt (privé)

1. Dans Plesk, ouvrez **yolo.werun.tn → Git**. Si l'icône n'apparaît pas, installez l'extension : **Extensions → Git → Installer**.
2. Cliquez sur **Ajouter un référentiel**, puis choisissez **Référentiel distant**.
3. Dans **URL du référentiel**, saisissez l'adresse SSH (et non HTTPS) :
   ```
   git@github.com:ccadevtools/checkHub.git
   ```
4. Plesk affiche une **clé SSH publique**. Copiez-la.
5. Sur GitHub, ouvrez **ccadevtools/checkHub → Settings → Deploy keys → Add deploy key**.
   - Titre : `Plesk yolo.werun.tn`
   - Clé : celle copiée dans Plesk
   - **Ne cochez pas** « Allow write access » : Plesk n'a besoin que de lire.

## Étape 4 : configurer le déploiement dans Plesk

Toujours dans l'écran Git de Plesk :

| Champ | Valeur |
|---|---|
| Mode de déploiement | **Automatique** |
| Branche | **`site`** (sinon Plesk publie le code source au lieu du site construit) |
| Chemin du serveur | la racine des documents notée à l'étape 2, par exemple `/yolo.werun.tn` |
| Actions de déploiement supplémentaires | *laisser vide* |

Validez. Plesk récupère la branche et y copie les fichiers. Ouvrez https://yolo.werun.tn : le prototype doit s'afficher.

## Étape 5 : déploiement automatique (webhook)

Pour que Plesk se mette à jour tout seul après chaque push :

1. Dans Plesk, ouvrez **Git → Paramètres du référentiel** et copiez l'**URL du webhook**.
2. Sur GitHub, ouvrez **Settings → Webhooks → Add webhook** et renseignez :
   - Payload URL : l'URL copiée dans Plesk
   - Content type : `application/json`
   - Événement : **Just the push event**
3. Enregistrez. GitHub envoie un ping ; une coche verte confirme que Plesk l'a bien reçu.

À partir de là, voici ce qui se passe à chaque push qui modifie `web/` :
1. GitHub Actions construit le site.
2. Le workflow pousse le résultat sur `site`.
3. Le webhook prévient Plesk.
4. Plesk met le site en ligne.

L'ensemble prend environ 1 à 2 minutes.

## Étape 6 (recommandée) : protéger l'accès

Le prototype est interne. Pour le protéger par un mot de passe :

1. Ouvrez **yolo.werun.tn → Répertoires protégés par mot de passe → Ajouter un répertoire protégé**.
2. Saisissez le répertoire `/` et un titre, par exemple « CheckHub ».
3. Ajoutez un utilisateur et son mot de passe, puis transmettez-les à l'équipe.

## Facultatif : cache des fichiers statiques

Dans **yolo.werun.tn → Paramètres Apache & nginx → Directives supplémentaires nginx**, ajoutez :

```nginx
location ^~ /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Les fichiers de `assets/` ont un nom qui change à chaque version : on peut les mettre en cache sans risque.

---

## Dépannage

| Symptôme | Solution |
|---|---|
| Plesk : « Permission denied (publickey) » | La deploy key n'est pas ajoutée sur GitHub, ou l'URL est en `https://` au lieu de `git@github.com:` |
| La branche `site` n'est pas proposée dans Plesk | Lancer d'abord le workflow (étape 1), puis rafraîchir le référentiel dans Plesk |
| Le site affiche du code source ou un `README.md` | Branche `claude/...` choisie au lieu de **`site`** |
| La page par défaut de Plesk s'affiche encore | Vider la racine des documents, puis cliquer sur **Déployer** dans l'écran Git |
| Page blanche | Le chemin du serveur ne correspond pas à la racine des documents du sous-domaine |
| Le site ne se met pas à jour après un push | Vérifier le dernier workflow (Actions), puis le webhook (Settings → Webhooks → Recent deliveries) ; en dernier recours, **Déployer** à la main dans Plesk |
| Mises à jour lentes à apparaître | Vider le cache du navigateur (Ctrl+F5) : `index.html` est parfois gardé en cache |
