import express from "express";
import {
  getConfig,
  getHistory,
  getMarks,
  getQuotes,
  getServerTime,
  getSymbol,
  getSymbolInfo,
  getTimescaleMarks,
  getUdfBaseUrl,
  searchSymbols,
} from "./tvUdfClient.js";
import { selectSwingOption } from "./swingSelector.js";
import { createSetup, getSetupById, listSetups, updateSetup } from "./db/setupsRepository.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  };
}

function requireSelectionPayload(payload) {
  return payload.direction && payload.underlyingPrice && Array.isArray(payload.optionsChain);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, udfBaseUrl: getUdfBaseUrl() });
});

app.get("/api/tv/config", asyncRoute(async (_req, res) => {
  const data = await getConfig();
  res.json(data);
}));

app.get("/api/tv/search", asyncRoute(async (req, res) => {
  const data = await searchSymbols({
    query: req.query.query,
    type: req.query.type || "stock",
    exchange: req.query.exchange || "",
    limit: req.query.limit || 10,
  });
  res.json(data);
}));

app.get("/api/tv/symbol", asyncRoute(async (req, res) => {
  if (!req.query.symbol) {
    return res.status(400).json({ error: "symbol is required" });
  }

  const data = await getSymbol({ symbol: req.query.symbol });
  return res.json(data);
}));

app.get("/api/tv/symbol-info", asyncRoute(async (req, res) => {
  if (!req.query.group) {
    return res.status(400).json({ error: "group is required" });
  }

  const data = await getSymbolInfo({ group: req.query.group });
  return res.json(data);
}));

app.get("/api/tv/quote", asyncRoute(async (req, res) => {
  const symbols = String(req.query.symbols || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({ error: "Query param symbols is required" });
  }

  const data = await getQuotes(symbols);
  return res.json(data);
}));

app.get("/api/tv/history", asyncRoute(async (req, res) => {
  const { symbol, resolution, from, to } = req.query;
  if (!symbol || !from || !to) {
    return res.status(400).json({ error: "symbol, from and to are required" });
  }

  const data = await getHistory({ symbol, resolution, from, to });
  return res.json(data);
}));

app.get("/api/tv/time", asyncRoute(async (_req, res) => {
  const data = await getServerTime();
  res.json(data);
}));

app.get("/api/tv/marks", asyncRoute(async (req, res) => {
  const { symbol, from, to, resolution } = req.query;
  if (!symbol || !from || !to || !resolution) {
    return res.status(400).json({ error: "symbol, from, to, resolution are required" });
  }

  const data = await getMarks({ symbol, from, to, resolution });
  return res.json(data);
}));

app.get("/api/tv/timescale-marks", asyncRoute(async (req, res) => {
  const { symbol, from, to, resolution } = req.query;
  if (!symbol || !from || !to || !resolution) {
    return res.status(400).json({ error: "symbol, from, to, resolution are required" });
  }

  const data = await getTimescaleMarks({ symbol, from, to, resolution });
  return res.json(data);
}));

app.get("/api/tv/ticker-bundle", asyncRoute(async (req, res) => {
  const symbol = String(req.query.symbol || "").trim();
  if (!symbol) {
    return res.status(400).json({ error: "symbol is required" });
  }

  const resolution = String(req.query.resolution || "D");
  const to = Number(req.query.to || Math.floor(Date.now() / 1000));
  const from = Number(req.query.from || to - 86400 * 180);

  const [config, quote, history, serverTime] = await Promise.all([
    getConfig(),
    getQuotes([symbol]),
    getHistory({ symbol, resolution, from, to }),
    getServerTime(),
  ]);

  return res.json({
    symbol,
    resolution,
    from,
    to,
    config,
    quote,
    history,
    serverTime,
  });
}));

app.post("/api/swing/select", (req, res) => {
  const payload = req.body || {};

  if (!requireSelectionPayload(payload)) {
    return res.status(400).json({
      error: "direction, underlyingPrice and optionsChain[] are required",
    });
  }

  const decision = selectSwingOption(payload);
  return res.json(decision);
});

app.post("/api/setups", asyncRoute(async (req, res) => {
  const payload = req.body || {};

  if (!payload.ticker || !payload.tvSymbol || !requireSelectionPayload(payload)) {
    return res.status(400).json({
      error: "ticker, tvSymbol, direction, underlyingPrice and optionsChain[] are required",
    });
  }

  const decision = selectSwingOption(payload);

  const saved = await createSetup({
    ticker: payload.ticker,
    tvSymbol: payload.tvSymbol,
    direction: payload.direction,
    marketPermission: payload.marketPermission || "FULL",
    ivContextTag: payload.ivContextTag || "OK",
    expectedMoveSpeed: payload.expectedMoveSpeed || "IMPULSE",
    underlyingPrice: payload.underlyingPrice,
    optionsChain: payload.optionsChain,
    decision,
    status: decision.status,
    reasonCodes: decision.reasonCodes,
    notes: payload.notes || null,
  });

  return res.status(201).json(saved);
}));

app.get("/api/setups", asyncRoute(async (req, res) => {
  const setups = await listSetups(req.query.limit || 50);
  res.json(setups);
}));

app.get("/api/setups/:id", asyncRoute(async (req, res) => {
  const setup = await getSetupById(req.params.id);
  if (!setup) return res.status(404).json({ error: "Setup not found" });
  return res.json(setup);
}));

app.patch("/api/setups/:id", asyncRoute(async (req, res) => {
  const patch = req.body || {};

  if (requireSelectionPayload(patch)) {
    const decision = selectSwingOption(patch);
    patch.decision = decision;
    patch.status = decision.status;
    patch.reasonCodes = decision.reasonCodes;
  }

  const updated = await updateSetup(req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Setup not found" });
  return res.json(updated);
}));

app.listen(port, () => {
  console.log(`ticker-score app is running at http://localhost:${port}`);
});