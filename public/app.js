const queryInput = document.querySelector("#query");
const selectedSymbolInput = document.querySelector("#selectedSymbol");
const spotPriceEl = document.querySelector("#spotPrice");
const searchResultsEl = document.querySelector("#searchResults");
const chainArea = document.querySelector("#chain");
const resultEl = document.querySelector("#result");
const setupsResultEl = document.querySelector("#setupsResult");
const setupTickerEl = document.querySelector("#setupTicker");
const setupTvSymbolEl = document.querySelector("#setupTvSymbol");
const setupNotesEl = document.querySelector("#setupNotes");

let spotPrice = null;
let lastDecision = null;

function renderResult(data) {
  resultEl.textContent = JSON.stringify(data, null, 2);
}

function parseChainCsv(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [expiry, dte, type, strike, bid, ask, volume, openInterest, delta] = line
        .split(",")
        .map((x) => x.trim());
      return {
        expiry,
        dte: Number(dte),
        type,
        strike: Number(strike),
        bid: Number(bid),
        ask: Number(ask),
        volume: Number(volume),
        openInterest: Number(openInterest),
        delta: Number(delta),
      };
    });
}

function generateSampleChain() {
  if (!spotPrice) {
    alert("Get quote first.");
    return;
  }

  const rounded = Math.round(spotPrice);
  const rows = [];
  const dtes = [7, 10, 14];

  for (const dte of dtes) {
    for (let i = -2; i <= 2; i += 1) {
      const strike = rounded + i * 5;
      const bid = Math.max(0.5, (Math.abs(i) === 0 ? 4.6 : 3.2 - Math.abs(i) * 0.7));
      const ask = Number((bid * 1.08).toFixed(2));
      const volume = 100 + (2 - Math.abs(i)) * 120;
      const openInterest = 300 + (2 - Math.abs(i)) * 220;
      rows.push(`2026-03-${String(10 + dte).padStart(2, "0")},${dte},call,${strike},${bid.toFixed(2)},${ask.toFixed(2)},${volume},${openInterest},0.5`);
      rows.push(`2026-03-${String(10 + dte).padStart(2, "0")},${dte},put,${strike},${bid.toFixed(2)},${ask.toFixed(2)},${volume},${openInterest},-0.5`);
    }
  }

  chainArea.value = rows.join("\n");
}

async function searchSymbols() {
  const query = queryInput.value.trim();
  if (!query) return;

  const response = await fetch(`/api/tv/search?query=${encodeURIComponent(query)}&type=stock&limit=10`);
  const data = await response.json();
  const results = Array.isArray(data) ? data : data.value || [];

  searchResultsEl.innerHTML = "";
  for (const item of results) {
    const full = `${item.exchange}:${item.symbol}`;
    const li = document.createElement("li");
    li.textContent = `${full} - ${item.description || ""}`;
    li.addEventListener("click", () => {
      selectedSymbolInput.value = full;
      setupTvSymbolEl.value = full;
      setupTickerEl.value = item.symbol || "";
    });
    searchResultsEl.appendChild(li);
  }
}

async function getQuote() {
  const symbol = selectedSymbolInput.value.trim();
  if (!symbol) return;

  const response = await fetch(`/api/tv/quote?symbols=${encodeURIComponent(symbol)}`);
  const data = await response.json();

  const quote = data?.d?.[0]?.v;
  if (!quote?.lp) {
    spotPriceEl.textContent = "Spot: not available";
    return;
  }

  spotPrice = Number(quote.lp);
  spotPriceEl.textContent = `Spot: ${spotPrice.toFixed(2)}`;
  if (!setupTvSymbolEl.value.trim()) {
    setupTvSymbolEl.value = symbol;
  }
  if (!setupTickerEl.value.trim()) {
    setupTickerEl.value = symbol.includes(":") ? symbol.split(":")[1] : symbol;
  }
}

function buildSelectionPayload() {
  const optionsChain = parseChainCsv(chainArea.value);
  return {
    direction: document.querySelector("#direction").value,
    marketPermission: document.querySelector("#marketPermission").value,
    ivContextTag: document.querySelector("#ivContextTag").value,
    expectedMoveSpeed: document.querySelector("#expectedMoveSpeed").value,
    underlyingPrice: spotPrice,
    optionsChain,
  };
}

async function evaluate() {
  if (!spotPrice) {
    alert("Get quote first.");
    return;
  }

  const payload = buildSelectionPayload();
  if (!payload.optionsChain.length) {
    alert("Options chain is empty.");
    return;
  }

  const response = await fetch("/api/swing/select", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  lastDecision = data;
  renderResult(data);
}

async function saveSetup() {
  if (!spotPrice) {
    alert("Get quote first.");
    return;
  }

  const ticker = setupTickerEl.value.trim();
  const tvSymbol = setupTvSymbolEl.value.trim();
  if (!ticker || !tvSymbol) {
    alert("Setup ticker and TV symbol are required.");
    return;
  }

  const payload = buildSelectionPayload();
  if (!payload.optionsChain.length) {
    alert("Options chain is empty.");
    return;
  }

  payload.ticker = ticker;
  payload.tvSymbol = tvSymbol;
  payload.notes = setupNotesEl.value.trim();

  const response = await fetch("/api/setups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Failed to save setup.");
    return;
  }

  lastDecision = data.decision || lastDecision;
  renderResult(data);
  await loadSetups();
}

async function loadSetups() {
  const response = await fetch("/api/setups?limit=20");
  const data = await response.json();
  setupsResultEl.textContent = JSON.stringify(data, null, 2);
}

document.querySelector("#searchBtn").addEventListener("click", searchSymbols);
document.querySelector("#quoteBtn").addEventListener("click", getQuote);
document.querySelector("#seedBtn").addEventListener("click", generateSampleChain);
document.querySelector("#evaluateBtn").addEventListener("click", evaluate);
document.querySelector("#saveSetupBtn").addEventListener("click", saveSetup);
document.querySelector("#loadSetupsBtn").addEventListener("click", loadSetups);

loadSetups().catch(() => {
  setupsResultEl.textContent = "DB not available yet.";
});
