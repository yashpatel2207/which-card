// Finds nearby businesses with Google Places and turns each into spending categories.

// ---------- Google place type -> our categories ----------
const TYPE_MAP = {
  supermarket: 'grocery', grocery_store: 'grocery', asian_grocery_store: 'grocery', food_store: 'grocery', butcher_shop: 'grocery', market: 'grocery',
  warehouse_store: 'wholesale', wholesaler: 'wholesale',
  discount_store: 'superstore',
  fast_food_restaurant: 'fast_food',
  gas_station: 'gas', electric_vehicle_charging_station: 'ev',
  pharmacy: 'drugstore', drugstore: 'drugstore',
  hardware_store: 'home_improvement', home_improvement_store: 'home_improvement',
  furniture_store: 'furniture', home_goods_store: 'furniture',
  department_store: 'department',
  electronics_store: 'electronics',
  cell_phone_store: 'phone',
  sporting_goods_store: 'sporting', bicycle_store: 'sporting',
  clothing_store: 'clothing', shoe_store: 'clothing',
  office_supply_store: 'office',
  movie_theater: 'movies',
  concert_hall: 'live_ent', performing_arts_theater: 'live_ent', stadium: 'live_ent', arena: 'live_ent', opera_house: 'live_ent',
  comedy_club: 'live_ent', philharmonic_hall: 'live_ent', amphitheatre: 'live_ent',
  amusement_park: 'amusement', water_park: 'amusement', bowling_alley: 'amusement', amusement_center: 'amusement',
  zoo: 'amusement', aquarium: 'amusement', video_arcade: 'amusement', miniature_golf_course: 'amusement',
  gym: 'gym', fitness_center: 'gym', yoga_studio: 'gym',
  lodging: 'hotel', hotel: 'hotel', motel: 'hotel', resort_hotel: 'hotel', inn: 'hotel', bed_and_breakfast: 'hotel',
  extended_stay_hotel: 'hotel', budget_japanese_inn: 'hotel', hostel: 'hotel',
  car_rental: 'car_rental',
  transit_station: 'transit', train_station: 'transit', subway_station: 'transit', bus_station: 'transit',
  light_rail_station: 'transit', ferry_terminal: 'transit',
  parking: 'parking', parking_garage: 'parking', parking_lot: 'parking',
  taxi_stand: 'rideshare',
};
const DINING_TYPES = new Set([
  'restaurant', 'cafe', 'coffee_shop', 'bakery', 'bar', 'pub', 'wine_bar', 'meal_takeaway', 'meal_delivery', 'food_court',
  'ice_cream_shop', 'dessert_shop', 'tea_house', 'juice_shop', 'bagel_shop', 'donut_shop', 'sandwich_shop', 'diner',
  'bistro', 'cafeteria', 'deli', 'steak_house', 'bar_and_grill', 'cat_cafe', 'chocolate_shop', 'acai_shop', 'confectionery',
]);

// ---------- store names that card networks code differently than maps ----------
export const BUILT_IN_FIXES = [
  { match: /\bcostco\b/i, cats: ['wholesale'], merchant: 'costco', networks: ['Visa'], keepGas: true, note: 'Costco only takes Visa credit cards.' },
  { match: /\bsam'?s club\b/i, cats: ['wholesale'] },
  { match: /\bbj'?s wholesale\b/i, cats: ['wholesale'] },
  { match: /\bwalmart\b/i, cats: ['superstore'], merchant: 'walmart', keepGas: true },
  { match: /\btarget\b/i, cats: ['superstore'], merchant: 'target' },
  { match: /\bwhole foods\b/i, cats: ['grocery'], merchant: 'whole_foods' },
  { match: /\bamazon fresh\b/i, cats: ['grocery'], merchant: 'amazon_fresh' },
  { match: /\b(cvs|walgreens|rite aid)\b/i, cats: ['drugstore'] },
  { match: /\b(home depot|lowe'?s|menards|ace hardware)\b/i, cats: ['home_improvement'] },
  { match: /\b(best buy|micro center)\b/i, cats: ['electronics'] },
  { match: /\b(dick'?s sporting|academy sports|rei co-?op)\b/i, cats: ['sporting'] },
  { match: /\b(macy'?s|kohl'?s|nordstrom|jcpenney|dillard'?s|belk)\b/i, cats: ['department'] },
  { match: /\b(staples|office depot|officemax)\b/i, cats: ['office'] },
  { match: /\b(t-mobile|verizon|at&t)\b/i, cats: ['phone'] },
  { match: /\b(mcdonald'?s|burger king|wendy'?s|taco bell|chick-fil-a|popeyes|kfc|five guys|chipotle|sonic drive-in|jack in the box|arby'?s)\b/i, cats: ['fast_food'] },
  { match: /\b(starbucks|dunkin|panera)\b/i, cats: ['dining'] },
  { match: /\b(amc|regal|cinemark)\b/i, cats: ['movies'] },
  { match: /\b(planet fitness|la fitness|life time|orangetheory|crunch fitness)\b/i, cats: ['gym'] },
];

export function categorize(name, types = [], userFixes = []) {
  const typeList = types || [];
  const isGas = typeList.includes('gas_station');

  for (const fix of userFixes) {
    if (fix.text && name.toLowerCase().includes(fix.text.toLowerCase())) {
      return { cats: [fix.cat], merchant: null, networks: null, note: 'Using your store fix.' };
    }
  }
  for (const fix of BUILT_IN_FIXES) {
    if (fix.match.test(name)) {
      if (isGas && fix.keepGas) {
        return { cats: ['gas'], merchant: null, networks: fix.networks || null, note: fix.note || null };
      }
      return { cats: [...fix.cats], merchant: fix.merchant || null, networks: fix.networks || null, note: fix.note || null };
    }
  }

  const cats = [];
  for (const t of typeList) {
    if (TYPE_MAP[t]) cats.push(TYPE_MAP[t]);
    else if (DINING_TYPES.has(t) || t.endsWith('_restaurant')) cats.push('dining');
  }
  if (cats.includes('fast_food') && !cats.includes('dining')) cats.push('dining');
  let unique = [...new Set(cats)];
  // A store listed as both a supermarket and a discount superstore codes as a superstore.
  if (unique.includes('superstore')) unique = unique.filter(c => c !== 'grocery');
  return { cats: unique.length ? unique : ['other'], merchant: null, networks: null, note: null };
}

// ---------- distance ----------
export function metersBetween(a, b) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m) {
  const ft = m * 3.28084;
  if (ft < 1000) return `${Math.round(ft / 10) * 10} ft`;
  return `${(m / 1609.34).toFixed(1)} mi`;
}

// ---------- GPS ----------
export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser can’t share your location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      err => {
        const msg = err.code === 1
          ? 'Location is turned off for this app. Allow location in your phone’s settings, or pick a category below.'
          : 'Couldn’t get your location. Try again, or pick a category below.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}

// ---------- Google Maps JavaScript API ----------
let loadPromise = null;
let loadedKey = null;
let authFailed = false;

export function loadGoogle(apiKey) {
  if (loadPromise && loadedKey === apiKey) return loadPromise;
  if (loadPromise && loadedKey !== apiKey) {
    return Promise.reject(new Error('Reload the app to use the new Google key.'));
  }
  loadedKey = apiKey;
  loadPromise = new Promise((resolve, reject) => {
    window.__whichCardMapsReady = () => resolve(window.google);
    window.gm_authFailure = () => {
      authFailed = true;
      reject(new Error('Google rejected the Maps key. Check that Places API (New) and Maps JavaScript API are turned on and the key allows this site.'));
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=__whichCardMapsReady`;
    s.async = true;
    s.onerror = () => { loadPromise = null; reject(new Error('Couldn’t reach Google Maps. Check your connection.')); };
    document.head.appendChild(s);
  });
  return loadPromise;
}

export async function nearbyPlaces(apiKey, pos, userFixes = [], radius = 150) {
  const google = await loadGoogle(apiKey);
  if (authFailed) throw new Error('Google rejected the Maps key.');
  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary('places');

  const run = async r => {
    const { places } = await Place.searchNearby({
      fields: ['id', 'displayName', 'primaryType', 'types', 'location'],
      locationRestriction: { center: { lat: pos.lat, lng: pos.lng }, radius: r },
      maxResultCount: 12,
      rankPreference: SearchNearbyRankPreference.DISTANCE,
    });
    return places || [];
  };

  let places = await run(radius);
  if (places.length === 0) places = await run(500);

  return places.map(p => {
    const loc = { lat: p.location.lat(), lng: p.location.lng() };
    const types = [p.primaryType, ...(p.types || [])].filter(Boolean);
    const info = categorize(p.displayName || '', types, userFixes);
    return {
      id: p.id,
      name: p.displayName || 'Unnamed place',
      types,
      distance: metersBetween(pos, loc),
      ...info,
      source: 'gps',
    };
  }).filter(p => !(p.cats.length === 1 && p.cats[0] === 'other' && /route|locality|political|neighborhood|premise|street_address/.test(p.types.join(' '))))
    .sort((a, b) => a.distance - b.distance);
}
