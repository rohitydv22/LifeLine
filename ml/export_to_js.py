"""
LifeLine AI Ops - Model Exporter for JavaScript
Exports trained Neural Network weights, TF-IDF vocabulary/IDF tables, and category encodings
to standalone JSON and JS bundle files for zero-dependency client-side inference.
"""

import os
import json
import joblib
import numpy as np
from tensorflow.keras.models import load_model


def export_model():
    model_path = "ml/models/risk_nn.keras"
    vec_path = "ml/models/vectorizer.joblib"
    cat_path = "ml/models/category_encoder.joblib"
    lbl_path = "ml/models/label_encoder.joblib"

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}. Run train_nn.py first.")

    print("Loading model and transformer artifacts...")
    model = load_model(model_path)
    vectorizer = joblib.load(vec_path)
    category_encoder = joblib.load(cat_path)
    label_encoder = joblib.load(lbl_path)

    # Convert numpy types in vocabulary to python int
    vocab = {str(k): int(v) for k, v in vectorizer.vocabulary_.items()}
    idf_list = [float(x) for x in vectorizer.idf_.tolist()]

    export_data = {
        "formatVersion": "1.0",
        "labels": [str(x) for x in label_encoder.classes_],
        "vocabulary": vocab,
        "idf": idf_list,
        "sublinearTf": True,
        "categories": [str(x) for x in category_encoder.categories_[0].tolist()],
        "stopWords": sorted([str(x) for x in vectorizer.get_stop_words()]),
        "ngramRange": [1, 2],
        "layers": []
    }

    # Extract dense layers
    for layer in model.layers:
        weights = layer.get_weights()
        if len(weights) == 2:
            kernel = weights[0].astype(float)
            bias = weights[1].astype(float)
            export_data["layers"].append({
                "name": str(layer.name),
                "type": "dense",
                "activation": str(layer.activation.__name__),
                "inputDim": int(kernel.shape[0]),
                "outputDim": int(kernel.shape[1]),
                "weights": [[round(float(val), 6) for val in row] for row in kernel],
                "bias": [round(float(val), 6) for val in bias]
            })

    # Save to ml/models/model_export.json
    os.makedirs("ml/models", exist_ok=True)
    with open("ml/models/model_export.json", "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2)
    print("Saved: ml/models/model_export.json")

    # Save to lifeline/js/model/risk-model.json
    os.makedirs("lifeline/js/model", exist_ok=True)
    json_path = "lifeline/js/model/risk-model.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2)
    print(f"Saved: {json_path}")

    # Also save as a JS module/bundle risk-model.js so it can be loaded directly
    # in browser environments (bypassing any CORS issues when loaded via file://)
    js_path = "lifeline/js/model/risk-model.js"
    json_str = json.dumps(export_data)
    js_content = f"""// Auto-generated LifeLine Neural Network Model Bundle
(function (global) {{
  var modelData = {json_str};
  if (typeof module !== "undefined" && module.exports) {{
    module.exports = modelData;
  }}
  if (typeof window !== "undefined") {{
    window.RISK_MODEL_DATA = modelData;
  }}
  if (typeof global !== "undefined") {{
    global.RISK_MODEL_DATA = modelData;
  }}
}})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
"""
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Saved: {js_path}")

    print("\nModel export to JavaScript complete!")


if __name__ == "__main__":
    export_model()
