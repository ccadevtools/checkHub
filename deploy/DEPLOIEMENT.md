# Mettre le prototype en ligne sur un VPS (sous-domaine)

> **Serveur sous Plesk ?** Suivez plutôt [DEPLOIEMENT-PLESK.md](DEPLOIEMENT-PLESK.md) : Plesk gère lui-même Nginx et les certificats.

Le prototype est un **site statique** : `npm run build` produit un dossier `web/dist/` (HTML, CSS, JS).
Sur le serveur, il suffit de **Nginx**. Node.js n'est nécessaire que pour construire le site.

Dans ce guide, on suppose :
- un VPS sous **Ubuntu ou Debian** ;
- le sous-domaine **`checkhub.votredomaine.tn`** ;
- le dossier servi **`/var/www/checkhub`**.

Adaptez ces valeurs à votre cas.

---

## 1. DNS : faire pointer le sous-domaine vers le VPS

Chez votre registrar ou votre hébergeur DNS, ajoutez un enregistrement :

| Type | Nom | Valeur |
|---|---|---|
| A | `checkhub` | adresse IP du VPS |

Vérifiez ensuite que le nom répond (cela peut prendre de quelques minutes à quelques heures) :

```bash
ping checkhub.votredomaine.tn
```

## 2. Préparer le VPS (une seule fois)

Connectez-vous en SSH au VPS.

Installez Nginx, rsync et Certbot :

```bash
sudo apt update && sudo apt install -y nginx rsync certbot python3-certbot-nginx
```

Créez un utilisateur dédié au déploiement :

```bash
sudo adduser --disabled-password --gecos "" deploy
```

Créez le dossier servi et donnez-le à cet utilisateur :

```bash
sudo mkdir -p /var/www/checkhub && sudo chown deploy:deploy /var/www/checkhub
```

## 3. Configurer Nginx et HTTPS

Copiez [`nginx-checkhub.conf`](nginx-checkhub.conf) dans `/etc/nginx/sites-available/checkhub`, puis remplacez `checkhub.example.com` par votre sous-domaine :

```bash
sudo nano /etc/nginx/sites-available/checkhub
```

Activez le site :

```bash
sudo ln -s /etc/nginx/sites-available/checkhub /etc/nginx/sites-enabled/
```

Vérifiez la configuration, puis rechargez Nginx :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Activez le HTTPS (certificat gratuit Let's Encrypt, renouvelé automatiquement) :

```bash
sudo certbot --nginx -d checkhub.votredomaine.tn
```

**Recommandé : protéger le prototype par un mot de passe.**

Installez l'outil `htpasswd` :

```bash
sudo apt install -y apache2-utils
```

Créez un identifiant (ici `equipe`) ; la commande vous demande le mot de passe :

```bash
sudo htpasswd -c /etc/nginx/.htpasswd-checkhub equipe
```

Décommentez ensuite les deux lignes `auth_basic` du fichier de configuration, puis rechargez Nginx :

```bash
sudo systemctl reload nginx
```

---

## 4. Option A (recommandée) : déploiement automatique depuis GitHub

À chaque push sur la branche, GitHub Actions construit le site et le copie sur le VPS.
Le workflow est déjà prêt dans le dépôt : [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). La copie en SSH ne s'active que si le secret `VPS_HOST` existe.

### 4.1 Créer une clé SSH dédiée

Sur votre PC, dans PowerShell :

```powershell
ssh-keygen -t ed25519 -C "github-deploy-checkhub" -f $HOME\.ssh\checkhub_deploy
```

Laissez la phrase de passe vide. La commande crée deux fichiers :
- `checkhub_deploy` : la clé **privée**, qui ira dans GitHub ;
- `checkhub_deploy.pub` : la clé **publique**, qui ira sur le VPS.

### 4.2 Autoriser la clé sur le VPS

Ouvrez la clé publique et copiez son contenu :

```powershell
notepad $HOME\.ssh\checkhub_deploy.pub
```

Sur le VPS, collez cette clé dans les clés autorisées de l'utilisateur `deploy`. Remplacez le texte entre guillemets par la clé copiée :

```bash
sudo -u deploy bash -c 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "COLLER_ICI_LA_CLE_PUBLIQUE" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

Testez depuis votre PC ; la connexion doit s'ouvrir sans mot de passe :

```powershell
ssh -i $HOME\.ssh\checkhub_deploy deploy@IP_DU_VPS
```

### 4.3 Ajouter les secrets dans GitHub

Sur GitHub, dans le dépôt `ccadevtools/checkHub`, ouvrez **Settings → Secrets and variables → Actions → New repository secret** et créez :

| Nom | Valeur |
|---|---|
| `VPS_HOST` | IP du VPS (ou son nom) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | tout le contenu du fichier `checkhub_deploy` (clé **privée**, lignes `BEGIN` et `END` comprises) |
| `VPS_PATH` | `/var/www/checkhub` |
| `VPS_PORT` | *(facultatif)* le port SSH s'il n'est pas 22 |
| `VPS_KNOWN_HOSTS` | *(facultatif, recommandé)* la sortie de la commande ci-dessous |

Pour obtenir la valeur de `VPS_KNOWN_HOSTS`, lancez sur votre PC :

```powershell
ssh-keyscan IP_DU_VPS
```

### 4.4 Lancer le déploiement

- **Automatique** : à chaque push qui modifie `web/` sur `main` ou sur `claude/elegant-maxwell-ih2pz3`.
- **Manuel** : sur GitHub, onglet **Actions → Déploiement → Run workflow**.

Une fois le workflow au vert, ouvrez https://checkhub.votredomaine.tn.

---

## 5. Option B : déploiement manuel sur le VPS (sans GitHub Actions)

Installez Node.js 22 sur le VPS :

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs git
```

Clonez le dépôt (dépôt privé : il faut une deploy key GitHub ou un jeton d'accès) :

```bash
sudo -u deploy git clone https://github.com/ccadevtools/checkHub.git /home/deploy/checkHub
```

Pour déployer, puis à chaque mise à jour, lancez :

```bash
sudo -u deploy bash /home/deploy/checkHub/deploy/deploy-vps.sh /var/www/checkhub
```

---

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Le workflow échoue sur `Permission denied (publickey)` | La clé publique n'est pas dans `/home/deploy/.ssh/authorized_keys`, ou `VPS_SSH_KEY` est incomplet |
| Le workflow échoue sur `rsync: ... Permission denied` | `/var/www/checkhub` n'appartient pas à `deploy` (voir `chown`, étape 2) |
| Page Nginx « Welcome to nginx » | `server_name` incorrect, ou le site par défaut passe en premier (le désactiver avec `sudo rm /etc/nginx/sites-enabled/default`) |
| Page blanche | Le dossier ne contient pas `index.html` : vérifiez que `VPS_PATH` pointe vers le bon dossier |
| Certbot échoue | Le DNS ne pointe pas encore vers le VPS, ou le port 80 est fermé (pare-feu : `sudo ufw allow 'Nginx Full'`) |
