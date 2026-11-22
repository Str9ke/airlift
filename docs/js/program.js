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
// Organisation (preuves : volume hebdomadaire > fréquence ; l'exercice placé en premier progresse le plus ;
// explosif avant isométrique ; superset agoniste/antagoniste = même travail en moins de temps).
//  - chaque muscle 2 fois / semaine, les mouvements clés 2 fois, les secondaires 1 fois ;
//  - l'ordre global ci-dessous donne l'ordre dans chaque séance (spécifique board-off et tractions en premier) ;
//  - superset: true = « enchaîne avec l'exercice suivant du jour, puis repos » ;
export const PROGRAM = [
  // Vendredi — geste board-off en premier (qualité motrice quand tu es frais), puis explosif, puis iso
  { id: 'harnais-planche', name: 'Board-off harnais + planche', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['ven'], sets: 3, repMin: 3, repMax: 3, cue: 'Suspendu au harnais, planche aux pieds · 3 reps de qualité · 90 s de récup · jamais à l\'épuisement' },
  { id: 'strap-finding-drill', name: 'Strap finding drill', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['ven'], sets: 2, repMin: 5, repMax: 10, cue: 'Réussites sur 10 · sans regarder le pied' },
  { id: 'tucks-explosifs', name: 'Tucks suspendus explosifs', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['ven'], sets: 2, repMin: 3, repMax: 6, cue: 'Genoux PLIÉS · genoux à la poitrine puis enroule le bassin : pieds le plus haut possible (objectif hauteur de la tête) · vitesse max, descente contrôlée' },
  { id: 'tenue-barre-1-main', name: 'Contrôle de barre à une main', category: 'Board-off', equip: 'barbell', type: 'load_time', days: ['ven'], sets: 2, timeMin: 20, timeMax: 40, side: true, cue: 'Barre tenue au milieu, une main, bras fléchi à hauteur des yeux (pas au-dessus du visage) · garde-la horizontale, tronc gainé · l\'autre main va chercher le genou · par main' },
  // Mardi / dimanche — tractions en premier (priorité n°1), puis les gros mouvements, puis le spécifique
  { id: 'tractions', name: 'Tractions', category: 'Dos', equip: 'bodyweight', type: 'bw_load', days: ['mar', 'dim'], sets: 3, repMin: 4, repMax: 10, cue: 'Strictes · lest en kg (0 = poids du corps) · priorité n°1 : 3 séries' },
  { id: 'squat', name: 'Squat', category: 'Jambes', equip: 'barbell', type: 'load', days: ['mar', 'dim'], sets: 2, repMin: 8, repMax: 12, cue: SECU },
  { id: 'deadlift', name: 'Deadlift', category: 'Jambes', equip: 'barbell', type: 'load', days: ['mar', 'dim'], sets: 2, daySets: { mar: 1 }, repMin: 6, repMax: 12, cue: SECU + ' · mardi : 1 série technique' },
  { id: 'hanging-leg-raises', name: 'Relevés de jambes suspendu', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['mar'], sets: 3, repMin: 6, repMax: 12, cue: 'Bassin enroulé en haut, pas de balancier · priorité board-off' },
  { id: 'tuck-hold', name: 'Tuck hold suspendu', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['mar', 'ven'], sets: 2, timeMin: 10, timeMax: 20, cue: 'Genoux au-dessus des hanches · clé de la version poignée' },
  { id: 'developpe-couche', name: 'Développé couché', category: 'Pecs', equip: 'barbell', type: 'load', days: ['mar'], sets: 2, repMin: 8, repMax: 12, cue: ECHEC + ' (avec pareur ou sécurités)' },
  { id: 'dips', name: 'Dips', category: 'Pecs', equip: 'bodyweight', type: 'bw_load', days: ['mar', 'dim'], sets: 2, repMin: 8, repMax: 12, superset: true, cue: 'Lest en kg · ' + ECHEC.toLowerCase() },
  { id: 'tirage-vertical-poulie', name: 'Tirage vertical machine', category: 'Dos', equip: 'machine', type: 'load', days: ['mar', 'dim'], sets: 2, repMin: 8, repMax: 12, cue: 'En superset avec les dips · ' + ECHEC.toLowerCase() },
  { id: 'psoas-march', name: 'Flexion de hanche poulie (couché)', category: 'Board-off', equip: 'machine', type: 'load', days: ['ven'], sets: 2, repMin: 6, repMax: 10, side: true, superset: true, cue: 'Couché sur le dos, poulie basse à la cheville · genou au-delà de 90°, vers la poitrine · maintien 2 s en haut · par jambe' },
  { id: 'compression-pike', name: 'Compression active pike', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 3, timeMax: 10, cue: 'Assis jambes tendues, mains au sol à côté des cuisses : pousse dans les mains et décolle les talons de 2-5 cm · tiens (s)' },
  { id: 'pallof-press', name: 'Bûcheron poulie haute → bas', category: 'Abdos', equip: 'machine', type: 'load', days: ['ven'], sets: 2, repMin: 10, repMax: 15, side: true, cue: 'Bras tendus, diagonale vers la hanche opposée en enroulant le tronc · par côté' },
  { id: 'trapeze-moyen-incline', name: 'Tirage penché haltères (trapèze moyen)', category: 'Dos', equip: 'db2t', type: 'load', days: ['dim'], sets: 2, repMin: 8, repMax: 12, superset: true, cue: 'Penché en avant, coudes vers l\'extérieur, serrer les omoplates · poids total des 2 haltères' },
  { id: 'deltoide-anterieur', name: 'Élévations frontales', category: 'Épaules', equip: 'db2', type: 'load', days: ['dim'], sets: 1, repMin: 8, repMax: 15, cue: '1 série à l\'échec : l\'avant de l\'épaule travaille déjà au couché et aux dips' },
  { id: 'deltoide-lateral', name: 'Élévations latérales', category: 'Épaules', equip: 'db1', type: 'load', days: ['mar', 'ven'], sets: 2, repMin: 8, repMax: 15, side: true, superset: true, cue: 'Un bras à la fois · ' + ECHEC.toLowerCase() },
  { id: 'curl-inverse', name: 'Curl en pronation (barre EZ)', category: 'Biceps', equip: 'barbell', type: 'load', days: ['mar'], sets: 2, repMin: 10, repMax: 15, cue: 'Prise par-dessus, comme sur la barre de kite · descente 3 s' },
  { id: 'curl-biceps-incline', name: 'Curl incliné haltères', category: 'Biceps', equip: 'db2', type: 'load', days: ['dim'], sets: 2, repMin: 8, repMax: 12, superset: true, cue: 'Banc 45-60°, bras pendants en arrière (biceps étiré) · descente 3-4 s · ' + ECHEC.toLowerCase() },
  { id: 'releve-jambes-banc-45', name: 'Relevé jambes banc 45°', category: 'Abdos', equip: 'bodyweight', type: 'reps', days: ['dim'], sets: 2, repMin: 8, repMax: 15 },
  { id: 'iso-deltoide-90', name: 'Maintien bras à 90° (deltoïdes)', category: 'Épaules', equip: 'db2', type: 'load_time', days: ['dim'], sets: 2, timeMin: 20, timeMax: 40, cue: 'Haltères bras tendus à l\'horizontale · kg par haltère' },
  { id: 'rotation-externe-epaule', name: 'Rotation externe épaule', category: 'Épaules', equip: 'band', type: 'reps', days: ['dim'], sets: 1, repMin: 12, repMax: 20, cue: 'Prévention épaule (kite) · 1 série suffit' },
  // Jeudi — mobilité à la maison (≈ 15 min, sans matériel). Souplesse = ≥ 5 min d'étirement / muscle / semaine, jamais douloureux.
];

// Programme précédent (1.2) — sert à savoir si tu as modifié un exercice : si oui, la mise à jour n'y touche pas.
export const PREV_12 = { 'developpe-couche': [2, 'mar'], dips: [2, 'mar,dim'], 'deltoide-anterieur': [1, 'dim'], tractions: [3, 'mar,dim'], deadlift: [2, 'dim'], squat: [2, 'mar'], 'tirage-vertical-poulie': [2, 'mar,dim'], 'trapeze-moyen-incline': [2, 'dim'], 'deltoide-lateral': [2, 'mar,ven'], 'releve-jambes-banc-45': [2, 'dim'], 'hanging-leg-raises': [3, 'mar'], 'maintien-jambes-90': [2, 'ven'], 'strap-finding-drill': [2, 'ven'], 'pallof-press': [1, 'ven'], 'harnais-planche': [3, 'ven'], 'developpe-epaules': [2, 'dim'], 'curl-marteau': [2, 'dim'], 'rotation-externe-epaule': [1, 'dim'], 'tuck-hold': [2, 'mar,ven'], 'psoas-march': [2, 'ven'], 'tucks-explosifs': [2, 'ven'], 'compression-pike': [2, 'ven'], 'iso-deltoide-90': [2, 'dim'] };

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
  load_time: 'Charge × durée',
  check: 'À cocher (mobilité)',
  group: 'Bloc d\'exercices',
};

export const STRETCHES = ['st-piriforme', 'st-ischios', 'st-quadriceps', 'st-adducteurs', 'st-psoas', 'st-carre-lombes', 'st-mollets', 'st-pectoraux', 'st-dorsaux', 'st-biceps', 'st-triceps'];

export const CATEGORIES = ['Board-off', 'Mobilité', 'Abdos', 'Dos', 'Pecs', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Cardio', 'Autre'];

// Proposés hors programme (anciens exercices), à activer d'un tap.
export const EXTRA = [
  { id: 'rot-interne-hanche', name: 'Rotation interne de hanche assis (poulie)', category: 'Jambes', equip: 'machine', type: 'load', side: true, days: [], sets: 2, repMin: 8, repMax: 12,
    cue: 'Assis au bord d\'un banc, genou à 90°, cuisse immobile (serviette roulée sous la cuisse) · poulie basse ou élastique accroché à la cheville, qui tire le pied vers l\'autre jambe · fais partir le pied vers l\'extérieur : le fémur tourne vers l\'intérieur · 2 s en fin d\'amplitude, retour en 3 s · le bassin ne bouge pas, la fesse ne décolle pas · dernière rep : tiens 10 s au bout · commence léger (2-5 kg)' },
  { id: 'copenhagen-plank', name: 'Copenhagen plank (adducteurs)', category: 'Jambes', equip: 'bodyweight', type: 'time', side: true, days: [], sets: 2, timeMin: 15, timeMax: 30,
    cue: 'Gainage latéral sur l\'avant-bras, la jambe du dessus posée sur un banc : c\'est elle qui te porte en serrant vers le bas · corps aligné, hanches hautes, la jambe du dessous pend sous le banc · niveau 1 = genou sur le banc (levier court), niveau 2 = cheville sur le banc (levier long) quand tu tiens 30 s · 1 min de récup, chaque côté' },
  // ---- échauffement (début de séance)
  { id: 'wu-cardio', name: 'Cardio léger progressif', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '5 min', cue: 'Vélo, rameur, corde à sauter ou footing · commence très facile et finis légèrement essoufflé (tu peux encore parler)' },
  { id: 'wu-hanches', name: 'Cercles de hanches + balancements de jambes', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '10 par jambe, chaque sens', cue: 'Debout, tiens-toi à un support · grands cercles du genou vers l\'extérieur puis vers l\'intérieur, puis balancements avant-arrière et latéraux' },
  { id: 'wu-worlds', name: 'World\'s greatest stretch (fente + rotation)', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '5 par côté', cue: 'Grande fente, main au sol à l\'intérieur du pied avant · coude vers la cheville, puis ouvre le bras vers le plafond en tournant le buste' },
  { id: 'wu-bras', name: 'Cercles de bras', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '10 vers l\'avant + 10 vers l\'arrière', cue: 'Bras tendus sur les côtés, petits cercles qui grandissent peu à peu' },
  { id: 'wu-band', name: 'Écartés à l\'élastique (band pull-apart)', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '15 reps', cue: 'Élastique tendu devant toi à hauteur d\'épaules · écarte les bras jusqu\'à la poitrine en serrant les omoplates, reviens lentement' },
  { id: 'wu-squat', name: 'Squats au poids du corps', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '10-15 lents', cue: 'Descente contrôlée 2-3 s, dos droit, talons au sol, genoux dans l\'axe des pieds' },
  { id: 'wu-pompes', name: 'Pompes faciles', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '8-10 reps', cue: 'Gainage serré · sur les genoux ou mains surélevées si besoin, loin de l\'échec' },
  { id: 'wu-scap', name: 'Scapular pull-ups (omoplates à la barre)', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '8 reps', cue: 'Suspendu bras tendus · tire les épaules vers le bas et en arrière sans plier les coudes, 1 s en haut · prépare les tractions' },
  { id: 'wu-approche', name: 'Séries d\'approche du 1er exercice', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '2 séries : ~50 % × 6-8 puis ~75 % × 3-5', cue: 'Avec le 1er exercice de la séance (tractions : assistées ou au poids du corps) · légères, rapides, sans fatigue · récup 1 min' },
  { id: 'echauffement', name: 'Warm-up', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '', cue: '' },
  { id: 'box-jump', name: 'Box jump', category: 'Jambes', equip: 'bodyweight', type: 'bw_load', days: [], sets: 1, repMin: 10, repMax: 10, fixedReps: true,
    cue: 'Explosif : hanches en arrière + élan des bras, saute sur la box, réception douce en squat partiel, genoux dans l\'axe · redescends en marchant (pas en sautant) · chaque saut de qualité, pas de fatigue · lest en kg (0 = sans)' },
  // ---- étirements rapides de fin de séance
  { id: 'st-piriforme', name: 'Piriforme', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Assis ou couché, cheville posée sur le genou opposé (figure 4) · penche-toi en avant dos long ou tire la jambe vers toi' },
  { id: 'st-ischios', name: 'Ischio-jambiers', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Assis, jambe tendue, bascule le bassin en avant dos long (pas en arrondissant le dos)' },
  { id: 'st-quadriceps', name: 'Quadriceps', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Pied arrière sur un banc (ou tenu à la main), genou vers le bas, bassin rentré, fessier serré' },
  { id: 'st-adducteurs', name: 'Adducteurs', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s', cue: 'Assis plantes de pieds jointes (papillon), dos long · les coudes poussent doucement les genoux vers le sol' },
  { id: 'st-psoas', name: 'Psoas', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Fente un genou au sol · rentre le bassin (fessier serré) puis avance doucement les hanches · bras du côté du genou au sol vers le haut' },
  { id: 'st-carre-lombes', name: 'Carré des lombes', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Debout jambes croisées, bras au-dessus de la tête · penche-toi sur le côté, du côté de la jambe avant' },
  { id: 'st-mollets', name: 'Mollets', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Mains au mur, jambe arrière tendue, talon au sol · puis genou arrière légèrement fléchi pour le soléaire' },
  { id: 'st-pectoraux', name: 'Pectoraux', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Avant-bras contre un cadre de porte, coude à hauteur d\'épaule · avance doucement la poitrine' },
  { id: 'st-dorsaux', name: 'Dorsaux', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Main sur un mur ou un montant au-dessus de la tête · recule les hanches et penche le buste sur le côté' },
  { id: 'st-biceps', name: 'Biceps', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s', cue: 'Mains jointes dans le dos, bras tendus, ouvre la poitrine (ou paume contre un mur, bras tendu, tourne le buste)' },
  { id: 'st-triceps', name: 'Triceps', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '30 s par côté', cue: 'Main derrière la tête entre les omoplates · l\'autre main tire doucement le coude vers l\'arrière' },
  // ---- mobilité de hanche (bloc à cocher, avant le board-off)
  { id: 'mh-deep-squat', name: 'Deep squat tenu (dos droit)', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '2 × 45-60 s',
    cue: 'Pieds largeur d\'épaules, pointes légèrement ouvertes, talons au sol · descends au plus bas en gardant le dos long (poitrine haute, pas d\'arrondi en bas du dos) · respire calmement, relâche un peu plus à chaque expiration · si les talons décollent : tiens un support devant toi' },
  { id: 'mh-ds-coudes', name: 'Deep squat : coudes qui ouvrent les genoux', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '8 poussées de 3-5 s',
    cue: 'En bas du deep squat, mains jointes, coudes contre l\'intérieur des genoux · pousse les genoux vers l\'extérieur 3-5 s, relâche, gagne un peu d\'amplitude, recommence · dos droit' },
  { id: 'mh-ds-transfert', name: 'Deep squat : transfert droite / gauche', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '6-8 par côté · 2-3 s de chaque côté',
    cue: 'En bas du deep squat, déplace lentement le poids sur la jambe droite (le genou droit avance, la hanche gauche s\'ouvre), tiens 2-3 s, puis à gauche · dos droit, talons au sol' },
  { id: 'mh-ds-rotation', name: 'Deep squat : rotation du tronc, bras vers le haut', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '5 par côté · 3 s en haut',
    cue: 'En bas du deep squat, une main au sol ou contre l\'intérieur du genou, l\'autre monte vers le plafond en tournant le buste · regarde ta main, 3 s en haut · alterne les deux côtés' },
  { id: 'mh-ds-genoux', name: 'Deep squat : genoux au sol d\'un côté puis de l\'autre', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '5 par côté · 3-5 s au sol',
    cue: 'En bas du deep squat, mains au sol pour t\'aider · descends les deux genoux au sol sur la droite (le genou droit s\'ouvre vers l\'extérieur, le gauche tombe vers l\'intérieur devant l\'autre pied), tiens 3-5 s, remonte en deep squat, puis à gauche · les pieds pivotent un peu si besoin · travaille la rotation externe d\'une hanche et la rotation interne de l\'autre' },
  { id: 'mh-90-90', name: '90/90 assis : bascule des genoux + penché', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '6 bascules · à chaque côté, penché 20-30 s',
    cue: 'Assis, genou avant et genou arrière pliés à 90° · bascule les deux genoux à droite puis à gauche (rotation interne / externe), mains au sol si besoin · à chaque côté : penche-toi en avant dos long au-dessus du tibia avant (rotation externe), puis vers la jambe arrière (rotation interne)' },
  { id: 'mh-grenouille', name: 'Grenouille (frog)', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '8-10 balancements · tenue 30-45 s',
    cue: 'À quatre pattes sur les avant-bras, genoux très écartés, tibias parallèles, chevilles dans l\'alignement des genoux · 1) recule les fesses vers les talons puis reviens · 2) tiens en bas 30-45 s en respirant' },
  { id: 'mh-grenouille-pied', name: 'Grenouille : lever le pied', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '5-8 par côté · 2-3 s en haut',
    cue: 'En position de grenouille, genoux posés au sol et bassin immobile · lève un pied vers le plafond en gardant le genou au sol : le pied part vers le haut / l\'extérieur, le fémur tourne vers l\'intérieur (rotation interne active) · tiens 2-3 s, redescends lentement, puis l\'autre pied · si ça crampe dans la fesse : moins haut, c\'est normal au début' },
  { id: 'mh-pied-table', name: 'Pied sur la table : flexion profonde multi-angles', category: 'Mobilité', equip: 'bodyweight', type: 'check', days: [], sets: 1, dose: '3 angles × 20-30 s · par hanche',
    cue: 'Pied sur une table ou un banc (hauteur de hanche), jambe d\'appui tendue, dos long · descends le buste vers le genou dans plusieurs angles : droit devant, vers l\'intérieur (épaule opposée vers le genou), vers l\'extérieur · une hanche à la fois' },
  { id: 'mh-boardoff-assis', name: 'Board-off assis au sol avec la planche', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: [], sets: 2, repMin: 6, repMax: 12,
    cue: 'Assis au sol, mains derrière toi, pieds dans les straps · ramène les genoux à la poitrine en décollant la planche (compression de hanche, comme le tuck du board-off), tiens 2-3 s, repose sans à-coup · renforcement : en tout dernier' },
  { id: 'mobilite-hanche', name: 'Mobilité de hanche', category: 'Mobilité', equip: 'bodyweight', type: 'group', days: [], sets: 1, dose: '9 exercices · ≈ 15 min',
    items: ['mh-deep-squat', 'mh-ds-coudes', 'mh-ds-transfert', 'mh-ds-rotation', 'mh-ds-genoux', 'mh-90-90', 'mh-grenouille', 'mh-grenouille-pied', 'mh-pied-table'],
    cue: 'Bloc d\'ouverture de hanche juste avant le board-off · coche chaque exercice quand il est fait' },
  { id: 'mollets-pointe', name: 'Montée sur la pointe des pieds', category: 'Jambes', equip: 'db2', type: 'load', days: ['dim'], sets: 2, repMin: 10, repMax: 15, cue: 'Avant du pied sur une marche, talons dans le vide · descends en étirement 1 s, monte le plus haut possible, tiens 1 s · charge = haltère par main (0 = sans charge)' },
  { id: 'chat-chameau', name: 'Chat-chameau (enroulement du bassin)', category: 'Mobilité', equip: 'bodyweight', type: 'reps', days: ['ven'], sets: 2, repMin: 10, repMax: 12, cue: 'À 4 pattes · enroule le bassin et arrondis le dos lentement, puis creuse · même geste qu\'en haut du tuck' },
  { id: 'etirement-pike-assis', name: 'Pike assis (étirement ischios)', category: 'Mobilité', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 45, timeMax: 60, cue: 'Assis jambes tendues, bascule le bassin en avant, dos long · tension nette mais pas de douleur · respire' },
  { id: 'ischios-pnf', name: 'Ischios PNF couché (contracté-relâché)', category: 'Mobilité', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 30, timeMax: 45, side: true, cue: 'Couché, jambe tendue vers le plafond tenue aux mains · pousse le talon contre les mains 6 s, relâche, gagne de l\'amplitude 20 s · 2 cycles · par jambe' },
  { id: 'ecart-actif', name: 'Écart actif (straddle)', category: 'Mobilité', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 30, timeMax: 45, cue: 'Assis jambes écartées, penche-toi en avant dos plat · ouverture de hanche pour sortir le pied avant (version aileron)' },
  { id: 'figure-4-assis', name: 'Figure 4 assis (rotation externe de hanche)', category: 'Mobilité', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 30, timeMax: 45, side: true, cue: 'Cheville sur le genou opposé, penche-toi en avant · par côté' },
  { id: 'maintien-jambes-90', name: 'Maintien jambes à 90°', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 10, timeMax: 30, cue: 'Jambes tendues · moins spécifique que le tuck' },
  { id: 'developpe-epaules', name: 'Développé épaules', category: 'Épaules', equip: 'db2', type: 'load', days: ['dim'], sets: 2, repMin: 8, repMax: 12 },
  { id: 'curl-marteau', name: 'Curl marteau', category: 'Biceps', equip: 'db2', type: 'load', days: ['dim'], sets: 2, repMin: 8, repMax: 12, cue: 'Descente 3 s' },
  { id: 'tractions-assistees', name: 'Tractions assistées', category: 'Dos', equip: 'machine', type: 'assisted', days: ['mar'], sets: 1, repMin: 8, repMax: 12, cue: 'Assistance en kg (moins = mieux)' },
  { id: 'iso-coude-90', name: 'Isométrique coude 90°', category: 'Biceps', equip: 'db1', type: 'time', days: ['dim'], sets: 3, timeMin: 30, timeMax: 45, cue: 'Charge lourde · si douleur de biceps après le kite' },
  { id: 'flexion-hanche-elastique', name: 'Flexion de hanche élastique', category: 'Board-off', equip: 'band', type: 'reps', days: ['ven'], sets: 2, repMin: 10, repMax: 15, cue: 'Par jambe · genou au-delà de 90°' },
  { id: 'suspension-barre', name: 'Suspension à la barre', category: 'Board-off', equip: 'bodyweight', type: 'time', days: ['ven'], sets: 2, timeMin: 20, timeMax: 45 },
  { id: 'face-pull', name: 'Face pull', category: 'Épaules', equip: 'machine', type: 'load', days: ['dim'], sets: 2, repMin: 12, repMax: 15 },
  { id: 'seated-pike-lifts', name: 'Seated pike lifts', category: 'Board-off', equip: 'bodyweight', type: 'reps', days: ['mar'], sets: 2, repMin: 3, repMax: 8, cue: 'Blocs sous les mains au début · maintien 2 s' },
];
