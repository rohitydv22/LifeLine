"""
LifeLine AI Ops - Neural Network Training Script
Trains a feed-forward neural network on TF-IDF text features and One-Hot category features.
Saves model artifacts and generates training visualization graphs.
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    recall_score,
    precision_score
)

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping, Callback

from preprocess import (
    CATEGORIES,
    LABELS,
    clean_text,
    create_vectorizer,
    create_category_encoder,
    create_label_encoder
)


# -------------------------
# Custom Metrics Callback
# -------------------------

class MetricsCallback(Callback):
    """Callback to track Macro F1 and High-Risk Recall on validation data at each epoch."""

    def __init__(self, X_val, y_val_cat_indices, high_index=2):
        super().__init__()
        self.X_val = X_val
        self.y_val = y_val_cat_indices
        self.high_index = high_index
        self.f1_scores = []
        self.high_recalls = []

    def on_epoch_end(self, epoch, logs=None):
        probs = self.model.predict(self.X_val, verbose=0)
        preds = np.argmax(probs, axis=1)

        macro_f1 = f1_score(
            self.y_val,
            preds,
            average="macro",
            zero_division=0
        )
        high_recall = recall_score(
            self.y_val,
            preds,
            labels=[self.high_index],
            average="macro",
            zero_division=0
        )

        self.f1_scores.append(float(macro_f1))
        self.high_recalls.append(float(high_recall))

        print(
            f" - Epoch {epoch + 1:02d} Metrics: "
            f"Macro F1: {macro_f1:.4f} | "
            f"High-Risk Recall: {high_recall:.4f}"
        )


def main():
    # -------------------------
    # Setup directories
    # -------------------------
    os.makedirs("ml/models", exist_ok=True)
    os.makedirs("ml/graphs", exist_ok=True)

    print("=" * 60)
    print("LifeLine Neural Network Training")
    print("=" * 60)

    # -------------------------
    # Load Dataset
    # -------------------------
    data_path = "ml/data/reports.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Run generate_data.py first.")

    df = pd.read_csv(data_path)
    df = df.dropna(subset=["description", "category", "riskLevel"])

    df["description"] = df["description"].apply(clean_text)
    df["category"] = df["category"].astype(str).str.lower().str.strip()
    df["riskLevel"] = df["riskLevel"].astype(str).str.lower().str.strip()

    assert df["riskLevel"].isin(LABELS).all(), "Invalid risk labels found."

    X_text = df["description"]
    X_category = df[["category"]]
    y = df["riskLevel"]

    print(f"Loaded {len(df)} samples.")
    print("Class counts:\n", y.value_counts())

    # -------------------------
    # Stratified Train/Test Split
    # -------------------------
    X_text_train, X_text_test, X_cat_train, X_cat_test, y_train, y_test = train_test_split(
        X_text,
        X_category,
        y,
        test_size=0.20,
        random_state=42,
        stratify=df[["category", "riskLevel"]]
    )

    print(f"Training samples: {len(X_text_train)}, Testing samples: {len(X_text_test)}")

    # -------------------------
    # TF-IDF Feature Extraction
    # -------------------------
    vectorizer = create_vectorizer(max_features=3000)
    X_text_train_vec = vectorizer.fit_transform(X_text_train).toarray()
    X_text_test_vec = vectorizer.transform(X_text_test).toarray()

    print(f"TF-IDF Vocabulary Size: {len(vectorizer.vocabulary_)}")

    # -------------------------
    # Category One-Hot Encoding
    # -------------------------
    category_encoder = create_category_encoder()
    X_cat_train_vec = category_encoder.fit_transform(X_cat_train)
    X_cat_test_vec = category_encoder.transform(X_cat_test)

    # -------------------------
    # Combine Features
    # -------------------------
    X_train = np.hstack([X_text_train_vec, X_cat_train_vec])
    X_test = np.hstack([X_text_test_vec, X_cat_test_vec])

    print(f"Total Feature Dimension: {X_train.shape[1]} (TF-IDF: {X_text_train_vec.shape[1]}, Category: {X_cat_train_vec.shape[1]})")

    # -------------------------
    # Label Encoding
    # -------------------------
    label_encoder = create_label_encoder()
    y_train_encoded = label_encoder.transform(y_train)
    y_test_encoded = label_encoder.transform(y_test)

    y_train_onehot = tf.keras.utils.to_categorical(y_train_encoded, num_classes=3)
    y_test_onehot = tf.keras.utils.to_categorical(y_test_encoded, num_classes=3)

    # Save preprocessing transformers
    joblib.dump(vectorizer, "ml/models/vectorizer.joblib")
    joblib.dump(category_encoder, "ml/models/category_encoder.joblib")
    joblib.dump(label_encoder, "ml/models/label_encoder.joblib")
    print("Preprocessing transformers saved to ml/models/")

    # Split a validation set from X_train for epoch metrics tracking
    X_tr, X_val, y_tr_onehot, y_val_onehot, y_tr_enc, y_val_enc = train_test_split(
        X_train,
        y_train_onehot,
        y_train_encoded,
        test_size=0.20,
        random_state=42,
        stratify=y_train_encoded
    )

    # -------------------------
    # Neural Network Architecture
    # -------------------------
    input_dim = X_train.shape[1]
    model = Sequential([
        Dense(128, activation="relu", input_shape=(input_dim,)),
        Dropout(0.30),
        Dense(64, activation="relu"),
        Dropout(0.20),
        Dense(3, activation="softmax")
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    model.summary()

    # -------------------------
    # Callbacks
    # -------------------------
    early_stop = EarlyStopping(
        monitor="val_loss",
        patience=8,
        restore_best_weights=True,
        verbose=1
    )

    high_index = list(label_encoder.classes_).index("high")
    metrics_callback = MetricsCallback(X_val, y_val_enc, high_index=high_index)

    # -------------------------
    # Model Training
    # -------------------------
    print("\nStarting Neural Network Training...")
    history = model.fit(
        X_tr,
        y_tr_onehot,
        validation_data=(X_val, y_val_onehot),
        epochs=50,
        batch_size=16,
        callbacks=[early_stop, metrics_callback],
        verbose=1
    )

    # Save model
    model.save("ml/models/risk_nn.keras")
    print("\nSaved trained model to ml/models/risk_nn.keras")

    # -------------------------
    # Evaluation on Holdout Test Set
    # -------------------------
    print("\n" + "=" * 60)
    print("Model Evaluation on Test Set")
    print("=" * 60)

    probabilities = model.predict(X_test)
    predictions = np.argmax(probabilities, axis=1)

    print("\nClassification Report:\n")
    report = classification_report(
        y_test_encoded,
        predictions,
        target_names=label_encoder.classes_,
        digits=4
    )
    print(report)

    macro_f1 = f1_score(y_test_encoded, predictions, average="macro")
    macro_precision = precision_score(y_test_encoded, predictions, average="macro")
    macro_recall = recall_score(y_test_encoded, predictions, average="macro")

    high_recall = recall_score(
        y_test_encoded,
        predictions,
        labels=[high_index],
        average="macro",
        zero_division=0
    )
    high_precision = precision_score(
        y_test_encoded,
        predictions,
        labels=[high_index],
        average="macro",
        zero_division=0
    )

    print(f"Macro F1 Score:         {macro_f1:.4f}")
    print(f"Macro Precision:        {macro_precision:.4f}")
    print(f"Macro Recall:           {macro_recall:.4f}")
    print(f"High-Risk Recall:       {high_recall:.4f}  <-- PRIORITY SAFETY METRIC")
    print(f"High-Risk Precision:    {high_precision:.4f}")

    # -------------------------
    # Save Training History JSON
    # -------------------------
    history_data = {
        key: [float(x) for x in values]
        for key, values in history.history.items()
    }
    history_data["val_macro_f1"] = metrics_callback.f1_scores
    history_data["val_high_recall"] = metrics_callback.high_recalls
    history_data["test_macro_f1"] = float(macro_f1)
    history_data["test_high_recall"] = float(high_recall)

    with open("ml/models/training_history.json", "w") as f:
        json.dump(history_data, f, indent=2)

    # -------------------------
    # Graph 1: Training vs Validation Loss
    # -------------------------
    plt.figure(figsize=(8, 5))
    plt.plot(history.history["loss"], label="Training Loss", color="#3b82f6", linewidth=2)
    plt.plot(history.history["val_loss"], label="Validation Loss", color="#ef4444", linewidth=2)
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Categorical Crossentropy Loss", fontsize=11)
    plt.title("Neural Network Training vs Validation Loss", fontsize=13, fontweight="bold")
    plt.legend(loc="upper right", frameon=True)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig("ml/graphs/training_loss.png", dpi=150)
    plt.close()
    print("Generated: ml/graphs/training_loss.png")

    # -------------------------
    # Graph 2: Training vs Validation Accuracy
    # -------------------------
    plt.figure(figsize=(8, 5))
    plt.plot(history.history["accuracy"], label="Training Accuracy", color="#10b981", linewidth=2)
    plt.plot(history.history["val_accuracy"], label="Validation Accuracy", color="#8b5cf6", linewidth=2)
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Accuracy", fontsize=11)
    plt.title("Neural Network Training vs Validation Accuracy", fontsize=13, fontweight="bold")
    plt.legend(loc="lower right", frameon=True)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.tight_layout()
    plt.savefig("ml/graphs/training_accuracy.png", dpi=150)
    plt.close()
    print("Generated: ml/graphs/training_accuracy.png")

    # -------------------------
    # Graph 3: Validation Macro F1 per Epoch
    # -------------------------
    plt.figure(figsize=(8, 5))
    plt.plot(metrics_callback.f1_scores, label="Validation Macro F1", color="#f59e0b", linewidth=2, marker="o", markersize=4)
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Macro F1", fontsize=11)
    plt.title("Validation Macro F1 Score Over Epochs", fontsize=13, fontweight="bold")
    plt.ylim(0, 1.05)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(loc="lower right", frameon=True)
    plt.tight_layout()
    plt.savefig("ml/graphs/training_f1.png", dpi=150)
    plt.close()
    print("Generated: ml/graphs/training_f1.png")

    # -------------------------
    # Graph 4: High-Risk Recall Over Epochs
    # -------------------------
    plt.figure(figsize=(8, 5))
    plt.plot(metrics_callback.high_recalls, label="High-Risk Recall", color="#dc2626", linewidth=2, marker="s", markersize=4)
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("High-Risk Recall", fontsize=11)
    plt.title("High-Risk Recall During Training (Safety Critical)", fontsize=13, fontweight="bold")
    plt.ylim(0, 1.05)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(loc="lower right", frameon=True)
    plt.tight_layout()
    plt.savefig("ml/graphs/high_recall.png", dpi=150)
    plt.close()
    print("Generated: ml/graphs/high_recall.png")

    # -------------------------
    # Graph 5: Confusion Matrix
    # -------------------------
    cm = confusion_matrix(y_test_encoded, predictions)
    classes = list(label_encoder.classes_)

    plt.figure(figsize=(7, 6))
    plt.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.title("Risk Classification Confusion Matrix", fontsize=13, fontweight="bold")
    plt.colorbar()

    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, [c.upper() for c in classes], fontsize=10)
    plt.yticks(tick_marks, [c.upper() for c in classes], fontsize=10)

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontsize=12, fontweight="bold"
            )

    plt.ylabel("Actual Label", fontsize=11)
    plt.xlabel("Predicted Label", fontsize=11)
    plt.tight_layout()
    plt.savefig("ml/graphs/confusion_matrix.png", dpi=150)
    plt.close()
    print("Generated: ml/graphs/confusion_matrix.png")

    print("\nTraining and evaluation pipeline completed successfully!")


if __name__ == "__main__":
    main()
