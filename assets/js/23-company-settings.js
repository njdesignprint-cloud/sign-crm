    const COMPANY_FALLBACK = { ...COMPANY };
    const COMPANY_SETTING_IDS = ["companyLegalName","companyTradeName","companyPublicEmail","companyPhone","companyWebsite","companyAddress","companyCity","companyState","companyZip","companyCountry","companyRepresentativeName","companyRepresentativeTitle","companyGoverningState","companyCurrency","companyTimeZone","companyLanguage","companyDateFormat","companyBrandColor","companyLogoUrl"];

    function getCompanyDisplayName(settings = state.companySettings || {}) {
      return cleanText(settings.tradeName) || cleanText(settings.legalName) || "SignShop HQ";
    }
    function applyCompanySettingsRuntime() {
      const settings = state.companySettings || {};
      COMPANY.name = getCompanyDisplayName(settings);
      COMPANY.legalName = cleanText(settings.legalName) || COMPANY.name;
      COMPANY.phone = cleanText(settings.phone) || COMPANY_FALLBACK.phone || "";
      COMPANY.website = cleanText(settings.website) || COMPANY_FALLBACK.website || "";
      COMPANY.email = cleanText(settings.publicEmail);
      COMPANY.address = [settings.address, settings.city, settings.state, settings.zip, settings.country].map(cleanText).filter(Boolean).join(", ");
      COMPANY.representativeName = cleanText(settings.representativeName);
      COMPANY.representativeTitle = cleanText(settings.representativeTitle);
      COMPANY.governingState = cleanText(settings.governingState) || "Texas";
      COMPANY.brandColor = cleanText(settings.brandColor) || "#3b82f6";
      COMPANY.logoUrl = cleanText(settings.logoUrl);
    }
    function currentCompanySettingsForm() {
      return {
        legalName: cleanText($("companyLegalName").value), tradeName: cleanText($("companyTradeName").value),
        publicEmail: normalizedEmail($("companyPublicEmail").value), phone: cleanText($("companyPhone").value), website: cleanText($("companyWebsite").value),
        address: cleanText($("companyAddress").value), city: cleanText($("companyCity").value), state: cleanText($("companyState").value), zip: cleanText($("companyZip").value), country: cleanText($("companyCountry").value),
        representativeName: cleanText($("companyRepresentativeName").value), representativeTitle: cleanText($("companyRepresentativeTitle").value), governingState: cleanText($("companyGoverningState").value) || "Texas",
        currency: $("companyCurrency").value || "USD", timeZone: $("companyTimeZone").value || "America/Chicago", language: $("companyLanguage").value || "en", dateFormat: $("companyDateFormat").value || "MM/DD/YYYY",
        brandColor: $("companyBrandColor").value || "#3b82f6", logoUrl: cleanText($("companyLogoUrl").value)
      };
    }
    function setCompanyLogoPreview(url = "") {
      const img = $("companyLogoPreview"), placeholder = $("companyLogoPlaceholder"); if (!img || !placeholder) return;
      img.src = url || ""; img.classList.toggle("hidden", !url); placeholder.classList.toggle("hidden", !!url);
    }
    function renderCompanySettingsPreview() {
      if (!$("companyPreviewName")) return;
      const form = currentCompanySettingsForm(); const name = form.tradeName || form.legalName || "Your company";
      $("companyPreviewName").textContent = name;
      $("companyPreviewInitials").textContent = name.split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join("").toUpperCase() || "CO";
      $("companyPreviewInitials").style.background = form.brandColor;
      $("companyPreviewContact").textContent = [form.publicEmail, form.phone, form.website].filter(Boolean).join(" · ") || "Email · phone · website";
      setCompanyLogoPreview(form.logoUrl);
      document.querySelectorAll("[data-company-color]").forEach(button => button.classList.toggle("active", button.dataset.companyColor === form.brandColor));
    }
    function renderCompanySettingsForm() {
      if (!$("companyLegalName")) return;
      const s = state.companySettings || {};
      $("companyLegalName").value = s.legalName || ""; $("companyTradeName").value = s.tradeName || ""; $("companyPublicEmail").value = s.publicEmail || "";
      $("companyPhone").value = s.phone || ""; $("companyWebsite").value = s.website || ""; $("companyAddress").value = s.address || ""; $("companyCity").value = s.city || "";
      $("companyState").value = s.state || ""; $("companyZip").value = s.zip || ""; $("companyCountry").value = s.country || "United States";
      $("companyRepresentativeName").value = s.representativeName || ""; $("companyRepresentativeTitle").value = s.representativeTitle || ""; $("companyGoverningState").value = s.governingState || "Texas";
      $("companyCurrency").value = s.currency || "USD"; $("companyTimeZone").value = s.timeZone || "America/Chicago"; $("companyLanguage").value = s.language || "en"; $("companyDateFormat").value = s.dateFormat || "MM/DD/YYYY";
      $("companyBrandColor").value = s.brandColor || "#3b82f6"; $("companyLogoUrl").value = s.logoUrl || "";
      renderCompanySettingsPreview(); $("companySettingsStatus").textContent = Object.keys(s).length ? "Saved" : "Not configured";
    }
    async function saveCompanySettings() {
      if (!isAdmin()) return showToast("Only owners and administrators can update company settings.");
      const payload = currentCompanySettingsForm(); if (!payload.legalName) return showToast("Enter the legal business name.");
      const button = $("saveCompanySettingsBtn"); button.disabled = true; $("companySettingsStatus").textContent = "Saving...";
      try { await companySettingsRef().set({ ...payload, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: state.userEmail || "" }, { merge: true }); showToast("Company settings saved."); }
      catch (error) { console.error(error); showToast("Company settings could not be saved."); $("companySettingsStatus").textContent = "Save failed"; }
      finally { button.disabled = false; }
    }
    function openCompanyLogoUpload() {
      if (!isAdmin()) return showToast("Only owners and administrators can upload the company logo.");
      if (typeof cloudinary === "undefined" || !cloudinary.createUploadWidget) return showToast("The image uploader is not available.");
      const widget = cloudinary.createUploadWidget({ cloudName: CLOUDINARY_CONFIG.cloudName, uploadPreset: CLOUDINARY_CONFIG.uploadPreset, multiple: false, maxFiles: 1, resourceType: "image", clientAllowedFormats: ["png","jpg","jpeg","webp","svg"], folder: `signshophq/company-logos/${state.accountOwnerId || state.uid}` }, (error, result) => {
        if (error) { console.error(error); return showToast("The logo could not be uploaded."); }
        if (result?.event === "success") { $("companyLogoUrl").value = result.info.secure_url || ""; renderCompanySettingsPreview(); showToast("Logo uploaded. Save company settings to apply it."); }
      });
      widget.open();
    }
    $("saveCompanySettingsBtn")?.addEventListener("click", saveCompanySettings);
    $("uploadCompanyLogoBtn")?.addEventListener("click", openCompanyLogoUpload);
    COMPANY_SETTING_IDS.forEach(id => $(id)?.addEventListener("input", renderCompanySettingsPreview));
    document.querySelectorAll("[data-company-color]").forEach(button => button.addEventListener("click", () => { $("companyBrandColor").value = button.dataset.companyColor; renderCompanySettingsPreview(); }));
