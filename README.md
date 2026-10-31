# Which Card

A personal web app that tells you which credit card to use where you are. Open it at a store, it finds the business you're at, and shows the best card from your wallet as a big card on screen, with the next best options under it.

Everything you set (cards, picks, settings, your Maps key) is saved only in your phone's browser.

## 1. Put it online (5 minutes)

It needs an https address so the phone allows location and home-screen install. GitHub Pages is free:

1. Create a new **public** repo on GitHub, e.g. `which-card`.
2. Upload everything in this folder (keep the `js` and `icons` folders).
3. Repo **Settings > Pages**: Source = *Deploy from a branch*, branch = `main`, folder = `/ (root)`. Save.
4. After a minute your app is at `https://<your-username>.github.io/which-card/`.

Any static host works instead (Netlify, Cloudflare Pages: drag and drop the folder).

## 2. Get a Google Maps key

1. Go to <https://console.cloud.google.com/google/maps-apis/overview>, create a project and add billing. Personal use should stay inside Google's free monthly allowance.
2. Turn on **Maps JavaScript API** and **Places API (New)**.
3. Create an API key. Under *Application restrictions* choose *Websites* and add `https://<your-username>.github.io/*`. Under *API restrictions* allow just the two APIs above.
4. Open the app, go to **Settings**, paste the key, tap **Save key**.

## 3. Add it to your home screen

iPhone: open the address in Safari, tap Share, then **Add to Home Screen**. Allow location when asked.

## 4. First-time setup in the app

The **To do** list on the main screen walks you through it:

- Set your current picks for **U.S. Bank Cash+**, **BofA Customized Cash** and **Citi Custom Cash** (each card shows a suggestion; tap *Use these*).
- Tick **I activated it** for Chase Freedom and Discover once you've activated this quarter.
- In Settings: your BofA Rewards boost, what a point is worth, and the categories you spend on most.

## Each quarter

- When a new quarter starts, a reminder asks you to confirm your Cash+ / Custom Cash / BofA picks (once, not every time you open the app).
- Chase Freedom and Discover categories are built in through **Dec 2026**. When new ones are announced (usually mid-month before the quarter), the app reminds you to add them: My cards > card > *Add categories*. Or edit `js/rotating.js` and re-upload.

## Notes

- The app doesn't track spending caps; it shows them as reminders under the result.
- If a store keeps showing the wrong category, add a **Store fix** in Settings.
- Costco is treated as Visa-only.
- Chase is moving some original Freedom cards to Freedom Unlimited by Nov 20, 2026. If yours changes, remove Freedom and add Freedom Unlimited in My cards.

## For development

- `js/cards.js`: card catalog and earn rates. `js/rotating.js`: Chase/Discover quarterly categories.
- `js/engine.js`: ranking, suggestions and reminders (no browser code).
- `js/places.js`: Google Places lookup and how Google place types map to card categories.
- `js/app.js`: screens. `js/store.js`: saved data.
- Run the logic tests: `node --test tests/engine.test.mjs`
- Preview another day: add `?date=2027-01-05` to the address.
