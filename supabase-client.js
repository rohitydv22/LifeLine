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

// Requires a logged-in session; redirects to login.html otherwise.
// Returns { user, profile }.
async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  const { data: profile, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    showToast("Could not load your profile. Please log in again.", "error");
    await sb.auth.signOut();
    window.location.href = "login.html";
    return null;
  }
  return { user: session.user, profile };
}

async function requireAdmin() {
  const auth = await requireAuth();
  if (!auth) return null;
  if (auth.profile.role !== "admin") {
    showToast("This page is for wardens/staff only.", "error");
    window.location.href = "report.html";
    return null;
  }
  return auth;
}

function wireLogoutButton() {
  const btn = document.querySelector("[data-logout]");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await sb.auth.signOut();
    window.location.href = "index.html";
  });
}
