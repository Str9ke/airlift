// Programme board-off — 3 séances / semaine (mardi, vendredi, dimanche), 2 séries par exercice.
// `id` réutilise un exercice historique quand il existe (squat, dips, trapeze-moyen-incline, ...).
// Ces valeurs ne servent qu'à la PREMIÈRE installation : ensuite, c'est ta configuration
// (stockée dans tes données) qui fait foi. Les évolutions passent par MIGRATIONS (store.js),
// qui n'ajoutent jamais rien par-dessus une modification que tu as faite.
export const DEFAULT_DAYS = [
  { id: 'mar', short: 'Mar', wd: 2, label: 'Mardi · Force + board-off' },
  { id: 'ven', short: 'Ven', wd: 5, label: 'Vendredi · Spécifique board-off' },
  { id: 'dim', short: 'Dim', wd: 0, label: 'Dimanche · Dos, jambes, épaules' },
];
export const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const ECHEC = 'Dernière série à l\'échec';
const SECU = '1 rep avant l\'échec technique (dos neutre)';

// type: load | bw_load (poids du corps + lest) | assisted (machine d'assistance) | reps | time
// equip: barbell | machine | db2 (2 haltères, poids par haltère) | db2t (2 haltères, poids total noté) | db1 | bodyweight | band
// Fréquence : les mouvements clés (tractions, tirage machine, dips, deltoïde latéral, fléchisseurs de hanche)
// reviennent 2 fois par semaine. Séries : 3 = priorité (objectif board-off / tractions), 2 = standard,
// 1 = muscle déjà bien travaillé ailleurs dans la semaine, ou prévention.
export const PROGRAM = [
  // Geste board-off en premier (vendredi) : qualité motrice quand tu es frais
  { id: 'harnais-planche', name: 'Board-off harnais + planche', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['ven'], sets: 3, repMin: 3, repMax: 3, cue: '3 reps de qualité · 90 s de récup · jamais à l\'épuisement' },
  { id: 'strap-finding-drill', name: 'Strap finding drill', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['ven'], sets: 2, repMin: 5, repMax: 10, cue: 'Réussites sur 10 · sans regarder le pied' },
  // Mardi — force + board-off
  { id: 'squat', name: 'Squat', category: 'Jambes', equip: 'barbell', type: 'load', days: ['mar'], sets: 2, repMin: 8, repMax: 12, cue: SECU },
  { id: 'developpe-couche', name: 'Développé couché', category: 'Pecs', equip: 'barbell', type: 'load', days: ['mar'], sets: 2, repMin: 8, repMax: 12, cue: ECHEC + ' (avec pareur ou sécurités)' },
  { id: 'tractions', name: 'Tractions', category: 'Dos', equip: 'bodyweight', type: 'bw_load', days: ['mar', 'dim'], sets: 3, repMin: 4, repMax: 10, cue: 'Strictes · lest en kg (0 = poids du corps) · priorité n°1 : 3 séries' },
  { id: 'tirage-vertical-poulie', name: 'Tirage vertical machine', category: 'Dos', equip: 'machine', type: 'load', days: ['mar', 'dim'], sets: 2, repMin: 8, repMax: 12, cue: 'Juste après les tractions · ' + ECHEC.toLowerCase() },
  { id: 'dips', name: 'Dips', category: 'Pecs', equip: 'bodyweight', type: 'bw_load', days: ['mar', 'dim'], sets: 2, repMin: 8, repMax: 12, cue: 'Lest en kg · ' + ECHEC.toLowerCase() },
  { id: 'deltoide-lateral', name: 'Élévations latérales', category: 'Épaules', equip: 'db1', type: 'load', days: ['mar', 'ven'], sets: 2, repMin: 8, repMax: 15, cue: 'Un bras à la fois · ' + ECHEC.toLowerCase() },
  { id: 'hanging-leg-raises', name: 'Relevés de jambes suspendu', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['mar'], sets: 3, repMin: 6, repMax: 12, cue: 'Bassin enroulé en haut, pas de balancier · priorité board-off' },
  { id: 'tuck-hold', name: 'Tuck hold suspendu', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['mar', 'ven'], sets: 2, timeMin: 10, timeMax: 20, cue: 'Genoux au-dessus des hanches · clé de la version poignée' },
  // Vendredi — spécifique board-off (court, qualité avant fatigue)
  { id: 'psoas-march', name: 'Psoas march élastique', category: 'Board-off', equip: 'band', type: 'reps', days: ['ven'], sets: 2, repMin: 6, repMax: 10, cue: 'Allongé · hanche > 100° · maintien 3 s · par jambe' },
  { id: 'tucks-explosifs', name: 'Tucks suspendus explosifs', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['ven'], sets: 2, repMin: 3, repMax: 6, cue: 'Vitesse max à la montée, descente contrôlée · arrêter dès que ça ralentit' },
  { id: 'maintien-jambes-90', name: 'Maintien jambes à 90°', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 10, timeMax: 30 },
  { id: 'compression-pike', name: 'Compression active pike', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 5, timeMax: 15, cue: 'Assis, mains à côté des cuisses, décoller les talons' },
  { id: 'pallof-press', name: 'Pallof press', category: 'Abdos', equip: 'machine', type: 'load', days: ['ven'], sets: 1, repMin: 10, repMax: 12, cue: 'Par côté' },
  // Dimanche — dos, jambes, épaules
  { id: 'deadlift', name: 'Deadlift', category: 'Jambes', equip: 'barbell', type: 'load', days: ['dim'], sets: 2, repMin: 6, repMax: 12, cue: SECU },
  { id: 'trapeze-moyen-incline', name: 'Tirage penché haltères (trapèze moyen)', category: 'Dos', equip: 'db2t', type: 'load', days: ['dim'], sets: 2, repMin: 8, repMax: 12, cue: 'Penché en avant, coudes vers l\'extérieur, serrer les omoplates · poids total des 2 haltères' },
  { id: 'developpe-epaules', name: 'Développé épaules', category: 'Épaules', equip: 'db2', type: 'load', days: ['dim'], sets: 2, repMin: 8, repMax: 12 },
  { id: 'deltoide-anterieur', name: 'Élévations frontales', category: 'Épaules', equip: 'db2', type: 'load', days: ['dim'], sets: 1, repMin: 8, repMax: 15, cue: '1 série à l\'échec : l\'avant de l\'épaule travaille déjà au couché, aux dips et au développé' },
  { id: 'iso-deltoide-90', name: 'Maintien bras à 90° (deltoïdes)', category: 'Épaules', equip: 'db2', type: 'time', days: ['dim'], sets: 2, timeMin: 20, timeMax: 45, cue: 'Haltères bras tendus à l\'horizontale · note la charge dans la note de séance' },
  { id: 'curl-marteau', name: 'Curl marteau', category: 'Biceps', equip: 'db2', type: 'load', days: ['dim'], sets: 2, repMin: 8, repMax: 12, cue: 'Descente 3 s · ' + ECHEC.toLowerCase() },
  { id: 'releve-jambes-banc-45', name: 'Relevé jambes banc 45°', category: 'Abdos', equip: 'bodyweight', type: 'reps', days: ['dim'], sets: 2, repMin: 8, repMax: 15 },
  { id: 'rotation-externe-epaule', name: 'Rotation externe épaule', category: 'Épaules', equip: 'band', type: 'reps', days: ['dim'], sets: 1, repMin: 12, repMax: 20, cue: 'Prévention épaule (kite) · 1 série suffit' },
];

export const EQUIP = {
  barbell: { label: 'Barre', inc: 1, hint: '+0,5 kg de chaque côté' },
  machine: { label: 'Machine / poulie', inc: 1, hint: 'plus petit cran de la machine' },
  db2: { label: '2 haltères', inc: 1, hint: 'poids PAR haltère · +1 kg/haltère = +2 kg au total' },
  db2t: { label: '2 haltères (total)', inc: 2, hint: 'poids TOTAL des 2 haltères · +2 kg = +1 kg par haltère' },
  db1: { label: '1 haltère', inc: 1, hint: 'poids de l\'haltère · +0,5 kg de chaque côté' },
  bodyweight: { label: 'Poids du corps', inc: 1, hint: 'lest en kg si besoin' },
  band: { label: 'Élastique', inc: 0, hint: 'progression en répétitions' },
};

export const TYPES = {
  load: 'Charge × reps',
  bw_load: 'Poids du corps + lest',
  assisted: 'Assistée (machine)',
  reps: 'Répétitions',
  time: 'Durée (s)',
};

export const CATEGORIES = ['Board-off', 'Abdos', 'Dos', 'Pecs', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Cardio', 'Autre'];

// Proposés hors programme (anciens exercices), à activer d'un tap.
export const EXTRA = [
  { id: 'tractions-assistees', name: 'Tractions assistées', category: 'Dos', equip: 'machine', type: 'assisted', days: ['mar'], sets: 1, repMin: 8, repMax: 12, cue: 'Assistance en kg (moins = mieux)' },
  { id: 'iso-coude-90', name: 'Isométrique coude 90°', category: 'Biceps', equip: 'db1', type: 'time', days: ['dim'], sets: 3, timeMin: 30, timeMax: 45, cue: 'Charge lourde · si douleur de biceps après le kite' },
  { id: 'flexion-hanche-elastique', name: 'Flexion de hanche élastique', category: 'Board-off', equip: 'band', type: 'reps', days: ['ven'], sets: 2, repMin: 10, repMax: 15, cue: 'Par jambe · genou au-delà de 90°' },
  { id: 'suspension-barre', name: 'Suspension à la barre', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 20, timeMax: 45 },
  { id: 'face-pull', name: 'Face pull', category: 'Épaules', equip: 'machine', type: 'load', days: ['dim'], sets: 2, repMin: 12, repMax: 15 },
  { id: 'seated-pike-lifts', name: 'Seated pike lifts', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['mar'], sets: 2, repMin: 3, repMax: 8, cue: 'Blocs sous les mains au début · maintien 2 s' },
];
