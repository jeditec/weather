const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 8040;

// Default: San Antonio, TX coordinates
const DEFAULT_LAT = 29.4241;
const DEFAULT_LON = -98.4936;
const DEFAULT_TZ = 'America/Chicago';

// Generic HTTP/HTTPS GET helper
function getJSON(urlString) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === 'https:' ? https : http;
    lib.get(urlString, { headers: { 'User-Agent': 'WeatherDashboard/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Failed to parse response from ${urlString}`)); }
      });
    }).on('error', reject);
  });
}

// Geocode postal code + country → { lat, lon, name, timezone }
// Uses GeoNames (postal code database) as primary, Nominatim as fallback
async function geocodeLocation(postalCode, country) {
  // Normalize country code to 2-letter (GeoNames requires this)
  const country2 = alpha3to2(country.trim());

  // Strategy 1: GeoNames postal code lookup (primary - most accurate for postal codes)
  let geonames = await getJSON(
    `https://secure.geonames.org/postalCodeSearchJSON?postalcode=${encodeURIComponent(postalCode)}&country=${encodeURIComponent(country2)}&username=free&style=FULL`
  );

  if (geonames && geonames.postalCodes && geonames.postalCodes.length > 0) {
    // Use the first result
    const g = geonames.postalCodes[0];
    const lat = parseFloat(g.lat);
    const lon = parseFloat(g.lng);

    // Resolve timezone via Open-Meteo
    let timezone = 'UTC';
    try {
      const tzInfo = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto`);
      timezone = tzInfo.timezone || 'UTC';
    } catch (e) {
      console.warn(`Could not resolve timezone for ${lat},${lon}: ${e.message}`);
    }

    // Build name from GeoNames data
    let name = g.placeName;
    if (g.adminName2) name += `, ${g.adminName2}`;
    if (g.adminName1) name += `, ${g.adminName1}`;

    return { lat, lon, name, timezone };
  }

  // Strategy 2: Nominatim fallback (broader coverage, less postal-code-specific)
  let geo = await getJSON(
    `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postalCode)}&countrycodes=${encodeURIComponent(country2)}&format=json&limit=5`
  );

  if (!geo || geo.length === 0) {
    geo = await getJSON(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postalCode)}&format=json&limit=20`
    );
  }

  if (!geo || geo.length === 0) {
    throw new Error('Location not found');
  }

  // Prefer a match in the requested country
  let r = geo[0]; // Use first result

  const lat = parseFloat(r.lat);
  const lon = parseFloat(r.lon);

  // Resolve timezone via Open-Meteo
  let timezone = 'UTC';
  try {
    const tzInfo = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto`);
    timezone = tzInfo.timezone || 'UTC';
  } catch (e) {
    console.warn(`Could not resolve timezone for ${lat},${lon}: ${e.message}`);
  }

  return {
    lat,
    lon,
    name: r.display_name.split(',').slice(0, 2).join(', '),
    timezone,
  };
}

// Fetch weather data from Open-Meteo
async function fetchWeather(lat, lon, timezone) {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max,sunrise,sunset,weather_code` +
    `&timezone=${encodeURIComponent(timezone)}` +
    `&forecast_days=7`;

  return getJSON(url);
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint — default (San Antonio)
app.get('/api/weather', async (req, res) => {
  try {
    const data = await fetchWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_TZ);
    res.json({ ...data, location: { name: 'San Antonio, TX', lat: DEFAULT_LAT, lon: DEFAULT_LON, tz: DEFAULT_TZ } });
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    res.status(520).json({ error: 'Failed to fetch weather data' });
  }
});

// 3-letter → 2-letter country code mapping for Nominatim
const ALPHA3_TO_2 = {
  AFG:'AF', ALB:'AL', DZA:'DZ', AND:'AD', AGO:'AO', ARG:'AR', ARM:'AM', AUS:'AU', AUT:'AT', AZE:'AZ',
  BHS:'BS', BHR:'BH', BGD:'BD', BRB:'BB', BLR:'BY', BEL:'BE', BLZ:'BZ', BEN:'BJ', BTN:'BT', BOL:'BO',
  BIH:'BA', BWA:'BW', BRA:'BR', BRN:'BN', BGR:'BG', BFA:'BF', BDI:'BI', KHM:'KH', CMR:'CM', CAN:'CA',
  CPV:'CV', CAF:'CF', TCD:'TD', CHL:'CL', CHN:'CN', COL:'CO', COM:'KM', COG:'CG', CRI:'CR', HRV:'HR',
  CUB:'CU', CYP:'CY', CZE:'CZ', COD:'CD', DNK:'DK', DJI:'DJ', DMA:'DM', DOM:'DO', ECU:'EC', EGY:'EG',
  SLV:'SV', GNQ:'GQ', ERI:'ER', EST:'EE', SWZ:'SZ', ETH:'ET', FJI:'FJ', FIN:'FI', FRA:'FR', GAB:'GA',
  GMB:'GM', GEO:'GE', DEU:'DE', GHA:'GH', GRC:'GR', GRD:'GD', GTM:'GT', GIN:'GN', GNB:'GW', GUY:'GY',
  HTI:'HT', HND:'HN', HUN:'HU', ISL:'IS', IND:'IN', IDN:'ID', IRN:'IR', IRQ:'IQ', IRL:'IE', ISR:'IL',
  ITA:'IT', JAM:'JM', JPN:'JP', JOR:'JO', KAZ:'KZ', KEN:'KE', KIR:'KI', KWT:'KW', KGZ:'KG', LAO:'LA',
  LVA:'LV', LBN:'LB', LSO:'LS', LBR:'LR', LBY:'LY', LIE:'LI', LTU:'LT', LUX:'LU', MDG:'MG', MWI:'MW',
  MYS:'MY', MDV:'MV', MLI:'ML', MLT:'MT', MHL:'MH', MRT:'MR', MUS:'MU', MEX:'MX', FSM:'FM', MDA:'MD',
  MCO:'MC', MNG:'MN', MNE:'ME', MAR:'MA', MOZ:'MZ', MMR:'MM', NAM:'NA', NRU:'NR', NPL:'NP', NLD:'NL',
  NZL:'NZ', NIC:'NI', NER:'NE', NGA:'NG', PRK:'KP', MKD:'MK', NOR:'NO', OMN:'OM', PAK:'PK', PLW:'PW',
  PSE:'PS', PAN:'PA', PNG:'PG', PRY:'PY', PER:'PE', PHL:'PH', POL:'PL', PRT:'PT', QAT:'QA', ROU:'RO',
  RUS:'RU', RWA:'RW', KNA:'KN', LCA:'LC', VCT:'VC', WSM:'WS', SMR:'SM', STP:'ST', SAU:'SA', SEN:'SN',
  SRB:'RS', SYC:'SC', SLE:'SL', SGP:'SG', SVK:'SK', SVN:'SI', SLB:'SB', SOM:'SO', ZAF:'ZA', KOR:'KR',
  SSD:'SS', ESP:'ES', LKA:'LK', SDN:'SD', SUR:'SR', SWE:'SE', CHE:'CH', SYR:'SY', TJK:'TJ', TZA:'TZ',
  THA:'TH', TLS:'TL', TGO:'TG', TON:'TO', TTO:'TT', TUN:'TN', TUR:'TR', TKM:'TM', TUV:'TV', UGA:'UG',
  UKR:'UA', ARE:'AE', GBR:'GB', USA:'US', URY:'UY', UZB:'UZ', VUT:'VU', VAT:'VA', VEN:'VE', VNM:'VN',
  YEM:'YE', ZMB:'ZM', ZWE:'ZW',
};

function alpha3to2(code) {
  const c = code.toUpperCase();
  if (c.length === 2) return c;
  if (ALPHA3_TO_2[c]) return ALPHA3_TO_2[c];
  return c;
}

// API endpoint — search by postal code + country
app.get('/api/weather/search', async (req, res) => {
  try {
    const { postalcode, country } = req.query;
    if (!postalcode || !country) {
      return res.status(400).json({ error: 'Both postal code and country are required' });
    }
    // Convert 3-letter code to 2-letter for Nominatim
    const countryCode2 = alpha3to2(country.trim());
    const loc = await geocodeLocation(postalcode.trim(), countryCode2);
    const data = await fetchWeather(loc.lat, loc.lon, loc.timezone);
    res.json({ ...data, location: loc });
  } catch (err) {
    console.error('Weather search error:', err.message);
    if (err.message === 'Location not found') {
      return res.status(404).json({ error: 'Location not found. Try a valid postal code and country code.' });
    }
    res.status(520).json({ error: 'Failed to fetch weather data for location' });
  }
});

// Fallback index for SPA routing (Express 5 catch-all)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`🌤️  Weather Dashboard running at http://localhost:${PORT}`);
  console.log(`📍 Default: San Antonio, TX`);
  console.log(`🔍 Search: /api/weather/search?postalcode=66600&country=MX`);
});
