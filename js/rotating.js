// Built-in rotating 5% schedules.
// "rate" is the total % when the bonus applies (it already includes the card's normal 1%).
// On cards that already earn more than 1% in a category (like Freedom Flex on dining),
// the extra (rate - 1) stacks on top, matching how Chase pays it.
// Add a new quarter here, or enter it inside the app (My cards > card > Edit this quarter).

export const ROTATING = {
  'chase-freedom': {
    name: 'Chase Freedom 5%',
    rate: 5,
    capNote: '5% applies to the first $1,500 combined this quarter.',
    retroactive: true,
    quarters: {
      '2026-Q4': {
        label: 'Restaurants, grocery stores (not Walmart or Target), American Red Cross',
        cats: ['dining', 'fast_food', 'grocery'],
        merchants: ['red_cross'],
        activateBy: '2026-12-14',
      },
    },
  },
  'discover-it': {
    name: 'Discover 5%',
    rate: 5,
    capNote: '5% applies to the first $1,500 combined this quarter.',
    retroactive: false,
    quarters: {
      '2026-Q4': {
        label: 'Restaurants, entertainment, utilities',
        cats: ['dining', 'fast_food', 'movies', 'live_ent', 'amusement', 'utilities', 'phone', 'internet'],
        merchants: [],
        activateBy: '2026-12-31',
        note: 'Standalone streaming services don’t count as utilities.',
      },
    },
  },
};
