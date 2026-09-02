# LifeLine AIOps
**Autonomous Operations & Rapid Human Coordination for Campus Digital & Physical Infrastructure**

LifeLine is a human-governed AIOps platform that unifies student issue reporting, discrete network simulation, probabilistic machine learning risk scoring, and controlled self-healing workflows for campus digital and physical infrastructure.

---

## 1. Core Architecture & Technology Stack

LifeLine combines client-side machine learning inference, discrete-event network simulation, and human-in-the-loop governance:

### A. Dual Machine Learning & Decision Architecture
- **Probabilistic Risk Scoring (Neural Network)**: Pure JavaScript Feedforward Neural Network (`lifeline/js/nn-inference.js` + `lifeline/js/model/risk-model.js`).
  - TF-IDF unigram and bigram NLP feature extraction with L2 normalization.
  - One-hot category vectorization across 8 core campus infrastructure domains.
  - Multi-layer dense matrix multiplication with ReLU and Softmax activation outputting calibrated probability distributions (`low`, `medium`, `high`).
- **Deterministic Operational Safety Layer**: Transparent, explainable decision matrix (`lifeline/js/campus-state.js` & `lifeline/js/ai-engine.js`):
  $$\text{Operational Risk Score} = \text{Affected Students} + \text{Service Criticality} + \text{Safety Level} + \text{Report Surge Factor}$$
  - Mandatory immediate escalation for health/fire/toxic hazards regardless of text semantics.
  - Mission-critical elevation for campus-wide services (Web Portal / Admissions / LMS).

### B. OMNeT++ / INET Discrete Network Simulation & RCA
- Discrete-event campus network simulator (`simulation/engine/network_simulator.js`) modeling wireless hosts, 802.11ac APs, PoE distribution switches, core routing gateways, and internet uplinks.
- Multi-tier Root Cause Analysis (RCA) engine (`simulation/engine/rca_engine.js`) evaluating 6 diagnostic layers to pinpoint failure scope (Room-level AP vs Building Switch vs Campus Gateway).
- Safe two-phase recovery engine (`simulation/engine/recovery_engine.js`): Phase 1 sandbox dry-run rehearsal + Phase 2 live execution with measured MTTR metrics.
- State persistence across restarts with stochastic packet loss, jitter, and cascading failure propagation.

### C. Frontend & User Interface
- **Modern Operations Console (`admin.html`)**: React 18, Tailwind CSS, Framer Motion, and Lucide line icons featuring an interactive 4-stage Digital Self-Healing Lab, KPI metrics, real-time diagnostic terminal streaming, and departmental triage.
- **Student Helpdesk (`report.html`)**: Responsive problem reporting with automatic incident clustering, SLA tracking, and reactive cross-tab state synchronization.

### D. Backend & APIs (`server.js`)
- Dynamic health probes measuring real network latency and Node.js process metrics.
- Pre-flight assertion suite validating network topology, environment configurations, and memory/socket limits.
- Safe async I/O static file serving (`fs.promises.stat`) with structured error handling.

---

## 2. File Structure

```
LifeLine-AIops/
├── server.js                        Node.js HTTP Server & Dynamic AIOps API
├── test_api.js                      HTTP API Endpoints & Error Handling Verification
├── test_inference.js                Pure JS Neural Network Inference Test
├── test_simulation.js               OMNeT++ / INET Simulation & RCA Test Suite
├── test_suite.js                    Comprehensive End-to-End Test Suite
├── test_suite_v2.js                 Automated Integration & Security Suite
├── .env.example                     Environment Configuration Template
├── lifeline/
│   ├── index.html                   Modern Product Landing Page
│   ├── admin.html                   React Operations Console & Self-Healing Lab
│   ├── report.html                  Student Helpdesk & Live Incident Tracking
│   ├── login.html                   Student Login
│   ├── admin-login.html             Department Authority Login
│   ├── register.html                Student Registration
│   ├── css/style.css                Core Stylesheet
│   └── js/
│       ├── campus-state.js          Central State Engine, Correlation & Risk Scoring
│       ├── ai-engine.js             Hybrid Priority Engine & Playbook Generator
│       ├── nn-inference.js          Pure JS Neural Network Inference Engine
│       ├── model/risk-model.js      Trained Model Weights, TF-IDF Vocab & Biases
│       ├── supabase-client.js       Session Management & Role Boundaries
│       ├── report.js                Student Helpdesk Controller
│       └── admin.js                 Operations Console Controller
├── ml/
│   ├── train_nn.py                  Python Keras Model Training Script
│   ├── export_to_js.py              Model Weights Exporter to Pure JavaScript
│   └── models/                      Exported Model Files & Training Metrics
└── simulation/
    ├── index.js                     Simulation Module Entrypoint
    └── engine/
        ├── network_simulator.js     Discrete-Event Network Simulation Engine
        ├── rca_engine.js            Multi-Tier Network Root Cause Analysis
        ├── recovery_engine.js       Two-Phase Safe Recovery Engine
        └── incident_adapter.js      Simulation Telemetry to Incident Bridge
```

---

## 3. Running Locally

Start the local server:
```bash
node server.js
```

Open in your browser:
- 🏠 **Landing Page**: [http://localhost:5500/index.html](http://localhost:5500/index.html)
- 👨‍🎓 **Student Helpdesk**: [http://localhost:5500/report.html](http://localhost:5500/report.html)
- 🛡️ **Operations Console**: [http://localhost:5500/admin.html](http://localhost:5500/admin.html)

---

## 4. Running the Automated Test Suites

All components are covered by comprehensive automated test suites:

```bash
# 1. Test Neural Network Forward Pass & NLP Classification
node test_inference.js

# 2. Test OMNeT++ / INET Simulation, Multi-Tier RCA & Recovery
node test_simulation.js

# 3. Test Dynamic HTTP APIs, Real Latency Probes & Error Handling
node test_api.js

# 4. Run Full End-to-End Platform Verification
node test_suite.js

# 5. Run Automated Integration & Security Suite
node test_suite_v2.js
```
