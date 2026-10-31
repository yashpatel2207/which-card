// Finds nearby businesses with Google Places and turns each into spending categories.
import { KNOWN, nameMatches, normalize } from './merchants.js';

// ---------- Google place type -> our categories ----------
const TYPE_MAP = {
  supermarket: 'grocery', grocery_store: 'grocery', asian_grocery_store: 'grocery',
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

// Store types that card networks don't treat as grocery or dining.
const NOT_BONUS = new Set(['convenience_store', 'liquor_store', 'food_store', 'market', 'butcher_shop', 'health_food_store']);

function typeToCat(t) {
  if (TYPE_MAP[t]) return TYPE_MAP[t];
  if (DINING_TYPES.has(t) || t.endsWith('_restaurant')) return 'dining';
  return null;
}

// Turns a Google place into ONE spending category.
// Order: your store fixes, known chains, Google's main type, then its other types.
export function categorize(name, types = [], userFixes = [], primaryType = null) {
  const typeList = types || [];
  const primary = primaryType || typeList[0] || null;
  const isGas = typeList.includes('gas_station');

  for (const fix of userFixes) {
    if (fix.text && normalize(name).includes(normalize(fix.text))) {
      return { cats: [fix.cat], merchant: null, networks: null, note: 'Using your store fix.' };
    }
  }
  for (const entry of KNOWN) {
    if (entry.fix && nameMatches(entry, name)) {
      if (isGas && entry.keepGas) return { cats: ['gas'], merchant: null, networks: entry.networks, note: entry.note };
      return { cats: [...entry.cats], merchant: entry.merchant, networks: entry.networks, note: entry.note };
    }
  }

  // Convenience stores (7-Eleven, Wawa...) count as gas if they have pumps, otherwise nothing special.
  if (primary && NOT_BONUS.has(primary)) {
    return isGas
      ? { cats: ['gas'], merchant: null, networks: null, note: 'Gas pump purchases count as gas. Inside the store may not.' }
      : { cats: ['other'], merchant: null, networks: null, note: 'Convenience and specialty food stores usually don’t count as grocery stores.' };
  }

  const main = primary ? typeToCat(primary) : null;
  if (main) return { cats: [main], merchant: null, networks: null, note: null };

  for (const t of typeList) {
    if (NOT_BONUS.has(t)) break;
    const c = typeToCat(t);
    if (c) return { cats: [c], merchant: null, networks: null, note: null };
  }
  return { cats: ['other'], merchant: null, networks: null, note: null };
}

// Places worth showing: anything with a category, plus shops of any kind.
function isPayable(place) {
  if (place.cats[0] !== 'other') return true;
  return place.types.some(t => t === 'store' || t.endsWith('_store') || t.endsWith('_shop') || t === 'shopping_mall');
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

  let places = (await run(radius)).map(p => toPlace(p, pos, userFixes, 'gps')).filter(isPayable);
  if (places.length === 0) places = (await run(500)).map(p => toPlace(p, pos, userFixes, 'gps')).filter(isPayable);
  return places.sort((a, b) => a.distance - b.distance);
}

// Search Google for a store by name, near you when your location is known.
export async function searchPlacesByText(apiKey, text, pos, userFixes = []) {
  const google = await loadGoogle(apiKey);
  if (authFailed) throw new Error('Google rejected the Maps key.');
  const { Place } = await google.maps.importLibrary('places');
  const request = {
    textQuery: text,
    fields: ['id', 'displayName', 'primaryType', 'types', 'location', 'formattedAddress'],
  };
  if (pos) request.locationBias = { center: { lat: pos.lat, lng: pos.lng }, radius: 30000 };
  const { places } = await Place.searchByText(request);
  return (places || []).slice(0, 8).map(p => toPlace(p, pos, userFixes, 'search'));
}

function toPlace(p, pos, userFixes, source) {
  const loc = p.location ? { lat: p.location.lat(), lng: p.location.lng() } : null;
  const types = [...new Set([p.primaryType, ...(p.types || [])].filter(Boolean))];
  const name = p.displayName || 'Unnamed place';
  return {
    id: p.id,
    name,
    types,
    address: shortAddress(p.formattedAddress),
    distance: pos && loc ? metersBetween(pos, loc) : null,
    ...categorize(name, types, userFixes, p.primaryType),
    source,
  };
}

function shortAddress(a) {
  return a ? a.split(',').slice(0, 2).join(',').trim() : '';
}

// Re-run categories after you add a store fix.
export function recategorize(place, userFixes) {
  if (!place.types) return place;
  return { ...place, ...categorize(place.name, place.types, userFixes, place.types[0]) };
}
