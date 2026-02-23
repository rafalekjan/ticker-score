const queryInput = document.querySelector("#query");
const selectedSymbolInput = document.querySelector("#selectedSymbol");
const searchResultsEl = document.querySelector("#searchResults");
const outEl = document.querySelector("#stockResult");

function print(data) {
  outEl.textContent = JSON.stringify(data, null, 2);
}

async function searchSymbols() {
  const query = queryInput.value.trim();
  if (!query) return;

  const response = await fetch(`/api/tv/search?query=${encodeURIComponent(query)}&type=stock&limit=10`);
  const data = await response.json();
  const rows = Array.isArray(data) ? data : data.value || [];

  searchResultsEl.innerHTML = "";
  for (const row of rows) {
    const full = `${row.exchange}:${row.symbol}`;
    const li = document.createElement("li");
    li.textContent = `${full} - ${row.description || ""}`;
    li.addEventListener("click", () => {
      selectedSymbolInput.value = full;
    });
    searchResultsEl.appendChild(li);
  }

  print(rows);
}

async function getQuote() {
  const symbol = selectedSymbolInput.value.trim();
  if (!symbol) return;
  const response = await fetch(`/api/tv/quote?symbols=${encodeURIComponent(symbol)}`);
  print(await response.json());
}

async function getHistory() {
  const symbol = selectedSymbolInput.value.trim();
  if (!symbol) return;
  const to = Math.floor(Date.now() / 1000);
  const from = to - 180 * 86400;
  const response = await fetch(`/api/tv/history?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}`);
  print(await response.json());
}

async function getBundle() {
  const symbol = selectedSymbolInput.value.trim();
  if (!symbol) return;
  const response = await fetch(`/api/tv/ticker-bundle?symbol=${encodeURIComponent(symbol)}&resolution=D`);
  print(await response.json());
}

document.querySelector("#searchBtn").addEventListener("click", searchSymbols);
document.querySelector("#quoteBtn").addEventListener("click", getQuote);
document.querySelector("#historyBtn").addEventListener("click", getHistory);
document.querySelector("#bundleBtn").addEventListener("click", getBundle);
