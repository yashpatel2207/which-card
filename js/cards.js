// Card catalog.
// Each card: base rate, bonus "rules" (rate + categories and/or merchants),
// optional rotating 5% program, optional pick-your-category setup ("choice").
// Rates are % for cash cards and points-per-dollar for points cards.
// verified: earn rates re-checked against issuer/press sources in Oct 2026.

export const PROGRAMS = {
  cash:      { label: 'Cash back', points: false },
  chase_ur:  { label: 'Chase Ultimate Rewards', short: 'Chase points', points: true },
  citi_ty:   { label: 'Citi ThankYou points', short: 'ThankYou points', points: true },
  c1_miles:  { label: 'Capital One miles', short: 'Capital One miles', points: true },
  amex_mr:   { label: 'Amex Membership Rewards', short: 'Amex points', points: true },
  wf_points: { label: 'Wells Fargo Rewards', short: 'Wells Fargo points', points: true },
};

const BOFA_CCR_OPTIONS = [
  { id: 'gas', label: 'Gas & EV charging', cats: ['gas', 'ev'] },
  { id: 'online', label: 'Online shopping', cats: ['online', 'online_grocery', 'streaming', 'internet', 'phone'] },
  { id: 'dining', label: 'Dining', cats: ['dining', 'fast_food'] },
  { id: 'travel', label: 'Travel', cats: ['airfare', 'hotel', 'car_rental', 'vacation_rental'] },
  { id: 'drugstore', label: 'Drugstores & pharmacies', cats: ['drugstore'] },
  { id: 'home', label: 'Home improvement & furnishings', cats: ['home_improvement', 'furniture'] },
];

const CASHPLUS_FIVE = [
  { id: 'fast_food', label: 'Fast food', cats: ['fast_food'] },
  { id: 'utilities', label: 'Home utilities', cats: ['utilities'] },
  { id: 'tv', label: 'TV, internet & streaming', cats: ['internet', 'streaming'] },
  { id: 'department', label: 'Department stores', cats: ['department'] },
  { id: 'phone', label: 'Cell phone providers', cats: ['phone'] },
  { id: 'electronics', label: 'Electronics stores', cats: ['electronics'] },
  { id: 'sporting', label: 'Sporting goods stores', cats: ['sporting'] },
  { id: 'movies', label: 'Movie theaters', cats: ['movies'] },
  { id: 'gym', label: 'Gyms & fitness centers', cats: ['gym'] },
  { id: 'furniture', label: 'Furniture stores', cats: ['furniture'] },
  { id: 'ground', label: 'Ground transportation', cats: ['transit', 'rideshare'] },
  { id: 'clothing', label: 'Select clothing stores', cats: ['clothing'] },
];

const CASHPLUS_TWO = [
  { id: 'gas', label: 'Gas & EV charging', cats: ['gas', 'ev'] },
  { id: 'dining', label: 'Restaurants', cats: ['dining', 'fast_food'] },
  { id: 'grocery', label: 'Grocery stores & delivery', cats: ['grocery', 'online_grocery'] },
];

const CUSTOM_CASH_OPTIONS = [
  { id: 'dining', label: 'Restaurants', cats: ['dining', 'fast_food'] },
  { id: 'gas', label: 'Gas stations', cats: ['gas'] },
  { id: 'grocery', label: 'Grocery stores', cats: ['grocery'] },
  { id: 'travel', label: 'Select travel', cats: ['airfare', 'hotel', 'car_rental', 'vacation_rental'] },
  { id: 'transit', label: 'Select transit', cats: ['transit', 'rideshare', 'parking'] },
  { id: 'streaming', label: 'Select streaming', cats: ['streaming'] },
  { id: 'drugstore', label: 'Drugstores', cats: ['drugstore'] },
  { id: 'home', label: 'Home improvement stores', cats: ['home_improvement'] },
  { id: 'gym', label: 'Fitness clubs', cats: ['gym'] },
  { id: 'live', label: 'Live entertainment', cats: ['live_ent'] },
];

const TRAVEL = ['airfare', 'hotel', 'car_rental', 'vacation_rental', 'transit', 'rideshare', 'parking'];

export const CATALOG = [
  // ---------- Cards preloaded for Yash (verified Oct 2026) ----------
  {
    id: 'chase-freedom', name: 'Chase Freedom', issuer: 'Chase', network: 'Visa', currency: 'chase_ur',
    color: '#1F7FC4', base: 1, rules: [], rotating: 'chase-freedom', verified: true,
    notes: ['Closed to new applicants. Chase is moving some of these cards to Freedom Unlimited by Nov 20, 2026.'],
  },
  {
    id: 'chase-freedom-unlimited', name: 'Chase Freedom Unlimited', issuer: 'Chase', network: 'Visa', currency: 'chase_ur',
    color: '#1B4F8C', base: 1.5, verified: true,
    rules: [
      { rate: 5, cats: ['chase_travel'] },
      { rate: 3, cats: ['dining', 'fast_food', 'drugstore'] },
    ],
  },
  {
    id: 'chase-sapphire-preferred', name: 'Chase Sapphire Preferred', issuer: 'Chase', network: 'Visa', currency: 'chase_ur',
    color: '#13305A', base: 1, verified: true,
    rules: [
      { rate: 5, cats: ['chase_travel'] },
      { rate: 3, cats: ['dining', 'fast_food', 'streaming', 'online_grocery', 'gas', 'ev', 'vacation_rental'] },
      { rate: 2, cats: ['airfare', 'hotel', 'car_rental', 'transit', 'rideshare', 'parking'] },
    ],
    notes: ['5x on Lyft rides through Sept 30, 2027.'],
  },
  {
    id: 'chase-ink-unlimited', name: 'Chase Ink Business Unlimited', issuer: 'Chase', network: 'Visa', currency: 'chase_ur',
    color: '#2E3B4A', base: 1.5, rules: [], verified: true,
  },
  {
    id: 'bofa-customized-cash', name: 'BofA Customized Cash Rewards', issuer: 'Bank of America', network: 'Visa', currency: 'cash',
    color: '#B3202E', base: 1, boost: 'bofa', verified: true,
    rules: [{ rate: 2, cats: ['grocery', 'wholesale'] }],
    choice: {
      period: 'month', reminder: 'bofa',
      slots: [{
        id: 'three', label: '3% category', pick: 1, rate: 3, options: BOFA_CCR_OPTIONS,
        note: 'Online shopping also covers cable, internet, phone plans and streaming, even though BofA’s app shows only “Online Shopping”.',
      }],
    },
    capNote: '3% and 2% apply to the first $2,500 combined each quarter.',
  },
  {
    id: 'bofa-unlimited-cash', name: 'BofA Unlimited Cash Rewards', issuer: 'Bank of America', network: 'Visa', currency: 'cash',
    color: '#8C949C', base: 1.5, boost: 'bofa', rules: [], verified: true,
  },
  {
    id: 'usbank-cash-plus', name: 'U.S. Bank Cash+', issuer: 'U.S. Bank', network: 'Visa', currency: 'cash',
    color: '#D9DEE3', base: 1, verified: true,
    rules: [{ rate: 5, cats: ['usb_travel'] }],
    choice: {
      period: 'quarter',
      slots: [
        { id: 'five', label: '5% categories', pick: 2, rate: 5, options: CASHPLUS_FIVE },
        { id: 'two', label: '2% category', pick: 1, rate: 2, options: CASHPLUS_TWO },
      ],
    },
    capNote: '5% applies to the first $2,000 combined each quarter. Picks reset every quarter.',
  },
  {
    id: 'usbank-triple-cash', name: 'U.S. Bank Business Triple Cash', issuer: 'U.S. Bank', network: 'Visa', currency: 'cash',
    color: '#3B78B4', base: 1, verified: true,
    rules: [
      { rate: 5, cats: ['usb_travel'] },
      { rate: 3, cats: ['gas', 'ev', 'office', 'phone', 'dining', 'fast_food'] },
    ],
  },
  {
    id: 'citi-strata-premier', name: 'Citi Strata Premier', issuer: 'Citi', network: 'Mastercard', currency: 'citi_ty',
    color: '#5D6168', base: 1, verified: true,
    rules: [
      { rate: 10, cats: ['citi_travel'] },
      { rate: 3, cats: ['airfare', 'hotel', 'dining', 'fast_food', 'grocery', 'gas', 'ev'] },
    ],
  },
  {
    id: 'citi-custom-cash', name: 'Citi Custom Cash', issuer: 'Citi', network: 'Mastercard', currency: 'citi_ty',
    color: '#1E4D8A', base: 1, verified: true,
    choice: {
      period: 'month', auto: true, reminder: 'quarter',
      slots: [{ id: 'top', label: 'Category to use it for', pick: 1, rate: 5, options: CUSTOM_CASH_OPTIONS }],
    },
    rules: [],
    capNote: 'Pays 5% on whichever eligible category you spend most on each billing cycle, up to $500.',
  },
  {
    id: 'discover-it', name: 'Discover it Cash Back', issuer: 'Discover', network: 'Discover', currency: 'cash',
    color: '#C9CED4', accent: '#F27A1A', base: 1, rules: [], rotating: 'discover-it', verified: true,
  },
  {
    id: 'c1-venture-x', name: 'Capital One Venture X', issuer: 'Capital One', network: 'Visa', currency: 'c1_miles',
    color: '#1C2636', base: 2, verified: true,
    rules: [
      { rate: 10, cats: ['c1_travel_hotel'] },
      { rate: 5, cats: ['c1_travel_flight'] },
    ],
  },
  {
    id: 'amex-blue-cash-everyday', name: 'Amex Blue Cash Everyday', issuer: 'American Express', network: 'Amex', currency: 'cash',
    color: '#4A8ED6', base: 1, verified: true,
    rules: [{ rate: 3, cats: ['grocery', 'gas', 'online', 'online_grocery'] }],
    capNote: '3% applies to the first $6,000 a year in each category (U.S. only).',
  },
  {
    id: 'chase-amazon-visa', name: 'Amazon Visa', issuer: 'Chase', network: 'Visa', currency: 'cash',
    color: '#A7ADB4', base: 1, verified: true,
    rules: [
      { rate: 3, merchants: ['amazon', 'amazon_fresh', 'whole_foods'], cats: ['chase_travel'] },
      { rate: 2, cats: ['gas', 'dining', 'fast_food', 'transit', 'rideshare', 'parking'] },
    ],
  },

  // ---------- Other popular cards (rates not re-checked recently) ----------
  {
    id: 'chase-freedom-flex', name: 'Chase Freedom Flex', issuer: 'Chase', network: 'Mastercard', currency: 'chase_ur',
    color: '#2A8AD0', base: 1, rotating: 'chase-freedom',
    rules: [{ rate: 5, cats: ['chase_travel'] }, { rate: 3, cats: ['dining', 'fast_food', 'drugstore'] }],
  },
  {
    id: 'chase-sapphire-reserve', name: 'Chase Sapphire Reserve', issuer: 'Chase', network: 'Visa', currency: 'chase_ur',
    color: '#1A2433', base: 1,
    rules: [{ rate: 8, cats: ['chase_travel'] }, { rate: 4, cats: ['airfare', 'hotel'] }, { rate: 3, cats: ['dining', 'fast_food'] }],
  },
  {
    id: 'chase-ink-cash', name: 'Chase Ink Business Cash', issuer: 'Chase', network: 'Visa', currency: 'chase_ur',
    color: '#3C4B5C', base: 1,
    rules: [{ rate: 5, cats: ['office', 'internet', 'phone'] }, { rate: 2, cats: ['gas', 'dining', 'fast_food'] }],
    capNote: '5% and 2% have yearly caps.',
  },
  {
    id: 'chase-ink-preferred', name: 'Chase Ink Business Preferred', issuer: 'Chase', network: 'Visa', currency: 'chase_ur',
    color: '#24303D', base: 1,
    rules: [{ rate: 3, cats: [...TRAVEL, 'internet', 'phone'] }],
  },
  {
    id: 'chase-prime-visa', name: 'Prime Visa', issuer: 'Chase', network: 'Visa', currency: 'cash',
    color: '#232F3E', base: 1,
    rules: [
      { rate: 5, merchants: ['amazon', 'amazon_fresh', 'whole_foods'], cats: ['chase_travel'] },
      { rate: 2, cats: ['gas', 'dining', 'fast_food', 'transit', 'rideshare', 'parking'] },
    ],
  },
  {
    id: 'amex-blue-cash-preferred', name: 'Amex Blue Cash Preferred', issuer: 'American Express', network: 'Amex', currency: 'cash',
    color: '#2F6FB8', base: 1,
    rules: [{ rate: 6, cats: ['grocery', 'streaming'] }, { rate: 3, cats: ['gas', 'transit', 'rideshare', 'parking'] }],
    capNote: '6% at supermarkets applies to the first $6,000 a year.',
  },
  {
    id: 'amex-gold', name: 'Amex Gold', issuer: 'American Express', network: 'Amex', currency: 'amex_mr',
    color: '#C2A253', base: 1,
    rules: [{ rate: 4, cats: ['dining', 'fast_food', 'grocery'] }, { rate: 3, cats: ['airfare'] }],
  },
  {
    id: 'amex-platinum', name: 'Amex Platinum', issuer: 'American Express', network: 'Amex', currency: 'amex_mr',
    color: '#B9BDC2', base: 1, rules: [{ rate: 5, cats: ['airfare'] }],
  },
  {
    id: 'amex-blue-business-plus', name: 'Amex Blue Business Plus', issuer: 'American Express', network: 'Amex', currency: 'amex_mr',
    color: '#356FB0', base: 2, rules: [], capNote: '2x applies to the first $50,000 a year.',
  },
  {
    id: 'citi-double-cash', name: 'Citi Double Cash', issuer: 'Citi', network: 'Mastercard', currency: 'citi_ty',
    color: '#2C7F86', base: 2, rules: [],
  },
  {
    id: 'citi-strata', name: 'Citi Strata', issuer: 'Citi', network: 'Mastercard', currency: 'citi_ty',
    color: '#4E5D6E', base: 1,
    rules: [{ rate: 5, cats: ['citi_travel'] }, { rate: 3, cats: ['grocery', 'gas', 'ev', 'transit'] }, { rate: 2, cats: ['dining', 'fast_food'] }],
  },
  {
    id: 'citi-costco', name: 'Costco Anywhere Visa', issuer: 'Citi', network: 'Visa', currency: 'cash',
    color: '#2F5D9E', base: 1,
    rules: [{ rate: 4, cats: ['gas', 'ev'] }, { rate: 3, cats: ['dining', 'fast_food', 'airfare', 'hotel', 'car_rental'] }, { rate: 2, merchants: ['costco'] }],
    capNote: '4% on gas applies to the first $7,000 a year.',
  },
  {
    id: 'c1-venture', name: 'Capital One Venture', issuer: 'Capital One', network: 'Visa', currency: 'c1_miles',
    color: '#24364F', base: 2, rules: [{ rate: 5, cats: ['c1_travel_hotel'] }],
  },
  {
    id: 'c1-savor', name: 'Capital One Savor', issuer: 'Capital One', network: 'Mastercard', currency: 'cash',
    color: '#8E3B2A', base: 1,
    rules: [{ rate: 5, cats: ['c1_travel_hotel'] }, { rate: 3, cats: ['dining', 'fast_food', 'grocery', 'streaming', 'movies', 'live_ent', 'amusement'] }],
  },
  {
    id: 'c1-quicksilver', name: 'Capital One Quicksilver', issuer: 'Capital One', network: 'Mastercard', currency: 'cash',
    color: '#9EA3A9', base: 1.5, rules: [{ rate: 5, cats: ['c1_travel_hotel'] }],
  },
  {
    id: 'wf-active-cash', name: 'Wells Fargo Active Cash', issuer: 'Wells Fargo', network: 'Visa', currency: 'cash',
    color: '#B5302A', base: 2, rules: [],
  },
  {
    id: 'wf-autograph', name: 'Wells Fargo Autograph', issuer: 'Wells Fargo', network: 'Visa', currency: 'wf_points',
    color: '#1E1E24', base: 1,
    rules: [{ rate: 3, cats: ['dining', 'fast_food', 'gas', 'ev', 'streaming', 'phone', ...TRAVEL] }],
  },
  {
    id: 'discover-it-chrome', name: 'Discover it Chrome', issuer: 'Discover', network: 'Discover', currency: 'cash',
    color: '#6E7781', base: 1, rules: [{ rate: 2, cats: ['gas', 'dining', 'fast_food'] }],
    capNote: '2% applies to the first $1,000 combined each quarter.',
  },
  {
    id: 'usbank-altitude-go', name: 'U.S. Bank Altitude Go', issuer: 'U.S. Bank', network: 'Visa', currency: 'cash',
    color: '#2B2F36', base: 1,
    rules: [{ rate: 4, cats: ['dining', 'fast_food'] }, { rate: 2, cats: ['grocery', 'online_grocery', 'gas', 'ev', 'streaming'] }],
  },
  {
    id: 'usbank-altitude-connect', name: 'U.S. Bank Altitude Connect', issuer: 'U.S. Bank', network: 'Visa', currency: 'cash',
    color: '#3A4250', base: 1,
    rules: [{ rate: 5, cats: ['usb_travel'] }, { rate: 4, cats: ['gas', 'ev', ...TRAVEL] }, { rate: 2, cats: ['grocery', 'online_grocery', 'dining', 'fast_food'] }],
  },
  {
    id: 'bofa-travel-rewards', name: 'BofA Travel Rewards', issuer: 'Bank of America', network: 'Visa', currency: 'cash',
    color: '#7A1C26', base: 1.5, boost: 'bofa', rules: [],
  },
  {
    id: 'bofa-premium-rewards', name: 'BofA Premium Rewards', issuer: 'Bank of America', network: 'Visa', currency: 'cash',
    color: '#2B2B30', base: 1.5, boost: 'bofa', rules: [{ rate: 2, cats: ['dining', 'fast_food', ...TRAVEL] }],
  },
  {
    id: 'apple-card', name: 'Apple Card', issuer: 'Goldman Sachs', network: 'Mastercard', currency: 'cash',
    color: '#E9EAEC', base: 2, rules: [], notes: ['Assumes you pay with Apple Pay (1% with the physical card).'],
  },
  {
    id: 'paypal-cashback', name: 'PayPal Cashback Mastercard', issuer: 'Synchrony', network: 'Mastercard', currency: 'cash',
    color: '#123E7C', base: 1.5, rules: [{ rate: 3, merchants: ['paypal'] }],
  },
  {
    id: 'target-circle', name: 'Target Circle Card', issuer: 'Target', network: 'Store', currency: 'cash',
    color: '#CC0000', base: 0, rules: [{ rate: 5, merchants: ['target'] }], notes: ['Works only at Target.'],
  },
];

export const STARTER_WALLET = [
  'chase-freedom', 'chase-freedom-unlimited', 'chase-sapphire-preferred', 'chase-ink-unlimited',
  'bofa-customized-cash', 'bofa-unlimited-cash', 'usbank-cash-plus', 'usbank-triple-cash',
  'citi-strata-premier', 'citi-custom-cash', 'discover-it', 'c1-venture-x',
  'amex-blue-cash-everyday', 'chase-amazon-visa',
];

export const BOFA_TIERS = [
  { value: 0, label: 'Not enrolled' },
  { value: 10, label: '+10% (Member)' },
  { value: 25, label: '+25% (Preferred Plus)' },
  { value: 50, label: '+50% (Preferred Honors)' },
  { value: 75, label: '+75% (Premier)' },
];
