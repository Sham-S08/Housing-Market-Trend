/* ══════════════════════════════════════════════════════════════
   HousingIQ — script.js
   All interactivity + Flask API calls
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ── FALLBACK STATE (overwritten by /api/stats on load) ──────── */
let ZIP_AVG = {
  1:361000,2:441000,3:550000,4:623000,5:718000,
  6:771000,7:881000,8:975000,9:1102000
};
let GRADE_DATA = [
  {g:5,p:250000},{g:6,p:326000},{g:7,p:402000},{g:8,p:538000},
  {g:9,p:737000},{g:10,p:960000},{g:11,p:1080000}
];
let CORRS = [
  {f:'Flat Area (sqft)',       c:0.695},
  {f:'Overall Grade',          c:0.681},
  {f:'Living Area (Reno)',     c:0.630},
  {f:'Above-Ground Area',      c:0.607},
  {f:'Bathrooms',              c:0.535},
  {f:'No. of Viewings',        c:0.356},
  {f:'Basement Area',          c:0.307},
];
let STATS      = {};
let WF_PREMIUM = 451000;
let REN_PREMIUM= 151000;

const UPGRADE_AMOUNTS = {
  bathroom:  135000,
  grade:     281000,
  reno:      151000,
  sqft:       62000,
  waterfront:451000,
  zip:       384000,
};
const BASE_PRICE = { val: 456000 };

/* ── UI STATE ─────────────────────────────────────────────────── */
let wfState      = 'No';
let renState     = 'No';
let recRenState  = 'No';
const upgrades   = {};

/* ── FORMATTERS ───────────────────────────────────────────────── */
function fmt(n) {
  n = Math.round(n);
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(n) >= 1_000)     return '$' + Math.round(n / 1_000) + 'K';
  return '$' + n;
}
function fmtSigned(n) {
  return (n >= 0 ? '+' : '') + fmt(n);
}
function fmtRaw(n) {
  return Math.abs(n) >= 1_000_000
    ? (n / 1_000_000).toFixed(2) + 'M'
    : Math.abs(n) >= 1_000
      ? Math.round(Math.abs(n) / 1_000) + 'K'
      : String(Math.abs(n));
}

/* ── API HELPERS ──────────────────────────────────────────────── */
async function apiGet(url) {
  try { const r = await fetch(url); return await r.json(); }
  catch(e) { console.warn('[GET]', url, e); return null; }
}
async function apiPost(url, body) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch(e) { console.warn('[POST]', url, e); return null; }
}

/* ── INIT ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Load real stats from Flask
  const stats = await apiGet('/api/stats');
  if (stats) {
    STATS = stats;
    // ZIP_AVG
    ZIP_AVG = {};
    for (const [k, v] of Object.entries(stats.zip_avg || {}))
      ZIP_AVG[parseInt(k)] = v;
    // GRADE_DATA
    const gd = stats.grade_avg || {};
    GRADE_DATA = Object.entries(gd)
      .map(([g, p]) => ({ g: parseInt(g), p }))
      .filter(d => d.g >= 5 && d.g <= 12)
      .sort((a, b) => a.g - b.g);
    // CORRS
    const corrs = stats.correlations || {};
    CORRS = Object.entries(corrs)
      .slice(0, 8)
      .map(([f, c]) => ({
        f: f.replace(' (in Sqft)', '').replace(/_/g, ' '),
        c: Math.abs(c),
      }));
    // Premiums
    WF_PREMIUM  = stats.wf_premium  || 451000;
    REN_PREMIUM = stats.ren_premium || 151000;
    UPGRADE_AMOUNTS.waterfront = Math.round(WF_PREMIUM  / 1000) * 1000;
    UPGRADE_AMOUNTS.reno       = Math.round(REN_PREMIUM / 1000) * 1000;
    BASE_PRICE.val = ZIP_AVG[5] || 718000;

    // Update KPI cards
    setKPIs(stats);
    // Update upgrade card amounts
    document.querySelectorAll('.upgrade-card').forEach(card => {
      const key = card.dataset.key;
      if (key && UPGRADE_AMOUNTS[key] !== undefined) {
        const el = card.querySelector('.upgrade-amount');
        if (el) el.textContent = '+' + fmt(UPGRADE_AMOUNTS[key]);
      }
    });
  }

  renderZipChart();
  renderGradeLadder();
  renderCorrGrid();
  calcPrice();
  runCompare();
  updateBudgetDisplay();

  // Search on Enter
  document.getElementById('searchInput')
    .addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
});

/* ── KPI UPDATE ───────────────────────────────────────────────── */
function setKPIs(s) {
  const vals = document.querySelectorAll('.kpi-value');
  if (vals[0]) vals[0].textContent = fmt(s.avg_price);
  if (vals[1]) vals[1].textContent = '+' + fmt(s.ren_premium);
  if (vals[2]) vals[2].textContent = '+' + fmt(s.wf_premium);
  const g8 = (s.grade_avg || {})[8] || 538000;
  const g9 = (s.grade_avg || {})[9] || 737000;
  if (vals[3]) vals[3].textContent = '+' + fmt(g9 - g8);

  const deltas = document.querySelectorAll('.kpi-delta');
  if (deltas[1]) deltas[1].textContent = `${fmt(s.ren_yes_avg)} vs ${fmt(s.ren_no_avg)} avg`;
  if (deltas[2]) deltas[2].textContent = `${fmt(s.wf_yes_avg)} vs ${fmt(s.wf_no_avg)} avg`;
}

/* ── SLIDERS ──────────────────────────────────────────────────── */
function updateSlider(id, outId) {
  document.getElementById(outId).textContent = document.getElementById(id).value;
}
function updateSliderF(id, outId) {
  document.getElementById(outId).textContent =
    parseFloat(document.getElementById(id).value).toFixed(2);
}

/* ── TOGGLES ──────────────────────────────────────────────────── */
function setToggle(group, val) {
  if (group === 'wf') {
    wfState = val;
    document.getElementById('wfYes').classList.toggle('active', val === 'Yes');
    document.getElementById('wfNo').classList.toggle('active',  val === 'No');
  } else {
    renState = val;
    document.getElementById('renYes').classList.toggle('active', val === 'Yes');
    document.getElementById('renNo').classList.toggle('active',  val === 'No');
  }
  calcPrice();
}
function setRecToggle(val) {
  recRenState = val;
  document.getElementById('recRenYes').classList.toggle('active', val === 'Yes');
  document.getElementById('recRenNo').classList.toggle('active',  val === 'No');
}

/* ── VALUATION ────────────────────────────────────────────────── */
async function calcPrice() {
  const beds  = parseInt(document.getElementById('bedrooms').value);
  const baths = parseFloat(document.getElementById('bathrooms').value);
  const sqft  = parseFloat(document.getElementById('sqft').value) || 2000;
  const grade = parseInt(document.getElementById('grade').value);
  const zip   = parseInt(document.getElementById('zipGroup').value);

  // Instant local estimate
  const zipBase    = ZIP_AVG[zip] || 540000;
  const g7entry    = GRADE_DATA.find(d => d.g === 7);
  const gEntry     = GRADE_DATA.find(d => d.g === grade);
  const gradeDelta = gEntry ? gEntry.p - (g7entry ? g7entry.p : 402000) : 0;
  const sqftDelta  = (sqft - 2000) * 125;
  const wfDelta    = wfState  === 'Yes' ? WF_PREMIUM  : 0;
  const renDelta   = renState === 'Yes' ? REN_PREMIUM : 0;
  const localEst   = Math.max(80000, Math.round((zipBase + gradeDelta + sqftDelta + wfDelta + renDelta) / 1000) * 1000);

  document.getElementById('estimatedPrice').textContent = fmt(localEst);

  // API call for accurate estimate
  const result = await apiPost('/api/estimate', {
    beds, baths, sqft, grade,
    zip_group:  zip,
    waterfront: wfState  === 'Yes',
    renovated:  renState === 'Yes',
  });

  const total = result?.estimated_price || localEst;
  const low   = result?.range_low       || Math.round(total * 0.94 / 1000) * 1000;
  const high  = result?.range_high      || Math.round(total * 1.06 / 1000) * 1000;
  const bd    = result?.breakdown       || {};

  document.getElementById('estimatedPrice').textContent = fmt(total);
  document.getElementById('priceRange').textContent     = `Confidence Range: ${fmt(low)} – ${fmt(high)}`;

  // Driver bars
  const locPremium = (bd.location_base || zipBase) - (ZIP_AVG[1] || 361000);
  setBar('sqft',  Math.abs(bd.sqft_delta  || sqftDelta) + 50000,  500000, 'var(--accent)');
  setBar('grade', Math.abs(bd.grade_delta || gradeDelta) + 5000,  500000, 'var(--teal)');
  setBar('zip',   locPremium,                                      750000, 'var(--gold)');
  setBar('wf',    bd.waterfront || wfDelta,                        600000, '#ff6b6b');
  setBar('ren',   bd.renovation || renDelta,                       200000, '#ffc94d');

  setText('amt-sqft',  fmtSigned(bd.sqft_delta  || sqftDelta));
  setText('amt-grade', fmtSigned(bd.grade_delta || gradeDelta));
  setText('amt-zip',   '+' + fmt(locPremium));
  setText('amt-wf',    wfDelta  > 0 ? '+' + fmt(wfDelta)  : '$0');
  setText('amt-ren',   renDelta > 0 ? '+' + fmt(renDelta) : '$0');

  // Tags
  document.getElementById('valTags').innerHTML =
    `<span class="tag grade">Grade ${grade}</span>` +
    `<span class="tag location">Zip Group ${zip}</span>` +
    (wfState  === 'Yes' ? '<span class="tag water">Waterfront</span>' : '') +
    (renState === 'Yes' ? '<span class="tag reno">Renovated</span>'  : '');
}

function setBar(id, val, max, color) {
  const el = document.getElementById('bar-' + id);
  if (el) {
    el.style.width      = Math.min(100, Math.max(0, (val / max) * 100)) + '%';
    el.style.background = color;
  }
}
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

/* ── SIMULATOR ────────────────────────────────────────────────── */
function toggleUpgrade(key) {
  upgrades[key] = !upgrades[key];
  document.getElementById('up-' + key).classList.toggle('active', upgrades[key]);
  updateSimTotal();
}
function updateSimTotal() {
  let total = 0;
  const parts = [];
  for (const [k, on] of Object.entries(upgrades)) {
    if (on) {
      total += UPGRADE_AMOUNTS[k];
      parts.push(upgradeShortLabel(k) + ' +' + fmt(UPGRADE_AMOUNTS[k]));
    }
  }
  setText('simTotal',     total === 0 ? '+$0' : '+' + fmt(total));
  setText('simBreakdown', parts.length ? parts.join(' · ') : 'Select upgrades to see combined impact');
  setText('simNewValue',  'New Est. Value: ' + fmt(BASE_PRICE.val + total));
}
const UPGRADE_LABELS = {
  bathroom:'Bath', grade:'Grade 7→9', reno:'Renovation',
  sqft:'+500 sqft', waterfront:'Waterfront', zip:'Zip-5→9',
};
function upgradeShortLabel(k) { return UPGRADE_LABELS[k] || k; }

/* ── RECOMMENDER ──────────────────────────────────────────────── */
function updateBudgetDisplay() {
  const v = parseInt(document.getElementById('budget').value);
  document.getElementById('budgetDisplay').textContent = fmt(v);
}
async function findRecommendation() {
  const budget      = parseInt(document.getElementById('budget').value);
  const min_beds    = parseInt(document.getElementById('recBeds').value);
  const condition   = document.getElementById('recCondition').value;
  const willRenovate = recRenState === 'Yes';

  const result = await apiPost('/api/recommend', {
    budget, min_beds, condition, will_renovate: willRenovate,
  });

  const card = document.getElementById('recResult');
  if (!result?.success) {
    card.innerHTML = '<div class="rec-insight">Could not load recommendation. Is Flask running?</div>';
    card.classList.add('visible');
    return;
  }

  document.getElementById('recTitle').textContent   = result.label;
  document.getElementById('recPrice').textContent   = 'Avg: ' + fmt(result.est_price);
  document.getElementById('recInsight').innerHTML   = result.strategy;
  card.classList.add('visible');
}

/* ── COMPARISON ───────────────────────────────────────────────── */
async function runCompare() {
  const aBeds = parseInt(document.getElementById('cmpABeds').value);
  const bBeds = parseInt(document.getElementById('cmpBBeds').value);
  const aWF   = document.getElementById('cmpAWF').value === 'yes';
  const bWF   = document.getElementById('cmpBWF').value === 'yes';
  const aZip  = parseInt(document.getElementById('cmpAZip').value);
  const bZip  = parseInt(document.getElementById('cmpBZip').value);
  const aGrade= parseInt(document.getElementById('cmpAGrade').value);
  const bGrade= parseInt(document.getElementById('cmpBGrade').value);

  // Local quick estimate while API loads
  const pa = (ZIP_AVG[aZip] || 550000) + (aBeds - 3) * 60000 + (aWF ? WF_PREMIUM : 0);
  const pb = (ZIP_AVG[bZip] || 550000) + (bBeds - 3) * 60000 + (bWF ? WF_PREMIUM : 0);
  setText('cmpPriceA', fmt(pa));
  setText('cmpPriceB', fmt(pb));

  const result = await apiPost('/api/compare', {
    house_a: { beds: aBeds, baths: 2, sqft: 2000, grade: aGrade, zip_group: aZip, waterfront: aWF, renovated: false },
    house_b: { beds: bBeds, baths: 2, sqft: 2000, grade: bGrade, zip_group: bZip, waterfront: bWF, renovated: false },
  });

  const pA = result?.house_a?.price || pa;
  const pB = result?.house_b?.price || pb;
  const winner = result?.winner || (pA >= pB ? 'A' : 'B');

  setText('cmpPriceA', fmt(pA));
  setText('cmpPriceB', fmt(pB));
  setText('cmpABedsD', aBeds + ' bed');
  setText('cmpBBedsD', bBeds + ' bed');
  setText('cmpAWFD',   aWF ? 'Waterfront' : 'No waterfront');
  setText('cmpBWFD',   bWF ? 'Waterfront' : 'No waterfront');
  setText('cmpAZipD',  'Zip Group ' + aZip);
  setText('cmpBZipD',  'Zip Group ' + bZip);

  document.getElementById('cmpCardA').classList.toggle('winner', winner === 'A');
  document.getElementById('cmpCardB').classList.toggle('winner', winner === 'B');

  document.getElementById('compareInsight').innerHTML =
    result?.insight
      ? `<strong>Insight:</strong> ${result.insight}`
      : `<strong>Price gap:</strong> ${fmt(Math.abs(pA - pB))} — ${winner === 'A' ? 'House A' : 'House B'} leads.`;
}

/* ── LOCATION ZIP CHART ───────────────────────────────────────── */
function renderZipChart() {
  const container = document.getElementById('zipChart');
  if (!container) return;
  const max = Math.max(...Object.values(ZIP_AVG));
  const COLORS = ['var(--accent)','var(--accent)','var(--teal)','var(--teal)',
                   'var(--teal)','var(--gold)','var(--gold)','var(--gold)','var(--gold)'];
  container.innerHTML = '';
  for (let z = 1; z <= 9; z++) {
    const price = ZIP_AVG[z] || 0;
    const pct   = (price / max) * 100;
    const col   = document.createElement('div');
    col.className = 'zip-col';
    col.innerHTML = `
      <div class="zip-bar-outer">
        <div class="zip-bar-fill" style="height:${pct}%;background:${COLORS[z-1]}"></div>
      </div>
      <div class="zip-lbl">Z${z}</div>
      <div class="zip-price">${fmt(price)}</div>`;
    container.appendChild(col);
  }
}

/* ── GRADE LADDER ─────────────────────────────────────────────── */
function renderGradeLadder() {
  const container = document.getElementById('gradeLadder');
  if (!container || !GRADE_DATA.length) return;
  const maxP = Math.max(...GRADE_DATA.map(d => d.p));
  let html = '';
  for (let i = 0; i < GRADE_DATA.length; i++) {
    const d    = GRADE_DATA[i];
    const pct  = (d.p / maxP) * 100;
    const jump = i > 0 ? '+' + fmt(d.p - GRADE_DATA[i - 1].p) : '';
    html += `<div class="grade-row">
      <span class="grade-num">Grade ${d.g}</span>
      <div class="grade-track"><div class="grade-fill" style="width:${pct}%"></div></div>
      <span class="grade-price">${fmt(d.p)}</span>
      <span class="grade-jump">${jump}</span>
    </div>`;
  }
  container.innerHTML = html;
}

/* ── CORRELATIONS ─────────────────────────────────────────────── */
function renderCorrGrid() {
  const container = document.getElementById('corrGrid');
  if (!container) return;
  container.innerHTML = CORRS.map(c => `
    <div class="corr-row">
      <span class="corr-feature">${c.f}</span>
      <div class="corr-track">
        <div class="corr-fill" style="width:${(c.c * 100).toFixed(1)}%"></div>
      </div>
      <span class="corr-val">+${c.c.toFixed(3)}</span>
    </div>`).join('');
}

/* ── SEARCH ───────────────────────────────────────────────────── */
function quickSearch(q) {
  document.getElementById('searchInput').value = q;
  runSearch();
}
async function runSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  const panel = document.getElementById('aiPanel');
  const text  = document.getElementById('aiText');
  text.innerHTML = '<span style="color:var(--text-muted)">Analyzing...</span>';
  panel.classList.add('visible');

  const result = await apiPost('/api/search', { query });
  text.innerHTML = result?.response
    || '<strong>Analysis:</strong> Market avg $540K. Top drivers: Sqft (+0.695), Grade (+0.681), Location ($361K–$1.1M range).';

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}