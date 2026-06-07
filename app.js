const SUPABASE_URL = "https://nxqwrlbwnaqntuvcspln.supabase.co";
const SUPABASE_KEY = "sb_publishable_TVcQqAhasEthm_LoHFjmYw_OUbo3i5v";
const STRIPE_KEY = "pk_test_51Tfdr9HbHMKHnVYfDDun9mhREMp6UCVAKYu2ZD2lNuBnPbjYTvmIEQQTYdr2saGSyTUSw8n7JFGevNEOSsn59UNW00NuHvchbc";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const stripe = Stripe(STRIPE_KEY);
const API_BASE_URL = window.SCOPEY_API_URL || (window.location.origin.includes("localhost") || window.location.origin === "null" ? "http://localhost:3000" : window.location.origin);
const AUTH_REDIRECT_PATH = "/auth/callback";
const AUTH_REDIRECT_URL = `${window.location.origin}${AUTH_REDIRECT_PATH}`;

const form = document.getElementById("form");
const title = document.getElementById("title");
const client = document.getElementById("client");
const limit = document.getElementById("limit");
const plan = document.getElementById("plan");
const total = document.getElementById("total");
const banner = document.getElementById("banner");
const authCallbackPanel = document.getElementById("auth-callback-panel");
const authCallbackMessage = document.getElementById("auth-callback-message");
const list = document.getElementById("list");
const dashboardSection = document.getElementById("dashboard");
const subscriptionStatusText = document.getElementById("subscription-status");
const subscriptionNextBillText = document.getElementById("subscription-next-bill");
const subscriptionExpirationText = document.getElementById("subscription-expiration");
const increaseTextButton = document.getElementById("increase-text");
const decreaseTextButton = document.getElementById("decrease-text");
const resetTextButton = document.getElementById("reset-text");
const textSizeLabel = document.getElementById("text-size-label");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const trialButton = document.getElementById("trial-button");
const statusMessage = document.getElementById("status-message");
const heroLeft = document.getElementById("hero-left");
const heroRight = document.getElementById("hero-right");
const analyticsCopy = document.getElementById("analytics-copy");
const insightCount = document.getElementById("insight-count");
const insightRevisions = document.getElementById("insight-revisions");
const insightRemaining = document.getElementById("insight-remaining");
const remindersCopy = document.getElementById("reminders-copy");
const exportButton = document.getElementById("export-button");
const pricingCards = Array.from(document.querySelectorAll(".pricing-card"));

const textSizeSteps = [90, 100, 110, 120];
let currentTextSize = 100;

function loadAccessibilityPreferences() {
  const savedSize = Number(localStorage.getItem("scopeyTextSize"));
  if (textSizeSteps.includes(savedSize)) {
    currentTextSize = savedSize;
  }
  document.documentElement.style.fontSize = `${currentTextSize}%`;
  updateTextSizeLabel();
}

function setTextSize(size) {
  currentTextSize = size;
  document.documentElement.style.fontSize = `${size}%`;
  localStorage.setItem("scopeyTextSize", String(size));
  updateTextSizeLabel();
}

function updateTextSizeLabel() {
  if (!textSizeLabel) return;
  const label = currentTextSize === 100 ? "Normal" : `${currentTextSize}%`;
  textSizeLabel.textContent = `Current size: ${label}`;
}

function resetTextSize() {
  setTextSize(100);
}

function increaseTextSize() {
  const nextIndex = Math.min(textSizeSteps.indexOf(currentTextSize) + 1, textSizeSteps.length - 1);
  setTextSize(textSizeSteps[nextIndex]);
}

function decreaseTextSize() {
  const nextIndex = Math.max(textSizeSteps.indexOf(currentTextSize) - 1, 0);
  setTextSize(textSizeSteps[nextIndex]);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rotateHeroText(element, options, interval) {
  if (!element) return;
  let index = 0;

  while (true) {
    await wait(interval);
    element.classList.add("fade-out");
    await wait(220);
    index = (index + 1) % options.length;
    element.textContent = options[index];
    element.classList.remove("fade-out");
  }
}

function rotateHeroPhrases() {
  if (!heroLeft || !heroRight) return;

  const leftOptions = [
    "Less confusion.",
    "Fewer mix-ups.",
    "Clear client scope.",
    "Less chaos in approvals.",
  ];
  const rightOptions = [
    "Better commission results.",
    "Sharper creative delivery.",
    "More polished client work.",
    "Faster project handoffs.",
  ];

  rotateHeroText(heroLeft, leftOptions, 3000);
  rotateHeroText(heroRight, rightOptions, 3900);
}


function setTheme(theme) {
  document.body.classList.remove("theme-light", "theme-dark", "theme-high-contrast");
  if (theme && theme !== "light") {
    document.body.classList.add(`theme-${theme}`);
  }
  localStorage.setItem("scopeyTheme", theme);
  updateThemeButtons();
}

function updateThemeButtons() {
  const activeTheme = localStorage.getItem("scopeyTheme") || "light";
  const buttons = [
    { button: themeLightButton, value: "light" },
    { button: themeDarkButton, value: "dark" },
    { button: themeHighContrastButton, value: "high-contrast" },
  ];

  buttons.forEach(({ button, value }) => {
    if (!button) return;
    const isActive = value === activeTheme;
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("active", isActive);
  });
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("scopeyTheme") || "light";
  if (savedTheme === "light") {
    document.body.classList.remove("theme-dark", "theme-high-contrast");
  } else {
    document.body.classList.add(`theme-${savedTheme}`);
  }
  updateThemeButtons();
}

function showBanner(message, variant = "info") {
  banner.className = `banner ${variant}`;
  banner.style.display = "block";
  banner.textContent = message;
}

function hideBanner() {
  banner.style.display = "none";
  banner.className = "banner";
  banner.textContent = "";
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function showAuthCallbackMessage(message) {
  if (!authCallbackPanel || !authCallbackMessage) return;
  authCallbackMessage.textContent = message;
  authCallbackPanel.classList.remove("hidden");
}

function hideAuthCallbackMessage() {
  if (!authCallbackPanel) return;
  authCallbackPanel.classList.add("hidden");
}

function isAuthCallbackPage() {
  return window.location.pathname === "/auth/callback";
}

function updateAuthState(isAuthenticated) {
  loginButton.hidden = isAuthenticated;
  logoutButton.hidden = !isAuthenticated;
  trialButton.disabled = !isAuthenticated;
  if (dashboardSection) {
    dashboardSection.hidden = !isAuthenticated;
  }

  if (!isAuthenticated) {
    setStatus("Sign in to manage commissions and plans.");
    if (subscriptionStatusText) {
      subscriptionStatusText.textContent = "Sign in to view billing details.";
    }
    if (subscriptionNextBillText) {
      subscriptionNextBillText.textContent = "";
    }
    if (subscriptionExpirationText) {
      subscriptionExpirationText.textContent = "";
    }
    if (analyticsCopy) {
      analyticsCopy.textContent = "Upgrade to Pro+ for enhanced reports and export-ready data.";
    }
    if (remindersCopy) {
      remindersCopy.textContent = "Add simple follow-ups and stay on top of each delivery.";
    }
    if (exportButton) {
      exportButton.hidden = true;
    }
  }
}

function formatBillingDate(timestamp) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadSubscriptionStatus(email) {
  if (!subscriptionStatusText) return;
  subscriptionStatusText.textContent = "Loading subscription details...";
  subscriptionNextBillText.textContent = "";

  try {
    const response = await fetch(`${API_BASE_URL}/subscription-status?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      throw new Error("Failed to fetch subscription status.");
    }

    const data = await response.json();
    if (data.status === "free") {
      subscriptionStatusText.textContent = "Free plan active";
      subscriptionNextBillText.textContent = "Upgrade for billing and next invoice details.";
      if (subscriptionExpirationText) {
        subscriptionExpirationText.textContent = "";
      }
      updatePricingCardState("free");
      return;
    }

    const planLabel = data.plan === "pro_plus" ? "Pro+" : "Pro";
    const nextBill = formatBillingDate(data.current_period_end);
    const trialEnd = formatBillingDate(data.trial_end);
    const expirationText = data.status === "trialing"
      ? `Trial ends: ${trialEnd}`
      : data.cancel_at_period_end
        ? `Subscription expires: ${nextBill}`
        : `Next billing date: ${nextBill}`;

    subscriptionStatusText.textContent = `${planLabel} subscription active (${data.status})`;
    subscriptionNextBillText.textContent = `Billing: ${nextBill}`;
    if (subscriptionExpirationText) {
      subscriptionExpirationText.textContent = expirationText;
    }
    updatePricingCardState(data.plan || "free");
  } catch (error) {
    subscriptionStatusText.textContent = "Unable to load subscription details.";
    subscriptionNextBillText.textContent = "Please try again later.";
    if (subscriptionExpirationText) {
      subscriptionExpirationText.textContent = "";
    }
    console.warn(error);
  }
}

async function getCurrentUser() {
  const { data, error } = await db.auth.getUser();
  if (error) {
    console.warn("Unable to read auth state", error.message);
    return null;
  }
  return data.user;
}

// Inline auth modal handlers (replaces prompt-based login)
const authModal = document.getElementById("auth-modal");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authClose = document.getElementById("auth-close");
const authCancel = document.getElementById("auth-cancel");
const authSubmitButton = document.getElementById("auth-submit");
const authModeText = document.getElementById("auth-mode-text");
const passwordResetButton = document.getElementById("password-reset-button");
let isResetMode = false;
let authRequestInProgress = false;
let authCooldownSeconds = 0;
let authCooldownTimer = null;

function updateAuthSubmitState() {
  if (!authSubmitButton) return;
  authSubmitButton.disabled = authRequestInProgress || authCooldownSeconds > 0;

  if (authRequestInProgress) {
    authSubmitButton.textContent = "Sending…";
    return;
  }

  if (authCooldownSeconds > 0) {
    authSubmitButton.textContent = `Wait ${authCooldownSeconds}s`;
    return;
  }

  authSubmitButton.textContent = isResetMode ? "Send reset link" : "Send magic link";
}

function startAuthCooldown(seconds) {
  clearInterval(authCooldownTimer);
  authCooldownSeconds = seconds;
  updateAuthSubmitState();
  authCooldownTimer = setInterval(() => {
    authCooldownSeconds -= 1;
    if (authCooldownSeconds <= 0) {
      clearInterval(authCooldownTimer);
      authCooldownTimer = null;
      authCooldownSeconds = 0;
    }
    updateAuthSubmitState();
  }, 1000);
}

function stopAuthCooldown() {
  clearInterval(authCooldownTimer);
  authCooldownTimer = null;
  authCooldownSeconds = 0;
  updateAuthSubmitState();
}

function setAuthMode(resetMode = false) {
  isResetMode = resetMode;
  if (authModeText) {
    authModeText.textContent = resetMode
      ? "Enter your email to receive a password reset link."
      : "Enter your email to receive a sign-in link. We'll create your account automatically if needed.";
  }
  if (authSubmitButton) {
    authSubmitButton.textContent = resetMode ? "Send reset link" : "Send magic link";
  }
  if (passwordResetButton) {
    passwordResetButton.textContent = resetMode ? "Back to sign in" : "Reset password";
  }
  updateAuthSubmitState();
}

function showAuthModal() {
  if (!authModal) return;
  setAuthMode(false);
  updateAuthSubmitState();
  authModal.style.display = "block";
  authModal.setAttribute("aria-hidden", "false");
  setTimeout(() => authEmail.focus(), 40);
}

function hideAuthModal() {
  if (!authModal) return;
  authModal.style.display = "none";
  authModal.setAttribute("aria-hidden", "true");
}

authClose?.addEventListener("click", hideAuthModal);
authCancel?.addEventListener("click", hideAuthModal);
loginButton?.addEventListener("click", showAuthModal);
passwordResetButton?.addEventListener("click", () => {
  setAuthMode(!isResetMode);
  authEmail.focus();
});

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = authEmail.value?.trim();
  if (!email) {
    showBanner("Please enter a valid email.", "warning");
    return;
  }

  const redirectTo = AUTH_REDIRECT_URL;

  if (isResetMode) {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      showBanner(`Unable to send reset link: ${error.message}`, "error");
      return;
    }

    showBanner("Password reset link sent. Check your inbox.", "success");
    setAuthMode(false);
    return;
  }

  const { error } = await db.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
  if (error) {
    authRequestInProgress = false;
    updateAuthSubmitState();

    const lowerMessage = error.message?.toLowerCase() || "";
    if (lowerMessage.includes("rate limit") || lowerMessage.includes("rate_limit") || lowerMessage.includes("too many")) {
      showBanner("Please wait a moment before requesting another link. This helps prevent duplicate emails.", "warning");
      startAuthCooldown(60);
      return;
    }

    showBanner(`Unable to send login link: ${error.message}`, "error");
    return;
  }

  authRequestInProgress = false;
  updateAuthSubmitState();
  showBanner("Magic link sent. Check your inbox to finish signing in.", "success");
  startAuthCooldown(60);
  hideAuthModal();
});

// Accessibility modal handlers
const accessibilityModal = document.getElementById("accessibility-modal");
const accessibilityButton = document.getElementById("accessibility-button");
const accessibilityClose = document.getElementById("accessibility-close");
const accessibilityCancel = document.getElementById("accessibility-cancel");
const themeLightButton = document.getElementById("theme-light");
const themeDarkButton = document.getElementById("theme-dark");
const themeHighContrastButton = document.getElementById("theme-high-contrast");

function showAccessibilityModal() {
  if (!accessibilityModal) return;
  accessibilityModal.style.display = "flex";
  accessibilityModal.setAttribute("aria-hidden", "false");
  setTimeout(() => themeLightButton?.focus(), 40);
}

function hideAccessibilityModal() {
  if (!accessibilityModal) return;
  accessibilityModal.style.display = "none";
  accessibilityModal.setAttribute("aria-hidden", "true");
}

accessibilityButton?.addEventListener("click", showAccessibilityModal);
accessibilityClose?.addEventListener("click", hideAccessibilityModal);
accessibilityCancel?.addEventListener("click", hideAccessibilityModal);
accessibilityModal?.addEventListener("click", (event) => {
  if (event.target === accessibilityModal) {
    hideAccessibilityModal();
  }
});

authModal?.addEventListener("click", (event) => {
  if (event.target === authModal) {
    hideAuthModal();
  }
});

themeLightButton?.addEventListener("click", () => setTheme("light"));
themeDarkButton?.addEventListener("click", () => setTheme("dark"));
themeHighContrastButton?.addEventListener("click", () => setTheme("high-contrast"));
resetTextButton?.addEventListener("click", resetTextSize);
exportButton?.addEventListener("click", async () => {
  const user = await getCurrentUser();
  if (!user) {
    showBanner("Please log in to export commissions.", "warning");
    return;
  }
  const { data: commissions, error } = await db.from("commissions").select("*").eq("user_id", user.id);
  if (error) {
    showBanner("Unable to load commissions for export.", "error");
    return;
  }
  exportCommissionsToCsv(commissions || []);
});

function isAnyModalOpen() {
  return (authModal?.style.display === "block") || (accessibilityModal?.style.display === "flex");
}

function trapFocus(modal, event) {
  const selectors = "button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
  const focusable = Array.from(modal.querySelectorAll(selectors)).filter((node) => node.offsetParent !== null);
  if (!focusable.length) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

function updatePricingCardState(activePlan = "free") {
  pricingCards.forEach((card) => {
    const cardPlan = card.dataset.plan;
    const button = card.querySelector("button");
    if (!button) return;

    if (cardPlan === activePlan) {
      card.classList.add("pricing-card-active");
      button.disabled = true;
      button.textContent = cardPlan === "free" ? "Included" : "Current plan";
      button.classList.remove("btn-primary");
      button.classList.add("btn-secondary");
    } else {
      card.classList.remove("pricing-card-active");
      if (cardPlan === "free") {
        button.disabled = true;
        button.textContent = "Included";
        button.classList.remove("btn-primary");
        button.classList.add("btn-secondary");
      } else {
        button.disabled = false;
        button.textContent = "Upgrade";
        button.classList.remove("btn-secondary");
        button.classList.add("btn-primary");
      }
    }
  });
}

// close modal on Escape and trap focus inside a modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideAuthModal();
    hideAccessibilityModal();
  }

  if (e.key === "Tab" && isAnyModalOpen()) {
    const activeModal = authModal?.style.display === "block" ? authModal : accessibilityModal;
    if (activeModal) {
      trapFocus(activeModal, e);
    }
  }
});

async function logout() {
  await db.auth.signOut();
  hideBanner();
  await refreshView();
}

async function initProfile(user) {
  if (!user?.id || !user?.email) {
    return;
  }

  const { error } = await db.from("profiles").upsert({ id: user.id, email: user.email, plan: "free" });
  if (error) {
    showBanner("Unable to initialize your profile. Please try again.", "error");
  }
}

async function renderCommissionList(commissions) {
  if (!commissions || commissions.length === 0) {
    list.innerHTML = `<div class="empty-state">No commissions yet. Add your first one above to get started.</div>`;
    return;
  }

  list.innerHTML = "";
  commissions.forEach((commission) => {
    const status = commission.revision_limit > 0 && commission.revisions_used >= commission.revision_limit
      ? "Needs review"
      : "Active";
    const revisionsText = commission.revision_limit > 0
      ? `${commission.revisions_used}/${commission.revision_limit} revisions`
      : `${commission.revisions_used} revisions`;

    const item = document.createElement("div");
    item.className = "card list-item";
    item.innerHTML = `
      <div class="item-main">
        <div class="item-title">${commission.title}</div>
        <div class="item-client">${commission.client_name}</div>
      </div>
      <div class="item-meta">${revisionsText} • ${status}</div>
    `;
    list.appendChild(item);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = await getCurrentUser();
  if (!user) {
    showBanner("Please log in before adding a commission.", "warning");
    return;
  }

  const titleValue = title.value.trim();
  const clientValue = client.value.trim();
  const revisionLimit = Number(limit.value) || 0;

  if (!titleValue || !clientValue) {
    showBanner("Please provide both a title and a client name.", "warning");
    return;
  }

  const { data: profile, error: profileError } = await db.from("profiles").select("plan").eq("id", user.id).single();
  if (profileError) {
    showBanner("Unable to load your plan details. Try again later.", "error");
    return;
  }

  const { data: existingList, error: listError } = await db.from("commissions").select("id").eq("user_id", user.id);
  if (listError) {
    showBanner("Unable to validate your commission count. Please try again.", "error");
    return;
  }

  if (profile?.plan === "free" && existingList?.length >= 3) {
    showBanner("Free plan limit reached. Upgrade for unlimited commissions.", "warning");
    return;
  }

  const { error: insertError } = await db.from("commissions").insert([
    {
      user_id: user.id,
      title: titleValue,
      client_name: clientValue,
      revision_limit: revisionLimit,
      revisions_used: 0,
    },
  ]);

  if (insertError) {
    showBanner("Unable to save this commission. Please try again.", "error");
    return;
  }

  title.value = "";
  client.value = "";
  limit.value = "";

  showBanner("Commission added successfully.", "success");
  await refreshView();
});

increaseTextButton.addEventListener("click", increaseTextSize);
decreaseTextButton.addEventListener("click", decreaseTextSize);

async function refreshView() {
  hideBanner();

  const user = await getCurrentUser();
  updateAuthState(Boolean(user));

  if (!user) {
    plan.innerText = "free";
    total.innerText = "0";
    updatePricingCardState("free");
    renderCommissionList([]);
    updateCommissionInsights([], "free");
    return;
  }

  loadSubscriptionStatus(user.email);

  const { data: profile, error: profileError } = await db.from("profiles").select("plan").eq("id", user.id).single();
  if (profileError) {
    showBanner("Unable to load profile details. Please refresh.", "error");
    return;
  }

  const { data: commissions, error: commissionsError } = await db.from("commissions").select("*").eq("user_id", user.id);
  if (commissionsError) {
    showBanner("Unable to load your commissions. Please refresh.", "error");
    return;
  }

  const activePlan = profile?.plan || "free";
  plan.innerText = activePlan;
  total.innerText = commissions?.length || 0;
  setStatus(`Signed in as ${user.email} • ${activePlan.toUpperCase()} plan`);
  updatePricingCardState(activePlan);

  if (activePlan === "free") {
    showBanner("Free plan active: max 3 commissions. Upgrade anytime for unlimited tracking.", "warning");
  } else {
    showBanner(`You are on the ${activePlan} plan.`, "success");
  }

  renderCommissionList(commissions);
  updateCommissionInsights(commissions, activePlan);
}

function exportCommissionsToCsv(commissions) {
  if (!commissions || !commissions.length) {
    showBanner("No commissions available to export.", "warning");
    return;
  }

  const csvRows = [
    ["Title","Client","Revisions Used","Revision Limit","Status"],
    ...commissions.map((commission) => {
      const status = commission.revision_limit > 0 && commission.revisions_used >= commission.revision_limit
        ? "Needs review"
        : "Active";
      return [
        commission.title,
        commission.client_name,
        commission.revisions_used,
        commission.revision_limit,
        status,
      ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    }),
  ].map((row) => row.join(","));

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "scopey-commissions.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function updateCommissionInsights(commissions, plan) {
  const totalCommissions = commissions.length;
  const revisionsUsed = commissions.reduce((sum, commission) => sum + (commission.revisions_used || 0), 0);
  const revisionLimitSum = commissions.reduce((sum, commission) => sum + (commission.revision_limit || 0), 0);
  const revisionsLeft = revisionLimitSum > 0 ? Math.max(revisionLimitSum - revisionsUsed, 0) : "∞";

  if (insightCount) {
    insightCount.textContent = totalCommissions;
  }
  if (insightRevisions) {
    insightRevisions.textContent = revisionsUsed;
  }
  if (insightRemaining) {
    insightRemaining.textContent = revisionLimitSum > 0 ? revisionsLeft : "∞";
  }

  if (!analyticsCopy || !remindersCopy || !exportButton) {
    return;
  }

  if (plan === "free") {
    analyticsCopy.textContent = "Build your first commissions and upgrade to Pro+ for reports and exports.";
    remindersCopy.textContent = "Upgrade to Pro for automated client reminders and milestone summaries.";
    exportButton.hidden = true;
  } else if (plan === "pro") {
    analyticsCopy.textContent = "Pro gives you unlimited work tracking, revision history, and client reminders.";
    remindersCopy.textContent = "Use the Pro workflow to keep client deliveries on schedule.";
    exportButton.hidden = true;
  } else {
    analyticsCopy.textContent = "Pro+ unlocks advanced insights and export-ready commission reports.";
    remindersCopy.textContent = "Pro+ gives you premium support, onboarding, and quick report exports.";
    exportButton.hidden = false;
  }
}

async function upgrade(planName) {
  const user = await getCurrentUser();
  if (!user || !user.email) {
    showBanner("Please log in before upgrading your plan.", "warning");
    return;
  }

  const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, plan: planName }),
  });

  if (!response.ok) {
    showBanner("Unable to create checkout session. Please try again.", "error");
    return;
  }

  const data = await response.json();
  if (!data?.id) {
    showBanner("Checkout session could not be created. Please contact support.", "error");
    return;
  }

  stripe.redirectToCheckout({ sessionId: data.id });
}

async function handleAuthFromUrl() {
  if (isAuthCallbackPage()) {
    showAuthCallbackMessage("Processing sign-in...");
  }

  if (!window.location.hash || !window.location.hash.includes("access_token")) {
    return;
  }

  const { data, error } = await db.auth.getSessionFromUrl({ storeSession: true });
  if (error) {
    console.warn("Failed to parse auth session from URL:", error.message);
    if (isAuthCallbackPage()) {
      showAuthCallbackMessage("Authentication failed. Please try again.");
    }
    return;
  }

  if (data?.session) {
    showBanner("You have been signed in successfully.", "success");
    await refreshView();
    if (isAuthCallbackPage()) {
      showAuthCallbackMessage("Signed in successfully. Redirecting to your dashboard...");
    }
  }

  const cleanUrl = window.location.origin;
  window.history.replaceState({}, document.title, cleanUrl);
  hideAuthCallbackMessage();
}

async function initializeApp() {
  loadAccessibilityPreferences();
  applySavedTheme();
  rotateHeroPhrases();
  await handleAuthFromUrl();
  await refreshView();
}

initializeApp();

db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    initProfile(session.user).then(refreshView);
  } else {
    refreshView();
  }
});
