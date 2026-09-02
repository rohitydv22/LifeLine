// ============================================================================
// LifeLine by Cognora — Supabase Client, Pre-Seeded Accounts & Role-Separated Auth
// ============================================================================

let SUPABASE_URL = "https://nxqujcjaxykvcgmmzbvd.supabase.co";
let SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cXVqY2pheHlrdmNnbW16YnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODYyOTUsImV4cCI6MjEwMzY2MjI5NX0.2FQAYV8wh2uVKjMi2dvmsHbKaZbiZUrJWbulp6YWpZo";

window.LIFE_LINE_CONFIG = {
  googleClientId: "",
  googleRedirectUri: window.location.origin + "/api/auth/google/callback",
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  nodeEnv: "development"
};

// Asynchronously hydrate configuration from backend /api/config if running via node server
async function initAppConfig() {
  if (window.location.protocol.startsWith("http")) {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const cfg = await res.json();
        window.LIFE_LINE_CONFIG = { ...window.LIFE_LINE_CONFIG, ...cfg };
        if (cfg.supabaseUrl && cfg.supabaseUrl !== SUPABASE_URL) {
          SUPABASE_URL = cfg.supabaseUrl;
        }
        if (cfg.supabaseAnonKey && cfg.supabaseAnonKey !== SUPABASE_ANON_KEY) {
          SUPABASE_ANON_KEY = cfg.supabaseAnonKey;
        }
      }
    } catch (e) {}
  }
}
initAppConfig();

const sb = (window.supabase && typeof window.supabase.createClient === "function")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const CATEGORIES = [
  { id: "network", label: "Wi-Fi / Network", emoji: "📶" },
  { id: "website", label: "Website / Student Portal", emoji: "🌐" },
  { id: "mess_food", label: "Food Issue", emoji: "🍽️" },
  { id: "plumbing", label: "Drinking Water", emoji: "💧" },
  { id: "facility", label: "Hostel / Facility Issue", emoji: "🏢" },
  { id: "other", label: "Other Campus Infrastructure", emoji: "🔧" }
];

// ----------------------------------------------------------------------------
// PRE-SEEDED ACCOUNTS & CREDENTIALS REPOSITORY
// ----------------------------------------------------------------------------
const STORAGE_KEY_ACCOUNTS = "lifeline_registered_accounts_v4";

const DEFAULT_ACCOUNTS = [
  {
    id: "usr-std-01",
    email: "student@lifeline.campus",
    password: "student123",
    role: "student",
    department: "student",
    name: "Alex Kumar",
    title: "Student Resident",
    bh_number: "Hostel A",
    room_number: "306",
    phone: "9876543210"
  },
  {
    id: "usr-it-01",
    email: "it@lifeline.campus",
    password: "it123",
    role: "staff",
    department: "it",
    departmentLabel: "IT & Network Operations",
    name: "Debashish Roy",
    title: "Lead Network & Systems Engineer",
    bh_number: "NOC Block",
    room_number: "Server Rm 102",
    phone: "9876543211"
  },
  {
    id: "usr-hostel-01",
    email: "hostel@lifeline.campus",
    password: "hostel123",
    role: "staff",
    department: "hostel",
    departmentLabel: "Hostel Maintenance & Facilities",
    name: "Er. Ramesh K. Sharma",
    title: "Hostel Maintenance Warden",
    bh_number: "Hostel Caretaker Office",
    room_number: "Suite 1",
    phone: "9876543214"
  },
  {
    id: "usr-mess-01",
    email: "mess@lifeline.campus",
    password: "mess123",
    role: "staff",
    department: "mess",
    departmentLabel: "Mess & Food Safety Authority",
    name: "Dr. Ananya Sen",
    title: "Food Safety Officer & Chief Dietitian",
    bh_number: "Central Dining Wing",
    room_number: "Lab 201",
    phone: "9876543215"
  },
  {
    id: "usr-auth-01",
    email: "authority@lifeline.campus",
    password: "authority123",
    role: "authority",
    department: "admin",
    departmentLabel: "Campus Administration",
    name: "Dr. Vikram Singh",
    title: "Chief Hostel Warden & Executive Authority",
    bh_number: "Admin Block",
    room_number: "Suite 101",
    phone: "9876543212"
  },
  {
    id: "usr-staff-01",
    email: "staff@lifeline.campus",
    password: "staff123",
    role: "staff",
    department: "hostel",
    departmentLabel: "Hostel Maintenance & Operations",
    name: "Er. Ramesh K. Sharma",
    title: "Hostel Operations Staff",
    bh_number: "Hostel Block A",
    room_number: "Suite 1",
    phone: "9876543214"
  },
  {
    id: "usr-admin-01",
    email: "admin@lifeline.campus",
    password: "admin123",
    role: "authority",
    department: "admin",
    departmentLabel: "Campus Administration",
    name: "Campus System Administrator",
    title: "Executive Operations Admin",
    bh_number: "Admin Block",
    room_number: "HQ",
    phone: "9876543213"
  }
];

function getAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default accounts are present
        const merged = [...parsed];
        for (const def of DEFAULT_ACCOUNTS) {
          if (!merged.some(a => a.email.toLowerCase() === def.email.toLowerCase())) {
            merged.push(def);
          }
        }
        return merged;
      }
    }
  } catch (e) {}
  saveAccounts(DEFAULT_ACCOUNTS);
  return DEFAULT_ACCOUNTS;
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {}
}

function registerNewAccount(accountData) {
  const accounts = getAccounts();
  const existing = accounts.find(a => a.email.toLowerCase() === accountData.email.toLowerCase());
  if (existing) {
    throw new Error("An account with this email address already exists. Please sign in.");
  }

  const newAccount = {
    id: "usr-" + Date.now(),
    email: accountData.email.trim(),
    password: accountData.password,
    role: accountData.role || "student",
    name: accountData.name || "Student Resident",
    title: accountData.role === "authority" ? "Chief Warden" : accountData.role === "staff" ? "Operations Staff" : "Student Resident",
    bh_number: accountData.bh_number || "Hostel A",
    room_number: accountData.room_number || "101",
    phone: accountData.phone || "",
    createdAt: new Date().toISOString()
  };

  accounts.push(newAccount);
  saveAccounts(accounts);
  return newAccount;
}

function authenticateCredentials(email, password) {
  const accounts = getAccounts();
  const targetEmail = (email || "").trim().toLowerCase();
  const match = accounts.find(a => a.email.toLowerCase() === targetEmail && a.password === password);
  return match || null;
}

// ----------------------------------------------------------------------------
// Small shared DOM & UI helpers
// ----------------------------------------------------------------------------
function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function toastRegion() {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = el("div", { class: "toast-region", role: "status", "aria-live": "polite" });
    document.body.appendChild(region);
  }
  return region;
}

function showToast(message, type = "info") {
  const region = toastRegion();
  const toast = el("div", { class: `toast toast--${type}` }, message);
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ----------------------------------------------------------------------------
// STRICTLY SEPARATED SESSION STORES
// Student sessions and Staff/Authority sessions are isolated in storage.
// ----------------------------------------------------------------------------
const STORAGE_KEY_STUDENT = "lifeline_student_session_v3";
const STORAGE_KEY_STAFF = "lifeline_staff_session_v3";

function getStudentSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.profile && parsed.profile.role === "student") return parsed;
    }
  } catch (e) {}
  return null;
}

function setStudentSession(session) {
  localStorage.setItem(STORAGE_KEY_STUDENT, JSON.stringify(session));
}

function clearStudentSession() {
  localStorage.removeItem(STORAGE_KEY_STUDENT);
}

function getStaffSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAFF);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.profile) {
        const r = parsed.profile.role;
        if (r === "admin" || r === "authority" || r === "staff" || r === "operator") return parsed;
      }
    }
  } catch (e) {}
  return null;
}

function setStaffSession(session) {
  localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(session));
}

function clearStaffSession() {
  localStorage.removeItem(STORAGE_KEY_STAFF);
}

// ----------------------------------------------------------------------------
// ROLE GUARDS
// ----------------------------------------------------------------------------

// Guard for Student Portal (report.html):
// Requires an authenticated Student session.
async function requireAuth() {
  const student = getStudentSession();
  if (student && student.profile && student.profile.role === "student") {
    return student;
  }
  // Not logged in as a student -> redirect to login
  window.location.href = "login.html";
  return null;
}

// Guard for Operations / Authority Console (admin.html):
// Requires an authenticated Staff or Authority session.
async function requireAdmin() {
  const staff = getStaffSession();
  if (staff && staff.profile) {
    const r = staff.profile.role;
    if (r === "admin" || r === "authority" || r === "staff" || r === "operator") {
      return staff;
    }
  }
  // Not logged in as staff/authority -> redirect to login
  window.location.href = "admin-login.html";
  return null;
}

function wireLogoutButton() {
  document.querySelectorAll("[data-logout]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      clearStudentSession();
      clearStaffSession();
      if (sb && sb.auth) {
        try { await sb.auth.signOut(); } catch (err) {}
      }
      window.location.href = "index.html";
    });
  });
}

// Export functions to global
window.getAccounts = getAccounts;
window.saveAccounts = saveAccounts;
window.registerNewAccount = registerNewAccount;
window.authenticateCredentials = authenticateCredentials;
window.getStudentSession = getStudentSession;
window.setStudentSession = setStudentSession;
window.clearStudentSession = clearStudentSession;
window.getStaffSession = getStaffSession;
window.setStaffSession = setStaffSession;
window.clearStaffSession = clearStaffSession;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;
window.wireLogoutButton = wireLogoutButton;
window.showToast = showToast;
window.fmtTime = fmtTime;
window.el = el;
window.CATEGORIES = CATEGORIES;

