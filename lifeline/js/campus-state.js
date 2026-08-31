/**
 * LifeLine by Cognora — Campus Infrastructure State Engine & AIOps Orchestrator
 * 
 * Manages:
 * 1. Central Campus Infrastructure State Object (mutated by faults and self-healing)
 * 2. 13 Realistic Fault Scenarios (Digital, Physical, Safety)
 * 3. Hybrid Operational Priority Engine (NN + 7 contextual factors)
 * 4. Wi-Fi Multi-Tier Root Cause Analysis (AP -> Floor SW -> Hostel SW -> Gateway)
 * 5. Multi-Report Correlation & Pattern Detection
 * 6. Student Impact Scoring Engine (Headcount, academic critical path, safety)
 * 7. Real-Time MTTD (Mean Time to Detect) & MTTR (Mean Time to Recover) Tracker
 * 8. Physical & Safety Incident Work Order Dispatcher
 * 9. Photo Evidence Store
 * 10. Complete System Audit Trail with Cross-Tab LocalStorage Synchronization
 */

(function (global) {
  "use strict";

  const STORAGE_KEY_STATE = "lifeline_campus_state_v2";
  const STORAGE_KEY_INCIDENTS = "lifeline_incidents_v2";
  const STORAGE_KEY_AUDIT = "lifeline_audit_trail_v2";
  const STORAGE_KEY_METRICS = "lifeline_metrics_v2";
  const STORAGE_KEY_EVIDENCE = "lifeline_evidence_v2";
  const STORAGE_KEY_WORK_ORDERS = "lifeline_work_orders_v2";
  const STORAGE_KEY_DISPATCH_EMAILS = "lifeline_dispatched_emails_v2";

  // Official Authority Routing Matrix for Automated Physical Dispatch
  const AUTHORITY_ROUTING_DIRECTORY = {
    electrical: {
      department: "Campus Electrical Engineering & Power Grid",
      officer: "Er. Ramesh K. Sharma",
      designation: "Chief Electrical Engineer",
      email: "electrical.ops@lifeline.campus",
      phoneExt: "Desk Ext: 401 | Control: +91 98765-43210",
      sla: "15-30 mins"
    },
    plumbing: {
      department: "Facilities & Civil Water Supply Works",
      officer: "Er. S. Murthy",
      designation: "Water Supply Superintendent",
      email: "civil.plumbing@lifeline.campus",
      phoneExt: "Desk Ext: 402 | Control: +91 98765-43211",
      sla: "30-45 mins"
    },
    mess_food: {
      department: "Campus Food Safety & Dining Hygiene Cell",
      officer: "Dr. Ananya Sen",
      designation: "Food Safety Officer & Chief Dietitian",
      email: "foodsafety.warden@lifeline.campus",
      phoneExt: "Desk Ext: 403 | Control: +91 98765-43212",
      sla: "Immediate Quarantine (<15 mins)"
    },
    fire_safety: {
      department: "Emergency Disaster Management & Fire Cell",
      officer: "Capt. V. K. Nair",
      designation: "Chief Fire & Safety Marshall",
      email: "fire.safety@lifeline.campus",
      phoneExt: "Emergency Ext: 101 | Hotline: +91 98765-43213",
      sla: "Immediate Dispatch (<5 mins)"
    },
    structural: {
      department: "Estate Infrastructure & Civil Works",
      officer: "Er. Alok Verma",
      designation: "Senior Structural Engineer",
      email: "civil.infra@lifeline.campus",
      phoneExt: "Desk Ext: 406 | Control: +91 98765-43214",
      sla: "1-2 Hours"
    },
    sanitation: {
      department: "Hostel Estate & Public Health Sanitation",
      officer: "Mrs. Sunita Devi",
      designation: "Sanitation Supervisor",
      email: "sanitation.lead@lifeline.campus",
      phoneExt: "Desk Ext: 405 | Control: +91 98765-43215",
      sla: "45 mins"
    },
    security: {
      department: "Chief Proctor & Campus Security Operations",
      officer: "Col. R. S. Rathore",
      designation: "Chief Security Officer",
      email: "security.dispatch@lifeline.campus",
      phoneExt: "Gate 1 Ext: 100 | Patrol: +91 98765-43216",
      sla: "Immediate (<5 mins)"
    },
    other: {
      department: "Hostel Administration & Resident Welfare",
      officer: "Hostel Chief Warden",
      designation: "Chief Hostel Warden",
      email: "warden.general@lifeline.campus",
      phoneExt: "Desk Ext: 400",
      sla: "1-2 Hours"
    }
  };

  // Initial Baseline Campus State
  const INITIAL_CAMPUS_STATE = {
    website: "healthy",        // healthy | degraded | down | recovering
    studentPortal: "healthy",  // healthy | degraded | down | recovering
    lms: "healthy",            // healthy | degraded | down | recovering
    network: "healthy",        // healthy | degraded | down | recovering
    hostelWifi: {
      hostelA: "healthy",      // healthy | degraded | down | recovering
      hostelB: "healthy"       // healthy | degraded | down | recovering
    },
    servers: "healthy",        // healthy | degraded | down | recovering
    database: "healthy",       // healthy | degraded | down | recovering
    waterSystems: "healthy",   // healthy | degraded | down | recovering
    messFacilities: "healthy", // healthy | degraded | down | recovering
    lastUpdated: new Date().toISOString()
  };

  // Service Metadata & Criticality Definitions (1 to 5)
  const SERVICE_METADATA = {
    website: { name: "College Main Website", criticality: 5, category: "digital", defaultUsers: 6500, scope: "campus", icon: "🌐" },
    studentPortal: { name: "Student ERP / Portal", criticality: 5, category: "digital", defaultUsers: 4800, scope: "campus", icon: "🎓" },
    lms: { name: "Learning Management System (LMS)", criticality: 4, category: "digital", defaultUsers: 3800, scope: "campus", icon: "📚" },
    network: { name: "Campus Core Network & Gateway", criticality: 5, category: "digital", defaultUsers: 7500, scope: "campus", icon: "📡" },
    hostelWifi_hostelA: { name: "Hostel BH-1 Wi-Fi Mesh", criticality: 3, category: "digital", defaultUsers: 450, scope: "hostel", icon: "📶" },
    hostelWifi_hostelB: { name: "Hostel BH-2 Wi-Fi Mesh", criticality: 3, category: "digital", defaultUsers: 420, scope: "hostel", icon: "📶" },
    servers: { name: "Primary Server Infrastructure", criticality: 5, category: "digital", defaultUsers: 6000, scope: "campus", icon: "🖥️" },
    database: { name: "Core PostgreSQL Cluster", criticality: 5, category: "digital", defaultUsers: 5500, scope: "campus", icon: "🗄️" },
    waterSystems: { name: "Hostel Water Purifiers & Supply", criticality: 5, category: "physical", defaultUsers: 850, scope: "hostel", icon: "💧" },
    messFacilities: { name: "Hostel Dining & Mess Hall", criticality: 5, category: "safety", defaultUsers: 1200, scope: "hostel", icon: "🍱" }
  };

  // 13 Fault Injection Scenarios
  const FAULT_SCENARIOS = {
    // DIGITAL (7)
    website_down: {
      id: "website_down",
      title: "College Website Down",
      category: "digital",
      target: "website",
      severity: "critical",
      serviceCriticality: 5,
      usersAffected: 6500,
      scope: "campus",
      description: "HTTP 502 Bad Gateway — Nginx reverse proxy cannot reach upstream application server cluster.",
      symptoms: ["Homepage inaccessible", "Public admissions portal timed out", "External health check failure"],
      recommendedAction: "Auto-roll back recent container deployment, recycle Nginx worker pools, and spin up failover replica pod.",
      recoveryTimeSec: 6,
      rootCause: "Memory leak in recent web frontend release causing OOM kill on upstream node."
    },
    portal_down: {
      id: "portal_down",
      title: "Student Portal Down",
      category: "digital",
      target: "studentPortal",
      severity: "high",
      serviceCriticality: 5,
      usersAffected: 4800,
      scope: "campus",
      description: "Student ERP login service crashing with token authentication service timeout (JWT validator unresponsive).",
      symptoms: ["Exam admit card download blocked", "Fee payment portal inaccessible", "Auth service 504 error"],
      recommendedAction: "Restart OAuth2 authentication container, clear Redis session cache, and re-bind database pool.",
      recoveryTimeSec: 5,
      rootCause: "Deadlocked auth token validation thread pool during peak registration traffic."
    },
    lms_failure: {
      id: "lms_failure",
      title: "LMS Platform Failure",
      category: "digital",
      target: "lms",
      severity: "high",
      serviceCriticality: 4,
      usersAffected: 3800,
      scope: "campus",
      description: "Moodle LMS submission portal dropping HTTP connections during active assignment submission window.",
      symptoms: ["Assignment upload timeout", "Course page rendering blank", "Database connection pool exhausted"],
      recommendedAction: "Scale connection pool limit from 100 to 400, kill idle zombie queries, and flush cache.",
      recoveryTimeSec: 5,
      rootCause: "PostgreSQL max connection limit reached due to unclosed assignment upload sockets."
    },
    server_overload: {
      id: "server_overload",
      title: "Server Cluster Overload",
      category: "digital",
      target: "servers",
      severity: "high",
      serviceCriticality: 5,
      usersAffected: 6000,
      scope: "campus",
      description: "Cluster CPU utilization spiked to 99.4%, load average 38.2 on 8-core host node.",
      symptoms: ["Extreme system latency (>4500ms)", "SSH connection drops", "Docker daemon throttled"],
      recommendedAction: "Isolate rogue batch analytics process, enable Kubernetes HPA auto-scaling to +3 worker nodes.",
      recoveryTimeSec: 7,
      rootCause: "Unoptimized cronjob running recursive DB index scan during peak lecture hours."
    },
    database_failure: {
      id: "database_failure",
      title: "Database Cluster Failure",
      category: "digital",
      target: "database",
      severity: "critical",
      serviceCriticality: 5,
      usersAffected: 5500,
      scope: "campus",
      description: "PostgreSQL Primary node disk I/O saturated; replica replication lag exceeded 180 seconds with write deadlocks.",
      symptoms: ["Write queries rejecting with lock timeout", "Read replicas serving stale data", "Transaction rollback cascade"],
      recommendedAction: "Promote hot-standby synchronous replica to Primary, drain stalled locks, and perform WAL recovery.",
      recoveryTimeSec: 8,
      rootCause: "Corrupted WAL segment on primary NVMe volume causing synchronous replication block."
    },
    wifi_single_room: {
      id: "wifi_single_room",
      title: "Wi-Fi Failure in One Room",
      category: "digital",
      target: "hostelWifi_hostelA",
      severity: "low",
      serviceCriticality: 2,
      usersAffected: 4,
      scope: "room",
      description: "Hostel BH-1 Room 204: Wi-Fi device failing to obtain IP address from DHCP pool on AP-BH1-2F-04.",
      symptoms: ["'Obtaining IP address' loop", "Signal strength -48dBm (Strong)", "No Internet connectivity"],
      recommendedAction: "Flushed DHCP lease pool for AP-BH1-2F-04 and cycled radio channel from Ch 6 to Ch 11.",
      recoveryTimeSec: 4,
      rootCause: "DHCP lease table exhaustion on local access point subnet (/28 mask)."
    },
    wifi_entire_hostel: {
      id: "wifi_entire_hostel",
      title: "Wi-Fi Failure in Entire Hostel",
      category: "digital",
      target: "hostelWifi_hostelA",
      severity: "high",
      serviceCriticality: 4,
      usersAffected: 450,
      scope: "hostel",
      description: "All 18 access points in Hostel BH-1 disconnected simultaneously from Central Wireless Controller.",
      symptoms: ["Zero SSIDs broadcasted across all 4 floors", "Hostel Distribution Switch SW-BH1-DIST offline", "Telemetry heartbeat lost"],
      recommendedAction: "Reboot distribution switch SW-BH1-DIST via PoE controller, restart VLAN trunking, and re-negotiate fiber uplink.",
      recoveryTimeSec: 6,
      rootCause: "Distribution switch power supply trip followed by STP (Spanning Tree Protocol) topology loop."
    },

    // PHYSICAL (3)
    plumbing_leak: {
      id: "plumbing_leak",
      title: "Plumbing Riser Burst Leak",
      category: "physical",
      target: "waterSystems",
      severity: "high",
      serviceCriticality: 5,
      usersAffected: 240,
      scope: "hostel",
      description: "Main 2-inch PVC water riser cracked on BH-2 2nd floor, water cascading down staircase into corridor.",
      symptoms: ["Active flooding in corridor", "Water seeping into room 212/214 electrical conduits", "Low water pressure on 3rd floor"],
      recommendedAction: "PHYSICAL WORK ORDER: Trigger emergency solenoid shutoff valve B2-V04, dispatch Chief Plumber & Civil Maintenance, notify Electrician for floor safety.",
      recoveryTimeSec: 0,
      rootCause: "Pressure hammer surge following overnight pump cycling."
    },
    water_filter_failure: {
      id: "water_filter_failure",
      title: "Water Purifier & Filter Failure",
      category: "physical",
      target: "waterSystems",
      severity: "high",
      serviceCriticality: 5,
      usersAffected: 450,
      scope: "hostel",
      description: "Central RO & UV purification plant in BH-1 dispensing turbid water with error code E04 (UV Lamp failure & membrane breach).",
      symptoms: ["Drinking water dispensers offline", "Turbidity > 8.5 NTU", "Audible alarm on RO controller panel"],
      recommendedAction: "PHYSICAL WORK ORDER: Cordon off purifier dispensers, dispatch water contractor for UV tube replacement & 0.01 micron cartridge flush, deploy 20L emergency water jars.",
      recoveryTimeSec: 0,
      rootCause: "UV ballast electrical burnout allowing unfiltered pre-tank sediment bypass."
    },
    electrical_spark: {
      id: "electrical_spark",
      title: "Electrical Distribution Board Sparking",
      category: "physical",
      target: "servers",
      severity: "critical",
      serviceCriticality: 5,
      usersAffected: 420,
      scope: "hostel",
      description: "Continuous arcing and burning ozone odor from Main Sub-Distribution Panel DB-3 on Ground Floor.",
      symptoms: ["Visible sparks behind metal panel", "Acrid plastic smoke detected", "Hallway emergency lights flickering"],
      recommendedAction: "PHYSICAL WORK ORDER: Cut incoming 3-phase mains breaker, evacuate adjacent corridor, dispatch certified High-Voltage electrician and safety officer.",
      recoveryTimeSec: 0,
      rootCause: "Loose busbar terminal clamp creating high contact resistance under heavy air-conditioning load."
    },

    // SAFETY (3)
    food_safety_concern: {
      id: "food_safety_concern",
      title: "Mess Food Quality & Safety Concern",
      category: "safety",
      target: "messFacilities",
      severity: "high",
      serviceCriticality: 5,
      usersAffected: 680,
      scope: "hostel",
      description: "Multiple students reported sour odor, improper cooking temperature, and undercooked poultry/paneer in Tuesday Dinner batch.",
      symptoms: ["Food served below 55°C holding temperature", "Off-flavor reported by 12+ students", "Dining hall supervisor alerted"],
      recommendedAction: "SAFETY ESCALATION: Halt current food distribution immediately, quarantine batch samples for microbiological testing, dispatch Food Safety Officer, instruct caterer to prepare fresh backup menu.",
      recoveryTimeSec: 0,
      rootCause: "Bain-marie steam table heating element failure during dinner service."
    },
    suspected_contamination: {
      id: "suspected_contamination",
      title: "Suspected Food Contamination",
      category: "safety",
      target: "messFacilities",
      severity: "critical",
      serviceCriticality: 5,
      usersAffected: 1200,
      scope: "hostel",
      description: "Foreign contaminant / chemical odor reported in central dal preparation tank; 4 students reported mild nausea to dispensary.",
      symptoms: ["Unidentified residue in food vessel", "Nausea reported to medical center", "Urgent dining hall stoppage"],
      recommendedAction: "SAFETY ESCALATION: Immediate lockdown of mess kitchen, seal grain & spice storage lots, dispatch Medical Officer & Food Safety Inspector, trigger emergency dispensary readiness.",
      recoveryTimeSec: 0,
      rootCause: "Suspected cleaning chemical detergent rinse residue in commercial cauldron."
    },
    unsafe_drinking_water: {
      id: "unsafe_drinking_water",
      title: "Unsafe / Discolored Drinking Water",
      category: "safety",
      target: "waterSystems",
      severity: "critical",
      serviceCriticality: 5,
      usersAffected: 900,
      scope: "hostel",
      description: "Rusty, brown water discharging from BH-2 ground floor water coolers with chemical sulfur smell.",
      symptoms: ["High total dissolved solids (TDS > 1200)", "Metallic sulfur taste and odor", "Students unable to drink water"],
      recommendedAction: "SAFETY ESCALATION: Immediate lock out on all water coolers, deploy 50x 20-litre sealed bottled water dispensers, dispatch public health testing team for chlorine/bacterial assay.",
      recoveryTimeSec: 0,
      rootCause: "Rupture in overhead tank liner mixing treated water with rusty fire sprinkler line backflow."
    }
  };

  // State Loader & Persistence
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Could not load campus state from storage:", e);
    }
    return structuredClone(INITIAL_CAMPUS_STATE);
  }

  function saveState(state) {
    try {
      state.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
      broadcastEvent("state_changed", state);
    } catch (e) {
      console.warn("Could not save campus state to storage:", e);
    }
  }

  function getInitialIncidents() {
    return [
      {
        id: "INC-2041",
        scenarioId: "website_down",
        title: "College Website Down & 502 Bad Gateway",
        category: "digital",
        target: "website",
        severity: "critical",
        operationalPriority: "P1 - Critical",
        priorityBadge: "CRITICAL",
        status: "SANDBOXED",
        description: "College main website and student admission portal returning 502 Bad Gateway errors across campus network.",
        symptoms: "HTTP 502, Nginx upstream connection refused, worker thread exhaustion",
        recommendedAction: "Auto-roll back recent container deployment, recycle Nginx worker pools, and spin up failover replica pod.",
        rootCause: "Memory exhaustion and corrupted routing table in primary ingress controller.",
        usersAffected: 6500,
        scope: "Campus-Wide",
        mttdSeconds: 2.1,
        studentImpact: { score: 95, level: "CRITICAL", description: "Blocks exam schedules, fee submissions, and notices for 6,500 students." },
        hybridDecision: { finalPriority: "P1 - Critical", priorityClass: "critical", priorityBadge: "CRITICAL", explanation: "Elevated to P1 - Critical based on Tier 5 Service Criticality and 6,500 affected campus users." },
        isDigital: true,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        sandboxResults: {
          rehearsalPassed: true,
          simulatedDurationSec: 5,
          preCheckStatus: "DOWN",
          postCheckStatus: "HEALTHY",
          steps: [
            { step: 1, action: "Snapshot current live telemetry & allocate isolated sandbox namespace", status: "PASSED", latency: "14ms" },
            { step: 2, action: "Clone state graph (structuredClone) to staging runner", status: "PASSED", latency: "22ms" },
            { step: 3, action: "Simulate rollback & Nginx worker recycling", status: "PASSED", latency: "110ms" },
            { step: 4, action: "Run automated health probes (HTTP GET /healthz 200 OK)", status: "PASSED", latency: "45ms" },
            { step: 5, action: "Verify zero regression on database and auth services", status: "PASSED", latency: "18ms" },
            { step: 6, action: "Simulated state outcome: Asset recovered to HEALTHY", status: "VERIFIED", latency: "8ms" }
          ]
        },
        history: [
          { stage: "REPORTED", time: new Date(Date.now() - 1800000).toISOString(), note: "Student alert received from Rohan Sharma" },
          { stage: "DETECTED", time: new Date(Date.now() - 1798000).toISOString(), note: "AIOps telemetry detected HTTP 502 (MTTD: 2.1s)" },
          { stage: "SANDBOXED", time: new Date(Date.now() - 1700000).toISOString(), note: "Sandbox rehearsal passed all 6 pre-flight checks" }
        ]
      },
      {
        id: "INC-1182",
        scenarioId: "wifi_hostel_wide",
        title: "Hostel BH-1 2nd Floor Corridor Wi-Fi Outage",
        category: "network",
        target: "hostelWifi_hostelA",
        severity: "high",
        operationalPriority: "P2 - High",
        priorityBadge: "HIGH",
        status: "APPROVED",
        description: "Wi-Fi access point in 2nd floor corridor disconnected. Students in rooms 201-224 unable to access internet.",
        symptoms: "SSID broadcasting stopped, switch port down, PoE power draw zero",
        recommendedAction: "Power-cycle PoE switch port #14 (SW-BH1-FL2), flush local ARP cache, and re-provision AP radio firmware.",
        rootCause: "PoE power budget tripped on floor switch after power surge.",
        usersAffected: 95,
        scope: "Hostel Wing",
        mttdSeconds: 3.4,
        studentImpact: { score: 72, level: "HIGH", description: "Impacts academic connectivity for 95 residents in BH-1." },
        hybridDecision: { finalPriority: "P2 - High", priorityClass: "high", priorityBadge: "HIGH", explanation: "Multi-report cluster detected across 6 rooms on Floor 2." },
        isDigital: true,
        approvedBy: "Chief Warden",
        approvedAt: new Date(Date.now() - 600000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        sandboxResults: {
          rehearsalPassed: true,
          simulatedDurationSec: 4,
          preCheckStatus: "DOWN",
          postCheckStatus: "HEALTHY",
          steps: [
            { step: 1, action: "Isolate AP switch port telemetry namespace", status: "PASSED", latency: "12ms" },
            { step: 2, action: "Simulate PoE power-cycle and ARP table purge", status: "PASSED", latency: "85ms" },
            { step: 3, action: "Verify ping response & DHCP handshake", status: "VERIFIED", latency: "24ms" }
          ]
        },
        history: [
          { stage: "REPORTED", time: new Date(Date.now() - 3600000).toISOString(), note: "Multiple student reports ingested from BH-1 Floor 2" },
          { stage: "DETECTED", time: new Date(Date.now() - 3596000).toISOString(), note: "Multi-Report clustering triggered (MTTD: 3.4s)" },
          { stage: "SANDBOXED", time: new Date(Date.now() - 3000000).toISOString(), note: "Sandbox pre-flight verified" },
          { stage: "APPROVED", time: new Date(Date.now() - 600000).toISOString(), note: "Authority Approval granted by Chief Warden" }
        ]
      }
    ];
  }

  function loadIncidents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_INCIDENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    const seeded = getInitialIncidents();
    saveIncidents(seeded);
    return seeded;
  }

  function saveIncidents(incidents) {
    try {
      localStorage.setItem(STORAGE_KEY_INCIDENTS, JSON.stringify(incidents));
      broadcastEvent("incidents_changed", incidents);
    } catch (e) {}
  }

  function loadAuditTrail() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { id: "init-1", event: "SYSTEM_BOOT", actor: "LifeLine Controller", action: "Campus Infrastructure State Engine initialized", result: "All telemetry nodes active", timestamp: new Date(Date.now() - 3600000).toISOString() }
    ];
  }

  function saveAuditTrail(trail) {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(trail));
      broadcastEvent("audit_changed", trail);
    } catch (e) {}
  }

  function logAuditEvent(event, actor, action, result, metadata = {}) {
    const trail = loadAuditTrail();
    const entry = {
      id: "evt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      event,
      actor: actor || "LifeLine AIOps Engine",
      action,
      result: result || "Success",
      metadata,
      timestamp: new Date().toISOString()
    };
    trail.unshift(entry);
    if (trail.length > 200) trail.pop();
    saveAuditTrail(trail);
    return entry;
  }

  function loadMetrics() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_METRICS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      totalIncidents: 0,
      resolvedIncidents: 0,
      totalMttdMs: 0,
      totalMttrMs: 0,
      mttdHistory: [
        { incident: "Base Net Check", seconds: 4.2, timestamp: new Date(Date.now() - 86400000).toISOString() },
        { incident: "Hostel AP Auto-Poll", seconds: 3.8, timestamp: new Date(Date.now() - 43200000).toISOString() }
      ],
      mttrHistory: [
        { incident: "Web Gateway Rebind", seconds: 6.5, timestamp: new Date(Date.now() - 86400000).toISOString() },
        { incident: "DNS Cache Purge", seconds: 4.1, timestamp: new Date(Date.now() - 43200000).toISOString() }
      ]
    };
  }

  function saveMetrics(metrics) {
    try {
      localStorage.setItem(STORAGE_KEY_METRICS, JSON.stringify(metrics));
      broadcastEvent("metrics_changed", metrics);
    } catch (e) {}
  }

  function recordMttd(incidentTitle, seconds) {
    const m = loadMetrics();
    m.totalIncidents++;
    m.totalMttdMs += seconds * 1000;
    m.mttdHistory.unshift({ incident: incidentTitle, seconds: Number(seconds.toFixed(1)), timestamp: new Date().toISOString() });
    if (m.mttdHistory.length > 20) m.mttdHistory.pop();
    saveMetrics(m);
  }

  function recordMttr(incidentTitle, seconds) {
    const m = loadMetrics();
    m.resolvedIncidents++;
    m.totalMttrMs += seconds * 1000;
    m.mttrHistory.unshift({ incident: incidentTitle, seconds: Number(seconds.toFixed(1)), timestamp: new Date().toISOString() });
    if (m.mttrHistory.length > 20) m.mttrHistory.pop();
    saveMetrics(m);
  }

  function loadEvidence() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVIDENCE);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveEvidence(evidence) {
    try {
      localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(evidence));
      broadcastEvent("evidence_changed", evidence);
    } catch (e) {}
  }

  function addEvidenceItem(item) {
    const list = loadEvidence();
    const entry = {
      id: "ev-" + Date.now(),
      title: item.title || "Report Photo Attachment",
      category: item.category || "other",
      location: item.location || "Hostel Area",
      imageUrl: item.imageUrl || "img/placeholder-hazard.png",
      uploaderName: item.uploaderName || "Student",
      description: item.description || "",
      priority: item.priority || "P3 - Medium",
      timestamp: new Date().toISOString(),
      status: "Logged & Verified"
    };
    list.unshift(entry);
    saveEvidence(list);
    return entry;
  }

  function loadWorkOrders() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WORK_ORDERS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function saveWorkOrders(orders) {
    try {
      localStorage.setItem(STORAGE_KEY_WORK_ORDERS, JSON.stringify(orders));
      broadcastEvent("work_orders_changed", orders);
    } catch (e) {}
  }

  function createWorkOrder(data) {
    const orders = loadWorkOrders();
    const order = {
      id: "WO-" + (1000 + orders.length + 1),
      title: data.title,
      category: data.category,
      department: data.category === "plumbing" || data.category === "waterSystems" 
        ? "Estate & Water Maintenance"
        : data.category === "electrical"
        ? "Electrical Engineering Team"
        : data.category === "mess_food"
        ? "Campus Food Safety & Hygiene Cell"
        : "Civil & Facilities Team",
      priority: data.priority || "P2 - High",
      location: data.location || "Hostel",
      assignedTo: data.assignedTo || "On-Call Duty Supervisor",
      status: "Notified", // Reported -> Notified -> Assigned -> In Progress -> Resolved
      history: [
        { status: "Reported", time: new Date().toISOString(), note: "Incident created via telemetry/student alert" },
        { status: "Notified", time: new Date().toISOString(), note: "Department automated dispatch notification sent" }
      ],
      description: data.description,
      createdAt: new Date().toISOString()
    };
    orders.unshift(order);
    saveWorkOrders(orders);
    logAuditEvent("WORK_ORDER_DISPATCHED", "Facilities Dispatcher", `Created Work Order ${order.id}`, `Assigned to ${order.department}`);
    return order;
  }

  function updateWorkOrderStatus(orderId, newStatus, note = "") {
    const orders = loadWorkOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      order.history.push({ status: newStatus, time: new Date().toISOString(), note: note || `Status transitioned to ${newStatus}` });
      saveWorkOrders(orders);
      logAuditEvent("WORK_ORDER_UPDATED", "Warden/Staff", `Work Order ${orderId} -> ${newStatus}`, note);
    }
  }

  // Cross-tab broadcast mechanism
  const listeners = [];
  function subscribe(listener) {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function broadcastEvent(type, payload) {
    listeners.forEach(fn => {
      try { fn(type, payload); } catch (err) { console.error("Listener error:", err); }
    });
  }

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY_STATE) broadcastEvent("state_changed", loadState());
      if (e.key === STORAGE_KEY_INCIDENTS) broadcastEvent("incidents_changed", loadIncidents());
      if (e.key === STORAGE_KEY_AUDIT) broadcastEvent("audit_changed", loadAuditTrail());
      if (e.key === STORAGE_KEY_METRICS) broadcastEvent("metrics_changed", loadMetrics());
      if (e.key === STORAGE_KEY_EVIDENCE) broadcastEvent("evidence_changed", loadEvidence());
      if (e.key === STORAGE_KEY_WORK_ORDERS) broadcastEvent("work_orders_changed", loadWorkOrders());
    });
  }

  // --------------------------------------------------------------------------
  // HYBRID OPERATIONAL PRIORITY ENGINE
  // --------------------------------------------------------------------------
  /**
   * Computes the Final Operational Priority (P1 to P4) by combining:
   * 1. Neural Network Prediction (Risk level & Softmax probability distribution)
   * 2. Service Criticality (1 to 5)
   * 3. Student Impact Score (0 to 100)
   * 4. Number of Users Affected
   * 5. Safety & Health Risk Severity
   * 6. Location Scope (Room, Floor, Wing, Entire Hostel, Campus-Wide)
   * 7. Current Infrastructure State (Down, Degraded, Healthy)
   * 8. Multi-Report Correlation Cluster Count
   */
  function calculateHybridPriority(params) {
    const {
      nnResult,             // { riskLevel: "low"|"medium"|"high", confidence: number, probabilities: {} }
      category = "other",
      description = "",
      location = "",
      serviceKey = null,
      usersAffected = null,
      similarReportCount = 1,
      currentInfraStatus = "healthy"
    } = params;

    // A. Neural Network Base Score (0 to 30)
    let nnScore = 10;
    if (nnResult) {
      if (nnResult.riskLevel === "high") nnScore = 25 + (nnResult.confidence * 5);
      else if (nnResult.riskLevel === "medium") nnScore = 15 + (nnResult.confidence * 5);
      else nnScore = 5 + (nnResult.confidence * 5);
    }

    // B. Service Criticality (0 to 30)
    let criticality = 2;
    let serviceName = "General Hostel Asset";
    if (serviceKey && SERVICE_METADATA[serviceKey]) {
      criticality = SERVICE_METADATA[serviceKey].criticality;
      serviceName = SERVICE_METADATA[serviceKey].name;
    } else {
      // Infer service from category / text
      const lower = (description + " " + location).toLowerCase();
      if (lower.includes("website") || lower.includes("portal") || lower.includes("erp") || lower.includes("admission") || lower.includes("exam")) {
        criticality = 5;
        serviceName = "Mission-Critical College Web Services";
      } else if (lower.includes("lms") || lower.includes("moodle") || lower.includes("assignment")) {
        criticality = 4;
        serviceName = "LMS Platform";
      } else if (lower.includes("water") || lower.includes("drinking") || lower.includes("purifier") || lower.includes("filter")) {
        criticality = 5;
        serviceName = "Drinking Water & Sanitation";
      } else if (lower.includes("food") || lower.includes("mess") || lower.includes("cater") || lower.includes("meal") || category === "mess_food") {
        criticality = 5;
        serviceName = "Campus Food Safety & Mess";
      } else if (lower.includes("entire hostel") || lower.includes("all floor") || lower.includes("building")) {
        criticality = 4;
        serviceName = "Hostel Infrastructure";
      }
    }
    const criticalityScore = criticality * 6; // 6 to 30

    // C. Student Impact & Users Affected (0 to 25)
    let userCount = usersAffected;
    if (userCount == null) {
      const lower = (description + " " + location).toLowerCase();
      if (lower.includes("campus") || lower.includes("website") || lower.includes("portal")) userCount = 5000;
      else if (lower.includes("entire hostel") || lower.includes("bh-") || category === "mess_food") userCount = 450;
      else if (lower.includes("floor") || lower.includes("wing")) userCount = 60;
      else userCount = 4; // Single room baseline
    }

    let userScore = 5;
    if (userCount >= 2000) userScore = 25;
    else if (userCount >= 300) userScore = 20;
    else if (userCount >= 50) userScore = 15;
    else if (userCount >= 10) userScore = 10;
    else userScore = 5;

    // D. Safety / Hazard Multiplier (0 to 20)
    let safetyScore = 0;
    const lowerText = (description + " " + location).toLowerCase();
    const safetyKeywords = ["spark", "fire", "smoke", "shock", "odor", "chemical", "poison", "nausea", "unconscious", "collapse", "gas", "contaminat", "toxic", "burning"];
    for (const kw of safetyKeywords) {
      if (lowerText.includes(kw)) {
        safetyScore += 8;
      }
    }
    if (category === "fire_safety" || category === "mess_food") safetyScore += 6;
    safetyScore = Math.min(safetyScore, 20);

    // E. Infrastructure Status Multiplier (0 to 15)
    let infraScore = 0;
    if (currentInfraStatus === "down") infraScore = 15;
    else if (currentInfraStatus === "degraded") infraScore = 8;
    else if (currentInfraStatus === "recovering") infraScore = 4;

    // F. Multi-Report Correlation Multiplier (0 to 15)
    let clusterScore = 0;
    if (similarReportCount > 5) clusterScore = 15;
    else if (similarReportCount >= 3) clusterScore = 10;
    else if (similarReportCount === 2) clusterScore = 5;

    // Composite Weighted Total (0 to 135)
    const compositeScore = nnScore + criticalityScore + userScore + safetyScore + infraScore + clusterScore;

    // Map to Final Operational Priority
    let finalPriority = "P4 - Low";
    let priorityClass = "low";
    let priorityBadge = "LOW";

    if (compositeScore >= 75 || safetyScore >= 16 || (criticality >= 5 && userCount >= 1000) || (currentInfraStatus === "down" && criticality >= 4)) {
      finalPriority = "P1 - Critical";
      priorityClass = "critical";
      priorityBadge = "CRITICAL";
    } else if (compositeScore >= 52 || criticality >= 4 || userCount >= 300 || similarReportCount >= 3) {
      finalPriority = "P2 - High";
      priorityClass = "high";
      priorityBadge = "HIGH";
    } else if (compositeScore >= 32 || userCount >= 20) {
      finalPriority = "P3 - Medium";
      priorityClass = "medium";
      priorityBadge = "MEDIUM";
    }

    // Transparent Decision Breakdown explanation
    const whyFactors = [];
    if (criticality >= 4) whyFactors.push(`Service Criticality is Tier ${criticality}/5 (${serviceName})`);
    if (userCount >= 50) whyFactors.push(`${userCount.toLocaleString()} campus users impacted`);
    if (safetyScore > 0) whyFactors.push(`Physical/health safety keywords identified`);
    if (similarReportCount >= 2) whyFactors.push(`Multi-Report Cluster: ${similarReportCount} correlated reports received`);
    if (currentInfraStatus === "down" || currentInfraStatus === "degraded") whyFactors.push(`Live Telemetry confirms asset is currently ${currentInfraStatus.toUpperCase()}`);
    if (nnResult) whyFactors.push(`Neural Network baseline: ${nnResult.riskLevel.toUpperCase()} (${Math.round((nnResult.confidence || 0.8) * 100)}% conf)`);

    const explanation = `LifeLine Operational Decision Engine elevated this incident to ${finalPriority} based on holistic context: ` +
      whyFactors.join("; ") + ".";

    return {
      finalPriority,
      priorityClass,
      priorityBadge,
      compositeScore,
      userCount,
      criticality,
      serviceName,
      safetyScore,
      clusterScore,
      infraScore,
      factors: {
        nnScore,
        criticalityScore,
        userScore,
        safetyScore,
        infraScore,
        clusterScore
      },
      whyFactors,
      explanation
    };
  }

  // --------------------------------------------------------------------------
  // WI-FI ROOT CAUSE ANALYSIS (RCA) ENGINE
  // --------------------------------------------------------------------------
  /**
   * Analyzes network telemetry across the multi-tier hierarchy:
   * Level 1: End Device / Room AP (DHCP, radio contention, SSID)
   * Level 2: Floor Edge Switch (Port PoE, VLAN)
   * Level 3: Hostel Distribution Switch (Trunk link, STP, uplink)
   * Level 4: Campus Core Gateway (ISP, BGP route, Firewall)
   */
  function analyzeWifiHierarchy(params) {
    const { location = "", description = "", reportsInZone = 1 } = params;
    const lower = (location + " " + description).toLowerCase();

    if (reportsInZone >= 5 || lower.includes("entire hostel") || lower.includes("all floors") || lower.includes("building down")) {
      return {
        level: "Level 3 — Hostel Distribution Switch & Uplink",
        device: "SW-BH1-DIST (Cisco Catalyst 3850)",
        scope: "Hostel-Wide (450 Students)",
        rootCause: "Hostel distribution switch STP topology recalculation or trunk fiber transceiver failure.",
        remediation: "Execute remote switch control port reboot, bounce 10G SFP+ uplink, and clear dynamic MAC tables.",
        isDigitalAutoHealable: true
      };
    } else if (reportsInZone >= 2 || lower.includes("floor") || lower.includes("corridor") || lower.includes("wing")) {
      return {
        level: "Level 2 — Floor Edge Switch & PoE Mesh",
        device: "SW-BH1-FL2 (PoE+ Gigabit Switch)",
        scope: "Floor-Wide (~60 Students)",
        rootCause: "Power-over-Ethernet wattage budget exceeded causing cyclic reboot on 4 ceiling APs.",
        remediation: "Re-balance PoE power allocation profile, restart Floor 2 Edge switch ports 1-8.",
        isDigitalAutoHealable: true
      };
    } else {
      return {
        level: "Level 1 — Access Point & Local DHCP Pool",
        device: "AP-BH1-2F-04 (Aruba AP-515)",
        scope: "Local Room (1-4 Students)",
        rootCause: "DHCP address pool exhaustion or 2.4GHz/5GHz channel contention in the immediate room zone.",
        remediation: "Flush stale DHCP leases on AP-BH1-2F-04, cycle BSSID radio beacon, auto-switch to 5GHz 80MHz channel.",
        isDigitalAutoHealable: true
      };
    }
  }

  // --------------------------------------------------------------------------
  // MULTI-REPORT CORRELATION ENGINE
  // --------------------------------------------------------------------------
  /**
   * Correlates incoming reports against existing active reports to group clusters.
   */
  function correlateReports(newReport, allReports = []) {
    const timeWindowMs = 45 * 60 * 1000; // 45 minutes
    const now = Date.now();
    const newLoc = (newReport.location || "").toLowerCase().trim();
    const newCat = newReport.category;

    const cluster = allReports.filter(r => {
      if (r.id === newReport.id) return false;
      const rTime = new Date(r.created_at || r.timestamp || now).getTime();
      if (now - rTime > timeWindowMs) return false;

      // Match category and similar location tokens
      const sameCat = r.category === newCat;
      const rLoc = (r.location || "").toLowerCase().trim();
      const sameLoc = (newLoc && rLoc && (newLoc.includes(rLoc) || rLoc.includes(newLoc)));

      return sameCat && (sameLoc || r.category === "mess_food" || r.category === "network");
    });

    return {
      clusterCount: cluster.length + 1,
      correlatedReportIds: cluster.map(c => c.id),
      hasCluster: cluster.length > 0,
      clusterSummary: cluster.length > 0 
        ? `⚠️ Multi-Report Correlation: ${cluster.length + 1} students reported matching incidents in this zone within the last 45 minutes.`
        : null
    };
  }

  // --------------------------------------------------------------------------
  // STUDENT IMPACT ENGINE
  // --------------------------------------------------------------------------
  function calculateStudentImpact(params) {
    const { category, serviceKey, description = "", usersAffected = 1 } = params;
    let score = 20; // baseline

    // Factor 1: User Scale
    if (usersAffected >= 3000) score += 40;
    else if (usersAffected >= 400) score += 30;
    else if (usersAffected >= 50) score += 20;
    else score += 5;

    // Factor 2: Criticality of Amenity / Service
    if (serviceKey === "website" || serviceKey === "studentPortal") score += 30;
    else if (category === "mess_food" || serviceKey === "waterSystems") score += 35; // Basic life need
    else if (category === "fire_safety" || category === "electrical") score += 25;
    else if (serviceKey === "lms") score += 20;

    score = Math.min(score, 100);

    let level = "LOW";
    if (score >= 75) level = "CRITICAL";
    else if (score >= 50) level = "HIGH";
    else if (score >= 30) level = "MODERATE";

    return {
      score,
      level,
      usersAffected,
      description: `${level} Student Impact (${score}/100) — Affecting approx ${usersAffected.toLocaleString()} students across campus.`
    };
  }

  // --------------------------------------------------------------------------
  // FAULT INJECTION & SELF-HEALING STATE CONTROLLER
  // --------------------------------------------------------------------------
  /**
   * Injects a fault into the live campus state and creates an active incident.
   */
  function injectFault(scenarioId) {
    const scenario = FAULT_SCENARIOS[scenarioId];
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

    const state = loadState();
    const startTime = Date.now();

    // Mutate state
    if (scenario.target.includes("hostelWifi_")) {
      const sub = scenario.target.split("_")[1];
      state.hostelWifi[sub] = "down";
    } else {
      state[scenario.target] = "down";
    }
    saveState(state);

    // Calculate simulated MTTD (Time to Detect by AIOps telemetry)
    const mttdSeconds = Number((1.8 + Math.random() * 2.4).toFixed(1));
    recordMttd(scenario.title, mttdSeconds);

    // Create Incident
    const incidents = loadIncidents();
    const incidentId = "INC-" + Date.now().toString().slice(-6);

    const nnSimulated = {
      riskLevel: scenario.severity === "critical" ? "high" : scenario.severity === "high" ? "high" : "medium",
      confidence: 0.88,
      probabilities: { low: 0.05, medium: 0.15, high: 0.80 }
    };

    const hybrid = calculateHybridPriority({
      nnResult: nnSimulated,
      category: scenario.category,
      description: scenario.description,
      serviceKey: scenario.target,
      usersAffected: scenario.usersAffected,
      currentInfraStatus: "down",
      similarReportCount: 1
    });

    const impact = calculateStudentImpact({
      category: scenario.category,
      serviceKey: scenario.target,
      description: scenario.description,
      usersAffected: scenario.usersAffected
    });

    const incident = {
      id: incidentId,
      scenarioId,
      title: scenario.title,
      category: scenario.category,
      target: scenario.target,
      severity: scenario.severity,
      operationalPriority: hybrid.finalPriority,
      priorityBadge: hybrid.priorityBadge,
      status: "DETECTED", // DETECTED -> ANALYZED -> SANDBOXED -> APPROVED -> RECOVERING -> VERIFIED / RESOLVED
      description: scenario.description,
      symptoms: scenario.symptoms,
      recommendedAction: scenario.recommendedAction,
      rootCause: scenario.rootCause,
      usersAffected: scenario.usersAffected,
      scope: scenario.scope,
      mttdSeconds,
      mttdLoggedAt: new Date(startTime + (mttdSeconds * 1000)).toISOString(),
      studentImpact: impact,
      hybridDecision: hybrid,
      isDigital: scenario.category === "digital",
      createdAt: new Date().toISOString(),
      history: [
        { stage: "INJECTED", time: new Date(startTime).toISOString(), note: `Fault injected: ${scenario.title}` },
        { stage: "DETECTED", time: new Date(startTime + (mttdSeconds * 1000)).toISOString(), note: `AIOps Telemetry detected anomaly (MTTD: ${mttdSeconds}s)` }
      ]
    };

    incidents.unshift(incident);
    saveIncidents(incidents);

    logAuditEvent("FAULT_INJECTED", "Fault Injection Console", `Fault triggered: ${scenario.title}`, `State mutated: ${scenario.target} -> DOWN`, { incidentId, mttdSeconds });

    // If Physical or Safety fault, automatically create corresponding Work Order
    if (!incident.isDigital) {
      createWorkOrder({
        title: scenario.title,
        category: scenario.category,
        priority: hybrid.finalPriority,
        location: scenario.scope === "hostel" ? "Hostel Wing BH-1/BH-2" : "Campus Area",
        description: scenario.description
      });
    }

    return incident;
  }

  /**
   * Runs Sandbox simulation against a cloned state copy without touching live state.
   */
  function runClonedSandboxSimulation(incidentId) {
    const incidents = loadIncidents();
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident) throw new Error("Incident not found");

    const liveState = loadState();
    const sandboxClone = structuredClone(liveState);

    // Rehearse recovery on clone
    const targetKey = incident.target;
    if (targetKey.includes("hostelWifi_")) {
      const sub = targetKey.split("_")[1];
      sandboxClone.hostelWifi[sub] = "healthy";
    } else {
      sandboxClone[targetKey] = "healthy";
    }

    const steps = [
      { step: 1, action: "Snapshot current live telemetry & allocate isolated sandbox namespace", status: "PASSED", latency: "14ms" },
      { step: 2, action: "Clone state graph (structuredClone) to staging runner", status: "PASSED", latency: "22ms" },
      { step: 3, action: `Simulate rollback/reboot execution: "${incident.recommendedAction}"`, status: "PASSED", latency: "110ms" },
      { step: 4, action: "Run automated health probes (HTTP GET /healthz, ping, TCP socket check)", status: "PASSED", latency: "45ms" },
      { step: 5, action: "Verify zero regression on adjacent services (Database, Network, Auth)", status: "PASSED", latency: "18ms" },
      { step: 6, action: "Simulated state outcome: Asset recovered from DOWN -> HEALTHY", status: "VERIFIED", latency: "8ms" }
    ];

    incident.status = "SANDBOXED";
    incident.sandboxResults = {
      rehearsalPassed: true,
      simulatedDurationSec: incident.isDigital ? (FAULT_SCENARIOS[incident.scenarioId]?.recoveryTimeSec || 5) : 0,
      steps,
      preCheckStatus: "DOWN",
      postCheckStatus: "HEALTHY",
      completedAt: new Date().toISOString()
    };
    incident.history.push({ stage: "SANDBOXED", time: new Date().toISOString(), note: "Sandbox rehearsal completed successfully (zero live impact)" });

    saveIncidents(incidents);
    logAuditEvent("SANDBOX_SIMULATION", "Sandbox Engine", `Simulated recovery for ${incident.title}`, "Pre-flight checks verified");
    return incident.sandboxResults;
  }

  /**
   * Stage 1: Authority Approval (Warden / Staff)
   */
  function approveIncidentRecovery(incidentId, approverName = "Warden / Operations Lead") {
    const incidents = loadIncidents();
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident) throw new Error("Incident not found");

    incident.status = "APPROVED";
    incident.approvedBy = approverName;
    incident.approvedAt = new Date().toISOString();
    incident.history.push({ stage: "APPROVED", time: new Date().toISOString(), note: `Authority Approval granted by ${approverName}` });

    saveIncidents(incidents);
    logAuditEvent("AUTHORITY_APPROVAL", approverName, `Approved recovery playbook for ${incident.title}`, "Awaiting Final Human Confirmation");
    return incident;
  }

  /**
   * Stage 2: Final Warning Confirmation & Live Self-Healing Execution.
   * Transitions state: DOWN -> RECOVERING (with live delay) -> HEALTHY (Verified).
   */
  async function executeSelfHealing(incidentId, onProgress) {
    const incidents = loadIncidents();
    let incident = null;
    if (typeof incidentId === "object" && incidentId !== null) {
      incident = incidentId;
    } else if (incidentId) {
      incident = incidents.find(i => i.id === incidentId || i.scenarioId === incidentId);
    }
    if (!incident) {
      incident = incidents.find(i => i.status === "APPROVED" || i.status === "SANDBOXED" || i.status === "DETECTED") || incidents[0];
    }
    if (!incident) {
      incident = injectFault("website_down");
    }

    if (incident.category === "physical" || incident.category === "safety") {
      throw new Error("Physical and Safety incidents require on-site manual work order dispatch and cannot be executed via digital self-healing.");
    }

    const state = loadState();
    const targetKey = incident.target || "website";
    const startTime = Date.now();

    // 1. Transition to RECOVERING
    if (targetKey.includes("hostelWifi_")) {
      const sub = targetKey.split("_")[1];
      if (!state.hostelWifi) state.hostelWifi = { hostelA: "healthy", hostelB: "healthy" };
      state.hostelWifi[sub] = "recovering";
    } else {
      state[targetKey] = "recovering";
    }
    saveState(state);

    incident.status = "RECOVERING";
    incident.history.push({ stage: "RECOVERING", time: new Date().toISOString(), note: "Self-healing execution started in live environment" });
    saveIncidents(incidents);
    logAuditEvent("SELF_HEALING_START", "AIOps Executor", `Self-healing initiated for ${incident.title}`, `State: ${targetKey} -> RECOVERING`);

    if (onProgress) onProgress({ stage: "INITIALIZING", percent: 15, message: "Deploying recovery playbook..." });

    const totalDurationSec = FAULT_SCENARIOS[incident.scenarioId]?.recoveryTimeSec || 5;
    const stepInterval = (totalDurationSec * 1000) / 4;

    await new Promise(r => setTimeout(r, stepInterval));
    if (onProgress) onProgress({ stage: "APPLYING_FIX", percent: 45, message: incident.recommendedAction });

    await new Promise(r => setTimeout(r, stepInterval));
    if (onProgress) onProgress({ stage: "WARMING_UP", percent: 75, message: "Warming service worker pools & reconnecting sockets..." });

    await new Promise(r => setTimeout(r, stepInterval));
    if (onProgress) onProgress({ stage: "VERIFYING", percent: 95, message: "Running live health telemetry verification..." });

    await new Promise(r => setTimeout(r, stepInterval));

    // 2. Transition to HEALTHY
    const finalState = loadState();
    if (targetKey.includes("hostelWifi_")) {
      const sub = targetKey.split("_")[1];
      finalState.hostelWifi[sub] = "healthy";
    } else {
      finalState[targetKey] = "healthy";
    }
    saveState(finalState);

    const actualMttrSec = Number(((Date.now() - startTime) / 1000).toFixed(1));
    recordMttr(incident.title, actualMttrSec);

    incident.status = "RESOLVED";
    incident.resolvedAt = new Date().toISOString();
    incident.mttrSeconds = actualMttrSec;
    incident.history.push({ stage: "RESOLVED", time: new Date().toISOString(), note: `Self-healing verified healthy (MTTR: ${actualMttrSec}s)` });

    saveIncidents(incidents);
    logAuditEvent("SELF_HEALING_VERIFIED", "LifeLine Verifier", `Self-healing completed for ${incident.title}`, `State: ${targetKey} -> HEALTHY (MTTR: ${actualMttrSec}s)`, { mttrSeconds: actualMttrSec });

    if (onProgress) onProgress({ stage: "COMPLETED", percent: 100, message: `Recovered & Verified in ${actualMttrSec}s` });

    return { success: true, mttrSeconds: actualMttrSec };
  }

  // --------------------------------------------------------------------------
  // AUTOMATED AUTHORITY EMAIL DISPATCH SERVICE (Physical / Facilities Issues)
  // --------------------------------------------------------------------------
  function loadDispatchedEmails() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DISPATCH_EMAILS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      {
        id: "EML-782104",
        incidentId: "INC-1182",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        toOfficer: "Er. Ramesh K. Sharma",
        toDesignation: "Chief Electrical Engineer",
        toEmail: "electrical.ops@lifeline.campus",
        department: "Campus Electrical Engineering & Power Grid",
        phoneExt: "Desk Ext: 401 | Control: +91 98765-43210",
        sla: "15-30 mins",
        category: "electrical",
        priority: "P1 - Critical",
        location: "Hostel BH-1, Floor 2 Corridor",
        studentName: "Rohan Sharma (Room 214)",
        studentRoom: "BH-1 Room 214",
        subject: "[AIOPS AUTO-DISPATCH] P1 - Critical: Electrical Hazard at Hostel BH-1, Floor 2 Corridor",
        aiRootCause: "Sparks observed around distribution board casing. High thermal dissipation detected on feeder #2.",
        aiSolution: "PHYSICAL WORK ORDER (URGENT): Cut mains power to the affected wing from DB panel, isolate feeder, and dispatch Senior Electrical Engineer immediately.",
        status: "DISPATCHED_DELIVERED",
        smtpCode: "250 2.0.0 OK Message queued for immediate delivery via campus relay"
      }
    ];
  }

  function saveDispatchedEmails(emails) {
    try {
      localStorage.setItem(STORAGE_KEY_DISPATCH_EMAILS, JSON.stringify(emails));
      broadcastEvent("emails_changed", emails);
    } catch (e) {}
  }

  function dispatchPhysicalAuthorityEmail(data) {
    const cat = data.category || "other";
    const routing = AUTHORITY_ROUTING_DIRECTORY[cat] || AUTHORITY_ROUTING_DIRECTORY.other;

    const emailRecord = {
      id: "EML-" + Math.floor(100000 + Math.random() * 900000),
      incidentId: data.incidentId || ("INC-" + Date.now().toString().slice(-6)),
      timestamp: new Date().toISOString(),
      toOfficer: routing.officer,
      toDesignation: routing.designation,
      toEmail: routing.email,
      department: routing.department,
      phoneExt: routing.phoneExt,
      sla: routing.sla,
      category: cat,
      priority: data.priority || "P1 - Critical",
      location: data.location || "Campus Hostel",
      studentName: data.studentName || "Student Resident",
      studentRoom: data.studentRoom || "Hostel Room",
      subject: `[AIOPS AUTO-DISPATCH] ${data.priority || 'P1 - Critical'}: ${data.title || 'Physical Infrastructure Incident'} at ${data.location}`,
      aiRootCause: data.rootCause || "Neural Network identified physical equipment anomaly requiring specialized technician inspection.",
      aiSolution: data.solution || "Dispatch specialized maintenance team immediately with replacement parts.",
      status: "DISPATCHED_DELIVERED",
      smtpCode: "250 2.0.0 OK [Delivered via campus-relay.lifeline.campus]"
    };

    const emails = loadDispatchedEmails();
    emails.unshift(emailRecord);
    if (emails.length > 50) emails.pop();
    saveDispatchedEmails(emails);

    logAuditEvent(
      "AUTHORITY_EMAIL_DISPATCHED",
      "LifeLine Automated Notification Service",
      `Dispatched priority work order email to ${routing.officer} (${routing.email}) for ${data.location}`,
      `Delivered (250 OK - SLA: ${routing.sla})`
    );

    return emailRecord;
  }

  function resetAllCampusState() {
    saveState(structuredClone(INITIAL_CAMPUS_STATE));
    saveIncidents([]);
    saveWorkOrders([]);
    saveDispatchedEmails([]);
    logAuditEvent("SYSTEM_RESET", "Admin Operator", "All campus infrastructure states restored to baseline Healthy", "Reset complete");
  }

  // Export to global and module environments
  const CampusStateEngine = {
    INITIAL_CAMPUS_STATE,
    SERVICE_METADATA,
    AUTHORITY_ROUTING_DIRECTORY,
    FAULT_SCENARIOS,
    loadState,
    saveState,
    loadIncidents,
    saveIncidents,
    loadAuditTrail,
    saveAuditTrail,
    logAuditEvent,
    loadMetrics,
    saveMetrics,
    loadEvidence,
    saveEvidence,
    addEvidenceItem,
    loadWorkOrders,
    saveWorkOrders,
    createWorkOrder,
    updateWorkOrderStatus,
    loadDispatchedEmails,
    saveDispatchedEmails,
    dispatchPhysicalAuthorityEmail,
    calculateHybridPriority,
    analyzeWifiHierarchy,
    correlateReports,
    calculateStudentImpact,
    injectFault,
    runClonedSandboxSimulation,
    approveIncidentRecovery,
    executeSelfHealing,
    resetAllCampusState,
    subscribe
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CampusStateEngine;
  }
  if (typeof window !== "undefined") {
    window.CampusStateEngine = CampusStateEngine;
  }
  if (typeof global !== "undefined") {
    global.CampusStateEngine = CampusStateEngine;
  }

})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
