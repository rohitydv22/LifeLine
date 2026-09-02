// ============================================================================
// LifeLine by Cognora — Authentication Controller (Student, Staff, Authority)
// ============================================================================

const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const errEmail = document.getElementById("err-email");
const errPassword = document.getElementById("err-password");
const wantsAdmin = (loginForm?.dataset.redirect || "").includes("admin.html");

// Check if already authenticated with active session
(async function checkExistingAuth() {
  const staffSession = typeof getStaffSession === "function" ? getStaffSession() : null;
  const studentSession = typeof getStudentSession === "function" ? getStudentSession() : null;

  if (wantsAdmin && staffSession && staffSession.profile) {
    window.location.href = "admin.html";
  } else if (!wantsAdmin && studentSession && studentSession.profile) {
    window.location.href = "report.html";
  }
})();

function clearErrors() {
  if (errEmail) errEmail.textContent = "";
  if (errPassword) errPassword.textContent = "";
}

// Password visibility toggle
const togglePassBtn = document.getElementById("btn-toggle-password");
const passInput = document.getElementById("password");
if (togglePassBtn && passInput) {
  togglePassBtn.addEventListener("click", () => {
    const isPassword = passInput.type === "password";
    passInput.type = isPassword ? "text" : "password";
    togglePassBtn.textContent = isPassword ? "🙈" : "👁️";
  });
}

// ----------------------------------------------------------------------------
// FORM SUBMISSION & AUTHENTICATION HANDLER
// ----------------------------------------------------------------------------
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const email = (loginForm.email.value || "").trim();
  const password = loginForm.password.value || "";

  let valid = true;
  if (!email || !email.includes("@")) {
    if (errEmail) errEmail.textContent = "Please enter a valid email address.";
    valid = false;
  }
  if (!password) {
    if (errPassword) errPassword.textContent = "Password is required.";
    valid = false;
  }
  if (!valid) return;

  const originalBtnText = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Signing in…`;

  try {
    // 1. Verify against Local Persistent Accounts Store
    const account = typeof authenticateCredentials === "function" 
      ? authenticateCredentials(email, password) 
      : null;

    if (!account) {
      // Check if user exists with different password
      const allAccounts = typeof getAccounts === "function" ? getAccounts() : [];
      const userExists = allAccounts.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (userExists) {
        if (errPassword) errPassword.textContent = "Incorrect password for this account.";
        throw new Error("Incorrect password for this account. Please verify credentials.");
      } else {
        if (errEmail) errEmail.textContent = "Account not found with this email.";
        throw new Error("Account not found. Please verify your email or create a new account.");
      }
    }

    // 2. Validate Role Permissions
    const userRole = account.role; // 'student' | 'staff' | 'authority'

    if (wantsAdmin && userRole === "student") {
      throw new Error("Access Denied: Student accounts cannot access the Operations Console. Please use the Student Login.");
    }

    if (!wantsAdmin && (userRole === "staff" || userRole === "authority")) {
      setStaffSession({ user: account, profile: account });
      showToast(`Welcome ${account.name}! Redirecting to Operations Console…`, "success");
      setTimeout(() => { window.location.href = "admin.html"; }, 350);
      return;
    }

    // 3. Establish Role-Specific Session
    if (userRole === "student") {
      setStudentSession({ user: account, profile: account });
      showToast(`Welcome back, ${account.name}! Redirecting…`, "success");
      setTimeout(() => { window.location.href = "report.html"; }, 350);
    } else {
      setStaffSession({ user: account, profile: account });
      showToast(`Welcome, ${account.name}! Redirecting to Operations Console…`, "success");
      setTimeout(() => { window.location.href = "admin.html"; }, 350);
    }

  } catch (err) {
    console.error("Auth error:", err);
    loginBtn.disabled = false;
    loginBtn.textContent = originalBtnText;
    showToast(err.message || "Authentication failed.", "error");
  }
});
