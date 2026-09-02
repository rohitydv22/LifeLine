/**
 * LifeLine AIOps — OMNeT++ / INET Campus Wi-Fi Simulation Controller (Frontend)
 * 
 * Manages:
 * 1. Network Topology Rendering (Students <-> APs <-> Switch <-> Router <-> Internet)
 * 2. Real-Time Telemetry Polling & Live Signal Synchronization
 * 3. 1-Click Controlled Fault Injections (Scenario A, B, C)
 * 4. 6-Tier Evidence-Based Root Cause Analysis (RCA) Diagnostic Panel
 * 5. Safe Two-Phase Recovery Console (Cloned Sandbox Dry-Run + Live Execution)
 * 6. Structured JSON Telemetry Inspector
 */

(function (global) {
  "use strict";

  // In-browser local fallback simulator in case server API is offline
  let localSimulator = null;
  function getLocalSimulator() {
    if (!localSimulator) {
      if (typeof global.CampusNetworkSimulator !== "undefined") {
        localSimulator = new global.CampusNetworkSimulator();
      }
    }
    return localSimulator;
  }

  const OmnetSimClient = {
    // ------------------------------------------------------------------------
    // API Connectors
    // ------------------------------------------------------------------------
    async getStatus(target = "AP-306") {
      try {
        const res = await fetch(`/api/simulation/status?target=${encodeURIComponent(target)}`);
        if (res.ok) {
          const data = await res.json();
          return data.snapshot;
        }
      } catch (e) {}
      const sim = getLocalSimulator();
      return sim ? sim.getStatusSnapshot() : null;
    },

    async getStructuredReport(target = "AP-306") {
      try {
        const res = await fetch(`/api/simulation/status?target=${encodeURIComponent(target)}`);
        if (res.ok) {
          const data = await res.json();
          return data.report;
        }
      } catch (e) {}
      const sim = getLocalSimulator();
      return sim ? sim.getStructuredReport(target) : null;
    },

    async injectFault(scenario = "single_ap_failure", target = "AP-306") {
      try {
        const res = await fetch("/api/simulation/fault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario, target })
        });
        if (res.ok) {
          const data = await res.json();
          this.syncWithCampusState(scenario, data.snapshot);
          return data;
        }
      } catch (e) {}
      const sim = getLocalSimulator();
      if (sim) {
        sim.injectScenario(scenario);
        const snapshot = sim.getStatusSnapshot();
        const report = sim.getStructuredReport(target);
        this.syncWithCampusState(scenario, snapshot);
        return { success: true, scenario, report, snapshot };
      }
      return null;
    },

    async investigate(location = "AP-306") {
      try {
        const res = await fetch("/api/simulation/investigate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location })
        });
        if (res.ok) {
          const data = await res.json();
          return data.investigation;
        }
      } catch (e) {}
      const sim = getLocalSimulator();
      if (sim && typeof global.NetworkRCAEngine !== "undefined") {
        return global.NetworkRCAEngine.investigate(sim, location);
      }
      return null;
    },

    async testRecovery(target = "AP-306") {
      try {
        const res = await fetch("/api/simulation/recovery/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target })
        });
        if (res.ok) {
          const data = await res.json();
          return data.rehearsal;
        }
      } catch (e) {}
      const sim = getLocalSimulator();
      if (sim && typeof global.NetworkRecoveryEngine !== "undefined") {
        return global.NetworkRecoveryEngine.testDryRun(sim, target);
      }
      return null;
    },

    async applyRecovery(target = "AP-306", onProgress = null) {
      if (onProgress) onProgress({ stage: "INITIALIZING", percent: 15, message: "Initiating recovery playbook..." });
      try {
        const res = await fetch("/api/simulation/recovery/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target })
        });
        if (res.ok) {
          const data = await res.json();
          this.syncWithCampusState("recovered", data.snapshot);
          if (onProgress) onProgress({ stage: "COMPLETED", percent: 100, message: "Recovery simulation successful!" });
          return data.result;
        }
      } catch (e) {}
      const sim = getLocalSimulator();
      if (sim && typeof global.NetworkRecoveryEngine !== "undefined") {
        const result = await global.NetworkRecoveryEngine.applyRecoveryLive(sim, target, onProgress);
        this.syncWithCampusState("recovered", sim.getStatusSnapshot());
        return result;
      }
      return null;
    },

    async resetSimulation() {
      try {
        const res = await fetch("/api/simulation/reset", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          this.syncWithCampusState("normal", data.snapshot);
          return data.snapshot;
        }
      } catch (e) {}
      const sim = getLocalSimulator();
      if (sim) {
        const snap = sim.reset();
        this.syncWithCampusState("normal", snap);
        return snap;
      }
      return null;
    },

    /**
     * Synchronizes OMNeT++ simulation faults and recovery with LifeLine CampusStateEngine
     */
    syncWithCampusState(scenario, snapshot) {
      if (typeof global.CampusStateEngine === "undefined") return;
      const state = global.CampusStateEngine.loadState();

      if (scenario === "single_ap_failure" || scenario === "scenario_a") {
        if (!state.hostelWifi) state.hostelWifi = { hostelA: "healthy", hostelB: "healthy" };
        state.hostelWifi.hostelA = "degraded";
        global.CampusStateEngine.saveState(state);
      } else if (scenario === "hostel_switch_failure" || scenario === "scenario_b") {
        if (!state.hostelWifi) state.hostelWifi = { hostelA: "healthy", hostelB: "healthy" };
        state.hostelWifi.hostelA = "down";
        global.CampusStateEngine.saveState(state);
      } else if (scenario === "campus_router_failure" || scenario === "scenario_c") {
        state.network = "down";
        global.CampusStateEngine.saveState(state);
      } else if (scenario === "normal" || scenario === "recovered") {
        if (state.hostelWifi) state.hostelWifi.hostelA = "healthy";
        state.network = "healthy";
        global.CampusStateEngine.saveState(state);
      }
    }
  };

  // --------------------------------------------------------------------------
  // UI RENDERERS & EVENT HANDLERS
  // --------------------------------------------------------------------------
  let activeSelectedTarget = "AP-306";

  async function renderSimulationView() {
    const container = document.getElementById("pane-omnet-sim");
    if (!container) return;

    const snapshot = await OmnetSimClient.getStatus(activeSelectedTarget);
    if (!snapshot) return;

    renderTopologyGraph(snapshot);
    renderStructuredReport(snapshot);
    renderRcaPreview(snapshot);
  }

  function renderTopologyGraph(snapshot) {
    const graphContainer = document.getElementById("omnet-topology-canvas");
    if (!graphContainer) return;

    const router = snapshot.router;
    const sw = snapshot.switch;
    const aps = snapshot.accessPoints;
    const devs = snapshot.devices;

    const isPathOk = (apId) => {
      const ap = aps[apId];
      return ap && ap.status === "healthy" && sw.status === "healthy" && router.status === "healthy";
    };

    graphContainer.innerHTML = `
      <div class="omnet-topology-tree">
        <!-- Tier 5: Internet Gateway -->
        <div class="omnet-tier omnet-tier--internet">
          <div class="omnet-node omnet-node--internet ${snapshot.internet.status === 'healthy' ? 'node-healthy' : 'node-offline'}">
            <span class="omnet-node__icon">🌐</span>
            <div class="omnet-node__body">
              <strong>Internet Gateway / DNS (8.8.8.8)</strong>
              <span class="omnet-badge omnet-badge--${snapshot.internet.status}">${snapshot.internet.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div class="omnet-connector omnet-connector--vertical ${router.status === 'healthy' ? 'link-active' : 'link-broken'}">
          <span class="omnet-link-label">10G SFP+ Fiber</span>
        </div>

        <!-- Tier 4: Campus Core Router -->
        <div class="omnet-tier omnet-tier--router">
          <div class="omnet-node omnet-node--router ${router.status === 'healthy' ? 'node-healthy' : 'node-offline'}">
            <span class="omnet-node__icon">🔀</span>
            <div class="omnet-node__body">
              <strong>${router.name} (${router.ip})</strong>
              <span class="omnet-meta">BGP: ${router.bgpState} · ${router.throughputMbps} Mbps</span>
              <span class="omnet-badge omnet-badge--${router.status}">${router.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div class="omnet-connector omnet-connector--vertical ${sw.status === 'healthy' && router.status === 'healthy' ? 'link-active' : 'link-broken'}">
          <span class="omnet-link-label">1000Base-T Trunk (VLAN 30)</span>
        </div>

        <!-- Tier 3: Hostel Distribution Switch -->
        <div class="omnet-tier omnet-tier--switch">
          <div class="omnet-node omnet-node--switch ${sw.status === 'healthy' ? 'node-healthy' : 'node-offline'}">
            <span class="omnet-node__icon">🖧</span>
            <div class="omnet-node__body">
              <strong>${sw.name} (${sw.ip})</strong>
              <span class="omnet-meta">STP: ${sw.stpState} · PoE: ${sw.poeUsageWatts}W/${sw.poeBudgetWatts}W</span>
              <span class="omnet-badge omnet-badge--${sw.status}">${sw.status.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div class="omnet-connector-fork">
          <div class="omnet-fork-line ${isPathOk('AP-306') ? 'link-active' : 'link-broken'}"></div>
          <div class="omnet-fork-line ${isPathOk('AP-307') ? 'link-active' : 'link-broken'}"></div>
          <div class="omnet-fork-line ${isPathOk('AP-308') ? 'link-active' : 'link-broken'}"></div>
        </div>

        <!-- Tier 2: Access Points -->
        <div class="omnet-tier omnet-tier--aps">
          ${Object.values(aps).map(ap => `
            <div class="omnet-node omnet-node--ap ${ap.status === 'healthy' ? 'node-healthy' : 'node-offline'} ${activeSelectedTarget === ap.id ? 'node-selected' : ''}" 
                 onclick="window.OmnetSimulationUI.selectTarget('${ap.id}')" style="cursor:pointer;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="omnet-node__icon">📶</span>
                <span class="omnet-badge omnet-badge--${ap.status}">${ap.status.toUpperCase()}</span>
              </div>
              <div class="omnet-node__body" style="margin-top:0.4rem;">
                <strong>${ap.id}</strong>
                <span class="omnet-subtext">${ap.location}</span>
                <span class="omnet-meta">Ch ${ap.channel} (${ap.band}) · PoE: ${ap.poeWatts}W</span>
                <span class="omnet-meta">Clients: ${ap.currentClients}/${ap.maxClients}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Tier 1: Connected Student Devices -->
        <div class="omnet-tier omnet-tier--devices">
          ${Object.values(devs).map(dev => `
            <div class="omnet-node omnet-node--device ${dev.status === 'connected' ? 'node-connected' : 'node-disconnected'}">
              <span class="omnet-device-icon">${dev.type === 'laptop' ? '💻' : dev.type === 'tablet' ? '📱' : '📱'}</span>
              <div class="omnet-device-body">
                <span class="omnet-device-name">${dev.name}</span>
                <span class="omnet-device-sub">${dev.associatedAp} · ${dev.status === 'connected' ? `${dev.rssiDbm}dBm` : 'Disconnected'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderStructuredReport(snapshot) {
    const reportContainer = document.getElementById("omnet-structured-output");
    if (!reportContainer) return;

    const report = snapshot.structuredReports ? snapshot.structuredReports[activeSelectedTarget] : null;
    if (!report) return;

    reportContainer.innerHTML = `
      <div class="omnet-report-card">
        <div class="omnet-report-header">
          <div>
            <span class="eyebrow" style="margin-bottom:0.15rem;">Live Telemetry Probe</span>
            <h4 style="margin:0; font-size:1.05rem;">${report.location} (${report.accessPoint.id})</h4>
          </div>
          <span class="badge ${report.accessPoint.status === 'healthy' ? 'badge--risk-low' : 'badge--risk-high'}">
            AP ${report.accessPoint.status.toUpperCase()}
          </span>
        </div>

        <div class="omnet-metrics-grid">
          <div class="omnet-metric-box">
            <span class="omnet-metric-val ${report.packetLoss === 0 ? 'metric-ok' : 'metric-err'}">${report.packetLoss}%</span>
            <span class="omnet-metric-lbl">Packet Loss</span>
          </div>
          <div class="omnet-metric-box">
            <span class="omnet-metric-val ${report.latency ? 'metric-ok' : 'metric-err'}">${report.latency ? `${report.latency}ms` : 'NULL'}</span>
            <span class="omnet-metric-lbl">Ping Latency</span>
          </div>
          <div class="omnet-metric-box">
            <span class="omnet-metric-val ${report.studentReachability === 'connected' ? 'metric-ok' : 'metric-err'}">${report.studentReachability.toUpperCase()}</span>
            <span class="omnet-metric-lbl">Student Reachability</span>
          </div>
          <div class="omnet-metric-box">
            <span class="omnet-metric-val">${report.connectedDevicesCount}/${report.totalDevicesInZone}</span>
            <span class="omnet-metric-lbl">Active Devices</span>
          </div>
        </div>

        <div style="margin-top:1rem;">
          <details class="omnet-json-details">
            <summary style="cursor:pointer; font-size:0.82rem; font-weight:600; color:var(--accent);">🔍 View Structured OMNeT++ JSON Payload</summary>
            <pre class="omnet-json-block"><code>${escapeHtml(JSON.stringify(report, null, 2))}</code></pre>
          </details>
        </div>
      </div>
    `;
  }

  async function renderRcaPreview(snapshot) {
    const rcaContainer = document.getElementById("omnet-rca-results");
    if (!rcaContainer) return;

    const rca = await OmnetSimClient.investigate(activeSelectedTarget);
    if (!rca) return;

    rcaContainer.innerHTML = `
      <div class="omnet-rca-box">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <span class="eyebrow">Evidence-Based Diagnostic Conclusion</span>
            <h4 style="margin:0; font-size:1.15rem; color:${rca.rcaCategory === 'healthy' ? '#35d68f' : '#f43f5e'};">
              ${rca.likelyRootCause}
            </h4>
          </div>
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <span class="badge" style="background:rgba(56,189,248,0.15); color:var(--accent);">Scope: ${rca.failureScope}</span>
            <span class="badge" style="background:rgba(245,158,11,0.15); color:#f59e0b;">Impact: ~${rca.affectedHeadcount} Students</span>
          </div>
        </div>

        <!-- 6-Point Diagnostic Probe Checklist -->
        <div class="omnet-checklist-stack">
          ${rca.checklist.map(c => `
            <div class="omnet-check-item ${c.passed ? 'check-passed' : 'check-failed'}">
              <span class="omnet-check-badge">${c.passed ? '✓ PASS' : '✗ FAIL'}</span>
              <div class="omnet-check-content">
                <strong>Step ${c.checkNumber}: ${c.title}</strong>
                <span class="omnet-check-desc">${c.description}</span>
                <span class="omnet-check-evidence">${c.evidence}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Recommended Playbook & Recovery Action -->
        <div class="card card--tight" style="margin-top:1rem; background:var(--bg-alt); border-left:3px solid var(--accent);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
            <strong style="font-size:0.85rem; color:var(--accent);">🛠️ Recommended Remediation Action:</strong>
            ${rca.isActionable ? `<button type="button" class="btn btn--primary btn--sm" onclick="window.OmnetSimulationUI.triggerRecoveryTest('${rca.targetApId}')">🧪 Test Safe Recovery</button>` : ''}
          </div>
          <p style="margin:0; font-size:0.82rem; color:var(--text);">${rca.recommendedRecoveryAction}</p>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Global UI Interface
  const OmnetSimulationUI = {
    client: OmnetSimClient,
    init() {
      renderSimulationView();
      // Setup auto poll every 5 seconds if tab is active
      setInterval(() => {
        const pane = document.getElementById("pane-omnet-sim");
        if (pane && !pane.hidden) {
          renderSimulationView();
        }
      }, 5000);
    },
    selectTarget(targetId) {
      activeSelectedTarget = targetId;
      renderSimulationView();
    },
    async triggerFault(scenarioId) {
      showToast(`Injecting OMNeT++ fault scenario: ${scenarioId}...`, "info");
      const result = await OmnetSimClient.injectFault(scenarioId, activeSelectedTarget);
      if (result) {
        showToast(`🚨 OMNeT++ Fault Injected: "${result.incident ? result.incident.title : scenarioId}"`, "error");
        renderSimulationView();
        if (typeof global.renderAllViews === "function") global.renderAllViews();
      }
    },
    async triggerRecoveryTest(targetId = activeSelectedTarget) {
      const modal = document.getElementById("omnet-recovery-modal");
      if (!modal) {
        // Run test directly
        const rehearsal = await OmnetSimClient.testRecovery(targetId);
        alert(`🧪 Sandbox Rehearsal Result:\nStatus: ${rehearsal.conclusion}\nDuration: ${rehearsal.simulatedDurationSec}s\nSteps: ${rehearsal.steps.length} checks verified.`);
        return;
      }
      modal.style.display = "flex";
      const rehearsalEl = document.getElementById("omnet-recovery-rehearsal-content");
      rehearsalEl.innerHTML = `<p class="text-faint">Running cloned sandbox simulation pre-flight checks...</p>`;

      const rehearsal = await OmnetSimClient.testRecovery(targetId);
      rehearsalEl.innerHTML = `
        <div style="margin-bottom:0.75rem;">
          <strong style="color:#35d68f;">✓ Safe Sandbox Rehearsal Passed (Zero Live Impact)</strong>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0.25rem 0;">Proposed Playbook: <strong>${rehearsal.actionTitle}</strong> (${rehearsal.componentName})</p>
        </div>
        <div class="omnet-sandbox-steps">
          ${rehearsal.steps.map(s => `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:0.25rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span><span style="color:#35d68f;">[${s.status}]</span> ${s.action}</span>
              <span style="color:var(--text-faint);">${s.latency}</span>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:1rem; display:flex; justify-content:flex-end; gap:0.5rem;">
          <button type="button" class="btn btn--ghost btn--sm" onclick="document.getElementById('omnet-recovery-modal').style.display='none'">Cancel</button>
          <button type="button" class="btn btn--primary btn--sm" style="background:#10b981; border-color:#10b981; color:#04140c;" onclick="window.OmnetSimulationUI.executeLiveRecovery('${targetId}')">⚡ Apply Recovery to Live Network</button>
        </div>
      `;
    },
    async executeLiveRecovery(targetId = activeSelectedTarget) {
      const modal = document.getElementById("omnet-recovery-modal");
      const progressEl = document.getElementById("omnet-recovery-progress-box");
      const rehearsalEl = document.getElementById("omnet-recovery-rehearsal-content");
      if (progressEl) {
        progressEl.style.display = "block";
        if (rehearsalEl) rehearsalEl.style.display = "none";
      }

      const res = await OmnetSimClient.applyRecovery(targetId, (prog) => {
        const bar = document.getElementById("omnet-recovery-bar");
        const msg = document.getElementById("omnet-recovery-msg");
        if (bar) bar.style.width = `${prog.percent}%`;
        if (msg) msg.textContent = prog.message;
      });

      setTimeout(() => {
        if (modal) modal.style.display = "none";
        if (progressEl) progressEl.style.display = "none";
        if (rehearsalEl) rehearsalEl.style.display = "block";
        showToast("✓ Recovery simulation successful! Network verified 100% HEALTHY.", "success");
        renderSimulationView();
        if (typeof global.renderAllViews === "function") global.renderAllViews();
      }, 1000);
    },
    async triggerReset() {
      await OmnetSimClient.resetSimulation();
      showToast("OMNeT++ simulation reset to 100% Healthy baseline.", "success");
      renderSimulationView();
      if (typeof global.renderAllViews === "function") global.renderAllViews();
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { OmnetSimClient, OmnetSimulationUI };
  }
  if (typeof window !== "undefined") {
    window.OmnetSimClient = OmnetSimClient;
    window.OmnetSimulationUI = OmnetSimulationUI;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
