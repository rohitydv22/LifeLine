// ============================================================================
// LifeLine AIOps — OMNeT++ / INET Campus Wi-Fi Simulation Unit & E2E Tests
// ============================================================================

const {
  CampusNetworkSimulator,
  createBaselineTopology,
  NetworkRCAEngine,
  NetworkRecoveryEngine,
  SimulationIncidentAdapter
} = require('./simulation/index.js');

console.log("============================================================");
console.log("LifeLine OMNeT++ / INET Campus Wi-Fi Simulation Test Suite");
console.log("============================================================");

let testsPassed = 0;
let totalTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// TEST 1: Baseline Normal Campus Scenario
// ----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 1: Baseline Normal Network Scenario ---");
const sim = new CampusNetworkSimulator();
sim.reset();
const normalSnap = sim.getStatusSnapshot();

assert(normalSnap.overallStatus === "healthy", "Overall network topology is HEALTHY");
assert(normalSnap.router.status === "healthy", "Campus Core Router is HEALTHY", `IP: ${normalSnap.router.ip}`);
assert(normalSnap.switch.status === "healthy", "Hostel A Switch is HEALTHY", `PoE: ${normalSnap.switch.poeUsageWatts}W`);
assert(normalSnap.accessPoints["AP-306"].status === "healthy", "AP-306 in Room 306 is HEALTHY");
assert(normalSnap.accessPoints["AP-307"].status === "healthy", "AP-307 in Room 307 is HEALTHY");
assert(normalSnap.accessPoints["AP-308"].status === "healthy", "AP-308 in Lounge is HEALTHY");

const reportNormal = sim.getStructuredReport("AP-306");
assert(reportNormal.packetLoss === 0, "Normal packet loss is 0%", `Actual: ${reportNormal.packetLoss}%`);
assert(reportNormal.latency !== null && reportNormal.latency > 5, "Normal latency is realistic", `RTT: ${reportNormal.latency}ms`);
assert(reportNormal.studentReachability === "connected", "Student devices in Room 306 are connected");

const rcaNormal = NetworkRCAEngine.investigate(sim, "AP-306");
assert(rcaNormal.likelyRootCause === "Normal Network Operations", "RCA on healthy state returns Normal Operations");
assert(rcaNormal.checklist.every(c => c.passed), "All 6 diagnostic checklist probes PASS in healthy state");

// ----------------------------------------------------------------------------
// TEST 2: Scenario A — Single Access Point Failure (AP-306 Offline)
// ----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 2: Fault Scenario A (Single AP Failure - AP-306) ---");
sim.injectScenario("single_ap_failure");
const reportA = sim.getStructuredReport("AP-306");

assert(reportA.accessPoint.status === "offline", "AP-306 transitioned to OFFLINE");
assert(reportA.packetLoss === 100, "Packet loss spiked to 100% for Room 306 clients");
assert(reportA.latency === null, "Ping latency is NULL for offline AP");
assert(reportA.studentReachability === "unreachable", "Room 306 student devices unreachable");
assert(reportA.nearbyAccessPoints === "healthy", "Nearby APs (AP-307, AP-308) remain HEALTHY");
assert(reportA.hostelNetwork === "healthy", "Hostel A distribution switch remains HEALTHY");
assert(reportA.campusNetwork === "healthy", "Campus Core Router remains HEALTHY");

// Run 6-Step Multi-Tier RCA
const rcaA = NetworkRCAEngine.investigate(sim, "Hostel A - Room 306");
assert(rcaA.checklist[0].passed === false, "Check 1: Student Device Association FAILS (Disconnected)");
assert(rcaA.checklist[1].passed === false, "Check 2: AP-306 Reachability FAILS (Offline)");
assert(rcaA.checklist[2].passed === true, "Check 3: Nearby AP Correlation PASSES (Nearby are Healthy)");
assert(rcaA.checklist[3].passed === true, "Check 4: Hostel Switch PASSES (Switch is Healthy)");
assert(rcaA.checklist[4].passed === true, "Check 5: Campus Router PASSES (Router is Healthy)");
assert(rcaA.checklist[5].passed === true, "Check 6: Internet Gateway PASSES (External Net Reachable)");
assert(rcaA.likelyRootCause === "Local Access Point Failure", "RCA correctly diagnoses Local Access Point Failure", `Got: "${rcaA.likelyRootCause}"`);
assert(rcaA.failureScope.includes("Localized"), "Failure scope is Localized (Room 306)", `Scope: ${rcaA.failureScope}`);
assert(rcaA.affectedHeadcount === 4, "Estimated affected headcount is 4 students");

// Incident Adapter
const incidentA = SimulationIncidentAdapter.createIncidentFromSimulation("single_ap_failure", sim);
assert(incidentA.title.includes("Room 306"), "Incident title accurately references Room 306");
assert(incidentA.likelyCause === "Local Access Point Failure", "Incident likely cause matches RCA finding");
assert(incidentA.supportingEvidence.length >= 3, "Incident contains supporting simulation telemetry evidence");

// ----------------------------------------------------------------------------
// TEST 3: Scenario B — Hostel Switch Outage (SW-HostelA Offline)
// ----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 3: Fault Scenario B (Hostel Switch Outage - SW-HostelA) ---");
sim.injectScenario("hostel_switch_failure");
const reportB = sim.getStructuredReport("AP-306");

assert(reportB.hostelNetwork === "offline", "Hostel Switch SW-HostelA is OFFLINE");
assert(reportB.accessPoint.status === "offline", "AP-306 dropped backhaul uplink");
assert(reportB.nearbyAccessPoints === "offline", "All nearby APs in Hostel A dropped offline");
assert(reportB.campusNetwork === "healthy", "Campus Core Router remains HEALTHY");

const rcaB = NetworkRCAEngine.investigate(sim, "AP-306");
assert(rcaB.checklist[3].passed === false, "Check 4: Hostel Switch FAILS (Switch Offline)");
assert(rcaB.likelyRootCause === "Hostel Distribution Switch Failure", "RCA correctly diagnoses Hostel Distribution Switch Failure");
assert(rcaB.failureScope.includes("Building/Hostel-Wide"), "Failure scope is Building/Hostel-Wide");
assert(rcaB.affectedHeadcount === 450, "Estimated affected headcount is ~450 students across Hostel A");

// ----------------------------------------------------------------------------
// TEST 4: Scenario C — Campus Core Router Failure (Router-CampusCore)
// ----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 4: Fault Scenario C (Campus Core Router Outage) ---");
sim.injectScenario("campus_router_failure");
const reportC = sim.getStructuredReport("AP-306");

assert(reportC.campusNetwork === "offline", "Campus Core Router is OFFLINE");
assert(reportC.packetLoss === 100, "Packet loss is 100% due to dropped default gateway");

const rcaC = NetworkRCAEngine.investigate(sim, "AP-306");
assert(rcaC.checklist[4].passed === false, "Check 5: Campus Core Router FAILS");
assert(rcaC.likelyRootCause === "Campus Core Gateway Failure", "RCA correctly diagnoses Campus Core Gateway Failure");
assert(rcaC.failureScope.includes("Campus-Wide"), "Failure scope is Campus-Wide");
assert(rcaC.affectedHeadcount === 7500, "Estimated affected headcount is ~7,500 students across campus");

// ----------------------------------------------------------------------------
// TEST 5: Safe Two-Phase Recovery Simulation
// ----------------------------------------------------------------------------
console.log("\n--- TEST SECTION 5: Safe Two-Phase Recovery Simulation ---");
// Set state to AP-306 failure
sim.injectScenario("single_ap_failure");
assert(sim.topology.accessPoints["AP-306"].status === "offline", "Pre-recovery state: AP-306 is OFFLINE");

// Phase 1: Dry-Run Sandbox Rehearsal
const dryRun = NetworkRecoveryEngine.testDryRun(sim, "AP-306");
assert(dryRun.isDryRun === true, "Phase 1 is marked as Dry-Run");
assert(dryRun.rehearsalPassed === true, "Sandbox rehearsal pre-flight checks PASSED");
assert(dryRun.steps.length >= 4, "Sandbox rehearsal verified multiple verification steps", `Steps: ${dryRun.steps.length}`);
assert(sim.topology.accessPoints["AP-306"].status === "offline", "Live state remains safely protected (OFFLINE) after dry run");

// Phase 2: Live Recovery Execution
async function testLiveRecovery() {
  const stepsLogged = [];
  const liveResult = await NetworkRecoveryEngine.applyRecoveryLive(sim, "AP-306", (prog) => {
    stepsLogged.push(prog.stage);
  });

  assert(liveResult.success === true, "Live recovery execution returned SUCCESS");
  assert(liveResult.mttrSeconds > 0, "Actual MTTR measured in seconds", `MTTR: ${liveResult.mttrSeconds}s`);
  assert(sim.topology.accessPoints["AP-306"].status === "healthy", "AP-306 live state recovered to HEALTHY");
  assert(sim.topology.devices["student306_Laptop"].status === "connected", "Student devices re-associated to AP-306");

  const postRecoveryReport = sim.getStructuredReport("AP-306");
  assert(postRecoveryReport.packetLoss === 0, "Packet loss returned to 0% after recovery");
  assert(postRecoveryReport.latency !== null, "Ping latency restored", `RTT: ${postRecoveryReport.latency}ms`);
}

testLiveRecovery().then(() => {
  console.log("\n============================================================");
  console.log(`OMNeT++ Wi-Fi Simulation Test Results: ${testsPassed}/${totalTests} PASSED (${Math.round((testsPassed/totalTests)*100)}%)`);
  console.log("============================================================\n");
  if (testsPassed !== totalTests) {
    process.exit(1);
  }
}).catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
