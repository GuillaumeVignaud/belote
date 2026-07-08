/* =========================================================
   Service worker — le "moteur hors-ligne" de la PWA
   ---------------------------------------------------------
   À l'installation, il met en cache tous les fichiers de
   l'appli. Ensuite, chaque fois que le téléphone demande un
   fichier, il le sert depuis le cache : l'appli fonctionne
   donc sans aucune connexion.

   IMPORTANT — pour publier une mise à jour :
   incrémentez CACHE_NAME (v1 → v2). Le navigateur détecte
   le changement, re-télécharge les fichiers et supprime
   l'ancien cache. Si vous oubliez, vos utilisateurs
   resteront sur l'ancienne version.
   ========================================================= */

const CACHE_NAME = 'belote-v5';

// La liste complète des fichiers de l'appli ("app shell").
// Si vous ajoutez un fichier au projet, ajoutez-le ici aussi.
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Installation : on télécharge et on met tout en cache.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // la nouvelle version prend la main tout de suite
});

// Activation : on supprime les caches des anciennes versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Interception des requêtes : cache d'abord, réseau en secours.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // Hors-ligne et fichier absent du cache : pour une
        // navigation, on renvoie la page d'accueil.
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
