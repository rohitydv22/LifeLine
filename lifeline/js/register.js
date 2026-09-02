// ============================================================================
// LifeLine by Cognora — Student Registration Controller
// ============================================================================

const registerForm = document.getElementById("register-form");
const submitBtn = document.getElementById("register-btn");

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));

  const data = {
    name: registerForm.name.value.trim(),
    phone: registerForm.phone.value.trim(),
    bh_number: registerForm.bh_number.value.trim(),
    room_number: registerForm.room_number.value.trim(),
    email: registerForm.email.value.trim(),
    password: registerForm.password.value,
    confirm: registerForm.confirm_password.value,
  };

  let valid = true;
  if (!data.name) {
    document.getElementById("err-name").textContent = "Name is required.";
    valid = false;
  }
  if (!data.phone || !/^[0-9]{10}$/.test(data.phone)) {
    document.getElementById("err-phone").textContent = "Enter a valid 10-digit mobile number.";
    valid = false;
  }
  if (!data.bh_number) {
    document.getElementById("err-bh").textContent = "BH number is required.";
    valid = false;
  }
  if (!data.room_number) {
    document.getElementById("err-room").textContent = "Room number is required.";
    valid = false;
  }
  if (!data.email || !data.email.includes("@")) {
    document.getElementById("err-email").textContent = "Enter a valid email address.";
    valid = false;
  }
  if (!data.password || data.password.length < 6) {
    document.getElementById("err-password").textContent = "Password must be at least 6 characters.";
    valid = false;
  }
  if (data.password !== data.confirm) {
    document.getElementById("err-confirm").textContent = "Passwords do not match.";
    valid = false;
  }

  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Creating account…`;

  try {
    // 1. Save into Persistent Accounts Repository
    let newAccount = null;
    if (typeof registerNewAccount === "function") {
      newAccount = registerNewAccount({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        bh_number: data.bh_number,
        room_number: data.room_number,
        role: "student"
      });
    } else {
      newAccount = {
        id: "usr-" + Date.now(),
        email: data.email,
        name: data.name,
        role: "student",
        bh_number: data.bh_number,
        room_number: data.room_number
      };
    }

    // 2. Set Active Student Session
    setStudentSession({
      user: newAccount,
      profile: newAccount
    });

    showToast("Registration successful! Redirecting to student helpdesk…", "success");
    setTimeout(() => {
      window.location.href = "report.html";
    }, 350);

  } catch (err) {
    console.error("Registration error:", err);
    showToast(err.message || "Registration failed. Please try again.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Account & Access Portal";
  }
});

