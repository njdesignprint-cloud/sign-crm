(function () {
  "use strict";

  let enrollmentVerificationId = "";
  let enrollmentVerifier = null;
  let signInResolver = null;
  let signInVerificationId = "";
  let signInVerifier = null;

  const text = (en, es) => state.language === "es" ? es : en;
  const multiFactorUser = user => user.multiFactor;

  function resetVerifier(verifier) {
    try { verifier?.clear(); } catch (_) {}
    const containers = [$("mfaRecaptcha"), $("authMfaRecaptcha")];
    containers.forEach(container => { if (container) container.replaceChildren(); });
  }

  function renderMfaStatus() {
    const status = $("mfaStatus");
    if (!status || !auth.currentUser) return;
    const factors = multiFactorUser(auth.currentUser).enrolledFactors || [];
    const emailVerified = !!auth.currentUser.emailVerified;
    $("mfaEmailVerificationWrap")?.classList.toggle("hidden", emailVerified);
    if ($("mfaSendCodeBtn")) $("mfaSendCodeBtn").disabled = !emailVerified;
    status.textContent = factors.length ? text("Enabled", "Activado") : text("Not configured", "Sin configurar");
    status.className = `pill ${factors.length ? "st-aprobado" : "st-pendiente"}`;
    $("mfaEnrollmentNote").textContent = factors.length
      ? text(`Two-step verification is active (${factors[0].displayName || "SMS"}).`, `La verificación en dos pasos está activa (${factors[0].displayName || "SMS"}).`)
      : text("The phone is registered directly with Firebase Authentication and is not stored in CRM documents.", "El teléfono se registra directamente con Firebase Authentication y no se guarda en los documentos del CRM.");
  }

  async function sendEnrollmentCode() {
    const user = auth.currentUser;
    const phoneNumber = cleanText($("mfaPhoneNumber")?.value || "").replace(/[()\s-]/g, "");
    if (!user) return showToast(text("Sign in first.", "Inicia sesión primero."));
    if (!user.emailVerified) return showToast(text("Verify your email before enabling MFA.", "Verifica tu correo antes de activar MFA."));
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) return showToast(text("Use the international format, for example +13460000000.", "Usa el formato internacional, por ejemplo +13460000000."));
    const button = $("mfaSendCodeBtn"); button.disabled = true;
    try {
      resetVerifier(enrollmentVerifier);
      enrollmentVerifier = new firebase.auth.RecaptchaVerifier("mfaRecaptcha", { size:"invisible" });
      const session = await multiFactorUser(user).getSession();
      enrollmentVerificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({ phoneNumber, session }, enrollmentVerifier);
      $("mfaCodeField").classList.remove("hidden");
      $("mfaConfirmWrap").classList.remove("hidden");
      $("mfaEnrollmentCode").focus();
      showToast(text("Verification code sent.", "Código de verificación enviado."));
    } catch (error) {
      console.error(error);
      resetVerifier(enrollmentVerifier); enrollmentVerifier = null;
      const unverified = error?.code === "auth/unverified-email";
      showToast(unverified ? text("Verify your email before enabling MFA.", "Verifica tu correo antes de activar MFA.") : text("The verification code could not be sent.", "No se pudo enviar el código de verificación."));
    } finally { button.disabled = false; }
  }

  async function sendEmailVerification() {
    const button = $("mfaVerifyEmailBtn");
    if (!auth.currentUser || !button) return;
    button.disabled = true;
    try {
      await auth.currentUser.sendEmailVerification();
      showToast(text("Verification email sent. Open it and then reload this page.", "Correo de verificación enviado. Ábrelo y luego recarga esta página."));
    } catch (error) {
      console.error(error);
      showToast(text("The verification email could not be sent yet.", "Todavía no se pudo enviar el correo de verificación."));
    } finally { button.disabled = false; }
  }

  async function confirmEnrollment() {
    const code = cleanText($("mfaEnrollmentCode")?.value || "");
    if (!enrollmentVerificationId || !code) return showToast(text("Enter the code sent to your phone.", "Escribe el código enviado a tu teléfono."));
    const button = $("mfaConfirmCodeBtn"); button.disabled = true;
    try {
      const credential = firebase.auth.PhoneAuthProvider.credential(enrollmentVerificationId, code);
      const assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential);
      await multiFactorUser(auth.currentUser).enroll(assertion, "SignShop HQ SMS");
      enrollmentVerificationId = ""; resetVerifier(enrollmentVerifier); enrollmentVerifier = null;
      $("mfaCodeField").classList.add("hidden"); $("mfaConfirmWrap").classList.add("hidden");
      $("mfaEnrollmentCode").value = ""; renderMfaStatus();
      showToast(text("Two-step verification is now active.", "La verificación en dos pasos quedó activada."));
    } catch (error) {
      console.error(error);
      showToast(text("The code is invalid or expired.", "El código no es válido o venció."));
    } finally { button.disabled = false; }
  }

  window.beginMfaSignIn = async function (error) {
    signInResolver = error?.resolver || null;
    const hint = signInResolver?.hints?.find(item => item.factorId === firebase.auth.PhoneMultiFactorGenerator.FACTOR_ID) || signInResolver?.hints?.[0];
    if (!signInResolver || !hint) return false;
    try {
      resetVerifier(signInVerifier);
      signInVerifier = new firebase.auth.RecaptchaVerifier("authMfaRecaptcha", { size:"invisible" });
      signInVerificationId = await new firebase.auth.PhoneAuthProvider().verifyPhoneNumber({ multiFactorHint:hint, session:signInResolver.session }, signInVerifier);
      openModal("authMfaModal"); $("authMfaCode").value = ""; $("authMfaCode").focus();
      return true;
    } catch (mfaError) {
      console.error(mfaError); resetVerifier(signInVerifier); signInVerifier = null;
      showToast(text("The security code could not be sent.", "No se pudo enviar el código de seguridad."));
      return true;
    }
  };

  async function confirmMfaSignIn() {
    const code = cleanText($("authMfaCode")?.value || "");
    if (!signInResolver || !signInVerificationId || !code) return;
    const button = $("authMfaConfirmBtn"); button.disabled = true;
    try {
      const credential = firebase.auth.PhoneAuthProvider.credential(signInVerificationId, code);
      const assertion = firebase.auth.PhoneMultiFactorGenerator.assertion(credential);
      await signInResolver.resolveSignIn(assertion);
      closeModal("authMfaModal"); signInResolver = null; signInVerificationId = "";
      resetVerifier(signInVerifier); signInVerifier = null;
    } catch (error) {
      console.error(error); showToast(text("The code is invalid or expired.", "El código no es válido o venció."));
    } finally { button.disabled = false; }
  }

  $("mfaSendCodeBtn")?.addEventListener("click", sendEnrollmentCode);
  $("mfaVerifyEmailBtn")?.addEventListener("click", sendEmailVerification);
  $("mfaConfirmCodeBtn")?.addEventListener("click", confirmEnrollment);
  $("authMfaConfirmBtn")?.addEventListener("click", confirmMfaSignIn);
  window.addEventListener("crm-language-changed", renderMfaStatus);
  auth.onAuthStateChanged(user => { if (user) setTimeout(renderMfaStatus, 0); });
})();
