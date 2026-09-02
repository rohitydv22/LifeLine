/**
 * LifeLine AIOps — Simulation to Incident Adapter
 * 
 * Translates OMNeT++ / INET simulation faults and RCA diagnostic findings
 * into full LifeLine incident objects with telemetry evidence, student impact scores,
 * and automated playbook recommendations.
 */

(function (global) {
  "use strict";

  const SCENARIO_INCIDENT_TEMPLATES = {
    single_ap_failure: {
      title: "Wi-Fi Unavailable in Hostel A Room 306 (AP-306 Offline)",
      category: "network",
      target: "hostelWifi_hostelA",
      location: "Hostel A, Room 306",
      affectedInfrastructure: "AP-306 (Aruba 5GHz Access Point)",
      likelyCause: "Local Access Point Failure",
      scope: "Localized (Room 306)",
      usersAffected: 4,
      severity: "medium",
      priority: "P3 - Medium",
      description: "Simulation detected 100% packet loss for devices associated with AP-306. Nearby AP-307 and AP-308 remain fully operational.",
      recommendedAction: "Execute remote soft restart of AP-306, flush stale DHCP lease table, and verify 5GHz beacon transmission."
    },
    hostel_switch_failure: {
      title: "Hostel A Entire Wing Wi-Fi Outage (SW-HostelA Offline)",
      category: "network",
      target: "hostelWifi_hostelA",
      location: "Hostel A (All Floors)",
      affectedInfrastructure: "SW-HostelA (Cisco Catalyst 3850 Switch)",
      likelyCause: "Hostel Distribution Switch Failure",
      scope: "Building/Hostel-Wide (Hostel A)",
      usersAffected: 450,
      severity: "high",
      priority: "P2 - High",
      description: "Hostel distribution switch SW-HostelA lost telemetry heartbeat. All 3 hostel access points dropped backhaul uplink simultaneously.",
      recommendedAction: "Reboot distribution switch SW-HostelA via remote PDU, reset PoE+ power budget, and re-negotiate 10G fiber trunk."
    },
    campus_router_failure: {
      title: "Campus Core Network Gateway Failure (Router-CampusCore Down)",
      category: "network",
      target: "network",
      location: "Campus Core Datacenter",
      affectedInfrastructure: "Router-CampusCore (ASR 1001-X)",
      likelyCause: "Campus Core Gateway Failure",
      scope: "Campus-Wide",
      usersAffected: 7500,
      severity: "critical",
      priority: "P1 - Critical",
      description: "Primary campus core router unreachable. BGP routing table dropped and internet gateway connection timed out for all campus zones.",
      recommendedAction: "Trigger core router interface reboot and shift BGP gateway route to secondary edge ISP link."
    }
  };

  class SimulationIncidentAdapter {
    /**
     * Creates an incident object from a simulation scenario and RCA result
     */
    static createIncidentFromSimulation(scenarioId, simulator = null) {
      const template = SCENARIO_INCIDENT_TEMPLATES[scenarioId] || SCENARIO_INCIDENT_TEMPLATES.single_ap_failure;
      const incidentId = "INC-SIM-" + Date.now().toString().slice(-6);
      const timestamp = new Date().toISOString();

      let rca = null;
      let structuredReport = null;
      if (simulator) {
        if (typeof global.NetworkRCAEngine !== "undefined") {
          rca = global.NetworkRCAEngine.investigate(simulator, "AP-306");
        } else {
          try {
            const { NetworkRCAEngine } = require("./rca_engine.js");
            rca = NetworkRCAEngine.investigate(simulator, "AP-306");
          } catch (e) {}
        }
        structuredReport = simulator.getStructuredReport("AP-306");
      }

      const supportingEvidence = rca ? rca.checklist.map(c => `[${c.status}] ${c.title}: ${c.evidence}`) : [
        `[OFFLINE] Target Infrastructure: ${template.affectedInfrastructure}`,
        `[HEALTHY] Surrounding Infrastructure Status: Evaluated`,
        `[UNREACHABLE] Packet Loss: 100% | Latency: NULL`
      ];

      return {
        id: incidentId,
        source: "OMNeT++ / INET Simulation Engine",
        scenarioId,
        title: template.title,
        category: template.category,
        target: template.target,
        location: template.location,
        affectedInfrastructure: template.affectedInfrastructure,
        likelyCause: rca ? rca.likelyRootCause : template.likelyCause,
        scope: rca ? rca.failureScope : template.scope,
        usersAffected: rca ? rca.affectedHeadcount : template.usersAffected,
        severity: template.severity,
        operationalPriority: template.priority,
        status: "DETECTED", // DETECTED -> SANDBOXED -> APPROVED -> RESOLVED
        description: template.description,
        symptoms: [
          "100% packet loss on local client ping probes",
          "Zero telemetry response on SNMP port",
          "AIOps telemetry probe alarm triggered"
        ],
        supportingEvidence,
        structuredTelemetry: structuredReport,
        recommendedAction: rca ? rca.recommendedRecoveryAction : template.recommendedAction,
        isDigital: true,
        mttdSeconds: 1.6,
        createdAt: timestamp,
        history: [
          { stage: "SIMULATED", time: timestamp, note: `Fault injected in OMNeT++ environment: ${scenarioId}` },
          { stage: "DETECTED", time: timestamp, note: `AIOps probe detected anomaly (MTTD: 1.6s)` }
        ]
      };
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { SimulationIncidentAdapter, SCENARIO_INCIDENT_TEMPLATES };
  }
  if (typeof window !== "undefined") {
    window.SimulationIncidentAdapter = SimulationIncidentAdapter;
    window.SCENARIO_INCIDENT_TEMPLATES = SCENARIO_INCIDENT_TEMPLATES;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
