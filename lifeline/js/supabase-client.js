// ============================================================================
// LifeLine by Cognora — Supabase client
// ----------------------------------------------------------------------------
// Fill in your project's URL and anon key below. Find them in your Supabase
// project: Settings -> API -> "Project URL" and "anon public" key.
// The anon key is safe to expose in frontend code — access is controlled by
// the Row Level Security policies in supabase/schema.sql.
// ============================================================================

const SUPABASE_URL = "https://nxqujcjaxykvcgmmzbvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cXVqY2pheHlrdmNnbW16YnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwODYyOTUsImV4cCI6MjEwMzY2MjI5NX0.2FQAYV8wh2uVKjMi2dvmsHbKaZbiZUrJWbulp6YWpZo";

// The Supabase JS SDK is loaded via CDN script tag in each HTML page
// (see the <script src="https://unpkg.com/@supabase/supabase-js@2..."> tag),
// which exposes the global `supabase` factory used below.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ----------------------------------------------------------------------------
// Small shared helpers
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

// Check for local demo / evaluator session
function getDemoSession() {
  try {
    const raw = localStorage.getItem("lifeline_demo_session");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function setDemoSession(role = "admin", name = "Chief Warden / Ops Lead") {
  const sess = {
    user: { id: "demo-user-" + role, email: `${role}@lifeline.campus` },
    profile: {
      id: "demo-user-" + role,
      name,
      email: `${role}@lifeline.campus`,
      role,
      bh_number: "BH-1",
      room_number: "101",
      phone: "9876543210"
    }
  };
  localStorage.setItem("lifeline_demo_session", JSON.stringify(sess));
  return sess;
}

// Requires a logged-in session; redirects to login.html otherwise.
// Returns { user, profile }.
async function requireAuth() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const { data: profile, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!error && profile) {
        return { user: session.user, profile };
      }
    }
  } catch (err) {
    console.warn("Supabase auth check fallback:", err);
  }

  // Check demo session
  const demo = getDemoSession();
  if (demo && demo.profile) {
    return demo;
  }

  // Not logged in -> redirect to student login
  window.location.href = "login.html";
  return null;
}

async function requireAdmin() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const { data: profile } = await sb
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (profile && profile.role === "admin") {
        return { user: session.user, profile };
      }
    }
  } catch (err) {
    console.warn("Supabase admin auth check fallback:", err);
  }

  // Check demo session
  const demo = getDemoSession();
  if (demo && demo.profile && demo.profile.role === "admin") {
    return demo;
  }

  // Not logged in as admin -> redirect to staff login
  window.location.href = "admin-login.html";
  return null;
}

function wireLogoutButton() {
  const btn = document.querySelector("[data-logout]");
  if (!btn) return;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    localStorage.removeItem("lifeline_demo_session");
    try { await sb.auth.signOut(); } catch (e) {}
    window.location.href = "index.html";
  });
}
