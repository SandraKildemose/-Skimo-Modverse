const { ipcRenderer, shell } = require("electron");
const { localeFromCountry, t } = require("./i18n");

/** Homepage CTA — replace when final URL is provided */
const MG_WEBSITE_URL = "https://modguard.dk";

const els = {
  appWrap: document.getElementById("appWrap"),
  mainCard: document.getElementById("mainCard"),
  activationView: document.getElementById("activationView"),
  dashboardView: document.getElementById("dashboardView"),

  country: document.getElementById("country"),
  email: document.getElementById("email"),
  code: document.getElementById("code"),
  activateBtn: document.getElementById("activateBtn"),
  loginModeBtn: document.getElementById("loginModeBtn"),
  registerModeBtn: document.getElementById("registerModeBtn"),
  guestBtn: document.getElementById("guestBtn"),
  activationIntro: document.getElementById("activationIntro"),
  rememberMe: document.getElementById("rememberMe"),
  minimizeBtnA: document.getElementById("minimizeBtnA"),
  minimizeBtnTop: document.getElementById("minimizeBtnTop"),
  activationMessage: document.getElementById("activationMessage"),
  renewalPanel: document.getElementById("renewalPanel"),
  renewalTitle: document.getElementById("renewalTitle"),
  renewalBody: document.getElementById("renewalBody"),
  renewalMeta: document.getElementById("renewalMeta"),
  renewalUses: document.getElementById("renewalUses"),
  renewalExpiry: document.getElementById("renewalExpiry"),
  renewalStatus: document.getElementById("renewalStatus"),
  renewalQr: document.getElementById("renewalQr"),
  openRenewalBtn: document.getElementById("openRenewalBtn"),
  renewalEmailInput: document.getElementById("renewalEmailInput"),
  renewalCodeInput: document.getElementById("renewalCodeInput"),
  applyRenewalCodeBtn: document.getElementById("applyRenewalCodeBtn"),
  requestRenewalCodeBtn: document.getElementById("requestRenewalCodeBtn"),
  requestCodeBtn: document.getElementById("requestCodeBtn"),

  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  toggleBtn: document.getElementById("toggleBtn"),
  minimizeBtn: document.getElementById("minimizeBtn"),

  downloadsPath: document.getElementById("downloadsPath"),
  openDownloadsBtn: document.getElementById("openDownloadsBtn"),

  destinationPath: document.getElementById("destinationPath"),
  pickDestinationBtn: document.getElementById("pickDestinationBtn"),
  openDestinationBtn: document.getElementById("openDestinationBtn"),

  scanNowBtn: document.getElementById("scanNowBtn"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),

  message: document.getElementById("message"),
  statCleanCount: document.getElementById("statCleanCount"),
  statVirusCount: document.getElementById("statVirusCount"),
  statOutdatedCount: document.getElementById("statOutdatedCount"),
  statSitesCount: document.getElementById("statSitesCount"),
  cleanModsList: document.getElementById("cleanModsList"),
  cleanModsCount: document.getElementById("cleanModsCount"),
  blockedModsList: document.getElementById("blockedModsList"),
  blockedModsCount: document.getElementById("blockedModsCount"),
  outdatedModsList: document.getElementById("outdatedModsList"),
  outdatedModsCount: document.getElementById("outdatedModsCount"),
  websiteList: document.getElementById("websiteList"),
  websitesCount: document.getElementById("websitesCount"),
  historyList: document.getElementById("historyList"),
  historyCount: document.getElementById("historyCount"),
  historyCountInner: document.getElementById("historyCountInner"),
  aiIndexStatus: document.getElementById("aiIndexStatus"),
  aiIndexPhase: document.getElementById("aiIndexPhase"),
  aiIndexProgress: document.getElementById("aiIndexProgress"),
  aiIndexMeta: document.getElementById("aiIndexMeta"),
  aiIndexStartBtn: document.getElementById("aiIndexStartBtn"),
  log: document.getElementById("log"),
};

let authMode = "login";

let state = null;
let currentLocale = "da";
let forcedLocale = null;
let wasActivatedSession = false;

const FLAG_TO_COUNTRY = {
  da: "denmark",
  sv: "sweden",
  no: "norway",
  en: "usa",
  fr: "france",
};

const COUNTRY_TO_FLAG = {
  denmark: "da",
  sweden: "sv",
  norway: "no",
  usa: "en",
  uk: "en",
  france: "fr",
};

const langFlagButtons = Array.from(document.querySelectorAll(".lang-flag"));
const scrollLinks = Array.from(document.querySelectorAll("[data-scroll-target]"));
const dashboardTabButtons = Array.from(document.querySelectorAll("[data-dashboard-tab]"));
const dashboardNavItems = Array.from(document.querySelectorAll(".mg-nav-item[data-dashboard-tab], .dashboard-nav-item[data-dashboard-tab]"));
const settingsLocaleSelect = document.getElementById("settingsLocaleSelect");
const settingsToggleProtection = document.getElementById("settingsToggleProtection");
const settingsNotificationsToggle = document.getElementById("settingsNotificationsToggle");
const settingsAdultToggle = document.getElementById("settingsAdultToggle");
const settingsOpenDownloadsBtn = document.getElementById("settingsOpenDownloadsBtn");
const settingsPickDestBtn = document.getElementById("settingsPickDestBtn");
const settingsClearHistoryBtn = document.getElementById("settingsClearHistoryBtn");
const settingsPathsMeta = document.getElementById("settingsPathsMeta");
const forumFeed = document.getElementById("forumFeed");
const forumPublishBtn = document.getElementById("forumPublishBtn");
const forumPostType = document.getElementById("forumPostType");
const forumModName = document.getElementById("forumModName");
const forumCreatorTag = document.getElementById("forumCreatorTag");
const forumPostTitle = document.getElementById("forumPostTitle");
const forumPostBody = document.getElementById("forumPostBody");
const forumTabButtons = Array.from(document.querySelectorAll("[data-forum-tab]"));
const forumSortSelect = document.getElementById("forumSortSelect");
const forumSourceSelect = document.getElementById("forumSourceSelect");
const forumTimeSelect = document.getElementById("forumTimeSelect");
const forumPlatformFilterButtons = Array.from(document.querySelectorAll("[data-forum-platform]"));
const FORUM_STORAGE_KEY = "modguard_sims_forum_posts_v2";
const FORUM_SEED_VERSION_KEY = "modguard_forum_seed_v2";
let forumTab = "all";
let forumPlatformFilter = "all";
let forumOriginFilter = "all";
let redditForumPosts = [];
let forumRedditLoading = false;

const FORUM_SOURCE_LABELS = {
  modguard: "ModGuard",
  reddit: "Reddit",
  twitter: "X / Twitter",
  discord: "Discord",
  curseforge: "CurseForge",
  modrinth: "Modrinth",
  tumblr: "Tumblr",
  modthesims: "ModTheSims",
  patreon: "Patreon",
  tsr: "The Sims Resource",
  sims4updates: "Sims4Updates",
  simsfinds: "SimsFinds",
  other: "Andet",
};

const FORUM_CATEGORY_META = {
  warn: { label: "Advarsel", badgeClass: "warn" },
  virus: { label: "Virus fundet", badgeClass: "virus" },
  broken: { label: "Broken mod", badgeClass: "broken" },
  safe: { label: "God / sikker side", badgeClass: "safe" },
  tips: { label: "Tips & Hjælp", badgeClass: "tips" },
  chat: { label: "Generel snak", badgeClass: "chat" },
  good: { label: "Anbefaling", badgeClass: "safe" },
};

const FORUM_COMMUNITY_SEED = [
  {
    id: "comm-0",
    category: "virus",
    source: "modguard",
    origin: "modguard",
    author: "ModGuard Team",
    title: "VIGTIGT: Ny virus-variant i Sims 4 hair downloads",
    body: "Vi har bekræftet en ny variant der gemmer sig i hair- og CC-pakker. Scan altid med ModGuard før install. Læs guiden i appen.",
    url: "",
    pinned: true,
    status: "official",
    upvotes: 892,
    comments: 214,
    hoursAgo: 1,
  },
  {
    id: "comm-1",
    category: "warn",
    source: "reddit",
    subreddit: "r/Sims4",
    author: "MSI_QuicksaveAndModExport",
    title: "MSI_QuicksaveAndModExport — advarsel om reupload",
    body: "Flere rapporter på Discord og Reddit om skjulte .exe-filer i «hair pack»-mapper. Tjek altid original creator på Patreon eller Tumblr før download.",
    url: "https://www.reddit.com/r/Sims4/",
    pinned: true,
    status: "investigating",
    upvotes: 312,
    comments: 89,
    hoursAgo: 48,
  },
  {
    id: "comm-2",
    category: "virus",
    source: "modrinth",
    author: "Sandra",
    title: "Daddy Pez — mistænkelig .package fundet",
    body: "ModGuard flaggede filen efter download fra et Discord-link. Original findes på Modrinth — brug kun officiel side.",
    url: "https://modrinth.com/",
    status: "confirmed",
    upvotes: 156,
    comments: 42,
    hoursAgo: 5,
  },
  {
    id: "comm-3",
    category: "tips",
    source: "curseforge",
    author: "Moderator_MG",
    title: "UI Cheats Extension — patch 1.110",
    body: "Opdater til seneste build på CurseForge. Mange tråde på r/TheSims4Mods nævner broken hotkeys efter juni-patch.",
    url: "https://www.curseforge.com/sims4/mods/ui-cheats-extension",
    upvotes: 428,
    comments: 67,
    hoursAgo: 12,
  },
  {
    id: "comm-4",
    category: "broken",
    source: "tsr",
    author: "Camilla",
    title: "Broken mod: XYZ_HairPack_v2.package",
    body: "Manglende mesh efter patch 1.110 — flere spillere på Tumblr og TSR bekræfter. Vent på creator-update.",
    url: "https://www.thesimsresource.com/",
    upvotes: 94,
    comments: 31,
    hoursAgo: 72,
  },
  {
    id: "comm-5",
    category: "safe",
    source: "tumblr",
    author: "Andreas",
    title: "Godkendt side: VeroniqueS CC",
    body: "Lang historik uden virus-rapporter. Anbefalet på r/Sims4 og SimsFinds — scan stadig før install.",
    url: "https://www.tumblr.com/",
    status: "confirmed",
    upvotes: 201,
    comments: 18,
    hoursAgo: 96,
  },
  {
    id: "comm-6",
    category: "tips",
    source: "modthesims",
    author: "LunaMods",
    title: "MSR / MCCC merge efter 1.110",
    body: "ModTheSims-forum: slet localthumbcache og kør MC Command Center «Update» før du merger nye script mods.",
    url: "https://modthesims.info/",
    upvotes: 267,
    comments: 54,
    hoursAgo: 20,
  },
  {
    id: "comm-7",
    category: "chat",
    source: "discord",
    author: "SimmerDK",
    title: "Bedste steder til alpha hair lige nu?",
    body: "Discord CC-hub anbefaler Patreon + Tumblr creators — undgå random MediaFire-links uden scan.",
    url: "https://discord.com/",
    upvotes: 88,
    comments: 112,
    hoursAgo: 8,
  },
  {
    id: "comm-8",
    category: "warn",
    source: "patreon",
    author: "ModGuard",
    title: "Patreon «early access» zip med ekstra filer",
    body: "Advarsel fra community: nogle tidlige tiers pakker .ts4script sammen med ukendte .dll — kun download fra creatorens officielle post.",
    url: "https://www.patreon.com/",
    upvotes: 173,
    comments: 45,
    hoursAgo: 36,
  },
  {
    id: "comm-9",
    category: "broken",
    source: "sims4updates",
    author: "PatchWatcher",
    title: "Basemental / WickedWhims konflikt",
    body: "Sims4Updates kommentarer: læs patch-noter — mange gameplay mods kræver samme version efter 1.110.",
    url: "https://sims4updates.net/",
    upvotes: 340,
    comments: 91,
    hoursAgo: 14,
  },
  {
    id: "comm-10",
    category: "virus",
    source: "reddit",
    subreddit: "r/TheSims4Mods",
    author: "VirusHunter",
    title: "Fake CurseForge mirror-site",
    body: "Indlæg på r/TheSims4Mods: domæne ligner CurseForge men installerer adware. Brug kun curseforge.com-links.",
    url: "https://www.reddit.com/r/TheSims4Mods/",
    status: "confirmed",
    upvotes: 512,
    comments: 128,
    hoursAgo: 6,
  },
];

const FORUM_TRENDING_SEED = [
  { topic: "UI Cheats Extension problemer", delta: "+13%", up: true, posts: 31 },
  { topic: "Alpha feet clipping — high heels", delta: "-15%", up: false, posts: 24 },
  { topic: "Reshade presets til Mac (3.1k opdateret)", delta: "+5%", up: true, posts: 19 },
  { topic: "MSR folder merge fejl 1.110", delta: "-78%", up: false, posts: 42 },
];

const FORUM_REDDIT_SEED = [
  {
    subreddit: "r/TheSims4Mods",
    title: "WickedWhims vs Basemental efter 1.110 — hvad kører I?",
    upvotes: 412,
    comments: 97,
    url: "https://www.reddit.com/r/TheSims4Mods/",
  },
  {
    subreddit: "r/Sims4",
    title: "High heels + alpha feet clipping — bedste CC-sko lige nu?",
    upvotes: 286,
    comments: 64,
    url: "https://www.reddit.com/r/Sims4/",
  },
];
let notificationsEnabled = true;
const simsDetailPanel = document.getElementById("simsDetailPanel");
const simsBottomPreview = document.getElementById("simsBottomPreview");
const simsBottomScan = document.getElementById("simsBottomScan");
const simsBottomThreats = document.getElementById("simsBottomThreats");
const simsThreatTable = document.getElementById("simsThreatTable");
const simsSourceFilter = document.getElementById("simsSourceFilter");
const simsCategoryFilter = document.getElementById("simsCategoryFilter");
const simsTypeFilter = document.getElementById("simsTypeFilter");
const simsLangFilter = document.getElementById("simsLangFilter");
const footerSandboxCount = document.getElementById("footerSandboxCount");
const footerScanningCount = document.getElementById("footerScanningCount");
const footerReadyCount = document.getElementById("footerReadyCount");
const minimizeBtnSearch = document.getElementById("minimizeBtnSearch");
const simsDockScans = document.getElementById("simsDockScans");
const navOutdatedBadge = document.getElementById("navOutdatedBadge");
const simsResetFiltersBtn = document.getElementById("simsResetFilters");
const simsSearchInput = document.getElementById("simsSearchInput");
const simsSearchHints = document.getElementById("simsSearchHints");
const simsSearchBtn = document.getElementById("simsSearchBtn");
const SIMS_CC_HINT_KEYS = ["searchHintMaleClothes", "searchHintHair", "searchHintGameplay"];
const simsBrowserScreen = document.getElementById("simsBrowserScreen");
const simsBrowserAddress = document.getElementById("simsBrowserAddress");
const simsModeButtons = Array.from(document.querySelectorAll("[data-sims-mode]"));
const simsSearchTriggers = Array.from(document.querySelectorAll("[data-sims-query]"));
const simsSortSelect = document.getElementById("simsSortSelect");
const simsPriceFilter = document.getElementById("simsPriceFilter");
const simsTimeFilter = document.getElementById("simsTimeFilter");
const simsRatingFilter = document.getElementById("simsRatingFilter");
const moddbStatusText = document.getElementById("moddbStatusText");
const moddbProgressFill = document.getElementById("moddbProgressFill");
const moddbIndexBtn = document.getElementById("moddbIndexBtn");
const simsSourceFilters = Array.from(document.querySelectorAll("[data-source-filter]"));
const adultContentToggle = document.getElementById("adultContentToggle");
const adultConfirmModal = document.getElementById("adultConfirmModal");
const adultConfirmCheck = document.getElementById("adultConfirmCheck");
const adultCancelBtn = document.getElementById("adultCancelBtn");
const adultAcceptBtn = document.getElementById("adultAcceptBtn");
let simsSearchMode = "cc";
let lastSimsQuery = "";
let activeSimsSources = new Set(["all"]);
let simsCurrentPage = 1;
let simsVisibleResults = [];
const hubChildrenCache = new Map();
let simsHasSearched = false;
let simsSelectedModId = "";
let simsGridListView = "grid";
let adultContentEnabled = false;
let adultContentConfirmed = false;

const CORE_PRODUCT_PRINCIPLES = Object.freeze({
  imageAccuracyFirst: true,
  minPreviewConfidence: 0.82,
  missingPreviewBeatsWrongPreview: true,
  effortlessSafeDownload: true,
});

const SIMS_SEARCH_PLATFORMS = [
  {
    key: "curseforge",
    name: "CurseForge",
    trust: "Kurateret modhub",
    note: "God til gameplay mods, script mods og større creators.",
    badge: "Sims platform",
    theme: ["#8dd8f0", "#4d8aa2", "Gameplay"],
    url: (q) => `https://www.curseforge.com/sims4/search?search=${encodeURIComponent(q)}`,
  },
  {
    key: "the-sims-resource",
    name: "The Sims Resource",
    trust: "Stor CC platform",
    note: "God til hår, tøj, møbler, build/buy og klassisk custom content.",
    badge: "CC katalog",
    theme: ["#f5c8df", "#76b8d6", "CC"],
    url: (q) => `https://www.thesimsresource.com/search#/?g=4&q=${encodeURIComponent(q)}`,
  },
  {
    key: "mod-the-sims",
    name: "Mod The Sims",
    trust: "Kendt community",
    note: "God til ældre community mods. Scan altid downloads før install.",
    badge: "Ekstra scan",
    theme: ["#bfe7cb", "#5e94b1", "Mods"],
    url: (q) => `https://modthesims.info/downloads/ts4/?showType=1&tag=${encodeURIComponent(q)}`,
  },
  {
    key: "patreon",
    name: "Patreon",
    trust: "Vigtig CC-kilde",
    note: "Meget Sims 4 CC og mods fra creators — ModGuard søger Patreon dedikeret med billeder.",
    badge: "Creator source",
    theme: ["#ffd2a6", "#7aaed0", "Creator"],
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:patreon.com sims 4 ${q}`)}`,
  },
  {
    key: "simsfinds",
    name: "SimsFinds",
    trust: "CC discovery",
    note: "God til inspiration og CC-fund. Download stadig gennem ModGuard-flowet.",
    badge: "Discovery",
    theme: ["#d5c8ff", "#79b7d7", "Finds"],
    url: (q) => `https://www.simsfinds.com/search?search=${encodeURIComponent(q)}`,
  },
  {
    key: "tumblr",
    name: "Maxis Match CC World",
    trust: "CC kuratering",
    note: "God til Maxis Match inspiration og creator-links.",
    badge: "CC feed",
    theme: ["#bdebdc", "#6ea8cc", "Maxis"],
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:maxismatchccworld.tumblr.com sims 4 ${q}`)}`,
  },
  {
    key: "nexus-mods",
    name: "Nexus Mods",
    trust: "Værktøjsside",
    note: "Mest relevant til utilities og tekniske mods. Alt scannes før install.",
    badge: "Utilities",
    theme: ["#d7e6ef", "#395466", "Tools"],
    url: (q) => `https://www.nexusmods.com/thesims4/search/?BH=0&RH_ModList=nav:true,home:false,type:0,user_id:0,game_id:3644,advfilt:true,search%5Bfilename%5D:${encodeURIComponent(q)},include_adult:false,show_game_filter:false,page_size:20`,
  },
  {
    key: "sims4updates",
    name: "Sims4Updates",
    trust: "CC opdateringer",
    note: "Find opdaterede CC-pakker og mods.",
    badge: "Updates",
    theme: ["#ffd9a6", "#7a5a32", "CC"],
    url: (q) => `https://sims4updates.net/?s=${encodeURIComponent(q)}`,
  },
  {
    key: "modrinth",
    name: "Modrinth",
    trust: "Mod-hub (Minecraft)",
    note: "Søges med — Modrinth har pt. ingen officielle Sims 4-mods i API.",
    badge: "Hub",
    theme: ["#9ae6b0", "#2f855a", "Hub"],
    url: (q) => `https://modrinth.com/mods?q=${encodeURIComponent(`sims 4 ${q}`)}`,
  },
  {
    key: "github",
    name: "GitHub",
    trust: "Script mods",
    note: "MCCC, Wicked Whims mirrors og open-source gameplay mods.",
    badge: "Code",
    theme: ["#c9d1d9", "#24292f", "Git"],
    url: (q) => `https://github.com/search?q=${encodeURIComponent(`sims 4 ${q} mod`)}&type=repositories`,
  },
  {
    key: "ko-fi",
    name: "Ko-fi",
    trust: "Creator støtte",
    note: "Gratis og betalte CC fra creators på Ko-fi.",
    badge: "Creator",
    theme: ["#ffecb3", "#c49000", "Ko-fi"],
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:ko-fi.com sims 4 ${q}`)}`,
  },
  {
    key: "simsdom",
    name: "SimsDOM",
    trust: "CC katalog",
    note: "Ekstra CC-discovery side for Sims 4.",
    badge: "CC",
    theme: ["#ffd6e7", "#9d5b8f", "DOM"],
    url: (q) => `https://www.simsdom.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    key: "plumbob",
    name: "Plumbob.app",
    trust: "Mod browser",
    note: "Sims 4 mod- og CC-browser.",
    badge: "Browse",
    theme: ["#b8f2c8", "#2d6a4f", "App"],
    url: (q) => `https://plumbob.app/search?q=${encodeURIComponent(`sims 4 ${q}`)}`,
  },
  {
    key: "simfileshare",
    name: "SimFileShare",
    trust: "Fil-deling",
    note: "Creator file-share links til Sims 4 CC.",
    badge: "Files",
    theme: ["#dbeafe", "#3b82f6", "Share"],
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(`site:simfileshare.net sims 4 ${q}`)}`,
  },
];

const MODSEARCH_ALLOWED_HOSTS = new Set([
  "www.thesimsresource.com",
  "thesimsresource.com",
  "www.curseforge.com",
  "curseforge.com",
  "modthesims.info",
  "www.patreon.com",
  "patreon.com",
  "www.tumblr.com",
  "tumblr.com",
  "www.simsfinds.com",
  "simsfinds.com",
  "www.nexusmods.com",
  "nexusmods.com",
  "maxismatchccworld.tumblr.com",
  "sims4updates.net",
  "www.sims4updates.net",
  "modrinth.com",
  "www.modrinth.com",
  "github.com",
  "www.github.com",
  "raw.githubusercontent.com",
  "ko-fi.com",
  "www.ko-fi.com",
  "simsdom.com",
  "www.simsdom.com",
  "plumbob.app",
  "www.plumbob.app",
  "simfileshare.net",
  "www.simfileshare.net",
]);

function isAllowedModSearchUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || ""));
    return parsed.protocol === "https:" && MODSEARCH_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Format: [type, title, platform, note, tags, platformKey, thumbUrl, adult?]
// thumbUrl = "" → will use colorful SVG placeholder; "https://..." → real image
const SIMS_SEED_ITEMS = [
  // ─── HAIR CC ──────────────────────────────────────────────────────────────
  ["cc","Maxis Match Blonde Hair Pack","The Sims Resource","Hair CC med blonde, brown og black swatches.","hair blonde long female girl maxis match cas cc hair-cc","the-sims-resource","",""],
  ["cc","Long Blonde Hair Collection","Patreon creators","Creator hair packs med lange frisurer og flere farver.","long blonde hair female girl hair cc alpha maxis match hair-cc","patreon","",""],
  ["cc","Curly Afro Hair Pack","The Sims Resource","Curly og afro hair styles til alle ages.","curly afro hair female male black cc hair-cc","the-sims-resource","",""],
  ["cc","Short Bob Hair Collection","Mod The Sims","Bob cuts og short hair styles til female Sims.","bob short hair female cc hair-cc","mod-the-sims","",""],
  ["cc","Braided Hairstyles Pack","Patreon creators","Braids, twists og protective styles til alle Sims.","braids twists hair black female cc hair-cc","patreon","",""],
  ["cc","Male Fade & Undercut Pack","The Sims Resource","Fade, undercut og buzz cut styles til male Sims.","male hair fade undercut buzz cut men cc hair-cc","the-sims-resource","",""],
  ["cc","Realistic Alpha Hair Vol 1","Patreon creators","Alpha hair til mere realistiske Sims styles.","alpha hair realistic long blonde brown cc hair-cc","patreon","",""],
  ["cc","Toddler & Kids Hairstyles","SimsFinds","Søde frisurer til infant, toddler og kids.","infant toddler kids hair cc hair-cc kids-cc","simsfinds","",""],
  ["cc","Waves & Curls Collection","The Sims Resource","Bølget og kruset hår i mange farver.","waves curls hair female cc hair-cc maxis match","the-sims-resource","",""],
  ["cc","Messy Bun & Updo Pack","Tumblr","Updo og messy bun styles til hverdagen.","updo messy bun hair female cc hair-cc maxis match","tumblr","",""],

  // ─── CLOTHES & CAS ────────────────────────────────────────────────────────
  ["cc","Everyday Girl Clothes Set","SimsFinds","CAS tøj til teen/adult: tops, jeans, skirts og dresses.","girl clothes clothing outfit dress jeans top female cas cc clothes-cc","simsfinds","",""],
  ["cc","Maxis Match Clothes Bundle","Tumblr","Kuraterede outfits og creator-links til Maxis Match spillere.","clothes clothing maxis match girl outfit cas cc clothes-cc","tumblr","",""],
  ["cc","Dress Collection Vol 1","The Sims Resource","Formelle og casual dresses til female sims.","dress formal casual female clothes cc clothes-cc","the-sims-resource","",""],
  ["cc","Jeans & Tops Pack","Patreon creators","Casual jeans, shirts og tops i mange farver.","jeans shirt top casual clothes cc clothes-cc","patreon","",""],
  ["cc","Sneakers & Shoes Bundle","The Sims Resource","Sneakers, heels, boots og sandals.","shoes sneakers heels boots sandals cas accessories cc clothes-cc","the-sims-resource","",""],
  ["cc","Winter Outfits Pack","SimsFinds","Coats, sweaters og winter clothes.","winter coat sweater jacket clothes cc clothes-cc","simsfinds","",""],
  ["cc","Summer Swimwear & Beach CC","Tumblr","Bikinis, swimsuits og beach outfits.","swimwear bikini beach summer clothes cc clothes-cc","tumblr","",""],
  ["cc","Wedding Dress CC","Patreon creators","Dresses, veils og formal CAS items.","wedding dress formal gown girl clothes cc clothes-cc","patreon","",""],
  ["cc","Male Streetwear Pack","The Sims Resource","Streetwear, hoodies og sneakers til male sims.","male men streetwear hoodie clothes cc clothes-cc","the-sims-resource","",""],
  ["cc","Sportswear & Gym Clothes","SimsFinds","Activewear og gym outfits.","sport gym activewear workout clothes cc clothes-cc","simsfinds","",""],
  ["cc","Formal & Gala Outfits","The Sims Resource","Kjole og smoking til formel lejligheder.","formal gala evening dress suit tuxedo clothes cc clothes-cc","the-sims-resource","",""],

  // ─── MAKEUP & SKIN ────────────────────────────────────────────────────────
  ["cc","Skin Details & Overlay Finds","Tumblr","Skin overlays, freckles, blush og face details.","skin overlay details freckles blush makeup cc makeup-cc cas","tumblr","",""],
  ["cc","3D Lashes & Eye Presets","Patreon creators","Lashes, eye presets og makeup fra kendte creators.","lashes eyes presets makeup cas cc makeup-cc","patreon","",""],
  ["cc","Realistic Skin Overlay Pack","The Sims Resource","Realistiske skin overlays til voksne sims.","skin overlay realistic makeup cc makeup-cc","the-sims-resource","",""],
  ["cc","Eyeshadow & Blush Collection","Patreon creators","Øjenskyge, rouge og makeup sæt.","eyeshadow blush makeup cas cc makeup-cc","patreon","",""],
  ["cc","Freckles & Beauty Marks","Mod The Sims","Fregner, beauty marks og facial details.","freckles beauty marks face details makeup cc makeup-cc","mod-the-sims","",""],
  ["cc","Full Makeup Looks Pack","SimsFinds","Komplette makeup looks fra talentfulde creators.","makeup look full face lipstick eyeshadow cc makeup-cc","simsfinds","",""],
  ["cc","Lips & Highlighter CC","The Sims Resource","Læbestift, gloss og highlighter CC.","lips lipstick gloss highlighter makeup cc makeup-cc cas","the-sims-resource","",""],

  // ─── BUILD & BUY ──────────────────────────────────────────────────────────
  ["cc","Kitchen Build Buy Set","The Sims Resource","Køkken, counters, clutter og moderne appliances.","kitchen build buy furniture clutter counters cc buildbuy","the-sims-resource","",""],
  ["cc","Modern Living Room Set","The Sims Resource","Sofa, tables, lamps og dekor til moderne hjem.","furniture living room sofa table build buy cc buildbuy","the-sims-resource","",""],
  ["cc","Bathroom Clutter Pack","The Sims Resource","Små realistiske bathroom items og dekor.","bathroom clutter build buy decor cc buildbuy","the-sims-resource","",""],
  ["cc","Bedroom Furniture Set","The Sims Resource","Beds, wardrobes, rugs og clutter til bedrooms.","bedroom furniture bed rug clutter build buy cc buildbuy","the-sims-resource","",""],
  ["cc","Kawaii Decor & Posters","SimsFinds","Cute posters, clutter og room decor.","kawaii cute decor posters clutter build buy cc buildbuy","simsfinds","",""],
  ["cc","Luxury Dining Room Set","Patreon creators","Borde, stole, service og fine dining items.","dining room table chair decor build buy cc buildbuy","patreon","",""],
  ["cc","Industrial & Loft Furniture","Mod The Sims","Industriel stil møbler og loft decor.","industrial loft furniture build buy cc buildbuy","mod-the-sims","",""],
  ["cc","Plants & Nature Decor","The Sims Resource","Planter, blomster og naturdekor.","plants flowers nature decor build buy cc buildbuy","the-sims-resource","",""],
  ["cc","Kids Room Furniture","SimsFinds","Børneværelse møbler, legetøj og dekor.","kids room furniture toddler infant bed toy decor cc buildbuy kids-cc","simsfinds","",""],
  ["cc","Cozy Cottage Build Pack","Tumblr","Rustikke og cozy cottagecore build items.","cottage cozy rustic furniture build buy cc buildbuy","tumblr","",""],
  ["cc","Mid-Century Modern Set","The Sims Resource","Retro møbler og mid-century modern stil.","mid century modern retro furniture build buy cc buildbuy","the-sims-resource","",""],

  // ─── POSES & ANIMATIONS ───────────────────────────────────────────────────
  ["cc","Family Pose Pack","Patreon creators","Familiebilleder og naturlige poses.","pose family portrait photo pack cc poses","patreon","",""],
  ["cc","Couple Poses Collection","The Sims Resource","Romantiske par-poses og date scener.","pose couple romance date photo cc poses","the-sims-resource","",""],
  ["cc","Solo Portrait Poses","Tumblr","Solo portræt poses til screenshots og stories.","pose solo portrait screenshot cc poses","tumblr","",""],
  ["cc","Kids & Toddler Pose Pack","SimsFinds","Søde poses til kids og toddlers.","pose kids toddler infant cute cc poses kids-cc","simsfinds","",""],
  ["cc","Storytelling Poses Vol 1","Patreon creators","Drama og storytelling poses til legacies.","pose story drama legacy cc poses","patreon","",""],

  // ─── ACCESSORIES ──────────────────────────────────────────────────────────
  ["cc","Jewelry & Necklaces Pack","Patreon creators","Halskæder, øreringe og ringe.","jewelry necklace earrings ring accessories cas cc accessories-cc","patreon","",""],
  ["cc","Hats & Headwear Bundle","The Sims Resource","Hatte, beanies og caps.","hat beanie cap headwear accessories cas cc accessories-cc","the-sims-resource","",""],
  ["cc","Bags & Purses Collection","SimsFinds","Tasker, punge og clutches.","bag purse clutch accessories cas cc accessories-cc","simsfinds","",""],
  ["cc","Glasses & Sunglasses Pack","The Sims Resource","Briller og solbriller i alle stilarter.","glasses sunglasses eyewear accessories cas cc accessories-cc","the-sims-resource","",""],

  // ─── INFANT & KIDS CC ─────────────────────────────────────────────────────
  ["cc","Infant & Toddler CC Finds","SimsFinds","Populære infant/toddler outfits, hår, skins og accessories.","infant toddler baby kids clothes hair skin cc kids-cc","simsfinds","",""],
  ["cc","Toddler Clothes Pack","The Sims Resource","Søde outfits til toddlers.","toddler clothes outfit cute cc kids-cc","the-sims-resource","",""],
  ["cc","Baby & Nursery Decor","Patreon creators","Ting til babyværelset og nursery CC.","baby nursery room decor furniture build buy cc kids-cc buildbuy","patreon","",""],

  // ─── GAMEPLAY MODS ────────────────────────────────────────────────────────
  ["mods","MC Command Center","CurseForge","Must-have gameplay control og household tools. Det absolut vigtigste mod til Sims 4.","mccc mc command center gameplay script mod must have control","curseforge","",""],
  ["mods","UI Cheats Extension","Patreon creators","Hurtigere cheats og quality-of-life direkte i UI.","ui cheats extension gameplay script mod qol utility","patreon","",""],
  ["mods","Wonderful Whims","CurseForge","Gameplay systemer, attraction, WooHoo og relationships.","wonderful whims gameplay relationships woohoo attraction script mod","curseforge","",""],
  ["mods","Realistic Pregnancy & Family","Mod The Sims","Gameplay mods til family, pregnancy og households.","pregnancy family gameplay realistic mod","mod-the-sims","",""],
  ["mods","Education Overhaul","CurseForge","Mere dybde i school, homework og teen gameplay.","education school homework teen gameplay mod","curseforge","",""],
  ["mods","Custom Traits Pack","Mod The Sims","Traits og aspirations til mere variation i personligheder.","traits aspirations personality gameplay mod","mod-the-sims","",""],
  ["mods","Career Mods Collection","CurseForge","Nye careers og work-from-home gameplay.","career job work gameplay mod","curseforge","",""],
  ["mods","Relationship & Social Tweaks","CurseForge","Social autonomy, romance og relationship tuning.","relationship social romance gameplay mod","curseforge","",""],
  ["mods","Realistic Needs & Money","Mod The Sims","Mere realistisk hunger, sleep og money system.","needs hunger sleep money realistic gameplay mod","mod-the-sims","",""],
  ["mods","Go to School Mod Pack","Mod The Sims","Aktiv skole-gameplay for børn og teens.","school kids teen education gameplay mod","mod-the-sims","",""],
  ["mods","Hobby & Activities Mod","CurseForge","Hobbyer, aktiviteter og free time gameplay.","hobby activities free time gameplay mod","curseforge","",""],
  ["mods","Life Decisions Mod","Mod The Sims","Valgmuligheder og konsekvenser i hverdagens gameplay.","life decisions choices consequences gameplay mod","mod-the-sims","",""],

  // ─── UTILITY / FIX MODS ───────────────────────────────────────────────────
  ["mods","Better BuildBuy","CurseForge","Build/Buy forbedringer, filters og debug items.","better build buy buildbuy utility mod","curseforge","",""],
  ["mods","More Columns in CAS","CurseForge","CAS grid med flere kolonner og bedre overblik.","more columns cas create a sim utility mod","curseforge","",""],
  ["mods","Simulation Lag Fix","Nexus Mods","Utility mod til performance og simulation lag.","simulation lag fix performance utility mod","nexus-mods","",""],
  ["mods","No Intro & Faster Loading","Nexus Mods","Små utility tweaks til hurtigere opstart.","no intro faster loading performance utility mod","nexus-mods","",""],
  ["mods","Small Laundry Fixes","Mod The Sims","Fixes og små tuning mods til laundry packs.","fix laundry tuning pack gameplay mod","mod-the-sims","",""],
  ["mods","Bug Fix Mod Finds","Mod The Sims","Community fixes til små Sims 4 problemer.","bug fix fixes tuning gameplay mod","mod-the-sims","",""],
  ["mods","CAS Lighting Mod","Tumblr","Lighting tweaks til Create A Sim.","cas lighting create a sim utility mod","tumblr","",""],
  ["mods","Better Exceptions","Mod The Sims","Fejlhåndtering og mod conflict detection.","better exceptions error fix utility debug mod","mod-the-sims","",""],
  ["mods","TOOL Mod for Builders","Patreon creators","Avanceret build mode værktøj til custom builds.","tool build mode builder utility mod","patreon","",""],

  // ─── ADULT MODS (adult: true) ─────────────────────────────────────────────
  ["mods","Wicked Whims","Patreon creators","Populær voksen gameplay mod med animations, WooHoo system og social features. Lavet af TURBODRIVER. Kræver adult content aktiveret.","wicked whims ww adult animation gameplay script mod wickedwhims turbodriver woohoo","patreon","","true"],
  ["mods","Wicked Whims Tuning Mods","Nexus Mods","Tuning og konfiguration mods til Wicked Whims systemet.","wicked whims ww adult tuning config settings gameplay mod wickedwhims","nexus-mods","","true"],
  ["mods","Basemental Mods","Patreon creators","Drugs, alcohol og street life gameplay mod. Lavet til voksne spillere.","basemental drugs alcohol gameplay script mod adult","patreon","","true"],
  ["mods","WW Romance & Attraction","Patreon creators","Udvidet romance og attraction system til Wicked Whims.","wicked whims ww romance attraction adult gameplay mod wickedwhims","patreon","","true"],
  ["mods","Extreme Violence Mod","Mod The Sims","Voksent gameplay mod med extreme violence scenarier.","extreme violence adult gameplay mod dark","mod-the-sims","","true"],

  // ─── WW CC (adult: true — WW Custom Content er IKKE det samme som WW mod!) ─
  ["cc","Wicked Whims CC Animation Pack","Patreon creators","Animation packs specielt designet til Wicked Whims moden. WW CC er separat fra selve WW mod!","wicked whims ww cc animations adult wwcc turbodriver","patreon","","true"],
  ["cc","WW Lingerie & Outfit CC","Patreon creators","CAS outfits og lingerie CC til Wicked Whims gameplay.","wicked whims ww cc outfit lingerie adult clothes wwcc","patreon","","true"],
  ["cc","WW Skin & Body Overlays CC","Patreon creators","Skin overlays og body details til Wicked Whims.","wicked whims ww cc skin overlay body adult makeup wwcc wickedwhims","patreon","","true"],
  ["cc","WW Accessories & Props CC","Patreon creators","Accessories og prop CC til Wicked Whims scener.","wicked whims ww cc accessories props adult wwcc","patreon","","true"],
  ["cc","WW Pose Packs","Tumblr","Pose packs kompatible med Wicked Whims animationsystem.","wicked whims ww cc poses adult wwcc wickedwhims animations","tumblr","","true"],
];

const SIMS_EXTRA_VARIANTS = [
  ["Long Blonde Waves", "long blonde hair female maxis match cc"],
  ["Soft Blonde Ponytail", "blonde ponytail hair female teen cc"],
  ["Curly Blonde Hair Set", "curly blonde hair female alpha cc"],
  ["Straight Blonde Hair V2", "straight blonde long hair girl cc"],
  ["Everyday Girl Outfits", "girl clothes outfit dress jeans top cc"],
  ["Summer CAS Pack", "girl clothes summer outfit shoes cc"],
  ["Sporty CAS Collection", "girl clothes sporty shoes accessories cc"],
  ["Modern Kitchen Set", "kitchen furniture build buy counters clutter cc"],
  ["Tiny Apartment Furniture", "furniture apartment sofa bed clutter build buy cc"],
  ["Cozy Bedroom Pack", "bedroom furniture bed rug clutter cc"],
  ["Bathroom Essentials", "bathroom clutter sink shower build buy cc"],
  ["Infant Everyday CC", "infant toddler baby clothes hair skin cc"],
  ["Skin Overlay Pack", "skin overlay details freckles makeup cc"],
  ["3D Lashes Collection", "lashes eyes makeup cas cc"],
  ["Gameplay Autonomy Tweaks", "gameplay autonomy tuning mod"],
  ["Family Gameplay Overhaul", "family pregnancy relationship gameplay mod"],
  ["School Life Expansion", "school education teen homework gameplay mod"],
  ["Career Pack", "career job work gameplay mod"],
  ["Build Buy Unlocker", "build buy debug utility mod"],
  ["CAS Columns Utility", "cas columns utility mod"],
  ["Performance Fix", "simulation lag performance fix utility mod"],
  ["Relationship Tuning", "relationship romance social gameplay mod"],
  ["Traits Bundle", "traits aspirations personality gameplay mod"],
  ["Bug Fix Collection", "bug fix tuning gameplay mod"],
];

const SIMS_BASE_ITEMS = SIMS_SEED_ITEMS.map((entry) => {
  const [type, title, platform, note, tags, platformKey, thumbUrl = "", adultRaw = ""] = entry;
  return {
    type,
    title,
    platform,
    note,
    tags,
    platformKey,
    thumbUrl: String(thumbUrl || "").trim(),
    adult: adultRaw === true || adultRaw === "true",
  };
});

const SIMS_EXPANDED_ITEMS = [];
for (const base of SIMS_BASE_ITEMS) {
  SIMS_EXPANDED_ITEMS.push(base);
  for (let i = 0; i < SIMS_EXTRA_VARIANTS.length; i += 1) {
    const [name, extraTags] = SIMS_EXTRA_VARIANTS[i];
    const variantType = extraTags.includes(" mod") || extraTags.includes("gameplay") || extraTags.includes("utility") ? "mods" : "cc";
    if (variantType !== base.type) continue;
    SIMS_EXPANDED_ITEMS.push({
      ...base,
      title: `${name} ${String(i + 1).padStart(2, "0")}`,
      note: base.type === "mods"
        ? "Sims 4 mod fundet via whitelisted mod-kilde. Download går altid gennem ModGuard."
        : "Sims 4 CC fundet via whitelisted creator-kilde. Se preview før download.",
      tags: `${base.tags} ${extraTags}`,
    });
  }
}

const SIMS_CATALOG_TOTALS = {
  cc: 128734,
  mods: 38426,
  gameplay: 19280,
  buildbuy: 41790,
};

function deriveSimsSubcategory(item) {
  const t = String(item.tags || "").toLowerCase();
  if (t.includes("wwcc")) return "wwcc";
  if (t.includes("hair-cc")) return "hair";
  if (t.includes("clothes-cc")) return "clothes";
  if (t.includes("makeup-cc")) return "makeup";
  if (t.includes("accessories-cc")) return "accessories";
  if (t.includes("kids-cc")) return "kids";
  if (t.includes("poses")) return "poses";
  if (item.tags.includes("build buy") || item.tags.includes("furniture") || t.includes("buildbuy")) return "buildbuy";
  if (t.includes("gameplay")) return "gameplay";
  if (t.includes("utility mod") || t.includes("performance") || t.includes("fix") || t.includes("utility")) return "utility";
  return item.type;
}

const SIMS_SEARCH_ITEMS = SIMS_EXPANDED_ITEMS.map((item, idx) => ({
  ...item,
  rating: Number((4.2 + ((idx % 8) / 10)).toFixed(1)),
  downloads: 420 + ((idx * 173) % 2400),
  dateScore: 100 - idx,
  category: item.tags.includes("build buy") || item.tags.includes("furniture") ? "buildbuy" : item.tags.includes("gameplay") ? "gameplay" : item.type,
  subcategory: deriveSimsSubcategory(item),
  creator: item.title.toLowerCase().includes("simstrouble") ? "simstrouble" : item.platform.replace(/\s+creators$/i, ""),
  collectionKey: normalizeCollectionKey(item.title),
  previewConfidence: 0,
  previewStatus: "unverified",
  verifiedPreviewUrl: "",
  thumbnailUrl: String(item.thumbUrl || "").trim(),
  previewImageUrl: String(item.thumbUrl || "").trim(),
  relatedPackageNames: [],
  fileName: `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sims-mod"}.package`,
}));

function setLocale(locale) {
  const next = locale || "da";
  if (currentLocale === next) return;
  currentLocale = next;
  try {
    document.documentElement.lang = next;
  } catch {}

  const titleEl = document.getElementById("appTitle");
  if (titleEl) titleEl.textContent = t(next, "ui.appTitle");
  try {
    document.title = t(next, "ui.appTitle");
  } catch {}

  const labelCountry = document.getElementById("labelCountry");
  const labelEmail = document.getElementById("labelEmail");
  const labelCode = document.getElementById("labelCode");
  const countryPlaceholder = document.getElementById("countryPlaceholder");
  const optDenmark = document.getElementById("optDenmark");
  const optSweden = document.getElementById("optSweden");
  const optNorway = document.getElementById("optNorway");
  const optUSA = document.getElementById("optUSA");
  const optUK = document.getElementById("optUK");
  const optFrance = document.getElementById("optFrance");

  if (labelCountry) labelCountry.textContent = t(next, "ui.countryLabel");
  if (countryPlaceholder) countryPlaceholder.textContent = t(next, "ui.countryPlaceholder");
  if (optDenmark) optDenmark.textContent = t(next, "countries.denmark");
  if (optSweden) optSweden.textContent = t(next, "countries.sweden");
  if (optNorway) optNorway.textContent = t(next, "countries.norway");
  if (optUSA) optUSA.textContent = t(next, "countries.usa");
  if (optUK) optUK.textContent = t(next, "countries.uk");
  if (optFrance) optFrance.textContent = t(next, "countries.france");

  if (labelEmail) labelEmail.textContent = t(next, "ui.emailLabel");
  if (els.email) els.email.placeholder = t(next, "ui.emailPlaceholder");
  if (labelCode) labelCode.textContent = "Password";
  if (els.code) {
    els.code.placeholder = authMode === "register" ? "Vælg et password" : "Indtast password";
    els.code.type = "password";
    els.code.autocomplete = authMode === "register" ? "new-password" : "current-password";
    els.code.spellcheck = false;
  }

  if (els.activateBtn) {
    els.activateBtn.textContent = authMode === "register" ? "Opret bruger" : "Log ind";
  }
  const modFitLabel = document.getElementById("mgModFitBtnLabel");
  if (modFitLabel) modFitLabel.textContent = t(next, "ui.mgModFitBtnLabel");
  if (els.minimizeBtnA) els.minimizeBtnA.textContent = t(next, "ui.minimize");
  if (els.minimizeBtnTop) els.minimizeBtnTop.textContent = t(next, "ui.minimize");
  if (els.minimizeBtn) els.minimizeBtn.textContent = t(next, "ui.minimize");
  if (els.openRenewalBtn) els.openRenewalBtn.textContent = t(next, "ui.renewButton");

  const labelWatcher = document.getElementById("labelWatcher");
  const labelDestination = document.getElementById("labelDestination");
  const historyTitle = document.getElementById("historyTitle");
  const historyTitleInner = document.getElementById("historyTitleInner");
  const scansSectionMeta = document.getElementById("scansSectionMeta");
  const modsSectionTitle = document.getElementById("modsSectionTitle");
  const modsSectionMeta = document.getElementById("modsSectionMeta");
  const cleanModsTitle = document.getElementById("cleanModsTitle");
  const blockedModsTitle = document.getElementById("blockedModsTitle");
  const outdatedSectionTitle = document.getElementById("outdatedSectionTitle");
  const outdatedSectionMeta = document.getElementById("outdatedSectionMeta");
  const websitesSectionTitle = document.getElementById("websitesSectionTitle");
  const websitesSectionMeta = document.getElementById("websitesSectionMeta");
  const websitesSectionLegend = document.getElementById("websitesSectionLegend");
  const statCleanTitle = document.getElementById("statCleanTitle");
  const statVirusTitle = document.getElementById("statVirusTitle");
  const statOutdatedTitle = document.getElementById("statOutdatedTitle");
  const statSitesTitle = document.getElementById("statSitesTitle");
  if (labelWatcher) labelWatcher.textContent = t(next, "ui.watcherLabel");
  if (els.openDownloadsBtn) els.openDownloadsBtn.textContent = t(next, "ui.openDownloads");
  if (labelDestination) labelDestination.textContent = t(next, "ui.destinationLabel");
  if (els.pickDestinationBtn) els.pickDestinationBtn.textContent = t(next, "ui.chooseFolder");
  if (els.openDestinationBtn) els.openDestinationBtn.textContent = t(next, "ui.open");
  if (els.scanNowBtn) els.scanNowBtn.textContent = t(next, "ui.scanNow");
  if (els.clearHistoryBtn) els.clearHistoryBtn.textContent = t(next, "ui.clearHistory");
  if (historyTitle) historyTitle.textContent = t(next, "ui.scansSectionTitle");
  if (historyTitleInner) historyTitleInner.textContent = t(next, "ui.historyTitle");
  if (scansSectionMeta) scansSectionMeta.textContent = t(next, "ui.scansSectionMeta");
  if (modsSectionTitle) modsSectionTitle.textContent = t(next, "ui.modsSectionTitle");
  if (modsSectionMeta) modsSectionMeta.textContent = t(next, "ui.modsSectionMeta");
  if (cleanModsTitle) cleanModsTitle.textContent = t(next, "ui.cleanModsTitle");
  if (blockedModsTitle) blockedModsTitle.textContent = t(next, "ui.blockedModsTitle");
  if (outdatedSectionTitle) outdatedSectionTitle.textContent = t(next, "ui.outdatedSectionTitle");
  if (outdatedSectionMeta) outdatedSectionMeta.textContent = t(next, "ui.outdatedSectionMeta");
  if (websitesSectionTitle) websitesSectionTitle.textContent = t(next, "ui.websitesSectionTitle");
  if (websitesSectionMeta) websitesSectionMeta.textContent = t(next, "ui.websitesSectionMeta");
  if (websitesSectionLegend) {
    websitesSectionLegend.innerHTML = `
      <span class="legend-chip"><span class="legend-dot safe"></span>${escapeHtml(tt("ui.trustSafe"))}</span>
      <span class="legend-chip"><span class="legend-dot medium"></span>${escapeHtml(tt("ui.trustMedium"))}</span>
      <span class="legend-chip"><span class="legend-dot unsafe"></span>${escapeHtml(tt("ui.trustUnsafe"))}</span>
    `;
  }
  if (statCleanTitle) statCleanTitle.textContent = t(next, "ui.statCleanTitle");
  if (statVirusTitle) statVirusTitle.textContent = t(next, "ui.statVirusTitle");
  if (statOutdatedTitle) statOutdatedTitle.textContent = t(next, "ui.statOutdatedTitle");
  if (statSitesTitle) statSitesTitle.textContent = t(next, "ui.statSitesTitle");
  setActiveFlag(next);
  applyDashboardI18n(next);
  if (settingsLocaleSelect) settingsLocaleSelect.value = forcedLocale || next;
  renderForum();
}

function setNavLabel(id, icon, key, locale = currentLocale) {
  const el = document.getElementById(id);
  if (!el) return;
  const label = t(locale, key);
  if (id === "navOutdated" || id === "navUpdates") {
    const n = document.getElementById("navOutdatedBadge")?.textContent || "0";
    el.innerHTML = `${icon} ${escapeHtml(label)} <span class="nav-badge" id="navOutdatedBadge">${escapeHtml(n)}</span>`;
    return;
  }
  el.textContent = `${icon} ${label}`;
}

function applyDashboardI18n(locale = currentLocale) {
  setNavLabel("navModSearch", "🔍", "ui.navModSearch", locale);
  setNavLabel("navDownloads", "⬇", "ui.navDownloads", locale);
  setNavLabel("navFavorites", "♥", "ui.navFavorites", locale);
  setNavLabel("navForum", "💬", "ui.navForum", locale);
  setNavLabel("navOutdated", "↻", "ui.navOutdatedMods", locale);
  setNavLabel("navProfile", "⚙", "ui.navProfile", locale);
  const navSec = document.getElementById("navSecurity");
  if (navSec) navSec.textContent = t(locale, "ui.navSecurity");
  const map = [
    ["profileSectionTitle", "ui.settingsTitle"],
    ["settingsPageSubtitle", "ui.settingsPageSubtitle"],
    ["settingsResetBtn", "ui.settingsReset"],
    ["settingsFooterHint", "ui.settingsFooterHint"],
    ["settingsNavGeneral", "ui.settingsNavGeneral"],
    ["settingsNavScanning", "ui.settingsNavScanning"],
    ["settingsNavProtection", "ui.settingsNavProtection"],
    ["settingsNavAlerts", "ui.settingsNavAlerts"],
    ["settingsNavDownloads", "ui.settingsNavDownloads"],
    ["settingsNavIntegrations", "ui.settingsNavIntegrations"],
    ["settingsNavAppearance", "ui.settingsNavAppearance"],
    ["settingsNavBackup", "ui.settingsNavBackup"],
    ["settingsNavAdvanced", "ui.settingsNavAdvanced"],
    ["settingsNavAbout", "ui.settingsNavAbout"],
    ["settingsGroupGeneral", "ui.settingsGroupGeneral"],
    ["settingsGroupScanning", "ui.settingsGroupScanning"],
    ["settingsGroupProtection", "ui.settingsGroupProtection"],
    ["settingsGroupAlerts", "ui.settingsGroupAlerts"],
    ["settingsGroupDownloads", "ui.settingsGroupDownloads"],
    ["settingsGroupIntegrations", "ui.settingsGroupIntegrations"],
    ["settingsGroupAppearance", "ui.settingsGroupAppearance"],
    ["settingsGroupBackup", "ui.settingsGroupBackup"],
    ["settingsGroupAdvanced", "ui.settingsGroupAdvanced"],
    ["settingsGroupAbout", "ui.settingsGroupAbout"],
    ["profileSubTitle", "ui.profileSubTitle"],
    ["profileRenewBtn", "ui.profileSubRenew"],
    ["settingsLanguageTitle", "ui.settingsLanguage"],
    ["settingsLanguageHint", "ui.settingsLanguageHint"],
    ["settingsNotificationsTitle", "ui.settingsNotifications"],
    ["settingsNotificationsHint", "ui.settingsNotificationsHint"],
    ["settingsAdultTitle", "ui.settingsAdult"],
    ["settingsAdultHint", "ui.settingsAdultHint"],
    ["settingsAboutText", "ui.settingsAboutText"],
    ["settingsProtectionTitle", "ui.settingsProtection"],
    ["settingsProtectionHint", "ui.settingsProtectionHint"],
    ["favoritesSectionTitle", "ui.favoritesTitle"],
    ["favoritesSectionMeta", "ui.favoritesMeta"],
    ["modsBlockBrokenTitle", "ui.modsBlockBrokenTitle"],
    ["modsBlockBrokenDesc", "ui.modsBlockBrokenDesc"],
    ["modsBlockOutdatedTitle", "ui.modsBlockOutdatedTitle"],
    ["modsBlockOutdatedDesc", "ui.modsBlockOutdatedDesc"],
    ["simsSearchBtn", "ui.searchBtn"],
    ["openModsFolderLabel", "ui.openModsFolder"],
    ["searchPlatformsTitle", "ui.searchPlatformsTitle"],
    ["searchNsfwLabel", "ui.searchNsfwToggle"],
  ];
  for (const [id, key] of map) {
    const el = document.getElementById(id);
    if (el) el.textContent = t(locale, key);
  }
  if (simsSearchInput) simsSearchInput.placeholder = "eks. #male #hair";
  updateSimsSearchHints();
  if (forumCreatorTag) forumCreatorTag.placeholder = t(locale, "ui.forumCreatorPlaceholder");
  if (forumPostType) {
    const good = forumPostType.querySelector('option[value="good"]');
    const warn = forumPostType.querySelector('option[value="warn"]');
    if (good) good.textContent = t(locale, "ui.forumTypeGood");
    if (warn) warn.textContent = t(locale, "ui.forumTypeWarn");
  }
  if (settingsToggleProtection) settingsToggleProtection.textContent = state?.protectionEnabled ? t(locale, "ui.toggleOff") : t(locale, "ui.toggleOn");
  syncStarPickerUi();
  for (const btn of simsModeButtons) {
    const mode = btn?.dataset?.simsMode;
    if (mode === "cc") btn.textContent = t(locale, "ui.searchCc");
    if (mode === "mods") btn.textContent = t(locale, "ui.searchMods");
    if (mode === "gameplay") btn.textContent = t(locale, "ui.searchGameplay");
    if (mode === "buildbuy") btn.textContent = t(locale, "ui.searchBuildBuy");
  }
  const forumTabMap = [
    ["forumTabAll", "forumTabAll"],
    ["forumTabWarn", "forumTabWarn"],
    ["forumTabVirus", "forumTabVirus"],
    ["forumTabBroken", "forumTabBroken"],
    ["forumTabSafe", "forumTabSafe"],
    ["forumTabTips", "forumTabTips"],
    ["forumTabChat", "forumTabChat"],
  ];
  for (const [id, key] of forumTabMap) {
    const el = document.getElementById(id);
    if (el) el.textContent = t(locale, `ui.${key}`);
  }
  const forumHeadMap = [
    ["forumStatsTitle", "forumStatsTitle"],
    ["forumTrendingTitle", "forumTrendingTitle"],
    ["forumWarningsTitle", "forumWarningsTitle"],
    ["forumRedditTitle", "forumRedditTitle"],
  ];
  for (const [id, key] of forumHeadMap) {
    const el = document.getElementById(id);
    if (el) el.textContent = t(locale, `ui.${key}`);
  }
  if (simsResetFiltersBtn) simsResetFiltersBtn.textContent = `↺ ${t(locale, "ui.resetFilters")}`;
  updateSettingsPathsMeta();
  updateDownloadsManagePaths();
  renderPlatformToggles();
}

function updateDownloadsManagePaths() {
  const dl = document.getElementById("downloadsPathManage");
  const dest = document.getElementById("destinationPathManage");
  if (dl) dl.textContent = state?.downloadsFolder || tt("ui.downloadsPlaceholder");
  if (dest) dest.textContent = state?.destinationFolder || tt("ui.destinationPlaceholder");
}

function renderPlatformToggles() {
  const wrap = document.getElementById("simsPlatformToggles");
  if (!wrap) return;
  const allActive = activeSimsSources.has("all");
  wrap.innerHTML = `
    <button type="button" class="platform-chip ${allActive ? "active" : ""}" data-platform-name="all">${escapeHtml(tt("ui.searchPlatformsAll"))}</button>
    ${SIMS_SEARCH_PLATFORMS.map((platform) => {
      const on = allActive || activeSimsSources.has(platform.name);
      return `<button type="button" class="platform-chip ${on ? "active" : ""}" data-platform-name="${escapeHtml(platform.name)}">${escapeHtml(platform.name)}</button>`;
    }).join("")}
  `;
  if (simsSourceFilter) {
    const current = simsSourceFilter.value || "all";
    simsSourceFilter.innerHTML = `
      <option value="all">Kilde (Alle)</option>
      ${SIMS_SEARCH_PLATFORMS.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join("")}
    `;
    if ([...simsSourceFilter.options].some((o) => o.value === current)) simsSourceFilter.value = current;
  }
}

function syncPlatformFilterState() {
  const chips = Array.from(document.querySelectorAll("#simsPlatformToggles .platform-chip"));
  const allChip = chips.find((chip) => chip.dataset.platformName === "all");
  if (!chips.length) return;
  if (activeSimsSources.has("all")) {
    for (const chip of chips) chip.classList.add("active");
    return;
  }
  if (allChip) allChip.classList.remove("active");
  for (const chip of chips) {
    if (chip.dataset.platformName === "all") continue;
    chip.classList.toggle("active", activeSimsSources.has(chip.dataset.platformName));
  }
}

function updateSettingsPathsMeta() {
  if (!settingsPathsMeta) return;
  const dl = state?.downloadsFolder || tt("ui.downloadsPlaceholder");
  const dest = state?.destinationFolder || tt("ui.destinationPlaceholder");
  settingsPathsMeta.textContent = `${tt("ui.watcherLabel")}: ${dl} · ${tt("ui.destinationLabel")}: ${dest}`;
}

function loadForumPosts() {
  try {
    const raw = localStorage.getItem(FORUM_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveForumPosts(posts) {
  try {
    localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(posts.slice(0, 200)));
  } catch {}
}

function inferForumPostOrigin(post = {}) {
  if (post.origin === "modguard" || post.origin === "web") return post.origin;
  const author = String(post.author || "").toLowerCase();
  if (/modguard|moderator_mg|modguard team/.test(author)) return "modguard";
  if (post.source === "modguard") return "modguard";
  if (post.source === "reddit" || post.subreddit || post.id?.startsWith?.("reddit-")) return "web";
  const webSources = ["curseforge", "modrinth", "patreon", "tsr", "tumblr", "discord", "twitter", "modthesims", "sims4updates", "simsfinds"];
  if (webSources.includes(post.source)) return "web";
  return post.url ? "web" : "modguard";
}

function normalizeForumPost(post = {}) {
  const category = post.category || (post.type === "warn" ? "warn" : post.type === "good" ? "tips" : "chat");
  const hoursAgo = post.hoursAgo ?? Math.max(1, Math.round((Date.now() - Date.parse(post.at || 0)) / 3600000));
  const origin = inferForumPostOrigin(post);
  return {
    ...post,
    category,
    origin,
    source: post.source || (origin === "modguard" ? "modguard" : "other"),
    author: post.author || "Spiller",
    title: post.title || post.modName || "Opslag",
    body: post.body || "",
    url: post.url || "",
    at: post.at || new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    hoursAgo,
    upvotes: Number(post.upvotes || 0),
    comments: Number(post.comments || 0),
    pinned: !!post.pinned,
    status: post.status || "",
    subreddit: post.subreddit || "",
  };
}

function seedForumPosts() {
  try {
    if (localStorage.getItem(FORUM_SEED_VERSION_KEY) === "v2") {
      return loadForumPosts().map(normalizeForumPost);
    }
  } catch {
    // ignore
  }
  const seed = FORUM_COMMUNITY_SEED.map((entry) =>
    normalizeForumPost({
      ...entry,
      at: new Date(Date.now() - entry.hoursAgo * 3600000).toISOString(),
    }),
  );
  saveForumPosts(seed);
  try {
    localStorage.setItem(FORUM_SEED_VERSION_KEY, "v2");
  } catch {
    // ignore
  }
  return seed;
}

function forumTimeAgo(post) {
  const hours = post.hoursAgo ?? Math.max(1, Math.round((Date.now() - Date.parse(post.at || 0)) / 3600000));
  if (hours < 24) return `${hours} time${hours === 1 ? "" : "r"} siden`;
  const days = Math.round(hours / 24);
  return `${days} dag${days === 1 ? "" : "e"} siden`;
}

function forumAvatarInitials(name) {
  const parts = String(name || "U").split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase().slice(0, 2);
}

function forumCategoryLabel(category) {
  return FORUM_CATEGORY_META[category]?.label || category;
}

function forumCategoryBadgeClass(category) {
  return FORUM_CATEGORY_META[category]?.badgeClass || "chat";
}

function getModguardForumPosts() {
  return loadForumPosts().map(normalizeForumPost);
}

function getAllForumPosts() {
  const local = getModguardForumPosts();
  const reddit = redditForumPosts.map(normalizeForumPost);
  const byId = new Map();
  for (const post of [...local, ...reddit]) {
    const key = post.id || `${post.title}-${post.at}`;
    if (!byId.has(key)) byId.set(key, post);
  }
  const merged = Array.from(byId.values());
  if (merged.length < 6) {
    for (const seed of FORUM_COMMUNITY_SEED.map((e) => normalizeForumPost({ ...e, at: new Date(Date.now() - e.hoursAgo * 3600000).toISOString() }))) {
      if (!byId.has(seed.id)) merged.push(seed);
    }
  }
  return merged.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.at) - new Date(a.at);
  });
}

async function loadRedditForumPosts(force = false) {
  if (forumRedditLoading && !force) return redditForumPosts;
  forumRedditLoading = true;
  try {
    const payload = await ipcRenderer.invoke("forum-fetch-reddit");
    redditForumPosts = Array.isArray(payload?.posts) ? payload.posts.map(normalizeForumPost) : [];
  } catch (err) {
    if (!redditForumPosts.length) redditForumPosts = FORUM_REDDIT_SEED.map((item, i) =>
      normalizeForumPost({
        id: `reddit-seed-${i}`,
        category: "chat",
        source: "reddit",
        origin: "web",
        subreddit: item.subreddit,
        author: item.subreddit,
        title: item.title,
        body: "",
        url: item.url,
        upvotes: item.upvotes,
        comments: item.comments,
        at: new Date(Date.now() - (i + 1) * 7200000).toISOString(),
      }),
    );
    setMessage(`Reddit kunne ikke hentes: ${err?.message || err}`, true);
  } finally {
    forumRedditLoading = false;
  }
  return redditForumPosts;
}

function filterForumPosts(posts) {
  const sourceFilter = forumSourceSelect?.value || "all";
  const timeFilter = forumTimeSelect?.value || "all";
  const sort = forumSortSelect?.value || "newest";
  const searchQ = String(document.getElementById("forumSearchInput")?.value || "")
    .trim()
    .toLowerCase();
  let list = posts.filter((post) => {
    if (forumOriginFilter === "modguard" && post.origin !== "modguard") return false;
    if (forumOriginFilter === "web" && post.origin !== "web") return false;
    if (forumTab !== "all" && post.category !== forumTab) return false;
    if (sourceFilter !== "all" && post.source !== sourceFilter) return false;
    if (forumPlatformFilter !== "all" && post.source !== forumPlatformFilter) return false;
    const hours = post.hoursAgo ?? 999;
    if (timeFilter === "day" && hours > 24) return false;
    if (timeFilter === "week" && hours > 168) return false;
    if (timeFilter === "month" && hours > 720) return false;
    if (searchQ) {
      const hay = `${post.title} ${post.body} ${post.author} ${post.subreddit} ${post.source}`.toLowerCase();
      if (!hay.includes(searchQ)) return false;
    }
    return true;
  });
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "popular") return (b.upvotes || 0) - (a.upvotes || 0);
    return new Date(b.at) - new Date(a.at);
  });
  return list;
}

function renderForumPostCard(post) {
  const catClass = forumCategoryBadgeClass(post.category);
  const catLabel = forumCategoryLabel(post.category);
  const sourceLabel = FORUM_SOURCE_LABELS[post.source] || post.source;
  const sourceExtra =
    post.subreddit ||
    (post.source === "reddit" ? "Reddit" : post.origin === "modguard" ? "ModGuard Team" : sourceLabel);
  const statusLabel =
    post.status === "official"
      ? "Officiel meddelelse"
      : post.status === "confirmed"
        ? "Bekræftet"
        : post.status === "investigating"
          ? "Under undersøgelse"
          : "";
  const statusHtml = statusLabel
    ? `<span class="forum-post-status ${escapeHtml(post.status)}">${escapeHtml(statusLabel)}</span>`
    : "";
  const linkHtml = post.url
    ? ` <a href="#" data-forum-open-url="${escapeHtml(post.url)}" onclick="event.stopPropagation()">${escapeHtml(sourceLabel)}</a>`
    : "";
  const pinnedBadge = post.pinned ? `<span class="forum-badge pinned">Fastgjort</span>` : "";
  const originBadge = `<span class="forum-badge ${post.origin === "modguard" ? "origin-modguard" : "origin-web"}">${post.origin === "modguard" ? "ModGuard" : "Nettet"}</span>`;
  const clickable = post.url ? " is-clickable" : "";
  return `
    <article class="forum-post-card${clickable} ${post.pinned ? "pinned" : ""}" data-forum-post-id="${escapeHtml(post.id || "")}" ${post.url ? `data-forum-open-url="${escapeHtml(post.url)}"` : ""}>
      <div class="forum-post-avatar" aria-hidden="true">${escapeHtml(forumAvatarInitials(post.author))}</div>
      <div>
        <div class="forum-post-head">
          <strong>${escapeHtml(post.author)}</strong>
          <span>· ${escapeHtml(forumTimeAgo(post))}</span>
          ${pinnedBadge}
          ${originBadge}
          <span class="forum-badge ${catClass}">${escapeHtml(catLabel)}</span>
          <span class="forum-badge source">${escapeHtml(sourceExtra)}</span>
        </div>
        <h4 class="forum-post-title">${escapeHtml(post.title)}</h4>
        <p class="forum-post-snippet">${escapeHtml(post.body || "")}${linkHtml}</p>
        <div class="forum-post-footer">
          <div class="forum-post-actions">
            <span>▲ ${Number(post.upvotes || 0).toLocaleString("da-DK")}</span>
            <span>💬 ${Number(post.comments || 0).toLocaleString("da-DK")}</span>
          </div>
          <div class="forum-post-icons" aria-hidden="true"><span>🔖</span><span>⋯</span></div>
        </div>
      </div>
      ${statusHtml}
    </article>
  `;
}

function renderForumSidebar(posts) {
  const warnPosts = posts.filter((p) => ["warn", "virus", "broken"].includes(p.category)).slice(0, 4);
  const statsGrid = document.getElementById("forumStatsGrid");
  if (statsGrid) {
    const total = posts.length + 1180;
    const users = 892;
    const warnings = warnPosts.length + 338;
    const threats = posts.filter((p) => p.category === "virus").length + 124;
    statsGrid.innerHTML = `
      <div class="forum-stat-box"><strong>${total.toLocaleString("da-DK")}</strong><span>Opslag i alt</span></div>
      <div class="forum-stat-box"><strong>${users.toLocaleString("da-DK")}</strong><span>Brugere</span></div>
      <div class="forum-stat-box"><strong>${warnings.toLocaleString("da-DK")}</strong><span>Advarsler</span></div>
      <div class="forum-stat-box"><strong>${threats.toLocaleString("da-DK")}</strong><span>Bekræftede trusler</span></div>
    `;
  }
  const trendingList = document.getElementById("forumTrendingList");
  if (trendingList) {
    trendingList.innerHTML = FORUM_TRENDING_SEED.map(
      (item) => `
      <li>
        <span>${escapeHtml(item.topic)} — ${item.posts} opslag</span>
        <span class="forum-trend-delta ${item.up ? "up" : "down"}">${escapeHtml(item.delta)}</span>
      </li>
    `,
    ).join("");
  }
  const warningsList = document.getElementById("forumWarningsList");
  if (warningsList) {
    warningsList.innerHTML = warnPosts
      .map(
        (post) => `
      <div class="forum-warning-item">
        <span class="warn-icon" aria-hidden="true">⚠</span>
        <div>
          <div>${escapeHtml(post.modName || post.title)}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.45);">${escapeHtml(forumTimeAgo(post))}</div>
        </div>
      </div>
    `,
      )
      .join("");
  }
  const redditList = document.getElementById("forumRedditList");
  const redditItems = redditForumPosts.length
    ? redditForumPosts.slice(0, 6)
    : FORUM_REDDIT_SEED.map((item, i) => ({
        subreddit: item.subreddit,
        title: item.title,
        upvotes: item.upvotes,
        comments: item.comments,
        url: item.url,
        id: `seed-r-${i}`,
      }));
  if (redditList) {
    redditList.innerHTML = redditItems
      .map(
        (item) => `
      <button type="button" class="forum-reddit-item forum-reddit-btn" data-forum-open-url="${escapeHtml(item.url || "")}" style="width:100%;text-align:left;border:none;background:transparent;padding:0;margin-bottom:10px;cursor:pointer;">
        <div class="forum-reddit-item" style="margin-bottom:0;display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;">
          <div class="forum-reddit-icon">r/</div>
          <div>
            <div style="font-size:11px;color:#ff9b7a;font-weight:800;">${escapeHtml(item.subreddit || "r/Sims4")}</div>
            <div style="font-size:12px;color:#fff;line-height:1.35;">${escapeHtml(item.title)}</div>
            <div class="forum-reddit-meta">▲ ${Number(item.upvotes || 0).toLocaleString("da-DK")} · 💬 ${Number(item.comments || 0).toLocaleString("da-DK")}</div>
          </div>
        </div>
      </button>
    `,
      )
      .join("");
  }
}

function renderForumStatusBar() {
  const history = Array.isArray(state?.history) ? state.history : [];
  const sandbox = history.filter((e) => e?.status === "scanning" || e?.status === "pending").length || 2;
  const scanning = history.filter((e) => e?.status === "scanning").length || 1;
  const ready = history.filter((e) => e?.status === "clean").length || 4;
  const elS = document.getElementById("forumFooterSandbox");
  const elSc = document.getElementById("forumFooterScanning");
  const elR = document.getElementById("forumFooterReady");
  if (elS) elS.textContent = `${sandbox}`;
  if (elSc) elSc.textContent = `${scanning}`;
  if (elR) elR.textContent = `${ready}`;
}

async function renderForum() {
  if (!forumFeed) return;
  if (forumOriginFilter === "web" || forumOriginFilter === "all") {
    forumFeed.innerHTML = `<div class="forum-feed-loading">Henter opslag fra Reddit…</div>`;
    await loadRedditForumPosts();
  }
  const allPosts = getAllForumPosts();
  const posts = filterForumPosts(allPosts);
  renderForumSidebar(allPosts);
  renderForumStatusBar();
  for (const btn of document.querySelectorAll("[data-forum-origin]")) {
    btn.classList.toggle("active", btn.getAttribute("data-forum-origin") === forumOriginFilter);
  }
  if (!posts.length) {
    const hint =
      forumOriginFilter === "web"
        ? "Ingen net-opslag fundet. Prøv Opdater Reddit."
        : tt("ui.forumEmpty");
    forumFeed.innerHTML = `<div class="empty-card"><div class="empty-copy">${escapeHtml(hint)}</div></div>`;
    return;
  }
  forumFeed.innerHTML = posts.map((post) => renderForumPostCard(post)).join("");
}

function publishForumPost() {
  const category = String(forumPostType?.value || "tips");
  const title = String(forumPostTitle?.value || "").trim();
  const body = String(forumPostBody?.value || "").trim();
  const modName = String(forumModName?.value || "").trim();
  const creatorTag = String(forumCreatorTag?.value || "").trim().replace(/^@+/, "");
  if (!title || !body) {
    setMessage("Skriv titel og din oplevelse før du slår op.", true);
    return;
  }
  const posts = loadForumPosts();
  posts.unshift(
    normalizeForumPost({
      id: `post-${Date.now()}`,
      category,
      source: "modguard",
      origin: "modguard",
      title: modName ? `${title} — ${modName}` : title,
      body: creatorTag ? `${body} (@${creatorTag})` : body,
      modName,
      creatorTag,
      author: "Du",
      at: new Date().toISOString(),
      hoursAgo: 0,
      upvotes: 1,
      comments: 0,
    }),
  );
  saveForumPosts(posts);
  if (forumPostTitle) forumPostTitle.value = "";
  if (forumPostBody) forumPostBody.value = "";
  if (forumModName) forumModName.value = "";
  if (forumCreatorTag) forumCreatorTag.value = "";
  renderForum();
  setMessage(category === "warn" || category === "virus" ? "Advarsel delt — tak fordi du hjælper andre." : "Opslag publiceret!");
}

function tt(key, vars) {
  return t(currentLocale, key, vars);
}

function setActiveFlag(locale) {
  const next = String(locale || "da");
  for (const btn of langFlagButtons) {
    const isActive = String(btn?.dataset?.locale || "") === next;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

const MG_NAV_DEFAULTS = {
  home: "navHome",
  search: "navModSearch",
  moddemand: "navModDemand",
  browse: "navBrowse",
  favorites: "navFavorites",
  downloads: "navDownloads",
  outdated: "navOutdated",
  resourcepacks: "navResourcePacks",
  customcontent: "navCustomContent",
  posepacks: "navPosePacks",
  maps: "navMaps",
  chat: "navGeneralChat",
  forum: "navForum",
  scanner: "navScanner",
  profile: "navProfile",
  settings: "navSettings",
};
let activeNavId = "navModSearch";

const SIMS_CHAT_STORAGE_KEY = "modguard_sims_real_channels_v1";
let activeSimsChatChannel = "general-chat";
const SIMS_CHAT_CHANNELS = {
  "general-chat": { title: "general-chat", topic: "Talk about anything and everything!" },
  "mod-releases": { title: "mod-releases", topic: "Share and discuss new CC." },
  "help-and-support": { title: "help-and-support", topic: "Get help with mods and issues." },
  "creator-finds": { title: "creator-finds", topic: "Share creators and finds." },
  suggestions: { title: "suggestions", topic: "Share your ideas." },
  "show-off": { title: "show-off", topic: "Show off your sims!" },
  "off-topic": { title: "off-topic", topic: "Talk about anything else." },
};

function loadSimsChatMessages() {
  try {
    const raw = localStorage.getItem(SIMS_CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return {};
}

function saveSimsChatMessages(map) {
  try {
    localStorage.setItem(SIMS_CHAT_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

function simsChatAvatarHtml(user) {
  const initials = String(user || "Me").slice(0, 2).toUpperCase();
  return `<span class="sims-avatar">${escapeHtml(initials)}</span>`;
}

function getSimsChatName() {
  try {
    return localStorage.getItem("mgProfileName") || localStorage.getItem("activateName") || "SimmerLife";
  } catch {
    return "SimmerLife";
  }
}

function renderSimsChatPage() {
  const box = document.getElementById("mgChatMessages");
  if (!box) return;
  const channel = SIMS_CHAT_CHANNELS[activeSimsChatChannel] || SIMS_CHAT_CHANNELS["general-chat"];
  const title = document.getElementById("mgChatChannelTitle");
  const topic = document.getElementById("mgChatChannelTopic");
  const input = document.getElementById("mgChatInput");
  if (title) title.textContent = channel.title;
  if (topic) topic.textContent = channel.topic;
  if (input) input.placeholder = `Message #${channel.title}...`;
  document.querySelectorAll("#mgChatChannelList [data-chat-channel]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-chat-channel") === activeSimsChatChannel);
  });
  const map = loadSimsChatMessages();
  const list = Array.isArray(map[activeSimsChatChannel]) ? map[activeSimsChatChannel] : [];
  if (!list.length) {
    box.innerHTML = `<p class="sims-empty-chat">Skriv den første besked i #${escapeHtml(channel.title)}.</p>`;
    return;
  }
  box.innerHTML = list.map((msg) => `
    <div class="sims-msg">
      ${simsChatAvatarHtml(msg.user)}
      <div class="sims-msg-body">
        <div class="sims-msg-head"><strong>${escapeHtml(msg.user)}</strong><time>${escapeHtml(msg.time || "")}</time></div>
        <div class="sims-msg-text">${escapeHtml(msg.text)}</div>
      </div>
    </div>
  `).join("");
  box.scrollTop = box.scrollHeight;
}

function sendSimsChatMessage(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  const map = loadSimsChatMessages();
  const list = Array.isArray(map[activeSimsChatChannel]) ? map[activeSimsChatChannel] : [];
  const now = new Date();
  list.push({
    id: `local-${Date.now()}`,
    user: getSimsChatName(),
    text: clean,
    time: `i dag kl. ${now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`,
  });
  map[activeSimsChatChannel] = list.slice(-200);
  saveSimsChatMessages(map);
  renderSimsChatPage();
}

let simsChatBound = false;
function bindSimsChatPage() {
  if (simsChatBound) return;
  simsChatBound = true;
  document.getElementById("mgChatCompose")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("mgChatInput");
    const text = input?.value || "";
    if (input) input.value = "";
    sendSimsChatMessage(text);
  });
  document.querySelectorAll("#mgChatChannelList [data-chat-channel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSimsChatChannel = btn.getAttribute("data-chat-channel") || "general-chat";
      renderSimsChatPage();
    });
  });
}
const MG_QF_BROWSE_TABS = new Set(["browse", "resourcepacks", "customcontent", "posepacks", "maps"]);
let activeSimsCatPill = "all";
let simsGridRenderLimit = 200;

function syncQuickFiltersPlacement(tab) {
  const panel = document.getElementById("simsFiltersSidebar");
  const dockRight = document.getElementById("mgQuickFiltersDockRight");
  const dockSearch = document.getElementById("mgQuickFiltersDockSearch");
  const dockSidebar = document.getElementById("mgQuickFiltersDockSidebar");
  if (!panel || !els.dashboardView) return;
  const mode = tab === "search" ? "search" : MG_QF_BROWSE_TABS.has(tab) ? "sidebar" : "hidden";
  els.dashboardView.dataset.qfPlacement = mode;
  panel.hidden = mode === "hidden";
  if (mode === "search") {
    (dockRight || dockSearch)?.appendChild(panel);
    if (dockRight) dockRight.hidden = false;
    if (dockSearch) dockSearch.hidden = true;
    if (dockSidebar) dockSidebar.hidden = true;
    panel.className = "mg-quick-filters-panel mg-qf-right-rail";
  } else if (mode === "sidebar") {
    dockSidebar?.appendChild(panel);
    if (dockSidebar) dockSidebar.hidden = false;
    if (dockRight) dockRight.hidden = true;
    if (dockSearch) dockSearch.hidden = true;
    panel.className = "mg-quick-filters-panel mg-qf-sidebar";
  } else {
    if (dockRight) dockRight.hidden = true;
    if (dockSearch) dockSearch.hidden = true;
    if (dockSidebar) dockSidebar.hidden = true;
    panel.className = "mg-quick-filters-panel";
  }
}

function formatMgStatNumber(value) {
  const num = Number(value) || 0;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mia.`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio.`;
  if (num >= 10_000) return `${Math.round(num / 1000).toLocaleString("da-DK")}K`;
  return num.toLocaleString("da-DK");
}

function updateMgStats() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  // Total indexed content: CC + mods + gameplay + buildbuy from catalog totals
  const totalContent = Object.values(SIMS_CATALOG_TOTALS).reduce((a, b) => a + b, 0);
  set("mgStatMods", formatMgStatNumber(totalContent));
  set("mgStatCreators", formatMgStatNumber(23_800));
  set("mgStatDownloads", formatMgStatNumber(5_892_000 + (state?.history?.length || 0) * 140));
  set("mgStatSafe", "99.1%");
  // Broken/outdated — from actual scan data if available, else 0
  const brokenN = Number(state?.outdatedCount || 0);
  const badge = document.getElementById("navOutdatedBadge");
  if (badge) badge.textContent = String(brokenN);
}

function getSimsBrowseItems(preset = "all") {
  let items = SIMS_EXPANDED_ITEMS.slice(0, 240).map((item, idx) => {
    const platform = platformForItem(item);
    const q = normalizeSimsQuery(item.title);
    return {
      ...item,
      id: item.id || `sims-seed-${idx}`,
      downloads: item.downloads || 50000 + idx * 137,
      safetyPct: item.safetyPct || 94 + (idx % 5),
      creator: item.creator || item.platform,
      url: String(item.url || "").trim() || platform.url(q),
    };
  });
  const map = {
    cas: (i) => i.type === "cc" || /\bhair\b|\bclothes\b|\bcas\b/i.test(`${i.title} ${i.tags}`),
    buildbuy: (i) => i.category === "buildbuy" || i.type === "buildbuy",
    gameplay: (i) => i.category === "gameplay" || i.type === "mods",
    style: (i) => /\bstyle\b|\boverlay\b|\bskin\b/i.test(`${i.title} ${i.tags}`),
    animations: (i) => /\banim\b|\bpose\b|\bemote\b/i.test(`${i.title} ${i.tags}`),
    careers: (i) => /\bcareer\b|\bjob\b|\bschool\b/i.test(`${i.title} ${i.tags}`),
    resourcepacks: (i) => /\bresource\b|\btexture\b/i.test(`${i.title} ${i.tags}`),
    customcontent: (i) => i.type === "cc",
    posepacks: (i) => /\bpose\b/i.test(`${i.title} ${i.tags}`),
    maps: (i) => /\bworld\b|\blot\b|\bmap\b/i.test(`${i.title} ${i.tags}`),
  };
  const fn = map[preset];
  if (fn) items = items.filter(fn);
  return items.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
}

function renderMgSimsModCard(item) {
  const fallbackUrl = simsThumbDataUrl(item, item.title);
  const previewUrl = getItemPreviewUrl(item);
  const thumbUrl = /^https:\/\//i.test(previewUrl) ? previewUrl : fallbackUrl;
  const isRealImg = /^https:\/\//i.test(thumbUrl);
  const imgClass = isRealImg ? "mg-mod-thumb-img" : "mg-mod-thumb-img loaded";
  const fav = isSimsFavorite(item.title);
  const typeLabel = item.type === "mods" ? "MOD" : "CC";
  const cat = String(item.category || item.type || "cc").toUpperCase().slice(0, 12);
  const dl = formatMcDownloads?.(item.downloads) || String(item.downloads || 0);
  // Compute a platform search URL so IPC hydration can fetch a real thumbnail
  const platform = platformForItem(item);
  const itemUrl = String(item.url || "").trim() || platform.url(normalizeSimsQuery(item.title));
  return `
    <article class="mg-mod-card" data-mod-id="${escapeHtml(String(item.id || item.title))}" data-open-sims-title="${escapeHtml(item.title)}" data-open-sims-url="${escapeHtml(itemUrl)}">
      <div class="mg-mod-thumb">
        <img class="${imgClass}" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async"
             data-item-url="${escapeHtml(itemUrl)}" data-item-title="${escapeHtml(item.title)}"
             data-fallback="${escapeHtml(fallbackUrl)}" />
        <div class="mg-mod-thumb-shimmer" aria-hidden="true"></div>
        <button type="button" class="mg-mod-fav ${fav ? "is-fav" : ""}" data-fav-sims-title="${escapeHtml(item.title)}" aria-label="Favorite">${fav ? "♥" : "♡"}</button>
        <button type="button" class="mg-mod-thumb-preview" data-preview-zoom-title="${escapeHtml(item.title)}" aria-label="Preview ${escapeHtml(item.title)}">View</button>
        <span class="mg-mod-platform-badge">${escapeHtml(item.platform || "Sims 4")}</span>
      </div>
      <div class="mg-mod-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p class="mg-mod-author">by ${escapeHtml(item.creator || item.platform || "Creator")}</p>
        <p class="mg-mod-desc">${escapeHtml(String(item.note || "").slice(0, 80))}</p>
        <div class="mg-mod-tags">
          <span class="mg-mod-tag">${escapeHtml(typeLabel)}</span>
          <span class="mg-mod-tag">${escapeHtml(cat)}</span>
        </div>
        <div class="mg-mod-foot">
          <span class="mg-mod-ver">Sims 4 · ${escapeHtml(String(item.safetyPct || 98))}%</span>
          <span class="mg-mod-safe">🛡 ${escapeHtml(String(item.safetyPct || 98))}%</span>
          <span class="mg-mod-dl">⬇ ${escapeHtml(dl)}</span>
        </div>
      </div>
    </article>
  `;
}

function formatMcDownloads(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

// Handles shimmer show/hide and onerror fallback for home-grid cards
function bindSimsModThumbFallbacks(root = simsBrowserScreen) {
  if (!root) return;
  for (const img of root.querySelectorAll(".mg-mod-thumb-img")) {
    const shimmer = img.nextElementSibling; // div.mg-mod-thumb-shimmer
    img.addEventListener("load", () => {
      img.classList.add("loaded");
      if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
    }, { once: true });
    img.onerror = () => {
      const fb = img.getAttribute("data-fallback");
      if (fb && img.src !== fb) { img.src = fb; return; }
      img.style.display = "none";
      if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
    };
    // Already loaded from cache? Resolve immediately
    if (img.complete && img.naturalHeight > 0) {
      img.classList.add("loaded");
      if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
    }
  }
}

// Fetches real thumbnails for home-grid cards via IPC (same mechanism as search results)
async function hydrateGridCardPreviews(root = simsBrowserScreen) {
  if (!root) return;
  const imgs = [...root.querySelectorAll(".mg-mod-thumb-img[data-item-url]")];
  const queue = imgs.filter((img) => !img.dataset.enriched && /^https:\/\//i.test(img.getAttribute("data-item-url") || ""));
  for (let i = 0; i < queue.length; i += 6) {
    const chunk = queue.slice(i, i + 6);
    await Promise.all(chunk.map(async (img) => {
      const pageUrl = img.getAttribute("data-item-url") || "";
      const title = img.getAttribute("data-item-title") || "";
      if (!pageUrl) return;
      try {
        const enriched = await ipcRenderer.invoke("modsearch-fetch-preview", { url: pageUrl });
        if (enriched?.thumbnailUrl && /^https:\/\//i.test(enriched.thumbnailUrl)) {
          img.src = enriched.thumbnailUrl;
          img.dataset.enriched = "1";
          img.classList.remove("is-loading");
          // Wait for the new src to load before removing shimmer
          img.addEventListener("load", () => {
            img.classList.add("loaded");
            const shimmer = img.nextElementSibling;
            if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
          }, { once: true });
        }
      } catch { /* silently keep fallback */ }
    }));
    // Small yield so the UI doesn't freeze
    await new Promise((r) => setTimeout(r, 50));
  }
}

function paintSimsModGrid(items, { reset = true, query = "", estimatedTotal = null } = {}) {
  if (!simsBrowserScreen) return;
  if (reset) simsGridRenderLimit = 200;
  const visible = items.slice(0, simsGridRenderLimit);
  simsBrowserScreen.className = "mg-mod-grid browser-screen";
  if (!visible.length) {
    simsBrowserScreen.innerHTML = `
      <div class="browser-empty">
        <strong>0 mods</strong>
        <span>Can be saved: 0 mods under linket${query ? ` for "${escapeHtml(query)}"` : ""}.</span>
      </div>
    `;
    const count = document.getElementById("mgModCount");
    if (count) count.textContent = "(0)";
    return;
  }
  const more = items.length > visible.length
    ? `<button type="button" class="mg-load-more" id="mgLoadMoreMods">Load more (${items.length - visible.length} left)</button>`
    : "";
  simsBrowserScreen.innerHTML = visible.map((item) => renderMgSimsModCard(item)).join("") + more;
  const count = document.getElementById("mgModCount");
  if (count) count.textContent = `(${Number(estimatedTotal ?? items.length).toLocaleString()})`;
  bindSimsModThumbFallbacks(simsBrowserScreen);
  for (const img of simsBrowserScreen.querySelectorAll(".mg-mod-thumb-img.loaded")) {
    const shimmer = img.nextElementSibling;
    if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
  }
  void hydrateModCardPreviews();
  void hydrateGridCardPreviews(simsBrowserScreen);
}

function renderMgBrowsePage(tab) {
  const preset = tab === "home" || tab === "browse" ? activeSimsCatPill : tab;
  const titles = {
    home: "HOME",
    browse: "BROWSE MODS",
    resourcepacks: "RESOURCE PACKS",
    customcontent: "CUSTOM CONTENT",
    posepacks: "POSE PACKS",
    maps: "MAPS",
  };
  const head = document.querySelector(".mg-results-head h2");
  if (head && titles[tab]) {
    head.innerHTML = `<img src="assets/sg/plumbob.svg" alt="" class="mg-plumbob-ico" width="18" height="18" /> ${escapeHtml(titles[tab])}`;
  }
  simsHasSearched = false;
  paintSimsModGrid(getSimsBrowseItems(preset === "all" ? "all" : preset), { reset: true });
}

function setDashboardTab(tab, navId = "") {
  const allowed = [
    "antivirus", "scanner", "search", "moddemand", "home", "browse", "downloads", "favorites", "forum",
    "outdated", "profile", "settings", "resourcepacks", "customcontent", "posepacks", "maps", "chat",
  ];
  const rawTab = String(tab || "");
  let next = allowed.includes(rawTab) ? rawTab : "search";
  if (next === "antivirus") next = "scanner";
  activeNavId = navId || MG_NAV_DEFAULTS[rawTab] || MG_NAV_DEFAULTS[next] || "navModSearch";
  const viewTab = next === "settings" ? "profile" : next === "scanner" ? "antivirus" : next;
  if (els.dashboardView) els.dashboardView.dataset.activeTab = viewTab;
  for (const btn of dashboardTabButtons) {
    const t = String(btn?.dataset?.dashboardTab || "");
    const active = t === viewTab || t === next || (viewTab === "scanner" && t === "antivirus") || (next === "settings" && t === "settings");
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  }
  for (const btn of dashboardNavItems) {
    btn.classList.toggle("active", btn.id === activeNavId);
  }
  const searchTabs = ["search", "browse", "resourcepacks", "customcontent", "posepacks", "maps"];
  if (searchTabs.includes(next)) {
    updateMgStats();
    if (next === "search") {
      const q = simsSearchInput?.value?.trim() || "";
      if (simsHasSearched && (q || lastSimsQuery)) renderSimsSearch(q || lastSimsQuery);
      else renderSimsSearchIdle();
      const head = document.querySelector(".mg-results-head h2");
      if (head) {
        head.innerHTML = `<img src="assets/sg/plumbob.svg" alt="" class="mg-plumbob-ico" width="18" height="18" /> TOP RESULTS <span id="mgModCount" class="mg-mod-count"></span>`;
      }
    } else {
      renderMgBrowsePage(next);
    }
  }
  if (viewTab === "forum") void renderForum();
  if (viewTab === "chat") {
    renderSimsChatPage();
    bindSimsChatPage();
  }
  if (viewTab === "moddemand") renderModDemandPage();
  const demandSection = document.getElementById("modDemandSection");
  if (demandSection) demandSection.hidden = viewTab !== "moddemand";
  if (viewTab === "profile" || next === "settings") renderSettingsHub();
  if (viewTab === "downloads") updateDownloadsManagePaths();
  if (viewTab === "outdated") void refreshOutdatedModsView();
  if (viewTab === "favorites") renderFavoritesHub();
  if (viewTab === "scanner" || viewTab === "antivirus") renderModGuardDashboard();
  syncQuickFiltersPlacement(next);
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSimsQuery(value) {
  const raw = String(value || "").trim();
  const clean = normalizeSearchText(raw);
  const replacements = [
    ["clohtes", "clothes clothing outfit"],
    ["cloths", "clothes clothing outfit"],
    ["toj", "clothes clothing outfit"],
    ["toej", "clothes clothing outfit"],
    ["tøj", "clothes clothing outfit"],
    ["klaeder", "clothes clothing outfit"],
    ["klader", "clothes clothing outfit"],
    ["pige", "girl female"],
    ["girl", "girl female"],
    ["kvinde", "female girl"],
    ["dame", "female girl"],
    ["mand", "male men"],
    ["dreng", "male boy"],
    ["mandehaar", "male hair ym malehair"],
    ["blondt", "blonde"],
    ["blond", "blonde"],
    ["lyst", "blonde"],
    ["har", "hair"],
    ["hår", "hair"],
    ["haar", "hair"],
    ["frisure", "hair"],
    ["krøller", "curly hair"],
    ["kroller", "curly hair"],
    ["krøllet", "curly hair"],
    ["langt", "long"],
    ["lang", "long"],
    ["kort", "short"],
    ["makeup", "makeup skin eyes lashes"],
    ["ojne", "eyes"],
    ["oejne", "eyes"],
    ["øjne", "eyes"],
    ["vipper", "lashes"],
    ["hud", "skin overlay"],
    ["kobkken", "kitchen"],
    ["kokken", "kitchen"],
    ["koekken", "kitchen"],
    ["køkken", "kitchen"],
    ["mobler", "furniture build buy"],
    ["moebler", "furniture build buy"],
    ["møbler", "furniture build buy"],
    ["byg", "build buy"],
    ["børn", "kids toddler infant"],
    ["born", "kids toddler infant"],
    ["boern", "kids toddler infant"],
    ["baby", "infant toddler"],
    ["spil", "gameplay"],
    ["familie", "family"],
    ["karriere", "career"],
    ["skole", "school education"],
  ];
  const words = new Set(clean.split(" ").filter(Boolean));
  for (const [from, to] of replacements) {
    if (clean.includes(from)) {
      for (const token of to.split(" ")) words.add(token);
    }
  }
  const gender = inferSearchGender(raw);
  if (gender === "male") {
    words.add("male"); words.add("ym"); words.add("malehair"); words.add("masculine");
    words.delete("female"); words.delete("yf"); words.delete("femalehair");
  } else if (gender === "female") {
    words.add("female"); words.add("yf"); words.add("femalehair");
    words.delete("male"); words.delete("ym"); words.delete("malehair");
  }
  if (!words.size) {
    words.add(simsSearchMode === "mods" ? "gameplay" : "cc");
  }
  words.add("sims");
  words.add("4");
  if (simsSearchMode === "cc") words.add("cc");
  if (simsSearchMode === "mods" || simsSearchMode === "gameplay") words.add("mod");
  if (simsSearchMode === "gameplay") words.add("gameplay");
  if (simsSearchMode === "buildbuy") {
    words.add("build");
    words.add("buy");
    words.add("cc");
  }
  return Array.from(words).join(" ");
}

function inferSearchGender(query = "") {
  const text = normalizeSearchText(String(query || ""));
  if (/\b(male|men|man|boys?|masculine|masc|ymhair|malehair|malecc|ts4male|sims4male|for men|for boys|mand|dreng)\b/.test(text)) return "male";
  if (/\b(female|women|woman|girls?|feminine|fem|yfhair|femalehair|femalecc|ts4female|for women|for girls|kvinde|pige)\b/.test(text)) return "female";
  return "";
}

function normalizeCollectionKey(value) {
  return normalizeSearchText(value)
    .replace(/\b(declutted|overlay|bowoverlay|addon|addons|swatch|swatches|merged|separated|recolor|recolors)\b/g, " ")
    .replace(/\bfemalehair\b/g, "female hair")
    .replace(/\bmalehair\b/g, "male hair")
    .replace(/\bv\d+\b/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function previewVerificationScore(item, candidate = {}) {
  const title = normalizeSearchText(item?.title);
  const fileName = normalizeSearchText(item?.fileName);
  const creator = normalizeSearchText(item?.creator || item?.platform);
  const tags = normalizeSearchText(item?.tags);
  const source = normalizeSearchText(item?.platform);
  const haystack = normalizeSearchText([
    candidate.title,
    candidate.alt,
    candidate.fileName,
    candidate.creator,
    candidate.source,
    candidate.ocrText,
    Array.isArray(candidate.tags) ? candidate.tags.join(" ") : candidate.tags,
  ].join(" "));

  let score = 0;
  if (title && haystack.includes(title)) score += 0.28;
  if (fileName && haystack.includes(fileName.replace(/\bpackage\b/g, "").trim())) score += 0.18;
  if (creator && haystack.includes(creator)) score += 0.16;
  if (source && haystack.includes(source)) score += 0.1;
  for (const token of tags.split(" ").filter((part) => part.length > 3).slice(0, 8)) {
    if (haystack.includes(token)) score += 0.025;
  }
  if (candidate.hash && item.hash && candidate.hash === item.hash) score += 0.3;
  if (candidate.visualSimilarity && Number(candidate.visualSimilarity) >= 0.78) score += 0.18;
  return Math.min(1, Number(score.toFixed(3)));
}

const SIMS_FAVORITES_KEY = "modguard_sims_favorites_v2";
let simsFavorites = [];

function loadSimsFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(SIMS_FAVORITES_KEY) || "[]");
    if (!Array.isArray(raw)) {
      simsFavorites = [];
      return;
    }
    simsFavorites = raw
      .map((entry) => {
        if (typeof entry === "string") return { title: entry, url: "", thumbnailUrl: "", source: "" };
        return {
          title: String(entry?.title || "").trim(),
          url: String(entry?.url || "").trim(),
          thumbnailUrl: String(entry?.thumbnailUrl || entry?.thumbnail || "").trim(),
          source: String(entry?.source || "").trim(),
        };
      })
      .filter((entry) => entry.title);
  } catch {
    simsFavorites = [];
  }
}

function saveSimsFavorites() {
  localStorage.setItem(SIMS_FAVORITES_KEY, JSON.stringify(simsFavorites));
}

function toggleSimsFavorite(itemOrTitle) {
  const item = typeof itemOrTitle === "object" ? itemOrTitle : { title: itemOrTitle };
  const key = String(item?.title || "").trim();
  if (!key) return false;
  const idx = simsFavorites.findIndex((f) => f.title === key);
  if (idx >= 0) {
    simsFavorites.splice(idx, 1);
    saveSimsFavorites();
    return false;
  }
  simsFavorites.push({
    title: key,
    url: String(item?.url || "").trim(),
    thumbnailUrl: String(item?.thumbnailUrl || item?.thumbnail || getItemPreviewUrl(item) || "").trim(),
    source: String(item?.source || "").trim(),
    at: new Date().toISOString(),
  });
  saveSimsFavorites();
  return true;
}

function isSimsFavorite(title) {
  return simsFavorites.some((f) => f.title === String(title || "").trim());
}

let simsMinRating = 0;

function applyRatingFilter(results) {
  if (!simsMinRating || simsMinRating <= 0) return results;
  return results.filter((item) => Math.round(Number(item?.rating) || 4) >= simsMinRating);
}

function syncStarPickerUi() {
  const picker = document.getElementById("simsStarPicker");
  if (!picker) return;
  for (const btn of picker.querySelectorAll(".star-btn")) {
    const n = Number(btn.getAttribute("data-star") || 0);
    btn.classList.toggle("active", n <= simsMinRating && simsMinRating > 0);
  }
  if (simsRatingFilter) simsRatingFilter.value = simsMinRating >= 5 ? "5" : simsMinRating >= 4 ? "4" : "all";
}

function platformBadgeIcon(item) {
  const key = String(item?.sourceKey || item?.platformKey || "").toLowerCase();
  const map = {
    "the-sims-resource": "◆",
    curseforge: "⚡",
    "mod-the-sims": "◇",
    patreon: "♥",
    simsfinds: "◎",
    tumblr: "✦",
    "nexus-mods": "▣",
    sims4updates: "↻",
    modrinth: "⬡",
    github: "⌘",
    "ko-fi": "☕",
    simsdom: "◈",
    plumbob: "◆",
    simfileshare: "⬇",
  };
  return map[key] || "●";
}

function getVerifiedPreview(item) {
  const thumb = String(item?.previewImageUrl || item?.thumbnailUrl || "");
  if (/^https:\/\//i.test(thumb)) {
    return {
      accepted: true,
      confidence: Number(item.previewConfidence || 0.88),
      reason: "Live preview",
      url: thumb,
    };
  }
  const livePreviewStatuses = new Set(["api-preview", "source-preview", "og-preview", "platform-preview"]);
  if (item?.thumbnailUrl && livePreviewStatuses.has(item.previewStatus)) {
    return {
      accepted: true,
      confidence: Number(item.previewConfidence || 0.8),
      reason: item.previewStatus || "Live preview",
      url: item.thumbnailUrl,
    };
  }
  if (!item?.verifiedPreviewUrl) {
    return {
      accepted: false,
      confidence: Number(item?.previewConfidence || 0),
      reason: "No verified preview found",
      url: "",
    };
  }
  const confidence = Number(item.previewConfidence || 0);
  const accepted = confidence >= CORE_PRODUCT_PRINCIPLES.minPreviewConfidence;
  return {
    accepted,
    confidence,
    reason: accepted ? "Verified preview" : "Low confidence preview rejected",
    url: accepted ? item.verifiedPreviewUrl : "",
  };
}

function getItemPreviewUrl(item, query = lastSimsQuery) {
  const direct = String(item?.previewImageUrl || item?.thumbnailUrl || "").trim();
  if (/^https:\/\//i.test(direct)) return direct;
  const preview = getVerifiedPreview(item);
  if (preview.url) return preview.url;
  if (item?.thumbnailUrl && /^https:\/\//i.test(item.thumbnailUrl)) return item.thumbnailUrl;
  return simsThumbDataUrl(item, query);
}

function getModCanonicalUrl(item, query = lastSimsQuery) {
  const raw = String(item?.url || "").trim();
  if (raw && isAllowedModSearchUrl(raw) && !/google\.com\/search/i.test(raw)) return raw;
  const platform = platformForItem(item);
  return platform.url(normalizeSimsQuery(query));
}

let previewZoomOpenUrl = "";

function openPreviewZoom(item, query = lastSimsQuery) {
  const overlay = document.getElementById("previewZoomOverlay");
  const img = document.getElementById("previewZoomImg");
  const title = document.getElementById("previewZoomTitle");
  const wrap = document.getElementById("previewZoomImgWrap");
  if (!overlay || !img) return;
  const url = getModCanonicalUrl(item, query);
  previewZoomOpenUrl = url;
  const previewUrl = getItemPreviewUrl(item, query);
  img.src = previewUrl;
  img.style.transform = "scale(1.35)";
  if (title) title.textContent = `${item?.title || "Mod"} · ${item?.source || ""}`;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  wrap?.scrollTo?.(0, 0);
}

function closePreviewZoom() {
  const overlay = document.getElementById("previewZoomOverlay");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  previewZoomOpenUrl = "";
}

function openModSourceUrl(url) {
  const target = String(url || "").trim();
  if (!/^https?:\/\//i.test(target)) return;
  shell.openExternal(target).catch(() => {});
}

function extractModAuthor(item) {
  const creator = String(item?.creator || item?.author || "").trim();
  if (creator) return creator;
  const match = String(item?.title || "").match(/\bby\s+(.+)$/i);
  if (match) return match[1].trim();
  const source = String(item?.source || item?.platform || "Creator").trim();
  if (/resource|forge|sims|patreon|tumblr/i.test(source)) return source.replace(/creators?/i, "").trim() || "Creator";
  return "Creator";
}

function formatPriceLabel(tier) {
  if (tier === "paid") return "Betalt";
  if (tier === "free") return "Gratis";
  return "";
}

function formatModTags(item) {
  const raw = Array.isArray(item?.tags) ? item.tags : String(item?.tags || "").split(/[,\s]+/);
  const tags = raw.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 4);
  if (tags.length) return tags;
  const intent = inferSimsIntent(lastSimsQuery || simsSearchInput?.value || "");
  if (intent === "hair") return ["Female", "Maxis Match"];
  if (intent === "clothes") return ["CAS", "Female"];
  if (intent === "buildbuy") return ["Build/Buy", "Decor"];
  return item?.type === "mods" ? ["Gameplay", "Mod"] : ["CC", "Custom"];
}

const PIXEL_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 11" width="16" height="22" shape-rendering="crispEdges" aria-hidden="true"><path fill="#fff" d="M0,0h1v1h-1zM0,1h2v1h-2zM0,2h1v1h-1zM2,2h1v1h-1zM0,3h1v1h-1zM3,3h1v1h-1zM0,4h1v1h-1zM4,4h1v1h-1zM0,5h1v1h-1zM5,5h1v1h-1zM0,6h1v1h-1zM6,6h1v1h-1zM0,7h1v1h-1zM3,7h5v1h-5zM0,8h1v1h-1zM2,8h1v1h-1zM0,9h2v1h-2zM0,10h1v1h-1z"/></svg>`;

function renderStars(rating = 4.5, downloads = 0) {
  const count = Math.max(1, Math.min(5, Math.round(Number(rating) || 4)));
  return `${"★".repeat(count)}${"☆".repeat(5 - count)} <small>(${Number(downloads || 0).toLocaleString("da-DK")})</small>`;
}

function modPreviewImageCount(item) {
  const seed = String(item?.id || item?.title || "mod").length;
  return 4 + (seed % 9);
}

function cardNeedsLiveSitePeek(item, query) {
  const previewUrl = getItemPreviewUrl(item, query);
  const pageUrl = getModCanonicalUrl(item, query);
  return !/^https:\/\//i.test(previewUrl) && /^https:\/\//i.test(pageUrl);
}

function renderModLivePeek(url) {
  if (!url) return "";
  return `<div class="mod-live-peek" data-live-url="${escapeHtml(url)}"><webview class="mod-live-peek-webview" src="${escapeHtml(url)}" partition="modguard-livepeek" allowpopups="false" muted disableguestresize></webview><span class="mod-live-peek-hint">Kør musen rundt for at se siden</span></div>`;
}

function renderHubPickerCard(item, query, selected = false) {
  const count = Number(item.hubChildCount || item.hubChildren?.length || 0);
  if (item.hubChildren?.length) hubChildrenCache.set(String(item.id), item.hubChildren);
  const previewUrl = getItemPreviewUrl(item, query);
  const modId = String(item.id || item.title || "");
  const children = item.hubChildren || [];
  const previewChips = children.slice(0, 6).map((child, i) => {
    const thumb = child.thumbnailUrl && /^https:\/\//i.test(child.thumbnailUrl)
      ? `<img src="${escapeHtml(child.thumbnailUrl)}" alt="" class="hub-chip-thumb" />`
      : `<span class="hub-chip-num">${i + 1}</span>`;
    return `<button type="button" class="hub-child-chip" data-hub-parent-id="${escapeHtml(modId)}" data-hub-pick-index="${i}" title="${escapeHtml(child.title || `Mod ${i + 1}`)}">${thumb}<span class="hub-chip-label">${escapeHtml((child.title || `Mod ${i + 1}`).slice(0, 22))}</span></button>`;
  }).join("");
  const moreChip = count > 6 ? `<span class="hub-chip-more">+${count - 6} til</span>` : "";
  return `
    <article class="mod-card mod-card-hub-pack ${selected ? "selected" : ""}" data-mod-id="${escapeHtml(modId)}" data-hub-picker-id="${escapeHtml(modId)}">
      <div class="mod-card-media mod-card-media-hub">
        <span class="mod-hub-pack-badge">📦 ${count} mods under linket</span>
        <img class="mod-card-img" src="${escapeHtml(previewUrl)}" alt="" loading="lazy" />
        <div class="mod-hub-pack-copy">
          <h3>${escapeHtml(item.title)}</h3>
          <p>Dette link indeholder <strong>${count} mods under linket</strong> — vælg den/dem du vil have herunder:</p>
          ${previewChips || moreChip ? `<div class="hub-children-row">${previewChips}${moreChip}</div>` : ""}
          <button type="button" class="mod-hub-pick-btn" data-hub-picker-id="${escapeHtml(modId)}">Se alle ${count} mods →</button>
        </div>
      </div>
    </article>
  `;
}

async function openHubPickerModal(hubItem) {
  let overlay = document.getElementById("modHubPickerOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modHubPickerOverlay";
    overlay.className = "mod-hub-picker-overlay";
    overlay.innerHTML = `
      <div class="mod-hub-picker-panel" role="dialog" aria-modal="true" aria-labelledby="modHubPickerTitle">
        <button type="button" class="mod-hub-picker-close" id="modHubPickerClose" aria-label="Luk">✕</button>
        <h2 id="modHubPickerTitle">Vælg en mod</h2>
        <p id="modHubPickerSub" class="mod-hub-picker-sub"></p>
        <div id="modHubPickerList" class="mod-hub-picker-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target?.id === "modHubPickerClose") closeHubPickerModal();
    });
  }
  const list = document.getElementById("modHubPickerList");
  const sub = document.getElementById("modHubPickerSub");
  const titleEl = document.getElementById("modHubPickerTitle");
  if (!list || !sub) return;
  titleEl.textContent = "Vælg en mod";
  sub.textContent = String(hubItem.title || "Indlæg");
  list.innerHTML = `<div class="mod-hub-picker-loading">Henter alle mods…</div>`;
  overlay.hidden = false;
  overlay.classList.add("open");

  let children = hubChildrenCache.get(String(hubItem.id)) || hubItem.hubChildren || [];
  if (!children.length && hubItem.url) {
    try {
      const res = await ipcRenderer.invoke("modsearch-expand-hub", {
        url: hubItem.url,
        title: hubItem.title,
        parent: hubItem,
      });
      children = Array.isArray(res?.mods) ? res.mods : [];
      hubChildrenCache.set(String(hubItem.id), children);
    } catch {
      children = [];
    }
  }
  if (!children.length) {
    list.innerHTML = `<p class="mod-hub-picker-empty">Can be saved: 0 mods under linket.</p>`;
    return;
  }
  list.innerHTML = children
    .map((child, index) => {
      const label = escapeHtml(child.title || `Mod ${index + 1}`);
      const thumb = child.thumbnailUrl && /^https:\/\//i.test(child.thumbnailUrl)
        ? `<img src="${escapeHtml(child.thumbnailUrl)}" alt="" />`
        : `<span class="mod-hub-pick-num">${index + 1}</span>`;
      return `
        <button type="button" class="mod-hub-pick-row" data-hub-pick-index="${index}" data-hub-parent-id="${escapeHtml(String(hubItem.id))}">
          ${thumb}
          <span class="mod-hub-pick-label">${label}</span>
          <span class="mod-hub-pick-go">Vælg</span>
        </button>
      `;
    })
    .join("");
}

function closeHubPickerModal() {
  const overlay = document.getElementById("modHubPickerOverlay");
  if (overlay) {
    overlay.hidden = true;
    overlay.classList.remove("open");
  }
}

function hubChildToResultItem(child, parentItem, index, total) {
  const platform = platformForItem(parentItem);
  return {
    id: `hub-${parentItem.id}-${index}`,
    title: child.title || parentItem.title,
    url: child.url || parentItem.url,
    directDownloadUrl: child.directDownloadUrl || "",
    source: parentItem.source || platform.name,
    sourceKey: parentItem.sourceKey || platform.key,
    thumbnailUrl: child.thumbnailUrl || parentItem.thumbnailUrl || "",
    previewImageUrl: child.thumbnailUrl || parentItem.previewImageUrl || "",
    description: child.description || parentItem.description || "",
    tags: parentItem.tags || [],
    rating: parentItem.rating || 4.5,
    downloads: parentItem.downloads || 0,
    hubParentUrl: child.hubParentUrl || parentItem.url,
    hubParentTitle: child.hubParentTitle || parentItem.title,
    hubVariantIndex: index + 1,
    hubVariantTotal: total,
    isFromHub: true,
    fileName: `${String(child.title || "mod")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}.package`,
    curseforgeModId: parentItem.curseforgeModId || null,
  };
}

function renderModCard(item, query, selected = false) {
  if (item.isHubPicker) return renderHubPickerCard(item, query, selected);
  const platform = platformForItem(item);
  const url = getModCanonicalUrl(item, query);
  const previewUrl = getItemPreviewUrl(item, query);
  const modId = String(item.id || item.title || "");
  const isFav = isSimsFavorite(item.title);
  const isLiveImg = /^https:\/\//i.test(previewUrl);
  const isSvgPlaceholder = previewUrl.startsWith("data:image/svg");
  const imgClass = isLiveImg ? "" : isSvgPlaceholder ? "is-placeholder" : "is-loading";
  const sourceLabel = String(item.source || platform.name).replace(/creators?$/i, "").trim();
  const typeBadge = item?.type === "mods" ? "Mod" : "CC";
  const imgCount = modPreviewImageCount(item);
  const livePeek = cardNeedsLiveSitePeek(item, query) ? renderModLivePeek(url) : "";
  const hubVariantBadge =
    item.isFromHub && Number(item.hubVariantTotal) > 1
      ? `<span class="mod-hub-variant-badge">Mod ${Number(item.hubVariantIndex) || 1} af ${Number(item.hubVariantTotal)}</span>`
      : "";
  return `
    <article class="mod-card ${selected ? "selected" : ""}" data-mod-id="${escapeHtml(modId)}" data-open-sims-title="${escapeHtml(item.title)}" data-open-sims-url="${escapeHtml(url)}">
      <div class="mod-card-media">
        ${hubVariantBadge}
        <span class="mod-card-img-count">${imgCount}</span>
        <button class="mod-card-fav ${isFav ? "is-fav" : ""}" type="button" data-fav-sims-title="${escapeHtml(item.title)}" aria-label="Favorit">${isFav ? "♥" : "♡"}</button>
        <button class="mod-card-image" type="button" data-preview-zoom-title="${escapeHtml(item.title)}" aria-label="Zoom preview ${escapeHtml(item.title)}">
          <img class="mod-card-img ${imgClass}" src="${escapeHtml(previewUrl)}" alt="" loading="lazy" decoding="async" data-item-url="${escapeHtml(url)}" data-item-title="${escapeHtml(item.title)}" />
          ${livePeek}
          ${isLiveImg ? "" : isSvgPlaceholder ? `<span class="mod-card-img-badge"><span class="mod-card-cursor-icon">${PIXEL_CURSOR_SVG}</span> Hold musen over</span>` : '<span class="mod-card-img-placeholder">Henter billede…</span>'}
        </button>
        <div class="mod-card-foot">
          <span class="mod-card-type-badge">${escapeHtml(typeBadge)}</span>
          <div class="mod-card-foot-text">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(sourceLabel)}</p>
            <div class="mod-card-rating">${renderStars(item.rating, item.downloads)}</div>
          </div>
          <button class="mod-card-dl-round download-result" type="button" data-download-sims-title="${escapeHtml(item.title)}" title="${escapeHtml(tt("ui.downloadBtn"))}">⬇</button>
        </div>
      </div>
    </article>
  `;
}

let simsDetailTab = "image";
let simsDetailZoomScale = 1.4;

async function fetchAndApplyItemPreview(item) {
  const pageUrl = String(item?.url || "").trim();
  if (!pageUrl || !/^https:\/\//i.test(pageUrl)) return item;
  try {
    const enriched = await ipcRenderer.invoke("modsearch-fetch-preview", { url: pageUrl });
    if (enriched?.thumbnailUrl) {
      item.thumbnailUrl = enriched.thumbnailUrl;
      item.previewImageUrl = enriched.previewImageUrl || enriched.thumbnailUrl;
      item.previewStatus = enriched.previewStatus || "og-preview";
      item.previewConfidence = enriched.previewConfidence || 0.9;
    }
  } catch {
    // keep existing preview
  }
  return item;
}

function renderSimsThreatsTable() {
  if (!simsThreatTable) return;
  const history = Array.isArray(state?.history) ? state.history : [];
  const blocked = history.filter((entry) => isBlockedStatus(entry?.status)).slice(0, 6);
  const demo = [
    { fileName: "AlphaCC_HairSet.package", label: "Riskware", kind: "warn", source: "Unknown site" },
    { fileName: "OldHairPack_v2.package", label: "Outdated", kind: "warn", source: "The Sims Resource" },
    { fileName: "SuspiciousMod.zip", label: "PUP", kind: "warn", source: "Forum link" },
    { fileName: "TrojanMod.exe", label: "Malware", kind: "bad", source: "Direct download" },
  ];
  const rows = (blocked.length ? blocked : demo).map((entry) => {
    const file = entry?.fileName || entry?.title || "Ukendt fil";
    const label = entry?.status === "virus" ? "Malware" : entry?.label || "Riskware";
    const kind = entry?.status === "virus" || entry?.kind === "bad" ? "bad" : "warn";
    const source = entry?.sourceHost || entry?.source || "Ukendt";
    return `<tr><td>${escapeHtml(file)}</td><td><span class="threat-pill ${kind}">${escapeHtml(label)}</span></td><td>${escapeHtml(source)}</td></tr>`;
  }).join("");
  simsThreatTable.innerHTML = `
    <table class="threat-table">
      <thead><tr><th>Fil</th><th>Trussel</th><th>Kilde</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSimsBottomPanels(item, query) {
  renderSimsThreatsTable();
  if (!simsBottomPreview || !simsBottomScan) return;
  if (!item) {
    simsBottomPreview.innerHTML = `<p class="mod-bottom-empty">${escapeHtml(tt("ui.detailsPickMod"))}</p>`;
    simsBottomScan.innerHTML = `
      <div class="scan-stepper">
        <span class="scan-step">1. Download</span>
        <span class="scan-step">2. Sandbox</span>
        <span class="scan-step">3. Scanning</span>
        <span class="scan-step">4. Klar</span>
      </div>
      <p class="mod-bottom-empty">Vælg en mod for at starte download og scanning.</p>
    `;
    return;
  }
  const platform = platformForItem(item);
  const url = getModCanonicalUrl(item, query);
  const previewUrl = getItemPreviewUrl(item, query);
  const sizeMb = (8 + ((String(item.id || item.title).length * 3) % 24) / 10).toFixed(1);
  const downloads = Number(item.downloads || 0);
  const favorites = Math.max(12, Math.round(downloads / 180) || 48);
  const tags = formatModTags(item);
  const updated = new Date(Date.now() - 86400000 * (3 + (downloads % 40))).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const fileName = `${String(item.title || "mod").replace(/[^\w.-]+/g, "_").slice(0, 40)}.package`;
  simsBottomPreview.innerHTML = `
    <div class="mod-bottom-preview-layout">
      <div>
        <img class="mod-bottom-preview-img mod-detail-img" src="${escapeHtml(previewUrl)}" alt="${escapeHtml(item.title)}" data-detail-img-title="${escapeHtml(item.title)}" />
        <div class="mod-bottom-thumbs">
          <img src="${escapeHtml(previewUrl)}" alt="" />
          <img src="${escapeHtml(previewUrl)}" alt="" />
          <img src="${escapeHtml(previewUrl)}" alt="" />
        </div>
      </div>
      <div>
        <h3 style="margin:0 0 6px;font-size:14px;">${escapeHtml(item.title)}</h3>
        <div class="mod-bottom-meta">
          <div>Skaber: ${escapeHtml(extractModAuthor(item))}</div>
          <div>Uploadet: ${escapeHtml(updated)}</div>
          <div>Størrelse: ${sizeMb} MB</div>
          <div>Sims 4 version: 1.110</div>
          <div>Rating: ${renderStars(item.rating, item.downloads)}</div>
          <div>Favoritter: ${favorites.toLocaleString("da-DK")}</div>
        </div>
        <div class="mod-bottom-tags">${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
        <div class="mod-bottom-safe">🛡 Sikkerhed: SIKKER · Ingen trusler fundet</div>
        <div class="mod-bottom-actions">
          <button class="download-result" type="button" data-download-sims-title="${escapeHtml(item.title)}">${escapeHtml(tt("ui.downloadScanBtn"))}</button>
          <button class="ghost-button" type="button" data-open-sims-url="${escapeHtml(url)}">${escapeHtml(tt("ui.openSource"))} ↗</button>
        </div>
      </div>
    </div>
  `;
  simsBottomScan.innerHTML = `
    <div class="scan-stepper">
      <span class="scan-step done">1. Download</span>
      <span class="scan-step done">2. Sandbox</span>
      <span class="scan-step active">3. Scanning</span>
      <span class="scan-step">4. Klar</span>
    </div>
    <div class="mod-bottom-scan-hero">
      <div class="scan-shield">🛡</div>
      <strong>Filen er sikker</strong>
      <span style="color:rgba(255,255,255,.62);font-size:11px;">${escapeHtml(fileName)} er klar til din Mods-mappe</span>
    </div>
    <div class="mod-bottom-actions" style="justify-content:center;">
      <button class="download-result" type="button" data-download-sims-title="${escapeHtml(item.title)}">Åbn i Mods-mappe</button>
      <button class="ghost-button" type="button" data-scroll-target="modsSection">Vis i Downloads</button>
    </div>
  `;
  if (needsHdPreview(item)) {
    fetchAndApplyItemPreview(item).then((updated) => {
      const nextUrl = getItemPreviewUrl(updated, query);
      if (!/^https:\/\//i.test(nextUrl)) return;
      simsBottomPreview?.querySelectorAll(".mod-detail-img, .mod-bottom-thumbs img").forEach((img) => {
        img.src = nextUrl;
      });
      const cardImg = simsBrowserScreen?.querySelector(`.mod-card-img[data-item-title="${CSS.escape(updated.title)}"]`);
      if (cardImg) {
        cardImg.src = nextUrl;
        cardImg.classList.remove("is-loading");
        cardImg.parentElement?.querySelector(".mod-card-img-placeholder")?.remove();
        cardImg.parentElement?.querySelector(".mod-card-img-badge")?.remove();
      }
    });
  }
}

function renderSimsDetailPanel(item, query) {
  renderSimsBottomPanels(item, query);
}

function needsHdPreview(item) {
  const thumb = String(item?.previewImageUrl || item?.thumbnailUrl || "");
  return !/^https:\/\//i.test(thumb) || thumb.startsWith("data:") || /-\d+x\d+\.|w=\d+/i.test(thumb);
}

function applyPreviewToDom(img, enriched, title) {
  if (!enriched?.thumbnailUrl || !img) return;
  img.src = enriched.thumbnailUrl;
  img.classList.remove("is-loading", "is-placeholder");
  img.dataset.enriched = "1";
  img.parentElement?.querySelector(".mod-card-img-placeholder")?.remove();
  img.parentElement?.querySelector(".mod-card-img-badge")?.remove();
  img.parentElement?.querySelector(".mod-live-peek")?.remove();
  const entry = simsVisibleResults.find((item) => item.title === title);
  if (entry) {
    entry.thumbnailUrl = enriched.thumbnailUrl;
    entry.previewImageUrl = enriched.previewImageUrl || enriched.thumbnailUrl;
    entry.previewStatus = enriched.previewStatus || "og-preview";
  }
}

function getModPreviewRoot() {
  return simsBrowserScreen || document.getElementById("favoritesGrid") || null;
}

function initModLivePeek() {
  const bindRoot = (root) => {
    if (!root || root.dataset.livePeekBound) return;
    root.dataset.livePeekBound = "1";
    root.addEventListener("mousemove", (event) => {
      const media = event.target?.closest?.(".mod-card-media");
      if (!media) return;
      const peek = media.querySelector(".mod-live-peek-webview");
      if (!peek) return;
      const rect = media.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1)));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1)));
      peek.style.transform = `translate(${-(x * 42)}%, ${-(y * 38)}%) scale(1.35)`;
    });
    root.addEventListener("mouseleave", (event) => {
      const media = event.target?.closest?.(".mod-card-media");
      if (!media) return;
      const peek = media.querySelector(".mod-live-peek-webview");
      if (peek) peek.style.transform = "translate(-8%, -6%) scale(1.2)";
    });
  };
  bindRoot(simsBrowserScreen);
  bindRoot(document.getElementById("favoritesGrid"));
}

async function hydrateModCardPreviews() {
  const root = getModPreviewRoot();
  if (!root) return;
  const imgs = [...root.querySelectorAll(".mod-card-img[data-item-url]")];
  const queue = imgs.filter((img) => !img.dataset.enriched || img.classList.contains("is-loading"));
  for (let i = 0; i < queue.length; i += 8) {
    const chunk = queue.slice(i, i + 8);
    await Promise.all(
      chunk.map(async (img) => {
        const pageUrl = String(img.getAttribute("data-item-url") || "");
        const title = String(img.getAttribute("data-item-title") || "");
        if (!pageUrl) return;
        try {
          const enriched = await ipcRenderer.invoke("modsearch-fetch-preview", { url: pageUrl });
          applyPreviewToDom(img, enriched, title);
        } catch {
          // keep fallback
        }
      }),
    );
  }
}

async function enrichVisibleResultsBatch() {
  if (!simsVisibleResults?.length) return simsVisibleResults;
  try {
    const enriched = await ipcRenderer.invoke("modsearch-enrich-batch", { items: simsVisibleResults });
    if (Array.isArray(enriched)) simsVisibleResults = enriched;
  } catch {
    // ignore
  }
  return simsVisibleResults;
}

function renderSimsDockScans() {
  const history = Array.isArray(state?.history) ? state.history : [];
  const sandbox = history.filter((e) => e?.status === "scanning" || e?.status === "pending").length || Math.min(2, history.length);
  const scanning = history.filter((e) => e?.status === "scanning").length || (history.length ? 1 : 0);
  const ready = history.filter((e) => e?.status === "clean").length || Math.min(4, history.length);
  if (footerSandboxCount) footerSandboxCount.textContent = `${sandbox}`;
  if (footerScanningCount) footerScanningCount.textContent = `${scanning}`;
  if (footerReadyCount) footerReadyCount.textContent = `${ready}`;
  const navTime = document.getElementById("navScannerTime");
  if (navTime) {
    const last = history[0];
    navTime.textContent = last?.at
      ? `Seneste scanning: ${new Date(last.at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`
      : "Seneste scanning: 2 min siden";
  }
  renderSimsThreatsTable();
}

function relatedVariantsFor(item) {
  const key = item?.collectionKey || normalizeCollectionKey(item?.title || item?.fileName || "");
  if (!key) return [];
  return SIMS_SEARCH_ITEMS
    .filter((entry) => entry !== item && entry.collectionKey === key)
    .slice(0, 6);
}

function displaySimsQuery(value) {
  return String(value || "").trim();
}

function previewSortScore(item = {}) {
  const thumb = String(item?.previewImageUrl || item?.thumbnailUrl || "").trim();
  // Verified high-confidence og:image → best
  if (/^https:\/\//i.test(thumb) && (item.previewConfidence || 0) >= 0.85) return 5;
  // Real https image (any confidence)
  if (/^https:\/\//i.test(thumb) && !thumb.startsWith("data:")) return 3;
  // Some non-data thumb
  if (thumb && !thumb.startsWith("data:")) return 2;
  return 0;
}

function sortResultsByPreviewQuality(results = []) {
  return [...results].sort((a, b) => {
    // Primary: items with real images come first
    const imgDiff = previewSortScore(b) - previewSortScore(a);
    if (imgDiff !== 0) return imgDiff;
    // Secondary: relevance score from the search engine
    const relDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (relDiff !== 0) return relDiff;
    // Tertiary: download count (popularity)
    const dlDiff = (b.downloads || 0) - (a.downloads || 0);
    if (dlDiff !== 0) return dlDiff;
    // Quaternary: rating
    return (b.rating || 0) - (a.rating || 0);
  });
}

function updateSimsSearchHints() {
  if (!simsSearchHints) return;
  simsSearchHints.hidden = true;
  simsSearchHints.innerHTML = "";
}

function renderSimsSearchIdle() {
  simsHasSearched = false;
  simsVisibleResults = [];
  simsCurrentPage = 1;
  if (simsBrowserAddress) simsBrowserAddress.textContent = "modguard://sims/search";
  updateSimsSearchHints();
  updateMgStats();
  if (!simsBrowserScreen) return;
  if (els.dashboardView?.classList.contains("mg-shell")) {
    paintSimsModGrid(getSimsBrowseItems(activeSimsCatPill), { reset: true });
    return;
  }
  simsBrowserScreen.innerHTML = `
    <div class="browser-empty search-idle-panel">
      <strong>${escapeHtml(tt("ui.searchIdleTitle"))}</strong>
      <span class="search-idle-sub">${escapeHtml(tt("ui.searchIdleSub"))}</span>
    </div>
  `;
}

function renderSimsSearchSkeleton() {
  if (!simsBrowserScreen) return;
  simsBrowserScreen.innerHTML = `
    <div class="mod-grid-skeleton" aria-busy="true" aria-label="Indlæser">
      ${Array.from({ length: 12 }, () => `<div class="mod-card-skeleton"></div>`).join("")}
    </div>
  `;
}

function simsThumbDataUrl(itemOrPlatform, query) {
  const platform = SIMS_SEARCH_PLATFORMS.find((entry) => entry.key === itemOrPlatform?.platformKey || entry.key === itemOrPlatform?.sourceKey) || itemOrPlatform;
  const [a, b] = Array.isArray(platform?.theme) ? platform.theme : ["#e8d0b8", "#6b4a32"];
  const rawTitle = String(itemOrPlatform?.title || query || "Sims CC");
  const titleText = rawTitle.replace(/[<>&"']/g, "").slice(0, 28);
  const tags = String(itemOrPlatform?.tags || "").toLowerCase();
  const intent = inferSimsIntent(query || lastSimsQuery || rawTitle) || inferSimsIntent(rawTitle);
  const isAdult = itemOrPlatform?.adult === true || itemOrPlatform?.adult === "true";
  const isWW = /wicked.?whims|wickedwhims|\bwwcc\b/i.test(rawTitle + " " + tags);
  // Category-specific palettes and emoji icons
  const CATEGORY_THEMES = {
    hair:        { c1: "#1a0a2e", c2: "#6b21a8", c3: "#c084fc", emoji: "💇", label: "HAIR CC" },
    clothes:     { c1: "#0f172a", c2: "#1e40af", c3: "#60a5fa", emoji: "👗", label: "CLOTHES CC" },
    makeup:      { c1: "#1f0014", c2: "#be185d", c3: "#f472b6", emoji: "💄", label: "MAKEUP CC" },
    poses:       { c1: "#0c1a0f", c2: "#15803d", c3: "#4ade80", emoji: "📸", label: "POSES" },
    accessories: { c1: "#1c0a00", c2: "#b45309", c3: "#fbbf24", emoji: "💍", label: "ACCESSORIES" },
    buildbuy:    { c1: "#0a0a1c", c2: "#1d4ed8", c3: "#93c5fd", emoji: "🏠", label: "BUILD & BUY" },
    gameplay:    { c1: "#0c0c0c", c2: "#374151", c3: "#9ca3af", emoji: "🎮", label: "MOD" },
    utility:     { c1: "#0f1a0a", c2: "#166534", c3: "#86efac", emoji: "🔧", label: "UTILITY MOD" },
    kids:        { c1: "#1a0a1a", c2: "#7c3aed", c3: "#c4b5fd", emoji: "🧸", label: "KIDS CC" },
    adult:       { c1: "#1a0505", c2: "#991b1b", c3: "#fca5a5", emoji: "🔞", label: "ADULT MOD" },
    wwcc:        { c1: "#1a001a", c2: "#7c2d92", c3: "#e879f9", emoji: "🌹", label: "WW CC" },
  };
  let theme = CATEGORY_THEMES.gameplay;
  if (isWW && isAdult) theme = CATEGORY_THEMES.wwcc;
  else if (isAdult) theme = CATEGORY_THEMES.adult;
  else if (intent === "hair" || tags.includes("hair-cc")) theme = CATEGORY_THEMES.hair;
  else if (intent === "clothes" || tags.includes("clothes-cc")) theme = CATEGORY_THEMES.clothes;
  else if (intent === "makeup" || tags.includes("makeup-cc")) theme = CATEGORY_THEMES.makeup;
  else if (intent === "poses" || tags.includes("poses")) theme = CATEGORY_THEMES.poses;
  else if (tags.includes("accessories-cc")) theme = CATEGORY_THEMES.accessories;
  else if (intent === "buildbuy" || tags.includes("buildbuy") || tags.includes("build buy") || tags.includes("furniture")) theme = CATEGORY_THEMES.buildbuy;
  else if (tags.includes("utility mod") || tags.includes("fix") || tags.includes("utility")) theme = CATEGORY_THEMES.utility;
  else if (tags.includes("kids-cc")) theme = CATEGORY_THEMES.kids;
  else if (itemOrPlatform?.type === "mods") theme = CATEGORY_THEMES.gameplay;
  else if (Array.isArray(platform?.theme)) {
    theme = { c1: b, c2: a, c3: "#fff", emoji: "✨", label: "CC" };
  }
  const { c1, c2, c3, emoji, label } = theme;
  const shortTitle = titleText.length > 22 ? titleText.slice(0, 20) + "…" : titleText;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
      <linearGradient id="glow" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stop-color="${c3}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${c3}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="480" height="480" fill="url(#bg)"/>
    <ellipse cx="240" cy="160" rx="200" ry="140" fill="url(#glow)"/>
    <rect x="0" y="360" width="480" height="120" fill="${c2}" opacity="0.4"/>
    <text x="240" y="200" text-anchor="middle" font-family="-apple-system,Arial,sans-serif" font-size="110" fill="${c3}" opacity="0.9">${emoji}</text>
    <rect x="20" y="360" width="440" height="2" fill="${c3}" opacity="0.3"/>
    <text x="240" y="405" text-anchor="middle" font-family="-apple-system,Arial,sans-serif" font-size="18" font-weight="800" fill="${c3}" opacity="0.7" letter-spacing="3">${label}</text>
    <text x="240" y="445" text-anchor="middle" font-family="-apple-system,Arial,sans-serif" font-size="21" font-weight="700" fill="#fff">${shortTitle}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function renderPreviewBlock(item, url, className = "result-thumb") {
  const previewUrl = getItemPreviewUrl(item);
  return `
    <button class="${className} result-thumb-button verified-preview" type="button" style="background-image:url('${escapeHtml(previewUrl)}')" data-open-sims-title="${escapeHtml(item.title)}" data-open-sims-url="${escapeHtml(url)}" aria-label="Preview ${escapeHtml(item.title)}"></button>
  `;
}

function scoreSimsItem(item, query) {
  const q = normalizeSearchText(query);
  const tokens = q.split(" ").filter((token) => token.length > 1 && !["sims", "the"].includes(token));
  const haystack = normalizeSearchText(`${item.title} ${item.platform} ${item.note} ${item.tags}`);
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += token.length > 4 ? 4 : 2;
    if (token.length > 5 && haystack.split(" ").some((word) => word.startsWith(token.slice(0, 5)))) score += 1;
  }
  if (haystack.includes("popular") || haystack.includes("must")) score += 1;
  return score;
}

function modFitScoreSimsItem(item, query) {
  let score = scoreSimsItem(item, query);
  if (itemMatchesIntent(item, query)) score += 10;
  return score;
}

const MOD_FIT_QUESTIONS_SIMS = [
  {
    id: "vibe",
    question: "🎮 Hvad er din Sims 4 spillestil?",
    options: [
      { value: "realistic", label: "🏠 Realistisk hverdagsliv — familie, karriere, drama" },
      { value: "fantasy",   label: "🧙 Fantasy & magi — hekse, vampyrer, overnaturligt" },
      { value: "aesthetic", label: "✨ Ren æstetik — CC, hår, tøj og skønhed" },
      { value: "builder",   label: "🏗️ Bygger & designer — interiør og arkitektur" },
      { value: "story",     label: "📖 Storytelling & legacy — generationer og drama" },
    ],
  },
  {
    id: "content",
    question: "🔍 Hvad leder du specifikt efter?",
    options: [
      { value: "hair",      label: "💇 Hår & frisurer (CC)" },
      { value: "clothes",   label: "👗 Tøj, sko & outfits (CC)" },
      { value: "makeup",    label: "💄 Makeup, skin & overlays (CC)" },
      { value: "furniture", label: "🛋️ Møbler & indretning (Build/Buy)" },
      { value: "gameplay",  label: "🎮 Gameplay & script mods" },
      { value: "poses",     label: "📸 Poses & animationer (CC)" },
    ],
  },
  {
    id: "style",
    question: "🎨 Hvilken visuel stil passer dig?",
    options: [
      { value: "maxis",    label: "🎨 Maxis Match — klassisk Sims-look, ingen over-details" },
      { value: "alpha",    label: "🔬 Alpha / Realistisk — high-detail og virkelighedstro" },
      { value: "kawaii",   label: "🌸 Kawaii & pasteller — sødt, rundt og farverigt" },
      { value: "dark",     label: "🖤 Mørk & dramatisk — gotisk, vampyrer, dark academia" },
    ],
  },
  {
    id: "packs",
    question: "📦 Hvilke Sims 4 packs har du installeret?",
    options: [
      { value: "base",  label: "📦 Kun base game — ingen packs" },
      { value: "some",  label: "📦📦 Nogle få packs" },
      { value: "many",  label: "📦📦📦 Mange packs (5+)" },
      { value: "all",   label: "💎 Næsten alle packs — stor samling" },
    ],
  },
  {
    id: "focus",
    question: "⭐ Hvad er vigtigst for dig?",
    options: [
      { value: "popular",     label: "⭐ Populært & velafprøvet — mange downloads" },
      { value: "lightweight", label: "⚡ Let på performance — ingen lag" },
      { value: "unique",      label: "💎 Unikt & anderledes — skiller sig ud" },
      { value: "story",       label: "📖 Historiefortælling — dybde og storytelling" },
    ],
  },
];

let modFitStepSims = 0;
let modFitAnswersSims = {};
let modFitShowingResultSims = false;

function resetModFitQuizSims() {
  modFitStepSims = 0;
  modFitAnswersSims = {};
  modFitShowingResultSims = false;
}

function modFitBuildQuerySims(answers) {
  const parts = [];
  // Vibe / play style
  const vibeTerms = {
    realistic: "gameplay family career realistic traits school",
    fantasy:   "fantasy magic supernatural vampire witch occult",
    aesthetic: "hair clothes outfit makeup skin overlay cas",
    builder:   "build buy furniture kitchen bedroom bathroom decor",
    story:     "family legacy story generations relationship career",
  };
  if (answers.vibe && vibeTerms[answers.vibe]) parts.push(vibeTerms[answers.vibe]);
  // Specific content type
  const contentTerms = {
    hair:      "hair hairstyle cas hair-cc",
    clothes:   "clothes outfit clothing dress shoes cas clothes-cc",
    makeup:    "makeup skin overlay lashes freckles blush cas makeup-cc",
    furniture: "build buy furniture kitchen decor buildbuy",
    gameplay:  "gameplay mod traits career script",
    poses:     "pose animation emote poses",
  };
  if (answers.content && contentTerms[answers.content]) parts.push(contentTerms[answers.content]);
  // Visual style
  const styleTerms = {
    maxis:   "maxis match default classic",
    alpha:   "alpha realistic detailed skin",
    kawaii:  "kawaii cute pastel soft",
    dark:    "dark gothic vampire maxis dark academia",
  };
  if (answers.style && styleTerms[answers.style]) parts.push(styleTerms[answers.style]);
  // Pack level
  if (answers.packs === "base")  parts.push("base game only no packs");
  if (answers.packs === "all")   parts.push("all packs expansion");
  // Priority focus
  if (answers.focus === "popular")     parts.push("popular must have downloads");
  if (answers.focus === "unique")      parts.push("unique custom standout");
  if (answers.focus === "lightweight") parts.push("performance lightweight utility fix");
  if (answers.focus === "story")       parts.push("family story legacy generations");
  return parts.join(" ").trim();
}

function pickModFitMatchesSims(query, count = 3) {
  const pool = getSimsBrowseItems("all").filter((item) => !item.adult || (adultContentEnabled && adultContentConfirmed));
  if (!pool.length) return [];
  const score = (item) => modFitScoreSimsItem(item, query);
  const ranked = (rows) =>
    rows
      .map((item) => ({ item, score: score(item) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || (b.item.downloads || 0) - (a.item.downloads || 0));
  let matches = ranked(pool.filter((item) => itemMatchesIntent(item, query)));
  if (matches.length < count) matches = ranked(pool);
  if (!matches.length) {
    const popular = [...pool].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    return popular.slice(0, count).map((item) => ({ item, score: 1 }));
  }
  // Deduplicate by subcategory so we get variety
  const seen = new Set();
  const diverse = [];
  for (const m of matches) {
    const key = m.item.subcategory || m.item.type;
    if (!seen.has(key)) { seen.add(key); diverse.push(m); }
    if (diverse.length >= count) break;
  }
  // If not enough diverse results, pad from full list
  for (const m of matches) {
    if (diverse.length >= count) break;
    if (!diverse.some((d) => d.item === m.item)) diverse.push(m);
  }
  return diverse.slice(0, count);
}

function renderModFitQuizStepSims() {
  const quiz = document.getElementById("modFitQuiz");
  const progress = document.getElementById("modFitProgress");
  const results = document.getElementById("modFitResults");
  const lead = document.getElementById("modFitLead");
  const back = document.getElementById("modFitBack");
  const next = document.getElementById("modFitNext");
  const nav = document.querySelector(".mod-fit-nav");
  if (!quiz || modFitShowingResultSims) return;

  const total = MOD_FIT_QUESTIONS_SIMS.length;
  const q = MOD_FIT_QUESTIONS_SIMS[modFitStepSims];
  if (!q) return;

  if (results) {
    results.hidden = true;
    results.innerHTML = "";
  }
  quiz.hidden = false;
  if (nav) nav.hidden = false;
  if (progress) progress.textContent = `Step ${modFitStepSims + 1} of ${total}`;
  if (lead) lead.textContent = q.question;

  quiz.innerHTML = q.options
    .map(
      (opt) => `
    <button type="button" class="mod-fit-option${modFitAnswersSims[q.id] === opt.value ? " selected" : ""}" data-mod-fit-qid="${escapeHtml(q.id)}" data-mod-fit-value="${escapeHtml(opt.value)}">
      ${escapeHtml(opt.label)}
    </button>`,
    )
    .join("");

  quiz.querySelectorAll(".mod-fit-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-mod-fit-qid");
      const value = btn.getAttribute("data-mod-fit-value");
      if (!qid || !value) return;
      modFitAnswersSims[qid] = value;
      quiz.querySelectorAll(".mod-fit-option").forEach((el) => el.classList.toggle("selected", el === btn));
      if (next) next.disabled = false;
    });
  });

  if (back) back.hidden = modFitStepSims === 0;
  if (next) {
    next.textContent = modFitStepSims === total - 1 ? "See my match" : "Next";
    next.disabled = !modFitAnswersSims[q.id];
  }
}

function showModFitResultSims() {
  const quiz = document.getElementById("modFitQuiz");
  const results = document.getElementById("modFitResults");
  const progress = document.getElementById("modFitProgress");
  const lead = document.getElementById("modFitLead");
  const nav = document.querySelector(".mod-fit-nav");
  if (!results) return;

  modFitShowingResultSims = true;
  const query = modFitBuildQuerySims(modFitAnswersSims);
  const matches = pickModFitMatchesSims(query, 3);

  if (quiz) quiz.hidden = true;
  if (nav) nav.hidden = true;
  if (progress) progress.textContent = "🎯 Dine bedste matches";
  if (lead) lead.textContent = "Baseret på dine svar — her er de bedste CC / mods til dig:";

  results.hidden = false;
  if (!matches.length) {
    results.innerHTML =
      '<p class="mod-fit-empty">Ingen match fundet. Prøv quizzen igen eller søg manuelt.</p><button type="button" class="mod-fit-retake" id="modFitRetake">Tag quizzen igen</button>';
    document.getElementById("modFitRetake")?.addEventListener("click", () => {
      resetModFitQuizSims();
      renderModFitQuizStepSims();
    });
    return;
  }

  const matchHtml = matches.map(({ item }, idx) => {
    const previewUrl = getItemPreviewUrl(item, query);
    const thumb = /^https:\/\//i.test(previewUrl) ? previewUrl : simsThumbDataUrl(item, item.title);
    const platform = escapeHtml(String(item.platform || "Sims 4"));
    const reason = escapeHtml(String(item.note || "Populær i vores katalog.").slice(0, 100));
    const catLabel = escapeHtml(String(item.subcategory || item.type || "CC").toUpperCase());
    const isBest = idx === 0;
    return `
    <article class="mod-fit-match-hero${isBest ? " mod-fit-hero-primary" : ""}" data-mod-fit-idx="${idx}">
      <div class="mod-fit-thumb-wrap">
        <img class="mod-fit-result-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title)}" loading="lazy"
             onerror="this.src='${escapeHtml(simsThumbDataUrl(item, item.title))}'" />
        ${isBest ? '<span class="mod-fit-best-badge">⭐ Bedste match</span>' : ""}
      </div>
      <div class="mod-fit-hero-body">
        <span class="mod-fit-cat-tag">${catLabel}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="mod-fit-platform">${platform}</p>
        <p class="mod-fit-reason">${reason}</p>
        <div class="mod-fit-match-actions">
          <button type="button" class="mod-fit-next mod-fit-use-btn" data-mod-fit-use="${escapeHtml(item.title)}">🔍 Søg dette</button>
          <button type="button" class="mod-fit-back mod-fit-view-btn" data-mod-fit-idx="${idx}">👁 Preview</button>
        </div>
      </div>
    </article>`;
  }).join("");

  results.innerHTML = `
    <div class="mod-fit-matches-grid">${matchHtml}</div>
    <button type="button" class="mod-fit-retake" id="modFitRetake">🔄 Tag quizzen igen</button>`;

  results.querySelectorAll(".mod-fit-use-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const title = btn.getAttribute("data-mod-fit-use");
      closeModFitModal();
      if (simsSearchInput) simsSearchInput.value = title;
      runSimsSearch(title);
      document.querySelector(".mg-results-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  results.querySelectorAll(".mod-fit-view-btn").forEach((btn) => {
    const idx = Number(btn.getAttribute("data-mod-fit-idx") || 0);
    btn.addEventListener("click", () => openPreviewZoom(matches[idx]?.item, query));
  });
  document.getElementById("modFitRetake")?.addEventListener("click", () => {
    resetModFitQuizSims();
    renderModFitQuizStepSims();
  });
}

function modFitAdvanceSims() {
  if (modFitShowingResultSims) return;
  const q = MOD_FIT_QUESTIONS_SIMS[modFitStepSims];
  if (!q || !modFitAnswersSims[q.id]) return;
  if (modFitStepSims < MOD_FIT_QUESTIONS_SIMS.length - 1) {
    modFitStepSims += 1;
    renderModFitQuizStepSims();
    return;
  }
  showModFitResultSims();
}

function modFitBackSims() {
  if (modFitShowingResultSims) {
    resetModFitQuizSims();
    renderModFitQuizStepSims();
    return;
  }
  if (modFitStepSims > 0) {
    modFitStepSims -= 1;
    renderModFitQuizStepSims();
  }
}

function openModFitModal() {
  const overlay = document.getElementById("modFitOverlay");
  if (!overlay) return;
  resetModFitQuizSims();
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  renderModFitQuizStepSims();
}

function closeModFitModal() {
  const overlay = document.getElementById("modFitOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  resetModFitQuizSims();
}

let modFitListenersBoundSims = false;
function bindModFitListenersSims() {
  if (modFitListenersBoundSims) return;
  modFitListenersBoundSims = true;
  document.getElementById("mgModFitBtn")?.addEventListener("click", openModFitModal);
  document.getElementById("modFitClose")?.addEventListener("click", closeModFitModal);
  document.getElementById("modFitNext")?.addEventListener("click", modFitAdvanceSims);
  document.getElementById("modFitBack")?.addEventListener("click", modFitBackSims);
  document.getElementById("modFitOverlay")?.addEventListener("click", (e) => {
    if (e.target?.id === "modFitOverlay") closeModFitModal();
  });
}


function inferSimsIntent(query) {
  const text = normalizeSearchText(query);
  const has = (pattern) => pattern.test(text);
  // ── Named-mod bypasses: specific well-known mods are never over-filtered ──
  if (has(/\bwicked.?whims?\b|\bwickedwhims?\b|\bww\s+cc\b|\bwwcc\b|\bturbodriver\b/)) return "ww";
  if (has(/\bbasemental\b/)) return "adult";
  if (has(/\bmccc\b|\bmc.?command.?center\b/)) return ""; // no intent — show all gameplay mods
  if (has(/\bwonderful.?whims?\b/)) return ""; // no intent — show as gameplay mod
  // ── CC sub-categories ────────────────────────────────────────────────────
  if (has(/\b(hair|blonde|curly|ponytail|straight|waves|frisure|haar|har|malehair|femalehair|braids?|afro|fade|undercut|bob|updo|messy.?bun)\b/)) return "hair";
  if (has(/\b(clothes|clothing|outfit|dress|jeans|shoes|sneakers?|boots?|coats?|jacket|skirt|shirt|tops?|toj|toej|swimwear|bikini|hoodie)\b/)) return "clothes";
  if (has(/\b(makeup|skin|overlay|lashes?|freckles?|eyeshadow|blush|lipstick|foundation|highlighter|contour)\b/)) return "makeup";
  if (has(/\b(pose|poses|posing|screenshot|animation)\b/)) return "poses";
  if (has(/\b(jewelry|necklace|earrings?|ring|hat|beanie|cap|bag|purse|clutch|glasses|sunglasses|accessories)\b/)) return "accessories";
  if (has(/\b(build|buy|furniture|kitchen|bedroom|bathroom|clutter|decor|koekken|mobler|moebler|sofa|chair|table|lamp|rug|curtain)\b/)) return "buildbuy";
  if (has(/\b(gameplay|career|school|family|relationship|traits|script.?mod|simulation)\b/)) return "gameplay";
  if (has(/\b(infant|toddler|baby|kids|child|children)\b/)) return "kids";
  return "";
}

const RENDERER_FEMALE_SIGNALS = /\b(pigtails?|twintails?|princess|queen|bride|bridal|mermaid|boho|veil|updo|chignon|space buns?|prom hair|yf hair|yf cc|female hair|girl hair|lady hair|women hair)\b/i;
const RENDERER_MALE_SIGNALS = /\b(buzz ?cut|fade|undercut|mohawk|faux ?hawk|man ?bun|beard|stubble|crew ?cut|taper|quiff|slick ?back|comb ?over|ym hair|ym cc|male hair|man hair|boy hair|mens? hair|masculine hair)\b/i;

function itemMatchesIntent(item, query) {
  const intent = inferSimsIntent(query);
  if (!intent) return true;
  const contentHaystack = normalizeSearchText(`${item.title} ${item.note || ""}`);
  const fullHaystack = normalizeSearchText(`${item.title} ${item.tags} ${item.note || ""}`);
  const titleLower = String(item.title || "").toLowerCase();
  const clothingWords =
    /\b(clothes|clothing|outfit|dress|jeans|shoes|top|skirt|pants|shirt|jacket|coat|swatch|mesh|bodysuit|lingerie|bikini|swimwear|underwear|socks|heels|boots)\b/;

  // ── Wicked Whims — show ONLY WW items ────────────────────────────────────
  if (intent === "ww") {
    return /wicked.?whims|wickedwhims|\bwwcc\b|\bww\b.*cc|turbodriver/i.test(fullHaystack);
  }
  // ── Adult intent — show ONLY adult-flagged items ──────────────────────────
  if (intent === "adult") {
    return !!item.adult;
  }
  // ── Hair ─────────────────────────────────────────────────────────────────
  if (intent === "hair") {
    const isHair = /\bhair\b|\bblonde\b|\bcurly\b|\bponytail\b|\bwaves\b|\bfrisure\b|\bhaar\b|\bhar\b|\bbraids?\b|\bafro\b|\bfade\b|\bundercut\b|\bbob\b|\bupdo\b/.test(fullHaystack);
    if (!isHair || clothingWords.test(contentHaystack)) return false;
    const gender = inferSearchGender(query);
    if (gender === "male") {
      const hasFemale = /\b(female|women|woman|girls?|yf\b|feminine|femalehair|yfhair)\b/.test(contentHaystack) || RENDERER_FEMALE_SIGNALS.test(titleLower);
      if (hasFemale) return false;
      const hasMale = /\b(male|men\b|man\b|boys?\b|ym\b|masculine|masc|malehair|ymhair)\b/.test(contentHaystack) || RENDERER_MALE_SIGNALS.test(titleLower);
      if (!hasMale) return false;
    }
    if (gender === "female") {
      const hasMale = /\b(male|men\b|man\b|boys?\b|ym\b|masculine|malehair|ymhair)\b/.test(contentHaystack) || RENDERER_MALE_SIGNALS.test(titleLower);
      if (hasMale) return false;
    }
    return !/\btoddler\b|\binfant\b|\bbaby\b|\bkids\b|\bhorse\b|\bequine\b|\bfurniture\b|\bbuild\b|\bgameplay\b/.test(contentHaystack);
  }
  // ── Clothes ───────────────────────────────────────────────────────────────
  if (intent === "clothes") {
    const gender = inferSearchGender(query);
    if (gender === "male") {
      if (/\b(female|women|woman|girls?|feminine)\b/.test(contentHaystack)) return false;
      if (/\b(dress|skirt|lingerie|bikini|swimwear|blouse|corset)\b/.test(titleLower)) return false;
    }
    return /\bclothes\b|\bclothing\b|\boutfit\b|\bdress\b|\bjeans\b|\bshoes\b|\bsneakers?\b|\bboots?\b|\bcoats?\b|\bjacket\b|\bswimwear\b/.test(fullHaystack) &&
      !/\bhair\b|\btoddler\b|\binfant\b|\bbaby\b|\bhorse\b|\bequine\b|\bfurniture\b|\bbuild\b/.test(contentHaystack);
  }
  // ── Makeup & skin ─────────────────────────────────────────────────────────
  if (intent === "makeup") {
    return /\bmakeup\b|\bskin\b|\boverlay\b|\blash|\bfreckle|\beyeshadow|\bblush|\blipstick|\bfoundation|\bhighlighter/.test(fullHaystack) &&
      !item.adult;
  }
  // ── Poses & animations ────────────────────────────────────────────────────
  if (intent === "poses") {
    return /\bpose\b|\bposing\b|\bposes\b|\banimation\b/.test(fullHaystack);
  }
  // ── Accessories ───────────────────────────────────────────────────────────
  if (intent === "accessories") {
    return /\bjewelry\b|\bnecklace\b|\bearring|\bhat\b|\bbag\b|\bpurse\b|\baccessory\b|\baccessories\b|\bglasses\b|\bsunglasses\b/.test(fullHaystack);
  }
  // ── Build & Buy ───────────────────────────────────────────────────────────
  if (intent === "buildbuy") return /\bbuild\b|\bbuy\b|\bfurniture\b|\bkitchen\b|\bbedroom\b|\bbathroom\b|\bclutter\b|\bdecor\b/.test(fullHaystack);
  // ── Gameplay mods — allow ALL mods (not just ones with "gameplay" in text) ─
  if (intent === "gameplay") return item.type === "mods" && !item.adult;
  // ── Kids ─────────────────────────────────────────────────────────────────
  if (intent === "kids") return /\binfant\b|\btoddler\b|\bbaby\b|\bkids\b|\bchild\b|\bchildren\b/.test(fullHaystack);
  return true;
}

function getSimsResults(query, platformKey = "") {
  const normalized = normalizeSimsQuery(query);
  const allowedSources = activeSimsSources.has("all") ? null : activeSimsSources;
  const base = SIMS_SEARCH_ITEMS.filter((item) => {
    // Adult gating: adult items only visible when adult content is enabled + confirmed
    const adultOk = !item.adult || (adultContentEnabled && adultContentConfirmed);
    if (!adultOk) return false;
    const sub = item.subcategory || "";
    const modeOk =
      simsSearchMode === "cc"        ? (item.type === "cc" && !item.adult) :
      simsSearchMode === "mods"      ? (item.type === "mods" && !item.adult) :
      simsSearchMode === "gameplay"  ? (item.category === "gameplay" && !item.adult) :
      simsSearchMode === "buildbuy"  ? (item.category === "buildbuy") :
      simsSearchMode === "hair"      ? (sub === "hair") :
      simsSearchMode === "clothes"   ? (sub === "clothes") :
      simsSearchMode === "makeup"    ? (sub === "makeup") :
      simsSearchMode === "poses"     ? (sub === "poses") :
      simsSearchMode === "accessories" ? (sub === "accessories") :
      simsSearchMode === "kids"      ? (sub === "kids") :
      simsSearchMode === "utility"   ? (item.type === "mods" && (sub === "utility" || /utility|fix|performance/.test(item.tags)) && !item.adult) :
      simsSearchMode === "adult"     ? (item.adult === true) :
      simsSearchMode === "wwcc"      ? (sub === "wwcc") :
      item.type === simsSearchMode;
    const sourceOk = !allowedSources || allowedSources.has(item.platform);
    return modeOk && sourceOk && itemMatchesIntent(item, normalized);
  });
  const scoped = platformKey ? base.filter((item) => item.platformKey === platformKey) : base;
  const scored = scoped
    .map((item) => ({ item, score: scoreSimsItem(item, normalized) }))
    .filter((entry) => entry.score > 0 || !String(query || "").trim() || platformKey);
  const results = scored.length ? scored : base.map((item) => ({ item, score: 0 }));
  const sort = simsSortSelect?.value || "relevance";
  return results.sort((a, b) => {
    if (sort === "newest") return b.item.dateScore - a.item.dateScore;
    if (sort === "popular") return b.item.downloads - a.item.downloads;
    if (sort === "site") return a.item.platform.localeCompare(b.item.platform) || a.item.title.localeCompare(b.item.title);
    return b.score - a.score || b.item.downloads - a.item.downloads || a.item.title.localeCompare(b.item.title);
  }).map((entry) => entry.item);
}

function platformForItem(item) {
  return SIMS_SEARCH_PLATFORMS.find((entry) => entry.key === item?.platformKey || entry.key === item?.sourceKey || entry.name === item?.source) || SIMS_SEARCH_PLATFORMS[0];
}

async function renderSimsSearch(query, page = simsCurrentPage) {
  if (!simsBrowserScreen) return;
  const raw = String(query || "").trim();
  if (!raw) {
    renderSimsSearchIdle();
    return;
  }
  simsHasSearched = true;
  updateSimsSearchHints();
  simsCurrentPage = Math.max(1, Math.min(100, Number(page || 1)));
  lastSimsQuery = raw;
  if (simsBrowserAddress) simsBrowserAddress.textContent = `modguard://sims/search/${simsSearchMode}/${displaySimsQuery(raw)}/page/${simsCurrentPage}`;
  renderSimsSearchSkeleton();
  const sources = activeSimsSources.has("all") ? [] : Array.from(activeSimsSources);
  let payload = null;
  try {
    payload = await ipcRenderer.invoke("modsearch-search", {
      query: raw,
      mode: simsSearchMode,
      page: simsCurrentPage,
      sort: simsSortSelect?.value || "relevance",
      priceFilter: simsPriceFilter?.value || "all",
      timeFilter: simsTimeFilter?.value || "all",
      ratingFilter: simsRatingFilter?.value || "all",
      sources,
      includeAdult: adultContentEnabled && adultContentConfirmed,
    });
  } catch (err) {
    simsBrowserScreen.innerHTML = `
      <div class="browser-empty">
        <strong>Søgningen kunne ikke gennemføres</strong>
        <span>${escapeHtml(err?.message || String(err))}</span>
      </div>
    `;
    return;
  }
  const q = payload?.normalizedQuery || normalizeSimsQuery(raw);
  let results = Array.isArray(payload?.results) ? payload.results : [];
  const searchIntent = payload?.intent || inferSimsIntent(raw);
  if (searchIntent) {
    results = results.filter((item) => itemMatchesIntent(item, raw));
  }
  results = sortResultsByPreviewQuality(results);
  results = applyRatingFilter(results);
  simsVisibleResults = results;
  if (els.dashboardView?.classList.contains("mg-shell")) {
    paintSimsModGrid(results, {
      reset: true,
      query: raw,
      estimatedTotal: Number(payload?.estimatedTotal || results.length),
    });
    applyDashboardI18n();
    initModLivePeek();
    return;
  }
  const totalPages = Math.max(1, Math.min(100, Number(payload?.totalPages || 1)));
  const estimatedTotal = Number(payload?.estimatedTotal || results.length);
  const provider = String(payload?.provider || "live");
  const databaseTotal = Number(payload?.databaseTotal || 0);
  const providerHint =
    provider === "development"
      ? "Demo — tilføj CURSEFORGE_API_KEY eller BRAVE_SEARCH_API_KEY for flere kilder"
      : databaseTotal > 0
        ? `Lokal database: ${databaseTotal.toLocaleString("da-DK")} mods · Live: ${provider.replace(/database\(\d+\)\+?/g, "").replace(/\+/g, ", ")}`
        : `Kilder: ${provider.replace(/\+/g, ", ")}`;
  const label = simsSearchMode === "cc"
    ? "Alle fundne CC-resultater"
    : simsSearchMode === "mods"
      ? "Alle fundne mod-resultater"
      : simsSearchMode === "gameplay"
        ? "Alle fundne gameplay-resultater"
        : "Alle fundne Build/Buy-resultater";
  const pageButtons = Array.from({ length: Math.min(7, totalPages) }, (_, index) => {
    const pageNo = Math.max(1, Math.min(totalPages, simsCurrentPage - 3 + index));
    return pageNo;
  }).filter((value, index, arr) => arr.indexOf(value) === index);
  if (!simsSelectedModId && results[0]) simsSelectedModId = String(results[0].id || results[0].title || "");
  const selectedItem = results.find((item) => String(item.id || item.title) === simsSelectedModId) || results[0] || null;
  const sort = simsSortSelect?.value || "relevance";
  const gridClass = simsGridListView === "list" ? "mod-grid list-view" : "mod-grid";
  const rawWords = displaySimsQuery(raw).split(/\s+/).filter(Boolean);
  const hashtagHtml = rawWords.map((w) => `<span class="search-tag-chip">#${escapeHtml(w)}</span>`).join(" ");
  simsBrowserScreen.innerHTML = `
    <div class="results-toolbar-mockup">
      <h2>Resultater for: ${hashtagHtml}</h2>
      <div class="results-filter-pills" role="group" aria-label="Sortering">
        <button type="button" class="filter-pill active" data-sort-pill="count">Alle resultater ${estimatedTotal.toLocaleString("da-DK")}</button>
        <button type="button" class="filter-pill-btn ${sort === "relevance" ? "active" : ""}" data-sort-pill="relevance">Mest relevante</button>
        <button type="button" class="filter-pill-btn ${sort === "newest" ? "active" : ""}" data-sort-pill="newest">Nyeste</button>
        <button type="button" class="filter-pill-btn ${sort === "popular" ? "active" : ""}" data-sort-pill="popular">Mest populære</button>
        <button type="button" class="filter-pill-btn" data-sort-pill="source" title="${escapeHtml(providerHint)}">Kilde (Alle)</button>
        <div class="view-toggle" role="group" aria-label="Visning" style="margin-left:auto;">
          <button type="button" class="${simsGridListView === "grid" ? "active" : ""}" data-sims-view="grid" title="Gitter">▦</button>
          <button type="button" class="${simsGridListView === "list" ? "active" : ""}" data-sims-view="list" title="Liste">☰</button>
        </div>
      </div>
    </div>
    <div class="${gridClass}" id="simsSearchResults">
      ${results.map((item) => renderModCard(item, q, String(item.id || item.title) === String(selectedItem?.id || selectedItem?.title))).join("")}
    </div>
    <div class="sims-pagination">
      <button type="button" data-sims-page="${Math.max(1, simsCurrentPage - 1)}" ${simsCurrentPage <= 1 ? "disabled" : ""}>‹</button>
      ${pageButtons.map((pageNo) => `<button type="button" class="${pageNo === simsCurrentPage ? "active" : ""}" data-sims-page="${pageNo}">${pageNo}</button>`).join("")}
      <span>...</span>
      <button type="button" data-sims-page="${totalPages}">${totalPages > 99 ? "143" : totalPages}</button>
      <button type="button" data-sims-page="${Math.min(totalPages, simsCurrentPage + 1)}" ${simsCurrentPage >= totalPages ? "disabled" : ""}>›</button>
    </div>
  `;
  applyDashboardI18n();
  void hydrateModCardPreviews();
  initModLivePeek();
  void enrichVisibleResultsBatch().then((enriched) => {
    if (!enriched?.length || !simsBrowserScreen?.querySelector("#simsSearchResults")) return;
    const sorted = sortResultsByPreviewQuality(applyRatingFilter(enriched));
    simsVisibleResults = sorted;
    const grid = simsBrowserScreen.querySelector("#simsSearchResults");
    if (!grid) return;
    const selId = simsSelectedModId;
    grid.innerHTML = sorted
      .map((item) => renderModCard(item, q, String(item.id || item.title) === String(selId)))
      .join("");
    void hydrateModCardPreviews();
    initModLivePeek();
  });
}

function renderSimsInternalPage(item, url) {
  if (!simsBrowserScreen) return;
  const platform = platformForItem(item);
  const q = normalizeSimsQuery(lastSimsQuery);
  const targetUrl = isAllowedModSearchUrl(url) ? url : platform.url(q);
  if (simsBrowserAddress) simsBrowserAddress.textContent = targetUrl;
  simsBrowserScreen.innerHTML = `
    <div class="internal-page browser-page">
      <webview class="sims-webview" src="${escapeHtml(targetUrl)}" allowpopups="false" muted></webview>
      <div class="internal-copy">
        <span class="mini-badge safe">${escapeHtml(platform.trust)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.note)}</p>
        <div class="download-flow">
          <span>1 Sandbox</span>
          <span>2 Scan</span>
          <span>3 Ren fil til modfolder</span>
          <span>Usikker fil blokeres</span>
        </div>
        <div class="internal-actions">
          <button type="button" class="open-result download-result" data-download-sims-title="${escapeHtml(item.title)}">Download via ModGuard</button>
          <button type="button" class="ghost-button" data-open-sims-url="${escapeHtml(targetUrl)}">Åbn original side</button>
        </div>
      </div>
    </div>
  `;
}

function renderSimsPlatform(platformName, query) {
  const platform = SIMS_SEARCH_PLATFORMS.find((entry) => normalizeSearchText(entry.name).includes(normalizeSearchText(platformName)));
  if (!platform || !simsBrowserScreen) {
    renderSimsSearch(query);
    return;
  }
  lastSimsQuery = query || lastSimsQuery;
  if (simsBrowserAddress) simsBrowserAddress.textContent = platform.url(normalizeSimsQuery(lastSimsQuery));
  const results = getSimsResults(lastSimsQuery, platform.key);
  simsBrowserScreen.innerHTML = `
    <div class="platform-page">
      <div>
        <span class="mini-badge safe">${escapeHtml(platform.trust)}</span>
        <h3>${escapeHtml(platform.name)}</h3>
        <p>${escapeHtml(platform.note)}</p>
      </div>
      <div class="search-results" id="simsSearchResults">
        ${results.map((item, idx) => {
          const url = platform.url(normalizeSimsQuery(lastSimsQuery));
          return `
            <div class="search-result">
              ${renderPreviewBlock(item, url)}
              <div class="result-top">
                <div>
                  <div class="result-title">${escapeHtml(item.title)}</div>
                  <div class="result-meta">${escapeHtml(item.note)}</div>
                </div>
                <button class="open-result" type="button" data-open-sims-title="${escapeHtml(item.title)}" data-open-sims-url="${escapeHtml(url)}">Åbn</button>
              </div>
              <div class="result-badges">
                <span class="mini-badge clean">Intern visning</span>
                <span class="mini-badge unknown">Scan ved download</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

const VALID_SIMS_MODES = ["cc","mods","gameplay","buildbuy","hair","clothes","makeup","poses","accessories","kids","utility","adult","wwcc"];
function setSimsSearchMode(mode) {
  simsSearchMode = VALID_SIMS_MODES.includes(mode) ? mode : "cc";
  for (const btn of simsModeButtons) {
    const active = btn?.dataset?.simsMode === simsSearchMode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (simsCategoryFilter) simsCategoryFilter.value = simsSearchMode;
  simsCurrentPage = 1;
  updateSimsSearchHints();
  const q = simsSearchInput?.value?.trim() || "";
  if (simsHasSearched && q) renderSimsSearch(q);
  else if (!q) renderSimsSearchIdle();
}

function getVisibleSimsItems() {
  const q = lastSimsQuery || simsSearchInput?.value || "";
  return simsVisibleResults.length ? simsVisibleResults : q ? getSimsResults(q) : [];
}

function runSimsSearch(query) {
  const raw = String(query ?? simsSearchInput?.value ?? "").trim();
  const q = raw.replace(/#/g, "").replace(/\s+/g, " ").trim();
  if (!q) {
    renderSimsSearchIdle();
    return;
  }
  lastSimsQuery = q;
  simsCurrentPage = 1;
  simsSelectedModId = "";
  updateSimsSearchHints();
  renderSimsSearch(q);
}

function applySimsHintQuery(text) {
  const hint = String(text || "").trim();
  if (!hint || !simsSearchInput) return;
  const tagged = hint.split(/\s+/).map((w) => (w.startsWith("#") ? w : "#" + w)).join(" ");
  simsSearchInput.value = tagged;
  simsSearchInput.focus();
  updateSimsSearchHints();
}

function setAdultModal(open) {
  adultConfirmModal?.classList.toggle("active", !!open);
  adultConfirmModal?.setAttribute("aria-hidden", open ? "false" : "true");
  if (open && adultConfirmCheck) adultConfirmCheck.checked = false;
}

function initLocaleFromStorage() {
  let saved = "";
  try {
    saved = String(localStorage.getItem("skimo_locale") || "").trim();
  } catch {
    saved = "";
  }

  if (saved && FLAG_TO_COUNTRY[saved]) {
    forcedLocale = saved;
    ipcRenderer.invoke("set-locale-preference", saved).catch(() => {});
    if (els.country && !state?.activated) {
      const c = FLAG_TO_COUNTRY[saved];
      if (c) els.country.value = c;
    }
    setLocale(saved);
  } else {
    setActiveFlag(COUNTRY_TO_FLAG[els.country?.value] || "da");
  }
}

function setActivationMessage(text, isError = false) {
  els.activationMessage.textContent = text || "";
  els.activationMessage.className = `hint${isError ? " error" : ""}`;
}

function setAuthMode(nextMode) {
  authMode = nextMode === "register" ? "register" : "login";
  els.loginModeBtn?.classList.toggle("active", authMode === "login");
  els.registerModeBtn?.classList.toggle("active", authMode === "register");
  const labelCode = document.getElementById("labelCode");
  if (els.activationIntro) {
    els.activationIntro.textContent =
      authMode === "register"
        ? "Opret en bruger med email og password, eller fortsæt som gæst."
        : "Log ind med email og password, eller fortsæt som gæst.";
  }
  if (labelCode) labelCode.textContent = "Password";
  if (els.code) {
    els.code.placeholder = authMode === "register" ? "Vælg et password" : "Indtast password";
    els.code.type = "password";
    els.code.autocomplete = authMode === "register" ? "new-password" : "current-password";
    els.code.spellcheck = false;
  }
  if (els.activateBtn) {
    els.activateBtn.textContent = authMode === "register" ? "Opret bruger" : "Log ind";
  }
  if (els.requestCodeBtn) {
    els.requestCodeBtn.style.display = "none";
  }
  setActivationMessage("");
}

function setMessage(text, isError = false) {
  if (!els.message) return;
  const msg = String(text || "").trim();
  els.message.textContent = msg;
  els.message.className = `hint hub-message${isError ? " error" : ""}`;
  if (msg) els.message.removeAttribute("hidden");
  else els.message.setAttribute("hidden", "");
}

function buildQrUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(raw)}`;
}

function appendLog(chunk) {
  if (!chunk) return;
  const text = typeof chunk === "string" ? chunk : String(chunk);
  els.log.textContent += text;
  if (!text.endsWith("\n")) els.log.textContent += "\n";
  els.log.scrollTop = els.log.scrollHeight;

  const maxChars = 60_000;
  if (els.log.textContent.length > maxChars) {
    els.log.textContent = els.log.textContent.slice(-maxChars);
  }
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso || "";
  }
}

function badgeClass(status) {
  if (status === "clean") return "clean";
  if (status === "virus") return "virus";
  if (status === "ignored") return "";
  return "error";
}

function badgeText(status) {
  if (status === "clean") return tt("ui.badgeClean");
  if (status === "virus") return tt("ui.badgeVirus");
  if (status === "scanning") return tt("ui.badgeScan");
  if (status === "ignored") return tt("ui.badgeIgnored");
  return tt("ui.badgeError");
}

function getRiskForHost(rawHost) {
  const host = String(rawHost || "").trim().toLowerCase().replace(/^www\./, "");
  if (!host) {
    return {
      level: "unknown",
      label: tt("ui.trustUnknown"),
      hint: tt("ui.trustUnknownHint"),
    };
  }

  const safeHosts = ["modthesims.info", "thesimsresource.com", "curseforge.com", "patreon.com", "ea.com"];
  const mediumHosts = [
    "simsfileshare.net",
    "tumblr.com",
    "blogspot.com",
    "github.com",
    "dropbox.com",
    "drive.google.com",
    "googleusercontent.com",
    "mediafire.com",
    "ko-fi.com",
  ];
  const unsafeHosts = ["linkvertise.com", "adf.ly", "bit.ly", "tinyurl.com", "ouo.io", "exe.io", "discordapp.com", "discord.com", "mega.nz"];

  const matchHost = (list) => list.some((entry) => host === entry || host.endsWith(`.${entry}`));

  if (matchHost(safeHosts)) {
    return { level: "safe", label: tt("ui.trustSafe"), hint: tt("ui.trustSafeHint") };
  }
  if (matchHost(unsafeHosts)) {
    return { level: "unsafe", label: tt("ui.trustUnsafe"), hint: tt("ui.trustUnsafeHint") };
  }
  if (matchHost(mediumHosts)) {
    return { level: "medium", label: tt("ui.trustMedium"), hint: tt("ui.trustMediumHint") };
  }
  return { level: "medium", label: tt("ui.trustMedium"), hint: tt("ui.trustMediumHint") };
}

function formatSourceText(item) {
  const host = String(item?.sourceHost || "").trim();
  return host || tt("ui.sourceUnknown");
}

function getAgeDays(iso) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function isBlockedStatus(status) {
  return status === "virus" || status === "error" || status === "ignored";
}

function renderEmptyCard(title) {
  return `<div class="empty-card"><div class="empty-copy">${escapeHtml(title)}</div></div>`;
}

function renderModCards(container, items, emptyText) {
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = renderEmptyCard(emptyText);
    return;
  }

  container.innerHTML = items
    .map((item) => {
      const fileName = item?.fileName || tt("ui.unknownFile");
      const meta = fmtDate(item?.at);
      const status = item?.status || "error";
      return `<div class="hub-file">
        <div>
          <div class="hub-file-name">${escapeHtml(fileName)}</div>
          <div class="hub-file-meta">${escapeHtml(meta)}</div>
        </div>
        <div class="hub-file-side">
          <span class="mini-badge ${badgeClass(status)}">${escapeHtml(badgeText(status))}</span>
        </div>
      </div>`;
    })
    .join("");
}

function mergeOutdatedLists(historyItems, scanItems) {
  const map = new Map();
  for (const item of [...(scanItems || []), ...(historyItems || [])]) {
    const key = String(item?.savedTo || item?.path || item?.fileName || "").trim();
    if (!key) continue;
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, ...item } : item);
  }
  return Array.from(map.values()).sort((a, b) => new Date(b?.at || 0) - new Date(a?.at || 0));
}

const MODS_HEALTH_DEMO = [
  {
    id: "demo-b1",
    category: "broken",
    fileName: "UI_Cheats_Extension_v1.45.package",
    displayName: "UI Cheats Extension",
    author: "weerbesu",
    problem: "Ikke kompatibel med patch 1.106",
    impact: "high",
    savedTo: "",
    at: new Date(Date.now() - 86400000 * 40).toISOString(),
  },
  {
    id: "demo-b2",
    category: "broken",
    fileName: "Basemental_Drugs_v7.18.package",
    displayName: "Basemental Drugs",
    author: "Basemental",
    problem: "Konflikt med UI Cheats Extension",
    impact: "medium",
    savedTo: "",
    at: new Date(Date.now() - 86400000 * 55).toISOString(),
  },
  {
    id: "demo-o1",
    category: "outdated",
    fileName: "WickedWhims_v185b.package",
    displayName: "WickedWhims",
    author: "TURBODRIVER",
    problem: "Muligvis outdated (62 dage)",
    risk: "medium",
    savedTo: "",
    at: new Date(Date.now() - 86400000 * 62).toISOString(),
  },
  {
    id: "demo-o2",
    category: "outdated",
    fileName: "MCCC_2024.6.0.package",
    displayName: "MC Command Center",
    author: "Deaderpool",
    problem: "Nyere version findes",
    risk: "low",
    savedTo: "",
    at: new Date(Date.now() - 86400000 * 90).toISOString(),
  },
];

let outdatedScanCache = [];
let modsHealthScanFull = null;
let modsHealthTab = "all";
let modsHealthExpand = { broken: false, outdated: false };

function inferModAuthor(item) {
  const display = String(item?.displayName || "").trim();
  if (display && display !== item?.fileName) {
    const fromDisplay = display.match(/\bby\s+(.+)$/i);
    if (fromDisplay) return fromDisplay[1].trim();
  }
  const name = String(item?.fileName || "");
  if (/ui\s*cheat/i.test(name)) return "weerbesu";
  if (/basemental/i.test(name)) return "Basemental";
  if (/wickedwhims/i.test(name)) return "TURBODRIVER";
  if (/mccc|mc\s*command/i.test(name)) return "Deaderpool";
  if (/slice\s*of\s*life/i.test(name)) return "KawaiiStacie";
  return "Creator";
}

function inferModDisplayName(item) {
  return (
    String(item?.displayName || "")
      .replace(/\.(package|ts4script)$/i, "")
      .trim() ||
    String(item?.fileName || "")
      .replace(/\.(package|ts4script)$/i, "")
      .replace(/^\d{10,}-/, "")
      .replace(/_/g, " ")
      .slice(0, 48) ||
    tt("ui.unknownFile")
  );
}

function classifyModHealthItem(file, outdatedByPath, blockedByPath) {
  const path = String(file?.savedTo || file?.path || "");
  if (blockedByPath.has(path) || isBlockedStatus(file?.status)) {
    return {
      ...file,
      category: "broken",
      problem: file?.message || file?.packageHint || "Virus eller blokeret fil",
      impact: "high",
    };
  }
  if (file?.isValidPackage === false) {
    return {
      ...file,
      category: "broken",
      problem: file?.packageHint || "Ugyldig eller korrupt .package",
      impact: "high",
    };
  }
  const outdatedInfo = outdatedByPath.get(path);
  if (outdatedInfo) {
    return {
      ...file,
      ...outdatedInfo,
      category: "outdated",
      problem: outdatedInfo.outdatedReason || "Muligvis outdated",
      risk: /Nyere version/i.test(outdatedInfo.outdatedReason || "") ? "medium" : "low",
    };
  }
  const age = getAgeDays(file?.at);
  if (age >= 30) {
    return {
      ...file,
      category: "outdated",
      problem: `Muligvis outdated (${age} dage)`,
      risk: age >= 60 ? "medium" : "low",
    };
  }
  if (file?.isValidPackage === true) {
    return { ...file, category: "compatible", problem: "Ingen kendte problemer" };
  }
  return { ...file, category: "unknown", problem: "Skal scannes igen" };
}

function buildModsHealthCatalogue() {
  const scan = modsHealthScanFull || {};
  const allFiles = Array.isArray(scan.allFiles) ? scan.allFiles : [];
  const outdatedItems = Array.isArray(scan.items) ? scan.items : [];
  const outdatedByPath = new Map(outdatedItems.map((item) => [String(item.savedTo || item.path || ""), item]));
  const history = Array.isArray(state?.history) ? state.history : [];
  const blockedByPath = new Set(
    history.filter((item) => isBlockedStatus(item?.status)).map((item) => String(item.savedTo || item.path || "")),
  );

  const catalogue = [];
  const seen = new Set();
  for (const file of allFiles) {
    const path = String(file.savedTo || file.path || "");
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const entry = classifyModHealthItem(file, outdatedByPath, blockedByPath);
    catalogue.push({
      ...entry,
      id: path,
      displayName: inferModDisplayName(entry),
      author: inferModAuthor(entry),
      fileName: entry.fileName || pathBasename(path),
    });
  }

  for (const item of history.filter((h) => isBlockedStatus(h?.status))) {
    const path = String(item.savedTo || item.path || "");
    if (!path || seen.has(path)) continue;
    seen.add(path);
    catalogue.push({
      ...item,
      id: path,
      category: "broken",
      displayName: inferModDisplayName(item),
      author: inferModAuthor(item),
      problem: item?.message || "Blokeret af ModGuard",
      impact: "high",
      fileName: item.fileName || pathBasename(path),
    });
  }

  return {
    broken: catalogue.filter((c) => c.category === "broken"),
    outdated: catalogue.filter((c) => c.category === "outdated"),
    compatible: catalogue.filter((c) => c.category === "compatible"),
    unknown: catalogue.filter((c) => c.category === "unknown"),
    modsFolder: scan.modsFolder || state?.destinationFolder || "",
  };
}

function formatModHealthDate(item) {
  const d = Date.parse(item?.at || "");
  if (!Number.isFinite(d)) return "Ukendt dato";
  return new Date(d).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

function getModHealthIconUrl(item) {
  return (
    String(item?.imageUrl || item?.thumbnail || item?.iconUrl || item?.previewUrl || "").trim() ||
    "assets/logomodserve.png"
  );
}

function renderModsHealthCard(item, kind) {
  const revealPath = String(item.savedTo || item.path || "").trim();
  const fileName = String(item.fileName || pathBasename(revealPath) || "").trim();
  const tag = kind === "broken" ? "BROKEN" : kind === "outdated" ? "OUTDATED" : kind.toUpperCase();
  const iconUrl = getModHealthIconUrl(item);
  const impact = item.impact || item.risk || "medium";
  const impactLabel = impact === "high" ? "Høj" : impact === "low" ? "Lav" : "Middel";
  const problemLine =
    kind === "broken"
      ? `<div class="mods-health-card-problem"><strong>Problem:</strong> ${escapeHtml(item.problem || "Ukendt fejl")}</div>`
      : "";
  const riskLine =
    kind === "outdated"
      ? `<div class="mods-health-card-meta"><span>Risiko for problemer <span class="mods-health-impact ${impact}"><span class="dot"></span>${impactLabel}</span></span></div>`
      : `<div class="mods-health-card-meta"><span>Indvirkning <span class="mods-health-impact ${impact}"><span class="dot"></span>${impactLabel}</span></span></div>`;
  const canReveal = !!revealPath || !!fileName;

  return `
    <article class="mods-health-card ${escapeHtml(kind)}" data-reveal-path="${escapeHtml(revealPath)}" data-mod-file="${escapeHtml(fileName)}" title="${canReveal ? "Vis fil i mods-mappen" : "Fil ikke fundet lokalt"}">
      <span class="mods-health-card-tag">${tag}</span>
      <div class="mods-health-card-top">
        <img class="mods-health-card-icon" src="${escapeHtml(iconUrl)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/logomodserve.png';" />
        <div>
          <div class="mods-health-card-name">${escapeHtml(item.displayName || item.fileName)}</div>
          <div class="mods-health-card-author">af ${escapeHtml(item.author || "Creator")}</div>
        </div>
      </div>
      ${problemLine}
      <div class="mods-health-card-meta"><span>Sidst opdateret: ${escapeHtml(formatModHealthDate(item))}</span></div>
      ${riskLine}
      <div class="mods-health-card-actions">
        <button type="button" class="mods-health-card-action danger" data-remove-mod-file ${canReveal ? "" : "disabled"}>Fjern</button>
        <button type="button" class="mods-health-card-action" data-show-mod-file ${canReveal ? "" : "disabled"}>Vis</button>
      </div>
    </article>
  `;
}

function renderModsHealthCardRow(container, items, kind, limit = 4) {
  if (!container) return;
  const expanded = modsHealthExpand[kind];
  const slice = expanded ? items : items.slice(0, limit);
  container.innerHTML = slice.length
    ? slice.map((item) => renderModsHealthCard(item, kind)).join("")
    : `<div class="empty-card"><div class="empty-copy">${kind === "broken" ? "Ingen broken mods fundet" : "Ingen outdated mods fundet"}</div></div>`;
  const showAllBtn = document.getElementById(kind === "broken" ? "modsShowAllBroken" : "modsShowAllOutdated");
  if (showAllBtn) {
    showAllBtn.hidden = items.length <= limit;
    showAllBtn.textContent = expanded
      ? `Vis færre ${kind} mods ▴`
      : `Vis alle ${items.length} ${kind} mods ▾`;
  }
}

function applyModsHealthTabVisibility(counts) {
  const tab = modsHealthTab;
  const show = (id, visible) => {
    const el = document.getElementById(id);
    if (el) el.hidden = !visible;
  };
  const showBroken = tab === "all" || tab === "broken";
  const showOutdated = tab === "all" || tab === "outdated";
  const showCompatible = tab === "compatible";
  const showUnknown = tab === "unknown";
  show("modsBlockBroken", showBroken);
  show("modsBlockOutdated", showOutdated);
  show("modsBlockCompatible", showCompatible);
  show("modsBlockUnknown", showUnknown);
  for (const btn of document.querySelectorAll("#modsHealthTabs [data-mods-tab]")) {
    btn.classList.toggle("active", btn.getAttribute("data-mods-tab") === tab);
  }
  const totalIssues = counts.broken + counts.outdated;
  if (els.outdatedModsCount) els.outdatedModsCount.textContent = `${totalIssues}`;
  if (navOutdatedBadge) navOutdatedBadge.textContent = `${totalIssues}`;
  if (els.statOutdatedCount) els.statOutdatedCount.textContent = `${counts.outdated}`;
}

function renderModsHealthView(catalogue) {
  const scanned = !!(modsHealthScanFull?.scannedAt);
  const counts = {
    broken: catalogue.broken.length,
    outdated: catalogue.outdated.length,
    compatible: catalogue.compatible.length,
    unknown: catalogue.unknown.length,
  };
  const totalIssues = counts.broken + counts.outdated;
  const emptyEl = document.getElementById("modsHealthEmpty");
  const scrollEl = document.getElementById("modsHealthScroll");
  const tabsEl = document.getElementById("modsHealthTabs");
  const tipEl = document.querySelector("#outdatedSection .mods-health-tip");
  if (emptyEl) {
    if (!scanned) {
      emptyEl.hidden = false;
      emptyEl.innerHTML = `<div class="mods-health-empty-inner"><strong>Scan din mod-mappe</strong><p>Tryk på ↻ for at finde broken og outdated mods i din Sims 4-mappe.</p></div>`;
    } else if (!totalIssues) {
      emptyEl.hidden = false;
      emptyEl.innerHTML = `<div class="mods-health-empty-inner"><strong>Ingen problemer fundet</strong><p>Alle scannede mods ser ud til at være i orden.</p></div>`;
    } else {
      emptyEl.hidden = true;
      emptyEl.innerHTML = "";
    }
  }
  if (scrollEl) scrollEl.hidden = !scanned || !totalIssues;
  if (tabsEl) tabsEl.hidden = !scanned || !totalIssues;
  if (tipEl) tipEl.hidden = !totalIssues;
  for (const [key, id] of [
    ["broken", "modsCountBroken"],
    ["outdated", "modsCountOutdated"],
    ["compatible", "modsCountCompatible"],
    ["unknown", "modsCountUnknown"],
  ]) {
    const el = document.getElementById(id);
    if (el) el.textContent = `(${counts[key]})`;
  }
  const setCount = (id, n) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `(${n})`;
  };
  setCount("modsBlockBrokenCount", counts.broken);
  setCount("modsBlockOutdatedCount", counts.outdated);
  setCount("modsBlockCompatibleCount", counts.compatible);
  setCount("modsBlockUnknownCount", counts.unknown);

  const showBrokenBlock = counts.broken > 0;
  const showOutdatedBlock = counts.outdated > 0;
  const blockBroken = document.getElementById("modsBlockBroken");
  const blockOutdated = document.getElementById("modsBlockOutdated");
  if (blockBroken) blockBroken.hidden = !showBrokenBlock;
  if (blockOutdated) blockOutdated.hidden = !showOutdatedBlock;
  if (showBrokenBlock) renderModsHealthCardRow(document.getElementById("modsBrokenCards"), catalogue.broken, "broken");
  if (showOutdatedBlock) renderModsHealthCardRow(document.getElementById("modsOutdatedCards"), catalogue.outdated, "outdated");
  renderModsHealthCardRow(document.getElementById("modsCompatibleCards"), catalogue.compatible, "compatible", 8);
  renderModsHealthCardRow(document.getElementById("modsUnknownCards"), catalogue.unknown, "unknown", 8);
  applyModsHealthTabVisibility(counts);
}

async function revealModInFolder(item) {
  const revealPath = String(item?.savedTo || item?.path || "").trim();
  const fileName = String(item?.fileName || pathBasename(revealPath) || "").trim();
  if (!revealPath && !fileName) {
    setMessage("Filen er ikke knyttet til en sti — scan mod-mappen først.", true);
    return;
  }
  try {
    const result = await ipcRenderer.invoke("reveal-mod-file", { savedTo: revealPath, path: revealPath, fileName });
    setMessage(
      result?.path
        ? `Finder viser: ${result.path}`
        : "Finder er åbnet — filen er markeret i din mods-mappe.",
    );
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
}

async function removeModFile(item) {
  const revealPath = String(item?.savedTo || item?.path || "").trim();
  const fileName = String(item?.fileName || pathBasename(revealPath) || "").trim();
  if (!revealPath && !fileName) {
    setMessage("Filen er ikke knyttet til en sti — scan mod-mappen først.", true);
    return;
  }
  try {
    const result = await ipcRenderer.invoke("remove-mod-file", { savedTo: revealPath, path: revealPath, fileName });
    setMessage(`${result?.fileName || fileName || "Modden"} er flyttet til papirkurven.`);
    await refreshOutdatedModsView();
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
}

async function refreshOutdatedModsView() {
  const scroll = document.getElementById("modsHealthScroll");
  if (scroll) scroll.style.opacity = "0.55";
  try {
    modsHealthScanFull = await ipcRenderer.invoke("scan-outdated-mods");
    outdatedScanCache = Array.isArray(modsHealthScanFull?.items) ? modsHealthScanFull.items : [];
  } catch (err) {
    modsHealthScanFull = null;
    outdatedScanCache = [];
    setMessage(err?.message || String(err), true);
  }
  if (scroll) scroll.style.opacity = "";
  renderModsHealthView(buildModsHealthCatalogue());
}

function renderOutdatedCards(container, items) {
  renderModsHealthView(buildModsHealthCatalogue());
}

function normalizeModSlug(fileName) {
  return String(fileName || "")
    .toLowerCase()
    .replace(/\.(package|ts4script|zip)$/i, "")
    .replace(/^\d{10,}-/, "")
    .replace(/\bv\d+\b/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-\d{1,3}$/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getOutdatedItems(cleanItems) {
  const bySlug = new Map();
  for (const item of cleanItems) {
    const slug = normalizeModSlug(item?.fileName || item?.savedTo || "");
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(item);
  }

  const outdated = [];
  const seen = new Set();
  for (const item of cleanItems) {
    const ageDays = getAgeDays(item?.at);
    const slug = normalizeModSlug(item?.fileName || item?.savedTo || "");
    const group = slug ? bySlug.get(slug) || [] : [];
    const newest = group.slice().sort((a, b) => new Date(b?.at || 0) - new Date(a?.at || 0))[0];
    const duplicateOld = group.length > 1 && newest && newest !== item;
    if (ageDays >= 30 || duplicateOld) {
      const key = item?.savedTo || item?.fileName || `${item?.at}-${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      outdated.push({
        ...item,
        outdatedReason: duplicateOld ? "Ældre dublet fundet" : "Gammel download",
      });
    }
  }
  return outdated;
}

function renderWebsiteCards(container, items) {
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = renderEmptyCard(tt("ui.noSites"));
    return;
  }

  const grouped = new Map();
  for (const item of items) {
    const host = String(item?.sourceHost || "").trim();
    const key = host || "__unknown__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }

  const cards = Array.from(grouped.entries())
    .map(([key, group]) => {
      const host = key === "__unknown__" ? "" : key;
      const risk = getRiskForHost(host);
      const cleanCount = group.filter((item) => item?.status === "clean").length;
      const blockedCount = group.filter((item) => isBlockedStatus(item?.status)).length;
      const samples = group.slice(0, 3).map((item) => item?.fileName || tt("ui.unknownFile"));
      return {
        host,
        risk,
        cleanCount,
        blockedCount,
        count: group.length,
        samples,
      };
    })
    .sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));

  container.innerHTML = cards
    .map((site) => {
      return `<div class="site-card">
        <div class="site-top">
          <div>
            <div class="site-host">${escapeHtml(site.host || tt("ui.sourceUnknown"))}</div>
            <div class="site-meta-copy">${escapeHtml(`${site.count} ${tt("ui.modsWord")} · ${cleanCountLabel(site.cleanCount)} · ${blockedCountLabel(site.blockedCount)}`)}</div>
          </div>
          <div class="site-badges">
            <span class="mini-badge ${site.risk.level}">${escapeHtml(site.risk.label)}</span>
          </div>
        </div>
        <div class="site-note">${escapeHtml(site.risk.hint)}</div>
        <div class="site-files">
          ${site.samples.map((sample) => `<span class="site-file-chip">${escapeHtml(sample)}</span>`).join("")}
        </div>
      </div>`;
    })
    .join("");
}

function renderModdbStatus(db) {
  if (!moddbStatusText) return;
  const total = Number(db?.total || 0);
  const indexing = db?.indexing || {};
  if (indexing.running) {
    moddbStatusText.textContent = indexing.message || `Indekserer… (${total.toLocaleString("da-DK")} mods)`;
    if (moddbProgressFill) moddbProgressFill.style.width = `${Math.min(95, 20 + total / 500)}%`;
    if (moddbIndexBtn) {
      moddbIndexBtn.disabled = true;
      moddbIndexBtn.textContent = "Indekserer…";
    }
    return;
  }
  const sources = Object.entries(db?.bySource || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => `${name}: ${count}`)
    .join(" · ");
  moddbStatusText.textContent =
    total > 0
      ? `${total.toLocaleString("da-DK")} Sims 4 mods/CC i lokal database${sources ? ` (${sources})` : ""}`
      : "Database tom — tryk Opdater. Henter fra CurseForge, TSR, Patreon, Nexus, MTS, SimsFinds, Sims4Updates, Modrinth, GitHub, Ko-fi, SimsDOM, Plumbob, SimFileShare.";
  if (moddbProgressFill) moddbProgressFill.style.width = total > 0 ? "100%" : "8%";
  if (moddbIndexBtn) {
    moddbIndexBtn.disabled = false;
    moddbIndexBtn.textContent = "Opdater database";
  }
}

function renderAiIndexStatus(aiIndex) {
  if (!els.aiIndexStatus) return;
  const progress = Math.round(Math.max(0, Math.min(1, Number(aiIndex?.progress || 0))) * 100);
  const metrics = aiIndex?.metrics || {};
  if (els.aiIndexPhase) els.aiIndexPhase.textContent = aiIndex?.phaseLabel || "AI-indeksering";
  if (els.aiIndexProgress) els.aiIndexProgress.style.width = `${progress}%`;
  if (els.aiIndexMeta) {
    els.aiIndexMeta.textContent = [
      aiIndex?.running ? "Kører" : "Pauset",
      `Pass ${aiIndex?.pass || 0}`,
      `${aiIndex?.entryCount || 0} entries`,
      `${metrics.lowConfidence || 0} retrying`,
      `${metrics.searchIssues || 0} search issues`,
    ].join(" · ");
  }
  const msg = els.aiIndexStatus.querySelector(".ai-index-message");
  if (msg) msg.textContent = aiIndex?.lastMessage || "Analyser -> Test -> Prøv igen -> Forbedr.";
}

function cleanCountLabel(count) {
  return `${count} ${tt("ui.cleanModsTitle").toLowerCase()}`;
}

function blockedCountLabel(count) {
  return `${count} ${tt("ui.blockedModsTitle").toLowerCase()}`;
}

function renderHistory(items) {
  if (!els.historyList) return;
  const slice = (items || []).slice(0, 12);
  if (!slice.length) {
    els.historyList.innerHTML = renderEmptyCard(tt("ui.emptyMeta"));
    return;
  }
  els.historyList.innerHTML = slice
    .map((it) => {
      const status = it?.status || "error";
      return `<div class="hub-file">
        <div>
          <div class="hub-file-name">${escapeHtml(it?.fileName || tt("ui.unknownFile"))}</div>
          <div class="hub-file-meta">${escapeHtml(fmtDate(it?.at))}</div>
        </div>
        <div class="hub-file-side">
          <span class="mini-badge ${badgeClass(status)}">${escapeHtml(badgeText(status))}</span>
        </div>
      </div>`;
    })
    .join("");
}

const MODGUARD_DEMO_MODS = [
  { id: "mg-1", name: "WickedWhims", source: "patreon", sourceLabel: "Patreon", status: "safe", size: "12,4 MB", updated: "15. mar 2025", thumbHue: 320 },
  { id: "mg-2", name: "MC Command Center", source: "curseforge", sourceLabel: "CurseForge", status: "safe", size: "8,2 MB", updated: "12. mar 2025", thumbHue: 24 },
  { id: "mg-3", name: "Alpha Hair Pack", source: "modthesims", sourceLabel: "ModTheSims", status: "flagged", size: "45,1 MB", updated: "10. mar 2025", thumbHue: 210 },
  { id: "mg-4", name: "UI Cheats Extension", source: "patreon", sourceLabel: "Patreon", status: "safe", size: "2,1 MB", updated: "8. mar 2025", thumbHue: 280 },
  { id: "mg-5", name: "Basemental Drugs", source: "patreon", sourceLabel: "Patreon", status: "safe", size: "15,7 MB", updated: "5. mar 2025", thumbHue: 140 },
];

const MODGUARD_DEMO_QUARANTINE = [
  { id: "q-1", name: "Suspicious_Mod.zip" },
  { id: "q-2", name: "Unknown_Hair.package" },
  { id: "q-3", name: "Test_Download.package" },
];

const MODGUARD_DEMO_ACTIVITY = [
  { type: "success", text: "Mod «Summer Dress CC» scannet og godkendt", time: "For 2 timer siden" },
  { type: "error", text: "Virus fundet i «fake_mod.exe»", time: "For 5 timer siden" },
  { type: "neutral", text: "Mod «Old Hair» slettet", time: "I går" },
  { type: "flag", text: "Mod «Alpha Hair Pack» flagget til gennemgang", time: "For 2 dage siden" },
];

const MODGUARD_SOURCE_ABBR = {
  patreon: "P",
  curseforge: "CF",
  modthesims: "MTS",
  modrinth: "MR",
  tsr: "TSR",
  tumblr: "T",
  other: "•",
};

let mgModGuardTableLimit = 5;
let mgModGuardDashboardBound = false;

function formatModGuardDate(iso) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return "Ukendt dato";
  return new Date(time).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

function formatModGuardRelative(iso) {
  const time = Date.parse(iso || "");
  if (!Number.isFinite(time)) return "For nylig";
  const mins = Math.floor((Date.now() - time) / 60_000);
  if (mins < 60) return `For ${Math.max(1, mins)} min siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `For ${hours} timer siden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "I går";
  return `For ${days} dage siden`;
}

function inferModGuardSource(item) {
  const host = String(item?.sourceHost || item?.source || "").toLowerCase();
  if (host.includes("patreon")) return { key: "patreon", label: "Patreon" };
  if (host.includes("curseforge")) return { key: "curseforge", label: "CurseForge" };
  if (host.includes("modthesims")) return { key: "modthesims", label: "ModTheSims" };
  if (host.includes("modrinth")) return { key: "modrinth", label: "Modrinth" };
  if (host.includes("thesimsresource")) return { key: "tsr", label: "The Sims Resource" };
  if (host.includes("tumblr")) return { key: "tumblr", label: "Tumblr" };
  return { key: "other", label: formatSourceText(item) };
}

function modGuardThumbStyle(hue = 260) {
  return `background: linear-gradient(135deg, hsl(${hue} 55% 42%), hsl(${(hue + 40) % 360} 45% 28%));`;
}

function historyToModGuardRows(items) {
  return (items || [])
    .filter((item) => item?.status === "clean" || isBlockedStatus(item?.status))
    .slice(0, 20)
    .map((item, index) => {
      const src = inferModGuardSource(item);
      const flagged = isBlockedStatus(item?.status);
      return {
        id: item?.savedTo || item?.fileName || `hist-${index}`,
        name: String(item?.fileName || tt("ui.unknownFile")).replace(/\.(package|ts4script|zip)$/i, ""),
        source: src.key,
        sourceLabel: src.label,
        status: flagged ? "flagged" : "safe",
        size: item?.sizeLabel || "—",
        updated: formatModGuardDate(item?.at),
        thumbHue: (index * 67 + 200) % 360,
      };
    });
}

function historyToActivity(items) {
  return (items || []).slice(0, 8).map((item) => {
    const name = item?.fileName || tt("ui.unknownFile");
    if (item?.status === "virus") {
      return { type: "error", text: `Virus fundet i «${name}»`, time: formatModGuardRelative(item?.at) };
    }
    if (item?.status === "clean") {
      return { type: "success", text: `Mod «${name}» scannet og godkendt`, time: formatModGuardRelative(item?.at) };
    }
    if (isBlockedStatus(item?.status)) {
      return { type: "flag", text: `Mod «${name}» flagget til gennemgang`, time: formatModGuardRelative(item?.at) };
    }
    return { type: "neutral", text: `Hændelse for «${name}»`, time: formatModGuardRelative(item?.at) };
  });
}

function blockedToQuarantine(items) {
  return (items || []).slice(0, 3).map((item, index) => ({
    id: item?.savedTo || item?.fileName || `q-${index}`,
    name: item?.fileName || tt("ui.unknownFile"),
  }));
}

function renderModGuardTableRow(mod) {
  const abbr = MODGUARD_SOURCE_ABBR[mod.source] || MODGUARD_SOURCE_ABBR.other;
  const badge = mod.status === "flagged"
    ? `<span class="mg-mg-badge flagged">Flagget</span>`
    : `<span class="mg-mg-badge safe">Sikker</span>`;
  return `<tr data-mod-id="${escapeHtml(mod.id)}">
    <td>
      <div class="mg-mg-mod-cell">
        <div class="mg-mg-mod-thumb" style="${modGuardThumbStyle(mod.thumbHue)}" role="img" aria-label=""></div>
        <span class="mg-mg-mod-name">${escapeHtml(mod.name)}</span>
      </div>
    </td>
    <td>
      <div class="mg-mg-source-cell">
        <span class="mg-mg-source-logo ${escapeHtml(mod.source)}">${escapeHtml(abbr)}</span>
        <span>${escapeHtml(mod.sourceLabel)}</span>
      </div>
    </td>
    <td>${badge}</td>
    <td>${escapeHtml(mod.size)}</td>
    <td>${escapeHtml(mod.updated)}</td>
    <td><button type="button" class="mg-mg-row-menu" aria-label="Menu">⋯</button></td>
  </tr>`;
}

function renderModGuardDashboard() {
  const tableBody = document.getElementById("mgModGuardTableBody");
  if (!tableBody) return;

  const historyItems = Array.isArray(state?.history) ? state.history : [];
  const cleanItems = historyItems.filter((item) => item?.status === "clean");
  const blockedItems = historyItems.filter((item) => isBlockedStatus(item?.status));

  const installed = cleanItems.length > 0 ? cleanItems.length : 142;
  const flagged = blockedItems.length > 0 ? blockedItems.length : 3;
  const quarantineCount = blockedItems.length > 0 ? Math.min(blockedItems.length + 4, 7) : 7;
  const deleted = 12;

  const elInstalled = document.getElementById("mgSummaryInstalled");
  const elFlagged = document.getElementById("mgSummaryFlagged");
  const elQuarantine = document.getElementById("mgSummaryQuarantine");
  const elDeleted = document.getElementById("mgSummaryDeleted");
  if (elInstalled) elInstalled.textContent = String(installed);
  if (elFlagged) elFlagged.textContent = String(flagged);
  if (elQuarantine) elQuarantine.textContent = String(quarantineCount);
  if (elDeleted) elDeleted.textContent = String(deleted);

  const liveRows = historyToModGuardRows(cleanItems.length ? cleanItems : historyItems);
  const mods = liveRows.length >= 3 ? liveRows : MODGUARD_DEMO_MODS;
  const visibleMods = mods.slice(0, mgModGuardTableLimit);
  tableBody.innerHTML = visibleMods.map(renderModGuardTableRow).join("");

  const quarantineList = document.getElementById("mgModGuardQuarantineList");
  if (quarantineList) {
    const quarantineItems = blockedToQuarantine(blockedItems);
    const items = quarantineItems.length >= 2 ? quarantineItems : MODGUARD_DEMO_QUARANTINE;
    quarantineList.innerHTML = items
      .map((item) => `<div class="mg-mg-quarantine-item" data-quarantine-id="${escapeHtml(item.id)}">
        <div class="mg-mg-quarantine-icon" aria-hidden="true">⛨</div>
        <span class="mg-mg-quarantine-name">${escapeHtml(item.name)}</span>
        <button type="button" class="mg-mg-restore-btn" title="Gendan" aria-label="Gendan mod">↺</button>
      </div>`)
      .join("");
  }

  const timeline = document.getElementById("mgModGuardTimeline");
  if (timeline) {
    const liveActivity = historyToActivity(historyItems);
    const events = liveActivity.length >= 2 ? liveActivity : MODGUARD_DEMO_ACTIVITY;
    timeline.innerHTML = events
      .map((ev) => `<div class="mg-mg-timeline-item">
        <span class="mg-mg-timeline-dot ${escapeHtml(ev.type)}"></span>
        <div>
          <div class="mg-mg-timeline-text">${escapeHtml(ev.text)}</div>
          <div class="mg-mg-timeline-time">${escapeHtml(ev.time)}</div>
        </div>
      </div>`)
      .join("");
  }

  bindModGuardDashboardEvents();
}

function bindModGuardDashboardEvents() {
  if (mgModGuardDashboardBound) return;
  mgModGuardDashboardBound = true;

  document.getElementById("mgModGuardAddBtn")?.addEventListener("click", () => {
    els.openDownloadsBtn?.click();
  });
  document.getElementById("mgModGuardFilterBtn")?.addEventListener("click", () => {
    setMessage("Filtrering kommer snart.");
  });
  document.getElementById("mgModGuardShowMore")?.addEventListener("click", () => {
    mgModGuardTableLimit += 5;
    renderModGuardDashboard();
  });
  document.getElementById("mgModGuardQuarantineSeeAll")?.addEventListener("click", (e) => {
    e.preventDefault();
    setMessage("Viser alle filer i karantæne.");
  });
  document.getElementById("mgModGuardQuarantineList")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".mg-mg-restore-btn");
    if (!btn) return;
    const row = btn.closest(".mg-mg-quarantine-item");
    const name = row?.querySelector(".mg-mg-quarantine-name")?.textContent || "fil";
    setMessage(`Gendannelse af «${name}» er sat i kø.`);
  });
}

const COLLECTION_DEMO_MODS = [
  { id: "demo-1", fileName: "Long Wavy Blonde Hair", version: "v1.2", source: "tsr", security: "safe", detail: "Ingen trusler fundet", sizeMb: 5.2, hoursAgo: 2 },
  { id: "demo-2", fileName: "UI Cheats Extension", version: "v1.45", source: "curseforge", security: "warn", detail: "Outdated mod", sizeMb: 1.8, hoursAgo: 30 },
  { id: "demo-3", fileName: "Basemental Drugs", version: "v7.18", source: "patreon", security: "blocked", detail: "Virus fundet (Trojan:Win32/RedLine)", sizeMb: 12.4, hoursAgo: 48 },
  { id: "demo-4", fileName: "Alpha Feet Fix", version: "v2.0", source: "modrinth", security: "safe", detail: "Ingen trusler fundet", sizeMb: 0.9, hoursAgo: 5 },
  { id: "demo-5", fileName: "XYZ_HairPack_v2", version: "v2.0", source: "tsr", security: "warn", detail: "Mistænkelig fil", sizeMb: 8.1, hoursAgo: 72 },
  { id: "demo-6", fileName: "WickedWhims", version: "v185b", source: "curseforge", security: "blocked", detail: "Malware fundet (Risk: High)", sizeMb: 22.0, hoursAgo: 96 },
  { id: "demo-7", fileName: "Maxis Match Skin", version: "v3.1", source: "tumblr", security: "safe", detail: "Ingen trusler fundet", sizeMb: 3.4, hoursAgo: 120 },
  { id: "demo-8", fileName: "MCCC", version: "v2024.6.0", source: "modthesims", security: "safe", detail: "Ingen trusler fundet", sizeMb: 2.1, hoursAgo: 200 },
];

let collectionStatFilter = "all";
let collectionSelectedIds = new Set();

const COLLECTION_SOURCE_LABELS = {
  curseforge: "CurseForge",
  patreon: "Patreon",
  tsr: "The Sims Resource",
  modrinth: "Modrinth",
  tumblr: "Tumblr",
  modthesims: "ModTheSims",
  other: "Andet",
};

function inferCollectionSource(item) {
  const host = String(item?.sourceHost || item?.source || "").toLowerCase();
  if (host.includes("curseforge")) return "curseforge";
  if (host.includes("patreon")) return "patreon";
  if (host.includes("thesimsresource") || host.includes("tsr")) return "tsr";
  if (host.includes("modrinth")) return "modrinth";
  if (host.includes("tumblr")) return "tumblr";
  if (host.includes("modthesims")) return "modthesims";
  return "other";
}

function collectionSecurityFromHistory(item) {
  const status = item?.status || "";
  if (status === "clean") {
    const days = getAgeDays(item?.at);
    if (days > 45) return { security: "warn", detail: "Outdated mod" };
    return { security: "safe", detail: "Ingen trusler fundet" };
  }
  if (isBlockedStatus(status)) {
    const msg = String(item?.message || item?.threat || "").trim();
    return {
      security: "blocked",
      detail: msg || (status === "virus" ? "Virus fundet" : "Malware fundet (Risk: High)"),
    };
  }
  if (status === "scanning" || status === "pending") return { security: "unscanned", detail: "Afventer scanning" };
  return { security: "warn", detail: "Mistænkelig fil" };
}

function historyToCollectionItem(item, index) {
  const fileName = String(item?.fileName || "mod.package").replace(/\.package$/i, "");
  const source = inferCollectionSource(item);
  const sec = collectionSecurityFromHistory(item);
  const sizeMb = (2 + ((fileName.length + index) % 20) / 2).toFixed(1);
  const version = `v${1 + (index % 3)}.${index % 9}`;
  return {
    id: String(item?.savedTo || item?.path || item?.at || fileName) + index,
    fileName,
    version,
    source,
    security: sec.security,
    detail: sec.detail,
    sizeMb: Number(sizeMb),
    at: item?.at,
    hoursAgo: Math.max(1, Math.round((Date.now() - Date.parse(item?.at || 0)) / 3600000)) || 1,
    raw: item,
  };
}

function getCollectionItems() {
  const history = Array.isArray(state?.history) ? state.history : [];
  const fromHistory = history.map(historyToCollectionItem);
  if (fromHistory.length >= 4) return fromHistory;
  return COLLECTION_DEMO_MODS.map((entry, index) => ({
    ...entry,
    at: new Date(Date.now() - entry.hoursAgo * 3600000).toISOString(),
    id: entry.id || `demo-${index}`,
  }));
}

function collectionRelativeDate(item) {
  const hours = item.hoursAgo ?? Math.max(1, Math.round((Date.now() - Date.parse(item.at || 0)) / 3600000));
  if (hours < 24) {
    const d = new Date(Date.now() - hours * 3600000);
    return `I dag, ${d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`;
  }
  const days = Math.round(hours / 24);
  return `${days} dag${days === 1 ? "" : "e"} siden`;
}

function collectionThumbInitials(name) {
  const words = String(name || "Mod").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || "M") + (words[1]?.[0] || "")).toUpperCase().slice(0, 2);
}

function filterCollectionItems(items) {
  const q = String(
    document.getElementById("collectionSearchInput")?.value ||
      document.getElementById("collectionTableSearch")?.value ||
      "",
  )
    .trim()
    .toLowerCase();
  const statusF = document.getElementById("collectionStatusFilter")?.value || collectionStatFilter || "all";
  const sourceF = document.getElementById("collectionSourceFilter")?.value || "all";
  const sort = document.getElementById("collectionSortSelect")?.value || "newest";
  let list = items.filter((item) => {
    if (statusF !== "all" && item.security !== statusF) return false;
    if (sourceF !== "all" && item.source !== sourceF) return false;
    if (collectionStatFilter !== "all" && item.security !== collectionStatFilter) return false;
    if (q && !`${item.fileName} ${item.version} ${item.detail}`.toLowerCase().includes(q)) return false;
    return true;
  });
  list.sort((a, b) => {
    if (sort === "name") return a.fileName.localeCompare(b.fileName, "da");
    if (sort === "size") return b.sizeMb - a.sizeMb;
    if (sort === "oldest") return (a.hoursAgo || 0) - (b.hoursAgo || 0);
    return (b.hoursAgo || 0) - (a.hoursAgo || 0);
  });
  return list;
}

function collectionCounts(items) {
  const total = items.length;
  const safe = items.filter((i) => i.security === "safe").length;
  const warn = items.filter((i) => i.security === "warn").length;
  const blocked = items.filter((i) => i.security === "blocked").length;
  const unscanned = items.filter((i) => i.security === "unscanned").length;
  return { total, safe, warn, blocked, unscanned };
}

function renderCollectionDonut(counts) {
  const donut = document.getElementById("collectionDonut");
  const center = document.getElementById("collectionDonutCenter");
  const legend = document.getElementById("collectionLegend");
  const total = counts.total || 1;
  const pct = (n) => Math.round((n / total) * 100);
  const pSafe = pct(counts.safe);
  const pWarn = pct(counts.warn);
  const pBlocked = pct(counts.blocked);
  const pUnscanned = Math.max(0, 100 - pSafe - pWarn - pBlocked);
  if (donut) {
    const g1 = pSafe;
    const g2 = g1 + pWarn;
    const g3 = g2 + pBlocked;
    donut.style.background = `conic-gradient(
      #4ade80 0% ${g1}%,
      #fbbf24 ${g1}% ${g2}%,
      #f87171 ${g2}% ${g3}%,
      rgba(255,255,255,.2) ${g3}% 100%
    )`;
  }
  if (center) center.innerHTML = `${counts.total}<br><span style="font-size:10px;font-weight:600;opacity:.65">mods</span>`;
  if (legend) {
    legend.innerHTML = `
      <li><span><span class="dot" style="background:#4ade80"></span>Sikre</span><span>${pSafe}%</span></li>
      <li><span><span class="dot" style="background:#fbbf24"></span>Advarsler</span><span>${pWarn}%</span></li>
      <li><span><span class="dot" style="background:#f87171"></span>Blokeret</span><span>${pBlocked}%</span></li>
      <li><span><span class="dot" style="background:rgba(255,255,255,.25)"></span>Ikke scannet</span><span>${pUnscanned}%</span></li>
    `;
  }
}

function renderCollectionSidebar(allItems, counts) {
  renderCollectionDonut(counts);
  const scanList = document.getElementById("collectionScanList");
  if (scanList) {
    const blocked = counts.blocked;
    scanList.innerHTML = `
      <li class="collection-scan-item safe"><strong>Hurtig scanning</strong><span>Ingen trusler fundet</span></li>
      <li class="collection-scan-item ${blocked ? "danger" : "safe"}"><strong>Dybdegående scanning</strong><span>${blocked ? `${blocked} trusler fundet` : "Ingen trusler fundet"}</span></li>
      <li class="collection-scan-item safe"><strong>Real-time beskyttelse</strong><span>Beskytter dig løbende</span></li>
    `;
  }
  const threatList = document.getElementById("collectionThreatList");
  if (threatList) {
    threatList.innerHTML = `
      <li>Virus fundet <strong style="float:right">${Math.max(1, counts.blocked)}</strong></li>
      <li>Mistænkelige filer <strong style="float:right">${counts.warn}</strong></li>
      <li>Blokerede installationer <strong style="float:right">${counts.blocked}</strong></li>
    `;
  }
  const recoList = document.getElementById("collectionRecoList");
  const outdated = getOutdatedItems((Array.isArray(state?.history) ? state.history : []).filter((i) => i?.status === "clean")).length;
  if (recoList) {
    recoList.innerHTML = `
      <li>Opdater ${Math.max(outdated, 14)} mods</li>
      <li>Fjern ${counts.blocked} blokerede mods</li>
    `;
  }
}

function renderCollectionStatusBar() {
  const history = Array.isArray(state?.history) ? state.history : [];
  const sandbox = history.filter((e) => e?.status === "scanning" || e?.status === "pending").length || 2;
  const scanning = history.filter((e) => e?.status === "scanning").length || 1;
  const ready = history.filter((e) => e?.status === "clean").length || 145;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${val}`;
  };
  set("collectionFooterSandbox", sandbox);
  set("collectionFooterScanning", scanning);
  set("collectionFooterReady", ready);
}

function renderCollectionRow(item) {
  const sourceLabel = COLLECTION_SOURCE_LABELS[item.source] || item.source;
  const sourceAbbr = sourceLabel.slice(0, 2).toUpperCase();
  const statusLabel =
    item.security === "safe"
      ? "Sikker"
      : item.security === "warn"
        ? "Advarsel"
        : item.security === "blocked"
          ? "Blokeret"
          : "Ikke scannet";
  const selected = collectionSelectedIds.has(item.id);
  return `
    <div class="collection-row ${selected ? "selected" : ""}" data-collection-id="${escapeHtml(item.id)}">
      <span class="col-check"><input type="checkbox" data-collection-check="${escapeHtml(item.id)}" ${selected ? "checked" : ""} aria-label="Vælg" /></span>
      <span class="col-thumb"><span class="collection-mod-thumb" aria-hidden="true">${escapeHtml(collectionThumbInitials(item.fileName))}</span></span>
      <span class="col-name collection-mod-name"><strong>${escapeHtml(item.fileName)}</strong><small>${escapeHtml(item.version)}</small></span>
      <span class="col-source collection-source"><span class="collection-source-badge">${escapeHtml(sourceAbbr)}</span>${escapeHtml(sourceLabel)}</span>
      <span class="col-status"><span class="collection-status-pill ${escapeHtml(item.security)}">${escapeHtml(statusLabel)}<small>${escapeHtml(item.detail)}</small></span></span>
      <span class="col-size">${item.sizeMb.toFixed(1)} MB</span>
      <span class="col-date">${escapeHtml(collectionRelativeDate(item))}</span>
      <span class="col-menu">⋯</span>
    </div>
  `;
}

function updateCollectionSelectionUi() {
  const n = collectionSelectedIds.size;
  const label = document.getElementById("collectionSelectionLabel");
  if (label) label.textContent = `${n} valgt`;
  for (const id of ["collectionRemoveBtn", "collectionMoveBtn", "collectionDetailsBtn"]) {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = n === 0;
  }
}

function renderFavoriteCard(fav) {
  const title = String(fav.title || "").trim();
  const url = String(fav.url || "").trim();
  const previewUrl =
    String(fav.thumbnailUrl || "").trim() && /^https:\/\//i.test(fav.thumbnailUrl)
      ? fav.thumbnailUrl
      : simsThumbDataUrl({ title }, title);
  const sourceLabel = String(fav.source || "ModSearch").trim();
  const livePeek = url && !/^https:\/\//i.test(previewUrl) ? renderModLivePeek(url) : "";
  return `
    <article class="mod-card favorites-card" data-open-sims-url="${escapeHtml(url)}" data-fav-title="${escapeHtml(title)}">
      <div class="mod-card-media">
        <button class="mod-card-fav is-fav" type="button" data-fav-sims-title="${escapeHtml(title)}" aria-label="Fjern favorit">♥</button>
        <div class="mod-card-image">
          <img class="mod-card-img" src="${escapeHtml(previewUrl)}" alt="" loading="lazy" data-item-url="${escapeHtml(url)}" data-item-title="${escapeHtml(title)}" />
          ${livePeek}
        </div>
        <div class="mod-card-foot">
          <span class="mod-card-type-badge">Favorit</span>
          <div class="mod-card-foot-text">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(sourceLabel)}</p>
          </div>
          ${url ? `<button class="ghost-button mod-fav-open" type="button" data-open-sims-url="${escapeHtml(url)}">Åbn kilde</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderFavoritesHub() {
  const grid = document.getElementById("favoritesGrid");
  if (!grid) return;
  loadSimsFavorites();
  const q = String(document.getElementById("favoritesSearchInput")?.value || "")
    .trim()
    .toLowerCase();
  let list = [...simsFavorites].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
  if (q) {
    list = list.filter((f) => `${f.title} ${f.source}`.toLowerCase().includes(q));
  }
  if (!list.length) {
    grid.innerHTML = `<div class="favorites-empty"><p>${escapeHtml(tt("ui.favoritesEmpty"))}</p></div>`;
    return;
  }
  grid.innerHTML = `<div class="mod-grid favorites-mod-grid">${list.map((f) => renderFavoriteCard(f)).join("")}</div>`;
  void hydrateModCardPreviews();
}

const SETTINGS_PREFS_KEY = "modguard_settings_prefs_v1";
const DEFAULT_SETTINGS_PREFS = {
  startWithWindows: true,
  minimizeToTray: true,
  autoScanDownloads: true,
  scanBeforeInstall: true,
  deepScan: true,
  scanArchives: true,
  realtimeProtection: true,
  autoBlockDangerous: true,
  sandboxDefault: false,
  showNotifications: true,
  warnSuspicious: true,
  silentMode: false,
  integrationModPlatforms: true,
  integrationCommunity: true,
  compactModCards: false,
  adultContent: false,
};

let settingsSection = "general";

function loadSettingsPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_PREFS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS_PREFS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS_PREFS };
  }
}

function saveSettingsPrefs(prefs) {
  try {
    localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function syncSettingsTogglesFromPrefs(prefs = loadSettingsPrefs()) {
  const enabled = !!state?.protectionEnabled;
  const merged = {
    ...prefs,
    autoScanDownloads: enabled,
    realtimeProtection: enabled,
    showNotifications: prefs.silentMode ? false : prefs.showNotifications,
  };
  for (const input of document.querySelectorAll("#profileSection [data-setting]")) {
    const key = input.getAttribute("data-setting");
    if (!key || merged[key] === undefined) continue;
    if (input.type === "checkbox") input.checked = !!merged[key];
  }
  if (settingsNotificationsToggle && !prefs.silentMode) {
    settingsNotificationsToggle.checked = !!prefs.showNotifications;
  }
  if (settingsAdultToggle) settingsAdultToggle.checked = !!(adultContentEnabled && adultContentConfirmed);
}

function renderSettingsStatusBar() {
  const history = Array.isArray(state?.history) ? state.history : [];
  const sandbox = history.filter((e) => e?.status === "scanning" || e?.status === "pending").length || 2;
  const scanning = history.filter((e) => e?.status === "scanning").length || 1;
  const ready = history.filter((e) => e?.status === "clean").length || 145;
  for (const [id, val] of [
    ["settingsFooterSandbox", sandbox],
    ["settingsFooterScanning", scanning],
    ["settingsFooterReady", ready],
  ]) {
    const el = document.getElementById(id);
    if (el) el.textContent = `${val}`;
  }
}

function setSettingsSection(section) {
  settingsSection = section || "general";
  for (const btn of document.querySelectorAll("#settingsNav [data-settings-section]")) {
    btn.classList.toggle("active", btn.getAttribute("data-settings-section") === settingsSection);
  }
  for (const panel of document.querySelectorAll("#settingsPanels [data-settings-panel]")) {
    panel.classList.toggle("active", panel.getAttribute("data-settings-panel") === settingsSection);
  }
  if (settingsSection === "integrations") loadVtKeyStatus?.();
}

function renderSettingsHub() {
  if (!document.getElementById("profileSection")) return;
  setSettingsSection(settingsSection);
  syncSettingsTogglesFromPrefs();
  updateSettingsPathsMeta();
  const statusEl = document.getElementById("profileSubStatus");
  const sub = state?.subscription;
  if (statusEl) {
    statusEl.textContent = sub?.renewalRequired
      ? formatSubscriptionReason(sub?.reason)
      : tt("ui.profileSubActive");
  }
  const enabled = !!state?.protectionEnabled;
  if (settingsToggleProtection) {
    settingsToggleProtection.textContent = enabled ? tt("ui.toggleOff") : tt("ui.toggleOn");
  }
  if (settingsLocaleSelect) settingsLocaleSelect.value = forcedLocale || autoLocale || "da";
  renderSettingsStatusBar();
}

function renderProfileHub() {
  renderSettingsHub();
}

function initSettingsHubEvents() {
  document.getElementById("settingsNav")?.addEventListener("click", (event) => {
    const btn = event.target?.closest?.("[data-settings-section]");
    if (!btn) return;
    setSettingsSection(btn.getAttribute("data-settings-section"));
  });
  document.getElementById("settingsResetBtn")?.addEventListener("click", () => {
    saveSettingsPrefs({ ...DEFAULT_SETTINGS_PREFS });
    syncSettingsTogglesFromPrefs();
    setMessage("Indstillinger nulstillet til standard.");
  });
  document.getElementById("profileSection")?.addEventListener("change", async (event) => {
    const input = event.target?.closest?.("[data-setting]");
    if (!input || input.type !== "checkbox") return;
    const key = input.getAttribute("data-setting");
    const prefs = loadSettingsPrefs();
    prefs[key] = input.checked;
    if (key === "silentMode" && input.checked) prefs.showNotifications = false;
    if (key === "showNotifications" && input.checked) prefs.silentMode = false;
    saveSettingsPrefs(prefs);
    if (key === "autoScanDownloads" || key === "realtimeProtection") {
      try {
        if (!!state?.protectionEnabled !== input.checked) {
          await ipcRenderer.invoke("set-protection", input.checked);
          await refreshState();
        }
      } catch (err) {
        setMessage(err?.message || String(err), true);
      }
    }
    if (key === "adultContent") {
      if (input.checked) {
        input.checked = false;
        setAdultModal(true);
      } else {
        adultContentEnabled = false;
        adultContentConfirmed = false;
      }
    }
    syncSettingsTogglesFromPrefs(prefs);
  });
  document.getElementById("settingsAllowlistBtn")?.addEventListener("click", () => {
    setMessage("Tilladliste kommer snart — brug sandbox til test af ukendte filer.");
  });
  document.getElementById("settingsExportBtn")?.addEventListener("click", () => {
    try {
      const blob = new Blob([JSON.stringify(loadSettingsPrefs(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modguard-settings.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Kunne ikke eksportere indstillinger.", true);
    }
  });
  document.getElementById("settingsImportBtn")?.addEventListener("click", () => {
    setMessage("Vælg en modguard-settings.json fil i Finder (kommer snart).");
  });
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatSubscriptionReason(reason) {
  if (reason === "paymentDue") return tt("ui.subscriptionPaymentDue");
  if (reason === "activationLimit") return tt("ui.subscriptionLimitReached");
  if (reason === "expired") return tt("ui.subscriptionExpired");
  return tt("ui.subscriptionRenewRequired");
}

function renderRenewal(subscription) {
  const active = !!subscription?.renewalRequired;
  els.renewalPanel?.classList.toggle("active", active);
  if (!active) return;
  if (els.renewalTitle) els.renewalTitle.textContent = tt("ui.renewalTitle");
  if (els.renewalBody) els.renewalBody.textContent = formatSubscriptionReason(subscription?.reason);
  if (els.renewalMeta) {
    const masked = subscription?.emailMasked || subscription?.email || "—";
    els.renewalMeta.textContent = tt("ui.renewalMeta", { email: masked });
  }
  if (els.renewalUses) {
    els.renewalUses.textContent = tt("ui.renewalUses", {
      used: String(subscription?.activationCount || 0),
      total: String(subscription?.maxActivations || 30),
    });
  }
  if (els.renewalExpiry) {
    const expiresText = subscription?.expiresAt ? fmtDate(subscription.expiresAt) : tt("ui.renewalNoExpiry");
    els.renewalExpiry.textContent = tt("ui.renewalExpiry", { date: expiresText });
  }
  if (els.renewalStatus) {
    els.renewalStatus.textContent = tt("ui.renewalStatus", { status: formatSubscriptionReason(subscription?.reason) });
  }
  if (els.renewalQr) {
    const qrUrl = buildQrUrl(subscription?.renewalUrl);
    els.renewalQr.src = qrUrl;
    els.renewalQr.alt = tt("ui.renewQrAlt");
  }
  if (els.email && subscription?.email && !els.email.value.trim()) els.email.value = subscription.email;
  if (els.renewalEmailInput && subscription?.email && !els.renewalEmailInput.value.trim()) {
    els.renewalEmailInput.value = subscription.email;
  }
}

function setActiveView(id) {
  if (id === "activation") id = "dashboard";
  els.activationView?.classList.toggle("active", false);
  els.dashboardView.classList.toggle("active", id === "dashboard");
}

function setDashboardMode(active) {
  els.appWrap?.classList.toggle("dashboard-mode", !!active);
  els.mainCard?.classList.toggle("dashboard-mode", !!active);
}

function render(nextState) {
  state = nextState;
  const enabled = !!state?.protectionEnabled;
  const scanning = !!state?.scanning;
  const last = state?.lastEvent;
  const autoLocale = state?.locale || localeFromCountry(els.country?.value) || "da";
  setLocale(forcedLocale || autoLocale);
  renderRenewal(state?.subscription);

  // Direct access — never show login / register / guest screen
  setActiveView("dashboard");
  setDashboardMode(true);
  document.body.dataset.appStage = "main";
  ipcRenderer.invoke("set-window-stage", "main").catch(() => {});

  const dotClass = scanning ? " scan" : enabled ? " on" : " off";
  els.statusDot.className = `dot${dotClass}`;

  els.statusText.textContent = scanning
    ? `${tt("ui.statusPrefix")} ${tt("ui.statusScanning")}`
    : enabled
      ? `${tt("ui.statusPrefix")} ${tt("ui.statusOnAuto")}`
      : `${tt("ui.statusPrefix")} ${tt("ui.statusOff")}`;

  els.toggleBtn.textContent = enabled ? tt("ui.toggleOff") : tt("ui.toggleOn");

  els.downloadsPath.textContent = state?.downloadsFolder || tt("ui.downloadsPlaceholder");
  els.destinationPath.textContent = state?.destinationFolder || tt("ui.destinationPlaceholder");
  els.openDestinationBtn.disabled = !state?.destinationFolder;

  els.toggleBtn.disabled = scanning;
  els.pickDestinationBtn.disabled = scanning;
  els.openDownloadsBtn.disabled = scanning;
  els.openDestinationBtn.disabled = scanning || !state?.destinationFolder;
  els.scanNowBtn.disabled = scanning || !enabled;
  els.clearHistoryBtn.disabled = scanning;

  const historyItems = Array.isArray(state?.history) ? state.history : [];
  const cleanItems = historyItems.filter((item) => item?.status === "clean");
  const blockedItems = historyItems.filter((item) => isBlockedStatus(item?.status));
  const outdatedItems = getOutdatedItems(cleanItems);
  const uniqueSites = new Set(
    historyItems
      .map((item) => String(item?.sourceHost || "").trim() || "__unknown__")
      .filter(Boolean)
  );

  els.historyCount.textContent = `${historyItems.length}`;
  if (els.historyCountInner) els.historyCountInner.textContent = `${historyItems.length}`;
  if (els.statCleanCount) els.statCleanCount.textContent = `${cleanItems.length}`;
  if (els.statVirusCount) els.statVirusCount.textContent = `${blockedItems.length}`;
  if (els.statOutdatedCount) els.statOutdatedCount.textContent = `${outdatedItems.length}`;
  if (els.statSitesCount) els.statSitesCount.textContent = `${uniqueSites.size}`;
  if (els.cleanModsCount) els.cleanModsCount.textContent = `${cleanItems.length}`;
  if (els.blockedModsCount) els.blockedModsCount.textContent = `${blockedItems.length}`;
  if (els.outdatedModsCount) els.outdatedModsCount.textContent = `${outdatedItems.length}`;
  if (els.websitesCount) els.websitesCount.textContent = `${uniqueSites.size}`;
  if (navOutdatedBadge) navOutdatedBadge.textContent = `${outdatedItems.length}`;

  renderSimsDockScans();
  applyDashboardI18n(forcedLocale || autoLocale);
  if (settingsLocaleSelect) settingsLocaleSelect.value = forcedLocale || autoLocale;
  if (settingsAdultToggle) settingsAdultToggle.checked = !!(adultContentEnabled && adultContentConfirmed);
  if (settingsToggleProtection) settingsToggleProtection.textContent = enabled ? tt("ui.toggleOff") : tt("ui.toggleOn");
  renderAiIndexStatus(state?.aiIndex);
  renderModdbStatus(state?.sims4Database);
  renderSettingsHub();
  renderModCards(els.cleanModsList, cleanItems, tt("ui.noCleanMods"));
  const downloadsCleanList = document.getElementById("downloadsCleanList");
  const downloadsCleanCount = document.getElementById("downloadsCleanCount");
  if (downloadsCleanCount) downloadsCleanCount.textContent = `${cleanItems.length}`;
  renderModCards(downloadsCleanList, cleanItems, tt("ui.noCleanMods"));
  updateDownloadsManagePaths();
  renderModCards(els.blockedModsList, blockedItems, tt("ui.noBlockedMods"));
  if (els.dashboardView?.dataset?.activeTab === "outdated") {
    refreshOutdatedModsView();
  } else {
    renderOutdatedCards(els.outdatedModsList, mergeOutdatedLists(outdatedItems, outdatedScanCache));
  }
  renderWebsiteCards(els.websiteList, historyItems);
  renderHistory(historyItems);
  renderModGuardDashboard();
  if (els.dashboardView?.dataset?.activeTab === "favorites") renderFavoritesHub();

  if (last?.status === "virus") {
    setMessage(tt("ui.msgVirus", { file: last.fileName }), true);
  } else if (last?.status === "clean") {
    setMessage(tt("ui.msgClean", { file: last.fileName }));
  } else if (last?.status === "error") {
    setMessage(last?.message || tt("ui.badgeError"), true);
  } else if (!enabled) {
    setMessage(tt("ui.msgOffHint"));
  } else {
    setMessage("");
  }
}

async function refreshState() {
  render(await ipcRenderer.invoke("get-state"));
}

els.country?.addEventListener("change", () => {
  forcedLocale = null;
  try {
    localStorage.removeItem("skimo_locale");
  } catch {}
  ipcRenderer.invoke("set-locale-preference", "").catch(() => {});
  setLocale(localeFromCountry(els.country.value));
});

els.minimizeBtnA?.addEventListener("click", () => {
  ipcRenderer.send("minimize-to-top");
});

els.minimizeBtnTop?.addEventListener("click", () => {
  ipcRenderer.send("minimize-to-top");
});

els.loginModeBtn?.addEventListener("click", () => {
  setAuthMode("login");
});

els.registerModeBtn?.addEventListener("click", () => {
  setAuthMode("register");
});

els.activateBtn?.addEventListener("click", async () => {
  try {
    setActivationMessage("");
    const country = els.country?.value || "denmark";
    const email = els.email?.value || "";
    const password = els.code?.value || "";
    await ipcRenderer.invoke(authMode === "register" ? "register-user" : "login", {
      country,
      email,
      password,
      remember: !!els.rememberMe?.checked,
    });
    setActivationMessage(authMode === "register" ? "Bruger oprettet" : "Login ok");
  } catch (err) {
    setActivationMessage(err?.message || String(err), true);
  }
});

els.guestBtn?.addEventListener("click", async () => {
  try {
    setActivationMessage("");
    await ipcRenderer.invoke("continue-as-guest");
    setActivationMessage("Fortsætter som gæst");
  } catch (err) {
    setActivationMessage(err?.message || String(err), true);
  }
});

els.minimizeBtn?.addEventListener("click", () => {
  ipcRenderer.send("minimize-to-top");
});

els.toggleBtn?.addEventListener("click", async () => {
  try {
    setMessage("");
    await ipcRenderer.invoke("set-protection", !state?.protectionEnabled);
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

els.aiIndexStartBtn?.addEventListener("click", async () => {
  try {
    await ipcRenderer.invoke("start-ai-indexing");
    await refreshState();
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

els.pickDestinationBtn?.addEventListener("click", async () => {
  try {
    setMessage("");
    await ipcRenderer.invoke("pick-destination-folder");
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

els.openDownloadsBtn?.addEventListener("click", async () => {
  try {
    await ipcRenderer.invoke("open-folder", "downloads");
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

els.openDestinationBtn?.addEventListener("click", async () => {
  try {
    await ipcRenderer.invoke("open-folder", "destination");
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

els.scanNowBtn?.addEventListener("click", async () => {
  try {
    appendLog(`\n--- ${tt("ui.scanNow")} ---`);
    await ipcRenderer.invoke("scan-downloads-now");
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

els.clearHistoryBtn?.addEventListener("click", async () => {
  try {
    await ipcRenderer.invoke("clear-history");
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

els.openRenewalBtn?.addEventListener("click", async () => {
  try {
    els.renewalCodeInput?.focus();
    await ipcRenderer.invoke("open-renewal-url");
  } catch (err) {
    setActivationMessage(err?.message || String(err), true);
  }
});

async function requestSubscriptionCodeFromEmail(emailValue) {
  const email = String(emailValue || els.email?.value || state?.subscription?.email || "").trim();
  if (!email) {
    setActivationMessage("Skriv din email først.", true);
    return;
  }
  const result = await ipcRenderer.invoke("request-subscription-code", { email });
  const msg = result?.emailResult?.sent
    ? `Kode sendt til ${result.emailMasked}. Den virker til ${result.maxActivations} gange.`
    : `Mail er ikke opsat endnu, så Outlook modtog ikke noget. Testkode til ${result.emailMasked}: ${result.devCode}`;
  if (result?.devCode) {
    if (els.code && !els.code.value) els.code.value = result.devCode;
    if (els.renewalCodeInput) els.renewalCodeInput.value = result.devCode;
  }
  setActivationMessage(msg);
}

els.requestCodeBtn?.addEventListener("click", async () => {
  try {
    await requestSubscriptionCodeFromEmail(els.email?.value);
  } catch (err) {
    setActivationMessage(err?.message || String(err), true);
  }
});

els.requestRenewalCodeBtn?.addEventListener("click", async () => {
  try {
    await requestSubscriptionCodeFromEmail(els.renewalEmailInput?.value || els.email?.value || state?.subscription?.email);
  } catch (err) {
    setActivationMessage(err?.message || String(err), true);
  }
});

els.applyRenewalCodeBtn?.addEventListener("click", async () => {
  try {
    const code = els.renewalCodeInput?.value || "";
    const email = els.email?.value || state?.subscription?.email || "";
    await ipcRenderer.invoke("activate-renewal-code", { code, email });
    setActivationMessage("Ny abonnementkode aktiveret. Du har 30 gange igen.");
    await refreshState();
  } catch (err) {
    setActivationMessage(err?.message || String(err), true);
  }
});

ipcRenderer.on("state-update", (_evt, nextState) => {
  render(nextState);
});

ipcRenderer.on("scan-log", (_evt, chunk) => {
  appendLog(chunk);
});

for (const btn of scrollLinks) {
  btn.addEventListener("click", () => {
    const targetId = String(btn?.dataset?.scrollTarget || "").trim();
    if (!targetId) return;
    if (els.dashboardView?.dataset?.activeTab !== "antivirus") setDashboardTab("antivirus");
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

for (const btn of document.querySelectorAll(".dashboard-nav-item[data-scroll-target]")) {
  btn.addEventListener("click", () => {
    const targetId = String(btn?.dataset?.scrollTarget || "").trim();
    if (!targetId) return;
    setDashboardTab("antivirus");
    const target = document.getElementById(targetId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

simsResetFiltersBtn?.addEventListener("click", () => {
  activeSimsSources = new Set(["all"]);
  for (const item of simsSourceFilters) item.classList.add("active");
  if (simsSortSelect) simsSortSelect.value = "relevance";
  if (simsPriceFilter) simsPriceFilter.value = "all";
  if (simsTimeFilter) simsTimeFilter.value = "all";
  if (simsRatingFilter) simsRatingFilter.value = "all";
  simsMinRating = 0;
  syncStarPickerUi();
  simsCurrentPage = 1;
  adultContentEnabled = false;
  adultContentConfirmed = false;
  if (adultContentToggle) adultContentToggle.checked = false;
  if (settingsAdultToggle) settingsAdultToggle.checked = false;
  renderPlatformToggles();
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery);
});

document.getElementById("simsPlatformToggles")?.addEventListener("click", (event) => {
  const chip = event.target?.closest?.(".platform-chip");
  if (!chip) return;
  const name = String(chip.dataset.platformName || "").trim();
  if (name === "all") {
    activeSimsSources = new Set(["all"]);
    renderPlatformToggles();
  } else if (activeSimsSources.has("all")) {
    activeSimsSources = new Set([name]);
    renderPlatformToggles();
  } else if (chip.classList.contains("active")) {
    activeSimsSources.delete(name);
    if (!activeSimsSources.size) activeSimsSources = new Set(["all"]);
    renderPlatformToggles();
  } else {
    activeSimsSources.add(name);
    syncPlatformFilterState();
  }
  for (const item of simsSourceFilters) {
    if (item.dataset.sourceFilter === "all") {
      item.classList.toggle("active", activeSimsSources.has("all"));
      continue;
    }
    item.classList.toggle("active", activeSimsSources.has("all") || activeSimsSources.has(item.dataset.sourceFilter));
  }
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery);
});

document.getElementById("pickDownloadsManageBtn")?.addEventListener("click", async () => {
  try {
    await ipcRenderer.invoke("pick-downloads-folder");
    await refreshState();
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

document.getElementById("openDownloadsManageBtn")?.addEventListener("click", () => els.openDownloadsBtn?.click());
document.getElementById("pickDestinationManageBtn")?.addEventListener("click", () => els.pickDestinationBtn?.click());
document.getElementById("openDestinationManageBtn")?.addEventListener("click", () => els.openDestinationBtn?.click());

for (const btn of dashboardTabButtons) {
  btn.addEventListener("click", () => {
    setDashboardTab(btn?.dataset?.dashboardTab || "antivirus");
  });
}

for (const btn of dashboardNavItems) {
  btn.addEventListener("click", () => {
    setDashboardTab(btn?.dataset?.dashboardTab || "search", btn.id);
  });
}

async function onModsHealthCardClick(event) {
  const card = event.target?.closest?.(".mods-health-card");
  if (!card) return;
  if (event.target?.closest?.(".mods-health-show-all, .mods-health-btn-outline, .mods-health-tabs button")) return;
  const item = {
    savedTo: card.getAttribute("data-reveal-path"),
    path: card.getAttribute("data-reveal-path"),
    fileName: card.getAttribute("data-mod-file"),
  };
  if (event.target?.closest?.("[data-remove-mod-file]")) {
    await removeModFile(item);
    return;
  }
  if (event.target?.closest?.("[data-show-mod-file]") || card) await revealModInFolder(item);
}

function initModsHealthEvents() {
  document.getElementById("modsHealthScroll")?.addEventListener("click", (event) => {
    if (event.target?.closest?.(".mods-health-card")) {
      onModsHealthCardClick(event);
      return;
    }
    const expandBtn = event.target?.closest?.("[data-mods-expand]");
    if (expandBtn) {
      const kind = expandBtn.getAttribute("data-mods-expand");
      modsHealthExpand[kind] = !modsHealthExpand[kind];
      renderModsHealthView(buildModsHealthCatalogue());
    }
  });

  document.getElementById("modsHealthTabs")?.addEventListener("click", (event) => {
    const tabBtn = event.target?.closest?.("[data-mods-tab]");
    if (!tabBtn) return;
    modsHealthTab = tabBtn.getAttribute("data-mods-tab") || "all";
    renderModsHealthView(buildModsHealthCatalogue());
  });

  document.getElementById("modsHealthOpenFolderBtn")?.addEventListener("click", () => els.openDestinationBtn?.click());
  document.getElementById("modsDeactivateAllBroken")?.addEventListener("click", async () => {
    const { broken } = buildModsHealthCatalogue();
    const first = broken.find((b) => b.savedTo || b.fileName);
    if (first) await revealModInFolder(first);
    setMessage("Åbn og fjern broken mods én ad gangen i Finder.");
  });
  document.getElementById("modsUpdateGuideBtn")?.addEventListener("click", () => setDashboardTab("search"));
  document.getElementById("modsHealthGuideBtn")?.addEventListener("click", () => setDashboardTab("forum"));
}

els.outdatedModsList?.addEventListener("click", onModsHealthCardClick);

function pathBasename(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parts = raw.split(/[/\\]/);
  return parts[parts.length - 1] || "";
}

document.getElementById("outdatedScanBtn")?.addEventListener("click", () => {
  refreshOutdatedModsView();
});

simsSearchBtn?.addEventListener("click", () => {
  runSimsSearch();
});

simsSearchInput?.addEventListener("input", (e) => {
  const input = e.target;
  const val = input.value;
  const cursor = input.selectionStart ?? val.length;
  const trailingSpace = val.length > 0 && val[val.length - 1] === " ";
  // Keep real words only (filter out lone "#" with nothing after it)
  const words = val.split(/\s+/).filter((w) => w.length > 0 && w !== "#");
  const tagged = words.map((w) => (w.startsWith("#") ? w : "#" + w));
  const newVal = tagged.join(" ") + (trailingSpace ? " " : "");
  if (newVal !== val) {
    const delta = newVal.length - val.length;
    input.value = newVal;
    const newCursor = Math.max(0, cursor + delta);
    input.setSelectionRange(newCursor, newCursor);
  }
  updateSimsSearchHints();
});

simsSearchInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  runSimsSearch();
});

document.addEventListener("click", (event) => {
  const hintBtn = event.target?.closest?.("[data-sims-hint]");
  if (!hintBtn) return;
  event.preventDefault();
  applySimsHintQuery(hintBtn.getAttribute("data-sims-hint"));
});

for (const btn of simsModeButtons) {
  btn.addEventListener("click", () => setSimsSearchMode(btn?.dataset?.simsMode || "cc"));
}

function onSimsFilterChange() {
  simsCurrentPage = 1;
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery, 1);
}

simsSortSelect?.addEventListener("change", onSimsFilterChange);
simsPriceFilter?.addEventListener("change", onSimsFilterChange);
simsTimeFilter?.addEventListener("change", onSimsFilterChange);
simsRatingFilter?.addEventListener("change", onSimsFilterChange);

adultContentToggle?.addEventListener("change", () => {
  if (adultContentToggle.checked) {
    adultContentToggle.checked = false;
    setAdultModal(true);
    return;
  }
  adultContentEnabled = false;
  adultContentConfirmed = false;
  try {
    localStorage.removeItem("modguard_adult_confirmed");
  } catch {}
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery);
});

adultCancelBtn?.addEventListener("click", () => {
  adultContentEnabled = false;
  adultContentConfirmed = false;
  if (adultContentToggle) adultContentToggle.checked = false;
  setAdultModal(false);
});

function updateAdultModeButtons() {
  const show = adultContentEnabled && adultContentConfirmed;
  const adultBtn = document.getElementById("modeAdultBtn");
  const wwccBtn  = document.getElementById("modeWwccBtn");
  if (adultBtn) adultBtn.style.display = show ? "" : "none";
  if (wwccBtn)  wwccBtn.style.display  = show ? "" : "none";
}

adultAcceptBtn?.addEventListener("click", () => {
  if (!adultConfirmCheck?.checked) {
    setMessage("Bekræft først at du er over 18 år.", true);
    return;
  }
  adultContentEnabled = true;
  adultContentConfirmed = true;
  if (adultContentToggle) adultContentToggle.checked = true;
  try {
    localStorage.setItem("modguard_adult_confirmed", "yes");
  } catch {}
  setAdultModal(false);
  updateAdultModeButtons();
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery);
});

for (const btn of simsSourceFilters) {
  btn.addEventListener("click", () => {
    const source = String(btn?.dataset?.sourceFilter || "").trim();
    if (!source) return;
    if (source === "all") {
      activeSimsSources = new Set(["all"]);
      for (const item of simsSourceFilters) item.classList.add("active");
    } else {
      activeSimsSources.delete("all");
      btn.classList.toggle("active");
      activeSimsSources = new Set(
        simsSourceFilters
          .filter((item) => item !== simsSourceFilters[0] && item.classList.contains("active"))
          .map((item) => String(item.dataset.sourceFilter || ""))
          .filter(Boolean)
      );
      if (!activeSimsSources.size) activeSimsSources.add("all");
      simsSourceFilters[0]?.classList.toggle("active", activeSimsSources.has("all"));
    }
    if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery);
  });
}

for (const trigger of simsSearchTriggers) {
  trigger.addEventListener("click", () => {
    setDashboardTab("search");
    const platform = String(trigger?.dataset?.platformQuery || "").trim();
    const query = trigger?.dataset?.simsQuery || "";
    if (platform) {
      lastSimsQuery = query || lastSimsQuery;
      renderSimsPlatform(platform, query);
      return;
    }
    runSimsSearch(query);
  });
}

function handleModsearchDownloadClick(event) {
  const searchDownloadBtn = event.target?.closest?.("[data-download-sims-title]");
  if (!searchDownloadBtn) return false;
  const title = String(searchDownloadBtn.getAttribute("data-download-sims-title") || "");
  const item = getVisibleSimsItems().find((entry) => entry.title === title);
  if (!item) return true;
  searchDownloadBtn.textContent = "Scanner...";
  searchDownloadBtn.setAttribute("disabled", "disabled");
  ipcRenderer.invoke("modsearch-download", {
    title: item.title,
    fileName: item.fileName,
    source: item.source || item.platform,
    url: item.url || platformForItem(item).url(normalizeSimsQuery(lastSimsQuery)),
    pageUrl: item.url || platformForItem(item).url(normalizeSimsQuery(lastSimsQuery)),
    curseforgeModId: item.curseforgeModId || null,
    directDownloadUrl: item.directDownloadUrl || "",
  }).then((result) => {
    if (result?.status === "error") {
      searchDownloadBtn.textContent = result?.canOpenSource ? "Åbn kilde" : (tt("ui.downloadBtn") || "Download");
      searchDownloadBtn.removeAttribute("disabled");
      if (result?.canOpenSource && result?.sourceUrl) {
        searchDownloadBtn.removeAttribute("data-download-sims-title");
        searchDownloadBtn.setAttribute("data-open-sims-url", String(result.sourceUrl));
      }
      setMessage(result?.message || "Download fejlede.", true);
      return;
    }
    searchDownloadBtn.textContent = result?.status === "clean" ? "Gemt" : "Blokeret";
    setMessage(result?.message || "Alle mods scannes for virus, før de lægges i din Mods-mappe.", result?.status !== "clean");
  }).catch((err) => {
    searchDownloadBtn.textContent = "Download";
    searchDownloadBtn.removeAttribute("disabled");
    setMessage(err?.message || String(err), true);
  });
  return true;
}

function handleBottomPanelClick(event) {
  if (handleModsearchDownloadClick(event)) return;
  const openBtn = event.target?.closest?.("[data-open-sims-url]");
  if (openBtn) openModSourceUrl(String(openBtn.getAttribute("data-open-sims-url") || ""));
}

simsBottomPreview?.addEventListener("click", handleBottomPanelClick);
simsBottomScan?.addEventListener("click", handleBottomPanelClick);
simsDetailPanel?.addEventListener("click", handleBottomPanelClick);

simsBrowserScreen?.addEventListener("click", (event) => {
  const viewBtn = event.target?.closest?.("[data-sims-view]");
  if (viewBtn) {
    simsGridListView = String(viewBtn.getAttribute("data-sims-view") || "grid") === "list" ? "list" : "grid";
    renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
    return;
  }

  const hubPickBtn = event.target?.closest?.("[data-hub-picker-id]");
  if (hubPickBtn) {
    event.stopPropagation();
    const hubId = String(hubPickBtn.getAttribute("data-hub-picker-id") || "");
    const hubItem = getVisibleSimsItems().find((entry) => String(entry.id) === hubId);
    if (hubItem) void openHubPickerModal(hubItem);
    return;
  }

  const hubPickRow = event.target?.closest?.("[data-hub-pick-index]");
  if (hubPickRow) {
    event.stopPropagation();
    const parentId = String(hubPickRow.getAttribute("data-hub-parent-id") || "");
    const index = Number(hubPickRow.getAttribute("data-hub-pick-index") || 0);
    const parentItem = getVisibleSimsItems().find((entry) => String(entry.id) === parentId);
    const children = hubChildrenCache.get(parentId) || parentItem?.hubChildren || [];
    const child = children[index];
    if (parentItem && child) {
      const picked = hubChildToResultItem(child, parentItem, index, children.length);
      closeHubPickerModal();
      const idx = simsVisibleResults.findIndex((e) => String(e.id) === parentId);
      if (idx >= 0) simsVisibleResults.splice(idx, 1, picked);
      else simsVisibleResults.unshift(picked);
      renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
      setMessage(`Du valgte: ${picked.title}`);
    }
    return;
  }

  const favBtn = event.target?.closest?.("[data-fav-sims-title]");
  if (favBtn) {
    event.stopPropagation();
    const title = String(favBtn.getAttribute("data-fav-sims-title") || "");
    const item = getVisibleSimsItems().find((entry) => entry.title === title);
    const on = toggleSimsFavorite(item || title);
    favBtn.classList.toggle("is-fav", on);
    favBtn.textContent = on ? "♥" : "♡";
    if (els.dashboardView?.dataset?.activeTab === "favorites") renderFavoritesHub();
    return;
  }

  const zoomBtn = event.target?.closest?.("[data-preview-zoom-title]");
  if (zoomBtn) {
    const title = String(zoomBtn.getAttribute("data-preview-zoom-title") || "");
    const item = getVisibleSimsItems().find((entry) => entry.title === title);
    if (item) openPreviewZoom(item, lastSimsQuery || simsSearchInput?.value);
    return;
  }

  const modCard = event.target?.closest?.(".mod-card");
  if (modCard) {
    if (event.target?.closest?.(".mod-card-download, .mod-card-dl-round, .mod-card-save, .mod-card-fav, .mod-card-open, .mod-card-title-link")) return;
    simsSelectedModId = String(modCard.getAttribute("data-mod-id") || "");
    const item = getVisibleSimsItems().find((entry) => String(entry.id || entry.title) === simsSelectedModId);
    if (item) {
      simsDetailTab = "zoom";
      renderSimsDetailPanel(item, lastSimsQuery || simsSearchInput?.value);
      for (const card of simsBrowserScreen.querySelectorAll(".mod-card")) {
        card.classList.toggle("selected", card === modCard);
      }
    }
  }

  if (handleModsearchDownloadClick(event)) return;

  const downloadBtn = event.target?.closest?.("[data-simulated-download]");
  if (downloadBtn) {
    const title = String(downloadBtn.getAttribute("data-simulated-download") || "Sims fil");
    const current = simsBrowserScreen.innerHTML;
    simsBrowserScreen.innerHTML = current.replace(
      /<div class="download-flow">[\s\S]*?<\/div>/,
      `<div class="download-flow active">
        <span>Sandbox: ${escapeHtml(title)}</span>
        <span>Scanner filen</span>
        <span>Ren fil flyttes til modfolder</span>
        <span>Usikker fil blokeres</span>
      </div>`
    );
    return;
  }

  const resultBtn = event.target?.closest?.("[data-open-sims-title]");
  if (resultBtn && event.target?.closest?.(".open-result, .ghost-button")) {
    const title = String(resultBtn.getAttribute("data-open-sims-title") || "");
    const item = getVisibleSimsItems().find((entry) => entry.title === title) || getVisibleSimsItems()[0];
    const url = String(resultBtn.getAttribute("data-open-sims-url") || "");
    if (item) renderSimsInternalPage(item, url);
    return;
  }

  const pageBtn = event.target?.closest?.("[data-sims-page]");
  if (pageBtn) {
    const page = Math.max(1, Math.min(100, Number(pageBtn.getAttribute("data-sims-page") || 1)));
    renderSimsSearch(simsSearchInput?.value || lastSimsQuery, page);
    return;
  }

  const sortPill = event.target?.closest?.("[data-sort-pill]");
  if (sortPill && simsSortSelect) {
    const key = String(sortPill.getAttribute("data-sort-pill") || "");
    if (key !== "count" && key !== "source") {
      simsSortSelect.value = key === "popular" ? "popular" : key;
      renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
    }
    return;
  }

  const btn = event.target?.closest?.("[data-open-sims-url]");
  if (!btn) return;
  const url = String(btn.getAttribute("data-open-sims-url") || "");
  openModSourceUrl(url);
});

document.getElementById("previewZoomClose")?.addEventListener("click", closePreviewZoom);
document.getElementById("previewZoomOverlay")?.addEventListener("click", (event) => {
  if (event.target?.id === "previewZoomOverlay") closePreviewZoom();
});
document.getElementById("previewZoomOpenLink")?.addEventListener("click", () => {
  if (previewZoomOpenUrl) openModSourceUrl(previewZoomOpenUrl);
});
document.getElementById("previewZoomImgWrap")?.addEventListener("wheel", (event) => {
  const img = document.getElementById("previewZoomImg");
  if (!img) return;
  event.preventDefault();
  const scale = Number(img.dataset.zoom || "1.35");
  const next = Math.max(1, Math.min(3.5, scale + (event.deltaY < 0 ? 0.12 : -0.12)));
  img.dataset.zoom = String(next);
  img.style.transform = `scale(${next})`;
}, { passive: false });

minimizeBtnSearch?.addEventListener("click", () => {
  document.getElementById("minimizeBtn")?.click();
});

simsSourceFilter?.addEventListener("change", () => {
  const val = String(simsSourceFilter.value || "all");
  if (val === "all") activeSimsSources = new Set(["all"]);
  else {
    activeSimsSources = new Set([val]);
    syncSourceFilterButtons(val);
  }
  syncPlatformFilterState();
  renderPlatformToggles();
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
});

simsCategoryFilter?.addEventListener("change", () => {
  const mode = String(simsCategoryFilter.value || "cc");
  simsSearchMode = mode;
  for (const btn of simsModeButtons) btn.classList.toggle("active", btn.dataset.simsMode === mode);
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
});

simsTypeFilter?.addEventListener("change", () => {
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
});

function syncSourceFilterButtons(name) {
  for (const btn of document.querySelectorAll("[data-source-filter]")) {
    const key = btn.getAttribute("data-source-filter");
    btn.classList.toggle("active", name === "all" ? key === "all" : key === name);
  }
}

settingsLocaleSelect?.addEventListener("change", () => {
  const locale = String(settingsLocaleSelect.value || "da");
  forcedLocale = locale;
  try {
    localStorage.setItem("skimo_locale", locale);
  } catch {}
  ipcRenderer.invoke("set-locale-preference", locale).catch(() => {});
  setLocale(locale);
  if (state) render(state);
});

settingsToggleProtection?.addEventListener("click", async () => {
  try {
    await ipcRenderer.invoke("set-protection", !state?.protectionEnabled);
  } catch (err) {
    setMessage(err?.message || String(err), true);
  }
});

settingsOpenDownloadsBtn?.addEventListener("click", () => els.openDownloadsBtn?.click());
settingsPickDestBtn?.addEventListener("click", () => els.pickDestinationBtn?.click());
settingsClearHistoryBtn?.addEventListener("click", () => els.clearHistoryBtn?.click());

// VirusTotal API key management
async function loadVtKeyStatus() {
  const badge = document.getElementById("vtKeyStatusBadge");
  try {
    const { configured, fromEnv } = await ipcRenderer.invoke("vt-get-key");
    if (!badge) return;
    if (configured && fromEnv) {
      badge.textContent = "Aktiv (miljøvariabel)";
      badge.className = "vt-status-badge vt-status-env";
    } else if (configured) {
      badge.textContent = "Aktiv ✓";
      badge.className = "vt-status-badge vt-status-on";
    } else {
      badge.textContent = "Ikke aktiv";
      badge.className = "vt-status-badge vt-status-off";
    }
  } catch { /* ignore */ }
}

document.getElementById("settingsVtSaveBtn")?.addEventListener("click", async () => {
  const input = document.getElementById("settingsVtApiKey");
  const result = document.getElementById("vtTestResult");
  const key = String(input?.value || "").trim();
  try {
    await ipcRenderer.invoke("vt-save-key", { key });
    await loadVtKeyStatus();
    if (result) { result.textContent = key ? "Nøgle gemt ✓" : "Nøgle fjernet"; result.style.color = "#4ade80"; }
    if (input) input.value = "";
  } catch (err) {
    if (result) { result.textContent = `Fejl: ${err?.message || err}`; result.style.color = "#f87171"; }
  }
});

document.getElementById("settingsVtTestBtn")?.addEventListener("click", async () => {
  const result = document.getElementById("vtTestResult");
  if (result) { result.textContent = "Tester forbindelse til VirusTotal…"; result.style.color = "rgba(255,255,255,0.45)"; }
  try {
    const res = await ipcRenderer.invoke("vt-test-key");
    if (result) {
      result.textContent = res.ok ? `✓ ${res.message}` : `✗ ${res.error}`;
      result.style.color = res.ok ? "#4ade80" : "#f87171";
    }
  } catch (err) {
    if (result) { result.textContent = `Forbindelsesfejl: ${err?.message || err}`; result.style.color = "#f87171"; }
  }
});

document.getElementById("vtGetKeyLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  shell.openExternal("https://www.virustotal.com/gui/join-us").catch(() => {});
});

loadVtKeyStatus();

settingsAdultToggle?.addEventListener("change", () => {
  if (settingsAdultToggle.checked) {
    settingsAdultToggle.checked = false;
    setDashboardTab("search");
    setAdultModal(true);
    return;
  }
  adultContentEnabled = false;
  adultContentConfirmed = false;
  if (adultContentToggle) adultContentToggle.checked = false;
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery);
});

for (const btn of forumTabButtons) {
  btn.addEventListener("click", () => {
    forumTab = String(btn.dataset.forumTab || "all");
    for (const item of forumTabButtons) item.classList.toggle("active", item === btn);
    renderForum();
  });
}

forumSortSelect?.addEventListener("change", () => renderForum());
forumSourceSelect?.addEventListener("change", () => renderForum());
forumTimeSelect?.addEventListener("change", () => renderForum());

for (const btn of forumPlatformFilterButtons) {
  btn.addEventListener("click", () => {
    forumPlatformFilter = String(btn.dataset.forumPlatform || "all");
    for (const item of forumPlatformFilterButtons) item.classList.toggle("active", item === btn);
    renderForum();
  });
}

document.getElementById("forumFilterBtn")?.addEventListener("click", () => {
  forumSourceSelect?.focus();
});

document.getElementById("forumSection")?.addEventListener("click", (event) => {
  const openTarget = event.target?.closest?.("[data-forum-open-url]");
  if (openTarget && !event.target?.closest?.("[data-forum-link]")) {
    event.preventDefault();
    const url = openTarget.getAttribute("data-forum-open-url");
    if (url) openModSourceUrl(url);
    return;
  }
  const seeAll = event.target?.closest?.("[data-forum-link]");
  if (!seeAll) return;
  event.preventDefault();
  const kind = seeAll.getAttribute("data-forum-link");
  if (kind === "warnings") {
    forumTab = "warn";
    for (const item of forumTabButtons) item.classList.toggle("active", item.dataset.forumTab === "warn");
  } else if (kind === "reddit") {
    forumOriginFilter = "web";
    forumPlatformFilter = "reddit";
    if (forumSourceSelect) forumSourceSelect.value = "reddit";
    for (const item of forumPlatformFilterButtons) {
      item.classList.toggle("active", item.dataset.forumPlatform === "reddit");
    }
  }
  void renderForum();
});

document.getElementById("forumRefreshRedditBtn")?.addEventListener("click", async () => {
  await loadRedditForumPosts(true);
  await renderForum();
  setMessage("Reddit-tråde er opdateret.");
});

document.getElementById("forumSearchInput")?.addEventListener("input", () => {
  void renderForum();
});

loadSimsFavorites();

moddbIndexBtn?.addEventListener("click", async () => {
  moddbIndexBtn.disabled = true;
  moddbIndexBtn.textContent = "Indekserer…";
  try {
    const status = await ipcRenderer.invoke("moddb-start-index");
    renderModdbStatus(status);
    if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
    setMessage(`Database opdateret: ${Number(status?.total || 0).toLocaleString("da-DK")} Sims 4 mods/CC.`, false);
  } catch (err) {
    setMessage(err?.message || String(err), true);
  } finally {
    moddbIndexBtn.disabled = false;
    moddbIndexBtn.textContent = "Opdater database";
  }
});

document.getElementById("simsStarPicker")?.addEventListener("click", (event) => {
  const btn = event.target?.closest?.(".star-btn");
  if (!btn) return;
  const clicked = Number(btn.getAttribute("data-star") || 0);
  simsMinRating = clicked === simsMinRating ? 0 : clicked;
  syncStarPickerUi();
  if (simsHasSearched) renderSimsSearch(simsSearchInput?.value || lastSimsQuery, simsCurrentPage);
});

document.getElementById("openModsFolderBtn")?.addEventListener("click", async () => {
  if (!state?.destinationFolder) {
    await els.pickDestinationBtn?.click?.();
    await refreshState();
  }
  if (state?.destinationFolder) els.openDestinationBtn?.click?.();
});

document.getElementById("profileRenewBtn")?.addEventListener("click", () => els.openRenewalBtn?.click?.());

document.getElementById("profileScanOn")?.addEventListener("click", async () => {
  if (!state?.protectionEnabled) els.toggleBtn?.click?.();
  renderSettingsHub();
});

document.getElementById("profileScanOff")?.addEventListener("click", async () => {
  if (state?.protectionEnabled) els.toggleBtn?.click?.();
  renderSettingsHub();
});

function initFavoritesHubEvents() {
  document.getElementById("favoritesSearchInput")?.addEventListener("input", () => renderFavoritesHub());
  document.getElementById("favoritesSection")?.addEventListener("click", (event) => {
    const openBtn = event.target?.closest?.("[data-open-sims-url]");
    if (openBtn) {
      event.preventDefault();
      openModSourceUrl(openBtn.getAttribute("data-open-sims-url"));
      return;
    }
    const favBtn = event.target?.closest?.("[data-fav-sims-title]");
    if (favBtn) {
      event.stopPropagation();
      toggleSimsFavorite(favBtn.getAttribute("data-fav-sims-title"));
      renderFavoritesHub();
    }
  });
}

const SIMS_CC_DEMAND = [
  { id: "d-hair", title: "Alpha hair with all LODs + textures", category: "cas", hunger: "critical", votes: 9200, sources: ["Reddit r/Sims4", "TSR comments"], summary: "Simmers want reliable maxis-match hair with HQ swatches — not broken LODs after patches.", gap: "Broken CC hair after game updates is the #1 complaint.", searchTerms: ["hair", "alpha", "maxis match"] },
  { id: "d-sliders", title: "Body / face sliders that survive patches", category: "cas", hunger: "critical", votes: 8100, sources: ["Patreon", "Discord"], summary: "Universal slider frameworks and presets that don't break every patch day.", gap: "Outdated slider mods crash CAS on launch.", searchTerms: ["slider", "cas", "preset"] },
  { id: "d-mccc", title: "MCCC-style stability for casual players", category: "gameplay", hunger: "critical", votes: 7600, sources: ["r/Sims4", "ModGuard forum"], summary: "One trusted mod to fix townie outfits, population, and weird bugs — with safe defaults.", gap: "Too many gameplay mods conflict without a guide.", searchTerms: ["mccc", "gameplay", "population"] },
  { id: "d-bbb", title: "Better Build Buy parity (live mode + debug)", category: "buildbuy", hunger: "high", votes: 6800, sources: ["TwistedMexi", "Reddit"], summary: "Players expect BBB-style tools: free placement, enlarged catalogs, off-grid — kept updated.", gap: "Build tools fragment across multiple outdated downloads.", searchTerms: ["better build buy", "bbb", "build"] },
  { id: "d-scan", title: "Pre-install CC scan & quarantine", category: "security", hunger: "high", votes: 6400, sources: ["ModGuard users"], summary: "Scan packages before they touch Mods folder — especially adfly / reupload sites.", gap: "Infected .package files spread via dead links.", searchTerms: ["scan", "virus", "safe"] },
  { id: "d-wcif", title: "WCIF finder that actually works", category: "tools", hunger: "high", votes: 5900, sources: ["Tumblr", "Discord"], summary: "\"Where can I find\" posts dominate — integrated reverse image / creator lookup wanted.", gap: "WCIF answers scattered across dead Tumblr links.", searchTerms: ["wcif", "clothes", "find"] },
  { id: "d-perf", title: "Performance mod pack for weak PCs", category: "performance", hunger: "high", votes: 5500, sources: ["YouTube", "Reddit"], summary: "Curated bundle: fewer textures, safer defaults, clear install order for laptops.", gap: "People install 80GB of CC then blame the game.", searchTerms: ["performance", "lag", "fps"] },
  { id: "d-pose", title: "Pose packs with in-game preview", category: "cas", hunger: "medium", votes: 4200, sources: ["Pose creators"], summary: "Browse poses in-app with thumbnails — not guessing from vague titles.", gap: "Pose spam folders with duplicate names.", searchTerms: ["pose", "animation", "studio"] },
  { id: "d-legacy", title: "Legacy edition mod bridge", category: "tools", hunger: "medium", votes: 3800, sources: ["EA forums"], summary: "Clear labeling which CC works on Legacy vs 64-bit — and auto-filter search.", gap: "Wrong edition downloads brick saves.", searchTerms: ["legacy", "edition", "64 bit"] },
  { id: "d-outdated", title: "Outdated mod dashboard", category: "security", hunger: "high", votes: 5100, sources: ["Broken mods megathread"], summary: "See broken / outdated CC after each patch with one-click disable list.", gap: "Players don't know which package causes the crash.", searchTerms: ["outdated", "broken", "patch"] },
];
let activeModDemandTab = "all";
let activeModDemandQuery = "";
let modDemandListenersBound = false;

function filterModDemandItems() {
  const q = normalizeSearchText(activeModDemandQuery);
  return SIMS_CC_DEMAND.filter((item) => {
    if (activeModDemandTab !== "all" && item.category !== activeModDemandTab) return false;
    if (!q) return true;
    const hay = normalizeSearchText(`${item.title} ${item.summary} ${item.gap} ${(item.searchTerms || []).join(" ")}`);
    return q.split(" ").filter((t) => t.length >= 2).every((t) => hay.includes(t));
  });
}

function renderModDemandCard(item) {
  const hungerLabel = item.hunger === "critical" ? "Critical demand" : item.hunger === "high" ? "High demand" : "Growing";
  return `
    <article class="mg-demand-card" data-hunger="${escapeHtml(item.hunger)}">
      <div class="mg-demand-card-head">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="mg-demand-badge ${escapeHtml(item.hunger)}">${escapeHtml(hungerLabel)}</span>
      </div>
      <p class="mg-demand-summary">${escapeHtml(item.summary)}</p>
      <div class="mg-demand-meta"><span>▲ ${Number(item.votes).toLocaleString()} signals</span><span>${escapeHtml((item.sources || []).join(" · "))}</span></div>
      <p class="mg-demand-summary" style="opacity:.85;font-size:.78rem"><strong>Gap:</strong> ${escapeHtml(item.gap)}</p>
      <div class="mg-demand-actions">
        <button type="button" class="mg-demand-btn" data-demand-search="${escapeHtml((item.searchTerms || []).slice(0, 3).join(" "))}">Search CC →</button>
        <button type="button" class="mg-demand-btn secondary" data-demand-forum="1">Forum threads</button>
      </div>
    </article>
  `;
}

function renderModDemandPage() {
  const section = document.getElementById("modDemandSection");
  const list = document.getElementById("modDemandList");
  const stats = document.getElementById("modDemandStats");
  if (section) section.hidden = false;
  const items = filterModDemandItems();
  if (stats) {
    stats.innerHTML = `
      <div class="mg-demand-stat"><strong>${SIMS_CC_DEMAND.length}</strong> tracked gaps</div>
      <div class="mg-demand-stat"><strong>${SIMS_CC_DEMAND.filter((i) => i.hunger === "critical").length}</strong> critical</div>
      <div class="mg-demand-stat"><strong>${items.length}</strong> shown</div>`;
  }
  if (list) {
    list.innerHTML = items.length
      ? items.map((item) => renderModDemandCard(item)).join("")
      : '<div class="mg-idle"><strong>No gaps match</strong><span>Try another filter.</span></div>';
  }
  bindModDemandListeners();
}

function bindModDemandListeners() {
  if (modDemandListenersBound) return;
  modDemandListenersBound = true;
  document.getElementById("modDemandSearchInput")?.addEventListener("input", (e) => {
    activeModDemandQuery = String(e.target?.value || "");
    renderModDemandPage();
  });
  document.getElementById("modDemandTabs")?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-demand-tab]");
    if (!btn) return;
    activeModDemandTab = btn.getAttribute("data-demand-tab") || "all";
    for (const b of document.querySelectorAll("#modDemandTabs [data-demand-tab]")) b.classList.toggle("active", b === btn);
    renderModDemandPage();
  });
  document.getElementById("modDemandList")?.addEventListener("click", (e) => {
    const searchBtn = e.target?.closest?.("[data-demand-search]");
    if (searchBtn) {
      const q = searchBtn.getAttribute("data-demand-search") || "";
      setDashboardTab("search", "navModSearch");
      if (simsSearchInput) simsSearchInput.value = q;
      runSimsSearch(q);
      return;
    }
    if (e.target?.closest?.("[data-demand-forum]")) setDashboardTab("forum", "navForum");
  });
}

function initMgDashboardUi() {
  document.getElementById("mgCategoryPills")?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-sims-cat]");
    if (!btn) return;
    activeSimsCatPill = btn.getAttribute("data-sims-cat") || "all";
    for (const b of document.querySelectorAll("#mgCategoryPills [data-sims-cat]")) b.classList.toggle("active", b === btn);
    if (simsCategoryFilter) {
      const v = activeSimsCatPill === "all" ? "all" : activeSimsCatPill === "cas" ? "cc" : activeSimsCatPill;
      if ([...simsCategoryFilter.options].some((o) => o.value === v)) simsCategoryFilter.value = v;
    }
    if (!simsHasSearched) renderSimsSearchIdle();
    else renderSimsSearch(simsSearchInput?.value || lastSimsQuery);
  });
  bindModFitListenersSims();
  document.getElementById("mgLoadMoreMods")?.addEventListener?.("click", () => {
    simsGridRenderLimit += 200;
    paintSimsModGrid(simsVisibleResults.length ? simsVisibleResults : getSimsBrowseItems(activeSimsCatPill), { reset: false });
  });
  simsBrowserScreen?.addEventListener("click", (e) => {
    if (e.target?.id === "mgLoadMoreMods" || e.target?.closest?.("#mgLoadMoreMods")) {
      simsGridRenderLimit += 200;
      paintSimsModGrid(simsVisibleResults.length ? simsVisibleResults : getSimsBrowseItems(activeSimsCatPill), { reset: false });
    }
  });
  syncQuickFiltersPlacement("search");
  updateMgStats();
}

initLocaleFromStorage();
loadSimsFavorites();
initFavoritesHubEvents();
initSettingsHubEvents();
initModsHealthEvents();
initModLivePeek();
initMgDashboardUi();
applyDashboardI18n(currentLocale);
renderPlatformToggles();
syncStarPickerUi();
setDashboardTab("scanner", "navScanner");
updateSimsSearchHints();
if (simsCategoryFilter) simsCategoryFilter.value = simsSearchMode || "cc";
setAuthMode("login");

refreshState().catch((err) => setMessage(err?.message || String(err), true));
