// ============================================================================
// LifeLine by Cognora — Registration flow
// ============================================================================

const form = document.getElementById("register-form");
const submitBtn = document.getElementById("register-btn");

function setError(fieldId, message) {
  const errEl = document.getElementById(`err-${fieldId}`);
  if (errEl) errEl.textContent = message || "";
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((n) => (n.textContent = ""));
}

function validate(data, boardingPassFile) {
  let valid = true;
  if (!data.name.trim()) { setError("name", "Name is required."); valid = false; }
  if (!/^[0-9]{10}$/.test(data.phone.trim())) { setError("phone", "Enter a valid 10-digit phone number."); valid = false; }
  if (!data.bh_number.trim()) { setError("bh", "BH number is required."); valid = false; }
  if (!data.room_number.trim()) { setError("room", "Room number is required."); valid = false; }
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) { setError("email", "Enter a valid email address."); valid = false; }
  if (!boardingPassFile) { setError("boarding", "Please upload your boarding pass."); valid = false; }
  if (data.password.length < 6) { setError("password", "Password must be at least 6 characters."); valid = false; }
  if (data.password !== data.confirm_password) { setError("confirm", "Passwords do not match."); valid = false; }
  return valid;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  const boardingPassFile = document.getElementById("boarding_pass").files[0];

  if (!validate(data, boardingPassFile)) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Creating account…`;

  try {
    // 1. Create the auth user (email confirmation must be OFF in Supabase
    //    Auth settings for this to log the student in immediately).
    const { data: signUpData, error: signUpError } = await sb.auth.signUp({
      email: data.email.trim(),
      password: data.password,
    });
    if (signUpError) throw signUpError;

    const user = signUpData.user;
    if (!user) throw new Error("Sign-up did not return a user. Check Supabase Auth settings.");

    // Ensure we have an active session (needed for storage/profile inserts
    // under RLS). If email confirmation is off, signUp already returns one;
    // as a fallback, sign in explicitly.
    let session = signUpData.session;
    if (!session) {
      const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });
      if (signInError) throw signInError;
      session = signInData.session;
    }

    // 2. Upload the boarding pass to private storage, namespaced by user id.
    const ext = boardingPassFile.name.split(".").pop();
    const path = `${user.id}/boarding-pass.${ext}`;
    const { error: uploadError } = await sb.storage
      .from("boarding-passes")
      .upload(path, boardingPassFile, { upsert: true });
    if (uploadError) throw uploadError;

    // 3. Create the profile row.
    const { error: profileError } = await sb.from("profiles").insert({
      id: user.id,
      name: data.name.trim(),
      phone: data.phone.trim(),
      bh_number: data.bh_number.trim(),
      room_number: data.room_number.trim(),
      email: data.email.trim(),
      boarding_pass_url: path,
    });
    if (profileError) throw profileError;

    showToast("Account created! Redirecting…", "success");
    window.location.href = "report.html";
  } catch (err) {
    console.error(err);
    showToast(err.message || "Registration failed. Please try again.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create my account";
  }
});
