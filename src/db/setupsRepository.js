import { query } from "./client.js";

function mapSetup(row) {
  return {
    id: row.id,
    ticker: row.ticker,
    tvSymbol: row.tv_symbol,
    direction: row.direction,
    marketPermission: row.market_permission,
    ivContextTag: row.iv_context_tag,
    expectedMoveSpeed: row.expected_move_speed,
    underlyingPrice: Number(row.underlying_price),
    optionsChain: row.options_chain,
    decision: row.decision,
    status: row.status,
    reasonCodes: row.reason_codes,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createSetup(input) {
  const {
    ticker,
    tvSymbol,
    direction,
    marketPermission,
    ivContextTag,
    expectedMoveSpeed,
    underlyingPrice,
    optionsChain,
    decision,
    status,
    reasonCodes,
    notes,
  } = input;

  const sql = `
    INSERT INTO setups (
      ticker, tv_symbol, direction, market_permission, iv_context_tag,
      expected_move_speed, underlying_price, options_chain, decision,
      status, reason_codes, notes
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8::jsonb, $9::jsonb,
      $10, $11::jsonb, $12
    )
    RETURNING *
  `;

  const values = [
    ticker,
    tvSymbol,
    direction,
    marketPermission,
    ivContextTag,
    expectedMoveSpeed,
    underlyingPrice,
    JSON.stringify(optionsChain || []),
    JSON.stringify(decision || {}),
    status,
    JSON.stringify(reasonCodes || []),
    notes || null,
  ];

  const result = await query(sql, values);
  return mapSetup(result.rows[0]);
}

export async function listSetups(limit = 50) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const result = await query("SELECT * FROM setups ORDER BY created_at DESC LIMIT $1", [cappedLimit]);
  return result.rows.map(mapSetup);
}

export async function getSetupById(id) {
  const result = await query("SELECT * FROM setups WHERE id = $1", [id]);
  if (!result.rows.length) return null;
  return mapSetup(result.rows[0]);
}

export async function updateSetup(id, patch) {
  const fields = [];
  const params = [];

  const allowed = {
    ticker: "ticker",
    tvSymbol: "tv_symbol",
    direction: "direction",
    marketPermission: "market_permission",
    ivContextTag: "iv_context_tag",
    expectedMoveSpeed: "expected_move_speed",
    underlyingPrice: "underlying_price",
    status: "status",
    notes: "notes",
  };

  for (const [key, dbField] of Object.entries(allowed)) {
    if (Object.hasOwn(patch, key)) {
      params.push(patch[key]);
      fields.push(`${dbField} = $${params.length}`);
    }
  }

  if (Object.hasOwn(patch, "optionsChain")) {
    params.push(JSON.stringify(patch.optionsChain || []));
    fields.push(`options_chain = $${params.length}::jsonb`);
  }

  if (Object.hasOwn(patch, "decision")) {
    params.push(JSON.stringify(patch.decision || {}));
    fields.push(`decision = $${params.length}::jsonb`);
  }

  if (Object.hasOwn(patch, "reasonCodes")) {
    params.push(JSON.stringify(patch.reasonCodes || []));
    fields.push(`reason_codes = $${params.length}::jsonb`);
  }

  if (!fields.length) {
    return getSetupById(id);
  }

  params.push(id);
  const sql = `
    UPDATE setups
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE id = $${params.length}
    RETURNING *
  `;

  const result = await query(sql, params);
  if (!result.rows.length) return null;
  return mapSetup(result.rows[0]);
}