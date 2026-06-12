/* global supabase */

const SUPABASE_URL = "https://nxqwrlbwnaqntuvcspln.supabase.co";
const SUPABASE_KEY = "sb_publishable_TVcQqAhasEthm_LoHFjmYw_OUbo3i5v";
const API_URL =
  window.SCOPEY_API_URL ||
  (window.location.port === "5500" ? "http://localhost:3000" : window.location.origin);

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
let currentSuggestions = [];
let currentUpdates = [];
let currentProjectPayments = [];
let currentAgreementTemplates = [];
let currentActivity = [];
let currentGallery = [];
let currentAgreementVersions = [];
let currentDeliverables = [];
let currentProfile = null;
let currentBilling = null;
let currentProjectTab = "overview";

let isClientView = false;
let isBusy = false;
let authMode = "signin";
let pendingDeleteProject = null;

const params = new URLSearchParams(window.location.search);
const shareId = params.get("share");
const clientSection = params.get("section") || "all";
const clientToken = params.get("token") || "";
let clientAccessCodeValue =
  clientToken && sessionStorage.getItem(`scopey-access-${clientToken}`)
    ? sessionStorage.getItem(`scopey-access-${clientToken}`)
    : "";

const ACCESSIBILITY_KEY = "scopey-accessibility";
const SUPABASE_AUTH_KEY_PARTS = ["supabase", "auth", "token"];
const SUPPORTED_CURRENCIES = [
  "GBP",
  "USD",
  "EUR",
  "AUD",
  "CAD",
  "NZD",
  "SGD",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "PLN"
];

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
const landingFreeBtn = document.getElementById("landing-free-btn");
const landingProBtn = document.getElementById("landing-pro-btn");
const landingBusinessBtn = document.getElementById("landing-business-btn");

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

const deleteProjectModal = document.getElementById("delete-project-modal");
const deleteProjectFinalModal = document.getElementById("delete-project-final-modal");
const closeDeleteProjectBtn = document.getElementById("close-delete-project-btn");
const closeDeleteProjectFinalBtn = document.getElementById("close-delete-project-final-btn");
const cancelDeleteProjectBtn = document.getElementById("cancel-delete-project-btn");
const continueDeleteProjectBtn = document.getElementById("continue-delete-project-btn");
const backDeleteProjectBtn = document.getElementById("back-delete-project-btn");
const confirmDeleteProjectBtn = document.getElementById("confirm-delete-project-btn");
const deleteProjectName = document.getElementById("delete-project-name");
const deleteProjectFinalName = document.getElementById("delete-project-final-name");

const projectListEl = document.getElementById("project-list");
const toggleProjectCreateBtn = document.getElementById("toggle-project-create-btn");
const projectCreateCard = document.getElementById("project-create-card");

const newProjectTitle = document.getElementById("new-project-title");
const newProjectClient = document.getElementById("new-project-client");
const newProjectClientEmail = document.getElementById("new-project-client-email");
const newProjectCurrency = document.getElementById("new-project-currency");
const createProjectBtn = document.getElementById("create-project-btn");
const profileBrandName = document.getElementById("profile-brand-name");
const profileBio = document.getElementById("profile-bio");
const profileContactEmail = document.getElementById("profile-contact-email");
const profileDefaultCurrency = document.getElementById("profile-default-currency");
const profileImage = document.getElementById("profile-image");
const businessProfileForm = document.getElementById("business-profile-form");
const customiseProfileBtn = document.getElementById("customise-profile-btn");
const saveProfileBtn = document.getElementById("save-profile-btn");
const cancelProfileBtn = document.getElementById("cancel-profile-btn");
const profilePreviewImage = document.getElementById("profile-preview-image");
const profilePreviewInitial = document.getElementById("profile-preview-initial");
const profilePreviewName = document.getElementById("profile-preview-name");
const profilePreviewBio = document.getElementById("profile-preview-bio");
const billingPlanName = document.getElementById("billing-plan-name");
const billingPlanPill = document.getElementById("billing-plan-pill");
const billingPlanCopy = document.getElementById("billing-plan-copy");
const billingUsage = document.getElementById("billing-usage");
const billingLimitNote = document.getElementById("billing-limit-note");
const upgradeProBtn = document.getElementById("upgrade-pro-btn");
const upgradeBusinessBtn = document.getElementById("upgrade-business-btn");

const ownerEmptyState = document.getElementById("owner-empty-state");
const projectWorkspace = document.getElementById("project-workspace");

const copyLinkBtn = document.getElementById("copy-link-btn");
const copyLinkBtnSecondary = document.getElementById("copy-link-btn-secondary");
const emailClientBtn = document.getElementById("email-client-btn");
const emailClientBtnSecondary = document.getElementById("email-client-btn-secondary");

const projectTitleEl = document.getElementById("project-title");
const projectSubtitleEl = document.getElementById("project-subtitle");
const ownerStatusChip = document.getElementById("owner-status-chip");

const metricScopeCount = document.getElementById("metric-scope-count");
const metricProjectStatus = document.getElementById("metric-project-status");
const metricPendingCount = document.getElementById("metric-pending-count");
const metricPendingTotal = document.getElementById("metric-pending-total");
const metricApprovedTotal = document.getElementById("metric-approved-total");
const metricOutstandingTotal = document.getElementById("metric-outstanding-total");
const projectPhaseName = document.getElementById("project-phase-name");
const projectClientBrief = document.getElementById("project-client-brief");
const projectHealthScore = document.getElementById("project-health-score");
const projectHealthBar = document.getElementById("project-health-bar");
const projectRiskLevel = document.getElementById("project-risk-level");
const projectMoneyBrief = document.getElementById("project-money-brief");
const projectScopeBrief = document.getElementById("project-scope-brief");
const projectDeliveryBrief = document.getElementById("project-delivery-brief");
const projectReadinessList = document.getElementById("project-readiness-list");

const overviewSummaryCopy = document.getElementById("overview-summary-copy");
const overviewNextAction = document.getElementById("overview-next-action");
const overviewAttentionList = document.getElementById("overview-attention-list");
const editProjectTitle = document.getElementById("edit-project-title");
const editProjectClient = document.getElementById("edit-project-client");
const editProjectClientEmail = document.getElementById("edit-project-client-email");
const saveProjectDetailsBtn = document.getElementById("save-project-details-btn");
const archiveProjectBtn = document.getElementById("archive-project-btn");
const deleteProjectBtn = document.getElementById("delete-project-btn");

const agreementTemplateSelect = document.getElementById("agreement-template-select");
const agreementTemplateName = document.getElementById("agreement-template-name");
const applyTemplateBtn = document.getElementById("apply-template-btn");
const saveTemplateBtn = document.getElementById("save-template-btn");
const exportAgreementBtn = document.getElementById("export-agreement-btn");
const projectCurrency = document.getElementById("project-currency");
const agreementSummary = document.getElementById("agreement-summary");
const agreementScope = document.getElementById("agreement-scope");
const agreementExclusions = document.getElementById("agreement-exclusions");
const agreementTimeline = document.getElementById("agreement-timeline");
const agreementPaymentTerms = document.getElementById("agreement-payment-terms");
const agreementRevisionTerms = document.getElementById("agreement-revision-terms");
const agreementCancellationTerms = document.getElementById("agreement-cancellation-terms");
const saveAgreementBtn = document.getElementById("save-agreement-btn");
const sendAgreementBtn = document.getElementById("send-agreement-btn");
const agreementStatusCopy = document.getElementById("agreement-status-copy");
const agreementAcceptedCopy = document.getElementById("agreement-accepted-copy");
const agreementVersionList = document.getElementById("agreement-version-list");

const scopeTitleInput = document.getElementById("scope-title");
const scopePriceInput = document.getElementById("scope-price");
const addScopeBtn = document.getElementById("add-scope-btn");
const scopeList = document.getElementById("scope-list");

const changeInput = document.getElementById("change-input");
const changePriceInput = document.getElementById("change-price");
const addChangeBtn = document.getElementById("add-change-btn");
const paymentLabel = document.getElementById("payment-label");
const paymentAmount = document.getElementById("payment-amount");
const paymentType = document.getElementById("payment-type");
const paymentStatus = document.getElementById("payment-status");
const paymentDueDate = document.getElementById("payment-due-date");
const addPaymentBtn = document.getElementById("add-payment-btn");
const projectPaymentList = document.getElementById("project-payment-list");
const projectGalleryList = document.getElementById("project-gallery-list");
const deliverableTitle = document.getElementById("deliverable-title");
const deliverableNote = document.getElementById("deliverable-note");
const deliverableImage = document.getElementById("deliverable-image");
const addDeliverableBtn = document.getElementById("add-deliverable-btn");
const deliverableList = document.getElementById("deliverable-list");

const pendingList = document.getElementById("pending-list");
const approvedList = document.getElementById("approved-list");
const ownerSuggestionList = document.getElementById("owner-suggestion-list");
const suggestionResponseNote = document.getElementById("suggestion-response-note");
const suggestionResponsePrice = document.getElementById("suggestion-response-price");
const ownerUpdateMessage = document.getElementById("owner-update-message");
const ownerUpdateImage = document.getElementById("owner-update-image");
const ownerAddUpdateBtn = document.getElementById("owner-add-update-btn");
const ownerUpdateList = document.getElementById("owner-update-list");

const ownerClientScopeList = document.getElementById("owner-client-scope-list");
const ownerClientPendingList = document.getElementById("owner-client-pending-list");
const ownerClientApprovedList = document.getElementById("owner-client-approved-list");
const ownerClientSuggestionList = document.getElementById("owner-client-suggestion-list");
const ownerClientUpdateList = document.getElementById("owner-client-update-list");
const ownerClientAgreementPreview = document.getElementById("owner-client-agreement-preview");
const ownerClientPaymentList = document.getElementById("owner-client-payment-list");
const startWorkBtn = document.getElementById("start-work-btn");
const requestFinalBtn = document.getElementById("request-final-btn");
const completeProjectBtn = document.getElementById("complete-project-btn");
const cancelProjectBtn = document.getElementById("cancel-project-btn");
const completionStatusCopy = document.getElementById("completion-status-copy");
const projectTimelineList = document.getElementById("project-timeline-list");

const clientProfileCard = document.getElementById("client-profile-card");
const clientProfileImage = document.getElementById("client-profile-image");
const clientProfileInitial = document.getElementById("client-profile-initial");
const clientProfileName = document.getElementById("client-profile-name");
const clientProfileBio = document.getElementById("client-profile-bio");
const clientProjectTitle = document.getElementById("client-project-title");
const clientProjectSubtitle = document.getElementById("client-project-subtitle");
const clientScopeList = document.getElementById("client-scope-list");
const clientPendingList = document.getElementById("client-pending-list");
const clientApprovedList = document.getElementById("client-approved-list");
const clientSuggestionTitle = document.getElementById("client-suggestion-title");
const clientSuggestionPrice = document.getElementById("client-suggestion-price");
const clientSuggestionDetails = document.getElementById("client-suggestion-details");
const clientSuggestionImage = document.getElementById("client-suggestion-image");
const clientAddSuggestionBtn = document.getElementById("client-add-suggestion-btn");
const clientSuggestionList = document.getElementById("client-suggestion-list");
const clientUpdateMessage = document.getElementById("client-update-message");
const clientUpdateImage = document.getElementById("client-update-image");
const clientAddUpdateBtn = document.getElementById("client-add-update-btn");
const clientUpdateList = document.getElementById("client-update-list");
const clientGalleryList = document.getElementById("client-gallery-list");
const clientVerificationCard = document.getElementById("client-verification-card");
const clientAccessCode = document.getElementById("client-access-code");
const clientVerifyBtn = document.getElementById("client-verify-btn");
const clientAgreementPreview = document.getElementById("client-agreement-preview");
const clientAcceptancePanel = document.getElementById("client-acceptance-panel");
const clientAcceptName = document.getElementById("client-accept-name");
const clientAcceptEmail = document.getElementById("client-accept-email");
const clientAcceptAgreementBtn = document.getElementById("client-accept-agreement-btn");
const clientAcceptanceStatus = document.getElementById("client-acceptance-status");
const clientPaymentList = document.getElementById("client-payment-list");
const clientCompletionCopy = document.getElementById("client-completion-copy");
const clientCompletionPanel = document.getElementById("client-completion-panel");
const clientCompleteName = document.getElementById("client-complete-name");
const clientCompleteEmail = document.getElementById("client-complete-email");
const clientApproveCompletionBtn = document.getElementById("client-approve-completion-btn");
const clientDeliverableList = document.getElementById("client-deliverable-list");

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
function getProjectCurrency(project = currentProject) {
  return SUPPORTED_CURRENCIES.includes(project?.currency) ? project.currency : "GBP";
}

function formatCurrency(value, currency = getProjectCurrency()) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
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

function getCurrentPlanKey() {
  return currentBilling?.plan?.key || currentBilling?.plan?.plan || "free";
}

function getCurrentPlanName() {
  return currentBilling?.plan?.name || "Free";
}

function getActiveProjectUsage() {
  return currentBilling?.usage?.activeProjects || {
    used: currentProjects.filter(
      (project) => !project.archived_at && !["complete", "cancelled"].includes(project.status)
    ).length,
    limit: 1
  };
}

function isActiveProjectLimitReached() {
  const usage = getActiveProjectUsage();
  return usage.limit !== null && usage.used >= usage.limit;
}

function showUpgradePrompt(message, plan = "pro") {
  const planName = plan === "business" ? "Business" : "Pro";
  showBanner(`${message} Upgrade to ${planName} when you're ready.`, "warning");
}

function isSupabaseAuthStorageKey(key) {
  const normalised = key.toLowerCase();
  return SUPABASE_AUTH_KEY_PARTS.every((part) => normalised.includes(part));
}

function hasStoredAuthSession() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && isSupabaseAuthStorageKey(key)) return true;
    }

    return false;
  } catch {
    return false;
  }
}

function clearStoredAuthSession() {
  try {
    const keysToRemove = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && isSupabaseAuthStorageKey(key)) keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage access failures; Supabase signOut still handles the normal path.
  }
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
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = text || button.dataset.originalText || button.textContent;
    button.disabled = false;
    delete button.dataset.originalText;
  }
}

function resetAuthLoadingState() {
  setButtonLoading(
    authSubmitBtn,
    false,
    authMode === "signin" ? "Continue" : "Create account"
  );
  setButtonLoading(authMagicLinkBtn, false, "Use magic link instead");
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

function buildStatusPill(text, status = "neutral") {
  const pill = document.createElement("span");
  pill.className = `status-chip status-${status}`;
  pill.textContent = text;
  return pill;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function suggestionSubtitle(suggestion) {
  const bits = [];
  if (suggestion.proposed_price !== null && suggestion.proposed_price !== undefined) {
    bits.push(formatCurrency(suggestion.proposed_price));
  }
  bits.push(`Status: ${suggestion.status || "suggested"}`);
  if (suggestion.created_at) bits.push(formatDateTime(suggestion.created_at));
  return bits.join(" | ");
}

function buildImagePreview(url, altText) {
  if (!url) return null;

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "image-preview";

  const image = document.createElement("img");
  image.src = url;
  image.alt = altText;
  image.loading = "lazy";

  link.appendChild(image);
  return link;
}

function buildCollaborationCard(title, subtitle, details, imageUrl, rightNode = null) {
  const card = buildListRow(title, subtitle, rightNode);
  const main = card.querySelector(".item-main");

  if (details) {
    const detailsEl = document.createElement("p");
    detailsEl.className = "item-details";
    detailsEl.textContent = details;
    main?.appendChild(detailsEl);
  }

  const preview = buildImagePreview(imageUrl, title);
  if (preview) main?.appendChild(preview);

  return card;
}

function getSuggestionStatusKind(status) {
  if (status === "accepted") return "success";
  if (status === "declined") return "danger";
  if (status === "revised") return "warning";
  return "neutral";
}

async function getAuthHeaders() {
  const { data, error } = await db.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json"
  };
}

function fileToDataUrl(input) {
  const file = input?.files?.[0];
  if (!file) return Promise.resolve(null);

  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Please choose an image file."));
  }

  if (file.size > 5 * 1024 * 1024) {
    return Promise.reject(new Error("Images must be smaller than 5MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        dataUrl: reader.result
      });
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function readJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }

  return data;
}

function getProfileName(profile = currentProfile) {
  return profile?.brand_name?.trim() || "Freelancer";
}

function getProfileInitial(profile = currentProfile) {
  return getProfileName(profile).charAt(0).toUpperCase();
}

function applyAvatar(imageEl, initialEl, profile = currentProfile) {
  if (!imageEl || !initialEl) return;

  const imageUrl = profile?.profile_image_url;
  if (imageUrl) {
    imageEl.src = imageUrl;
    imageEl.alt = `${getProfileName(profile)} profile image`;
    imageEl.classList.remove("hidden");
    initialEl.classList.add("hidden");
  } else {
    imageEl.removeAttribute("src");
    imageEl.classList.add("hidden");
    initialEl.textContent = getProfileInitial(profile);
    initialEl.classList.remove("hidden");
  }
}

function renderProfilePreview(profile = currentProfile) {
  const name = getProfileName(profile);
  applyAvatar(profilePreviewImage, profilePreviewInitial, profile);

  if (profilePreviewName) profilePreviewName.textContent = name;
  if (profilePreviewBio) {
    profilePreviewBio.textContent =
      profile?.bio || "Your brand details will appear on client review pages.";
  }

  if (profileBrandName && !profileBrandName.value) profileBrandName.value = name;
  if (profileBio && !profileBio.value && profile?.bio) profileBio.value = profile.bio;
}

function renderBilling() {
  const planName = getCurrentPlanName();
  const planKey = getCurrentPlanKey();
  const usage = getActiveProjectUsage();
  const limitLabel = usage.limit === null ? "Unlimited" : usage.limit;
  const atLimit = isActiveProjectLimitReached();

  if (billingPlanName) billingPlanName.textContent = planName;
  if (billingPlanPill) {
    billingPlanPill.textContent = planName;
    billingPlanPill.className = `status-chip status-${
      planKey === "free" ? "neutral" : "success"
    }`;
  }
  if (billingPlanCopy) {
    billingPlanCopy.textContent =
      currentBilling?.plan?.summary || "Free includes one active client project.";
  }
  if (billingUsage) {
    billingUsage.innerHTML = "";
    const label = document.createElement("span");
    label.textContent = "Active projects";
    const value = document.createElement("strong");
    value.textContent = `${usage.used} / ${limitLabel}`;
    billingUsage.appendChild(label);
    billingUsage.appendChild(value);
  }
  if (billingLimitNote) {
    billingLimitNote.textContent = atLimit
      ? "Free is full. Archive, complete or delete a project, or upgrade to Pro."
      : "Pro unlocks unlimited projects, automated emails, PDFs, templates and Stripe checkout.";
    billingLimitNote.classList.toggle("hidden", planKey !== "free" && !atLimit);
  }
  if (upgradeProBtn) {
    upgradeProBtn.classList.toggle("hidden", planKey !== "free");
  }
  if (upgradeBusinessBtn) {
    upgradeBusinessBtn.textContent = planKey === "business" ? "Business active" : "Business";
    upgradeBusinessBtn.disabled = planKey === "business";
  }
  if (createProjectBtn) {
    createProjectBtn.disabled = atLimit;
    createProjectBtn.textContent = atLimit ? "Upgrade for more projects" : "Create project";
  }
}

function setBusinessProfileEditing(isEditing) {
  businessProfileForm?.classList.toggle("hidden", !isEditing);
  customiseProfileBtn?.classList.toggle("hidden", isEditing);

  if (isEditing) {
    if (profileBrandName) profileBrandName.value = getProfileName(currentProfile);
    if (profileBio) profileBio.value = currentProfile?.bio || "";
    if (profileContactEmail) profileContactEmail.value = currentProfile?.contact_email || "";
    if (profileDefaultCurrency) {
      profileDefaultCurrency.value = currentProfile?.default_currency || "GBP";
    }
  }
}

function renderClientProfile(profile = currentProfile) {
  if (!clientProfileCard) return;

  const name = getProfileName(profile);
  applyAvatar(clientProfileImage, clientProfileInitial, profile);

  if (clientProfileName) clientProfileName.textContent = name;
  if (clientProfileBio) {
    clientProfileBio.textContent =
      profile?.bio || "Shared commission workspace";
  }
}

function getUpdateTitle(update, profile = currentProfile) {
  return update.author_role === "client" ? "Client note" : `${getProfileName(profile)} update`;
}

function getUpdatePillText(update, profile = currentProfile) {
  return update.author_role === "client" ? "client" : getProfileName(profile);
}

function getProjectStatusLabel(status) {
  const labels = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    in_progress: "In progress",
    awaiting_final_approval: "Awaiting approval",
    complete: "Complete",
    cancelled: "Cancelled"
  };
  return labels[status || "draft"] || "Draft";
}

function getProjectStatusKind(status) {
  if (status === "complete" || status === "accepted") return "success";
  if (status === "awaiting_final_approval" || status === "sent") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function projectHasAgreement(project) {
  return Boolean(
    project?.agreement_summary ||
      project?.agreement_scope ||
      project?.agreement_payment_terms ||
      project?.agreement_revision_terms
  );
}

function getPaymentStatusKind(status) {
  if (status === "paid") return "success";
  if (status === "cancelled") return "danger";
  return "warning";
}

function isPaymentOverdue(payment) {
  if (!payment?.due_date || payment.status !== "pending") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(payment.due_date) < today;
}

function isPaymentDueSoon(payment) {
  if (!payment?.due_date || payment.status !== "pending" || isPaymentOverdue(payment)) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(payment.due_date);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getShareSectionForTab(tab = currentProjectTab) {
  const sections = {
    agreement: "agreement",
    scope: "scope",
    changes: "changes",
    payments: "payments",
    suggestions: "suggestions",
    updates: "updates",
    gallery: "updates",
    deliverables: "completion",
    completion: "completion",
    client: "all",
    overview: "all"
  };
  return sections[tab] || "all";
}

function getClientSectionLabel(section = getShareSectionForTab()) {
  const labels = {
    agreement: "agreement",
    scope: "scope",
    changes: "changes",
    payments: "payments",
    suggestions: "suggestions",
    updates: "updates",
    gallery: "gallery",
    completion: "final approval",
    all: "project workspace"
  };
  return labels[section] || "project workspace";
}

function getProjectShareLink(project = currentProject, section = getShareSectionForTab()) {
  if (!project?.share_id) return "";
  const url = new URL(window.location.origin);
  url.searchParams.set("share", project.share_id);
  if (section && section !== "all") url.searchParams.set("section", section);
  return url.toString();
}

function getShareTokenQuery() {
  const query = new URLSearchParams();
  if (clientToken) query.set("token", clientToken);
  if (clientAccessCodeValue) query.set("accessCode", clientAccessCodeValue);
  const text = query.toString();
  return text ? `?${text}` : "";
}

function getAgreementFormPayload() {
  return {
    agreementSummary: agreementSummary?.value,
    currency: projectCurrency?.value || getProjectCurrency(),
    agreementScope: agreementScope?.value,
    agreementExclusions: agreementExclusions?.value,
    agreementTimeline: agreementTimeline?.value,
    agreementPaymentTerms: agreementPaymentTerms?.value,
    agreementRevisionTerms: agreementRevisionTerms?.value,
    agreementCancellationTerms: agreementCancellationTerms?.value
  };
}

function applyTemplateToAgreement(template) {
  if (!template) return;
  if (projectCurrency) projectCurrency.value = getProjectCurrency(template);
  if (agreementSummary) agreementSummary.value = template.agreement_summary || "";
  if (agreementScope) agreementScope.value = template.agreement_scope || "";
  if (agreementExclusions) agreementExclusions.value = template.agreement_exclusions || "";
  if (agreementTimeline) agreementTimeline.value = template.agreement_timeline || "";
  if (agreementPaymentTerms) agreementPaymentTerms.value = template.agreement_payment_terms || "";
  if (agreementRevisionTerms) agreementRevisionTerms.value = template.agreement_revision_terms || "";
  if (agreementCancellationTerms) {
    agreementCancellationTerms.value = template.agreement_cancellation_terms || "";
  }
}

function setAgreementLocked(isLocked) {
  [
    projectCurrency,
    agreementSummary,
    agreementScope,
    agreementExclusions,
    agreementTimeline,
    agreementPaymentTerms,
    agreementRevisionTerms,
    agreementCancellationTerms,
    saveAgreementBtn,
    sendAgreementBtn,
    applyTemplateBtn
  ].forEach((control) => {
    if (control) control.disabled = isLocked;
  });
}

async function downloadFileWithAuth(url, filename, mimeType = "application/pdf") {
  const headers = await getAuthHeaders();
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const text = await response.text();
    let message = "Could not export file.";
    try {
      message = JSON.parse(text)?.error || message;
    } catch {
      // Keep generic export message when the response is not JSON.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const typedBlob = blob.type ? blob : new Blob([blob], { type: mimeType });
  const objectUrl = URL.createObjectURL(typedBlob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function buildGalleryCard(item) {
  const card = document.createElement("a");
  card.className = "gallery-card";
  card.href = item.image_url || item.file_url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  const image = document.createElement("img");
  image.src = item.image_url || item.file_url;
  image.alt = item.title || "Project image";
  image.loading = "lazy";

  const body = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = item.title || "Project image";
  const meta = document.createElement("span");
  meta.textContent = [item.source, item.created_at && formatDateTime(item.created_at)]
    .filter(Boolean)
    .join(" | ");

  body.appendChild(title);
  body.appendChild(meta);
  card.appendChild(image);
  card.appendChild(body);
  return card;
}

function renderGallery(container, gallery = currentGallery) {
  if (!container) return;
  container.innerHTML = "";

  if (!gallery.length) {
    container.appendChild(buildEmptyState("No project images have been uploaded yet."));
    return;
  }

  gallery.forEach((item) => container.appendChild(buildGalleryCard(item)));
}

function renderTemplateOptions() {
  if (!agreementTemplateSelect) return;
  agreementTemplateSelect.innerHTML = '<option value="">Choose a template</option>';
  currentAgreementTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    agreementTemplateSelect.appendChild(option);
  });
}

function getOutstandingTotal(payments = currentProjectPayments) {
  return payments
    .filter((payment) => payment.status === "pending")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function getProjectPhaseCopy(project) {
  const phases = {
    draft: ["Project setup", "Build the agreement, scope and client handoff before sending."],
    sent: ["Client review", "The client has the agreement and can accept when ready."],
    accepted: ["Accepted scope", "The project is commercially agreed and ready to move into delivery."],
    in_progress: ["Delivery active", "Keep progress updates and paid changes recorded as work moves forward."],
    awaiting_final_approval: ["Final approval", "Final work is with the client for sign-off."],
    complete: ["Complete", "The project has a completed approval record."],
    cancelled: ["Cancelled", "This project has been stopped and should stay archived for reference."]
  };

  return phases[project?.status || "draft"] || phases.draft;
}

function buildReadinessItem(label, isComplete, detail, options = {}) {
  const item = document.createElement("div");
  item.className = `readiness-item ${isComplete ? "complete" : ""}`;

  const marker = document.createElement("span");
  marker.textContent = isComplete ? "Done" : "-";

  const body = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = label;
  const copy = document.createElement("p");
  copy.textContent = detail;
  copy.title = detail;
  if (options.truncateDetail) copy.classList.add("truncate");

  body.appendChild(strong);
  body.appendChild(copy);
  item.appendChild(marker);
  item.appendChild(body);
  return item;
}

function renderProjectCommandCentre(project, scopeItems, changes, suggestions, payments, deliverables) {
  if (!projectPhaseName) return;

  const pending = changes.filter((change) => change.status === "pending");
  const approved = changes.filter((change) => change.status === "approved");
  const approvedTotal = approved.reduce((sum, change) => sum + Number(change.price || 0), 0);
  const outstandingTotal = getOutstandingTotal(payments);
  const overdueCount = payments.filter(isPaymentOverdue).length;
  const openSuggestions = suggestions.filter((suggestion) => suggestion.status === "suggested").length;
  const approvedDeliverables = deliverables.filter((item) => item.status === "approved").length;
  const [phaseTitle, phaseCopy] = getProjectPhaseCopy(project);

  const checks = [
    {
      label: "Client email saved",
      complete: Boolean(project.client_email),
      detail: project.client_email || "Add the client email before sending the project.",
      truncateDetail: Boolean(project.client_email)
    },
    {
      label: "Agreement drafted",
      complete: projectHasAgreement(project),
      detail: projectHasAgreement(project)
        ? "Terms are ready to share or revise."
        : "Add scope, payment and revision terms."
    },
    {
      label: "Original scope defined",
      complete: scopeItems.length > 0,
      detail: scopeItems.length
        ? `${scopeItems.length} scope item${scopeItems.length === 1 ? "" : "s"} recorded.`
        : "Add the work included in the base commission."
    },
    {
      label: "Payments clean",
      complete: overdueCount === 0,
      detail: overdueCount
        ? `${overdueCount} payment${overdueCount === 1 ? "" : "s"} overdue.`
        : "No overdue project payments."
    },
    {
      label: "Client suggestions reviewed",
      complete: openSuggestions === 0,
      detail: openSuggestions
        ? `${openSuggestions} suggestion${openSuggestions === 1 ? "" : "s"} need a decision.`
        : "No unreviewed suggestions."
    },
    {
      label: "Deliverables controlled",
      complete: deliverables.length === 0 || approvedDeliverables === deliverables.length,
      detail: deliverables.length
        ? `${approvedDeliverables} of ${deliverables.length} deliverable${deliverables.length === 1 ? "" : "s"} approved.`
        : "Share final deliverables when delivery is ready."
    }
  ];

  const score = Math.round(
    (checks.filter((check) => check.complete).length / checks.length) * 100
  );
  const riskCopy = score >= 84 ? "Premium-ready" : score >= 58 ? "Needs attention" : "Needs setup";

  projectPhaseName.textContent = phaseTitle;
  if (projectClientBrief) projectClientBrief.textContent = phaseCopy;
  if (projectHealthScore) projectHealthScore.textContent = `${score}%`;
  if (projectHealthBar) projectHealthBar.style.width = `${score}%`;
  if (projectRiskLevel) projectRiskLevel.textContent = riskCopy;
  if (projectMoneyBrief) {
    projectMoneyBrief.textContent = `${formatCurrency(approvedTotal)} approved extras | ${formatCurrency(outstandingTotal)} outstanding`;
  }
  if (projectScopeBrief) {
    projectScopeBrief.textContent = `${scopeItems.length} included | ${pending.length} pending change${pending.length === 1 ? "" : "s"}`;
  }
  if (projectDeliveryBrief) {
    projectDeliveryBrief.textContent = deliverables.length
      ? `${approvedDeliverables}/${deliverables.length} deliverables approved`
      : "Deliverables not shared yet";
  }

  if (projectReadinessList) {
    projectReadinessList.innerHTML = "";
    checks.forEach((check) => {
      projectReadinessList.appendChild(
        buildReadinessItem(check.label, check.complete, check.detail, {
          truncateDetail: check.truncateDetail
        })
      );
    });
  }
}

function agreementRows(project) {
  return [
    ["Summary", project?.agreement_summary],
    ["Included scope", project?.agreement_scope],
    ["Exclusions", project?.agreement_exclusions],
    ["Timeline", project?.agreement_timeline],
    ["Payment terms", project?.agreement_payment_terms],
    ["Revision policy", project?.agreement_revision_terms],
    ["Cancellation terms", project?.agreement_cancellation_terms]
  ].filter(([, value]) => value);
}

function renderAgreementPreview(container, project) {
  if (!container) return;
  container.innerHTML = "";

  const rows = agreementRows(project);
  if (!rows.length) {
    container.appendChild(buildEmptyState("No agreement terms have been written yet."));
    return;
  }

  rows.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "agreement-row";
    const strong = document.createElement("strong");
    strong.textContent = label;
    const paragraph = document.createElement("p");
    paragraph.textContent = value;
    item.appendChild(strong);
    item.appendChild(paragraph);
    container.appendChild(item);
  });
}

function fillAgreementForm(project) {
  if (projectCurrency) projectCurrency.value = getProjectCurrency(project);
  if (agreementSummary) agreementSummary.value = project?.agreement_summary || "";
  if (agreementScope) agreementScope.value = project?.agreement_scope || "";
  if (agreementExclusions) agreementExclusions.value = project?.agreement_exclusions || "";
  if (agreementTimeline) agreementTimeline.value = project?.agreement_timeline || "";
  if (agreementPaymentTerms) agreementPaymentTerms.value = project?.agreement_payment_terms || "";
  if (agreementRevisionTerms) agreementRevisionTerms.value = project?.agreement_revision_terms || "";
  if (agreementCancellationTerms) {
    agreementCancellationTerms.value = project?.agreement_cancellation_terms || "";
  }
}

function buildPaymentRow(payment, options = {}) {
  const actions = document.createElement("div");
  actions.className = "action-stack";
  const statusText = isPaymentOverdue(payment)
    ? "overdue"
    : isPaymentDueSoon(payment)
    ? "due soon"
    : payment.status;
  const statusKind = isPaymentOverdue(payment) ? "danger" : getPaymentStatusKind(payment.status);
  actions.appendChild(buildStatusPill(statusText, statusKind));

  if (options.clientPay && payment.status === "pending") {
    const payBtn = document.createElement("button");
    payBtn.className = "btn btn-primary btn-small";
    payBtn.type = "button";
    payBtn.textContent = "Pay";
    payBtn.addEventListener("click", (event) => startProjectPayment(payment, event));
    actions.appendChild(payBtn);
  }

  if (options.ownerControls && payment.status === "pending") {
    const paidBtn = document.createElement("button");
    paidBtn.className = "btn btn-secondary btn-small";
    paidBtn.type = "button";
    paidBtn.textContent = "Mark paid";
    paidBtn.addEventListener("click", () => updateProjectPayment(payment, "paid", paidBtn));
    actions.appendChild(paidBtn);
  }

  if (options.ownerControls) {
    const invoiceBtn = document.createElement("button");
    invoiceBtn.className = "btn btn-secondary btn-small";
    invoiceBtn.type = "button";
    invoiceBtn.textContent = payment.status === "paid" ? "Receipt" : "Invoice";
    invoiceBtn.addEventListener("click", () => exportPaymentInvoice(payment, invoiceBtn));
    actions.appendChild(invoiceBtn);
  }

  const subtitleBits = [
    payment.payment_type,
    formatCurrency(payment.amount, payment.currency || getProjectCurrency()),
    payment.payment_method === "stripe" ? "Stripe" : "Manual"
  ];
  if (payment.due_date) subtitleBits.push(`Due ${payment.due_date}`);
  if (payment.paid_at) subtitleBits.push(`Paid ${formatDateTime(payment.paid_at)}`);

  return buildListRow(payment.label, subtitleBits.join(" | "), actions);
}

function buildDeliverableRow(deliverable, options = {}) {
  const actions = document.createElement("div");
  actions.className = "action-stack";
  actions.appendChild(
    buildStatusPill(
      deliverable.status || "shared",
      deliverable.status === "approved" ? "success" : "warning"
    )
  );

  if (options.clientApprove && deliverable.status !== "approved") {
    const approveBtn = document.createElement("button");
    approveBtn.className = "btn btn-primary btn-small";
    approveBtn.type = "button";
    approveBtn.textContent = "Approve";
    approveBtn.addEventListener("click", () => approveDeliverable(deliverable, approveBtn));
    actions.appendChild(approveBtn);
  }

  const details = [
    deliverable.note,
    deliverable.approved_at && `Approved ${formatDateTime(deliverable.approved_at)}`
  ]
    .filter(Boolean)
    .join("\n");

  return buildCollaborationCard(
    deliverable.title,
    [deliverable.file_name, formatDateTime(deliverable.created_at)].filter(Boolean).join(" | "),
    details,
    deliverable.file_url,
    actions
  );
}

function applyClientSectionScope(section = clientSection) {
  const normalised = section || "all";
  document.querySelectorAll("[data-client-section]").forEach((panel) => {
    const panelSection = panel.dataset.clientSection;
    const visible = normalised === "all" || panelSection === normalised;
    panel.classList.toggle("hidden", !visible);
  });

  if (normalised !== "all") {
    showBanner(`Showing ${getClientSectionLabel(normalised)} for this project.`, "info");
  }
}

function setClientVerificationMode(isVerifying) {
  clientVerificationCard?.classList.toggle("hidden", !isVerifying);

  document.querySelectorAll("#client-view > section").forEach((section) => {
    if (section === clientVerificationCard) return;
    section.classList.toggle("hidden", isVerifying);
  });
}

function renderClientVerification(project = {}) {
  isClientView = true;
  currentProject = project;
  currentProfile = null;
  currentSuggestions = [];
  currentUpdates = [];
  currentProjectPayments = [];
  currentActivity = [];
  currentGallery = [];
  currentDeliverables = [];
  setClientVerificationMode(true);
  updateAuthButtons(false);
  setView("client");
  if (clientAccessCode && clientAccessCodeValue) clientAccessCode.value = clientAccessCodeValue;
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

function getProjectDeleteLabel(project = pendingDeleteProject) {
  return project?.title ? `"${project.title}"` : "this project";
}

function openProjectDeleteModal(project = currentProject) {
  if (!project?.id) {
    showBanner("Select a project first.", "error");
    return;
  }

  pendingDeleteProject = project;
  if (deleteProjectName) deleteProjectName.textContent = getProjectDeleteLabel(project);
  if (deleteProjectFinalName) deleteProjectFinalName.textContent = getProjectDeleteLabel(project);
  deleteProjectFinalModal?.setAttribute("aria-hidden", "true");
  deleteProjectModal?.setAttribute("aria-hidden", "false");
}

function closeProjectDeleteModals() {
  deleteProjectModal?.setAttribute("aria-hidden", "true");
  deleteProjectFinalModal?.setAttribute("aria-hidden", "true");
  pendingDeleteProject = null;
  setButtonLoading(confirmDeleteProjectBtn, false, "Permanently delete");
}

function openProjectDeleteFinalModal() {
  if (!pendingDeleteProject?.id) return;
  if (deleteProjectFinalName) {
    deleteProjectFinalName.textContent = getProjectDeleteLabel(pendingDeleteProject);
  }
  deleteProjectModal?.setAttribute("aria-hidden", "true");
  deleteProjectFinalModal?.setAttribute("aria-hidden", "false");
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

  if (isAuthed || hasStoredAuthSession()) {
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
  const { data, error } = await Promise.race([
    db.auth.getSession(),
    new Promise((resolve) => {
      setTimeout(
        () =>
          resolve({
            data: { session: currentUser ? { user: currentUser } : null },
            error: null
          }),
        2500
      );
    })
  ]);

  if (error) {
    console.error("refreshCurrentUser error:", error);
    return null;
  }

  currentUser = data?.session?.user || null;
  return currentUser;
}

function withTimeout(promise, timeoutMs, fallbackValue) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    })
  ]);
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
      const { data, error, timedOut } = await withTimeout(
        db.auth.signInWithPassword({
          email,
          password
        }),
        8000,
        { data: null, error: null, timedOut: true }
      );

      if (error) throw error;

      currentUser = data?.user || currentUser;

      resetAuthLoadingState();
      closeAuthModal();
      updateAuthButtons(true);
      showBanner(
        timedOut
          ? "Sign-in is still syncing. Use Dashboard in a moment."
          : "Signed in successfully.",
        timedOut ? "warning" : "success"
      );

      if (currentUser) {
        initOwnerView();
      }
    } else {
      const { data, error, timedOut } = await withTimeout(
        db.auth.signUp({
          email,
          password
        }),
        8000,
        { data: null, error: null, timedOut: true }
      );

      if (error) throw error;

      resetAuthLoadingState();
      closeAuthModal();

      if (data?.user && data?.session) {
        currentUser = data.user;
        updateAuthButtons(true);
        showBanner("Account created and signed in.", "success");
        initOwnerView();
      } else if (timedOut) {
        updateAuthButtons(hasStoredAuthSession());
        showBanner("Account request is still syncing. Try Dashboard in a moment.", "warning");
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
    resetAuthLoadingState();
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
  currentUser = null;
  currentProject = null;
  currentProjectId = null;
  currentProjects = [];
  currentScopeItems = [];
  currentChanges = [];
  currentSuggestions = [];
  currentUpdates = [];
  currentProjectPayments = [];
  currentActivity = [];
  currentGallery = [];
  currentAgreementTemplates = [];
  currentAgreementVersions = [];
  currentDeliverables = [];
  currentProfile = null;
  currentProjectTab = "overview";
  isClientView = false;

  clearStoredAuthSession();
  updateAuthButtons(false);
  setView("landing");
  showBanner("Signed out.", "success");
  window.history.replaceState({}, "", window.location.origin);

  try {
    const { error } = await Promise.race([
      db.auth.signOut(),
      new Promise((resolve) => {
        setTimeout(() => resolve({ error: null, timedOut: true }), 2500);
      })
    ]);
    if (error) throw error;
  } catch (error) {
    console.error("signOut error:", error);
  }
}

async function openDashboard() {
  const user = currentUser || (await refreshCurrentUser());

  if (!user) {
    showBanner("Your session has expired. Please sign in again.", "warning");
    setView("landing");
    updateAuthButtons(false);
    return;
  }

  try {
    currentUser = user;
    updateAuthButtons(true);
    setView("owner");
    renderOwnerEmptyWorkspace();
    showBanner("Opening dashboard...", "info");
    initOwnerView();
  } catch (error) {
    console.error("Dashboard button error:", error);
    showBanner("Could not open your dashboard.", "error");
    updateAuthButtons(true);
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
    const projectCard = document.createElement("div");
    projectCard.className = "project-list-card";

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
    meta.textContent = [
      project.client_name,
      project.client_email,
      getProjectCurrency(project),
      getProjectStatusLabel(project.status),
      project.archived_at && "Archived"
    ]
      .filter(Boolean)
      .join(" | ");

    button.appendChild(title);
    button.appendChild(meta);

    button.addEventListener("click", async () => {
      currentProjectId = project.id;
      try {
        await loadProject();
      } catch (error) {
        console.error("Project open error:", error);
        showBanner("Could not open this project.", "error");
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "project-card-delete";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", `Delete ${project.title}`);
    deleteBtn.title = "Delete project";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openProjectDeleteModal(project);
    });

    projectCard.appendChild(button);
    projectCard.appendChild(deleteBtn);
    projectListEl.appendChild(projectCard);
  });
}

function renderOwnerEmptyWorkspace() {
  ownerEmptyState?.classList.remove("hidden");
  projectWorkspace?.classList.add("hidden");
  currentSuggestions = [];
  currentUpdates = [];
  currentProjectPayments = [];
  currentActivity = [];
  currentGallery = [];
  currentAgreementVersions = [];
  currentDeliverables = [];

  if (metricScopeCount) metricScopeCount.textContent = "0";
  if (metricProjectStatus) metricProjectStatus.textContent = "Draft";
  if (metricPendingCount) metricPendingCount.textContent = "0";
  if (metricPendingTotal) metricPendingTotal.textContent = formatCurrency(0);
  if (metricApprovedTotal) metricApprovedTotal.textContent = formatCurrency(0);
  if (metricOutstandingTotal) metricOutstandingTotal.textContent = formatCurrency(0);
  if (projectPhaseName) projectPhaseName.textContent = "Project setup";
  if (projectClientBrief) projectClientBrief.textContent = "Select a project to see client readiness.";
  if (projectHealthScore) projectHealthScore.textContent = "0%";
  if (projectHealthBar) projectHealthBar.style.width = "0%";
  if (projectRiskLevel) projectRiskLevel.textContent = "Needs setup";
  if (projectMoneyBrief) projectMoneyBrief.textContent = "No project selected";
  if (projectScopeBrief) projectScopeBrief.textContent = "No scope items yet";
  if (projectDeliveryBrief) projectDeliveryBrief.textContent = "No deliverables shared";
  if (projectReadinessList) projectReadinessList.innerHTML = "";
}

function renderOwnerWorkspace(
  project,
  scopeItems,
  changes,
  suggestions = [],
  updates = [],
  payments = [],
  activity = currentActivity,
  gallery = currentGallery,
  agreementVersions = currentAgreementVersions,
  deliverables = currentDeliverables
) {
  ownerEmptyState?.classList.add("hidden");
  projectWorkspace?.classList.remove("hidden");

  projectTitleEl.textContent = project.title;
  projectSubtitleEl.textContent = `Client: ${project.client_name}${project.client_email ? ` | ${project.client_email}` : ""} | ${getProjectCurrency(project)}`;
  ownerStatusChip?.classList.remove("hidden");
  if (ownerStatusChip) {
    ownerStatusChip.textContent = getProjectStatusLabel(project.status);
    ownerStatusChip.className = `status-chip status-${getProjectStatusKind(project.status)}`;
  }
  renderProfilePreview(currentProfile);
  fillAgreementForm(project);
  setAgreementLocked(false);
  if (editProjectTitle) editProjectTitle.value = project.title || "";
  if (editProjectClient) editProjectClient.value = project.client_name || "";
  if (editProjectClientEmail) editProjectClientEmail.value = project.client_email || "";
  const projectDetailsLocked = Boolean(project.accepted_at);
  [editProjectTitle, editProjectClient, editProjectClientEmail, saveProjectDetailsBtn].forEach(
    (control) => {
      if (control) control.disabled = projectDetailsLocked;
    }
  );
  if (archiveProjectBtn) {
    archiveProjectBtn.textContent = project.archived_at ? "Restore project" : "Archive project";
  }

  const pending = changes.filter((change) => change.status === "pending");
  const approved = changes.filter((change) => change.status === "approved");
  const outstandingTotal = getOutstandingTotal(payments);

  metricScopeCount.textContent = String(scopeItems.length);
  if (metricProjectStatus) metricProjectStatus.textContent = getProjectStatusLabel(project.status);
  metricPendingCount.textContent = String(pending.length);
  metricPendingTotal.textContent = formatCurrency(
    pending.reduce((sum, change) => sum + Number(change.price || 0), 0)
  );
  metricApprovedTotal.textContent = formatCurrency(
    approved.reduce((sum, change) => sum + Number(change.price || 0), 0)
  );
  if (metricOutstandingTotal) metricOutstandingTotal.textContent = formatCurrency(outstandingTotal);
  renderProjectCommandCentre(project, scopeItems, changes, suggestions, payments, deliverables);

  overviewSummaryCopy.textContent =
    `${project.title} is ${getProjectStatusLabel(project.status).toLowerCase()} with ${pending.length} pending change request${pending.length === 1 ? "" : "s"} and ${formatCurrency(outstandingTotal)} outstanding in project payments.`;

  overviewNextAction.textContent =
    !projectHasAgreement(project)
      ? "Write the agreement terms so the client can accept a clear scope before work starts."
      : project.status === "draft"
      ? "Send the agreement for client acceptance when the scope and terms are ready."
      : project.status === "sent"
      ? "Waiting for the client to accept the project agreement."
      : project.status === "accepted"
      ? "Mark the project in progress when you are ready to begin delivery."
      : project.status === "awaiting_final_approval"
      ? "Waiting for the client to approve final completion."
      : scopeItems.length === 0
      ? "Add your included scope first so change requests are easier to justify."
      : pending.length === 0
      ? "Add a priced change request the next time the client asks for extra work."
      : "Review pending changes and send the share link to the client.";

  overviewAttentionList.innerHTML = "";
  const attentionItems = [];
  if (!projectHasAgreement(project)) attentionItems.push(["Agreement needed", "Write project terms before sending the client link."]);
  if (project.status === "sent") attentionItems.push(["Waiting for acceptance", "The client has not accepted the project agreement yet."]);
  if (suggestions.some((suggestion) => suggestion.status === "suggested")) attentionItems.push(["Suggestions pending", "Review new client suggestions before they become scope."]);
  if (pending.length) attentionItems.push(["Change payments pending", `${pending.length} change request${pending.length === 1 ? "" : "s"} awaiting payment.`]);
  if (outstandingTotal > 0) attentionItems.push(["Project payments outstanding", `${formatCurrency(outstandingTotal)} is still pending.`]);
  if (payments.some(isPaymentOverdue)) attentionItems.push(["Overdue payment", "At least one project payment is past its due date."]);
  if (project.status === "awaiting_final_approval") attentionItems.push(["Final approval", "The client needs to approve completion."]);
  if (deliverables.some((item) => item.status !== "approved")) attentionItems.push(["Deliverables awaiting approval", "Final files have been shared but not all are approved."]);
  if (!attentionItems.length) attentionItems.push(["All clear", "No urgent project actions right now."]);
  attentionItems.forEach(([title, subtitle]) => overviewAttentionList.appendChild(buildListRow(title, subtitle)));

  scopeList.innerHTML = "";
  pendingList.innerHTML = "";
  approvedList.innerHTML = "";
  projectPaymentList.innerHTML = "";

  ownerClientScopeList.innerHTML = "";
  ownerClientPendingList.innerHTML = "";
  ownerClientApprovedList.innerHTML = "";
  ownerSuggestionList.innerHTML = "";
  ownerUpdateList.innerHTML = "";
  ownerClientSuggestionList.innerHTML = "";
  ownerClientUpdateList.innerHTML = "";
  ownerClientPaymentList.innerHTML = "";

  if (scopeItems.length === 0) {
    scopeList.appendChild(buildEmptyState("No scope items yet."));
    ownerClientScopeList.appendChild(buildEmptyState("No scope items available."));
  } else {
    scopeItems.forEach((item) => {
      const row = buildListRow(item.title, `Included | ${formatCurrency(item.price)}`);
      scopeList.appendChild(row);
      ownerClientScopeList.appendChild(
        buildListRow(item.title, `Included | ${formatCurrency(item.price)}`)
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
        buildListRow(change.title, `Change | ${formatCurrency(change.price)}`, ownerLabel)
      );

      const previewLabel = document.createElement("span");
      previewLabel.textContent = "Pay required";
      ownerClientPendingList.appendChild(
        buildListRow(change.title, `Pending | ${formatCurrency(change.price)}`, previewLabel)
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
        ? `Approved | ${formatCurrency(change.price)} | Paid ${new Date(change.paid_at).toLocaleString()}`
        : `Approved | ${formatCurrency(change.price)}`;

      approvedList.appendChild(buildListRow(change.title, subtitle, ownerLabel));

      const previewLabel = document.createElement("span");
      previewLabel.textContent = "Approved";
      ownerClientApprovedList.appendChild(
        buildListRow(change.title, `Approved | ${formatCurrency(change.price)}`, previewLabel)
      );
    });
  }

  renderAgreementPreview(agreementAcceptedCopy, project);
  renderAgreementPreview(ownerClientAgreementPreview, project);
  if (agreementVersionList) {
    agreementVersionList.innerHTML = "";
    if (!agreementVersions.length) {
      agreementVersionList.appendChild(buildEmptyState("No agreement versions yet."));
    } else {
      agreementVersions.forEach((version) => {
        agreementVersionList.appendChild(
          buildListRow(
            `Version ${version.version_number}`,
            [
              version.status,
              version.accepted_by_name && `Accepted by ${version.accepted_by_name}`,
              formatDateTime(version.accepted_at || version.sent_at || version.created_at)
            ]
              .filter(Boolean)
              .join(" | "),
            buildStatusPill(version.status, version.status === "accepted" ? "success" : "neutral")
          )
        );
      });
    }
  }
  if (agreementStatusCopy) {
    agreementStatusCopy.textContent = project.accepted_at
      ? `Accepted by ${project.accepted_by_name || "client"} on ${formatDateTime(project.accepted_at)}. Saving changes will create a new draft revision.`
      : project.status === "sent"
      ? "Sent for client acceptance. The client can accept from the shared project page."
      : "Save the agreement, then send the client share link for acceptance.";
  }

  if (payments.length === 0) {
    projectPaymentList.appendChild(buildEmptyState("No project payments yet."));
    ownerClientPaymentList.appendChild(buildEmptyState("No project payments yet."));
  } else {
    payments.forEach((payment) => {
      projectPaymentList.appendChild(buildPaymentRow(payment, { ownerControls: true }));
      ownerClientPaymentList.appendChild(buildPaymentRow(payment));
    });
  }

  if (suggestions.length === 0) {
    ownerSuggestionList.appendChild(buildEmptyState("No client suggestions yet."));
    ownerClientSuggestionList.appendChild(buildEmptyState("No client suggestions yet."));
  } else {
    suggestions.forEach((suggestion) => {
      const actions = document.createElement("div");
      actions.className = "action-stack";

      const statusPill = buildStatusPill(
        suggestion.status || "suggested",
        getSuggestionStatusKind(suggestion.status)
      );
      actions.appendChild(statusPill);

      if (suggestion.status !== "accepted") {
        const acceptBtn = document.createElement("button");
        acceptBtn.className = "btn btn-primary btn-small";
        acceptBtn.type = "button";
        acceptBtn.textContent = "Create change";
        acceptBtn.addEventListener("click", () => createChangeFromSuggestion(suggestion, acceptBtn));
        actions.appendChild(acceptBtn);
      }

      const reviseBtn = document.createElement("button");
      reviseBtn.className = "btn btn-secondary btn-small";
      reviseBtn.type = "button";
      reviseBtn.textContent = "Revise";
      reviseBtn.addEventListener("click", () => updateSuggestionStatus(suggestion, "revised", reviseBtn));
      actions.appendChild(reviseBtn);

      const declineBtn = document.createElement("button");
      declineBtn.className = "btn btn-secondary btn-small";
      declineBtn.type = "button";
      declineBtn.textContent = "Decline";
      declineBtn.addEventListener("click", () => updateSuggestionStatus(suggestion, "declined", declineBtn));
      actions.appendChild(declineBtn);

      const details = [suggestion.details, suggestion.response_note && `Response: ${suggestion.response_note}`]
        .filter(Boolean)
        .join("\n");

      ownerSuggestionList.appendChild(
        buildCollaborationCard(
          suggestion.title,
          suggestionSubtitle(suggestion),
          details,
          suggestion.image_url,
          actions
        )
      );

      ownerClientSuggestionList.appendChild(
        buildCollaborationCard(
          suggestion.title,
          suggestionSubtitle(suggestion),
          details,
          suggestion.image_url,
          buildStatusPill(suggestion.status || "suggested", getSuggestionStatusKind(suggestion.status))
        )
      );
    });
  }

  if (updates.length === 0) {
    ownerUpdateList.appendChild(buildEmptyState("No shared updates yet."));
    ownerClientUpdateList.appendChild(buildEmptyState("No shared updates yet."));
  } else {
    updates.forEach((update) => {
      const title = getUpdateTitle(update);
      const subtitle = formatDateTime(update.created_at);
      const card = buildCollaborationCard(
        title,
        subtitle,
        update.message,
        update.image_url,
        buildStatusPill(getUpdatePillText(update))
      );

      ownerUpdateList.appendChild(card);
      ownerClientUpdateList.appendChild(
        buildCollaborationCard(
          title,
          subtitle,
          update.message,
          update.image_url,
          buildStatusPill(getUpdatePillText(update))
        )
      );
    });
  }

  if (completionStatusCopy) {
    completionStatusCopy.textContent =
      project.status === "complete"
        ? `Project completed${project.completed_at ? ` on ${formatDateTime(project.completed_at)}` : ""}.`
        : project.status === "awaiting_final_approval"
        ? "Final approval has been requested. The client can now approve completion from the shared page."
        : "Request final approval when the agreed work is ready for the client to sign off.";
  }

  projectTimelineList.innerHTML = "";
  const milestoneItems = [
    ["Created", project.created_at],
    ["Sent to client", project.sent_at],
    ["Agreement accepted", project.accepted_at],
    ["Final approval requested", project.final_approval_requested_at],
    ["Completed", project.completed_at],
    ["Cancelled", project.cancelled_at]
  ].filter(([, value]) => value);
  const activityItems = activity.map((item) => [
    item.title,
    [item.detail, formatDateTime(item.created_at)].filter(Boolean).join(" | ")
  ]);
  const timelineItems = [...activityItems, ...milestoneItems.map(([title, value]) => [title, formatDateTime(value)])];
  timelineItems.forEach(([title, subtitle]) => {
    projectTimelineList.appendChild(buildListRow(title, subtitle));
  });
  if (!timelineItems.length) {
    projectTimelineList.appendChild(buildEmptyState("No project milestones yet."));
  }

  if (deliverableList) {
    deliverableList.innerHTML = "";
    if (!deliverables.length) {
      deliverableList.appendChild(buildEmptyState("No final deliverables yet."));
    } else {
      deliverables.forEach((deliverable) => {
        deliverableList.appendChild(buildDeliverableRow(deliverable));
      });
    }
  }

  renderGallery(projectGalleryList, gallery);

  setCurrentProjectTab(currentProjectTab);
}

async function loadProfile() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/profile`, { headers });
  const data = await readJsonResponse(response, "Could not load profile.");

  currentProfile = data.profile;
  renderProfilePreview(currentProfile);
  if (newProjectCurrency) {
    newProjectCurrency.value = currentProfile?.default_currency || "GBP";
  }
  return currentProfile;
}

async function loadBilling() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/billing`, { headers });
  currentBilling = await readJsonResponse(response, "Could not load billing.");
  renderBilling();
  return currentBilling;
}

async function startUpgradeCheckout(plan = "pro", button = null) {
  if (!currentUser && !hasStoredAuthSession()) {
    openAuthModal();
    showBanner("Create your free account first, then choose a plan from the dashboard.", "info");
    return;
  }

  const defaultText = plan === "business" ? "Business" : "Upgrade to Pro";
  setButtonLoading(button, true, plan === "business" ? "Opening Business..." : "Opening Pro...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/billing/checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify({ plan })
    });
    const data = await readJsonResponse(response, "Could not start upgrade checkout.");

    if (!data.url) throw new Error("Checkout did not return a URL.");
    window.location.href = data.url;
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not start upgrade checkout.", "error");
  } finally {
    setButtonLoading(button, false, defaultText);
  }
}

async function loadAgreementTemplates() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/agreement-templates`, { headers });
    const data = await readJsonResponse(response, "Could not load templates.");
    currentAgreementTemplates = data.templates || [];
    renderTemplateOptions();
  } catch (error) {
    console.error("Template load error:", error);
    currentAgreementTemplates = [];
    renderTemplateOptions();
  }
}

async function saveAgreementTemplate() {
  const name = agreementTemplateName?.value.trim();

  if (!name) {
    showBanner("Add a template name first.", "error");
    return;
  }

  setButtonLoading(saveTemplateBtn, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/agreement-templates`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        ...getAgreementFormPayload()
      })
    });

    await readJsonResponse(response, "Could not save template.");
    if (agreementTemplateName) agreementTemplateName.value = "";
    await loadAgreementTemplates();
    showBanner("Agreement template saved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not save template.", "error");
  } finally {
    setButtonLoading(saveTemplateBtn, false, "Save template");
  }
}

function applySelectedTemplate() {
  const template = currentAgreementTemplates.find(
    (item) => item.id === agreementTemplateSelect?.value
  );

  if (!template) {
    showBanner("Choose a template first.", "error");
    return;
  }

  applyTemplateToAgreement(template);
  showBanner("Template applied. Save the agreement when ready.", "success");
}

async function saveProfile() {
  const brandName = profileBrandName?.value.trim();
  const bio = profileBio?.value.trim();
  const contactEmail = profileContactEmail?.value.trim();

  if (!brandName) {
    showBanner("Add a brand name first.", "error");
    return;
  }

  if (contactEmail && !isValidEmail(contactEmail)) {
    showBanner("Please enter a valid contact email.", "error");
    return;
  }

  setButtonLoading(saveProfileBtn, true, "Saving...");

  try {
    const image = await fileToDataUrl(profileImage);
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        brandName,
        bio,
        contactEmail,
        defaultCurrency: profileDefaultCurrency?.value || "GBP",
        image
      })
    });
    const data = await readJsonResponse(response, "Could not save profile.");

    currentProfile = data.profile;
    if (profileImage) profileImage.value = "";
    renderProfilePreview(currentProfile);
    if (currentProject) {
      renderOwnerWorkspace(
        currentProject,
        currentScopeItems,
        currentChanges,
        currentSuggestions,
        currentUpdates,
        currentProjectPayments,
        currentActivity,
        currentGallery
      );
    }
    setBusinessProfileEditing(false);
    showBanner("Business profile saved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not save profile.", "error");
  } finally {
    setButtonLoading(saveProfileBtn, false, "Save profile");
  }
}

// =======================
// OWNER VIEW
// =======================
async function loadProjects() {
  if (!currentUser) return;

  const { data, error } = await db
    .from("projects")
    .select("id,title,client_name,client_email,currency,share_id,status,archived_at,created_at")
    .eq("user_id", currentUser.id)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  currentProjects = data || [];
  renderProjectList();
  renderBilling();

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
    .select("id,title,client_name,client_email,currency,share_id,status,agreement_summary,agreement_scope,agreement_exclusions,agreement_timeline,agreement_payment_terms,agreement_revision_terms,agreement_cancellation_terms,agreement_snapshot,sent_at,accepted_at,accepted_by_name,accepted_by_email,final_approval_requested_at,completed_at,completed_by_name,completed_by_email,cancelled_at,archived_at,created_at")
    .eq("id", currentProjectId)
    .single();

  if (projectError) throw projectError;

  const { data: scope, error: scopeError } = await db
    .from("scope_items")
    .select("id,title,price")
    .eq("project_id", currentProjectId);

  if (scopeError) throw scopeError;

  const { data: changes, error: changesError } = await db
    .from("changes")
    .select("id,title,price,status,paid,paid_at")
    .eq("project_id", currentProjectId)
    .order("created_at", { ascending: true });

  if (changesError) throw changesError;

  let collaboration = { suggestions: [], updates: [], activity: [], gallery: [] };

  try {
    const headers = await getAuthHeaders();
    const collaborationResponse = await fetch(
      `${API_URL}/project/${encodeURIComponent(currentProjectId)}/collaboration`,
      { headers }
    );
    collaboration = await readJsonResponse(
      collaborationResponse,
      "Could not load project collaboration."
    );
  } catch (error) {
    console.error("Project collaboration load error:", error);
    showBanner(
      "Project loaded. Suggestions and updates are unavailable until the backend is reachable.",
      "warning"
    );
  }

  currentProject = project;
  currentScopeItems = scope || [];
  currentChanges = changes || [];
  currentSuggestions = collaboration.suggestions || [];
  currentUpdates = collaboration.updates || [];
  currentProjectPayments = collaboration.projectPayments || [];
  currentActivity = collaboration.activity || [];
  currentGallery = collaboration.gallery || [];
  currentAgreementVersions = collaboration.agreementVersions || [];
  currentDeliverables = collaboration.deliverables || [];

  renderProjectList();
  renderOwnerWorkspace(
    currentProject,
    currentScopeItems,
    currentChanges,
    currentSuggestions,
    currentUpdates,
    currentProjectPayments,
    currentActivity,
    currentGallery,
    currentAgreementVersions,
    currentDeliverables
  );
}

async function createProject() {
  const title = newProjectTitle?.value.trim();
  const clientName = newProjectClient?.value.trim();
  const clientEmail = newProjectClientEmail?.value.trim();
  const currency = newProjectCurrency?.value || currentProfile?.default_currency || "GBP";

  if (!title || !clientName || !clientEmail) {
    showBanner("Please enter project name, client name and client email.", "error");
    return;
  }

  if (!isValidEmail(clientEmail)) {
    showBanner("Please enter a valid client email address.", "error");
    return;
  }

  if (isActiveProjectLimitReached()) {
    showUpgradePrompt("Free includes one active project.", "pro");
    return;
  }

  setButtonLoading(createProjectBtn, true, "Creating...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title,
        clientName,
        clientEmail,
        currency
      })
    });
    const data = await readJsonResponse(response, "Could not create project.");

    newProjectTitle.value = "";
    newProjectClient.value = "";
    newProjectClientEmail.value = "";
    if (newProjectCurrency) newProjectCurrency.value = currentProfile?.default_currency || "GBP";
    currentProjectId = data.project.id;

    await loadBilling();
    await loadProjects();

    try {
      await loadProject();
      showBanner("Project created successfully.", "success");
    } catch (loadError) {
      console.error("Project created but could not open:", loadError);
      showBanner("Project created, but could not open the workspace yet.", "warning");
    }
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not create project.", "error");
  } finally {
    setButtonLoading(createProjectBtn, false, "Create project");
    renderBilling();
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

async function saveAgreement() {
  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  setButtonLoading(saveAgreementBtn, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/project/${encodeURIComponent(currentProjectId)}/agreement`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(getAgreementFormPayload())
    });

    await readJsonResponse(response, "Could not save agreement.");
    await loadProject();
    showBanner("Agreement saved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not save agreement.", "error");
  } finally {
    setButtonLoading(saveAgreementBtn, false, "Save agreement");
  }
}

async function updateProjectStatus(status, button = null) {
  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  if (status === "sent" && !projectHasAgreement(currentProject)) {
    showBanner("Add agreement terms before sending this project to the client.", "error");
    return;
  }

  setButtonLoading(button, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/project/${encodeURIComponent(currentProjectId)}/status`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status })
    });

    await readJsonResponse(response, "Could not update project status.");
    if (["complete", "cancelled"].includes(status)) {
      await loadBilling();
    }
    await loadProject();
    showBanner(
      status === "sent"
        ? "Project marked sent. Use Email client to send the review link."
        : "Project status updated.",
      "success"
    );
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not update project status.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function saveProjectDetails() {
  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  const title = editProjectTitle?.value.trim();
  const clientName = editProjectClient?.value.trim();
  const clientEmail = editProjectClientEmail?.value.trim();

  if (!title || !clientName || !clientEmail) {
    showBanner("Project name, client name and client email are required.", "error");
    return;
  }

  if (!isValidEmail(clientEmail)) {
    showBanner("Please enter a valid client email.", "error");
    return;
  }

  setButtonLoading(saveProjectDetailsBtn, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/project/${encodeURIComponent(currentProjectId)}/details`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        title,
        clientName,
        clientEmail,
        currency: projectCurrency?.value || getProjectCurrency()
      })
    });

    await readJsonResponse(response, "Could not save project details.");
    await loadBilling();
    await loadProjects();
    await loadProject();
    showBanner("Project details saved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not save project details.", "error");
  } finally {
    setButtonLoading(saveProjectDetailsBtn, false, "Save details");
  }
}

async function toggleProjectArchive() {
  if (!currentProjectId) return;

  const archived = !currentProject?.archived_at;
  setButtonLoading(archiveProjectBtn, true, archived ? "Archiving..." : "Restoring...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/project/${encodeURIComponent(currentProjectId)}/archive`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ archived })
    });

    await readJsonResponse(response, "Could not update archive state.");
    await loadProjects();
    await loadProject();
    showBanner(archived ? "Project archived." : "Project restored.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not update archive state.", "error");
  } finally {
    setButtonLoading(archiveProjectBtn, false, archived ? "Archive project" : "Restore project");
  }
}

async function deleteProject() {
  const projectToDelete = pendingDeleteProject || currentProject;
  if (!projectToDelete?.id) return;

  setButtonLoading(confirmDeleteProjectBtn, true, "Deleting...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/project/${encodeURIComponent(projectToDelete.id)}`, {
      method: "DELETE",
      headers
    });

    await readJsonResponse(response, "Could not delete project.");
    if (currentProjectId === projectToDelete.id) {
      currentProjectId = null;
      currentProject = null;
    }
    closeProjectDeleteModals();
    await loadBilling();
    await loadProjects();
    if (currentProjectId) await loadProject();
    showBanner("Project deleted.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not delete project.", "error");
  } finally {
    setButtonLoading(confirmDeleteProjectBtn, false, "Permanently delete");
  }
}

async function addProjectPayment() {
  const label = paymentLabel?.value.trim();
  const amount = Number(paymentAmount?.value);

  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  if (!label || Number.isNaN(amount) || amount < 0) {
    showBanner("Enter a payment label and valid amount.", "error");
    return;
  }

  setButtonLoading(addPaymentBtn, true, "Adding...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/project/${encodeURIComponent(currentProjectId)}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        label,
        amount,
        paymentType: paymentType?.value || "custom",
        status: paymentStatus?.value || "pending",
        paymentMethod: paymentStatus?.value === "paid" ? "manual" : "stripe",
        dueDate: paymentDueDate?.value || null
      })
    });

    await readJsonResponse(response, "Could not add payment.");
    if (paymentLabel) paymentLabel.value = "";
    if (paymentAmount) paymentAmount.value = "";
    if (paymentDueDate) paymentDueDate.value = "";
    await loadProject();
    showBanner("Payment added.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not add payment.", "error");
  } finally {
    setButtonLoading(addPaymentBtn, false, "Add payment");
  }
}

async function updateProjectPayment(payment, status, button) {
  setButtonLoading(button, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/project-payments/${encodeURIComponent(payment.id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status })
    });

    await readJsonResponse(response, "Could not update payment.");
    await loadProject();
    showBanner("Payment updated.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not update payment.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function exportPaymentInvoice(payment, button) {
  setButtonLoading(button, true, "Exporting...");

  try {
    await downloadFileWithAuth(
      `${API_URL}/project-payments/${encodeURIComponent(payment.id)}/invoice`,
      `${payment.invoice_number || `scopey-payment-${payment.id}`}.pdf`
    );
    await loadProject();
    showBanner("Invoice exported.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not export invoice.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function exportAgreement() {
  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  setButtonLoading(exportAgreementBtn, true, "Exporting...");

  try {
    await downloadFileWithAuth(
      `${API_URL}/project/${encodeURIComponent(currentProjectId)}/agreement-export`,
      `${currentProject?.title || "scopey"}-agreement.pdf`
    );
    showBanner("Agreement exported.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not export agreement.", "error");
  } finally {
    setButtonLoading(exportAgreementBtn, false, "Export agreement");
  }
}

async function copyShareLink() {
  if (!currentProject?.share_id) {
    showBanner("Select a project first.", "error");
    return;
  }

  try {
    const section = getShareSectionForTab();
    let link = getProjectShareLink(currentProject, section);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${API_URL}/project/${encodeURIComponent(currentProject.id)}/share-links`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ section })
        }
      );
      const data = await readJsonResponse(response, "Could not create scoped link.");
      link = data.link || link;
    } catch (linkError) {
      console.warn("Scoped link fallback:", linkError);
    }

    await navigator.clipboard.writeText(link);
    showBanner(`${getClientSectionLabel(section)} link copied.`, "success");
  } catch (error) {
    console.error(error);
    showBanner("Could not copy share link.", "error");
  }
}

async function emailClientProject(event = null) {
  if (!currentProject?.share_id) {
    showBanner("Select a project first.", "error");
    return;
  }

  if (!currentProject.client_email) {
    showBanner("Add a client email address before sending the project.", "error");
    return;
  }

  const button = event?.target?.closest?.("button") || null;
  setButtonLoading(button, true, "Preparing...");

  try {
    const section = getShareSectionForTab();
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/project/${encodeURIComponent(currentProject.id)}/send-email`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ section })
      }
    );
    const data = await readJsonResponse(response, "Could not prepare client email.");

    if (data.sent) {
      await loadProject();
      showBanner(`Client email sent to ${currentProject.client_email}.`, "success");
    } else {
      let copied = false;
      if (data.link && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.link);
          copied = true;
        } catch (clipboardError) {
          console.warn("Client link copy fallback failed:", clipboardError);
        }
      }
      await loadProject();
      showBanner(
        data.provider === "not_configured"
          ? copied
            ? "Automatic email sending is not configured yet. Client review link copied instead."
            : "Automatic email sending is not configured yet. Copy the client link manually from Client review."
          : copied
          ? "Client email was not sent. Client review link copied instead."
          : "Client email was not sent. Copy the client link manually from Client review.",
        "warning"
      );
    }
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not prepare client email.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function updateSuggestionStatus(suggestion, status, button) {
  const responseNote = suggestionResponseNote?.value.trim();
  const proposedPrice = suggestionResponsePrice?.value;

  setButtonLoading(button, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/suggestions/${encodeURIComponent(suggestion.id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status,
        responseNote,
        proposedPrice
      })
    });

    await readJsonResponse(response, "Could not update suggestion.");
    if (suggestionResponseNote) suggestionResponseNote.value = "";
    if (suggestionResponsePrice) suggestionResponsePrice.value = "";
    await loadProject();
    showBanner("Suggestion updated.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not update suggestion.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function createChangeFromSuggestion(suggestion, button) {
  const responseNote = suggestionResponseNote?.value.trim();
  const price = suggestionResponsePrice?.value || suggestion.proposed_price;

  if (Number(price) <= 0 || Number.isNaN(Number(price))) {
    showBanner("Enter a positive value before creating a change request.", "error");
    return;
  }

  setButtonLoading(button, true, "Creating...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/suggestions/${encodeURIComponent(suggestion.id)}/create-change`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          price,
          responseNote
        })
      }
    );

    await readJsonResponse(response, "Could not create change request.");
    if (suggestionResponseNote) suggestionResponseNote.value = "";
    if (suggestionResponsePrice) suggestionResponsePrice.value = "";
    await loadProject();
    showBanner("Suggestion accepted as a paid change request.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not create change request.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

async function addOwnerUpdate() {
  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  setButtonLoading(ownerAddUpdateBtn, true, "Adding...");

  try {
    const image = await fileToDataUrl(ownerUpdateImage);
    const message = ownerUpdateMessage?.value.trim();

    if (!message && !image) {
      showBanner("Add a note or image first.", "error");
      return;
    }

    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/project/${encodeURIComponent(currentProjectId)}/updates`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ message, image })
      }
    );

    await readJsonResponse(response, "Could not add update.");
    if (ownerUpdateMessage) ownerUpdateMessage.value = "";
    if (ownerUpdateImage) ownerUpdateImage.value = "";
    await loadProject();
    showBanner("Progress update added.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not add update.", "error");
  } finally {
    setButtonLoading(ownerAddUpdateBtn, false, "Add update");
  }
}

async function addDeliverable() {
  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  const title = deliverableTitle?.value.trim();
  const note = deliverableNote?.value.trim();

  if (!title) {
    showBanner("Add a deliverable title first.", "error");
    return;
  }

  setButtonLoading(addDeliverableBtn, true, "Adding...");

  try {
    const image = await fileToDataUrl(deliverableImage);

    if (!image) {
      showBanner("Upload a deliverable file first.", "error");
      return;
    }

    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/project/${encodeURIComponent(currentProjectId)}/deliverables`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ title, note, image })
      }
    );

    await readJsonResponse(response, "Could not add deliverable.");
    if (deliverableTitle) deliverableTitle.value = "";
    if (deliverableNote) deliverableNote.value = "";
    if (deliverableImage) deliverableImage.value = "";
    await loadProject();
    showBanner("Deliverable added.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not add deliverable.", "error");
  } finally {
    setButtonLoading(addDeliverableBtn, false, "Add deliverable");
  }
}

// =======================
// CLIENT VIEW
// =======================
async function loadSharedProject() {
  const response = await fetch(
    `${API_URL}/public/project/${encodeURIComponent(shareId)}${getShareTokenQuery()}`
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && data?.requiresVerification) {
      renderClientVerification(data.project || {});
      showBanner("Enter the access code from your Scopey email to open this project.", "warning");
      return;
    }

    throw new Error(data?.error || "Could not load shared project.");
  }

  isClientView = true;
  currentProject = data.project;
  currentProfile = data.profile || null;
  currentSuggestions = data.suggestions || [];
  currentUpdates = data.updates || [];
  currentProjectPayments = data.projectPayments || [];
  currentActivity = data.activity || [];
  currentGallery = data.gallery || [];
  currentAgreementVersions = data.agreementVersions || [];
  currentDeliverables = data.deliverables || [];
  renderClient(
    data.project,
    data.scopeItems,
    data.changes,
    currentSuggestions,
    currentUpdates,
    currentProfile,
    currentProjectPayments,
    currentGallery,
    currentDeliverables
  );
  applyClientSectionScope(clientSection);

  if (data.collaboration_warning) {
    showBanner(
      `Project loaded, but suggestions and updates are unavailable: ${data.collaboration_warning}`,
      "warning"
    );
  }
}

function renderClient(
  project,
  scopeItems,
  changes,
  suggestions = [],
  updates = [],
  profile = currentProfile,
  payments = [],
  gallery = currentGallery,
  deliverables = currentDeliverables
) {
  setClientVerificationMode(false);
  renderClientProfile(profile);
  clientProjectTitle.textContent = project.title;
  clientProjectSubtitle.textContent = `Client: ${project.client_name} | ${getProjectStatusLabel(project.status)} | Managed by ${getProfileName(profile)}`;
  renderAgreementPreview(clientAgreementPreview, project);

  if (clientAcceptancePanel) {
    clientAcceptancePanel.classList.toggle(
      "hidden",
      Boolean(project.accepted_at) || project.status === "draft" || project.status === "cancelled"
    );
  }
  if (clientAcceptanceStatus) {
    clientAcceptanceStatus.textContent = project.accepted_at
      ? `Accepted by ${project.accepted_by_name || "client"} on ${formatDateTime(project.accepted_at)}.`
      : project.status === "draft"
      ? "The agreement has not been sent for acceptance yet."
      : "Agreement awaiting client acceptance.";
  }
  if (clientAcceptEmail && !clientAcceptEmail.value && project.client_email) {
    clientAcceptEmail.value = project.client_email;
  }
  if (clientCompleteEmail && !clientCompleteEmail.value && project.client_email) {
    clientCompleteEmail.value = project.client_email;
  }

  clientScopeList.innerHTML = "";
  clientPendingList.innerHTML = "";
  clientApprovedList.innerHTML = "";
  clientSuggestionList.innerHTML = "";
  clientUpdateList.innerHTML = "";
  clientPaymentList.innerHTML = "";
  if (clientDeliverableList) clientDeliverableList.innerHTML = "";
  renderGallery(clientGalleryList, gallery);

  if (scopeItems.length === 0) {
    clientScopeList.appendChild(buildEmptyState("No scope items available."));
  } else {
    scopeItems.forEach((item) => {
      clientScopeList.appendChild(
        buildListRow(item.title, `Included | ${formatCurrency(item.price)}`)
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
        buildListRow(change.title, `Pending | ${formatCurrency(change.price)}`, payBtn)
      );
    });
  }

  if (payments.length === 0) {
    clientPaymentList.appendChild(buildEmptyState("No project payments are due right now."));
  } else {
    payments.forEach((payment) => {
      clientPaymentList.appendChild(buildPaymentRow(payment, { clientPay: true }));
    });
  }

  if (approved.length === 0) {
    clientApprovedList.appendChild(buildEmptyState("No approved changes yet."));
  } else {
    approved.forEach((change) => {
      const label = document.createElement("span");
      label.textContent = "Approved";

      const subtitle = change.paid_at
        ? `Approved | ${formatCurrency(change.price)} | Paid ${new Date(change.paid_at).toLocaleString()}`
        : `Approved | ${formatCurrency(change.price)}`;

      clientApprovedList.appendChild(buildListRow(change.title, subtitle, label));
    });
  }

  if (suggestions.length === 0) {
    clientSuggestionList.appendChild(buildEmptyState("No suggestions have been sent yet."));
  } else {
    suggestions.forEach((suggestion) => {
      const details = [suggestion.details, suggestion.response_note && `Response: ${suggestion.response_note}`]
        .filter(Boolean)
        .join("\n");

      clientSuggestionList.appendChild(
        buildCollaborationCard(
          suggestion.title,
          suggestionSubtitle(suggestion),
          details,
          suggestion.image_url,
          buildStatusPill(suggestion.status || "suggested", getSuggestionStatusKind(suggestion.status))
        )
      );
    });
  }

  if (updates.length === 0) {
    clientUpdateList.appendChild(buildEmptyState("No shared updates yet."));
  } else {
    updates.forEach((update) => {
      const title = getUpdateTitle(update, profile);
      clientUpdateList.appendChild(
        buildCollaborationCard(
          title,
          formatDateTime(update.created_at),
          update.message,
          update.image_url,
          buildStatusPill(getUpdatePillText(update, profile))
        )
      );
    });
  }

  if (clientCompletionCopy) {
    clientCompletionCopy.textContent =
      project.status === "complete"
        ? `Completed${project.completed_at ? ` on ${formatDateTime(project.completed_at)}` : ""}.`
        : project.status === "awaiting_final_approval"
        ? "The project is ready for final approval. Approve it when the agreed work is complete."
        : "Final approval will appear here when the project is ready for sign-off.";
  }
  clientCompletionPanel?.classList.toggle("hidden", project.status !== "awaiting_final_approval");

  if (clientDeliverableList) {
    if (!deliverables.length) {
      clientDeliverableList.appendChild(buildEmptyState("No final deliverables have been shared yet."));
    } else {
      deliverables.forEach((deliverable) => {
        clientDeliverableList.appendChild(
          buildDeliverableRow(deliverable, { clientApprove: true })
        );
      });
    }
  }
}

async function verifyClientAccess() {
  const accessCode = clientAccessCode?.value.trim();

  if (!accessCode) {
    showBanner("Enter the access code from your email first.", "error");
    return;
  }

  clientAccessCodeValue = accessCode;
  if (clientToken) {
    sessionStorage.setItem(`scopey-access-${clientToken}`, accessCode);
  }

  setButtonLoading(clientVerifyBtn, true, "Verifying...");

  try {
    await loadSharedProject();
    showBanner("Project unlocked.", "success");
  } catch (error) {
    if (clientToken) sessionStorage.removeItem(`scopey-access-${clientToken}`);
    clientAccessCodeValue = "";
    console.error(error);
    renderClientVerification(currentProject || {});
    showBanner(error.message || "Could not verify this access code.", "error");
  } finally {
    setButtonLoading(clientVerifyBtn, false, "Verify");
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
        changeId: change.id,
        section: clientSection,
        token: clientToken
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

async function startProjectPayment(payment, event) {
  if (isBusy) return;
  isBusy = true;

  const button = event.target;
  setButtonLoading(button, true, "Redirecting...");

  try {
    const response = await fetch(`${API_URL}/public/create-project-payment-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shareId,
        paymentId: payment.id,
        section: clientSection,
        token: clientToken
      })
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data?.error || "Could not start payment.");
    }

    window.location.href = data.url;
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not start payment.", "error");
    setButtonLoading(button, false);
    isBusy = false;
  }
}

async function acceptAgreement() {
  const clientName = clientAcceptName?.value.trim();
  const clientEmail = clientAcceptEmail?.value.trim();

  if (!clientName) {
    showBanner("Add your name before accepting the agreement.", "error");
    return;
  }

  setButtonLoading(clientAcceptAgreementBtn, true, "Accepting...");

  try {
    const response = await fetch(
      `${API_URL}/public/project/${encodeURIComponent(shareId)}/accept-agreement`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ clientName, clientEmail })
      }
    );

    await readJsonResponse(response, "Could not accept agreement.");
    await loadSharedProject();
    showBanner("Agreement accepted.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not accept agreement.", "error");
  } finally {
    setButtonLoading(clientAcceptAgreementBtn, false, "Accept agreement");
  }
}

async function approveCompletion() {
  const clientName = clientCompleteName?.value.trim();
  const clientEmail = clientCompleteEmail?.value.trim();

  if (!clientName) {
    showBanner("Add your name before approving completion.", "error");
    return;
  }

  setButtonLoading(clientApproveCompletionBtn, true, "Approving...");

  try {
    const response = await fetch(
      `${API_URL}/public/project/${encodeURIComponent(shareId)}/approve-completion`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ clientName, clientEmail })
      }
    );

    await readJsonResponse(response, "Could not approve completion.");
    await loadSharedProject();
    showBanner("Project completion approved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not approve completion.", "error");
  } finally {
    setButtonLoading(clientApproveCompletionBtn, false, "Approve completion");
  }
}

async function approveDeliverable(deliverable, button) {
  const clientName = clientCompleteName?.value.trim() || clientAcceptName?.value.trim();
  const clientEmail = clientCompleteEmail?.value.trim() || clientAcceptEmail?.value.trim();

  if (!clientName) {
    showBanner("Add your name in the final approval section before approving deliverables.", "error");
    return;
  }

  setButtonLoading(button, true, "Approving...");

  try {
    const response = await fetch(
      `${API_URL}/public/project/${encodeURIComponent(shareId)}/deliverables/${encodeURIComponent(deliverable.id)}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ clientName, clientEmail })
      }
    );

    await readJsonResponse(response, "Could not approve deliverable.");
    await loadSharedProject();
    showBanner("Deliverable approved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not approve deliverable.", "error");
  } finally {
    setButtonLoading(button, false, "Approve");
  }
}

async function submitClientSuggestion() {
  const title = clientSuggestionTitle?.value.trim();
  const details = clientSuggestionDetails?.value.trim();
  const proposedPrice = clientSuggestionPrice?.value;

  if (!title) {
    showBanner("Add a suggestion title first.", "error");
    return;
  }

  setButtonLoading(clientAddSuggestionBtn, true, "Sending...");

  try {
    const image = await fileToDataUrl(clientSuggestionImage);
    const response = await fetch(
      `${API_URL}/public/project/${encodeURIComponent(shareId)}/suggestions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          details,
          proposedPrice,
          image
        })
      }
    );

    await readJsonResponse(response, "Could not send suggestion.");
    if (clientSuggestionTitle) clientSuggestionTitle.value = "";
    if (clientSuggestionDetails) clientSuggestionDetails.value = "";
    if (clientSuggestionPrice) clientSuggestionPrice.value = "";
    if (clientSuggestionImage) clientSuggestionImage.value = "";
    await loadSharedProject();
    showBanner("Suggestion sent for review.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not send suggestion.", "error");
  } finally {
    setButtonLoading(clientAddSuggestionBtn, false, "Send");
  }
}

async function submitClientUpdate() {
  setButtonLoading(clientAddUpdateBtn, true, "Adding...");

  try {
    const message = clientUpdateMessage?.value.trim();
    const image = await fileToDataUrl(clientUpdateImage);

    if (!message && !image) {
      showBanner("Add a note or image first.", "error");
      return;
    }

    const response = await fetch(
      `${API_URL}/public/project/${encodeURIComponent(shareId)}/updates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message, image })
      }
    );

    await readJsonResponse(response, "Could not add note.");
    if (clientUpdateMessage) clientUpdateMessage.value = "";
    if (clientUpdateImage) clientUpdateImage.value = "";
    await loadSharedProject();
    showBanner("Note added.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not add note.", "error");
  } finally {
    setButtonLoading(clientAddUpdateBtn, false, "Add note");
  }
}

// =======================
// INIT
// =======================
async function initOwnerView() {
  try {
    clearBanner();
    updateAuthButtons(true);
    setView("owner");
    renderOwnerEmptyWorkspace();

    await loadBilling();
    await loadProfile();
    await loadAgreementTemplates();
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
    updateAuthButtons(true);
    setView("owner");
    renderOwnerEmptyWorkspace();
    showBanner(
      error?.message
        ? `Could not load your dashboard: ${error.message}`
        : "Could not load your dashboard.",
      "warning"
    );
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
    showBanner(
      error?.message
        ? `This shared project could not be loaded: ${error.message}`
        : "This shared project could not be loaded.",
      "error"
    );
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
    updateAuthButtons(hasStoredAuthSession());
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
landingFreeBtn?.addEventListener("click", openAuthModal);
landingProBtn?.addEventListener("click", () => startUpgradeCheckout("pro", landingProBtn));
landingBusinessBtn?.addEventListener("click", () =>
  startUpgradeCheckout("business", landingBusinessBtn)
);
closeAuthBtn?.addEventListener("click", closeAuthModal);

authSubmitBtn?.addEventListener("click", handlePasswordAuth);
authMagicLinkBtn?.addEventListener("click", sendMagicLink);

signOutBtn?.addEventListener("click", signOut);
dashboardBtn?.addEventListener("click", openDashboard);

if (signOutBtn) signOutBtn.onclick = signOut;
if (dashboardBtn) dashboardBtn.onclick = openDashboard;

document.addEventListener("click", (event) => {
  const target = event.target.closest?.("#header-sign-out-btn, #header-dashboard-btn");
  if (!target) return;

  event.preventDefault();

  if (target.id === "header-sign-out-btn") {
    signOut();
  }

  if (target.id === "header-dashboard-btn") {
    openDashboard();
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
emailClientBtn?.addEventListener("click", emailClientProject);
emailClientBtnSecondary?.addEventListener("click", emailClientProject);

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
customiseProfileBtn?.addEventListener("click", () => setBusinessProfileEditing(true));
cancelProfileBtn?.addEventListener("click", () => setBusinessProfileEditing(false));
saveProfileBtn?.addEventListener("click", saveProfile);
upgradeProBtn?.addEventListener("click", () => startUpgradeCheckout("pro", upgradeProBtn));
upgradeBusinessBtn?.addEventListener("click", () =>
  startUpgradeCheckout("business", upgradeBusinessBtn)
);
saveAgreementBtn?.addEventListener("click", saveAgreement);
sendAgreementBtn?.addEventListener("click", () => updateProjectStatus("sent", sendAgreementBtn));
applyTemplateBtn?.addEventListener("click", applySelectedTemplate);
saveTemplateBtn?.addEventListener("click", saveAgreementTemplate);
exportAgreementBtn?.addEventListener("click", exportAgreement);
saveProjectDetailsBtn?.addEventListener("click", saveProjectDetails);
archiveProjectBtn?.addEventListener("click", toggleProjectArchive);
deleteProjectBtn?.addEventListener("click", () => openProjectDeleteModal(currentProject));
closeDeleteProjectBtn?.addEventListener("click", closeProjectDeleteModals);
closeDeleteProjectFinalBtn?.addEventListener("click", closeProjectDeleteModals);
cancelDeleteProjectBtn?.addEventListener("click", closeProjectDeleteModals);
continueDeleteProjectBtn?.addEventListener("click", openProjectDeleteFinalModal);
backDeleteProjectBtn?.addEventListener("click", () => {
  deleteProjectFinalModal?.setAttribute("aria-hidden", "true");
  deleteProjectModal?.setAttribute("aria-hidden", "false");
});
confirmDeleteProjectBtn?.addEventListener("click", deleteProject);
addScopeBtn?.addEventListener("click", addScopeItem);
addChangeBtn?.addEventListener("click", addChange);
addPaymentBtn?.addEventListener("click", addProjectPayment);
ownerAddUpdateBtn?.addEventListener("click", addOwnerUpdate);
addDeliverableBtn?.addEventListener("click", addDeliverable);
startWorkBtn?.addEventListener("click", () => updateProjectStatus("in_progress", startWorkBtn));
requestFinalBtn?.addEventListener("click", () =>
  updateProjectStatus("awaiting_final_approval", requestFinalBtn)
);
completeProjectBtn?.addEventListener("click", () =>
  updateProjectStatus("complete", completeProjectBtn)
);
cancelProjectBtn?.addEventListener("click", () =>
  updateProjectStatus("cancelled", cancelProjectBtn)
);
clientAddSuggestionBtn?.addEventListener("click", submitClientSuggestion);
clientAddUpdateBtn?.addEventListener("click", submitClientUpdate);
clientAcceptAgreementBtn?.addEventListener("click", acceptAgreement);
clientApproveCompletionBtn?.addEventListener("click", approveCompletion);
clientVerifyBtn?.addEventListener("click", verifyClientAccess);

db.auth.onAuthStateChange(async (event, session) => {
  currentUser = session?.user || null;

  if (shareId) return;

  if (currentUser) {
    resetAuthLoadingState();
    closeAuthModal();
    updateAuthButtons(true);

    if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
      initOwnerView();
    }
  } else {
    updateAuthButtons(false);
    setView("landing");
  }
});

window.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
  if (event.target === accessibilityModal) closeAccessibilityModal();
  if (event.target === deleteProjectModal || event.target === deleteProjectFinalModal) {
    closeProjectDeleteModals();
  }
});

window.ScopeyActions = {
  openDashboard,
  signOut
};

init();
