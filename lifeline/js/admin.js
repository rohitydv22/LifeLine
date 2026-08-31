// ============================================================================
// LifeLine by Cognora — Admin & AIOps Operations Controller (v2.0)
// ============================================================================

let adminUser = null;
let adminProfile = null;
let currentTab = "topology";
let pendingModalIncident = null;
let filterStatus = "all";

(async function init() {
  const auth = await requireAdmin();
  if (!auth) return;
  adminUser = auth.user;
  adminProfile = auth.profile;

  wireLogoutButton();
  wireTabs();
  wireQuickReset();
  wireConfirmationModal();
  wireFilterChips();

  // Initial Render of All Sections
  renderAllViews();

  // Subscribe to central state changes (including cross-tab storage events)
  if (typeof CampusStateEngine !== "undefined" && CampusStateEngine.subscribe) {
    CampusStateEngine.subscribe((event, payload) => {
      renderAllViews();
    });
  }
})();

function renderAllViews() {
  updateGlobalStats();
  renderTopology();
  renderFaultInjectionConsole();
  renderIncidentsList();
  renderApprovalQueue();
  renderAiDecisionInspector();
  renderWorkOrders();
  renderEvidenceGallery();
  renderMetricsDashboard();
  renderUnifiedAuditTrail();
}

// ----------------------------------------------------------------------------
// 1. GLOBAL STATS & TAB SWITCHING
// ----------------------------------------------------------------------------
function wireTabs() {
  document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      
      const tabId = btn.dataset.tab;
      currentTab = tabId;

      document.querySelectorAll(".admin-tab-pane").forEach((pane) => {
        pane.hidden = true;
      });

      const activePane = document.getElementById(`pane-${tabId}`);
      if (activePane) activePane.hidden = false;
    });
  });
}

function wireFilterChips() {
  document.querySelectorAll("#status-filters .filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#status-filters .filter-chip").forEach(b => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      filterStatus = btn.dataset.status;
      renderIncidentsList();
    });
  });
}

function wireQuickReset() {
  const btn = document.getElementById("btn-quick-reset");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (confirm("Reset all campus infrastructure nodes to baseline HEALTHY?")) {
      CampusStateEngine.resetAllCampusState();
      showToast("Campus infrastructure state reset to 100% Healthy.", "success");
      renderAllViews();
    }
  });

  const clearAuditBtn = document.getElementById("btn-clear-audit");
  if (clearAuditBtn) {
    clearAuditBtn.addEventListener("click", () => {
      const trail = CampusStateEngine.loadAuditTrail();
      const blob = new Blob([JSON.stringify(trail, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeline-audit-export-${Date.now()}.json`;
      a.click();
      showToast("Audit trail exported successfully.", "success");
    });
  }
}

function updateGlobalStats() {
  const state = CampusStateEngine.loadState();
  const incidents = CampusStateEngine.loadIncidents();
  const metrics = CampusStateEngine.loadMetrics();

  // Compute Health %
  const nodes = [
    state.website, state.studentPortal, state.lms, state.network,
    state.hostelWifi.hostelA, state.hostelWifi.hostelB,
    state.servers, state.database, state.waterSystems, state.messFacilities
  ];
  const healthyCount = nodes.filter(s => s === "healthy").length;
  const healthPct = Math.round((healthyCount / nodes.length) * 100);

  const healthEl = document.getElementById("stat-infra-health");
  if (healthEl) {
    healthEl.textContent = `${healthPct}%`;
    healthEl.style.color = healthPct > 80 ? "#35d68f" : healthPct > 50 ? "#f59e0b" : "#ef4444";
  }

  const activeInc = incidents.filter(i => i.status !== "RESOLVED");
  const pendingAppr = incidents.filter(i => i.status === "DETECTED" || i.status === "ANALYZED" || i.status === "SANDBOXED");

  const incCountEl = document.getElementById("stat-active-incidents");
  if (incCountEl) incCountEl.textContent = activeInc.length;

  const apprCountEl = document.getElementById("stat-pending-approvals");
  if (apprCountEl) apprCountEl.textContent = pendingAppr.length;

  const badgeInc = document.getElementById("badge-incident-count");
  if (badgeInc) badgeInc.textContent = activeInc.length;

  // MTTD / MTTR Averages
  const avgMttd = metrics.mttdHistory.length
    ? (metrics.mttdHistory.reduce((a, b) => a + b.seconds, 0) / metrics.mttdHistory.length).toFixed(1)
    : "2.8";
  const avgMttr = metrics.mttrHistory.length
    ? (metrics.mttrHistory.reduce((a, b) => a + b.seconds, 0) / metrics.mttrHistory.length).toFixed(1)
    : "5.4";

  const mttdEl = document.getElementById("stat-avg-mttd");
  const mttrEl = document.getElementById("stat-avg-mttr");
  if (mttdEl) mttdEl.textContent = `${avgMttd}s`;
  if (mttrEl) mttrEl.textContent = `${avgMttr}s`;
}

// ----------------------------------------------------------------------------
// 2. LIVE CAMPUS TOPOLOGY
// ----------------------------------------------------------------------------
function renderTopology() {
  const grid = document.getElementById("topology-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const state = CampusStateEngine.loadState();
  const meta = CampusStateEngine.SERVICE_METADATA;

  Object.entries(meta).forEach(([key, info]) => {
    let nodeStatus = "healthy";
    if (key.includes("hostelWifi_")) {
      const sub = key.split("_")[1];
      nodeStatus = state.hostelWifi[sub] || "healthy";
    } else {
      nodeStatus = state[key] || "healthy";
    }

    const card = el("div", { class: `topology-card card` });

    const top = el("div", { class: "topology-card__top" }, [
      el("div", { style: "display:flex; align-items:center; gap:0.6rem;" }, [
        el("span", { class: "topology-card__icon" }, info.icon),
        el("div", {}, [
          el("h3", { class: "topology-card__name" }, info.name),
          el("span", { class: "topology-card__scope" }, `${info.category.toUpperCase()} · Criticality ${info.criticality}/5`),
        ])
      ]),
      el("span", { class: `node-status-badge node--${nodeStatus}` }, [
        el("span", { class: "status-dot" }),
        nodeStatus
      ])
    ]);

    const details = el("div", { style: "display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-muted); margin-top:0.75rem; border-top:1px solid var(--border-soft); padding-top:0.6rem;" }, [
      el("span", {}, `👥 Users: ${info.defaultUsers.toLocaleString()}`),
      el("span", {}, `📍 Scope: ${info.scope}`),
      el("span", {}, `⚡ Tier ${info.criticality}`)
    ]);

    card.appendChild(top);
    card.appendChild(details);
    grid.appendChild(card);
  });
}

// ----------------------------------------------------------------------------
// 3. FAULT INJECTION CONSOLE
// ----------------------------------------------------------------------------
function renderFaultInjectionConsole() {
  const digitalGrid = document.getElementById("fault-grid-digital");
  const physicalGrid = document.getElementById("fault-grid-physical");
  const safetyGrid = document.getElementById("fault-grid-safety");
  if (!digitalGrid || !physicalGrid || !safetyGrid) return;

  digitalGrid.innerHTML = "";
  physicalGrid.innerHTML = "";
  safetyGrid.innerHTML = "";

  const scenarios = Object.values(CampusStateEngine.FAULT_SCENARIOS);

  scenarios.forEach(sc => {
    const card = el("div", { class: `fault-card fault-card--${sc.category}` });

    const content = el("div", {}, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.25rem;" }, [
        el("h4", { class: "fault-card__title" }, sc.title),
        el("span", { class: `badge badge--risk-${sc.severity === 'critical' ? 'high' : sc.severity}` }, sc.severity.toUpperCase())
      ]),
      el("p", { class: "fault-card__desc" }, sc.description),
      el("div", { class: "fault-card__meta" }, [
        el("span", {}, `🎯 Target: ${sc.target}`),
        el("span", {}, `👥 Impact: ~${sc.usersAffected.toLocaleString()} users`),
        el("span", {}, `⏱️ Est: ${sc.recoveryTimeSec ? sc.recoveryTimeSec + 's' : 'Work Order'}`)
      ])
    ]);

    const btn = el("button", {
      type: "button",
      class: "btn btn--fault-trigger",
      onclick: () => triggerFaultScenario(sc.id)
    }, `⚡ INJECT FAULT: ${sc.title}`);

    card.appendChild(content);
    card.appendChild(btn);

    if (sc.category === "digital") digitalGrid.appendChild(card);
    else if (sc.category === "physical") physicalGrid.appendChild(card);
    else if (sc.category === "safety") safetyGrid.appendChild(card);
  });
}

function triggerFaultScenario(scenarioId) {
  try {
    const incident = CampusStateEngine.injectFault(scenarioId);
    showToast(`🚨 Fault Injected: "${incident.title}"! Telemetry updated.`, "error");
    renderAllViews();

    // Auto-switch to Incidents tab for immediate feedback
    const incidentsTabBtn = document.querySelector('[data-tab="incidents"]');
    if (incidentsTabBtn) incidentsTabBtn.click();
  } catch (err) {
    showToast("Fault injection failed: " + err.message, "error");
  }
}

// ----------------------------------------------------------------------------
// 4. INCIDENTS & STUDENT REPORTS
// ----------------------------------------------------------------------------
function renderIncidentsList() {
  const container = document.getElementById("admin-reports-list");
  if (!container) return;
  container.innerHTML = "";

  const incidents = CampusStateEngine.loadIncidents();
  
  const filtered = incidents.filter(inc => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return inc.status === "DETECTED" || inc.status === "ANALYZED";
    if (filterStatus === "in_review") return inc.status === "SANDBOXED";
    if (filterStatus === "approved") return inc.status === "APPROVED";
    if (filterStatus === "resolved") return inc.status === "RESOLVED";
    return true;
  });

  if (!filtered.length) {
    container.appendChild(el("div", { class: "empty-state" }, "No active incidents match this filter. Use the Fault Injection console or Student view to generate telemetry."));
    return;
  }

  filtered.forEach(inc => {
    const row = el("article", { class: "report-row card", style: "border-left: 4px solid var(--accent);" });

    // Header
    const top = el("div", { class: "report-row__top" }, [
      el("div", {}, [
        el("span", { class: "eyebrow", style: "margin-bottom:0.2rem;" }, `INCIDENT ${inc.id} · ${inc.category.toUpperCase()}`),
        el("h3", { style: "margin:0; font-size:1.15rem;" }, inc.title)
      ]),
      el("div", { style: "display:flex; gap:0.5rem; flex-wrap:wrap;" }, [
        el("span", { class: `badge badge--priority-${inc.hybridDecision ? inc.hybridDecision.priorityClass : 'high'}` }, `Priority: ${inc.operationalPriority || 'P2 - High'}`),
        el("span", { class: `badge badge--status-${inc.status.toLowerCase()}` }, inc.status)
      ])
    ]);

    // Metadata
    const meta = el("div", { class: "report-row__meta" }, [
      el("span", {}, `📍 Target: ${inc.target}`),
      el("span", {}, `👥 Users Affected: ~${inc.usersAffected.toLocaleString()}`),
      el("span", {}, `⏱️ MTTD: ${inc.mttdSeconds}s`),
      el("span", {}, `🕒 Ingested: ${fmtTime(inc.createdAt)}`)
    ]);

    const desc = el("p", { style: "margin-bottom:0.75rem;" }, [el("strong", {}, "Telemetry Anomaly: "), inc.description]);

    // Student Impact & Decision Explainability Card
    const decisionCard = el("div", { class: "card card--tight", style: "background:var(--bg-alt); margin-bottom:1rem;" }, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; font-size:0.85rem;" }, [
        el("strong", { style: "color:var(--accent);" }, "🧠 Hybrid Operational Decision Breakdown:"),
        el("span", { class: "badge", style: "background:rgba(56,189,248,0.15); color:var(--accent);" }, `Impact Score: ${inc.studentImpact ? inc.studentImpact.score : 70}/100`)
      ]),
      el("p", { style: "font-size:0.82rem; margin:0; color:var(--text);" }, inc.hybridDecision ? inc.hybridDecision.explanation : "Operational Priority determined via service criticality and user impact."),
      el("p", { style: "font-size:0.82rem; margin:0.4rem 0 0; color:var(--text-muted);" }, [el("strong", {}, "Recommended Playbook: "), inc.recommendedAction])
    ]);

    row.appendChild(top);
    row.appendChild(meta);
    row.appendChild(desc);
    row.appendChild(decisionCard);

    // Sandbox Log if present
    if (inc.sandboxResults && inc.sandboxResults.steps) {
      const sandboxWrap = el("div", { style: "margin-bottom:1rem;" }, [
        el("strong", { style: "font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:0.35rem;" }, "🧪 Cloned Sandbox Simulation Results:"),
        renderSandboxLogMini(inc.sandboxResults.steps.map(s => ({ text: `[${s.status}] ${s.action} (${s.latency})`, level: s.status === "PASSED" || s.status === "VERIFIED" ? "ok" : "warn" })))
      ]);
      row.appendChild(sandboxWrap);
    }

    // Action Controls
    const actionsWrap = el("div", { class: "report-row__actions", style: "margin-top:0.75rem;" });

    if (inc.status === "DETECTED" || inc.status === "ANALYZED") {
      actionsWrap.appendChild(el("button", {
        class: "btn btn--primary btn--sm",
        onclick: () => runSandboxForIncident(inc.id)
      }, "🧪 Run Sandbox Simulation"));
    } else if (inc.status === "SANDBOXED") {
      actionsWrap.appendChild(el("button", {
        class: "btn btn--primary btn--sm",
        onclick: () => grantApprovalForIncident(inc.id)
      }, "🛡️ Grant Authority Approval"));
    } else if (inc.status === "APPROVED") {
      if (inc.isDigital) {
        actionsWrap.appendChild(el("button", {
          class: "btn btn--sm",
          style: "background:#10b981; color:#051610; font-weight:800;",
          onclick: () => openSelfHealingConfirmationModal(inc.id)
        }, "⚡ Confirm & Execute Self-Healing"));
      } else {
        actionsWrap.appendChild(el("span", { class: "badge badge--risk-medium" }, "Work Order Dispatched to Physical Facilities"));
      }
    } else if (inc.status === "RESOLVED") {
      actionsWrap.appendChild(el("span", { style: "color:#35d68f; font-size:0.85rem; font-weight:700;" }, `✓ Verified Healthy (MTTR: ${inc.mttrSeconds}s)`));
    }

    row.appendChild(actionsWrap);
    container.appendChild(row);
  });
}

function runSandboxForIncident(incidentId) {
  try {
    CampusStateEngine.runClonedSandboxSimulation(incidentId);
    showToast("Sandbox simulation completed against cloned state graph.", "success");
    renderAllViews();
  } catch (e) {
    showToast("Sandbox error: " + e.message, "error");
  }
}

function grantApprovalForIncident(incidentId) {
  try {
    CampusStateEngine.approveIncidentRecovery(incidentId, adminProfile ? adminProfile.name : "Warden / Operations Lead");
    showToast("Authority Approval granted. Final Confirmation Warning unlocked.", "success");
    renderAllViews();
  } catch (e) {
    showToast("Approval error: " + e.message, "error");
  }
}

// ----------------------------------------------------------------------------
// 5. APPROVALS & SELF-HEALING CONTROLLER
// ----------------------------------------------------------------------------
function renderApprovalQueue() {
  const container = document.getElementById("approval-queue-list");
  if (!container) return;
  container.innerHTML = "";

  const incidents = CampusStateEngine.loadIncidents();
  const queue = incidents.filter(i => i.status === "SANDBOXED" || i.status === "APPROVED");

  if (!queue.length) {
    container.appendChild(el("div", { class: "empty-state" }, "No incidents currently awaiting approval or self-healing execution."));
    return;
  }

  queue.forEach(inc => {
    const card = el("div", { class: "card", style: "border-left:4px solid #f59e0b;" });
    
    card.appendChild(el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;" }, [
      el("h3", { style: "margin:0;" }, inc.title),
      el("span", { class: `badge badge--priority-${inc.hybridDecision ? inc.hybridDecision.priorityClass : 'high'}` }, inc.operationalPriority)
    ]));

    card.appendChild(el("p", { style: "font-size:0.88rem; margin-bottom:0.75rem;" }, inc.description));
    card.appendChild(el("p", { style: "font-size:0.82rem; margin-bottom:0.75rem; color:var(--accent);" }, [
      el("strong", {}, "Recovery Action: "), inc.recommendedAction
    ]));

    const actions = el("div", { style: "display:flex; gap:0.75rem; margin-top:1rem;" });
    if (inc.status === "SANDBOXED") {
      actions.appendChild(el("button", {
        class: "btn btn--primary btn--sm",
        onclick: () => grantApprovalForIncident(inc.id)
      }, "✅ Approve Remediation Playbook"));
    } else if (inc.status === "APPROVED") {
      actions.appendChild(el("button", {
        class: "btn btn--sm",
        style: "background:#10b981; color:#051610; font-weight:800;",
        onclick: () => openSelfHealingConfirmationModal(inc.id)
      }, "⚡ Stage 2: Final Warning & Live Execute"));
    }

    card.appendChild(actions);
    container.appendChild(card);
  });
}

// ----------------------------------------------------------------------------
// 6. TWO-STAGE CONFIRMATION MODAL
// ----------------------------------------------------------------------------
function wireConfirmationModal() {
  const modal = document.getElementById("modal-confirm-selfhealing");
  const cancelBtn = document.getElementById("modal-btn-cancel");
  const executeBtn = document.getElementById("modal-btn-execute");

  if (cancelBtn) cancelBtn.addEventListener("click", () => { modal.hidden = true; });

  if (executeBtn) {
    executeBtn.addEventListener("click", async () => {
      if (!pendingModalIncident) return;

      const progressWrap = document.getElementById("modal-execution-progress");
      const progressBar = document.getElementById("modal-progress-bar");
      const progressStatus = document.getElementById("modal-progress-status");
      const progressPct = document.getElementById("modal-progress-pct");
      const actionBtns = document.getElementById("modal-actions-buttons");

      progressWrap.hidden = false;
      actionBtns.hidden = true;

      try {
        await CampusStateEngine.executeSelfHealing(pendingModalIncident.id, (prog) => {
          progressBar.style.width = `${prog.percent}%`;
          progressPct.textContent = `${prog.percent}%`;
          progressStatus.textContent = prog.message;
        });

        showToast(`🎉 Self-Healing Successful for ${pendingModalIncident.title}!`, "success");
        setTimeout(() => {
          modal.hidden = true;
          progressWrap.hidden = true;
          actionBtns.hidden = false;
          renderAllViews();
        }, 1200);
      } catch (err) {
        showToast("Execution error: " + err.message, "error");
        actionBtns.hidden = false;
      }
    });
  }
}

function openSelfHealingConfirmationModal(incidentId) {
  const incidents = CampusStateEngine.loadIncidents();
  const inc = incidents.find(i => i.id === incidentId);
  if (!inc) return;

  pendingModalIncident = inc;
  const modal = document.getElementById("modal-confirm-selfhealing");

  document.getElementById("modal-incident-title").textContent = inc.title;
  document.getElementById("modal-target-service").textContent = inc.target;
  document.getElementById("modal-priority-badge").textContent = inc.operationalPriority;
  document.getElementById("modal-remediation-code").textContent = inc.recommendedAction;
  document.getElementById("modal-est-duration").textContent = `~${CampusStateEngine.FAULT_SCENARIOS[inc.scenarioId]?.recoveryTimeSec || 5}.0s`;

  modal.hidden = false;
}

// ----------------------------------------------------------------------------
// 7. HYBRID AI DECISION INSPECTOR
// ----------------------------------------------------------------------------
function renderAiDecisionInspector() {
  const container = document.getElementById("ai-breakdown-container");
  if (!container) return;
  container.innerHTML = "";

  const incidents = CampusStateEngine.loadIncidents();
  if (!incidents.length) {
    container.appendChild(el("div", { class: "empty-state" }, "No incident decision breakdowns available yet. Trigger a fault or report to view."));
    return;
  }

  incidents.slice(0, 5).forEach(inc => {
    const card = el("div", { class: "card", style: "background:var(--surface);" });
    const dec = inc.hybridDecision;
    if (!dec) return;

    card.appendChild(el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;" }, [
      el("h3", { style: "margin:0; font-size:1.05rem;" }, inc.title),
      el("span", { class: `badge badge--priority-${dec.priorityClass}` }, `Final Operational Priority: ${dec.finalPriority}`)
    ]));

    card.appendChild(el("p", { style: "font-size:0.85rem; margin-bottom:1rem;" }, dec.explanation));

    // Factor breakdown grid
    const factorGrid = el("div", { style: "display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap:0.75rem; font-size:0.78rem;" }, [
      el("div", { class: "card card--tight", style: "background:var(--bg-alt);" }, [
        el("strong", {}, "🧠 Neural Net Score:"),
        el("div", { style: "color:var(--accent); font-size:1.1rem; font-weight:800;" }, `${dec.factors.nnScore}/30`)
      ]),
      el("div", { class: "card card--tight", style: "background:var(--bg-alt);" }, [
        el("strong", {}, "⚡ Service Criticality:"),
        el("div", { style: "color:#f59e0b; font-size:1.1rem; font-weight:800;" }, `${dec.factors.criticalityScore}/30 (Tier ${dec.criticality}/5)`)
      ]),
      el("div", { class: "card card--tight", style: "background:var(--bg-alt);" }, [
        el("strong", {}, "👥 Users Affected:"),
        el("div", { style: "color:#38bdf8; font-size:1.1rem; font-weight:800;" }, `${dec.factors.userScore}/25 (~${dec.userCount.toLocaleString()} users)`)
      ]),
      el("div", { class: "card card--tight", style: "background:var(--bg-alt);" }, [
        el("strong", {}, "🛡️ Safety / Infra Penalty:"),
        el("div", { style: "color:#ef4444; font-size:1.1rem; font-weight:800;" }, `+${dec.factors.safetyScore + dec.factors.infraScore + dec.factors.clusterScore} pts`)
      ])
    ]);

    card.appendChild(factorGrid);
    container.appendChild(card);
  });
}

// ----------------------------------------------------------------------------
// 8. FACILITIES WORK ORDERS
// ----------------------------------------------------------------------------
function renderWorkOrders() {
  const tbody = document.getElementById("work-orders-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const orders = CampusStateEngine.loadWorkOrders();
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-faint" style="text-align:center; padding:2rem;">No active physical work orders.</td></tr>`;
    return;
  }

  orders.forEach(wo => {
    const tr = document.createElement("tr");

    tr.appendChild(el("td", {}, [el("strong", { style: "color:var(--accent);" }, wo.id)]));
    tr.appendChild(el("td", {}, wo.title));
    tr.appendChild(el("td", {}, wo.department));
    tr.appendChild(el("td", {}, [el("span", { class: `badge badge--priority-high` }, wo.priority)]));
    tr.appendChild(el("td", {}, wo.location));
    tr.appendChild(el("td", {}, [el("span", { class: "badge badge--status-review" }, wo.status)]));

    const actionTd = el("td", {});
    if (wo.status === "Notified") {
      actionTd.appendChild(el("button", { class: "btn btn--ghost btn--sm", onclick: () => advanceWorkOrder(wo.id, "Assigned") }, "Assign Duty Lead"));
    } else if (wo.status === "Assigned") {
      actionTd.appendChild(el("button", { class: "btn btn--primary btn--sm", onclick: () => advanceWorkOrder(wo.id, "In Progress") }, "Start On-Site Work"));
    } else if (wo.status === "In Progress") {
      actionTd.appendChild(el("button", { class: "btn btn--sm", style: "background:#10b981; color:#04100c;", onclick: () => advanceWorkOrder(wo.id, "Resolved") }, "Mark Resolved"));
    } else {
      actionTd.appendChild(el("span", { style: "color:#35d68f; font-weight:700;" }, "✓ Closed"));
    }

    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

function advanceWorkOrder(orderId, newStatus) {
  CampusStateEngine.updateWorkOrderStatus(orderId, newStatus, `Warden/Supervisor updated status to ${newStatus}`);
  showToast(`Work Order ${orderId} updated to ${newStatus}.`, "success");
  renderAllViews();
}

// ----------------------------------------------------------------------------
// 9. PHOTO EVIDENCE GALLERY
// ----------------------------------------------------------------------------
function renderEvidenceGallery() {
  const grid = document.getElementById("evidence-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const evidence = CampusStateEngine.loadEvidence();
  if (!evidence.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">No photo evidence logged yet. Students can attach photos during report submission.</div>`;
    return;
  }

  evidence.forEach(item => {
    const card = el("div", { class: "evidence-card" });

    const imgWrap = el("div", { class: "evidence-card__img-wrap" });
    const img = el("img", {
      class: "evidence-card__img",
      src: item.imageUrl,
      alt: item.title,
      onerror: function() { this.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60"; }
    });
    imgWrap.appendChild(img);

    const body = el("div", { class: "evidence-card__body" }, [
      el("span", { class: "eyebrow", style: "margin:0;" }, item.category.toUpperCase()),
      el("h4", { class: "evidence-card__title" }, item.title),
      el("p", { class: "evidence-card__desc" }, item.description || "Photo submitted via LifeLine mobile intake."),
      el("div", { style: "display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-faint); margin-top:auto; padding-top:0.5rem; border-top:1px solid var(--border-soft);" }, [
        el("span", {}, `📍 ${item.location}`),
        el("span", {}, `🕒 ${fmtTime(item.timestamp)}`)
      ])
    ]);

    card.appendChild(imgWrap);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

// ----------------------------------------------------------------------------
// 10. REAL MTTD / MTTR METRICS
// ----------------------------------------------------------------------------
function renderMetricsDashboard() {
  const metrics = CampusStateEngine.loadMetrics();

  const avgMttd = metrics.mttdHistory.length
    ? (metrics.mttdHistory.reduce((a, b) => a + b.seconds, 0) / metrics.mttdHistory.length).toFixed(1)
    : "2.8";
  const avgMttr = metrics.mttrHistory.length
    ? (metrics.mttrHistory.reduce((a, b) => a + b.seconds, 0) / metrics.mttrHistory.length).toFixed(1)
    : "5.4";

  const heroMttd = document.getElementById("metric-hero-mttd");
  const heroMttr = document.getElementById("metric-hero-mttr");
  const heroTotal = document.getElementById("metric-hero-total");

  if (heroMttd) heroMttd.textContent = `${avgMttd}s`;
  if (heroMttr) heroMttr.textContent = `${avgMttr}s`;
  if (heroTotal) heroTotal.textContent = metrics.totalIncidents;

  const mttdList = document.getElementById("mttd-history-list");
  const mttrList = document.getElementById("mttr-history-list");

  if (mttdList) {
    mttdList.innerHTML = "";
    metrics.mttdHistory.slice(0, 6).forEach(item => {
      mttdList.appendChild(el("div", { class: "metric-history-item" }, [
        el("span", {}, item.incident),
        el("strong", { style: "color:var(--accent);" }, `${item.seconds}s`)
      ]));
    });
  }

  if (mttrList) {
    mttrList.innerHTML = "";
    metrics.mttrHistory.slice(0, 6).forEach(item => {
      mttrList.appendChild(el("div", { class: "metric-history-item" }, [
        el("span", {}, item.incident),
        el("strong", { style: "color:#35d68f;" }, `${item.seconds}s`)
      ]));
    });
  }
}

// ----------------------------------------------------------------------------
// 11. UNIFIED AUDIT TRAIL
// ----------------------------------------------------------------------------
function renderUnifiedAuditTrail() {
  const container = document.getElementById("unified-audit-list");
  if (!container) return;
  container.innerHTML = "";

  const trail = CampusStateEngine.loadAuditTrail();
  if (!trail.length) {
    container.appendChild(el("div", { class: "empty-state" }, "No audit events logged yet."));
    return;
  }

  trail.slice(0, 25).forEach(item => {
    const row = el("div", { class: "audit-item", style: "padding:0.75rem; border-bottom:1px solid var(--border-soft);" }, [
      el("div", {}, [
        el("span", { class: "badge badge--status-review", style: "margin-right:0.5rem; font-size:0.7rem;" }, item.event),
        el("span", { class: "audit-actor" }, item.actor),
        ` — ${item.action}`
      ]),
      el("div", { class: "audit-time" }, fmtTime(item.timestamp))
    ]);
    container.appendChild(row);
  });
}

function renderSandboxLogMini(log) {
  const wrap = el("div", { class: "sandbox__log", style: "max-height:8rem; font-size:0.75rem;" });
  (log || []).forEach((line) => {
    wrap.appendChild(el("div", { class: "sandbox__log-line", style: "opacity:1;" }, [
      el("span", { class: line.level }, line.text),
    ]));
  });
  return wrap;
}
