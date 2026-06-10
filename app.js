const SUPABASE_URL = "https://nxqwrlbwnaqntuvcspln.supabase.co";
const SUPABASE_KEY = "sb_publishable_TVcQqAhasEthm_LoHFjmYw_OUbo3i5v";
const API_URL = window.SCOPEY_API_URL || "http://localhost:3000";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =======================
// STATE
// =======================
let currentUser = null;
let currentProjectId = null;
let currentProject = null;
let currentProjects = [];
let currentScopeItems = [];
let currentChanges = [];
let currentProjectTab = "overview";

let isClientView = false;
let isBusy = false;
let authMode = "signin";

const params = new URLSearchParams(window.location.search);
const shareId = params.get("share");

const ACCESSIBILITY_KEY = "scopey-accessibility";

// =======================
// DOM REFERENCES
// =======================
const bannerEl = document.getElementById("banner");
const landingView = document.getElementById("landing-view");
const ownerView = document.getElementById("owner-view");
const clientView = document.getElementById("client-view");

const signInBtn = document.getElementById("header-sign-in-btn");
const signOutBtn = document.getElementById("header-sign-out-btn");
const dashboardBtn = document.getElementById("header-dashboard-btn");
const heroStartBtn = document.getElementById("hero-start-btn");

const authModal = document.getElementById("auth-modal");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authMagicLinkBtn = document.getElementById("auth-magic-link-btn");
const closeAuthBtn = document.getElementById("close-auth-btn");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");

const accessibilityButton = document.getElementById("accessibility-button");
const accessibilityModal = document.getElementById("accessibility-modal");
const closeAccessibilityBtn = document.getElementById("close-accessibility-btn");
const resetAccessibilityBtn = document.getElementById("reset-accessibility-btn");

const projectListEl = document.getElementById("project-list");
const toggleProjectCreateBtn = document.getElementById("toggle-project-create-btn");
const projectCreateCard = document.getElementById("project-create-card");

const newProjectTitle = document.getElementById("new-project-title");
const newProjectClient = document.getElementById("new-project-client");
const createProjectBtn = document.getElementById("create-project-btn");

const ownerEmptyState = document.getElementById("owner-empty-state");
const projectWorkspace = document.getElementById("project-workspace");

const copyLinkBtn = document.getElementById("copy-link-btn");
const copyLinkBtnSecondary = document.getElementById("copy-link-btn-secondary");

const projectTitleEl = document.getElementById("project-title");
const projectSubtitleEl = document.getElementById("project-subtitle");
const ownerStatusChip = document.getElementById("owner-status-chip");

const metricScopeCount = document.getElementById("metric-scope-count");
const metricPendingCount = document.getElementById("metric-pending-count");
const metricPendingTotal = document.getElementById("metric-pending-total");
const metricApprovedTotal = document.getElementById("metric-approved-total");

const overviewSummaryCopy = document.getElementById("overview-summary-copy");
const overviewNextAction = document.getElementById("overview-next-action");

const scopeTitleInput = document.getElementById("scope-title");
const scopePriceInput = document.getElementById("scope-price");
const addScopeBtn = document.getElementById("add-scope-btn");
const scopeList = document.getElementById("scope-list");

const changeInput = document.getElementById("change-input");
const changePriceInput = document.getElementById("change-price");
const addChangeBtn = document.getElementById("add-change-btn");

const pendingList = document.getElementById("pending-list");
const approvedList = document.getElementById("approved-list");

const ownerClientScopeList = document.getElementById("owner-client-scope-list");
const ownerClientPendingList = document.getElementById("owner-client-pending-list");
const ownerClientApprovedList = document.getElementById("owner-client-approved-list");

const clientProjectTitle = document.getElementById("client-project-title");
const clientProjectSubtitle = document.getElementById("client-project-subtitle");
const clientScopeList = document.getElementById("client-scope-list");
const clientPendingList = document.getElementById("client-pending-list");
const clientApprovedList = document.getElementById("client-approved-list");

// =======================
// HERO ROTATOR
// =======================
const heroTopLines = [
  "Less scope creep.",
  "Less back-and-forth.",
  "Clearer boundaries.",
  "Fewer unpaid extras."
];

const heroBottomLines = [
  "More paid approvals.",
  "More focused delivery.",
  "More confident pricing.",
  "More sustainable work."
];

let heroTopIndex = 0;
let heroBottomIndex = 0;

function swapHeroLine(el, nextText) {
  if (!el) return;

  el.classList.add("fade-out");

  setTimeout(() => {
    el.textContent = nextText;
    el.classList.remove("fade-out");
  }, 420);
}

function startHeroRotator() {
  const topEl = document.getElementById("hero-top-text");
  const bottomEl = document.getElementById("hero-bottom-text");
  if (!topEl || !bottomEl) return;

  setInterval(() => {
    heroTopIndex = (heroTopIndex + 1) % heroTopLines.length;
    swapHeroLine(topEl, heroTopLines[heroTopIndex]);
  }, 2600);

  setInterval(() => {
    heroBottomIndex = (heroBottomIndex + 1) % heroBottomLines.length;
    swapHeroLine(bottomEl, heroBottomLines[heroBottomIndex]);
  }, 3900);
}

// =======================
// UTILITIES
// =======================
function formatCurrency(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function showBanner(message, kind = "info") {
  if (!bannerEl) return;
  bannerEl.textContent = message;
  bannerEl.className = `banner ${kind}`;
  bannerEl.style.display = "block";
}

function clearBanner() {
  if (!bannerEl) return;
  bannerEl.textContent = "";
  bannerEl.style.display = "none";
}

function setView(mode) {
  landingView?.classList.add("hidden");
  ownerView?.classList.add("hidden");
  clientView?.classList.add("hidden");

  if (mode === "landing") landingView?.classList.remove("hidden");
  if (mode === "owner") ownerView?.classList.remove("hidden");
  if (mode === "client") clientView?.classList.remove("hidden");
}

function setButtonLoading(button, loading, text) {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function buildEmptyState(text) {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = text;
  return div;
}

function buildListRow(title, subtitle, rightNode = null) {
  const row = document.createElement("div");
  row.className = "list-item";

  const left = document.createElement("div");
  left.className = "item-main";

  const titleEl = document.createElement("div");
  titleEl.className = "item-title";
  titleEl.textContent = title;

  const subtitleEl = document.createElement("div");
  subtitleEl.className = "item-client";
  subtitleEl.textContent = subtitle;

  left.appendChild(titleEl);
  left.appendChild(subtitleEl);
  row.appendChild(left);

  if (rightNode) {
    const right = document.createElement("div");
    right.className = "item-meta";
    right.appendChild(rightNode);
    row.appendChild(right);
  }

  return row;
}

// =======================
// ACCESSIBILITY
// =======================
function getAccessibilitySettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCESSIBILITY_KEY));
    return {
      theme: saved?.theme || "light",
      textSize: saved?.textSize || "medium"
    };
  } catch {
    return { theme: "light", textSize: "medium" };
  }
}

function saveAccessibilitySettings(settings) {
  localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(settings));
}

function updateAccessibilityControlState() {
  const settings = getAccessibilitySettings();

  document.querySelectorAll("[data-theme-option]").forEach((button) => {
    const active = button.dataset.themeOption === settings.theme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-text-size-option]").forEach((button) => {
    const active = button.dataset.textSizeOption === settings.textSize;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function applyTheme(theme, persist = true) {
  document.body.classList.remove("theme-dark", "theme-high-contrast");

  if (theme === "dark") document.body.classList.add("theme-dark");
  if (theme === "high-contrast") document.body.classList.add("theme-high-contrast");

  if (persist) {
    const current = getAccessibilitySettings();
    saveAccessibilitySettings({ ...current, theme });
  }

  updateAccessibilityControlState();
}

function applyTextSize(textSize, persist = true) {
  document.documentElement.classList.remove(
    "text-size-small",
    "text-size-medium",
    "text-size-large"
  );
  document.documentElement.classList.add(`text-size-${textSize}`);

  if (persist) {
    const current = getAccessibilitySettings();
    saveAccessibilitySettings({ ...current, textSize });
  }

  updateAccessibilityControlState();
}

function loadAccessibilitySettings() {
  const settings = getAccessibilitySettings();
  applyTheme(settings.theme, false);
  applyTextSize(settings.textSize, false);
}

function resetAccessibilitySettings() {
  saveAccessibilitySettings({ theme: "light", textSize: "medium" });
  applyTheme("light", false);
  applyTextSize("medium", false);
  updateAccessibilityControlState();
}

function openAccessibilityModal() {
  accessibilityModal?.setAttribute("aria-hidden", "false");
}

function closeAccessibilityModal() {
  accessibilityModal?.setAttribute("aria-hidden", "true");
}

// =======================
// AUTH UI
// =======================
function updateAuthModeUI() {
  const isSignIn = authMode === "signin";

  if (authTitle) {
    authTitle.textContent = isSignIn
      ? "Sign in to Scopey"
      : "Create your Scopey account";
  }

  if (authSubtitle) {
    authSubtitle.textContent = isSignIn
      ? "Use your email and password to access your dashboard."
      : "Create an account to start tracking scope and paid changes.";
  }

  if (authSubmitBtn) {
    authSubmitBtn.textContent = isSignIn ? "Continue" : "Create account";
  }

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    const active = button.dataset.authMode === authMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function openAuthModal() {
  authMode = "signin";
  updateAuthModeUI();

  if (authPasswordInput) authPasswordInput.value = "";

  authModal?.setAttribute("aria-hidden", "false");
}

function closeAuthModal() {
  authModal?.setAttribute("aria-hidden", "true");
}

function updateAuthButtons(isAuthed) {
  if (!signInBtn || !signOutBtn || !dashboardBtn) return;

  if (isClientView) {
    signInBtn.classList.add("hidden");
    signOutBtn.classList.add("hidden");
    dashboardBtn.classList.add("hidden");
    return;
  }

  if (isAuthed) {
    signInBtn.classList.add("hidden");
    signOutBtn.classList.remove("hidden");
    dashboardBtn.classList.remove("hidden");
  } else {
    signInBtn.classList.remove("hidden");
    signOutBtn.classList.add("hidden");
    dashboardBtn.classList.add("hidden");
  }
}

// =======================
// AUTH
// =======================
async function refreshCurrentUser() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error("refreshCurrentUser error:", error);
    return null;
  }

  currentUser = data?.session?.user || null;
  return currentUser;
}

async function handlePasswordAuth() {
  const email = authEmailInput?.value.trim();
  const password = authPasswordInput?.value;

  if (!email || !password) {
    showBanner("Please enter both email and password.", "error");
    return;
  }

  setButtonLoading(
    authSubmitBtn,
    true,
    authMode === "signin" ? "Signing in..." : "Creating..."
  );

  try {
    if (authMode === "signin") {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      currentUser = data?.user || null;

      closeAuthModal();
      showBanner("Signed in successfully.", "success");

      if (currentUser) {
        await initOwnerView();
      }
    } else {
      const { data, error } = await db.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      closeAuthModal();

      if (data?.user && data?.session) {
        currentUser = data.user;
        showBanner("Account created and signed in.", "success");
        await initOwnerView();
      } else {
        showBanner(
          "Account created. Check your email if confirmation is required, then sign in.",
          "success"
        );
      }
    }
  } catch (error) {
    console.error("Auth error:", error);
    showBanner(error.message || "Authentication failed.", "error");
  } finally {
    setButtonLoading(
      authSubmitBtn,
      false,
      authMode === "signin" ? "Continue" : "Create account"
    );
  }
}

async function sendMagicLink() {
  const email = authEmailInput?.value.trim();

  if (!email) {
    showBanner("Please enter your email address first.", "error");
    return;
  }

  setButtonLoading(authMagicLinkBtn, true, "Sending...");

  try {
    const { error } = await db.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    showBanner("Magic link sent. Check your inbox.", "success");
    closeAuthModal();
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not send magic link.", "error");
  } finally {
    setButtonLoading(authMagicLinkBtn, false, "Use magic link instead");
  }
}

async function signOut() {
  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;

    currentUser = null;
    currentProject = null;
    currentProjectId = null;
    currentProjects = [];
    currentScopeItems = [];
    currentChanges = [];
    currentProjectTab = "overview";
    isClientView = false;

    updateAuthButtons(false);
    setView("landing");
    showBanner("Signed out.", "success");

    window.location.href = window.location.origin;
  } catch (error) {
    console.error("signOut error:", error);
    showBanner(error.message || "Could not sign out.", "error");
  }
}

// =======================
// PROJECT LIST / TABS
// =======================
function setCurrentProjectTab(tabName) {
  currentProjectTab = tabName;

  document.querySelectorAll("[data-project-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.projectTab === tabName);
  });

  document.querySelectorAll(".project-tab-panel").forEach((panel) => {
    panel.classList.add("hidden");
  });

  const target = document.getElementById(`project-tab-${tabName}`);
  target?.classList.remove("hidden");
}

function renderProjectList() {
  if (!projectListEl) return;

  projectListEl.innerHTML = "";

  if (!currentProjects.length) {
    projectListEl.appendChild(buildEmptyState("No projects yet."));
    return;
  }

  currentProjects.forEach((project) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-list-item";
    if (project.id === currentProjectId) {
      button.classList.add("active");
    }

    const title = document.createElement("div");
    title.className = "project-list-title";
    title.textContent = project.title;

    const meta = document.createElement("div");
    meta.className = "project-list-meta";
    meta.textContent = project.client_name;

    button.appendChild(title);
    button.appendChild(meta);

    button.addEventListener("click", async () => {
      currentProjectId = project.id;
      await loadProject();
    });

    projectListEl.appendChild(button);
  });
}

function renderOwnerEmptyWorkspace() {
  ownerEmptyState?.classList.remove("hidden");
  projectWorkspace?.classList.add("hidden");

  if (metricScopeCount) metricScopeCount.textContent = "0";
  if (metricPendingCount) metricPendingCount.textContent = "0";
  if (metricPendingTotal) metricPendingTotal.textContent = formatCurrency(0);
  if (metricApprovedTotal) metricApprovedTotal.textContent = formatCurrency(0);
}

function renderOwnerWorkspace(project, scopeItems, changes) {
  ownerEmptyState?.classList.add("hidden");
  projectWorkspace?.classList.remove("hidden");

  projectTitleEl.textContent = project.title;
  projectSubtitleEl.textContent = `Client: ${project.client_name}`;
  ownerStatusChip?.classList.remove("hidden");

  const pending = changes.filter((change) => change.status === "pending");
  const approved = changes.filter((change) => change.status === "approved");

  metricScopeCount.textContent = String(scopeItems.length);
  metricPendingCount.textContent = String(pending.length);
  metricPendingTotal.textContent = formatCurrency(
    pending.reduce((sum, change) => sum + Number(change.price || 0), 0)
  );
  metricApprovedTotal.textContent = formatCurrency(
    approved.reduce((sum, change) => sum + Number(change.price || 0), 0)
  );

  overviewSummaryCopy.textContent =
    pending.length > 0
      ? `${project.title} has ${pending.length} pending change request${pending.length === 1 ? "" : "s"} worth ${formatCurrency(
          pending.reduce((sum, change) => sum + Number(change.price || 0), 0)
        )}.`
      : `${project.title} has no pending changes right now.`;

  overviewNextAction.textContent =
    scopeItems.length === 0
      ? "Add your included scope first so change requests are easier to justify."
      : pending.length === 0
      ? "Add a priced change request the next time the client asks for extra work."
      : "Review pending changes and send the share link to the client.";

  scopeList.innerHTML = "";
  pendingList.innerHTML = "";
  approvedList.innerHTML = "";

  ownerClientScopeList.innerHTML = "";
  ownerClientPendingList.innerHTML = "";
  ownerClientApprovedList.innerHTML = "";

  if (scopeItems.length === 0) {
    scopeList.appendChild(buildEmptyState("No scope items yet."));
    ownerClientScopeList.appendChild(buildEmptyState("No scope items available."));
  } else {
    scopeItems.forEach((item) => {
      const row = buildListRow(item.title, `Included · ${formatCurrency(item.price)}`);
      scopeList.appendChild(row);
      ownerClientScopeList.appendChild(
        buildListRow(item.title, `Included · ${formatCurrency(item.price)}`)
      );
    });
  }

  if (pending.length === 0) {
    pendingList.appendChild(buildEmptyState("No pending changes."));
    ownerClientPendingList.appendChild(buildEmptyState("There are no pending changes."));
  } else {
    pending.forEach((change) => {
      const ownerLabel = document.createElement("span");
      ownerLabel.textContent = "Awaiting payment";
      pendingList.appendChild(
        buildListRow(change.title, `Change · ${formatCurrency(change.price)}`, ownerLabel)
      );

      const previewLabel = document.createElement("span");
      previewLabel.textContent = "Pay required";
      ownerClientPendingList.appendChild(
        buildListRow(change.title, `Pending · ${formatCurrency(change.price)}`, previewLabel)
      );
    });
  }

  if (approved.length === 0) {
    approvedList.appendChild(buildEmptyState("No approved changes."));
    ownerClientApprovedList.appendChild(buildEmptyState("No approved changes yet."));
  } else {
    approved.forEach((change) => {
      const ownerLabel = document.createElement("span");
      ownerLabel.textContent = change.paid ? "Paid & approved" : "Approved";

      const subtitle = change.paid_at
        ? `Approved · ${formatCurrency(change.price)} · Paid ${new Date(change.paid_at).toLocaleString()}`
        : `Approved · ${formatCurrency(change.price)}`;

      approvedList.appendChild(buildListRow(change.title, subtitle, ownerLabel));

      const previewLabel = document.createElement("span");
      previewLabel.textContent = "Approved";
      ownerClientApprovedList.appendChild(
        buildListRow(change.title, `Approved · ${formatCurrency(change.price)}`, previewLabel)
      );
    });
  }

  setCurrentProjectTab(currentProjectTab);
}

// =======================
// OWNER VIEW
// =======================
async function loadProjects() {
  if (!currentUser) return;

  const { data, error } = await db
    .from("projects")
    .select("id,title,client_name,share_id")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  currentProjects = data || [];
  renderProjectList();

  if (!currentProjects.length) {
    currentProjectId = null;
    currentProject = null;
    renderOwnerEmptyWorkspace();
    return;
  }

  if (!currentProjectId || !currentProjects.some((project) => project.id === currentProjectId)) {
    currentProjectId = currentProjects[0].id;
  }
}

async function loadProject() {
  if (!currentProjectId) {
    renderOwnerEmptyWorkspace();
    return;
  }

  const { data: project, error: projectError } = await db
    .from("projects")
    .select("id,title,client_name,share_id")
    .eq("id", currentProjectId)
    .single();

  if (projectError) throw projectError;

  const { data: scope, error: scopeError } = await db
    .from("scope_items")
    .select("id,title,price")
    .eq("project_id", currentProjectId)
    .order("created_at", { ascending: true });

  if (scopeError) throw scopeError;

  const { data: changes, error: changesError } = await db
    .from("changes")
    .select("id,title,price,status,paid,paid_at")
    .eq("project_id", currentProjectId)
    .order("created_at", { ascending: true });

  if (changesError) throw changesError;

  currentProject = project;
  currentScopeItems = scope || [];
  currentChanges = changes || [];

  renderProjectList();
  renderOwnerWorkspace(currentProject, currentScopeItems, currentChanges);
}

async function createProject() {
  const title = newProjectTitle?.value.trim();
  const clientName = newProjectClient?.value.trim();

  if (!title || !clientName) {
    showBanner("Please enter both project name and client name.", "error");
    return;
  }

  setButtonLoading(createProjectBtn, true, "Creating...");

  try {
    const { data, error } = await db
      .from("projects")
      .insert([
        {
          title,
          client_name: clientName,
          user_id: currentUser.id,
          share_id: crypto.randomUUID()
        }
      ])
      .select("id")
      .single();

    if (error) throw error;

    newProjectTitle.value = "";
    newProjectClient.value = "";
    currentProjectId = data.id;

    await loadProjects();
    await loadProject();

    showBanner("Project created successfully.", "success");
  } catch (error) {
    console.error(error);
    showBanner("Could not create project.", "error");
  } finally {
    setButtonLoading(createProjectBtn, false, "Create project");
  }
}

async function addScopeItem() {
  const title = scopeTitleInput?.value.trim();
  const price = Number(scopePriceInput?.value);

  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  if (!title || Number.isNaN(price) || price < 0) {
    showBanner("Enter a valid scope item and price.", "error");
    return;
  }

  setButtonLoading(addScopeBtn, true, "Adding...");

  try {
    const { error } = await db.from("scope_items").insert([
      {
        project_id: currentProjectId,
        title,
        price
      }
    ]);

    if (error) throw error;

    scopeTitleInput.value = "";
    scopePriceInput.value = "";

    await loadProject();
    showBanner("Scope item added.", "success");
  } catch (error) {
    console.error(error);
    showBanner("Could not add scope item.", "error");
  } finally {
    setButtonLoading(addScopeBtn, false, "Add");
  }
}

async function addChange() {
  const title = changeInput?.value.trim();
  const price = Number(changePriceInput?.value);

  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  if (!title || Number.isNaN(price) || price <= 0) {
    showBanner("Enter a valid change description and price.", "error");
    return;
  }

  setButtonLoading(addChangeBtn, true, "Adding...");

  try {
    const { error } = await db.from("changes").insert([
      {
        project_id: currentProjectId,
        title,
        price,
        status: "pending",
        paid: false
      }
    ]);

    if (error) throw error;

    changeInput.value = "";
    changePriceInput.value = "";

    await loadProject();
    showBanner("Change added.", "success");
  } catch (error) {
    console.error(error);
    showBanner("Could not add change.", "error");
  } finally {
    setButtonLoading(addChangeBtn, false, "Add");
  }
}

async function copyShareLink() {
  if (!currentProject?.share_id) {
    showBanner("Select a project first.", "error");
    return;
  }

  try {
    const link = `${window.location.origin}?share=${encodeURIComponent(currentProject.share_id)}`;
    await navigator.clipboard.writeText(link);
    showBanner("Share link copied.", "success");
  } catch (error) {
    console.error(error);
    showBanner("Could not copy share link.", "error");
  }
}

// =======================
// CLIENT VIEW
// =======================
async function loadSharedProject() {
  const response = await fetch(`${API_URL}/public/project/${encodeURIComponent(shareId)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Could not load shared project.");
  }

  isClientView = true;
  renderClient(data.project, data.scopeItems, data.changes);
}

function renderClient(project, scopeItems, changes) {
  clientProjectTitle.textContent = project.title;
  clientProjectSubtitle.textContent = `Client: ${project.client_name}`;

  clientScopeList.innerHTML = "";
  clientPendingList.innerHTML = "";
  clientApprovedList.innerHTML = "";

  if (scopeItems.length === 0) {
    clientScopeList.appendChild(buildEmptyState("No scope items available."));
  } else {
    scopeItems.forEach((item) => {
      clientScopeList.appendChild(
        buildListRow(item.title, `Included · ${formatCurrency(item.price)}`)
      );
    });
  }

  const pending = changes.filter((change) => change.status === "pending");
  const approved = changes.filter((change) => change.status === "approved");

  if (pending.length === 0) {
    clientPendingList.appendChild(buildEmptyState("There are no pending changes."));
  } else {
    pending.forEach((change) => {
      const payBtn = document.createElement("button");
      payBtn.className = "btn btn-primary";
      payBtn.textContent = "Pay & approve";
      payBtn.onclick = (event) => startPublicPayment(change, event);

      clientPendingList.appendChild(
        buildListRow(change.title, `Pending · ${formatCurrency(change.price)}`, payBtn)
      );
    });
  }

  if (approved.length === 0) {
    clientApprovedList.appendChild(buildEmptyState("No approved changes yet."));
  } else {
    approved.forEach((change) => {
      const label = document.createElement("span");
      label.textContent = "Approved";

      const subtitle = change.paid_at
        ? `Approved · ${formatCurrency(change.price)} · Paid ${new Date(change.paid_at).toLocaleString()}`
        : `Approved · ${formatCurrency(change.price)}`;

      clientApprovedList.appendChild(buildListRow(change.title, subtitle, label));
    });
  }
}

async function startPublicPayment(change, event) {
  if (isBusy) return;
  isBusy = true;

  const button = event.target;
  setButtonLoading(button, true, "Redirecting...");

  try {
    const response = await fetch(`${API_URL}/public/create-change-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shareId,
        changeId: change.id
      })
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data?.error || "Could not start checkout.");
    }

    window.location.href = data.url;
  } catch (error) {
    console.error(error);
    showBanner("Could not start payment. Please try again.", "error");
    setButtonLoading(button, false);
    isBusy = false;
  }
}

// =======================
// INIT
// =======================
async function initOwnerView() {
  try {
    clearBanner();
    await loadProjects();

    if (currentProjectId) {
      await loadProject();
    } else {
      renderOwnerEmptyWorkspace();
    }

    updateAuthButtons(true);
    setView("owner");
  } catch (error) {
    console.error("initOwnerView error:", error);
    showBanner("Could not load your dashboard.", "error");
    setView("landing");
  }
}

async function initClientView() {
  try {
    clearBanner();
    updateAuthButtons(false);
    await loadSharedProject();
    setView("client");
  } catch (error) {
    console.error(error);
    showBanner("This shared project could not be loaded.", "error");
    setView("landing");
  }
}

async function init() {
  loadAccessibilitySettings();
  updateAuthModeUI();
  startHeroRotator();

  if (shareId) {
    await initClientView();
    return;
  }

  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error(error);
    showBanner("Could not read session.", "error");
    setView("landing");
    updateAuthButtons(false);
    return;
  }

  if (!data.session) {
    setView("landing");
    updateAuthButtons(false);
    return;
  }

  currentUser = data.session.user;
  updateAuthButtons(true);
  setView("landing");
}

// =======================
// EVENTS
// =======================
signInBtn?.addEventListener("click", openAuthModal);
heroStartBtn?.addEventListener("click", openAuthModal);
closeAuthBtn?.addEventListener("click", closeAuthModal);

authSubmitBtn?.addEventListener("click", handlePasswordAuth);
authMagicLinkBtn?.addEventListener("click", sendMagicLink);

signOutBtn?.addEventListener("click", signOut);

dashboardBtn?.addEventListener("click", async () => {
  const user = await refreshCurrentUser();

  if (!user) {
    showBanner("Your session has expired. Please sign in again.", "warning");
    setView("landing");
    updateAuthButtons(false);
    return;
  }

  try {
    await initOwnerView();
  } catch (error) {
    console.error("Dashboard button error:", error);
    showBanner("Could not open your dashboard.", "error");
  }
});

accessibilityButton?.addEventListener("click", openAccessibilityModal);
closeAccessibilityBtn?.addEventListener("click", closeAccessibilityModal);
resetAccessibilityBtn?.addEventListener("click", resetAccessibilitySettings);

toggleProjectCreateBtn?.addEventListener("click", () => {
  projectCreateCard?.classList.toggle("hidden");
});

copyLinkBtn?.addEventListener("click", copyShareLink);
copyLinkBtnSecondary?.addEventListener("click", copyShareLink);

document.querySelectorAll("[data-theme-option]").forEach((button) => {
  button.addEventListener("click", () => applyTheme(button.dataset.themeOption));
});

document.querySelectorAll("[data-text-size-option]").forEach((button) => {
  button.addEventListener("click", () => applyTextSize(button.dataset.textSizeOption));
});

document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    authMode = button.dataset.authMode;
    updateAuthModeUI();
  });
});

document.querySelectorAll("[data-project-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    setCurrentProjectTab(button.dataset.projectTab);
  });
});

createProjectBtn?.addEventListener("click", createProject);
addScopeBtn?.addEventListener("click", addScopeItem);
addChangeBtn?.addEventListener("click", addChange);

db.auth.onAuthStateChange(async (event, session) => {
  currentUser = session?.user || null;

  if (shareId) return;

  if (currentUser) {
    updateAuthButtons(true);

    if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
      try {
        await initOwnerView();
      } catch (error) {
        console.error("Auth state initOwnerView error:", error);
        showBanner("Could not load your dashboard.", "error");
        setView("landing");
      }
    }
  } else {
    updateAuthButtons(false);
    setView("landing");
  }
});

window.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
  if (event.target === accessibilityModal) closeAccessibilityModal();
});

init();