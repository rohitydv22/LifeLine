# LifeLine ML — Neural Network Risk Classifier

This directory contains the machine learning pipeline for LifeLine's AI Ops Risk Classification Engine.

## Overview

The Neural Network replaces deterministic keyword-only risk scoring with a deep feed-forward classifier trained on campus and hostel incident telemetry:

* **Text Features**: Scikit-Learn `TfidfVectorizer` (unigrams + bigrams, sublinear TF, English stop words, max 3000 features).
* **Category Features**: Scikit-Learn `OneHotEncoder` (8 normalized campus infrastructure categories).
* **Architecture**: Multi-layer Perceptron:
  * Dense (128 units, ReLU) + Dropout (0.30)
  * Dense (64 units, ReLU) + Dropout (0.20)
  * Dense (3 units, Softmax) -> `[low, medium, high]`
* **Client-Side Deployment**: Model weights, IDF arrays, vocabulary, and category mappings are exported to `risk-model.json` and executed in pure JavaScript with zero external backend dependencies.

---

## Directory Structure

```text
/ml
│
├── data/
│   ├── reports.csv           # Full incident dataset
│   └── reports_test.csv      # Stratified test set
│
├── models/
│   ├── risk_nn.keras         # Trained Keras model
│   ├── vectorizer.joblib     # Scikit-learn TF-IDF vectorizer
│   ├── category_encoder.joblib # OneHotEncoder for categories
│   ├── label_encoder.joblib  # LabelEncoder for low/medium/high
│   ├── model_export.json     # Exported model weights for JS
│   └── training_history.json # Epoch metrics history
│
├── graphs/
│   ├── training_loss.png     # Train vs Val Loss
│   ├── training_accuracy.png # Train vs Val Accuracy
│   ├── training_f1.png       # Per-epoch Macro F1
│   ├── high_recall.png       # Per-epoch High-Risk Recall
│   └── confusion_matrix.png  # Confusion Matrix
│
├── generate_data.py          # Dataset generator
├── preprocess.py             # Feature engineering & text cleaner
├── train_nn.py               # Neural Network training script
├── evaluate.py               # Test evaluation & safety metrics
├── export_to_js.py           # Model exporter to JavaScript
├── requirements.txt          # Python dependencies
└── README.md                 # This documentation
```

---

## Quickstart & Training

### 1. Setup Environment

```bash
# Windows
py -m venv .venv
.venv\Scripts\activate

# Install requirements
pip install -r ml/requirements.txt
```

### 2. Generate Dataset

```bash
py ml/generate_data.py
```

### 3. Train Neural Network

```bash
py ml/train_nn.py
```

This will:
1. Train the feed-forward neural network with early stopping.
2. Track per-epoch Macro-F1 and safety-critical High-Risk Recall.
3. Save model artifacts to `ml/models/`.
4. Generate evaluation graphs in `ml/graphs/`.

### 4. Evaluate Safety & Test Set

```bash
py ml/evaluate.py
```

### 5. Export to JavaScript

```bash
py ml/export_to_js.py
```

Copies the exported bundle to `lifeline/js/model/risk-model.json` and `lifeline/js/model/risk-model.js`.
