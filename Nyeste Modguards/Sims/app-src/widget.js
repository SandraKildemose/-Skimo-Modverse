const { ipcRenderer } = require("electron");
const { localeFromCountry, t } = require("./i18n");

const statusLine = document.getElementById("statusLine");
const panelKicker = document.getElementById("panelKicker");
const panelScannerBtn = document.getElementById("panelScannerBtn");
const panelProtection = document.getElementById("panelProtection");
const panelLastFile = document.getElementById("panelLastFile");
const panelFolderBtn = document.getElementById("panelFolderBtn");
const panelFolderLabel = document.getElementById("panelFolderLabel");
const panelFolder = document.getElementById("panelFolder");
const panelOutdatedBtn = document.getElementById("panelOutdatedBtn");
const panelOutdatedLabel = document.getElementById("panelOutdatedLabel");
const panelOutdated = document.getElementById("panelOutdated");
const panelDownloadedBtn = document.getElementById("panelDownloadedBtn");
const panelDownloadedLabel = document.getElementById("panelDownloadedLabel");
const panelDownloaded = document.getElementById("panelDownloaded");
const panelQuarantineBtn = document.getElementById("panelQuarantineBtn");
const panelQuarantineLabel = document.getElementById("panelQuarantineLabel");
const panelQuarantine = document.getElementById("panelQuarantine");
const panelLogsBtn = document.getElementById("panelLogsBtn");
const panelLogsLabel = document.getElementById("panelLogsLabel");
const panelLogs = document.getElementById("panelLogs");
const panelDuplicatesBtn = document.getElementById("panelDuplicatesBtn");
const panelDuplicatesLabel = document.getElementById("panelDuplicatesLabel");
const panelDuplicates = document.getElementById("panelDuplicates");
const settingsFab = document.getElementById("settingsFab");
const helpChar = document.getElementById("helpChar");
const widgetOverlay = document.getElementById("widgetOverlay");
const overlayBack = document.getElementById("overlayBack");
const overlayTitle = document.getElementById("overlayTitle");
const overlayBody = document.getElementById("overlayBody");

const mode = new URLSearchParams(window.location.search).get("mode") || "scanner";
document.body.dataset.mode = mode;

let state = null;
let currentLocale = "da";
let activePanel = "";

function getStoredLocale() {
  try {
    const saved = String(localStorage.getItem("skimo_locale") || "").trim();
    if (saved) return saved;
  } catch {}
  return "";
}

function setLocale(locale) {
  const next = locale || "da";
  currentLocale = next;
  try {
    document.documentElement.lang = next;
  } catch {}
}

function tt(key, vars) {
  return t(currentLocale, key, vars);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtDate(iso) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return "";
  try {
    return new Date(time).toLocaleString(currentLocale);
  } catch {
    return new Date(time).toLocaleString();
  }
}

function getStats() {
  const widgetStats = state?.widgetStats || {};
  const outdatedFromState = Number(state?.outdatedMods?.count || 0);
  return {
    downloadedCount: Number(widgetStats.downloadedCount || 0),
    quarantineCount: Number(widgetStats.quarantineCount || 0),
    outdatedCount: Number(widgetStats.outdatedCount ?? outdatedFromState ?? 0),
    logsCount: Number(widgetStats.logsCount || 0),
    duplicatesCount: Number(widgetStats.duplicatesCount || 0),
    duplicateExtraCount: Number(widgetStats.duplicateExtraCount || 0),
    downloadedItems: Array.isArray(widgetStats.downloadedItems) ? widgetStats.downloadedItems : [],
    quarantineItems: Array.isArray(widgetStats.quarantineItems) ? widgetStats.quarantineItems : [],
    logItems: Array.isArray(widgetStats.logItems) ? widgetStats.logItems : [],
    duplicateItems: Array.isArray(widgetStats.duplicateItems) ? widgetStats.duplicateItems : [],
    outdatedItems: Array.isArray(state?.outdatedMods?.items) ? state.outdatedMods.items : [],
  };
}

function statusLabel(status) {
  const map = {
    clean: "widget.statusClean",
    virus: "widget.statusVirus",
    error: "widget.statusError",
    scanning: "widget.statusScanning",
    downloading: "widget.statusDownloading",
    ignored: "widget.statusIgnored",
  };
  return tt(map[status] || "widget.statusUnknown");
}

function renderList(items, emptyText, mapItem) {
  if (!items.length) return `<div class="overlay-empty">${escapeHtml(emptyText)}</div>`;
  return `<div class="overlay-list">${items.map(mapItem).join("")}</div>`;
}

function openOverlay(panel) {
  activePanel = panel;
  if (!widgetOverlay) return;
  widgetOverlay.hidden = false;
  widgetOverlay.classList.add("is-open");
  renderOverlay(panel);
}

function closeOverlay() {
  activePanel = "";
  if (!widgetOverlay) return;
  widgetOverlay.hidden = true;
  widgetOverlay.classList.remove("is-open");
  if (overlayBody) overlayBody.innerHTML = "";
}

function renderOverlay(panel) {
  if (!overlayTitle || !overlayBody || !state) return;
  const stats = getStats();
  const enabled = !!state.protectionEnabled;
  const scanning = !!state.scanning;
  const last = state.lastEvent;
  const lastName = last?.fileName ? String(last.fileName) : "";
  const folder = state.destinationFolder ? String(state.destinationFolder) : "";

  if (panel === "scanner") {
    overlayTitle.textContent = tt("widget.overlayScanner");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(scanning ? tt("widget.protectionWorking") : enabled ? tt("widget.protectionOn") : tt("widget.protectionOff"))}</strong>
        <span>${escapeHtml(lastName ? tt("widget.lastFile", { file: lastName }) : tt("widget.lastFileReady"))}</span>
      </div>
      <label class="overlay-toggle-row">
        <div><strong>${escapeHtml(tt("widget.antivirus"))}</strong><span>${escapeHtml(tt("widget.antivirusHint"))}</span></div>
        <input type="checkbox" class="overlay-switch" id="overlayProtectionToggle" ${enabled ? "checked" : ""} />
      </label>
      <button type="button" class="overlay-action" id="overlayScanNow">${escapeHtml(tt("widget.scanNow"))}</button>
    `;
    document.getElementById("overlayProtectionToggle")?.addEventListener("change", async (event) => {
      await ipcRenderer.invoke("set-protection", !!event.target.checked).catch(() => {});
      ipcRenderer.invoke("get-state").then(render).catch(() => {});
    });
    document.getElementById("overlayScanNow")?.addEventListener("click", () => {
      ipcRenderer.invoke("scan-downloads-now").catch(() => {});
    });
    return;
  }

  if (panel === "folder") {
    overlayTitle.textContent = tt("widget.overlayFolder");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(folder ? tt("widget.modsFolderActive") : tt("widget.modsFolderPick"))}</strong>
        <span>${escapeHtml(folder || tt("widget.noFolderYet"))}</span>
      </div>
      <button type="button" class="overlay-action" id="overlayPickFolder">${escapeHtml(tt("widget.modsFolderChange"))}</button>
      ${folder ? `<button type="button" class="overlay-action" id="overlayOpenFolder">${escapeHtml(tt("widget.openFolder"))}</button>` : ""}
    `;
    document.getElementById("overlayPickFolder")?.addEventListener("click", () => {
      ipcRenderer.invoke("pick-destination-folder", { fromWidget: true }).then((picked) => {
        if (state) render({ ...state, destinationFolder: picked || state.destinationFolder });
        renderOverlay("folder");
      }).catch(() => {});
    });
    document.getElementById("overlayOpenFolder")?.addEventListener("click", () => {
      ipcRenderer.invoke("open-folder", "destination").catch(() => {});
    });
    return;
  }

  if (panel === "outdated") {
    overlayTitle.textContent = tt("widget.overlayOutdated");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.outdatedCount", { count: stats.outdatedCount }))}</strong>
        <span>${escapeHtml(state.outdatedMods?.scannedAt ? tt("widget.scannedAt", { date: fmtDate(state.outdatedMods.scannedAt) }) : tt("widget.notScannedYet"))}</span>
      </div>
      ${renderList(stats.outdatedItems, tt("widget.noOutdated"), (item) => `
        <div class="overlay-list-item">
          <b>${escapeHtml(item.fileName || tt("widget.unknownFile"))}</b>
          <small>${escapeHtml(item.reason || item.path || "")}</small>
        </div>`)}
      <button type="button" class="overlay-action" id="overlayScanOutdated">${escapeHtml(tt("widget.rescanOutdated"))}</button>
    `;
    document.getElementById("overlayScanOutdated")?.addEventListener("click", () => {
      ipcRenderer.invoke("scan-outdated-mods")
        .then(() => ipcRenderer.invoke("get-state"))
        .then((next) => {
          render(next);
          renderOverlay("outdated");
        })
        .catch(() => {});
    });
    return;
  }

  if (panel === "downloaded") {
    overlayTitle.textContent = tt("widget.overlayDownloaded");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.downloadedCount", { count: stats.downloadedCount }))}</strong>
        <span>${escapeHtml(tt("widget.downloadedHint"))}</span>
      </div>
      ${renderList(stats.downloadedItems, tt("widget.noDownloaded"), (item) => `
        <div class="overlay-list-item">
          <b>${escapeHtml(item.fileName || tt("widget.unknownFile"))}</b>
          <small>${escapeHtml(fmtDate(item.at))}${item.savedTo ? ` · ${escapeHtml(item.savedTo)}` : ""}</small>
        </div>`)}
    `;
    return;
  }

  if (panel === "quarantine") {
    overlayTitle.textContent = tt("widget.overlayQuarantine");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.quarantineCount", { count: stats.quarantineCount }))}</strong>
        <span>${escapeHtml(tt("widget.quarantineHint"))}</span>
      </div>
      ${renderList(stats.quarantineItems, tt("widget.noQuarantine"), (item) => `
        <div class="overlay-list-item">
          <b>${escapeHtml(item.fileName || tt("widget.unknownFile"))}</b>
          <small>${escapeHtml(item.message || item.status || "")}${item.at ? ` · ${escapeHtml(fmtDate(item.at))}` : ""}</small>
        </div>`)}
    `;
    return;
  }

  if (panel === "logs") {
    overlayTitle.textContent = tt("widget.overlayLogs");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.logsCount", { count: stats.logsCount }))}</strong>
        <span>${escapeHtml(tt("widget.logsHint"))}</span>
      </div>
      ${renderList(stats.logItems, tt("widget.noLogs"), (item) => `
        <div class="overlay-list-item">
          <b>${escapeHtml(item.fileName || tt("widget.unknownFile"))}</b>
          <small>${escapeHtml(statusLabel(item.status))}${item.at ? ` · ${escapeHtml(fmtDate(item.at))}` : ""}${item.message ? ` · ${escapeHtml(item.message)}` : ""}</small>
        </div>`)}
    `;
    return;
  }

  if (panel === "duplicates") {
    overlayTitle.textContent = tt("widget.overlayDuplicates");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.duplicatesCount", { count: stats.duplicatesCount }))}</strong>
        <span>${escapeHtml(tt("widget.duplicatesHint", { extra: stats.duplicateExtraCount }))}</span>
      </div>
      ${renderList(stats.duplicateItems, tt("widget.noDuplicates"), (item) => `
        <div class="overlay-list-item">
          <b>${escapeHtml(item.fileName || tt("widget.unknownFile"))}</b>
          <small>${escapeHtml(tt("widget.duplicateCopies", { count: item.count || 0 }))}</small>
        </div>`)}
      <button type="button" class="overlay-action" id="overlayScanDuplicates">${escapeHtml(tt("widget.rescanDuplicates"))}</button>
    `;
    document.getElementById("overlayScanDuplicates")?.addEventListener("click", () => {
      ipcRenderer.invoke("scan-outdated-mods")
        .then(() => ipcRenderer.invoke("get-state"))
        .then((next) => {
          render(next);
          renderOverlay("duplicates");
        })
        .catch(() => {});
    });
    return;
  }

  if (panel === "settings") {
    overlayTitle.textContent = tt("widget.overlaySettings");
    overlayBody.innerHTML = `
      <label class="overlay-toggle-row">
        <div><strong>${escapeHtml(tt("widget.antivirus"))}</strong><span>${escapeHtml(tt("widget.antivirusHint"))}</span></div>
        <input type="checkbox" class="overlay-switch" id="overlaySettingsProtection" ${enabled ? "checked" : ""} />
      </label>
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.modsFolder"))}</strong>
        <span>${escapeHtml(folder || tt("widget.noFolderYet"))}</span>
        <button type="button" class="overlay-action" id="overlaySettingsFolder">${escapeHtml(tt("widget.modsFolderChange"))}</button>
      </div>
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.language"))}</strong>
        <select class="overlay-select" id="overlayLocaleSelect">
          <option value="da">Dansk</option>
          <option value="sv">Svenska</option>
          <option value="no">Norsk</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </div>
    `;
    const locale = getStoredLocale() || state.locale || "da";
    const localeSelect = document.getElementById("overlayLocaleSelect");
    if (localeSelect) localeSelect.value = locale;
    document.getElementById("overlaySettingsProtection")?.addEventListener("change", async (event) => {
      await ipcRenderer.invoke("set-protection", !!event.target.checked).catch(() => {});
      ipcRenderer.invoke("get-state").then(render).catch(() => {});
    });
    document.getElementById("overlaySettingsFolder")?.addEventListener("click", () => {
      ipcRenderer.invoke("pick-destination-folder", { fromWidget: true }).then((picked) => {
        if (state) render({ ...state, destinationFolder: picked || state.destinationFolder });
        renderOverlay("settings");
      }).catch(() => {});
    });
    localeSelect?.addEventListener("change", () => {
      const next = String(localeSelect.value || "da");
      try {
        localStorage.setItem("skimo_locale", next);
      } catch {}
      setLocale(next);
      ipcRenderer.invoke("set-locale-preference", next).catch(() => {});
      if (state) render({ ...state, locale: next });
      renderOverlay("settings");
    });
    return;
  }

  if (panel === "help") {
    overlayTitle.textContent = tt("widget.overlayHelp");
    overlayBody.innerHTML = `
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.helpTitle"))}</strong>
        <span>${escapeHtml(tt("widget.helpBody"))}</span>
      </div>
      <div class="overlay-stat">
        <strong>${escapeHtml(tt("widget.helpTipsTitle"))}</strong>
        <span>${escapeHtml(tt("widget.helpTipsBody"))}</span>
      </div>
    `;
  }
}

function render(nextState) {
  state = nextState;
  const storedLocale = getStoredLocale();
  const activated = !!state?.activated;
  const enabled = !!state?.protectionEnabled;
  const scanning = !!state?.scanning;
  const last = state?.lastEvent;
  const locale = storedLocale || state?.locale || localeFromCountry(state?.activation?.country) || "da";
  setLocale(locale);
  const stats = getStats();
  const lastName = last?.fileName ? String(last.fileName) : "";
  const shortName = lastName.length > 22 ? `${lastName.slice(0, 19)}…` : lastName;

  if (!activated) {
    statusLine.textContent = tt("widget.enterCode");
  } else if (last?.status === "downloading") {
    statusLine.textContent = shortName ? tt("widget.downloading", { file: shortName }) : tt("widget.downloadingGeneric");
  } else if (scanning) {
    statusLine.textContent = shortName ? tt("widget.scanning", { file: shortName }) : tt("widget.scanningGeneric");
  } else if (last?.status === "virus") {
    statusLine.textContent = tt("widget.virus");
  } else if (enabled) {
    statusLine.textContent = tt("widget.active");
  } else {
    statusLine.textContent = tt("widget.off");
  }

  if (panelKicker) panelKicker.textContent = tt("widget.panelKicker");
  if (panelProtection) {
    panelProtection.textContent = scanning
      ? tt("widget.protectionWorking")
      : enabled
        ? tt("widget.protectionOn")
        : tt("widget.protectionOff");
  }
  if (panelLastFile) {
    panelLastFile.textContent = lastName
      ? tt("widget.lastFile", { file: lastName })
      : tt("widget.lastFileReady");
  }

  if (panelFolderLabel) panelFolderLabel.textContent = tt("widget.modsFolder");
  if (panelFolder) {
    panelFolder.textContent = state?.destinationFolder ? tt("widget.modsFolderActive") : tt("widget.modsFolderPick");
  }
  if (panelFolderBtn) {
    panelFolderBtn.title = tt("widget.modsFolderChange");
  }

  if (panelOutdatedLabel) panelOutdatedLabel.textContent = tt("widget.outdated");
  if (panelOutdated) panelOutdated.textContent = String(stats.outdatedCount);

  if (panelDownloadedLabel) panelDownloadedLabel.textContent = tt("widget.downloaded");
  if (panelDownloaded) panelDownloaded.textContent = String(stats.downloadedCount);

  if (panelQuarantineLabel) panelQuarantineLabel.textContent = tt("widget.quarantine");
  if (panelQuarantine) panelQuarantine.textContent = String(stats.quarantineCount);

  if (panelLogsLabel) panelLogsLabel.textContent = tt("widget.logs");
  if (panelLogs) panelLogs.textContent = String(stats.logsCount);

  if (panelDuplicatesLabel) panelDuplicatesLabel.textContent = tt("widget.duplicates");
  if (panelDuplicates) panelDuplicates.textContent = String(stats.duplicatesCount);

  if (helpChar) {
    const lastStatus = last?.status ? String(last.status) : "";
    const isBusy = scanning || lastStatus === "downloading" || lastStatus === "scanning";
    helpChar.classList.toggle("is-busy", isBusy);
  }

  if (activePanel) renderOverlay(activePanel);
}

panelScannerBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("scanner");
});

panelFolderBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("folder");
});

panelOutdatedBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("outdated");
});

panelDownloadedBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("downloaded");
});

panelQuarantineBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("quarantine");
});

panelLogsBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("logs");
});

panelDuplicatesBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("duplicates");
});

settingsFab?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("settings");
});

helpChar?.addEventListener("click", (event) => {
  event.stopPropagation();
  openOverlay("help");
});

overlayBack?.addEventListener("click", (event) => {
  event.stopPropagation();
  closeOverlay();
});

ipcRenderer.on("state-update", (_evt, nextState) => {
  render(nextState);
});

render({ locale: getStoredLocale(), protectionEnabled: false, scanning: false, widgetStats: { downloadedCount: 0, quarantineCount: 0, outdatedCount: 0, logsCount: 0, duplicatesCount: 0, duplicateExtraCount: 0 } });

ipcRenderer.invoke("get-state").then(render).catch(() => {
  render({ locale: getStoredLocale(), protectionEnabled: false, scanning: false, widgetStats: { downloadedCount: 0, quarantineCount: 0, outdatedCount: 0, logsCount: 0, duplicatesCount: 0, duplicateExtraCount: 0 } });
});
