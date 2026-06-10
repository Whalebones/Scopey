import dotenv from "dotenv";
dotenv.config();

import cors from "cors";import express from "express";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

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
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

// =======================
// MIDDLEWARE
// =======================
app.use("/webhook", bodyParser.raw({ type: "application/json" }));
app.use(express.json());

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
    .select("id,user_id,share_id")
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

async function getSharedProject(shareId) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,title,client_name,share_id")
    .eq("share_id", shareId)
    .single();

  if (projectError || !project) {
    const err = new Error("Shared project not found");
    err.statusCode = 404;
    throw err;
  }

  return project;
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
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });

    if (scopeError) throw scopeError;

    const { data: changes, error: changesError } = await supabase
      .from("changes")
      .select("id,title,price,status,paid,paid_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });

    if (changesError) throw changesError;

    res.json({
      project,
      scopeItems: scopeItems || [],
      changes: changes || []
    });
  } catch (error) {
    console.error("Public project load error:", error.message);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Could not load shared project" });
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

    const { change } = await getOwnedChange(changeId, user);

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
            currency: "gbp",
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

    const { change } = await getSharedChange(shareId, changeId);

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
            currency: "gbp",
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
                stripe_session_id: session.id
              }
            ]);

          if (paymentInsertError) throw paymentInsertError;
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
app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});
import Stripe from "stripe";
