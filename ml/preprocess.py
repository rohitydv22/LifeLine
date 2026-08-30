"""
LifeLine AI Ops - Preprocessing Module
Handles text preprocessing, TF-IDF vectorization, and category one-hot encoding.
"""

import re
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import OneHotEncoder, LabelEncoder

CATEGORIES = [
    "electrical",
    "fire_safety",
    "network",
    "other",
    "plumbing",
    "sanitation",
    "security",
    "structural"
]

LABELS = ["low", "medium", "high"]


def clean_text(text: str) -> str:
    """Normalize text input: strip whitespace, lowercase, and clean multiple spaces."""
    if not isinstance(text, str):
        return ""
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text


def load_dataset(file_path: str = "ml/data/reports.csv"):
    """Load and validate the reports dataset."""
    df = pd.read_csv(file_path)
    df = df.dropna(subset=["description", "category", "riskLevel"])
    
    df["description"] = df["description"].apply(clean_text)
    df["category"] = df["category"].astype(str).str.lower().str.strip()
    df["riskLevel"] = df["riskLevel"].astype(str).str.lower().str.strip()
    
    # Validation checks
    assert df["category"].isin(CATEGORIES).all(), f"Unexpected category in {file_path}"
    assert df["riskLevel"].isin(LABELS).all(), f"Unexpected riskLevel in {file_path}"
    
    return df


def create_vectorizer(max_features: int = 3000) -> TfidfVectorizer:
    """Create a configured TfidfVectorizer instance."""
    return TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        min_df=1,
        max_features=max_features,
        sublinear_tf=True,
        stop_words="english"
    )


def create_category_encoder() -> OneHotEncoder:
    """Create a configured OneHotEncoder instance for fixed categories."""
    return OneHotEncoder(
        categories=[sorted(CATEGORIES)],
        handle_unknown="ignore",
        sparse_output=False
    )


def create_label_encoder() -> LabelEncoder:
    """Create a LabelEncoder initialized with standard labels: low, medium, high."""
    le = LabelEncoder()
    le.classes_ = np.array(["low", "medium", "high"])
    return le

