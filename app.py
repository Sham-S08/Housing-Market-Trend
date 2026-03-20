"""
HousingIQ — Flask Backend
─────────────────────────
Actual project structure (app.py lives at ROOT):

  Housing Market Trend/        ← project root, run python app.py from here
  ├── data/
  │   └── Transformed_Housing_Data2.csv
  ├── templates/
  │   ├── index.html
  │   ├── style.css
  │   └── script.js
  ├── app.py                   ← THIS FILE
  └── requirements.txt

Run:
  cd "Housing Market Trend"
  pip install flask pandas numpy
  python app.py
  → http://127.0.0.1:5000
"""

import os
import re
import numpy  as np
import pandas as pd
from flask import Flask, render_template, jsonify, request, send_from_directory

# ── PATHS (app.py is at project root) ────────────────────────────────────────
BASE_DIR  = os.path.dirname(os.path.abspath(__file__))   # project root
TMPL_DIR  = os.path.join(BASE_DIR, 'templates')          # templates/ sibling
DATA_PATH = os.path.join(BASE_DIR, 'data', 'Transformed_Housing_Data2.csv')

# Flask: tell it where templates/ lives explicitly
app = Flask(__name__, template_folder=TMPL_DIR)

# ── LOAD DATA ─────────────────────────────────────────────────────────────────
def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)

    # Zipcode group integer column (1-9)
    zip_cols = [c for c in df.columns if c.startswith('Zipcode_Group_Zipcode_Group_')]
    def get_zip(row):
        for col in zip_cols:
            if row[col] == 1:
                return int(col.replace('Zipcode_Group_Zipcode_Group_', ''))
        return 0
    df['Zipcode_Group'] = df.apply(get_zip, axis=1)

    # Condition label
    cond_map = {
        'Condition_of_the_House_Excellent': 'Excellent',
        'Condition_of_the_House_Fair':      'Fair',
        'Condition_of_the_House_Good':      'Good',
        'Condition_of_the_House_Okay':      'Okay',
    }
    def get_cond(row):
        for col, lbl in cond_map.items():
            if row.get(col, 0) == 1:
                return lbl
        return 'Okay'
    df['Condition'] = df.apply(get_cond, axis=1)
    return df

DF = load_data()

# ── BUILD STATS ───────────────────────────────────────────────────────────────
def build_stats(df: pd.DataFrame) -> dict:
    ren_yes = df[df['Ever_Renovated_Yes'] == 1]['Sale_Price'].mean()
    ren_no  = df[df['Ever_Renovated_Yes'] == 0]['Sale_Price'].mean()
    wf_yes  = df[df['Waterfront_View_Yes'] == 1]['Sale_Price'].mean()
    wf_no   = df[df['Waterfront_View_Yes'] == 0]['Sale_Price'].mean()

    zip_avg   = (df[df['Zipcode_Group'] > 0]
                 .groupby('Zipcode_Group')['Sale_Price'].mean()
                 .sort_index().round(0).to_dict())
    grade_avg = (df.groupby('Overall Grade')['Sale_Price'].mean()
                 .sort_index().round(0).to_dict())
    bed_avg   = (df[df['No of Bedrooms'] <= 10]
                 .groupby('No of Bedrooms')['Sale_Price'].mean()
                 .sort_index().round(0).to_dict())
    cond_avg  = df.groupby('Condition')['Sale_Price'].mean().round(0).to_dict()

    numeric_cols = [
        'No of Bedrooms', 'No of Bathrooms', 'Flat Area (in Sqft)',
        'Lot Area (in Sqft)', 'No of Floors', 'No of Times Visited',
        'Overall Grade', 'Area of the House from Basement (in Sqft)',
        'Basement Area (in Sqft)', 'Age of House (in Years)',
        'Living Area after Renovation (in Sqft)',
        'Ever_Renovated_Yes', 'Waterfront_View_Yes',
    ]
    corrs = {col: round(float(df['Sale_Price'].corr(df[col])), 4)
             for col in numeric_cols if col in df.columns}
    corrs_sorted = dict(sorted(corrs.items(), key=lambda x: abs(x[1]), reverse=True))

    return {
        'total_records': int(len(df)),
        'avg_price':     round(float(df['Sale_Price'].mean()), 0),
        'median_price':  round(float(df['Sale_Price'].median()), 0),
        'max_price':     round(float(df['Sale_Price'].max()), 0),
        'min_price':     round(float(df['Sale_Price'].min()), 0),
        'ren_yes_avg':   round(float(ren_yes), 0),
        'ren_no_avg':    round(float(ren_no),  0),
        'ren_premium':   round(float(ren_yes - ren_no), 0),
        'wf_yes_avg':    round(float(wf_yes), 0),
        'wf_no_avg':     round(float(wf_no),  0),
        'wf_premium':    round(float(wf_yes - wf_no), 0),
        'zip_avg':       {int(k): int(v) for k, v in zip_avg.items()},
        'grade_avg':     {int(k): int(v) for k, v in grade_avg.items()},
        'bed_avg':       {int(k): int(v) for k, v in bed_avg.items()},
        'cond_avg':      {str(k): int(v) for k, v in cond_avg.items()},
        'correlations':  corrs_sorted,
    }

STATS = build_stats(DF)

# ── PRICE ESTIMATOR ───────────────────────────────────────────────────────────
def estimate_price(beds, baths, sqft, grade, zip_group, waterfront, renovated) -> dict:
    base       = STATS['zip_avg'].get(zip_group, STATS['avg_price'])
    g7         = STATS['grade_avg'].get(7, 402000)
    g_delta    = STATS['grade_avg'].get(grade, g7) - g7
    b3         = STATS['bed_avg'].get(3, 456000)
    b_delta    = STATS['bed_avg'].get(min(beds, 10), b3) - b3
    sqft_delta = (sqft - 2000) * 125
    bath_delta = (baths - 2.0) * 50000
    wf_delta   = STATS['wf_premium']  if waterfront else 0
    ren_delta  = STATS['ren_premium'] if renovated  else 0

    total = max(50000.0, base + g_delta + b_delta + sqft_delta + bath_delta + wf_delta + ren_delta)
    return {
        'estimated_price': round(total, 0),
        'range_low':       round(total * 0.94 / 1000) * 1000,
        'range_high':      round(total * 1.06 / 1000) * 1000,
        'breakdown': {
            'location_base': round(base, 0),
            'grade_delta':   round(g_delta, 0),
            'bedroom_delta': round(b_delta, 0),
            'sqft_delta':    round(sqft_delta, 0),
            'bath_delta':    round(bath_delta, 0),
            'waterfront':    round(wf_delta, 0),
            'renovation':    round(ren_delta, 0),
        }
    }

# ── STATIC: serve style.css and script.js from templates/ ────────────────────
@app.route('/templates/<path:filename>')
def template_static(filename):
    return send_from_directory(TMPL_DIR, filename)

# ── PAGE ROUTE ────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

# ── API: STATS ────────────────────────────────────────────────────────────────
@app.route('/api/stats')
def api_stats():
    return jsonify(STATS)

# ── API: ESTIMATE ─────────────────────────────────────────────────────────────
@app.route('/api/estimate', methods=['POST'])
def api_estimate():
    d = request.get_json(force=True) or {}
    try:
        result = estimate_price(
            beds       = int(d.get('beds', 3)),
            baths      = float(d.get('baths', 2.0)),
            sqft       = float(d.get('sqft', 2000)),
            grade      = int(d.get('grade', 7)),
            zip_group  = int(d.get('zip_group', 5)),
            waterfront = bool(d.get('waterfront', False)),
            renovated  = bool(d.get('renovated', False)),
        )
        return jsonify({'success': True, **result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# ── API: RECOMMEND ────────────────────────────────────────────────────────────
@app.route('/api/recommend', methods=['POST'])
def api_recommend():
    d             = request.get_json(force=True) or {}
    budget        = float(d.get('budget', 700000))
    min_beds      = int(d.get('min_beds', 3))
    condition     = d.get('condition', 'any')
    will_renovate = bool(d.get('will_renovate', False))

    ok_avg     = STATS['cond_avg'].get('Okay', STATS['avg_price'])
    cond_delta = {
        'any':       0,
        'Good':      STATS['cond_avg'].get('Good',      ok_avg) - ok_avg,
        'Excellent': STATS['cond_avg'].get('Excellent', ok_avg) - ok_avg,
    }.get(condition, 0)

    bed_extra = (STATS['bed_avg'].get(min(min_beds, 10), STATS['bed_avg'].get(3, 456000))
                 - STATS['bed_avg'].get(3, 456000))

    zip_avg = STATS['zip_avg']
    best_zip, best_price = 1, zip_avg.get(1, 361000)
    for z in sorted(zip_avg.keys(), reverse=True):
        est = zip_avg[z] + bed_extra + cond_delta
        if est <= budget:
            best_zip, best_price = z, est
            break

    reno_gain = STATS['ren_premium']
    post_reno = best_price + reno_gain if will_renovate else None

    if will_renovate:
        strategy = (f"Buy non-renovated in Zip-Group {best_zip} at ~${int(best_price * 0.88):,} "
                    f"then renovate. Estimated post-reno value: ${int(best_price + reno_gain):,} "
                    f"(+${int(reno_gain):,} gain).")
    elif best_zip < 5:
        strategy = f"Consider stretching to Zip-Group {best_zip + 1} for better long-term appreciation."
    else:
        strategy = f"Grade 8+ properties in Zip-Group {best_zip} retain value exceptionally well."

    return jsonify({
        'success':   True,
        'zip_group': best_zip,
        'est_price': round(best_price, 0),
        'post_reno': round(post_reno, 0) if post_reno else None,
        'reno_gain': round(reno_gain, 0),
        'strategy':  strategy,
        'label':     f"{min_beds}-bed, Grade 8, Zip-Group {best_zip}",
    })

# ── API: COMPARE ──────────────────────────────────────────────────────────────
@app.route('/api/compare', methods=['POST'])
def api_compare():
    d = request.get_json(force=True) or {}

    def parse(h):
        return dict(
            beds       = int(h.get('beds', 3)),
            baths      = float(h.get('baths', 2.0)),
            sqft       = float(h.get('sqft', 2000)),
            grade      = int(h.get('grade', 7)),
            zip_group  = int(h.get('zip_group', 5)),
            waterfront = bool(h.get('waterfront', False)),
            renovated  = bool(h.get('renovated', False)),
        )

    a  = parse(d.get('house_a', {}))
    b  = parse(d.get('house_b', {}))
    ea = estimate_price(**a)
    eb = estimate_price(**b)
    pa, pb = ea['estimated_price'], eb['estimated_price']
    diff   = abs(pa - pb)
    winner = 'A' if pa >= pb else 'B'

    if a['waterfront'] and not b['waterfront']:
        insight = (f"House A's waterfront adds ~${int(STATS['wf_premium']):,}, "
                   f"outweighing {b['beds'] - a['beds']} extra bedrooms.")
    elif b['waterfront'] and not a['waterfront']:
        insight = f"House B's waterfront premium makes it the stronger investment despite fewer bedrooms."
    elif a['zip_group'] != b['zip_group']:
        lbl = 'A' if a['zip_group'] > b['zip_group'] else 'B'
        insight = f"House {lbl}'s higher zip group commands the ${int(diff):,} area premium."
    else:
        insight = f"Similar location — feature mix drives the ${int(diff):,} price gap."

    return jsonify({
        'success': True,
        'house_a': {'price': round(pa, 0), 'range_low': ea['range_low'], 'range_high': ea['range_high']},
        'house_b': {'price': round(pb, 0), 'range_low': eb['range_low'], 'range_high': eb['range_high']},
        'winner':  winner,
        'diff':    round(diff, 0),
        'insight': insight,
    })

# ── API: SEARCH ───────────────────────────────────────────────────────────────
@app.route('/api/search', methods=['POST'])
def api_search():
    d     = request.get_json(force=True) or {}
    query = d.get('query', '').lower()
    s     = STATS

    def fmt(n):
        if n >= 1_000_000: return f"${n / 1_000_000:.2f}M"
        if n >= 1_000:     return f"${int(n / 1_000)}K"
        return f"${int(n)}"

    if 'renovat' in query:
        ans = (f"<strong>Yes — renovate.</strong> Based on {s['total_records']:,} homes: "
               f"renovated properties sell for <strong>+{fmt(s['ren_premium'])}</strong> more "
               f"({fmt(s['ren_yes_avg'])} vs {fmt(s['ren_no_avg'])}). "
               f"Renovated living area correlates stronger (+0.630) than original sqft. "
               f"Best move: buy older home, renovate, resell.")
    elif any(k in query for k in ['waterfront', 'water front']):
        pct = int(s['wf_yes_avg'] / s['wf_no_avg'] * 100 - 100)
        ans = (f"<strong>Waterfront commands a {fmt(s['wf_premium'])} premium.</strong> "
               f"Avg {fmt(s['wf_yes_avg'])} vs {fmt(s['wf_no_avg'])} — a {pct}% premium. "
               f"Non-waterfront Zip 4-5 offers best value-per-dollar for investors.")
    elif any(k in query for k in ['grade', 'quality', 'upgrade']):
        g = s['grade_avg']
        g7, g8, g9 = g.get(7, 402000), g.get(8, 538000), g.get(9, 737000)
        ans = (f"<strong>Grade is the #2 price driver (correlation +0.681).</strong> "
               f"Grade 7: {fmt(g7)} | Grade 8: {fmt(g8)} (+{fmt(g8 - g7)}) | Grade 9: {fmt(g9)} (+{fmt(g9 - g8)}). "
               f"Grade 7 to 9 + renovation = potential +{fmt(g9 - g7 + int(s['ren_premium']))} total uplift.")
    elif any(k in query for k in ['zip', 'area', 'location', 'roi']):
        z = s['zip_avg']
        ans = (f"<strong>Location spans {fmt(z.get(9, 0) - z.get(1, 0))}.</strong> "
               f"Budget: Groups 1-2 ({fmt(z.get(1, 0))}-{fmt(z.get(2, 0))}). "
               f"Best value: Groups 4-5 ({fmt(z.get(4, 0))}-{fmt(z.get(5, 0))}). "
               f"Premium: Groups 7-9 ({fmt(z.get(7, 0))}-{fmt(z.get(9, 0))}). "
               f"Best ROI: buy Group 4-5 with renovation potential.")
    elif any(k in query for k in ['bedroom', 'bed']):
        b = s['bed_avg']
        ans = (f"<strong>Sweet spot: 4 bedrooms.</strong> "
               f"3-bed: {fmt(b.get(3, 0))} | 4-bed: {fmt(b.get(4, 0))} (+{fmt(b.get(4, 0) - b.get(3, 0))}) "
               f"| 5-bed: {fmt(b.get(5, 0))}. After 5 beds, price plateaus — diminishing returns.")
    else:
        nums = re.findall(r'\d[\d,]*', query)
        if nums:
            budget = int(nums[0].replace(',', ''))
            if budget < 10000:
                budget *= 1000
            best_z = max((z for z in s['zip_avg'] if s['zip_avg'][z] <= budget), default=1)
            ans = (f"<strong>Best under {fmt(budget)}:</strong> "
                   f"3-4 bed, Grade 8, Zip-Group {best_z} (avg {fmt(s['zip_avg'].get(best_z, 0))}). "
                   f"Willing to renovate? Buy non-renovated and gain +{fmt(s['ren_premium'])}.")
        else:
            z = s['zip_avg']
            ans = (f"<strong>Analysis across {s['total_records']:,} homes:</strong> "
                   f"Top drivers: Sqft (+0.695 corr), Grade (+0.681), "
                   f"Location ({fmt(z.get(1, 0))}-{fmt(z.get(9, 0))}). "
                   f"Market avg: {fmt(s['avg_price'])}. "
                   f"Ask about renovation ROI, grade upgrades, waterfront premiums, or budget targets.")

    return jsonify({'success': True, 'response': ans})

# ── ENTRY ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    # print(f"\n{'─' * 52}")
    # print(f"  HousingIQ  |  Market Intelligence Dashboard")
    # print(f"{'─' * 52}")
    # print(f"  Dataset : {DATA_PATH}")
    # print(f"  Records : {STATS['total_records']:,}")
    # print(f"  Avg $   : ${STATS['avg_price']:,.0f}")
    # print(f"  URL     : http://127.0.0.1:5000")
    # print(f"{'─' * 52}\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
