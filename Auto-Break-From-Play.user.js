// ==UserScript==
// @name         Stake Auto Break In Play
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Automatically starts Break in Play when balance reaches your configured threshold.
// @author       Zerocu
// @match        https://stake.com/*
// @match        https://stake.us/*
// @match        https://stake.ac/*
// @match        https://stake.games/*
// @match        https://stake.bet/*
// @match        https://stake.pet/*
// @match        https://stake.mba/*
// @match        https://stake.jp/*
// @match        https://stake.bz/*
// @match        https://stake.ceo/*
// @match        https://stake.krd/*
// @match        https://staketr.com/*
// @match        https://stake1001.com/*
// @match        https://stake1002.com/*
// @match        https://stake1003.com/*
// @match        https://stake1021.com/*
// @match        https://stake1022.com/*
// @match        https://stake1017.com/*
// @match        https://stake.br/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  if (window.__stakeAutoBreakInPlayLoaded) return;
  window.__stakeAutoBreakInPlayLoaded = true;

  const VERSION = "1.0.0";
  const STORAGE_KEY = "stakeAutoBreakInPlaySettings";
  const BREAK_STORAGE_KEY = "stakeAutoBreakInPlayLastBreak";
  const GRAPHQL_URL = "/_api/graphql";
  const XRP_DONATION_ADDRESS = "rzerQXq1nrGakfA9DYcMDVsoAF3KPK6e1";

  const BREAK_IN_PLAY_MUTATION = `mutation BreakInPlay($duration: Duration!) {
    breakInPlay(duration: $duration) {
      id
      active
      status
      expireAt
      createdAt
      updatedAt
    }
  }`;

  const BALANCE_QUERIES = [
    {
      operationName: "UserBalances",
      query: `query UserBalances {
        user {
          id
          balances {
            available {
              amount
              currency
            }
            vault {
              amount
              currency
            }
          }
        }
      }`,
    },
    {
      operationName: "UserBalances",
      query: `query UserBalances {
        user {
          id
          balances {
            amount
            available
            currency
          }
        }
      }`,
    },
  ];

  const CURRENCY_OPTIONS = [
    "auto",
    "sweeps",
    "gold",
    "btc",
    "eth",
    "ltc",
    "doge",
    "bch",
    "xrp",
    "trx",
    "eos",
    "bnb",
    "usdt",
    "usdc",
    "dai",
    "busd",
    "ape",
    "cro",
    "link",
    "pol",
    "sand",
    "shib",
    "sol",
    "trump",
    "uni",
    "aed",
    "ars",
    "bam",
    "bdt",
    "bhd",
    "bob",
    "brl",
    "cad",
    "clp",
    "cny",
    "crc",
    "dkk",
    "egp",
    "eur",
    "ghs",
    "gtq",
    "huf",
    "idr",
    "ils",
    "inr",
    "isk",
    "jod",
    "jpy",
    "kes",
    "khr",
    "krw",
    "kwd",
    "kzt",
    "mad",
    "mwk",
    "mxn",
    "myr",
    "ngn",
    "nok",
    "nzd",
    "omr",
    "pen",
    "php",
    "pkr",
    "pln",
    "qar",
    "rub",
    "rwf",
    "sar",
    "sgd",
    "thb",
    "tnd",
    "try",
    "twd",
    "tzs",
    "ugx",
    "usd",
    "uzs",
    "vnd",
    "xaf",
    "xof",
    "zar",
    "zmw",
  ];

  const settings = {
    enabled: false,
    threshold: 100,
    triggerDirection: "above",
    currency: "auto",
    duration: "1 day",
    checkIntervalSeconds: 10,
    useSessionCookie: true,
    debugMode: true,
    minimized: false,
    uiPosition: null,
  };

  let isChecking = false;
  let checkTimer = null;
  let countdownTimer = null;
  let nextCheckAt = 0;
  let lastBalance = null;
  let lastBreak = null;
  let lastError = "";
  let patchedFetch = false;
  let patchedXHR = false;

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      Object.assign(settings, saved || {});
      settings.threshold = Number(settings.threshold) || 0;
      settings.checkIntervalSeconds = Math.max(
        3,
        Number(settings.checkIntervalSeconds) || 10,
      );
    } catch (e) {}

    try {
      lastBreak = JSON.parse(localStorage.getItem(BREAK_STORAGE_KEY) || "null");
    } catch (e) {
      lastBreak = null;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {}
  }

  function saveLastBreak(breakData) {
    lastBreak = {
      ...breakData,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(BREAK_STORAGE_KEY, JSON.stringify(lastBreak));
    } catch (e) {}
  }

  function getSessionCookie() {
    const parts = document.cookie.split(";");
    for (const c of parts) {
      const trimmed = c.trim();
      if (trimmed.startsWith("session=")) return trimmed.slice("session=".length);
    }
    return null;
  }

  function buildGraphqlHeaders(operationName, operationType) {
    const headers = {
      "Content-Type": "application/json",
      "x-language": "en",
    };
    if (operationName) headers["x-operation-name"] = operationName;
    if (operationType) headers["x-operation-type"] = operationType;

    const sess = getSessionCookie();
    if (settings.useSessionCookie && sess) headers["x-access-token"] = sess;
    return headers;
  }

  async function postGraphql(payload, operationType = "query") {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: buildGraphqlHeaders(payload.operationName, operationType),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => null);
    return { res, data };
  }

  function normalizeCurrency(value) {
    return String(value || "").trim().toLowerCase();
  }

  function currencyLabel(currency) {
    if (currency === "auto") return "Auto";
    if (currency === "sweeps") return "Sweeps";
    if (currency === "gold") return "Gold";
    return String(currency || "").toUpperCase();
  }

  function getCurrencyOptionsMarkup() {
    const selected = normalizeCurrency(settings.currency) || "auto";
    return CURRENCY_OPTIONS.map((currency) => {
      return `<option value="${currency}" ${
        selected === currency ? "selected" : ""
      }>${currencyLabel(currency)}</option>`;
    }).join("");
  }

  function getSelectedCurrency() {
    const configured = normalizeCurrency(settings.currency);
    if (configured && configured !== "auto") return configured;

    const host = String(window.location?.hostname || "").toLowerCase();
    if (host.includes("stake.us")) return "sweeps";

    try {
      const cookieCurrency = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("currency_currency="));
      if (cookieCurrency) {
        return normalizeCurrency(cookieCurrency.split("=").slice(1).join("="));
      }
    } catch (e) {}

    return "";
  }

  function asAmount(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string") return null;
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function collectBalances(input, balances = []) {
    if (!input || typeof input !== "object") return balances;

    if (Array.isArray(input)) {
      input.forEach((item) => collectBalances(item, balances));
      return balances;
    }

    const currency = normalizeCurrency(input.currency);
    const directAmount = asAmount(input.amount);
    const availableAmount = asAmount(input.available);

    if (currency && directAmount !== null) {
      balances.push({ currency, amount: directAmount, source: "amount" });
    }
    if (currency && availableAmount !== null) {
      balances.push({ currency, amount: availableAmount, source: "available" });
    }

    if (
      input.available &&
      typeof input.available === "object" &&
      normalizeCurrency(input.available.currency)
    ) {
      const nestedAmount = asAmount(input.available.amount);
      if (nestedAmount !== null) {
        balances.push({
          currency: normalizeCurrency(input.available.currency),
          amount: nestedAmount,
          source: "available.amount",
        });
      }
    }

    if (
      input.vault &&
      typeof input.vault === "object" &&
      normalizeCurrency(input.vault.currency)
    ) {
      const vaultAmount = asAmount(input.vault.amount);
      if (vaultAmount !== null) {
        balances.push({
          currency: normalizeCurrency(input.vault.currency),
          amount: vaultAmount,
          source: "vault.amount",
        });
      }
    }

    for (const value of Object.values(input)) collectBalances(value, balances);
    return balances;
  }

  function balancePriority(balance) {
    const source = String(balance?.source || "");
    if (source === "available.amount" || source === "available") return 0;
    if (source === "amount") return 1;
    if (source === "vault.amount") return 2;
    return 3;
  }

  function bestBalance(candidates, allowZero = true) {
    const usable = candidates
      .filter((balance) => Number.isFinite(balance.amount))
      .filter((balance) => allowZero || Number(balance.amount) !== 0)
      .sort((a, b) => balancePriority(a) - balancePriority(b));
    return usable[0] || null;
  }

  function pickBalance(balances) {
    const selectedCurrency = getSelectedCurrency();
    if (selectedCurrency) {
      const matching = bestBalance(
        balances.filter(
          (balance) => balance.currency === selectedCurrency,
        ),
      );
      if (matching) return matching;
    }

    const mainStakeUsBalance = bestBalance(
      balances.filter(
        (balance) => balance.currency === "sweeps" && Number(balance.amount) !== 0,
      ),
      false,
    );
    if (mainStakeUsBalance) return mainStakeUsBalance;

    const nonZeroAvailable = bestBalance(
      balances.filter(
        (balance) =>
          Number(balance.amount) !== 0 &&
          ["available.amount", "available", "amount"].includes(balance.source),
      ),
      false,
    );
    if (nonZeroAvailable) return nonZeroAvailable;

    const goldBalance = bestBalance(
      balances.filter(
        (balance) => balance.currency === "gold",
      ),
    );
    if (goldBalance) return goldBalance;

    return bestBalance(balances);
  }

  function rememberObservedBalances(data, source) {
    const balances = collectBalances(data);
    const picked = pickBalance(balances);
    if (!picked) return;
    lastBalance = { ...picked, observedAt: Date.now(), source };
    updateBalanceUI();
  }

  async function fetchBalance() {
    let finalError = "";

    for (const entry of BALANCE_QUERIES) {
      try {
        const { res, data } = await postGraphql(
          {
            operationName: entry.operationName,
            query: entry.query,
            variables: {},
          },
          "query",
        );

        if (!res.ok || data?.errors?.length) {
          finalError =
            data?.errors?.[0]?.message || `HTTP ${res.status} from balance query`;
          continue;
        }

        const balances = collectBalances(data);
        const picked = pickBalance(balances);
        if (picked) {
          lastBalance = { ...picked, observedAt: Date.now(), source: "query" };
          updateBalanceUI();
          return picked;
        }
      } catch (e) {
        finalError = e?.message || String(e);
      }
    }

    if (lastBalance && Date.now() - lastBalance.observedAt < 30000) {
      log("Using recently observed balance from site traffic");
      return lastBalance;
    }

    throw new Error(finalError || "Could not read balance");
  }

  function shouldTrigger(balance) {
    const amount = Number(balance?.amount);
    const threshold = Number(settings.threshold);
    if (!Number.isFinite(amount) || !Number.isFinite(threshold)) return false;
    if (settings.triggerDirection === "below") return amount <= threshold;
    return amount >= threshold;
  }

  async function startBreakInPlay() {
    updateStatus("Starting Break in Play...", "info");
    const payload = {
      operationName: "BreakInPlay",
      operationType: "query",
      query: BREAK_IN_PLAY_MUTATION,
      variables: { duration: settings.duration },
    };

    const { res, data } = await postGraphql(payload, "query");
    if (!res.ok || data?.errors?.length) {
      throw new Error(
        data?.errors?.[0]?.message || `Break in Play failed with HTTP ${res.status}`,
      );
    }

    const breakData = data?.data?.breakInPlay;
    if (!breakData?.active) {
      throw new Error("Break in Play response did not report active=true");
    }

    saveLastBreak(breakData);
    settings.enabled = false;
    saveSettings();
    stopMonitor(false);
    updateStatus("Break in Play active", "success", breakData.expireAt || "");
    log(`Break in Play confirmed until ${breakData.expireAt || "unknown"}`);
    updateUI();
    return breakData;
  }

  async function checkBalanceNow() {
    if (isChecking) return;
    isChecking = true;
    lastError = "";
    updateStatus("Checking balance...", "info");

    try {
      const balance = await fetchBalance();
      const label = formatBalance(balance);
      if (shouldTrigger(balance)) {
        log(`Trigger met at ${label}`);
        await startBreakInPlay();
        return;
      }

      updateStatus("Monitoring balance", "info", `${label} / ${formatThreshold()}`);
      log(`Balance ${label}; threshold ${formatThreshold()}`);
    } catch (e) {
      lastError = e?.message || String(e);
      updateStatus("Balance check failed", "error", lastError);
      log(`Balance check failed: ${lastError}`);
    } finally {
      isChecking = false;
      if (settings.enabled) scheduleNextCheck();
    }
  }

  function scheduleNextCheck(delayMs) {
    clearTimeout(checkTimer);
    const intervalMs =
      delayMs ?? Math.max(3000, Number(settings.checkIntervalSeconds) * 1000);
    nextCheckAt = Date.now() + intervalMs;
    updateCountdownUI();
    checkTimer = setTimeout(checkBalanceNow, intervalMs);
  }

  function startMonitor() {
    settings.enabled = true;
    saveSettings();
    updateUI();
    log("Monitor started");
    clearTimeout(checkTimer);
    checkBalanceNow();
  }

  function stopMonitor(save = true) {
    settings.enabled = false;
    clearTimeout(checkTimer);
    checkTimer = null;
    nextCheckAt = 0;
    if (save) saveSettings();
    updateStatus("Stopped", "info");
    updateUI();
  }

  function getStartSummaryItems() {
    return [
      ["Trigger", formatThreshold()],
      ["Currency", currencyLabel(settings.currency || "auto")],
      ["Break duration", settings.duration],
      ["Check interval", `${settings.checkIntervalSeconds}s`],
      ["Session header", settings.useSessionCookie ? "Enabled" : "Disabled"],
    ];
  }

  function formatBalance(balance) {
    if (!balance) return "--";
    const currency = balance.currency ? ` ${balance.currency.toUpperCase()}` : "";
    return `${Number(balance.amount).toLocaleString(undefined, {
      maximumFractionDigits: 8,
    })}${currency}`;
  }

  function formatThreshold() {
    const currency = getSelectedCurrency();
    const label = settings.triggerDirection === "below" ? "at/below" : "at/above";
    return `${label} ${Number(settings.threshold).toLocaleString()}${
      currency ? ` ${currency.toUpperCase()}` : ""
    }`;
  }

  function log(message) {
    if (!settings.debugMode) return;
    console.log(`[Auto BiP ${new Date().toLocaleTimeString()}] ${message}`);
    const panel = document.getElementById("abip-debug-panel");
    if (!panel) return;
    const line = document.createElement("div");
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    line.style.padding = "2px 0";
    panel.appendChild(line);
    panel.scrollTop = panel.scrollHeight;
  }

  function updateStatus(text, type = "info", extra = "") {
    const statusText = document.getElementById("abip-status-text");
    const nextCheck = document.getElementById("abip-next-check");
    const indicator = document.querySelector("#auto-bip-ui .status-indicator");
    if (statusText) statusText.textContent = text;
    if (nextCheck) nextCheck.textContent = extra || "";
    if (indicator) {
      indicator.classList.remove("status-info", "status-error", "status-success");
      indicator.classList.add(
        type === "error"
          ? "status-error"
          : type === "success"
            ? "status-success"
            : "status-info",
      );
    }
  }

  function updateBalanceUI() {
    const current = document.getElementById("abip-current-balance");
    const mini = document.getElementById("abip-mini-balance");
    const formatted = formatBalance(lastBalance);
    if (current) current.textContent = formatted;
    if (mini) mini.textContent = formatted;
  }

  function updateCountdownUI() {
    const text =
      settings.enabled && nextCheckAt
        ? `${Math.max(0, Math.ceil((nextCheckAt - Date.now()) / 1000))}s`
        : "Stopped";
    const countdown = document.getElementById("abip-live-countdown");
    const mini = document.getElementById("abip-mini-countdown");
    if (countdown) countdown.textContent = text;
    if (mini) mini.textContent = text;
  }

  function showStartConfirmation() {
    const existing = document.getElementById("abip-confirm-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "abip-confirm-overlay";
    overlay.innerHTML = `
<div id="abip-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="abip-confirm-title">
  <h3 id="abip-confirm-title">Confirm Auto BiP</h3>
  <p class="confirm-warning">Break in Play is non reversible once triggered.</p>
  <p class="confirm-copy">Review these settings before monitoring starts.</p>
  <div class="confirm-summary">
    ${getStartSummaryItems()
      .map(
        ([label, value]) =>
          `<div class="confirm-row"><span>${label}</span><strong>${value}</strong></div>`,
      )
      .join("")}
  </div>
  <div class="confirm-actions">
    <button id="abip-confirm-cancel" class="control-button button-stop">Cancel</button>
    <button id="abip-confirm-start" class="control-button button-start">Confirm Start</button>
  </div>
</div>
`;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    document.getElementById("abip-confirm-cancel").addEventListener("click", close);
    document.getElementById("abip-confirm-start").addEventListener("click", () => {
      close();
      startMonitor();
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener(
      "keydown",
      function onEscape(e) {
        if (e.key !== "Escape") return;
        document.removeEventListener("keydown", onEscape);
        close();
      },
      { once: true },
    );
  }

  function updateUI() {
    const panel = document.getElementById("auto-bip-ui");
    if (panel) panel.classList.toggle("is-minimized", settings.minimized);

    const toggle = document.getElementById("abip-toggle-button");
    if (toggle) {
      toggle.textContent = settings.enabled ? "Stop" : "Start";
      toggle.classList.toggle("button-stop", settings.enabled);
      toggle.classList.toggle("button-start", !settings.enabled);
    }

    const threshold = document.getElementById("abip-threshold-value");
    const duration = document.getElementById("abip-duration-value");
    const mode = document.getElementById("abip-trigger-mode-value");
    const interval = document.getElementById("abip-interval-value");
    const currency = document.getElementById("abip-currency-value");
    const lastBreakEl = document.getElementById("abip-last-break");
    const miniMode = document.getElementById("abip-mini-mode");

    if (threshold) threshold.textContent = formatThreshold();
    if (duration) duration.textContent = settings.duration;
    if (mode) mode.textContent = settings.triggerDirection === "below" ? "At/below" : "At/above";
    if (interval) interval.textContent = `${settings.checkIntervalSeconds}s`;
    if (currency) currency.textContent = getSelectedCurrency()?.toUpperCase() || "AUTO";
    if (lastBreakEl) lastBreakEl.textContent = lastBreak?.expireAt || "None";
    if (miniMode) miniMode.textContent = formatThreshold();

    const debugPanel = document.getElementById("abip-debug-panel");
    if (debugPanel) debugPanel.style.display = settings.debugMode ? "" : "none";

    const minimize = document.getElementById("abip-minimize-toggle");
    if (minimize) minimize.textContent = settings.minimized ? "+" : "-";

    updateBalanceUI();
    updateCountdownUI();
  }

  function injectStyles() {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
#auto-bip-ui {
  position: fixed;
  top: 100px;
  right: 360px;
  background: linear-gradient(145deg, #1f2937, #111827);
  padding: 14px;
  border-radius: 12px;
  z-index: 9999;
  width: 292px;
  color: #f0f2f5;
  font-family: 'Inter', Arial, sans-serif;
  box-shadow: 0 8px 30px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255, 255, 255, 0.05);
  border: 1px solid #374151;
}
#auto-bip-ui.is-minimized {
  width: auto;
  min-width: 250px;
  padding: 10px 12px;
}
#abip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  cursor: move;
  padding-bottom: 8px;
  border-bottom: 1px solid #374151;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
#auto-bip-ui.is-minimized #abip-header {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: 0;
}
#abip-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
#abip-header-title h3 {
  margin: 0;
  font-size: 15px;
}
#auto-bip-ui.is-minimized #abip-header-title,
#auto-bip-ui.is-minimized #abip-status-container,
#auto-bip-ui.is-minimized .settings-section,
#auto-bip-ui.is-minimized .stats-grid,
#auto-bip-ui.is-minimized .donation-section,
#auto-bip-ui.is-minimized #abip-debug-panel {
  display: none;
}
#abip-mini-summary {
  display: none;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #d1d5db;
  white-space: nowrap;
  overflow: hidden;
}
#auto-bip-ui.is-minimized #abip-mini-summary {
  display: flex;
  flex: 1;
}
.mini-pill {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.9);
  border: 1px solid #374151;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.05);
}
.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  display: inline-block;
  border: 1px solid rgba(0,0,0,0.5);
  box-shadow: 0 0 6px 1px currentColor;
}
.status-info {
  color: #6b7280;
  background-color: #6b7280;
}
.status-error {
  color: #ef4444;
  background-color: #ef4444;
}
.status-success {
  color: #10b981;
  background-color: #10b981;
}
.control-button {
  padding: 7px 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid rgba(0,0,0,0.6);
  text-shadow: 0 -1px 1px rgba(0,0,0,0.4);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 2px 3px rgba(0,0,0,0.5);
}
.control-button.compact {
  min-width: 30px;
  padding: 6px 9px;
  line-height: 1;
}
.button-start {
  background: linear-gradient(to bottom, #1e40af, #0f3460);
  color: white;
}
.button-start:hover {
  background: linear-gradient(to bottom, #2563eb, #1d4ed8);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.15), 0 2px 3px rgba(0,0,0,0.5), 0 0 12px #2563eb;
}
.button-stop {
  background: linear-gradient(to bottom, #991b1b, #7f1d1d);
  color: white;
}
.button-stop:hover {
  background: linear-gradient(to bottom, #b91c1c, #991b1b);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.15), 0 2px 3px rgba(0,0,0,0.5), 0 0 12px #b91c1c;
}
.settings-section, .donation-section {
  margin: 10px 0;
  padding: 10px;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  border: 1px solid #111827;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 10px 0;
}
.stat-box {
  background: linear-gradient(145deg, #374151, #1f2937);
  padding: 8px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #4b5563;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
.stat-label {
  font-size: 10px;
  color: #9ca3af;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.stat-value {
  font-size: 14px;
  font-weight: bold;
  color: #ffffff;
  text-shadow: 0 0 5px rgba(255,255,255,0.2);
  overflow-wrap: anywhere;
}
.form-group {
  margin-bottom: 10px;
}
.form-group label {
  display: block;
  margin-bottom: 3px;
  color: #9ca3af;
}
.flex-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
  font-size: 12px;
}
.button-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
#auto-bip-ui input[type="number"],
#auto-bip-ui input[type="text"],
#auto-bip-ui select {
  width: 118px;
  padding: 6px;
  background: #111827;
  color: #f0f2f5;
  border: 1px solid #4b5563;
  border-radius: 4px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.6);
}
#auto-bip-ui input[type="checkbox"] {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border: 1px solid #4b5563;
  border-radius: 4px;
  background-color: #1f2937;
  cursor: pointer;
  vertical-align: middle;
  margin-right: 8px;
  position: relative;
  top: -1px;
  transition: all 0.2s;
}
#auto-bip-ui input[type="checkbox"]:checked {
  background-color: #1d4ed8;
  border-color: #2563eb;
  box-shadow: 0 0 8px #2563eb;
}
#auto-bip-ui input[type="checkbox"]:checked::after {
  content: '\\2713';
  font-size: 14px;
  color: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-shadow: 0 0 3px rgba(0,0,0,0.6);
}
#abip-live-countdown {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}
.donation-label {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 8px;
  text-align: center;
}
.address-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
#abip-xrp-address {
  width: 100%;
  box-sizing: border-box;
  padding: 6px;
  background: #111827;
  color: #f0f2f5;
  border: 1px solid #4b5563;
  border-radius: 4px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
  margin-top: 0;
}
#abip-copy-xrp-button {
  background: linear-gradient(to bottom, #374151, #1f2937);
  color: #d1d5db;
  border: 1px solid #4b5563;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
#abip-copy-xrp-button:hover {
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 0 8px #3b82f6;
}
#abip-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.72);
}
#abip-confirm-modal {
  width: min(360px, 100%);
  color: #f0f2f5;
  background: linear-gradient(145deg, #1f2937, #111827);
  border: 1px solid #374151;
  border-radius: 10px;
  box-shadow: 0 12px 42px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,255,255,0.05);
  padding: 16px;
  font-family: 'Inter', Arial, sans-serif;
}
#abip-confirm-modal h3 {
  margin: 0 0 8px;
  font-size: 16px;
}
.confirm-warning {
  margin: 0 0 8px;
  color: #fca5a5;
  font-weight: 700;
}
.confirm-copy {
  margin: 0 0 12px;
  color: #d1d5db;
  font-size: 12px;
}
.confirm-summary {
  display: grid;
  gap: 7px;
  padding: 10px;
  margin-bottom: 12px;
  background: rgba(0,0,0,0.3);
  border: 1px solid #111827;
  border-radius: 8px;
}
.confirm-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  font-size: 12px;
}
.confirm-row span {
  color: #9ca3af;
}
.confirm-row strong {
  color: #ffffff;
  text-align: right;
}
.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
#abip-debug-panel {
  max-height: 90px;
  overflow-y: auto;
  font-size: 11px;
  margin-top: 8px;
  padding: 6px;
  background: rgba(0,0,0,0.4);
  border-radius: 6px;
  border: 1px solid #111827;
}
`;
    document.head.appendChild(styleSheet);
  }

  function createControlPanel() {
    const panel = document.createElement("div");
    panel.id = "auto-bip-ui";
    panel.innerHTML = `
<div id="abip-header">
  <div id="abip-header-title">
    <span class="status-indicator status-info"></span>
    <h3>Auto BiP v${VERSION}</h3>
  </div>
  <div id="abip-mini-summary">
    <span id="abip-mini-balance" class="mini-pill">--</span>
    <span id="abip-mini-mode" class="mini-pill">${formatThreshold()}</span>
    <span id="abip-mini-countdown" class="mini-pill">Stopped</span>
  </div>
  <button id="abip-minimize-toggle" class="control-button compact" aria-label="Minimize panel">-</button>
</div>

<div id="abip-status-container">
  <p id="abip-status-text">Ready</p>
  <p id="abip-next-check"></p>
  <p id="abip-live-countdown">Stopped</p>
</div>

<div class="settings-section">
  <div class="form-group">
    <div class="flex-group">
      <label for="abip-threshold-input">Balance Threshold</label>
      <input type="number" id="abip-threshold-input" min="0" step="0.00000001" value="${settings.threshold}">
    </div>
    <div class="flex-group">
      <label for="abip-trigger-direction">Trigger When</label>
      <select id="abip-trigger-direction">
        <option value="above" ${settings.triggerDirection === "above" ? "selected" : ""}>At/Above</option>
        <option value="below" ${settings.triggerDirection === "below" ? "selected" : ""}>At/Below</option>
      </select>
    </div>
    <div class="flex-group">
      <label for="abip-currency-select">Currency</label>
      <select id="abip-currency-select">${getCurrencyOptionsMarkup()}</select>
    </div>
    <div class="flex-group">
      <label for="abip-duration-select">Break Duration</label>
      <select id="abip-duration-select">
        <option value="1 day" ${settings.duration === "1 day" ? "selected" : ""}>1 day</option>
        <option value="1 week" ${settings.duration === "1 week" ? "selected" : ""}>1 week</option>
        <option value="1 month" ${settings.duration === "1 month" ? "selected" : ""}>1 month</option>
      </select>
    </div>
    <div class="flex-group">
      <label for="abip-interval-input">Check Every (sec)</label>
      <input type="number" id="abip-interval-input" min="3" step="1" value="${settings.checkIntervalSeconds}">
    </div>
    <div class="flex-group">
      <span>Use Session Header</span>
      <label><input type="checkbox" id="abip-session-cookie" ${settings.useSessionCookie ? "checked" : ""}>Enable</label>
    </div>
    <div class="flex-group">
      <span>Debug Mode</span>
      <label><input type="checkbox" id="abip-debug-mode" ${settings.debugMode ? "checked" : ""}>Enable</label>
    </div>
  </div>
  <div class="button-row">
    <button id="abip-toggle-button" class="control-button button-start">Start</button>
    <button id="abip-check-now-button" class="control-button button-start">Check Now</button>
  </div>
</div>

<div class="stats-grid">
  <div class="stat-box">
    <div class="stat-label">Current Balance</div>
    <div class="stat-value" id="abip-current-balance">--</div>
  </div>
  <div class="stat-box">
    <div class="stat-label">Threshold</div>
    <div class="stat-value" id="abip-threshold-value">${formatThreshold()}</div>
  </div>
  <div class="stat-box">
    <div class="stat-label">Duration</div>
    <div class="stat-value" id="abip-duration-value">${settings.duration}</div>
  </div>
  <div class="stat-box">
    <div class="stat-label">Last Break Until</div>
    <div class="stat-value" id="abip-last-break">${lastBreak?.expireAt || "None"}</div>
  </div>
</div>

<div class="donation-section">
  <div class="donation-label">Enjoying the script? XRP Address</div>
  <div class="address-container">
    <input type="text" id="abip-xrp-address" value="${XRP_DONATION_ADDRESS}" readonly>
    <button id="abip-copy-xrp-button">Copy</button>
  </div>
</div>

<div id="abip-debug-panel" style="${settings.debugMode ? "" : "display:none;"}"></div>
`;

    document.body.appendChild(panel);
    makeDraggable(panel);
    initializeEventListeners();
    updateUI();
  }

  function makeDraggable(panel) {
    const header = panel.querySelector("#abip-header");
    let isDragging = false;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener("mousedown", (e) => {
      if (e.target.closest("button, input, select, label")) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      xOffset = e.clientX - rect.left;
      yOffset = e.clientY - rect.top;
      panel.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      panel.style.left = `${e.clientX - xOffset}px`;
      panel.style.top = `${e.clientY - yOffset}px`;
      panel.style.right = "auto";
    });

    document.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.cursor = "default";
      const rect = panel.getBoundingClientRect();
      settings.uiPosition = { top: rect.top, left: rect.left };
      saveSettings();
    });

    if (settings.uiPosition) {
      panel.style.top = `${settings.uiPosition.top}px`;
      panel.style.left = `${settings.uiPosition.left}px`;
      panel.style.right = "auto";
    }
  }

  function initializeEventListeners() {
    document.getElementById("abip-minimize-toggle").addEventListener("click", () => {
      settings.minimized = !settings.minimized;
      saveSettings();
      updateUI();
    });

    document.getElementById("abip-toggle-button").addEventListener("click", () => {
      if (settings.enabled) stopMonitor();
      else showStartConfirmation();
    });

    document.getElementById("abip-check-now-button").addEventListener("click", () => {
      clearTimeout(checkTimer);
      checkBalanceNow();
    });

    document.getElementById("abip-threshold-input").addEventListener("change", (e) => {
      settings.threshold = Math.max(0, Number(e.target.value) || 0);
      saveSettings();
      updateUI();
    });

    document.getElementById("abip-trigger-direction").addEventListener("change", (e) => {
      settings.triggerDirection = e.target.value === "below" ? "below" : "above";
      saveSettings();
      updateUI();
    });

    document.getElementById("abip-currency-select").addEventListener("change", (e) => {
      settings.currency = normalizeCurrency(e.target.value) || "auto";
      saveSettings();
      updateUI();
    });

    document.getElementById("abip-duration-select").addEventListener("change", (e) => {
      settings.duration = e.target.value;
      saveSettings();
      updateUI();
    });

    document.getElementById("abip-interval-input").addEventListener("change", (e) => {
      settings.checkIntervalSeconds = Math.max(3, Number(e.target.value) || 10);
      e.target.value = settings.checkIntervalSeconds;
      saveSettings();
      if (settings.enabled) scheduleNextCheck();
      updateUI();
    });

    document.getElementById("abip-session-cookie").addEventListener("change", (e) => {
      settings.useSessionCookie = e.target.checked;
      saveSettings();
    });

    document.getElementById("abip-debug-mode").addEventListener("change", (e) => {
      settings.debugMode = e.target.checked;
      saveSettings();
      updateUI();
    });

    document.getElementById("abip-copy-xrp-button").addEventListener("click", () => {
      const addr = document.getElementById("abip-xrp-address");
      if (!addr) return;
      addr.select();
      addr.setSelectionRange(0, 99999);
      try {
        document.execCommand("copy");
        updateStatus("XRP address copied", "success");
      } catch (e) {
        updateStatus("Copy failed", "error");
      }
    });
  }

  function patchNetworkObservers() {
    if (!patchedFetch && window.fetch) {
      patchedFetch = true;
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const url = String(args[0]?.url || args[0] || "");
          if (url.includes("/_api/graphql")) {
            response
              .clone()
              .json()
              .then((data) => rememberObservedBalances(data, "fetch"))
              .catch(() => {});
          }
        } catch (e) {}
        return response;
      };
    }

    if (!patchedXHR && window.XMLHttpRequest) {
      patchedXHR = true;
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__abipUrl = String(url || "");
        return originalOpen.call(this, method, url, ...rest);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener("load", function () {
          try {
            if (!String(this.__abipUrl || "").includes("/_api/graphql")) return;
            const data = JSON.parse(this.responseText);
            rememberObservedBalances(data, "xhr");
          } catch (e) {}
        });
        return originalSend.apply(this, args);
      };
    }
  }

  function startCountdownTimer() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(updateCountdownUI, 1000);
  }

  function init() {
    loadSettings();
    patchNetworkObservers();
    injectStyles();
    createControlPanel();
    startCountdownTimer();

    if (settings.enabled) {
      scheduleNextCheck(1200);
      updateStatus("Monitoring balance", "info");
    } else {
      updateStatus("Ready", "info");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
