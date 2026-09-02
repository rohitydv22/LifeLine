/**
 * LifeLine AIOps — Campus Wi-Fi Simulation Module
 * 
 * Bundles:
 * - CampusNetworkSimulator: Discrete-event network topology simulator
 * - NetworkRCAEngine: Structured 6-tier Root Cause Analysis
 * - NetworkRecoveryEngine: Two-phase safe recovery (Dry-run Sandbox + Live execution)
 * - SimulationIncidentAdapter: Converts simulation telemetry into LifeLine Incidents
 */

const { CampusNetworkSimulator, createBaselineTopology } = require("./engine/network_simulator.js");
const { NetworkRCAEngine } = require("./engine/rca_engine.js");
const { NetworkRecoveryEngine, RECOVERY_ACTIONS } = require("./engine/recovery_engine.js");
const { SimulationIncidentAdapter, SCENARIO_INCIDENT_TEMPLATES } = require("./engine/incident_adapter.js");

// Singleton simulator instance for the application lifecycle
const defaultSimulator = new CampusNetworkSimulator();

module.exports = {
  CampusNetworkSimulator,
  createBaselineTopology,
  NetworkRCAEngine,
  NetworkRecoveryEngine,
  RECOVERY_ACTIONS,
  SimulationIncidentAdapter,
  SCENARIO_INCIDENT_TEMPLATES,
  defaultSimulator
};
