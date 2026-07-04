/* =========================================================
   Compteur Belote — logique de l'application
   ---------------------------------------------------------
   ARCHITECTURE (à comprendre avant de modifier quoi que ce soit) :

   1. `state` est un objet unique qui contient TOUTES les données
      de la partie (noms, objectif, manches). C'est la "source de
      vérité" : l'écran n'est qu'un reflet de cet objet.

   2. Chaque action de l'utilisateur suit toujours le même trajet :
         modifier `state`  →  save()  →  render()

   3. `render()` redessine l'écran entier à partir de `state`.
      On ne bricole jamais l'affichage à la main ailleurs.

   Pour ajouter une fonctionnalité : ajoutez une donnée dans
   `defaultState()`, une fonction d'action, et affichez-la
   dans `render()`. C'est tout.
   ========================================================= */

'use strict';

/* ---------- 1. L'état ---------- */

const STORAGE_KEY = 'belote-state-v1';

function defaultState() {
  return {
    teamNames: ['Nous', 'Eux'],
    target: 501,          // score à atteindre pour gagner
    rounds: [],           // liste des manches : [{ points: [82, 80] }, ...]
  };
}

/* ---------- 2. Sauvegarde / chargement ----------
   localStorage garde les données sur le téléphone, même si on
   ferme l'appli. Le try/catch évite un plantage si le stockage
   est indisponible (ex. navigation privée sur iOS). */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      // On fusionne avec defaultState() : si une future version
      // ajoute un champ, les anciennes sauvegardes restent valides.
      return { ...defaultState(), ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Stockage indisponible, la partie ne sera pas sauvegardée.');
  }
  return defaultState();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) { /* pas grave : l'appli fonctionne sans sauvegarde */ }
}

let state = load();

/* ---------- 3. Calculs dérivés ----------
   On ne stocke jamais les totaux : on les recalcule à partir des
   manches. Une seule source de vérité = zéro incohérence. */

function totals() {
  return state.rounds.reduce(
    (acc, round) => [acc[0] + round.points[0], acc[1] + round.points[1]],
    [0, 0]
  );
}

/* Renvoie 0 ou 1 (index de l'équipe gagnante), ou -1 si personne
   n'a encore gagné. Si les deux équipes franchissent l'objectif
   dans la même manche, la plus haute l'emporte (variante simple,
   les règles diffèrent selon les tables : adaptez si besoin). */
function winnerIndex() {
  const [a, b] = totals();
  if (a < state.target && b < state.target) return -1;
  if (a === b) return -1; // égalité parfaite : on continue
  return a > b ? 0 : 1;
}

/* ---------- 4. Les actions ---------- */

function addRound(p0, p1) {
  state.rounds.push({ points: [p0, p1] });
  save();
  render({ bumpScores: true });
}

function undoLastRound() {
  state.rounds.pop();
  save();
  render();
}

function newGame() {
  state.rounds = []; // on garde les noms d'équipes et l'objectif
  save();
  render();
}

/* ---------- 5. Le rendu ---------- */

// Petit raccourci pour attraper un élément par son id
const $ = (id) => document.getElementById(id);

function render(options = {}) {
  const [scoreA, scoreB] = totals();
  const winner = winnerIndex();

  // Scores
  updateScore($('score-0'), scoreA, options.bumpScores);
  updateScore($('score-1'), scoreB, options.bumpScores);

  // Noms et objectif (utile au premier chargement / après reset)
  $('name-0').value = state.teamNames[0];
  $('name-1').value = state.teamNames[1];
  $('target-select').value = String(state.target);

  // Historique (la manche la plus récente en haut)
  const list = $('history-list');
  list.innerHTML = '';
  state.rounds.forEach((round, i) => {
    const li = document.createElement('li');
    li.innerHTML =
      `<span class="round-label">Manche ${i + 1}</span>` +
      `<span class="round-points">${round.points[0]} — ${round.points[1]}</span>`;
    list.prepend(li);
  });
  $('history-empty').hidden = state.rounds.length > 0;

  // Équipe gagnante : halo doré + bandeau + saisie désactivée
  $('card-0').classList.toggle('is-winner', winner === 0);
  $('card-1').classList.toggle('is-winner', winner === 1);

  const banner = $('winner-banner');
  banner.hidden = winner === -1;
  if (winner !== -1) {
    banner.textContent = `${state.teamNames[winner]} remporte la partie !`;
  }

  const gameOver = winner !== -1;
  $('input-0').disabled = gameOver;
  $('input-1').disabled = gameOver;
  $('btn-add').disabled = gameOver;
  $('btn-undo').disabled = state.rounds.length === 0;
}

/* Met à jour un score avec une petite animation "pop" si la
   valeur a changé. */
function updateScore(el, value, animate) {
  const changed = el.textContent !== String(value);
  el.textContent = value;
  if (animate && changed) {
    el.classList.remove('bump');
    void el.offsetWidth; // force le navigateur à "voir" le retrait
    el.classList.add('bump');
  }
}

/* ---------- 6. Les événements ---------- */

$('btn-add').addEventListener('click', () => {
  // Champ vide = 0 (pratique pour un capot)
  const p0 = parseInt($('input-0').value, 10) || 0;
  const p1 = parseInt($('input-1').value, 10) || 0;

  if (p0 < 0 || p1 < 0) return;
  if (p0 + p1 === 0) {
    $('input-0').focus();
    return; // rien à ajouter
  }

  addRound(p0, p1);
  $('input-0').value = '';
  $('input-1').value = '';
  $('input-0').focus();
});

// La touche Entrée valide aussi la manche
['input-0', 'input-1'].forEach((id) => {
  $(id).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('btn-add').click();
  });
});

$('btn-undo').addEventListener('click', undoLastRound);

$('btn-new').addEventListener('click', () => {
  if (state.rounds.length === 0 || confirm('Effacer la partie en cours ?')) {
    newGame();
  }
});

// Renommer une équipe : on tape directement dans le titre de la carte
[0, 1].forEach((i) => {
  $(`name-${i}`).addEventListener('change', (event) => {
    state.teamNames[i] = event.target.value.trim() || defaultState().teamNames[i];
    save();
    render();
  });
});

$('target-select').addEventListener('change', (event) => {
  state.target = parseInt(event.target.value, 10);
  save();
  render(); // re-vérifie si quelqu'un a déjà gagné avec ce nouvel objectif
});

/* ---------- 7. Démarrage ---------- */

render();

// Enregistre le service worker : c'est lui qui permet à l'appli
// de fonctionner sans connexion une fois installée.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    // Pas de service worker (ex. ouverture en fichier local) :
    // l'appli fonctionne quand même, juste sans le mode hors-ligne.
  });
}
