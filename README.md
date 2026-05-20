# 🌤️ Weather Dashboard

A beautiful, real-time weather dashboard built with Node.js and vanilla JavaScript. Features a sleek dark-themed UI with current conditions, hourly and 7-day forecasts, and global location search.

## ✨ Features

- **Current Weather** — Temperature, feels-like, humidity, wind, UV index, precipitation, and daylight hours
- **Hourly Forecast** — Scrolling 24-hour breakdown with temperature, precipitation probability, and weather icons
- **7-Day Forecast** — Daily highs, lows, conditions, and chance of precipitation
- **Global Search** — Enter any postal code + country to fetch weather worldwide (195+ countries supported)
- **Auto-Refresh** — Updates data every 10 minutes and on tab focus
- **Responsive Design** — Works on desktop, tablet, and mobile with a polished dark UI
- **Animated Background** — Subtle gradient layers with floating weather icon and smooth fade-in transitions

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Frontend | Vanilla JavaScript + CSS (no frameworks) |
| Weather Data | [Open-Meteo API](https://open-meteo.com/) (free, no key required) |
| Geocoding | [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/) |

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/jeditec/weather.git
cd weather

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on **port 8040** by default. Open [http://localhost:8040](http://localhost:8040) in your browser.

To use a different port, set the `PORT` environment variable:

```bash
PORT=3000 npm start
```

## 🗺️ Project Structure

```
weather-dashboard/
├── server.js          # Express server + API routes
├── package.json       # Dependencies and scripts
├── public/
│   └── index.html     # Frontend (single HTML file with embedded CSS & JS)
└── .gitignore
```

### Server Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/weather` | Current weather for default location (San Antonio, TX) |
| `GET` | `/api/weather/search?postalcode=XXXXX&country=US` | Weather for a specific location by postal code |

### Example Search

```
GET /api/weather/search?postalcode=90210&country=US
GET /api/weather/search?postalcode=10115&country=DE
GET /api/weather/search?postalcode=66600&country=MEX
```

## 🌐 API Details

The server acts as a proxy between the browser and the Open-Meteo API:

1. **Geocoding** — The `/search` endpoint uses Nominatim (OpenStreetMap) to resolve a postal code + country to coordinates, then resolves the timezone via Open-Meteo's `timezone=auto` parameter.
2. **Weather Data** — Fetches current conditions, hourly forecast (temperature, humidity, precipitation probability, wind, weather code), and daily forecast (7 days, including UV index, sunrise/sunset) from Open-Meteo.
3. **Units** — All values are returned in **US Customary units**: °F, mph, inches of precipitation.

### WMO Weather Codes

The dashboard maps Open-Meteo's WMO weather codes to descriptive labels and emoji icons:

| Code | Condition | Code | Condition |
|------|-----------|------|-----------|
| 0 | ☀️ Clear Sky | 45 | 🌫️ Foggy |
| 1 | 🌤️ Mainly Clear | 61 | 🌦️ Light Rain |
| 2 | ⛅ Partly Cloudy | 65 | 🌧️ Heavy Rain |
| 3 | ☁️ Overcast | 75 | ❄️ Heavy Snow |
| 95 | ⛈️ Thunderstorm | 99 | ⛈️ Thunderstorm + Heavy Hail |

## 🎨 UI

The dashboard features a modern dark theme with:

- **Gradient animated background** — subtle blue, purple, and amber radial gradients
- **Glassmorphism cards** — semi-transparent backgrounds with light borders
- **Live pulse indicator** — green dot showing data is current
- **UV index bar** — color-coded gradient from green (low) to purple (extreme)
- **Daylight arc** — sunrise/sunset times displayed prominently
- **Floating animation** — weather icon gently bobs up and down
- **Hover effects** — cards lift and brighten on hover

## 📍 Default Location

The dashboard defaults to **San Antonio, Texas** (29.4241°N, 98.4936°W) in the `America/Chicago` timezone. To change the default, edit these constants in `server.js`:

```js
const DEFAULT_LAT = 29.4241;
const DEFAULT_LON = -98.4936;
const DEFAULT_TZ = 'America/Chicago';
```

## 🔒 CORS Note

This app is self-contained — the server serves both the API and static frontend from the same origin, so no CORS configuration is needed.

## 📄 License

MIT
