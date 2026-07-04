# Compteur Belote — PWA

Une application web installable (PWA) pour compter les points à la belote.
Aucun serveur, aucune base de données : tout est stocké sur le téléphone.

## Ce que fait déjà l'appli

- Deux équipes renommables (touchez le nom sur la carte pour le modifier)
- Saisie des points de chaque manche, totaux cumulés
- Objectif de partie au choix (501 / 701 / 1000) et détection du gagnant
- Historique des manches + annulation de la dernière manche
- Sauvegarde automatique : fermez l'appli, la partie est toujours là
- Fonctionne hors-ligne une fois installée

## Structure des fichiers

```
belote-app/
├── index.html        ← la structure de la page (le "squelette")
├── css/styles.css    ← l'apparence (couleurs, tailles, animations)
├── js/app.js         ← la logique (scores, sauvegarde, boutons)
├── manifest.json     ← la fiche d'identité de la PWA (nom, icônes)
├── sw.js             ← le service worker (mode hors-ligne)
└── icons/            ← les icônes de l'écran d'accueil
```

## L'idée clé du code (à lire avant de modifier)

Tout repose sur un principe simple, expliqué en tête de `js/app.js` :

1. Un objet `state` contient **toutes** les données (noms, manches, objectif).
2. Chaque action suit le même trajet : **modifier `state` → `save()` → `render()`**.
3. `render()` redessine l'écran à partir de `state`.

C'est le même principe que les grands frameworks (React, Vue…), en
miniature. Si vous le respectez, l'appli restera simple à faire évoluer.

## Tester sur votre ordinateur

Ouvrir `index.html` directement fonctionne, mais le mode hors-ligne exige
un vrai serveur local. Le plus simple, dans un terminal :

```
cd belote-app
python3 -m http.server 8000
```

Puis ouvrez http://localhost:8000 dans votre navigateur. Sur Windows sans
Python, l'extension « Live Server » de VS Code fait la même chose en un clic.

## Mettre en ligne (obligatoire pour installer sur les téléphones)

Une PWA doit être servie en HTTPS. Deux options gratuites :

**Netlify Drop (le plus simple, 2 minutes)**
1. Allez sur https://app.netlify.com/drop
2. Glissez-déposez le dossier `belote-app` entier
3. Netlify vous donne une adresse en `https://…netlify.app` — c'est fini

**GitHub Pages (mieux sur la durée, garde l'historique du code)**
1. Créez un compte GitHub et un dépôt (repository), par ex. `belote`
2. Envoyez-y tous les fichiers (bouton « Add file → Upload files »)
3. Dans Settings → Pages, choisissez la branche `main` et validez
4. L'appli sera sur `https://votre-pseudo.github.io/belote/`

## Installer sur les téléphones des copains

- **iPhone** : ouvrir l'adresse dans **Safari** → bouton Partager →
  « Sur l'écran d'accueil ». (Ne fonctionne pas depuis Chrome sur iOS.)
- **Android** : ouvrir dans Chrome → menu ⋮ → « Installer l'application ».

L'appli s'ouvre ensuite en plein écran, comme une vraie application.

## Publier une mise à jour

1. Modifiez vos fichiers, testez en local
2. **Incrémentez `CACHE_NAME` dans `sw.js`** (`belote-v1` → `belote-v2`) —
   sinon les téléphones garderont l'ancienne version en cache
3. Re-déployez (nouveau glisser-déposer sur Netlify, ou push sur GitHub)
4. Sur le téléphone, fermez et rouvrez l'appli deux fois

## Idées de fonctionnalités, par difficulté croissante

1. **Complément automatique à 162** : quand on tape les points d'une
   équipe, pré-remplir l'autre champ. (Tout se passe dans `app.js`,
   écoutez l'événement `input` — bon premier exercice.)
2. **Belote-Rebelote** : une case à cocher qui ajoute 20 points.
3. **Annonces** (tierce, cinquante, cent…) puis **contrée / coinche**.
4. **Historique des parties terminées** (un tableau `finishedGames`
   dans `state`).
5. **Écran de statistiques** : victoires par équipe, plus gros score…
