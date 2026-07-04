const COIN_ID = "origin-lgns";
const VS_CURRENCY = "usd";
const REFRESH_MS = 30_000;
const API_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_ID}&vs_currencies=${VS_CURRENCY}&include_24hr_change=true&include_last_updated_at=true`;

const $ = (id) => document.getElementById(id);

const amountInput = $("amount");
const priceEl = $("price");
const totalEl = $("totalValue");
const amountText = $("amountText");
const priceChange = $("priceChange");
const statusDot = $("statusDot");
const statusText = $("statusText");
const clearBtn = $("clearBtn");

let currentPrice = null;

const savedAmount = localStorage.getItem("lgns_amount");
if (savedAmount) amountInput.value = savedAmount;

const history = JSON.parse(localStorage.getItem("lgns_value_history") || "[]");

const fmtUSD = (n) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: n >= 1000 ? 2 : 4
}).format(n);

const fmtNum = (n) => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4
}).format(n);

const ctx = $("valueChart");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: history.map(p => p.time),
    datasets: [{
      label: "总价值 USD",
      data: history.map(p => p.value),
      tension: 0.25,
      pointRadius: 2
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: { ticks: { color: "#9aa4b2", maxRotation: 0 }, grid: { color: "rgba(255,255,255,.08)" } },
      y: { ticks: { color: "#9aa4b2" }, grid: { color: "rgba(255,255,255,.08)" } }
    },
    plugins: {
      legend: { labels: { color: "#f5f7fb" } },
      tooltip: {
        callbacks: {
          label: (ctx) => `总价值：${fmtUSD(ctx.parsed.y)}`
        }
      }
    }
  }
});

function setStatus(ok, text) {
  statusDot.classList.toggle("ok", ok);
  statusText.textContent = text;
}

function getAmount() {
  const v = Number(amountInput.value || 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function updateTotal(record = false) {
  const amount = getAmount();
  localStorage.setItem("lgns_amount", amountInput.value || "");
  amountText.textContent = `数量：${fmtNum(amount)} LGNS`;

  if (currentPrice == null) {
    totalEl.textContent = "$--";
    return;
  }

  const value = amount * currentPrice;
  totalEl.textContent = fmtUSD(value);

  if (record && amount > 0) {
    const now = new Date();
    const point = {
      time: now.toLocaleTimeString("zh-CN", { hour12: false }),
      value: Number(value.toFixed(6)),
      price: currentPrice
    };

    history.push(point);
    if (history.length > 500) history.shift();

    localStorage.setItem("lgns_value_history", JSON.stringify(history));
    chart.data.labels = history.map(p => p.time);
    chart.data.datasets[0].data = history.map(p => p.value);
    chart.update();
  }
}

async function fetchPrice() {
  try {
    setStatus(false, "正在获取价格…");
    const res = await fetch(API_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const coin = data[COIN_ID];
    if (!coin || typeof coin[VS_CURRENCY] !== "number") {
      throw new Error("价格数据为空");
    }

    currentPrice = coin[VS_CURRENCY];
    const chg = coin.usd_24h_change;
    const updated = coin.last_updated_at
      ? new Date(coin.last_updated_at * 1000).toLocaleString("zh-CN", { hour12: false })
      : new Date().toLocaleString("zh-CN", { hour12: false });

    priceEl.textContent = fmtUSD(currentPrice);
    priceChange.textContent = `24h：${typeof chg === "number" ? chg.toFixed(2) + "%" : "--"} · 更新时间：${updated}`;
    setStatus(true, "价格已更新");

    updateTotal(true);
  } catch (err) {
    console.error(err);
    setStatus(false, "获取失败，稍后自动重试");
  }
}

amountInput.addEventListener("input", () => updateTotal(false));

clearBtn.addEventListener("click", () => {
  history.length = 0;
  localStorage.removeItem("lgns_value_history");
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();
});

$("refreshText").textContent = `${REFRESH_MS / 1000}s`;
fetchPrice();
setInterval(fetchPrice, REFRESH_MS);
