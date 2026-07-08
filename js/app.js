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
const ROUND_TOTAL = 162; // total des points d'une manche classique, et plafond de saisie

function defaultState() {
  return {
    teamNames: ['Nous', 'Eux'],
    target: 1000,         // score à atteindre pour gagner
    rounds: [],           // liste des manches : [{ points: [82, 80], belote: [true, false] }, ...]
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

// Écran affiché : 'game' (la partie et ses manches) ou 'entry'
// (saisie d'une manche). C'est un état d'interface, non sauvegardé :
// au rechargement on revient toujours sur la partie.
let currentView = 'game';

function showView(view) {
  currentView = view;
  render();
}

/* ---------- 3. Calculs dérivés ----------
   On ne stocke jamais les totaux : on les recalcule à partir des
   manches. Une seule source de vérité = zéro incohérence. */

/* La belote-rebelote vaut 20 points. Les anciennes sauvegardes
   n'ont pas de champ `belote` : on considère alors qu'il n'y a
   pas eu d'annonce. */
function beloteBonus(round, team) {
  return round.belote && round.belote[team] ? 20 : 0;
}

function totals() {
  return state.rounds.reduce(
    (acc, round) => [
      acc[0] + round.points[0] + beloteBonus(round, 0),
      acc[1] + round.points[1] + beloteBonus(round, 1),
    ],
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

function addRound(p0, p1, belote) {
  state.rounds.push({ points: [p0, p1], belote });
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

  // Bascule entre les deux écrans
  $('view-game').hidden = currentView !== 'game';
  $('view-entry').hidden = currentView !== 'entry';

  // Scores
  updateScore($('score-0'), scoreA, options.bumpScores);
  updateScore($('score-1'), scoreB, options.bumpScores);

  // Noms et objectif (utile au premier chargement / après reset)
  $('name-0').value = state.teamNames[0];
  $('name-1').value = state.teamNames[1];
  $('target-select').value = String(state.target);

  // Écran de saisie : numéro de la manche en cours et noms d'équipes
  $('entry-title').textContent = `Manche ${state.rounds.length + 1}`;
  $('entry-name-0').textContent = state.teamNames[0];
  $('entry-name-1').textContent = state.teamNames[1];

  // Historique (la manche la plus récente en haut)
  const list = $('history-list');
  list.innerHTML = '';
  state.rounds.forEach((round, i) => {
    const li = document.createElement('li');
    // "♛" signale une belote-rebelote : les 20 points sont déjà
    // comptés dans le total, on rappelle juste qui l'a annoncée.
    const mark = (team) => (beloteBonus(round, team) ? ' ♛' : '');
    li.innerHTML =
      `<span class="round-label">Manche ${i + 1}</span>` +
      `<span class="round-points">${round.points[0]}${mark(0)} — ${round.points[1]}${mark(1)}</span>`;
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
  // Pendant un capot, les points sont imposés (252 — 0) :
  // la saisie manuelle reste verrouillée tant que la case est cochée.
  const capotLock = $('capot-0').checked || $('capot-1').checked;
  $('input-0').disabled = gameOver || capotLock;
  $('input-1').disabled = gameOver || capotLock;
  $('belote-0').disabled = gameOver;
  $('belote-1').disabled = gameOver;
  $('capot-0').disabled = gameOver;
  $('capot-1').disabled = gameOver;
  $('btn-add').disabled = gameOver;
  $('btn-open-entry').disabled = gameOver;
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

/* Remet l'écran de saisie à zéro : champs vides, cases décochées. */
function resetEntry() {
  $('input-0').value = '';
  $('input-1').value = '';
  ['belote-0', 'belote-1', 'capot-0', 'capot-1'].forEach((id) => {
    $(id).checked = false;
  });
  autoFilled = [false, false]; // on réactive le remplissage automatique
}

// Ouvrir l'écran de saisie d'une nouvelle manche
$('btn-open-entry').addEventListener('click', () => {
  resetEntry();
  showView('entry');
  $('input-0').focus();
});

// Quitter la saisie sans rien enregistrer
$('btn-entry-cancel').addEventListener('click', () => {
  resetEntry();
  showView('game');
});

$('btn-add').addEventListener('click', () => {
  // Champ vide = 0 (pratique pour un capot)
  const p0 = parseInt($('input-0').value, 10) || 0;
  const p1 = parseInt($('input-1').value, 10) || 0;
  const belote = [$('belote-0').checked, $('belote-1').checked];

  if (p0 < 0 || p1 < 0) return;
  // Au-delà de 162, seuls les 252 imposés par la case capot passent
  const capotOn = $('capot-0').checked || $('capot-1').checked;
  if (!capotOn && (p0 > ROUND_TOTAL || p1 > ROUND_TOTAL)) return;
  if (p0 + p1 === 0) {
    $('input-0').focus();
    return; // rien à ajouter, même si une belote est cochée
  }

  // On vide la saisie et on repasse sur l'écran de la partie AVANT
  // addRound() : son render() recalcule ainsi le verrouillage avec
  // les cases décochées, et l'animation des scores est visible.
  resetEntry();
  currentView = 'game';
  addRound(p0, p1, belote);
});

// La touche Entrée valide aussi la manche
['input-0', 'input-1'].forEach((id) => {
  $(id).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('btn-add').click();
  });
});

// Une seule belote-rebelote possible par manche (il n'y a qu'un
// roi et une dame d'atout) : cocher une case décoche l'autre.
[0, 1].forEach((i) => {
  $(`belote-${i}`).addEventListener('change', (event) => {
    if (event.target.checked) $(`belote-${1 - i}`).checked = false;
  });
});

/* --- Capot --- */
// L'équipe qui remporte tous les plis marque 252 points, l'adversaire 0.
// Cocher une case impose ces points et verrouille la saisie manuelle ;
// décocher rend la main au joueur avec des champs vides.
const CAPOT_POINTS = 252;

[0, 1].forEach((i) => {
  $(`capot-${i}`).addEventListener('change', (event) => {
    // Un seul capot possible par manche
    if (event.target.checked) $(`capot-${1 - i}`).checked = false;

    const capot = [$('capot-0').checked, $('capot-1').checked];
    if (capot[0] || capot[1]) {
      $('input-0').value = capot[0] ? CAPOT_POINTS : 0;
      $('input-1').value = capot[1] ? CAPOT_POINTS : 0;
    } else {
      $('input-0').value = '';
      $('input-1').value = '';
    }
    autoFilled = [false, false]; // ces valeurs ne relèvent pas du complément à 162
    render(); // met à jour le verrouillage des champs
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

/* --- Complément automatique à 162 --- */
// À qui appartient le contenu actuel de chaque champ ?
// true = écrit par la machine (on peut l'écraser), false = tapé par le joueur ou vide
let autoFilled = [false, false];

[0, 1].forEach((i) => {
  const other = 1 - i;

  $(`input-${i}`).addEventListener('input', () => {
    // Le joueur vient d'écrire ou de vider ce champ : il lui appartient
    autoFilled[i] = false;

    // Saisie plafonnée à 162 : au-delà, on ramène au maximum.
    // (Les 252 d'un capot sont posés par sa case, jamais tapés ici.)
    let value = parseInt($(`input-${i}`).value, 10);
    if (value > ROUND_TOTAL) {
      value = ROUND_TOTAL;
      $(`input-${i}`).value = ROUND_TOTAL;
    }

    const otherField = $(`input-${other}`);

    // Règle d'or : on n'écrase jamais un contenu tapé par le joueur.
    // On n'écrit en face que sur du vide ou sur du contenu machine.
    if (otherField.value !== '' && !autoFilled[other]) return;

    if (Number.isNaN(value)) {
      otherField.value = '';       // champ vidé → le complément se vide aussi
      autoFilled[other] = false;   // un champ vide n'appartient à personne
    } else {
      otherField.value = Math.max(0, ROUND_TOTAL - value);
      autoFilled[other] = true;    // ce contenu est à la machine
    }
  });
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
