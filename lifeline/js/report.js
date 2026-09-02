// ============================================================================
// LifeLine — Student Helpdesk & Real-Time Complaint Tracking Controller
// ============================================================================

let currentUser = null;
let currentProfile = null;
let attachedImageDataUrl = null;

const STUDENT_CATEGORIES = [
  { id: "network", label: "Wi-Fi & Network", emoji: "📶", dept: "IT & Network Operations" },
  { id: "website", label: "Web Portal & ERP", emoji: "🌐", dept: "IT & Network Operations" },
  { id: "food_safety", label: "Mess & Food Safety", emoji: "🍽️", dept: "Mess & Food Safety Authority" },
  { id: "water", label: "Drinking Water & Plumbing", emoji: "🚰", dept: "Hostel Maintenance / Mess" },
  { id: "electrical", label: "Power & Electrical", emoji: "💡", dept: "Hostel Maintenance - Electrical" },
  { id: "facilities", label: "Hostel & Room Maintenance", emoji: "🏢", dept: "Hostel Maintenance & Facilities" }
];

const LIFECYCLE_STAGES = [
  { key: "Submitted", label: "Submitted", icon: "🟡" },
  { key: "Assigned", label: "Assigned", icon: "🔵" },
  { key: "Under Investigation", label: "Under Investigation", icon: "🟣" },
  { key: "Action in Progress", label: "Action in Progress", icon: "🟠" },
  { key: "Resolved", label: "Resolved", icon: "🟢" },
  { key: "Verified / Closed", label: "Verified / Closed", icon: "✅" }
];

(async function init() {
  const auth = await requireAuth();
  if (!auth) return;
  currentUser = auth.user;
  currentProfile = auth.profile;

  const nameEl = document.getElementById("student-name");
  if (nameEl && currentProfile.name) {
    nameEl.textContent = `${currentProfile.name} (${currentProfile.bh_number || 'Hostel A'}, Rm ${currentProfile.room_number || '306'})`;
  }

  wireLogoutButton();
  renderCategoryGrid();
  wireImageUploadPreview();
  loadMyComplaints();

  // Reactive cross-tab listener
  if (typeof CampusStateEngine !== "undefined" && CampusStateEngine.subscribe) {
    CampusStateEngine.subscribe((event) => {
      if (event === "student_reports_changed" || event === "incidents_changed") {
        loadMyComplaints();
      }
    });
  }
})();

function renderCategoryGrid() {
  const grid = document.getElementById("category-grid");
  if (!grid) return;
  grid.innerHTML = "";

  STUDENT_CATEGORIES.forEach((cat, i) => {
    const wrap = el("div", { class: "category-option" }, [
      el("input", {
        type: "radio",
        name: "category",
        id: `cat-${cat.id}`,
        value: cat.id,
        ...(i === 0 ? { checked: "checked" } : {})
      }),
      el("label", { for: `cat-${cat.id}` }, [
        el("span", { style: "font-size:1.4rem;", "aria-hidden": "true" }, cat.emoji),
        el("span", { style: "font-weight:600; font-size:0.85rem;" }, cat.label)
      ])
    ]);
    grid.appendChild(wrap);
  });
}

function wireImageUploadPreview() {
  const fileInput = document.getElementById("image");
  const previewContainer = document.getElementById("image-preview-container");
  const previewImg = document.getElementById("image-preview-img");
  const previewName = document.getElementById("image-preview-name");
  const removeBtn = document.getElementById("btn-remove-image");

  if (!fileInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) {
      attachedImageDataUrl = null;
      if (previewContainer) previewContainer.style.display = "none";
      return;
    }

    try {
      attachedImageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (previewImg) previewImg.src = attachedImageDataUrl;
      if (previewName) previewName.textContent = file.name;
      if (previewContainer) previewContainer.style.display = "flex";
    } catch (err) {
      console.error("Image preview error:", err);
      attachedImageDataUrl = null;
    }
  });

  removeBtn?.addEventListener("click", () => {
    fileInput.value = "";
    attachedImageDataUrl = null;
    if (previewContainer) previewContainer.style.display = "none";
  });
}

function quickFillForm(catId, desc) {
  const rad = document.getElementById(`cat-${catId}`);
  if (rad) {
    rad.checked = true;
    rad.click();
    rad.dispatchEvent(new Event("change", { bubbles: true }));
  }
  const descEl = document.getElementById("description");
  if (descEl) {
    descEl.value = desc;
  }
  const locEl = document.getElementById("location");
  if (locEl) {
    locEl.value = "";
    locEl.focus();
  }
  showToast("Sample issue details loaded. Please enter your room / location number.", "info");
}

// ----------------------------------------------------------------------------
// FORM SUBMISSION
// ----------------------------------------------------------------------------
const reportForm = document.getElementById("report-form");
const submitBtn = document.getElementById("submit-btn");

reportForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("err-category").textContent = "";
  document.getElementById("err-description").textContent = "";
  document.getElementById("err-location").textContent = "";

  const categoryInput = reportForm.querySelector('input[name="category"]:checked');
  const description = document.getElementById("description").value.trim();
  const location = document.getElementById("location").value.trim();

  let valid = true;
  if (!categoryInput) {
    document.getElementById("err-category").textContent = "Please select an issue category.";
    valid = false;
  }
  if (!location) {
    document.getElementById("err-location").textContent = "Please specify your room or campus location.";
    valid = false;
  }
  if (!description) {
    document.getElementById("err-description").textContent = "Please describe what problem you are facing.";
    valid = false;
  }
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Submitting & Routing Complaint…`;

  const categoryId = categoryInput.value;
  const catObj = STUDENT_CATEGORIES.find(c => c.id === categoryId) || { label: "Campus Issue", emoji: "🔧", dept: "Hostel Maintenance" };

  try {
    // Submit to central state engine
    const savedReport = CampusStateEngine.addStudentReport({
      category: categoryId,
      categoryLabel: catObj.label,
      categoryEmoji: catObj.emoji,
      student_id: currentUser?.id || "usr-std-01",
      student_name: currentProfile?.name || "Alex Kumar",
      student_room: currentProfile?.room_number || location,
      location,
      description,
      image_url: attachedImageDataUrl
    });

    // Reset Form
    reportForm.reset();
    attachedImageDataUrl = null;
    const previewContainer = document.getElementById("image-preview-container");
    if (previewContainer) previewContainer.style.display = "none";
    renderCategoryGrid();
    submitBtn.disabled = false;
    submitBtn.textContent = "📨 Submit Complaint";

    // Show Confirmation Banner
    const successBox = document.getElementById("submit-success-box");
    const successTitle = document.getElementById("success-title");
    const successRefId = document.getElementById("success-ref-id");
    const successMsg = document.getElementById("success-msg");

    if (successBox && successTitle && successMsg) {
      successTitle.textContent = `Complaint Recorded: #${savedReport.id}`;
      if (successRefId) successRefId.textContent = `#${savedReport.id}`;

      let msgHtml = `Your report for <strong>${location}</strong> has been routed to <strong>${savedReport.departmentLabel}</strong> (<em>${savedReport.assignedOfficer}</em>).`;
      if (savedReport.isUrgentSafety) {
        msgHtml += `<br><span style="color:#DC2626; font-weight:700;">⚠️ Urgent Safety Flag Active: Escalated to Food Safety & Campus Administration.</span>`;
      }
      successMsg.innerHTML = msgHtml;
      successBox.style.display = "block";
      successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    showToast(`Complaint #${savedReport.id} routed to ${savedReport.departmentLabel}!`, "success");
    loadMyComplaints();

  } catch (err) {
    console.error("Submission error:", err);
    submitBtn.disabled = false;
    submitBtn.textContent = "📨 Submit Complaint";
    showToast("Failed to submit: " + err.message, "error");
  }
});

// ----------------------------------------------------------------------------
// LOAD AND RENDER STUDENT COMPLAINTS WITH 6-STAGE TRACKER
// ----------------------------------------------------------------------------
function loadMyComplaints() {
  const container = document.getElementById("my-reports-list");
  const countEl = document.getElementById("my-reports-count");
  if (!container) return;

  const allReports = CampusStateEngine.loadStudentReports();
  // Show student's submitted reports
  const myReports = allReports;

  if (countEl) {
    countEl.textContent = `${myReports.length} ${myReports.length === 1 ? 'Complaint' : 'Complaints'}`;
  }

  container.innerHTML = "";

  if (!myReports.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p style="font-size:1rem; margin-bottom:0.35rem; color:var(--heading-color); font-weight:600;">No Complaints Submitted Yet</p>
        <p style="font-size:0.85rem; margin:0; color:var(--text-muted);">Use the form above to report a Wi-Fi, food, water, or hostel facility problem.</p>
      </div>
    `;
    return;
  }

  myReports.forEach(rep => {
    const card = el("article", { class: "complaint-card" });

    // Status Badge & Styling
    let statusClass = "badge--status-submitted";
    const st = (rep.status || "").toLowerCase();
    if (st.includes("assigned")) statusClass = "badge--status-assigned";
    else if (st.includes("investigat")) statusClass = "badge--status-investigating";
    else if (st.includes("progress")) statusClass = "badge--status-progress";
    else if (st.includes("resolved")) statusClass = "badge--status-resolved";
    else if (st.includes("closed") || st.includes("verified")) statusClass = "badge--status-closed";

    // Priority Badge
    let priorityBadgeClass = "badge--priority-low";
    if (rep.operationalPriority?.includes("Critical") || rep.isUrgentSafety) {
      priorityBadgeClass = "badge--priority-critical";
    } else if (rep.operationalPriority?.includes("High")) {
      priorityBadgeClass = "badge--priority-high";
    } else if (rep.operationalPriority?.includes("Medium")) {
      priorityBadgeClass = "badge--priority-medium";
    }

    // Header
    const header = el("div", { class: "complaint-card__header" }, [
      el("div", { style: "display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;" }, [
        el("span", { style: "font-size:1.3rem;" }, rep.categoryEmoji || "🔧"),
        el("span", { class: "complaint-card__title" }, [
          document.createTextNode(rep.categoryLabel || rep.category),
          el("span", { style: "font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted); font-weight:normal;" }, `#${rep.id}`)
        ])
      ]),
      el("div", { style: "display:flex; gap:0.4rem; align-items:center;" }, [
        el("span", { class: `badge ${priorityBadgeClass}` }, rep.operationalPriority || "P3 - Medium"),
        el("span", { class: `badge ${statusClass}` }, rep.status || "Assigned")
      ])
    ]);

    // Metadata
    const meta = el("div", { class: "complaint-card__meta" }, [
      el("span", {}, `📍 ${rep.location || 'Campus'}`),
      el("span", {}, `🏢 Assigned to: <strong>${rep.departmentLabel || 'Hostel Maintenance'}</strong> (${rep.assignedOfficer || 'Duty Officer'})`),
      el("span", {}, `🕒 ${fmtTime(rep.created_at)}`)
    ]);

    // Description
    const body = el("p", { class: "complaint-card__desc" }, rep.description);

    // 6-Stage Lifecycle Stepper Bar
    const stepper = renderLifecycleStepper(rep.status);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(body);

    // Urgent Safety Alert Flag
    if (rep.isUrgentSafety) {
      const urgentAlert = el("div", {
        style: "background:#FEE2E2; border:1px solid #FCA5A5; color:#B91C1C; padding:0.45rem 0.75rem; border-radius:var(--radius-sm); font-size:0.8rem; font-weight:700; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.4rem;"
      }, [
        el("span", {}, "⚠️ Urgent Safety Incident:"),
        el("span", { style: "font-weight:normal;" }, "Immediate on-site inspection and authority response initiated.")
      ]);
      card.appendChild(urgentAlert);
    }

    // Attached Image Thumbnail
    if (rep.image_url) {
      const imgRow = el("div", { style: "margin-bottom:0.75rem; display:flex; align-items:center; gap:0.6rem;" }, [
        el("img", {
          src: rep.image_url,
          alt: "Attached photo evidence",
          class: "image-thumb-preview",
          onclick: () => openPhotoModal(rep.image_url, `Complaint #${rep.id} Attached Evidence`)
        }),
        el("span", { style: "font-size:0.78rem; color:var(--text-muted);" }, "📸 Photo attached (Click to view)")
      ]);
      card.appendChild(imgRow);
    }

    // Resolution Notes (if any)
    if (rep.resolutionNotes) {
      const notesBox = el("div", {
        style: "background:var(--status-success-bg); border:1px solid var(--status-success-border); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.82rem; color:var(--status-success); margin-bottom:0.75rem;"
      }, [
        el("strong", {}, "Resolution Notes: "),
        document.createTextNode(rep.resolutionNotes)
      ]);
      card.appendChild(notesBox);
    }

    // Priority Reason explanation
    if (rep.priorityReason) {
      const reasonBox = el("div", { style: "font-size:0.78rem; color:var(--text-faint); margin-bottom:0.5rem;" }, [
        el("span", { style: "font-weight:600;" }, "Priority Reason: "),
        document.createTextNode(rep.priorityReason)
      ]);
      card.appendChild(reasonBox);
    }

    card.appendChild(stepper);
    container.appendChild(card);
  });
}

function renderLifecycleStepper(currentStatus) {
  const currentLower = (currentStatus || "").toLowerCase();
  
  // Find current active index
  let activeIndex = 0;
  if (currentLower.includes("assigned")) activeIndex = 1;
  else if (currentLower.includes("investigat")) activeIndex = 2;
  else if (currentLower.includes("progress")) activeIndex = 3;
  else if (currentLower.includes("resolved")) activeIndex = 4;
  else if (currentLower.includes("closed") || currentLower.includes("verified")) activeIndex = 5;

  const stepperList = el("ol", { class: "lifecycle-stepper" });

  LIFECYCLE_STAGES.forEach((stage, idx) => {
    let stateClass = "";
    if (idx < activeIndex) stateClass = "completed";
    else if (idx === activeIndex) stateClass = "active";

    const stepItem = el("li", { class: `lifecycle-step ${stateClass}` }, [
      el("span", { style: "display:block; font-size:0.7rem; margin-bottom:0.15rem;" }, stage.icon),
      el("span", {}, stage.label)
    ]);
    stepperList.appendChild(stepItem);
  });

  return stepperList;
}

function openPhotoModal(imgSrc, title) {
  const existing = document.getElementById("photo-modal");
  if (existing) existing.remove();

  const modal = el("div", {
    id: "photo-modal",
    style: "position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; padding:1.5rem;",
    onclick: (e) => { if (e.target === modal) modal.remove(); }
  }, [
    el("div", {
      style: "background:#FFFFFF; border-radius:8px; padding:1rem; max-width:90vw; max-height:90vh; display:flex; flex-direction:column; gap:0.75rem; box-shadow:0 10px 30px rgba(0,0,0,0.5);"
    }, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:center;" }, [
        el("strong", { style: "font-size:0.95rem; color:#2C3947;" }, title || "Photo Evidence"),
        el("button", {
          class: "btn btn--ghost btn--sm",
          style: "padding:0.2rem 0.5rem;",
          onclick: () => modal.remove()
        }, "✕ Close")
      ]),
      el("img", {
        src: imgSrc,
        style: "max-width:100%; max-height:75vh; object-fit:contain; border-radius:4px;"
      })
    ])
  ]);

  document.body.appendChild(modal);
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
  window.quickFillForm = quickFillForm;
  window.openPhotoModal = openPhotoModal;
}
