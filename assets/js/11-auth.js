    function bindRealtime() {
      clearUnsubscribers();

      const unsubClients = clientsRef().orderBy("createdAt", "desc").onSnapshot(snapshot => {
        state.clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClients();
        renderJobs();
        renderInstallationModule();
        renderReportsModule();
      }, error => console.error(error));

      const unsubJobs = jobsRef().orderBy("date", "desc").onSnapshot(snapshot => {
        state.jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderJobs();
        renderInstallationModule();
        renderReportsModule();
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

      state.unsubscribers.push(unsubClients, unsubJobs, unsubExpenses, unsubRecurring, unsubInventory, unsubMovements, unsubProviders, unsubPurchaseOrders, unsubTeamMembers);
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
      if (!email || !password) return showToast("Escribe correo y contraseña.");
      if (password.length < 6) return showToast("La contraseña debe tener al menos 6 caracteres.");

      try {
        await auth.createUserWithEmailAndPassword(email, password);
        showToast("Cuenta creada correctamente.");
      } catch (error) {
        console.error(error);
        if (error.code === "auth/email-already-in-use") {
          showToast("Ese correo ya existe. Usa Entrar o Recuperar contraseña.");
        } else if (error.code === "auth/operation-not-allowed") {
          showToast("Activa Email/Password en Firebase Authentication.");
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
      $("activeUserEmail").textContent = state.userEmail;
      $("authScreen").classList.add("hidden");
      $("appScreen").classList.remove("hidden");
      bindRealtime();
      setView(canManageUsers() && state.currentView === "usuarios" ? "usuarios" : "dashboard");
      applyPermissionUi();
    }
    function handleSignedOut() {
      clearUnsubscribers();
      state.uid = null;
      state.accountOwnerId = null;
      state.userEmail = "";
      state.currentUserRole = "owner";
      state.currentWorkspaceOwnerEmail = "";
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
      $("authScreen").classList.remove("hidden");
      $("appScreen").classList.add("hidden");
    }
