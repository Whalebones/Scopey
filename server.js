import dotenv from "dotenv";
dotenv.config();

import express from "express";
import Stripe from "stripe";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL }));

const stripe = new Stripe(process.env.STRIPE_SECRET);

const supabase = createClient(
 process.env.SUPABASE_URL,
 process.env.SUPABASE_SERVICE_KEY
);

app.post("/create-checkout-session", async (req, res) => {
 const { email, plan } = req.body;

 const priceId = plan === "pro_plus"
  ? process.env.STRIPE_PRICE_ID_PRO_PLUS
  : process.env.STRIPE_PRICE_ID_PRO;

    const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types:["card"],
    line_items:[{ price: priceId, quantity: 1 }],
    subscription_data:{ trial_period_days:30 },
    success_url: `${FRONTEND_URL}/index.html`,
    cancel_url: `${FRONTEND_URL}/index.html`
 });

 res.json({ id: session.id });
});

app.post("/webhook", async (req, res) => {
 let event;
 try {
  event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
 } catch (err) {
  return res.status(400).send();
 }

 if (event.type === "checkout.session.completed") {
  const session = event.data.object;
  const sub = await stripe.subscriptions.retrieve(session.subscription);

  const priceId = sub.items.data[0].price.id;
  const plan = priceId === process.env.STRIPE_PRICE_ID_PRO_PLUS ? "pro_plus" : "pro";

  await supabase.from("profiles").update({ plan }).eq("email", session.customer_details.email);
 }

 if (event.type === "customer.subscription.deleted") {
  const sub = event.data.object;
  await supabase.from("profiles").update({ plan: 'free' }).eq("stripe_customer_id", sub.customer);
 }

 res.json({ received:true });
});

app.listen(3000, () => console.log("Server running"));
