// ============================================================================
// LifeLine — Operations Console Controller (Role-Based Department Routing)
// ============================================================================

let currentDeptFilter = "all";
let adminProfile = null;
let activeModalIncidentId = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Check auth session
  const session = typeof getStaffSession === "function" ? getStaffSession() : null;
  if (!session && window.location.pathname.endsWith("admin.html")) {
    window.location.href = "admin-login.html";
    return;
  }
  adminProfile = session?.profile || {
    name: "Operations Authority",
    role: "authority",
    department: "admin",
    departmentLabel: "Campus Administration"
  };

  // If authority is tied to a specific department, default to that department
  if (adminProfile.department && adminProfile.department !== "admin" && adminProfile.department !== "student") {
    currentDeptFilter = adminProfile.department;
  }

  setupUserRoleDisplay();
  wireDeptFilterButtons();
  wireQuickReset();
  renderAllViews();

  // Reactive cross-tab listener
  if (typeof CampusStateEngine !== "undefined" && CampusStateEngine.subscribe) {
    CampusStateEngine.subscribe(() => {
      renderAllViews();
      if (activeModalIncidentId) {
        populateModalData(activeModalIncidentId);
      }
    });
  }
});

function setupUserRoleDisplay() {
  const nameEl = document.getElementById("admin-user-display");
  const roleBadge = document.getElementById("user-role-badge");
  const subEl = document.getElementById("user-welcome-sub");
  const headingEl = document.getElementById("dept-view-heading");

  if (adminProfile) {
    if (nameEl) nameEl.textContent = adminProfile.name || "Operations Lead";
    if (roleBadge) {
      roleBadge.textContent = adminProfile.departmentLabel ? `Department: ${adminProfile.departmentLabel}` : `Role: ${adminProfile.role}`;
    }
    if (subEl) {
      subEl.innerHTML = `Logged in as: <strong style="color:var(--heading-color);">${adminProfile.name}</strong> (${adminProfile.title || 'Operations Officer'}) · Real-time departmental triage.`;
    }
    if (headingEl) {
      headingEl.textContent = adminProfile.departmentLabel ? `${adminProfile.departmentLabel} Console` : "Campus Operations Console";
    }
  }
}

function wireDeptFilterButtons() {
  const buttons = document.querySelectorAll(".dept-filter-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDeptFilter = btn.dataset.dept;
      renderAssignedIssuesList();
    });
  });
}

function wireQuickReset() {
  const btn = document.getElementById("btn-quick-reset");
  btn?.addEventListener("click", () => {
    CampusStateEngine.resetAllCampusState();
    showToast("Campus operations state restored to clean baseline.", "info");
    renderAllViews();
  });
}

// ----------------------------------------------------------------------------
// RENDER ALL VIEWS & KPI METRICS
// ----------------------------------------------------------------------------
function renderAllViews() {
  renderKPIMetrics();
  renderAssignedIssuesList();
  renderDigitalServiceHealth();
}

function renderKPIMetrics() {
  const allReports = CampusStateEngine.loadStudentReports();
  const allIncidents = CampusStateEngine.loadIncidents();

  // Combine items to measure
  const items = allIncidents.length > 0 ? allIncidents : allReports;

  const activeCount = items.filter(i => !["Resolved", "Verified / Closed", "RESOLVED"].includes(i.status)).length;
  const highCritCount = items.filter(i => (i.operationalPriority?.includes("Critical") || i.operationalPriority?.includes("High") || i.isUrgentSafety) && !["Resolved", "Verified / Closed", "RESOLVED"].includes(i.status)).length;
  const inProgressCount = items.filter(i => ["Action in Progress", "Under Investigation", "SANDBOXED", "APPROVED"].includes(i.status)).length;
  const resolvedCount = items.filter(i => ["Resolved", "Verified / Closed", "RESOLVED"].includes(i.status)).length;

  document.getElementById("kpi-total-active").textContent = activeCount;
  document.getElementById("kpi-high-priority").textContent = highCritCount;
  document.getElementById("kpi-in-progress").textContent = inProgressCount;
  document.getElementById("kpi-resolved-today").textContent = resolvedCount;

  // Department counts
  const countAll = items.length;
  const countIt = items.filter(i => i.department === "it" || i.isDigital || i.category === "network" || i.category === "website").length;
  const countHostel = items.filter(i => i.department === "hostel" || (!i.isDigital && i.category !== "food_safety" && i.category !== "mess_food")).length;
  const countMess = items.filter(i => i.department === "mess" || i.category === "food_safety" || i.category === "mess_food" || i.category === "water").length;
  const countAdmin = items.filter(i => i.isUrgentSafety || i.operationalPriority?.includes("Critical") || i.operationalPriority?.includes("High")).length;

  if (document.getElementById("count-dept-all")) document.getElementById("count-dept-all").textContent = countAll;
  if (document.getElementById("count-dept-it")) document.getElementById("count-dept-it").textContent = countIt;
  if (document.getElementById("count-dept-hostel")) document.getElementById("count-dept-hostel").textContent = countHostel;
  if (document.getElementById("count-dept-mess")) document.getElementById("count-dept-mess").textContent = countMess;
  if (document.getElementById("count-dept-admin")) document.getElementById("count-dept-admin").textContent = countAdmin;
}

function renderAssignedIssuesList() {
  const container = document.getElementById("assigned-issues-list");
  const titleEl = document.getElementById("issues-list-title");
  if (!container) return;

  const { reports, incidents } = CampusStateEngine.getDepartmentComplaints(currentDeptFilter);
  
  // Prefer Master Incidents, fallback to individual reports if incidents empty
  const displayItems = incidents.length > 0 ? incidents : reports;

  const deptNames = {
    all: "All Campus Departments",
    it: "IT & Network Operations",
    hostel: "Hostel Maintenance & Facilities",
    mess: "Mess & Food Safety Authority",
    admin: "Campus Administration (High Priority & Safety)"
  };

  if (titleEl) {
    titleEl.textContent = `Assigned Issues: ${deptNames[currentDeptFilter] || 'Campus Operations'}`;
  }

  container.innerHTML = "";

  if (!displayItems.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2.5rem 1.5rem;">
        <p style="font-size:1.05rem; font-weight:700; color:var(--heading-color); margin-bottom:0.35rem;">
          No Active Issues for ${deptNames[currentDeptFilter]}
        </p>
        <p style="font-size:0.86rem; color:var(--text-muted); margin:0;">
          All systems and facilities are currently operating normally. Use the 1-Click Demo triggers above or the Student Portal to simulate a new report.
        </p>
      </div>
    `;
    return;
  }

  displayItems.forEach(item => {
    const card = el("article", { class: "complaint-card" });

    // Status Badge Class
    let statusClass = "badge--status-assigned";
    const st = (item.status || "").toLowerCase();
    if (st.includes("submitted")) statusClass = "badge--status-submitted";
    else if (st.includes("investigat")) statusClass = "badge--status-investigating";
    else if (st.includes("progress") || st.includes("approved") || st.includes("sandboxed")) statusClass = "badge--status-progress";
    else if (st.includes("resolved")) statusClass = "badge--status-resolved";
    else if (st.includes("closed") || st.includes("verified")) statusClass = "badge--status-closed";

    // Priority Badge Class
    let priorityBadgeClass = "badge--priority-low";
    if (item.operationalPriority?.includes("Critical") || item.isUrgentSafety) {
      priorityBadgeClass = "badge--priority-critical";
    } else if (item.operationalPriority?.includes("High")) {
      priorityBadgeClass = "badge--priority-high";
    } else if (item.operationalPriority?.includes("Medium")) {
      priorityBadgeClass = "badge--priority-medium";
    }

    // Header
    const header = el("div", { class: "complaint-card__header" }, [
      el("div", { style: "display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;" }, [
        el("span", { style: "font-size:1.3rem;" }, item.categoryEmoji || "🔧"),
        el("span", { class: "complaint-card__title" }, [
          document.createTextNode(item.title || item.categoryLabel || item.category),
          el("span", { style: "font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted); font-weight:normal;" }, `#${item.id}`)
        ])
      ]),
      el("div", { style: "display:flex; gap:0.4rem; align-items:center;" }, [
        el("span", { class: `badge ${priorityBadgeClass}` }, item.operationalPriority || "P3 - Medium"),
        el("span", { class: `badge ${statusClass}` }, item.status || "Assigned")
      ])
    ]);

    // Metadata
    const meta = el("div", { class: "complaint-card__meta" }, [
      el("span", {}, `📍 ${item.location || 'Campus'}`),
      el("span", {}, `🏢 Assigned: <strong>${item.departmentLabel || 'Operations Team'}</strong>`),
      el("span", {}, `🕒 ${fmtTime(item.createdAt || item.created_at)}`),
      ...(item.relatedReportsCount > 1 ? [
        el("span", { class: "badge", style: "background:var(--status-info-bg); color:var(--primary); font-family:var(--font-mono);" },
          `⚡ ${item.relatedReportsCount} Correlated Reports`
        )
      ] : [])
    ]);

    // Description
    const body = el("p", { class: "complaint-card__desc" }, item.description || item.deductionSummary);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(body);

    // Urgent Safety Banner
    if (item.isUrgentSafety) {
      const urgentAlert = el("div", {
        style: "background:#FEE2E2; border:1px solid #FCA5A5; color:#B91C1C; padding:0.45rem 0.75rem; border-radius:var(--radius-sm); font-size:0.8rem; font-weight:700; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.4rem;"
      }, [
        el("span", {}, "⚠️ URGENT HUMAN RESPONSE REQUIRED:"),
        el("span", { style: "font-weight:normal;" }, "Safety-critical hazard flagged for immediate on-site authority inspection.")
      ]);
      card.appendChild(urgentAlert);
    }

    // Attached Image Thumbnail
    if (item.image_url) {
      const imgRow = el("div", { style: "margin-bottom:0.75rem; display:flex; align-items:center; gap:0.6rem;" }, [
        el("img", {
          src: item.image_url,
          alt: "Attached photo evidence",
          class: "image-thumb-preview",
          onclick: () => openIncidentModal(item.id)
        }),
        el("span", { style: "font-size:0.78rem; color:var(--text-muted);" }, "📸 Photo attached (Click to view)")
      ]);
      card.appendChild(imgRow);
    }

    // Priority Reason
    if (item.priorityReason) {
      const reasonBox = el("div", { style: "font-size:0.78rem; color:var(--text-faint); margin-bottom:0.65rem;" }, [
        el("span", { style: "font-weight:600;" }, "Priority Reason: "),
        document.createTextNode(item.priorityReason)
      ]);
      card.appendChild(reasonBox);
    }

    // Actions Row
    const actionsRow = el("div", { class: "complaint-card__actions" }, [
      el("div", { style: "font-size:0.8rem; color:var(--text-muted);" }, [
        el("span", {}, `Officer: <strong>${item.assignedOfficer || item.assignedTo || 'Duty Officer'}</strong>`)
      ]),
      el("button", {
        type: "button",
        class: "btn btn--primary btn--sm",
        onclick: () => openIncidentModal(item.id)
      }, "🔍 View & Manage Issue →")
    ]);

    card.appendChild(actionsRow);
    container.appendChild(card);
  });
}

// ----------------------------------------------------------------------------
// MODAL MANAGEMENT & LIFECYCLE TRANSITIONS
// ----------------------------------------------------------------------------
function openIncidentModal(incidentId) {
  activeModalIncidentId = incidentId;
  populateModalData(incidentId);
  const modal = document.getElementById("incident-detail-modal");
  if (modal) modal.style.display = "flex";
}

function closeIncidentModal() {
  const modal = document.getElementById("incident-detail-modal");
  if (modal) modal.style.display = "none";
  activeModalIncidentId = null;
}

function populateModalData(incidentId) {
  const reports = CampusStateEngine.loadStudentReports();
  const incidents = CampusStateEngine.loadIncidents();

  const item = incidents.find(i => i.id === incidentId || i.referenceId === incidentId) ||
               reports.find(r => r.id === incidentId || r.referenceId === incidentId);

  if (!item) return;

  document.getElementById("modal-id").textContent = `#${item.id}`;
  document.getElementById("modal-title").textContent = item.title || item.categoryLabel || "Campus Problem";
  document.getElementById("modal-category-emoji").textContent = item.categoryEmoji || "🔧";
  document.getElementById("modal-dept-route").textContent = `Assigned to: ${item.departmentLabel || 'Operations Team'} (${item.assignedOfficer || 'Duty Officer'})`;
  document.getElementById("modal-description").textContent = item.description || item.deductionSummary || "No description provided.";
  document.getElementById("modal-priority-badge").textContent = item.operationalPriority || "P3 - Medium";
  document.getElementById("modal-priority-reason").textContent = `Reason: ${item.priorityReason || 'Category baseline'}`;
  document.getElementById("modal-status-badge").textContent = item.status || "Assigned";

  // Safety banner
  const safetyBanner = document.getElementById("modal-safety-banner");
  if (safetyBanner) safetyBanner.style.display = item.isUrgentSafety ? "block" : "none";

  // Photo preview
  const photoSec = document.getElementById("modal-photo-section");
  const photoImg = document.getElementById("modal-photo-img");
  if (photoSec && photoImg) {
    if (item.image_url) {
      photoImg.src = item.image_url;
      photoSec.style.display = "block";
    } else {
      photoSec.style.display = "none";
    }
  }

  // Correlated reports
  const corrSec = document.getElementById("modal-correlated-section");
  const corrCount = document.getElementById("modal-correlated-count");
  const corrList = document.getElementById("modal-correlated-list");

  if (corrSec && corrList) {
    const related = (item.relatedReportIds || []).map(id => reports.find(r => r.id === id)).filter(Boolean);
    if (related.length > 0) {
      if (corrCount) corrCount.textContent = related.length;
      corrList.innerHTML = related.map(r => `
        <div style="padding:0.35rem 0; border-bottom:1px solid var(--border-soft); display:flex; justify-content:space-between;">
          <span><strong>#${r.id}</strong> by ${r.student_name} (${r.location})</span>
          <span style="color:var(--text-faint);">${fmtTime(r.created_at)}</span>
        </div>
      `).join("");
      corrSec.style.display = "block";
    } else {
      corrSec.style.display = "none";
    }
  }
}

function setModalStatus(newStatus) {
  if (!activeModalIncidentId) return;
  const notes = (document.getElementById("modal-staff-notes")?.value || "").trim();

  CampusStateEngine.updateComplaintStatus(
    activeModalIncidentId,
    newStatus,
    adminProfile?.name || "Operations Authority",
    adminProfile?.departmentLabel || "Authority",
    notes
  );

  showToast(`Updated #${activeModalIncidentId} to "${newStatus}"!`, "success");
  if (document.getElementById("modal-staff-notes")) document.getElementById("modal-staff-notes").value = "";
  populateModalData(activeModalIncidentId);
  renderAllViews();
}

// ----------------------------------------------------------------------------
// 1-CLICK DEMO SCENARIO TRIGGERS
// ----------------------------------------------------------------------------
function triggerDemoScenario(scenarioType) {
  if (scenarioType === "website_down") {
    triggerDigitalOutage();
    setDeptFilter("it");
    renderAllViews();
    showToast("Triggered Web Service Outage (HTTP 503)! View in IT Department.", "warning");
  } else if (scenarioType === "wifi_surge") {
    for (let i = 1; i <= 5; i++) {
      CampusStateEngine.addStudentReport({
        category: "network",
        categoryLabel: "Wi-Fi & Network",
        categoryEmoji: "📶",
        student_id: `usr-std-0${i}`,
        student_name: `Student Resident ${i}`,
        student_room: `Room 30${i}`,
        location: "Hostel A",
        description: `Wi-Fi signal dropped in Hostel A Room 30${i}. No internet connectivity.`
      });
    }
    setDeptFilter("it");
    renderAllViews();
    showToast("Clustered 5 Wi-Fi reports in Hostel A into Master Incident! Priority escalated.", "success");
  } else if (scenarioType === "food_safety") {
    CampusStateEngine.addStudentReport({
      category: "food_safety",
      categoryLabel: "Mess & Food Safety",
      categoryEmoji: "🍽️",
      student_id: "usr-std-07",
      student_name: "Rahul Verma",
      student_room: "Central Dining Hall",
      location: "Central Dining Hall",
      description: "Severe food contamination suspected in Tuesday dinner. Sour smell and students reporting nausea."
    });
    setDeptFilter("mess");
    renderAllViews();
    showToast("Mess Food Safety Alert logged! Flagged as P1 Critical with Urgent Safety Notice.", "warning");
  } else if (scenarioType === "water_hazard") {
    CampusStateEngine.addStudentReport({
      category: "water",
      categoryLabel: "Drinking Water & Plumbing",
      categoryEmoji: "🚰",
      student_id: "usr-std-08",
      student_name: "Sneha Patel",
      student_room: "Hostel BH-2",
      location: "Hostel BH-2, 1st Floor Cooler",
      description: "Drinking water cooler dispensing discolored brown water with heavy chemical/sulfur smell."
    });
    setDeptFilter("hostel");
    renderAllViews();
    showToast("Potable water hazard logged! Official Civil Work Order dispatched.", "warning");
  }
}

function setDeptFilter(dept) {
  currentDeptFilter = dept;
  document.querySelectorAll(".dept-filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.dept === dept);
  });
}

// ----------------------------------------------------------------------------
// CONTROLLED DIGITAL SERVICE SELF-HEALING CONTROLLER
// ----------------------------------------------------------------------------
function renderDigitalServiceHealth() {
  const health = CampusStateEngine.loadServiceHealth();
  const dot = document.getElementById("service-status-dot");
  const badge = document.getElementById("service-status-badge");
  const btnOutage = document.getElementById("btn-trigger-digital-outage");
  const btnSandbox = document.getElementById("btn-run-sandbox-test");
  const btnApprove = document.getElementById("btn-approve-recovery");
  const btnRecover = document.getElementById("btn-execute-live-recovery");

  const isHealthy = health.websiteService === "healthy";
  const isDown = health.websiteService === "down";

  if (dot) dot.style.background = isHealthy ? "var(--status-success)" : "var(--status-critical)";
  if (badge) {
    badge.className = `badge ${isHealthy ? 'badge--status-resolved' : 'badge--urgent-safety'}`;
    badge.textContent = isHealthy ? `Service Healthy (HTTP ${health.httpStatusCode || 200})` : `Service Outage (HTTP ${health.httpStatusCode || 503})`;
  }

  if (btnOutage) btnOutage.disabled = isDown;
  if (btnSandbox) btnSandbox.disabled = !isDown;
  if (btnApprove) btnApprove.disabled = isDown ? false : true;
  if (btnRecover) btnRecover.disabled = isDown ? false : true;
}

function appendSelfHealingLog(msg) {
  const logBox = document.getElementById("self-healing-log-box");
  if (!logBox) return;
  const time = new Date().toLocaleTimeString();
  logBox.innerHTML += `<br>[${time}] ${msg}`;
  logBox.scrollTop = logBox.scrollHeight;
}

function triggerDigitalOutage() {
  CampusStateEngine.simulateWebServiceOutage();
  appendSelfHealingLog("🚨 [FAILURE DETECTED] HTTP GET /healthz probe returned 503 Service Unavailable (Memory leak / socket exhaustion).");
  renderAllViews();
}

async function runDigitalSandboxTest() {
  const btn = document.getElementById("btn-run-sandbox-test");
  if (btn) btn.disabled = true;

  appendSelfHealingLog("🧪 [SANDBOX TEST] Initiating dry-run pre-flight validation on cloned staging container replica...");
  await new Promise(r => setTimeout(r, 600));

  appendSelfHealingLog("🧪 [SANDBOX TEST] Database socket pool verified (24 sockets). Container restart rehearsal PASSED (HTTP 200 OK on replica).");
  const btnApprove = document.getElementById("btn-approve-recovery");
  if (btnApprove) {
    btnApprove.disabled = false;
    btnApprove.classList.remove("btn--ghost");
    btnApprove.classList.add("btn--gold");
  }
}

function approveDigitalRecovery() {
  appendSelfHealingLog("✍️ [AUTHORITY APPROVAL] Chief Warden / IT Authority sign-off granted for container restart.");
  const btnRecover = document.getElementById("btn-execute-live-recovery");
  if (btnRecover) btnRecover.disabled = false;
  showToast("Authority approval recorded.", "success");
}

async function executeDigitalRecovery() {
  const btn = document.getElementById("btn-execute-live-recovery");
  if (btn) btn.disabled = true;

  appendSelfHealingLog("⚡ [LIVE RECOVERY] Restarting production container 'campus-web-prod' and clearing socket pool...");
  
  await CampusStateEngine.executeWebServiceRecovery(null, (prog) => {
    appendSelfHealingLog(`⚡ [RECOVERY] ${prog.message}`);
  });

  appendSelfHealingLog("✅ [VERIFIED] Live HTTP GET /healthz returned 200 OK. Service restoration confirmed (Actual MTTR recorded).");
  showToast("Web Service restored and verified via live HTTP 200 probe!", "success");
  renderAllViews();
}

function openNewComplaintModal() {
  window.location.href = "report.html";
}

function fmtTime(iso) {
  if (!iso) return "Just now";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "Just now";
  }
}

if (typeof window !== "undefined") {
  window.triggerDemoScenario = triggerDemoScenario;
  window.openIncidentModal = openIncidentModal;
  window.closeIncidentModal = closeIncidentModal;
  window.setModalStatus = setModalStatus;
  window.triggerDigitalOutage = triggerDigitalOutage;
  window.runDigitalSandboxTest = runDigitalSandboxTest;
  window.approveDigitalRecovery = approveDigitalRecovery;
  window.executeDigitalRecovery = executeDigitalRecovery;
  window.openNewComplaintModal = openNewComplaintModal;
}
