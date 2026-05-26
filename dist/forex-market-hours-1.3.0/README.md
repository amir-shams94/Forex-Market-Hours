# Forex Market Hours – Chrome Extension

A production-ready Chrome extension that shows live open/close status, country
silhouettes, local time and countdown timers for global Forex sessions. Add or
remove markets, register your own custom market, and optionally connect a
[tradinghours.com](https://www.tradinghours.com/) API key for authoritative
hours, holidays and half-days.

![Promo tile](store-assets/promo-tile-440x280.png)

## Features

- Live **open / closed** status for major Forex sessions (Sydney, Tokyo, Hong Kong,
  Frankfurt, London, New York and many more).
- **Country silhouette SVG** rendered next to each market that lights up green
  when its session is open and stays sky-blue when closed.
- Local market time with automatic Daylight Saving Time handling via the
  browser's `Intl` engine.
- Live countdown to next open or next close for every tracked market.
- Toolbar badge shows the number of currently open markets.
- Optional desktop notifications when a tracked market opens or closes.
- 23 built-in markets across every region; add unlimited custom markets with any
  IANA timezone, country code and trading days.
- Optional integration with the **tradinghours.com** REST API (v3) for
  professional-grade data (holidays, half days, etc.).
- Modern dark UI with a deep ocean blue-to-emerald palette, fully self-contained,
  no remote scripts.
- Manifest V3 with a service-worker background and ES modules.
- Friendly welcome screen on first install.

## Project structure

```
forex-market-hours/
├── manifest.json
├── README.md
├── PRIVACY.md                # Privacy policy (required by Web Store)
├── build.ps1                 # Builds the store-ready ZIP package
├── background/
│   └── service-worker.js
├── dist/                     # Build output (generated)
├── icons/
│   ├── icon16.png / 32 / 48 / 128
│   └── generate-icons.ps1    # Regenerates icons via System.Drawing
├── lib/
│   ├── markets.js            # Built-in market catalogue (23 markets)
│   ├── session.js            # Timezone + open/close engine
│   ├── storage.js            # chrome.storage wrapper
│   ├── country-paths.js      # ISO-2 keyed SVG country silhouettes
│   ├── country-maps.js       # SVG renderer with cached bounding box
│   └── tradinghours.js       # tradinghours.com REST client
├── options/
│   ├── options.html / .css / .js
│   └── welcome.html          # First-install welcome page
├── popup/
│   └── popup.html / .css / .js
└── store-assets/
    ├── promo-tile-440x280.png   # Required by the Chrome Web Store
    ├── screenshot-1280x800.png  # Required (at least one screenshot)
    ├── marquee-1400x560.png     # Optional but recommended
    └── resize-assets.ps1        # Regenerates the above from a source image
```

## Installation

You can add this extension to Chrome (or any Chromium browser) in three ways.
Pick the one that matches your situation.

### Method 1 – Load unpacked (recommended for personal use)

This is the fastest way to use the extension on your own computer.

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `forex-market-hours` folder on your Desktop.
5. The extension icon appears in the toolbar. Click the **puzzle** icon and
   pin **Forex Market Hours** to keep it visible.

A welcome page opens automatically the first time you install.

> Works in Chrome, Edge, Brave, Opera, Arc, and any Chromium-based browser
> released after April 2022 (Chrome 102+).

### Method 2 – Publish to the Chrome Web Store

The Web Store is the most user-friendly install path — once published, anyone
can install your extension with a single click, the same way they install
"Forex Time" or other listed extensions.

1. Build the store-ready ZIP package:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\build.ps1
   ```

   This produces `dist\forex-market-hours-<version>.zip` (≈ 46 KB).

2. Create a Chrome Web Store Developer account at
   [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).
   You'll be asked for a **one-time $5 registration fee**.

3. Click **New item** and upload the ZIP from step 1.

4. Fill out the listing using the assets in the `store-assets/` folder:
   - **Small promo tile**: `promo-tile-440x280.png`
   - **Screenshot**: `screenshot-1280x800.png` (at least one screenshot is
     required; you can add up to 5)
   - **Marquee promo tile** (optional): `marquee-1400x560.png`
   - **Privacy policy URL**: host `PRIVACY.md` somewhere public and paste
     the link here.
   - **Description / category / language**: see the suggested copy below.

5. Submit for review. Most extensions are approved within 1–3 business days.

#### Suggested store-listing copy

> **Title**: Forex Market Hours
>
> **Summary** (132 chars max):
> Live open/close status, country silhouettes, local time and countdowns for
> Sydney, Tokyo, London, New York and more.
>
> **Category**: Productivity
>
> **Language**: English
>
> **Description**: Use the content from the *Features* section above.

### Method 3 – Sideload as a packed `.crx` (advanced)

For enterprise or internal distribution you can pack the extension into a
signed `.crx` file:

1. Run `build.ps1` first so that the production tree is in
   `dist\forex-market-hours-<version>\`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Pack extension**.
4. **Extension root directory**: select `dist\forex-market-hours-<version>`.
5. Leave the private key blank the first time; Chrome will generate a
   `.pem` file alongside the `.crx`. Keep this `.pem` safe — you need it for
   future updates.
6. Distribute the resulting `.crx` to users together with installation
   instructions, or push it via a managed Chrome policy.

> Note: since Chrome 73, drag-and-drop install of unsigned `.crx` files is
> disabled. For self-distribution you either need an enterprise policy or you
> need to publish on the Web Store (Method 2).

## Using the tradinghours.com API (optional)

The extension works fully offline using built-in session hours. To upgrade to
authoritative market data (holidays, half-days, etc.):

1. Get an API key from [tradinghours.com](https://www.tradinghours.com/).
2. Open the extension popup → click the gear icon to open Settings.
3. Paste the API key into the **Data source** section.
4. Click **Test** to verify the connection.
5. Toggle **Use TradingHours.com API when available**.

The extension caches API responses for 5 minutes to stay well within rate
limits.

API endpoints used:

- `GET /v3/markets?group=allowed` – validate the API key & list allowed markets.
- `GET /v3/markets/status?fin_id=...` – live status for one or more markets.
- `GET /v3/markets/details?fin_id=...` – timezone, weekend, MIC, exchange.

See the [TradingHours API docs](https://docs.tradinghours.com/3.x/api-details)
for more.

## Adding a custom market

Open **Settings → Add a custom market**. You will need:

- **Name** – display name (e.g. `Istanbul`).
- **Country code** – ISO 3166-1 alpha-2, e.g. `TR`. Renders the country
  silhouette in the popup. Optional but recommended.
- **Flag** – an emoji flag, e.g. `🇹🇷` (optional).
- **IANA timezone** – e.g. `Europe/Istanbul`. Any
  [tz database identifier](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
  is accepted.
- **Open / close** – local trading hours, 24-hour format.
- **Trading days** – Monday through Sunday.
- **FinID** – optional, for the tradinghours.com API integration.

Sessions that cross midnight (e.g. `22:00 – 06:00`) are supported.

## Privacy

See [PRIVACY.md](PRIVACY.md). In short:

- No analytics, no telemetry, no advertising.
- No outbound network requests at all unless you explicitly enable the
  TradingHours.com API integration.
- All preferences live in `chrome.storage.sync`. No backend.

## Development

The project is intentionally build-step-free: it loads directly into Chrome as
unpacked. All files use native ES modules.

- Tweak the session engine: edit `lib/session.js`.
- Add a market to the built-in catalogue: edit `lib/markets.js`.
- Customise the popup: edit `popup/popup.*`.
- Regenerate icons after editing the script:

  ```powershell
  powershell -ExecutionPolicy Bypass -File icons\generate-icons.ps1
  ```

- Build a store-ready ZIP:

  ```powershell
  powershell -ExecutionPolicy Bypass -File .\build.ps1
  ```

## Credits

- Country silhouette SVG paths adapted from
  [sirlisko/world-map-country-shapes](https://github.com/sirlisko/world-map-country-shapes)
  (MIT), originally derived from [simplemaps.com](https://simplemaps.com/) Robinson
  projection world map (CC0).
- Market data and API specification: [tradinghours.com](https://www.tradinghours.com/).

## License

MIT. Use freely, attribution appreciated.
