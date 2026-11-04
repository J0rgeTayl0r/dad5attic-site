/* Dad5Attic storefront */
const EMAIL = "lordvoldemortsjarvis@gmail.com";
const PAGE = 60;
let ITEMS = [], view = [], shown = PAGE, cart = {};

/* ---- category classifier (ordered rules) ---- */
const CATS = [
  ["Footwear", /\b(boot|slipper|sneaker|shoe|sandal|slide|ugg|loafer|sneaker|clog|size \d+[mw]?\b.*(boot|shoe|slipper))/i],
  ["Clothing", /\b(shirt|tee|t-shirt|polo|sweater|hoodie|sweatshirt|jeans|pant|jacket|coat|fleece|vest|tie|knit|pullover|crewneck|blazer|short|sock|boxer|long sleeve|windbreaker|bomber|parka|hooded|merino|corduroy|denim|overcoat|jersey|swim|capri|sweatpant)/i],
  ["Tools & Outdoor", /\b(hammer|wrench|tool|dewalt|milwaukee|magnum|ms20|inverter|sledge|drill|plier|saw|level|extension cord|camping|lantern|coleman|stove|generator|solar|ecoflow|jackery|battery|charger|work light)/i],
  ["Electronics & Media", /\b(camera|ram|ssd|dvd|blu-ray|bluray|vhs|game|nintendo|sony|speaker|headphone|console|controller|monitor|keyboard|cable|adapter|projector|radio|walkman|discman|uno|electronic)/i],
  ["Home & Kitchen", /\b(popcorn|kitchen|pan|pot|blanket|throw|rug|lamp|decor|wall|clock|vase|mug|dish|glass|ceramic|toaster|mixer|blender|coffee|iron|vacuum|fan|humidifier|tapestry|art|shrine|triptych|diptych|icon|prayer|religious)/i],
  ["Collectibles & Toys", /\b(diecast|die-cast|nascar|football|signed|card|figure|lego|mattel|star wars|hot wheels|matchbox|bobble|poster|pin|patch|trophy|model|revell|action)/i],
  ["Sports & Fitness", /\b(skate|baseball|basketball|bat|gym|yoga|dumbbell|weight|boxing|nfl|nba|nfc|afc|packers|giants|49ers)/i],
];
function categorize(it) {
  const t = it.title;
  for (const [cat, re] of CATS) if (re.test(t)) return cat;
  return "Attic Finds";
}

/* ---- helpers ---- */
const $ = s => document.querySelector(s);
const money = n => "$" + n.toFixed(2);
const priceNum = it => parseFloat(it.price.replace(/[^0-9.]/g, "")) || 0;
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---- state / render ---- */
function applyFilters() {
  const q = $("#search").value.trim().toLowerCase();
  const sort = $("#sort").value, cond = $("#cond").value;
  const chip = document.querySelector(".chip.active")?.dataset.cat || "";
  view = ITEMS.filter(it =>
    (!q || it.title.toLowerCase().includes(q)) &&
    (!cond || it.cond === cond) &&
    (!chip || it.cat === chip));
  if (sort === "lo") view.sort((a,b) => priceNum(a) - priceNum(b));
  else if (sort === "hi") view.sort((a,b) => priceNum(b) - priceNum(a));
  shown = PAGE;
  render();
}
function render() {
  const grid = $("#grid");
  const slice = view.slice(0, shown);
  grid.innerHTML = slice.map(it => `
    <article class="card" data-id="${it.id}">
      <div class="imgwrap"><img loading="lazy" src="${it.img}" alt="${esc(it.title)}"
        onerror="this.closest('.card').style.display='none'"></div>
      <div class="card-body">
        <p class="card-title">${esc(it.title)}</p>
        <p class="card-meta"><span class="price">${it.price}</span>${it.cond ? `<span class="badge ${it.cond==='Brand New'?'new':''}">${it.cond}</span>` : ""}</p>
      </div>
    </article>`).join("");
  $("#resultsInfo").textContent = view.length
    ? `Showing ${slice.length} of ${view.length} find${view.length===1?"":"s"}`
    : "";
  $("#more").style.display = shown < view.length ? "" : "none";
  if (!view.length) grid.innerHTML = `<p class="empty">Nothing in the attic matches. Try another word.</p>`;
}

/* ---- chips ---- */
function buildChips() {
  const counts = {};
  ITEMS.forEach(it => counts[it.cat] = (counts[it.cat] || 0) + 1);
  const order = ["All", ...CATS.map(c => c[0]).filter(c => counts[c]), "Attic Finds"].filter(c => c === "All" || counts[c]);
  $("#chips").innerHTML = order.map((c,i) =>
    `<button class="chip${i===0?" active":""}" data-cat="${c==="All"?"":c}">${c}${c!=="All"?` <em>${counts[c]||0}</em>`:` <em>${ITEMS.length}</em>`}</button>`).join("");
}

/* ---- modal ---- */
let modalItem = null;
function openModal(id) {
  modalItem = ITEMS.find(i => i.id === id);
  if (!modalItem) return;
  $("#mImg").src = modalItem.img;
  $("#mTitle").textContent = modalItem.title;
  $("#mPrice").textContent = modalItem.price;
  $("#mCond").textContent = modalItem.cond || "";
  $("#mCond").style.display = modalItem.cond ? "" : "none";
  $("#mShip").textContent = modalItem.freeShip ? "Free shipping" : "";
  $("#modal").classList.remove("hidden");
  $("#overlay").classList.remove("hidden");
}
function closeAll() {
  $("#modal").classList.add("hidden");
  $("#drawer").classList.add("hidden");
  $("#overlay").classList.add("hidden");
}

/* ---- cart ---- */
function saveCart() { localStorage.setItem("d5a_cart", JSON.stringify(cart)); }
function loadCart() { try { cart = JSON.parse(localStorage.getItem("d5a_cart")) || {}; } catch { cart = {}; } }
function cartCount() { return Object.keys(cart).length; }
function cartTotal() { return Object.keys(cart).reduce((s,id) => s + priceNum(ITEMS.find(i=>i.id===id)), 0); }
function renderCart() {
  $("#cartCount").textContent = cartCount();
  const ids = Object.keys(cart);
  $("#cartItems").innerHTML = ids.length ? ids.map(id => {
    const it = ITEMS.find(i => i.id === id);
    if (!it) return "";
    return `<div class="cart-row">
      <img src="${it.img}" alt=""><div class="cart-row-info"><p>${esc(it.title)}</p><span class="price">${it.price}</span></div>
      <button class="rm" data-id="${id}" aria-label="Remove">✕</button></div>`;
  }).join("") : `<p class="empty">Cart is empty. The attic awaits.</p>`;
  $("#cartTotal").textContent = money(cartTotal());
}
function checkout() {
  if (!cartCount()) return;
  const lines = Object.keys(cart).map(id => {
    const it = ITEMS.find(i => i.id === id);
    return it ? `• ${it.title} — ${it.price}  (item ${it.id})` : "";
  }).join("%0D%0A");
  const body = `Hi Dad5Attic,%0D%0A%0D%0AI'd like to order:%0D%0A%0D%0A${lines}%0D%0A%0D%0ATotal: ${money(cartTotal())} + shipping%0D%0A%0D%0AName: %0D%0APhone: %0D%0AShip to: %0D%0A`;
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Dad5Attic order")}&body=${body}`;
}

/* ---- wire up ---- */
$("#grid").addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});
$("#chips").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  applyFilters();
});
$("#search").addEventListener("input", applyFilters);
$("#sort").addEventListener("change", applyFilters);
$("#cond").addEventListener("change", applyFilters);
$("#moreBtn").addEventListener("click", () => { shown += PAGE; render(); });
$("#cartBtn").addEventListener("click", () => { renderCart(); $("#drawer").classList.remove("hidden"); $("#overlay").classList.remove("hidden"); });
$("#closeCart").addEventListener("click", closeAll);
$("#overlay").addEventListener("click", closeAll);
$("#modalClose").addEventListener("click", closeAll);
$("#mAdd").addEventListener("click", () => { if (modalItem) { cart[modalItem.id] = 1; saveCart(); renderCart(); closeAll(); } });
$("#cartItems").addEventListener("click", e => {
  const rm = e.target.closest(".rm");
  if (rm) { delete cart[rm.dataset.id]; saveCart(); renderCart(); }
});
$("#checkoutBtn").addEventListener("click", checkout);

/* ---- boot ---- */
fetch("items.json").then(r => r.json()).then(data => {
  ITEMS = data;
  ITEMS.forEach(it => it.cat = categorize(it));
  loadCart();
  buildChips();
  applyFilters();
  renderCart();
});
