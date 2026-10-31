// Known stores and brands.
// Used two ways:
//  1. The store search box (instant, no Google call).
//  2. Fixing Google results by name ("fix: true"), for chains that card networks
//     code differently than Google's place type suggests.

const M = (name, cats, opts = {}) => ({
  name,
  cats,
  aliases: opts.aliases || [],
  merchant: opts.merchant || null,
  networks: opts.networks || null,
  note: opts.note || null,
  keepGas: !!opts.keepGas,
  fix: !!opts.fix,
});

export const KNOWN = [
  // Wholesale clubs and superstores
  M('Costco', ['wholesale'], { merchant: 'costco', networks: ['Visa'], keepGas: true, fix: true, note: 'Costco only takes Visa credit cards.' }),
  M("Sam's Club", ['wholesale'], { keepGas: true, fix: true }),
  M("BJ's Wholesale", ['wholesale'], { aliases: ["BJ's Wholesale Club"], keepGas: true, fix: true }),
  M('Walmart', ['superstore'], { merchant: 'walmart', keepGas: true, fix: true }),
  M('Target', ['superstore'], { merchant: 'target', fix: true }),

  // Grocery
  M('Whole Foods', ['grocery'], { merchant: 'whole_foods', aliases: ['Whole Foods Market'], fix: true }),
  M('Amazon Fresh', ['grocery'], { merchant: 'amazon_fresh', fix: true }),
  M('Giant Food', ['grocery'], { aliases: ['Giant'] }),
  M('Safeway', ['grocery']),
  M('Harris Teeter', ['grocery']),
  M('Wegmans', ['grocery']),
  M("Trader Joe's", ['grocery']),
  M('Aldi', ['grocery']),
  M('Lidl', ['grocery']),
  M('H Mart', ['grocery']),
  M('Lotte Plaza', ['grocery']),
  M('Patel Brothers', ['grocery']),
  M('Instacart', ['online_grocery']),

  // Drugstores
  M('CVS', ['drugstore'], { aliases: ['CVS Pharmacy'], fix: true }),
  M('Walgreens', ['drugstore'], { fix: true }),
  M('Rite Aid', ['drugstore'], { fix: true }),

  // Home
  M('Home Depot', ['home_improvement'], { aliases: ['The Home Depot'], fix: true }),
  M("Lowe's", ['home_improvement'], { aliases: ["Lowe's Home Improvement"], fix: true }),
  M('Menards', ['home_improvement'], { fix: true }),
  M('Ace Hardware', ['home_improvement'], { fix: true }),
  M('IKEA', ['furniture']),
  M('Wayfair', ['furniture', 'online']),

  // Electronics, sporting, office
  M('Best Buy', ['electronics'], { fix: true }),
  M('Micro Center', ['electronics'], { fix: true }),
  M('Apple Store', ['electronics']),
  M("Dick's Sporting Goods", ['sporting'], { aliases: ["Dick's Sporting"], fix: true }),
  M('Academy Sports', ['sporting'], { fix: true }),
  M('REI', ['sporting'], { aliases: ['REI Co-op'], fix: true }),
  M('Staples', ['office'], { fix: true }),
  M('Office Depot', ['office'], { aliases: ['OfficeMax'], fix: true }),

  // Department and clothing
  M("Macy's", ['department'], { fix: true }),
  M("Kohl's", ['department'], { fix: true }),
  M('Nordstrom', ['department'], { fix: true }),
  M('JCPenney', ['department'], { aliases: ['JC Penney'], fix: true }),
  M("Dillard's", ['department'], { fix: true }),
  M('Belk', ['department'], { fix: true }),
  M('Old Navy', ['clothing']),
  M('Gap', ['clothing']),
  M('H&M', ['clothing']),
  M('Uniqlo', ['clothing']),
  M('Zara', ['clothing']),

  // Phone, internet, utilities
  M('Verizon Fios', ['internet']),
  M('Xfinity', ['internet'], { aliases: ['Comcast'] }),
  M('Spectrum', ['internet']),
  M('T-Mobile', ['phone'], { fix: true }),
  M('Verizon', ['phone'], { aliases: ['Verizon Wireless'], fix: true }),
  M('AT&T', ['phone'], { fix: true }),
  M('Mint Mobile', ['phone']),
  M('Pepco', ['utilities']),
  M('BGE', ['utilities'], { aliases: ['Baltimore Gas and Electric'] }),
  M('Washington Gas', ['utilities']),
  M('WSSC Water', ['utilities'], { aliases: ['WSSC'] }),
  M('Dominion Energy', ['utilities']),

  // Streaming
  M('Netflix', ['streaming']),
  M('Hulu', ['streaming']),
  M('Disney+', ['streaming'], { aliases: ['Disney Plus'] }),
  M('Max', ['streaming'], { aliases: ['HBO Max'] }),
  M('Spotify', ['streaming']),
  M('YouTube TV', ['streaming']),
  M('YouTube Premium', ['streaming']),
  M('Peacock', ['streaming']),
  M('Paramount+', ['streaming'], { aliases: ['Paramount Plus'] }),
  M('Apple TV', ['streaming']),

  // Food
  M('Uber Eats', ['dining']),
  M('DoorDash', ['dining']),
  M('Grubhub', ['dining']),
  M("McDonald's", ['fast_food'], { fix: true }),
  M('Burger King', ['fast_food'], { fix: true }),
  M("Wendy's", ['fast_food'], { fix: true }),
  M('Taco Bell', ['fast_food'], { fix: true }),
  M('Chick-fil-A', ['fast_food'], { fix: true }),
  M('Popeyes', ['fast_food'], { fix: true }),
  M('KFC', ['fast_food'], { fix: true }),
  M('Five Guys', ['fast_food'], { fix: true }),
  M('Chipotle', ['fast_food'], { aliases: ['Chipotle Mexican Grill'], fix: true }),
  M('Sonic Drive-In', ['fast_food'], { fix: true }),
  M("Arby's", ['fast_food'], { fix: true }),
  M('Subway', ['fast_food']),
  M("Domino's", ['fast_food']),
  M('Pizza Hut', ['fast_food']),
  M('Starbucks', ['dining'], { fix: true }),
  M("Dunkin'", ['dining'], { aliases: ['Dunkin Donuts'], fix: true }),
  M('Panera', ['dining'], { aliases: ['Panera Bread'], fix: true }),

  // Entertainment and gyms
  M('AMC Theatres', ['movies'], { aliases: ['AMC'], fix: true }),
  M('Regal', ['movies'], { aliases: ['Regal Cinemas'], fix: true }),
  M('Cinemark', ['movies'], { fix: true }),
  M('Ticketmaster', ['live_ent']),
  M('Planet Fitness', ['gym'], { fix: true }),
  M('LA Fitness', ['gym'], { fix: true }),
  M('Life Time', ['gym'], { aliases: ['Lifetime Fitness'], fix: true }),
  M('Orangetheory', ['gym'], { aliases: ['Orangetheory Fitness'], fix: true }),
  M('Crunch Fitness', ['gym'], { fix: true }),

  // Getting around
  M('Uber', ['rideshare']),
  M('Lyft', ['rideshare']),
  M('Metro SmarTrip', ['transit'], { aliases: ['WMATA', 'SmarTrip', 'Metro'] }),
  M('MARC Train', ['transit'], { aliases: ['MARC'] }),
  M('Amtrak', ['transit']),
  M('ParkMobile', ['parking']),
  M('SpotHero', ['parking']),
  M('Shell', ['gas']),
  M('Exxon', ['gas'], { aliases: ['ExxonMobil', 'Mobil'] }),
  M('BP', ['gas']),
  M('Sunoco', ['gas']),
  M('Chevron', ['gas']),
  M('Citgo', ['gas']),
  M('Sheetz', ['gas'], { note: 'Counts as gas only if Sheetz codes it as a gas station.' }),
  M('Wawa', ['gas'], { note: 'Counts as gas only if Wawa codes it as a gas station.' }),
  M('Tesla Supercharger', ['ev']),

  // Travel
  M('United Airlines', ['airfare'], { aliases: ['United'] }),
  M('Delta Air Lines', ['airfare'], { aliases: ['Delta'] }),
  M('American Airlines', ['airfare']),
  M('Southwest Airlines', ['airfare'], { aliases: ['Southwest'] }),
  M('JetBlue', ['airfare']),
  M('Alaska Airlines', ['airfare']),
  M('Marriott', ['hotel']),
  M('Hilton', ['hotel']),
  M('Hyatt', ['hotel']),
  M('IHG', ['hotel'], { aliases: ['Holiday Inn'] }),
  M('Hertz', ['car_rental']),
  M('Enterprise Rent-A-Car', ['car_rental'], { aliases: ['Enterprise'] }),
  M('Avis', ['car_rental']),
  M('National Car Rental', ['car_rental'], { aliases: ['National'] }),
  M('Budget Car Rental', ['car_rental'], { aliases: ['Budget'] }),
  M('Airbnb', ['vacation_rental']),
  M('Vrbo', ['vacation_rental']),

  // Online
  M('Amazon', ['online'], { merchant: 'amazon', aliases: ['Amazon.com'] }),
  M('eBay', ['online']),
  M('Etsy', ['online']),
  M('Chewy', ['online']),
  M('PayPal', ['online'], { merchant: 'paypal' }),
];

export function normalize(s) {
  return String(s || '').toLowerCase().replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9+]+/g, ' ').trim();
}

function names(entry) {
  return [entry.name, ...entry.aliases].map(normalize);
}

// Does a Google place name contain this chain's name as whole words?
export function nameMatches(entry, placeName) {
  const hay = ` ${normalize(placeName)} `;
  return names(entry).some(n => n && hay.includes(` ${n} `));
}

// Store search: best matches first.
export function searchKnown(query, userFixes = []) {
  const q = normalize(query);
  if (q.length < 2) return [];
  const scored = [];
  const userEntries = userFixes.map(f => M(f.text, [f.cat]));
  for (const entry of [...userEntries, ...KNOWN]) {
    let score = 0;
    for (const n of names(entry)) {
      if (n === q) score = Math.max(score, 3);
      else if (n.startsWith(q)) score = Math.max(score, 2);
      else if (q.length >= 3 && (n.includes(` ${q}`) || n.includes(q))) score = Math.max(score, 1);
    }
    if (score) scored.push({ entry, score });
  }
  const seen = new Set();
  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.entry)
    .filter(e => (seen.has(e.name) ? false : seen.add(e.name)))
    .slice(0, 6);
}

export function placeFromKnown(entry) {
  return {
    name: entry.name,
    cats: [...entry.cats],
    merchant: entry.merchant,
    networks: entry.networks,
    note: entry.note,
    source: 'search',
  };
}
