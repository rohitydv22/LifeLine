// ============================================================================
// LifeLine by Cognora — Supabase client, Environment & Role-Separated Auth Guard
// ============================================================================

let SUPABASE_URL = "https://nxqujcjaxykvcgmmzbvd.supabase.co";
let SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cXVqY2pheHlrdmNnbW16YnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODYyOTUsImV4cCI6MjEwMzY2MjI5NX0.2FQAYV8wh2uVKjMi2dvmsHbKaZbiZUrJWbulp6YWpZo";

if (typeof window !== "undefined") {
  window.LIFE_LINE_CONFIG = {
    googleClientId: "",
    googleRedirectUri: window.location.origin + "/api/auth/google/callback",
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    nodeEnv: "development"
  };

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
}

const sb = (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const CATEGORIES = [
  { id: "electrical", label: "Electrical", emoji: "⚡" },
  { id: "plumbing", label: "Plumbing", emoji: "🚿" },
  { id: "network", label: "Network / WiFi", emoji: "📶" },
  { id: "mess_food", label: "Mess Food & Safety", emoji: "🍱" },
  { id: "fire_safety", label: "Fire / Safety", emoji: "🔥" },
  { id: "structural", label: "Structural", emoji: "🧱" },
  { id: "sanitation", label: "Sanitation", emoji: "🧹" },
  { id: "security", label: "Security", emoji: "🔒" },
  { id: "other", label: "Other", emoji: "❓" },
];

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

const STORAGE_KEY_STUDENT = "lifeline_student_session";
const STORAGE_KEY_STAFF = "lifeline_staff_session";

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
      if (parsed && parsed.profile && parsed.profile.role === "admin") return parsed;
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

async function requireAuth() {
  const student = getStudentSession();
  if (student && student.profile && student.profile.role === "student") {
    return student;
  }
  window.location.href = "login.html";
  return null;
}

async function requireAdmin() {
  const staff = getStaffSession();
  if (staff && staff.profile && staff.profile.role === "admin") {
    return staff;
  }
  window.location.href = "admin-login.html";
  return null;
}

function wireLogoutButton() {
  const btn = document.querySelector("[data-logout]");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    clearStudentSession();
    clearStaffSession();
    if (sb && sb.auth) {
      try { await sb.auth.signOut(); } catch (err) {}
    }
    window.location.href = "index.html";
  });
}
