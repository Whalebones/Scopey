import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import PDFDocument from "pdfkit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MODULE_NAME as RIGHTS_MODULE_NAME,
  RIGHTS_CONFIG,
  findConflicts,
  isLicenseActive,
  isLicenseExpiringSoon,
  validateLicenseInput
} from "./rights-core.js";

// =======================
// ENV CHECK
// =======================
const requiredEnv = [
  "STRIPE_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "FRONTEND_URL"
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing env vars: ${missing.join(", ")}`);
}

// =======================
// SETUP
// =======================
const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FRONTEND_URL = process.env.FRONTEND_URL;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "scopey-uploads";
const PORT = Number(process.env.PORT || 3000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 600);
const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ASSETS = new Set([
  "app.js",
  "styles.css",
  "favicon.svg",
  "scopey-icon.svg",
  "scopey-icon-on-dark.svg",
  "scopey-icon-on-red.svg",
  "scopey-logo.svg",
  "scopey-logo-dark.svg"
]);
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

const PROJECT_SELECT = [
  "id",
  "title",
  "client_name",
  "client_email",
  "currency",
  "share_id",
  "user_id",
  "status",
  "agreement_summary",
  "agreement_scope",
  "agreement_exclusions",
  "agreement_timeline",
  "agreement_payment_terms",
  "agreement_revision_terms",
  "agreement_cancellation_terms",
  "agreement_snapshot",
  "sent_at",
  "accepted_at",
  "accepted_by_name",
  "accepted_by_email",
  "final_approval_requested_at",
  "completed_at",
  "completed_by_name",
  "completed_by_email",
  "cancelled_at",
  "archived_at",
  "created_at"
].join(",");

const PUBLIC_PROJECT_SELECT = PROJECT_SELECT;
const PROJECT_PAYMENT_SELECT =
  "id,project_id,label,payment_type,amount,currency,status,payment_method,stripe_session_id,invoice_number,due_date,paid_at,created_at";
const PROFILE_SELECT = [
  "user_id",
  "brand_name",
  "bio",
  "contact_email",
  "default_currency",
  "default_agreement_summary",
  "default_agreement_scope",
  "default_agreement_exclusions",
  "default_agreement_timeline",
  "default_agreement_payment_terms",
  "default_agreement_revision_terms",
  "default_agreement_cancellation_terms",
  "profile_image_url",
  "profile_image_name",
  "updated_at"
].join(",");
const TEMPLATE_SELECT = [
  "id",
  "user_id",
  "name",
  "currency",
  "agreement_summary",
  "agreement_scope",
  "agreement_exclusions",
  "agreement_timeline",
  "agreement_payment_terms",
  "agreement_revision_terms",
  "agreement_cancellation_terms",
  "created_at",
  "updated_at"
].join(",");
const ACTIVITY_SELECT =
  "id,project_id,actor_role,event_type,title,detail,metadata,created_at";
const AGREEMENT_VERSION_SELECT =
  "id,project_id,version_number,status,agreement_snapshot,created_by_role,sent_at,accepted_at,accepted_by_name,accepted_by_email,created_at";
const DELIVERABLE_SELECT =
  "id,project_id,title,note,file_url,file_name,status,approved_at,approved_by_name,approved_by_email,created_at";
const RIGHTS_ARTWORK_SELECT =
  "id,owner_id,title,description,image_ref,source_commission_id,created_at,updated_at";
const RIGHTS_LICENSE_SELECT =
  "id,artwork_id,client_name,usage_type,territory,exclusive,fee,currency,start_date,end_date,notes,acknowledged_conflict,conflict_snapshot,created_at,updated_at";
const EMAIL_FROM = process.env.EMAIL_FROM || "Scopey <hello@scopey.local>";
const SUPPORTED_CURRENCIES = new Set([
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
]);
const PLAN_ORDER = ["free", "pro", "business"];
const PLAN_DEFINITIONS = {
  free: {
    key: "free",
    name: "Free",
    summary: "Try Scopey with one live client project.",
    priceLabel: "Free",
    limits: {
      activeProjects: 1,
      storageMb: 50,
      pdfExportsPerMonth: 1
    },
    features: {
      unlimitedProjects: false,
      agreementTemplates: false,
      brandedExports: false,
      automatedClientEmails: false,
      stripeCheckout: false,
      removeScopeyBranding: false
    }
  },
  pro: {
    key: "pro",
    name: "Pro",
    summary: "For solo freelancers who want polished client handoffs, PDFs and payment links.",
    priceLabel: "£15/month",
    limits: {
      activeProjects: null,
      storageMb: 1024,
      pdfExportsPerMonth: null
    },
    features: {
      unlimitedProjects: true,
      agreementTemplates: true,
      brandedExports: true,
      automatedClientEmails: true,
      stripeCheckout: true,
      removeScopeyBranding: true
    }
  },
  business: {
    key: "business",
    name: "Business",
    summary: "For studios and agencies that need higher storage, priority support and team-ready controls.",
    priceLabel: "£39/month",
    limits: {
      activeProjects: null,
      storageMb: 10240,
      pdfExportsPerMonth: null
    },
    features: {
      unlimitedProjects: true,
      agreementTemplates: true,
      brandedExports: true,
      automatedClientEmails: true,
      stripeCheckout: true,
      removeScopeyBranding: true,
      prioritySupport: true,
      teamReady: true
    }
  }
};
const STRIPE_PLAN_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_ID_PRO,
  business: process.env.STRIPE_PRICE_ID_BUSINESS || process.env.STRIPE_PRICE_ID_PRO_PLUS
};
const POLICY_VERSIONS = {
  terms: "2026-06-15",
  privacy: "2026-06-15"
};

// =======================
// MIDDLEWARE
// =======================
app.use("/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json({ limit: "8mb" }));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    }
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests. Please wait a moment and try again."
    },
    skip: (req) =>
      req.method === "OPTIONS" ||
      req.path === "/" ||
      req.path === "/index.html" ||
      req.path === "/favicon.ico" ||
      FRONTEND_ASSETS.has(req.path.slice(1))
  })
);

// =======================
// HELPERS
// =======================
async function getUserFromRequest(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    const err = new Error("Missing auth token");
    err.statusCode = 401;
    throw err;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    const err = new Error("Invalid auth token");
    err.statusCode = 401;
    throw err;
  }

  return data.user;
}

function normalisePlanKey(plan) {
  return PLAN_DEFINITIONS[plan] ? plan : "free";
}

function getPlanRank(plan) {
  return PLAN_ORDER.indexOf(normalisePlanKey(plan));
}

function publicPlanDefinition(plan) {
  return {
    key: plan.key,
    name: plan.name,
    summary: plan.summary,
    priceLabel: plan.priceLabel,
    limits: plan.limits,
    features: plan.features,
    checkoutConfigured: !hasPlaceholderStripeValue(STRIPE_PLAN_PRICE_IDS[plan.key])
  };
}

function hasPlaceholderStripeValue(value) {
  return !value || /xxx|dummy|\*/i.test(value);
}

function assertStripeBillingConfigured(plan) {
  if (hasPlaceholderStripeValue(process.env.STRIPE_SECRET)) {
    const err = new Error("Stripe billing is not configured yet. Add a real STRIPE_SECRET in .env.");
    err.statusCode = 503;
    throw err;
  }

  if (hasPlaceholderStripeValue(STRIPE_PLAN_PRICE_IDS[plan])) {
    const planName = PLAN_DEFINITIONS[plan]?.name || "this plan";
    const err = new Error(`Stripe checkout for ${planName} is not configured yet. Add the plan price ID in .env.`);
    err.statusCode = 503;
    throw err;
  }
}

function createPlanRequiredError(feature, requiredPlan = "pro") {
  const err = new Error(`${feature} is available on ${PLAN_DEFINITIONS[requiredPlan].name}.`);
  err.statusCode = 402;
  err.code = "plan_required";
  err.requiredPlan = requiredPlan;
  return err;
}

async function getUserPlan(userId) {
  const fallback = {
    user_id: userId,
    plan: "free",
    subscription_status: "free",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    current_period_end: null
  };

  const { data, error } = await supabase
    .from("user_plans")
    .select(
      "user_id,plan,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end,updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (!isMissingRelationError(error)) {
      console.warn("Plan lookup fallback:", error.message);
    }
    return fallback;
  }

  if (!data) return fallback;

  return {
    ...data,
    plan: normalisePlanKey(data.plan)
  };
}

async function countActiveProjects(userId) {
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null)
    .not("status", "in", "(complete,cancelled)");

  if (error) throw error;
  return count || 0;
}

async function getBillingOverview(user) {
  const planRecord = await getUserPlan(user.id);
  const planKey = normalisePlanKey(planRecord.plan);
  const plan = PLAN_DEFINITIONS[planKey];
  const activeProjects = await countActiveProjects(user.id);

  return {
    plan: {
      ...planRecord,
      ...publicPlanDefinition(plan)
    },
    usage: {
      activeProjects: {
        used: activeProjects,
        limit: plan.limits.activeProjects
      }
    },
    plans: PLAN_ORDER.map((key) => publicPlanDefinition(PLAN_DEFINITIONS[key])),
    setup: {
      stripeBillingConfigured:
        !hasPlaceholderStripeValue(process.env.STRIPE_SECRET) &&
        !hasPlaceholderStripeValue(STRIPE_PLAN_PRICE_IDS.pro) &&
        !hasPlaceholderStripeValue(STRIPE_PLAN_PRICE_IDS.business),
      emailConfigured: !hasPlaceholderStripeValue(process.env.RESEND_API_KEY)
    }
  };
}

async function assertPlan(userId, requiredPlan, feature) {
  const planRecord = await getUserPlan(userId);

  if (getPlanRank(planRecord.plan) < getPlanRank(requiredPlan)) {
    throw createPlanRequiredError(feature, requiredPlan);
  }

  return planRecord;
}

async function assertProjectLimit(userId) {
  const planRecord = await getUserPlan(userId);
  const plan = PLAN_DEFINITIONS[normalisePlanKey(planRecord.plan)];
  const limit = plan.limits.activeProjects;

  if (limit === null) {
    return { planRecord, activeProjects: await countActiveProjects(userId), limit };
  }

  const activeProjects = await countActiveProjects(userId);
  if (activeProjects >= limit) {
    const err = createPlanRequiredError("Unlimited active projects", "pro");
    err.message =
      "Free includes 1 active project. Upgrade to Pro to run multiple client projects.";
    err.usage = { activeProjects, limit };
    throw err;
  }

  return { planRecord, activeProjects, limit };
}

async function getRightsLicenseLimit(userId) {
  const planRecord = await getUserPlan(userId);
  const planKey = normalisePlanKey(planRecord.plan);

  if (planKey === "business") return { planRecord, limit: RIGHTS_CONFIG.businessTierLicenseCap };
  if (planKey === "pro") return { planRecord, limit: RIGHTS_CONFIG.proTierLicenseCap };
  return { planRecord, limit: RIGHTS_CONFIG.freeTierLicenseCap };
}

async function countRightsLicenses(userId) {
  const { data: artworks, error: artworkError } = await supabase
    .from("rights_artworks")
    .select("id")
    .eq("owner_id", userId);

  if (artworkError) throw artworkError;

  const artworkIds = (artworks || []).map((artwork) => artwork.id);
  if (artworkIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("rights_licenses")
    .select("id", { count: "exact", head: true })
    .in("artwork_id", artworkIds);

  if (error) throw error;
  return count || 0;
}

async function assertRightsLicenseLimit(userId) {
  const { planRecord, limit } = await getRightsLicenseLimit(userId);

  if (limit === null) {
    return { planRecord, licenseCount: await countRightsLicenses(userId), limit };
  }

  const licenseCount = await countRightsLicenses(userId);
  if (licenseCount >= limit) {
    const err = createPlanRequiredError("Unlimited rights licences", "pro");
    err.message = `Free includes ${limit} rights licences. Upgrade to Pro for unlimited licence tracking.`;
    err.usage = { rightsLicenses: licenseCount, limit };
    throw err;
  }

  return { planRecord, licenseCount, limit };
}

async function upsertUserPlan({
  userId,
  plan,
  status,
  stripeCustomerId = null,
  stripeSubscriptionId = null,
  currentPeriodEnd = null
}) {
  if (!userId) return;

  const { error } = await supabase.from("user_plans").upsert(
    {
      user_id: userId,
      plan: normalisePlanKey(plan),
      subscription_status: status || "active",
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      current_period_end: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("Skipping plan upsert because user_plans is missing.");
      return;
    }
    throw error;
  }
}

async function getOwnedChange(changeId, user) {
  const { data: change, error: changeError } = await supabase
    .from("changes")
    .select("id,title,price,project_id,status,paid")
    .eq("id", changeId)
    .single();

  if (changeError || !change) {
    const err = new Error("Change not found");
    err.statusCode = 404;
    throw err;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,user_id,share_id,currency")
    .eq("id", change.project_id)
    .single();

  if (projectError || !project) {
    const err = new Error("Project not found");
    err.statusCode = 404;
    throw err;
  }

  if (project.user_id !== user.id) {
    const err = new Error("Unauthorized access to change");
    err.statusCode = 403;
    throw err;
  }

  return { change, project };
}

async function getOwnedProject(projectId, user) {
  const { data: project, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", projectId)
    .single();

  if (error || !project) {
    const err = new Error("Project not found");
    err.statusCode = 404;
    throw err;
  }

  if (project.user_id !== user.id) {
    const err = new Error("Unauthorized access to project");
    err.statusCode = 403;
    throw err;
  }

  return project;
}

async function getOwnedArtwork(artworkId, user) {
  const { data: artwork, error } = await supabase
    .from("rights_artworks")
    .select(RIGHTS_ARTWORK_SELECT)
    .eq("id", artworkId)
    .single();

  if (error || !artwork) {
    const err = new Error("Artwork not found");
    err.statusCode = 404;
    throw err;
  }

  if (artwork.owner_id !== user.id) {
    const err = new Error("Unauthorized access to artwork");
    err.statusCode = 403;
    throw err;
  }

  return artwork;
}

function isMissingRelationError(error) {
  return error?.code === "42P01" || /does not exist/i.test(error?.message || "");
}

async function deleteRows(table, buildQuery, { optional = false } = {}) {
  const { error } = await buildQuery(supabase.from(table).delete());

  if (!error) {
    return;
  }

  if (optional && isMissingRelationError(error)) {
    console.warn(`Skipping missing delete table ${table}:`, error.message);
    return;
  }

  throw error;
}

async function deleteProjectDependents(projectId) {
  const { data: changes, error: changesError } = await supabase
    .from("changes")
    .select("id")
    .eq("project_id", projectId);

  if (changesError) {
    throw changesError;
  }

  const changeIds = (changes || []).map((change) => change.id);

  if (changeIds.length > 0) {
    await deleteRows("change_payments", (query) => query.in("change_id", changeIds), {
      optional: true
    });
  }

  const dependentTables = [
    "project_deliverables",
    "project_agreement_versions",
    "project_share_links",
    "project_activity",
    "project_payments",
    "project_updates",
    "suggestions",
    "scope_items",
    "changes"
  ];

  for (const table of dependentTables) {
    await deleteRows(table, (query) => query.eq("project_id", projectId), {
      optional: true
    });
  }
}

async function getProfileForUser(userId) {
  const fallback = {
    user_id: userId || null,
    brand_name: "Freelancer",
    bio: null,
    contact_email: null,
    default_currency: "GBP",
    default_agreement_summary: null,
    default_agreement_scope: null,
    default_agreement_exclusions: null,
    default_agreement_timeline: null,
    default_agreement_payment_terms: null,
    default_agreement_revision_terms: null,
    default_agreement_cancellation_terms: null,
    profile_image_url: null,
    profile_image_name: null
  };

  if (!userId) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("freelancer_profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Profile lookup fallback:", error.message);
  }

  return data || fallback;
}

async function getSharedProject(shareId) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(PUBLIC_PROJECT_SELECT)
    .eq("share_id", shareId)
    .single();

  if (projectError || !project) {
    const err = new Error("Shared project not found");
    err.statusCode = 404;
    throw err;
  }

  return project;
}

async function validateShareToken(projectId, token, accessCode = null) {
  if (!token) return null;

  const { data, error } = await supabase
    .from("project_share_links")
    .select("id,project_id,section,access_code,expires_at,revoked_at")
    .eq("token", token)
    .eq("project_id", projectId)
    .single();

  if (error || !data || data.revoked_at) {
    const err = new Error("This client link is no longer available");
    err.statusCode = 403;
    throw err;
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    const err = new Error("This client link has expired");
    err.statusCode = 403;
    throw err;
  }

  if (data.access_code && data.access_code !== accessCode) {
    const err = new Error("Client access code required");
    err.statusCode = 401;
    err.requiresVerification = true;
    err.section = data.section;
    throw err;
  }

  return data;
}

async function getOwnedSuggestion(suggestionId, user) {
  const { data: suggestion, error } = await supabase
    .from("suggestions")
    .select("id,project_id,title,details,proposed_price,status,image_url,response_note")
    .eq("id", suggestionId)
    .single();

  if (error || !suggestion) {
    const err = new Error("Suggestion not found");
    err.statusCode = 404;
    throw err;
  }

  const project = await getOwnedProject(suggestion.project_id, user);
  return { suggestion, project };
}

async function getCollaborationForProject(projectId) {
  const { data: suggestions, error: suggestionsError } = await supabase
    .from("suggestions")
    .select("id,project_id,title,details,proposed_price,status,image_url,response_note,created_at,updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (suggestionsError) throw suggestionsError;

  const { data: updates, error: updatesError } = await supabase
    .from("project_updates")
    .select("id,project_id,author_role,message,image_url,image_name,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (updatesError) throw updatesError;

  const activity = await getOptionalProjectActivity(projectId);
  const agreementVersions = await getOptionalAgreementVersions(projectId);
  const deliverables = await getOptionalProjectDeliverables(projectId);

  return {
    suggestions: suggestions || [],
    updates: updates || [],
    activity,
    agreementVersions,
    deliverables,
    gallery: buildProjectGallery(updates || [], suggestions || [], deliverables)
  };
}

async function getOptionalCollaborationForProject(projectId) {
  try {
    return await getCollaborationForProject(projectId);
  } catch (error) {
    console.warn("Collaboration lookup fallback:", error.message);
    return {
      suggestions: [],
      updates: [],
      activity: [],
      agreementVersions: [],
      deliverables: [],
      gallery: [],
      collaboration_warning: error.message
    };
  }
}

async function getProjectPayments(projectId) {
  const { data, error } = await supabase
    .from("project_payments")
    .select(PROJECT_PAYMENT_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getOptionalProjectPayments(projectId) {
  try {
    return await getProjectPayments(projectId);
  } catch (error) {
    console.warn("Project payments lookup fallback:", error.message);
    return [];
  }
}

async function getProjectActivity(projectId) {
  const { data, error } = await supabase
    .from("project_activity")
    .select(ACTIVITY_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getOptionalProjectActivity(projectId) {
  try {
    return await getProjectActivity(projectId);
  } catch (error) {
    console.warn("Project activity lookup fallback:", error.message);
    return [];
  }
}

async function getAgreementVersions(projectId) {
  const { data, error } = await supabase
    .from("project_agreement_versions")
    .select(AGREEMENT_VERSION_SELECT)
    .eq("project_id", projectId)
    .order("version_number", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getOptionalAgreementVersions(projectId) {
  try {
    return await getAgreementVersions(projectId);
  } catch (error) {
    console.warn("Agreement versions lookup fallback:", error.message);
    return [];
  }
}

async function getNextAgreementVersionNumber(projectId) {
  const versions = await getOptionalAgreementVersions(projectId);
  const latest = versions[0]?.version_number || 0;
  return latest + 1;
}

async function createAgreementVersion(project, fields = {}) {
  const versionNumber = await getNextAgreementVersionNumber(project.id);
  const snapshot = fields.agreement_snapshot || buildAgreementSnapshot(project);
  const { data, error } = await supabase
    .from("project_agreement_versions")
    .insert([
      {
        project_id: project.id,
        version_number: versionNumber,
        status: fields.status || "draft",
        agreement_snapshot: snapshot,
        created_by_role: fields.created_by_role || "freelancer",
        sent_at: fields.sent_at || null,
        accepted_at: fields.accepted_at || null,
        accepted_by_name: fields.accepted_by_name || null,
        accepted_by_email: fields.accepted_by_email || null
      }
    ])
    .select(AGREEMENT_VERSION_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function getProjectDeliverables(projectId) {
  const { data, error } = await supabase
    .from("project_deliverables")
    .select(DELIVERABLE_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getOptionalProjectDeliverables(projectId) {
  try {
    return await getProjectDeliverables(projectId);
  } catch (error) {
    console.warn("Project deliverables lookup fallback:", error.message);
    return [];
  }
}

function normaliseRightsDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    const err = new Error("Licence dates must use YYYY-MM-DD");
    err.statusCode = 400;
    throw err;
  }

  return date.toISOString().slice(0, 10);
}

function normaliseRightsOption(value, lookup, fallback) {
  return lookup[value] ? value : fallback;
}

function rightsLicensePayload(body, fallbackCurrency = "GBP") {
  const payload = {
    client_name: body?.clientName?.trim?.() || body?.client_name?.trim?.() || "",
    usage_type: normaliseRightsOption(
      body?.usageType || body?.usage_type,
      RIGHTS_CONFIG.usageTypes,
      "digital"
    ),
    territory: normaliseRightsOption(
      body?.territory,
      RIGHTS_CONFIG.territories,
      "worldwide"
    ),
    exclusive: Boolean(body?.exclusive),
    fee: Number.isFinite(Number(body?.fee)) ? Number(body.fee) : 0,
    currency: normaliseCurrency(body?.currency || fallbackCurrency),
    start_date: normaliseRightsDate(body?.startDate || body?.start_date),
    end_date: normaliseRightsDate(body?.endDate || body?.end_date),
    notes: body?.notes?.trim?.() || null
  };
  const validation = validateLicenseInput(payload);

  if (!validation.valid) {
    const err = new Error(validation.errors.join(", "));
    err.statusCode = 400;
    throw err;
  }

  return payload;
}

function decorateRightsLicense(license) {
  return {
    ...license,
    active: isLicenseActive(license),
    expiring_soon: isLicenseExpiringSoon(license)
  };
}

function conflictResponse(conflict) {
  return {
    license: decorateRightsLicense(conflict.license),
    reasons: conflict.reasons
  };
}

async function getRightsOverview(userId) {
  const { data: artworks, error: artworkError } = await supabase
    .from("rights_artworks")
    .select(RIGHTS_ARTWORK_SELECT)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (artworkError) throw artworkError;

  const artworkIds = (artworks || []).map((artwork) => artwork.id);
  let licenses = [];

  if (artworkIds.length > 0) {
    const { data, error } = await supabase
      .from("rights_licenses")
      .select(RIGHTS_LICENSE_SELECT)
      .in("artwork_id", artworkIds)
      .order("start_date", { ascending: false });

    if (error) throw error;
    licenses = data || [];
  }

  const decoratedLicenses = licenses.map(decorateRightsLicense);
  const licensesByArtwork = decoratedLicenses.reduce((acc, license) => {
    acc[license.artwork_id] ||= [];
    acc[license.artwork_id].push(license);
    return acc;
  }, {});

  return {
    artworks: (artworks || []).map((artwork) => ({
      ...artwork,
      licenses: licensesByArtwork[artwork.id] || []
    })),
    licenses: decoratedLicenses
  };
}

function createRightsSchemaError(error) {
  if (!isMissingRelationError(error)) return error;

  const err = new Error("Scopey Rights tables are not installed yet. Run the latest Supabase schema SQL.");
  err.statusCode = 503;
  return err;
}

function csvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildRightsCsv(artworks, licenses) {
  const artworkLookup = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const headers = [
    "Artwork",
    "Client",
    "Usage",
    "Territory",
    "Exclusive",
    "Fee",
    "Currency",
    "Start date",
    "End date",
    "Active",
    "Expiring soon",
    "Conflict acknowledged",
    "Notes"
  ];
  const rows = licenses.map((license) => {
    const artwork = artworkLookup.get(license.artwork_id);
    return [
      artwork?.title || "",
      license.client_name,
      license.usage_type,
      license.territory,
      license.exclusive ? "Yes" : "No",
      license.fee,
      license.currency,
      license.start_date,
      license.end_date || "Ongoing",
      license.active ? "Yes" : "No",
      license.expiring_soon ? "Yes" : "No",
      license.acknowledged_conflict ? "Yes" : "No",
      license.notes || ""
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
}

async function recordProjectActivity(projectId, event) {
  try {
    await supabase.from("project_activity").insert([
      {
        project_id: projectId,
        actor_role: event.actorRole || "system",
        event_type: event.eventType || "note",
        title: event.title,
        detail: event.detail || null,
        metadata: event.metadata || {}
      }
    ]);
  } catch (error) {
    console.warn("Activity record fallback:", error.message);
  }
}

function buildProjectGallery(updates = [], suggestions = [], deliverables = []) {
  return [
    ...updates
      .filter((update) => update.image_url)
      .map((update) => ({
        id: update.id,
        source: "update",
        title: update.author_role === "client" ? "Client upload" : "Progress upload",
        image_url: update.image_url,
        image_name: update.image_name,
        created_at: update.created_at
      })),
    ...suggestions
      .filter((suggestion) => suggestion.image_url)
      .map((suggestion) => ({
        id: suggestion.id,
        source: "suggestion",
        title: suggestion.title,
        image_url: suggestion.image_url,
        image_name: suggestion.image_name,
        created_at: suggestion.created_at
      })),
    ...deliverables
      .filter((deliverable) => deliverable.file_url)
      .map((deliverable) => ({
        id: deliverable.id,
        source: "deliverable",
        title: deliverable.title,
        image_url: deliverable.file_url,
        image_name: deliverable.file_name,
        created_at: deliverable.created_at
      }))
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function normaliseShareSection(section) {
  const allowed = new Set([
    "all",
    "agreement",
    "scope",
    "changes",
    "payments",
    "suggestions",
    "updates",
    "completion"
  ]);
  return allowed.has(section) ? section : "all";
}

function buildShareUrl(shareId, section = "all", token = null) {
  const url = new URL(FRONTEND_URL);
  url.searchParams.set("share", shareId);
  if (section && section !== "all") url.searchParams.set("section", section);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

function makeAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildClientEmail({ project, profile, link, section, accessCode = null }) {
  const sectionLabel = section === "all" ? "project workspace" : section;
  const brandName = profile.brand_name || "Your freelancer";
  return {
    subject: `"${project.title}" is ready to review`,
    text: [
      `Hi ${project.client_name || "there"},`,
      "",
      `${brandName} has shared "${project.title}" with you in Scopey.`,
      "",
      `Your ${sectionLabel} is ready to review.`,
      "",
      `Open it here: ${link}`,
      accessCode ? `Access code: ${accessCode}` : "",
      "",
      "Scopey keeps the original scope, changes, payments, updates and approvals in one shared project record.",
      "",
      `Current project status: ${project.status || "draft"}.`,
      "",
      "Thanks,",
      brandName
    ].join("\n")
  };
}

async function sendEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, provider: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      text
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || "Email provider rejected the message");
  }

  return { sent: true, provider: "resend", id: data?.id || null };
}

function makeInvoiceNumber(project, payment) {
  const date = new Date(payment.created_at || Date.now());
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `SCP-${stamp}-${String(payment.id).slice(0, 6).toUpperCase()}`;
}

function collectPdf(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function addPdfHeader(doc, title, subtitle) {
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor("#1A1A1A")
    .text(title, { lineGap: 4 });

  if (subtitle) {
    doc
      .moveDown(0.35)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#6b7280")
      .text(subtitle);
  }

  doc
    .moveDown(1)
    .strokeColor("#FF4D2E")
    .lineWidth(2)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke()
    .moveDown(1);
}

function addPdfSection(doc, label, value) {
  if (!value) return;

  if (doc.y > doc.page.height - 120) {
    doc.addPage();
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#E03A1E")
    .text(String(label).toUpperCase(), { characterSpacing: 0.6 });

  doc
    .moveDown(0.25)
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#1A1A1A")
    .text(String(value), {
      lineGap: 4,
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right
    })
    .moveDown(0.9);
}

function createBasePdf() {
  return new PDFDocument({
    size: "A4",
    margin: 54,
    info: {
      Creator: "Scopey"
    }
  });
}

async function buildAgreementPdf(project, profile) {
  const snapshot = project.agreement_snapshot || buildAgreementSnapshot(project);
  const rows = [
    ["Project", snapshot.project_title || project.title],
    ["Client", snapshot.client_name || project.client_name],
    ["Business", profile.brand_name],
    ["Accepted by", snapshot.accepted_by_name],
    ["Accepted at", snapshot.accepted_at],
    ["Summary", snapshot.agreement_summary],
    ["Included scope", snapshot.agreement_scope],
    ["Exclusions", snapshot.agreement_exclusions],
    ["Timeline", snapshot.agreement_timeline],
    ["Payment terms", snapshot.agreement_payment_terms],
    ["Revision policy", snapshot.agreement_revision_terms],
    ["Cancellation terms", snapshot.agreement_cancellation_terms]
  ].filter(([, value]) => value);

  const doc = createBasePdf();
  addPdfHeader(
    doc,
    `${project.title} Agreement`,
    `Generated by Scopey for ${profile.brand_name || "Freelancer"}`
  );

  rows.forEach(([label, value]) => addPdfSection(doc, label, value));
  return collectPdf(doc);
}

async function buildInvoicePdf(project, payment, profile) {
  const invoiceNumber = payment.invoice_number || makeInvoiceNumber(project, payment);
  const amount = `${payment.currency || project.currency || "GBP"} ${Number(payment.amount || 0).toFixed(2)}`;
  const doc = createBasePdf();

  addPdfHeader(
    doc,
    payment.status === "paid" ? "Receipt" : "Invoice",
    invoiceNumber
  );

  doc
    .font("Helvetica-Bold")
    .fontSize(26)
    .fillColor("#1A1A1A")
    .text(amount)
    .moveDown(1);

  [
    ["Business", profile.brand_name || "Freelancer"],
    ["Client", project.client_name || ""],
    ["Project", project.title],
    ["Payment", payment.label],
    ["Status", payment.status],
    ["Due date", payment.due_date || "Not set"],
    ["Paid at", payment.paid_at || "Not paid yet"]
  ].forEach(([label, value]) => addPdfSection(doc, label, value));

  return collectPdf(doc);
}

function buildAgreementSnapshot(project) {
  return {
    project_title: project.title,
    client_name: project.client_name,
    client_email: project.client_email,
    currency: project.currency || "GBP",
    agreement_summary: project.agreement_summary || "",
    agreement_scope: project.agreement_scope || "",
    agreement_exclusions: project.agreement_exclusions || "",
    agreement_timeline: project.agreement_timeline || "",
    agreement_payment_terms: project.agreement_payment_terms || "",
    agreement_revision_terms: project.agreement_revision_terms || "",
    agreement_cancellation_terms: project.agreement_cancellation_terms || "",
    accepted_at: new Date().toISOString()
  };
}

function publicProjectPayload(project) {
  return {
    id: project.id,
    title: project.title,
    client_name: project.client_name,
    client_email: project.client_email,
    currency: project.currency || "GBP",
    share_id: project.share_id,
    status: project.status || "draft",
    agreement_summary: project.agreement_summary,
    agreement_scope: project.agreement_scope,
    agreement_exclusions: project.agreement_exclusions,
    agreement_timeline: project.agreement_timeline,
    agreement_payment_terms: project.agreement_payment_terms,
    agreement_revision_terms: project.agreement_revision_terms,
    agreement_cancellation_terms: project.agreement_cancellation_terms,
    agreement_snapshot: project.agreement_snapshot,
    sent_at: project.sent_at,
    accepted_at: project.accepted_at,
    accepted_by_name: project.accepted_by_name,
    final_approval_requested_at: project.final_approval_requested_at,
    completed_at: project.completed_at,
    completed_by_name: project.completed_by_name
  };
}

function normaliseCurrency(currency) {
  const code = String(currency || "GBP").toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? code : "GBP";
}

function stripeCurrency(currency) {
  return normaliseCurrency(currency).toLowerCase();
}

function normaliseImagePayload(image) {
  if (!image?.dataUrl) return null;

  const match = String(image.dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    const err = new Error("Image must be a base64 data URL");
    err.statusCode = 400;
    throw err;
  }

  const contentType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    const err = new Error("Image must be smaller than 5MB");
    err.statusCode = 400;
    throw err;
  }

  const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  const safeName = String(image.name || `upload.${extension}`)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 80);

  return { buffer, contentType, safeName, extension };
}

async function uploadProjectImage(projectId, actorRole, image) {
  const payload = normaliseImagePayload(image);
  if (!payload) return { image_url: null, image_name: null };

  const filePath = `${projectId}/${actorRole}/${crypto.randomUUID()}-${payload.safeName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, payload.buffer, {
      contentType: payload.contentType,
      upsert: false
    });

  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return {
    image_url: data.publicUrl,
    image_name: payload.safeName
  };
}

async function uploadProfileImage(userId, image) {
  const payload = normaliseImagePayload(image);
  if (!payload) return {};

  const filePath = `profiles/${userId}/${crypto.randomUUID()}-${payload.safeName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, payload.buffer, {
      contentType: payload.contentType,
      upsert: false
    });

  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return {
    profile_image_url: data.publicUrl,
    profile_image_name: payload.safeName
  };
}

async function getSharedChange(shareId, changeId) {
  const project = await getSharedProject(shareId);

  const { data: change, error: changeError } = await supabase
    .from("changes")
    .select("id,title,price,status,paid,project_id")
    .eq("id", changeId)
    .eq("project_id", project.id)
    .single();

  if (changeError || !change) {
    const err = new Error("Change not found");
    err.statusCode = 404;
    throw err;
  }

  return { project, change };
}

async function getSharedProjectPayment(shareId, paymentId) {
  const project = await getSharedProject(shareId);

  const { data: payment, error } = await supabase
    .from("project_payments")
    .select(PROJECT_PAYMENT_SELECT)
    .eq("id", paymentId)
    .eq("project_id", project.id)
    .single();

  if (error || !payment) {
    const err = new Error("Payment not found");
    err.statusCode = 404;
    throw err;
  }

  return { project, payment };
}

async function wasEventProcessed(eventId) {
  const { data } = await supabase
    .from("processed_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  return !!data;
}

async function markEventProcessed(eventId) {
  await supabase.from("processed_events").insert([{ id: eventId }]);
}

// =======================
// HEALTH
// =======================
app.get(["/", "/index.html"], (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(APP_DIR, "index.html"));
});

app.get("/favicon.ico", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(APP_DIR, "favicon.svg"));
});

app.get("/:asset", (req, res, next) => {
  const { asset } = req.params;

  if (!FRONTEND_ASSETS.has(asset)) {
    return next();
  }

  res.set("Cache-Control", "no-store");
  return res.sendFile(path.join(APP_DIR, asset));
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// =======================
// BILLING & PLANS
// =======================
app.get("/billing", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const billing = await getBillingOverview(user);
    res.json(billing);
  } catch (error) {
    console.error("Billing load error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not load billing details" });
  }
});

app.post("/billing/checkout", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const requestedPlan = normalisePlanKey(req.body?.plan);

    if (requestedPlan === "free") {
      return res.status(400).json({ error: "Choose Pro or Business to upgrade." });
    }

    assertStripeBillingConfigured(requestedPlan);
    const priceId = STRIPE_PLAN_PRICE_IDS[requestedPlan];

    const planRecord = await getUserPlan(user.id);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: planRecord.stripe_customer_id || undefined,
      customer_email: planRecord.stripe_customer_id ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      metadata: {
        scopey_subscription: "true",
        user_id: user.id,
        plan: requestedPlan
      },
      subscription_data: {
        metadata: {
          scopey_subscription: "true",
          user_id: user.id,
          plan: requestedPlan
        }
      },
      custom_text: {
        submit: {
          message:
            "By subscribing, you request immediate access to Scopey digital services and agree to the Terms, Privacy Policy and Cancellation and Refund Policy."
        }
      },
      success_url: `${FRONTEND_URL}?billing=success`,
      cancel_url: `${FRONTEND_URL}?billing=cancelled`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Billing checkout error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not start upgrade checkout" });
  }
});

// =======================
// LEGAL ACCEPTANCE
// =======================
app.post("/legal/acceptance", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const termsVersion = req.body?.termsVersion || POLICY_VERSIONS.terms;
    const privacyVersion = req.body?.privacyVersion || POLICY_VERSIONS.privacy;

    const { data, error } = await supabase
      .from("policy_acceptances")
      .upsert(
        {
          user_id: user.id,
          terms_version: termsVersion,
          privacy_version: privacyVersion,
          accepted_at: new Date().toISOString(),
          user_agent: req.get("user-agent") || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      )
      .select("user_id,terms_version,privacy_version,accepted_at")
      .single();

    if (error) throw error;
    res.status(201).json({ acceptance: data });
  } catch (error) {
    const missingPolicyTable = isMissingRelationError(error);
    const message = missingPolicyTable
      ? "Policy acceptance table is not installed yet. Run the latest Supabase schema SQL."
      : error.message || "Could not record policy acceptance";
    console.error("Policy acceptance error:", message);
    res
      .status(missingPolicyTable ? 503 : error.statusCode || 500)
      .json({ error: message });
  }
});

// =======================
// PROJECTS
// =======================
app.post("/projects", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    await assertProjectLimit(user.id);

    const profile = await getProfileForUser(user.id);
    const title = req.body?.title?.trim();
    const clientName = req.body?.clientName?.trim();
    const clientEmail = req.body?.clientEmail?.trim();

    if (!title || !clientName || !clientEmail) {
      return res.status(400).json({ error: "Project, client name and client email are required" });
    }

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          title: title.slice(0, 120),
          client_name: clientName.slice(0, 120),
          client_email: clientEmail.slice(0, 240),
          currency: normaliseCurrency(req.body?.currency || profile.default_currency),
          user_id: user.id,
          share_id: crypto.randomUUID(),
          agreement_summary: profile.default_agreement_summary,
          agreement_scope: profile.default_agreement_scope,
          agreement_exclusions: profile.default_agreement_exclusions,
          agreement_timeline: profile.default_agreement_timeline,
          agreement_payment_terms: profile.default_agreement_payment_terms,
          agreement_revision_terms: profile.default_agreement_revision_terms,
          agreement_cancellation_terms: profile.default_agreement_cancellation_terms
        }
      ])
      .select("id")
      .single();

    if (error) throw error;
    res.status(201).json({ project: data });
  } catch (error) {
    console.error("Project create error:", error.message);
    res.status(error.statusCode || 500).json({
      error: error.message || "Could not create project",
      code: error.code,
      requiredPlan: error.requiredPlan,
      usage: error.usage
    });
  }
});

// =======================
// FREELANCER PROFILE
// =======================
app.get("/profile", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const profile = await getProfileForUser(user.id);

    res.json({ profile });
  } catch (error) {
    console.error("Profile load error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not load profile" });
  }
});

app.put("/profile", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const {
      brandName,
      bio,
      contactEmail,
      defaultCurrency,
      defaultAgreementSummary,
      defaultAgreementScope,
      defaultAgreementExclusions,
      defaultAgreementTimeline,
      defaultAgreementPaymentTerms,
      defaultAgreementRevisionTerms,
      defaultAgreementCancellationTerms,
      image
    } = req.body;
    const name = brandName?.trim();

    if (!name) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    const imageUpdate = await uploadProfileImage(user.id, image);
    const { data, error } = await supabase
      .from("freelancer_profiles")
      .upsert(
        {
          user_id: user.id,
          brand_name: name.slice(0, 80),
          bio: bio?.trim() ? bio.trim().slice(0, 240) : null,
          contact_email: contactEmail?.trim() || null,
          default_currency: normaliseCurrency(defaultCurrency),
          default_agreement_summary: defaultAgreementSummary?.trim() || null,
          default_agreement_scope: defaultAgreementScope?.trim() || null,
          default_agreement_exclusions: defaultAgreementExclusions?.trim() || null,
          default_agreement_timeline: defaultAgreementTimeline?.trim() || null,
          default_agreement_payment_terms: defaultAgreementPaymentTerms?.trim() || null,
          default_agreement_revision_terms: defaultAgreementRevisionTerms?.trim() || null,
          default_agreement_cancellation_terms: defaultAgreementCancellationTerms?.trim() || null,
          ...imageUpdate,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      )
      .select(PROFILE_SELECT)
      .single();

    if (error) throw error;

    res.json({ profile: data });
  } catch (error) {
    console.error("Profile save error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not save profile" });
  }
});

// =======================
// AGREEMENT TEMPLATES
// =======================
app.get("/agreement-templates", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { data, error } = await supabase
      .from("agreement_templates")
      .select(TEMPLATE_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ templates: data || [] });
  } catch (error) {
    console.error("Template load error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not load templates" });
  }
});

app.post("/agreement-templates", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    await assertPlan(user.id, "pro", "Reusable agreement templates");
    const {
      name,
      currency,
      agreementSummary,
      agreementScope,
      agreementExclusions,
      agreementTimeline,
      agreementPaymentTerms,
      agreementRevisionTerms,
      agreementCancellationTerms
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Template name is required" });
    }

    const { data, error } = await supabase
      .from("agreement_templates")
      .insert([
        {
          user_id: user.id,
          name: name.trim().slice(0, 80),
          currency: normaliseCurrency(currency),
          agreement_summary: agreementSummary?.trim() || null,
          agreement_scope: agreementScope?.trim() || null,
          agreement_exclusions: agreementExclusions?.trim() || null,
          agreement_timeline: agreementTimeline?.trim() || null,
          agreement_payment_terms: agreementPaymentTerms?.trim() || null,
          agreement_revision_terms: agreementRevisionTerms?.trim() || null,
          agreement_cancellation_terms: agreementCancellationTerms?.trim() || null
        }
      ])
      .select(TEMPLATE_SELECT)
      .single();

    if (error) throw error;
    res.status(201).json({ template: data });
  } catch (error) {
    console.error("Template create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({
        error: error.message || "Could not save template",
        code: error.code,
        requiredPlan: error.requiredPlan
      });
  }
});

// =======================
// SCOPEY RIGHTS
// =======================
app.get("/rights", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const overview = await getRightsOverview(user.id);
    const { planRecord, limit } = await getRightsLicenseLimit(user.id);

    res.json({
      moduleName: RIGHTS_MODULE_NAME,
      config: RIGHTS_CONFIG,
      plan: {
        key: normalisePlanKey(planRecord.plan),
        licenseLimit: limit,
        reportingEnabled: RIGHTS_CONFIG.reportingEnabledTiers.includes(
          normalisePlanKey(planRecord.plan)
        )
      },
      usage: {
        licenses: {
          used: overview.licenses.length,
          limit
        }
      },
      ...overview
    });
  } catch (error) {
    const responseError = createRightsSchemaError(error);
    console.error("Rights load error:", responseError.message);
    res
      .status(responseError.statusCode || 500)
      .json({ error: responseError.message || "Could not load rights library" });
  }
});

app.get("/rights/report.csv", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    await assertPlan(user.id, "pro", "Rights reporting");
    const overview = await getRightsOverview(user.id);
    const csv = buildRightsCsv(overview.artworks, overview.licenses);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="scopey-rights-report.csv"');
    res.send(csv);
  } catch (error) {
    const responseError = createRightsSchemaError(error);
    console.error("Rights report error:", responseError.message);
    res
      .status(responseError.statusCode || 500)
      .json({
        error: responseError.message || "Could not export rights report",
        code: responseError.code,
        requiredPlan: responseError.requiredPlan
      });
  }
});

app.post("/rights/artworks", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const title = req.body?.title?.trim();
    const sourceCommissionId = req.body?.sourceCommissionId || req.body?.source_commission_id || null;

    if (!title) {
      return res.status(400).json({ error: "Artwork title is required" });
    }

    if (sourceCommissionId) {
      await getOwnedProject(sourceCommissionId, user);
    }

    const { data, error } = await supabase
      .from("rights_artworks")
      .insert([
        {
          owner_id: user.id,
          title: title.slice(0, 140),
          description: req.body?.description?.trim?.() || null,
          image_ref: req.body?.imageRef?.trim?.() || req.body?.image_ref?.trim?.() || null,
          source_commission_id: sourceCommissionId
        }
      ])
      .select(RIGHTS_ARTWORK_SELECT)
      .single();

    if (error) throw error;
    res.status(201).json({ artwork: data });
  } catch (error) {
    const responseError = createRightsSchemaError(error);
    console.error("Rights artwork create error:", responseError.message);
    res
      .status(responseError.statusCode || 500)
      .json({ error: responseError.message || "Could not create artwork" });
  }
});

app.post("/project/:projectId/rights/artwork", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const project = await getOwnedProject(projectId, user);

    if (project.status !== "complete") {
      return res.status(409).json({
        error: "Rights artworks can be created from completed projects only."
      });
    }

    const { data, error } = await supabase
      .from("rights_artworks")
      .insert([
        {
          owner_id: user.id,
          title: req.body?.title?.trim?.() || project.title,
          description:
            req.body?.description?.trim?.() ||
            project.agreement_summary ||
            "Artwork created from a completed Scopey commission.",
          image_ref: req.body?.imageRef?.trim?.() || req.body?.image_ref?.trim?.() || null,
          source_commission_id: project.id
        }
      ])
      .select(RIGHTS_ARTWORK_SELECT)
      .single();

    if (error) throw error;

    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "rights_artwork_created",
      title: "Rights artwork created",
      detail: `"${data.title}" was added to Scopey Rights.`
    });

    res.status(201).json({ artwork: data });
  } catch (error) {
    const responseError = createRightsSchemaError(error);
    console.error("Project rights artwork create error:", responseError.message);
    res
      .status(responseError.statusCode || 500)
      .json({ error: responseError.message || "Could not create rights artwork" });
  }
});

app.post("/rights/artworks/:artworkId/licenses", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    await assertRightsLicenseLimit(user.id);
    const { artworkId } = req.params;
    const artwork = await getOwnedArtwork(artworkId, user);
    const payload = rightsLicensePayload(req.body, req.body?.currency || "GBP");

    const { data: existing, error: existingError } = await supabase
      .from("rights_licenses")
      .select(RIGHTS_LICENSE_SELECT)
      .eq("artwork_id", artwork.id);

    if (existingError) throw existingError;

    const conflicts = findConflicts(payload, existing || []);
    const acknowledgedConflict = Boolean(req.body?.acknowledgedConflict || req.body?.acknowledged_conflict);

    if (conflicts.length > 0 && !acknowledgedConflict) {
      return res.status(409).json({
        error: "This licence may conflict with existing rights. Review and acknowledge before saving.",
        conflicts: conflicts.map(conflictResponse)
      });
    }

    const conflictSnapshot = conflicts.length > 0 ? conflicts.map(conflictResponse) : [];
    const { data, error } = await supabase
      .from("rights_licenses")
      .insert([
        {
          artwork_id: artwork.id,
          ...payload,
          acknowledged_conflict: conflicts.length > 0,
          conflict_snapshot: conflictSnapshot
        }
      ])
      .select(RIGHTS_LICENSE_SELECT)
      .single();

    if (error) throw error;

    res.status(201).json({
      license: decorateRightsLicense(data),
      conflicts: conflictSnapshot
    });
  } catch (error) {
    const responseError = createRightsSchemaError(error);
    console.error("Rights license create error:", responseError.message);
    res
      .status(responseError.statusCode || 500)
      .json({
        error: responseError.message || "Could not create licence",
        code: responseError.code,
        requiredPlan: responseError.requiredPlan,
        usage: responseError.usage
      });
  }
});

// =======================
// PUBLIC SHARED PROJECT
// =======================
app.get("/public/project/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;
    const token = req.query.token ? String(req.query.token) : null;
    const accessCode = req.query.accessCode ? String(req.query.accessCode).trim() : null;
    const project = await getSharedProject(shareId);
    let shareLink = null;

    try {
      shareLink = await validateShareToken(project.id, token, accessCode);
    } catch (error) {
      if (error.requiresVerification) {
        return res.status(401).json({
          requiresVerification: true,
          section: error.section,
          project: {
            title: project.title,
            client_name: project.client_name,
            share_id: project.share_id
          }
        });
      }

      throw error;
    }

    const { data: scopeItems, error: scopeError } = await supabase
      .from("scope_items")
      .select("id,title,price")
      .eq("project_id", project.id);

    if (scopeError) throw scopeError;

    const { data: changes, error: changesError } = await supabase
      .from("changes")
      .select("id,title,price,status,paid,paid_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });

    if (changesError) throw changesError;

    const collaboration = await getOptionalCollaborationForProject(project.id);
    const profile = await getProfileForUser(project.user_id);
    const projectPayments = await getOptionalProjectPayments(project.id);

    res.json({
      project: publicProjectPayload(project),
      profile,
      scopeItems: scopeItems || [],
      changes: changes || [],
      projectPayments,
      shareLink,
      ...collaboration
    });
  } catch (error) {
    console.error("Public project load error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not load shared project" });
  }
});

// =======================
// OWNER COLLABORATION
// =======================
app.get("/project/:projectId/collaboration", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const project = await getOwnedProject(projectId, user);
    const collaboration = await getCollaborationForProject(project.id);
    const projectPayments = await getProjectPayments(project.id);

    res.json({ ...collaboration, projectPayments });
  } catch (error) {
    console.error("Owner collaboration load error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not load collaboration" });
  }
});

app.patch("/project/:projectId/details", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const { title, clientName, clientEmail, currency } = req.body;
    const project = await getOwnedProject(projectId, user);

    if (project.accepted_at) {
      return res.status(409).json({
        error: "Project details are locked after agreement acceptance."
      });
    }

    if (!title?.trim() || !clientName?.trim() || !clientEmail?.trim()) {
      return res.status(400).json({ error: "Project, client name and client email are required" });
    }

    const { data, error } = await supabase
      .from("projects")
      .update({
        title: title.trim(),
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        currency: normaliseCurrency(currency || project.currency)
      })
      .eq("id", project.id)
      .select(PROJECT_SELECT)
      .single();

    if (error) throw error;

    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "project_details_updated",
      title: "Project details updated",
      detail: "Project name, client details or currency were edited."
    });

    res.json({ project: data });
  } catch (error) {
    console.error("Project details update error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not update project details" });
  }
});

app.patch("/project/:projectId/archive", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const { archived } = req.body;
    const project = await getOwnedProject(projectId, user);

    const { data, error } = await supabase
      .from("projects")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", project.id)
      .select(PROJECT_SELECT)
      .single();

    if (error) throw error;

    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: archived ? "project_archived" : "project_unarchived",
      title: archived ? "Project archived" : "Project restored"
    });

    res.json({ project: data });
  } catch (error) {
    console.error("Project archive error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not archive project" });
  }
});

app.delete("/project/:projectId", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const project = await getOwnedProject(projectId, user);

    await deleteProjectDependents(project.id);

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);

    if (error) throw error;

    res.json({ deleted: true });
  } catch (error) {
    console.error("Project delete error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not delete project" });
  }
});

app.post("/project/:projectId/share-links", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const { section, expiresAt, label } = req.body;
    const project = await getOwnedProject(projectId, user);
    const normalisedSection = normaliseShareSection(section);

    const { data, error } = await supabase
      .from("project_share_links")
      .insert([
        {
          project_id: project.id,
          section: normalisedSection,
          label: label?.trim() || `${normalisedSection} link`,
          expires_at: expiresAt || null
        }
      ])
      .select("id,token,section,label,expires_at,revoked_at,created_at")
      .single();

    if (error) throw error;

    const link = buildShareUrl(project.share_id, normalisedSection, data.token);
    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "share_link_created",
      title: "Client link created",
      detail: `Created a ${normalisedSection} link for the client.`,
      metadata: { section: normalisedSection }
    });

    res.status(201).json({ shareLink: data, link });
  } catch (error) {
    console.error("Share link create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not create share link" });
  }
});

app.post("/project/:projectId/send-email", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    await assertPlan(user.id, "pro", "Automated client email");
    const { projectId } = req.params;
    const { section } = req.body;
    const project = await getOwnedProject(projectId, user);

    if (!project.client_email) {
      return res.status(400).json({ error: "Add a client email before sending" });
    }

    const normalisedSection = normaliseShareSection(section);
    const profile = await getProfileForUser(user.id);
    const accessCode = makeAccessCode();
    const { data: shareLink, error: linkError } = await supabase
      .from("project_share_links")
      .insert([
        {
          project_id: project.id,
          section: normalisedSection,
          label: `${normalisedSection} email link`,
          access_code: accessCode
        }
      ])
      .select("id,token,section,label,expires_at,revoked_at,created_at")
      .single();

    if (linkError) throw linkError;

    const link = buildShareUrl(project.share_id, normalisedSection, shareLink.token);
    const email = buildClientEmail({
      project,
      profile,
      link,
      section: normalisedSection,
      accessCode
    });
    const delivery = await sendEmail({
      to: project.client_email,
      subject: email.subject,
      text: email.text
    });
    const mailto = `mailto:${encodeURIComponent(project.client_email)}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}`;

    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: delivery.sent ? "email_sent" : "email_prepared",
      title: delivery.sent ? "Client email sent" : "Client email prepared",
      detail: delivery.sent
        ? `Sent the ${normalisedSection} link to ${project.client_email}.`
        : `Prepared the ${normalisedSection} email for ${project.client_email}.`,
      metadata: { section: normalisedSection, provider: delivery.provider }
    });

    res.json({ ...delivery, mailto, link, shareLink, accessCode: delivery.sent ? null : accessCode });
  } catch (error) {
    console.error("Client email error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({
        error: error.message || "Could not send client email",
        code: error.code,
        requiredPlan: error.requiredPlan
      });
  }
});

app.get("/project/:projectId/agreement-export", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    await assertPlan(user.id, "pro", "Agreement PDF exports");
    const { projectId } = req.params;
    const project = await getOwnedProject(projectId, user);
    const profile = await getProfileForUser(user.id);

    const pdf = await buildAgreementPdf(project, profile);
    res.set("Content-Type", "application/pdf");
    res.set(
      "Content-Disposition",
      `attachment; filename="${project.title.replace(/[^a-z0-9-]+/gi, "-")}-agreement.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    console.error("Agreement export error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({
        error: error.message || "Could not export agreement",
        code: error.code,
        requiredPlan: error.requiredPlan
      });
  }
});

app.get("/project-payments/:paymentId/invoice", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    await assertPlan(user.id, "pro", "Invoice and receipt PDF exports");
    const { paymentId } = req.params;
    const { data: payment, error: paymentError } = await supabase
      .from("project_payments")
      .select(PROJECT_PAYMENT_SELECT)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const project = await getOwnedProject(payment.project_id, user);
    const profile = await getProfileForUser(user.id);
    const invoiceNumber = payment.invoice_number || makeInvoiceNumber(project, payment);

    if (!payment.invoice_number) {
      await supabase
        .from("project_payments")
        .update({ invoice_number: invoiceNumber })
        .eq("id", payment.id);
    }

    const pdf = await buildInvoicePdf(
      project,
      { ...payment, invoice_number: invoiceNumber },
      profile
    );
    res.set("Content-Type", "application/pdf");
    res.set(
      "Content-Disposition",
      `attachment; filename="${invoiceNumber}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    console.error("Invoice export error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({
        error: error.message || "Could not export invoice",
        code: error.code,
        requiredPlan: error.requiredPlan
      });
  }
});

app.patch("/project/:projectId/agreement", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const project = await getOwnedProject(projectId, user);
    const {
      agreementSummary,
      agreementScope,
      agreementExclusions,
      agreementTimeline,
      agreementPaymentTerms,
      agreementRevisionTerms,
      agreementCancellationTerms,
      currency
    } = req.body;

    if (project.accepted_at) {
      await createAgreementVersion(project, {
        status: "superseded",
        agreement_snapshot: project.agreement_snapshot || buildAgreementSnapshot(project),
        accepted_at: project.accepted_at,
        accepted_by_name: project.accepted_by_name,
        accepted_by_email: project.accepted_by_email
      });
    }

    const { data, error } = await supabase
      .from("projects")
      .update({
        agreement_summary: agreementSummary?.trim() || null,
        agreement_scope: agreementScope?.trim() || null,
        agreement_exclusions: agreementExclusions?.trim() || null,
        agreement_timeline: agreementTimeline?.trim() || null,
        currency: normaliseCurrency(currency || project.currency),
        agreement_payment_terms: agreementPaymentTerms?.trim() || null,
        agreement_revision_terms: agreementRevisionTerms?.trim() || null,
        agreement_cancellation_terms: agreementCancellationTerms?.trim() || null,
        agreement_snapshot: project.accepted_at ? null : project.agreement_snapshot,
        status: project.accepted_at ? "draft" : project.status,
        accepted_at: project.accepted_at ? null : project.accepted_at,
        accepted_by_name: project.accepted_at ? null : project.accepted_by_name,
        accepted_by_email: project.accepted_at ? null : project.accepted_by_email
      })
      .eq("id", project.id)
      .select(PROJECT_SELECT)
      .single();

    if (error) throw error;
    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "agreement_saved",
      title: "Agreement saved",
      detail: "The project agreement terms were updated."
    });
    res.json({ project: data });
  } catch (error) {
    console.error("Agreement save error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not save agreement" });
  }
});

app.patch("/project/:projectId/status", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const { status } = req.body;
    const allowedStatuses = [
      "draft",
      "sent",
      "accepted",
      "in_progress",
      "awaiting_final_approval",
      "complete",
      "cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid project status" });
    }

    const project = await getOwnedProject(projectId, user);
    const allowedTransitions = {
      draft: ["sent", "cancelled"],
      sent: ["draft", "accepted", "cancelled"],
      accepted: ["in_progress", "awaiting_final_approval", "cancelled"],
      in_progress: ["awaiting_final_approval", "cancelled"],
      awaiting_final_approval: ["complete", "in_progress", "cancelled"],
      complete: [],
      cancelled: ["draft"]
    };
    const currentStatus = project.status || "draft";

    if (status !== currentStatus && !allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(409).json({
        error: `Project cannot move from ${currentStatus} to ${status}.`
      });
    }

    const update = { status };

    if (status === "sent") {
      update.sent_at = new Date().toISOString();
      update.cancelled_at = null;
    }
    if (status === "in_progress" && !project.accepted_at) {
      update.status = "in_progress";
    }
    if (status === "awaiting_final_approval") {
      update.final_approval_requested_at = new Date().toISOString();
    }
    if (status === "complete") {
      const profile = await getProfileForUser(user.id);
      update.completed_at = new Date().toISOString();
      update.completed_by_name = profile.brand_name;
      update.archived_at = update.completed_at;
    }
    if (status === "cancelled") {
      update.cancelled_at = new Date().toISOString();
      update.archived_at = update.cancelled_at;
    }

    const { data, error } = await supabase
      .from("projects")
      .update(update)
      .eq("id", project.id)
      .select(PROJECT_SELECT)
      .single();

    if (error) throw error;
    if (status === "sent") {
      await createAgreementVersion(data, {
        status: "sent",
        sent_at: data.sent_at,
        agreement_snapshot: buildAgreementSnapshot(data)
      });
    }
    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "status_changed",
      title: "Project status changed",
      detail: `Moved from ${currentStatus} to ${data.status}.`,
      metadata: { from: currentStatus, to: data.status }
    });
    res.json({ project: data });
  } catch (error) {
    console.error("Project status update error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not update project status" });
  }
});

app.post("/project/:projectId/payments", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const { label, amount, paymentType, status, paymentMethod, dueDate } = req.body;
    const project = await getOwnedProject(projectId, user);
    const price = Number(amount);

    if (!label?.trim() || Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: "Enter a payment label and valid amount" });
    }

    const { data, error } = await supabase
      .from("project_payments")
      .insert([
        {
          project_id: project.id,
          label: label.trim(),
          amount: price,
          currency: normaliseCurrency(project.currency),
          payment_type: paymentType || "custom",
          status: status || "pending",
          payment_method: paymentMethod || "manual",
          due_date: dueDate || null,
          paid_at: status === "paid" ? new Date().toISOString() : null,
          created_by_role: "freelancer"
        }
      ])
      .select(PROJECT_PAYMENT_SELECT)
      .single();

    if (error) throw error;
    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "payment_created",
      title: "Payment added",
      detail: `${data.label} was added for ${data.currency} ${data.amount}.`,
      metadata: { payment_id: data.id, status: data.status }
    });
    res.status(201).json({ payment: data });
  } catch (error) {
    console.error("Payment create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not create payment" });
  }
});

app.patch("/project-payments/:paymentId", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { paymentId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["pending", "paid", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("project_payments")
      .select(PROJECT_PAYMENT_SELECT)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    await getOwnedProject(payment.project_id, user);

    const { data, error } = await supabase
      .from("project_payments")
      .update({
        status,
        paid_at: status === "paid" ? new Date().toISOString() : null
      })
      .eq("id", payment.id)
      .select(PROJECT_PAYMENT_SELECT)
      .single();

    if (error) throw error;
    await recordProjectActivity(payment.project_id, {
      actorRole: "freelancer",
      eventType: "payment_updated",
      title: "Payment updated",
      detail: `${data.label} was marked ${data.status}.`,
      metadata: { payment_id: data.id, status: data.status }
    });
    res.json({ payment: data });
  } catch (error) {
    console.error("Payment update error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not update payment" });
  }
});

app.post("/project/:projectId/updates", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const { message, image } = req.body;

    if (!message?.trim() && !image?.dataUrl) {
      return res.status(400).json({ error: "Add a message or image first" });
    }

    const project = await getOwnedProject(projectId, user);
    const upload = await uploadProjectImage(project.id, "freelancer", image);

    const { data, error } = await supabase
      .from("project_updates")
      .insert([
        {
          project_id: project.id,
          author_role: "freelancer",
          message: message?.trim() || null,
          ...upload
        }
      ])
      .select("id,project_id,author_role,message,image_url,image_name,created_at")
      .single();

    if (error) throw error;
    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "update_added",
      title: "Progress update added",
      detail: message?.trim() || (upload.image_url ? "Image update added." : null),
      metadata: { update_id: data.id, has_image: Boolean(upload.image_url) }
    });

    res.status(201).json({ update: data });
  } catch (error) {
    console.error("Owner update create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not add update" });
  }
});

app.post("/project/:projectId/deliverables", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { projectId } = req.params;
    const { title, note, image } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Deliverable title is required" });
    }

    const project = await getOwnedProject(projectId, user);
    const upload = await uploadProjectImage(project.id, "deliverables", image);

    if (!upload.image_url) {
      return res.status(400).json({ error: "Upload an image deliverable first" });
    }

    const { data, error } = await supabase
      .from("project_deliverables")
      .insert([
        {
          project_id: project.id,
          title: title.trim(),
          note: note?.trim() || null,
          file_url: upload.image_url,
          file_name: upload.image_name,
          status: "shared"
        }
      ])
      .select(DELIVERABLE_SELECT)
      .single();

    if (error) throw error;

    await recordProjectActivity(project.id, {
      actorRole: "freelancer",
      eventType: "deliverable_shared",
      title: "Deliverable shared",
      detail: data.title,
      metadata: { deliverable_id: data.id }
    });

    res.status(201).json({ deliverable: data });
  } catch (error) {
    console.error("Deliverable create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not add deliverable" });
  }
});

app.patch("/suggestions/:suggestionId", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { suggestionId } = req.params;
    const { status, proposedPrice, responseNote } = req.body;
    const allowedStatuses = ["suggested", "accepted", "declined", "revised"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid suggestion status" });
    }

    const { suggestion } = await getOwnedSuggestion(suggestionId, user);

    const update = {
      status,
      response_note: responseNote?.trim() || null,
      updated_at: new Date().toISOString()
    };

    if (proposedPrice !== undefined && proposedPrice !== null && proposedPrice !== "") {
      const price = Number(proposedPrice);
      if (Number.isNaN(price) || price < 0) {
        return res.status(400).json({ error: "Enter a valid price" });
      }
      update.proposed_price = price;
    }

    const { data, error } = await supabase
      .from("suggestions")
      .update(update)
      .eq("id", suggestion.id)
      .select("id,project_id,title,details,proposed_price,status,image_url,response_note,created_at,updated_at")
      .single();

    if (error) throw error;
    await recordProjectActivity(data.project_id, {
      actorRole: "freelancer",
      eventType: "suggestion_reviewed",
      title: "Suggestion reviewed",
      detail: `${data.title} was marked ${data.status}.`,
      metadata: { suggestion_id: data.id, status: data.status }
    });

    res.json({ suggestion: data });
  } catch (error) {
    console.error("Suggestion update error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not update suggestion" });
  }
});

app.post("/suggestions/:suggestionId/create-change", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { suggestionId } = req.params;
    const { price, responseNote } = req.body;
    const { suggestion } = await getOwnedSuggestion(suggestionId, user);
    const finalPrice =
      price !== undefined && price !== null && price !== ""
        ? Number(price)
        : Number(suggestion.proposed_price || 0);

    if (!suggestion.title?.trim() || Number.isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({ error: "A positive price is required" });
    }

    const { data: change, error: changeError } = await supabase
      .from("changes")
      .insert([
        {
          project_id: suggestion.project_id,
          title: suggestion.title,
          price: finalPrice,
          status: "pending",
          paid: false
        }
      ])
      .select("id,title,price,status,paid,paid_at")
      .single();

    if (changeError) throw changeError;

    const { data: updatedSuggestion, error: suggestionError } = await supabase
      .from("suggestions")
      .update({
        status: "accepted",
        proposed_price: finalPrice,
        response_note: responseNote?.trim() || "Accepted as a paid change request.",
        updated_at: new Date().toISOString()
      })
      .eq("id", suggestion.id)
      .select("id,project_id,title,details,proposed_price,status,image_url,response_note,created_at,updated_at")
      .single();

    if (suggestionError) throw suggestionError;
    await recordProjectActivity(suggestion.project_id, {
      actorRole: "freelancer",
      eventType: "change_created_from_suggestion",
      title: "Suggestion became a change",
      detail: `${suggestion.title} was accepted as a paid change request.`,
      metadata: { suggestion_id: suggestion.id, change_id: change.id }
    });

    res.status(201).json({ change, suggestion: updatedSuggestion });
  } catch (error) {
    console.error("Suggestion change create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not create change request" });
  }
});

// =======================
// PUBLIC CLIENT COLLABORATION
// =======================
app.post("/public/project/:shareId/suggestions", async (req, res) => {
  try {
    const { shareId } = req.params;
    const { title, details, proposedPrice, image } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Suggestion title is required" });
    }

    const price =
      proposedPrice !== undefined && proposedPrice !== null && proposedPrice !== ""
        ? Number(proposedPrice)
        : null;

    if (price !== null && (Number.isNaN(price) || price < 0)) {
      return res.status(400).json({ error: "Enter a valid suggested value" });
    }

    const project = await getSharedProject(shareId);
    const upload = await uploadProjectImage(project.id, "client", image);

    const { data, error } = await supabase
      .from("suggestions")
      .insert([
        {
          project_id: project.id,
          title: title.trim(),
          details: details?.trim() || null,
          proposed_price: price,
          status: "suggested",
          ...upload
        }
      ])
      .select("id,project_id,title,details,proposed_price,status,image_url,response_note,created_at,updated_at")
      .single();

    if (error) throw error;
    await recordProjectActivity(project.id, {
      actorRole: "client",
      eventType: "suggestion_created",
      title: "Client suggestion added",
      detail: data.title,
      metadata: { suggestion_id: data.id, has_image: Boolean(upload.image_url) }
    });

    res.status(201).json({ suggestion: data });
  } catch (error) {
    console.error("Public suggestion create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not send suggestion" });
  }
});

app.post("/public/project/:shareId/updates", async (req, res) => {
  try {
    const { shareId } = req.params;
    const { message, image } = req.body;

    if (!message?.trim() && !image?.dataUrl) {
      return res.status(400).json({ error: "Add a note or image first" });
    }

    const project = await getSharedProject(shareId);
    const upload = await uploadProjectImage(project.id, "client", image);

    const { data, error } = await supabase
      .from("project_updates")
      .insert([
        {
          project_id: project.id,
          author_role: "client",
          message: message?.trim() || null,
          ...upload
        }
      ])
      .select("id,project_id,author_role,message,image_url,image_name,created_at")
      .single();

    if (error) throw error;
    await recordProjectActivity(project.id, {
      actorRole: "client",
      eventType: "client_update_added",
      title: "Client note added",
      detail: message?.trim() || (upload.image_url ? "Image note added." : null),
      metadata: { update_id: data.id, has_image: Boolean(upload.image_url) }
    });

    res.status(201).json({ update: data });
  } catch (error) {
    console.error("Public update create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not add update" });
  }
});

app.post("/public/project/:shareId/accept-agreement", async (req, res) => {
  try {
    const { shareId } = req.params;
    const { clientName, clientEmail } = req.body;
    const project = await getSharedProject(shareId);

    if (!clientName?.trim()) {
      return res.status(400).json({ error: "Client name is required" });
    }

    const acceptedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("projects")
      .update({
        status: "accepted",
        accepted_at: acceptedAt,
        accepted_by_name: clientName.trim(),
        accepted_by_email: clientEmail?.trim() || null,
        agreement_snapshot: {
          ...buildAgreementSnapshot(project),
          accepted_at: acceptedAt,
          accepted_by_name: clientName.trim(),
          accepted_by_email: clientEmail?.trim() || null
        }
      })
      .eq("id", project.id)
      .select(PUBLIC_PROJECT_SELECT)
      .single();

    if (error) throw error;
    await createAgreementVersion(data, {
      status: "accepted",
      created_by_role: "client",
      agreement_snapshot: data.agreement_snapshot,
      accepted_at: acceptedAt,
      accepted_by_name: clientName.trim(),
      accepted_by_email: clientEmail?.trim() || null
    });
    await recordProjectActivity(project.id, {
      actorRole: "client",
      eventType: "agreement_accepted",
      title: "Agreement accepted",
      detail: `${clientName.trim()} accepted the project agreement.`,
      metadata: { accepted_by_email: clientEmail?.trim() || null }
    });
    res.json({ project: publicProjectPayload(data) });
  } catch (error) {
    console.error("Agreement accept error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not accept agreement" });
  }
});

app.post("/public/project/:shareId/approve-completion", async (req, res) => {
  try {
    const { shareId } = req.params;
    const { clientName, clientEmail } = req.body;
    const project = await getSharedProject(shareId);

    if (!clientName?.trim()) {
      return res.status(400).json({ error: "Client name is required" });
    }

    if (project.status !== "awaiting_final_approval") {
      return res.status(400).json({ error: "This project is not awaiting final approval" });
    }

    const { data, error } = await supabase
      .from("projects")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        completed_by_name: clientName.trim(),
        completed_by_email: clientEmail?.trim() || null
      })
      .eq("id", project.id)
      .select(PUBLIC_PROJECT_SELECT)
      .single();

    if (error) throw error;
    await recordProjectActivity(project.id, {
      actorRole: "client",
      eventType: "completion_approved",
      title: "Completion approved",
      detail: `${clientName.trim()} approved the finished project.`,
      metadata: { completed_by_email: clientEmail?.trim() || null }
    });
    res.json({ project: publicProjectPayload(data) });
  } catch (error) {
    console.error("Completion approval error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not approve completion" });
  }
});

app.post("/public/project/:shareId/deliverables/:deliverableId/approve", async (req, res) => {
  try {
    const { shareId, deliverableId } = req.params;
    const { clientName, clientEmail } = req.body;
    const project = await getSharedProject(shareId);

    if (!clientName?.trim()) {
      return res.status(400).json({ error: "Client name is required" });
    }

    const { data: deliverable, error: deliverableError } = await supabase
      .from("project_deliverables")
      .select(DELIVERABLE_SELECT)
      .eq("id", deliverableId)
      .eq("project_id", project.id)
      .single();

    if (deliverableError || !deliverable) {
      return res.status(404).json({ error: "Deliverable not found" });
    }

    const { data, error } = await supabase
      .from("project_deliverables")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by_name: clientName.trim(),
        approved_by_email: clientEmail?.trim() || null
      })
      .eq("id", deliverable.id)
      .select(DELIVERABLE_SELECT)
      .single();

    if (error) throw error;

    await recordProjectActivity(project.id, {
      actorRole: "client",
      eventType: "deliverable_approved",
      title: "Deliverable approved",
      detail: data.title,
      metadata: { deliverable_id: data.id }
    });

    res.json({ deliverable: data });
  } catch (error) {
    console.error("Deliverable approval error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not approve deliverable" });
  }
});

// =======================
// OWNER CHECKOUT
// =======================
app.post("/create-change-checkout", async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    const { changeId } = req.body;

    if (!changeId) {
      return res.status(400).json({ error: "Missing changeId" });
    }

    const { change, project } = await getOwnedChange(changeId, user);
    await assertPlan(user.id, "pro", "Stripe checkout for paid changes");

    if (change.status === "approved" || change.paid) {
      return res
        .status(400)
        .json({ error: "This change is already paid or approved." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: stripeCurrency(project.currency),
            product_data: { name: change.title },
            unit_amount: Math.round(change.price * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        change_id: change.id
      },
      success_url: `${FRONTEND_URL}`,
      cancel_url: `${FRONTEND_URL}`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Secure checkout error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({
        error: error.message || "Could not create checkout",
        code: error.code,
        requiredPlan: error.requiredPlan
      });
  }
});

// =======================
// PUBLIC CLIENT CHECKOUT
// =======================
app.post("/public/create-change-checkout", async (req, res) => {
  try {
    const { shareId, changeId, section, token } = req.body;

    if (!shareId || !changeId) {
      return res.status(400).json({ error: "Missing shareId or changeId" });
    }

    const { project, change } = await getSharedChange(shareId, changeId);
    await assertPlan(project.user_id, "pro", "Stripe checkout for paid changes");

    if (change.status === "approved" || change.paid) {
      return res
        .status(400)
        .json({ error: "This change is already paid or approved." });
    }

    const returnUrl = buildShareUrl(shareId, normaliseShareSection(section), token || null);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: stripeCurrency(project.currency),
            product_data: { name: change.title },
            unit_amount: Math.round(change.price * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        change_id: change.id,
        share_id: shareId
      },
      success_url: returnUrl,
      cancel_url: returnUrl
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Public checkout error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({
        error: error.message || "Could not create checkout",
        code: error.code,
        requiredPlan: error.requiredPlan
      });
  }
});

app.post("/public/create-project-payment-checkout", async (req, res) => {
  try {
    const { shareId, paymentId, section, token } = req.body;

    if (!shareId || !paymentId) {
      return res.status(400).json({ error: "Missing shareId or paymentId" });
    }

    const { project, payment } = await getSharedProjectPayment(shareId, paymentId);
    await assertPlan(project.user_id, "pro", "Stripe checkout for project payments");

    if (payment.status === "paid") {
      return res.status(400).json({ error: "This payment is already marked paid" });
    }

    const returnUrl = buildShareUrl(shareId, normaliseShareSection(section), token || null);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: stripeCurrency(payment.currency),
            product_data: { name: payment.label },
            unit_amount: Math.round(payment.amount * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        project_payment_id: payment.id,
        share_id: shareId
      },
      success_url: returnUrl,
      cancel_url: returnUrl
    });

    const { error } = await supabase
      .from("project_payments")
      .update({
        payment_method: "stripe",
        stripe_session_id: session.id
      })
      .eq("id", payment.id);

    if (error) throw error;
    res.json({ url: session.url });
  } catch (error) {
    console.error("Public project payment checkout error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({
        error: error.message || "Could not create payment checkout",
        code: error.code,
        requiredPlan: error.requiredPlan
      });
  }
});

// =======================
// STRIPE WEBHOOK
// =======================
app.post("/webhook", async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook verification failed:", error.message);
    return res.status(400).send();
  }

  try {
    if (await wasEventProcessed(event.id)) {
      return res.json({ received: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.metadata?.scopey_subscription === "true") {
          const subscription = session.subscription
            ? await stripe.subscriptions.retrieve(session.subscription)
            : null;

          await upsertUserPlan({
            userId: session.metadata.user_id,
            plan: session.metadata.plan,
            status: subscription?.status || "active",
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: subscription?.id || session.subscription || null,
            currentPeriodEnd: subscription?.current_period_end || null
          });
        }

        if (session.metadata?.change_id) {
          const changeId = session.metadata.change_id;
          const amount = (session.amount_total || 0) / 100;

          const { error: updateError } = await supabase
            .from("changes")
            .update({
              status: "approved",
              paid: true,
              paid_at: new Date().toISOString()
            })
            .eq("id", changeId);

          if (updateError) throw updateError;

          const { error: paymentInsertError } = await supabase
            .from("change_payments")
            .insert([
              {
                change_id: changeId,
                amount,
                currency: normaliseCurrency(session.currency),
                stripe_session_id: session.id
              }
            ]);

          if (paymentInsertError) throw paymentInsertError;
        }

        if (session.metadata?.project_payment_id) {
          const paymentId = session.metadata.project_payment_id;

          const { error: projectPaymentUpdateError } = await supabase
            .from("project_payments")
            .update({
              status: "paid",
              payment_method: "stripe",
              stripe_session_id: session.id,
              paid_at: new Date().toISOString()
            })
            .eq("id", paymentId);

          if (projectPaymentUpdateError) throw projectPaymentUpdateError;
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;

        if (subscription.metadata?.scopey_subscription === "true") {
          await upsertUserPlan({
            userId: subscription.metadata.user_id,
            plan: subscription.metadata.plan,
            status: subscription.status,
            stripeCustomerId: subscription.customer || null,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: subscription.current_period_end || null
          });
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        if (subscription.metadata?.scopey_subscription === "true") {
          await upsertUserPlan({
            userId: subscription.metadata.user_id,
            plan: "free",
            status: "cancelled",
            stripeCustomerId: subscription.customer || null,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: subscription.current_period_end || null
          });
        }

        break;
      }

      default:
        break;
    }

    await markEventProcessed(event.id);
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    res.status(500).send();
  }
});

// =======================
// START
// =======================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
