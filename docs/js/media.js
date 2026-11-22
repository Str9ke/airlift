// Illustrations d'exercices : vraies photos (position de départ / d'arrivée) en fondu enchaîné.
// Source : free-exercise-db (domaine public, The Unlicense). Les photos du programme sont embarquées
// dans l'app (docs/img/ex) ; les autres du catalogue se chargent en ligne puis restent en cache.
// Valeur : 'Id_Catalogue' (animation) ou ['Id_Catalogue', n] (image fixe n = 0 départ / 1 arrivée).
export const ILLU = {"knee-drop-leste": "AirLift_Knee_Drop", "clam-pyramidal": "AirLift_Clam", "mh-ir-baton": "AirLift_IR_Baton", "mh-ir-chaise": "AirLift_IR_Chaise", "abduction-poulie": "AirLift_Abduction", "mh-ds-genoux": "AirLift_DS_Genoux", "mh-grenouille-pied": "AirLift_Grenouille_Pied", "rot-interne-hanche": "AirLift_Rotation_Interne", "copenhagen-plank": "AirLift_Copenhagen", "echauffement": "Bicycling_Stationary", "wu-cardio": "Bicycling_Stationary", "wu-hanches": "Standing_Hip_Circles", "wu-worlds": "Worlds_Greatest_Stretch", "wu-bras": "Arm_Circles", "wu-band": "Band_Pull_Apart", "wu-squat": "Bodyweight_Squat", "wu-pompes": "Pushups", "wu-scap": "Scapular_Pull-Up", "wu-approche": ["Pullups", 0], "box-jump": "AirLift_Box_Jump", "st-piriforme": "Seated_Glute", "st-ischios": "Seated_Floor_Hamstring_Stretch", "st-quadriceps": "Standing_Elevated_Quad_Stretch", "st-adducteurs": "Groin_and_Back_Stretch", "st-psoas": "Kneeling_Hip_Flexor", "st-carre-lombes": "Standing_Lateral_Stretch", "st-mollets": "Calf_Stretch_Hands_Against_Wall", "st-pectoraux": "Chest_And_Front_Of_Shoulder_Stretch", "st-dorsaux": "One_Arm_Against_Wall", "st-biceps": "Standing_Biceps_Stretch", "st-triceps": ["Triceps_Stretch", 1], "mobilite-hanche": "AirLift_DeepSquat", "mh-deep-squat": "AirLift_DeepSquat", "mh-ds-coudes": "AirLift_DS_Coudes", "mh-ds-transfert": "AirLift_DS_Transfert", "mh-ds-rotation": "AirLift_DS_Rotation", "mh-90-90": "AirLift_90_90", "mh-grenouille": "AirLift_Grenouille", "mh-pied-table": "AirLift_Pied_Table", "mh-boardoff-assis": "AirLift_BoardOff_Assis", "mollets-pointe": "Standing_Dumbbell_Calf_Raise", "chat-chameau": "Cat_Stretch", "etirement-pike-assis": "Seated_Floor_Hamstring_Stretch", "ischios-pnf": "Leg-Up_Hamstring_Stretch", "ecart-actif": "The_Straddle", "figure-4-assis": "Seated_Glute", "tenue-barre-1-main": "AirLift_Barre_1_main", "harnais-planche": "AirLift_Harnais", "strap-finding-drill": "AirLift_Strap", "tirage-vertical-poulie": "Wide-Grip_Lat_Pulldown", "squat": "Barbell_Squat", "developpe-couche": "Barbell_Bench_Press_-_Medium_Grip", "deadlift": "Deadlift_with_Bands", "tractions": "Pullups", "tractions-assistees": "Band_Assisted_Pull-Up", "dips": "Dips_-_Triceps_Version", "hanging-leg-raises": "Knee_Hip_Raise_On_Parallel_Bars", "maintien-jambes-90": ["Knee_Hip_Raise_On_Parallel_Bars", 1], "tuck-hold": ["Hanging_Leg_Raise", 1], "tucks-explosifs": "Hanging_Leg_Raise", "compression-pike": "AirLift_Compression", "seated-pike-lifts": "Seated_Leg_Tucks", "psoas-march": "AirLift_Flexion_Poulie", "flexion-hanche-elastique": "Hip_Flexion_with_Band", "trapeze-moyen-incline": "Bent_Over_Two-Dumbbell_Row", "rowing-barre": "Bent_Over_Barbell_Row", "developpe-epaules": "Dumbbell_Shoulder_Press", "deltoide-lateral": "Side_Lateral_Raise", "deltoide-moyen": "Side_Lateral_Raise", "iso-deltoide-90": ["Side_Lateral_Raise", 1], "deltoide-anterieur": "Front_Two-Dumbbell_Raise", "curl-marteau": "Hammer_Curls", "iso-coude-90": ["Hammer_Curls", 1], "rotation-externe-epaule": "External_Rotation_with_Band", "pallof-press": "Standing_Cable_Wood_Chop", "curl-inverse": "Reverse_Barbell_Curl", "face-pull": "Face_Pull", "reverse-crunch": "Reverse_Crunch", "releve-jambes-banc-45": "Flat_Bench_Lying_Leg_Raise", "suspension-barre": ["Pullups", 0], "hollow-body-hold": ["Flat_Bench_Lying_Leg_Raise", 1], "curl-biceps-barre": "Barbell_Curl", "curl-biceps": "Dumbbell_Bicep_Curl", "curl-biceps-haltere": "Dumbbell_Bicep_Curl", "curl-biceps-incline": "Incline_Dumbbell_Curl", "triceps-corde-vers-le-haut": "Triceps_Overhead_Extension_with_Rope", "triceps-corde-vers-le-bas": "Triceps_Pushdown_-_Rope_Attachment", "triceps": "Standing_One-Arm_Dumbbell_Triceps_Extension", "grand-dorsal-corde": "Straight-Arm_Pulldown", "tirage-bras-tendus": "Straight-Arm_Pulldown", "developpe-incline": "Barbell_Incline_Bench_Press_-_Medium_Grip", "developpe-decline": "Decline_Barbell_Bench_Press", "tirage-vertical-poulie": "Wide-Grip_Lat_Pulldown", "crunch-haltere": "Weighted_Crunches", "swing-kettlebell": "One-Arm_Kettlebell_Swings", "trapeze-sup": "Dumbbell_Shrug", "rear-delt": "Reverse_Machine_Flyes", "pec-corde": "Cable_Crossover", "chaise-quadriceps": "Leg_Extensions", "gainage": ["Plank", 0], "plank-coudes": ["Plank", 0], "plank-sous-coudes": ["Plank", 0], "tractions-anneaux": "Pullups", "dips-anneaux": "Ring_Dips", "squat-1-pied": "Dumbbell_Lunges", "dos-barre": "Bent_Over_Barbell_Row", "tirage-trapeze-moyen-machine": "Seated_Cable_Rows", "traction-trapeze-sup": "Seated_Cable_Rows", "extension-dos": "Hyperextensions_Back_Extensions", "obliques-inclines": "Oblique_Crunches", "abdominaux": "Crunches", "pompes-anneaux": "Pushups", "developpe-epaules-overhead": "Barbell_Shoulder_Press", "grand-dorsal": "Wide-Grip_Lat_Pulldown"};

const REMOTE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const LOCAL = new Set(Object.values(ILLU).map(v => Array.isArray(v) ? v[0] : v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const catUrl = (id, n) => (LOCAL.has(id) ? 'img/ex/' : REMOTE) + encodeURIComponent(id).replace(/%2F/g, '/') + '/' + n + '.jpg';

/** Retourne { frames: [url, url?] } ou null. e.img (choix de l'utilisateur) prime sur la carte par défaut. */
export function illuOf(e) {
  const img = e.img;
  if (img && img.photos?.length) return { frames: img.photos.slice(0, 2), own: true };
  if (img && img.db) return { frames: img.still != null ? [catUrl(img.db, img.still)] : [catUrl(img.db, 0), catUrl(img.db, 1)] };
  if (img === false) return null;
  const v = ILLU[e.id];
  if (!v) return null;
  if (Array.isArray(v)) return { frames: [catUrl(v[0], v[1])] };
  return { frames: [catUrl(v, 0), catUrl(v, 1)] };
}

/** HTML d'une illustration (cls: 'thumb' | 'hero'). Animation CSS pure (fondu 0 ⇄ 1). */
export function illuHTML(e, cls = 'thumb') {
  const il = illuOf(e);
  if (!il) return `<div class="illu ${cls} none" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 16l4-4 3 3 5-6 4 5"/><circle cx="8" cy="7" r="1.6"/></svg>${cls === 'hero' ? '<span>Pas encore d\'illustration · ajoute tes photos</span>' : ''}</div>`;
  const [a, b] = il.frames;
  return `<div class="illu ${cls} ${b ? 'anim' : ''}" role="img" aria-label="${esc(e.name)}"><img src="${esc(a)}" alt="" loading="lazy" decoding="async">${b ? `<img src="${esc(b)}" alt="" loading="lazy" decoding="async">` : ''}</div>`;
}

/** Réduit une photo choisie sur le téléphone (≤ 480 px, JPEG) → data URL légère, synchronisable. */
export function shrinkPhoto(file, max = 480) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.72));
    };
    im.onerror = rej;
    im.src = url;
  });
}

let catalog = null;
export async function loadCatalog() {
  if (!catalog) catalog = await (await fetch('data/catalog.json')).json();
  return catalog;
}
