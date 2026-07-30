    const PROSPECT_STATUS = {
      new: ["New", "Nuevo"], contact: ["To contact", "Por contactar"], contacted: ["Contacted", "Contactado"],
      visit: ["Visit scheduled", "Visita programada"], followup: ["Follow-up", "Seguimiento"], quote: ["Estimate requested", "Cotización solicitada"],
      won: ["Won", "Ganado"], lost: ["Lost", "Perdido"]
    };
    const PROSPECT_PRIORITY = { high:["High","Alta"], medium:["Medium","Media"], low:["Low","Baja"] };
    function prospectEnglish() { return state.language === "en"; }
    function prospectText(en, es) { return prospectEnglish() ? en : es; }
    function prospectStatusLabel(value) { return (PROSPECT_STATUS[value] || PROSPECT_STATUS.new)[prospectEnglish() ? 0 : 1]; }
    function prospectPriorityLabel(value) { return (PROSPECT_PRIORITY[value] || PROSPECT_PRIORITY.medium)[prospectEnglish() ? 0 : 1]; }
    function getProspectById(id) { return state.prospects.find(item => String(item.id) === String(id)) || null; }
    function prospectNormalize(value) { return cleanText(value).toLowerCase().replace(/[^a-z0-9@]+/g, ""); }
    function prospectPhone(value) { return String(value || "").replace(/\D/g, ""); }
    function prospectComparablePhone(value) { const digits = prospectPhone(value); return digits.length > 10 ? digits.slice(-10) : digits; }
    function prospectPortfolioUrl() { return "https://njdesignprintllc.com/"; }
    function prospectBilingualOutreachMessage() {
      return `Hi, I'm Noel with NJ Design & Print, a local sign and print company serving Katy and Houston. We help businesses stand out with signs, window graphics, menus, and vehicle graphics. If you're interested, call us or request a free visit to your business. See our work and social media: ${prospectPortfolioUrl()}\n\nHola, soy Noel de NJ Design & Print, una empresa local de letreros e impresión que sirve a Katy y Houston. Ayudamos a los negocios a destacar con letreros, gráficos para ventanas, menús y rotulación de vehículos. Si le interesa, puede llamarnos o solicitar una visita gratuita a su negocio. Vea nuestros trabajos y redes sociales: ${prospectPortfolioUrl()}`;
    }
    function prospectMessageWithPortfolio(message = "") {
      const base = cleanText(message);
      const url = prospectPortfolioUrl();
      if (base.toLowerCase().includes(url.toLowerCase())) return base;
      return `${base}${base ? "\n\n" : ""}${prospectText("See photos of our work:", "Puede ver fotos de nuestros trabajos aquí:")} ${url}`;
    }
    function prospectActivityLabel(type) {
      return ({ call:["Call","Llamada"], whatsapp:["WhatsApp","WhatsApp"], email:["Email","Correo"], visit:["Visit","Visita"], note:["Note","Nota"], created:["Created","Creado"], converted:["Converted","Convertido"] }[type] || ["Activity","Actividad"])[prospectEnglish() ? 0 : 1];
    }
    function prospectMapsLink(item = {}) {
      const direct = cleanText(item.mapsUrl);
      if (direct) return direct;
      const query = [item.company, item.address, item.city].filter(Boolean).join(" ");
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    function prospectDefaultMessage(item = {}) {
      const saved = cleanText(item.message);
      const base = saved || prospectBilingualOutreachMessage();
      return prospectMessageWithPortfolio(base);
    }
    function resetProspectForm() {
      state.editingProspectId = null;
      $("prospectModalTitle").textContent = prospectText("New prospect", "Nuevo prospecto");
      ["prospectCompany","prospectName","prospectRole","prospectCategory","prospectPhone","prospectEmail","prospectAddress","prospectCity","prospectWebsite","prospectMapsUrl","prospectOwner","prospectNextAction","prospectNextDate","prospectMessage","prospectNotes"].forEach(id => $(id).value = "");
      $("prospectSource").value = "google_maps"; $("prospectStatus").value = "new"; $("prospectPriority").value = "medium";
      if ($("prospectWhatsappStatus")) $("prospectWhatsappStatus").value = "pending";
      $("prospectTimelineBox").classList.add("hidden"); $("prospectTimeline").innerHTML = "";
    }
    function prospectPayloadFromForm() {
      return {
        company: cleanText($("prospectCompany").value), name: cleanText($("prospectName").value), role: cleanText($("prospectRole").value), category: cleanText($("prospectCategory").value),
        phone: cleanText($("prospectPhone").value), email: cleanText($("prospectEmail").value), address: cleanText($("prospectAddress").value), city: cleanText($("prospectCity").value),
        website: cleanText($("prospectWebsite").value), mapsUrl: cleanText($("prospectMapsUrl").value), source: cleanText($("prospectSource").value) || "google_maps",
        status: cleanText($("prospectStatus").value) || "new", priority: cleanText($("prospectPriority").value) || "medium", owner: cleanText($("prospectOwner").value),
        nextAction: cleanText($("prospectNextAction").value), nextFollowupDate: cleanText($("prospectNextDate").value), message: prospectMessageWithPortfolio($("prospectMessage").value), notes: cleanText($("prospectNotes").value),
        whatsappStatus: cleanText($("prospectWhatsappStatus")?.value) || "pending",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
    }
    async function saveProspect() {
      if (!guardWrite(prospectText("save prospects", "guardar prospectos"), "prospectos")) return;
      const payload = prospectPayloadFromForm();
      if (!payload.company) return showToast(prospectText("Enter the business name.", "Escribe el nombre del negocio."));
      const existingClient = findDuplicateClient(payload);
      if (!state.editingProspectId && existingClient) return showToast(prospectText(`This business is already a client: ${clientLabel(existingClient)}. Prospect not saved.`, `Este negocio ya es cliente: ${clientLabel(existingClient)}. No se guardó el prospecto.`));
      const existingProspect = findDuplicateProspect(payload, state.editingProspectId);
      if (existingProspect) return showToast(prospectText(`A matching prospect already exists: ${existingProspect.company}.`, `Ya existe un prospecto coincidente: ${existingProspect.company}.`));
      try {
        if (state.editingProspectId) await prospectsRef().doc(state.editingProspectId).update(payload);
        else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          payload.activity = [{ type:"created", note:prospectText("Prospect created.", "Prospecto creado."), date:new Date().toISOString(), user:state.userEmail || "" }];
          await prospectsRef().add(payload);
        }
        markModalSaved("prospectModal"); closeModal("prospectModal", true);
        showToast(prospectText("Prospect saved.", "Prospecto guardado."));
      } catch (error) { console.error(error); showToast(prospectText("The prospect could not be saved.", "No se pudo guardar el prospecto.")); }
    }
    function renderProspectTimeline(item = {}) {
      const entries = Array.isArray(item.activity) ? [...item.activity].reverse() : [];
      $("prospectTimeline").innerHTML = entries.length ? entries.map(entry => `<div class="activity-item"><strong>${safe(prospectActivityLabel(entry.type))}</strong> · ${safe(String(entry.date || "").slice(0,10))}<div>${safe(entry.note || "-")}</div></div>`).join("") : `<div class="section-note">${prospectText("No activity recorded yet.", "Todavía no hay actividad registrada.")}</div>`;
    }
    function editProspect(id) {
      if (!canWriteData("prospectos")) return showToast(prospectText("You cannot edit prospects.", "No tienes permiso para editar prospectos."));
      const item = getProspectById(id); if (!item) return;
      state.editingProspectId = id; $("prospectModalTitle").textContent = prospectText("Edit prospect", "Editar prospecto");
      const fields = { prospectCompany:"company", prospectName:"name", prospectRole:"role", prospectCategory:"category", prospectPhone:"phone", prospectEmail:"email", prospectAddress:"address", prospectCity:"city", prospectWebsite:"website", prospectMapsUrl:"mapsUrl", prospectSource:"source", prospectStatus:"status", prospectPriority:"priority", prospectOwner:"owner", prospectNextAction:"nextAction", prospectNextDate:"nextFollowupDate", prospectMessage:"message", prospectNotes:"notes", prospectWhatsappStatus:"whatsappStatus" };
      Object.entries(fields).forEach(([id,key]) => $(id).value = item[key] || "");
      $("prospectTimelineBox").classList.remove("hidden"); renderProspectTimeline(item); openModal("prospectModal");
    }
    function openProspectFollowup(id) {
      const item = getProspectById(id); if (!item) return;
      state.editingProspectId = id; $("prospectFollowupType").value = "call"; $("prospectFollowupStatus").value = item.status === "new" ? "contacted" : (item.status || "followup");
      $("prospectFollowupNextAction").value = item.nextAction || ""; $("prospectFollowupNextDate").value = item.nextFollowupDate || ""; $("prospectFollowupNote").value = ""; openModal("prospectFollowupModal");
    }
    async function saveProspectFollowup() {
      if (!guardWrite(prospectText("save follow-ups", "guardar seguimientos"), "prospectos")) return;
      const item = getProspectById(state.editingProspectId); if (!item) return;
      const note = cleanText($("prospectFollowupNote").value); if (!note) return showToast(prospectText("Write the result of the follow-up.", "Escribe el resultado del seguimiento."));
      const activity = [...(Array.isArray(item.activity) ? item.activity : []), { type:$("prospectFollowupType").value, note, date:new Date().toISOString(), user:state.userEmail || "" }];
      try {
        await prospectsRef().doc(item.id).update({ activity, status:$("prospectFollowupStatus").value, nextAction:cleanText($("prospectFollowupNextAction").value), nextFollowupDate:cleanText($("prospectFollowupNextDate").value), lastContactAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
        markModalSaved("prospectFollowupModal"); closeModal("prospectFollowupModal", true); showToast(prospectText("Follow-up saved.", "Seguimiento guardado."));
      } catch (error) { console.error(error); showToast(prospectText("The follow-up could not be saved.", "No se pudo guardar el seguimiento.")); }
    }
    function openProspectWhatsapp(id) {
      const item = getProspectById(id); if (!item?.phone) return showToast(prospectText("This prospect has no phone number.", "Este prospecto no tiene teléfono."));
      window.open(`https://wa.me/${prospectPhone(item.phone)}?text=${encodeURIComponent(prospectDefaultMessage(item))}`, "_blank", "noopener");
    }
    function openProspectSms(id) {
      const item = getProspectById(id); if (!item?.phone) return showToast(prospectText("This prospect has no phone number.", "Este prospecto no tiene teléfono."));
      const digits = prospectPhone(item.phone), phone = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
      const message = prospectDefaultMessage(item), body = encodeURIComponent(message);
      const windows = /Windows/i.test(navigator.userAgent || "");
      const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent || "") || (/Macintosh/i.test(navigator.userAgent || "") && Number(navigator.maxTouchPoints || 0) > 1);
      if (appleMobile) {
        navigator.clipboard?.writeText(message).then(() => showToast(prospectText("Message copied. Paste it in Messages after choosing the recipient.", "Mensaje copiado. Pégalo en Mensajes después de elegir el destinatario."))).catch(() => {});
        window.location.href = `sms:${phone}`;
        return;
      }
      if (windows && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(`${phone}\n\n${message}`).then(() => showToast(prospectText("Phone and message copied. If Phone Link does not open, paste them in Messages.", "Teléfono y mensaje copiados. Si Phone Link no abre, pégalos en Mensajes."))).catch(() => {});
      }
      window.location.href = `sms:${phone}?body=${body}`;
    }
    function openProspectEmail(id) {
      const item = getProspectById(id); if (!item?.email) return showToast(prospectText("This prospect has no email address.", "Este prospecto no tiene correo."));
      const subject = prospectText(`Sign and graphics solutions for ${item.company}`, `Soluciones de letreros y gráficos para ${item.company}`);
      window.location.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(prospectDefaultMessage(item))}`;
    }
    function openProspectMaps(id) { const item = getProspectById(id); if (item) window.open(prospectMapsLink(item), "_blank", "noopener"); }
    function findDuplicateClient(item = {}) {
      const email = prospectNormalize(item.email), phone = prospectComparablePhone(item.phone), company = prospectNormalize(item.company);
      return state.clients.find(client => (email && prospectNormalize(client.email) === email) || (phone && prospectComparablePhone(client.phone) === phone) || (company && prospectNormalize(client.company) === company));
    }
    function findDuplicateProspect(item = {}, excludeId = "") {
      const email = prospectNormalize(item.email), phone = prospectComparablePhone(item.phone), company = prospectNormalize(item.company);
      return state.prospects.find(prospect => String(prospect.id) !== String(excludeId || "") && ((email && prospectNormalize(prospect.email) === email) || (phone && prospectComparablePhone(prospect.phone) === phone) || (company && prospectNormalize(prospect.company) === company)));
    }
    function prospectWhatsappLabel(item = {}) {
      if (!item.phone) return prospectText("No phone", "Sin teléfono");
      if (item.whatsappStatus === "confirmed") return prospectText("WhatsApp confirmed", "WhatsApp confirmado");
      if (item.whatsappStatus === "unavailable") return prospectText("No WhatsApp", "Sin WhatsApp");
      return prospectText("WhatsApp pending verification", "WhatsApp por verificar");
    }
    async function convertProspectToClient(id) {
      if (!guardWrite(prospectText("convert prospects", "convertir prospectos"), "prospectos")) return;
      const item = getProspectById(id); if (!item || item.convertedClientId) return;
      const duplicate = findDuplicateClient(item); if (duplicate) return showToast(prospectText(`A matching client already exists: ${clientLabel(duplicate)}.`, `Ya existe un cliente coincidente: ${clientLabel(duplicate)}.`));
      if (!confirm(prospectText(`Convert ${item.company} into a client?`, `¿Convertir ${item.company} en cliente?`))) return;
      try {
        const clientDoc = clientsRef().doc(); const batch = db.batch();
        batch.set(clientDoc, { name:item.name || "", company:item.company || "", phone:item.phone || "", email:item.email || "", address:item.address || "", city:item.city || "", notes:[item.notes, prospectText(`Converted from prospect. Source: ${item.source || "-"}.`, `Convertido desde prospecto. Origen: ${item.source || "-"}.`)].filter(Boolean).join("\n"), salesSource:"company", salespersonId:"", commissionPercent:0, commissionBase:"collected", prospectId:item.id, createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
        const activity = [...(Array.isArray(item.activity) ? item.activity : []), { type:"converted", note:prospectText("Converted into a client.", "Convertido en cliente."), date:new Date().toISOString(), user:state.userEmail || "" }];
        batch.update(prospectsRef().doc(item.id), { status:"won", convertedClientId:clientDoc.id, convertedAt:firebase.firestore.FieldValue.serverTimestamp(), activity, updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
        await batch.commit(); showToast(prospectText("Prospect converted into a client.", "Prospecto convertido en cliente."));
      } catch (error) { console.error(error); showToast(prospectText("The prospect could not be converted.", "No se pudo convertir el prospecto.")); }
    }
    function getFilteredProspects() {
      const text = prospectNormalize($("prospectSearch")?.value), status = cleanText($("prospectStatusFilter")?.value), due = cleanText($("prospectDueFilter")?.value), date = today();
      return state.prospects.filter(item => {
        const hay = prospectNormalize([item.company,item.name,item.phone,item.email,item.city,item.category].join(" "));
        const dueDate = cleanText(item.nextFollowupDate); const dueOk = !due || (due === "today" && dueDate === date) || (due === "overdue" && dueDate && dueDate < date && !["won","lost"].includes(item.status)) || (due === "upcoming" && dueDate > date);
        return (!text || hay.includes(text)) && (!status || item.status === status) && dueOk;
      });
    }
    function renderProspects() {
      if (!$("prospectsBody")) return; const date = today(); const rows = getFilteredProspects();
      $("prospectsBody").innerHTML = rows.map(item => {
        const activity = Array.isArray(item.activity) ? item.activity[item.activity.length - 1] : null; const overdue = item.nextFollowupDate && item.nextFollowupDate < date && !["won","lost"].includes(item.status);
        const duplicateClient = findDuplicateClient(item);
        return `<tr><td><strong>${safe(item.company || "-")}</strong>${duplicateClient ? `<div><span class="pill st-cancelado">${safe(prospectText(`Already a client: ${clientLabel(duplicateClient)}`, `Ya es cliente: ${clientLabel(duplicateClient)}`))}</span></div>` : ""}<div class="section-note">${safe([item.name,item.role].filter(Boolean).join(" · ") || "-")}</div></td><td>${safe(item.phone || "-")}<div>${safe(item.email || "-")}</div><div class="section-note">${safe([item.category,item.city].filter(Boolean).join(" · ") || "-")}</div><div class="section-note">${safe(prospectWhatsappLabel(item))}</div></td><td><span class="pill ${item.status === "won" ? "st-aprobado" : item.status === "lost" ? "st-cancelado" : "st-diseno"}">${safe(prospectStatusLabel(item.status))}</span><div class="section-note">${safe(prospectPriorityLabel(item.priority))} · ${safe(item.owner || prospectText("Unassigned","Sin asignar"))}</div></td><td><strong class="${overdue ? "danger-text" : ""}">${safe(item.nextFollowupDate || "-")}</strong><div>${safe(item.nextAction || "-")}</div></td><td>${activity ? `<strong>${safe(prospectActivityLabel(activity.type))}</strong><div>${safe(String(activity.date || "").slice(0,10))}</div><small>${safe(activity.note || "-")}</small>` : "-"}</td><td><div class="actions-row"><button class="btn btn-info btn-small" data-prospect-followup="${item.id}">${prospectText("Follow-up","Seguimiento")}</button><button class="btn btn-info btn-small" data-prospect-wa="${item.id}" ${!item.phone || item.whatsappStatus === "unavailable" ? "disabled" : ""}>WhatsApp</button><button class="btn btn-info btn-small" data-prospect-sms="${item.id}" ${!item.phone ? "disabled" : ""}>SMS</button><button class="btn btn-secondary btn-small" data-prospect-email="${item.id}">${prospectText("Email","Correo")}</button><button class="btn btn-secondary btn-small" data-prospect-maps="${item.id}">Google Maps</button>${canWriteData("prospectos") ? `<button class="btn btn-secondary btn-small" data-edit-prospect="${item.id}">${prospectText("Edit","Editar")}</button>` : ""}${canWriteData("prospectos") && !item.convertedClientId && !duplicateClient ? `<button class="btn btn-primary btn-small" data-convert-prospect="${item.id}">${prospectText("Convert to client","Convertir en cliente")}</button>` : ""}${item.convertedClientId ? `<span class="pill st-aprobado">${prospectText("Client created","Cliente creado")}</span>` : ""}</div></td></tr>`;
      }).join("");
      $("prospectsEmpty").classList.toggle("hidden", rows.length > 0);
      $("prospectsActiveCount").textContent = state.prospects.filter(item => !["won","lost"].includes(item.status)).length;
      $("prospectsTodayCount").textContent = state.prospects.filter(item => item.nextFollowupDate === date && !["won","lost"].includes(item.status)).length;
      $("prospectsOverdueCount").textContent = state.prospects.filter(item => item.nextFollowupDate && item.nextFollowupDate < date && !["won","lost"].includes(item.status)).length;
      $("prospectsWonCount").textContent = state.prospects.filter(item => item.status === "won").length;
      if ($("dashboardProspectsToday")) $("dashboardProspectsToday").textContent = state.prospects.filter(item => item.nextFollowupDate === date && !["won","lost"].includes(item.status)).length;
      if ($("dashboardProspectsOverdue")) $("dashboardProspectsOverdue").textContent = state.prospects.filter(item => item.nextFollowupDate && item.nextFollowupDate < date && !["won","lost"].includes(item.status)).length;
    }
