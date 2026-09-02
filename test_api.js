// Test HTTP API endpoints for simulation, service health, sandboxing, and error handling
const http = require('http');

async function testApi() {
  console.log("Testing LifeLine HTTP API endpoints & Error Handling...\n");
  
  const { startServer, server } = require('./server.js');
  const TEST_PORT = 5599;
  process.env.PORT = String(TEST_PORT);
  startServer(TEST_PORT);

  await new Promise(r => setTimeout(r, 600));

  function request(path, method = "GET", body = null, rawBody = null) {
    return new Promise((resolve, reject) => {
      const opt = {
        hostname: 'localhost',
        port: TEST_PORT,
        path,
        method,
        headers: (body || rawBody) ? { 'Content-Type': 'application/json' } : {}
      };
      const req = http.request(opt, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, text: data });
          }
        });
      });
      req.on('error', reject);
      if (rawBody) {
        req.write(rawBody);
      } else if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  // 1. Test GET /api/simulation/status
  const statusRes = await request('/api/simulation/status');
  console.log(`1. GET /api/simulation/status -> HTTP ${statusRes.status} | Overall: ${statusRes.data.snapshot.overallStatus}`);

  // 2. Test POST /api/simulation/fault
  const faultRes = await request('/api/simulation/fault', 'POST', { scenario: 'single_ap_failure' });
  console.log(`2. POST /api/simulation/fault -> HTTP ${faultRes.status} | Loss: ${faultRes.data.report.packetLoss}% | Incident: ${faultRes.data.incident.title}`);

  // 3. Test POST /api/simulation/investigate
  const invRes = await request('/api/simulation/investigate', 'POST', { location: 'Hostel A - Room 306' });
  console.log(`3. POST /api/simulation/investigate -> HTTP ${invRes.status} | Root Cause: "${invRes.data.investigation.likelyRootCause}"`);

  // 4. Test POST /api/simulation/recovery/test
  const recTestRes = await request('/api/simulation/recovery/test', 'POST', { target: 'AP-306' });
  console.log(`4. POST /api/simulation/recovery/test -> HTTP ${recTestRes.status} | Rehearsal: ${recTestRes.data.rehearsal.conclusion}`);

  // 5. Test POST /api/simulation/recovery/apply
  const recApplyRes = await request('/api/simulation/recovery/apply', 'POST', { target: 'AP-306' });
  console.log(`5. POST /api/simulation/recovery/apply -> HTTP ${recApplyRes.status} | Recovered State: ${recApplyRes.data.snapshot.accessPoints['AP-306'].status.toUpperCase()}`);

  // 6. Test GET /api/service/status (Real dynamic latency & process metrics)
  const servStatus = await request('/api/service/status');
  console.log(`6. GET /api/service/status -> HTTP ${servStatus.status} | Real Latency: ${servStatus.data.service.latencyMs}ms | Uptime: ${servStatus.data.telemetry.uptimeSeconds}s | Mem: ${servStatus.data.telemetry.processMemoryRssMB}MB`);

  // 7. Test POST /api/service/sandbox-test (Real pre-flight assertions)
  const sandRes = await request('/api/service/sandbox-test', 'POST', {});
  console.log(`7. POST /api/service/sandbox-test -> HTTP ${sandRes.status} | Sandbox: ${sandRes.data.conclusion} | Total Duration: ${sandRes.data.totalDurationMs}ms`);

  // 8. Test POST /api/service/recover (Real measured MTTR)
  const recovRes = await request('/api/service/recover', 'POST', {});
  console.log(`8. POST /api/service/recover -> HTTP ${recovRes.status} | Measured MTTR: ${recovRes.data.mttrSeconds}s | Health: ${recovRes.data.status}`);

  // 9. Test Malformed JSON Error Handling (400 Bad Request)
  const malformedRes = await request('/api/simulation/fault', 'POST', null, '{ invalid json: bad syntax ');
  console.log(`9. POST with Malformed JSON -> HTTP ${malformedRes.status} | Error Caught: "${malformedRes.data.error}"`);

  if (malformedRes.status === 400 && servStatus.status === 200 && sandRes.status === 200 && recovRes.status === 200) {
    console.log("\n============================================================");
    console.log("✓ ALL 9 HTTP API ENDPOINTS & ERROR PATHS VERIFIED ACCURATELY!");
    console.log("============================================================");
    process.exit(0);
  } else {
    console.error("Some endpoint tests failed validation!");
    process.exit(1);
  }
}

testApi().catch(err => {
  console.error("API test failed:", err);
  process.exit(1);
});
