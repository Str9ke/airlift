// Checklists « Go Run » et « Go Kite » : ce qu'il faut prendre avant de partir.
// Chaque élément a une petite image : emoji quand il existe, sinon une icône dessinée (matériel de kite…).

const S = (body, bg = '#e0f2fe') => `<svg viewBox="0 0 40 40" class="gi" aria-hidden="true"><rect width="40" height="40" rx="10" fill="${bg}"/>${body}</svg>`;
export const GEAR_SVG = {
  harnais: S('<path d="M6 17q14-8 28 0v9q-14-6-28 0z" fill="#1f2937"/><path d="M6 17q14-8 28 0" fill="none" stroke="#f97316" stroke-width="2.4"/><path d="M15 21h10" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/><path d="M20 21v-7q0-3 3-3" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round"/>'),
  leash: S('<path d="M8 30c6-2 4-8 10-8s4 6 10 4" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round"/><path d="M8 30c2-6 8-6 8-12" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round"/><rect x="25" y="9" width="8" height="12" rx="3" fill="#374151"/><circle cx="29" cy="25" r="3" fill="none" stroke="#374151" stroke-width="2.4"/>'),
  barre: S('<path d="M8 10l11 13M32 10L21 23M14 6l5 17M26 6l-5 17" stroke="#94a3b8" stroke-width="1.4"/><rect x="5" y="22" width="30" height="5" rx="2.5" fill="#111827"/><rect x="5" y="22" width="6" height="5" rx="2.5" fill="#ef4444"/><rect x="29" y="22" width="6" height="5" rx="2.5" fill="#3b82f6"/><path d="M20 27v5" stroke="#374151" stroke-width="2.4"/><circle cx="20" cy="34" r="2.6" fill="none" stroke="#f97316" stroke-width="2.2"/>'),
  pompe: S('<rect x="15" y="12" width="10" height="20" rx="3" fill="#2563eb"/><path d="M20 12V6M13 6h14" stroke="#111827" stroke-width="3" stroke-linecap="round"/><rect x="11" y="31" width="18" height="4" rx="2" fill="#111827"/>'),
  tube: S('<path d="M8 30q0-10 10-10t12-10" fill="none" stroke="#111827" stroke-width="4.5" stroke-linecap="round"/><path d="M8 30q0-10 10-10t12-10" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 3"/><rect x="27" y="6" width="7" height="6" rx="2" fill="#f97316"/>'),
  scratch: S('<path d="M15 6v20q0 6 7 6h9v-6h-7V6z" fill="#e9b48e"/><rect x="12" y="17" width="16" height="7" rx="3" fill="#111827"/><path d="M14 20.5h12" stroke="#f97316" stroke-width="1.6" stroke-dasharray="2 2"/>'),
  combinaison: S('<path d="M14 6h12l4 6-3 3v19h-5l-2-12-2 12h-5V15l-3-3z" fill="#111827"/><path d="M17 6l3 5 3-5" fill="none" stroke="#38bdf8" stroke-width="2"/>'),
  earplugs: S('<path d="M11 14a5 5 0 0 1 9 3l-3 7a3 3 0 0 1-5 0q-3-4-1-10z" fill="#f97316"/><path d="M22 18a5 5 0 0 1 9 3l-3 7a3 3 0 0 1-5 0q-3-4-1-10z" fill="#fb923c"/><path d="M15 28q4 6 11 4" fill="none" stroke="#475569" stroke-width="1.5"/>'),
  board: S('<g transform="rotate(-25 20 20)"><rect x="4" y="15" width="32" height="10" rx="5" fill="url(#gbd)"/><path d="M11 15q3-5 6 0M23 15q3-5 6 0" fill="none" stroke="#111827" stroke-width="2.4"/></g><defs><linearGradient id="gbd"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>'),
  bonnet: S('<path d="M9 27q0-17 11-17t11 17z" fill="#1f2937"/><rect x="8" y="25" width="24" height="7" rx="3" fill="#374151"/><circle cx="20" cy="9" r="3.5" fill="#f97316"/>'),
  collant: S('<path d="M12 6h16l-1 28h-5l-2-18-2 18h-5z" fill="#111827"/><path d="M12 9h16" stroke="#475569" stroke-width="2"/>'),
  cardio: S('<rect x="4" y="17" width="32" height="6" rx="3" fill="#1f2937"/><path d="M20 28s-7-4.5-7-9a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 4.5-7 9-7 9z" fill="#ef4444"/>'),
  gantstissu: S('<path d="M12 34V18l-2-6a2 2 0 0 1 4-1l2 5V7a2 2 0 0 1 4 0v8V5a2 2 0 0 1 4 0v10V7a2 2 0 0 1 4 0v14l1 13z" fill="#64748b"/><path d="M12 30h16M12 33h16" stroke="#94a3b8" stroke-width="1.5"/><path d="M15 22h10M15 26h10" stroke="#475569" stroke-width="1" stroke-dasharray="1.5 1.5"/>', '#ede9fe'),
  ventolin: S('<path d="M15 7h9a2 2 0 0 1 2 2v13h-13V9a2 2 0 0 1 2-2z" fill="#3b82f6"/><path d="M13 22h13v4a2 2 0 0 1-2 2h-4v5h-7z" fill="#93c5fd"/><rect x="16" y="3" width="7" height="5" rx="1.5" fill="#1e3a8a"/>', '#dbeafe'),
  thermos: S('<rect x="14" y="10" width="12" height="24" rx="4" fill="#64748b"/><rect x="15" y="5" width="10" height="6" rx="2" fill="#1f2937"/><path d="M14 16h12" stroke="#94a3b8" stroke-width="2"/><path d="M18 3q1 2 0 3M22 3q1 2 0 3" stroke="#94a3b8" stroke-width="1.4" fill="none"/>', '#fef3c7'),
};

// i : icône (emoji ou clé de GEAR_SVG)
export const PACKS = {
  run: {
    title: 'Go Run', emoji: '🏃',
    groups: [
      { title: 'Sur moi', items: [
        ['chaussettes', 'Chaussettes', '🧦'], ['tshirt-noir', 'T-shirt noir (froid)', '👕'], ['collant', 'Collant de jambes (froid)', 'collant'],
        ['pantalon', 'Pantalon', '👖'], ['goretex', 'Veste Gore-Tex', '🧥'], ['tour-cou', 'Tour de cou', '🧣'], ['bonnet', 'Bonnet', 'bonnet'],
        ['gants', 'Gants', '🧤'], ['frontale', 'Lampe frontale (chargée)', '🔦'], ['montre', 'Montre (chargée)', '⌚'],
        ['cardio', 'Ceinture cardio', 'cardio'], ['ecouteurs', 'Écouteurs', '🎧'], ['baskets', 'Mes baskets', '👟'],
      ] },
      { title: 'Dans les poches', items: [
        ['ventolin', 'Ventolin', 'ventolin'], ['tel', 'Téléphone chargé', '📱'], ['cle', 'Clé de voiture', '🔑'], ['portefeuille', 'Portefeuille', '👛'],
      ] },
      { title: 'Rechange', items: [
        ['baskets-r', 'Baskets de rechange', '👟'], ['chaussettes-r', 'Chaussettes de rechange', '🧦'], ['slip-r', 'Slip de rechange', '🩲'],
        ['pantalon-r', 'Pantalon de rechange', '👖'], ['tshirt-r', 'T-shirt de rechange', '👕'],
      ] },
      { title: 'Boire & manger', items: [
        ['cafe', 'Café / thé', '☕'], ['eau', "Bouteille d'eau", '💧'], ['fruit', 'Un fruit (kiwi ou orange)', '🥝'],
      ] },
    ],
  },
  kite: {
    title: 'Go Kite', emoji: '🪁',
    groups: [
      { title: 'Matériel', items: [
        ['board', 'Ma board', 'board'], ['kites', '2 ou 3 kites', '🪁'], ['barre', 'Ma barre', 'barre'], ['pompe', 'La pompe', 'pompe'],
        ['tube', 'Le tube de pompe', 'tube'], ['harnais', 'Harnais', 'harnais'], ['leash', 'Leash', 'leash'], ['impact', 'Impact veste', '🦺'],
      ] },
      { title: 'Tenue', items: [
        ['combi', 'Combinaison', 'combinaison'], ['boots', 'Boots ou chaussons', '🥾'], ['gants', 'Gants', '🧤'], ['gants-tissu', 'Gants en tissu (froid)', 'gantstissu'], ['scratch', 'Scratch cheville', 'scratch'],
        ['earplugs', 'Earplugs', 'earplugs'], ['coupevent', 'Veste coupe-vent', '🧥'],
      ] },
      { title: 'Ravito & divers', items: [
        ['eau', '2 bouteilles d\'eau', '💧'], ['thermos', 'Thermos de café', 'thermos'], ['mandarines', '2 mandarines', '🍊'],
        ['shaker', 'Shaker protéiné', '🥤'], ['portefeuille', 'Portefeuille', '👛'], ['cle', 'Clé de voiture', '🔑'],
      ] },
    ],
  },
};

export const gearIcon = i => GEAR_SVG[i] || `<span class="ge" aria-hidden="true">${i || '•'}</span>`;
