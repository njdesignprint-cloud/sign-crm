(function () {
  const params = new URLSearchParams(window.location.search);

  const state = {
    selectedAction: "",
    payload: null
  };

  const ACTION_LABELS = {
    approve_estimate: "Aprobar estimado",
    approve_design: "Aprobar diseño",
    request_changes: "Solicitar cambios",
    reject_estimate: "Rechazar estimado"
  };

  const BUSINESS_WHATSAPP = params.get("wa") || "13462135545";

  function $(id) {
    return document.getElementById(id);
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number(value || 0));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setHidden(id, hidden) {
    const el = $(id);
    if (el) el.classList.toggle("hidden", !!hidden);
  }

  function parseJsonParam(name, fallback = []) {
    try {
      const raw = params.get(name);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function loadApprovalFromUrl() {
    const data = {
      token: params.get("approval") || "",
      title: params.get("title") || "Trabajo",
      clientName: params.get("client") || "Cliente",
      total: Number(params.get("total") || 0),
      deposit: Number(params.get("deposit") || 0),
      dueDate: params.get("due") || "-",
      estimateStatusLabel: params.get("estimateStatus") || "-",
      designStatusLabel: params.get("designStatus") || "-",
      visibleNotes: params.get("notes") || "",
      items: parseJsonParam("items", []),
      images: parseJsonParam("images", [])
    };

    state.payload = data;
    renderApproval(data);
    setHidden("approvalLoading", true);
    setHidden("approvalContent", false);
  }

  function renderApproval(data) {
    $("approvalJobTitle").textContent = data.title || "Trabajo";
    $("approvalClientName").textContent = data.clientName || "Cliente";
    $("approvalTotal").textContent = money(data.total);
    $("approvalEstimateStatus").textContent = data.estimateStatusLabel || "-";
    $("approvalDesignStatus").textContent = data.designStatusLabel || "-";
    $("approvalDeposit").textContent = money(data.deposit);
    $("approvalDueDate").textContent = data.dueDate || "-";

    const notesBox = $("approvalNotesBox");
    const notes = (data.visibleNotes || "").trim();
    if (notes) {
      $("approvalVisibleNotes").innerHTML = escapeHtml(notes).replace(/\n/g, "<br>");
      notesBox.classList.remove("hidden");
    } else {
      notesBox.classList.add("hidden");
    }

    const itemsBox = $("approvalItemsBox");
    const itemsBody = $("approvalItemsBody");
    if (Array.isArray(data.items) && data.items.length) {
      itemsBody.innerHTML = data.items.map(item => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const total = qty * price;
        return `
          <tr>
            <td>${escapeHtml(item.description || "-")}</td>
            <td>${qty}</td>
            <td>${money(price)}</td>
            <td>${money(total)}</td>
          </tr>
        `;
      }).join("");
      itemsBox.classList.remove("hidden");
    } else {
      itemsBox.classList.add("hidden");
    }

    const imagesBox = $("approvalImagesBox");
    const imagesGrid = $("approvalImagesGrid");
    if (Array.isArray(data.images) && data.images.length) {
      imagesGrid.innerHTML = data.images.map(img => `
        <div class="image-card">
          <img src="${img.url}" alt="${escapeHtml(img.fileName || "Diseño")}" />
          <div class="image-name">${escapeHtml(img.fileName || "Diseño")}</div>
        </div>
      `).join("");
      imagesBox.classList.remove("hidden");
    } else {
      imagesBox.classList.add("hidden");
    }
  }

  function setAction(action) {
    state.selectedAction = action;
    document.querySelectorAll("[data-action]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.action === action);
    });
    $("approvalSubmitBtn").disabled = !action;
    const box = $("selectedActionBox");
    box.textContent = action ? `Respuesta seleccionada: ${ACTION_LABELS[action]}` : "";
    box.classList.toggle("hidden", !action);
  }

  function submitViaWhatsapp() {
    if (!state.selectedAction) return;

    const payload = state.payload || {};
    const signerName = $("approvalSignerName").value.trim();
    const signerEmail = $("approvalSignerEmail").value.trim();
    const comment = $("approvalComment").value.trim();

    if (!signerName) {
      alert("Escribe tu nombre antes de enviar la respuesta.");
      return;
    }

    const lines = [
      `Hola, soy ${signerName}.`,
      signerEmail ? `Correo: ${signerEmail}` : "",
      `Trabajo: ${payload.title || "Trabajo"}`,
      `Cliente: ${payload.clientName || "Cliente"}`,
      `Respuesta: ${ACTION_LABELS[state.selectedAction]}`,
      `Total estimado: ${money(payload.total || 0)}`,
      payload.deposit ? `Depósito: ${money(payload.deposit)}` : "",
      payload.dueDate && payload.dueDate !== "-" ? `Entrega: ${payload.dueDate}` : "",
      comment ? `Comentario: ${comment}` : "",
      payload.token ? `Referencia: ${payload.token}` : ""
    ].filter(Boolean);

    const msg = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${BUSINESS_WHATSAPP}?text=${msg}`;
    window.open(url, "_blank");

    const result = $("approvalResult");
    result.textContent = "Se abrió WhatsApp con tu respuesta lista para enviar.";
    result.classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadApprovalFromUrl();

    document.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => setAction(btn.dataset.action));
    });

    $("approvalSubmitBtn").addEventListener("click", submitViaWhatsapp);
  });
})();