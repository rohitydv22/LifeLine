// ============================================================================
// LifeLine by Cognora — Report submission + sandbox console + "my reports"
// ============================================================================

let currentUser = null;
let currentProfile = null;

(async function init() {
  const auth = await requireAuth();
  if (!auth) return;
  currentUser = auth.user;
  currentProfile = auth.profile;

  document.getElementById("student-name").textContent = currentProfile.name.split(" ")[0];
  wireLogoutButton();
  renderCategoryGrid();
  loadMyReports();

  // Cross-tab sync for my reports
  if (typeof CampusStateEngine !== "undefined" && CampusStateEngine.subscribe) {
    CampusStateEngine.subscribe((event) => {
      if (event === "incidents_changed" || event === "state_changed") {
        loadMyReports();
      }
    });
  }
})();

function renderCategoryGrid() {
  const grid = document.getElementById("category-grid");
  if (!grid) return;
  grid.innerHTML = "";
  CATEGORIES.forEach((cat, i) => {
    const wrap = el("div", { class: "category-option" }, [
      el("input", {
        type: "radio", name: "category", id: `cat-${cat.id}`, value: cat.id,
        ...(i === 0 ? { checked: "checked" } : {}),
      }),
      el("label", { for: `cat-${cat.id}` }, [
        el("span", { class: "emoji", "aria-hidden": "true" }, cat.emoji),
        el("span", {}, cat.label),
      ]),
    ]);
    grid.appendChild(wrap);
  });
}

// ----------------------------------------------------------------------------
// Form submission
// ----------------------------------------------------------------------------
const reportForm = document.getElementById("report-form");
const submitBtn = document.getElementById("submit-btn");

reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("err-category").textContent = "";
  document.getElementById("err-description").textContent = "";
  document.getElementById("err-location").textContent = "";

  const categoryInput = reportForm.querySelector('input[name="category"]:checked');
  const description = document.getElementById("description").value.trim();
  const location = document.getElementById("location").value.trim();
  const imageFile = document.getElementById("image").files[0];

  let valid = true;
  if (!categoryInput) { document.getElementById("err-category").textContent = "Choose a category."; valid = false; }
  if (!description) { document.getElementById("err-description").textContent = "Please describe what happened."; valid = false; }
  if (!location) { document.getElementById("err-location").textContent = "Please tell us the location."; valid = false; }
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Ingesting telemetry…`;

  const category = categoryInput.value;

  try {
    let localImageUrl = null;
    let imagePath = null;

    if (imageFile) {
      // 1. Read locally for immediate offline/evidence preview
      localImageUrl = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = () => res(null);
        reader.readAsDataURL(imageFile);
      });

      // 2. Try Supabase storage if active session
      try {
        const ext = imageFile.name.split(".").pop();
        imagePath = `${currentUser.id}/${Date.now()}.${ext}`;
        await sb.storage.from("problem-images").upload(imagePath, imageFile);
      } catch (stErr) {
        console.warn("Storage upload fallback:", stErr);
      }
    }

    const initialAudit = [
      { action: "Report submitted by student", actor: currentProfile.name, timestamp: new Date().toISOString() },
    ];

    // Check Multi-Report Correlation
    const existingIncidents = typeof CampusStateEngine !== "undefined" ? CampusStateEngine.loadIncidents() : [];
    const correlation = typeof CampusStateEngine !== "undefined"
      ? CampusStateEngine.correlateReports({ category, location, description }, existingIncidents)
      : { hasCluster: false, clusterCount: 1 };

    // Register into Central Campus State Engine
    const reportData = {
      id: "REP-" + Date.now().toString().slice(-6),
      student_id: currentUser.id,
      student_name: currentProfile.name,
      student_room: `${currentProfile.bh_number || 'BH-1'}, Room ${currentProfile.room_number || '101'}`,
      category,
      description,
      location,
      image_url: localImageUrl || imagePath,
      status: "pending",
      similarReportCount: correlation.clusterCount,
      correlation,
      created_at: new Date().toISOString(),
      audit_trail: initialAudit
    };

    // Store in Evidence Gallery if photo attached
    if (localImageUrl) {
      CampusStateEngine.addEvidenceItem({
        title: `${category.toUpperCase()}: ${description.slice(0, 45)}...`,
        category,
        location,
        imageUrl: localImageUrl,
        uploaderName: currentProfile.name,
        description,
        priority: correlation.hasCluster ? "P1 - Critical" : "P2 - High"
      });
    }

    // Try Supabase insert as best-effort if connected
    try {
      await sb.from("reports").insert({
        student_id: currentUser.id,
        category, description, location,
        image_url: imagePath || localImageUrl,
        status: "pending",
        audit_trail: initialAudit,
      });
    } catch (dbErr) {
      console.warn("Supabase reports insert fallback to local state engine:", dbErr);
    }

    reportForm.reset();
    renderCategoryGrid();

    await runSandbox(reportData, initialAudit);
    loadMyReports();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not submit report.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit & Run AIOps Sandbox Simulation";
  }
});

// ----------------------------------------------------------------------------
// Sandbox console animation + persistence
// ----------------------------------------------------------------------------
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function runSandbox(report, initialAudit) {
  const section = document.getElementById("sandbox-section");
  const sandbox = document.getElementById("sandbox");
  const logEl = document.getElementById("sandbox-log");
  const statusText = document.getElementById("sandbox-status-text");
  const meterScore = document.getElementById("meter-score");
  const meterSignals = document.getElementById("meter-signals");
  const meterConfidence = document.getElementById("meter-confidence");
  const meterSteps = document.getElementById("meter-steps");

  logEl.innerHTML = "";
  sandbox.classList.remove("sandbox--done");
  sandbox.classList.add("sandbox--running");
  statusText.textContent = "running simulation…";
  section.hidden = false;
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  const analysis = analyzeReport(report);
  const steps = buildSandboxSteps(report, analysis);

  meterSteps.textContent = `0/${steps.length}`;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const ts = new Date().toLocaleTimeString();
    const line = el("div", { class: "sandbox__log-line", style: `animation-delay:0ms` }, [
      el("span", { class: "ts" }, `[${ts}]`),
      el("span", { class: step.level }, step.text),
    ]);
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    meterSteps.textContent = `${i + 1}/${steps.length}`;
    await sleep(350 + Math.random() * 200);
  }

  meterScore.textContent = analysis.score;
  meterSignals.textContent = new Set(analysis.matchedSignals).size;
  const confPct = Math.round((analysis.confidence || 0.8) * 100);
  if (meterConfidence) meterConfidence.textContent = `${confPct}%`;

  sandbox.classList.remove("sandbox--running");
  sandbox.classList.add("sandbox--done");
  statusText.textContent = "analysis complete";

  // Correlation alert box
  const corrBox = document.getElementById("correlation-alert-box");
  const corrText = document.getElementById("correlation-alert-text");
  if (report.correlation && report.correlation.hasCluster) {
    corrBox.hidden = false;
    corrText.textContent = report.correlation.clusterSummary;
  } else {
    corrBox.hidden = true;
  }

  const opBadge = document.getElementById("op-priority-badge");
  if (opBadge && analysis.hybridPriority) {
    opBadge.className = `badge badge--priority-${analysis.hybridPriority.priorityClass}`;
    opBadge.textContent = analysis.hybridPriority.finalPriority;
  }

  const riskBadge = document.getElementById("risk-badge");
  riskBadge.className = `badge badge--risk-${analysis.riskLevel}`;
  riskBadge.textContent = `NN Risk: ${analysis.riskLevel.toUpperCase()}`;

  const confPill = document.getElementById("nn-confidence-pill");
  if (confPill) {
    confPill.textContent = `NN Conf: ${confPct}%`;
  }

  // Update probability distribution bars
  const probs = analysis.probabilities || { low: 0, medium: 0, high: 0 };
  const lowPct = Math.round(probs.low * 100);
  const medPct = Math.round(probs.medium * 100);
  const highPct = Math.round(probs.high * 100);

  const barLow = document.getElementById("prob-bar-low");
  const barMed = document.getElementById("prob-bar-medium");
  const barHigh = document.getElementById("prob-bar-high");
  const valLow = document.getElementById("prob-val-low");
  const valMed = document.getElementById("prob-val-medium");
  const valHigh = document.getElementById("prob-val-high");

  if (barLow) barLow.style.width = `${lowPct}%`;
  if (barMed) barMed.style.width = `${medPct}%`;
  if (barHigh) barHigh.style.width = `${highPct}%`;
  if (valLow) valLow.textContent = `${lowPct}%`;
  if (valMed) valMed.textContent = `${medPct}%`;
  if (valHigh) valHigh.textContent = `${highPct}%`;

  document.getElementById("ai-solution-text").textContent = analysis.solution;
  document.getElementById("ai-reasoning-text").textContent = analysis.reasoning;

  const approvalText = document.getElementById("approval-note-text");
  if (analysis.riskLevel === "high" || (analysis.hybridPriority && analysis.hybridPriority.priorityClass === "critical")) {
    approvalText.textContent = "High-impact recommendation: Live recovery requires mandatory Warden Approval and Final Human Confirmation.";
  } else {
    approvalText.textContent = "Routed to the Operations Dashboard for warden review and confirmation.";
  }

  const auditTrail = [
    ...initialAudit,
    { action: "Sandbox simulation completed on cloned state", actor: "LifeLine AI Engine", timestamp: new Date().toISOString() },
    { action: `Operational Priority assigned as ${analysis.hybridPriority ? analysis.hybridPriority.finalPriority : 'P2 - High'}`, actor: "LifeLine Decision Engine", timestamp: new Date().toISOString() },
    { action: "Routed to warden dashboard for approval", actor: "LifeLine Controller", timestamp: new Date().toISOString() },
  ];

  // Save Incident to Central State Engine
  const incidents = CampusStateEngine.loadIncidents();
  const newIncident = {
    id: report.id,
    title: `${formatCategory(report.category)}: ${report.location}`,
    category: report.category,
    target: report.category === "network" ? "network" : report.category === "mess_food" ? "messFacilities" : "servers",
    severity: analysis.riskLevel === "high" ? "critical" : "high",
    operationalPriority: analysis.hybridPriority ? analysis.hybridPriority.finalPriority : "P2 - High",
    priorityBadge: analysis.hybridPriority ? analysis.hybridPriority.priorityBadge : "HIGH",
    status: "SANDBOXED",
    description: report.description,
    location: report.location,
    recommendedAction: analysis.solution,
    rootCause: analysis.reasoning,
    usersAffected: analysis.hybridPriority ? analysis.hybridPriority.userCount : 50,
    scope: "Hostel Zone",
    mttdSeconds: 2.1,
    studentImpact: analysis.studentImpact,
    hybridDecision: analysis.hybridPriority,
    isDigital: analysis.isDigital,
    sandboxResults: {
      steps: steps.map(s => ({ action: s.text, status: "PASSED", latency: "25ms" })),
      rehearsalPassed: true
    },
    createdAt: new Date().toISOString(),
    history: auditTrail.map(a => ({ stage: "LOGGED", time: a.timestamp, note: a.action }))
  };

  incidents.unshift(newIncident);
  CampusStateEngine.saveIncidents(incidents);
  CampusStateEngine.logAuditEvent("STUDENT_REPORT_INGESTED", currentProfile.name, `Submitted report: ${report.category}`, `Assigned Priority: ${newIncident.operationalPriority}`);

  // If physical/non-digital, automatically mail the designated authority officer
  const emailBox = document.getElementById("email-dispatch-box");
  const emailDetails = document.getElementById("email-dispatch-details");

  if (!analysis.isDigital && CampusStateEngine.dispatchPhysicalAuthorityEmail) {
    const emailResult = CampusStateEngine.dispatchPhysicalAuthorityEmail({
      incidentId: newIncident.id,
      title: newIncident.title,
      category: report.category,
      priority: newIncident.operationalPriority,
      location: report.location,
      studentName: currentProfile.name,
      studentRoom: `${currentProfile.bh_number || 'BH-1'}, Room ${currentProfile.room_number || '101'}`,
      description: report.description,
      rootCause: analysis.reasoning,
      solution: analysis.solution
    });

    if (emailBox && emailDetails) {
      emailBox.style.display = "block";
      emailDetails.innerHTML = `
        <div style="display:grid; grid-template-columns:auto 1fr; gap:0.25rem 0.6rem; margin-top:0.35rem;">
          <span style="color:var(--text-faint);">Dispatched To:</span>
          <strong>${emailResult.toOfficer} (${emailResult.toDesignation})</strong>
          <span style="color:var(--text-faint);">Official Email:</span>
          <code style="color:var(--accent);">${emailResult.toEmail}</code>
          <span style="color:var(--text-faint);">Department:</span>
          <span>${emailResult.department} (${emailResult.phoneExt})</span>
          <span style="color:var(--text-faint);">Response SLA:</span>
          <span style="color:#10b981; font-weight:700;">${emailResult.sla}</span>
        </div>
      `;
    }

    // Also create Physical Work Order with linked email record
    CampusStateEngine.createWorkOrder({
      title: `${formatCategory(report.category)} at ${report.location}`,
      category: report.category,
      priority: newIncident.operationalPriority,
      location: report.location,
      description: report.description,
      dispatchedEmailId: emailResult.id
    });

    showToast(`Physical issue analyzed & work order auto-emailed to ${emailResult.toOfficer}.`, "success");
  } else {
    if (emailBox) emailBox.style.display = "none";
    showToast("Report simulated in sandbox and routed to Warden Ops Dashboard.", "success");
  }
}

// ----------------------------------------------------------------------------
// My reports list
// ----------------------------------------------------------------------------
async function loadMyReports() {
  const listEl = document.getElementById("my-reports-list");
  if (!listEl) return;

  const incidents = CampusStateEngine.loadIncidents();
  listEl.innerHTML = "";

  if (!incidents.length) {
    listEl.appendChild(el("div", { class: "empty-state" }, "You haven't submitted any reports yet."));
    return;
  }

  incidents.forEach((report) => listEl.appendChild(renderReportRow(report)));
}

function renderReportRow(report) {
  const catInfo = CATEGORIES.find((c) => c.id === report.category);
  const row = el("article", { class: "report-row card" });

  const top = el("div", { class: "report-row__top" }, [
    el("h3", { style: "margin:0; font-size:1.05rem;" }, `${catInfo ? catInfo.emoji + " " : ""}${catInfo ? catInfo.label : report.category}`),
    el("div", { style: "display:flex; gap:0.5rem; flex-wrap:wrap;" }, [
      el("span", { class: `badge badge--priority-${report.hybridDecision ? report.hybridDecision.priorityClass : 'medium'}` }, report.operationalPriority || 'P2 - High'),
      el("span", { class: `badge badge--status-${(report.status || 'pending').toLowerCase()}` }, (report.status || 'pending').replace("_", " ")),
    ]),
  ]);

  row.appendChild(top);
  row.appendChild(el("p", { style: "margin:0 0 0.5rem;" }, report.description));
  row.appendChild(el("div", { class: "report-row__meta" }, [
    el("span", {}, `📍 ${report.location || 'Campus'}`),
    el("span", {}, `🕒 ${fmtTime(report.createdAt || report.created_at)}`),
  ]));

  if (report.recommendedAction || report.ai_solution) {
    const details = el("details");
    details.appendChild(el("summary", { style: "cursor:pointer; font-weight:700; font-size:0.85rem; color: var(--accent);" }, "View AIOps Analysis & Audit Trail"));
    const inner = el("div", { style: "margin-top:0.75rem; display:flex; flex-direction:column; gap:0.75rem;" });
    inner.appendChild(el("p", { style: "margin:0; font-size:0.85rem;" }, [el("strong", {}, "Recommended Playbook: "), report.recommendedAction || report.ai_solution]));
    inner.appendChild(el("p", { style: "margin:0; font-size:0.85rem;" }, [el("strong", {}, "Reasoning: "), report.rootCause || report.ai_reasoning]));
    details.appendChild(inner);
    row.appendChild(details);
  }

  return row;
}
