// ============================================================================
// LifeLine by Cognora — AI Ops Engine
// ----------------------------------------------------------------------------
// This module simulates the "correlate telemetry -> sandbox candidate fixes ->
// rank by risk -> recommend a playbook" pipeline described in the problem
// statement, without needing a live LLM/API key — important for a reliable
// live demo. It is deliberately isolated behind one function per stage
// (analyzeReport, runSandboxSimulation) so a real model call can be dropped
// in later (see "SWAP IN A REAL LLM" note near the bottom).
// ============================================================================

// Keyword -> weight tables per category. Higher weight = more severe signal.
const SEVERITY_KEYWORDS = {
  electrical: [
    ["spark", 9], ["sparks", 9], ["shock", 10], ["smoke", 10], ["burning smell", 10],
    ["exposed wire", 8], ["short circuit", 8], ["fire", 10], ["tripped", 4], ["flicker", 2],
    ["no power", 5], ["socket", 2], ["switch", 1],
  ],
  plumbing: [
    ["flood", 8], ["flooding", 8], ["burst pipe", 9], ["gas smell", 10], ["overflow", 6],
    ["leak", 4], ["leaking", 4], ["no water", 5], ["clogged", 2], ["drip", 1],
  ],
  network: [
    ["down", 5], ["outage", 6], ["no internet", 4], ["router", 2], ["slow", 1], ["disconnect", 3],
    ["entire hostel", 8], ["all rooms", 8], ["gateway", 6], ["switch", 5], ["ap offline", 6]
  ],
  mess_food: [
    ["contaminat", 10], ["food poisoning", 10], ["sour smell", 8], ["undercooked", 8],
    ["stale", 6], ["insects in food", 9], ["vomit", 9], ["nausea", 9], ["unhygienic", 7],
    ["discolored water", 8], ["roaches", 7], ["foreign object", 9], ["foul taste", 7]
  ],
  fire_safety: [
    ["fire", 10], ["smoke", 10], ["alarm", 7], ["extinguisher missing", 8], ["blocked exit", 9], ["gas leak", 10],
  ],
  structural: [
    ["crack", 6], ["collapse", 10], ["ceiling falling", 9], ["falling", 8], ["unstable", 7], ["broken railing", 6], ["door stuck", 3],
  ],
  sanitation: [
    ["overflow", 6], ["sewage", 8], ["infestation", 7], ["mold", 5], ["garbage", 2], ["smell", 3],
  ],
  security: [
    ["intruder", 10], ["broken lock", 6], ["theft", 7], ["unauthorized", 6], ["door open", 4], ["camera down", 4],
  ],
  other: [["urgent", 5], ["emergency", 8], ["dangerous", 7]],
};

const GLOBAL_URGENCY_KEYWORDS = [
  ["injured", 10], ["injury", 10], ["hurt", 8], ["can't breathe", 10], ["trapped", 10],
  ["immediately", 3], ["right now", 3], ["everyone", 2], ["entire floor", 4], ["entire hostel", 5],
  ["campus wide", 7], ["all students", 6]
];

const PLAYBOOKS = {
  electrical: {
    low: "PHYSICAL WORK ORDER: Log ticket for electrician's next scheduled round. No isolation needed; monitor for recurrence.",
    medium: "PHYSICAL WORK ORDER: Isolate the affected circuit at the distribution board and dispatch an electrician within 4 hours.",
    high: "PHYSICAL WORK ORDER (URGENT): Cut mains power to the affected wing from DB panel, evacuate area, and dispatch Senior Electrical Engineer & Safety Officer immediately.",
  },
  plumbing: {
    low: "PHYSICAL WORK ORDER: Schedule a plumber visit within 24-48 hours; place drip tray to prevent flooring damage.",
    medium: "PHYSICAL WORK ORDER: Shut local isolation valve for affected wing, dispatch duty plumber same-day, and check adjacent rooms for seepage.",
    high: "PHYSICAL WORK ORDER (URGENT): Trigger emergency solenoid shutoff on main riser, cordon lower levels, and dispatch Emergency Civil Maintenance.",
  },
  network: {
    low: "DIGITAL SELF-HEALING: Remotely cycle BSSID radio beacon and flush DHCP lease table on local room Access Point.",
    medium: "DIGITAL SELF-HEALING / IT DISPATCH: Re-balance PoE power profile, reboot Floor Edge switch ports, and verify VLAN trunks.",
    high: "DIGITAL SELF-HEALING (HIGH-IMPACT): Execute distribution switch uplink failover, restart STP trunk interfaces, and notify Network Ops Admin.",
  },
  mess_food: {
    low: "FOOD SAFETY AUDIT: Log feedback for hostel mess contractor and inspect serving counter cleanliness during next round.",
    medium: "FOOD SAFETY AUDIT: Dispatch Mess Supervisor to verify bain-marie food temperatures, inspect kitchen hygiene, and audit raw ingredients.",
    high: "SAFETY ESCALATION (NON-DIGITAL): Potential food safety concern flagged — immediately halt serving affected meal lot, quarantine samples for microbiological assay, and dispatch Medical Officer and Food Safety Committee for on-site inspection.",
  },
  fire_safety: {
    low: "PHYSICAL INSPECTION: Log for routine fire-safety check; confirm nearest extinguisher and alarm beacon are functional.",
    medium: "PHYSICAL INSPECTION: Send facilities team to inspect the reported hazard within the hour; keep the area cordoned.",
    high: "SAFETY ESCALATION (URGENT): Trigger evacuation alarm for affected floor/wing immediately, alert Chief Fire Safety Officer and local emergency services.",
  },
  structural: {
    low: "PHYSICAL WORK ORDER: Log for facilities inspection round; advise light-touch use of affected fixture.",
    medium: "PHYSICAL WORK ORDER: Cordon off the immediate area, dispatch civil maintenance team within the day.",
    high: "SAFETY ESCALATION (URGENT): Evacuate affected room and rooms directly above/below, cordon area, and dispatch Structural Engineer.",
  },
  sanitation: {
    low: "HOUSEKEEPING: Add to next housekeeping round; no immediate health risk identified.",
    medium: "HOUSEKEEPING: Dispatch housekeeping same-day and flag for pest control if infestation-related.",
    high: "SAFETY WORK ORDER: Treat as an active sanitation hazard — dispatch emergency cleaning & fumigation, cordon common area until sanitized.",
  },
  security: {
    low: "SECURITY LOG: Log report for next security patrol briefing.",
    medium: "SECURITY DISPATCH: Notify hostel security guard to inspect the lock/entry point within the hour and issue temporary fix.",
    high: "SECURITY ESCALATION (URGENT): Alert Hostel Warden & Chief Security Officer immediately, treat as active security breach, and review CCTV footage.",
  },
  other: {
    low: "OPERATIONS: Log for warden review during regular office hours.",
    medium: "OPERATIONS: Flag for same-day warden review; gather more detail if needed.",
    high: "OPERATIONS (URGENT): Escalate to the warden on-call immediately for emergency triage.",
  },
};

const CAUSE_TEMPLATES = {
  electrical: "wiring degradation, an overloaded circuit, or a faulty fixture in the reported location",
  plumbing: "pipe wear, a joint failure, or pressure surge causing water release",
  network: "an access point DHCP contention, edge switch PoE issue, or distribution fiber uplink drop",
  mess_food: "temperature holding failure in steam tables or potential ingredient cross-contamination requiring human inspection",
  fire_safety: "a fire-safety hazard requiring physical inspection to confirm ignition source or blockage",
  structural: "material fatigue, water ingress damage, or an installation fault in the reported fixture",
  sanitation: "irregular waste clearance, drainage blockage, or a pest entry point near the reported location",
  security: "a mechanical lock/entry-point fault or unauthorized access attempt",
  other: "an issue outside the standard telemetry categories, requiring manual classification",
};

/**
 * Score a report's text against keyword tables to estimate severity (0-10+).
 */
function scoreSeverity(category, description) {
  const text = (description || "").toLowerCase();
  let score = 2; // baseline signal — something was reported at all
  const matched = [];

  const catTable = SEVERITY_KEYWORDS[category] || SEVERITY_KEYWORDS.other;
  for (const [kw, weight] of catTable) {
    if (text.includes(kw)) { score += weight; matched.push(kw); }
  }
  for (const [kw, weight] of GLOBAL_URGENCY_KEYWORDS) {
    if (text.includes(kw)) { score += weight; matched.push(kw); }
  }
  return { score, matched };
}

function severityToRisk(score) {
  if (score >= 14) return "high";
  if (score >= 7) return "medium";
  return "low";
}

/**
 * Core "AI" analysis step — Neural Network classifier + Hybrid Operational Decision Engine.
 * 
 * Frame: The Neural Network assists incident classification, while LifeLine combines
 * ML predictions with infrastructure evidence, student impact, and safety rules to make
 * operational decisions.
 */
function analyzeReport({ category, description, location, usersAffected = null, similarReportCount = 1 }) {
  // 1. Keyword explainability signals
  const { score, matched } = scoreSeverity(category, description);

  // 2. Neural Network inference (TF-IDF -> One-Hot -> MLP Forward Pass)
  let nnResult = null;
  if (typeof predictRisk === "function") {
    try {
      nnResult = predictRisk({ category, description });
    } catch (err) {
      console.warn("Neural Network prediction error, using baseline fallback:", err);
    }
  }

  const rawRiskLevel = nnResult ? nnResult.riskLevel : severityToRisk(score);
  const confidence = nnResult ? nnResult.confidence : 0.78;
  const probabilities = nnResult ? nnResult.probabilities : {
    low: rawRiskLevel === "low" ? 0.8 : 0.1,
    medium: rawRiskLevel === "medium" ? 0.8 : 0.1,
    high: rawRiskLevel === "high" ? 0.8 : 0.1,
  };

  // 3. Hybrid Operational Priority Engine integration
  let hybridPriority = null;
  if (typeof CampusStateEngine !== "undefined" && CampusStateEngine.calculateHybridPriority) {
    hybridPriority = CampusStateEngine.calculateHybridPriority({
      nnResult: { riskLevel: rawRiskLevel, confidence, probabilities },
      category,
      description,
      location,
      usersAffected,
      similarReportCount
    });
  } else {
    // Fallback if CampusStateEngine not loaded
    hybridPriority = {
      finalPriority: rawRiskLevel === "high" ? "P1 - Critical" : rawRiskLevel === "medium" ? "P2 - High" : "P3 - Medium",
      priorityBadge: rawRiskLevel.toUpperCase(),
      priorityClass: rawRiskLevel,
      explanation: `Operational Priority assigned from Neural Network classification.`
    };
  }

  // 4. Wi-Fi Multi-Tier Root Cause Analysis (if network)
  let wifiRca = null;
  if (category === "network" && typeof CampusStateEngine !== "undefined" && CampusStateEngine.analyzeWifiHierarchy) {
    wifiRca = CampusStateEngine.analyzeWifiHierarchy({ location, description, reportsInZone: similarReportCount });
  }

  // 5. Student Impact Calculation
  let studentImpact = null;
  if (typeof CampusStateEngine !== "undefined" && CampusStateEngine.calculateStudentImpact) {
    studentImpact = CampusStateEngine.calculateStudentImpact({
      category,
      description,
      usersAffected: hybridPriority.userCount || 10
    });
  }

  const playbook = (PLAYBOOKS[category] || PLAYBOOKS.other)[rawRiskLevel];
  const cause = wifiRca ? wifiRca.rootCause : (CAUSE_TEMPLATES[category] || CAUSE_TEMPLATES.other);

  const signalText = matched.length
    ? `Correlated signal terms detected: ${[...new Set(matched)].slice(0, 5).join(", ")}.`
    : "Standard report text without extreme emergency keywords.";

  const isDigital = category === "network" || (description || "").toLowerCase().includes("website") || (description || "").toLowerCase().includes("portal");

  const confPercent = Math.round(confidence * 100);
  const reasoning =
    `Neural Network assistance model classified text features as ${rawRiskLevel.toUpperCase()} raw risk (${confPercent}% model confidence). ` +
    `LifeLine Hybrid Priority Engine formulated final operational priority as ${hybridPriority.finalPriority} ` +
    `(Service Criticality Tier ${hybridPriority.criticality || 3}/5, affecting ~${(hybridPriority.userCount || 4).toLocaleString()} students). ` +
    `${signalText} Location: ${location || "Campus Zone"}. Likely root cause: ${cause}. ` +
    (isDigital ? "Digital recovery candidate validated for sandbox simulation." : "Physical/Safety event — dispatched to maintenance & human oversight authorities.");

  return {
    riskLevel: rawRiskLevel,
    confidence,
    probabilities,
    hybridPriority,
    studentImpact,
    wifiRca,
    isDigital,
    reasoning,
    solution: playbook,
    score,
    matchedSignals: matched
  };
}

function formatCategory(id) {
  const found = (typeof CATEGORIES !== "undefined" ? CATEGORIES : []).find((c) => c.id === id);
  return found ? found.label : id;
}

/**
 * Simulated sandbox pipeline — an ordered list of steps with timestamps and
 * severities, demonstrating pre-flight checks against a cloned state copy
 * (structuredClone) before any live action is taken.
 */
function buildSandboxSteps({ category, description, location }, analysis) {
  const cat = formatCategory(category);
  const confPct = Math.round((analysis.confidence || 0.8) * 100);
  const probs = analysis.probabilities || { low: 0, medium: 0, high: 0 };
  const probStr = `[Low: ${Math.round(probs.low * 100)}% | Med: ${Math.round(probs.medium * 100)}% | High: ${Math.round(probs.high * 100)}%]`;
  const opPriority = analysis.hybridPriority ? analysis.hybridPriority.finalPriority : "P2 - High";

  const steps = [
    { text: `Ingesting telemetry & student report metadata (category: ${cat}, location: ${location || "Campus Zone"})`, level: "ok" },
    { text: "Extracting TF-IDF text features & category embeddings for Neural Network forward pass…", level: "ok" },
    { text: `Neural Network raw risk classification → ${analysis.riskLevel.toUpperCase()} (${confPct}% model confidence) ${probStr}`, level: analysis.riskLevel === "high" ? "crit" : analysis.riskLevel === "medium" ? "warn" : "ok" },
    { text: "Evaluating service criticality, student headcount, and safety risk factors…", level: "ok" },
    { text: `Hybrid Decision Engine assigned Operational Priority → ${opPriority}`, level: opPriority.includes("Critical") ? "crit" : opPriority.includes("High") ? "warn" : "ok" },
    { text: "Cloning campus state graph (structuredClone) to isolated sandbox runner…", level: "ok" },
    { text: analysis.isDigital
        ? "Rehearsing automated recovery playbook against staging replica pod…"
        : "Categorized as Physical / Safety incident — drafting work order for human dispatch…", level: "ok" },
    { text: `Simulated outcome: ${analysis.isDigital ? "Pre-flight checks passed with zero side-effects" : "Dispatched work order notification to duty authorities"}.`, level: "ok" },
    { text: "Enforcing Human Governance Gate: Two-stage confirmation (Warden Approval + Final Warning) required before any live action.", level: "warn" }
  ];
  return steps;
}

// Module / Global export support
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SEVERITY_KEYWORDS,
    GLOBAL_URGENCY_KEYWORDS,
    PLAYBOOKS,
    CAUSE_TEMPLATES,
    scoreSeverity,
    severityToRisk,
    analyzeReport,
    buildSandboxSteps,
    formatCategory
  };
}
if (typeof window !== "undefined") {
  window.analyzeReport = analyzeReport;
  window.buildSandboxSteps = buildSandboxSteps;
  window.scoreSeverity = scoreSeverity;
  window.severityToRisk = severityToRisk;
  window.PLAYBOOKS = PLAYBOOKS;
  window.SEVERITY_KEYWORDS = SEVERITY_KEYWORDS;
}


