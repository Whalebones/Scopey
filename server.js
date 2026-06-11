import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  "created_at"
].join(",");

const PUBLIC_PROJECT_SELECT = PROJECT_SELECT;
const PROJECT_PAYMENT_SELECT =
  "id,project_id,label,payment_type,amount,currency,status,payment_method,stripe_session_id,paid_at,created_at";
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
    max: 100
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

async function getProfileForUser(userId) {
  if (!userId) {
    return {
      user_id: null,
      brand_name: "Freelancer",
      bio: null,
      profile_image_url: null,
      profile_image_name: null
    };
  }

  const { data, error } = await supabase
    .from("freelancer_profiles")
    .select("user_id,brand_name,bio,profile_image_url,profile_image_name,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Profile lookup fallback:", error.message);
  }

  return data || {
    user_id: userId,
    brand_name: "Freelancer",
    bio: null,
    profile_image_url: null,
    profile_image_name: null
  };
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

  return {
    suggestions: suggestions || [],
    updates: updates || []
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
    const { brandName, bio, image } = req.body;
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
          ...imageUpdate,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      )
      .select("user_id,brand_name,bio,profile_image_url,profile_image_name,updated_at")
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
// PUBLIC SHARED PROJECT
// =======================
app.get("/public/project/:shareId", async (req, res) => {
  try {
    const { shareId } = req.params;
    const project = await getSharedProject(shareId);

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
        agreement_cancellation_terms: agreementCancellationTerms?.trim() || null
      })
      .eq("id", project.id)
      .select(PROJECT_SELECT)
      .single();

    if (error) throw error;
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
    }
    if (status === "cancelled") {
      update.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("projects")
      .update(update)
      .eq("id", project.id)
      .select(PROJECT_SELECT)
      .single();

    if (error) throw error;
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
    const { label, amount, paymentType, status, paymentMethod } = req.body;
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
          paid_at: status === "paid" ? new Date().toISOString() : null,
          created_by_role: "freelancer"
        }
      ])
      .select(PROJECT_PAYMENT_SELECT)
      .single();

    if (error) throw error;
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

    res.status(201).json({ update: data });
  } catch (error) {
    console.error("Owner update create error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not add update" });
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
    res.json({ project: publicProjectPayload(data) });
  } catch (error) {
    console.error("Completion approval error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not approve completion" });
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
      .json({ error: error.message || "Could not create checkout" });
  }
});

// =======================
// PUBLIC CLIENT CHECKOUT
// =======================
app.post("/public/create-change-checkout", async (req, res) => {
  try {
    const { shareId, changeId } = req.body;

    if (!shareId || !changeId) {
      return res.status(400).json({ error: "Missing shareId or changeId" });
    }

    const { project, change } = await getSharedChange(shareId, changeId);

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
        change_id: change.id,
        share_id: shareId
      },
      success_url: `${FRONTEND_URL}?share=${encodeURIComponent(shareId)}`,
      cancel_url: `${FRONTEND_URL}?share=${encodeURIComponent(shareId)}`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Public checkout error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not create checkout" });
  }
});

app.post("/public/create-project-payment-checkout", async (req, res) => {
  try {
    const { shareId, paymentId } = req.body;

    if (!shareId || !paymentId) {
      return res.status(400).json({ error: "Missing shareId or paymentId" });
    }

    const { payment } = await getSharedProjectPayment(shareId, paymentId);

    if (payment.status === "paid") {
      return res.status(400).json({ error: "This payment is already marked paid" });
    }

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
      success_url: `${FRONTEND_URL}?share=${encodeURIComponent(shareId)}`,
      cancel_url: `${FRONTEND_URL}?share=${encodeURIComponent(shareId)}`
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
      .json({ error: error.message || "Could not create payment checkout" });
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
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
