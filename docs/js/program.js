// Programme board-off (8 semaines) — exercices ajoutés à l'historique existant.
// `id` réutilise un exercice historique quand il existe (squat, deadlift, ...).
export const DAYS = [
  { id: 'A', short: 'A', label: 'Lundi · Force + board-off' },
  { id: 'BO', short: 'BO', label: 'Mercredi · Spécifique board-off' },
  { id: 'B', short: 'B', label: 'Vendredi · Chaîne postérieure' },
];

// type: load | bw_load (poids du corps + lest) | assisted (machine d'assistance) | reps | time
// equip: barbell | machine | db2 (2 haltères) | db1 (1 haltère) | bodyweight | band
export const PROGRAM = [
  // Lundi A
  { id: 'squat', name: 'Squat', category: 'Jambes', equip: 'barbell', type: 'load', days: ['A'], sets: 3, repMin: 6, repMax: 8, cue: '2-3 reps en réserve' },
  { id: 'developpe-couche', name: 'Développé couché', category: 'Pecs', equip: 'barbell', type: 'load', days: ['A'], sets: 3, repMin: 6, repMax: 8, cue: '2-3 reps en réserve' },
  { id: 'tractions-assistees', name: 'Tractions assistées', category: 'Dos', equip: 'machine', type: 'assisted', days: ['A'], sets: 3, repMin: 6, repMax: 8, cue: 'Assistance = kg affichés (moins = mieux)' },
  { id: 'hanging-leg-raises', name: 'Hanging leg raises', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['A', 'BO'], sets: 3, repMin: 6, repMax: 10, cue: 'Montée contrôlée, rétroversion en haut, pas de balancier' },
  { id: 'seated-pike-lifts', name: 'Seated pike lifts', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['A'], sets: 3, repMin: 6, repMax: 12, cue: 'Maintien 2 s jambes décollées, retour lent' },
  { id: 'face-pull', name: 'Face pull', category: 'Épaules', equip: 'machine', type: 'load', days: ['A'], sets: 3, repMin: 12, repMax: 15 },
  { id: 'hollow-body-hold', name: 'Hollow body hold', category: 'Abdos', equip: 'bodyweight', type: 'time', days: ['A'], sets: 3, timeMin: 20, timeMax: 40, cue: 'Lombaires plaquées au sol' },
  // Mercredi BO
  { id: 'flexion-hanche-elastique', name: 'Flexion de hanche élastique', category: 'Board-off', equip: 'band', type: 'reps', days: ['BO'], sets: 3, repMin: 10, repMax: 15, cue: 'Par jambe · genou au-delà de 90°' },
  { id: 'maintien-jambes-90', name: 'Maintien jambes à 90°', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['BO'], sets: 3, timeMin: 10, timeMax: 30 },
  { id: 'strap-finding-drill', name: 'Strap finding drill', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['BO'], sets: 3, repMin: 5, repMax: 10, cue: 'Réussites / 10 · sans regarder le pied' },
  { id: 'pallof-press', name: 'Pallof press', category: 'Abdos', equip: 'machine', type: 'load', days: ['BO'], sets: 3, repMin: 10, repMax: 12, cue: 'Par côté' },
  { id: 'suspension-barre', name: 'Suspension à la barre', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['BO'], sets: 3, timeMin: 20, timeMax: 45 },
  { id: 'harnais-planche', name: 'Board-off harnais + planche', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['BO'], sets: 3, repMin: 3, repMax: 3, cue: '3 reps de qualité · 90 s de récup · jamais à l\'épuisement' },
  // Vendredi B
  { id: 'deadlift', name: 'Deadlift', category: 'Jambes', equip: 'barbell', type: 'load', days: ['B'], sets: 3, repMin: 5, repMax: 6 },
  { id: 'rowing-barre', name: 'Rowing barre', category: 'Dos', equip: 'barbell', type: 'load', days: ['B'], sets: 3, repMin: 8, repMax: 10 },
  { id: 'developpe-epaules', name: 'Développé épaules', category: 'Épaules', equip: 'db2', type: 'load', days: ['B'], sets: 3, repMin: 6, repMax: 8 },
  { id: 'tractions', name: 'Tractions', category: 'Dos', equip: 'bodyweight', type: 'bw_load', days: ['B'], sets: 4, repMin: 2, repMax: 5, cue: 'Strictes · ne pas aller à l\'échec · lest en kg' },
  { id: 'reverse-crunch', name: 'Reverse crunch', category: 'Abdos', equip: 'bodyweight', type: 'reps', days: ['B'], sets: 3, repMin: 10, repMax: 15, cue: 'Enrouler le bassin' },
  { id: 'curl-marteau', name: 'Curl marteau', category: 'Biceps', equip: 'db2', type: 'load', days: ['B'], sets: 3, repMin: 10, repMax: 12, cue: 'Descente 3 s' },
  { id: 'rotation-externe-epaule', name: 'Rotation externe épaule', category: 'Épaules', equip: 'band', type: 'reps', days: ['B'], sets: 3, repMin: 12, repMax: 15 },
];

export const EQUIP = {
  barbell: { label: 'Barre', inc: 1, hint: '+0,5 kg de chaque côté' },
  machine: { label: 'Machine / poulie', inc: 1, hint: 'plus petit cran de la machine' },
  db2: { label: '2 haltères', inc: 1, hint: 'poids par haltère · +1 kg/haltère = +2 kg au total' },
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

// Recommandations complémentaires (analyse) — proposées hors programme, à activer d'un tap.
export const EXTRA = [
  { id: 'tuck-hold', name: 'Tuck hold suspendu', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['BO'], sets: 3, timeMin: 10, timeMax: 20, cue: 'Genoux au-dessus des hanches · clé de la version poignée' },
  { id: 'psoas-march', name: 'Psoas march élastique', category: 'Board-off', equip: 'band', type: 'reps', days: ['A'], sets: 3, repMin: 6, repMax: 10, cue: 'Allongé · hanche > 100° · maintien 3 s' },
  { id: 'tucks-explosifs', name: 'Tucks suspendus explosifs', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['BO'], sets: 3, repMin: 3, repMax: 6, cue: 'Semaines 5-8 · vitesse max, descente contrôlée' },
  { id: 'compression-pike', name: 'Compression active pike', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['A'], sets: 3, timeMin: 5, timeMax: 15, cue: 'Assis, bras tendus, décoller les talons' },
  { id: 'iso-coude-90', name: 'Isométrique coude 90°', category: 'Biceps', equip: 'db1', type: 'time', days: ['B'], sets: 5, timeMin: 30, timeMax: 45, cue: 'Charge lourde · antalgique tendon' },
];
