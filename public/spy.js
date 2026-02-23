const spySymbolEl = document.querySelector("#spySymbol");
const resultEl = document.querySelector("#spyResult");
const permissionBadgeEl = document.querySelector("#permissionBadge");

function print(data) {
  resultEl.textContent = JSON.stringify(data, null, 2);
}

function evaluatePermission() {
  const bias = document.querySelector("#bias").value;
  const regime = document.querySelector("#regime").value;
  const breadth = document.querySelector("#breadth").value;
  const vixRisk = document.querySelector("#vixRisk").value;

  const reasons = [];
  let permission = "FULL";

  if (bias === "MIXED") {
    permission = "OBSERVATION";
    reasons.push("MIXED_BIAS");
  }

  if (regime === "VOLATILE") {
    permission = permission === "FULL" ? "REDUCED" : permission;
    reasons.push("VOLATILE_REGIME");
  }

  if (breadth === "WEAK") {
    permission = "REDUCED";
    reasons.push("WEAK_BREADTH");
  }

  if (vixRisk === "HIGH") {
    permission = "BLOCKED";
    reasons.push("HIGH_VIX_RISK");
  }

  permissionBadgeEl.textContent = `Permission: ${permission}`;
  print({ permission, reasons, snapshot: { bias, regime, breadth, vixRisk } });
}

async function loadSpyBundle() {
  const symbol = spySymbolEl.value.trim();
  if (!symbol) return;

  const response = await fetch(`/api/tv/ticker-bundle?symbol=${encodeURIComponent(symbol)}&resolution=D`);
  const data = await response.json();
  print(data);
}

document.querySelector("#evaluateSpyBtn").addEventListener("click", evaluatePermission);
document.querySelector("#loadSpyBtn").addEventListener("click", loadSpyBundle);
