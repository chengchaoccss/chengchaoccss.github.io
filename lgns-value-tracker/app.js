const COIN_ID = "origin-lgns";
const REFRESH_MS = 30_000;
const API_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_ID}&vs_currencies=usd,cny&include_24hr_change=true&include_last_updated_at=true`;

const $ = (id) => document.getElementById(id);

const amountInput = $("amount");
const saveAmountBtn = $("saveAmountBtn");
const saveState = $("saveState");
const savedAmountText = $("savedAmountText");
const priceEl = $("price");
const priceLabel = $("priceLabel");
const totalLabel = $("totalLabel");
const chartTitle = $("chartTitle");
const totalEl = $("totalValue");
const amountText = $("amountText");
const priceChange = $("priceChange");
const changeValue = $("changeValue");
const currencyValue = $("currencyValue");
const statusDot = $("statusDot");
const statusText = $("statusText");
const clearBtn = $("clearBtn");
const pulseBtn = $("pulseBtn");
const recordState = $("recordState");
const toast = $("toast");
const tickerPrice = $("tickerPrice");
const tickerPrice2 = $("tickerPrice2");
const tickerValue = $("tickerValue");
const tickerValue2 = $("tickerValue2");
const tickerCurrency = $("tickerCurrency");
const tickerCurrency2 = $("tickerCurrency2");
const usdBtn = $("usdBtn");
const cnyBtn = $("cnyBtn");

let prices = { usd: null, cny: null };
let currentCurrency = localStorage.getItem("lgns_currency") || "usd";
let savedAmount = Number(localStorage.getItem("lgns_saved_amount") || 0);
let draftAmount = localStorage.getItem("lgns_draft_amount") || "";

if (draftAmount) amountInput.value = draftAmount;
else if (savedAmount > 0) amountInput.value = savedAmount;

const history = JSON.parse(localStorage.getItem("lgns_value_history") || "[]");

const currencyMeta = {
  usd: { code: "USD", symbol: "$", locale: "en-US", label: "美元" },
  cny: { code: "CNY", symbol: "¥", locale: "zh-CN", label: "人民币" }
};

function convertFromUsd(valueUsd) {
  if (currentCurrency === "usd") return valueUsd;
  if (!prices.usd || !prices.cny) return valueUsd;
  return valueUsd * (prices.cny / prices.usd);
}

function fmtMoney(n, currency = currentCurrency) {
  const meta = currencyMeta[currency];
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    maximumFractionDigits: n >= 1000 ? 2 : 4
  }).format(n);
}

const fmtNum = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);

const ctx = $("valueChart");
const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 360);
gradient.addColorStop(0, "rgba(34,211,238,.34)");
gradient.addColorStop(1, "rgba(167,139,250,.02)");

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: history.map(p => p.time),
    datasets: [{
      label: `总价值 ${currencyMeta[currentCurrency].code}`,
      data: history.map(p => convertFromUsd(p.value)),
      tension: 0.36,
      pointRadius: 3,
      pointHoverRadius: 7,
      fill: true,
      backgroundColor: gradient,
      borderColor: "rgba(34,211,238,.95)",
      pointBackgroundColor: "rgba(255,255,255,.95)",
      pointBorderColor: "rgba(34,211,238,.95)",
      borderWidth: 3
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650, easing: "easeOutQuart" },
    interaction: { intersect: false, mode: "index" },
    scales: {
      x: { ticks: { color: "#8ea0b8", maxRotation: 0 }, grid: { color: "rgba(255,255,255,.07)" } },
      y: { ticks: { color: "#8ea0b8" }, grid: { color: "rgba(255,255,255,.07)" } }
    },
    plugins: {
      legend: { labels: { color: "#f7fbff", usePointStyle: true } },
      tooltip: {
        backgroundColor: "rgba(8,14,32,.92)",
        borderColor: "rgba(34,211,238,.35)",
        borderWidth: 1,
        padding: 12,
        callbacks: { label: (ctx) => `总价值：${fmtMoney(ctx.parsed.y)}` }
      }
    }
  }
});

function setStatus(ok, text) {
  statusDot.classList.toggle("ok", ok);
  statusText.textContent = text;
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1700);
}

function getDraftAmount() {
  const v = Number(amountInput.value || 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function updateCurrencyUI() {
  const meta = currencyMeta[currentCurrency];
  usdBtn.classList.toggle("active", currentCurrency === "usd");
  cnyBtn.classList.toggle("active", currentCurrency === "cny");
  document.body.dataset.currency = currentCurrency;
  priceLabel.textContent = `Live Price · ${meta.code}`;
  totalLabel.textContent = `我的总价值 · ${meta.code}`;
  chartTitle.textContent = `实时价值曲线 · ${meta.code}`;
  currencyValue.textContent = meta.code;
  tickerCurrency.textContent = `${meta.code} Mode`;
  tickerCurrency2.textContent = `${meta.code} Mode`;
  chart.data.datasets[0].label = `总价值 ${meta.code}`;
  chart.data.datasets[0].data = history.map(p => convertFromUsd(p.value));
  chart.update();
}

function updateSaveUI() {
  const draft = getDraftAmount();
  localStorage.setItem("lgns_draft_amount", amountInput.value || "");
  savedAmountText.textContent = savedAmount > 0 ? `已保存：${fmtNum(savedAmount)} LGNS` : "已保存：-- LGNS";
  const changed = Math.abs(draft - savedAmount) > 0.00000001;
  saveState.textContent = changed ? "有未保存变更" : "已保存";
  saveState.classList.toggle("saved", !changed && savedAmount > 0);
  recordState.textContent = savedAmount > 0 ? "正在记录已保存持仓" : "保存币量后开始记录";
}

function setFlash(el) {
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

function renderValues(record = false) {
  updateSaveUI();
  updateCurrencyUI();
  amountText.textContent = savedAmount > 0 ? `按 ${fmtNum(savedAmount)} LGNS 计算` : "请先确认保存币量";

  const price = prices[currentCurrency];
  if (price == null || savedAmount <= 0) {
    if (price == null) priceEl.textContent = `${currencyMeta[currentCurrency].symbol}--`;
    totalEl.textContent = `${currencyMeta[currentCurrency].symbol}--`;
    tickerValue.textContent = `总价值 ${currencyMeta[currentCurrency].symbol}--`;
    tickerValue2.textContent = `总价值 ${currencyMeta[currentCurrency].symbol}--`;
    return;
  }

  const value = savedAmount * price;
  priceEl.textContent = fmtMoney(price);
  tickerPrice.textContent = fmtMoney(price);
  tickerPrice2.textContent = fmtMoney(price);
  totalEl.textContent = fmtMoney(value);
  tickerValue.textContent = `总价值 ${fmtMoney(value)}`;
  tickerValue2.textContent = `总价值 ${fmtMoney(value)}`;

  if (record && prices.usd && savedAmount > 0) {
    const valueUsd = savedAmount * prices.usd;
    const now = new Date();
    const point = {
      time: now.toLocaleTimeString("zh-CN", { hour12: false }),
      value: Number(valueUsd.toFixed(6)),
      price: prices.usd,
      amount: savedAmount
    };
    const last = history[history.length - 1];
    if (!last || last.time !== point.time || last.value !== point.value) {
      history.push(point);
      if (history.length > 500) history.shift();
    }
    localStorage.setItem("lgns_value_history", JSON.stringify(history));
    chart.data.labels = history.map(p => p.time);
    chart.data.datasets[0].data = history.map(p => convertFromUsd(p.value));
    chart.update();
    setFlash(totalEl);
  }
}

async function fetchPrice(manual = false) {
  try {
    setStatus(false, manual ? "手动刷新中…" : "正在获取价格…");
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const coin = data[COIN_ID];
    if (!coin || typeof coin.usd !== "number") throw new Error("价格数据为空");

    prices.usd = coin.usd;
    prices.cny = typeof coin.cny === "number" ? coin.cny : null;
    const chg = coin.usd_24h_change;
    const updated = coin.last_updated_at
      ? new Date(coin.last_updated_at * 1000).toLocaleString("zh-CN", { hour12: false })
      : new Date().toLocaleString("zh-CN", { hour12: false });

    priceChange.textContent = `24h：${typeof chg === "number" ? chg.toFixed(2) + "%" : "--"} · 更新时间：${updated}`;
    changeValue.textContent = typeof chg === "number" ? `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : "--";
    changeValue.style.color = typeof chg === "number" && chg < 0 ? "#fb7185" : "#4ade80";

    setStatus(true, "价格已更新");
    setFlash(priceEl);
    renderValues(true);
    if (manual) showToast("价格已刷新");
  } catch (err) {
    console.error(err);
    setStatus(false, "获取失败，稍后自动重试");
    if (manual) showToast("刷新失败，稍后重试");
  }
}

function saveAmount() {
  const amount = getDraftAmount();
  if (amount <= 0) {
    showToast("请输入大于 0 的币量");
    return;
  }
  savedAmount = amount;
  localStorage.setItem("lgns_saved_amount", String(savedAmount));
  localStorage.setItem("lgns_draft_amount", amountInput.value || "");
  renderValues(false);
  showToast(`已保存 ${fmtNum(savedAmount)} LGNS`);
  saveAmountBtn.classList.add("flash");
  setTimeout(() => saveAmountBtn.classList.remove("flash"), 700);
}

function switchCurrency(currency) {
  if (!currencyMeta[currency] || currentCurrency === currency) return;
  currentCurrency = currency;
  localStorage.setItem("lgns_currency", currentCurrency);
  renderValues(false);
  showToast(`已切换为${currencyMeta[currentCurrency].label}`);
}

amountInput.addEventListener("input", () => renderValues(false));
saveAmountBtn.addEventListener("click", saveAmount);
amountInput.addEventListener("keydown", (e) => { if (e.key === "Enter") saveAmount(); });
pulseBtn.addEventListener("click", () => fetchPrice(true));
usdBtn.addEventListener("click", () => switchCurrency("usd"));
cnyBtn.addEventListener("click", () => switchCurrency("cny"));

clearBtn.addEventListener("click", () => {
  history.length = 0;
  localStorage.removeItem("lgns_value_history");
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();
  showToast("曲线已清空");
});

document.querySelectorAll(".tilt-card").forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - .5) * -5;
    const ry = ((x / rect.width) - .5) * 5;
    card.style.transform = `translateY(-4px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  card.addEventListener("mouseleave", () => { card.style.transform = ""; });
});

updateSaveUI();
updateCurrencyUI();
renderValues(false);
fetchPrice();
setInterval(fetchPrice, REFRESH_MS);
