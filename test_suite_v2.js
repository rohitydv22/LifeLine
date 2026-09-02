// ============================================================================
// Comprehensive Automated Integration Test Suite for LifeLine AIOps
// ============================================================================

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('🧪 RUNNING LIFELINE AIOPS AUTOMATED VERIFICATION SUITE');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: HTML Files & Script Links Integrity
  // --------------------------------------------------------------------------
  console.log('--- Test Group 1: HTML Files Integrity & Zero Dead Links ---');
  const htmlFiles = ['index.html', 'login.html', 'admin-login.html', 'register.html', 'report.html', 'admin.html'];
  
  htmlFiles.forEach(file => {
    const fullPath = path.join(__dirname, 'lifeline', file);
    assert(fs.existsSync(fullPath), `File exists: ${file}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(content.includes('css/style.css') || content.includes('tailwindcss'), `${file} links to stylesheet`);
    assert(!content.includes('⚡ 1-Click Demo'), `${file} has NO fake 1-click login buttons`);
    assert(!content.includes('btn-demo-warden'), `${file} has NO legacy warden fake buttons`);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Authentication & Role Boundary Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Account Store & Role Boundary Security ---');
  
  // Mock localStorage and window for node test environment
  const mockStorage = {};
  global.localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };
  global.window = {
    location: { origin: 'http://localhost:5500', href: 'http://localhost:5500', protocol: 'http:' },
    localStorage: global.localStorage,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });


  // Load supabase-client.js in node context
  const authModuleCode = fs.readFileSync(path.join(__dirname, 'lifeline/js/supabase-client.js'), 'utf8');
  eval(authModuleCode);


  const studentAuth = window.authenticateCredentials('student@lifeline.campus', 'student123');
  assert(studentAuth !== null && studentAuth.role === 'student', 'Student account authenticates with role student');

  const staffAuth = window.authenticateCredentials('staff@lifeline.campus', 'staff123');
  assert(staffAuth !== null && staffAuth.role === 'staff', 'Staff account authenticates with role staff');

  const authorityAuth = window.authenticateCredentials('authority@lifeline.campus', 'authority123');
  assert(authorityAuth !== null && authorityAuth.role === 'authority', 'Authority account authenticates with role authority');

  const wrongAuth = window.authenticateCredentials('student@lifeline.campus', 'wrongpassword');
  assert(wrongAuth === null, 'Wrong password correctly returns null');

  // Test session separation
  window.setStudentSession({ user: studentAuth, profile: studentAuth });
  assert(window.getStudentSession() !== null, 'Student session successfully saved to role-isolated key');
  assert(window.getStaffSession() === null, 'Staff session is NOT accessible via student login');

  window.setStaffSession({ user: staffAuth, profile: staffAuth });
  assert(window.getStaffSession() !== null, 'Staff session saved to role-isolated key');



  // --------------------------------------------------------------------------
  // TEST GROUP 3: Multi-Campus & Incident Correlation Engine
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Multi-Campus & Multi-Report Grouping Engine ---');

  const CampusStateEngine = require('./lifeline/js/campus-state.js');
  CampusStateEngine.resetAllCampusState();

  assert(Object.keys(CampusStateEngine.CAMPUSES).length === 3, 'Multi-Campus directory defines 3 distinct campuses');
  assert(CampusStateEngine.getActiveCampus() === 'main', 'Default active campus is Main Campus');

  CampusStateEngine.setActiveCampus('north');
  assert(CampusStateEngine.getActiveCampus() === 'north', 'Active campus switches cleanly to North Campus');
  CampusStateEngine.setActiveCampus('main');

  // Simulate 500 reports surge for Hostel A Wi-Fi
  const surgeInc = CampusStateEngine.simulateReportSurge({
    category: 'network',
    location: 'Hostel A (All Floors)',
    count: 500,
    description: '500 students reported Wi-Fi disconnected across Hostel A'
  });

  assert(surgeInc !== null, 'High-volume surge returns Master Incident');
  assert(surgeInc.relatedReportsCount === 500, 'Master Incident aggregates 500 related reports');
  assert(surgeInc.usersAffected === 500, 'Master Incident records 500 affected students');
  assert(surgeInc.operationalPriority === 'P1 - Critical', 'High-volume impact correctly escalates to P1 - Critical');

  // Verify only 1 Master Incident exists in active incidents list (not 500 duplicates)
  const activeIncidents = CampusStateEngine.loadIncidents();
  const hostelIncidents = activeIncidents.filter(i => i.title.includes('Hostel A Wi-Fi'));
  assert(hostelIncidents.length === 1, '500 student reports are aggregated into exactly 1 Master Incident');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Realistic Sandbox Simulation (Pass & Fail)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Realistic Sandbox Simulation (Pass vs Fail) ---');

  // Test Failure path
  const failSandboxResult = CampusStateEngine.runClonedSandboxSimulation(surgeInc.id, true);
  assert(failSandboxResult.rehearsalPassed === false, 'Sandbox Failure Simulation returns rehearsalPassed = false');
  const updatedIncFail = CampusStateEngine.loadIncidents().find(i => i.id === surgeInc.id);
  assert(updatedIncFail.status === 'SANDBOX_FAILED', 'Incident status transitions to SANDBOX_FAILED');

  // Test Pass path
  const passSandboxResult = CampusStateEngine.runClonedSandboxSimulation(surgeInc.id, false);
  assert(passSandboxResult.rehearsalPassed === true, 'Sandbox Pass Simulation returns rehearsalPassed = true');
  const updatedIncPass = CampusStateEngine.loadIncidents().find(i => i.id === surgeInc.id);
  assert(updatedIncPass.status === 'SANDBOXED', 'Incident status transitions to SANDBOXED');

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Human Authority Governance (Approve / Reject)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Human Authority Governance Gates ---');

  // Test Rejection
  const rejectedInc = CampusStateEngine.rejectIncidentRecovery(surgeInc.id, 'Dr. K. S. Ramanathan', 'Authority', 'Holding for maintenance window at 23:00');
  assert(rejectedInc.status === 'REJECTED', 'Incident transitions to REJECTED');
  assert(rejectedInc.rejectionRemarks.includes('23:00'), 'Rejection remarks are recorded');

  // Test Approval
  const approvedInc = CampusStateEngine.approveIncidentRecovery(surgeInc.id, 'Dr. K. S. Ramanathan', 'Authority');
  assert(approvedInc.status === 'APPROVED', 'Incident transitions to APPROVED');
  assert(approvedInc.approvedBy === 'Dr. K. S. Ramanathan', 'Approver name is logged');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Dynamic MTTD & MTTR Calculations
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Dynamic MTTD & MTTR Real Calculations ---');

  CampusStateEngine.recordMttd('Test Probe 1', 2.2);
  CampusStateEngine.recordMttd('Test Probe 2', 2.6);
  CampusStateEngine.recordMttr('Test Recovery 1', 2.4);
  CampusStateEngine.recordMttr('Test Recovery 2', 2.8);

  const dynamicMetrics = CampusStateEngine.calculateDynamicMetrics();
  assert(dynamicMetrics.avgMttd.endsWith('s') && !isNaN(parseFloat(dynamicMetrics.avgMttd)), 'Dynamic MTTD is properly computed');
  assert(dynamicMetrics.avgMttr.endsWith('s') && !isNaN(parseFloat(dynamicMetrics.avgMttr)), 'Dynamic MTTR is properly computed');

  // --------------------------------------------------------------------------
  // TEST GROUP 7: HTTP Server Endpoints Response Check
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 7: Local Server HTTP Endpoints ---');

  const { startServer } = require('./server.js');
  const TEST_SERVER_PORT = 5588;
  process.env.PORT = String(TEST_SERVER_PORT);
  startServer(TEST_SERVER_PORT);
  await new Promise(r => setTimeout(r, 600));

  const checkUrl = (urlPath) => {
    return new Promise((resolve) => {
      http.get(`http://localhost:${TEST_SERVER_PORT}${urlPath}`, (res) => {
        resolve({ status: res.statusCode, path: urlPath });
      }).on('error', (err) => {
        resolve({ status: 500, error: err.message, path: urlPath });
      });
    });
  };

  const endpoints = ['/index.html', '/login.html', '/admin-login.html', '/report.html', '/admin.html', '/api/config', '/api/simulation/status'];
  for (const ep of endpoints) {
    const res = await checkUrl(ep);
    assert(res.status === 200, `HTTP Endpoint returns 200 OK: ${ep}`);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`🏁 TEST RUN SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITH ZERO ERRORS!');
    console.log('============================================================\n');
    process.exit(0);
  } else {
    console.error(`⚠️ ${failedTests} TESTS FAILED.`);
    console.log('============================================================\n');
    process.exit(1);
  }
}

runTests();
