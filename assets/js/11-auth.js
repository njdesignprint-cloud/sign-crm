    function bindRealtime() {
      clearUnsubscribers();

      const unsubCompanySettings = companySettingsRef().onSnapshot(snapshot => {
        state.companySettings = snapshot.exists ? snapshot.data() : {};
        if (typeof applyCompanySettingsRuntime === "function") applyCompanySettingsRuntime();
        if (typeof renderCompanySettingsForm === "function") renderCompanySettingsForm();
      }, error => console.error(error));

      const unsubClients = clientsRef().orderBy("createdAt", "desc").onSnapshot(snapshot => {
        state.clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClients();
        if (typeof renderSalespeople === "function") renderSalespeople();
        renderJobs();
        renderInstallationModule();
        renderReportsModule();
        if (typeof renderWeeklySettlements === "function") renderWeeklySettlements();
      }, error => console.error(error));

      const unsubJobs = jobsRef().orderBy("date", "desc").onSnapshot(snapshot => {
        state.jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (typeof renderSalespeople === "function") renderSalespeople();
        renderJobs();
        renderInstallationModule();
        renderReportsModule();
        if (typeof renderWeeklySettlements === "function") renderWeeklySettlements();
        if (state.editingJobId) {
          const currentJob = getJobById(state.editingJobId);
          if (currentJob) renderJobPreview();
        }
      }, error => console.error(error));

      const unsubExpenses = expensesRef().orderBy("date", "desc").onSnapshot(snapshot => {
        state.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderExpenses();
        renderInstallationModule();
        renderReportsModule();
        if (typeof renderWeeklySettlements === "function") renderWeeklySettlements();
        if (state.editingJobId) renderJobPreview();
      }, error => console.error(error));

      const unsubRecurring = recurringRef().orderBy("createdAt", "desc").onSnapshot(async snapshot => {
        state.recurringExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRecurringExpenses();
        try {
          await ensureRecurringExpensesForCurrentMonth();
        } catch (error) {
          console.error(error);
        }
      }, error => console.error(error));

      const unsubInventory = inventoryRef().orderBy("name", "asc").onSnapshot(snapshot => {
        state.inventoryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderInventory();
        renderInstallationModule();
        renderReportsModule();
        refreshOpenMaterialInventorySelects();
        if (state.editingJobId) renderJobPreview();
      }, error => console.error(error));

      const unsubMovements = inventoryMovementsRef().orderBy("date", "desc").onSnapshot(snapshot => {
        state.inventoryMovements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderInventoryMovements();
      }, error => console.error(error));

      const unsubProviders = providersRef().orderBy("name", "asc").onSnapshot(snapshot => {
        state.providers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProviders();
        renderReportsModule();
        renderProvidersDatalist();
        fillPurchaseOrderProviderSelect(cleanText($("purchaseOrderProviderId")?.value));
        fillPurchaseOrderSupplierFilter();
      }, error => console.error(error));

      const unsubPurchaseOrders = purchaseOrdersRef().orderBy("date", "desc").onSnapshot(snapshot => {
        state.purchaseOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPurchaseOrders();
        renderProviders();
        renderReportsModule();
      }, error => console.error(error));

      let unsubSalespeople = () => {};
      let unsubCommissionSettlements = () => {};
      let unsubTrash = () => {};
      if (isAdmin()) {
        unsubSalespeople = salespeopleRef().orderBy("name", "asc").onSnapshot(snapshot => {
          state.salespeople = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (typeof renderSalespeople === "function") renderSalespeople();
          if (typeof fillClientSalespersonSelect === "function") fillClientSalespersonSelect(cleanText($("clientSalespersonId")?.value));
          if (typeof fillJobSalespersonSelect === "function") fillJobSalespersonSelect(cleanText($("jobSalespersonId")?.value));
          renderClients();
        }, error => console.error(error));
        unsubCommissionSettlements = commissionSettlementsRef().orderBy("paymentDate", "desc").onSnapshot(snapshot => {
          state.commissionSettlements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (typeof renderCommissionSettlements === "function") renderCommissionSettlements();
          if (typeof renderSalespeople === "function") renderSalespeople();
          renderJobs();
        }, error => console.error(error));
        unsubTrash = trashRef().orderBy("archivedAt", "desc").onSnapshot(snapshot => {
          state.trashItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (typeof renderTrash === "function") renderTrash();
        }, error => console.error(error));
      } else {
        state.salespeople = [];
        state.commissionSettlements = [];
        state.trashItems = [];
      }

      let unsubWeeklySettlements = () => {};
      if (isOwner()) {
        unsubWeeklySettlements = weeklySettlementsRef().orderBy("weekStart", "desc").onSnapshot(snapshot => {
          state.weeklySettlements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (typeof renderWeeklySettlements === "function") renderWeeklySettlements();
        }, error => console.error(error));
      } else {
        state.weeklySettlements = [];
      }

      let unsubTeamMembers = () => {};
      if (canManageUsers()) {
        unsubTeamMembers = teamMembersRef().orderBy("email", "asc").onSnapshot(snapshot => {
          state.teamMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderUsers();
          renderInstallationModule();
          renderReportsModule();
        }, error => console.error(error));
      } else {
        state.teamMembers = [];
        renderUsers();
        renderInstallationModule();
        renderReportsModule();
      }

      let unsubPlatformUsers = () => {};
      let unsubPlatformWorkspaces = () => {};
      if (isSuperAdmin()) {
        unsubPlatformUsers = platformUsersRef().orderBy("createdAt", "desc").onSnapshot(snapshot => {
          state.platformUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (typeof renderPlatformAccounts === "function") renderPlatformAccounts();
        }, error => console.error(error));
        unsubPlatformWorkspaces = platformWorkspacesRef().orderBy("createdAt", "desc").onSnapshot(snapshot => {
          state.platformWorkspaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (typeof renderPlatformAccounts === "function") renderPlatformAccounts();
        }, error => console.error(error));
      } else {
        state.platformUsers = [];
        state.platformWorkspaces = [];
        if (typeof renderPlatformAccounts === "function") renderPlatformAccounts();
      }

      state.unsubscribers.push(unsubCompanySettings, unsubClients, unsubSalespeople, unsubCommissionSettlements, unsubTrash, unsubJobs, unsubExpenses, unsubRecurring, unsubInventory, unsubMovements, unsubProviders, unsubPurchaseOrders, unsubWeeklySettlements, unsubTeamMembers, unsubPlatformUsers, unsubPlatformWorkspaces);
    }

    function showAccessStatus(title, text) {
      $("authScreen").classList.add("hidden");
      $("appScreen").classList.add("hidden");
      $("accessStatusTitle").textContent = title;
      $("accessStatusText").textContent = text;
      $("accessStatusScreen").classList.remove("hidden");
    }

    async function persistLoginPresence() {
      if (!state.uid) return;
      try {
        await platformUserRef(state.uid).set({
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error(error);
      }

      if (state.accountOwnerId && state.accountOwnerId === state.uid) {
        try {
          await platformWorkspaceRef(state.accountOwnerId).set({
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error(error);
        }
      }

      if (state.accountOwnerId && state.accountOwnerId !== state.uid) {
        const presencePatch = {
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
          await workspaceMembersRef().doc(state.uid).set(presencePatch, { merge: true });
        } catch (error) {
          console.error(error);
        }
      }
    }

    async function login() {
      const email = cleanText($("authEmail").value);
      const password = cleanText($("authPassword").value);
      if (!email || !password) return showToast("Escribe correo y contraseña.");

      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch (error) {
        console.error(error);
        if (["auth/invalid-credential", "auth/invalid-login-credentials"].includes(error.code)) {
          showToast("Correo o contraseña incorrectos, o la cuenta no existe.");
        } else if (error.code === "auth/user-not-found") {
          showToast("Ese usuario no existe. Primero pulsa Crear cuenta.");
        } else if (error.code === "auth/wrong-password") {
          showToast("La contraseña es incorrecta.");
        } else {
          showToast(error.message || "No se pudo iniciar sesión.");
        }
      }
    }
    async function register() {
      const email = cleanText($("authEmail").value);
      const password = cleanText($("authPassword").value);
      const name = cleanText($("authFullName")?.value || "");
      const companyName = cleanText($("authCompanyName")?.value || "");
      if (!email || !password) return showToast("Escribe correo y contraseña.");
      if (password.length < 6) return showToast("La contraseña debe tener al menos 6 caracteres.");

      const isSuper = SUPERADMIN_EMAILS.includes(normalizedEmail(email));

      if (!isSuper) {
        if (!name) return showToast("Escribe tu nombre completo para crear la cuenta.");
        if (!companyName) return showToast("Escribe el nombre de tu empresa para crear la cuenta.");
      }

      try {
        sessionStorage.setItem("register_name", name);
        sessionStorage.setItem("register_company", companyName);

        const credential = await auth.createUserWithEmailAndPassword(email, password);
        const user = credential.user;

        let accessSnap = null;
        let isInvited = false;

        try {
          accessSnap = await db.collection("teamAccess").doc(normalizedEmail(email)).get();
          if (!accessSnap.exists) accessSnap = await db.collection("teamAccess").doc(emailDocId(email)).get();
          isInvited = accessSnap.exists && accessSnap.data()?.active !== false;
        } catch (innerError) {
          console.error("No se pudo leer teamAccess después del registro:", innerError);
        }

        const status = isSuper || isInvited ? "active" : "pending";
        const appRole = isSuper ? "superadmin" : (isInvited ? "employee" : "owner");

        await db.collection("platformUsers").doc(user.uid).set({
          uid: user.uid,
          email: normalizedEmail(email),
          name,
          companyName,
          status,
          appRole,
          workspaceRole: isInvited ? "employee" : "owner",
          ownerId: isInvited ? cleanText(accessSnap?.data()?.ownerId || "") : user.uid,
          ownerEmail: isInvited
            ? cleanText(accessSnap?.data()?.ownerEmail || accessSnap?.data()?.workspaceOwnerEmail || "")
            : normalizedEmail(email),
          invited: isInvited,
          requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
          approvedAt: status === "active" ? firebase.firestore.FieldValue.serverTimestamp() : null,
          blockedAt: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        if (!isInvited) {
          await db.collection("platformWorkspaces").doc(user.uid).set({
            ownerUid: user.uid,
            ownerEmail: normalizedEmail(email),
            companyName: companyName || email,
            status,
            plan: "starter",
            requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedAt: status === "active" ? firebase.firestore.FieldValue.serverTimestamp() : null,
            blockedAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }

        showToast(isInvited
          ? "Cuenta creada y ligada al espacio compartido."
          : "Cuenta creada. Quedó pendiente de activación en Cuentas CRM.");
      } catch (error) {
        console.error(error);
        if (error.code === "auth/email-already-in-use") {
          showToast("Ese correo ya existe. Usa Entrar o Recuperar contraseña.");
        } else if (error.code === "auth/operation-not-allowed") {
          showToast("El acceso por correo no está disponible. Contacta al soporte de SignShop HQ.");
        } else {
          showToast(error.message || "No se pudo crear la cuenta.");
        }
      }
    }
    async function resetPassword() {
      const email = cleanText($("authEmail").value);
      if (!email) return showToast("Escribe tu correo primero.");

      try {
        await auth.sendPasswordResetEmail(email);
        showToast("Te envié un correo para restablecer la contraseña.");
      } catch (error) {
        console.error(error);
        showToast(error.message || "No se pudo enviar el correo.");
      }
    }
    async function logout() {
      try {
        await auth.signOut();
      } catch (error) {
        console.error(error);
        showToast("No se pudo cerrar sesión.");
      }
    }
    async function handleSignedIn(user) {
      await resolveWorkspaceAccess(user);
      if (typeof window.setCrmLanguage === "function") window.setCrmLanguage(state.language, { persist: false });

      if (!isSuperAdmin()) {
        if (state.currentPlatformStatus === "blocked") {
          showAccessStatus("Cuenta bloqueada", "Tu cuenta fue bloqueada temporalmente. Contacta al administrador de la app para reactivarla.");
          return;
        }
        if (state.currentPlatformStatus === "pending") {
          showAccessStatus("Cuenta pendiente", "Tu registro ya quedó creado. Entra un superadmin a Cuentas CRM y activa tu cuenta para poder usar la app.");
          return;
        }
      }

      await persistLoginPresence();

      $("activeUserEmail").textContent = state.userEmail;
      $("authScreen").classList.add("hidden");
      $("accessStatusScreen").classList.add("hidden");
      $("appScreen").classList.remove("hidden");
      bindRealtime();
      setView(isSuperAdmin() && state.currentView === "cuentascrm" ? "cuentascrm" : (canManageUsers() && state.currentView === "usuarios" ? "usuarios" : "dashboard"));
      applyPermissionUi();
      if (typeof renderPlatformAccounts === "function") renderPlatformAccounts();
    }
    function handleSignedOut() {
      clearUnsubscribers();
      state.uid = null;
      state.accountOwnerId = null;
      state.userEmail = "";
      state.currentUserRole = "owner";
      state.currentWorkspaceOwnerEmail = "";
      state.currentModulePermissions = {};
      state.isSuperAdmin = false;
      state.currentPlatformStatus = "active";
      state.currentWorkspaceStatus = "active";
      state.platformUsers = [];
      state.platformWorkspaces = [];
      state.clients = [];
      state.jobs = [];
      state.expenses = [];
      state.recurringExpenses = [];
      state.inventoryItems = [];
      state.inventoryMovements = [];
      state.providers = [];
      state.purchaseOrders = [];
      state.teamMembers = [];
      state.galleryIndex = 0;
      state.galleryJobId = null;
      $("accessStatusScreen")?.classList.add("hidden");
      $("authScreen").classList.remove("hidden");
      $("appScreen").classList.add("hidden");
    }
