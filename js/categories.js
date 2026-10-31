// Spending categories the app understands.
// "key" is used everywhere in card rules; "label" is what the person sees.

export const CATEGORIES = {
  grocery:          { label: 'Grocery store' },
  online_grocery:   { label: 'Grocery delivery' },
  wholesale:        { label: 'Wholesale club' },
  superstore:       { label: 'Superstore' },
  dining:           { label: 'Restaurant' },
  fast_food:        { label: 'Fast food' },
  gas:              { label: 'Gas station' },
  ev:               { label: 'EV charging' },
  drugstore:        { label: 'Drugstore' },
  home_improvement: { label: 'Home improvement' },
  furniture:        { label: 'Furniture & home goods' },
  department:       { label: 'Department store' },
  electronics:      { label: 'Electronics store' },
  sporting:         { label: 'Sporting goods' },
  clothing:         { label: 'Clothing store' },
  office:           { label: 'Office supply' },
  movies:           { label: 'Movie theater' },
  live_ent:         { label: 'Concerts & live events' },
  amusement:        { label: 'Attractions & amusement' },
  gym:              { label: 'Gym' },
  hotel:            { label: 'Hotel' },
  airfare:          { label: 'Airline' },
  car_rental:       { label: 'Car rental' },
  vacation_rental:  { label: 'Airbnb / vacation rental' },
  transit:          { label: 'Transit' },
  rideshare:        { label: 'Taxi & rideshare' },
  parking:          { label: 'Parking' },
  online:           { label: 'Online shopping' },
  streaming:        { label: 'Streaming' },
  phone:            { label: 'Phone bill' },
  internet:         { label: 'TV & internet' },
  utilities:        { label: 'Utilities' },
  chase_travel:     { label: 'Chase Travel booking' },
  c1_travel_hotel:  { label: 'Capital One Travel: hotel or car' },
  c1_travel_flight: { label: 'Capital One Travel: flight' },
  citi_travel:      { label: 'Citi Travel: hotel or car' },
  usb_travel:       { label: 'U.S. Bank Travel Center' },
  other:            { label: 'Everything else' },
};

// Specific stores some cards reward by name.
export const MERCHANTS = {
  amazon:       { label: 'Amazon', cats: ['online'] },
  amazon_fresh: { label: 'Amazon Fresh', cats: ['grocery'] },
  whole_foods:  { label: 'Whole Foods', cats: ['grocery'] },
  costco:       { label: 'Costco', cats: ['wholesale'] },
  walmart:      { label: 'Walmart', cats: ['superstore'] },
  target:       { label: 'Target', cats: ['superstore'] },
  paypal:       { label: 'PayPal', cats: ['online'] },
  red_cross:    { label: 'American Red Cross', cats: ['other'] },
};

// The "pick a category" grid on the main screen.
export const GRID = [
  { title: 'Shopping', items: ['grocery', 'gas', 'drugstore', 'superstore', 'wholesale', 'home_improvement', 'department', 'electronics', 'clothing', 'furniture', 'sporting', 'office'] },
  { title: 'Food & fun', items: ['dining', 'fast_food', 'movies', 'live_ent', 'amusement', 'gym'] },
  { title: 'Online & bills', items: ['m:amazon', 'online', 'online_grocery', 'streaming', 'phone', 'internet', 'utilities', 'm:paypal'] },
  { title: 'Travel', items: ['airfare', 'hotel', 'car_rental', 'vacation_rental', 'transit', 'rideshare', 'parking', 'ev'] },
  { title: 'Booking through a card site', items: ['chase_travel', 'c1_travel_hotel', 'c1_travel_flight', 'citi_travel', 'usb_travel'] },
  { title: 'Specific stores', items: ['m:costco', 'm:walmart', 'm:target', 'm:whole_foods'] },
];

// Categories shown in the "what do you spend on" checklist.
export const SPEND_CHOICES = [
  'grocery', 'dining', 'fast_food', 'gas', 'ev', 'drugstore', 'streaming', 'phone', 'internet', 'utilities',
  'online', 'department', 'electronics', 'clothing', 'home_improvement', 'furniture', 'sporting',
  'movies', 'live_ent', 'gym', 'transit', 'rideshare', 'hotel', 'airfare',
];

// Lower-case names for use inside sentences ("3x on restaurants, gas and streaming").
const NOUNS = {
  grocery: 'grocery stores', online_grocery: 'grocery delivery', wholesale: 'wholesale clubs', superstore: 'superstores',
  dining: 'restaurants', fast_food: 'fast food', gas: 'gas', ev: 'EV charging', drugstore: 'drugstores',
  home_improvement: 'home improvement', furniture: 'furniture', department: 'department stores', electronics: 'electronics',
  sporting: 'sporting goods', clothing: 'clothing', office: 'office supply', movies: 'movies', live_ent: 'live events',
  amusement: 'attractions', gym: 'gyms', hotel: 'hotels', airfare: 'flights', car_rental: 'car rentals',
  vacation_rental: 'vacation rentals', transit: 'transit', rideshare: 'rideshare', parking: 'parking',
  online: 'online shopping', streaming: 'streaming', phone: 'phone bills', internet: 'TV and internet', utilities: 'utilities',
  chase_travel: 'Chase Travel', c1_travel_hotel: 'Capital One Travel hotels and cars', c1_travel_flight: 'Capital One Travel flights',
  citi_travel: 'Citi Travel hotels and cars', usb_travel: 'U.S. Bank Travel Center',
};
export function catNoun(key) {
  if (key && key.startsWith('m:')) return MERCHANTS[key.slice(2)]?.label || key;
  return NOUNS[key] || catLabel(key).toLowerCase();
}

export function catLabel(key) {
  if (key && key.startsWith('m:')) return MERCHANTS[key.slice(2)]?.label || key;
  return CATEGORIES[key]?.label || key;
}

// Turn a grid item ("grocery" or "m:costco") into a "place" the engine can rank.
export function placeFromGridItem(item) {
  if (item.startsWith('m:')) {
    const key = item.slice(2);
    const m = MERCHANTS[key];
    return { name: m.label, cats: [...m.cats], merchant: key, networks: key === 'costco' ? ['Visa'] : null, source: 'grid' };
  }
  return { name: catLabel(item), cats: [item], merchant: null, networks: null, source: 'grid' };
}
