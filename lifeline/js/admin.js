// ============================================================================
// LifeLine by Cognora — Admin / warden dashboard
// ============================================================================

let adminUser = null;
let adminProfile = null;
let allReports = [];
let studentMap = {};
let activeStatus = "all";
let activeRisk = "all";

(async function init() {
  const auth = await requireAdmin();
  if (!auth) return;
  adminUser = auth.user;
  adminProfile = auth.profile;

  wireLogoutButton();
  wireFilters();
  await loadReports();
})();

function wireFilters() {
  document.querySelectorAll("#status-filters .filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#status-filters .filter-chip").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      activeStatus = btn.dataset.status;
      renderList();
    });
  });
  document.querySelectorAll("#risk-filters .filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#risk-filters .filter-chip").forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      activeRisk = btn.dataset.risk;
      renderList();
    });
  });
}

async function loadReports() {
  const { data: reports, error } = await sb
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("admin-reports-list").innerHTML = "";
    document.getElementById("admin-reports-list").appendChild(el("p", { class: "text-faint" }, "Could not load reports: " + error.message));
    return;
  }
  allReports = reports;

  // Fetch student names for display.
  const studentIds = [...new Set(reports.map((r) => r.student_id))];
  if (studentIds.length) {
    const { data: profiles } = await sb.from("profiles").select("id,name,bh_number,room_number,phone").in("id", studentIds);
    (profiles || []).forEach((p) => (studentMap[p.id] = p));
  }

  renderStats();
  renderList();
}

function renderStats() {
  document.getElementById("stat-total").textContent = allReports.length;
  document.getElementById("stat-review").textContent = allReports.filter((r) => r.status === "in_review" || r.status === "pending").length;
  document.getElementById("stat-high").textContent = allReports.filter((r) => r.risk_level === "high").length;
  document.getElementById("stat-approved").textContent = allReports.filter((r) => r.status === "approved").length;
}

function renderList() {
  const listEl = document.getElementById("admin-reports-list");
  listEl.innerHTML = "";

  const filtered = allReports.filter((r) => {
    const statusOk = activeStatus === "all" || r.status === activeStatus;
    const riskOk = activeRisk === "all" || r.risk_level === activeRisk;
    return statusOk && riskOk;
  });

  if (!filtered.length) {
    listEl.appendChild(el("div", { class: "empty-state" }, "No reports match this filter."));
    return;
  }

  filtered.forEach((report) => listEl.appendChild(renderAdminRow(report)));
}

function renderAdminRow(report) {
  const catInfo = CATEGORIES.find((c) => c.id === report.category);
  const student = studentMap[report.student_id];
  const row = el("article", { class: "report-row" });

  const top = el("div", { class: "report-row__top" }, [
    el("h3", { style: "margin:0; font-size:1.05rem;" }, `${catInfo ? catInfo.emoji + " " : ""}${catInfo ? catInfo.label : report.category}`),
    el("div", { style: "display:flex; gap:0.5rem; flex-wrap:wrap;" }, [
      report.risk_level ? el("span", { class: `badge badge--risk-${report.risk_level}` }, report.risk_level) : el("span", { class: "badge" }, "analyzing…"),
      el("span", { class: `badge badge--status-${report.status}` }, report.status.replace("_", " ")),
    ]),
  ]);
  row.appendChild(top);

  row.appendChild(el("div", { class: "report-row__meta" }, [
    el("span", {}, `👤 ${student ? student.name : "Unknown student"}`),
    el("span", {}, student ? `🏠 ${student.bh_number}, Room ${student.room_number}` : ""),
    student ? el("span", {}, `📞 ${student.phone}`) : null,
    el("span", {}, `📍 ${report.location}`),
    el("span", {}, `🕒 ${fmtTime(report.created_at)}`),
  ]));

  row.appendChild(el("p", { style: "margin:0;" }, [el("strong", {}, "Report: "), report.description]));

  if (report.image_url) {
    row.appendChild(el("p", { style: "margin:0;" }, [el("em", { class: "text-faint" }, "Photo attached (see storage: " + report.image_url + ")")]));
  }

  if (report.ai_solution) {
    const detailGrid = el("div", { class: "report-detail-grid card--tight card", style: "background: var(--bg-alt);" });
    const left = el("div", {}, [
      el("h4", { style: "margin-bottom:0.35rem;" }, "🧠 AI Recommendation"),
      el("p", { style: "margin:0;" }, report.ai_solution),
      el("h4", { style: "margin:1rem 0 0.35rem;" }, "🔍 Reasoning"),
      el("p", { style: "margin:0;" }, report.ai_reasoning),
    ]);

    // Add Neural Network prediction breakdown if inference engine is loaded
    if (typeof predictRisk === "function") {
      try {
        const nnInfo = predictRisk({ category: report.category, description: report.description });
        if (nnInfo && nnInfo.probabilities) {
          const confPct = Math.round(nnInfo.confidence * 100);
          const lowPct = Math.round((nnInfo.probabilities.low || 0) * 100);
          const medPct = Math.round((nnInfo.probabilities.medium || 0) * 100);
          const highPct = Math.round((nnInfo.probabilities.high || 0) * 100);

          const probCard = el("div", { style: "margin-top:0.75rem; padding:0.6rem 0.8rem; background:rgba(0,0,0,0.15); border-radius:6px; border:1px solid var(--border);" }, [
            el("div", { style: "display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; margin-bottom:0.35rem;" }, [
              el("span", {}, "🧠 Neural Network Confidence"),
              el("span", { style: "color:var(--accent);" }, `${confPct}% (${nnInfo.riskLevel.toUpperCase()})`),
            ]),
            el("div", { style: "display:flex; gap:0.75rem; font-size:0.75rem; font-weight:600;" }, [
              el("span", { style: "color:#10b981;" }, `Low: ${lowPct}%`),
              el("span", { style: "color:#f59e0b;" }, `Med: ${medPct}%`),
              el("span", { style: "color:#ef4444;" }, `High: ${highPct}%`),
            ])
          ]);
          left.appendChild(probCard);
        }
      } catch (err) {
        console.warn("Could not calculate NN probability in admin view:", err);
      }
    }

    const right = el("div", {}, [
      el("h4", { style: "margin-bottom:0.5rem;" }, "🧪 Sandbox log"),
      renderSandboxLogMini(report.sandbox_log),
    ]);
    detailGrid.appendChild(left);
    detailGrid.appendChild(right);
    row.appendChild(detailGrid);
  } else {
    row.appendChild(el("p", { class: "text-faint", style: "margin:0;" }, "Sandbox analysis in progress on the student's device — refresh shortly."));
  }


  const details = el("details");
  details.appendChild(el("summary", { style: "cursor:pointer; font-weight:700; font-size:0.85rem; color: var(--accent);" }, "View audit trail"));
  const auditWrap = el("div", { style: "margin-top:0.75rem;" }, renderAuditTrail(report.audit_trail));
  details.appendChild(auditWrap);
  row.appendChild(details);

  if (report.status === "in_review") {
    const actions = el("div", { class: "report-row__actions" }, [
      el("button", { class: "btn btn--primary btn--sm", onclick: () => actOnReport(report.id, "approved") }, "✅ Approve playbook"),
      el("button", { class: "btn btn--danger btn--sm", onclick: () => actOnReport(report.id, "rejected") }, "✖ Reject"),
    ]);
    row.appendChild(actions);
  } else if (report.status === "approved") {
    row.appendChild(el("p", { class: "text-faint", style: "margin:0.4rem 0 0;" }, `Approved by ${report.approved_by === adminUser.id ? adminProfile.name : "staff"} on ${report.approved_at ? fmtTime(report.approved_at) : ""}.`));
  }

  return row;
}

function renderSandboxLogMini(log) {
  const wrap = el("div", { class: "sandbox__log", style: "max-height:9rem;" });
  (log || []).forEach((line) => {
    wrap.appendChild(el("div", { class: "sandbox__log-line", style: "opacity:1;" }, [
      el("span", { class: line.level }, line.text),
    ]));
  });
  return wrap;
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

async function actOnReport(reportId, newStatus) {
  const report = allReports.find((r) => r.id === reportId);
  const auditEntry = {
    action: newStatus === "approved" ? "Playbook approved by warden" : "Report rejected by warden",
    actor: adminProfile.name,
    timestamp: new Date().toISOString(),
  };
  const updatedTrail = [...(report.audit_trail || []), auditEntry];

  const { error } = await sb
    .from("reports")
    .update({
      status: newStatus,
      approved_by: adminUser.id,
      approved_at: new Date().toISOString(),
      audit_trail: updatedTrail,
    })
    .eq("id", reportId);

  if (error) {
    showToast("Action failed: " + error.message, "error");
    return;
  }
  showToast(newStatus === "approved" ? "Playbook approved." : "Report rejected.", "success");
  await loadReports();
}
