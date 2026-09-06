const { ipcRenderer } = require("electron");
const { localeFromCountry, t } = require("./i18n");

const logo = document.getElementById("logo");
const logoWrap = document.getElementById("logoWrap");
const statusLine = document.getElementById("statusLine");
const openBtn = document.getElementById("openBtn");

let state = null;
let currentLocale = "da";

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

function render(nextState) {
  state = nextState;
  const storedLocale = getStoredLocale();
  const activated = !!state?.activated;
  const enabled = !!state?.protectionEnabled;
  const scanning = !!state?.scanning;
  const last = state?.lastEvent;
  setLocale(storedLocale || state?.locale || localeFromCountry(state?.activation?.country) || "da");
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
  logo.classList.remove("blink", "scan");
  if (scanning) logo.classList.add("scan");
  else if (enabled) logo.classList.add("blink");

  // Dashboard shine: only when ModGuard is active (or actively scanning).
  if (logoWrap) {
    const lastStatus = last?.status ? String(last.status) : "";
    // Shine when ModGuard is turned on, scanning, or actively processing downloads.
    // When ModGuard is switched off (enabled/scanning false), shine should stop.
    const shouldShine = !!(!activated || enabled || scanning || lastStatus === "downloading" || lastStatus === "virus");
    logoWrap.classList.toggle("is-active", shouldShine);
  }

  if (openBtn) {
    openBtn.textContent = tt("widget.open");
    openBtn.title = tt("widget.open");
  }
}

openBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  ipcRenderer.send("show-main-window");
});

ipcRenderer.on("state-update", (_evt, nextState) => {
  render(nextState);
});

render({ locale: getStoredLocale(), protectionEnabled: false, scanning: false });

ipcRenderer.invoke("get-state").then(render).catch(() => {
  render({ locale: getStoredLocale(), protectionEnabled: false, scanning: false });
});
