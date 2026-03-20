# Housing Market Trend — Project Documentation

**Project Title:** Housing Market Intelligence Dashboard
**Type:** Data Visualization + Web Application
**Dataset:** King County, Washington — Residential Property Sales

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Dataset Description](#2-dataset-description)
3. [Project Objectives](#3-project-objectives)
4. [Tools & Technologies](#4-tools--technologies)
5. [Project Workflow](#5-project-workflow)
6. [Data Cleaning & Transformation](#6-data-cleaning--transformation)
7. [Exploratory Data Analysis](#7-exploratory-data-analysis)
8. [Flask Web Application](#8-flask-web-application)
9. [Dashboard Features](#9-dashboard-features)
10. [Project Structure](#10-project-structure)
11. [Key Results](#11-key-results)
12. [Challenges & Solutions](#12-challenges--solutions)
13. [How to Run the Project](#13-how-to-run-the-project)

---

## 1. Problem Statement

The real estate market generates enormous amounts of data, but most buyers, sellers, and investors struggle to extract actionable insights from raw property records. Key questions go unanswered:

- What is a fair price for a property with specific features?
- Does investing in renovation actually pay off, and by how much?
- Which neighbourhoods offer the best value for a given budget?
- How does upgrading construction quality (grade) affect resale value?
- Is waterfront access worth the premium it commands?

This project addresses these questions by building a **data-driven Housing Market Intelligence Dashboard** that transforms a 21,609-row property dataset into an interactive, queryable web application. The dashboard allows users to estimate property values, simulate upgrade scenarios, compare options, and receive location-based recommendations — all grounded in real statistical analysis.

---

## 2. Dataset Description

### Source
The dataset is derived from King County, Washington residential property sale records. It has been pre-processed and feature-engineered into a transformed format suitable for analysis.

### File
`Transformed_Housing_Data2.csv`

### Dimensions
- **Rows:** 21,609 properties
- **Columns:** 31 features
- **Missing Values:** 0 (complete dataset)

### Feature Overview

| Category | Features |
|---|---|
| **Target Variable** | Sale_Price |
| **Size Features** | Flat Area (sqft), Lot Area (sqft), Basement Area (sqft), Area from Basement (sqft), No. of Floors |
| **Quality Features** | Overall Grade (1–13), Condition (Excellent/Good/Fair/Okay) |
| **Property Details** | No. of Bedrooms, No. of Bathrooms, Age of House (years) |
| **Location** | Latitude, Longitude, Zipcode Group (1–9, encoded as dummies) |
| **Renovation** | Ever Renovated (binary), Years Since Renovation, Living Area after Renovation, Lot Area after Renovation |
| **Market Signal** | No. of Times Visited |
| **View** | Waterfront View (binary) |
| **Condition Dummies** | Condition_Excellent, Condition_Fair, Condition_Good, Condition_Okay |
| **Zipcode Dummies** | Zipcode_Group_1 through Zipcode_Group_9 |

### Data Types
All columns are numeric (float64 or int64). Categorical variables have been one-hot encoded prior to this project — condition and zipcode group exist as binary dummy columns.

---

## 3. Project Objectives

1. **Statistical Analysis** — Compute descriptive statistics, Pearson correlations, and group-by averages across all 31 variables
2. **Key Insight Extraction** — Identify the top price drivers and quantify their exact premium/discount effects
3. **Interactive Visualization** — Build a web dashboard that presents findings through charts, bars, and ladders
4. **Price Estimation** — Implement a data-driven estimator that calculates property value from user-provided features
5. **What-If Simulation** — Allow users to model upgrade scenarios and see combined financial impact
6. **Smart Recommendations** — Match users to suitable properties based on budget and preferences
7. **Natural Language Query** — Accept plain-English questions and return data-backed answers

---

## 4. Tools & Technologies

| Tool | Purpose |
|---|---|
| **Python 3.13** | Backend data processing and API development |
| **Pandas** | Data loading, transformation, groupby analysis, correlation computation |
| **NumPy** | Numerical operations and type handling |
| **Flask 3.x** | Web framework — serves the dashboard and API endpoints |
| **HTML5** | Dashboard structure and layout |
| **CSS3** | Custom dark-theme styling with CSS variables, grid, animations |
| **JavaScript (Vanilla ES6+)** | Frontend interactivity, fetch API calls, dynamic rendering |
| **Lucide Icons (SVG)** | Icon system — inline SVGs, no external icon font dependency |
| **Google Fonts** | Typography — DM Serif Display, Syne, DM Mono |

---

## 5. Project Workflow

```
Raw Dataset
    │
    ▼
Data Loading (Pandas)
    │  pd.read_csv → 21,609 rows × 31 cols
    │
    ▼
Feature Engineering
    │  Decode dummy columns → Zipcode_Group integer (1-9)
    │  Decode dummy columns → Condition label (Excellent/Good/Fair/Okay)
    │
    ▼
Statistical Analysis
    │  Descriptive stats (mean, median, min, max)
    │  Pearson correlations with Sale_Price
    │  Group-by averages (grade, bedrooms, zipcode, condition)
    │  Binary group comparisons (waterfront, renovation)
    │
    ▼
Flask API Layer
    │  /api/stats      → pre-computed statistics JSON
    │  /api/estimate   → real-time price estimation
    │  /api/recommend  → budget-based property matching
    │  /api/compare    → side-by-side house comparison
    │  /api/search     → natural language query routing
    │
    ▼
Frontend Dashboard
    │  KPI Cards → market overview
    │  Valuation Panel → interactive price estimator
    │  What-If Simulator → upgrade impact modelling
    │  Recommender → budget-based smart matching
    │  Comparison Tool → A vs B side-by-side
    │  Location Chart → zipcode group bar chart
    │  Grade Ladder → grade-to-price visualisation
    │  Correlation Grid → feature importance bars
    │  Smart Alerts → auto-generated data insights
```

---

## 6. Data Cleaning & Transformation

The dataset was received in a pre-transformed state (hence the filename `Transformed_Housing_Data2.csv`). The following steps were applied within the Flask backend at load time:

### 6.1 Zipcode Group Decoding
The raw dataset encodes zipcode groups as 9 binary dummy columns (`Zipcode_Group_Zipcode_Group_1` through `_9`). These were decoded back to a single integer column `Zipcode_Group` (1–9) for groupby operations and charting.

```python
zip_cols = [c for c in df.columns if c.startswith('Zipcode_Group_Zipcode_Group_')]
def get_zip(row):
    for col in zip_cols:
        if row[col] == 1:
            return int(col.replace('Zipcode_Group_Zipcode_Group_', ''))
    return 0
df['Zipcode_Group'] = df.apply(get_zip, axis=1)
```

### 6.2 Condition Label Decoding
Similarly, the four condition dummy columns were decoded to a single human-readable `Condition` label column used in the recommender and group averages.

### 6.3 Outlier Identification (Not Removed)
A 33-bedroom property at $640,000 was identified as a likely data entry error. It was flagged in the Smart Alerts panel but not removed — its statistical impact on 21,609 records is negligible (< 0.005% of data), and removing data without strong justification would compromise dataset integrity.

### 6.4 Price Ceiling Observation
A cluster of records caps at exactly $1,129,575. This was noted as a likely data transformation artifact (price bucket ceiling) and documented in the insights. No action was taken on these records.

---

## 7. Exploratory Data Analysis

### 7.1 Descriptive Statistics
| Metric | Value |
|---|---|
| Mean Sale Price | ~$540,000 |
| Median Sale Price | ~$450,000 |
| Min Sale Price | ~$75,000 |
| Max Sale Price | $1,129,575 |
| Most Common Grade | Grade 7 |
| Most Common Condition | Okay / Good |

The positive skew (mean > median by ~$90K) indicates a right-skewed price distribution — a small number of high-value properties pulls the mean upward. The median is more representative of a typical property.

### 7.2 Correlation Analysis
Pearson correlations were computed between Sale_Price and all numeric columns. The top findings:

- **Sqft features dominate** — four of the top five predictors are size-related
- **Grade is the strongest quality signal** — outperforms condition, age, and location dummies
- **Age is slightly negative** — older homes sell for less on average, but renovation reverses this
- **Viewings are a surprising predictor** — demand signals embedded in viewing counts (+0.356)

### 7.3 Group-By Analysis
Average Sale Price was computed across every categorical grouping:
- 9 zipcode groups (range: $361K–$1.1M)
- 7+ grade levels (range: $250K–$1.08M)
- Bedrooms 1–10 (3-bed sweet spot, plateau after 5)
- 4 condition labels (Excellent commands $249K premium over Okay)
- Waterfront vs non-waterfront ($451K premium)
- Renovated vs non-renovated ($151K premium)

---

## 8. Flask Web Application

### 8.1 Architecture

```
Flask App (app.py)
├── Data Layer    — CSV loaded once at startup, STATS dict computed and cached
├── API Layer     — 5 REST endpoints returning JSON
└── Serve Layer   — Renders index.html, serves CSS/JS from templates/
```

### 8.2 API Endpoints

#### `GET /api/stats`
Returns the full pre-computed statistics object. Called once by the frontend on page load to populate all charts and KPI cards with real data.

**Response fields:** `total_records`, `avg_price`, `ren_premium`, `wf_premium`, `zip_avg` (dict), `grade_avg` (dict), `bed_avg` (dict), `cond_avg` (dict), `correlations` (dict sorted by abs value)

#### `POST /api/estimate`
Accepts property parameters and returns a data-driven price estimate.

**Request:** `{ beds, baths, sqft, grade, zip_group, waterfront, renovated }`
**Response:** `{ estimated_price, range_low, range_high, breakdown }`

The estimate uses a composite model:
- Base price = zipcode group average
- Deltas added for grade (vs Grade 7 baseline), bedrooms (vs 3-bed baseline), sqft (vs 2000 sqft baseline at $125/sqft), bathrooms (vs 2 baths at $50K/bath), waterfront premium, renovation premium

#### `POST /api/recommend`
Finds the best-matching zipcode group within a user's budget given bedroom and condition requirements.

**Request:** `{ budget, min_beds, condition, will_renovate }`
**Response:** `{ zip_group, est_price, label, strategy, post_reno, reno_gain }`

#### `POST /api/compare`
Estimates prices for two property configurations and generates a plain-English comparison insight.

**Request:** `{ house_a: {...}, house_b: {...} }`
**Response:** `{ house_a, house_b, winner, diff, insight }`

#### `POST /api/search`
Routes plain-English queries to the appropriate pre-computed statistics and returns an HTML-formatted response string.

**Request:** `{ query: "Is renovation worth it?" }`
**Response:** `{ response: "<strong>Yes...</strong>" }`

Routing uses keyword matching: `renovat`, `waterfront`, `grade`, `zip/area/roi`, `bedroom`, or numeric budget values.

### 8.3 Static File Serving
Since CSS and JS live in `templates/` (not the conventional `static/` folder), a dedicated route serves them:

```python
@app.route('/templates/<path:filename>')
def template_static(filename):
    return send_from_directory(TMPL_DIR, filename)
```

`index.html` references these as `/templates/style.css` and `/templates/script.js`.

---

## 9. Dashboard Features

| Feature | Description |
|---|---|
| **Search Bar** | Natural language query input with pre-set example chips |
| **AI Response Panel** | Contextual data-backed answers from /api/search |
| **KPI Cards** | 4 headline metrics: avg price, renovation premium, waterfront premium, grade jump |
| **Property Valuation** | Sliders + dropdowns → real-time API estimate with confidence range and driver bars |
| **What-If Simulator** | 6 toggle-able upgrade cards (bathroom, grade, renovation, sqft, waterfront, location) with live total |
| **Smart Recommender** | Budget slider + filters → best-match recommendation with investment strategy |
| **Comparison Tool** | Configure two houses, compare estimated prices, get auto-generated insight |
| **Location Chart** | Animated bar chart of average price by zipcode group (1–9) |
| **Grade Ladder** | Horizontal bar chart showing grade → price progression with jump amounts |
| **Correlation Grid** | Feature importance bars showing Pearson correlation vs Sale Price |
| **Smart Alerts** | 5 auto-generated insights: outlier detection, age effect, viewing signal, renovation strategy, price ceiling |

---

## 10. Project Structure

```
Housing Market Trend/
│
├── data/
│   └── Transformed_Housing_Data2.csv      # 21,609 rows × 31 columns
│
├── templates/
│   ├── index.html                          # Dashboard HTML
│   ├── style.css                           # Dark theme styles
│   └── script.js                           # Frontend logic + API calls
│
├── reports/
│   ├── insights.md                         # Key findings from analysis
│   └── project_documentation.md           # This file
│
├── app.py                                  # Flask backend + all API endpoints
├── requirements.txt                        # Python dependencies
└── .gitignore                              # Git exclusions
```

---

## 11. Key Results

| Finding | Value |
|---|---|
| Strongest price predictor | Flat Area in sqft (correlation +0.695) |
| Most actionable upgrade | Grade 8 → 9 (+$199,000 avg increase) |
| Renovation premium | +$151,000 (30% average increase) |
| Waterfront premium | +$451,000 (89% average increase) |
| Location price range | $361K (Group 1) to $1.102M (Group 9) |
| Best value zone | Zipcode Groups 4–5 |
| Bedroom sweet spot | 4 bedrooms (best $/bedroom ratio) |
| Age effect | Slight negative (-0.064 corr), reversed by renovation |
| Max combined uplift modelled | +$1,080,000 on a base $456K property |

---

## 12. Challenges & Solutions

| Challenge | Solution |
|---|---|
| Dummy-encoded columns making groupby impossible | Decoded zip and condition dummies into single integer/label columns at load time |
| Flask not finding templates from root-level app.py | Explicitly passed `template_folder=TMPL_DIR` to Flask constructor |
| CSS/JS in templates/ not served as static files | Added dedicated `/templates/<filename>` route using `send_from_directory` |
| Price estimates needed to be instant (no loading lag) | Computed local JS estimate immediately, then refined with API call in background |
| Outlier (33-bed property) affecting interpretation | Flagged in Smart Alerts panel without removing from dataset |
| Skewed price distribution making averages misleading | Reported both mean and median; used group-level averages for estimator base |

---

## 13. How to Run the Project

### Prerequisites
- Python 3.10 or higher
- pip package manager

### Installation

```bash
# 1. Clone or download the project
cd "Housing Market Trend"

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the Flask server
python app.py
```

### Access
Open your browser and go to: **http://127.0.0.1:5000**

### Dependencies (`requirements.txt`)
```
flask>=3.0.0
pandas>=2.0.0
numpy>=1.26.0
```

### Expected Console Output
```
────────────────────────────────────────────────────
  HousingIQ  |  Market Intelligence Dashboard
────────────────────────────────────────────────────
  Dataset : .../data/Transformed_Housing_Data2.csv
  Records : 21,609
  Avg $   : $540,000
  URL     : http://127.0.0.1:5000
────────────────────────────────────────────────────
```

---

*Documentation prepared for the Housing Market Trend data visualization project.*
*Dataset: King County residential property sales | Framework: Flask | Analysis: Python/Pandas*