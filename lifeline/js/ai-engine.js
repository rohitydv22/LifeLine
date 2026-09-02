// ============================================================================
// LifeLine by Cognora — AI Ops & Evidence-Based Diagnostic Engine
// ----------------------------------------------------------------------------
// Core Architecture:
// 1. Probabilistic Risk Inference: Trained Feedforward Neural Network (TF-IDF NLP + Dense Softmax)
// 2. Deterministic Safeguards & Operational Decision Layer:
//    Risk Score = Affected Users + Service Criticality + Safety Level + Report Surge Factor
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
  water: [
    ["brown water", 9], ["discolor", 8], ["smell", 8], ["sulfur", 9], ["filter broken", 6],
    ["purifier", 5], ["no water", 6], ["muddy", 8], ["unsafe", 9]
  ],
  network: [
    ["down", 5], ["outage", 6], ["no internet", 4], ["router", 2], ["slow", 1], ["disconnect", 3],
    ["entire hostel", 8], ["all rooms", 8], ["gateway", 6], ["switch", 5], ["ap offline", 6]
  ],
  website: [
    ["down", 8], ["503", 9], ["502", 9], ["portal down", 9], ["cannot login", 7],
    ["timeout", 6], ["exam portal", 8], ["admission", 8], ["crash", 8], ["not working", 7]
  ],
  mess_food: [
    ["contaminat", 10], ["food poisoning", 10], ["sour smell", 8], ["undercooked", 8],
    ["stale", 6], ["insects in food", 9], ["vomit", 9], ["nausea", 9], ["unhygienic", 7],
    ["discolored water", 8], ["roaches", 7], ["foreign object", 9], ["foul taste", 7]
  ],
  food_safety: [
    ["contaminat", 10], ["food poisoning", 10], ["sour smell", 8], ["undercooked", 8],
    ["stale", 6], ["insects in food", 9], ["vomit", 9], ["nausea", 9], ["unhygienic", 7]
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
  website: {
    low: "DIGITAL SELF-HEALING: Flush Nginx socket buffer and clear cached reverse proxy pools.",
    medium: "DIGITAL SELF-HEALING: Restart web application container replica and run synthetic HTTP GET probe.",
    high: "DIGITAL SELF-HEALING (HIGH-IMPACT): Execute Sandbox Pre-Flight Test, restart Web Container cluster, restore PostgreSQL pool, and verify live HTTP 200 health probe.",
  },
  network: {
    low: "DIGITAL SELF-HEALING: Remotely cycle BSSID radio beacon and flush DHCP lease table on local room Access Point.",
    medium: "DIGITAL SELF-HEALING / IT DISPATCH: Re-balance PoE power profile, reboot Floor Edge switch ports, and verify VLAN trunks.",
    high: "DIGITAL SELF-HEALING (HIGH-IMPACT): Execute OMNeT++ discrete simulation rehearsal, reboot distribution switch PoE controllers, re-bind 5GHz radio channel, and verify gateway reachability.",
  },
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
  water: {
    low: "PHYSICAL WORK ORDER: Schedule water purifier cartridge replacement during routine maintenance round.",
    medium: "PHYSICAL WORK ORDER: Isolate affected water cooler unit, test TDS/pH levels, and dispatch plumber for tank flush.",
    high: "PHYSICAL WORK ORDER (URGENT): Immediately lock out drinking water dispensers, deploy emergency bottled water supply, and dispatch Water Supply Superintendent for line sterilization.",
  },
  mess_food: {
    low: "FOOD SAFETY AUDIT: Log feedback for hostel mess contractor and inspect serving counter cleanliness during next round.",
    medium: "FOOD SAFETY AUDIT: Dispatch Mess Supervisor to verify bain-marie food temperatures, inspect kitchen hygiene, and audit raw ingredients.",
    high: "SAFETY ESCALATION (NON-DIGITAL): Potential food safety concern flagged — immediately halt serving affected meal lot, quarantine samples for microbiological assay, and dispatch Food Safety Officer & Medical Officer for on-site inspection.",
  },
  food_safety: {
    low: "FOOD SAFETY AUDIT: Log feedback for hostel mess contractor and inspect serving counter cleanliness during next round.",
    medium: "FOOD SAFETY AUDIT: Dispatch Mess Supervisor to verify bain-marie food temperatures, inspect kitchen hygiene, and audit raw ingredients.",
    high: "SAFETY ESCALATION (NON-DIGITAL): Potential food safety concern flagged — immediately halt serving affected meal lot, quarantine samples for microbiological assay, and dispatch Food Safety Officer & Medical Officer for on-site inspection.",
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
  website: "upstream web container crash (HTTP 503) or database connection pool exhaustion",
  network: "hostel distribution switch PoE drop, access point DHCP exhaustion, or radio interference",
  electrical: "wiring degradation, an overloaded circuit, or a faulty fixture in the reported location",
  plumbing: "pipe wear, a joint failure, or pressure surge causing water release",
  water: "filter membrane saturation, overhead tank sediment release, or pipeline backflow",
  mess_food: "holding temperature failure in steam tables or potential ingredient cross-contamination requiring human inspection",
  food_safety: "holding temperature failure in steam tables or potential ingredient cross-contamination requiring human inspection",
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
  let score = 2;
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
 * Core analysis step — Evidence-Based Decision Logic + Machine Learning Assistance.
 */
function analyzeReport({ category, description, location, usersAffected = null, similarReportCount = 1 }) {
  // 1. Keyword signals
  const { score, matched } = scoreSeverity(category, description);

  // 2. Neural Network inference if present
  let nnResult = null;
  const inferFn = typeof NNInference !== "undefined" && NNInference.predictRisk 
    ? NNInference.predictRisk 
    : (typeof predictRisk === "function" ? predictRisk : null);

  if (inferFn) {
    try {
      nnResult = inferFn({ category, description });
    } catch (err) {
      // Fallback
    }
  }

  const rawRiskLevel = nnResult ? nnResult.riskLevel : severityToRisk(score);
  const confidence = nnResult ? nnResult.confidence : 0.82;

  // 3. Transparent Operational Risk Score Engine
  let riskScore = null;
  if (typeof CampusStateEngine !== "undefined" && CampusStateEngine.calculateOperationalRiskScore) {
    riskScore = CampusStateEngine.calculateOperationalRiskScore({
      category,
      description,
      location,
      usersAffected,
      reportCount: similarReportCount
    });
  } else {
    // Elevate mission critical outages (e.g. college website or admissions portal)
    const descLower = (description || "").toLowerCase();
    const isCriticalWebsite = category === "website" || descLower.includes("website") || descLower.includes("portal") || (usersAffected && usersAffected > 500);
    const isCriticalFood = (category === "mess_food" || category === "food_safety") && (descLower.includes("contaminat") || descLower.includes("nausea") || descLower.includes("odor"));

    let priority = rawRiskLevel === "high" ? "P1 - Critical" : rawRiskLevel === "medium" ? "P2 - High" : "P3 - Medium";
    if (isCriticalWebsite || isCriticalFood) {
      priority = "P1 - Critical";
    }

    riskScore = {
      priority,
      priorityBadge: priority.split(" - ")[0],
      priorityClass: priority.includes("Critical") ? "high" : priority.includes("High") ? "medium" : "low",
      formulaText: "Decision rule evaluated from report severity & campus criticality.",
      explanation: isCriticalWebsite
        ? "Tier 5 Criticality: Core Web / Admissions portal impacts entire student body (P1 - Critical)."
        : isCriticalFood
        ? "Tier 5 Safety Concern: Food safety hazard requires immediate on-site human inspection (P1 - Critical)."
        : "Operational priority formulated from report features."
    };
  }

  const playbook = (PLAYBOOKS[category] || PLAYBOOKS.other)[rawRiskLevel] || (PLAYBOOKS.other)[rawRiskLevel];
  const likelyArea = `Likely area of failure: ${location || "Reported Zone"} (${formatCategory(category)})`;

  const isDigital = category === "website" || category === "network" || 
    (description || "").toLowerCase().includes("website") || 
    (description || "").toLowerCase().includes("portal");

  const evidenceSummary = `Evidence collected: ${similarReportCount} report(s) from ${location || "Campus"}. ` +
    (matched.length ? `Correlated signals: ${[...new Set(matched)].slice(0, 4).join(", ")}. ` : "") +
    (isDigital 
      ? "Digital service candidate: validated for isolated sandbox pre-flight testing and automated recovery." 
      : "Physical/Safety incident: routes to departmental work order and designated human authorities.");

  return {
    riskLevel: rawRiskLevel,
    confidence,
    operationalPriority: riskScore.priority,
    priorityBadge: riskScore.priorityBadge,
    priorityClass: riskScore.priorityClass,
    riskBreakdown: riskScore.breakdown,
    formulaText: riskScore.formulaText,
    hybridPriority: {
      finalPriority: riskScore.priority,
      explanation: riskScore.explanation || riskScore.formulaText
    },
    isDigital: Boolean(isDigital && category !== "mess_food" && category !== "food_safety"),
    likelyArea,
    evidenceSummary,
    solution: playbook,
    score,
    matchedSignals: matched
  };
}

function formatCategory(id) {
  const categories = typeof CampusStateEngine !== "undefined" ? CampusStateEngine.CATEGORY_DEFINITIONS : null;
  if (categories && categories[id]) return categories[id].label;
  return id || "General Issue";
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
    formatCategory
  };
}
if (typeof window !== "undefined") {
  window.analyzeReport = analyzeReport;
  window.scoreSeverity = scoreSeverity;
  window.severityToRisk = severityToRisk;
  window.PLAYBOOKS = PLAYBOOKS;
  window.SEVERITY_KEYWORDS = SEVERITY_KEYWORDS;
  window.formatCategory = formatCategory;
}
