// ============================================================
// Nokia HTML widget — state & toggle
// Toggled by N key (controls.js) or clicking the widget
// ============================================================
let nokiaOn  = false;
let smsIndex = 0;

// Prebuilt SMS messages (demo / fallback)
const prebuiltSMS = [
  `SoilSMS 17/03 08:42\nSTATUS: Soil dry\n(34%) pH 6.1\nNUTRIENTS: N low\n(85mg/kg) P+K ok\nACTION: Add urea.\nRain in 4 days.\nPLANT: Maize/beans\nafter rain.`,
  `SoilSMS 17/03 14:20\nSTATUS: Moisture\nrising (41%) pH 6.3\nTemp 26C humid 78%\nNUTRIENTS: All ok\nACTION: No action\nneeded. Conditions\nimproving.\nNEXT: Check in 6h`,
  `SoilSMS 17/03 20:05\nALERT: Soil temp\ndrop to 18C.\nMoisture 52% good.\npH stable 6.2\nACTION: Cover young\nseedlings tonight.\nFrost risk LOW but\nmonitor closely.`,
  `SoilSMS 18/03 06:30\nSTATUS: Overnight\nrain detected.\nMoisture 68% GOOD\npH 6.0 Temp 22C\nACTION: Perfect\nplanting window!\nSow maize today.\nNext SMS in 12h.`,
];

let llmSMS        = [];
let activeSMSList = prebuiltSMS;

let analysisRunning = false;
let lastAnalysisDay = -1;  // track game day for auto-trigger

function hasSensorAndKey() {
  const hasSensor = typeof UPGRADES !== 'undefined' && UPGRADES.sensorNode && UPGRADES.sensorNode.built;
  const hasKey    = !!(localStorage.getItem('farmsim_openrouter_key'));
  return hasSensor && hasKey;
}

function requestAnalysis() {
  if (analysisRunning) return;
  analysisRunning = true;

  // Show loading on Nokia
  const phoneEl = document.getElementById('nokia-container');
  const screen  = document.getElementById('nokia-screen');
  const text    = document.getElementById('nokia-text');
  const hint    = document.getElementById('nokia-hint');
  if (phoneEl) phoneEl.style.display = '';
  if (screen)  screen.classList.add('lit');
  if (text)    text.textContent = 'Analyzing soil...\nContacting server...';
  if (hint)    hint.textContent = 'PLEASE WAIT';
  nokiaOn = true;

  runAnalysis().then(result => {
    analysisRunning = false;
    if (!result.ok) {
      // Show error on Nokia
      if (text) text.textContent = 'SMS ERROR:\n' + result.error;
      if (hint) hint.textContent = '[ N ] CLOSE';
    }
    // If ok, runAnalysis already calls toggleNokia to show the result
  });
}

// Auto-trigger analysis once per game day when sensor node is built
function checkAutoAnalysis() {
  if (!hasSensorAndKey()) return;
  if (typeof DAY_DURATION === 'undefined' || typeof farmRealTime === 'undefined') return;
  const currentDay = Math.floor(farmRealTime / DAY_DURATION);
  if (currentDay !== lastAnalysisDay) {
    lastAnalysisDay = currentDay;
    // Only auto-trigger if we have at least 1 day played (skip initial)
    if (currentDay > 0) requestAnalysis();
  }
}

function toggleNokia() {
  const phoneEl = document.getElementById('nokia-container');
  const screen  = document.getElementById('nokia-screen');
  const text    = document.getElementById('nokia-text');
  const hint    = document.getElementById('nokia-hint');
  if (!screen) return;

  // If analysis is running, ignore toggle
  if (analysisRunning) return;

  if (!nokiaOn) {
    // First press with sensor + key: trigger fresh AI report
    if (hasSensorAndKey() && activeSMSList === prebuiltSMS && llmSMS.length === 0) {
      requestAnalysis();
      return;
    }

    // Show widget, turn screen on
    phoneEl.style.display = '';
    nokiaOn = true;
    screen.classList.add('lit');
    text.textContent = activeSMSList[smsIndex];
    const canAnalyze = hasSensorAndKey();
    const pageInfo = activeSMSList.length > 1 ? ` ${smsIndex + 1}/${activeSMSList.length}` : '';
    hint.textContent = activeSMSList.length > 1
      ? `[ N ] NEXT${pageInfo}` + (canAnalyze ? '  [ R ] NEW' : '')
      : '[ N ] CLOSE' + (canAnalyze ? '  [ R ] NEW' : '');
    smsIndex = (smsIndex + 1) % activeSMSList.length;
    screen.scrollTop = 0;
  } else {
    // Cycle; wrap-around turns screen off and hides widget
    text.textContent = activeSMSList[smsIndex];
    smsIndex = (smsIndex + 1) % activeSMSList.length;
    screen.scrollTop = 0;
    if (smsIndex === 0) {
      nokiaOn = false;
      screen.classList.remove('lit');
      text.textContent = 'No new messages';
      hint.textContent = '[ N ] READ SMS';
      phoneEl.style.display = 'none';
    } else {
      const canAnalyze = hasSensorAndKey();
      const pageInfo = ` ${smsIndex}/${activeSMSList.length}`;
      hint.textContent = `[ N ] NEXT${pageInfo}` + (canAnalyze ? '  [ R ] NEW' : '');
    }
  }
}

// ============================================================
// Sensor simulation — logic preserved for later gameplay use
// ============================================================
const S = { moisture: 34.2, ph: 6.1, soilTemp: 24.5, airTemp: 28.0, humid: 72.0, n: 85, p: 30, k: 160 };

const SENSOR_LIMITS = {
  moisture: { min: 0,   max: 100 },
  ph:       { min: 3,   max: 10  },
  soilTemp: { min: -10, max: 60  },
  airTemp:  { min: -10, max: 55  },
  humid:    { min: 0,   max: 100 },
  n:        { min: 0,   max: 500 },
  p:        { min: 0,   max: 200 },
  k:        { min: 0,   max: 500 },
};

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function updateSensors() {
  S.moisture = Math.max(15, Math.min(80, S.moisture + (Math.random() - 0.48) * 0.5));
  S.ph       = Math.max(4.5, Math.min(8.0, S.ph + (Math.random() - 0.5) * 0.02));
  S.soilTemp += (Math.random() - 0.5) * 0.1;
  S.airTemp  += (Math.random() - 0.5) * 0.15;
  S.humid    = Math.max(30, Math.min(95, S.humid + (Math.random() - 0.5) * 0.3));
  S.n        = Math.max(20, Math.min(200, S.n + (Math.random() - 0.5)));
  S.p        = Math.max(10, Math.min(80,  S.p + (Math.random() - 0.5) * 0.5));
  S.k        = Math.max(50, Math.min(300, S.k + (Math.random() - 0.5)));
}

function getSoilState() {
  return {
    moisture: S.moisture,
    ph: S.ph,
    soilTemp: S.soilTemp,
    airTemp: S.airTemp,
    humid: S.humid,
    n: S.n,
    p: S.p,
    k: S.k,
  };
}

window.getSoilState = getSoilState;
window.updateSoilSensors = updateSensors;

// ============================================================
// AI / LLM — preserved for later use
// Call runAnalysis() from game code; key auto-read from settings
// ============================================================
const SYSTEM_PROMPT = `You are an agronomist assistant helping smallholder farmers in rural Tanzania.
You receive soil sensor data and weather forecast data, then produce a practical SMS-friendly report.

Output rules:
- Write in plain English only (no markdown, no bullet symbols, no emojis)
- Be concise — total output must fit in 3-4 SMS messages (max 600 characters total)
- Structure: STATUS | NUTRIENTS | ACTION | PLANT | TIMING
- Speak directly to the farmer ("Your soil...", "You should...")
- Prioritize the most critical actions first
- Consider local Tanzanian crops: maize, cassava, sorghum, beans, groundnuts, sunflower, rice, vegetables
- If data values are null/missing, note that sensor reading failed and advise re-check
- Factor in current weather conditions (rain boosts soil moisture, drought dries it out)
- If drought, warn about crop slowdown and advise watering
- If rain/storm, note the free watering benefit and suggest planting
- Always end with a short timing recommendation for planting or treatment

NPK interpretation reference (mg/kg):
  Nitrogen:    Low <100, Medium 100-200, High >200
  Phosphorus:  Low <25, Medium 25-50, High >50
  Potassium:   Low <100, Medium 100-200, High >200

pH interpretation:
  <5.5 = too acidic, 5.5-7.0 = good, 7.0-8.5 = alkaline, >8.5 = too alkaline

Moisture interpretation:
  <20% = very dry, 20-40% = dry, 40-70% = good, >70% = waterlogged`;

// Split long AI text into Nokia-sized pages (~160 chars each, splitting on line breaks)
const SMS_PAGE_CHARS = 160;

function splitSMSPages(text, header) {
  const lines = text.split('\n');
  const pages = [];
  let current = '';

  for (const line of lines) {
    // If adding this line would exceed the limit, start a new page
    if (current.length > 0 && current.length + line.length + 1 > SMS_PAGE_CHARS) {
      pages.push(current.trim());
      current = '';
    }
    current += (current ? '\n' : '') + line;
  }
  if (current.trim()) pages.push(current.trim());

  // Add header + page numbers
  if (pages.length === 1) {
    return [header + '\n' + pages[0]];
  }
  return pages.map((p, i) => `${header} (${i + 1}/${pages.length})\n${p}`);
}

async function runAnalysis(apiKey, model = 'arcee-ai/trinity-large-preview:free') {
  apiKey = apiKey || localStorage.getItem('farmsim_openrouter_key') || '';
  if (!apiKey) return { ok: false, error: 'No API key — configure one in Settings' };

  const userMessage = `SOIL SENSOR READING (node FARM001):
Moisture: ${S.moisture.toFixed(1)}%
pH: ${S.ph.toFixed(1)}
Soil temperature: ${S.soilTemp.toFixed(1)} C
Air temperature: ${S.airTemp.toFixed(1)} C
Air humidity: ${S.humid.toFixed(1)}%
Nitrogen: ${Math.round(S.n)} mg/kg
Phosphorus: ${Math.round(S.p)} mg/kg
Potassium: ${Math.round(S.k)} mg/kg

CURRENT WEATHER: ${typeof currentWeather !== 'undefined' ? WEATHER_TYPES[currentWeather].label : 'Unknown'}

WEATHER FORECAST (next 3 days):
${typeof getWeatherForecastString === 'function' ? getWeatherForecastString() : 'Forecast unavailable'}

Provide your SMS advisory now.`;

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'SoilSMS Farm Game'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }

    const data   = await resp.json();
    const advice = data.choices?.[0]?.message?.content?.trim();
    if (!advice) throw new Error('Empty response from model');

    const now     = new Date();
    const dateStr = now.getDate().toString().padStart(2,'0') + '/' +
                    (now.getMonth()+1).toString().padStart(2,'0') + ' ' +
                    now.getHours().toString().padStart(2,'0') + ':' +
                    now.getMinutes().toString().padStart(2,'0');

    const header = `SoilSMS ${dateStr}`;
    const pages  = splitSMSPages(advice, header);
    // Prepend pages in reverse so page 1 is first
    for (let i = pages.length - 1; i >= 0; i--) {
      llmSMS.unshift(pages[i]);
    }
    // Cap total stored messages
    while (llmSMS.length > 20) llmSMS.pop();
    activeSMSList = llmSMS;
    smsIndex      = 0;

    // Show immediately on Nokia
    nokiaOn = false;
    toggleNokia();

    return { ok: true, message: pages[0] };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
