"""
LifeLine AI Ops - Model Evaluation Script
Evaluates the trained neural network on holdout test data and reports detailed safety metrics.
"""

import os
import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import classification_report, confusion_matrix, f1_score, recall_score, precision_score
from tensorflow.keras.models import load_model

from preprocess import clean_text, CATEGORIES, LABELS


def evaluate():
    model_path = "ml/models/risk_nn.keras"
    vec_path = "ml/models/vectorizer.joblib"
    cat_path = "ml/models/category_encoder.joblib"
    lbl_path = "ml/models/label_encoder.joblib"
    test_path = "ml/data/reports_test.csv"

    if not os.path.exists(model_path):
        raise FileNotFoundError("Model file not found. Run train_nn.py first.")

    print("Loading model and artifacts...")
    model = load_model(model_path)
    vectorizer = joblib.load(vec_path)
    category_encoder = joblib.load(cat_path)
    label_encoder = joblib.load(lbl_path)

    if not os.path.exists(test_path):
        test_path = "ml/data/reports.csv"

    df_test = pd.read_csv(test_path)
    df_test["description"] = df_test["description"].apply(clean_text)
    df_test["category"] = df_test["category"].astype(str).str.lower().str.strip()
    df_test["riskLevel"] = df_test["riskLevel"].astype(str).str.lower().str.strip()

    X_text_vec = vectorizer.transform(df_test["description"]).toarray()
    X_cat_vec = category_encoder.transform(df_test[["category"]])
    X_test = np.hstack([X_text_vec, X_cat_vec])

    y_test_encoded = label_encoder.transform(df_test["riskLevel"])

    probabilities = model.predict(X_test, verbose=0)
    predictions = np.argmax(probabilities, axis=1)

    print("\n" + "=" * 60)
    print(f"EVALUATION ON {len(df_test)} SAMPLES ({test_path})")
    print("=" * 60)

    print("\nClassification Report:\n")
    print(classification_report(y_test_encoded, predictions, target_names=label_encoder.classes_, digits=4))

    macro_f1 = f1_score(y_test_encoded, predictions, average="macro")
    high_idx = list(label_encoder.classes_).index("high")
    low_idx = list(label_encoder.classes_).index("low")

    high_recall = recall_score(y_test_encoded, predictions, labels=[high_idx], average="macro", zero_division=0)
    high_precision = precision_score(y_test_encoded, predictions, labels=[high_idx], average="macro", zero_division=0)

    print(f"Overall Macro F1:      {macro_f1:.4f}")
    print(f"High-Risk Recall:      {high_recall:.4f}")
    print(f"High-Risk Precision:   {high_precision:.4f}")

    # Safety critical check: Actual High predicted as Low
    cm = confusion_matrix(y_test_encoded, predictions)
    high_as_low = cm[high_idx, low_idx]
    print(f"\nSafety Audit Check:")
    print(f" - Actual HIGH misclassified as LOW: {high_as_low} (Target = 0)")
    if high_as_low == 0:
        print(" [PASS] Zero dangerous under-classifications detected.")
    else:
        print(f" [WARN] {high_as_low} critical incident(s) were under-classified as low.")

    # Sample interactive predictions
    print("\n" + "=" * 60)
    print("SAMPLE PREDICTIONS ACROSS DOMAINS")
    print("=" * 60)

    samples = [
        ("electrical", "Sparks and smoke coming out of the main corridor power board"),
        ("electrical", "Desk tube light switch clicks slightly when turning on"),
        ("plumbing", "Burst main pipe flooding entire 3rd floor corridor, water reaching electrical sockets"),
        ("plumbing", "Tap slowly dripping in 2nd floor common washroom"),
        ("network", "Campus-wide network core switch failure, all exams and internet down"),
        ("fire_safety", "Active fire in pantry, heavy black smoke and flames spreading"),
        ("structural", "Balcony railing loose and wobbling when students lean on it"),
        ("security", "Armed intruder spotted in hostel staircase, urgent lockdown needed")
    ]

    for cat, desc in samples:
        t_vec = vectorizer.transform([clean_text(desc)]).toarray()
        c_vec = category_encoder.transform(pd.DataFrame([{"category": cat}]))
        feat = np.hstack([t_vec, c_vec])
        prob = model.predict(feat, verbose=0)[0]
        pred_idx = np.argmax(prob)
        pred_label = label_encoder.classes_[pred_idx]
        conf = prob[pred_idx]
        prob_dict = {cls: prob[i] for i, cls in enumerate(label_encoder.classes_)}

        print(f"\nCategory:    {cat}")
        print(f"Description: \"{desc}\"")
        print(f"Predicted:   {pred_label.upper()} ({conf*100:.1f}% confidence)")
        print(f"Probabilities: Low={prob_dict.get('low', 0)*100:.1f}%, Medium={prob_dict.get('medium', 0)*100:.1f}%, High={prob_dict.get('high', 0)*100:.1f}%")



if __name__ == "__main__":
    evaluate()
