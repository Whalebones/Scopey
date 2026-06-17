/* global supabase */

const SUPABASE_URL = "https://nxqwrlbwnaqntuvcspln.supabase.co";
const SUPABASE_KEY = "sb_publishable_TVcQqAhasEthm_LoHFjmYw_OUbo3i5v";
function getDefaultApiUrl() {
  const { hostname, origin, port } = window.location;
  const isLocalStaticServer = port === "5500";
  const isNetlifyHost = hostname.endsWith(".netlify.app") || hostname.endsWith(".netlify.dev");
  const isScopeyDomain = hostname === "scopey.co.uk" || hostname === "www.scopey.co.uk";

  if (isLocalStaticServer) return "http://localhost:3000";
  if (hostname === "www.scopey.co.uk") return "https://scopey.co.uk/api";
  if (isNetlifyHost || isScopeyDomain) return `${origin}/api`;
  return origin;
}

const API_URL =
  window.SCOPEY_API_URL ||
  getDefaultApiUrl();
const APP_URL = window.SCOPEY_PUBLIC_URL || window.location.origin;

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =======================
// STATE
// =======================
let currentUser = null;
let currentProjectId = null;
let currentProject = null;
let currentProjects = [];
let currentArchivedProjects = [];
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
let currentContentReports = [];
let currentProfile = null;
let currentBilling = null;
let currentPaymentAccount = null;
let currentAdminReadiness = null;
let currentRights = null;
let currentProjectTab = "overview";
let currentGuidedAction = null;
let selectedBillingPlanKey = null;
let selectedRightsArtworkId = null;
let pendingRightsConflicts = [];
let pendingContentReport = null;
let pendingReportReview = null;
let isCreatingProject = false;
let isOpeningDashboard = false;
let isSigningOut = false;
const recentToastRegistry = new Map();

let isClientView = false;
let isBusy = false;
let authMode = "signin";
let pendingDeleteProject = null;
let pendingProjectAction = null;

const params = new URLSearchParams(window.location.search);
const shareId = params.get("share");
const clientSection = params.get("section") || "all";
const clientToken = params.get("token") || "";
const paymentReturnState = params.get("payments") || "";
let clientAccessCodeValue =
  clientToken && sessionStorage.getItem(`scopey-access-${clientToken}`)
    ? sessionStorage.getItem(`scopey-access-${clientToken}`)
    : "";

const ACCESSIBILITY_KEY = "scopey-accessibility";
const SUPABASE_AUTH_KEY_PARTS = ["supabase", "auth", "token"];
const API_FETCH_TIMEOUT_MS = 8000;
const BACKGROUND_FETCH_TIMEOUT_MS = 3500;
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
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RIGHTS_USAGE_LABELS = {
  print: "Print",
  merchandise: "Merchandise",
  digital: "Digital",
  packaging: "Packaging",
  advertising: "Advertising",
  all_uses: "All uses"
};
const RIGHTS_TERRITORY_LABELS = {
  worldwide: "Worldwide",
  uk: "UK",
  eu: "EU",
  north_america: "North America"
};
const POLICY_VERSIONS = {
  terms: "2026-06-15",
  privacy: "2026-06-15"
};
const PUBLIC_BETA_FREE_ONLY = true;

// =======================
// DOM REFERENCES
// =======================
const bannerEl = document.getElementById("banner");
const toastRegion = document.getElementById("toast-region");
const landingView = document.getElementById("landing-view");
const ownerView = document.getElementById("owner-view");
const clientView = document.getElementById("client-view");

const signInBtn = document.getElementById("header-sign-in-btn");
const signOutBtn = document.getElementById("header-sign-out-btn");
const dashboardBtn = document.getElementById("header-dashboard-btn");
const accountBtn = document.getElementById("header-account-btn");
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
const authLegalConsentWrap = document.getElementById("auth-legal-consent-wrap");
const authLegalConsent = document.getElementById("auth-legal-consent");

const accessibilityButton = document.getElementById("accessibility-button");
const accessibilityModal = document.getElementById("accessibility-modal");
const closeAccessibilityBtn = document.getElementById("close-accessibility-btn");
const resetAccessibilityBtn = document.getElementById("reset-accessibility-btn");
const legalModal = document.getElementById("legal-modal");
const closeLegalBtn = document.getElementById("close-legal-btn");
const legalTitle = document.getElementById("legal-title");
const legalUpdated = document.getElementById("legal-updated");
const legalContent = document.getElementById("legal-content");
const accountModal = document.getElementById("account-modal");
const closeAccountBtn = document.getElementById("close-account-btn");
const accountPlanName = document.getElementById("account-plan-name");
const accountPlanCopy = document.getElementById("account-plan-copy");
const accountProjectUsage = document.getElementById("account-project-usage");
const accountProjectNote = document.getElementById("account-project-note");
const accountPlanGrid = document.getElementById("account-plan-grid");
const paymentSetupStatus = document.getElementById("payment-setup-status");
const stripePaymentStatus = document.getElementById("stripe-payment-status");
const stripePaymentCopy = document.getElementById("stripe-payment-copy");
const connectStripeBtn = document.getElementById("connect-stripe-btn");
const paypalPaymentStatus = document.getElementById("paypal-payment-status");
const paypalEmailInput = document.getElementById("paypal-email");
const paypalUrlInput = document.getElementById("paypal-url");
const savePaypalBtn = document.getElementById("save-paypal-btn");
const developerDiagnosticsBtn = document.getElementById("developer-diagnostics-btn");
const developerDiagnosticsModal = document.getElementById("developer-diagnostics-modal");
const closeDeveloperDiagnosticsBtn = document.getElementById("close-developer-diagnostics-btn");
const developerLaunchScore = document.getElementById("developer-launch-score");
const developerLaunchList = document.getElementById("developer-launch-list");
const createDemoProjectBtn = document.getElementById("create-demo-project-btn");
const demoProjectResult = document.getElementById("demo-project-result");
const demoProjectLink = document.getElementById("demo-project-link");
const demoProjectAccessCode = document.getElementById("demo-project-access-code");
const betaFeedbackBtn = document.getElementById("beta-feedback-btn");
const betaFeedbackModal = document.getElementById("beta-feedback-modal");
const closeBetaFeedbackBtn = document.getElementById("close-beta-feedback-btn");
const cancelBetaFeedbackBtn = document.getElementById("cancel-beta-feedback-btn");
const submitBetaFeedbackBtn = document.getElementById("submit-beta-feedback-btn");
const betaFeedbackCategory = document.getElementById("beta-feedback-category");
const betaFeedbackEmail = document.getElementById("beta-feedback-email");
const betaFeedbackMessage = document.getElementById("beta-feedback-message");

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
const projectActionModal = document.getElementById("project-action-modal");
const closeProjectActionBtn = document.getElementById("close-project-action-btn");
const cancelProjectActionBtn = document.getElementById("cancel-project-action-btn");
const confirmProjectActionBtn = document.getElementById("confirm-project-action-btn");
const projectActionEyebrow = document.getElementById("project-action-eyebrow");
const projectActionTitle = document.getElementById("project-action-title");
const projectActionCopy = document.getElementById("project-action-copy");

const projectListEl = document.getElementById("project-list");
const archivedProjectListEl = document.getElementById("archived-project-list");
const toggleProjectCreateBtn = document.getElementById("toggle-project-create-btn");
const projectCreateCard = document.getElementById("project-create-card");
const projectCreationState = document.getElementById("project-creation-state");
const projectCreationCopy = document.getElementById("project-creation-copy");

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
const billingFeatureList = document.getElementById("billing-feature-list");
const billingPlanCtaBtn = document.getElementById("billing-plan-cta-btn");
const upgradeProBtn = document.getElementById("upgrade-pro-btn");
const upgradeBusinessBtn = document.getElementById("upgrade-business-btn");
const projectLimitNote = document.getElementById("project-limit-note");
const rightsModal = document.getElementById("rights-modal");
const openRightsBtn = document.getElementById("open-rights-btn");
const closeRightsBtn = document.getElementById("close-rights-btn");
const rightsSidebarPill = document.getElementById("rights-sidebar-pill");
const rightsSidebarArtworkCount = document.getElementById("rights-sidebar-artwork-count");
const rightsSidebarLicenseUsage = document.getElementById("rights-sidebar-license-usage");
const rightsModuleName = document.getElementById("rights-module-name");
const rightsPlanPill = document.getElementById("rights-plan-pill");
const rightsLicenseUsage = document.getElementById("rights-license-usage");
const rightsArtworkCount = document.getElementById("rights-artwork-count");
const rightsExportBtn = document.getElementById("rights-export-btn");
const rightsArtworkTitle = document.getElementById("rights-artwork-title");
const rightsArtworkDescription = document.getElementById("rights-artwork-description");
const rightsCreateArtworkBtn = document.getElementById("rights-create-artwork-btn");
const rightsArtworkList = document.getElementById("rights-artwork-list");
const rightsArtworkSelect = document.getElementById("rights-artwork-select");
const rightsLicenseClient = document.getElementById("rights-license-client");
const rightsLicenseUsageType = document.getElementById("rights-license-usage-type");
const rightsLicenseTerritory = document.getElementById("rights-license-territory");
const rightsLicenseExclusive = document.getElementById("rights-license-exclusive");
const rightsLicenseFee = document.getElementById("rights-license-fee");
const rightsLicenseCurrency = document.getElementById("rights-license-currency");
const rightsLicenseStart = document.getElementById("rights-license-start");
const rightsLicenseEnd = document.getElementById("rights-license-end");
const rightsLicenseNotes = document.getElementById("rights-license-notes");
const rightsConflictPanel = document.getElementById("rights-conflict-panel");
const rightsConflictList = document.getElementById("rights-conflict-list");
const rightsAcknowledgeConflict = document.getElementById("rights-acknowledge-conflict");
const rightsCreateLicenseBtn = document.getElementById("rights-create-license-btn");
const reportContentModal = document.getElementById("report-content-modal");
const closeReportContentBtn = document.getElementById("close-report-content-btn");
const cancelReportContentBtn = document.getElementById("cancel-report-content-btn");
const submitReportContentBtn = document.getElementById("submit-report-content-btn");
const reportContentTitle = document.getElementById("report-content-title");
const reportContentContext = document.getElementById("report-content-context");
const reportContentEmail = document.getElementById("report-content-email");
const reportContentReason = document.getElementById("report-content-reason");
const reportContentDetails = document.getElementById("report-content-details");
const reportReviewModal = document.getElementById("report-review-modal");
const closeReportReviewBtn = document.getElementById("close-report-review-btn");
const cancelReportReviewBtn = document.getElementById("cancel-report-review-btn");
const submitReportReviewBtn = document.getElementById("submit-report-review-btn");
const reportReviewTitle = document.getElementById("report-review-title");
const reportReviewContext = document.getElementById("report-review-context");
const reportReviewStatus = document.getElementById("report-review-status");
const reportReviewNote = document.getElementById("report-review-note");
const contentReportSummary = document.getElementById("content-report-summary");
const contentReportList = document.getElementById("content-report-list");

const ownerEmptyState = document.getElementById("owner-empty-state");
const projectWorkspace = document.getElementById("project-workspace");

const copyLinkBtn = document.getElementById("copy-link-btn");
const handoffCopyLinkBtn = document.getElementById("handoff-copy-link-btn");
const clientReviewCopyLinkBtn = document.getElementById("client-review-copy-link-btn");
const previewClientBtn = document.getElementById("preview-client-btn");
const clientPreviewBtn = document.getElementById("client-preview-btn");
const clientPreviewBtnSecondary = document.getElementById("client-preview-btn-secondary");
const emailClientBtn = document.getElementById("email-client-btn");
const handoffEmailClientBtn = document.getElementById("handoff-email-client-btn");
const clientReviewEmailClientBtn = document.getElementById("client-review-email-client-btn");
const setupWizard = document.getElementById("setup-wizard");
const setupStepAgreement = document.getElementById("setup-step-agreement");
const setupStepScope = document.getElementById("setup-step-scope");
const setupStepPayments = document.getElementById("setup-step-payments");
const setupStepClient = document.getElementById("setup-step-client");

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
const projectJourneySteps = document.getElementById("project-journey-steps");
const guidedActionTitle = document.getElementById("guided-action-title");
const guidedActionCopy = document.getElementById("guided-action-copy");
const guidedActionBtn = document.getElementById("guided-action-btn");
const projectMoneyBrief = document.getElementById("project-money-brief");
const projectScopeBrief = document.getElementById("project-scope-brief");
const projectDeliveryBrief = document.getElementById("project-delivery-brief");
const projectReadinessList = document.getElementById("project-readiness-list");

const overviewSummaryCopy = document.getElementById("overview-summary-copy");
const overviewNextAction = document.getElementById("overview-next-action");
const overviewAttentionList = document.getElementById("overview-attention-list");
const handoffSummaryCopy = document.getElementById("handoff-summary-copy");
const handoffStatusChip = document.getElementById("handoff-status-chip");
const handoffLinkScope = document.getElementById("handoff-link-scope");
const handoffEmailState = document.getElementById("handoff-email-state");
const handoffClientAction = document.getElementById("handoff-client-action");
const handoffReadinessList = document.getElementById("handoff-readiness-list");
const handoffPaymentReadinessNote = document.getElementById("handoff-payment-readiness-note");
const handoffSendBtn = document.getElementById("handoff-send-btn");
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
const completionReadinessList = document.getElementById("completion-readiness-list");
const projectTimelineList = document.getElementById("project-timeline-list");

const clientProfileCard = document.getElementById("client-profile-card");
const clientProfileImage = document.getElementById("client-profile-image");
const clientProfileInitial = document.getElementById("client-profile-initial");
const clientProfileName = document.getElementById("client-profile-name");
const clientProfileBio = document.getElementById("client-profile-bio");
const clientLinkProblemCard = document.getElementById("client-link-problem-card");
const clientLinkProblemCopy = document.getElementById("client-link-problem-copy");
const clientLinkHomeBtn = document.getElementById("client-link-home-btn");
const clientScopedContextCard = document.getElementById("client-scoped-context-card");
const clientScopedContextCopy = document.getElementById("client-scoped-context-copy");
const clientProjectTitle = document.getElementById("client-project-title");
const clientProjectSubtitle = document.getElementById("client-project-subtitle");
const clientNextAction = document.getElementById("client-next-action");
const clientStatusChip = document.getElementById("client-status-chip");
const clientSummaryScope = document.getElementById("client-summary-scope");
const clientSummaryChanges = document.getElementById("client-summary-changes");
const clientSummaryPayments = document.getElementById("client-summary-payments");
const clientSummaryDeliverables = document.getElementById("client-summary-deliverables");
const clientPrimaryActionTitle = document.getElementById("client-primary-action-title");
const clientPrimaryActionCopy = document.getElementById("client-primary-action-copy");
const clientPrimaryActionBtn = document.getElementById("client-primary-action-btn");
const clientAttentionList = document.getElementById("client-attention-list");
const clientFlowSteps = document.getElementById("client-flow-steps");
const clientGuidanceGrid = document.getElementById("client-guidance-grid");
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
const clientDeliverableName = document.getElementById("client-deliverable-name");
const clientDeliverableEmail = document.getElementById("client-deliverable-email");
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

const LEGAL_DOCUMENTS = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: 15 June 2026",
    intro:
      "Scopey is operated by Scopey. For privacy questions or requests, contact info@scopey.co.uk.",
    sections: [
      {
        heading: "Who we are",
        body: [
          "Scopey is contactable at info@scopey.co.uk for all privacy-related questions and requests.",
          "ICO registration details will be added once registration is complete."
        ]
      },
      {
        heading: "Personal data we collect",
        body: [
          "Account details: name, email address, authentication identifiers and plan information.",
          "Project data added by users: client names, client email addresses, project scope, agreement text, payments, suggestions, uploaded images and deliverables.",
          "Billing data required to process subscriptions and payment links. Card details are handled directly by Stripe or PayPal and are not stored by Scopey.",
          "Technical data: device and browser information, security logs and essential session data needed to keep the service running securely."
        ]
      },
      {
        heading: "Why we use personal data",
        body: [
          "To provide and operate Scopey accounts, dashboards and shared client pages.",
          "To process subscriptions, payment links, invoices and receipts.",
          "To send service emails including sign-in links, project review links and account notices.",
          "To keep Scopey secure, diagnose faults, prevent misuse and improve the product over time."
        ]
      },
      {
        heading: "Lawful bases",
        body: [
          "Contract: to provide the Scopey service and fulfil paid plan commitments.",
          "Legitimate interests: to secure, maintain and improve Scopey and prevent abuse.",
          "Legal obligation: to keep records required for tax, accounting, compliance or dispute handling.",
          "Consent: where optional cookies or optional integrations are used, consent is obtained separately."
        ]
      },
      {
        heading: "Who we share data with",
        body: [
          "Supabase: authentication, database, file storage and related backend infrastructure.",
          "Stripe: subscription billing, checkout, payment processing and billing records.",
          "PayPal: payment links and payment processing where used by freelancers on the platform.",
          "Resend: transactional emails including sign-in links, project notifications and client review links.",
          "Netlify: web hosting, server runtime and access logs.",
          "Ionos: domain management and domain email services.",
          "Scopey does not sell personal data to third parties and does not use personal data for advertising purposes."
        ]
      },
      {
        heading: "International transfers",
        body: [
          "Some providers may process data outside the UK.",
          "Where this occurs, Scopey relies on appropriate safeguards such as standard contractual clauses or adequacy decisions to protect that data in line with UK GDPR requirements."
        ]
      },
      {
        heading: "Data retention",
        body: [
          "Account and project data is retained while an account is active. When an account is deleted, all associated project data is removed immediately.",
          "Some billing, security and legal records may be retained for longer where required by law, tax obligations or legitimate fraud-prevention purposes."
        ]
      },
      {
        heading: "Your rights",
        body: [
          "UK users have rights under UK GDPR including the right to access, correct, delete, restrict or object to processing of their personal data, and the right to data portability where applicable.",
          "To exercise any of these rights, contact info@scopey.co.uk. Scopey will respond within the legally required timeframe.",
          "Some data may need to be retained for billing, tax, security or dispute reasons even after a deletion request.",
          "UK users who are unhappy with how their data has been handled may complain to the Information Commissioner's Office at ico.org.uk."
        ]
      }
    ]
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: 15 June 2026",
    intro:
      "These terms set the core rules for using Scopey and explain the responsibilities of users, clients and Scopey.",
    sections: [
      {
        heading: "The service",
        body: [
          "Scopey helps freelancers manage commission scope, client communication, approvals, files, payments and rights records.",
          "Features may vary by plan and may change over time as the product develops."
        ]
      },
      {
        heading: "Accounts and responsibilities",
        body: [
          "Users are responsible for keeping account credentials secure and for the accuracy of project, client, payment and rights information they add to Scopey.",
          "Users must have permission to upload, process and share any client data, images, artwork, references or deliverables they place in Scopey."
        ]
      },
      {
        heading: "Ownership",
        body: [
          "Users and their clients keep full ownership of their artwork, project files, client materials and uploaded content.",
          "By using Scopey, users grant Scopey a limited licence to host, process, display and transmit that content only as necessary to provide the service.",
          "This licence ends when the content is deleted or the account is closed.",
          "Scopey owns the Scopey product, software, code, brand, interface, documentation and all related intellectual property."
        ]
      },
      {
        heading: "Plans and billing",
        body: [
          "Free, Pro and Business plans have different limits for active projects, storage, exports, automated emails, payment links and rights records.",
          "Current plan details are shown on the Scopey website.",
          "Paid subscriptions renew automatically until cancelled. Prices, applicable taxes and billing cycles are displayed before checkout.",
          "Users remain solely responsible for freelancer-client contracts, taxes, invoice accuracy and any payment disputes with their own clients.",
          "Scopey is a workflow tool and is not a party to freelancer-client agreements."
        ]
      },
      {
        heading: "Termination",
        body: [
          "Users may cancel their account or subscription at any time using the controls available in their Scopey account settings.",
          "Scopey may suspend or terminate accounts that breach these terms, misuse the service, create a security risk or fail to pay for a paid plan.",
          "Where reasonably practicable, Scopey will notify the user before taking action."
        ]
      },
      {
        heading: "Limits of liability",
        body: [
          "Scopey is a workflow and record-keeping tool. It does not replace legal, tax, financial or intellectual property advice, and nothing in Scopey constitutes such advice.",
          "To the extent permitted by applicable law, Scopey is not liable for user-client disputes, inaccurate project records, rights decisions or losses arising from misuse of the service."
        ]
      }
    ]
  },
  "acceptable-use": {
    title: "Acceptable Use Policy",
    updated: "Last updated: 15 June 2026",
    intro:
      "Scopey is a professional tool for freelancers and their clients. Users agree not to use Scopey for the following.",
    sections: [
      {
        heading: "Prohibited use",
        body: [
          "Uploading, sharing or storing content that is unlawful, harmful, threatening, abusive, defamatory or otherwise objectionable.",
          "Infringing the intellectual property rights of any third party, including uploading artwork or materials without the right to do so.",
          "Misrepresenting project scope, agreement terms or payment records to deceive clients or third parties.",
          "Attempting to gain unauthorised access to other users' accounts, project data or client information.",
          "Using Scopey to facilitate spam, phishing or any form of fraudulent communication.",
          "Circumventing, disabling or otherwise interfering with security features of the service.",
          "Reselling, sublicensing or otherwise commercialising access to Scopey without permission."
        ]
      },
      {
        heading: "Reports and enforcement",
        body: [
          "Freelancers and clients can report project messages, suggestions or uploaded images that may breach Scopey's usage rules.",
          "Reports are recorded against the project so the account owner can review the concern, preserve context and take action where needed.",
          "Scopey reserves the right to remove content or suspend accounts that breach this policy.",
          "Serious or repeated breaches may result in permanent account termination."
        ]
      }
    ]
  },
  cookies: {
    title: "Cookie Policy",
    updated: "Last updated: 15 June 2026",
    intro:
      "Scopey uses a small number of essential cookies and similar technologies required for the service to function.",
    sections: [
      {
        heading: "What cookies Scopey uses",
        body: [
          "Scopey uses essential cookies and session storage that keep users signed in and protect account access.",
          "Scopey does not currently use advertising cookies, third-party tracking cookies or non-essential analytics cookies.",
          "If this changes, this policy and the Privacy Policy will be updated and consent will be requested where required."
        ]
      },
      {
        heading: "Managing cookies",
        body: [
          "Essential cookies cannot be disabled without affecting how Scopey works.",
          "Browser settings can be used to block or delete cookies, but doing so may prevent sign-in and other core features from functioning correctly."
        ]
      }
    ]
  },
  refunds: {
    title: "Refund and Cancellation Policy",
    updated: "Last updated: 15 June 2026",
    intro:
      "This policy explains how Scopey subscriptions, cancellations and refunds are handled.",
    sections: [
      {
        heading: "Subscriptions",
        body: [
          "Paid plans renew automatically at the end of each billing period unless cancelled beforehand.",
          "Cancelling a paid plan will stop future renewals.",
          "Access to paid features continues until the end of the current paid billing period."
        ]
      },
      {
        heading: "UK consumer cooling-off period",
        body: [
          "If a user purchases a Scopey paid plan as a consumer, they may have a statutory 14-day cooling-off right under UK distance selling regulations.",
          "At checkout, users who request immediate access to Scopey's digital services will be asked to acknowledge that exercising this right to start the service may affect their ability to cancel once the service has begun or been fully supplied.",
          "Business customers purchasing Scopey for professional use may not have the same statutory cancellation rights as individual consumers."
        ]
      },
      {
        heading: "Refunds",
        body: [
          "Refunds will be provided where required by law or where a billing error has occurred.",
          "Outside of statutory rights, refunds are not offered as a matter of routine but may be considered at Scopey's discretion in exceptional circumstances."
        ]
      },
      {
        heading: "Client payments",
        body: [
          "Payments made between freelancers and their clients through Scopey payment links are processed by Stripe or PayPal.",
          "Scopey provides payment link tooling only and is not the merchant of record for freelancer-client transactions.",
          "Disputes relating to those payments are between the freelancer, their client and the payment provider."
        ]
      },
      {
        heading: "Checkout notice",
        body: [
          "At the point of subscription, users will be shown the following notice.",
          "By subscribing, you agree to Scopey's Terms, Privacy Policy and Refund and Cancellation Policy. You are requesting immediate access to Scopey digital services and understand that this may affect any statutory cooling-off cancellation rights once access has begun."
        ]
      }
    ]
  },
  subprocessors: {
    title: "Sub-processor List",
    updated: "Last updated: 15 June 2026",
    intro:
      "This list identifies the third-party providers that may process personal data in order for Scopey to operate.",
    sections: [
      {
        heading: "Current providers",
        body: [
          "Supabase: authentication, database, file storage and related backend infrastructure.",
          "Stripe: subscription billing, checkout, payment links and payment records.",
          "PayPal: payment links and payment processing where used by freelancers on the platform.",
          "Resend: transactional emails including sign-in links, project notifications and client review links.",
          "Netlify: web hosting, server runtime and operational access logs.",
          "Ionos: domain management and domain email services."
        ]
      },
      {
        heading: "Conditional providers",
        body: [
          "An AI provider such as Anthropic or OpenAI will only be added if AI-assisted features are introduced that process user content.",
          "An analytics provider will only be added if non-essential analytics are enabled and reflected in the Cookie Policy."
        ]
      },
      {
        heading: "Changes to this list",
        body: [
          "Scopey may update this list when providers change.",
          "Business-tier customers will be given reasonable notice of material sub-processor changes where required by their plan terms."
        ]
      }
    ]
  },
  dpa: {
    title: "Data Processing Addendum Note",
    updated: "Last updated: 15 June 2026",
    intro:
      "This note applies to Business-tier customers and organisations that require a formal Data Processing Addendum as part of their own GDPR or data protection compliance.",
    sections: [
      {
        heading: "Roles",
        body: [
          "For project data added by Scopey users and shared with their clients, the Scopey user is the data controller and Scopey acts as a data processor providing hosted software.",
          "For Scopey's own account, billing, security and product data, Scopey acts as an independent data controller."
        ]
      },
      {
        heading: "Current status",
        body: [
          "A full, professionally reviewed DPA will be made available to Business-tier customers before paid Business subscriptions go live.",
          "Organisations requiring a DPA before that point should contact info@scopey.co.uk to discuss their requirements."
        ]
      },
      {
        heading: "Sub-processors",
        body: [
          "A public sub-processor list covering all current providers is available in the Sub-processor List and on the Scopey website.",
          "Business-tier customers will receive reasonable notice of material sub-processor changes."
        ]
      }
    ]
  }
};

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

function getAppUrl(path = "/") {
  return new URL(path, APP_URL).toString();
}

function formatCurrency(value, currency = getProjectCurrency()) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value || 0);
}

function showBanner(message, kind = "info") {
  if (bannerEl) {
    bannerEl.textContent = message;
    bannerEl.className = `banner ${kind}`;
    bannerEl.style.display = "block";
  }
  showToast(message, kind);
}

function clearBanner() {
  if (!bannerEl) return;
  bannerEl.textContent = "";
  bannerEl.style.display = "none";
}

function showToast(message, kind = "info") {
  if (!toastRegion || !message) return;

  const key = `${kind}:${message}`;
  const now = Date.now();
  const lastShownAt = recentToastRegistry.get(key) || 0;
  if (now - lastShownAt < 1600) return;
  recentToastRegistry.set(key, now);
  recentToastRegistry.forEach((shownAt, toastKey) => {
    if (now - shownAt > 8000) recentToastRegistry.delete(toastKey);
  });

  const toast = document.createElement("div");
  toast.className = `toast toast-${kind}`;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");

  const body = document.createElement("div");
  body.className = "toast-body";
  const title = document.createElement("strong");
  title.textContent =
    kind === "success" ? "Done" : kind === "error" ? "Needs attention" : kind === "warning" ? "Check this" : "Scopey";
  const copy = document.createElement("p");
  copy.textContent = message;
  body.appendChild(title);
  body.appendChild(copy);

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "x";
  close.addEventListener("click", () => toast.remove());

  toast.appendChild(body);
  toast.appendChild(close);
  toastRegion.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("toast-exiting");
    window.setTimeout(() => toast.remove(), 220);
  }, kind === "error" ? 7000 : 4600);
}

function getCurrentPlanKey() {
  return currentBilling?.plan?.key || currentBilling?.plan?.plan || "free";
}

function getCurrentPlanName() {
  return currentBilling?.plan?.name || "Free";
}

function getFallbackBillingOverview() {
  return {
    plan: {
      key: "free",
      plan: "free",
      name: "Free",
      summary: "Free includes one active client project.",
      priceLabel: "Free"
    },
    usage: {
      activeProjects: getActiveProjectUsage()
    },
    plans: [
      {
        key: "free",
        name: "Free",
        summary: "Free includes one active client project.",
        priceLabel: "Free"
      }
    ]
  };
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
  if (PUBLIC_BETA_FREE_ONLY) {
    showBanner(`${message} Paid plans are coming soon. Scopey is free during public beta.`, "warning");
    return;
  }

  const planName = plan === "business" ? "Business" : "Pro";
  showBanner(`${message} Upgrade to ${planName} when you're ready.`, "warning");
}

function userHasPlan(requiredPlan = "pro") {
  const ranks = { free: 0, pro: 1, business: 2 };
  return (ranks[getCurrentPlanKey()] || 0) >= (ranks[requiredPlan] || 0);
}

function requirePlan(requiredPlan, feature) {
  if (userHasPlan(requiredPlan)) return true;

  if (PUBLIC_BETA_FREE_ONLY) {
    showBanner(`${feature} will be available when paid plans launch.`, "warning");
    openAccountModal();
    return false;
  }

  const planName = requiredPlan === "business" ? "Business" : "Pro";
  showBanner(`${feature} is included with ${planName}.`, "warning");
  openAccountModal();
  return false;
}

function setLockedControl(control, isLocked, label, lockedLabel) {
  if (!control) return;
  const emailControl = [emailClientBtn, handoffEmailClientBtn, clientReviewEmailClientBtn].includes(control);
  const effectiveLocked = emailControl ? false : isLocked;
  control.classList.toggle("plan-locked", effectiveLocked);
  control.title = effectiveLocked
    ? PUBLIC_BETA_FREE_ONLY
      ? `${label} is coming soon`
      : `${label} is included with Pro`
    : "";
  control.textContent = effectiveLocked
    ? PUBLIC_BETA_FREE_ONLY
      ? `${label} - Coming soon`
      : `${label} - Pro`
    : label;
}

function renderPlanLockedStates() {
  const proLocked = !userHasPlan("pro");
  setLockedControl(emailClientBtn, proLocked, "Email client", "Email client · Pro");
  setLockedControl(handoffEmailClientBtn, proLocked, "Email client", "Email client · Pro");
  setLockedControl(clientReviewEmailClientBtn, proLocked, "Email client", "Email client · Pro");
  setLockedControl(saveTemplateBtn, proLocked, "Save template", "Save template · Pro");
  setLockedControl(exportAgreementBtn, proLocked, "Export agreement", "Export agreement · Pro");
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
  document.body.classList.toggle("app-view-active", mode === "owner" || mode === "client");

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

const EMPTY_STATE_CONTENT = {
  "No active projects.": {
    title: "No active projects yet",
    copy: "Create a client workspace when you are ready to track scope, terms and approvals.",
    actionLabel: "New project",
    action: () => setProjectCreateVisible(true, true)
  },
  "No archived projects.": {
    title: "No archived projects",
    copy: "Completed, cancelled or manually archived work will appear here for reference."
  },
  "No scope items yet.": {
    title: "No included scope yet",
    copy: "Add the work covered by the original price so future extras are easy to separate.",
    actionLabel: "Add scope item",
    tab: "scope"
  },
  "No scope items available.": {
    title: "Scope has not been shared yet",
    copy: "Included work will appear here once it is added to the project."
  },
  "No pending changes.": {
    title: "No paid extras waiting",
    copy: "When a client asks for something outside the original scope, add it here with a clear value.",
    actionLabel: "Add change",
    tab: "changes"
  },
  "There are no pending changes.": {
    title: "No pending changes",
    copy: "The client has no paid extras waiting for review right now."
  },
  "No approved changes.": {
    title: "No approved extras yet",
    copy: "Approved paid changes will build a useful record beside the original agreement."
  },
  "No approved changes yet.": {
    title: "No approved extras yet",
    copy: "Approved paid changes will appear here once the client accepts them."
  },
  "No agreement versions yet.": {
    title: "No saved agreement versions",
    copy: "Save the agreement to start a clean record of terms and revisions.",
    actionLabel: "Open agreement",
    tab: "agreement"
  },
  "No project payments yet.": {
    title: "No project payments yet",
    copy: "Add deposits, milestones or final balances when you want payment expectations visible.",
    actionLabel: "Add payment",
    tab: "payments"
  },
  "No client suggestions yet.": {
    title: "No client suggestions yet",
    copy: "Client ideas and references will appear here when they submit them from the shared page."
  },
  "No shared updates yet.": {
    title: "No progress updates yet",
    copy: "Share a short note or image when you want the client to understand progress.",
    actionLabel: "Add update",
    tab: "updates"
  },
  "No project milestones yet.": {
    title: "No timeline events yet",
    copy: "Sending, acceptance, completion and important project activity will appear here."
  },
  "No final deliverables yet.": {
    title: "No final deliverables yet",
    copy: "Upload final files or proof images when the project is ready for approval.",
    actionLabel: "Add deliverable",
    tab: "deliverables"
  },
  "No project images have been uploaded yet.": {
    title: "No project images yet",
    copy: "Images from updates, suggestions and deliverables will collect here automatically."
  },
  "The original scope has not been added yet.": {
    title: "Scope is still being prepared",
    copy: "The included work will appear here once the freelancer adds it."
  },
  "No paid changes are waiting for approval.": {
    title: "No paid changes waiting",
    copy: "Extra work requests that need approval or payment will appear here."
  },
  "No deposits, milestones or balances are due right now.": {
    title: "No payments due",
    copy: "Deposits, milestones and balances will appear here when payment is needed."
  },
  "Approved paid changes will be recorded here.": {
    title: "No approved changes yet",
    copy: "Paid extras will be recorded here once they are approved."
  },
  "Client ideas and freelancer responses will appear here.": {
    title: "No suggestions yet",
    copy: "Use this area for new ideas, references or change suggestions."
  },
  "Progress notes, reference images and decision updates will appear here.": {
    title: "No updates yet",
    copy: "Project notes, images and decisions will appear here as the work moves forward."
  },
  "Final files will appear here when they are ready for approval.": {
    title: "No final files yet",
    copy: "Final deliverables will appear here when they are ready to review."
  }
};

function buildEmptyState(content) {
  const config =
    typeof content === "string"
      ? EMPTY_STATE_CONTENT[content] || { title: content, copy: "" }
      : content;
  const div = document.createElement("div");
  div.className = "empty-state";

  const title = document.createElement("strong");
  title.textContent = config.title || "";
  div.appendChild(title);

  if (config.copy) {
    const copy = document.createElement("p");
    copy.textContent = config.copy;
    div.appendChild(copy);
  }

  if (config.actionLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary btn-small";
    button.textContent = config.actionLabel;
    button.addEventListener("click", () => {
      if (typeof config.action === "function") {
        config.action();
        return;
      }
      if (config.tab) setCurrentProjectTab(config.tab);
    });
    div.appendChild(button);
  }

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

function getSourceLabel(sourceType) {
  const labels = {
    suggestion: "client suggestion",
    update: "project update",
    deliverable: "deliverable",
    gallery: "image",
    project: "project"
  };
  return labels[sourceType] || "content";
}

function getReportReasonLabel(reason) {
  const labels = {
    copyright: "Copyright or rights",
    privacy: "Privacy",
    abuse: "Abuse or harassment",
    illegal: "Illegal content",
    policy: "Policy concern",
    other: "Other"
  };
  return labels[reason] || "Policy concern";
}

function getReportStatusKind(status) {
  if (status === "resolved") return "success";
  if (status === "dismissed") return "neutral";
  if (status === "reviewed") return "warning";
  return "danger";
}

function buildReportButton(sourceType, sourceId, title, reporterRole = "freelancer") {
  const button = document.createElement("button");
  button.className = "btn btn-secondary btn-small";
  button.type = "button";
  button.textContent = "Report";
  button.addEventListener("click", () => {
    openContentReportModal({
      sourceType,
      sourceId,
      title,
      reporterRole
    });
  });
  return button;
}

function formatRightsLabel(value, labels) {
  return labels[value] || value || "Not set";
}

function formatRightsLicenseSubtitle(license) {
  const bits = [
    formatRightsLabel(license.usage_type, RIGHTS_USAGE_LABELS),
    formatRightsLabel(license.territory, RIGHTS_TERRITORY_LABELS),
    license.exclusive ? "Exclusive" : "Non-exclusive",
    formatCurrency(license.fee || 0, license.currency || "GBP")
  ];
  if (license.start_date) bits.push(`From ${license.start_date}`);
  if (license.end_date) bits.push(`Until ${license.end_date}`);
  return bits.join(" | ");
}

function getSuggestionStatusKind(status) {
  if (status === "accepted") return "success";
  if (status === "declined") return "danger";
  if (status === "revised") return "warning";
  return "neutral";
}

async function getAuthHeaders() {
  const { data, error, timedOut } = await withTimeout(
    db.auth.getSession(),
    2500,
    { data: null, error: null, timedOut: true }
  );
  if (timedOut) {
    throw new Error("Your session is still syncing. Please try again in a moment.");
  }
  if (error || !data?.session?.access_token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
    "Content-Type": "application/json"
  };
}

async function getOptionalAuthHeaders() {
  const { data } = await db.auth.getSession().catch(() => ({ data: null }));
  return data?.session?.access_token
    ? {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json"
      }
    : {
        "Content-Type": "application/json"
      };
}

function fileToDataUrl(input) {
  const file = input?.files?.[0];
  if (!file) return Promise.resolve(null);

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error("Please choose a JPG, PNG or WebP image."));
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

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare image watermark."));
    image.src = dataUrl;
  });
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

async function watermarkFreelancerUpdateImage(image) {
  if (!image?.dataUrl) return image;

  const sourceImage = await loadImageFromDataUrl(image.dataUrl);
  const sourceWidth = sourceImage.naturalWidth || sourceImage.width;
  const sourceHeight = sourceImage.naturalHeight || sourceImage.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Could not prepare image watermark.");
  }

  const maxDimension = 2200;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image watermark.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(sourceImage, 0, 0, width, height);

  const watermarkName = getProfileName(currentProfile).slice(0, 48);
  const watermarkText = `${watermarkName} - progress update`;
  const fontSize = Math.max(22, Math.min(72, Math.round(width / 28)));
  const diagonal = Math.hypot(width, height);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-Math.PI / 7);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${fontSize}px Arial, sans-serif`;
  context.lineWidth = Math.max(2, fontSize / 14);
  context.strokeStyle = "rgba(0,0,0,0.2)";
  context.fillStyle = "rgba(255,255,255,0.28)";

  const stepX = Math.max(fontSize * 8, context.measureText(watermarkText).width + fontSize * 5);
  const stepY = fontSize * 3.6;

  for (let y = -diagonal; y <= diagonal; y += stepY) {
    for (let x = -diagonal; x <= diagonal; x += stepX) {
      context.strokeText(watermarkText, x, y);
      context.fillText(watermarkText, x, y);
    }
  }
  context.restore();

  const badgeText = `Watermarked: ${watermarkName}`;
  context.font = `700 ${Math.max(15, Math.round(fontSize * 0.34))}px Arial, sans-serif`;
  const badgePaddingX = 14;
  const badgeWidth = context.measureText(badgeText).width + badgePaddingX * 2;
  const badgeHeight = Math.max(34, Math.round(fontSize * 0.68));
  const badgeX = Math.max(12, width - badgeWidth - 16);
  const badgeY = Math.max(12, height - badgeHeight - 16);

  context.fillStyle = "rgba(0,0,0,0.56)";
  context.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(badgeText, badgeX + badgePaddingX, badgeY + badgeHeight / 2);

  const preferredType = image.dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";
  let dataUrl = canvas.toDataURL(preferredType, 0.9);
  if (estimateDataUrlBytes(dataUrl) > 5 * 1024 * 1024) {
    const qualities = [0.84, 0.76, 0.68];
    for (const quality of qualities) {
      dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (estimateDataUrlBytes(dataUrl) <= 5 * 1024 * 1024) break;
    }
  }

  return {
    ...image,
    name: `watermarked-${image.name || "progress-update.jpg"}`,
    dataUrl
  };
}

async function readJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error || fallbackMessage);
    error.code = data?.code;
    error.actionUrl = data?.actionUrl;
    throw error;
  }

  return data;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
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

function getBillingPlanDefinition(planKey) {
  const billing = currentBilling || getFallbackBillingOverview();
  return (billing.plans || []).find((plan) => plan.key === planKey);
}

function getSelectedBillingPlanKey() {
  const currentPlanKey = getCurrentPlanKey();
  if (!selectedBillingPlanKey) selectedBillingPlanKey = currentPlanKey;
  if (!getBillingPlanDefinition(selectedBillingPlanKey)) selectedBillingPlanKey = currentPlanKey;
  return selectedBillingPlanKey;
}

function selectBillingPlan(planKey) {
  if (PUBLIC_BETA_FREE_ONLY && planKey !== "free") {
    selectedBillingPlanKey = "free";
    showBanner("Paid plans are coming soon. Scopey is free during public beta.", "info");
    renderBilling();
    return;
  }

  selectedBillingPlanKey = planKey;
  renderBilling();
}

function renderBilling() {
  const billing = currentBilling || getFallbackBillingOverview();
  const planKey = getCurrentPlanKey();
  const selectedPlanKey = PUBLIC_BETA_FREE_ONLY ? "free" : getSelectedBillingPlanKey();
  if (PUBLIC_BETA_FREE_ONLY) selectedBillingPlanKey = "free";
  const selectedPlan = getBillingPlanDefinition(selectedPlanKey) || billing.plan;
  const planName = selectedPlan?.name || getCurrentPlanName();
  const usage = getActiveProjectUsage();
  const limitLabel = usage.limit === null ? "Unlimited" : usage.limit;
  const atLimit = isActiveProjectLimitReached();

  if (billingPlanName) billingPlanName.textContent = planName;
  if (billingPlanPill) {
    billingPlanPill.textContent = selectedPlanKey === planKey ? "Current" : selectedPlan?.priceLabel || planName;
    billingPlanPill.className = `status-chip status-${
      selectedPlanKey === planKey ? "success" : "neutral"
    }`;
  }
  if (billingPlanCopy) {
    billingPlanCopy.textContent =
      selectedPlan?.summary || "Free includes one active client project.";
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
  if (billingFeatureList) {
    billingFeatureList.innerHTML = "";
    getPlanFeatureList(selectedPlanKey).forEach((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      billingFeatureList.appendChild(item);
    });
  }
  if (billingPlanCtaBtn) {
    const isCurrentPlan = selectedPlanKey === planKey;
    const isFreePlan = selectedPlanKey === "free";
    billingPlanCtaBtn.classList.toggle("hidden", PUBLIC_BETA_FREE_ONLY || isFreePlan);
    billingPlanCtaBtn.disabled = isCurrentPlan || isFreePlan;
    billingPlanCtaBtn.textContent = isCurrentPlan
      ? `${planName} active`
      : `Get ${planName}`;
  }
  if (billingLimitNote) {
    billingLimitNote.textContent = PUBLIC_BETA_FREE_ONLY
      ? atLimit
        ? "Free beta includes one active project. Complete, archive, cancel or delete an active project to create another."
        : "Paid plans are coming soon. Free is the only public sign-up plan right now."
      : atLimit
      ? "Free is full. Archive, complete or delete a project, or upgrade to Pro."
      : "Pro unlocks unlimited projects, PDFs, templates and Stripe checkout.";
    billingLimitNote.classList.toggle("hidden", !PUBLIC_BETA_FREE_ONLY && planKey !== "free" && !atLimit);
  }
  if (upgradeProBtn) {
    upgradeProBtn.classList.toggle("hidden", PUBLIC_BETA_FREE_ONLY);
    upgradeProBtn.classList.toggle("active", selectedPlanKey === "pro");
    upgradeProBtn.textContent = planKey === "pro" ? "Pro active" : "Pro";
  }
  if (upgradeBusinessBtn) {
    upgradeBusinessBtn.classList.toggle("hidden", PUBLIC_BETA_FREE_ONLY);
    upgradeBusinessBtn.classList.toggle("active", selectedPlanKey === "business");
    upgradeBusinessBtn.textContent = planKey === "business" ? "Business active" : "Business";
    upgradeBusinessBtn.disabled = PUBLIC_BETA_FREE_ONLY;
  }
  if (createProjectBtn) {
    createProjectBtn.disabled = atLimit;
    createProjectBtn.textContent = atLimit
      ? PUBLIC_BETA_FREE_ONLY
        ? "Free project limit reached"
        : "Upgrade for more projects"
      : "Create project";
  }
  if (projectLimitNote) {
    projectLimitNote.textContent = atLimit
      ? PUBLIC_BETA_FREE_ONLY
        ? "Free beta includes one active client project. Complete, archive, cancel or delete an active project to create another."
        : "Free includes one active client project. Complete, archive, cancel or delete an active project, or upgrade to Pro for unlimited active projects."
      : "";
    projectLimitNote.classList.toggle("hidden", !atLimit);
  }
  renderAccountBilling();
  renderPlanLockedStates();
}

function getPlanFeatureList(planKey) {
  const features = {
    free: [
      "1 active client project",
      "Shared client review page",
      "Automatic client emails",
      "Scope and change tracking",
      "10 Scopey Rights licences"
    ],
    pro: [
      "Unlimited active projects",
      "PDF agreements, invoices and receipts",
      "Agreement templates",
      "Stripe payment links for paid approvals",
      "Unlimited Scopey Rights licences and CSV export"
    ],
    business: [
      "Everything in Pro",
      "10 GB project image storage",
      "Priority support for live client work",
      "Team-ready controls foundation",
      "Stronger fit for studios and agencies",
      "Rights reporting for larger client libraries"
    ]
  };
  return features[planKey] || features.free;
}

function renderRights() {
  const moduleName = currentRights?.moduleName || "Scopey Rights";
  const plan = currentRights?.plan || {};
  const usage = currentRights?.usage?.licenses || { used: 0, limit: 10 };
  const artworks = currentRights?.artworks || [];
  const limitLabel = usage.limit === null ? "Unlimited" : usage.limit;
  const rightsPillText = plan.reportingEnabled ? "Reporting" : "Free ledger";
  const rightsPillClass = `status-chip status-${plan.reportingEnabled ? "success" : "neutral"}`;

  if (rightsModuleName) rightsModuleName.textContent = moduleName;
  if (rightsPlanPill) {
    rightsPlanPill.textContent = rightsPillText;
    rightsPlanPill.className = rightsPillClass;
  }
  if (rightsSidebarPill) {
    rightsSidebarPill.textContent = rightsPillText;
    rightsSidebarPill.className = rightsPillClass;
  }
  if (rightsLicenseUsage) rightsLicenseUsage.textContent = `${usage.used || 0} / ${limitLabel}`;
  if (rightsArtworkCount) rightsArtworkCount.textContent = String(artworks.length);
  if (rightsSidebarLicenseUsage) rightsSidebarLicenseUsage.textContent = `${usage.used || 0} / ${limitLabel}`;
  if (rightsSidebarArtworkCount) rightsSidebarArtworkCount.textContent = String(artworks.length);
  if (rightsExportBtn) {
    rightsExportBtn.classList.toggle("plan-locked", !plan.reportingEnabled);
    rightsExportBtn.textContent = plan.reportingEnabled ? "Export CSV" : "Export CSV on Pro";
  }
  if (!rightsArtworkList) return;

  rightsArtworkList.innerHTML = "";
  if (rightsArtworkSelect) rightsArtworkSelect.innerHTML = "";

  if (!currentRights) {
    rightsArtworkSelect?.setAttribute("disabled", "true");
    rightsArtworkList.appendChild(
      buildEmptyState({
        title: "Rights library not loaded",
        copy: "Run the latest Supabase schema, then reopen the dashboard to use Scopey Rights."
      })
    );
    return;
  }

  if (artworks.length === 0) {
    selectedRightsArtworkId = null;
    rightsArtworkSelect?.setAttribute("disabled", "true");
    rightsArtworkList.appendChild(
      buildEmptyState({
        title: "No artwork records yet",
        copy: "Add finished artwork here, then track which clients can use it and where."
      })
    );
    return;
  }

  if (!selectedRightsArtworkId || !artworks.some((artwork) => artwork.id === selectedRightsArtworkId)) {
    selectedRightsArtworkId = artworks[0].id;
  }
  rightsArtworkSelect?.removeAttribute("disabled");
  artworks.forEach((artwork) => {
    if (rightsArtworkSelect) {
      const option = document.createElement("option");
      option.value = artwork.id;
      option.textContent = artwork.title;
      rightsArtworkSelect.appendChild(option);
    }
  });
  if (rightsArtworkSelect) rightsArtworkSelect.value = selectedRightsArtworkId;

  artworks.forEach((artwork) => {
    const card = document.createElement("div");
    card.className = `rights-artwork-card ${artwork.id === selectedRightsArtworkId ? "active" : ""}`;

    const main = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = artwork.title;
    const copy = document.createElement("p");
    copy.className = "card-copy card-copy-small";
    copy.textContent = artwork.description || "No description yet.";
    main.appendChild(title);
    main.appendChild(copy);

    const meta = document.createElement("div");
    meta.className = "rights-artwork-meta";
    meta.appendChild(buildStatusPill(`${artwork.licenses?.length || 0} licences`, "neutral"));
    if ((artwork.licenses || []).some((license) => license.expiring_soon)) {
      meta.appendChild(buildStatusPill("Expiring soon", "warning"));
    }
    if ((artwork.licenses || []).some((license) => license.acknowledged_conflict)) {
      meta.appendChild(buildStatusPill("Conflict noted", "danger"));
    }
    const selectBtn = document.createElement("button");
    selectBtn.className = "btn btn-secondary btn-small";
    selectBtn.type = "button";
    selectBtn.textContent = artwork.id === selectedRightsArtworkId ? "Selected" : "Use";
    selectBtn.addEventListener("click", () => {
      selectedRightsArtworkId = artwork.id;
      pendingRightsConflicts = [];
      renderRights();
    });
    meta.appendChild(selectBtn);

    card.appendChild(main);
    card.appendChild(meta);

    const licenses = artwork.licenses || [];
    const licenceList = document.createElement("div");
    licenceList.className = "rights-license-list";
    if (!licenses.length) {
      licenceList.appendChild(
        buildEmptyState({
          title: "No licences yet",
          copy: "Add the first permission record for this artwork."
        })
      );
    } else {
      licenses.forEach((license) => {
        const actions = document.createElement("div");
        actions.className = "action-stack";
        actions.appendChild(
          buildStatusPill(
            license.active ? "Active" : "Inactive",
            license.active ? "success" : "neutral"
          )
        );
        if (license.expiring_soon) actions.appendChild(buildStatusPill("Expiring soon", "warning"));
        if (license.acknowledged_conflict) actions.appendChild(buildStatusPill("Conflict noted", "danger"));
        licenceList.appendChild(
          buildListRow(
            license.client_name,
            formatRightsLicenseSubtitle(license),
            actions
          )
        );
        if (license.notes) {
          const row = licenceList.lastElementChild;
          const notes = document.createElement("p");
          notes.className = "item-details";
          notes.textContent = license.notes;
          row?.querySelector(".item-main")?.appendChild(notes);
        }
      });
    }
    card.appendChild(licenceList);
    rightsArtworkList.appendChild(card);
  });

  if (rightsConflictPanel) {
    rightsConflictPanel.classList.toggle("hidden", pendingRightsConflicts.length === 0);
  }
  if (rightsConflictList) {
    rightsConflictList.innerHTML = "";
    pendingRightsConflicts.forEach((conflict) => {
      const item = document.createElement("div");
      item.className = "rights-conflict-item";
      item.textContent = `${conflict.license?.client_name || "Existing licence"}: ${(conflict.reasons || []).join(", ")}`;
      rightsConflictList.appendChild(item);
    });
  }
}

function getLaunchReadinessChecks(setup = {}) {
  const schema = setup.schema || {};
  const missingTables = schema.missingTables || [];
  const rlsDisabledTables = schema.rlsDisabledTables || [];
  const missingOwnerPolicyTables = schema.missingOwnerPolicyTables || [];

  return [
    {
      label: "Database schema",
      complete: Boolean(schema.configured),
      detail: schema.configured
        ? `Schema health is clean across ${schema.checkedTables || "the required"} tables.`
        : missingTables.length
        ? `Missing tables: ${missingTables.join(", ")}. Run the latest Supabase schema.`
        : schema.warning || "Run supabase-rls-policy-update.sql to enable live schema health checks."
    },
    {
      label: "RLS owner policies",
      complete:
        Boolean(schema.configured) ||
        (missingOwnerPolicyTables.length === 0 && rlsDisabledTables.length === 0 && Boolean(schema.healthFunctionAvailable)),
      detail: schema.healthFunctionAvailable
        ? missingOwnerPolicyTables.length || rlsDisabledTables.length
          ? [
              missingOwnerPolicyTables.length ? `Missing policies: ${missingOwnerPolicyTables.join(", ")}` : "",
              rlsDisabledTables.length ? `RLS disabled: ${rlsDisabledTables.join(", ")}` : ""
            ].filter(Boolean).join(" | ")
          : `Owner policies are present. Service-only tables stay locked: ${(schema.serviceRoleOnlyTables || []).join(", ")}.`
        : "Install the schema health RPC by running supabase-rls-policy-update.sql."
    },
    {
      label: "Paid plan checkout",
      complete: !setup.paidPlansEnabled || Boolean(setup.stripeBillingConfigured),
      detail: !setup.paidPlansEnabled
        ? "Paid checkout is hidden while Scopey is in public beta."
        : setup.stripeBillingConfigured
        ? "Plan checkout keys and price IDs are configured."
        : "Add real Stripe secret and plan price IDs before selling paid tiers."
    },
    {
      label: "Stripe webhooks",
      complete: !setup.paidPlansEnabled || Boolean(setup.webhookConfigured),
      detail: !setup.paidPlansEnabled
        ? "Stripe webhooks are not required while paid plans are disabled."
        : setup.webhookConfigured
        ? "Webhook secret is configured for payment events."
        : "Add STRIPE_WEBHOOK_SECRET so payment state can be trusted."
    },
    {
      label: "Client emails",
      complete: Boolean(setup.emailConfigured),
      detail: setup.emailConfigured
        ? "Transactional email sending is configured."
        : "Add a real Resend API key before relying on automatic client emails."
    },
    {
      label: "Upload storage",
      complete: Boolean(setup.storageConfigured),
      detail: setup.storageConfigured
        ? `Storage bucket "${setup.storageBucket || "scopey-uploads"}" is available.`
        : `Create or expose the "${setup.storageBucket || "scopey-uploads"}" storage bucket.`
    },
    {
      label: "Public app URL",
      complete: Boolean(setup.frontendPublicConfigured),
      detail: setup.frontendPublicConfigured
        ? "Frontend URL points at a public production address."
        : "Set FRONTEND_URL to the deployed Scopey domain before sending real client links."
    },
    {
      label: "Policy documents",
      complete: Boolean(setup.legalDraftsPresent),
      detail: "Privacy, terms, acceptable use, refunds, cookies, sub-processors and DPA notes are present."
    },
    {
      label: "Report review",
      complete: Boolean(setup.reportReviewEnabled),
      detail: "Client and freelancer reports can be reviewed from project workspaces."
    },
    {
      label: "PDF exports",
      complete: Boolean(setup.pdfExportsEnabled),
      detail: "Agreement and payment document export paths are available."
    }
  ];
}

function renderLaunchReadiness(setup = {}) {
  if (!developerLaunchList) return;

  const checks = getLaunchReadinessChecks(setup);
  const completeCount = checks.filter((check) => check.complete).length;
  const score = Math.round((completeCount / checks.length) * 100);

  if (developerLaunchScore) {
    developerLaunchScore.textContent = `${score}%`;
    developerLaunchScore.className = `status-chip status-${score >= 88 ? "success" : score >= 62 ? "warning" : "danger"}`;
  }

  developerLaunchList.innerHTML = "";
  checks.forEach((check) => {
    developerLaunchList.appendChild(
      buildReadinessItem(check.label, check.complete, check.detail)
    );
  });
}

function renderAccountBilling() {
  if (!accountModal) return;

  const billing = currentBilling || getFallbackBillingOverview();
  const planKey = getCurrentPlanKey();
  const planName = getCurrentPlanName();
  const usage = getActiveProjectUsage();
  const limitLabel = usage.limit === null ? "Unlimited" : usage.limit;

  if (accountPlanName) accountPlanName.textContent = planName;
  if (accountPlanCopy) {
    accountPlanCopy.textContent =
      billing.plan?.summary || "Free includes one active client project.";
  }
  if (accountProjectUsage) accountProjectUsage.textContent = `${usage.used} / ${limitLabel}`;
  if (accountProjectNote) {
    accountProjectNote.textContent = PUBLIC_BETA_FREE_ONLY
      ? "Free beta includes one active client project."
      : usage.limit === null
      ? "Your plan can run unlimited active projects."
      : "Upgrade to Pro for unlimited active projects.";
  }
  if (!accountPlanGrid) return;

  accountPlanGrid.innerHTML = "";
  const plans = PUBLIC_BETA_FREE_ONLY
    ? (billing.plans || []).filter((plan) => plan.key === "free")
    : billing.plans || [];

  plans.forEach((plan) => {
    const card = document.createElement("section");
    card.className = `account-plan-card ${plan.key === planKey ? "active" : ""}`;

    const header = document.createElement("div");
    header.className = "account-plan-card-header";

    const titleWrap = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = plan.name;
    const price = document.createElement("span");
    price.textContent = plan.priceLabel;
    titleWrap.appendChild(name);
    titleWrap.appendChild(price);

    const badge = buildStatusPill(plan.key === planKey ? "Current" : "Available", plan.key === planKey ? "success" : "neutral");
    header.appendChild(titleWrap);
    header.appendChild(badge);

    const copy = document.createElement("p");
    copy.textContent = plan.summary;

    const list = document.createElement("ul");
    getPlanFeatureList(plan.key).forEach((feature) => {
      const item = document.createElement("li");
      item.textContent = feature;
      list.appendChild(item);
    });

    card.appendChild(header);
    card.appendChild(copy);
    card.appendChild(list);

    if (plan.key !== "free" && plan.key !== planKey) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-primary btn-block";
      button.textContent = `Choose ${plan.name}`;
      button.addEventListener("click", () => startUpgradeCheckout(plan.key, button));
      card.appendChild(button);
    }

    accountPlanGrid.appendChild(card);
  });
}

function renderPaymentAccountSetup() {
  const account = currentPaymentAccount || {};
  const stripe = account.stripe || {};
  const paypal = account.paypal || {};
  const stripeReady = Boolean(stripe.ready);
  const paypalReady = Boolean(paypal.enabled);
  const anyReady = stripeReady || paypalReady;

  if (paymentSetupStatus) {
    paymentSetupStatus.textContent = anyReady ? "Ready" : "Needs setup";
    paymentSetupStatus.className = `status-chip status-${anyReady ? "success" : "warning"}`;
  }

  if (stripePaymentStatus) {
    stripePaymentStatus.textContent = stripeReady
      ? "Ready for card payments"
      : stripe.connected
      ? "Setup incomplete"
      : "Not connected";
  }

  if (stripePaymentCopy) {
    stripePaymentCopy.textContent = stripeReady
      ? "Client card payments can route to your Stripe payout account."
      : stripe.connected
      ? "Continue Stripe onboarding so Scopey can confirm charges and payouts are enabled."
      : "Connect Stripe to accept card payments and route funds to your own payout account.";
  }

  if (connectStripeBtn) {
    connectStripeBtn.textContent = stripe.connected && !stripeReady ? "Continue Stripe setup" : stripeReady ? "Stripe connected" : "Connect Stripe";
    connectStripeBtn.disabled = stripeReady;
    connectStripeBtn.classList.toggle("btn-secondary", stripe.connected);
    connectStripeBtn.classList.toggle("btn-primary", !stripe.connected);
  }

  if (paypalPaymentStatus) {
    paypalPaymentStatus.textContent = paypalReady
      ? "Payment link saved"
      : paypal.email
      ? "Email saved, add link"
      : "Not saved";
  }

  if (paypalEmailInput && !paypalEmailInput.matches(":focus")) {
    paypalEmailInput.value = paypal.email || "";
  }

  if (paypalUrlInput && !paypalUrlInput.matches(":focus")) {
    paypalUrlInput.value = paypal.url || "";
  }
}

function getClientPaymentReadiness() {
  const account = currentPaymentAccount || {};
  const stripeReady = Boolean(account.stripe?.ready);
  const paypalReady = Boolean(account.paypal?.enabled);

  if (stripeReady && paypalReady) {
    return {
      ready: true,
      label: "Stripe and PayPal are ready for client payments."
    };
  }

  if (stripeReady) {
    return {
      ready: true,
      label: "Stripe is ready for client card payments."
    };
  }

  if (paypalReady) {
    return {
      ready: true,
      label: "PayPal is ready for manual client payments."
    };
  }

  return {
    ready: false,
    label: "Connect Stripe or add a PayPal payment link in Account before sending payment requests."
  };
}

async function loadPaymentAccount() {
  const headers = await getAuthHeaders();
  const response = await fetchWithTimeout(`${API_URL}/payment-accounts`, { headers });
  const data = await readJsonResponse(response, "Could not load payment setup.");
  currentPaymentAccount = data.paymentAccount || null;
  renderPaymentAccountSetup();
  return currentPaymentAccount;
}

async function connectStripePayments() {
  setButtonLoading(connectStripeBtn, true, "Opening Stripe...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/payment-accounts/stripe/onboarding`, {
      method: "POST",
      headers
    });
    const data = await readJsonResponse(response, "Could not start Stripe setup.");

    if (!data.url) throw new Error("Stripe did not return an onboarding link.");
    window.location.href = data.url;
  } catch (error) {
    console.error(error);
    if (error.code === "stripe_connect_not_enabled" && error.actionUrl) {
      showBanner(
        "Stripe Connect needs enabling for Scopey before freelancer payout accounts can be linked. Opening Stripe Connect setup...",
        "warning"
      );
      window.open(error.actionUrl, "_blank", "noopener");
    } else {
      showBanner(error.message || "Could not start Stripe setup.", "error");
    }
    setButtonLoading(connectStripeBtn, false);
  }
}

async function savePaypalPayments() {
  setButtonLoading(savePaypalBtn, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/payment-accounts/paypal`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        paypalEmail: paypalEmailInput?.value.trim() || null,
        paypalUrl: paypalUrlInput?.value.trim() || null,
        preferredProvider: "paypal"
      })
    });
    const data = await readJsonResponse(response, "Could not save PayPal setup.");
    currentPaymentAccount = data.paymentAccount || null;
    renderPaymentAccountSetup();
    showBanner("PayPal payment setup saved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not save PayPal setup.", "error");
  } finally {
    setButtonLoading(savePaypalBtn, false, "Save PayPal");
  }
}

function setProjectCreateVisible(isVisible, rememberChoice = false) {
  isCreatingProject = isVisible;
  projectCreationState?.classList.add("hidden");
  projectCreateCard?.classList.toggle("hidden", !isVisible);
  if (toggleProjectCreateBtn) {
    toggleProjectCreateBtn.textContent = isVisible ? "Back to project" : "New project";
  }
  if (rememberChoice && projectCreateCard) {
    projectCreateCard.dataset.userOpened = isVisible ? "true" : "false";
  }

  if (isVisible) {
    ownerEmptyState?.classList.add("hidden");
    projectWorkspace?.classList.add("hidden");
  } else if (currentProject) {
    ownerEmptyState?.classList.add("hidden");
    projectWorkspace?.classList.remove("hidden");
  } else {
    renderOwnerEmptyWorkspace();
  }

  renderProjectList();
}

function setProjectCreationLoading(isLoading, projectTitle = "") {
  projectCreationState?.classList.toggle("hidden", !isLoading);
  if (!isLoading) {
    if (toggleProjectCreateBtn) {
      toggleProjectCreateBtn.disabled = false;
      toggleProjectCreateBtn.textContent = currentProject ? "New project" : "New project";
    }
    return;
  }

  projectCreateCard?.classList.add("hidden");
  ownerEmptyState?.classList.add("hidden");
  projectWorkspace?.classList.add("hidden");

  if (projectCreationCopy) {
    projectCreationCopy.textContent = projectTitle
      ? `Preparing "${projectTitle}" with a client-ready workspace, setup path and handoff tools.`
      : "Scopey is preparing the project record, client handoff and first setup steps.";
  }

  if (toggleProjectCreateBtn) {
    toggleProjectCreateBtn.textContent = "Creating...";
    toggleProjectCreateBtn.disabled = true;
  }
}

function syncProjectCreateVisibility() {
  const hasActiveProjects = currentProjects.length > 0;
  const userOpened = projectCreateCard?.dataset.userOpened === "true";
  setProjectCreateVisible(!hasActiveProjects || userOpened);
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

function getShareTokenQuery() {
  const query = new URLSearchParams();
  if (clientToken) query.set("token", clientToken);
  if (clientAccessCodeValue) query.set("accessCode", clientAccessCodeValue);
  const text = query.toString();
  return text ? `?${text}` : "";
}

function getClientAccessPayload() {
  return {
    section: clientSection,
    token: clientToken || null,
    accessCode: clientAccessCodeValue || null
  };
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

function getPendingProjectPayments(payments = currentProjectPayments) {
  return payments.filter((payment) => payment.status === "pending");
}

function getPendingDepositPayments(payments = currentProjectPayments) {
  return getPendingProjectPayments(payments).filter(
    (payment) => payment.payment_type === "deposit"
  );
}

function getPendingPaidChanges(changes = currentChanges) {
  return changes.filter((change) => change.status === "pending");
}

function getLifecyclePaymentBlockers(status, changes = currentChanges, payments = currentProjectPayments, deliverables = currentDeliverables) {
  if (status === "in_progress") {
    const pendingDeposits = getPendingDepositPayments(payments);
    return pendingDeposits.length
      ? [
          {
            label: "Deposit payment pending",
            detail: `${pendingDeposits.length} deposit payment${pendingDeposits.length === 1 ? "" : "s"} must be paid before work starts.`,
            tab: "payments"
          }
        ]
      : [];
  }

  if (["awaiting_final_approval", "complete"].includes(status)) {
    return getCompletionChecks(currentProject, changes, payments, deliverables).filter(
      (check) => check.blocking && !check.complete
    );
  }

  return [];
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

function getProjectJourney(project) {
  const status = project?.status || "draft";
  const order = ["draft", "sent", "accepted", "in_progress", "awaiting_final_approval", "complete"];
  const activeIndex = status === "cancelled" ? order.length : Math.max(order.indexOf(status), 0);

  return [
    ["draft", "Set up"],
    ["sent", "Send"],
    ["accepted", "Accept"],
    ["in_progress", "Work"],
    ["awaiting_final_approval", "Review"],
    ["complete", "Complete"]
  ].map(([key, label], index) => ({
    key,
    label,
    state: status === "cancelled"
      ? "complete"
      : index < activeIndex
      ? "complete"
      : index === activeIndex
      ? "active"
      : "upcoming"
  }));
}

function renderProjectJourney(project) {
  if (!projectJourneySteps) return;
  projectJourneySteps.innerHTML = "";

  getProjectJourney(project).forEach((step) => {
    const item = document.createElement("div");
    item.className = `project-journey-step ${step.state}`;
    const dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("strong");
    label.textContent = step.label;
    item.appendChild(dot);
    item.appendChild(label);
    projectJourneySteps.appendChild(item);
  });
}

function getGuidedAction(project, scopeItems = [], changes = [], suggestions = [], payments = [], deliverables = []) {
  const pendingChanges = changes.filter((change) => change.status === "pending");
  const openSuggestions = suggestions.filter((suggestion) => suggestion.status === "suggested");
  const pendingPayments = getPendingProjectPayments(payments);
  const pendingDeposits = getPendingDepositPayments(payments);
  const overduePayments = payments.filter(isPaymentOverdue);
  const unapprovedDeliverables = deliverables.filter((item) => item.status !== "approved");
  const openReports = currentContentReports.filter((report) => report.status === "open");

  if (!project) {
    return {
      title: "Create a client workspace",
      copy: "Add the project and client details first. Scopey will guide the rest from there.",
      label: "New project",
      type: "create"
    };
  }

  if (!project.client_email) {
    return {
      title: "Add the client email",
      copy: "Scopey needs one client email before it can prepare a smooth review handoff.",
      label: "Open settings",
      type: "tab",
      tab: "overview"
    };
  }

  if (openReports.length) {
    return {
      title: "Review policy reports",
      copy: `${openReports.length} content report${openReports.length === 1 ? "" : "s"} need a decision before the project is clean.`,
      label: "Open reports",
      type: "tab",
      tab: "reports"
    };
  }

  if (!projectHasAgreement(project)) {
    return {
      title: "Draft the agreement",
      copy: "Write the scope, payment terms, revision rules and cancellation terms before sending.",
      label: "Open agreement",
      type: "tab",
      tab: "agreement"
    };
  }

  if (!scopeItems.length) {
    return {
      title: "Define the included scope",
      copy: "Add the work included in the original price so extras are easier to explain later.",
      label: "Add scope",
      type: "tab",
      tab: "scope"
    };
  }

  if (project.status === "draft") {
    return {
      title: "Send the project for review",
      copy: "The agreement and scope are ready. Mark it sent, then share the client review link.",
      label: "Mark sent",
      type: "status",
      status: "sent"
    };
  }

  if (project.status === "sent" && !project.accepted_at) {
    return {
      title: "Share the review link",
      copy: "The client can now review and accept the agreement from their shared page.",
      label: "Copy link",
      type: "copy"
    };
  }

  if (project.status === "accepted") {
    if (pendingDeposits.length) {
      return {
        title: "Collect the deposit",
        copy: `${pendingDeposits.length} deposit payment${pendingDeposits.length === 1 ? "" : "s"} must be paid before work moves in progress.`,
        label: "Open payments",
        type: "tab",
        tab: "payments"
      };
    }

    return {
      title: "Start delivery",
      copy: "The client has accepted the scope. Mark the project in progress when work begins.",
      label: "Mark in progress",
      type: "status",
      status: "in_progress"
    };
  }

  if (openSuggestions.length) {
    return {
      title: "Review client suggestions",
      copy: `${openSuggestions.length} client suggestion${openSuggestions.length === 1 ? "" : "s"} need a decision.`,
      label: "Open suggestions",
      type: "tab",
      tab: "suggestions"
    };
  }

  if (overduePayments.length || pendingPayments.length) {
    return {
      title: overduePayments.length ? "Handle overdue payment" : "Track pending payment",
      copy: overduePayments.length
        ? `${overduePayments.length} payment${overduePayments.length === 1 ? "" : "s"} are overdue.`
        : `${pendingPayments.length} project payment${pendingPayments.length === 1 ? "" : "s"} are still pending.`,
      label: "Open payments",
      type: "tab",
      tab: "payments"
    };
  }

  if (pendingChanges.length) {
    return {
      title: "Follow up paid changes",
      copy: `${pendingChanges.length} change request${pendingChanges.length === 1 ? "" : "s"} are waiting for approval or payment.`,
      label: "Open changes",
      type: "tab",
      tab: "changes"
    };
  }

  if (project.status === "awaiting_final_approval") {
    return {
      title: "Guide final approval",
      copy: "Final approval has been requested. Share the completion link if the client needs it.",
      label: "Copy link",
      type: "copy"
    };
  }

  if (project.status === "complete") {
    return {
      title: "Project complete",
      copy: "This project has a completion record and should stay archived for reference.",
      label: "View completion",
      type: "tab",
      tab: "completion"
    };
  }

  if (unapprovedDeliverables.length) {
    return {
      title: "Check deliverable approval",
      copy: `${unapprovedDeliverables.length} deliverable${unapprovedDeliverables.length === 1 ? "" : "s"} still need client approval.`,
      label: "Open deliverables",
      type: "tab",
      tab: "deliverables"
    };
  }

  return {
    title: "Share a progress update",
    copy: "Keep the client looped in with a short update, image, or next-step note.",
    label: "Add update",
    type: "tab",
    tab: "updates"
  };
}

function renderGuidedAction(project, scopeItems, changes, suggestions, payments, deliverables) {
  currentGuidedAction = getGuidedAction(project, scopeItems, changes, suggestions, payments, deliverables);
  if (guidedActionTitle) guidedActionTitle.textContent = currentGuidedAction.title;
  if (guidedActionCopy) guidedActionCopy.textContent = currentGuidedAction.copy;
  if (guidedActionBtn) {
    guidedActionBtn.textContent = currentGuidedAction.label;
    guidedActionBtn.disabled = false;
  }
}

function renderSetupWizard(project, scopeItems = [], payments = []) {
  if (!setupWizard) return;

  const agreementDone = projectHasAgreement(project);
  const scopeDone = scopeItems.length > 0;
  const paymentsDone = payments.length > 0;
  const status = project?.status || "draft";
  const clientDone = Boolean(project && (project.sent_at || project.accepted_at || status !== "draft"));
  const activeTab = !agreementDone
    ? "agreement"
    : !scopeDone
    ? "scope"
    : status === "draft"
    ? "client"
    : "updates";

  const stepState = {
    agreement: agreementDone ? "complete" : activeTab === "agreement" ? "active" : "upcoming",
    scope: scopeDone ? "complete" : activeTab === "scope" ? "active" : "upcoming",
    payments: paymentsDone ? "complete" : "optional",
    client: clientDone ? "complete" : activeTab === "client" ? "active" : "upcoming"
  };

  if (setupStepAgreement) {
    setupStepAgreement.textContent = agreementDone ? "Terms saved" : "Draft terms";
  }
  if (setupStepScope) {
    setupStepScope.textContent = scopeDone
      ? `${scopeItems.length} item${scopeItems.length === 1 ? "" : "s"} added`
      : "Add included work";
  }
  if (setupStepPayments) {
    setupStepPayments.textContent = paymentsDone
      ? `${payments.length} payment${payments.length === 1 ? "" : "s"} added`
      : "Optional milestones";
  }
  if (setupStepClient) {
    setupStepClient.textContent = clientDone ? "Client link ready" : "Preview and send";
  }

  setupWizard.querySelectorAll("[data-setup-tab]").forEach((button) => {
    const state = stepState[button.dataset.setupTab] || "upcoming";
    button.className = `setup-step ${state}`;
    button.setAttribute("aria-current", state === "active" ? "step" : "false");
  });
}

function getClientNextAction(project, changes = [], payments = [], deliverables = []) {
  const pendingChanges = changes.filter((change) => change.status === "pending");
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const unapprovedDeliverables = deliverables.filter((item) => item.status !== "approved");

  if (!projectHasAgreement(project)) {
    return "The freelancer is still preparing the agreement.";
  }

  if (project.status === "draft") {
    return "This project is being prepared before formal client acceptance.";
  }

  if (!project.accepted_at && project.status !== "cancelled") {
    return "Check the agreement and accept it when everything looks correct.";
  }

  if (pendingPayments.length) {
    return `Review and pay ${pendingPayments.length} project payment${pendingPayments.length === 1 ? "" : "s"}.`;
  }

  if (pendingChanges.length) {
    return `Review ${pendingChanges.length} paid change request${pendingChanges.length === 1 ? "" : "s"}.`;
  }

  if (project.status === "awaiting_final_approval") {
    return "Review the final deliverables and approve completion when ready.";
  }

  if (unapprovedDeliverables.length && project.status !== "complete") {
    return "Review the latest deliverables and approve the files that are complete.";
  }

  if (project.status === "complete") {
    return "This project has been completed and approved.";
  }

  if (project.status === "cancelled") {
    return "This project has been cancelled.";
  }

  return "Follow updates here and send suggestions when something needs review.";
}

function getOwnerHandoffCopy(project, scopeItems, payments, changes, deliverables) {
  if (!project) return "Select a project to prepare the client handoff.";
  if (!project.client_email) return "Add the client email before sending the review link.";
  if (!projectHasAgreement(project)) return "Write the agreement before asking the client to accept the project.";
  if (!scopeItems.length) return "Add the original scope so the client can see what is included.";
  if (project.status === "draft") return "Ready to send once you are happy with the agreement, scope and payment setup.";
  return getClientNextAction(project, changes, payments, deliverables);
}

function getHandoffChecks(project, scopeItems = [], payments = []) {
  const profileName = getProfileName(currentProfile);
  const hasBusinessProfile = Boolean(
    currentProfile?.brand_name ||
      (profileName && profileName !== "Freelancer" && profileName !== "Scopey freelancer")
  );
  const hasPaymentTerms = Boolean(project?.agreement_payment_terms || payments.length);
  const openReports = currentContentReports.filter((report) => report.status === "open");

  return [
    {
      key: "email",
      label: "Client email",
      complete: Boolean(project?.client_email),
      detail: project?.client_email || "Add the client's email in Project settings.",
      tab: "overview"
    },
    {
      key: "profile",
      label: "Business profile",
      complete: hasBusinessProfile,
      detail: hasBusinessProfile
        ? `${profileName} will appear on the client page.`
        : "Add your business name so the client page feels trustworthy.",
      action: "profile"
    },
    {
      key: "agreement",
      label: "Agreement",
      complete: projectHasAgreement(project),
      detail: projectHasAgreement(project)
        ? "Agreement terms are ready."
        : "Write the project terms before client acceptance.",
      tab: "agreement"
    },
    {
      key: "scope",
      label: "Included scope",
      complete: scopeItems.length > 0,
      detail: scopeItems.length
        ? `${scopeItems.length} included item${scopeItems.length === 1 ? "" : "s"} recorded.`
        : "Add the work included in the original price.",
      tab: "scope"
    },
    {
      key: "payments",
      label: "Payment terms",
      complete: hasPaymentTerms,
      detail: hasPaymentTerms
        ? "Payment expectations are visible."
        : "Add payment terms or a payment record if money is due.",
      tab: "agreement"
    },
    {
      key: "reports",
      label: "Policy reports",
      complete: openReports.length === 0,
      detail: openReports.length
        ? `${openReports.length} open report${openReports.length === 1 ? "" : "s"} need review.`
        : "No open policy reports.",
      tab: "reports"
    }
  ];
}

function routeToChecklistItem(check) {
  if (!check) return;
  if (check.action === "profile") {
    setBusinessProfileEditing(true);
    showBanner(check.detail, "info");
    return;
  }
  if (check.tab) setCurrentProjectTab(check.tab);
  showBanner(check.detail, "warning");
}

function renderHandoffPanel(project, scopeItems, changes, payments, deliverables) {
  if (!handoffSummaryCopy) return;

  const section = getShareSectionForTab();
  const email = project?.client_email || "";
  const checks = getHandoffChecks(project, scopeItems, payments);
  const incomplete = checks.filter((check) => !check.complete);
  const paymentReadiness = getClientPaymentReadiness();
  const handoffNeedsPayment = ["all", "changes", "payments"].includes(section)
    && (payments.some((payment) => payment.status === "pending") || changes.some((change) => change.status === "pending"));
  handoffSummaryCopy.textContent = getOwnerHandoffCopy(project, scopeItems, payments, changes, deliverables);

  if (handoffStatusChip) {
    handoffStatusChip.textContent = getProjectStatusLabel(project?.status);
    handoffStatusChip.className = `status-chip status-${getProjectStatusKind(project?.status)}`;
  }

  if (handoffLinkScope) {
    handoffLinkScope.textContent = getClientSectionLabel(section);
  }

  if (handoffEmailState) {
    handoffEmailState.textContent = email || "Not saved yet";
    handoffEmailState.title = email;
  }

  if (handoffClientAction) {
    handoffClientAction.textContent = getClientNextAction(project, changes, payments, deliverables);
  }

  if (handoffReadinessList) {
    handoffReadinessList.innerHTML = "";
    checks.forEach((check) => {
      const item = buildReadinessItem(check.label, check.complete, check.detail, {
        truncateDetail: check.key === "email" && check.complete
      });
      item.classList.add("readiness-item-action");
      item.addEventListener("click", () => {
        if (!check.complete) routeToChecklistItem(check);
      });
      handoffReadinessList.appendChild(item);
    });
  }

  if (handoffPaymentReadinessNote) {
    handoffPaymentReadinessNote.textContent = handoffNeedsPayment
      ? paymentReadiness.label
      : "";
    handoffPaymentReadinessNote.classList.toggle("hidden", !handoffNeedsPayment);
    handoffPaymentReadinessNote.classList.toggle("payment-warning", handoffNeedsPayment && !paymentReadiness.ready);
  }

  if (handoffSendBtn) {
    handoffSendBtn.textContent = incomplete.length ? "Finish setup" : "Send to client";
    handoffSendBtn.classList.toggle("btn-secondary", incomplete.length > 0);
    handoffSendBtn.classList.toggle("btn-primary", incomplete.length === 0);
  }
}

function getCompletionChecks(project, changes = [], payments = [], deliverables = []) {
  const pendingChanges = getPendingPaidChanges(changes);
  const pendingPayments = getPendingProjectPayments(payments);
  const openReports = currentContentReports.filter((report) => report.status === "open");
  const accepted = Boolean(
    project?.accepted_at ||
      ["accepted", "in_progress", "awaiting_final_approval", "complete"].includes(project?.status)
  );

  return [
    {
      key: "accepted",
      label: "Agreement accepted",
      complete: accepted,
      detail: accepted
        ? "The commercial scope has been accepted."
        : "Send the project and wait for client acceptance first.",
      tab: "client",
      blocking: true
    },
    {
      key: "payments",
      label: "Payments clean",
      complete: pendingPayments.length === 0,
      detail: pendingPayments.length
        ? `${pendingPayments.length} payment${pendingPayments.length === 1 ? "" : "s"} still pending.`
        : "No pending project payments.",
      tab: "payments",
      blocking: true
    },
    {
      key: "changes",
      label: "Changes settled",
      complete: pendingChanges.length === 0,
      detail: pendingChanges.length
        ? `${pendingChanges.length} paid change${pendingChanges.length === 1 ? "" : "s"} still need approval or payment.`
        : "No pending paid changes.",
      tab: "changes",
      blocking: true
    },
    {
      key: "deliverables",
      label: "Deliverables shared",
      complete: deliverables.length > 0,
      detail: deliverables.length
        ? `${deliverables.length} final deliverable${deliverables.length === 1 ? "" : "s"} shared.`
        : "Add at least one final deliverable before requesting approval.",
      tab: "deliverables",
      blocking: true
    },
    {
      key: "reports",
      label: "Reports reviewed",
      complete: openReports.length === 0,
      detail: openReports.length
        ? `${openReports.length} open policy report${openReports.length === 1 ? "" : "s"} need review.`
        : "No open policy reports.",
      tab: "reports",
      blocking: true
    }
  ];
}

function renderCompletionReadiness(project, changes, payments, deliverables) {
  const checks = getCompletionChecks(project, changes, payments, deliverables);
  const blockers = checks.filter((check) => check.blocking && !check.complete);

  if (completionReadinessList) {
    completionReadinessList.innerHTML = "";
    checks.forEach((check) => {
      const item = buildReadinessItem(check.label, check.complete, check.detail);
      item.classList.add("readiness-item-action");
      item.addEventListener("click", () => {
        if (!check.complete) routeToChecklistItem(check);
      });
      completionReadinessList.appendChild(item);
    });
  }

  if (requestFinalBtn) {
    requestFinalBtn.textContent = blockers.length ? "Finish completion setup" : "Request final approval";
    requestFinalBtn.classList.toggle("btn-secondary", blockers.length > 0);
    requestFinalBtn.classList.toggle("btn-primary", blockers.length === 0);
    requestFinalBtn.disabled = ["awaiting_final_approval", "complete", "cancelled"].includes(project?.status);
  }

  if (completeProjectBtn) {
    completeProjectBtn.textContent = blockers.length
      ? "Finish before closing"
      : project?.status === "awaiting_final_approval"
      ? "Complete without client"
      : "Mark complete";
    completeProjectBtn.disabled = ["complete", "cancelled"].includes(project?.status);
  }

  if (startWorkBtn) {
    const startBlockers = getLifecyclePaymentBlockers("in_progress", changes, payments, deliverables);
    startWorkBtn.textContent = startBlockers.length ? "Deposit required" : "Mark in progress";
    startWorkBtn.classList.toggle("btn-secondary", startBlockers.length > 0);
    startWorkBtn.classList.toggle("btn-primary", startBlockers.length === 0 && project?.status === "accepted");
    startWorkBtn.disabled = !["accepted"].includes(project?.status);
  }

  return blockers;
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
  const pendingPaymentCount = getPendingProjectPayments(payments).length;
  const overdueCount = payments.filter(isPaymentOverdue).length;
  const openSuggestions = suggestions.filter((suggestion) => suggestion.status === "suggested").length;
  const openReports = currentContentReports.filter((report) => report.status === "open").length;
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
      complete: pendingPaymentCount === 0,
      detail: pendingPaymentCount
        ? overdueCount
          ? `${overdueCount} payment${overdueCount === 1 ? "" : "s"} overdue.`
          : `${pendingPaymentCount} payment${pendingPaymentCount === 1 ? "" : "s"} still pending.`
        : "No pending project payments."
    },
    {
      label: "Client suggestions reviewed",
      complete: openSuggestions === 0,
      detail: openSuggestions
        ? `${openSuggestions} suggestion${openSuggestions === 1 ? "" : "s"} need a decision.`
        : "No unreviewed suggestions."
    },
    {
      label: "Policy reports clear",
      complete: openReports === 0,
      detail: openReports
        ? `${openReports} open report${openReports === 1 ? "" : "s"} need review.`
        : "No open policy reports."
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

  renderProjectJourney(project);
  renderGuidedAction(project, scopeItems, changes, suggestions, payments, deliverables);

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

function getAgreementVersionStatusKind(status) {
  if (status === "accepted") return "success";
  if (status === "sent") return "warning";
  if (status === "superseded") return "neutral";
  return "neutral";
}

function buildAgreementVersionItem(version) {
  const snapshot = version.agreement_snapshot || {};
  const timestamp = version.accepted_at || version.sent_at || version.created_at;
  const subtitle = [
    version.status,
    version.accepted_by_name && `Accepted by ${version.accepted_by_name}`,
    timestamp && formatDateTime(timestamp)
  ]
    .filter(Boolean)
    .join(" | ");
  const statusPill = buildStatusPill(
    version.status || "draft",
    getAgreementVersionStatusKind(version.status)
  );
  const row = buildListRow(`Version ${version.version_number}`, subtitle, statusPill);
  const main = row.querySelector(".item-main");
  const previewParts = [
    snapshot.agreement_summary && `Summary: ${snapshot.agreement_summary}`,
    snapshot.agreement_scope && `Scope: ${snapshot.agreement_scope}`,
    snapshot.agreement_payment_terms && `Payment: ${snapshot.agreement_payment_terms}`
  ].filter(Boolean);

  if (main && previewParts.length) {
    const preview = document.createElement("p");
    preview.className = "item-details agreement-version-preview";
    preview.textContent = previewParts.join("\n");
    main.appendChild(preview);
  }

  return row;
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
    payment.payment_method === "stripe"
      ? "Stripe"
      : payment.payment_method === "paypal"
      ? "PayPal"
      : "Manual"
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

  if (options.allowReport !== false) {
    actions.appendChild(
      buildReportButton(
        "deliverable",
        deliverable.id,
        deliverable.title,
        options.reporterRole || (isClientView ? "client" : "freelancer")
      )
    );
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

function getScopedClientAction(section = clientSection) {
  const actions = {
    agreement: {
      title: "Review the agreement",
      copy: "This link is focused on the terms, scope and acceptance record for this project.",
      label: "View agreement",
      targetId: "client-agreement-preview"
    },
    scope: {
      title: "Review the included scope",
      copy: "This link is focused on the work currently included in the original agreement.",
      label: "View scope",
      targetId: "client-scope-list"
    },
    changes: {
      title: "Review paid changes",
      copy: "This link is focused on pending and approved change requests for this project.",
      label: "View changes",
      targetId: "client-pending-list"
    },
    payments: {
      title: "Review project payments",
      copy: "This link is focused on deposits, milestones or final balances requested for this project.",
      label: "View payments",
      targetId: "client-payment-list"
    },
    suggestions: {
      title: "Send or review suggestions",
      copy: "This link is focused on client ideas, references and freelancer responses.",
      label: "View suggestions",
      targetId: "client-suggestion-title"
    },
    updates: {
      title: "Review project updates",
      copy: "This link is focused on progress notes, images, references and the project gallery.",
      label: "View updates",
      targetId: "client-update-list"
    },
    completion: {
      title: "Review final approval",
      copy: "This link is focused on final approval and deliverables for this project.",
      label: "View final files",
      targetId: "client-deliverable-list"
    }
  };

  return actions[section] || null;
}

function applyClientSectionScope(section = clientSection) {
  const normalised = section || "all";
  document.querySelectorAll("[data-client-section]").forEach((panel) => {
    const panelSection = panel.dataset.clientSection;
    const visible = normalised === "all" || panelSection === normalised || panelSection === "all";
    panel.classList.toggle("hidden", !visible);
  });

  clientScopedContextCard?.classList.toggle("hidden", normalised === "all");
  if (clientScopedContextCopy && normalised !== "all") {
    clientScopedContextCopy.textContent = `This ${getClientSectionLabel(normalised)} link keeps the project summary visible, then focuses on the section the freelancer sent you.`;
  }

  if (normalised !== "all") {
    showBanner(`Showing ${getClientSectionLabel(normalised)} for this project.`, "info");
  }
}

function setClientVerificationMode(isVerifying) {
  clientVerificationCard?.classList.toggle("hidden", !isVerifying);
  clientLinkProblemCard?.classList.add("hidden");

  document.querySelectorAll("#client-view > section").forEach((section) => {
    if (section === clientVerificationCard) return;
    if (section === clientLinkProblemCard) return;
    section.classList.toggle("hidden", isVerifying);
  });
}

function renderClientLinkProblem(message) {
  isClientView = true;
  updateAuthButtons(false);
  setView("client");
  clientVerificationCard?.classList.add("hidden");
  document.querySelectorAll("#client-view > section").forEach((section) => {
    section.classList.toggle("hidden", section !== clientLinkProblemCard);
  });
  if (clientLinkProblemCopy) {
    clientLinkProblemCopy.textContent =
      message || "The link may have expired, been replaced, or been copied incorrectly. Ask the freelancer for a fresh Scopey link.";
  }
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

function renderClientSummary(project, scopeItems, changes, payments, deliverables) {
  const pendingChanges = changes.filter((change) => change.status === "pending");
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const approvedDeliverables = deliverables.filter((item) => item.status === "approved");
  const pendingChangeValue = pendingChanges.reduce(
    (sum, change) => sum + Number(change.price || 0),
    0
  );
  const pendingPaymentValue = pendingPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  if (clientNextAction) {
    clientNextAction.textContent = getClientNextAction(project, changes, payments, deliverables);
  }

  if (clientStatusChip) {
    clientStatusChip.textContent = getProjectStatusLabel(project.status);
    clientStatusChip.className = `status-chip status-${getProjectStatusKind(project.status)}`;
  }

  if (clientSummaryScope) {
    clientSummaryScope.textContent = `${scopeItems.length} item${scopeItems.length === 1 ? "" : "s"}`;
  }

  if (clientSummaryChanges) {
    clientSummaryChanges.textContent = pendingChanges.length
      ? `${pendingChanges.length} | ${formatCurrency(pendingChangeValue)}`
      : "None pending";
  }

  if (clientSummaryPayments) {
    clientSummaryPayments.textContent = pendingPayments.length
      ? `${pendingPayments.length} | ${formatCurrency(pendingPaymentValue)}`
      : "None due";
  }

  if (clientSummaryDeliverables) {
    clientSummaryDeliverables.textContent = deliverables.length
      ? `${approvedDeliverables.length}/${deliverables.length} approved`
      : "Not shared yet";
  }
}

function getClientPrimaryAction(project, changes = [], payments = [], deliverables = []) {
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const pendingChanges = changes.filter((change) => change.status === "pending");
  const unapprovedDeliverables = deliverables.filter((item) => item.status !== "approved");

  if (project?.status === "draft") {
    return {
      title: "Project is being prepared",
      copy: "The agreement has not been sent for acceptance yet.",
      label: "Review overview",
      targetId: "client-project-title"
    };
  }

  if (project?.status === "cancelled") {
    return {
      title: "Project cancelled",
      copy: "This workspace is now a read-only record of the stopped commission.",
      label: "View agreement",
      targetId: "client-agreement-preview"
    };
  }

  if (!project?.accepted_at && project?.status !== "cancelled") {
    return {
      title: "Review and accept the agreement",
      copy: "Check the project terms, scope, payment rules and revision policy.",
      label: "Review agreement",
      targetId: "client-agreement-preview"
    };
  }

  if (pendingPayments.length) {
    return {
      title: "Pay outstanding project payments",
      copy: `${pendingPayments.length} payment${pendingPayments.length === 1 ? "" : "s"} need attention before the record is clean.`,
      label: "View payments",
      targetId: "client-payment-list"
    };
  }

  if (pendingChanges.length) {
    return {
      title: "Review paid change requests",
      copy: "Approve and pay extras before they become part of the agreed work.",
      label: "View changes",
      targetId: "client-pending-list"
    };
  }

  if (project?.status === "awaiting_final_approval") {
    return {
      title: "Approve final completion",
      copy: "Review the final files and sign off the completed project.",
      label: "Approve completion",
      targetId: "client-completion-panel"
    };
  }

  if (unapprovedDeliverables.length) {
    return {
      title: "Review final deliverables",
      copy: `${unapprovedDeliverables.length} deliverable${unapprovedDeliverables.length === 1 ? "" : "s"} can still be approved.`,
      label: "View deliverables",
      targetId: "client-deliverable-list"
    };
  }

  if (project?.status === "complete") {
    return {
      title: "Project complete",
      copy: "The project has been signed off and saved as a record.",
      label: "View record",
      targetId: "client-agreement-preview"
    };
  }

  return {
    title: "Send an idea or reference",
    copy: "Use suggestions for new ideas so scope changes stay reviewed and priced.",
    label: "Suggest change",
    targetId: "client-suggestion-title"
  };
}

function renderClientPrimaryAction(project, changes, payments, deliverables) {
  const scopedAction = clientSection !== "all" ? getScopedClientAction(clientSection) : null;
  const action = scopedAction || getClientPrimaryAction(project, changes, payments, deliverables);
  if (clientPrimaryActionTitle) clientPrimaryActionTitle.textContent = action.title;
  if (clientPrimaryActionCopy) clientPrimaryActionCopy.textContent = action.copy;
  if (clientPrimaryActionBtn) {
    clientPrimaryActionBtn.textContent = action.label;
    clientPrimaryActionBtn.dataset.targetId = action.targetId;
  }
}

function getClientAttentionItems(project, changes = [], payments = [], deliverables = []) {
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const pendingChanges = changes.filter((change) => change.status === "pending");
  const unapprovedDeliverables = deliverables.filter((item) => item.status !== "approved");
  const items = [];

  if (!projectHasAgreement(project)) {
    items.push(["Waiting", "Freelancer is preparing terms", "neutral"]);
  } else if (!project?.accepted_at && !["complete", "cancelled"].includes(project?.status)) {
    items.push(["Action", "Agreement needs review", "warning"]);
  } else {
    items.push(["Done", "Agreement accepted", "success"]);
  }

  if (pendingPayments.length) {
    items.push(["Action", `${pendingPayments.length} payment${pendingPayments.length === 1 ? "" : "s"} due`, "warning"]);
  } else {
    items.push(["Clear", "No project payments due", "success"]);
  }

  if (pendingChanges.length) {
    items.push(["Review", `${pendingChanges.length} paid change${pendingChanges.length === 1 ? "" : "s"}`, "warning"]);
  } else {
    items.push(["Clear", "No paid changes pending", "success"]);
  }

  if (project?.status === "awaiting_final_approval") {
    items.push(["Action", "Final approval requested", "warning"]);
  } else if (unapprovedDeliverables.length) {
    items.push(["Review", `${unapprovedDeliverables.length} deliverable${unapprovedDeliverables.length === 1 ? "" : "s"}`, "warning"]);
  } else if (project?.status === "complete") {
    items.push(["Done", "Project complete", "success"]);
  }

  return items.slice(0, 4);
}

function renderClientAttention(project, changes, payments, deliverables) {
  if (!clientAttentionList) return;
  clientAttentionList.innerHTML = "";

  getClientAttentionItems(project, changes, payments, deliverables).forEach(([label, copy, kind]) => {
    const item = document.createElement("div");
    item.className = `client-attention-item status-${kind}`;
    const badge = document.createElement("span");
    badge.textContent = label;
    const text = document.createElement("strong");
    text.textContent = copy;
    item.appendChild(badge);
    item.appendChild(text);
    clientAttentionList.appendChild(item);
  });
}

function getClientFlowSteps(project, changes = [], payments = [], deliverables = []) {
  const hasPendingPayment = payments.some((payment) => payment.status === "pending");
  const hasPendingChange = changes.some((change) => change.status === "pending");
  const hasDeliverables = deliverables.length > 0;
  const allDeliverablesApproved = hasDeliverables && deliverables.every((item) => item.status === "approved");

  return [
    {
      label: "Agreement",
      copy: project?.accepted_at ? "Accepted" : "Review terms",
      complete: Boolean(project?.accepted_at),
      active: !project?.accepted_at && !["complete", "cancelled"].includes(project?.status)
    },
    {
      label: "Payments",
      copy: hasPendingPayment || hasPendingChange ? "Action needed" : "Clear",
      complete: !hasPendingPayment && !hasPendingChange,
      active: hasPendingPayment || hasPendingChange
    },
    {
      label: "Updates",
      copy: "Track progress",
      complete: Boolean(project?.accepted_at) && !["sent", "draft"].includes(project?.status),
      active: Boolean(project?.accepted_at) && !["complete", "cancelled"].includes(project?.status)
    },
    {
      label: "Final approval",
      copy:
        project?.status === "complete"
          ? "Signed off"
          : project?.status === "awaiting_final_approval"
          ? "Ready"
          : allDeliverablesApproved
          ? "Files approved"
          : "Not ready yet",
      complete: project?.status === "complete" || allDeliverablesApproved,
      active: project?.status === "awaiting_final_approval"
    }
  ];
}

function renderClientFlowSteps(project, changes, payments, deliverables) {
  if (!clientFlowSteps) return;
  clientFlowSteps.innerHTML = "";

  getClientFlowSteps(project, changes, payments, deliverables).forEach((step, index) => {
    const item = document.createElement("div");
    item.className = `client-flow-step ${step.complete ? "complete" : ""} ${step.active ? "active" : ""}`;

    const marker = document.createElement("span");
    marker.textContent = step.complete ? "OK" : String(index + 1);

    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = step.label;
    const copy = document.createElement("p");
    copy.textContent = step.copy;

    text.append(title, copy);
    item.append(marker, text);
    clientFlowSteps.appendChild(item);
  });
}

function getClientGuidanceItems(project, changes = [], payments = [], deliverables = []) {
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const pendingChanges = changes.filter((change) => change.status === "pending");
  const unapprovedDeliverables = deliverables.filter((item) => item.status !== "approved");

  if (project?.status === "complete") {
    return [
      ["Completion recorded", "The project has been signed off and saved as a record."],
      ["Review the agreement", "Accepted terms and scope remain visible for reference."],
      ["Download records", "Use the freelancer's exported PDFs or receipts where supplied."]
    ];
  }

  if (project?.status === "cancelled") {
    return [
      ["Project cancelled", "This workspace is retained as a record of the stopped commission."],
      ["Check the agreement", "Cancellation terms and prior scope remain available."],
      ["Contact the freelancer", "Use your existing communication channel for any dispute or follow-up."]
    ];
  }

  if (!project?.accepted_at) {
    return [
      ["Read the agreement", "Check the scope, value, payment terms and revision policy."],
      ["Accept when ready", "Acceptance records that the project terms are clear."],
      ["Send suggestions", "Use suggestions for ideas that should be reviewed before work changes."]
    ];
  }

  if (pendingPayments.length || pendingChanges.length) {
    return [
      ["Pay only approved work", "Pending changes and project payments stay separate from the original scope."],
      ["Review each request", "Check the description and price before approving extra work."],
      ["Keep decisions recorded", "Scopey saves paid approvals alongside the project history."]
    ];
  }

  if (project?.status === "awaiting_final_approval" || unapprovedDeliverables.length) {
    return [
      ["Review final files", "Check the deliverables against the accepted agreement."],
      ["Approve completion", "Sign off when the agreed work is complete."],
      ["Request clarification", "Send an update or suggestion if something still needs review."]
    ];
  }

  return [
    ["Follow progress", "Updates and images show what has changed since the last decision."],
    ["Suggest carefully", "New ideas can be reviewed, priced, accepted, revised or declined."],
    ["Keep scope clean", "Approved extras stay separate from the original agreement."]
  ];
}

function renderClientGuidance(project, changes, payments, deliverables) {
  if (!clientGuidanceGrid) return;
  clientGuidanceGrid.innerHTML = "";

  getClientGuidanceItems(project, changes, payments, deliverables).forEach(([title, copy]) => {
    const item = document.createElement("div");
    const heading = document.createElement("strong");
    const paragraph = document.createElement("p");
    heading.textContent = title;
    paragraph.textContent = copy;
    item.appendChild(heading);
    item.appendChild(paragraph);
    clientGuidanceGrid.appendChild(item);
  });
}

function runClientPrimaryAction() {
  const targetId = clientPrimaryActionBtn?.dataset.targetId;
  const target = targetId ? document.getElementById(targetId) : null;
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) {
      target.focus({ preventScroll: true });
    }
  }
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
  document.body.classList.remove("theme-soft", "theme-dusk", "theme-dark", "theme-high-contrast");

  if (theme === "soft") document.body.classList.add("theme-soft");
  if (theme === "dusk") document.body.classList.add("theme-dusk");
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

function renderLegalDocument(key = "privacy") {
  const documentKey = LEGAL_DOCUMENTS[key] ? key : "privacy";
  const doc = LEGAL_DOCUMENTS[documentKey];

  if (legalTitle) legalTitle.textContent = doc.title;
  if (legalUpdated) legalUpdated.textContent = doc.updated;
  if (!legalContent) return;

  document.querySelectorAll("[data-legal-doc]").forEach((button) => {
    button.classList.toggle("active", button.dataset.legalDoc === documentKey);
  });

  legalContent.innerHTML = "";

  const intro = document.createElement("p");
  intro.className = "legal-intro";
  intro.textContent = doc.intro;
  legalContent.appendChild(intro);

  doc.sections.forEach((section) => {
    const block = document.createElement("section");
    block.className = "legal-section";

    const heading = document.createElement("h4");
    heading.textContent = section.heading;
    block.appendChild(heading);

    const list = document.createElement("ul");
    section.body.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.appendChild(listItem);
    });
    block.appendChild(list);
    legalContent.appendChild(block);
  });
}

function openLegalModal(key = "privacy") {
  renderLegalDocument(key);
  legalModal?.setAttribute("aria-hidden", "false");
}

function closeLegalModal() {
  legalModal?.setAttribute("aria-hidden", "true");
}

async function openAccountModal() {
  renderAccountBilling();
  renderPaymentAccountSetup();
  accountModal?.setAttribute("aria-hidden", "false");

  try {
    const loaders = [];
    if (!currentBilling && currentUser) loaders.push(loadBilling());
    if (!currentPaymentAccount && currentUser) loaders.push(loadPaymentAccount());
    await Promise.allSettled(loaders);
    renderAccountBilling();
    renderPaymentAccountSetup();
  } catch (error) {
    console.error("Account modal error:", error);
    showBanner(error.message || "Could not load account details.", "error");
  }
}

function closeAccountModal() {
  accountModal?.setAttribute("aria-hidden", "true");
}

function openBetaFeedbackModal() {
  if (betaFeedbackEmail) {
    betaFeedbackEmail.value =
      currentUser?.email ||
      currentProject?.client_email ||
      betaFeedbackEmail.value ||
      "";
  }
  if (betaFeedbackCategory && isClientView) {
    betaFeedbackCategory.value = "client_flow";
  }
  betaFeedbackModal?.setAttribute("aria-hidden", "false");
  betaFeedbackMessage?.focus();
}

function closeBetaFeedbackModal() {
  betaFeedbackModal?.setAttribute("aria-hidden", "true");
}

function getFeedbackContext() {
  return {
    view: isClientView ? "client" : currentUser ? "owner" : "landing",
    projectId: currentProject?.id || null,
    projectStatus: currentProject?.status || null,
    projectTab: currentProjectTab || null,
    clientSection,
    hasUser: Boolean(currentUser),
    theme: getAccessibilitySettings().theme
  };
}

async function submitBetaFeedback() {
  const message = betaFeedbackMessage?.value.trim();

  if (!message) {
    showBanner("Add a short note before sending feedback.", "error");
    return;
  }

  setButtonLoading(submitBetaFeedbackBtn, true, "Sending...");

  try {
    const headers = await getOptionalAuthHeaders();
    const response = await fetch(`${API_URL}/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        category: betaFeedbackCategory?.value || "general",
        email: betaFeedbackEmail?.value.trim() || null,
        message,
        reporterRole: isClientView ? "client" : currentUser ? "freelancer" : "visitor",
        pageUrl: window.location.href,
        shareId: shareId || null,
        projectId: currentProject?.id || null,
        context: getFeedbackContext()
      })
    });

    await readJsonResponse(response, "Could not send feedback.");
    if (betaFeedbackMessage) betaFeedbackMessage.value = "";
    closeBetaFeedbackModal();
    showBanner("Thanks, feedback sent.", "success");
  } catch (error) {
    console.error("Feedback error:", error);
    showBanner(error.message || "Could not send feedback.", "error");
  } finally {
    setButtonLoading(submitBetaFeedbackBtn, false, "Send feedback");
  }
}

function isDeveloperDiagnosticsAvailable() {
  return Boolean(currentAdminReadiness);
}

function updateDeveloperDiagnosticsVisibility() {
  developerDiagnosticsBtn?.classList.toggle("hidden", !isDeveloperDiagnosticsAvailable());
}

async function openDeveloperDiagnosticsModal() {
  try {
    if (!currentAdminReadiness && currentUser) {
      await loadAdminReadiness();
    }
    if (!currentUser) {
      openAuthModal();
      showBanner("Sign in before viewing launch readiness.", "info");
      return;
    }
    if (!currentAdminReadiness) {
      showBanner("Launch readiness is only available to Scopey admins.", "warning");
      updateDeveloperDiagnosticsVisibility();
      return;
    }
    renderLaunchReadiness(currentAdminReadiness.setup || {});
    developerDiagnosticsModal?.setAttribute("aria-hidden", "false");
  } catch (error) {
    console.error("Developer diagnostics error:", error);
    showBanner(error.message || "Could not load launch readiness.", "error");
  }
}

function renderDemoProjectResult(demo = null) {
  if (!demoProjectResult) return;

  demoProjectResult.classList.toggle("hidden", !demo);
  if (!demo) return;

  if (demoProjectLink) {
    demoProjectLink.textContent = demo.link || "No link returned";
    demoProjectLink.href = demo.link || "#";
  }
  if (demoProjectAccessCode) {
    demoProjectAccessCode.textContent = demo.accessCode || "Not required";
  }
}

async function createAdminDemoProject() {
  setButtonLoading(createDemoProjectBtn, true, "Creating demo...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/admin/demo-project`, {
      method: "POST",
      headers,
      body: JSON.stringify({})
    });
    const demo = await readJsonResponse(response, "Could not create demo project.");

    currentProjectId = demo.project?.id || currentProjectId;
    await loadBilling();
    await loadProjects();
    await loadProject();
    renderDemoProjectResult(demo);

    if (demo.link && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(demo.link);
        showBanner("Demo project created and client link copied.", "success");
      } catch (_error) {
        showBanner("Demo project created. Copy the client link from Launch readiness.", "success");
      }
    } else {
      showBanner("Demo project created.", "success");
    }
  } catch (error) {
    console.error("Demo project error:", error);
    showBanner(error.message || "Could not create demo project.", "error");
  } finally {
    setButtonLoading(createDemoProjectBtn, false, "Create demo project");
  }
}

function closeDeveloperDiagnosticsModal() {
  developerDiagnosticsModal?.setAttribute("aria-hidden", "true");
}

async function openRightsModal() {
  try {
    if (!currentRights && currentUser) {
      await loadRights();
    }
    if (rightsLicenseCurrency && !rightsLicenseCurrency.value) {
      rightsLicenseCurrency.value = currentProject?.currency || currentProfile?.default_currency || "GBP";
    }
    if (rightsLicenseStart && !rightsLicenseStart.value) {
      rightsLicenseStart.value = new Date().toISOString().slice(0, 10);
    }
    renderRights();
    rightsModal?.setAttribute("aria-hidden", "false");
  } catch (error) {
    console.error("Rights modal error:", error);
    showBanner(error.message || "Could not open Scopey Rights.", "error");
  }
}

function closeRightsModal() {
  rightsModal?.setAttribute("aria-hidden", "true");
}

function openContentReportModal(report) {
  pendingContentReport = report;
  if (reportContentTitle) reportContentTitle.textContent = `Report ${getSourceLabel(report.sourceType)}`;
  if (reportContentContext) {
    reportContentContext.textContent = report.title
      ? `This report will be attached to "${report.title}".`
      : "This report will be attached to the current project.";
  }
  if (reportContentEmail) reportContentEmail.value = currentUser?.email || "";
  if (reportContentReason) reportContentReason.value = "policy";
  if (reportContentDetails) reportContentDetails.value = "";
  reportContentModal?.setAttribute("aria-hidden", "false");
}

function closeContentReportModal() {
  reportContentModal?.setAttribute("aria-hidden", "true");
  pendingContentReport = null;
  setButtonLoading(submitReportContentBtn, false, "Send report");
}

async function submitContentReport() {
  if (!pendingContentReport) return;

  const details = reportContentDetails?.value.trim();
  if (!details) {
    showBanner("Add a short note about what needs reviewing.", "error");
    return;
  }

  setButtonLoading(submitReportContentBtn, true, "Sending...");

  try {
    const payload = {
      sourceType: pendingContentReport.sourceType,
      sourceId: pendingContentReport.sourceId,
      reporterRole: pendingContentReport.reporterRole,
      reporterEmail: reportContentEmail?.value.trim() || null,
      reason: reportContentReason?.value || "policy",
      details,
      ...(isClientView ? getClientAccessPayload() : {})
    };
    const isPublicReport = pendingContentReport.reporterRole === "client" || isClientView;
    const url = isPublicReport
      ? `${API_URL}/public/project/${encodeURIComponent(shareId)}/reports`
      : `${API_URL}/project/${encodeURIComponent(currentProjectId)}/reports`;
    const response = await fetch(url, {
      method: "POST",
      headers: isPublicReport ? { "Content-Type": "application/json" } : await getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    await readJsonResponse(response, "Could not send report.");
    closeContentReportModal();
    if (!isPublicReport) await loadProject();
    showBanner("Report sent for review.", "success");
  } catch (error) {
    console.error("Content report error:", error);
    showBanner(error.message || "Could not send report.", "error");
  } finally {
    setButtonLoading(submitReportContentBtn, false, "Send report");
  }
}

function openReportReviewModal(report, status = report.status || "reviewed") {
  pendingReportReview = report;
  if (reportReviewTitle) reportReviewTitle.textContent = `Review ${getSourceLabel(report.source_type)}`;
  if (reportReviewContext) {
    reportReviewContext.textContent = `${getReportReasonLabel(report.reason)} reported by ${report.reporter_role || "unknown"}${report.reporter_email ? ` (${report.reporter_email})` : ""}.`;
  }
  if (reportReviewStatus) reportReviewStatus.value = status;
  if (reportReviewNote) reportReviewNote.value = report.reviewer_note || "";
  reportReviewModal?.setAttribute("aria-hidden", "false");
}

function closeReportReviewModal() {
  reportReviewModal?.setAttribute("aria-hidden", "true");
  pendingReportReview = null;
  setButtonLoading(submitReportReviewBtn, false, "Save review");
}

async function submitReportReview() {
  if (!pendingReportReview?.id || !currentProjectId) return;

  setButtonLoading(submitReportReviewBtn, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/project/${encodeURIComponent(currentProjectId)}/reports/${encodeURIComponent(pendingReportReview.id)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: reportReviewStatus?.value || "reviewed",
          reviewerNote: reportReviewNote?.value.trim() || null
        })
      }
    );

    await readJsonResponse(response, "Could not update report.");
    closeReportReviewModal();
    await loadProject();
    showBanner("Report review saved.", "success");
  } catch (error) {
    console.error("Report review error:", error);
    showBanner(error.message || "Could not update report.", "error");
  } finally {
    setButtonLoading(submitReportReviewBtn, false, "Save review");
  }
}

function renderContentReports() {
  if (!contentReportList) return;

  const reports = currentContentReports || [];
  const openCount = reports.filter((report) => report.status === "open").length;
  const resolvedCount = reports.filter((report) => report.status === "resolved").length;

  if (contentReportSummary) {
    contentReportSummary.textContent = reports.length
      ? `${openCount} open, ${resolvedCount} resolved, ${reports.length} total.`
      : "Policy, image and communication reports will appear here when submitted.";
  }

  contentReportList.innerHTML = "";

  if (!reports.length) {
    contentReportList.appendChild(
      buildEmptyState({
        title: "No reports yet",
        copy: "Client and freelancer reports will appear here with review actions."
      })
    );
    return;
  }

  reports.forEach((report) => {
    const actions = document.createElement("div");
    actions.className = "action-stack";
    actions.appendChild(buildStatusPill(report.status || "open", getReportStatusKind(report.status)));

    const reviewBtn = document.createElement("button");
    reviewBtn.className = "btn btn-secondary btn-small";
    reviewBtn.type = "button";
    reviewBtn.textContent = report.status === "open" ? "Review" : "Update";
    reviewBtn.addEventListener("click", () =>
      openReportReviewModal(report, report.status === "open" ? "reviewed" : report.status)
    );
    actions.appendChild(reviewBtn);

    if (report.status === "open") {
      const resolveBtn = document.createElement("button");
      resolveBtn.className = "btn btn-primary btn-small";
      resolveBtn.type = "button";
      resolveBtn.textContent = "Resolve";
      resolveBtn.addEventListener("click", () => openReportReviewModal(report, "resolved"));
      actions.appendChild(resolveBtn);
    }

    const subtitle = [
      getReportReasonLabel(report.reason),
      getSourceLabel(report.source_type),
      report.reporter_role,
      report.reporter_email,
      formatDateTime(report.created_at)
    ]
      .filter(Boolean)
      .join(" | ");

    const row = buildListRow("Reported content", subtitle, actions);
    const details = document.createElement("p");
    details.className = "item-details";
    details.textContent = report.details;
    row.querySelector(".item-main")?.appendChild(details);

    if (report.reviewer_note) {
      const note = document.createElement("p");
      note.className = "item-details report-review-note";
      note.textContent = `Review note: ${report.reviewer_note}`;
      row.querySelector(".item-main")?.appendChild(note);
    }

    contentReportList.appendChild(row);
  });
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

function openProjectActionModal(config) {
  pendingProjectAction = config;
  if (projectActionEyebrow) projectActionEyebrow.textContent = config.eyebrow || "Confirm action";
  if (projectActionTitle) projectActionTitle.textContent = config.title || "Are you sure?";
  if (projectActionCopy) projectActionCopy.textContent = config.copy || "This will update the selected project.";
  if (confirmProjectActionBtn) {
    confirmProjectActionBtn.textContent = config.confirmText || "Confirm";
    confirmProjectActionBtn.className = `btn ${config.danger ? "btn-danger" : "btn-primary"}`;
  }
  projectActionModal?.setAttribute("aria-hidden", "false");
}

function closeProjectActionModal() {
  projectActionModal?.setAttribute("aria-hidden", "true");
  pendingProjectAction = null;
  setButtonLoading(confirmProjectActionBtn, false, "Confirm");
}

async function confirmProjectAction() {
  if (!pendingProjectAction?.run) return;

  const action = pendingProjectAction;
  setButtonLoading(confirmProjectActionBtn, true, action.loadingText || "Working...");

  try {
    await action.run();
    closeProjectActionModal();
  } catch (error) {
    console.error("Project action error:", error);
    showBanner(error.message || "Could not update project.", "error");
    setButtonLoading(confirmProjectActionBtn, false, action.confirmText || "Confirm");
  }
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

  authLegalConsentWrap?.classList.toggle("hidden", isSignIn);

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
  if (authLegalConsent) authLegalConsent.checked = false;

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
    accountBtn?.classList.add("hidden");
    return;
  }

  if (isAuthed || hasStoredAuthSession()) {
    signInBtn.classList.add("hidden");
    signOutBtn.classList.remove("hidden");
    dashboardBtn.classList.remove("hidden");
    accountBtn?.classList.remove("hidden");
  } else {
    signInBtn.classList.remove("hidden");
    signOutBtn.classList.add("hidden");
    dashboardBtn.classList.add("hidden");
    accountBtn?.classList.add("hidden");
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

async function recordPolicyAcceptance() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/legal/acceptance`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      termsVersion: POLICY_VERSIONS.terms,
      privacyVersion: POLICY_VERSIONS.privacy
    })
  });

  return readJsonResponse(response, "Could not record policy acceptance.");
}

async function handlePasswordAuth() {
  const email = authEmailInput?.value.trim();
  const password = authPasswordInput?.value;

  if (!email || !password) {
    showBanner("Please enter both email and password.", "error");
    return;
  }

  if (authMode === "signup" && !authLegalConsent?.checked) {
    showBanner("Please agree to the Terms and Privacy Policy before creating an account.", "error");
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
      setView("landing");
      showBanner(
        timedOut
          ? "Sign-in is still syncing. The Dashboard button will be ready in a moment."
          : "Signed in. Use Dashboard when you are ready to manage projects.",
        timedOut ? "warning" : "success"
      );
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
        try {
          await recordPolicyAcceptance();
        } catch (acceptanceError) {
          console.error("Policy acceptance record error:", acceptanceError);
          showBanner(
            "Account created, but Scopey could not record policy acceptance. Run the latest Supabase schema.",
            "warning"
          );
        }
        updateAuthButtons(true);
        setView("landing");
        if (!bannerEl?.textContent?.includes("policy acceptance")) {
          showBanner("Account created and signed in. Use Dashboard when you are ready.", "success");
        }
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
        emailRedirectTo: getAppUrl()
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
  if (isSigningOut) return;
  isSigningOut = true;

  currentUser = null;
  currentProject = null;
  currentProjectId = null;
  currentProjects = [];
  currentArchivedProjects = [];
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
  currentContentReports = [];
  currentProfile = null;
  currentPaymentAccount = null;
  currentRights = null;
  currentAdminReadiness = null;
  currentGuidedAction = null;
  currentProjectTab = "overview";
  isClientView = false;

  clearStoredAuthSession();
  updateAuthButtons(false);
  updateDeveloperDiagnosticsVisibility();
  setView("landing");
  showBanner("Signed out.", "success");
  window.history.replaceState({}, "", getAppUrl());

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
  } finally {
    isSigningOut = false;
  }
}

async function openDashboard() {
  if (isOpeningDashboard) return;
  isOpeningDashboard = true;

  const user = currentUser || (await refreshCurrentUser());

  if (!user) {
    showBanner("Your session has expired. Please sign in again.", "warning");
    setView("landing");
    updateAuthButtons(false);
    isOpeningDashboard = false;
    return;
  }

  try {
    currentUser = user;
    updateAuthButtons(true);
    setView("owner");
    renderOwnerEmptyWorkspace();
    showBanner("Opening dashboard...", "info");
    await initOwnerView();
  } catch (error) {
    console.error("Dashboard button error:", error);
    showBanner("Could not open your dashboard.", "error");
    updateAuthButtons(true);
  } finally {
    isOpeningDashboard = false;
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

  if (currentProject) {
    renderHandoffPanel(
      currentProject,
      currentScopeItems,
      currentChanges,
      currentProjectPayments,
      currentDeliverables
    );
  }
}

function executeGuidedAction() {
  if (!currentGuidedAction) return;

  if (currentGuidedAction.type === "create") {
    setProjectCreateVisible(true, true);
    return;
  }

  if (!currentProject && currentGuidedAction.type !== "create") {
    showBanner("Choose a project first.", "warning");
    return;
  }

  if (currentGuidedAction.type === "tab") {
    setCurrentProjectTab(currentGuidedAction.tab || "overview");
    return;
  }

  if (currentGuidedAction.type === "copy") {
    copyShareLink();
    return;
  }

  if (currentGuidedAction.type === "status") {
    updateProjectStatus(currentGuidedAction.status, guidedActionBtn);
  }
}

function renderProjectList() {
  if (!projectListEl) return;

  projectListEl.innerHTML = "";
  archivedProjectListEl.innerHTML = "";

  if (!currentProjects.length) {
    projectListEl.appendChild(buildEmptyState("No active projects."));
  } else {
    currentProjects.forEach((project) => {
    const projectCard = document.createElement("div");
    projectCard.className = "project-list-card";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-list-item";
    if (!isCreatingProject && project.id === currentProjectId) {
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
      if (projectCreateCard) projectCreateCard.dataset.userOpened = "false";
      setProjectCreateVisible(false);
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

  if (!currentArchivedProjects.length) {
    archivedProjectListEl?.appendChild(buildEmptyState("No archived projects."));
    return;
  }

  currentArchivedProjects.forEach((project) => {
    const projectCard = document.createElement("div");
    projectCard.className = "project-list-card";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-list-item project-list-item-archived";
    if (!isCreatingProject && project.id === currentProjectId) {
      button.classList.add("active");
    }

    const title = document.createElement("div");
    title.className = "project-list-title";
    title.textContent = project.title;

    const meta = document.createElement("div");
    meta.className = "project-list-meta";
    meta.textContent = [
      project.client_name,
      getProjectCurrency(project),
      getProjectStatusLabel(project.status)
    ]
      .filter(Boolean)
      .join(" | ");

    button.appendChild(title);
    button.appendChild(meta);

    button.addEventListener("click", async () => {
      currentProjectId = project.id;
      if (projectCreateCard) projectCreateCard.dataset.userOpened = "false";
      setProjectCreateVisible(false);
      try {
        await loadProject();
      } catch (error) {
        console.error("Archived project open error:", error);
        showBanner("Could not open this archived project.", "error");
      }
    });

    projectCard.appendChild(button);
    archivedProjectListEl?.appendChild(projectCard);
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
  currentContentReports = [];

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
  renderProjectJourney({ status: "draft" });
  renderGuidedAction(null, [], [], [], [], []);
  renderSetupWizard(null, [], []);
  if (projectMoneyBrief) projectMoneyBrief.textContent = "No project selected";
  if (projectScopeBrief) projectScopeBrief.textContent = "No scope items yet";
  if (projectDeliveryBrief) projectDeliveryBrief.textContent = "No deliverables shared";
  if (projectReadinessList) projectReadinessList.innerHTML = "";
  renderContentReports();
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
  renderSetupWizard(project, scopeItems, payments);

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

  renderHandoffPanel(project, scopeItems, changes, payments, deliverables);
  renderContentReports();

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
  const openReports = currentContentReports.filter((report) => report.status === "open");
  if (openReports.length) {
    attentionItems.push([
      "Content reports open",
      `${openReports.length} policy report${openReports.length === 1 ? "" : "s"} need review.`
    ]);
  }
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
      agreementVersionList.appendChild(
        buildEmptyState({
          title: "No agreement history yet",
          copy: "Save the agreement to create the first draft version. Sent and accepted versions will appear here too."
        })
      );
    } else {
      agreementVersions.forEach((version) => {
        agreementVersionList.appendChild(buildAgreementVersionItem(version));
      });
    }
  }
  if (agreementStatusCopy) {
    agreementStatusCopy.textContent = project.accepted_at
      ? `Accepted by ${project.accepted_by_name || "client"} on ${formatDateTime(project.accepted_at)}. Saving changes will create a new draft revision.`
      : project.status === "sent"
      ? "Sent for client acceptance. The client can accept from the shared project page."
      : "Save the agreement to create a draft history version, then send the client share link for acceptance.";
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
      actions.appendChild(buildReportButton("suggestion", suggestion.id, suggestion.title, "freelancer"));

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

      const clientPreviewActions = document.createElement("div");
      clientPreviewActions.className = "action-stack";
      clientPreviewActions.appendChild(
        buildStatusPill(suggestion.status || "suggested", getSuggestionStatusKind(suggestion.status))
      );
      clientPreviewActions.appendChild(buildReportButton("suggestion", suggestion.id, suggestion.title, "freelancer"));

      ownerClientSuggestionList.appendChild(
        buildCollaborationCard(
          suggestion.title,
          suggestionSubtitle(suggestion),
          details,
          suggestion.image_url,
          clientPreviewActions
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
        (() => {
          const actions = document.createElement("div");
          actions.className = "action-stack";
          actions.appendChild(buildStatusPill(getUpdatePillText(update)));
          actions.appendChild(buildReportButton("update", update.id, title, "freelancer"));
          return actions;
        })()
      );

      ownerUpdateList.appendChild(card);
      const clientPreviewActions = document.createElement("div");
      clientPreviewActions.className = "action-stack";
      clientPreviewActions.appendChild(buildStatusPill(getUpdatePillText(update)));
      clientPreviewActions.appendChild(buildReportButton("update", update.id, title, "freelancer"));
      ownerClientUpdateList.appendChild(
        buildCollaborationCard(
          title,
          subtitle,
          update.message,
          update.image_url,
          clientPreviewActions
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
  renderCompletionReadiness(project, changes, payments, deliverables);

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
  const response = await fetchWithTimeout(`${API_URL}/profile`, { headers });
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
  const response = await fetchWithTimeout(`${API_URL}/billing`, { headers });
  currentBilling = await readJsonResponse(response, "Could not load billing.");
  renderBilling();
  return currentBilling;
}

async function loadAdminReadiness({ silent = false } = {}) {
  if (!currentUser) {
    currentAdminReadiness = null;
    updateDeveloperDiagnosticsVisibility();
    return null;
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${API_URL}/admin/readiness`,
      { headers },
      BACKGROUND_FETCH_TIMEOUT_MS
    );

    if (response.status === 403 || response.status === 404) {
      currentAdminReadiness = null;
      updateDeveloperDiagnosticsVisibility();
      return null;
    }

    currentAdminReadiness = await readJsonResponse(response, "Could not load launch readiness.");
    updateDeveloperDiagnosticsVisibility();
    return currentAdminReadiness;
  } catch (error) {
    currentAdminReadiness = null;
    updateDeveloperDiagnosticsVisibility();
    if (!silent) {
      console.error("Admin readiness load error:", error);
      showBanner(error.message || "Could not load launch readiness.", "error");
    }
    return null;
  }
}

async function loadRights() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${API_URL}/rights`,
      { headers },
      BACKGROUND_FETCH_TIMEOUT_MS
    );
    currentRights = await readJsonResponse(response, "Could not load Scopey Rights.");
  } catch (error) {
    console.error("Rights load error:", error);
    currentRights = null;
    showBanner(error.message || "Scopey Rights is not ready yet.", "warning");
  }

  renderRights();
  return currentRights;
}

async function createRightsArtwork() {
  const title = rightsArtworkTitle?.value.trim();
  const description = rightsArtworkDescription?.value.trim();

  if (!title) {
    showBanner("Add an artwork title first.", "error");
    return;
  }

  setButtonLoading(rightsCreateArtworkBtn, true, "Adding...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/rights/artworks`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title,
        description
      })
    });

    await readJsonResponse(response, "Could not add artwork.");
    if (rightsArtworkTitle) rightsArtworkTitle.value = "";
    if (rightsArtworkDescription) rightsArtworkDescription.value = "";
    await loadRights();
    showBanner("Artwork added to Scopey Rights.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not add artwork.", "error");
  } finally {
    setButtonLoading(rightsCreateArtworkBtn, false, "Add artwork");
  }
}

function getRightsLicensePayload() {
  return {
    clientName: rightsLicenseClient?.value.trim() || "",
    usageType: rightsLicenseUsageType?.value || "digital",
    territory: rightsLicenseTerritory?.value || "worldwide",
    exclusive: Boolean(rightsLicenseExclusive?.checked),
    fee: rightsLicenseFee?.value || 0,
    currency: rightsLicenseCurrency?.value || "GBP",
    startDate: rightsLicenseStart?.value || "",
    endDate: rightsLicenseEnd?.value || null,
    notes: rightsLicenseNotes?.value.trim() || null,
    acknowledgedConflict: Boolean(rightsAcknowledgeConflict?.checked)
  };
}

function resetRightsLicenseForm() {
  if (rightsLicenseClient) rightsLicenseClient.value = "";
  if (rightsLicenseUsageType) rightsLicenseUsageType.value = "digital";
  if (rightsLicenseTerritory) rightsLicenseTerritory.value = "worldwide";
  if (rightsLicenseExclusive) rightsLicenseExclusive.checked = false;
  if (rightsLicenseFee) rightsLicenseFee.value = "";
  if (rightsLicenseCurrency) rightsLicenseCurrency.value = currentProject?.currency || "GBP";
  if (rightsLicenseStart) rightsLicenseStart.value = new Date().toISOString().slice(0, 10);
  if (rightsLicenseEnd) rightsLicenseEnd.value = "";
  if (rightsLicenseNotes) rightsLicenseNotes.value = "";
  if (rightsAcknowledgeConflict) rightsAcknowledgeConflict.checked = false;
  pendingRightsConflicts = [];
}

async function createRightsLicense() {
  if (!selectedRightsArtworkId) {
    showBanner("Add or select an artwork before creating a licence.", "error");
    return;
  }

  const payload = getRightsLicensePayload();
  if (!payload.clientName || !payload.startDate) {
    showBanner("Add a client name and licence start date.", "error");
    return;
  }

  setButtonLoading(rightsCreateLicenseBtn, true, "Saving...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/rights/artworks/${encodeURIComponent(selectedRightsArtworkId)}/licenses`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json().catch(() => ({}));
    if (response.status === 409 && data.conflicts?.length) {
      pendingRightsConflicts = data.conflicts;
      renderRights();
      showBanner("Licence conflict found. Review it, then acknowledge if you still want to save.", "warning");
      return;
    }
    if (!response.ok) throw new Error(data?.error || "Could not add licence.");

    resetRightsLicenseForm();
    await loadRights();
    showBanner("Rights licence saved.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not add licence.", "error");
  } finally {
    setButtonLoading(rightsCreateLicenseBtn, false, "Add licence");
  }
}

async function exportRightsReport() {
  if (!currentRights?.plan?.reportingEnabled) {
    showUpgradePrompt("Rights CSV export is available on Pro.", "pro");
    return;
  }

  setButtonLoading(rightsExportBtn, true, "Exporting...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/rights/report.csv`, { headers });

    if (!response.ok) {
      await readJsonResponse(response, "Could not export rights report.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scopey-rights-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showBanner("Rights report exported.", "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not export rights report.", "error");
  } finally {
    setButtonLoading(rightsExportBtn, false, currentRights?.plan?.reportingEnabled ? "Export CSV" : "Export CSV on Pro");
  }
}

async function startUpgradeCheckout(plan = "pro", button = null) {
  if (PUBLIC_BETA_FREE_ONLY) {
    showBanner("Paid plans are coming soon. Scopey is free during public beta.", "info");
    return;
  }

  if (!currentUser && !hasStoredAuthSession()) {
    openAuthModal();
    showBanner("Create your free account first, then choose a plan from the dashboard.", "info");
    return;
  }

  const defaultText =
    button === billingPlanCtaBtn
      ? `Get ${plan === "business" ? "Business" : "Pro"}`
      : plan === "business"
      ? "Business"
      : "Upgrade to Pro";
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
    renderBilling();
  }
}

async function loadAgreementTemplates() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(
      `${API_URL}/agreement-templates`,
      { headers },
      BACKGROUND_FETCH_TIMEOUT_MS
    );
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
  if (!requirePlan("pro", "Agreement templates")) return;

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
    .order("created_at", { ascending: false });

  if (error) throw error;

  const projects = data || [];
  currentProjects = projects.filter(
    (project) =>
      !project.archived_at && !["cancelled", "complete"].includes(project.status)
  );
  currentArchivedProjects = projects.filter(
    (project) =>
      project.archived_at || ["cancelled", "complete"].includes(project.status)
  );
  renderProjectList();
  renderBilling();
  syncProjectCreateVisibility();

  if (!currentProjects.length && !currentArchivedProjects.some((project) => project.id === currentProjectId)) {
    currentProjectId = null;
    currentProject = null;
    renderOwnerEmptyWorkspace();
    return;
  }

  const allProjects = [...currentProjects, ...currentArchivedProjects];
  if (!currentProjectId || !allProjects.some((project) => project.id === currentProjectId)) {
    currentProjectId = (currentProjects[0] || currentArchivedProjects[0]).id;
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
    const collaborationResponse = await fetchWithTimeout(
      `${API_URL}/project/${encodeURIComponent(currentProjectId)}/collaboration`,
      { headers },
      BACKGROUND_FETCH_TIMEOUT_MS
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
  currentContentReports = collaboration.reports || [];

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
  setProjectCreationLoading(true, title);

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
    if (projectCreateCard) projectCreateCard.dataset.userOpened = "false";

    await loadBilling();
    await loadProjects();

    try {
      await loadProject();
      setProjectCreationLoading(false);
      showBanner("Project created. Start with the agreement, scope and client handoff when you are ready.", "success");
    } catch (loadError) {
      console.error("Project created but could not open:", loadError);
      setProjectCreationLoading(false);
      setProjectCreateVisible(false);
      showBanner("Project created, but could not open the workspace yet.", "warning");
    }
  } catch (error) {
    console.error(error);
    setProjectCreationLoading(false);
    setProjectCreateVisible(true, true);
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

async function performProjectStatusUpdate(status, button = null) {
  if (!currentProjectId) {
    showBanner("Select a project first.", "error");
    return;
  }

  if (status === "sent" && !projectHasAgreement(currentProject)) {
    showBanner("Add agreement terms before sending this project to the client.", "error");
    return;
  }

  const statusLabel = getProjectStatusLabel(status);
  setButtonLoading(button, true, `Marking ${statusLabel.toLowerCase()}...`);
  showBanner(`Updating project to ${statusLabel.toLowerCase()}...`, "info");

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
      await loadProjects();
    } else {
      await loadProjects();
    }
    await loadProject();
    showBanner(
      status === "sent"
        ? "Project marked sent for client acceptance."
        : status === "complete"
        ? "Project marked complete and moved to archived projects."
        : status === "cancelled"
        ? "Project cancelled and moved to archived projects."
        : `Project marked ${statusLabel.toLowerCase()}.`,
      "success"
    );
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not update project status.", "error");
  } finally {
    setButtonLoading(button, false);
  }
}

function updateProjectStatus(status, button = null) {
  if (status === "in_progress" && !currentProject?.accepted_at) {
    showBanner("Wait for the client to accept the agreement before marking work in progress.", "warning");
    setCurrentProjectTab("client");
    return;
  }

  const lifecycleBlockers = getLifecyclePaymentBlockers(status);
  if (lifecycleBlockers.length) {
    routeToChecklistItem(lifecycleBlockers[0]);
    return;
  }

  if (status === "awaiting_final_approval") {
    openProjectActionModal({
      eyebrow: "Final approval",
      title: "Request final client approval?",
      copy: "This tells the client the agreed work is ready for sign-off.",
      confirmText: "Request approval",
      loadingText: "Requesting...",
      danger: false,
      run: () => performProjectStatusUpdate(status, button)
    });
    return;
  }

  if (status === "complete") {
    openProjectActionModal({
      eyebrow: "Complete project",
      title: "Mark this project complete?",
      copy: currentProject?.status === "awaiting_final_approval"
        ? "Client approval is the cleanest completion record. Use this only if you need to close the project manually."
        : "This will mark the project complete and move it into archived projects.",
      confirmText: "Mark complete",
      loadingText: "Completing...",
      danger: false,
      run: () => performProjectStatusUpdate(status, button)
    });
    return;
  }

  if (status === "cancelled") {
    openProjectActionModal({
      eyebrow: "Cancel project",
      title: "Cancel this project?",
      copy: "This will mark the project cancelled and remove it from your active project list.",
      confirmText: "Cancel project",
      loadingText: "Cancelling...",
      danger: true,
      run: () => performProjectStatusUpdate(status, button)
    });
    return;
  }

  performProjectStatusUpdate(status, button);
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

async function performProjectArchiveToggle() {
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
    await loadBilling();
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

function toggleProjectArchive() {
  if (!currentProjectId) return;

  const archived = !currentProject?.archived_at;

  if (!archived) {
    performProjectArchiveToggle();
    return;
  }

  openProjectActionModal({
    eyebrow: "Archive project",
    title: "Archive this project?",
    copy: "This removes the project from your active list. You can still open it from Archived projects.",
    confirmText: "Archive project",
    loadingText: "Archiving...",
    danger: false,
    run: performProjectArchiveToggle
  });
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

  if (!requirePlan("pro", "Agreement PDF exports")) return;

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
    const link = data.link;

    if (!link) {
      throw new Error("Could not prepare a secure client link.");
    }

    await navigator.clipboard.writeText(link);
    showBanner(`${getClientSectionLabel(section)} link copied.`, "success");
  } catch (error) {
    console.error(error);
    showBanner("Could not copy share link.", "error");
  }
}

async function previewClientProject(event = null) {
  if (!currentProject?.share_id) {
    showBanner("Select a project first.", "error");
    return;
  }

  const button = event?.target?.closest?.("button") || null;
  const section = getShareSectionForTab();
  setButtonLoading(button, true, "Opening...");

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/project/${encodeURIComponent(currentProject.id)}/share-links`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ section, label: `${section} preview link` })
      }
    );
    const data = await readJsonResponse(response, "Could not create client preview link.");
    const link = data.link;

    if (!link) {
      showBanner("Could not prepare the client preview link.", "error");
      return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
    showBanner(`Opened ${getClientSectionLabel(section)} preview in a new tab.`, "success");
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not open client preview.", "error");
  } finally {
    setButtonLoading(button, false);
    if (button) button.blur();
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

async function sendAgreementForAcceptance() {
  if (!currentProject) {
    showBanner("Select a project first.", "error");
    return;
  }

  if (!projectHasAgreement(currentProject)) {
    showBanner("Save agreement terms before sending this project to the client.", "error");
    return;
  }

  if (!currentProject.client_email) {
    showBanner("Add a client email address before sending the agreement.", "error");
    return;
  }

  setButtonLoading(sendAgreementBtn, true, "Sending...");

  try {
    if (currentProject.status === "draft") {
      await performProjectStatusUpdate("sent", sendAgreementBtn);
      if (currentProject?.status === "draft") return;
    }

    await emailClientProject({ target: sendAgreementBtn });
  } finally {
    setButtonLoading(sendAgreementBtn, false, "Send for acceptance");
  }
}

async function sendClientHandoff() {
  if (!currentProject) {
    showBanner("Select a project first.", "error");
    return;
  }

  const incomplete = getHandoffChecks(
    currentProject,
    currentScopeItems,
    currentProjectPayments
  ).filter((check) => !check.complete);

  if (incomplete.length) {
    routeToChecklistItem(incomplete[0]);
    return;
  }

  setButtonLoading(handoffSendBtn, true, "Sending...");

  try {
    if (currentProject.status === "draft") {
      await performProjectStatusUpdate("sent", handoffSendBtn);
      if (currentProject?.status === "draft") return;
    }

    await emailClientProject({ target: handoffSendBtn });
  } finally {
    setButtonLoading(handoffSendBtn, false, "Send to client");
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
    const image = await watermarkFreelancerUpdateImage(await fileToDataUrl(ownerUpdateImage));
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
    showBanner(image ? "Progress update added with a freelancer watermark." : "Progress update added.", "success");
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
  currentContentReports = data.reports || [];
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
  renderClientSummary(project, scopeItems, changes, payments, deliverables);
  renderClientPrimaryAction(project, changes, payments, deliverables);
  renderClientAttention(project, changes, payments, deliverables);
  renderClientFlowSteps(project, changes, payments, deliverables);
  renderClientGuidance(project, changes, payments, deliverables);
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
  if (clientDeliverableEmail && !clientDeliverableEmail.value && project.client_email) {
    clientDeliverableEmail.value = project.client_email;
  }
  const projectClosed = ["complete", "cancelled"].includes(project.status);
  [
    clientSuggestionTitle,
    clientSuggestionPrice,
    clientSuggestionDetails,
    clientSuggestionImage,
    clientAddSuggestionBtn,
    clientUpdateMessage,
    clientUpdateImage,
    clientAddUpdateBtn
  ].forEach((control) => {
    if (control) control.disabled = projectClosed;
  });

  clientScopeList.innerHTML = "";
  clientPendingList.innerHTML = "";
  clientApprovedList.innerHTML = "";
  clientSuggestionList.innerHTML = "";
  clientUpdateList.innerHTML = "";
  clientPaymentList.innerHTML = "";
  if (clientDeliverableList) clientDeliverableList.innerHTML = "";
  renderGallery(clientGalleryList, gallery);

  if (scopeItems.length === 0) {
    clientScopeList.appendChild(buildEmptyState("The original scope has not been added yet."));
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
    clientPendingList.appendChild(buildEmptyState("No paid changes are waiting for approval."));
  } else if (projectClosed) {
    pending.forEach((change) => {
      const label = document.createElement("span");
      label.appendChild(buildStatusPill("closed", "neutral"));
      clientPendingList.appendChild(
        buildListRow(change.title, `No longer active | ${formatCurrency(change.price)}`, label)
      );
    });
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
    clientPaymentList.appendChild(buildEmptyState("No deposits, milestones or balances are due right now."));
  } else {
    payments.forEach((payment) => {
      clientPaymentList.appendChild(buildPaymentRow(payment, { clientPay: !projectClosed }));
    });
  }

  if (approved.length === 0) {
    clientApprovedList.appendChild(buildEmptyState("Approved paid changes will be recorded here."));
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
    clientSuggestionList.appendChild(
      buildEmptyState(
        projectClosed
          ? "Suggestions are closed because this project is no longer active."
          : "Client ideas and freelancer responses will appear here."
      )
    );
  } else {
    suggestions.forEach((suggestion) => {
      const details = [suggestion.details, suggestion.response_note && `Response: ${suggestion.response_note}`]
        .filter(Boolean)
        .join("\n");
      const actions = document.createElement("div");
      actions.className = "action-stack";
      actions.appendChild(
        buildStatusPill(suggestion.status || "suggested", getSuggestionStatusKind(suggestion.status))
      );
      actions.appendChild(buildReportButton("suggestion", suggestion.id, suggestion.title, "client"));

      clientSuggestionList.appendChild(
        buildCollaborationCard(
          suggestion.title,
          suggestionSubtitle(suggestion),
          details,
          suggestion.image_url,
          actions
        )
      );
    });
  }

  if (updates.length === 0) {
    clientUpdateList.appendChild(
      buildEmptyState(
        projectClosed
          ? "Updates are closed because this project is no longer active."
          : "Progress notes, reference images and decision updates will appear here."
      )
    );
  } else {
    updates.forEach((update) => {
      const title = getUpdateTitle(update, profile);
      const actions = document.createElement("div");
      actions.className = "action-stack";
      actions.appendChild(buildStatusPill(getUpdatePillText(update, profile)));
      actions.appendChild(buildReportButton("update", update.id, title, "client"));
      clientUpdateList.appendChild(
        buildCollaborationCard(
          title,
          formatDateTime(update.created_at),
          update.message,
          update.image_url,
          actions
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
      clientDeliverableList.appendChild(buildEmptyState("Final files will appear here when they are ready for approval."));
    } else {
      deliverables.forEach((deliverable) => {
        clientDeliverableList.appendChild(
          buildDeliverableRow(deliverable, { clientApprove: !projectClosed })
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
        ...getClientAccessPayload()
      })
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data?.error || "Could not start checkout.");
    }

    if (data.provider === "paypal") {
      showBanner(data.message || "Opening PayPal. Scopey will keep this pending until the freelancer confirms payment.", "info");
    }

    window.location.href = data.url;
  } catch (error) {
    console.error(error);
    showBanner(error.message || "Could not start payment. Please try again.", "error");
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
        ...getClientAccessPayload()
      })
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data?.error || "Could not start payment.");
    }

    if (data.provider === "paypal") {
      showBanner(data.message || "Opening PayPal. Scopey will keep this pending until the freelancer confirms payment.", "info");
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
        body: JSON.stringify({ clientName, clientEmail, ...getClientAccessPayload() })
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
        body: JSON.stringify({ clientName, clientEmail, ...getClientAccessPayload() })
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
  const clientName =
    clientDeliverableName?.value.trim() ||
    clientCompleteName?.value.trim() ||
    clientAcceptName?.value.trim();
  const clientEmail =
    clientDeliverableEmail?.value.trim() ||
    clientCompleteEmail?.value.trim() ||
    clientAcceptEmail?.value.trim();

  if (!clientName) {
    showBanner("Add your name before approving this deliverable.", "error");
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
        body: JSON.stringify({ clientName, clientEmail, ...getClientAccessPayload() })
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
          image,
          ...getClientAccessPayload()
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
        body: JSON.stringify({ message, image, ...getClientAccessPayload() })
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

    const [billingResult, profileResult, templatesResult, paymentAccountResult, projectsResult] =
      await Promise.allSettled([
        loadBilling(),
        loadProfile(),
        loadAgreementTemplates(),
        loadPaymentAccount(),
        loadProjects()
      ]);

    if (billingResult.status === "rejected") {
      console.error("Billing load error:", billingResult.reason);
      renderBilling();
    }

    if (profileResult.status === "rejected") {
      console.error("Profile load error:", profileResult.reason);
      renderProfilePreview(currentProfile);
    }

    if (templatesResult.status === "rejected") {
      console.error("Template load error:", templatesResult.reason);
      currentAgreementTemplates = [];
      renderTemplateOptions();
    }

    if (paymentAccountResult.status === "rejected") {
      console.error("Payment account load error:", paymentAccountResult.reason);
      currentPaymentAccount = null;
      renderPaymentAccountSetup();
    }

    if (projectsResult.status === "rejected") {
      throw projectsResult.reason;
    }

    void loadAdminReadiness({ silent: true });
    void loadRights();

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
    const message = error?.message
      ? `This shared project could not be loaded: ${error.message}`
      : "This shared project could not be loaded.";
    renderClientLinkProblem(message);
    showBanner(message, "error");
  }
}

async function init() {
  loadAccessibilitySettings();
  updateDeveloperDiagnosticsVisibility();
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
  void loadAdminReadiness({ silent: true });
  updateAuthButtons(true);
  setView("landing");

  if (paymentReturnState === "stripe-return" || paymentReturnState === "stripe-refresh") {
    currentPaymentAccount = null;
    openAccountModal();
    showBanner(
      paymentReturnState === "stripe-refresh"
        ? "Stripe setup needs another pass. Continue setup from Account."
        : "Stripe setup returned to Scopey. Check your payment status in Account.",
      "info"
    );
    window.history.replaceState({}, "", getAppUrl());
  }
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

accountBtn?.addEventListener("click", openAccountModal);

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
closeLegalBtn?.addEventListener("click", closeLegalModal);
closeAccountBtn?.addEventListener("click", closeAccountModal);
clientLinkHomeBtn?.addEventListener("click", () => {
  window.location.href = getAppUrl();
});
connectStripeBtn?.addEventListener("click", connectStripePayments);
savePaypalBtn?.addEventListener("click", savePaypalPayments);
betaFeedbackBtn?.addEventListener("click", openBetaFeedbackModal);
closeBetaFeedbackBtn?.addEventListener("click", closeBetaFeedbackModal);
cancelBetaFeedbackBtn?.addEventListener("click", closeBetaFeedbackModal);
submitBetaFeedbackBtn?.addEventListener("click", submitBetaFeedback);
developerDiagnosticsBtn?.addEventListener("click", openDeveloperDiagnosticsModal);
closeDeveloperDiagnosticsBtn?.addEventListener("click", closeDeveloperDiagnosticsModal);
createDemoProjectBtn?.addEventListener("click", createAdminDemoProject);
openRightsBtn?.addEventListener("click", openRightsModal);
closeRightsBtn?.addEventListener("click", closeRightsModal);

document.querySelectorAll("[data-legal-open]").forEach((button) => {
  button.addEventListener("click", () => openLegalModal(button.dataset.legalOpen));
});

document.querySelectorAll("[data-legal-doc]").forEach((button) => {
  button.addEventListener("click", () => renderLegalDocument(button.dataset.legalDoc));
});

toggleProjectCreateBtn?.addEventListener("click", () => {
  const shouldShow = projectCreateCard?.classList.contains("hidden");
  setProjectCreateVisible(Boolean(shouldShow), true);
});

copyLinkBtn?.addEventListener("click", copyShareLink);
handoffCopyLinkBtn?.addEventListener("click", copyShareLink);
clientReviewCopyLinkBtn?.addEventListener("click", copyShareLink);
handoffSendBtn?.addEventListener("click", sendClientHandoff);
previewClientBtn?.addEventListener("click", previewClientProject);
clientPreviewBtn?.addEventListener("click", previewClientProject);
clientPreviewBtnSecondary?.addEventListener("click", previewClientProject);
emailClientBtn?.addEventListener("click", emailClientProject);
handoffEmailClientBtn?.addEventListener("click", emailClientProject);
clientReviewEmailClientBtn?.addEventListener("click", emailClientProject);
guidedActionBtn?.addEventListener("click", executeGuidedAction);

document.querySelectorAll("[data-setup-tab]").forEach((button) => {
  button.addEventListener("click", () => setCurrentProjectTab(button.dataset.setupTab));
});

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
billingPlanCtaBtn?.addEventListener("click", () => {
  const selectedPlanKey = getSelectedBillingPlanKey();
  if (selectedPlanKey === "free" || selectedPlanKey === getCurrentPlanKey()) return;
  startUpgradeCheckout(selectedPlanKey, billingPlanCtaBtn);
});
upgradeProBtn?.addEventListener("click", () => selectBillingPlan("pro"));
upgradeBusinessBtn?.addEventListener("click", () => selectBillingPlan("business"));
rightsCreateArtworkBtn?.addEventListener("click", createRightsArtwork);
rightsArtworkSelect?.addEventListener("change", () => {
  selectedRightsArtworkId = rightsArtworkSelect.value;
  pendingRightsConflicts = [];
  renderRights();
});
rightsCreateLicenseBtn?.addEventListener("click", createRightsLicense);
rightsExportBtn?.addEventListener("click", exportRightsReport);
saveAgreementBtn?.addEventListener("click", saveAgreement);
sendAgreementBtn?.addEventListener("click", sendAgreementForAcceptance);
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
closeProjectActionBtn?.addEventListener("click", closeProjectActionModal);
cancelProjectActionBtn?.addEventListener("click", closeProjectActionModal);
confirmProjectActionBtn?.addEventListener("click", confirmProjectAction);
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
clientPrimaryActionBtn?.addEventListener("click", runClientPrimaryAction);
closeReportContentBtn?.addEventListener("click", closeContentReportModal);
cancelReportContentBtn?.addEventListener("click", closeContentReportModal);
submitReportContentBtn?.addEventListener("click", submitContentReport);
closeReportReviewBtn?.addEventListener("click", closeReportReviewModal);
cancelReportReviewBtn?.addEventListener("click", closeReportReviewModal);
submitReportReviewBtn?.addEventListener("click", submitReportReview);

db.auth.onAuthStateChange(async (event, session) => {
  currentUser = session?.user || null;

  if (shareId) return;

  if (currentUser) {
    resetAuthLoadingState();
    closeAuthModal();
    void loadAdminReadiness({ silent: true });
    updateAuthButtons(true);
  } else {
    currentAdminReadiness = null;
    updateDeveloperDiagnosticsVisibility();
    updateAuthButtons(false);
    setView("landing");
  }
});

window.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
  if (event.target === accessibilityModal) closeAccessibilityModal();
  if (event.target === legalModal) closeLegalModal();
  if (event.target === accountModal) closeAccountModal();
  if (event.target === betaFeedbackModal) closeBetaFeedbackModal();
  if (event.target === developerDiagnosticsModal) closeDeveloperDiagnosticsModal();
  if (event.target === rightsModal) closeRightsModal();
  if (event.target === reportContentModal) closeContentReportModal();
  if (event.target === reportReviewModal) closeReportReviewModal();
  if (event.target === deleteProjectModal || event.target === deleteProjectFinalModal) {
    closeProjectDeleteModals();
  }
  if (event.target === projectActionModal) closeProjectActionModal();
});

window.ScopeyActions = {
  openDashboard,
  signOut
};

init();
