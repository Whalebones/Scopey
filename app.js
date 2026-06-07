const SUPABASE_URL = "https://nxqwrlbwnaqntuvcspln.supabase.co";
const SUPABASE_KEY = "sb_publishable_TVcQqAhasEthm_LoHFjmYw_OUbo3i5v";
const STRIPE_KEY = "pk_test_51Tfdr9HbHMKHnVYfDDun9mhREMp6UCVAKYu2ZD2lNuBnPbjYTvmIEQQTYdr2saGSyTUSw8n7JFGevNEOSsn59UNW00NuHvchbc";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const stripe = Stripe(STRIPE_KEY);
const API_BASE_URL = window.location.origin.includes("localhost") || window.location.origin === "null" ? "http://localhost:3000" : window.location.origin;

const form = document.getElementById("form");
const title = document.getElementById("title");
const client = document.getElementById("client");
const limit = document.getElementById("limit");
const plan = document.getElementById("plan");
const total = document.getElementById("total");
const banner = document.getElementById("banner");
const list = document.getElementById("list");
const increaseTextButton = document.getElementById("increase-text");
const decreaseTextButton = document.getElementById("decrease-text");
const contrastToggleButton = document.getElementById("toggle-contrast");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const trialButton = document.getElementById("trial-button");
const statusMessage = document.getElementById("status-message");

const textSizeSteps = [90, 100, 110, 120];
let currentTextSize = 100;

function loadAccessibilityPreferences() {
  const savedSize = Number(localStorage.getItem("scopeyTextSize"));
  const savedContrast = localStorage.getItem("scopeyHighContrast") === "true";
  if (textSizeSteps.includes(savedSize)) {
    currentTextSize = savedSize;
  }
  document.documentElement.style.fontSize = `${currentTextSize}%`;

  if (savedContrast) {
    document.body.classList.add("high-contrast");
    contrastToggleButton.setAttribute("aria-pressed", "true");
  }
}

function setTextSize(size) {
  currentTextSize = size;
  document.documentElement.style.fontSize = `${size}%`;
  localStorage.setItem("scopeyTextSize", String(size));
}

function increaseTextSize() {
  const nextIndex = Math.min(textSizeSteps.indexOf(currentTextSize) + 1, textSizeSteps.length - 1);
  setTextSize(textSizeSteps[nextIndex]);
}

function decreaseTextSize() {
  const nextIndex = Math.max(textSizeSteps.indexOf(currentTextSize) - 1, 0);
  setTextSize(textSizeSteps[nextIndex]);
}

function toggleHighContrast() {
  const enabled = document.body.classList.toggle("high-contrast");
  contrastToggleButton.setAttribute("aria-pressed", String(enabled));
  localStorage.setItem("scopeyHighContrast", String(enabled));
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

function updateAuthState(isAuthenticated) {
  loginButton.hidden = isAuthenticated;
  logoutButton.hidden = !isAuthenticated;
  trialButton.disabled = !isAuthenticated;
  if (!isAuthenticated) {
    setStatus("Sign in to manage commissions and plans.");
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

function showAuthModal() {
  if (!authModal) return;
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

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = authEmail.value?.trim();
  if (!email) {
    showBanner("Please enter a valid email.", "warning");
    return;
  }

  const { error } = await db.auth.signInWithOtp({ email });
  if (error) {
    showBanner("Unable to send login link. Check your email and try again.", "error");
    return;
  }

  showBanner("Magic link sent. Check your inbox to finish signing in.", "success");
  hideAuthModal();
});

// close modal on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideAuthModal();
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
    const item = document.createElement("div");
    item.className = "card list-item";
    item.innerHTML = `
      <div class="item-main">
        <div class="item-title">${commission.title}</div>
        <div class="item-client">${commission.client_name}</div>
      </div>
      <div class="item-meta">${commission.revisions_used}/${commission.revision_limit} revisions</div>
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
contrastToggleButton.addEventListener("click", toggleHighContrast);

async function refreshView() {
  hideBanner();

  const user = await getCurrentUser();
  updateAuthState(Boolean(user));

  if (!user) {
    plan.innerText = "free";
    total.innerText = "0";
    renderCommissionList([]);
    return;
  }

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

  plan.innerText = profile?.plan || "free";
  total.innerText = commissions?.length || 0;
  setStatus(`Signed in as ${user.email}`);

  if (profile?.plan === "free") {
    showBanner("Free plan active: max 3 commissions. Upgrade anytime for unlimited tracking.", "warning");
  } else {
    showBanner(`You are on the ${profile?.plan} plan.`, "success");
  }

  renderCommissionList(commissions);
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

loadAccessibilityPreferences();

refreshView();

db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    initProfile(session.user).then(refreshView);
  } else {
    refreshView();
  }
});
