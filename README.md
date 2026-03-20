# 🏠 Housing Market Trend Analysis & Price Prediction



**Predicting house sale prices in King County (Seattle area) using Machine Learning**

---

# 📌 Project Overview

This repository contains **Exploratory Data Analysis (EDA)**, **feature engineering**, and **machine learning models** built to predict residential house sale prices using the **King County House Sales dataset** (transformed version).

The goal is to understand what drives property values — such as **location, size, grade, renovation status, and waterfront view** — and build reliable regression models.

### 📊 Dataset Details

- **Dataset size**: 21,609 records  
- **Target variable**: `Sale_Price`  
  - Mean ≈ $511,600  
  - Median ≈ $450,000  
- **Number of features**: 30 (after preprocessing & encoding)

---

# ✨ Key Insights Discovered

### 🔥 Strongest Predictors (Correlation with Price)

- Flat Area (sqft) → **0.695**
- Overall Grade → **0.681**
- Living Area after Renovation → **0.630**
- Bathrooms → **0.535**

### 💰 Premium Features Impact

- 🌊 **Waterfront** → **+$450k** average premium  
- 🔨 **Renovated Homes** → **+$151k** value increase  
- 🏡 **Excellent Condition vs Average** → **+$249k**  
- 📍 **Zipcode Group 9 vs Group 1** → **+$750k** difference  

### 🎯 Optimal Property Sweet Spot

- **4 Bedrooms**
- Grade **8–9**
- Renovated living area  

---

# ⚙️ Technologies & Libraries Used

- Python 3.9+
- pandas, numpy  
- matplotlib, seaborn  
- scikit-learn   

---

# 📦 Requirements Example

```text
pandas>=1.5.0
numpy>=1.23.0
matplotlib>=3.6.0
seaborn>=0.12.0
scikit-learn>=1.2.0
jupyter>=1.0.0
```

---

# 🚀 Getting Started

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/Sham-S08/Housing-Market-Trend.git
cd Housing-Market-Trend
```

## 2️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

# 📊 Results Highlights

| Model                        | R² Score | RMSE     | Notes |
|-----------------------------|----------|----------|------|
| Linear Regression           | ~0.70    | ~$137k   | Baseline |
| Ridge / Lasso               | ~0.71    | ~$135k   | Slight improvement |
| Random Forest               | 0.82–0.84| ~$105k   | Good interpretability |
| XGBoost / Gradient Boosting | 0.86–0.89| ~$90–100k| Best performance |

### 📌 Feature Importance (XGBoost)

```
grade > living area after renovation > latitude/longitude > waterfront > bathrooms
```

---

# 📈 Business / Real-world Applications

- 🏠 **Home Buyers/Sellers** → Accurate price estimation  
- 📊 **Real Estate Investors** → Identify undervalued properties  
- 🔨 **Renovation ROI** → Estimate value added by upgrades  

---

# 👩‍💻 Author

**Shambhavi Srivastava**  
GitHub: [@Sham-S08](https://github.com/Sham-S08)

Feel free to connect, raise issues, or contribute!

---

# 📄 License

This project is licensed under the **MIT License**.  
See the `LICENSE` file for details.

---

# ⭐ Support

If you found this project helpful:

- ⭐ Star this repository  
- 💡 Share feedback  
- 🤝 Suggest improvements or collaborate  

---
