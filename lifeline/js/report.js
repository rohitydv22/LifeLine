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
})();

function renderCategoryGrid() {
  const grid = document.getElementById("category-grid");
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
  submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Submitting…`;

  const category = categoryInput.value;

  try {
    let imagePath = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      imagePath = `${currentUser.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await sb.storage.from("problem-images").upload(imagePath, imageFile);
      if (uploadError) throw uploadError;
    }

    const initialAudit = [
      { action: "Report submitted by student", actor: currentProfile.name, timestamp: new Date().toISOString() },
    ];

    const { data: inserted, error: insertError } = await sb
      .from("reports")
      .insert({
        student_id: currentUser.id,
        category, description, location,
        image_url: imagePath,
        status: "pending",
        audit_trail: initialAudit,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    reportForm.reset();
    renderCategoryGrid();

    await runSandbox({ id: inserted.id, category, description, location }, initialAudit);
    loadMyReports();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not submit report.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit & run sandbox analysis";
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
  statusText.textContent = "running…";
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
    await sleep(420 + Math.random() * 260);
  }

  meterScore.textContent = analysis.score;
  meterSignals.textContent = new Set(analysis.matchedSignals).size;
  const confPct = Math.round((analysis.confidence || 0.8) * 100);
  if (meterConfidence) meterConfidence.textContent = `${confPct}%`;

  sandbox.classList.remove("sandbox--running");
  sandbox.classList.add("sandbox--done");
  statusText.textContent = "analysis complete";

  const riskBadge = document.getElementById("risk-badge");
  riskBadge.className = `badge badge--risk-${analysis.riskLevel}`;
  riskBadge.textContent = analysis.riskLevel;

  const confPill = document.getElementById("nn-confidence-pill");
  if (confPill) {
    confPill.textContent = `NN Confidence: ${confPct}%`;
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
  if (analysis.riskLevel === "high") {
    approvalText.textContent = "This is a high-impact recommendation. It will NOT be executed automatically — a warden must review and explicitly approve it first.";
  } else if (analysis.riskLevel === "medium") {
    approvalText.textContent = "Routed to the warden dashboard for review and approval before action.";
  } else {
    approvalText.textContent = "Low risk — logged for the warden's routine review queue.";
  }


  const auditTrail = [
    ...initialAudit,
    { action: "Sandbox simulation completed", actor: "LifeLine AI Engine", timestamp: new Date().toISOString() },
    { action: `Risk classified as ${analysis.riskLevel.toUpperCase()}`, actor: "LifeLine AI Engine", timestamp: new Date().toISOString() },
    { action: "Routed to warden dashboard for approval", actor: "LifeLine AI Engine", timestamp: new Date().toISOString() },
  ];

  const sandboxLog = steps.map((s) => ({ text: s.text, level: s.level }));

  const { error: updateError } = await sb
    .from("reports")
    .update({
      status: "in_review",
      risk_level: analysis.riskLevel,
      ai_solution: analysis.solution,
      ai_reasoning: analysis.reasoning,
      sandbox_log: sandboxLog,
      audit_trail: auditTrail,
    })
    .eq("id", report.id);

  if (updateError) {
    console.error(updateError);
    showToast("Sandbox finished, but saving results failed: " + updateError.message, "error");
  } else {
    showToast("Report analyzed and routed to your warden.", "success");
  }
}

// ----------------------------------------------------------------------------
// My reports list
// ----------------------------------------------------------------------------
async function loadMyReports() {
  const listEl = document.getElementById("my-reports-list");
  const { data, error } = await sb
    .from("reports")
    .select("*")
    .eq("student_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    listEl.innerHTML = "";
    listEl.appendChild(el("p", { class: "text-faint" }, "Could not load your reports."));
    return;
  }

  listEl.innerHTML = "";
  if (!data.length) {
    listEl.appendChild(el("div", { class: "empty-state" }, "You haven't submitted any reports yet."));
    return;
  }

  data.forEach((report) => listEl.appendChild(renderReportRow(report)));
}

function renderReportRow(report) {
  const catInfo = CATEGORIES.find((c) => c.id === report.category);
  const row = el("article", { class: "report-row" });

  const top = el("div", { class: "report-row__top" }, [
    el("h3", { style: "margin:0; font-size:1rem;" }, `${catInfo ? catInfo.emoji + " " : ""}${catInfo ? catInfo.label : report.category}`),
    el("div", { style: "display:flex; gap:0.5rem; flex-wrap:wrap;" }, [
      report.risk_level ? el("span", { class: `badge badge--risk-${report.risk_level}` }, report.risk_level) : null,
      el("span", { class: `badge badge--status-${report.status}` }, report.status.replace("_", " ")),
    ]),
  ]);

  row.appendChild(top);
  row.appendChild(el("p", { style: "margin:0;" }, report.description));
  row.appendChild(el("div", { class: "report-row__meta" }, [
    el("span", {}, `📍 ${report.location}`),
    el("span", {}, `🕒 ${fmtTime(report.created_at)}`),
  ]));

  if (report.ai_solution) {
    const details = el("details");
    details.appendChild(el("summary", { style: "cursor:pointer; font-weight:700; font-size:0.85rem; color: var(--accent);" }, "View AI analysis & audit trail"));
    const inner = el("div", { style: "margin-top:0.75rem; display:flex; flex-direction:column; gap:0.75rem;" });
    inner.appendChild(el("p", { style: "margin:0;" }, [el("strong", {}, "Recommended playbook: "), report.ai_solution]));
    inner.appendChild(el("p", { style: "margin:0;" }, [el("strong", {}, "Reasoning: "), report.ai_reasoning]));
    inner.appendChild(renderAuditTrail(report.audit_trail));
    details.appendChild(inner);
    row.appendChild(details);
  }

  return row;
}

function renderAuditTrail(trail) {
  const wrap = el("div", { class: "audit-trail" });
  (trail || []).forEach((item) => {
    wrap.appendChild(el("div", { class: "audit-item" }, [
      el("div", {}, [el("span", { class: "audit-actor" }, item.actor), ` — ${item.action}`]),
      el("div", { class: "audit-time" }, fmtTime(item.timestamp)),
    ]));
  });
  return wrap;
}
