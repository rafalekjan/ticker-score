const DEFAULT_BASE_URL = process.env.TV_UDF_BASE_URL || "https://demo-feed-data.tradingview.com";

async function fetchJson(path, query = {}) {
  const url = new URL(path, DEFAULT_BASE_URL);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TradingView UDF request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function getUdfBaseUrl() {
  return DEFAULT_BASE_URL;
}

export async function getConfig() {
  return fetchJson("/config");
}

export async function searchSymbols({ query, type = "stock", exchange = "", limit = 10 }) {
  return fetchJson("/search", { query, type, exchange, limit });
}

export async function getSymbol({ symbol }) {
  return fetchJson("/symbols", { symbol });
}

export async function getSymbolInfo({ group }) {
  return fetchJson("/symbol_info", { group });
}

export async function getQuotes(symbols) {
  return fetchJson("/quotes", { symbols: symbols.join(",") });
}

export async function getHistory({ symbol, resolution = "D", from, to }) {
  return fetchJson("/history", { symbol, resolution, from, to });
}

export async function getServerTime() {
  return fetchJson("/time");
}

export async function getMarks({ symbol, from, to, resolution }) {
  return fetchJson("/marks", { symbol, from, to, resolution });
}

export async function getTimescaleMarks({ symbol, from, to, resolution }) {
  return fetchJson("/timescale_marks", { symbol, from, to, resolution });
}
