import dotenv from "dotenv";
dotenv.config();

import express from "express";
import Stripe from "stripe";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const requiredEnv = [
  "STRIPE_SECRET",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PRO",
  "STRIPE_PRICE_ID_PRO_PLUS",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  throw new Error(`Missing environment variables: ${missingEnv.join(", ")}`);
}

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5500", "http://127.0.0.1:5500"],
    methods: ["GET", "POST"],
  })
);

const stripe = new Stripe(process.env.STRIPE_SECRET);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/subscription-status", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return res.json({ status: "free", message: "No active subscription found." });
    }

    const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 10 });
    const subscription = subscriptions.data.find((sub) => ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(sub.status));

    if (!subscription) {
      return res.json({ status: "free", message: "No active subscription found." });
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId === process.env.STRIPE_PRICE_ID_PRO_PLUS ? "pro_plus" : "pro";
    return res.json({
      status: subscription.status,
      plan,
      current_period_end: subscription.current_period_end,
      trial_end: subscription.trial_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  } catch (error) {
    console.error("Failed to fetch subscription status", error.message);
    return res.status(500).json({ error: "Unable to fetch subscription status." });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  const { email, plan } = req.body;
  const priceId = plan === "pro_plus" ? process.env.STRIPE_PRICE_ID_PRO_PLUS : process.env.STRIPE_PRICE_ID_PRO;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 30 },
      success_url: `${FRONTEND_URL}/index.html`,
      cancel_url: `${FRONTEND_URL}/index.html`,
      customer_email: email,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Failed to create Stripe checkout session", error.message);
    res.status(500).json({ error: "Unable to create checkout session." });
  }
});

app.post("/webhook", async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook verification failed", err.message);
    return res.status(400).send();
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const priceId = subscription.items.data[0].price.id;
    const plan = priceId === process.env.STRIPE_PRICE_ID_PRO_PLUS ? "pro_plus" : "pro";

    await supabase.from("profiles").update({ plan }).eq("email", session.customer_details.email);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", subscription.customer);
  }

  res.json({ received: true });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
