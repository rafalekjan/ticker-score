function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function isTypeMatch(direction, optionType) {
  if (direction === "CALL") return optionType === "call";
  if (direction === "PUT") return optionType === "put";
  return false;
}

function classifyStrike(option, spotPrice, direction) {
  const strike = toNumber(option.strike);
  const distancePct = Math.abs(strike - spotPrice) / spotPrice;

  if (direction === "CALL") {
    if (distancePct <= 0.015) return "ATM";
    if (strike < spotPrice && distancePct <= 0.05) return "SLIGHT_ITM";
    if (strike > spotPrice && distancePct <= 0.03) return "OTM_NEAR";
    return strike > spotPrice ? "FAR_OTM" : "DEEP_ITM";
  }

  if (distancePct <= 0.015) return "ATM";
  if (strike > spotPrice && distancePct <= 0.05) return "SLIGHT_ITM";
  if (strike < spotPrice && distancePct <= 0.03) return "OTM_NEAR";
  return strike < spotPrice ? "FAR_OTM" : "DEEP_ITM";
}

function scoreContract(contract, minSpreadPct) {
  const spreadScore = 1 - Math.min(contract.spreadPct / Math.max(minSpreadPct, 0.001), 1);
  const volumeScore = Math.min(contract.volume / 500, 1);
  const oiScore = Math.min(contract.openInterest / 2000, 1);
  const atmBonus = contract.strikeTag === "ATM" ? 0.2 : 0.1;
  return spreadScore * 0.45 + volumeScore * 0.25 + oiScore * 0.2 + atmBonus;
}

export function selectSwingOption(input) {
  const {
    direction,
    underlyingPrice,
    marketPermission = "FULL",
    ivContextTag = "OK",
    expectedMoveSpeed = "IMPULSE",
    optionsChain = [],
    thresholds = {},
  } = input;

  const minDte = toNumber(thresholds.minDte, 7);
  const maxDte = toNumber(thresholds.maxDte, expectedMoveSpeed === "GRIND" ? 21 : 14);
  const maxSpreadPct = toNumber(thresholds.maxSpreadPct, 0.12);
  const minVolume = toNumber(thresholds.minVolume, 50);
  const minOpenInterest = toNumber(thresholds.minOpenInterest, 200);

  if (!["CALL", "PUT"].includes(direction)) {
    return {
      status: "CONTRACT_BLOCKED",
      reasonCodes: ["INVALID_DIRECTION"],
      selectedContract: null,
      alternates: [],
      diagnostics: { considered: 0, passed: 0 },
    };
  }

  if (marketPermission === "BLOCKED") {
    return {
      status: "CONTRACT_BLOCKED",
      reasonCodes: ["CONTRACT_CONFLICTS_WITH_MARKET_PERMISSION"],
      selectedContract: null,
      alternates: [],
      diagnostics: { considered: 0, passed: 0 },
    };
  }

  const rows = optionsChain
    .filter((row) => isTypeMatch(direction, String(row.type || "").toLowerCase()))
    .map((row) => {
      const bid = toNumber(row.bid);
      const ask = toNumber(row.ask);
      const mid = (bid + ask) / 2;
      const spreadPct = mid > 0 ? (ask - bid) / mid : 999;
      const strikeTag = classifyStrike(row, underlyingPrice, direction);
      const dte = toNumber(row.dte);

      return {
        ...row,
        dte,
        bid,
        ask,
        mid,
        spreadPct,
        strikeTag,
        volume: toNumber(row.volume),
        openInterest: toNumber(row.openInterest),
      };
    });

  const filtered = [];
  const reasons = [];

  for (const contract of rows) {
    const localReasons = [];

    if (contract.dte < minDte || contract.dte > maxDte) {
      localReasons.push("NO_SUITABLE_EXPIRY");
    }

    if (!["ATM", "SLIGHT_ITM"].includes(contract.strikeTag)) {
      localReasons.push("FAR_OTM_DISALLOWED");
    }

    if (contract.spreadPct > maxSpreadPct) {
      localReasons.push("WIDE_SPREAD");
      localReasons.push("SPREAD_DEGRADES_RR");
    }

    if (contract.volume < minVolume) {
      localReasons.push("LOW_VOLUME");
    }

    if (contract.openInterest < minOpenInterest) {
      localReasons.push("LOW_OPEN_INTEREST");
    }

    if (marketPermission === "REDUCED" && contract.dte < 10) {
      localReasons.push("EXCESSIVE_THETA_PRESSURE");
    }

    if (ivContextTag === "RISK") {
      localReasons.push("IV_PRICING_RISK");
    }

    if (localReasons.length === 0) {
      filtered.push(contract);
    } else {
      reasons.push(...localReasons);
    }
  }

  if (filtered.length === 0) {
    return {
      status: ivContextTag === "RISK" ? "CONTRACT_REDUCED" : "CONTRACT_BLOCKED",
      reasonCodes: unique(reasons.length ? reasons : ["ILLQ_CHAIN"]),
      selectedContract: null,
      alternates: [],
      diagnostics: { considered: rows.length, passed: 0 },
    };
  }

  const ranked = filtered
    .map((contract) => ({
      ...contract,
      rankScore: Number(scoreContract(contract, maxSpreadPct).toFixed(4)),
    }))
    .sort((a, b) => b.rankScore - a.rankScore);

  const selectedContract = ranked[0];
  const alternates = ranked.slice(1, 4);

  const status = ivContextTag === "RISK" ? "CONTRACT_REDUCED" : "CONTRACT_SELECTED";

  return {
    status,
    reasonCodes: ivContextTag === "RISK" ? ["IV_PRICING_RISK"] : [],
    selectedContract,
    alternates,
    diagnostics: {
      considered: rows.length,
      passed: filtered.length,
      dteRange: `${minDte}-${maxDte}`,
    },
  };
}