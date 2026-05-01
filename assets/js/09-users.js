    function getVisibleTeamMembers() {
      const ownerEmail = normalizedEmail(state.currentWorkspaceOwnerEmail || state.userEmail);
      const ownerRow = {
        id: "__owner__",
        name: "Propietario",
        email: ownerEmail,
        role: "owner",
        active: true,
        notes: "Cuenta principal del negocio.",
        lastLoginAt: null,
        ...defaultModulePermissionsForRole("owner")
      };
      const members = state.teamMembers
        .filter(member => normalizedEmail(member.email) !== ownerEmail)
        .slice()
        .sort((a, b) => normalizedEmail(a.email).localeCompare(normalizedEmail(b.email)));
      return [ownerRow, ...members];
    }
    function getFilteredTeamMembers() {
      const q = normalizeMatchText($("userSearch")?.value);
      return getVisibleTeamMembers().filter(member => {
        const bag = normalizeMatchText(`${member.name || ""} ${member.email || ""} ${member.role || ""} ${member.notes || ""} ${getModulePermissionSummary(member)}`);
        return !q || bag.includes(q);
      });
    }
    function renderUsers() {
      const tbody = $("teamMembersBody");
      if (!tbody) return;

      const rows = getFilteredTeamMembers();
      const allRows = getVisibleTeamMembers();
      $("usersTotalCount").textContent = String(allRows.length);
      $("usersAdminCount").textContent = String(allRows.filter(member => ["owner","admin"].includes(member.role)).length);
      $("usersEmployeeCount").textContent = String(allRows.filter(member => member.role === "employee").length);
      $("usersReadonlyCount").textContent = String(allRows.filter(member => member.role === "readonly").length);
      $("teamMembersEmpty").classList.toggle("hidden", rows.length > 0);

      tbody.innerHTML = rows.map(member => {
        const isOwnerRow = member.id === "__owner__";
        const isSelf = normalizedEmail(member.email) === normalizedEmail(state.userEmail);
        return `
          <tr>
            <td><strong>${safe(member.name || "Sin nombre")}</strong>${isSelf ? '<br><small>Tú</small>' : ""}</td>
            <td>${safe(member.email || "-")}</td>
            <td>${rolePill(member.role || "employee")}</td>
            <td>${activeStatePill(member.active !== false)}</td>
            <td>${safe(formatDateTime(member.lastLoginAt))}</td>
            <td><small>${safe(getModulePermissionSummary(member))}</small></td>
            <td><small>${safe(member.notes || (isOwnerRow ? "Cuenta principal del negocio." : "-"))}</small></td>
            <td>
              <div class="actions-row">
                ${!isOwnerRow && canManageUsers() ? `<button class="btn btn-secondary btn-small" data-edit-team-member="${member.id}">Editar</button>` : ""}
                ${!isOwnerRow && canManageUsers() ? `<button class="btn btn-info btn-small" data-toggle-team-member="${member.id}">${member.active === false ? "Activar" : "Desactivar"}</button>` : ""}
                ${!isOwnerRow && canManageUsers() ? `<button class="btn btn-danger btn-small" data-delete-team-member="${member.id}">Quitar</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
    function setTeamMemberPermissionForm(source = {}) {
      const perms = normalizeModulePermissions(source);
      $("teamPermClientes").value = perms.clientes;
      $("teamPermTrabajos").value = perms.trabajos;
      $("teamPermGastos").value = perms.gastos;
      $("teamPermInventario").value = perms.inventario;
      $("teamPermProveedores").value = perms.proveedores;
      $("teamPermCompras").value = perms.compras;
      $("teamPermUsuarios").value = perms.usuarios;
      $("teamAllowImportBackup").checked = !!perms.importBackup;
    }
    function readTeamMemberPermissionForm() {
      return {
        clientes: $("teamPermClientes").value,
        trabajos: $("teamPermTrabajos").value,
        gastos: $("teamPermGastos").value,
        inventario: $("teamPermInventario").value,
        proveedores: $("teamPermProveedores").value,
        compras: $("teamPermCompras").value,
        usuarios: $("teamPermUsuarios").value,
        importBackup: !!$("teamAllowImportBackup").checked
      };
    }
    function applyRoleDefaultsToTeamMemberForm() {
      const role = cleanText($("teamMemberRole").value) || "employee";
      setTeamMemberPermissionForm({ role });
    }
    function resetTeamMemberForm() {
      state.editingTeamMemberId = null;
      $("teamMemberModalTitle").textContent = "Nuevo usuario";
      $("teamMemberName").value = "";
      $("teamMemberEmail").value = "";
      $("teamMemberEmail").readOnly = false;
      $("teamMemberRole").value = "employee";
      $("teamMemberActive").value = "true";
      $("teamMemberNotes").value = "";
      setTeamMemberPermissionForm({ role: "employee" });
    }
    function editTeamMember(id) {
      if (!guardManageUsers()) return;
      const member = getTeamMemberById(id);
      if (!member) return;
      state.editingTeamMemberId = id;
      $("teamMemberModalTitle").textContent = "Editar usuario";
      $("teamMemberName").value = member.name || "";
      $("teamMemberEmail").value = member.email || "";
      $("teamMemberEmail").readOnly = true;
      $("teamMemberRole").value = member.role || "employee";
      $("teamMemberActive").value = member.active === false ? "false" : "true";
      $("teamMemberNotes").value = member.notes || "";
      setTeamMemberPermissionForm(member);
      openModal("teamMemberModal");
    }
    async function saveTeamMember() {
      if (!guardManageUsers()) return;
      const email = normalizedEmail($("teamMemberEmail").value);
      const name = cleanText($("teamMemberName").value) || email;
      const role = cleanText($("teamMemberRole").value) || "employee";
      const active = $("teamMemberActive").value !== "false";
      const notes = cleanText($("teamMemberNotes").value);
      const modulePerms = readTeamMemberPermissionForm();

      if (!email || !email.includes("@")) return showToast("Escribe un correo válido.");
      if (email === normalizedEmail(state.currentWorkspaceOwnerEmail || state.userEmail)) {
        return showToast("Ese correo ya es el propietario del espacio.");
      }

      const docId = state.editingTeamMemberId || emailDocId(email);
      const existing = state.editingTeamMemberId ? getTeamMemberById(state.editingTeamMemberId) : null;
      const payload = {
        name,
        email,
        role,
        active,
        notes,
        moduleClientes: modulePerms.clientes,
        moduleTrabajos: modulePerms.trabajos,
        moduleGastos: modulePerms.gastos,
        moduleInventario: modulePerms.inventario,
        moduleProveedores: modulePerms.proveedores,
        moduleCompras: modulePerms.compras,
        moduleUsuarios: modulePerms.usuarios,
        allowImportBackup: modulePerms.importBackup,
        ownerId: state.accountOwnerId,
        ownerEmail: state.currentWorkspaceOwnerEmail || state.userEmail || "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        const batch = db.batch();
        batch.set(teamMembersRef().doc(docId), {
          ...payload,
          createdAt: existing?.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: existing?.lastLoginAt || null
        }, { merge: true });

        batch.set(teamAccessRefByEmail(email), {
          ...payload,
          workspaceOwnerEmail: state.currentWorkspaceOwnerEmail || state.userEmail || "",
          teamDocId: docId
        }, { merge: true });

        await batch.commit();
        closeModal("teamMemberModal");
        resetTeamMemberForm();
        showToast("Usuario guardado.");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el usuario.");
      }
    }
    async function toggleTeamMemberActive(id) {
      if (!guardManageUsers()) return;
      const member = getTeamMemberById(id);
      if (!member) return;
      if (normalizedEmail(member.email) === normalizedEmail(state.userEmail)) return showToast("No puedes cambiar tu propio acceso desde aquí.");
      const nextActive = member.active === false;
      try {
        await teamMembersRef().doc(id).update({
          active: nextActive,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await teamAccessRefByEmail(member.email).set({
          active: nextActive,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        showToast(nextActive ? "Usuario activado." : "Usuario desactivado.");
      } catch (error) {
        console.error(error);
        showToast("No se pudo cambiar el estado del usuario.");
      }
    }
    async function removeTeamMember(id) {
      if (!guardManageUsers()) return;
      const member = getTeamMemberById(id);
      if (!member) return;
      if (normalizedEmail(member.email) === normalizedEmail(state.userEmail)) return showToast("No puedes quitar tu propio acceso desde aquí.");
      if (!confirm(`¿Quitar el acceso de ${member.email || "este usuario"}?`)) return;
      try {
        const batch = db.batch();
        batch.delete(teamMembersRef().doc(id));
        batch.delete(teamAccessRefByEmail(member.email));
        await batch.commit();
        showToast("Acceso eliminado.");
      } catch (error) {
        console.error(error);
        showToast("No se pudo quitar el acceso.");
      }
    }


    function getWorkspaceByOwnerId(ownerId = "") {
      return state.platformWorkspaces.find(item => cleanText(item.ownerUid || item.id) === cleanText(ownerId)) || null;
    }
    function getFilteredPlatformAccounts() {
      const q = normalizeMatchText($("platformAccountSearch")?.value);
      const statusFilter = cleanText($("platformAccountStatusFilter")?.value);
      return state.platformUsers.filter(item => {
        const workspace = getWorkspaceByOwnerId(item.ownerId || item.uid || item.id);
        const bag = normalizeMatchText(`${item.name || ""} ${item.email || ""} ${item.companyName || ""} ${workspace?.companyName || ""} ${item.appRole || ""} ${item.status || ""} ${workspace?.status || ""}`);
        const okText = !q || bag.includes(q);
        const okStatus = !statusFilter || cleanText(item.status) === statusFilter;
        return okText && okStatus;
      }).slice().sort((a, b) => String(b.createdAt?.seconds || 0).localeCompare(String(a.createdAt?.seconds || 0)));
    }
    function renderPlatformAccounts() {
      const tbody = $("platformAccountsBody");
      if (!tbody) return;
      const rows = getFilteredPlatformAccounts();
      const allRows = state.platformUsers.slice();
      $("platformAccountsTotalCount").textContent = String(allRows.length);
      $("platformAccountsPendingCount").textContent = String(allRows.filter(item => cleanText(item.status) === "pending").length);
      $("platformAccountsActiveCount").textContent = String(allRows.filter(item => cleanText(item.status) === "active").length);
      $("platformAccountsBlockedCount").textContent = String(allRows.filter(item => cleanText(item.status) === "blocked").length);
      $("platformAccountsEmpty").classList.toggle("hidden", rows.length > 0);

      tbody.innerHTML = rows.map(item => {
        const workspace = getWorkspaceByOwnerId(item.ownerId || item.uid || item.id);
        const isSuper = cleanText(item.appRole) === "superadmin";
        const workspaceStatus = cleanText(workspace?.status || item.status || "pending") || "pending";
        const companyLabel = item.companyName || workspace?.companyName || item.email || "-";
        const workspaceLabel = cleanText(item.invited) ? "Miembro invitado" : safe(workspace?.plan || "starter");
        return `
          <tr>
            <td><strong>${safe(companyLabel)}</strong><br><small>${safe(item.uid || item.id || "-")}</small></td>
            <td>${safe(item.name || "-")}</td>
            <td>${safe(item.email || "-")}</td>
            <td>${safe(roleLabel(item.workspaceRole || (item.appRole === "owner" ? "owner" : "employee")))}<br><small>${workspaceLabel}</small></td>
            <td>${platformStatusPill(item.status || "pending")}</td>
            <td>${platformStatusPill(workspaceStatus)}</td>
            <td>${safe(formatDateTime(item.lastLoginAt))}</td>
            <td>${safe(formatDateTime(item.lastSeenAt || item.lastLoginAt))}</td>
            <td>${safe(formatDateTime(item.createdAt))}</td>
            <td>
              <div class="actions-row">
                ${!isSuper ? `<button class="btn btn-info btn-small" data-platform-status="${item.uid || item.id}" data-next-status="active">Activar</button>` : ""}
                ${!isSuper ? `<button class="btn btn-secondary btn-small" data-platform-status="${item.uid || item.id}" data-next-status="pending">Pendiente</button>` : ""}
                ${!isSuper ? `<button class="btn btn-danger btn-small" data-platform-status="${item.uid || item.id}" data-next-status="blocked">Bloquear</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
    async function updatePlatformAccountStatus(uid, status) {
      if (!isSuperAdmin()) return showToast("Solo el superadmin puede cambiar el estado de cuentas.");
      if (!uid || !PLATFORM_ACCOUNT_STATUSES.includes(cleanText(status))) return;
      const account = state.platformUsers.find(item => cleanText(item.uid || item.id) === cleanText(uid));
      if (!account) return showToast("No se encontró la cuenta.");
      try {
        const patch = {
          status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (status === "active") patch.approvedAt = firebase.firestore.FieldValue.serverTimestamp();
        if (status === "blocked") patch.blockedAt = firebase.firestore.FieldValue.serverTimestamp();
        await platformUserRef(uid).set(patch, { merge: true });
        const ownerId = cleanText(account.ownerId || account.uid || account.id);
        if (ownerId === cleanText(uid)) {
          const workspacePatch = {
            status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          if (status === "active") workspacePatch.approvedAt = firebase.firestore.FieldValue.serverTimestamp();
          if (status === "blocked") workspacePatch.blockedAt = firebase.firestore.FieldValue.serverTimestamp();
          await platformWorkspaceRef(ownerId).set(workspacePatch, { merge: true });
        }
        showToast(`Cuenta ${platformStatusLabel(status).toLowerCase()}.`);
      } catch (error) {
        console.error(error);
        showToast("No se pudo cambiar el estado de la cuenta.");
      }
    }
