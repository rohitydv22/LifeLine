// ============================================================================
// LifeLine by Cognora — Login flow (shared by login.html and admin-login.html)
// ============================================================================

const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const wantsAdmin = loginForm.dataset.redirect === "admin.html";

function setLoginError(fieldId, message) {
  const errEl = document.getElementById(`err-${fieldId}`);
  if (errEl) errEl.textContent = message || "";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoginError("email", "");
  setLoginError("password", "");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    if (!email) setLoginError("email", "Email is required.");
    if (!password) setLoginError("password", "Password is required.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Logging in…`;

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profileError) throw profileError;

    if (wantsAdmin && profile.role !== "admin") {
      await sb.auth.signOut();
      showToast("This account does not have staff access.", "error");
      loginBtn.disabled = false;
      loginBtn.textContent = "Log in to dashboard";
      return;
    }

    if (!wantsAdmin && profile.role === "admin") {
      // Staff can still use the student flow if needed, but nudge them.
      window.location.href = "admin.html";
      return;
    }

    window.location.href = wantsAdmin ? "admin.html" : "report.html";
  } catch (err) {
    console.error(err);
    showToast(err.message || "Login failed. Check your email and password.", "error");
    loginBtn.disabled = false;
    loginBtn.textContent = wantsAdmin ? "Log in to dashboard" : "Log in";
  }
});
