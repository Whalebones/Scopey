const SUPABASE_URL = "https://nxqwrlbwnaqntuvcspln.supabase.co";
const SUPABASE_KEY = "sb_publishable_TVcQqAhasEthm_LoHFjmYw_OUbo3i5v";
const STRIPE_KEY = "pk_test_51Tfdr9HbHMKHnVYfDDun9mhREMp6UCVAKYu2ZD2lNuBnPbjYTvmIEQQTYdr2saGSyTUSw8n7JFGevNEOSsn59UNW00NuHvchbc";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const stripe = Stripe(STRIPE_KEY);
const API_BASE_URL = window.location.origin.includes("localhost") ? "http://localhost:3000" : window.location.origin;

// Explicitly reference DOM elements instead of relying on legacy globals
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

async function login(){
 const email = prompt("Enter email");
 await db.auth.signInWithOtp({email});
 setTimeout(initProfile,2000);
}

async function logout(){await db.auth.signOut(); load();}

async function initProfile(){
 const {data:{user}} = await db.auth.getUser();
 await db.from("profiles").upsert({id:user.id,email:user.email,plan:'free'});
 load();
}

form.addEventListener("submit", async e=>{
 e.preventDefault();
 const {data:{user}} = await db.auth.getUser();
 const {data:profile} = await db.from("profiles").select("plan").eq("id",user.id).single();
 const {data:list} = await db.from("commissions").select("id").eq("user_id",user.id);
 if(profile.plan==='free' && list.length>=3){alert("Limit reached");return;}
 await db.from("commissions").insert([{user_id:user.id,title:title.value,client_name:client.value,revision_limit:limit.value||0,revisions_used:0}]);
 load();
});

increaseTextButton.addEventListener("click", () => increaseTextSize());
decreaseTextButton.addEventListener("click", () => decreaseTextSize());
contrastToggleButton.addEventListener("click", () => toggleHighContrast());

async function load(){
 const {data:{user}} = await db.auth.getUser();
 if(!user) return;

 const {data:profile} = await db.from("profiles").select("plan").eq("id",user.id).single();
 const {data:listData} = await db.from("commissions").select("*").eq("user_id",user.id);

 plan.innerText = profile.plan;
 total.innerText = listData.length;

 list.innerHTML = "";

 listData.forEach(c=>{
  const div=document.createElement("div");
  div.className="card list-item";
  div.innerHTML = `
    <div class="item-main">
      <div class="item-title">${c.title}</div>
      <div class="item-client">${c.client_name}</div>
    </div>
    <div class="item-meta">${c.revisions_used}/${c.revision_limit} revisions</div>
  `;
  list.appendChild(div);
 });

 if(profile.plan==='free'){
  banner.style.display="block";
  banner.innerText="Free plan: max 3 commissions";
 }
}

async function upgrade(plan){
 const {data:{user}} = await db.auth.getUser();
 const res = await fetch(`${API_BASE_URL}/create-checkout-session`,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({email:user.email,plan})
 });
 const data = await res.json();
 stripe.redirectToCheckout({sessionId:data.id});
}

loadAccessibilityPreferences();
load();
