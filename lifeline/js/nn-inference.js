/**
 * LifeLine AI Ops - Pure JavaScript Neural Network Inference Engine
 * Zero-dependency client-side inference executing TF-IDF feature extraction,
 * One-Hot Category encoding, and feed-forward Neural Network forward pass.
 */

(function (global) {
  "use strict";

  // Standard English stop words matching scikit-learn
  const DEFAULT_STOP_WORDS = new Set([
    "a", "about", "above", "across", "after", "afterwards", "again", "against", "all",
    "almost", "alone", "along", "already", "also", "although", "always", "am", "among",
    "amongst", "amoungst", "amount", "an", "and", "another", "any", "anyhow", "anyone",
    "anything", "anyway", "anywhere", "are", "around", "as", "at", "back", "be",
    "became", "because", "become", "becomes", "becoming", "been", "before", "beforehand",
    "behind", "being", "below", "beside", "besides", "between", "beyond", "bill", "both",
    "bottom", "but", "by", "call", "can", "cannot", "cant", "co", "con", "could",
    "couldnt", "cry", "de", "describe", "detail", "do", "done", "down", "due", "during",
    "each", "eg", "eight", "either", "eleven", "else", "elsewhere", "empty", "enough",
    "etc", "even", "ever", "every", "everyone", "everything", "everywhere", "except",
    "few", "fifteen", "fifty", "fill", "find", "fire", "first", "five", "for", "former",
    "formerly", "forty", "found", "four", "from", "front", "full", "further", "get",
    "give", "go", "had", "has", "hasnt", "have", "he", "hence", "her", "here",
    "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "him", "himself",
    "his", "how", "however", "hundred", "i", "ie", "if", "in", "inc", "indeed",
    "interest", "into", "is", "it", "its", "itself", "keep", "last", "latter",
    "latterly", "least", "less", "ltd", "made", "many", "may", "me", "meanwhile",
    "might", "mill", "mine", "more", "moreover", "most", "mostly", "move", "much",
    "must", "my", "myself", "name", "namely", "neither", "never", "nevertheless",
    "next", "nine", "no", "nobody", "none", "noone", "nor", "not", "nothing", "now",
    "nowhere", "of", "off", "often", "on", "once", "one", "only", "onto", "or",
    "other", "others", "otherwise", "our", "ours", "ourselves", "out", "over", "own",
    "part", "per", "perhaps", "please", "put", "rather", "re", "same", "see", "seem",
    "seemed", "seeming", "seems", "serious", "several", "she", "should", "show",
    "side", "since", "sincere", "six", "sixty", "so", "some", "somehow", "someone",
    "something", "sometime", "sometimes", "somewhere", "still", "such", "system",
    "take", "ten", "than", "that", "the", "their", "them", "themselves", "then",
    "thence", "there", "thereafter", "thereby", "therefore", "therein", "thereupon",
    "these", "they", "thick", "thin", "third", "this", "those", "though", "three",
    "through", "throughout", "thru", "thus", "to", "together", "too", "top", "toward",
    "towards", "twelve", "twenty", "two", "un", "under", "until", "up", "upon", "us",
    "very", "via", "was", "we", "well", "were", "what", "whatever", "when", "whence",
    "whenever", "where", "whereafter", "whereas", "whereby", "wherein", "whereupon",
    "wherever", "whether", "which", "while", "whither", "who", "whoever", "whole",
    "whom", "whose", "why", "will", "with", "within", "without", "would", "yet", "you",
    "your", "yours", "yourself", "yourselves"
  ]);

  /**
   * Tokenize text matching Scikit-Learn's default token_pattern: r"(?u)\b\w\w+\b"
   */
  function tokenize(text) {
    if (!text || typeof text !== "string") return [];
    const lower = text.toLowerCase();
    const tokens = lower.match(/[a-z0-9_]{2,}/g);
    return tokens || [];
  }

  /**
   * Generate unigrams and bigrams from tokens, filtering stop words
   */
  function extractNgrams(tokens, stopWordsSet) {
    const stopWords = stopWordsSet || DEFAULT_STOP_WORDS;
    const ngrams = [];

    // Filtered unigrams
    const filteredTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!stopWords.has(tok)) {
        filteredTokens.push(tok);
        ngrams.push(tok);
      }
    }

    // Bigrams (from raw adjacent tokens where at least not both are empty)
    for (let i = 0; i < tokens.length - 1; i++) {
      const t1 = tokens[i];
      const t2 = tokens[i + 1];
      // Scikit-learn includes bigrams if formed by valid tokens
      ngrams.push(t1 + " " + t2);
    }

    return ngrams;
  }

  /**
   * Compute TF-IDF feature vector
   */
  function computeTfidf(text, model) {
    const vocab = model.vocabulary || {};
    const idf = model.idf || [];
    const sublinearTf = model.sublinearTf !== false;
    const stopWords = model.stopWords ? new Set(model.stopWords) : DEFAULT_STOP_WORDS;

    const tokens = tokenize(text);
    const ngrams = extractNgrams(tokens, stopWords);

    // Count term occurrences
    const counts = {};
    for (let i = 0; i < ngrams.length; i++) {
      const term = ngrams[i];
      if (vocab.hasOwnProperty(term)) {
        const idx = vocab[term];
        counts[idx] = (counts[idx] || 0) + 1;
      }
    }

    // Allocate vector
    const numFeatures = idf.length;
    const vector = new Float32Array(numFeatures);

    let sumSquares = 0.0;

    for (const [idxStr, count] of Object.entries(counts)) {
      const idx = parseInt(idxStr, 10);
      const tf = sublinearTf ? 1.0 + Math.log(count) : count;
      const weight = tf * idf[idx];
      vector[idx] = weight;
      sumSquares += weight * weight;
    }

    // L2 Normalization
    if (sumSquares > 0.0) {
      const norm = Math.sqrt(sumSquares);
      for (let i = 0; i < numFeatures; i++) {
        if (vector[i] !== 0) {
          vector[i] /= norm;
        }
      }
    }

    return vector;
  }

  /**
   * One-hot encode category
   */
  function encodeCategory(category, model) {
    const categories = model.categories || [
      "electrical", "fire_safety", "network", "other",
      "plumbing", "sanitation", "security", "structural"
    ];
    const catClean = (category || "").toString().toLowerCase().trim();
    const vec = new Float32Array(categories.length);

    const idx = categories.indexOf(catClean);
    if (idx !== -1) {
      vec[idx] = 1.0;
    }
    return vec;
  }

  /**
   * Dense layer forward pass
   */
  function denseLayer(input, weights, bias, activation) {
    const outDim = bias.length;
    const inDim = input.length;
    const output = new Float32Array(outDim);

    for (let j = 0; j < outDim; j++) {
      let sum = bias[j];
      for (let i = 0; i < inDim; i++) {
        const inp = input[i];
        if (inp !== 0) {
          sum += inp * weights[i][j];
        }
      }
      if (activation === "relu") {
        sum = sum > 0 ? sum : 0;
      }
      output[j] = sum;
    }

    return output;
  }

  /**
   * Numerically stable Softmax activation
   */
  function softmax(values) {
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > max) max = values[i];
    }

    let sum = 0.0;
    const exps = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
      const e = Math.exp(values[i] - max);
      exps[i] = e;
      sum += e;
    }

    const probs = new Array(values.length);
    for (let i = 0; i < values.length; i++) {
      probs[i] = sum > 0 ? exps[i] / sum : 1.0 / values.length;
    }
    return probs;
  }

  /**
   * Execute full forward pass through Neural Network layers
   */
  function runNeuralNetwork(inputFeatures, model) {
    let current = inputFeatures;

    for (let i = 0; i < model.layers.length; i++) {
      const layer = model.layers[i];
      if (layer.activation === "softmax") {
        // Compute logits then softmax
        const logits = denseLayer(current, layer.weights, layer.bias, "linear");
        current = softmax(logits);
      } else {
        current = denseLayer(current, layer.weights, layer.bias, layer.activation);
      }
    }

    return current;
  }

  /**
   * Top-level inference function:
   * Predicts risk from { category, description } using the Neural Network model.
   *
   * @param {Object} input - { category: string, description: string }
   * @param {Object} [customModel] - Optional loaded model data object
   * @returns {{ riskLevel: "low"|"medium"|"high", confidence: number, probabilities: { low: number, medium: number, high: number } }}
   */
  function predictRisk(input, customModel) {
    const model = customModel || (typeof global.RISK_MODEL_DATA !== "undefined" ? global.RISK_MODEL_DATA : null);

    if (!model || !model.layers) {
      console.warn("LifeLine NN: Model data not loaded. Returning baseline fallback.");
      return {
        riskLevel: "medium",
        confidence: 0.5,
        probabilities: { low: 0.25, medium: 0.50, high: 0.25 }
      };
    }

    const description = input.description || "";
    const category = input.category || "other";

    // 1. Extract TF-IDF features
    const tfidfVec = computeTfidf(description, model);

    // 2. Encode Category One-Hot
    const catVec = encodeCategory(category, model);

    // 3. Concatenate Features [TF-IDF, Category]
    const totalDim = tfidfVec.length + catVec.length;
    const combinedFeatures = new Float32Array(totalDim);
    combinedFeatures.set(tfidfVec, 0);
    combinedFeatures.set(catVec, tfidfVec.length);

    // 4. Forward Pass
    const probs = runNeuralNetwork(combinedFeatures, model);

    // 5. Format results
    const labels = model.labels || ["low", "medium", "high"];
    let maxIdx = 0;
    let maxProb = probs[0];
    for (let i = 1; i < probs.length; i++) {
      if (probs[i] > maxProb) {
        maxProb = probs[i];
        maxIdx = i;
      }
    }

    const probMap = {};
    for (let i = 0; i < labels.length; i++) {
      probMap[labels[i]] = Number(probs[i].toFixed(4));
    }

    return {
      riskLevel: labels[maxIdx],
      confidence: Number(maxProb.toFixed(4)),
      probabilities: probMap
    };
  }

  /**
   * Async helper to fetch and initialize model JSON if not bundled via script
   */
  async function loadModelFromJson(url) {
    const modelUrl = url || "js/model/risk-model.json";
    try {
      const res = await fetch(modelUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${modelUrl}`);
      const data = await res.json();
      global.RISK_MODEL_DATA = data;
      return data;
    } catch (e) {
      console.warn("Could not fetch model JSON directly (may be running from file://):", e);
      return global.RISK_MODEL_DATA || null;
    }
  }

  // Export to global / module environment
  const NNInference = {
    tokenize,
    extractNgrams,
    computeTfidf,
    encodeCategory,
    denseLayer,
    softmax,
    runNeuralNetwork,
    predictRisk,
    loadModelFromJson
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = NNInference;
  }
  if (typeof window !== "undefined") {
    window.NNInference = NNInference;
    window.predictRisk = predictRisk;
  }
  if (typeof global !== "undefined") {
    global.NNInference = NNInference;
    global.predictRisk = predictRisk;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
