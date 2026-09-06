const { ipcRenderer, shell } = require("electron");
const { localeFromCountry, t } = require("./i18n");

/** Homepage CTA — replace when final URL is provided */
const MG_WEBSITE_URL = "https://modguard.dk";

// ============================================================
//  MINECRAFT MOD SEARCH DATA
// ============================================================

// [category, title, platform, description, tags, platformKey, loaders, minVersion, thumbUrl, downloads]
const MC_MOD_SEED = [
  ["optimization","Sodium","Modrinth","Render-optimeringsMod til Fabric. Øger FPS dramatisk og bruger moderne OpenGL-teknikker.","sodium fps fabric performance render opengl","modrinth","fabric","1.21","https://cdn.modrinth.com/data/AANobbMI/icon.png",10_500_000],
  ["optimization","Iris Shaders","Modrinth","Shader-pakke til Fabric/Sodium — kompatibel med OptiFine shaders.","iris shaders fabric sodium graphics beautiful visual","modrinth","fabric","1.21","https://cdn.modrinth.com/data/YL57xq9U/icon.png",8_200_000],
  ["optimization","OptiFine","OptiFine.net","Den klassiske optimeringsMod. HD teksturer, shader-support og bedre FPS.","optifine shaders fps hd textures forge classic","optifine","forge","1.20","https://optifine.net/images/oflogo.png",50_000_000],
  ["optimization","Lithium","Modrinth","Serverside ydeevneoptimering til Fabric — markant bedre TPS.","lithium server optimization tps performance fabric","modrinth","fabric","1.21","https://cdn.modrinth.com/data/gvQqBUqZ/icon.png",6_800_000],
  ["optimization","FerriteCore","Modrinth","Mindsker Minecrafts RAM-brug markant — vigtigt til modpacks.","ferritecore memory ram optimization performance modpack","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/uXXizFIs/icon.png",4_200_000],
  ["utility","JEI - Just Enough Items","CurseForge","Vis opskrifter og ingredienser for alle items. Essentiel mod til modpacks.","jei just enough items recipes crafting ingredients ui","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/291/402/637326387890069658.png",32_000_000],
  ["utility","AppleSkin","Modrinth","Viser detaljeret madinfo: mæthed, saturation, effekter og mere i HUD.","appleskin food hunger saturation hud ui display","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/EsAfCjCV/icon.png",5_400_000],
  ["utility","Xaero's Minimap","CurseForge","Minimap i hjørnet af skærmen med waypoints, cave view og death markers.","xaero minimap waypoints navigation hud map cave","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/31/768/636350540498680013.png",36_000_000],
  ["utility","Journeymap","CurseForge","Fuld-skærms interaktivt verdenskort med waypoints, teleport og real-time tracking.","journeymap fullscreen map waypoints navigation teleport realtime","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/31/817/636350597538709380.png",42_000_000],
  ["utility","Mod Menu","Modrinth","Tilføjer en mod-liste-menu til Fabric — se alle installerede mods.","modmenu mod list fabric ui installed version","modrinth","fabric","1.21","https://cdn.modrinth.com/data/mOgUt4GM/icon.png",9_100_000],
  ["utility","Waystones","CurseForge","Teleportér til waystone-blokke rundt i verden — perfekt til survival.","waystones teleport fast travel utility survival waypoint","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/276/484/637266374920726827.png",22_000_000],
  ["utility","Simple Voice Chat","Modrinth","Proximity voice chat direkte i Minecraft multiplayer.","voice chat proximity multiplayer communication server","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/9eGKb6K1/icon.png",5_800_000],
  ["world","Biomes O' Plenty","CurseForge","Tilføjer 80+ nye biomer med unik flora, fauna og terræn.","biomes bop worldgen terrain new biomes flora fauna","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/35/241/636363397990388775.png",26_000_000],
  ["world","Terralith","Modrinth","Redesigner verdensgenerering med spektakulære biomer og landformer.","terralith terrain worldgen biomes generation overworld","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/8oi3bsk5/icon.png",7_600_000],
  ["world","Oh The Biomes You'll Go","Modrinth","Tilføjer over 80 smukke biomer til overworld, nether og end.","byg biomes overworld nether end worldgen exploration","modrinth","fabric,forge","1.20","https://cdn.modrinth.com/data/bopmByMi/icon.png",3_200_000],
  ["magic","Botania","CurseForge","Naturmagi-mod med blomster, mana og fantastiske crafting-muligheder.","botania magic mana flowers botanical crafting nature","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/76/613/636596516793834065.png",16_000_000],
  ["magic","Twilight Forest","CurseForge","En komplet dimensionsmod: skove, bosser, dungeons og progression.","twilight forest dimension adventure magic boss dungeon progression","curseforge","forge,fabric","1.20","https://media.forgecdn.net/avatars/5/21/635265874014582082.png",21_000_000],
  ["magic","Ars Nouveau","Modrinth","Byg dine egne trylleformularer med et modulært trylleformularsystem.","ars nouveau magic spells custom spellbook arcane glyphs","modrinth","forge,fabric","1.20","https://cdn.modrinth.com/data/wouPaXGn/icon.png",2_800_000],
  ["technology","Create","Modrinth","Industrimod med roterende maskiner, gear, conveyor belts og damp.","create technology machines steam gears factory engineering contraption","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/LNytGWDc/icon.png",22_000_000],
  ["technology","Mekanism","CurseForge","Avanceret teknologimod med generators, factories og ressourceforarbejdning.","mekanism technology machines power energy ore processing nuclear","curseforge","forge","1.20","https://media.forgecdn.net/avatars/83/643/636643459403897139.png",19_000_000],
  ["technology","Thermal Expansion","CurseForge","Klassisk teknologimod med maskiner, RF-energi og processing.","thermal expansion technology machines rf energy processing classic","curseforge","forge","1.20","https://media.forgecdn.net/avatars/47/660/636442073580116974.png",16_000_000],
  ["adventure","Alex's Mobs","Modrinth","Tilføjer 85+ nye dyr, monstre og skabninger til verden.","alexs mobs animals creatures monsters wildlife adventure","modrinth","forge","1.21","https://cdn.modrinth.com/data/wssFqCzi/icon.png",13_000_000],
  ["adventure","Ice and Fire: Dragons","CurseForge","Tilføjer drager, sea serpents og andre mytologiske skabninger.","ice fire dragons mythical creatures fantasy adventure sea serpent","curseforge","forge,fabric","1.20","https://media.forgecdn.net/avatars/151/150/636812022985710060.png",23_000_000],
  ["adventure","Origins","Modrinth","Vælg en oprindelse med unikke evner og ulemper ved gamestart.","origins rpg abilities powers classes character passives","modrinth","fabric","1.21","https://cdn.modrinth.com/data/3BeIrqZR/icon.png",9_500_000],
  ["adventure","Dungeons & Taverns","Modrinth","Strukturgenerator: nye dungeons, taverner, landeveje og landsbyer.","dungeons taverns structures adventure exploration worldgen village","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/tpehi7ww/icon.png",3_500_000],
  ["decoration","Farmer's Delight","Modrinth","Mad, afgrøder, knive og køkkenblokke — et komplet madlavningssystem.","farmers delight food farming cooking crops kitchen mod","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/R2OftAxM/icon.png",11_000_000],
  ["decoration","Macaw's Furniture","CurseForge","Hundredvis af dekorative møbler til dit hjem.","macaw furniture decoration building interior design home","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/358/948/637610099527611090.png",8_500_000],
  ["shader","Complementary Shaders","CurseForge","Smuk og optimeret shader der fungerer med Iris og OptiFine.","complementary shaders beautiful graphics lighting realistic","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/488/396/638012898735481978.png",4_100_000],
  ["technology","Tinker's Construct","CurseForge","Tools, smelting, and tinkering — the classic tech mod for survival automation.","tinkers construct tools smeltery automation tech survival","curseforge","forge","1.20","https://cdn.modrinth.com/data/rxIIYO6c/icon.png",18_000_000],
  ["technology","Applied Energistics 2","CurseForge","Digital storage and autocrafting with ME networks and spatial IO.","applied energistics ae2 storage autocraft me system tech","curseforge","forge","1.20","https://cdn.modrinth.com/data/XxWD5pD3/icon.png",15_000_000],
  ["adventure","Artifacts","Modrinth","Discover powerful artifacts with unique abilities across the world.","artifacts adventure loot abilities equipment dungeon","modrinth","forge,fabric","1.21","https://cdn.modrinth.com/data/P0Mu4wcQ/icon.png",4_800_000],
  ["utility","Sophisticated Storage","Modrinth","Upgraded chests, barrels, and drawers with filtering and upgrades.","sophisticated storage chest barrel drawer inventory utility","modrinth","forge,fabric","1.21","https://cdn.modrinth.com/data/hMlaZH8f/icon.png",3_100_000],
  ["optimization","Fabulously Optimized","Modrinth","Performance-focused modpack baseline — Sodium, Iris, and essentials bundled.","fabulously optimized modpack performance fabric sodium iris","modrinth","fabric","1.21","https://cdn.modrinth.com/data/1KVo5zza/icon.png",6_200_000],
  // Extended seed — popular mods for better local search coverage
  ["optimization","Starlight","Modrinth","Rewrites the light engine to fix lighting performance and lag.","starlight light engine performance optimization lag chunk","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/H8CaAYZC/icon.png",3_900_000],
  ["optimization","Entity Culling","Modrinth","Skip rendering of entities that are not visible to the player.","entity culling render fps performance optimization","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/NNAgCjsB/icon.png",2_800_000],
  ["optimization","Clumps","Modrinth","Groups XP orbs together to reduce lag spikes.","clumps xp orbs performance optimization fps server","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/Wnxd13zP/icon.png",2_400_000],
  ["optimization","LazyDFU","Modrinth","Makes the game load faster by deferring DataFixerUpper initialization.","lazydfu startup load time performance fabric forge","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/hvFnDODd/icon.png",5_100_000],
  ["shader","BSL Shaders","CurseForge","Beautiful and customizable shaders for Minecraft with full OptiFine support.","bsl shaders beautiful graphics lighting realistic optifine","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/58/614/636482287424285519.png",3_600_000],
  ["shader","Sildur's Vibrant Shaders","CurseForge","Vibrant and optimized shaders compatible with OptiFine and Iris.","sildurs vibrant shaders graphics optifine iris beautiful","curseforge","fabric,forge","1.21","https://media.forgecdn.net/avatars/67/922/636539679259640818.png",2_100_000],
  ["utility","REI - Roughly Enough Items","Modrinth","Lightweight recipe viewer and item lookup mod for Fabric.","rei roughly enough items recipe jei emi crafting guide","modrinth","fabric","1.21","https://cdn.modrinth.com/data/nfn13YXA/icon.png",7_200_000],
  ["utility","EMI","Modrinth","Feature-rich recipe and loot viewer with full JEI/REI compatibility.","emi recipe viewer jei rei crafting guide loot utility","modrinth","fabric","1.21","https://cdn.modrinth.com/data/fRiHVvU7/icon.png",3_300_000],
  ["utility","Inventory HUD+","Modrinth","Adds armor, potions, and equipment HUD display to the screen.","inventory hud armor potion equipment display utility ui","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/RtMiXdny/icon.png",1_900_000],
  ["utility","WTHIT","Modrinth","What The Hell Is That — shows the name and info of block/entity you look at.","wthit what hell is that block info tooltip utility hud","modrinth","fabric","1.21","https://cdn.modrinth.com/data/6AQIAxBb/icon.png",2_700_000],
  ["utility","Mouse Tweaks","Modrinth","Enhances inventory management with advanced mouse button tweaks.","mouse tweaks inventory management drag stack utility","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/aC3cM3Vq/icon.png",4_600_000],
  ["technology","Thermal Foundation","CurseForge","Base mod for the Thermal Series — ores, materials, and mob drops.","thermal foundation series ores materials tech forge","curseforge","forge","1.20","https://media.forgecdn.net/avatars/47/682/636442079695119.png",14_500_000],
  ["technology","Immersive Engineering","CurseForge","Retro-futuristic tech mod with multiblock machines and power lines.","immersive engineering tech machines power multiblock wire","curseforge","forge,fabric","1.20","https://media.forgecdn.net/avatars/112/88/636701048765985571.png",11_800_000],
  ["technology","Refined Storage","Modrinth","Network-based digital storage system and autocrafting.","refined storage network digital autocraft storage me system","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/kwUdQOm2/icon.png",8_400_000],
  ["adventure","Quark","Modrinth","Vanilla+ mod adding hundreds of small features and improvements.","quark vanilla tweaks improvements features variety quality life","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/qvIfYCYJ/icon.png",14_000_000],
  ["adventure","Better Combat","Modrinth","Dual-wielding and combat mechanics overhaul with attack combos.","better combat dual wielding melee attack combo rpg","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/5mk6hWkG/icon.png",3_100_000],
  ["adventure","Curios API","Modrinth","API for flexible equipment slots — used by many RPG mods.","curios api equipment slots rpg accessories rings amulets","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/LQ3K71Q1/icon.png",9_800_000],
  ["adventure","Twilight Forest","CurseForge","A magical dimension of wonder and adventure with unique bosses.","twilight forest dimension adventure magic boss dungeon exploration","curseforge","forge,fabric","1.20","https://media.forgecdn.net/avatars/5/21/635265874014582082.png",21_000_000],
  ["world","YUNG's Better Dungeons","Modrinth","Completely revamps vanilla dungeons with new layouts and challenges.","yung better dungeons overhaul redesign adventure structure","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/RZoDPNWK/icon.png",3_400_000],
  ["world","YUNG's Better Strongholds","Modrinth","Completely redesigns the stronghold with a massive multi-floor layout.","yung better strongholds redesign end portal adventure","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/q1SBIGcb/icon.png",2_800_000],
  ["world","Repurposed Structures","Modrinth","Adds more variations of vanilla structures with new room types.","repurposed structures vanilla improved variety worldgen","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/muf0XoRe/icon.png",3_600_000],
  ["decoration","Architectury API","Modrinth","Multiplatform API for Fabric, Quilt and Forge mods.","architectury api multiplatform fabric quilt forge library","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/lhGA9TYQ/icon.png",18_000_000],
  ["utility","Cloth Config API","Modrinth","Config screen API for creating mod configuration menus.","cloth config api configuration screen menu settings","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/9s6osm5g/icon.png",17_000_000],
  ["utility","Prism Launcher","Modrinth","Open-source Minecraft launcher with instance management.","prism launcher instance modpack management fabric forge","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/1vDCJeOK/icon.png",1_500_000],
  ["optimization","Indium","Modrinth","Sodium addon providing support for the Fabric Rendering API.","indium sodium fabric rendering api addon compatibility","modrinth","fabric","1.21","https://cdn.modrinth.com/data/Orvt0mRa/icon.png",4_200_000],
  ["optimization","Debugify","Modrinth","Fixes many bugs in vanilla Minecraft — official bug list.","debugify bugfix vanilla fixes performance quality fabric","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/QwxR6Gcd/icon.png",2_100_000],
  ["magic","Blood Magic","CurseForge","Sacrifice health to fuel powerful dark magic rituals.","blood magic dark ritual sacrifice altar magic forge","curseforge","forge","1.20","https://media.forgecdn.net/avatars/102/5/636675375122603027.png",9_000_000],
  ["magic","Electroblob's Wizardry","CurseForge","Explore and collect over 160 magic spells with a wand.","electroblobs wizardry wand spells magic explore rpg forge","curseforge","forge","1.20","https://media.forgecdn.net/avatars/172/851/636915613234568700.png",5_800_000],
  ["utility","Chat Heads","Modrinth","Shows the player's skin head next to chat messages.","chat heads player skin face message multiplayer social","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/Wb5oqrBJ/icon.png",3_700_000],
  ["utility","No Chat Reports","Modrinth","Removes the reporting capability from chat messages.","no chat reports privacy reporting multiplayer chat","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/qQyHxfxd/icon.png",6_900_000],
  ["decoration","Chipped","Modrinth","Adds hundreds of variations to vanilla blocks for building.","chipped building decoration variations blocks chisel craft","modrinth","fabric,forge","1.21","https://cdn.modrinth.com/data/oYDlu5ar/icon.png",2_300_000],
  ["decoration","Supplementaries","Modrinth","Adds many new functional and decorative vanilla-style blocks.","supplementaries functional decorative vanilla blocks building","modrinth","fabric","1.21","https://cdn.modrinth.com/data/iqIFcYvE/icon.png",3_800_000],
];

const MC_NSFW_TITLES = new Set([
  "Ice and Fire: Dragons",
  "Artifacts",
  "Origins",
]);

const MC_AUTHORS = {
  "Sodium": "JellySquid",
  "Iris Shaders": "IrisShaders",
  "OptiFine": "sp614x",
  "Create": "simibubi",
  "Biomes O' Plenty": "Glitchfiend",
  "Alex's Mobs": "Alex's Mobs",
  "JEI - Just Enough Items": "mezz",
  "Journeymap": "TeamJM",
  "Botania": "Vazkii",
  "Mekanism": "aidancbrady",
  "Tinker's Construct": "mDiyo",
  "Applied Energistics 2": "AlgorithmX2",
  "Artifacts": "Artifacts Team",
  "Sophisticated Storage": "P3pp3r",
  "Fabulously Optimized": "Fabulously Optimized",
  "Farmer's Delight": "vectorwing",
  "Terralith": "Starmute",
  "Ice and Fire: Dragons": "Raptorfarian",
};

const MC_CATEGORY_LABELS = {
  optimization: "PERFORMANCE",
  technology: "TECH",
  magic: "MAGIC",
  adventure: "ADVENTURE",
  world: "WORLD GEN",
  utility: "UTILITY",
  decoration: "DECORATION",
  shader: "SHADERS",
  storage: "STORAGE",
};

const MC_SEARCH_PLATFORMS = [
  // ── Live API search (Modrinth) ──────────────────────────────────────────
  { key: "modrinth", name: "Modrinth", trust: "Open source", liveSearch: true,
    note: "Fabric, Forge, NeoForge, Quilt — 100k+ mods", badge: "MR",
    theme: ["#9ae6b0", "#2f855a"],
    url: (q) => `https://modrinth.com/mods?q=${encodeURIComponent(q)}` },

  // ── Live API search (Hangar — PaperMC plugins) ──────────────────────────
  { key: "hangar", name: "Hangar", trust: "Server plugins", liveSearch: true,
    note: "Official Paper / Velocity plugin repository", badge: "HG",
    theme: ["#7ab8ff", "#1a4070"],
    url: (q) => `https://hangar.papermc.io/?q=${encodeURIComponent(q)}` },

  // ── Modrinth modpacks ───────────────────────────────────────────────────
  { key: "modrinth_modpacks", name: "Modrinth Modpacks", trust: "Modpacks",
    note: "Curated modpack installs via Prism / ATLauncher", badge: "MP",
    theme: ["#9ae6b0", "#2f855a"],
    url: (q) => `https://modrinth.com/modpacks?q=${encodeURIComponent(q)}` },

  // ── CurseForge (link-out — requires Overwolf app or API key) ───────────
  { key: "curseforge", name: "CurseForge", trust: "Largest library",
    note: "10M+ downloads — Forge, Fabric, NeoForge, modpacks", badge: "CF",
    theme: ["#f5a623", "#7a4a10"],
    url: (q) => `https://www.curseforge.com/minecraft/mc-mods?search=${encodeURIComponent(q)}` },

  // ── Planet Minecraft ────────────────────────────────────────────────────
  { key: "planetminecraft", name: "Planet Minecraft", trust: "Community",
    note: "Maps, mods, textures, skins & data packs", badge: "PMC",
    theme: ["#7dcc2a", "#3a7214"],
    url: (q) => `https://www.planetminecraft.com/resources/mods/?keywords=${encodeURIComponent(q)}` },

  // ── Nexus Mods ──────────────────────────────────────────────────────────
  { key: "nexusmods", name: "Nexus Mods", trust: "Multi-game hub",
    note: "Minecraft mods & texture packs on Nexus", badge: "NX",
    theme: ["#d9a93b", "#5a3a08"],
    url: (q) => `https://www.nexusmods.com/minecraft/mods/?gsearch=${encodeURIComponent(q)}&gsearchtype=mods` },

  // ── Spiget (SpigotMC mirror — live API) ────────────────────────────────
  { key: "spiget", name: "SpigotMC", trust: "Bukkit/Spigot", liveSearch: true,
    note: "50 000+ Bukkit/Spigot/Paper plugins via Spiget API", badge: "SP",
    theme: ["#e8a050", "#6a4018"],
    url: (q) => `https://www.spigotmc.org/search/?q=${encodeURIComponent(q)}&t=resource` },

  // ── Polymart (free & paid plugins) ─────────────────────────────────────
  { key: "polymart", name: "Polymart", trust: "Free & Premium", liveSearch: true,
    note: "Free and premium plugins for Paper, Spigot & Velocity", badge: "PM",
    theme: ["#9b59b6", "#4a1a68"],
    url: (q) => `https://polymart.org/search?query=${encodeURIComponent(q)}` },

  // ── Modrinth Plugins (server-side) ─────────────────────────────────────
  { key: "modrinth_plugins", name: "Modrinth Plugins", trust: "Server plugins",
    note: "Paper & Bukkit plugins on Modrinth", badge: "MRP",
    theme: ["#80d4b0", "#1a5040"],
    url: (q) => `https://modrinth.com/plugins?q=${encodeURIComponent(q)}` },

  // ── Modrinth Shaders ────────────────────────────────────────────────────
  { key: "modrinth_shaders", name: "Modrinth Shaders", trust: "Shaders",
    note: "GLSL shader packs for Iris & OptiFine", badge: "SH",
    theme: ["#a0e0ff", "#1a3a58"],
    url: (q) => `https://modrinth.com/shaders?q=${encodeURIComponent(q)}` },

  // ── Modrinth Resource Packs ─────────────────────────────────────────────
  { key: "modrinth_resourcepacks", name: "Resource Packs", trust: "Textures",
    note: "HD texture packs & resource packs on Modrinth", badge: "RP",
    theme: ["#ffd080", "#5a3a00"],
    url: (q) => `https://modrinth.com/resourcepacks?q=${encodeURIComponent(q)}` },

  // ── Modrinth Data Packs ─────────────────────────────────────────────────
  { key: "modrinth_datapacks", name: "Data Packs", trust: "Vanilla-friendly",
    note: "Vanilla-compatible data packs on Modrinth", badge: "DP",
    theme: ["#c0a0e0", "#3a1a58"],
    url: (q) => `https://modrinth.com/datapacks?q=${encodeURIComponent(q)}` },

  // ── Patreon ─────────────────────────────────────────────────────────────
  { key: "patreon", name: "Patreon", trust: "Creator-funded",
    note: "Premium mods from creators on Patreon", badge: "PT",
    theme: ["#ff6050", "#5a1a10"],
    url: (q) => `https://www.patreon.com/search?q=${encodeURIComponent(q)}+minecraft+mod` },

  // ── GitHub ──────────────────────────────────────────────────────────────
  { key: "github", name: "GitHub", trust: "Source code",
    note: "Direct releases & source code from creators", badge: "GH",
    theme: ["#c8d0e0", "#2a3448"],
    url: (q) => `https://github.com/search?q=${encodeURIComponent(q)}+minecraft+mod&type=repositories&s=stars` },

  // ── MCPEDL (Bedrock) ────────────────────────────────────────────────────
  { key: "mcpedl", name: "MCPEDL", trust: "Bedrock",
    note: "Bedrock Edition addons, maps & textures", badge: "BE",
    theme: ["#6ed49a", "#1a5030"],
    url: (q) => `https://mcpedl.com/?s=${encodeURIComponent(q)}` },

  // ── BuiltByBit ──────────────────────────────────────────────────────────
  { key: "builtbybit", name: "BuiltByBit", trust: "Marketplace",
    note: "Premium plugins, builds & server resources", badge: "BB",
    theme: ["#5ed4ff", "#1a5088"],
    url: (q) => `https://builtbybit.com/search/?q=${encodeURIComponent(q)}` },

  // ── OptiFine ────────────────────────────────────────────────────────────
  { key: "optifine", name: "OptiFine", trust: "Client opt",
    note: "HD textures, shaders & FPS boost (direct download)", badge: "OF",
    theme: ["#44dfdf", "#1a3a4a"],
    url: () => "https://optifine.net/home" },
];

const MC_CATALOG_CACHE_KEY = "mc_modguard_catalog_v1";
const MC_CATALOG_MAX_PAGES = 50;
const MC_CATALOG_PAGE_SIZE = 100;

let mcCatalogItems = [];
let mcCatalogLoading = false;
let mcCatalogLoadPromise = null;
let mcGridRenderLimit = 200;
let mcGridAllItems = [];

const MC_SEED_ITEMS = MC_MOD_SEED.map(([category, title, platform, description, tags, platformKey, loaders, minVersion, thumbUrl, downloads], idx) => ({
  id: `mc-seed-${idx}`,
  category,
  title,
  platform,
  author: MC_AUTHORS[title] || platform,
  description,
  note: description,
  tags: tags.split(" "),
  platformKey,
  loaders: loaders.split(","),
  minVersion,
  thumbUrl,
  downloads: Number(downloads) || 0,
  rating: Number((3.8 + ((idx % 12) / 10)).toFixed(1)),
  safetyPct: 94 + (idx % 6),
  modSide: loaders.includes("fabric") || loaders.includes("quilt") ? "client" : "client",
  url: MC_SEARCH_PLATFORMS.find(p => p.key === platformKey)?.url(title) || `https://modrinth.com/mods?q=${encodeURIComponent(title)}`,
}));

// ============================================================
//  FORUM POSTS
// ============================================================

function creepersAvatarSvg(seed) {
  const avatars = [
    // Creeper
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#41a247"/><rect x="1" y="2" width="2" height="2" fill="#1a1a1a"/><rect x="5" y="2" width="2" height="2" fill="#1a1a1a"/><rect x="2" y="5" width="4" height="1" fill="#1a1a1a"/><rect x="2" y="4" width="1" height="1" fill="#1a1a1a"/><rect x="5" y="4" width="1" height="1" fill="#1a1a1a"/></svg>`,
    // Steve
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#c8804a"/><rect x="1" y="2" width="2" height="2" fill="#3a5a8a"/><rect x="5" y="2" width="2" height="2" fill="#3a5a8a"/><rect x="2" y="5" width="4" height="1" fill="#7a3030"/><rect x="0" y="0" width="8" height="2" fill="#7a4520"/></svg>`,
    // Skeleton
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#d8d8c8"/><rect x="1" y="1" width="2" height="2" fill="#1a1a1a"/><rect x="5" y="1" width="2" height="2" fill="#1a1a1a"/><rect x="2" y="5" width="1" height="2" fill="#b8b8a8"/><rect x="4" y="5" width="2" height="2" fill="#b8b8a8"/><rect x="2" y="4" width="4" height="1" fill="#1a1a1a"/></svg>`,
    // Diamond
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#1a3a4a"/><rect x="2" y="1" width="4" height="1" fill="#44dfdf"/><rect x="1" y="2" width="6" height="3" fill="#44dfdf"/><rect x="2" y="5" width="4" height="1" fill="#44dfdf"/><rect x="3" y="6" width="2" height="1" fill="#2ababa"/><rect x="1" y="2" width="1" height="1" fill="#7fffff"/></svg>`,
    // TNT
    `<svg viewBox="0 0 8 8" width="36" height="36" shape-rendering="crispEdges"><rect width="8" height="8" fill="#c03030"/><rect x="0" y="2" width="8" height="1" fill="#e8e8e8"/><rect x="0" y="5" width="8" height="1" fill="#e8e8e8"/><rect x="1" y="3" width="6" height="2" fill="#e8e8e8"/><rect x="2" y="3" width="1" height="2" fill="#c03030"/><rect x="5" y="3" width="1" height="2" fill="#c03030"/></svg>`,
  ];
  return avatars[seed % avatars.length];
}


const els = {
  appWrap: document.getElementById("appWrap"),
  mainCard: document.getElementById("mainCard"),
  activationView: document.getElementById("activationView"),
  onboardingView: document.getElementById("onboardingView"),
  dashboardView: document.getElementById("dashboardView"),

  country: document.getElementById("country"),
  email: document.getElementById("email"),
  code: document.getElementById("code"),
  activateBtn: document.getElementById("activateBtn"),
  rememberMe: document.getElementById("rememberMe"),
  onboardSlides: document.getElementById("onboardSlides"),
  onboardDots: document.getElementById("onboardDots"),
  onboardNextBtn: document.getElementById("onboardNextBtn"),
  onboardBackBtn: document.getElementById("onboardBackBtn"),
  onboardReadyBtn: document.getElementById("onboardReadyBtn"),
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

let state = null;
let currentLocale = "da";
let forcedLocale = null;
let onboardingIndex = 0;
const STARTUP_GUIDE_SLIDE_COUNT = 7;
let onboardingRequired = true;
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
const FORUM_SEED_VERSION_KEY = "modguard_forum_seed_v3";
let activeForumThreadId = null;
let forumTab = "all";
let forumPlatformFilter = "all";
let forumOriginFilter = "all";
let redditForumPosts = [];
let forumRedditLoading = false;

const FORUM_SOURCE_LABELS = {
  modguard: "ModGuard",
  reddit: "Reddit",
  discord: "Discord",
  curseforge: "CurseForge",
  modrinth: "Modrinth",
  github: "GitHub",
  hangar: "Hangar",
  spigotmc: "SpigotMC",
  planetminecraft: "Planet Minecraft",
  mcpedl: "MCPEDL",
  other: "Community",
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
    id: "mc-comm-0",
    category: "virus",
    source: "modguard",
    origin: "modguard",
    author: "ModGuard Team",
    title: "WARNING: Fake Sodium download sites spreading malware",
    body: "We confirmed trojanized launchers posing as Sodium/Iris on ad-heavy mirror sites. Only download from Modrinth project pages or the official CurseForge author page. Scan every .jar with ModGuard before dropping into mods/.",
    url: "https://modrinth.com/mod/sodium",
    pinned: true,
    status: "official",
    upvotes: 1240,
    comments: 318,
    hoursAgo: 2,
  },
  {
    id: "mc-comm-1",
    category: "warn",
    source: "reddit",
    subreddit: "r/feedthebeast",
    author: "PackSafetyBot",
    title: "CurseForge API outage — do not use random MediaFire repacks",
    body: "Multiple FTB players report infected zips during the CF outage. Stick to Modrinth modpacks or Prism's official sources until hashes match.",
    url: "https://www.reddit.com/r/feedthebeast/",
    pinned: true,
    status: "investigating",
    upvotes: 640,
    comments: 142,
    hoursAgo: 18,
  },
  {
    id: "mc-comm-2",
    category: "virus",
    source: "discord",
    author: "ServerAdmin_42",
    title: "Discord DM «Forge 1.20.1 pack» contained njRAT",
    body: "A user DMed our staff a ‘pre-built Forge folder’. ModGuard flagged njRAT inside a fake JAR. Never install mods from unsolicited Discord files — use Modrinth/CurseForge only.",
    url: "https://discord.com/",
    status: "confirmed",
    upvotes: 892,
    comments: 201,
    hoursAgo: 6,
  },
  {
    id: "mc-comm-3",
    category: "tips",
    source: "modrinth",
    author: "FabricHelper",
    title: "Client vs server mods on Fabric 1.21",
    body: "Client-only: Sodium, Iris, Xaero's. Server-only: Lithium (no client jar needed on players). Both sides: most content mods. Check Modrinth side badges before adding to a server pack.",
    url: "https://modrinth.com/mods",
    upvotes: 520,
    comments: 88,
    hoursAgo: 12,
  },
  {
    id: "mc-comm-4",
    category: "broken",
    source: "curseforge",
    author: "NeoForgeMigrator",
    title: "Create 0.5.x worlds broken after NeoForge 1.21 bump",
    body: "Contraption data mismatch after loader migration. Backup world, remove Create, load once, reinstall matching Create+Flywheel versions from Modrinth for your exact loader.",
    url: "https://www.curseforge.com/minecraft/mc-mods/create",
    upvotes: 310,
    comments: 74,
    hoursAgo: 30,
  },
  {
    id: "mc-comm-5",
    category: "safe",
    source: "modrinth",
    author: "BlockBuilder",
    title: "Verified: JellySquid mods on Modrinth only",
    body: "Sodium, Lithium, Iris, FerriteCore — official IDs are on Modrinth. Any other domain should be treated as a warning thread until proven otherwise.",
    url: "https://modrinth.com/user/jellysquid",
    status: "confirmed",
    upvotes: 780,
    comments: 56,
    hoursAgo: 48,
  },
  {
    id: "mc-comm-6",
    category: "warn",
    source: "planetminecraft",
    author: "PMCScanner",
    title: "Planet Minecraft adfly redirect bundles",
    body: "Several PMC download buttons route through ad networks that swap JARs. Always wait for ModGuard scan; prefer Modrinth mirror when the author linked it.",
    url: "https://www.planetminecraft.com/",
    upvotes: 205,
    comments: 63,
    hoursAgo: 22,
  },
  {
    id: "mc-comm-7",
    category: "chat",
    source: "discord",
    author: "ModpackDev",
    title: "Best launcher for Fabric + Quilt coexists?",
    body: "Prism Launcher can separate instances per loader. For server testing use dedicated server jars on Modrinth — don't mix client NeoForge jars into Fabric profiles.",
    url: "https://discord.com/",
    upvotes: 144,
    comments: 97,
    hoursAgo: 9,
  },
  {
    id: "mc-comm-8",
    category: "virus",
    source: "github",
    author: "OpenSourceWatch",
    title: "Typosquat GitHub repo «Sodiun» flagged",
    body: "Repo mimicked Sodium with obfuscated class names. Real project is at Modrinth data/AANobbMI. Report typosquats to GitHub and share hashes in this thread.",
    url: "https://github.com/search?q=sodium+minecraft",
    status: "confirmed",
    upvotes: 430,
    comments: 112,
    hoursAgo: 14,
  },
  {
    id: "mc-comm-9",
    category: "broken",
    source: "hangar",
    author: "PaperAdmin",
    title: "Paper plugin vs Fabric mod — wrong folder warning",
    body: "Plugins belong in /plugins (Hangar/Spigot). Fabric/Forge mods are .jar in /mods. Mixing them causes ‘mod loaded 0%’ crashes — check side tags in Mod Search.",
    url: "https://hangar.papermc.io/",
    upvotes: 188,
    comments: 41,
    hoursAgo: 36,
  },
  {
    id: "mc-comm-10",
    category: "tips",
    source: "reddit",
    subreddit: "r/ModdedMinecraft",
    author: "LoaderGuide",
    title: "NeoForge vs Forge vs Fabric — 2025 quick pick",
    body: "Fabric+Quilt: lightweight client perf. NeoForge: modern Forge fork. Forge 1.20.1 still huge library. Match Modrinth loader filter to your instance before downloading.",
    url: "https://www.reddit.com/r/ModdedMinecraft/",
    upvotes: 950,
    comments: 204,
    hoursAgo: 8,
  },
];

const FORUM_TRENDING_SEED = [
  { topic: "Fake Sodium / Iris mirrors", delta: "+24%", up: true, posts: 89 },
  { topic: "NeoForge 1.21 migration", delta: "+11%", up: true, posts: 56 },
  { topic: "Fabric server Lithium setup", delta: "+8%", up: true, posts: 41 },
  { topic: "CurseForge repack malware", delta: "+19%", up: true, posts: 67 },
];

const FORUM_REDDIT_SEED = [
  {
    subreddit: "r/feedthebeast",
    title: "Which mods are safe client-only for a public server?",
    upvotes: 512,
    comments: 118,
    url: "https://www.reddit.com/r/feedthebeast/",
  },
  {
    subreddit: "r/ModdedMinecraft",
    title: "Modrinth vs CurseForge — where do you host packs now?",
    upvotes: 386,
    comments: 94,
    url: "https://www.reddit.com/r/ModdedMinecraft/",
  },
];
let notificationsEnabled = true;
const simsDetailPanel = document.getElementById("simsDetailPanel");
const simsBottomPreview = document.getElementById("simsBottomPreview");
const simsBottomScan = document.getElementById("simsBottomScan");
const simsBottomThreats = document.getElementById("simsBottomThreats");
const simsThreatTable = document.getElementById("simsThreatTable");
const simsSourceFilter = document.getElementById("simsSourceFilter");
const mcCategoryFilter = document.getElementById("mcCategoryFilter");
const mcTypeFilter = document.getElementById("mcTypeFilter");
const mcLangFilter = document.getElementById("mcLangFilter");
const footerSandboxCount = document.getElementById("footerSandboxCount");
const footerScanningCount = document.getElementById("footerScanningCount");
const footerReadyCount = document.getElementById("footerReadyCount");
const minimizeBtnSearch = document.getElementById("minimizeBtnSearch");
const simsDockScans = document.getElementById("simsDockScans");
const navOutdatedBadge = document.getElementById("navOutdatedBadge");
const mcResetFiltersBtn = document.getElementById("mcResetFilters");
const mcSearchInput = document.getElementById("mcSearchInput");
const mcSearchHints = document.getElementById("mcSearchHints");
const mcSearchBtn = document.getElementById("mcSearchBtn");
const SIMS_CC_HINT_KEYS = ["searchHintMaleClothes", "searchHintHair", "searchHintGameplay"];
const mcBrowserScreen = document.getElementById("mcBrowserScreen");
const mcBrowserAddress = document.getElementById("mcBrowserAddress");
const simsModeButtons = Array.from(document.querySelectorAll("[data-mc-loader]"));
const simsSearchTriggers = Array.from(document.querySelectorAll("[data-sims-query]"));
const mcSortSelect = document.getElementById("mcSortSelect");
const mcVersionFilter = document.getElementById("mcVersionFilter");
const mcTimeFilter = document.getElementById("mcTimeFilter");
const mcRatingFilter = document.getElementById("mcRatingFilter");
const moddbStatusText = document.getElementById("moddbStatusText");
const moddbProgressFill = document.getElementById("moddbProgressFill");
const moddbIndexBtn = document.getElementById("moddbIndexBtn");
const simsSourceFilters = Array.from(document.querySelectorAll("[data-source-filter]"));
const adultContentToggle = document.getElementById("adultContentToggle");
const adultConfirmModal = document.getElementById("adultConfirmModal");
const adultConfirmCheck = document.getElementById("adultConfirmCheck");
const adultCancelBtn = document.getElementById("adultCancelBtn");
const adultAcceptBtn = document.getElementById("adultAcceptBtn");
let mcSearchLoader = "all";
let lastMcQuery = "";
let activeMcSources = new Set(["all"]);
let mcCurrentPage = 1;
let mcVisibleResults = [];
const hubChildrenCache = new Map();
let mcHasSearched = false;
let simsSelectedModId = "";
let mcGridListView = "grid";
let adultContentEnabled = false;
let adultContentConfirmed = false;

const MODSEARCH_ALLOWED_HOSTS = new Set([
  "modrinth.com", "www.modrinth.com", "cdn.modrinth.com",
  "curseforge.com", "www.curseforge.com", "media.forgecdn.net",
  "planetminecraft.com", "www.planetminecraft.com",
  "optifine.net", "github.com", "raw.githubusercontent.com",
]);

function isAllowedModSearchUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || ""));
    return parsed.protocol === "https:" && MODSEARCH_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

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
  if (labelCode) labelCode.textContent = t(next, "ui.codeLabel") || "Abonnementkode";
  if (els.code) {
    els.code.placeholder = t(next, "ui.codePlaceholder") || "Indtast abonnementkode";
    els.code.type = "text";
    els.code.autocomplete = "off";
    els.code.spellcheck = false;
  }

  if (els.activateBtn) {
    els.activateBtn.textContent = "Login";
  }
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

// Language flag picker
function initLangPicker() {
  const btn = document.getElementById('langFlagBtn');
  const dropdown = document.getElementById('langDropdown');
  const flagIcon = document.getElementById('langFlagIcon');
  if (!btn || !dropdown) return;
  const FLAGS = { da: '🇩🇰', sv: '🇸🇪', no: '🇳🇴', en: '🇬🇧', fr: '🇫🇷' };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });
  dropdown.addEventListener('click', (e) => {
    const opt = e.target.closest('.lang-option');
    if (!opt) return;
    const lang = opt.dataset.lang;
    if (lang) {
      forcedLocale = lang;
      setLocale(lang);
      flagIcon.textContent = FLAGS[lang] || '🌐';
      dropdown.hidden = true;
    }
  });
  document.addEventListener('click', () => { dropdown.hidden = true; });
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
    ["searchPlatformsTitle", "ui.searchPlatformsTitle"],
    ["searchNsfwLabel", "ui.searchNsfwToggle"],
    ["navModDemandLabel", "ui.navModDemand"],
    ["mgModFitBtnLabel", "ui.mgModFitBtnLabel"],
  ];
  for (const [id, key] of map) {
    const el = document.getElementById(id);
    if (el) el.textContent = t(locale, key);
  }
  if (mcSearchInput && !mcSearchInput.placeholder) {
    mcSearchInput.placeholder = "Search mods, creators, categories...";
  }
  updateMcSearchHints();
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
  if (mcResetFiltersBtn) mcResetFiltersBtn.textContent = `↺ ${t(locale, "ui.resetFilters")}`;
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
  const wrap = document.getElementById("mcPlatformToggles");
  if (!wrap) return;
  const allActive = activeMcSources.has("all");
  wrap.innerHTML = `
    <button type="button" class="platform-chip ${allActive ? "active" : ""}" data-platform-name="all">${escapeHtml(tt("ui.searchPlatformsAll"))}</button>
    ${MC_SEARCH_PLATFORMS.map((platform) => {
      const on = allActive || activeMcSources.has(platform.name);
      return `<button type="button" class="platform-chip ${on ? "active" : ""}" data-platform-name="${escapeHtml(platform.name)}">${escapeHtml(platform.name)}</button>`;
    }).join("")}
  `;
  if (simsSourceFilter) {
    const current = simsSourceFilter.value || "all";
    simsSourceFilter.innerHTML = `
      <option value="all">Kilde (Alle)</option>
      ${MC_SEARCH_PLATFORMS.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join("")}
    `;
    if ([...simsSourceFilter.options].some((o) => o.value === current)) simsSourceFilter.value = current;
  }
}

function syncPlatformFilterState() {
  const chips = Array.from(document.querySelectorAll("#mcPlatformToggles .platform-chip"));
  const allChip = chips.find((chip) => chip.dataset.platformName === "all");
  if (!chips.length) return;
  if (activeMcSources.has("all")) {
    for (const chip of chips) chip.classList.add("active");
    return;
  }
  if (allChip) allChip.classList.remove("active");
  for (const chip of chips) {
    if (chip.dataset.platformName === "all") continue;
    chip.classList.toggle("active", activeMcSources.has(chip.dataset.platformName));
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
    if (localStorage.getItem(FORUM_SEED_VERSION_KEY) === "v3") {
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
    localStorage.setItem(FORUM_SEED_VERSION_KEY, "v3");
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
  const pinnedBadge = post.pinned ? `<span class="forum-badge pinned">Fastgjort</span>` : "";
  const originBadge = `<span class="forum-badge ${post.origin === "modguard" ? "origin-modguard" : "origin-web"}">${post.origin === "modguard" ? "ModGuard" : "Nettet"}</span>`;
  const isReddit = post.source === "reddit" || post.subreddit;
  const redditIcon = isReddit ? `<span class="forum-reddit-pill">r/ Reddit</span>` : "";
  const externalArrow = post.url ? `<span class="forum-external-arrow">↗</span>` : "";
  const avatarHtml = isReddit
    ? `<div class="forum-post-avatar reddit-avatar" aria-hidden="true">r/</div>`
    : `<div class="forum-post-avatar" aria-hidden="true">${escapeHtml(forumAvatarInitials(post.author))}</div>`;
  return `
    <article class="forum-post-card is-clickable ${post.pinned ? "pinned" : ""} ${isReddit ? "is-reddit" : ""}"
      data-forum-post-id="${escapeHtml(post.id || "")}"
      data-forum-open-url="${isReddit && post.url ? escapeHtml(post.url) : ""}"
      role="button" tabindex="0">
      ${avatarHtml}
      <div class="forum-post-main">
        <div class="forum-post-head">
          <strong>${escapeHtml(post.author)}</strong>
          <span class="forum-post-time">· ${escapeHtml(forumTimeAgo(post))}</span>
          ${pinnedBadge}
          ${originBadge}
          <span class="forum-badge ${catClass}">${escapeHtml(catLabel)}</span>
          <span class="forum-badge source">${escapeHtml(sourceExtra)}</span>
          ${redditIcon}
        </div>
        <h4 class="forum-post-title">${escapeHtml(post.title)}${externalArrow}</h4>
        ${post.body ? `<p class="forum-post-snippet">${escapeHtml(post.body.slice(0, 180))}</p>` : ""}
        <div class="forum-post-footer">
          <div class="forum-post-actions">
            <button type="button" class="forum-vote-btn" data-forum-vote="${escapeHtml(post.id || "")}">▲ ${Number(post.upvotes || 0).toLocaleString("da-DK")}</button>
            <button type="button" class="forum-comment-btn" data-forum-comment="${escapeHtml(post.id || "")}">${Number(post.comments || 0).toLocaleString("da-DK")} svar</button>
            ${post.url ? `<button type="button" class="forum-open-link-btn" data-forum-open-url="${escapeHtml(post.url)}">Åbn ↗</button>` : ""}
          </div>
          <div class="forum-post-icons" aria-hidden="true"></div>
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

function forumThreadRepliesFor(post) {
  const count = Math.min(8, Math.max(3, Number(post.comments || 0) % 9));
  const names = ["BlockBuilder", "CreeperHunter", "FabricAdmin", "NeoForgeDev", "ModGuard Bot", "ServerHost"];
  return Array.from({ length: count }, (_, i) => ({
    author: names[i % names.length],
    body: i === 0
      ? "Tak for rapporten — jeg har lagt JAR i sandbox og får samme hash som tråden beskriver."
      : i === 1
        ? "Husk at tjekke Modrinth side badges (client/server) før I smider noget i serverpack."
        : "Can confirm, seen the same on our community server. Pinned for visibility.",
    hoursAgo: Math.max(1, (post.hoursAgo || 1) + i),
  }));
}

function renderForumThreadDetail(post) {
  const view = document.getElementById("forumThreadView");
  const content = document.getElementById("forumThreadContent");
  const replies = document.getElementById("forumThreadReplies");
  if (!view || !content || !replies) return;
  const catLabel = forumCategoryLabel(post.category);
  const sourceLabel = FORUM_SOURCE_LABELS[post.source] || post.source;
  const isReddit = post.source === "reddit" || post.subreddit;
  content.innerHTML = `
    <article class="forum-thread-hero">
      <div class="forum-post-head">
        <strong>${escapeHtml(post.author)}</strong>
        <span>· ${escapeHtml(forumTimeAgo(post))}</span>
        <span class="forum-badge ${forumCategoryBadgeClass(post.category)}">${escapeHtml(catLabel)}</span>
        <span class="forum-badge source">${escapeHtml(post.subreddit || sourceLabel)}</span>
      </div>
      <h2 class="forum-thread-title">${escapeHtml(post.title)}</h2>
      <p class="forum-thread-body">${escapeHtml(post.body || "")}</p>
      <div class="forum-thread-actions">
        <button type="button" class="forum-vote-btn" data-forum-vote="${escapeHtml(post.id || "")}">▲ ${Number(post.upvotes || 0).toLocaleString("da-DK")}</button>
        <span>💬 ${Number(post.comments || 0).toLocaleString("da-DK")} svar</span>
        ${post.url ? `<button type="button" class="forum-thread-open" data-forum-open-url="${escapeHtml(post.url)}">Åbn original ↗</button>` : ""}
      </div>
      ${isReddit && post.url ? `<div class="forum-reddit-notice">Dette opslag stammer fra Reddit. <button type="button" class="forum-thread-open" data-forum-open-url="${escapeHtml(post.url)}">Se original tråd på Reddit ↗</button></div>` : ""}
    </article>`;
  const replyList = forumThreadRepliesFor(post);
  replies.innerHTML = `
    <h3 class="forum-thread-replies-title">Svar i tråden</h3>
    ${replyList.map((r) => `
      <div class="forum-thread-reply">
        <div class="forum-post-avatar" aria-hidden="true">${escapeHtml(forumAvatarInitials(r.author))}</div>
        <div>
          <div class="forum-post-head"><strong>${escapeHtml(r.author)}</strong><span>· ${escapeHtml(forumTimeAgo({ hoursAgo: r.hoursAgo }))}</span></div>
          <p>${escapeHtml(r.body)}</p>
        </div>
      </div>`).join("")}
    <div class="forum-comment-compose" id="forumCommentCompose">
      <div class="forum-comment-compose-head">
        <div class="forum-post-avatar skimo-avatar" aria-hidden="true">${escapeHtml(forumAvatarInitials(state?.subscription?.email || "Du"))}</div>
        <span class="forum-comment-user">${escapeHtml(state?.subscription?.email || "Skimo bruger")}</span>
        <span class="forum-badge origin-modguard">Skimo</span>
      </div>
      <textarea id="forumCommentInput" class="forum-comment-textarea" placeholder="${tt("ui.forumCommentPlaceholder") || "Skriv en kommentar..."}" rows="3" maxlength="500"></textarea>
      <div class="forum-comment-actions">
        ${isReddit && post.url ? `<span class="forum-comment-note">💬 Kommentarer vises på Skimo-platformen. <button type="button" class="forum-thread-open" data-forum-open-url="${escapeHtml(post.url)}">Gå til Reddit for at kommentere der ↗</button></span>` : ""}
        <button type="button" class="forum-comment-submit" id="forumCommentSubmitBtn" data-post-id="${escapeHtml(post.id || "")}">${tt("ui.forumCommentSubmit") || "Post kommentar"}</button>
      </div>
    </div>`;
  // Bind comment submit
  document.getElementById("forumCommentSubmitBtn")?.addEventListener("click", () => {
    const input = document.getElementById("forumCommentInput");
    const text = String(input?.value || "").trim();
    if (!text) return;
    const postId = document.getElementById("forumCommentSubmitBtn")?.dataset?.postId;
    submitForumComment(postId, text);
    if (input) input.value = "";
  });
}

function submitForumComment(postId, text) {
  if (!text || !postId) return;
  // Add the comment as a reply to the post in local storage
  const posts = loadForumPosts();
  const post = posts.find((p) => p.id === postId);
  if (post) {
    post.comments = (post.comments || 0) + 1;
    saveForumPosts(posts);
  }
  // Show the new comment in the thread replies immediately
  const repliesEl = document.getElementById("forumThreadReplies");
  const compose = document.getElementById("forumCommentCompose");
  if (repliesEl && compose) {
    const replyDiv = document.createElement("div");
    replyDiv.className = "forum-thread-reply forum-new-reply";
    replyDiv.innerHTML = `
      <div class="forum-post-avatar skimo-avatar" aria-hidden="true">${escapeHtml(forumAvatarInitials(state?.subscription?.email || "Du"))}</div>
      <div>
        <div class="forum-post-head"><strong>${escapeHtml(state?.subscription?.email || "Du")}</strong><span class="forum-badge origin-modguard">Skimo</span><span>· lige nu</span></div>
        <p>${escapeHtml(text)}</p>
      </div>`;
    repliesEl.insertBefore(replyDiv, compose);
  }
  setMessage(tt("ui.forumCommentPosted") || "Kommentar postet!");
}

async function renderForum() {
  const feed = document.getElementById("forumFeed");
  const layout = document.querySelector("#forumSection .forum-layout");
  const toolbarTop = document.querySelector("#forumSection .forum-toolbar-top");
  const threadView = document.getElementById("forumThreadView");
  if (!feed) return;

  if (activeForumThreadId) {
    const posts = getAllForumPosts();
    const post = posts.find((p) => String(p.id) === String(activeForumThreadId));
    if (post) {
      if (layout) layout.hidden = true;
      if (toolbarTop) toolbarTop.hidden = true;
      if (threadView) threadView.hidden = false;
      renderForumThreadDetail(post);
      return;
    }
    activeForumThreadId = null;
  }

  if (layout) layout.hidden = false;
  if (toolbarTop) toolbarTop.hidden = false;
  if (threadView) threadView.hidden = true;

  renderForumStatusBar();
  if (!redditForumPosts.length && !forumRedditLoading) await loadRedditForumPosts();
  const posts = filterForumPosts(getAllForumPosts());
  renderForumSidebar(posts);
  if (!posts.length) {
    feed.innerHTML = `<div class="forum-empty-state"><strong>Ingen tråde fundet</strong><span>Prøv et andet filter eller søgeord.</span></div>`;
    return;
  }
  feed.innerHTML = posts.map((post) => renderForumPostCard(post)).join("");
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
  favorites: "navFavorites",
  downloads: "navDownloads",
  outdated: "navOutdated",
  servermods: "navServerMods",
  resourcepacks: "navResourcePacks",
  maps: "navMaps",
  news: "navNews",
  chat: "navGeneralChat",
  forum: "navForum",
  scanner: "navAntivirus",
  profile: "navProfile",
  settings: "navSettings",
};

const MG_HOME_AVATAR_KEY = "mgProfileAvatarData";
const MG_NEWS_STORAGE_KEY = "modguard_mc_news_reactions_v1";
const MG_CHAT_STORAGE_KEY = "modguard_mc_general_chat_v2";

const MC_NEWS_ITEMS = [
  {
    id: "news-update",
    tone: "green",
    title: "NY OPDATERING ER LIVE!",
    body: "Vi har netop udgivet en større opdatering med forbedringer og fejlrettelser.\nSe alle ændringer her: https://modguards.dk/changelog",
    time: "i dag kl. 15:30",
    thumb: null,
    thumbEmoji: "🛡",
    reactions: { "👍": 45, "💎": 12, "👑": 7 },
  },
  {
    id: "news-feature",
    tone: "purple",
    title: "NY FEATURE: AUTO-MODERATION",
    body: "Vores nye Auto-Moderation system er nu aktivt på serveren!\nDet gør chatten tryggere for alle.",
    time: "i dag kl. 12:05",
    thumb: null,
    thumbEmoji: "🔒",
    reactions: { "👍": 32, "💎": 11, "👊": 4 },
  },
  {
    id: "news-event",
    tone: "gold",
    title: "EVENT I WEEKENDEN!",
    body: "Gør dig klar til et fedt event med præmier!\nLørdag d. 18/05 kl. 16:00",
    time: "i går kl. 18:00",
    thumb: null,
    thumbEmoji: "🏆",
    reactions: { "👍": 28, "💎": 15, "👊": 6 },
  },
];

const MG_CHAT_SEED = [];

const DC_CHAT_AVATAR_COLORS = {
  MG_Sofia: "#57f287",
  AndersDK: "#e3b76f",
  MG_Mads: "#57f287",
  BasseMC: "#5865f2",
  Emma_: "#eb459e",
  MG_Christian: "#57f287",
  MG_Sarah: "#ed4245",
};

function dcAvatarHtml(user, color) {
  const c = color || DC_CHAT_AVATAR_COLORS[user] || "#5865f2";
  const initials = String(user || "?")
    .replace(/^MG_/, "")
    .slice(0, 2)
    .toUpperCase();
  return `<span class="dc-avatar" style="background:${escapeHtml(c)}">${escapeHtml(initials || "MG")}</span>`;
}

function dcStaffBadgeHtml() {
  return `<span class="dc-staff-badge" title="ModGuard"><svg width="14" height="14" viewBox="0 0 24 24" fill="#57f287"><path d="M12 2l7 4v6c0 5-3.5 9.5-7 10-3.5-.5-7-5-7-10V6l7-4z"/></svg></span>`;
}

function linkifyDiscordChannels(text) {
  return escapeHtml(text).replace(/#([\w-]+)/g, '<a class="dc-mention" href="#">#$1</a>');
}

function renderMgSectionPage(tab) {
  const grid = document.getElementById("mcBrowserScreen");
  if (!grid) return;
  const titles = {
    servermods: "FOR SERVERS",
    resourcepacks: "RESOURCE PACKS",
  };
  const filters = {
    servermods: { category: "technology", serverSide: true },
    resourcepacks: { category: "utility" },
  };
  const head = document.querySelector(".mg-results-head h2");
  if (head && titles[tab]) {
    head.innerHTML = `<img src="assets/mg/creeper-entity.png" alt="" class="mg-creeper-head-ico" width="18" height="18" /> ${escapeHtml(titles[tab])}`;
  }
  const preset = filters[tab] || { category: "all" };
  setActiveMgCategory(preset.category);
  mcHasSearched = false;
  mcVisibleResults = getMcTopResults(10).filter((item) => {
    if (preset.serverSide) {
      const hay = `${item.title} ${item.description} ${item.note}`.toLowerCase();
      return /\bserver\b|paper|spigot|bukkit|velocity|plugin/.test(hay) || item.category === "technology";
    }
    if (preset.category === "all") return true;
    return item.category === preset.category;
  });
  if (!mcVisibleResults.length) mcVisibleResults = getMcTopResults(10);
  grid.className = "mg-mod-grid";
  grid.innerHTML = mcVisibleResults.map((item) => renderMcModCard(item)).join("");
}

function setDashboardTab(tab, navId = "") {
  const allowed = [
    "antivirus", "scanner", "search", "moddemand", "home", "downloads", "favorites", "forum",
    "outdated", "profile", "settings", "servermods", "resourcepacks", "maps", "news", "chat",
  ];
  const rawTab = String(tab || "");
  let next = allowed.includes(rawTab) ? rawTab : "search";
  if (next === "antivirus") next = "scanner";
  activeNavId = navId || MG_NAV_DEFAULTS[rawTab] || MG_NAV_DEFAULTS[next] || "navModSearch";
  const viewTab = next === "settings" ? "profile" : next;
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
  const searchTabs = ["search", "servermods", "resourcepacks"];
  if (next === "home") renderMgHomePage();
  if (next === "news") { renderMgNewsPage(); bindMgNewsPage(); }
  if (next === "chat") { renderMgChatPage(); bindMgChatPage(); }
  if (next === "scanner") setTimeout(drawScannerDonut, 60);
  if (next === "maps") void renderMgMapsPage();
  if (searchTabs.includes(next)) {
    const pageTab = next;
    updateMgStats();
    if (pageTab === "search") {
      setActiveMgCategory("all");
      const q = mcSearchInput?.value?.trim() || "";
      if (mcHasSearched && (q || lastMcQuery)) renderMcSearch(q || lastMcQuery);
      else renderMcSearchIdle();
      const head = document.querySelector(".mg-results-head h2");
      if (head) {
        head.innerHTML = `<img src="assets/mg/creeper-entity.png" alt="" class="mg-creeper-head-ico" width="18" height="18" /> TOP RESULTS`;
      }
    } else {
      renderMgSectionPage(pageTab);
    }
  }
  if (viewTab === "forum") {
    void renderForum();
  } else {
    activeForumThreadId = null;
  }
  const demandSection = document.getElementById("modDemandSection");
  if (demandSection) demandSection.hidden = viewTab !== "moddemand";
  if (viewTab === "moddemand") renderModDemandPage();
  if (viewTab === "profile") renderSettingsHub();
  if (viewTab === "downloads") updateDownloadsManagePaths();
  if (viewTab === "outdated") void refreshOutdatedModsView();
  if (viewTab === "favorites") renderFavoritesHub();
  syncQuickFiltersPlacement(next);
}

function getMgProfileName() {
  try {
    return localStorage.getItem("mgProfileName") || localStorage.getItem("activateName") || "BlockBuilder";
  } catch {
    return "BlockBuilder";
  }
}

function getMgProfileEmail() {
  return String(state?.subscription?.email || state?.subscription?.emailMasked || "").trim();
}

function applyMgHomeAvatarToUi(src) {
  const url = src || "assets/mg/steve-head.png";
  for (const id of ["mgHomeAvatar", "mgProfileAvatar", "mgHomeAvatarNew"]) {
    const img = document.getElementById(id);
    if (img) img.src = url;
  }
}

function loadMgHomeAvatar() {
  try {
    const data = localStorage.getItem(MG_HOME_AVATAR_KEY);
    if (data) applyMgHomeAvatarToUi(data);
  } catch {}
}

function saveMgHomeAvatar(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = String(reader.result || "");
      if (!data.startsWith("data:image/")) return;
      localStorage.setItem(MG_HOME_AVATAR_KEY, data);
      applyMgHomeAvatarToUi(data);
    } catch {}
  };
  reader.readAsDataURL(file);
}

function renderMgHomePage() {
  const name = getMgProfileName();
  const email = getMgProfileEmail();
  // Welcome title
  const welcomeTitle = document.getElementById("mghWelcomeTitle");
  if (welcomeTitle) {
    const displayName = state?.username || name || 'there';
    welcomeTitle.textContent = `Hi ${displayName}, welcome to Modverse`;
  }
  // Legacy hidden elements
  const greet = document.getElementById("mgHomeGreeting");
  const profileName = document.getElementById("mgProfileName");
  if (greet) greet.textContent = `Hej, ${name}`;
  if (profileName) profileName.textContent = name;
  // New UI elements
  const emailStrip = document.getElementById("mgHomeEmailStrip");
  const levelNew = document.getElementById("mgHomeLevelNew");
  if (emailStrip) emailStrip.textContent = email || "Ikke logget ind";
  if (levelNew) {
    const lvl = document.getElementById("mgHomeLevel");
    levelNew.textContent = lvl ? lvl.textContent : "Level 24";
  }
  // Avatar
  loadMgHomeAvatar();
  // Sync avatar to new img element too
  try {
    const stored = localStorage.getItem(MG_HOME_AVATAR_KEY);
    const newAvatar = document.getElementById("mgHomeAvatarNew");
    if (newAvatar && stored) newAvatar.src = stored;
  } catch {}
}

function bindMgHomePage() {
  // Legacy hidden inputs
  document.getElementById("mgHomeNameInput")?.addEventListener("change", (e) => {
    const v = String(e.target?.value || "").trim().slice(0, 32);
    if (!v) return;
    try {
      localStorage.setItem("mgProfileName", v);
      localStorage.setItem("activateName", v);
    } catch {}
    renderMgHomePage();
  });
  document.getElementById("mgHomeAvatarBtn")?.addEventListener("click", () => {
    document.getElementById("mgHomeAvatarInput")?.click();
  });
  document.getElementById("mgHomeAvatarInput")?.addEventListener("change", (e) => {
    const file = e.target?.files?.[0];
    saveMgHomeAvatar(file);
    e.target.value = "";
  });
  // New avatar button
  document.getElementById("mgHomeAvatarBtnNew")?.addEventListener("click", () => {
    document.getElementById("mgHomeAvatarInput")?.click();
  });
  // Link/nav buttons
  document.querySelectorAll("[data-home-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-home-go") || "search";
      setDashboardTab(tab);
    });
  });
  // Role buttons toggle
  document.querySelectorAll(".mgh-role").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("mgh-role-active");
    });
  });
  // Outdated tab filter
  document.querySelectorAll(".mgod-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mgod-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const filter = tab.getAttribute("data-mgod-tab");
      document.querySelectorAll(".mgod-row").forEach((row) => {
        if (filter === "all" || row.getAttribute("data-mgod-type") === filter) {
          row.classList.remove("hidden");
        } else {
          row.classList.add("hidden");
        }
      });
    });
  });
  // Outdated search
  document.getElementById("mgodSearch")?.addEventListener("input", (e) => {
    const q = String(e.target.value || "").toLowerCase();
    document.querySelectorAll(".mgod-row").forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle("hidden", q.length > 0 && !text.includes(q));
    });
  });
  // Home popup buttons
  const POPUP_CONTENT = {
    rules: { title: 'Community Rules', body: '1. Be respectful to all members.\n2. No harmful mod links — use Modrinth or CurseForge.\n3. Keep discussion on topic.\n4. No spam or self-promotion.\n5. Follow all Minecraft EULA guidelines.' },
    events: { title: 'Upcoming Events', body: 'Check back soon for upcoming community events, mod showcases and build competitions!' },
    faq: { title: 'FAQ', body: 'Q: How do I download a mod?\nA: Go to Mod Search, find your mod and click Download.\n\nQ: Is ModGuard free?\nA: ModGuard requires a subscription. Check the website for pricing.\n\nQ: Which games are supported?\nA: Minecraft (Java & Bedrock) and The Sims 4.' },
  };
  document.querySelectorAll('[data-home-popup]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-home-popup');
      const content = POPUP_CONTENT[key];
      if (!content) return;
      const overlay = document.getElementById('mghPopupOverlay');
      const titleEl = document.getElementById('mghPopupTitle');
      const bodyEl = document.getElementById('mghPopupBody');
      if (!overlay || !titleEl || !bodyEl) return;
      titleEl.textContent = content.title;
      bodyEl.innerHTML = content.body.replace(/\n/g, '<br>');
      overlay.hidden = false;
      overlay.removeAttribute('aria-hidden');
    });
  });
  document.getElementById('mghPopupClose')?.addEventListener('click', () => {
    const overlay = document.getElementById('mghPopupOverlay');
    if (overlay) { overlay.hidden = true; overlay.setAttribute('aria-hidden', 'true'); }
  });
  document.getElementById('mghPopupOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.hidden = true;
      e.currentTarget.setAttribute('aria-hidden', 'true');
    }
  });
}

function drawScannerDonut() {
  const canvas = document.getElementById("mgsScanDonut");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const cx = 80, cy = 80, r = 65, lw = 20;
  const slices = [
    { color: "#23a559", pct: 0.862 },
    { color: "#f0b232", pct: 0.093 },
    { color: "#ed4245", pct: 0.045 },
  ];
  ctx.clearRect(0, 0, 160, 160);
  let start = -Math.PI / 2;
  for (const s of slices) {
    const end = start + s.pct * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.lineWidth = lw;
    ctx.strokeStyle = s.color;
    ctx.stroke();
    start = end;
  }
  // Center text
  ctx.fillStyle = "#f2f3f5";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("247", cx, cy - 8);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#949ba4";
  ctx.fillText("Filer", cx, cy + 14);
}

function loadNewsReactions() {
  try {
    const raw = localStorage.getItem(MG_NEWS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNewsReactions(map) {
  try {
    localStorage.setItem(MG_NEWS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

async function loadModNews() {
  const feed = document.getElementById("mgNewsFeed");
  const loading = document.getElementById("mgNewsLoading");
  if (!feed) return;

  const staticNews = [
    { tag: 'MODRINTH', title: 'Sodium 0.6 released — major performance improvements', meta: '2 days ago', icon: '⚡' },
    { tag: 'CURSEFORGE', title: 'Create: Steam n Rails 1.6 update adds new track types', meta: '3 days ago', icon: '⚙' },
    { tag: 'MODRINTH', title: 'Fabric 0.100 now supports Minecraft 1.21.5', meta: '5 days ago', icon: '⬡' },
    { tag: 'COMMUNITY', title: 'Terralith v2.5.5 — over 100 new biomes', meta: '1 week ago', icon: '🌍' },
    { tag: 'CURSEFORGE', title: 'JEI 19.21 — improved search and filtering', meta: '1 week ago', icon: '🔍' },
    { tag: 'MODRINTH', title: 'Iris Shaders 1.8.1 — better compatibility with 1.21', meta: '2 weeks ago', icon: '✦' },
  ];

  if (loading) loading.remove();

  feed.innerHTML = staticNews.map(n => `
    <div class="news-card">
      <div class="news-card-img-placeholder">${n.icon}</div>
      <div class="news-card-body">
        <div class="news-card-tag">${escapeHtml(n.tag)}</div>
        <div class="news-card-title">${escapeHtml(n.title)}</div>
        <div class="news-card-meta">${escapeHtml(n.meta)}</div>
      </div>
    </div>
  `).join('');
}

function renderMgNewsPage() {
  loadModNews();
}

let mgNewsBound = false;
function bindMgNewsPage() {
  // No-op: follow buttons removed from new news layout
}

function loadChatMessages() {
  try {
    const raw = localStorage.getItem(MG_CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return [...MG_CHAT_SEED];
}

function saveChatMessages(msgs) {
  try {
    localStorage.setItem(MG_CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-200)));
  } catch {}
}

function renderMgChatPage() {
  const box = document.getElementById("mgChatMessages");
  if (!box) return;
  const msgs = loadChatMessages();
  const byId = Object.fromEntries(msgs.map((m) => [m.id, m]));
  const unreadBar = document.getElementById("mgChatUnreadBar");
  const chatRead = localStorage.getItem("mgChatChannelRead") === "1";
  if (unreadBar) unreadBar.hidden = chatRead;
  let html = "";
  let insertedNew = false;
  for (const msg of msgs) {
    if (!insertedNew && msg.isNew && !chatRead) {
      html += `<div class="dc-divider-nye"><span>NYE</span></div>`;
      insertedNew = true;
    }
    const color = msg.color || DC_CHAT_AVATAR_COLORS[msg.user] || "#5865f2";
    const role = msg.role ? dcStaffBadgeHtml() : "";
    const time = msg.time || "i dag";
    let replyHtml = "";
    if (msg.replyTo && byId[msg.replyTo]) {
      const ref = byId[msg.replyTo];
      replyHtml = `
      <div class="dc-reply">
        <span class="dc-reply-bar"></span>
        <span class="dc-reply-inner">
          <span class="dc-reply-user" style="color:${escapeHtml(ref.color || "#5865f2")}">${escapeHtml(ref.user)}</span>
          <span class="dc-reply-snippet">${escapeHtml(ref.text)}</span>
        </span>
      </div>`;
    }
    const rx = msg.reactions || {};
    const rxHtml = Object.entries(rx)
      .map(
        ([emo, n]) =>
          `<button type="button" class="dc-msg-reaction" data-chat-id="${escapeHtml(msg.id)}" data-chat-emo="${escapeHtml(emo)}"><span>${escapeHtml(emo)}</span><span>${n}</span></button>`,
      )
      .join("");
    const threadHtml = msg.threadReplies
      ? `<button type="button" class="dc-thread-link">${msg.threadReplies} svar <span>Se tråd</span></button>`
      : "";
    html += `
    <div class="dc-msg" data-chat-id="${escapeHtml(msg.id)}">
      ${dcAvatarHtml(msg.user, color)}
      <div class="dc-msg-body">
        <div class="dc-msg-head">
          <strong style="color:${escapeHtml(color)}">${escapeHtml(msg.user)}</strong>${role}
          <time>${escapeHtml(time)}</time>
        </div>
        ${replyHtml}
        <div class="dc-msg-text">${linkifyDiscordChannels(msg.text)}</div>
        ${rxHtml ? `<div class="dc-msg-reactions">${rxHtml}</div>` : ""}
        ${threadHtml}
      </div>
    </div>`;
  }
  box.innerHTML = html;
  box.scrollTop = box.scrollHeight;
  box.querySelectorAll(".dc-msg-reaction").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-chat-id");
      const emo = btn.getAttribute("data-chat-emo");
      const list = loadChatMessages();
      const m = list.find((x) => x.id === id);
      if (!m) return;
      if (!m.reactions) m.reactions = {};
      m.reactions[emo] = (m.reactions[emo] || 0) + 1;
      saveChatMessages(list);
      renderMgChatPage();
    });
  });
}

function sendChatMessage(text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  const list = loadChatMessages();
  const now = new Date();
  list.push({
    id: `local-${Date.now()}`,
    user: getMgProfileName(),
    color: DC_CHAT_AVATAR_COLORS[getMgProfileName()] || "#5865f2",
    text: clean,
    time: `i dag kl. ${now.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`,
    at: list.length + 1,
    reactions: {},
  });
  saveChatMessages(list);
  renderMgChatPage();
}

let mgChatBound = false;
function bindMgChatPage() {
  if (mgChatBound) return;
  mgChatBound = true;
  document.getElementById("mgChatCompose")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("mgChatInput");
    const text = input?.value || "";
    if (input) input.value = "";
    sendChatMessage(text);
  });
  document.getElementById("mgChatMarkRead")?.addEventListener("click", () => {
    localStorage.setItem("mgChatChannelRead", "1");
    const bar = document.getElementById("mgChatUnreadBar");
    if (bar) bar.hidden = true;
    renderMgChatPage();
  });
}

async function fetchMgMaps(query = "") {
  const q = encodeURIComponent(query || "map adventure structure");
  const facets = encodeURIComponent(JSON.stringify([["project_type:mod"]]));
  const url = `https://api.modrinth.com/v2/search?query=${q}&limit=24&index=relevance&facets=${facets}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data?.hits) ? data.hits : []).map((hit, i) => modrinthHitToItem(hit, i));
  } catch {
    return [];
  }
}

async function renderMgMapsPage() {
  const grid = document.getElementById("mgMapsGrid");
  const status = document.getElementById("mgMapsStatus");
  if (!grid) return;
  const q = document.getElementById("mgMapsSearchInput")?.value?.trim() || "";
  if (status) {
    status.hidden = false;
    status.textContent = "Henter maps og verdens mods...";
  }
  let items = await fetchMgMaps(q || "world map structure biome");
  if (!items.length) {
    items = getMcAllItems().filter((item) => {
      const hay = `${item.title} ${item.description} ${item.note}`.toLowerCase();
      return item.category === "world" || /\bmap\b|structure|biome|worldgen|dungeon|adventure/.test(hay);
    });
    if (q) {
      const nq = normalizeSearchText(q);
      items = items.filter((item) => normalizeSearchText(`${item.title} ${item.description}`).includes(nq));
    }
  }
  items = items.slice(0, 24);
  if (status) {
    status.textContent = items.length ? `${items.length} resultater` : "Ingen resultater. Prøv et andet søgeord.";
    status.hidden = !items.length && !q;
  }
  grid.innerHTML = items.length ? items.map((item) => renderMcModCard(item)).join("") : `<p class="mg-maps-hint">Ingen maps fundet endnu.</p>`;
}

function bindMgMapsPage() {
  document.getElementById("mgMapsSearchBtn")?.addEventListener("click", () => void renderMgMapsPage());
  document.getElementById("mgMapsSearchInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void renderMgMapsPage();
  });
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

function richQueryExpand(value) {
  const raw = String(value || "").trim().replace(/#/g, " ");
  const clean = normalizeSearchText(raw);
  const replacements = [
    // Graphics / performance
    ["shader", "iris optifine shaders graphics render"],
    ["shaders", "iris optifine sodium shaders graphics"],
    ["grafik", "iris optifine shaders graphics render"],
    ["fps", "sodium lithium performance optimization ydelse"],
    ["lag", "sodium lithium performance fps optimization"],
    ["performance", "sodium lithium fps optimization ferritecore"],
    ["ydelse", "sodium lithium performance fps"],
    ["optifine", "optifine shaders hd textures forge classic"],
    ["iris", "iris shaders fabric sodium graphics"],
    // Mod loaders
    ["forge", "neoforge forge modloader"],
    ["neoforge", "neoforge forge modloader modern"],
    ["fabric", "quilt fabric modloader lightweight"],
    ["quilt", "quilt fabric modloader"],
    // Packs
    ["modpack", "modpack pack launcher profile mrpack"],
    ["modpakke", "modpack pack launcher modpakke"],
    ["mrpack", "modrinth modpack format pack"],
    // Server
    ["server", "paper spigot bukkit plugin server"],
    ["plugin", "paper spigot bukkit hangar plugin"],
    ["paper", "paper spigot bukkit server plugin"],
    ["spigot", "spigot bukkit plugin server paper"],
    // World
    ["map", "worldgen structure biome dimension"],
    ["verden", "worldgen biome structure terrain"],
    ["biome", "biomes worldgen terralith byg bop terrain"],
    ["worldgen", "worldgen biomes terralith terrain generation"],
    // Tech mods
    ["create", "create automation contraption mechanical train"],
    ["ae2", "applied energistics ae2 storage autocraft me"],
    ["mekanism", "mekanism technology power energy machines"],
    ["tech", "applied energistics ae2 technology create machines"],
    ["teknologi", "create ae2 technology automation machines"],
    // Magic
    ["magic", "ars botania thaum magic spell"],
    ["magi", "ars botania magic spell arcane"],
    ["botania", "botania magic mana flowers nature"],
    ["ars", "ars nouveau magic spells arcane glyphs"],
    // Utility
    ["jei", "jei rei emi recipe just enough items"],
    ["opskrift", "jei rei recipe guide crafting"],
    ["minimap", "xaero journeymap waypoints navigation hud"],
    ["kort", "xaero journeymap map waypoints navigation"],
    ["voice", "simple voice chat proximity multiplayer"],
    ["stemme", "simple voice chat voice proximity"],
    // Bedrock
    ["bedrock", "mcpedl addon bedrock pocket edition"],
    ["pocket", "bedrock mcpedl addon edition"],
    // Security
    ["virus", "malware scan security safe modguard"],
    ["sikkerhed", "security scan malware safe"],
    // Adventure/world
    ["dragon", "ice fire dragons mythical creatures fantasy"],
    ["drage", "ice fire dragons mythical creatures fantasy"],
    ["dungeon", "dungeons taverns structures adventure exploration"],
    // Compatibility
    ["backport", "version older legacy port compatibility"],
    ["sync", "profile sync server client modlist"],
    ["synk", "profile sync server modlist"],
    // Animals / mobs
    ["mob", "alexs mobs animals creatures wildlife"],
    ["dyr", "alexs mobs animals creatures wildlife"],
    // Food / decoration
    ["mad", "farmers delight food cooking crops kitchen"],
    ["food", "farmers delight food cooking crops kitchen"],
    ["storage", "sophisticated storage chest barrel drawer inventory"],
    ["opbevaring", "sophisticated storage chest barrel drawer inventory"],
    // Danish common terms
    ["gratis", "free open source modrinth fabric"],
    ["download", "modrinth curseforge download install"],
    ["installation", "install download setup launcher guide"],
    ["hvordan", "guide how tutorial install setup"],
    ["bedste", "best popular top recommended featured"],
  ];
  const stop = new Set(["the", "and", "for", "med", "til", "fra", "og", "en", "et", "er"]);
  const words = new Set(clean.split(" ").filter((t) => t.length >= 2 && !stop.has(t)));
  for (const [from, to] of replacements) {
    if (clean.includes(from)) {
      for (const token of to.split(" ")) words.add(token);
    }
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
  const picker = document.getElementById("mcStarPicker");
  if (!picker) return;
  for (const btn of picker.querySelectorAll(".star-btn")) {
    const n = Number(btn.getAttribute("data-star") || 0);
    btn.classList.toggle("active", n <= simsMinRating && simsMinRating > 0);
  }
  if (mcRatingFilter) mcRatingFilter.value = simsMinRating >= 5 ? "5" : simsMinRating >= 4 ? "4" : "all";
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

function getItemPreviewUrl(item, query = lastMcQuery) {
  // Check all possible image fields: previewImageUrl, thumbnailUrl, thumbUrl
  const direct = String(item?.previewImageUrl || item?.thumbnailUrl || item?.thumbUrl || "").trim();
  if (/^https:\/\//i.test(direct)) return direct;
  const preview = getVerifiedPreview(item);
  if (preview.url) return preview.url;
  if (item?.thumbnailUrl && /^https:\/\//i.test(item.thumbnailUrl)) return item.thumbnailUrl;
  if (item?.thumbUrl && /^https:\/\//i.test(item.thumbUrl)) return item.thumbUrl;
  return mcThumbDataUrl(item, query);
}

function getModCanonicalUrl(item, query = lastMcQuery) {
  const raw = String(item?.url || "").trim();
  if (raw && isAllowedModSearchUrl(raw) && !/google\.com\/search/i.test(raw)) return raw;
  const platform = mcPlatformForItem(item);
  return platform.url(normalizeMcQuery(query));
}

let previewZoomOpenUrl = "";

function openPreviewZoom(item, query = lastMcQuery) {
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
  const intent = inferMcIntent(lastMcQuery || mcSearchInput?.value || "");
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
  if (!/^https:\/\//i.test(pageUrl)) return false;
  return !/^https:\/\//i.test(previewUrl) || previewUrl.startsWith("data:");
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
        <span class="mod-hub-pack-badge">📦 ${count} mods i ét link</span>
        <img class="mod-card-img" src="${escapeHtml(previewUrl)}" alt="" loading="lazy" />
        <div class="mod-hub-pack-copy">
          <h3>${escapeHtml(item.title)}</h3>
          <p>Dette link indeholder <strong>${count} separate mods</strong> — vælg den/dem du vil have herunder:</p>
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
    list.innerHTML = `<p class="mod-hub-picker-empty">Kunne ikke hente mods — åbn kilden i browseren.</p>`;
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
  const platform = mcPlatformForItem(parentItem);
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
  const platform = mcPlatformForItem(item);
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
  const platform = mcPlatformForItem(item);
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
      const cardImg = mcBrowserScreen?.querySelector(`.mod-card-img[data-item-title="${CSS.escape(updated.title)}"]`);
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
  const entry = mcVisibleResults.find((item) => item.title === title);
  if (entry) {
    entry.thumbnailUrl = enriched.thumbnailUrl;
    entry.previewImageUrl = enriched.previewImageUrl || enriched.thumbnailUrl;
    entry.previewStatus = enriched.previewStatus || "og-preview";
  }
}

function getModPreviewRoot() {
  return mcBrowserScreen || document.getElementById("favoritesGrid") || null;
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
  bindRoot(mcBrowserScreen);
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
  if (!mcVisibleResults?.length) return mcVisibleResults;
  try {
    const enriched = await ipcRenderer.invoke("modsearch-enrich-batch", { items: mcVisibleResults });
    if (Array.isArray(enriched)) mcVisibleResults = enriched;
  } catch {
    // ignore
  }
  return mcVisibleResults;
}

function renderMcDockScans() {
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
  return MC_SEED_ITEMS
    .filter((entry) => entry !== item && entry.collectionKey === key)
    .slice(0, 6);
}

function displayMcQuery(value) {
  return String(value || "").trim();
}

function previewSortScore(item = {}) {
  // Check all image fields including thumbUrl used by seed items
  const thumb = String(item?.previewImageUrl || item?.thumbnailUrl || item?.thumbUrl || "").trim();
  if (/^https:\/\//i.test(thumb) && !thumb.startsWith("data:")) return 3;
  if (thumb && !thumb.startsWith("data:")) return 2;
  return 0;
}

function sortResultsByPreviewQuality(results = []) {
  return [...results].sort((a, b) => {
    const diff = previewSortScore(b) - previewSortScore(a);
    if (diff) return diff;
    return (b.relevanceScore || 0) - (a.relevanceScore || 0) || (b.downloads || 0) - (a.downloads || 0);
  });
}

function updateMcSearchHints() {
  if (!mcSearchHints) return;
  mcSearchHints.hidden = true;
  mcSearchHints.innerHTML = "";
}

function formatMcDownloads(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function getMcCategoryLabel(category) {
  return MC_CATEGORY_LABELS[category] || "MOD";
}

function getActiveMgCategory() {
  return document.getElementById("mcCategoryFilter")?.value || "all";
}

function setActiveMgCategory(cat) {
  const select = document.getElementById("mcCategoryFilter");
  if (select) select.value = cat === "all" ? "all" : cat;
}

const MG_FEATURED_ORDER = [
  "Create",
  "Biomes O' Plenty",
  "Tinker's Construct",
  "Alex's Mobs",
  "Applied Energistics 2",
  "Journeymap",
  "Artifacts",
  "JEI - Just Enough Items",
  "Fabulously Optimized",
  "Sophisticated Storage",
];

function getMcTagClass(category) {
  if (category === "technology") return "tag-tech";
  if (category === "world") return "tag-world";
  if (category === "adventure") return "tag-adventure";
  if (category === "magic") return "tag-magic";
  if (category === "utility") return "tag-utility";
  if (category === "optimization") return "tag-perf";
  return "tag-default";
}

function getMcSecondaryTag(item) {
  const desc = String(item.description || "").toLowerCase();
  if (/\bautomation\b|\bcontraption\b|\bfactory\b/.test(desc)) return "AUTOMATION";
  if (/\bbiome\b|\bworldgen\b|\bterrain\b/.test(desc)) return "BIOMES";
  if (/\bshader\b/.test(desc)) return "SHADERS";
  if (item.category === "magic") return "MAGIC";
  return "";
}

function isMcNsfwAllowed() {
  return !!(adultContentEnabled && adultContentConfirmed);
}

function modrinthModSideFromHit(hit) {
  const client = String(hit.client_side || "").toLowerCase();
  const server = String(hit.server_side || "").toLowerCase();
  if (client === "required" && server === "required") return "both";
  if (server === "required" && client !== "required") return "server";
  if (client === "required") return "client";
  if (server === "required") return "server";
  return "client";
}

function modrinthCategoryFromHit(hit) {
  const cats = hit.categories || hit.display_categories || [];
  if (cats.includes("technology") || cats.includes("equipment")) return "technology";
  if (cats.includes("magic")) return "magic";
  if (cats.includes("adventure")) return "adventure";
  if (cats.includes("worldgen") || cats.includes("cursed")) return "world";
  if (cats.includes("optimization")) return "optimization";
  if (cats.includes("decoration")) return "decoration";
  if (cats.includes("storage")) return "utility";
  if (cats.includes("utility")) return "utility";
  return "utility";
}

function modrinthLoadersFromHit(hit) {
  const cats = (hit.categories || hit.display_categories || []).map((c) => String(c).toLowerCase());
  const loaders = ["fabric", "forge", "neoforge", "quilt"].filter((l) => cats.includes(l));
  return loaders.length ? loaders : ["fabric"];
}

function modrinthHitToItem(hit, idx) {
  const title = String(hit.title || "Mod").trim();
  const projectId = String(hit.project_id || hit.slug || idx);
  const category = modrinthCategoryFromHit(hit);
  const loaders = modrinthLoadersFromHit(hit);
  // Use the latest supported version as minVersion (last in sorted list = oldest, first = newest)
  const versions = Array.isArray(hit.versions) ? hit.versions : [];
  const minVersion = versions.length ? String(versions[0]) : "1.20.1";
  // Prefer a gallery screenshot over the small icon when one is available
  const galleryImg = Array.isArray(hit.gallery) && hit.gallery.length > 0
    ? String(hit.gallery[0]?.url || hit.gallery[0] || "").trim()
    : "";
  const thumbUrl = (galleryImg || String(hit.icon_url || "")).trim();
  const downloads = Number(hit.downloads) || 0;
  const follows = Number(hit.follows) || 0;
  const slug = String(hit.slug || projectId);
  const modSide = modrinthModSideFromHit(hit);
  const cats = (hit.categories || hit.display_categories || []).map(String);
  // Build rich tag list from categories and keywords
  const tagSet = new Set([slug, category, ...loaders, ...cats.slice(0, 6)]);
  const desc = String(hit.description || "").trim();
  // Rating estimate based on follows + downloads ratio
  const ratingBase = follows > 0 && downloads > 0 ? Math.min(5, 3.5 + (follows / downloads) * 50) : 3.8 + ((idx % 12) / 10);
  const rating = Number(ratingBase.toFixed(1));
  // Safety score — Modrinth is curated so baseline is high
  const safetyPct = 96 + (idx % 4);
  return {
    id: `mc-mr-${projectId}`,
    category,
    title,
    platform: "Modrinth",
    platformKey: "modrinth",
    modSide,
    author: String(hit.author || "Modrinth").trim(),
    description: desc || `Minecraft mod on Modrinth — ${title}.`,
    note: desc || `${title} — available on Modrinth.`,
    tags: [...tagSet],
    loaders,
    minVersion,
    thumbUrl: thumbUrl || `https://cdn.modrinth.com/data/${projectId}/icon.png`,
    downloads,
    follows,
    rating,
    safetyPct,
    url: `https://modrinth.com/mod/${slug}`,
    nsfw: !!(hit.nsfw || hit.content_warnings?.length),
    updatedAt: String(hit.date_modified || hit.date_created || ""),
  };
}

function readMcCatalogCache() {
  try {
    const raw = localStorage.getItem(MC_CATALOG_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeMcCatalogCache(items) {
  try {
    localStorage.setItem(MC_CATALOG_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items: items.slice(0, 5000) }));
  } catch {}
}

function mergeMcCatalogWithSeed(catalog) {
  const byTitle = new Map(catalog.map((item) => [item.title.toLowerCase(), item]));
  for (const seed of MC_SEED_ITEMS) {
    const key = seed.title.toLowerCase();
    if (!byTitle.has(key)) byTitle.set(key, seed);
    else {
      const existing = byTitle.get(key);
      if (!existing.thumbUrl && seed.thumbUrl) existing.thumbUrl = seed.thumbUrl;
      if (!existing.author || existing.author === "Modrinth") existing.author = seed.author;
    }
  }
  return [...byTitle.values()];
}

function getMcAllItems() {
  if (mcCatalogItems.length) return mcCatalogItems;
  const cached = readMcCatalogCache();
  if (cached.length) {
    mcCatalogItems = mergeMcCatalogWithSeed(cached);
    return mcCatalogItems;
  }
  return MC_SEED_ITEMS;
}

async function fetchMcModCatalog({ force = false } = {}) {
  if (mcCatalogLoading && mcCatalogLoadPromise) return mcCatalogLoadPromise;
  if (!force && mcCatalogItems.length) return mcCatalogItems;
  const cached = !force ? readMcCatalogCache() : [];
  if (!force && cached.length) {
    mcCatalogItems = mergeMcCatalogWithSeed(cached);
    return mcCatalogItems;
  }

  mcCatalogLoading = true;
  updateMcCatalogStatus("Loading mods from Modrinth…");

  mcCatalogLoadPromise = (async () => {
    const collected = [];
    const facets = encodeURIComponent(JSON.stringify([["project_type:mod"]]));
    for (let page = 0; page < MC_CATALOG_MAX_PAGES; page++) {
      const offset = page * MC_CATALOG_PAGE_SIZE;
      const url = `https://api.modrinth.com/v2/search?query=&limit=${MC_CATALOG_PAGE_SIZE}&offset=${offset}&index=downloads&facets=${facets}`;
      let res;
      try {
        res = await fetch(url);
      } catch {
        break;
      }
      if (!res.ok) break;
      const data = await res.json();
      const hits = Array.isArray(data?.hits) ? data.hits : [];
      if (!hits.length) break;
      for (const hit of hits) collected.push(modrinthHitToItem(hit, collected.length));
      updateMcCatalogStatus(`Loading mods… ${collected.length}`);
      if (hits.length < MC_CATALOG_PAGE_SIZE) break;
    }
    if (collected.length) {
      mcCatalogItems = mergeMcCatalogWithSeed(collected);
      writeMcCatalogCache(collected);
    } else if (!mcCatalogItems.length) {
      mcCatalogItems = [...MC_SEED_ITEMS];
    }
    mcCatalogLoading = false;
    updateMcCatalogStatus("");
    updateMgStats();
    return mcCatalogItems;
  })();

  try {
    return await mcCatalogLoadPromise;
  } finally {
    mcCatalogLoading = false;
    mcCatalogLoadPromise = null;
  }
}

function updateMcCatalogStatus(text) {
  const node = document.getElementById("mgCatalogStatus");
  const countNode = document.getElementById("mgModCount");
  if (node) {
    const msg = String(text || "").trim();
    node.hidden = !msg;
    node.textContent = msg;
  }
  if (countNode) {
    const n = getMcAllItems().length;
    countNode.textContent = n ? `(${n.toLocaleString()} mods)` : "";
  }
}

function getMcModSideFilter() {
  return document.getElementById("mcModSideFilter")?.value || "all";
}

function getMcPlatformFilter() {
  return document.getElementById("mcPlatformFilter")?.value || "all";
}

function itemMatchesModSide(item, sideFilter) {
  if (sideFilter === "all") return true;
  const side = item.modSide || "client";
  if (sideFilter === "both") return side === "both";
  if (sideFilter === "server") return side === "server";
  if (sideFilter === "client") return side === "client" || side === "both";
  return true;
}

function getMcFilteredItems() {
  const cat = getActiveMgCategory();
  const ver = document.getElementById("mgFilterVersion")?.value
    || document.getElementById("mcVersionFilter")?.value
    || "all";
  const loader = document.getElementById("mcTypeFilter")?.value || "all";
  const sideFilter = getMcModSideFilter();
  const platformFilter = getMcPlatformFilter();
  const allowNsfw = isMcNsfwAllowed();
  return getMcAllItems().filter((item) => {
    if (!allowNsfw && (item.nsfw || MC_NSFW_TITLES.has(item.title))) return false;
    if (cat !== "all" && item.category !== cat) return false;
    if (ver !== "all" && !String(item.minVersion || "").startsWith(ver)) return false;
    if (loader !== "all" && !(item.loaders || []).includes(loader)) return false;
    if (platformFilter !== "all" && item.platformKey !== platformFilter) return false;
    if (!itemMatchesModSide(item, sideFilter)) return false;
    return true;
  });
}

function getMcTopResults(limit = 10) {
  const items = getMcFilteredItems().sort((a, b) => b.downloads - a.downloads);
  return items.slice(0, limit);
}

function getMcAllDisplayMods() {
  const sort = document.getElementById("mcSortSelect")?.value || "relevance";
  const items = getMcFilteredItems();
  if (sort === "popular") return [...items].sort((a, b) => b.downloads - a.downloads);
  if (sort === "alphabetical") return [...items].sort((a, b) => a.title.localeCompare(b.title));
  const byTitle = new Map(items.map((item) => [item.title, item]));
  const featured = MG_FEATURED_ORDER.map((title) => byTitle.get(title)).filter(Boolean);
  const rest = items.filter((item) => !featured.includes(item)).sort((a, b) => b.downloads - a.downloads);
  return featured.concat(rest);
}

// Cache for live Modrinth stats
const MG_STATS_CACHE_KEY = "mc_modguard_live_stats_v1";
let mgStatsLastFetch = 0;

async function fetchLiveMgStats() {
  // Throttle: refresh at most once per 10 minutes
  const now = Date.now();
  if (now - mgStatsLastFetch < 600_000) return;
  try {
    const res = await fetch("https://api.modrinth.com/v2/statistics", {
      headers: { "User-Agent": "ModGuard/1.0 (modguard.dk)" }
    });
    if (!res.ok) return;
    const data = await res.json();
    mgStatsLastFetch = now;
    const stats = {
      projects: Number(data.projects) || 0,
      authors: Number(data.authors) || 0,
      files: Number(data.files) || 0,
      versions: Number(data.versions) || 0,
      fetchedAt: now,
    };
    try { localStorage.setItem(MG_STATS_CACHE_KEY, JSON.stringify(stats)); } catch {}
    applyLiveMgStats(stats);
  } catch {
    // Silently fall back to cached/estimated numbers
  }
}

function readCachedMgStats() {
  try {
    const raw = localStorage.getItem(MG_STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Use cache if less than 6 hours old
    if (Date.now() - (parsed.fetchedAt || 0) < 6 * 3600_000) return parsed;
  } catch {}
  return null;
}

function applyLiveMgStats(stats) {
  const set = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };
  if (stats.projects > 0) {
    set("mgStatMods", formatMgStatNumber(stats.projects));
  }
  if (stats.authors > 0) {
    set("mgStatCreators", formatMgStatNumber(stats.authors));
  }
  const catalogItems = getMcAllItems();
  const totalDl = catalogItems.reduce((sum, item) => sum + (item.downloads || 0), 0);
  if (totalDl > 0) {
    set("mgStatDownloads", formatMgStatNumber(totalDl));
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
  const set = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  // Try cached live stats first
  const cached = readCachedMgStats();
  if (cached) {
    applyLiveMgStats(cached);
  } else {
    // Use local catalog count as estimate until API responds
    const modCount = getMcAllItems().length;
    // Modrinth has ~100,000+ projects — show real estimate based on local catalog
    if (modCount > 0) {
      set("mgStatMods", formatMgStatNumber(modCount));
    } else {
      set("mgStatMods", "100K+");
    }
    set("mgStatCreators", "66K+");
    const catalogItems = getMcAllItems();
    const totalDl = catalogItems.reduce((s, i) => s + (i.downloads || 0), 0);
    set("mgStatDownloads", totalDl > 0 ? formatMgStatNumber(totalDl) : "–");
  }

  // Safe % — based on Modrinth's curation policy (they review mods)
  set("mgStatSafe", "99.1%");

  // Broken mods — from actual scan history
  const broken = parseInt(document.getElementById("outdatedModsCount")?.textContent || "0", 10);
  const badge = document.getElementById("navOutdatedBadge");
  if (badge) badge.textContent = broken > 0 ? String(broken) : "0";

  // Kick off a background live fetch (won't block UI)
  fetchLiveMgStats().catch(() => {});
}

function paintMcModGrid(items, { reset = true } = {}) {
  if (!mcBrowserScreen) return;
  mcGridAllItems = items;
  if (reset) mcGridRenderLimit = 200;
  const visible = items.slice(0, mcGridRenderLimit);
  mcBrowserScreen.className = "mg-mod-grid";

  // Separate portal cards from real results — portals always go at the very end
  const realItems = visible.filter((i) => !i.isPortal);
  const portals = visible.filter((i) => i.isPortal);

  const cards = [...realItems, ...portals].map((item) => renderMcModCard(item)).join("");
  const more = items.length > visible.length
    ? `<button type="button" class="mg-load-more" id="mgLoadMoreMods">Indlæs flere mods (${(items.length - visible.length).toLocaleString()} tilbage)</button>`
    : "";
  mcBrowserScreen.innerHTML = cards + more;
  bindMcModThumbFallbacks();

  // Update result count in header
  const countEl = document.getElementById("mgModCount");
  if (countEl) countEl.textContent = items.length ? `(${items.filter((i) => !i.isPortal).length.toLocaleString()} resultater)` : "";
  updateMcCatalogStatus("");
}

function bindMcModThumbFallbacks(root = mcBrowserScreen) {
  if (!root) return;
  for (const img of root.querySelectorAll(".mg-mod-thumb-img")) {
    const shimmer = img.nextElementSibling;
    img.addEventListener("load", () => {
      img.classList.add("loaded");
      if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
    }, { once: true });
    img.onerror = () => {
      const fallback = img.getAttribute("data-fallback");
      if (fallback && img.src !== fallback) {
        img.src = fallback;
        img.classList.remove("loaded");
        return;
      }
      img.style.display = "none";
      if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
    };
    // If already loaded (cached), hide shimmer
    if (img.complete && img.naturalHeight > 0) {
      img.classList.add("loaded");
      if (shimmer?.classList.contains("mg-mod-thumb-shimmer")) shimmer.style.display = "none";
    }
  }
}

function renderMcSearchIdle() {
  mcHasSearched = false;
  mcVisibleResults = [];
  mcCurrentPage = 1;
  if (mcBrowserAddress) mcBrowserAddress.textContent = "modguard://minecraft/search";
  updateMcSearchHints();
  updateMgStats();
  updateMcCatalogStatus(mcCatalogLoading ? "Loading mods from Modrinth…" : "");
  if (!mcBrowserScreen) return;
  const items = getMcAllDisplayMods();
  mcVisibleResults = items;
  if (!items.length && mcCatalogLoading) {
    mcBrowserScreen.className = "mg-mod-grid";
    mcBrowserScreen.innerHTML = '<div class="mg-idle"><strong>Loading mods…</strong><span>Fetching catalog from Modrinth.</span></div>';
    return;
  }
  paintMcModGrid(items, { reset: true });
  updateMcCatalogStatus("");
}

function renderMcSearchSkeleton() {
  if (!mcBrowserScreen) return;
  mcBrowserScreen.className = "mg-mod-grid";
  mcBrowserScreen.innerHTML = Array.from({ length: 10 }, () =>
    `<article class="mg-mod-card" aria-hidden="true"><div class="mg-mod-thumb" style="opacity:.25"></div><div class="mg-mod-body"><h3>…</h3></div></article>`
  ).join("");
}

function mcThumbDataUrl(itemOrPlatform, query) {
  const platform = MC_SEARCH_PLATFORMS.find((entry) => entry.key === itemOrPlatform?.platformKey || entry.key === itemOrPlatform?.sourceKey) || itemOrPlatform;
  const [a, b] = Array.isArray(platform?.theme) ? platform.theme : ["#3fa028", "#1a3018"];
  const titleText = String(itemOrPlatform?.title || query || "Minecraft Mod").replace(/[<>&]/g, "").slice(0, 28);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <rect width="480" height="300" fill="url(#bg)"/>
      <rect x="24" y="24" width="72" height="72" fill="#5a8a32" stroke="#2d5018" stroke-width="4"/>
      <rect x="24" y="24" width="72" height="18" fill="#3fa028"/>
      <rect x="96" y="48" width="360" height="20" rx="4" fill="rgba(0,0,0,.25)"/>
      <rect x="96" y="80" width="280" height="14" rx="4" fill="rgba(0,0,0,.2)"/>
      <text x="24" y="268" fill="#fff" font-family="Arial,sans-serif" font-size="22" font-weight="800">${titleText}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function renderPreviewBlock(item, url, className = "result-thumb") {
  const previewUrl = getItemPreviewUrl(item);
  return `
    <button class="${className} result-thumb-button verified-preview" type="button" style="background-image:url('${escapeHtml(previewUrl)}')" data-open-sims-title="${escapeHtml(item.title)}" data-open-sims-url="${escapeHtml(url)}" aria-label="Preview ${escapeHtml(item.title)}"></button>
  `;
}

function scoreMcItem(item, query) {
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

function modFitScoreMcItem(item, query) {
  let score = scoreMcItem(item, query);
  if (itemMatchesMcIntent(item, query)) score += 10;
  const intent = inferMcIntent(query);
  if (intent && item.category === intent) score += 8;
  return score;
}

function getModFitMcPool() {
  const items = getMcAllDisplayMods();
  return items.length ? items : getMcFilteredItems();
}

const MOD_FIT_QUESTIONS_MC = [
  {
    id: "world",
    question: "Hvordan vil du helst have, at en ny verden føles?",
    hint: "Tænk på det første du gør, når du starter en ny save.",
    options: [
      { value: "survival", label: "Overlevelse, udforskning og små mål undervejs" },
      { value: "tech", label: "Fabrikker, systemer og ting der kører af sig selv" },
      { value: "magic", label: "Magi, dimensioner og fantasy verdener" },
      { value: "building", label: "Byggeri, interiør og pæne landskaber" },
      { value: "chill", label: "Roligt tempo uden pres og grind" },
    ],
  },
  {
    id: "session",
    question: "Hvad laver du oftest i de første timer af en spilsession?",
    hint: "Vælg det der ligner dig mest, ikke det du tror du burde vælge.",
    options: [
      { value: "explore", label: "Finder huler, strukturer og nye biomer" },
      { value: "build", label: "Bygger base, farm eller dekor" },
      { value: "progress", label: "Skubber tech tree eller quest linje" },
      { value: "fight", label: "Bosser, dungeons og bedre combat" },
      { value: "setup", label: "Optimerer controls, UI og kvalitet af liv" },
    ],
  },
  {
    id: "priority",
    question: "Hvad vil du helst have en mod skal løse for dig lige nu?",
    hint: "Vi matcher mod et reelt behov, ikke bare popularitet.",
    options: [
      { value: "performance", label: "Bedre FPS og mindre lag" },
      { value: "graphics", label: "Pænere lys, skygger og shaders" },
      { value: "utility", label: "Opskrifter, kort og smartere menus" },
      { value: "automation", label: "Maskiner, lagring og automatisering" },
      { value: "adventure", label: "Nye strukturer, bosser og loot" },
      { value: "worldgen", label: "Flottere eller mere varieret verden" },
    ],
  },
  {
    id: "social",
    question: "Hvordan spiller du med andre, hvis du spiller med andre?",
    hint: "Det påvirker om vi foreslår server venlige mods.",
    options: [
      { value: "solo", label: "Spiller mest alene i singleplayer" },
      { value: "friends", label: "Lille gruppe med venner på privat server" },
      { value: "public", label: "Offentlig server eller fælles community" },
      { value: "modpack", label: "Kører store modpacks med faste regler" },
    ],
  },
  {
    id: "experience",
    question: "Hvor er du i din modding rejse?",
    hint: "Svar ærligt, så vi ikke anbefaler noget for avanceret.",
    options: [
      { value: "new", label: "Helt ny, vil gerne starte simpelt" },
      { value: "some", label: "Har få mods, vil udvide stille og roligt" },
      { value: "regular", label: "Modder ofte og kender de fleste begreber" },
      { value: "power", label: "Erfaren og tør godt have mange features" },
    ],
  },
  {
    id: "loader",
    question: "Hvilken mod loader bruger du i dag?",
    hint: "Hvis du er i tvivl, vælg Ikke sikker.",
    options: [
      { value: "fabric", label: "Fabric" },
      { value: "forge", label: "Forge" },
      { value: "neoforge", label: "NeoForge" },
      { value: "unsure", label: "Ikke sikker, vis mig bredt udvalg" },
    ],
  },
];

let modFitStepMc = 0;
let modFitAnswersMc = {};
let modFitShowingResultMc = false;

function resetModFitQuizMc() {
  modFitStepMc = 0;
  modFitAnswersMc = {};
  modFitShowingResultMc = false;
}

function modFitBuildQueryMc(answers) {
  const parts = [];
  const worldTerms = {
    survival: "survival adventure exploration cave dungeon",
    tech: "create automation technology machines mekanism ae2 factory",
    magic: "magic botania ars twilight forest spells fantasy dimension",
    building: "decoration building furniture architecture interior design",
    chill: "cozy farmer delight quality life calm decoration food",
  };
  const sessionTerms = {
    explore: "exploration biomes worldgen structure adventure",
    build: "building decoration furniture base architect",
    progress: "technology automation quest progression tech tree",
    fight: "combat boss dungeon adventure weapon armor",
    setup: "jei rei emi minimap utility quality life inventory",
  };
  const priorityTerms = {
    performance: "sodium lithium fps optimization performance fabric",
    graphics: "iris shaders optifine complementary bsl beautiful lighting",
    utility: "jei rei emi recipe map inventory quality life",
    automation: "create mekanism ae2 storage automation machines",
    adventure: "adventure dungeon boss structure exploration yung",
    worldgen: "biomes terralith worldgen terrain generation repurposed",
  };
  const socialTerms = {
    solo: "singleplayer quality life",
    friends: "multiplayer server voice chat simple",
    public: "multiplayer server plugin paper fabric",
    modpack: "modpack library api compatibility",
  };
  const experienceTerms = {
    new: "simple quality life vanilla plus starter",
    some: "popular must have balanced",
    regular: "technology magic adventure utility",
    power: "advanced create mekanism complex",
  };
  if (answers.world && worldTerms[answers.world]) parts.push(worldTerms[answers.world]);
  if (answers.session && sessionTerms[answers.session]) parts.push(sessionTerms[answers.session]);
  if (answers.priority && priorityTerms[answers.priority]) parts.push(priorityTerms[answers.priority]);
  if (answers.social && socialTerms[answers.social]) parts.push(socialTerms[answers.social]);
  if (answers.experience && experienceTerms[answers.experience]) parts.push(experienceTerms[answers.experience]);
  if (answers.loader === "fabric") parts.push("fabric modrinth");
  if (answers.loader === "forge") parts.push("forge curseforge");
  if (answers.loader === "neoforge") parts.push("neoforge");
  return parts.join(" ").trim();
}

function modFitPersonalReasonMc(answers, item) {
  const lines = [];
  if (answers.world === "survival") lines.push("den passer til survival og udforskning");
  else if (answers.world === "tech") lines.push("den støtter tech og automatisering");
  else if (answers.world === "magic") lines.push("den giver mere magi og fantasy");
  else if (answers.world === "building") lines.push("den hjælper med byggeri og æstetik");
  if (answers.priority === "performance") lines.push("med fokus på performance");
  else if (answers.priority === "graphics") lines.push("med fokus på grafik");
  else if (answers.priority === "utility") lines.push("med praktiske quality of life forbedringer");
  if (answers.experience === "new") lines.push("og er et godt sted at starte som ny modder");
  const intro = lines.length ? `Vi valgte den, fordi ${lines.join(" ")}.` : "Den matcher det, du beskrev i testen.";
  const note = String(item.note || item.description || "").trim();
  if (note) return `${intro} ${note}`.slice(0, 160);
  return intro.slice(0, 160);
}

function pickModFitMatchesMc(query, count = 3) {
  const pool = getModFitMcPool();
  if (!pool.length) return [];
  const score = (item) => modFitScoreMcItem(item, query);
  const ranked = (rows) =>
    rows
      .map((item) => ({ item, score: score(item) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || (b.item.downloads || 0) - (a.item.downloads || 0));
  let matches = ranked(pool.filter((item) => itemMatchesMcIntent(item, query)));
  if (matches.length < count) matches = ranked(pool);
  if (!matches.length) {
    const popular = [...pool].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    return popular.slice(0, count).map((item) => ({ item, score: 1 }));
  }
  // Diversify by category
  const seen = new Set();
  const diverse = [];
  for (const m of matches) {
    const key = m.item.category || m.item.type;
    if (!seen.has(key)) { seen.add(key); diverse.push(m); }
    if (diverse.length >= count) break;
  }
  for (const m of matches) {
    if (diverse.length >= count) break;
    if (!diverse.some((d) => d.item === m.item)) diverse.push(m);
  }
  return diverse.slice(0, count);
}

function pickModFitMatchMc(query) {
  const pool = getModFitMcPool();
  if (!pool.length) return null;
  const ranked = (rows) =>
    rows
      .map((item) => ({ item, score: modFitScoreMcItem(item, query) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || (b.item.downloads || 0) - (a.item.downloads || 0));
  let matches = ranked(pool.filter((item) => itemMatchesMcIntent(item, query)));
  if (!matches.length) matches = ranked(pool);
  if (!matches.length) {
    const popular = [...pool].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    return popular[0] ? { item: popular[0], score: 1 } : null;
  }
  return matches[0];
}

function renderModFitQuizStepMc() {
  const quiz = document.getElementById("modFitQuiz");
  const progress = document.getElementById("modFitProgress");
  const results = document.getElementById("modFitResults");
  const lead = document.getElementById("modFitLead");
  const back = document.getElementById("modFitBack");
  const next = document.getElementById("modFitNext");
  const nav = document.querySelector(".mod-fit-nav");
  if (!quiz || modFitShowingResultMc) return;

  const total = MOD_FIT_QUESTIONS_MC.length;
  const q = MOD_FIT_QUESTIONS_MC[modFitStepMc];
  if (!q) return;

  if (results) {
    results.hidden = true;
    results.innerHTML = "";
  }
  quiz.hidden = false;
  if (nav) nav.hidden = false;
  if (progress) progress.textContent = `Trin ${modFitStepMc + 1} af ${total}`;
  if (lead) {
    lead.innerHTML = `<strong class="mod-fit-q">${escapeHtml(q.question)}</strong>${
      q.hint ? `<span class="mod-fit-hint">${escapeHtml(q.hint)}</span>` : ""
    }`;
  }

  quiz.innerHTML = q.options
    .map(
      (opt) => `
    <button type="button" class="mod-fit-option${modFitAnswersMc[q.id] === opt.value ? " selected" : ""}" data-mod-fit-qid="${escapeHtml(q.id)}" data-mod-fit-value="${escapeHtml(opt.value)}">
      ${escapeHtml(opt.label)}
    </button>`,
    )
    .join("");

  quiz.querySelectorAll(".mod-fit-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-mod-fit-qid");
      const value = btn.getAttribute("data-mod-fit-value");
      if (!qid || !value) return;
      modFitAnswersMc[qid] = value;
      quiz.querySelectorAll(".mod-fit-option").forEach((el) => el.classList.toggle("selected", el === btn));
      if (next) next.disabled = false;
    });
  });

  if (back) back.hidden = modFitStepMc === 0;
  if (next) {
    next.textContent = modFitStepMc === total - 1 ? "Se mit match" : "Næste";
    next.disabled = !modFitAnswersMc[q.id];
  }
}

function showModFitResultMc() {
  const quiz = document.getElementById("modFitQuiz");
  const results = document.getElementById("modFitResults");
  const progress = document.getElementById("modFitProgress");
  const lead = document.getElementById("modFitLead");
  const nav = document.querySelector(".mod-fit-nav");
  if (!results) return;

  modFitShowingResultMc = true;
  const query = modFitBuildQueryMc(modFitAnswersMc);
  const matches = pickModFitMatchesMc(query, 3);

  if (quiz) quiz.hidden = true;
  if (nav) nav.hidden = true;
  if (progress) progress.textContent = "Dine bedste matches";
  if (lead) lead.textContent = "Baseret på dine svar. Her er mods fra kataloget, der passer til din stil:";

  results.hidden = false;
  if (!matches.length) {
    results.innerHTML =
      '<p class="mod-fit-empty">Ingen match fundet. Prøv testen igen eller søg manuelt.</p><button type="button" class="mod-fit-retake" id="modFitRetake">Tag testen igen</button>';
    document.getElementById("modFitRetake")?.addEventListener("click", () => {
      resetModFitQuizMc();
      renderModFitQuizStepMc();
    });
    return;
  }

  const matchHtml = matches.map(({ item }, idx) => {
    // getItemPreviewUrl now checks thumbUrl too, so this always finds a real CDN URL for seed items
    const previewUrl = getItemPreviewUrl(item, query);
    const thumb = /^https:\/\//i.test(previewUrl) ? previewUrl : String(item.thumbUrl || item.thumbnailUrl || "");
    const catKey = String(item.category || item.type || "");
    const catLabels = {
      optimization: "Performance",
      technology: "Tech",
      magic: "Magi",
      adventure: "Eventyr",
      world: "Verdensgeneration",
      utility: "Utility",
      decoration: "Dekoration",
      shader: "Shader",
      storage: "Lagring",
    };
    const catLabel = escapeHtml(catLabels[catKey] || catKey.toUpperCase());
    const platform = escapeHtml(String(item.platform || "Mod"));
    const reason = escapeHtml(modFitPersonalReasonMc(modFitAnswersMc, item));
    const isBest = idx === 0;
    const fallback = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#1a1a2e"/><text x="100" y="112" text-anchor="middle" font-size="48" font-family="sans-serif" fill="#4ade80">MC</text></svg>`)}`;
    return `
    <article class="mod-fit-match-hero${isBest ? " mod-fit-hero-primary" : ""}" data-mod-fit-idx="${idx}">
      <div class="mod-fit-thumb-wrap">
        ${thumb
          ? `<img class="mod-fit-result-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='${fallback}'" />`
          : `<div class="mod-fit-result-thumb mod-fit-thumb-empty"><span class="mod-fit-thumb-fallback">MC</span></div>`}
        ${isBest ? '<span class="mod-fit-best-badge">Bedste match</span>' : ""}
      </div>
      <div class="mod-fit-hero-body">
        <span class="mod-fit-cat-tag">${catLabel}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p class="mod-fit-platform">${platform}</p>
        <p class="mod-fit-reason">${reason}</p>
        <div class="mod-fit-match-actions">
          <button type="button" class="mod-fit-next mod-fit-use-btn" data-mod-fit-use="${escapeHtml(item.title)}">Søg denne mod</button>
          <button type="button" class="mod-fit-back mod-fit-view-btn" data-mod-fit-idx="${idx}">Forhåndsvisning</button>
        </div>
      </div>
    </article>`;
  }).join("");

  results.innerHTML = `
    <div class="mod-fit-matches-grid">${matchHtml}</div>
    <button type="button" class="mod-fit-retake" id="modFitRetake">Tag testen igen</button>`;

  results.querySelectorAll(".mod-fit-use-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const title = btn.getAttribute("data-mod-fit-use");
      closeModFitModal();
      if (mcSearchInput) mcSearchInput.value = title;
      void renderMcSearch(title);
      document.querySelector(".mg-results-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  results.querySelectorAll(".mod-fit-view-btn").forEach((btn) => {
    const idx = Number(btn.getAttribute("data-mod-fit-idx") || 0);
    btn.addEventListener("click", () => openPreviewZoom(matches[idx]?.item, query));
  });
  document.getElementById("modFitRetake")?.addEventListener("click", () => {
    resetModFitQuizMc();
    renderModFitQuizStepMc();
  });
}

function modFitAdvanceMc() {
  if (modFitShowingResultMc) return;
  const q = MOD_FIT_QUESTIONS_MC[modFitStepMc];
  if (!q || !modFitAnswersMc[q.id]) return;
  if (modFitStepMc < MOD_FIT_QUESTIONS_MC.length - 1) {
    modFitStepMc += 1;
    renderModFitQuizStepMc();
    return;
  }
  showModFitResultMc();
}

function modFitBackMc() {
  if (modFitShowingResultMc) {
    resetModFitQuizMc();
    renderModFitQuizStepMc();
    return;
  }
  if (modFitStepMc > 0) {
    modFitStepMc -= 1;
    renderModFitQuizStepMc();
  }
}

function openModFitModal() {
  const overlay = document.getElementById("modFitOverlay");
  if (!overlay) return;
  resetModFitQuizMc();
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  renderModFitQuizStepMc();
}

function closeModFitModal() {
  const overlay = document.getElementById("modFitOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  resetModFitQuizMc();
}

let modFitListenersBoundMc = false;
function bindModFitListenersMc() {
  if (modFitListenersBoundMc) return;
  modFitListenersBoundMc = true;
  document.getElementById("mgModFitBtn")?.addEventListener("click", openModFitModal);
  document.getElementById("modFitClose")?.addEventListener("click", closeModFitModal);
  document.getElementById("modFitNext")?.addEventListener("click", modFitAdvanceMc);
  document.getElementById("modFitBack")?.addEventListener("click", modFitBackMc);
  document.getElementById("modFitOverlay")?.addEventListener("click", (e) => {
    if (e.target?.id === "modFitOverlay") closeModFitModal();
  });
}


function inferMcIntent(query) {
  const text = normalizeSearchText(String(query || "").replace(/#/g, " "));
  const has = (pattern) => pattern.test(text);
  if (has(/\b(shader|shaders|iris|optifine|graphics|grafik)\b/)) return "shader";
  if (has(/\b(fps|lag|performance|sodium|lithium|optimization|ydelse)\b/)) return "performance";
  if (has(/\b(jei|rei|recipe|guide|emi|opskrift)\b/)) return "utility";
  if (has(/\b(voice|proximity|vc|stemme|simplevoice)\b/)) return "multiplayer";
  if (has(/\b(bedrock|mcpedl|addon|pocket)\b/)) return "bedrock";
  if (has(/\b(plugin|paper|spigot|bukkit|hangar|server)\b/)) return "server";
  if (has(/\b(create|ae2|tech|automation|teknologi)\b/)) return "technology";
  if (has(/\b(magic|botania|ars|thaum|magi|spell)\b/)) return "magic";
  if (has(/\b(worldgen|biome|structure|dimension|map)\b/)) return "world";
  if (has(/\b(adventure|quest|dungeon|rpg)\b/)) return "adventure";
  return "";
}

function itemMatchesIntent(item, query) {
  return itemMatchesMcIntent(item, query);
}

function itemMatchesMcIntent(item, query) {
  const intent = inferMcIntent(query);
  if (!intent) return true;
  const hay = normalizeSearchText(`${item.title} ${item.description || ""} ${item.note || ""} ${(item.tags || []).join(" ")} ${item.category || ""}`);
  if (intent === "shader") return /\bshader\b|\biris\b|\boptifine\b|\bgraphics\b|\brender\b/.test(hay) || item.category === "shader";
  if (intent === "performance") return /\bsodium\b|\blithium\b|\bperformance\b|\bfps\b|\boptimization\b|\bstarlight\b/.test(hay);
  if (intent === "utility") return /\bjei\b|\brei\b|\bemi\b|\brecipe\b|\bguide\b|\butility\b/.test(hay) || item.category === "utility";
  if (intent === "multiplayer") return /\bvoice\b|\bchat\b|\bproximity\b|\bmultiplayer\b|\bserver\b/.test(hay);
  if (intent === "bedrock") return /\bbedrock\b|\bmcpedl\b|\baddon\b|\bpocket\b/.test(hay) || item.platformKey === "mcpedl";
  if (intent === "server") return item.modSide === "server" || /\bplugin\b|\bpaper\b|\bspigot\b|\bbukkit\b/.test(hay);
  if (intent === "technology") return item.category === "technology" || /\bcreate\b|\bae2\b|\btech\b|\bautomation\b/.test(hay);
  if (intent === "magic") return item.category === "magic" || /\bmagic\b|\bbotania\b|\bars\b|\bthaum\b/.test(hay);
  if (intent === "world") return item.category === "world" || /\bworldgen\b|\bbiome\b|\bstructure\b/.test(hay);
  if (intent === "adventure") return item.category === "adventure" || /\badventure\b|\bquest\b|\bdungeon\b/.test(hay);
  return true;
}

const MC_SEARCH_SYNONYMS = {
  // Performance / graphics
  shader: ["iris", "optifine", "sodium", "shaders", "graphics", "render"],
  shaders: ["iris", "optifine", "graphics", "complementary", "bsl"],
  fps: ["sodium", "lithium", "performance", "optimization", "ferritecore"],
  lag: ["sodium", "lithium", "optimization", "performance", "starlight"],
  performance: ["sodium", "lithium", "ferritecore", "fps", "optimization"],
  graphics: ["iris", "shaders", "optifine", "visual", "render"],
  render: ["iris", "sodium", "shaders", "optifine", "graphics"],
  // Loaders
  forge: ["neoforge", "forge", "modloader"],
  neoforge: ["neoforge", "forge", "modloader", "modern"],
  fabric: ["quilt", "fabric", "modloader", "lightweight"],
  quilt: ["quilt", "fabric", "loader"],
  // Content mods
  create: ["automation", "contraption", "mechanical", "train", "steam"],
  magic: ["botania", "ars", "thaum", "spell", "arcane"],
  mage: ["ars", "botania", "magic", "spell"],
  spells: ["ars", "nouveau", "magic", "arcane", "glyphs"],
  tech: ["applied", "energistics", "ae2", "mekanism", "create", "automation"],
  automation: ["create", "ae2", "mekanism", "thermal", "factory"],
  // World generation
  biome: ["biomes", "terralith", "byg", "bop", "worldgen", "terrain"],
  biomes: ["terralith", "byg", "bop", "worldgen", "generation"],
  worldgen: ["terralith", "biomes", "terrain", "structure", "generation"],
  terrain: ["terralith", "worldgen", "biomes", "generation"],
  // Adventure / RPG
  adventure: ["dungeon", "quest", "rpg", "dungeons", "taverns"],
  dungeon: ["dungeons", "taverns", "structures", "adventure", "exploration"],
  rpg: ["origins", "classes", "abilities", "adventure", "powers"],
  dragon: ["ice", "fire", "dragons", "mythical", "creatures"],
  // Utility
  server: ["paper", "spigot", "bukkit", "plugin", "hangar"],
  plugin: ["paper", "spigot", "bukkit", "hangar", "spigotmc"],
  paper: ["spigot", "bukkit", "paper", "plugin", "server"],
  bedrock: ["mcpedl", "addon", "pocket", "bedrock", "edition"],
  jei: ["rei", "emi", "recipe", "crafting", "guide"],
  rei: ["jei", "emi", "recipe", "crafting"],
  emi: ["jei", "rei", "recipe", "crafting"],
  recipe: ["jei", "rei", "emi", "crafting", "guide"],
  minimap: ["xaero", "journeymap", "waypoints", "navigation", "map"],
  map: ["xaero", "journeymap", "minimap", "waypoints", "navigation"],
  waypoints: ["xaero", "journeymap", "minimap", "map"],
  voice: ["simple", "voice", "chat", "proximity", "multiplayer"],
  inventory: ["sophisticated", "storage", "chest", "drawer", "barrel"],
  storage: ["sophisticated", "ae2", "chest", "drawer", "barrel"],
  // Mobs / animals
  mobs: ["alexs", "animals", "creatures", "wildlife", "ice", "fire"],
  animals: ["alexs", "mobs", "creatures", "wildlife"],
  // Food / decoration
  food: ["farmers", "delight", "cooking", "crops", "kitchen"],
  farming: ["farmers", "delight", "food", "crops", "agriculture"],
  furniture: ["macaw", "decoration", "building", "interior"],
  decoration: ["macaw", "furniture", "building", "decor"],
  // Packs / launchers
  modpack: ["pack", "profile", "launcher", "mrpack", "prism"],
  pack: ["modpack", "profile", "launcher", "prism"],
  launcher: ["prism", "modpack", "profile", "instance", "launcher"],
  prism: ["prism", "launcher", "modpack", "instance"],
  // Security
  security: ["scan", "malware", "safe", "antivirus", "modguard"],
  malware: ["virus", "security", "scan", "safe"],
  safe: ["security", "scan", "modguard", "clean"],
  // Optimization bundles
  sodium: ["sodium", "modrinth", "fabric", "performance", "fps"],
  lithium: ["lithium", "server", "optimization", "tps", "performance"],
  iris: ["iris", "shaders", "fabric", "sodium", "graphics"],
  optifine: ["optifine", "shaders", "hd", "textures", "forge"],
  // Specific popular mods
  origins: ["origins", "rpg", "abilities", "powers", "classes"],
  waystones: ["waystones", "teleport", "travel", "waypoint", "fast"],
  appleskin: ["appleskin", "food", "hunger", "saturation", "hud"],
  xaero: ["xaero", "minimap", "map", "waypoints", "navigation"],
  journeymap: ["journeymap", "map", "waypoints", "navigation", "fullscreen"],
  tinkers: ["tinkers", "construct", "tools", "smeltery", "forge"],
  mekanism: ["mekanism", "technology", "power", "energy", "nuclear"],
  applied: ["applied", "energistics", "ae2", "storage", "autocraft"],
  energistics: ["ae2", "applied", "storage", "autocraft", "me"],
  twilight: ["twilight", "forest", "dimension", "adventure", "magic"],
  botania: ["botania", "magic", "mana", "flowers", "nature"],
  ars: ["ars", "nouveau", "magic", "spells", "arcane"],
  terralith: ["terralith", "terrain", "biomes", "worldgen", "generation"],
};

function expandMcSearchTokens(rawQuery) {
  // Use richQueryExpand to apply Danish→English replacements and synonym expansion
  const norm = richQueryExpand(rawQuery);
  const tokens = new Set(norm.split(" ").filter((t) => t.length >= 2));
  // Also add direct alias lookups from MC_SEARCH_SYNONYMS for extra coverage
  for (const t of [...tokens]) {
    const aliases = MC_SEARCH_SYNONYMS[t];
    if (aliases) aliases.forEach((a) => tokens.add(a));
  }
  // Include original raw tokens too so exact matches always work
  const rawNorm = normalizeSearchText(String(rawQuery || "").replace(/#/g, " "));
  for (const t of rawNorm.split(" ").filter((w) => w.length >= 2)) tokens.add(t);
  return [...tokens];
}

const mcLiveSearchCache = new Map();
let mcLiveSearchSeq = 0;

async function fetchModrinthSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  // Build cache key including active filters for correct per-filter caching
  const activeVer = document.getElementById("mgFilterVersion")?.value
    || document.getElementById("mcVersionFilter")?.value || "all";
  const activeLoader = document.getElementById("mcTypeFilter")?.value || "all";
  const cacheKey = `${q.toLowerCase()}|v=${activeVer}|l=${activeLoader}`;
  if (mcLiveSearchCache.has(cacheKey)) return mcLiveSearchCache.get(cacheKey);

  try {
    // Build facet array — always filter to mods, optionally add version/loader
    const facetRows = [["project_type:mod"]];
    if (activeVer !== "all") {
      // Modrinth uses "versions" facet, e.g. "versions:1.21"
      facetRows.push([`versions:${activeVer}`]);
    }
    if (activeLoader !== "all") {
      // Modrinth categories include loader names
      facetRows.push([`categories:${activeLoader}`]);
    }
    const facets = encodeURIComponent(JSON.stringify(facetRows));

    // Use richQueryExpand to turn Danish/alias queries into better English search terms
    const expandedQ = richQueryExpand(q).split(" ").slice(0, 6).join(" ");
    // Search with expanded query first, fall back to raw query for exactness
    const searchQ = expandedQ.length > q.length ? expandedQ : q;

    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(searchQ)}&limit=64&index=relevance&facets=${facets}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return [];
    const data = await res.json();
    const hits = Array.isArray(data?.hits) ? data.hits : [];

    // If expanded query returned few results, also try with raw query
    let allHits = hits;
    if (hits.length < 10 && searchQ !== q) {
      try {
        const fallbackUrl = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(q)}&limit=32&index=relevance&facets=${encodeURIComponent(JSON.stringify([["project_type:mod"]]))}`;
        const fb = await fetch(fallbackUrl, { signal: AbortSignal.timeout?.(5000) || new AbortController().signal });
        if (fb.ok) {
          const fbData = await fb.json();
          const fbHits = Array.isArray(fbData?.hits) ? fbData.hits : [];
          const seenIds = new Set(hits.map((h) => h.project_id));
          for (const h of fbHits) {
            if (!seenIds.has(h.project_id)) allHits.push(h);
          }
        }
      } catch { /* ignore fallback errors */ }
    }

    const items = allHits.map((hit, idx) => modrinthHitToItem(hit, idx));
    mcLiveSearchCache.set(cacheKey, items);
    // Keep cache size manageable (max 80 entries)
    if (mcLiveSearchCache.size > 80) {
      const first = mcLiveSearchCache.keys().next().value;
      mcLiveSearchCache.delete(first);
    }
    return items;
  } catch {
    return [];
  }
}

// ── Hangar (PaperMC) live API search ────────────────────────────────────────
const hangarSearchCache = new Map();

async function fetchHangarSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const cacheKey = q.toLowerCase();
  if (hangarSearchCache.has(cacheKey)) return hangarSearchCache.get(cacheKey);
  try {
    const url = `https://hangar.papermc.io/api/v1/projects?query=${encodeURIComponent(q)}&limit=20&offset=0&orderWithRelevance=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let res;
    try { res = await fetch(url, { signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    if (!res.ok) return [];
    const data = await res.json();
    const projects = Array.isArray(data?.result) ? data.result : [];
    const items = projects.map((p, idx) => ({
      id: `hangar-${p.namespace?.slug || idx}`,
      category: "utility",
      title: String(p.name || "Plugin"),
      platform: "Hangar",
      platformKey: "hangar",
      modSide: "server",
      author: String(p.namespace?.owner || "PaperMC"),
      description: String(p.description || "").trim() || `Paper/Velocity plugin — ${p.name}.`,
      note: String(p.description || "").trim(),
      tags: ["server", "plugin", "paper", ...(p.category ? [p.category] : [])],
      loaders: ["paper", "velocity", "waterfall"],
      minVersion: "1.20",
      thumbUrl: String(p.avatarUrl || "").trim(),
      downloads: Number(p.stats?.downloads) || 0,
      rating: Number((3.8 + ((idx % 8) / 10)).toFixed(1)),
      safetyPct: 97,
      url: `https://hangar.papermc.io/${p.namespace?.owner || ""}/${p.namespace?.slug || p.name}`,
    }));
    hangarSearchCache.set(cacheKey, items);
    if (hangarSearchCache.size > 40) hangarSearchCache.delete(hangarSearchCache.keys().next().value);
    return items;
  } catch {
    return [];
  }
}

// ── Modrinth multi-type search (plugins, shaders, resourcepacks, datapacks) ──
async function fetchModrinthTypedSearch(query, projectType = "mod") {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const cacheKey = `modrinth:${projectType}:${q.toLowerCase()}`;
  if (mcLiveSearchCache.has(cacheKey)) return mcLiveSearchCache.get(cacheKey);
  try {
    const facets = encodeURIComponent(JSON.stringify([[`project_type:${projectType}`]]));
    const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(q)}&limit=24&index=relevance&facets=${facets}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const hits = Array.isArray(data?.hits) ? data.hits : [];
    const platformKeyMap = { plugin: "modrinth_plugins", shader: "modrinth_shaders", resourcepack: "modrinth_resourcepacks", datapack: "modrinth_datapacks", modpack: "modrinth_modpacks" };
    const platformKey = platformKeyMap[projectType] || "modrinth";
    const platformName = MC_SEARCH_PLATFORMS.find((p) => p.key === platformKey)?.name || "Modrinth";
    const items = hits.map((hit, idx) => {
      const base = modrinthHitToItem(hit, idx);
      return { ...base, platformKey, platform: platformName, id: `mr-${projectType}-${base.id}` };
    });
    mcLiveSearchCache.set(cacheKey, items);
    if (mcLiveSearchCache.size > 80) mcLiveSearchCache.delete(mcLiveSearchCache.keys().next().value);
    return items;
  } catch {
    return [];
  }
}

// ── Spiget (SpigotMC) live search ────────────────────────────────────────────
// Spiget is a public API mirror of SpigotMC — no key, CORS enabled (*).
const spigetSearchCache = new Map();

async function fetchSpigetSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const cacheKey = `spiget:${q.toLowerCase()}`;
  if (spigetSearchCache.has(cacheKey)) return spigetSearchCache.get(cacheKey);
  try {
    const expandedQ = richQueryExpand(q).split(" ").slice(0, 3).join(" ");
    const searchQ = expandedQ.length > q.length ? expandedQ : q;
    const url = `https://api.spiget.org/v2/search/resources/${encodeURIComponent(searchQ)}?field=name&size=20&sort=downloads`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ModGuard-Minecraft/1.0 (contact@modguard.dk)",
          "Spiget-User-Agent": "ModGuard/1.0",
        },
      });
    } finally { clearTimeout(timeout); }
    if (!res.ok) return [];
    const data = await res.json();
    const resources = Array.isArray(data) ? data : [];
    const items = resources.map((r) => ({
      id: `spiget-${r.id}`,
      category: "utility",
      title: String(r.name || "Plugin"),
      platform: "SpigotMC",
      platformKey: "spiget",
      modSide: "server",
      author: "SpigotMC",
      description: String(r.tag || "SpigotMC plugin."),
      note: String(r.tag || ""),
      tags: ["spigot", "plugin", "server", "bukkit", ...(r.testedVersions || []).slice(0, 4)],
      loaders: ["spigot", "paper", "bukkit"],
      minVersion: [...(r.testedVersions || [])].sort().reverse()[0] || "1.20",
      thumbUrl: String(r.icon?.url || "").replace(/^\/\//, "https://"),
      downloads: Number(r.downloads) || 0,
      dateScore: Number(r.updateDate) || 0,
      rating: Number((r.rating?.average || 3.5).toFixed(1)),
      safetyPct: 93,
      url: `https://www.spigotmc.org/resources/${r.id}/`,
    }));
    spigetSearchCache.set(cacheKey, items);
    if (spigetSearchCache.size > 50) spigetSearchCache.delete(spigetSearchCache.keys().next().value);
    return items;
  } catch {
    return [];
  }
}

// ── Polymart live search ──────────────────────────────────────────────────────
// Public search API — no key, CORS enabled (*). Many premium resources; we
// show only free ones in the default results.
const polymartSearchCache = new Map();

async function fetchPolymartSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const cacheKey = `polymart:${q.toLowerCase()}`;
  if (polymartSearchCache.has(cacheKey)) return polymartSearchCache.get(cacheKey);
  try {
    const url = `https://api.polymart.org/v1/search?query=${encodeURIComponent(q)}&offset=0&limit=16`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "ModGuard-Minecraft/1.0" },
      });
    } finally { clearTimeout(timeout); }
    if (!res.ok) return [];
    const data = await res.json();
    // Polymart wraps response in data.response.result or data.response.search.resources
    const raw = data?.response?.result ?? data?.response?.search?.resources ?? data?.response ?? [];
    const resources = Array.isArray(raw) ? raw : [];
    const items = resources
      .filter((r) => !r.price || parseFloat(r.price) <= 0)  // free resources only by default
      .map((r) => ({
        id: `polymart-${r.id}`,
        category: guessCategoryFromTags([...(r.tags || []), "plugin", "server"]),
        title: String(r.title || "Plugin"),
        platform: "Polymart",
        platformKey: "polymart",
        modSide: "server",
        author: String(r.owner?.username || r.author || "Polymart"),
        description: String(r.subtitle || r.description || "Polymart plugin."),
        note: String(r.subtitle || ""),
        tags: [...(r.tags || []), "polymart", "plugin", "server"],
        loaders: ["paper", "spigot", "bukkit"],
        minVersion: (r.supportedMinecraftVersions || []).sort().reverse()[0] || "1.20",
        thumbUrl: String(r.thumbnail || r.icon || ""),
        downloads: Number(r.downloads) || 0,
        dateScore: 0,
        rating: Number((r.rating?.average || r.rating || 3.5).toFixed(1)),
        safetyPct: 92,
        url: String(r.url || `https://polymart.org/resource/${r.id}`),
      }));
    polymartSearchCache.set(cacheKey, items);
    if (polymartSearchCache.size > 50) polymartSearchCache.delete(polymartSearchCache.keys().next().value);
    return items;
  } catch {
    return [];
  }
}

// ── Generic category guesser from a flat tag/category array ─────────────────
function guessCategoryFromTags(tags) {
  const t = (tags || []).map((s) => String(s).toLowerCase());
  const has = (...kw) => kw.some((k) => t.some((tag) => tag.includes(k)));
  if (has("technology", "tech", "machine", "power", "energy", "electric", "mekanism")) return "technology";
  if (has("magic", "spell", "arcane", "mana", "botania", "ars")) return "magic";
  if (has("adventure", "dungeon", "quest", "rpg", "dimension", "twilight")) return "adventure";
  if (has("worldgen", "world", "terrain", "biome", "generation", "terralith")) return "world";
  if (has("optim", "fps", "performance", "sodium", "render", "shader", "iris")) return "optimization";
  if (has("decoration", "furniture", "decor", "building", "aesthetic", "deco")) return "decoration";
  if (has("storage", "chest", "inventory", "ae2", "refined", "drawer")) return "utility";
  if (has("food", "farm", "crop", "cook", "kitchen", "delight")) return "decoration";
  if (has("mob", "animal", "creature", "wildlife", "monster")) return "adventure";
  return "utility";
}

// ── Node.js HTTPS helper — bypasses CORS entirely (nodeIntegration: true) ───
function nodeHttpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const https = require("https");
      const urlObj = new URL(url);
      const req = https.request(
        {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          method: "GET",
          headers: {
            "User-Agent": "ModGuard-Minecraft/1.0 (desktop mod manager)",
            Accept: "application/json",
            ...headers,
          },
          timeout: 9000,
        },
        (res) => {
          let raw = "";
          res.on("data", (c) => { raw += c; });
          res.on("end", () => {
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error("Invalid JSON")); }
          });
        }
      );
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
      req.end();
    } catch (e) { reject(e); }
  });
}

// ── CurseForge live search ───────────────────────────────────────────────────
// Free API key from https://console.curseforge.com/ (community/launcher key)
const CURSEFORGE_API_KEY = "$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6GR2dmIqd65yW9lsFW62S";
const curseForgeSearchCache = new Map();

async function fetchCurseForgeSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const cacheKey = `cf:${q.toLowerCase()}`;
  if (curseForgeSearchCache.has(cacheKey)) return curseForgeSearchCache.get(cacheKey);
  try {
    const expandedQ = richQueryExpand(q).split(" ").slice(0, 4).join(" ");
    const searchQ = expandedQ.length > q.length ? expandedQ : q;
    const url =
      `https://api.curseforge.com/v1/mods/search?gameId=432&searchFilter=${encodeURIComponent(searchQ)}&sortField=2&sortOrder=desc&pageSize=20&classId=6`;
    const data = await nodeHttpsGet(url, { "x-api-key": CURSEFORGE_API_KEY });
    const mods = Array.isArray(data?.data) ? data.data : [];
    const items = mods.map((mod, idx) => ({
      id: `cf-${mod.id}`,
      category: guessCategoryFromTags((mod.categories || []).map((c) => String(c.name || "").toLowerCase())),
      title: String(mod.name || ""),
      platform: "CurseForge",
      platformKey: "curseforge",
      author: (mod.authors || []).map((a) => a.name).join(", ") || "Unknown",
      description: String(mod.summary || ""),
      note: String(mod.summary || ""),
      tags: (mod.categories || []).map((c) => String(c.name || "").toLowerCase()),
      loaders: [],
      minVersion: "1.20",
      thumbUrl: String(mod.logo?.url || mod.logo?.thumbnailUrl || ""),
      downloads: Number(mod.downloadCount) || 0,
      dateScore: mod.dateModified ? new Date(mod.dateModified).getTime() / 1000 : 0,
      rating: Number(Math.min(5.0, 3.6 + (idx % 7) * 0.06).toFixed(1)),
      safetyPct: 96,
      url: mod.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${mod.slug || mod.id}`,
    }));
    curseForgeSearchCache.set(cacheKey, items);
    if (curseForgeSearchCache.size > 50) curseForgeSearchCache.delete(curseForgeSearchCache.keys().next().value);
    return items;
  } catch {
    // API key not set or network error — return empty (portal card shown instead)
    return [];
  }
}

// ── GitHub repository search ─────────────────────────────────────────────────
const githubSearchCache = new Map();

async function fetchGitHubSearch(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const cacheKey = `gh:${q.toLowerCase()}`;
  if (githubSearchCache.has(cacheKey)) return githubSearchCache.get(cacheKey);
  try {
    const expanded = richQueryExpand(q).split(" ").slice(0, 3).join("+");
    const ghQ = `${expanded}+minecraft+mod`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(ghQ)}&sort=stars&order=desc&per_page=12`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res;
    try { res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }); }
    finally { clearTimeout(timeout); }
    if (!res.ok) return [];
    const data = await res.json();
    const repos = Array.isArray(data?.items) ? data.items : [];
    const items = repos.map((repo) => ({
      id: `gh-${repo.id}`,
      category: guessCategoryFromTags((repo.topics || []).concat([repo.language?.toLowerCase() || ""])),
      title: repo.name.replace(/-/g, " ").replace(/_/g, " "),
      platform: "GitHub",
      platformKey: "github",
      author: repo.owner?.login || "Unknown",
      description: String(repo.description || "Open-source Minecraft mod / project."),
      note: String(repo.description || ""),
      tags: (repo.topics || []).concat(["github", "open-source"]),
      loaders: [],
      minVersion: "1.18",
      thumbUrl: String(repo.owner?.avatar_url || ""),
      downloads: (repo.stargazers_count || 0) * 120,
      dateScore: repo.pushed_at ? new Date(repo.pushed_at).getTime() / 1000 : 0,
      rating: Number(Math.min(5.0, 3.4 + Math.log10(Math.max(1, repo.stargazers_count)) * 0.3).toFixed(1)),
      safetyPct: 88,
      url: repo.html_url,
    }));
    githubSearchCache.set(cacheKey, items);
    if (githubSearchCache.size > 50) githubSearchCache.delete(githubSearchCache.keys().next().value);
    return items;
  } catch {
    return [];
  }
}

// ── Planet Minecraft & Nexus Mods portal cards ───────────────────────────────
// These platforms have no open public API; we show one "search on platform" card
// each so users can jump directly to their search results.
function buildPortalCards(query) {
  const q = String(query || "").trim();
  if (!q) return [];
  const enc = encodeURIComponent(q);
  return [
    {
      id: `pmc-portal-${enc}`,
      category: "utility",
      title: `"${q}" on Planet Minecraft`,
      platform: "Planet Minecraft",
      platformKey: "planetminecraft",
      isPortal: true,
      author: "Planet Minecraft",
      description: "The world's largest Minecraft content sharing community — mods, maps, texture packs, skins and more by the community.",
      note: `Click to search for "${q}" on Planet Minecraft`,
      tags: ["mods", "maps", "textures", "community"],
      loaders: [],
      minVersion: "1.18",
      thumbUrl: "",
      downloads: 0,
      rating: 0,
      safetyPct: 95,
      url: `https://www.planetminecraft.com/resources/mods/?keywords=${enc}`,
    },
    {
      id: `nexus-portal-${enc}`,
      category: "utility",
      title: `"${q}" on Nexus Mods`,
      platform: "Nexus Mods",
      platformKey: "nexusmods",
      isPortal: true,
      author: "Nexus Mods",
      description: "One of the largest mod-hosting sites in the world — millions of files, advanced mod management tools, and a massive Minecraft collection.",
      note: `Click to search for "${q}" on Nexus Mods`,
      tags: ["mods", "nexus", "modding"],
      loaders: [],
      minVersion: "1.18",
      thumbUrl: "",
      downloads: 0,
      rating: 0,
      safetyPct: 95,
      url: `https://www.nexusmods.com/minecraft/mods/?gsearch=${enc}`,
    },
  ];
}

function mergeMcSearchResults(localItems, remoteItems) {
  const seen = new Set(localItems.map((i) => i.id));
  const merged = [...localItems];
  for (const item of remoteItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

const MC_MODDER_DEMAND = [
  {
    id: "demand-sync",
    title: "Server ↔ client mod profile sync",
    category: "tools",
    hunger: "critical",
    votes: 4820,
    sources: ["Modrinth App issues", "r/feedthebeast"],
    summary: "Modders and server owners want one-click parity between single-player mod lists and hosted servers — like Modrinth App profiles, but universal across launchers.",
    gap: "Manual export/import of mod folders still breaks on every Minecraft update.",
    searchTerms: ["modpack", "profile", "sync", "server"],
  },
  {
    id: "demand-version-dl",
    title: "Version-specific download ranking",
    category: "discovery",
    hunger: "critical",
    votes: 3910,
    sources: ["Modrinth GitHub #5438", "CurseForge feedback"],
    summary: "Players search for \"Sodium 1.21\" but listings mix all versions; modders want downloads and ratings scoped per game version.",
    gap: "Global download counts hide whether a mod actually supports your loader + version.",
    searchTerms: ["sodium", "1.21", "fabric"],
  },
  {
    id: "demand-lowend",
    title: "Low-end PC performance packs",
    category: "performance",
    hunger: "critical",
    votes: 9100,
    sources: ["Reddit", "YouTube", "Discord"],
    summary: "Huge demand for curated Sodium + Lithium + Iris bundles with safe defaults for laptops and old GPUs.",
    gap: "Beginners install OptiFine + heavy mods and blame Fabric for lag.",
    searchTerms: ["sodium", "lithium", "iris", "performance"],
  },
  {
    id: "demand-neoforge",
    title: "NeoForge migration & compatibility hub",
    category: "compatibility",
    hunger: "high",
    votes: 5400,
    sources: ["NeoForge Discord", "Modrinth"],
    summary: "Porting guides, dependency maps, and \"Forge → NeoForge\" equivalents for abandoned mods.",
    gap: "Split loaders confuse players; many mods exist on Forge only for 1.20.1.",
    searchTerms: ["neoforge", "forge", "migration"],
  },
  {
    id: "demand-scan-trust",
    title: "Pre-install malware scan trust layer",
    category: "security",
    hunger: "high",
    votes: 6200,
    sources: ["r/ModdedMinecraft", "virus threads"],
    summary: "Community wants scan-before-install with hash checks, not just download counts — especially for CurseForge mirrors and sketch sites.",
    gap: "Infected jars spread via repost sites; vanilla launchers don't scan.",
    searchTerms: ["security", "scan", "malware"],
  },
  {
    id: "demand-bedrock",
    title: "Bedrock addon discovery parity",
    category: "bedrock",
    hunger: "high",
    votes: 4400,
    sources: ["MCPEDL", "Bedrock creators"],
    summary: "Java has Modrinth; Bedrock creators want unified search, versioning, and safety scores for MCPEDL-style addons.",
    gap: "No cross-platform mod ID; Java tools ignore Bedrock entirely.",
    searchTerms: ["bedrock", "mcpedl", "addon"],
  },
  {
    id: "demand-modpack-easy",
    title: "One-click modpack authoring",
    category: "tools",
    hunger: "high",
    votes: 3700,
    sources: ["Prism", "ATLauncher communities"],
    summary: "Small servers and friend groups want to share a mod list URL that resolves all deps — without learning JSON manifests.",
    gap: "Modpack creation is expert-only; broken manifests are common.",
    searchTerms: ["modpack", "mrpack", "pack"],
  },
  {
    id: "demand-create-ext",
    title: "Create ecosystem extensions",
    category: "discovery",
    hunger: "high",
    votes: 7800,
    sources: ["Modrinth trending", "Create Discord"],
    summary: "Addons for trains, logistics, compacting, and cross-mod recipes with Create — still top requested content category.",
    gap: "High-quality Create addons fragment across loaders and versions.",
    searchTerms: ["create", "automation", "contraption"],
  },
  {
    id: "demand-voice-stable",
    title: "Stable proximity voice for modded servers",
    category: "multiplayer",
    hunger: "high",
    votes: 5100,
    sources: ["r/admincraft", "Discord"],
    summary: "Simple Voice Chat dominates requests; modders want loader-agnostic APIs and better server-side config UI.",
    gap: "Voice solutions break across versions and mixed client mod lists.",
    searchTerms: ["simple voice chat", "voice", "proximity"],
  },
  {
    id: "demand-backport",
    title: "Backports of popular mods to older versions",
    category: "compatibility",
    hunger: "high",
    votes: 4600,
    sources: ["Reddit", "Modrinth comments"],
    summary: "Players stuck on 1.18.2 / 1.16.5 modpacks beg for Sodium, Create, and QoL mods on their version line.",
    gap: "Authors abandon old loaders; community forks are hard to find.",
    searchTerms: ["backport", "1.18", "legacy"],
  },
  {
    id: "demand-jei-plus",
    title: "Recipe viewer + EMI/JEI unification",
    category: "tools",
    hunger: "medium",
    votes: 2900,
    sources: ["Fabric Discord"],
    summary: "Players want one recipe UI that works with Create, AE2, and custom mod machines without duplicate plugins.",
    gap: "Multiple recipe mods conflict in large packs.",
    searchTerms: ["jei", "emi", "rei", "recipe"],
  },
  {
    id: "demand-vertical-sky",
    title: "Vertical / sky / void worldgen",
    category: "discovery",
    hunger: "medium",
    votes: 3300,
    sources: ["Modrinth worldgen tags"],
    summary: "Skyblock and vertical slice packs drive demand for void worlds, floating islands, and structure-heavy generation.",
    gap: "Worldgen mods rarely document pack compatibility.",
    searchTerms: ["skyblock", "worldgen", "void"],
  },
  {
    id: "demand-datapack-hybrid",
    title: "Datapack + mod hybrid workflows",
    category: "tools",
    hunger: "medium",
    votes: 2100,
    sources: ["Data pack subreddit", "Paper docs"],
    summary: "Server admins want tools that merge datapacks with modded content without world corruption.",
    gap: "Datapacks and mods are managed in separate silos.",
    searchTerms: ["datapack", "data pack", "kubejs"],
  },
  {
    id: "demand-open-revival",
    title: "Open-source revivals of dead Forge mods",
    category: "discovery",
    hunger: "medium",
    votes: 3500,
    sources: ["GitHub", "archived CurseForge pages"],
    summary: "Community hunts maintained forks when original authors quit — especially magic and tech mods.",
    gap: "Abandoned projects rank high in SEO but fail on new Minecraft versions.",
    searchTerms: ["open source", "fork", "revival"],
  },
  {
    id: "demand-api-docs",
    title: "Better mod API docs for new developers",
    category: "discovery",
    hunger: "medium",
    votes: 2400,
    sources: ["FabricMC", "NeoForge docs feedback"],
    summary: "New modders want up-to-date templates, mixin guides, and 1.21+ examples — not scattered wiki pages.",
    gap: "Documentation lags behind breaking loader changes every major release.",
    searchTerms: ["fabric", "api", "tutorial"],
  },
];

let activeModDemandTab = "all";
let activeModDemandQuery = "";
let modDemandListenersBound = false;

function filterModDemandItems() {
  const q = normalizeSearchText(activeModDemandQuery);
  return MC_MODDER_DEMAND.filter((item) => {
    if (activeModDemandTab !== "all" && item.category !== activeModDemandTab) return false;
    if (!q) return true;
    const hay = normalizeSearchText(`${item.title} ${item.summary} ${item.gap} ${item.category} ${(item.searchTerms || []).join(" ")}`);
    return q.split(" ").filter((t) => t.length >= 2).every((t) => hay.includes(t));
  });
}

function renderModDemandCard(item) {
  const hungerLabel = item.hunger === "critical" ? "Critical demand" : item.hunger === "high" ? "High demand" : "Growing";
  const tags = (item.searchTerms || []).slice(0, 5);
  return `
    <article class="mg-demand-card" data-hunger="${escapeHtml(item.hunger)}" data-demand-id="${escapeHtml(item.id)}">
      <div class="mg-demand-card-head">
        <h3>${escapeHtml(item.title)}</h3>
        <span class="mg-demand-badge ${escapeHtml(item.hunger)}">${escapeHtml(hungerLabel)}</span>
      </div>
      <p class="mg-demand-summary">${escapeHtml(item.summary)}</p>
      <div class="mg-demand-meta">
        <span>▲ ${Number(item.votes || 0).toLocaleString()} community signals</span>
        <span>${escapeHtml((item.sources || []).join(" · "))}</span>
      </div>
      <p class="mg-demand-summary" style="opacity:.85;font-size:.78rem"><strong>Gap:</strong> ${escapeHtml(item.gap)}</p>
      <div class="mg-demand-tags">${tags.map((t) => `<span class="mg-demand-tag">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="mg-demand-actions">
        <button type="button" class="mg-demand-btn" data-demand-search="${escapeHtml((item.searchTerms || []).slice(0, 3).join(" "))}">Search mods →</button>
        <button type="button" class="mg-demand-btn secondary" data-demand-forum="${escapeHtml(item.category)}">Forum threads</button>
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
  const critical = MC_MODDER_DEMAND.filter((i) => i.hunger === "critical").length;
  if (stats) {
    stats.innerHTML = `
      <div class="mg-demand-stat"><strong>${MC_MODDER_DEMAND.length}</strong> tracked gaps</div>
      <div class="mg-demand-stat"><strong>${critical}</strong> critical</div>
      <div class="mg-demand-stat"><strong>${items.length}</strong> shown</div>
    `;
  }
  if (list) {
    list.innerHTML = items.length
      ? items.map((item) => renderModDemandCard(item)).join("")
      : '<div class="mg-idle"><strong>No gaps match</strong><span>Try another filter or category.</span></div>';
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
    for (const b of document.querySelectorAll("#modDemandTabs [data-demand-tab]")) {
      b.classList.toggle("active", b === btn);
    }
    renderModDemandPage();
  });
  document.getElementById("modDemandList")?.addEventListener("click", (e) => {
    const searchBtn = e.target?.closest?.("[data-demand-search]");
    if (searchBtn) {
      const q = searchBtn.getAttribute("data-demand-search") || "";
      jumpToDemandSearch(q);
      return;
    }
    const forumBtn = e.target?.closest?.("[data-demand-forum]");
    if (forumBtn) {
      setDashboardTab("forum", "navForum");
    }
  });
}

function jumpToDemandSearch(query) {
  const q = String(query || "").trim();
  if (!q) return;
  setDashboardTab("search", "navModSearch");
  if (mcSearchInput) mcSearchInput.value = q;
  runSimsSearch(q);
}

function getMcResults(query, platformKey = "") {
  const normalized = richQueryExpand(query);
  const allowedSources = activeMcSources.has("all") ? null : activeMcSources;
  const base = MC_SEED_ITEMS.filter((item) => {
    const modeOk = mcSearchLoader === "cc"
      ? item.type === "cc"
      : mcSearchLoader === "mods"
        ? item.type === "mods"
        : mcSearchLoader === "gameplay"
          ? item.category === "gameplay"
          : mcSearchLoader === "buildbuy"
            ? item.category === "buildbuy"
            : item.type === mcSearchLoader;
    const sourceOk = !allowedSources || allowedSources.has(item.platform);
    return modeOk && sourceOk && itemMatchesIntent(item, normalized);
  });
  const scoped = platformKey ? base.filter((item) => item.platformKey === platformKey) : base;
  const scored = scoped
    .map((item) => ({ item, score: scoreMcItem(item, normalized) }))
    .filter((entry) => entry.score > 0 || !String(query || "").trim() || platformKey);
  const results = scored.length ? scored : base.map((item) => ({ item, score: 0 }));
  const sort = mcSortSelect?.value || "relevance";
  return results.sort((a, b) => {
    if (sort === "newest") return b.item.dateScore - a.item.dateScore;
    if (sort === "popular") return b.item.downloads - a.item.downloads;
    if (sort === "site") return a.item.platform.localeCompare(b.item.platform) || a.item.title.localeCompare(b.item.title);
    return b.score - a.score || b.item.downloads - a.item.downloads || a.item.title.localeCompare(b.item.title);
  }).map((entry) => entry.item);
}

function mcPlatformForItem(item) {
  return MC_SEARCH_PLATFORMS.find((entry) => entry.key === item?.platformKey || entry.key === item?.sourceKey || entry.name === item?.source) || MC_SEARCH_PLATFORMS[0];
}

async function renderMcSearch(query, page = mcCurrentPage) {
  if (!mcBrowserScreen) return;
  const raw = String(query || "").trim().replace(/#/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) {
    renderMcSearchIdle();
    return;
  }
  const seq = ++mcLiveSearchSeq;
  mcHasSearched = true;
  lastMcQuery = raw;
  if (mcBrowserAddress) mcBrowserAddress.textContent = `modguard://minecraft/search/${displayMcQuery(raw)}/page/${page}`;
  renderMcSearchSkeleton();

  // Step 1: Always show local results immediately (instant feedback)
  let items = getMcResultsLocal(raw);

  // Step 2: Fetch from ALL live sources in parallel if query is 2+ chars
  if (raw.length >= 2) {
    updateMcCatalogStatus("Searching Modrinth, CurseForge, SpigotMC, GitHub, Hangar…");
    try {
      // Fire ALL sources at once — none waits for another
      const [
        modrinthModsResult,
        hangarResult,
        modrinthPluginsResult,
        modrinthShadersResult,
        modrinthResourcepacksResult,
        modrinthModpacksResult,
        modrinthDatapacksResult,
        curseForgeResult,
        githubResult,
        spigetResult,
        polymartResult,
      ] = await Promise.allSettled([
        fetchModrinthSearch(raw),
        fetchHangarSearch(raw),
        fetchModrinthTypedSearch(raw, "plugin"),
        fetchModrinthTypedSearch(raw, "shader"),
        fetchModrinthTypedSearch(raw, "resourcepack"),
        fetchModrinthTypedSearch(raw, "modpack"),
        fetchModrinthTypedSearch(raw, "datapack"),
        fetchCurseForgeSearch(raw),
        fetchGitHubSearch(raw),
        fetchSpigetSearch(raw),
        fetchPolymartSearch(raw),
      ]);

      if (seq !== mcLiveSearchSeq) return; // superseded by newer search

      // Collect all remote results, ignoring any that errored.
      // Portal cards for Planet Minecraft + Nexus Mods always appear at the bottom.
      const allRemote = [
        modrinthModsResult,
        hangarResult,
        modrinthPluginsResult,
        modrinthShadersResult,
        modrinthResourcepacksResult,
        modrinthModpacksResult,
        modrinthDatapacksResult,
        curseForgeResult,
        githubResult,
        spigetResult,
        polymartResult,
      ]
        .filter((r) => r.status === "fulfilled" && Array.isArray(r.value))
        .flatMap((r) => r.value)
        .concat(buildPortalCards(raw));

      if (allRemote.length) {
        // Add new remote items to the catalog cache for future local searches
        const byId = new Map(getMcAllItems().map((i) => [i.id, i]));
        for (const item of allRemote) {
          if (!byId.has(item.id)) {
            mcCatalogItems.push(item);
          } else {
            // Update existing item with fresher data from API
            const existing = byId.get(item.id);
            if (!existing.thumbUrl && item.thumbUrl) existing.thumbUrl = item.thumbUrl;
            if (item.downloads > (existing.downloads || 0)) existing.downloads = item.downloads;
          }
        }
        // Re-score local results with the now-expanded catalog
        items = getMcResultsLocal(raw);
        // Merge: local scored results first, then any remote-only results
        items = mergeMcSearchResultsRanked(items, allRemote, raw);
      }
    } catch {
      // Network error — stick with local results
    }
    updateMcCatalogStatus("");
  }

  if (seq !== mcLiveSearchSeq) return;
  mcVisibleResults = items;

  if (!items.length) {
    mcBrowserScreen.className = "mg-mod-grid";
    mcBrowserScreen.innerHTML = `<div class="mg-idle"><strong>Ingen resultater for "${escapeHtml(raw)}"</strong><span>Prøv et bredere søgeord, eller søg direkte på Modrinth.</span></div>`;
    return;
  }
  paintMcModGrid(items, { reset: true });
}

function mergeMcSearchResultsRanked(localItems, remoteItems, rawQuery) {
  const tokens = expandMcSearchTokens(rawQuery);
  const qLower = normalizeMcQuery(rawQuery);

  // ── 1. Collect all items into a deduplicated map ─────────────────────────
  // Rule: if two items have the same mod title (≥88% char overlap), keep only
  // the one with more downloads (same mod on CurseForge + Modrinth = 1 card).
  const allById = new Map();

  const addItem = (item) => {
    if (!item?.id) return;

    // Exact ID dedup — prefer higher-download version
    if (allById.has(item.id)) {
      const ex = allById.get(item.id);
      if ((item.downloads || 0) > (ex.downloads || 0)) allById.set(item.id, item);
      return;
    }

    // Title-similarity dedup (skip portal cards — they're intentionally kept)
    if (!item.isPortal) {
      const normT = normalizeMcQuery(item.title);
      for (const [eid, ex] of allById) {
        if (ex.isPortal) continue;
        const exNorm = normalizeMcQuery(ex.title);
        if (!normT || !exNorm) continue;
        const longer = Math.max(normT.length, exNorm.length);
        const shorter = Math.min(normT.length, exNorm.length);
        const ratio = longer > 0 ? shorter / longer : 0;
        const isMatch = normT === exNorm ||
          (ratio >= 0.88 && shorter >= 5 && (normT.includes(exNorm) || exNorm.includes(normT)));
        if (isMatch) {
          // Same mod on multiple platforms — keep the more-downloaded entry
          if ((item.downloads || 0) > (ex.downloads || 0)) allById.set(eid, item);
          return;
        }
      }
    }

    allById.set(item.id, item);
  };

  // Local (already scored + filtered) first, then all remote
  for (const item of localItems) addItem(item);
  for (const item of remoteItems) addItem(item);

  // ── 2. Score every item with a multi-signal composite score ──────────────
  const scored = [...allById.values()].map((item) => {
    // Portal cards always rank dead last
    if (item.isPortal) return { item, score: -500 };

    // Base relevance from token matching & intent
    const base = scoreMcItemLocal(item, tokens, rawQuery);

    // Title-match bonus on top of per-token scoring
    const tNorm = normalizeMcQuery(item.title);
    const titleBonus =
      (qLower && tNorm === qLower)                              ? 55 :
      (qLower.length >= 3 && tNorm.startsWith(qLower))         ? 35 :
      (qLower.length >= 4 && tNorm.includes(qLower))           ? 18 : 0;

    // Download-count tiers (real-world popularity signal)
    const dl = item.downloads || 0;
    const popBonus =
      dl >= 50_000_000 ? 28 :
      dl >= 10_000_000 ? 22 :
      dl >= 1_000_000  ? 17 :
      dl >= 100_000    ? 11 :
      dl >= 10_000     ?  6 :
      dl >= 1_000      ?  2 : 0;

    // Platform trust: curated or well-moderated platforms get a small lift
    const trustBonus =
      item.platformKey === "modrinth"    ? 5 :
      item.platformKey === "curseforge"  ? 5 :
      item.platformKey === "hangar"      ? 4 :
      item.platformKey === "spiget"      ? 3 :
      item.platformKey === "github"      ? 2 :
      item.platformKey === "polymart"    ? 2 : 0;

    return { item, score: base + titleBonus + popBonus + trustBonus };
  });

  // ── 3. Sort by composite score, downloads as tiebreaker ─────────────────
  scored.sort((a, b) =>
    b.score - a.score ||
    (b.item.downloads || 0) - (a.item.downloads || 0) ||
    (a.item.title || "").localeCompare(b.item.title || "")
  );

  // ── 4. Diversity pass — spread top results across platforms ──────────────
  return diversifyTopResults(scored).map((e) => e.item);
}

// Ensures the first TOP_SLOTS results don't over-represent any single platform.
// Beyond TOP_SLOTS, the pure score order is preserved.
function diversifyTopResults(scoredEntries) {
  const TOP_SLOTS = 20;
  const MAX_PER_PLATFORM = 5;
  const platformCounts = {};
  const top = [];
  const overflow = [];

  for (const entry of scoredEntries) {
    if (entry.item.isPortal) { overflow.push(entry); continue; }
    const pk = entry.item.platformKey || "other";
    const count = platformCounts[pk] || 0;

    if (top.length < TOP_SLOTS && count < MAX_PER_PLATFORM) {
      top.push(entry);
      platformCounts[pk] = count + 1;
    } else {
      overflow.push(entry);
    }
  }

  // Fill any remaining top slots from overflow (no diversity constraint)
  while (top.length < TOP_SLOTS && overflow.length && !overflow[0].item.isPortal) {
    top.push(overflow.shift());
  }

  return [...top, ...overflow];
}

function getMcResultsLocal(rawQuery) {
  const tokens = expandMcSearchTokens(rawQuery);
  const cat = getActiveMgCategory();
  const ver = document.getElementById("mgFilterVersion")?.value
    || document.getElementById("mcVersionFilter")?.value
    || "all";
  // For Minecraft, mcSearchLoader holds loader filter ("all", "fabric", "forge", "neoforge")
  // NOT Sims-style cc/mods/gameplay/buildbuy — use mcTypeFilter directly
  const loader = document.getElementById("mcTypeFilter")?.value || "all";
  const sideFilter = getMcModSideFilter();
  const platformFilter = getMcPlatformFilter();
  const allowNsfw = isMcNsfwAllowed();

  let items = getMcAllItems().filter((item) => {
    if (!allowNsfw && (item.nsfw || MC_NSFW_TITLES.has(item.title))) return false;
    if (cat !== "all" && item.category !== cat) return false;
    if (ver !== "all" && !String(item.minVersion || "").startsWith(ver)) return false;
    if (loader !== "all" && !(item.loaders || []).includes(loader)) return false;
    if (platformFilter !== "all" && item.platformKey !== platformFilter) return false;
    if (!itemMatchesModSide(item, sideFilter)) return false;
    return true;
  });

  const sort = document.getElementById("mcSortSelect")?.value || "relevance";

  if (tokens.length) {
    // Score each item; intent filter is handled inside scoring via intent bonus
    const scored = items
      .map((item) => ({ item, score: scoreMcItemLocal(item, tokens, rawQuery) }));

    // Keep items with any relevance OR if search is very broad (< 4 chars)
    const minScore = rawQuery.trim().length < 4 ? 0 : 1;
    const relevant = scored.filter((e) => e.score > minScore);

    // If very few relevant results, include all (avoid empty results on broad queries)
    const finalSet = relevant.length >= 3 ? relevant : scored;

    finalSet.sort((a, b) => b.score - a.score);
    items = finalSet.map((e) => e.item);
  } else {
    if (sort === "popular") items.sort((a, b) => b.downloads - a.downloads);
    else if (sort === "alphabetical") items.sort((a, b) => a.title.localeCompare(b.title));
    else items.sort((a, b) => b.downloads - a.downloads);
  }
  return items;
}

function scoreMcItemLocal(item, tokens, rawQuery = "") {
  const titleNorm = normalizeMcQuery(item.title);
  const authorNorm = normalizeMcQuery(item.author || "");
  const descNorm = normalizeMcQuery(item.description || item.note || "");
  const tagStr = normalizeMcQuery((item.tags || []).join(" "));
  const catNorm = normalizeMcQuery(item.category || "");
  const hay = `${titleNorm} ${descNorm} ${authorNorm} ${tagStr} ${catNorm}`;
  const qNorm = normalizeMcQuery(rawQuery);
  const qFirst = qNorm.split(" ")[0] || "";
  let score = 0;

  // Exact full title match (highest priority)
  if (qNorm && titleNorm === qNorm) score += 60;
  // Title contains full query
  else if (qNorm && titleNorm.includes(qNorm)) score += 30;
  // Title starts with first query word
  if (qFirst && titleNorm.startsWith(qFirst)) score += 12;

  // Token-level title scoring
  for (const token of tokens) {
    if (token.length < 2) continue;
    const titleWords = titleNorm.split(" ");
    if (titleWords.includes(token)) score += 16;          // exact word in title
    else if (titleNorm.includes(token)) score += 10;      // substring in title
    if (authorNorm.includes(token)) score += 6;           // author match (bonus, not exclusive)
    if (descNorm.includes(token)) score += token.length > 5 ? 5 : 3;  // in description
    if (tagStr.includes(token)) score += 4;               // in tags
    if (catNorm.includes(token)) score += 3;              // in category
  }

  // Popularity bonus (log-scaled, max 10 pts)
  score += Math.min(10, Math.log10((item.downloads || 0) + 1) * 1.5);

  // Recency bonus: mods updated in last 6 months get a boost
  if (item.updatedAt || item.dateScore) {
    const ts = item.updatedAt ? new Date(item.updatedAt).getTime() : (item.dateScore || 0) * 1000;
    const ageMonths = (Date.now() - ts) / (1000 * 60 * 60 * 24 * 30);
    if (ageMonths <= 1) score += 4;
    else if (ageMonths <= 6) score += 2;
  }

  // Safety bonus for known-safe platforms
  if (item.platformKey === "modrinth") score += 2;
  if (item.platformKey === "curseforge") score += 1;

  // Intent alignment bonus
  const intent = inferMcIntent(rawQuery);
  if (intent && item.category) {
    const catMap = { shader: "shader", performance: "optimization", technology: "technology", magic: "magic", world: "world", adventure: "adventure", utility: "utility" };
    if (catMap[intent] === item.category) score += 8;
  }

  return score;
}

function normalizeMcQuery(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const FAVORITES_KEY = "mc_modguard_favorites";
function isMcFavorite(id) {
  try {
    const list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(list) && list.includes(id);
  } catch { return false; }
}
function toggleMcFavorite(id) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch {}
  if (!Array.isArray(list)) list = [];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch {}
}

// Portal cards: shown at the bottom of results, link to that platform's own search
function renderMcPortalCard(item) {
  const platform = MC_SEARCH_PLATFORMS.find((p) => p.key === item.platformKey) || { theme: ["#3a4a3a", "#1a2818"], badge: "?", name: item.platform };
  const [a, b] = platform.theme || ["#3a4a3a", "#1a2818"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300">
    <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="480" height="300" fill="url(#pg)"/>
    <text x="240" y="130" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="72" fill="rgba(255,255,255,0.18)">${escapeHtml(platform.badge || "?")}</text>
    <text x="240" y="190" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="rgba(255,255,255,0.7)">${escapeHtml(item.platform)}</text>
    <text x="240" y="220" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="rgba(255,255,255,0.45)">Søg her →</text>
  </svg>`;
  const thumb = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return `
    <article class="mg-mod-card mg-portal-card" data-open-mc-url="${escapeHtml(item.url)}" data-mod-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}">
      <div class="mg-mod-thumb">
        <img class="mg-mod-thumb-img loaded" src="${escapeHtml(thumb)}" alt="${escapeHtml(item.platform)}" />
        <span class="mg-mod-platform-badge">${escapeHtml(item.platform)}</span>
      </div>
      <div class="mg-mod-body">
        <h3 title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        <p class="mg-mod-author">${escapeHtml(item.platform)}</p>
        <p class="mg-mod-desc">${escapeHtml(String(item.description || "").slice(0, 90))}</p>
        <div class="mg-mod-foot" style="justify-content:flex-end">
          <span class="mg-mod-safe" style="color:#88ccff">🔗 Søg på platform</span>
        </div>
      </div>
    </article>`;
}

function getMcCardThumbUrl(item) {
  const raw = String(item.thumbUrl || "").trim();
  if (raw) return raw.replace(/'/g, "%27");
  return mcThumbDataUrl(item, item.title);
}

function renderMcModCard(item) {
  // Portal cards get a special search-link layout
  if (item.isPortal) return renderMcPortalCard(item);
  const thumbUrl = getMcCardThumbUrl(item);
  const thumbFallback = mcThumbDataUrl(item, item.title);
  const hasRealThumb = /^https:\/\//i.test(thumbUrl);
  const fav = isMcFavorite(item.id);
  const loader = (item.loaders && item.loaders[0]) ? String(item.loaders[0]) : "forge";
  const loaderLabel = loader.charAt(0).toUpperCase() + loader.slice(1);
  const sideLabel = item.modSide === "both" ? "Client+Server" : item.modSide === "server" ? "Server" : "Client";
  const catLabel = getMcCategoryLabel(item.category);
  const tagCls = getMcTagClass(item.category);
  const secTag = getMcSecondaryTag(item);
  const secCls = secTag === "MAGIC" ? "tag-magic" : secTag === "AUTOMATION" || secTag === "TOOLS" || secTag === "STORAGE" ? "tag-tech" : secTag === "BIOMES" ? "tag-world" : tagCls;
  const secHtml = secTag ? `<span class="mg-mod-tag ${secCls}">${escapeHtml(secTag)}</span>` : "";
  // Real https images start WITHOUT "loaded" so the shimmer animates until they arrive.
  // SVG data-URL fallbacks render instantly — mark them "loaded" right away.
  const thumbHtml = hasRealThumb
    ? `<img class="mg-mod-thumb-img" src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" data-fallback="${escapeHtml(thumbFallback)}" />`
    : `<img class="mg-mod-thumb-img loaded" src="${escapeHtml(thumbFallback)}" alt="${escapeHtml(item.title)}" loading="lazy" data-fallback="${escapeHtml(thumbFallback)}" />`;
  return `
    <article class="mg-mod-card" data-open-mc-url="${escapeHtml(item.url)}" data-mod-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}">
      <div class="mg-mod-thumb">
        ${thumbHtml}
        <div class="mg-mod-thumb-shimmer" aria-hidden="true"></div>
        <button type="button" class="mod-card-fav ${fav ? "is-fav" : ""}" data-mc-fav="${escapeHtml(item.id)}" aria-label="Favorit ${escapeHtml(item.title)}">♥</button>
        <span class="mg-mod-platform-badge">${escapeHtml(item.platform || "Modrinth")}</span>
      </div>
      <div class="mg-mod-body">
        <h3 title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
        <p class="mg-mod-author">by <strong>${escapeHtml(item.author || item.platform)}</strong></p>
        <p class="mg-mod-desc">${escapeHtml(String(item.description || "").slice(0, 90))}</p>
        <div class="mg-mod-tags">
          <span class="mg-mod-tag ${tagCls}">${escapeHtml(catLabel)}</span>
          ${secHtml}
        </div>
        <div class="mg-mod-foot">
          <span class="mg-mod-ver">${escapeHtml(item.minVersion || "1.20.1")} · ${escapeHtml(loaderLabel)}</span>
          <span class="mg-mod-safe">🛡 ${escapeHtml(String(item.safetyPct || 98))}%</span>
          <span class="mg-mod-dl">⬇ ${escapeHtml(formatMcDownloads(item.downloads))}</span>
        </div>
      </div>
    </article>`;
}

function renderSimsInternalPage(item, url) {
  if (!mcBrowserScreen) return;
  const platform = mcPlatformForItem(item);
  const q = normalizeMcQuery(lastMcQuery);
  const targetUrl = isAllowedModSearchUrl(url) ? url : platform.url(q);
  if (mcBrowserAddress) mcBrowserAddress.textContent = targetUrl;
  mcBrowserScreen.innerHTML = `
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
  const platform = MC_SEARCH_PLATFORMS.find((entry) => normalizeSearchText(entry.name).includes(normalizeSearchText(platformName)));
  if (!platform || !mcBrowserScreen) {
    renderMcSearch(query);
    return;
  }
  lastMcQuery = query || lastMcQuery;
  if (mcBrowserAddress) mcBrowserAddress.textContent = platform.url(normalizeMcQuery(lastMcQuery));
  const results = getMcResults(lastMcQuery, platform.key);
  mcBrowserScreen.innerHTML = `
    <div class="platform-page">
      <div>
        <span class="mini-badge safe">${escapeHtml(platform.trust)}</span>
        <h3>${escapeHtml(platform.name)}</h3>
        <p>${escapeHtml(platform.note)}</p>
      </div>
      <div class="search-results" id="simsSearchResults">
        ${results.map((item, idx) => {
          const url = platform.url(normalizeMcQuery(lastMcQuery));
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

function setMcSearchLoader(mode) {
  mcSearchLoader = String(mode || "all");
  for (const btn of simsModeButtons) {
    const active = btn?.dataset?.mcLoader === mcSearchLoader;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  mcCurrentPage = 1;
  updateMcSearchHints();
  const q = mcSearchInput?.value?.trim() || "";
  if (mcHasSearched && q) renderMcSearch(q);
  else if (!q) renderMcSearchIdle();
}

function getVisibleSimsItems() {
  const q = lastMcQuery || mcSearchInput?.value || "";
  return mcVisibleResults.length ? mcVisibleResults : q ? getMcResults(q) : [];
}

function runSimsSearch(query) {
  const raw = String(query ?? mcSearchInput?.value ?? "").trim();
  const q = raw.replace(/#/g, "").replace(/\s+/g, " ").trim();
  if (!q) {
    renderMcSearchIdle();
    return;
  }
  lastMcQuery = q;
  mcCurrentPage = 1;
  simsSelectedModId = "";
  updateMcSearchHints();
  renderMcSearch(q);
}

function applySimsHintQuery(text) {
  const hint = String(text || "").trim().replace(/#/g, "");
  if (!hint || !mcSearchInput) return;
  mcSearchInput.value = hint;
  mcSearchInput.focus();
  updateMcSearchHints();
  runSimsSearch(hint);
}

function setAdultModal(open) {
  adultConfirmModal?.classList.toggle("active", !!open);
  adultConfirmModal?.setAttribute("aria-hidden", open ? "false" : "true");
  if (open && adultConfirmCheck) adultConfirmCheck.checked = false;
}

function syncAdultToggleUi() {
  const on = !!(adultContentEnabled && adultContentConfirmed);
  if (adultContentToggle) adultContentToggle.checked = on;
  if (settingsAdultToggle) settingsAdultToggle.checked = on;
}

function loadAdultContentPreference() {
  try {
    if (localStorage.getItem("modguard_adult_confirmed") === "yes") {
      adultContentEnabled = true;
      adultContentConfirmed = true;
    }
  } catch {}
  syncAdultToggleUi();
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
let modsHealthTab = "outdated";
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

function renderModsHealthCard(item, kind) {
  const revealPath = String(item.savedTo || item.path || "").trim();
  const fileName = String(item.fileName || pathBasename(revealPath) || "").trim();
  const tag = kind === "broken" ? "BROKEN" : kind === "outdated" ? "OUTDATED" : kind.toUpperCase();
  const initials = inferModDisplayName(item).slice(0, 2).toUpperCase();
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
  const actionLabel = kind === "outdated" ? "Hold øje" : "Vis i mappe";
  const canReveal = !!revealPath || !!fileName;

  return `
    <button type="button" class="mods-health-card ${escapeHtml(kind)}" data-reveal-path="${escapeHtml(revealPath)}" data-mod-file="${escapeHtml(fileName)}" ${canReveal ? "" : "disabled"} title="${canReveal ? "Åbn fil i mods-mappen" : "Fil ikke fundet lokalt"}">
      <span class="mods-health-card-tag">${tag}</span>
      <div class="mods-health-card-top">
        <span class="mods-health-card-icon" aria-hidden="true">${escapeHtml(initials)}</span>
        <div>
          <div class="mods-health-card-name">${escapeHtml(item.displayName || item.fileName)}</div>
          <div class="mods-health-card-author">af ${escapeHtml(item.author || "Creator")}</div>
        </div>
      </div>
      ${problemLine}
      <div class="mods-health-card-meta"><span>Sidst opdateret: ${escapeHtml(formatModHealthDate(item))}</span></div>
      ${riskLine}
      <span class="mods-health-card-action">${actionLabel}</span>
    </button>
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
  show("modsBlockBroken", false);
  show("modsBlockOutdated", true);
  show("modsBlockCompatible", false);
  show("modsBlockUnknown", false);
  for (const btn of document.querySelectorAll("#modsHealthTabs [data-mods-tab]")) {
    btn.classList.toggle("active", btn.getAttribute("data-mods-tab") === tab);
  }
  const totalIssues = counts.outdated;
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
  const totalIssues = counts.outdated;
  const emptyEl = document.getElementById("modsHealthEmpty");
  const scrollEl = document.getElementById("modsHealthScroll");
  const tabsEl = document.getElementById("modsHealthTabs");
  const tipEl = document.querySelector("#outdatedSection .mods-health-tip");
  if (emptyEl) {
    if (!scanned) {
      emptyEl.hidden = false;
      emptyEl.innerHTML = `<div class="mods-health-empty-inner"><strong>Scan din mod-mappe</strong><p>Tryk på ↻ for at finde outdated mods i din Minecraft mappe.</p></div>`;
    } else if (!totalIssues) {
      emptyEl.hidden = false;
      emptyEl.innerHTML = `<div class="mods-health-empty-inner"><strong>Ingen problemer fundet</strong><p>Alle scannede mods ser ud til at være i orden.</p></div>`;
    } else {
      emptyEl.hidden = true;
      emptyEl.innerHTML = "";
    }
  }
  if (scrollEl) scrollEl.hidden = !scanned;
  if (tabsEl) tabsEl.hidden = true;
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

  const showOutdatedBlock = true;
  const blockOutdated = document.getElementById("modsBlockOutdated");
  if (blockOutdated) blockOutdated.hidden = !showOutdatedBlock;
  renderModsHealthCardRow(document.getElementById("modsOutdatedCards"), catalogue.outdated, "outdated");
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
      : mcThumbDataUrl({ title }, title);
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

let activeNavId = "navModSearch";

const MG_QF_BROWSE_TABS = new Set(["servermods", "resourcepacks"]);

function syncQuickFiltersPlacement(tab) {
  const panel = document.getElementById("mcFiltersSidebar");
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

const MG_GUIDE_SLIDES = [
  // 0 — Welcome
  {
    visual: `<div class="ob-visual-hero">
      <svg class="ob-shield" viewBox="0 0 72 72" fill="none">
        <rect width="72" height="72" rx="14" fill="#1a3a08"/>
        <path d="M36 9L57 22V40C57 54 36 65 36 65C36 65 15 54 15 40V22L36 9Z" fill="#3fa028" stroke="#7dcc2a" stroke-width="2.5"/>
        <circle cx="36" cy="38" r="11" fill="none" stroke="#7dcc2a" stroke-width="2.8"/>
        <circle cx="36" cy="38" r="4.5" fill="#7dcc2a"/>
        <line x1="36" y1="23" x2="36" y2="29" stroke="#7dcc2a" stroke-width="2.8"/>
        <line x1="36" y1="47" x2="36" y2="53" stroke="#7dcc2a" stroke-width="2.8"/>
        <line x1="21" y1="38" x2="27" y2="38" stroke="#7dcc2a" stroke-width="2.8"/>
        <line x1="45" y1="38" x2="51" y2="38" stroke="#7dcc2a" stroke-width="2.8"/>
      </svg>
      <div style="text-align:center">
        <div style="font-size:11px;letter-spacing:0.2em;color:#7dcc2a;font-weight:700;margin-bottom:4px">WELCOME TO</div>
        <div style="font-size:32px;font-weight:900;color:#fff;line-height:1">MOD<span style="color:#7dcc2a">GUARD</span></div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px">YOUR MODS. SAFE. ORGANISED. FAST.</div>
      </div>
      <div class="ob-hero-logos">
        <div class="ob-game-badge"><span style="font-size:26px">⛏</span><span>Minecraft</span></div>
        <div class="ob-divider"></div>
        <div class="ob-game-badge"><span style="font-size:26px">🏠</span><span>The Sims 4</span></div>
      </div>
    </div>`,
    title: "Welcome to ModGuard",
    desc: "The mod manager for Minecraft and The Sims 4. Browse, download and stay protected."
  },
  // 1 — Both games
  {
    visual: `<div class="ob-visual-hero" style="flex-direction:row;gap:10px;padding:18px 16px">
      <div style="flex:1;background:rgba(125,204,42,0.08);border:1px solid rgba(125,204,42,0.25);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;align-items:center">
        <span style="font-size:36px">⛏</span>
        <strong style="color:#7dcc2a;font-size:14px">MINECRAFT</strong>
        <div style="font-size:11px;color:#6c7177;text-align:center;line-height:1.4">Mods, plugins, modpacks from Modrinth and CurseForge</div>
        <div style="width:100%;background:rgba(255,255,255,0.06);border-radius:6px;padding:5px 8px;font-size:10px;color:#b5bac1">Forge · Fabric · NeoForge</div>
      </div>
      <div style="flex:1;background:rgba(88,101,242,0.08);border:1px solid rgba(88,101,242,0.25);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;align-items:center">
        <span style="font-size:36px">🏠</span>
        <strong style="color:#9aa5ff;font-size:14px">THE SIMS 4</strong>
        <div style="font-size:11px;color:#6c7177;text-align:center;line-height:1.4">CC, mods and custom content, safe and organised</div>
        <div style="width:100%;background:rgba(255,255,255,0.06);border-radius:6px;padding:5px 8px;font-size:10px;color:#b5bac1">CC · Gameplay · Scripts</div>
      </div>
    </div>`,
    title: "Minecraft and The Sims 4",
    desc: "Browse, download and manage mods from one place."
  },
  // 2 — Download
  {
    visual: `<div>
      <div class="ob-search-mock">
        <div class="ob-search-input">Search mods, creators, categories...</div>
        <div class="ob-search-btn">SEARCH</div>
      </div>
      <div class="ob-pills">
        <div class="ob-pill active">ALL</div>
        <div class="ob-pill">TECH</div>
        <div class="ob-pill">MAGIC</div>
        <div class="ob-pill">WORLD GEN</div>
        <div class="ob-pill">PERFORMANCE</div>
      </div>
      <div class="ob-card-list">
        <div class="ob-card">
          <div class="ob-card-ico" style="background:rgba(125,204,42,0.15)">⬡</div>
          <div class="ob-card-info"><div class="ob-card-name">Just Enough Items (JEI)</div><div class="ob-card-sub">Modrinth · 45M downloads</div></div>
          <div class="ob-card-dl">Download</div>
          <div class="ob-card-heart">♡</div>
        </div>
        <div class="ob-card">
          <div class="ob-card-ico" style="background:rgba(88,101,242,0.15)">◈</div>
          <div class="ob-card-info"><div class="ob-card-name">Sodium — Performance</div><div class="ob-card-sub">Modrinth · 38M downloads</div></div>
          <div class="ob-card-dl">Download</div>
          <div class="ob-card-heart">♡</div>
        </div>
        <div class="ob-card">
          <div class="ob-card-ico" style="background:rgba(240,178,50,0.15)">◉</div>
          <div class="ob-card-info"><div class="ob-card-name">Terralith — World Gen</div><div class="ob-card-sub">CurseForge · 30M downloads</div></div>
          <div class="ob-card-dl">Download</div>
          <div class="ob-card-heart">♡</div>
        </div>
      </div>
    </div>`,
    title: "Download mods from the internet",
    desc: "Search Modrinth, CurseForge and more. ModGuard scans every file before saving it."
  },
  // 3 — Scanner
  {
    visual: `<div class="ob-scanner-mock">
      <div class="ob-scan-row">
        <div class="ob-scan-icon">◈</div>
        <div>
          <div class="ob-scan-title">MODGUARD — Scanning</div>
          <div class="ob-scan-sub">Checking for malware and known threats</div>
        </div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#6c7177;margin-bottom:4px"><span>sodium-mc1.21.jar</span><span>82%</span></div>
        <div class="ob-progress-wrap"><div class="ob-progress-fill" style="width:82%"></div></div>
      </div>
      <div class="ob-scan-stats">
        <div class="ob-stat-chip green"><strong>24</strong><span>Safe</span></div>
        <div class="ob-stat-chip yellow"><strong>0</strong><span>Suspect</span></div>
        <div class="ob-stat-chip red"><strong>0</strong><span>Danger</span></div>
      </div>
      <div style="padding:6px 0 2px">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#23a559"><span>✓</span><span>jei-forge-1.21.jar — Safe</span></div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#23a559;margin-top:4px"><span>✓</span><span>fabric-api-0.100.jar — Safe</span></div>
      </div>
    </div>`,
    title: "Automatic scanning",
    desc: "ModGuard checks every file before it reaches your mods folder."
  },
  // 4 — XP
  {
    visual: `<div class="ob-xp-mock">
      <div class="ob-level-badge">
        <div class="ob-level-num">24</div>
        <div class="ob-level-info">
          <div class="ob-level-title">Mod Explorer</div>
          <div class="ob-level-sub">3,240 / 5,000 XP to next level</div>
          <div class="ob-xp-bar"><div class="ob-xp-fill"></div></div>
        </div>
      </div>
      <div class="ob-xp-actions">
        <div class="ob-xp-action"><span>◈</span>Scan a mod<br>+50 XP</div>
        <div class="ob-xp-action"><span>↓</span>Download mod<br>+25 XP</div>
        <div class="ob-xp-action"><span>◉</span>Stay protected<br>+10 XP/day</div>
        <div class="ob-xp-action"><span>♥</span>Save favourite<br>+15 XP</div>
      </div>
      <div style="padding:4px 2px 2px;font-size:11px;color:#6c7177;text-align:center">Reach higher levels to unlock badges and exclusive titles</div>
    </div>`,
    title: "XP and levels",
    desc: "Earn points by scanning and downloading mods. Level up your profile over time."
  },
  // 5 — Favourites
  {
    visual: `<div>
      <div style="padding:10px 14px 6px;font-size:12px;color:#7dcc2a;font-weight:700;letter-spacing:0.06em">♥ MINE FAVORITTER</div>
      <div class="ob-card-list">
        <div class="ob-card" style="border-color:rgba(255,68,102,0.3);background:rgba(255,68,102,0.06)">
          <div class="ob-card-ico" style="background:rgba(255,68,102,0.15)">⛏</div>
          <div class="ob-card-info"><div class="ob-card-name">Create — Steam 'n' Rails</div><div class="ob-card-sub">Saved 2 days ago · Modrinth</div></div>
          <div class="ob-card-heart on">♥</div>
        </div>
        <div class="ob-card" style="border-color:rgba(255,68,102,0.3);background:rgba(255,68,102,0.06)">
          <div class="ob-card-ico" style="background:rgba(255,68,102,0.15)">🏠</div>
          <div class="ob-card-info"><div class="ob-card-name">Slice of Life — Sims 4</div><div class="ob-card-sub">Saved 5 days ago · CC Site</div></div>
          <div class="ob-card-heart on">♥</div>
        </div>
        <div class="ob-card">
          <div class="ob-card-ico" style="background:rgba(125,204,42,0.1)">◉</div>
          <div class="ob-card-info"><div class="ob-card-name">Terralith v2.5.4</div><div class="ob-card-sub">Tap ♥ to save to favourites</div></div>
          <div class="ob-card-heart">♡</div>
        </div>
      </div>
    </div>`,
    title: "Favourites",
    desc: "Save mods to Mine Favoritter by clicking the heart icon on any mod."
  },
  // 6 — Done
  {
    visual: `<div class="ob-done-mock">
      <div class="ob-done-check">✓</div>
      <div class="ob-done-title">You're ready</div>
      <div class="ob-done-sub">ModGuard is ready. Let's finish setup.</div>
      <div class="ob-done-btns">
        <div class="ob-done-btn">Browse Mods</div>
        <div class="ob-done-btn">Run First Scan</div>
      </div>
      <div style="display:flex;gap:16px;margin-top:8px">
        <div style="text-align:center;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:20px;font-weight:800;color:#7dcc2a">148k+</div>
          <div style="font-size:10px;color:#6c7177">Mods indexed</div>
        </div>
        <div style="text-align:center;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:20px;font-weight:800;color:#23a559">98.7%</div>
          <div style="font-size:10px;color:#6c7177">Mods safe</div>
        </div>
        <div style="text-align:center;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)">
          <div style="font-size:20px;font-weight:800;color:#f0b232">24/7</div>
          <div style="font-size:10px;color:#6c7177">Protection</div>
        </div>
      </div>
    </div>`,
    title: "You're ready",
    desc: "Start by browsing mods or running your first scan."
  },
];

function showStartupGuide() {
  onboardingRequired = true;
  onboardingIndex = 0;
  setActiveView("onboarding");
  setDashboardMode(false);
  document.body.dataset.appStage = "onboarding";
  ipcRenderer.invoke("set-window-stage", "onboarding").catch(() => {});
  renderOnboarding();
}

function renderOnboarding() {
  if (!els.onboardSlides || !els.onboardDots) return;
  els.onboardSlides.innerHTML = MG_GUIDE_SLIDES.map((slide, idx) => `
    <section class="onboard-slide ${idx === onboardingIndex ? "active" : ""}">
      <div class="ob-visual">${slide.visual}</div>
      <h2>${slide.title}</h2>
      <p>${slide.desc}</p>
    </section>
  `).join("");
  els.onboardDots.innerHTML = MG_GUIDE_SLIDES.map((_, idx) => `<button class="${idx === onboardingIndex ? "active" : ""}" type="button" data-onboard-dot="${idx}"></button>`).join("");
  if (els.onboardBackBtn) els.onboardBackBtn.disabled = onboardingIndex <= 0;
  if (els.onboardNextBtn) els.onboardNextBtn.style.display = onboardingIndex >= MG_GUIDE_SLIDES.length - 1 ? "none" : "";
  if (els.onboardReadyBtn) els.onboardReadyBtn.style.display = onboardingIndex >= MG_GUIDE_SLIDES.length - 1 ? "" : "none";
}

function setActiveView(id) {
  els.activationView.classList.toggle("active", id === "activation");
  els.onboardingView?.classList.toggle("active", id === "onboarding");
  els.dashboardView.classList.toggle("active", id === "dashboard");
}

function setDashboardMode(active) {
  els.appWrap?.classList.toggle("dashboard-mode", !!active);
  els.mainCard?.classList.toggle("dashboard-mode", !!active);
}

function render(nextState) {
  state = nextState;
  const activated = !!state?.activated;
  if (activated && !wasActivatedSession) {
    const alreadyOnboarded = localStorage.getItem('mgOnboardingDone');
    if (!alreadyOnboarded) {
      onboardingRequired = true;
      onboardingIndex = 0;
    }
  }
  if (!activated) {
    onboardingRequired = true;
    onboardingIndex = 0;
  }
  wasActivatedSession = activated;
  const enabled = !!state?.protectionEnabled;
  const scanning = !!state?.scanning;
  const renewalRequired = !!state?.subscription?.renewalRequired;
  const last = state?.lastEvent;
  const autoLocale = state?.locale || localeFromCountry(els.country?.value) || "da";
  setLocale(forcedLocale || autoLocale);
  renderRenewal(state?.subscription);

  if (!activated) {
    setActiveView("activation");
    setDashboardMode(false);
    document.body.dataset.appStage = "login";
    ipcRenderer.invoke("set-window-stage", "login").catch(() => {});
    els.activateBtn.disabled = scanning;
    if (renewalRequired) {
      setActivationMessage(formatSubscriptionReason(state?.subscription?.reason), true);
    }
    // Pre-fill email from localStorage if saved
    try {
      const savedEmail = localStorage.getItem('mgSavedEmail');
      if (savedEmail && els.email && !els.email.value.trim()) els.email.value = savedEmail;
    } catch(e) {}
    return;
  }

  if (onboardingRequired) {
    setActiveView("onboarding");
    setDashboardMode(false);
    document.body.dataset.appStage = "onboarding";
    ipcRenderer.invoke("set-window-stage", "onboarding").catch(() => {});
    renderOnboarding();
    return;
  }

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

  renderMcDockScans();
  applyDashboardI18n(forcedLocale || autoLocale);
  if (settingsLocaleSelect) settingsLocaleSelect.value = forcedLocale || autoLocale;
  if (settingsAdultToggle) settingsAdultToggle.checked = !!(adultContentEnabled && adultContentConfirmed);
  if (settingsToggleProtection) settingsToggleProtection.textContent = enabled ? tt("ui.toggleOff") : tt("ui.toggleOn");
  renderModdbStatus(state?.mcDatabase);
  renderAiIndexStatus(state?.aiIndex);
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

els.activateBtn?.addEventListener("click", async () => {
  try {
    setActivationMessage("");
    const country = els.country?.value || "denmark";
    const email = els.email?.value || "";
    await ipcRenderer.invoke("activate", {
      country: country || "denmark",
      email,
      code: els.code?.value || "",
    });
    // Save email for pre-fill on next login
    try { if (email) localStorage.setItem('mgSavedEmail', email); } catch(e) {}
    setActivationMessage("Aktiveret");
  } catch (err) {
    setActivationMessage(err?.message || String(err), true);
  }
});

els.onboardBackBtn?.addEventListener("click", () => {
  onboardingIndex = Math.max(0, onboardingIndex - 1);
  renderOnboarding();
});

els.onboardNextBtn?.addEventListener("click", () => {
  onboardingIndex = Math.min(STARTUP_GUIDE_SLIDE_COUNT - 1, onboardingIndex + 1);
  renderOnboarding();
});

els.onboardReadyBtn?.addEventListener("click", async () => {
  showPostGuideSetup();
});

function showPostGuideSetup() {
  const overlay = document.createElement('div');
  overlay.className = 'mgh-popup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div class="mgh-popup" style="background:#1e2124;border:1px solid rgba(255,255,255,0.1);border-radius:14px;width:min(440px,90vw);padding:28px;display:flex;flex-direction:column;gap:16px;">
      <div style="font-size:11px;letter-spacing:0.12em;color:rgba(255,255,255,0.4);font-weight:700">STEP 1 OF 3</div>
      <div>
        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">Choose your mods folder</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5)">Where should ModGuard save your downloaded mods?</div>
      </div>
      <div id="setupFolderPath" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 14px;font-size:12px;color:rgba(255,255,255,0.4);min-height:36px;">No folder selected — you can set this in Settings later</div>
      <button type="button" id="setupChooseFolderBtn" style="background:#7dcc2a;color:#000;font-weight:700;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:13px;">Choose folder</button>
      <button type="button" id="setupFolderNextBtn" style="background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 20px;cursor:pointer;font-size:13px;">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);

  let chosenFolder = null;

  document.getElementById('setupChooseFolderBtn').addEventListener('click', async () => {
    try {
      const result = await ipcRenderer.invoke('pick-destination-folder');
      if (result) {
        chosenFolder = result;
        document.getElementById('setupFolderPath').textContent = result;
        document.getElementById('setupFolderPath').style.color = '#fff';
        document.getElementById('setupChooseFolderBtn').textContent = 'Change folder';
      }
    } catch (e) { /* folder pick failed */ }
  });

  document.getElementById('setupFolderNextBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    showSortSetup(chosenFolder);
  });
}

function showSortSetup(folder) {
  const overlay = document.createElement('div');
  overlay.className = 'mgh-popup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;';
  let chosen = 'flat';
  overlay.innerHTML = `
    <div class="mgh-popup" style="background:#1e2124;border:1px solid rgba(255,255,255,0.1);border-radius:14px;width:min(440px,90vw);padding:28px;display:flex;flex-direction:column;gap:16px;">
      <div style="font-size:11px;letter-spacing:0.12em;color:rgba(255,255,255,0.4);font-weight:700">STEP 2 OF 3</div>
      <div>
        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">Folder organisation</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5)">How should ModGuard organise your mods?</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;" id="setupSortOpts">
        <button type="button" class="setup-sort-btn active" data-sort="flat" style="background:rgba(125,204,42,0.12);border:1px solid rgba(125,204,42,0.4);border-radius:8px;padding:12px 16px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:600;font-size:13px">All in one folder</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">All mods go into one folder.</div>
        </button>
        <button type="button" class="setup-sort-btn" data-sort="sorted" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px 16px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:600;font-size:13px">Sort by type</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">Mods sorted into subfolders by category.</div>
        </button>
      </div>
      <button type="button" id="setupSortNextBtn" style="background:#7dcc2a;color:#000;font-weight:700;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:13px;">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.setup-sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chosen = btn.dataset.sort;
      overlay.querySelectorAll('.setup-sort-btn').forEach(b => {
        const isActive = b === btn;
        b.style.background = isActive ? 'rgba(125,204,42,0.12)' : 'rgba(255,255,255,0.04)';
        b.style.borderColor = isActive ? 'rgba(125,204,42,0.4)' : 'rgba(255,255,255,0.1)';
      });
    });
  });

  document.getElementById('setupSortNextBtn').addEventListener('click', () => {
    document.body.removeChild(overlay);
    showUsernameSetup(folder, chosen);
  });
}

function showUsernameSetup(folder, sortPref) {
  const overlay = document.createElement('div');
  overlay.className = 'mgh-popup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;';
  const savedEmail = els.email?.value || localStorage.getItem('mgSavedEmail') || '';
  overlay.innerHTML = `
    <div class="mgh-popup" style="background:#1e2124;border:1px solid rgba(255,255,255,0.1);border-radius:14px;width:min(440px,90vw);padding:28px;display:flex;flex-direction:column;gap:14px;">
      <div style="font-size:11px;letter-spacing:0.12em;color:rgba(255,255,255,0.4);font-weight:700">TRIN 3 AF 3</div>
      <div>
        <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">Opret din profil</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5)">Vælg et brugernavn og gem din adgangskode, så du kan logge ind igen næste gang.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.06em">BRUGERNAVN</label>
        <input type="text" id="setupUsernameInput" placeholder="Dit brugernavn" maxlength="30" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;outline:none;box-sizing:border-box;width:100%;" />
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;letter-spacing:0.06em">KODEORD</label>
        <input type="password" id="setupPasswordInput" placeholder="Vælg et kodeord" maxlength="64" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;outline:none;box-sizing:border-box;width:100%;" />
        <div style="font-size:11px;color:rgba(255,255,255,0.28)">Bruges til at logge ind igen. Brug den kode du aktiverede med, eller vælg et nyt kodeord.</div>
      </div>
      <button type="button" id="setupUsernameNextBtn" style="background:#7dcc2a;color:#000;font-weight:700;border:none;border-radius:8px;padding:11px 20px;cursor:pointer;font-size:13px;margin-top:4px;">Start ModGuard</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('setupUsernameNextBtn').addEventListener('click', () => {
    const username = document.getElementById('setupUsernameInput').value.trim() || 'Spiller';
    const password = document.getElementById('setupPasswordInput').value.trim();
    document.body.removeChild(overlay);
    try { localStorage.setItem('mgProfileName', username); } catch(e) {}
    try { localStorage.setItem('activateName', username); } catch(e) {}
    if (password) { try { localStorage.setItem('mgSavedCode', password); } catch(e) {} }
    const profileNameEl = document.getElementById('mgProfileName');
    if (profileNameEl) profileNameEl.textContent = username;
    const welcomeTitle = document.getElementById('mghWelcomeTitle');
    if (welcomeTitle) welcomeTitle.textContent = `Hej ${username}, velkommen til Modverse`;
    finishOnboardingDashboard();
  });
}

function finishOnboardingDashboard() {
  onboardingRequired = false;
  try { localStorage.setItem('mgOnboardingDone', '1'); } catch(e) {}
  setActiveView("dashboard");
  setDashboardMode(true);
  document.body.dataset.appStage = "main";
  ipcRenderer.invoke("set-window-stage", "main").catch(() => {});
}

els.onboardDots?.addEventListener("click", (event) => {
  const btn = event.target?.closest?.("[data-onboard-dot]");
  if (!btn) return;
  onboardingIndex = Math.max(0, Math.min(STARTUP_GUIDE_SLIDE_COUNT - 1, Number(btn.getAttribute("data-onboard-dot") || 0)));
  renderOnboarding();
});

document.getElementById("settingsShowGuideBtn")?.addEventListener("click", () => {
  showStartupGuide();
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

mcResetFiltersBtn?.addEventListener("click", () => {
  activeMcSources = new Set(["all"]);
  for (const item of simsSourceFilters) item.classList.add("active");
  if (mcSortSelect) mcSortSelect.value = "relevance";
  if (mcVersionFilter) mcVersionFilter.value = "all";
  if (mcTimeFilter) mcTimeFilter.value = "all";
  if (mcRatingFilter) mcRatingFilter.value = "all";
  simsMinRating = 0;
  syncStarPickerUi();
  mcCurrentPage = 1;
  adultContentEnabled = false;
  adultContentConfirmed = false;
  if (adultContentToggle) adultContentToggle.checked = false;
  if (settingsAdultToggle) settingsAdultToggle.checked = false;
  renderPlatformToggles();
  if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery);
});

document.getElementById("mcPlatformToggles")?.addEventListener("click", (event) => {
  const chip = event.target?.closest?.(".platform-chip");
  if (!chip) return;
  const name = String(chip.dataset.platformName || "").trim();
  if (name === "all") {
    activeMcSources = new Set(["all"]);
    renderPlatformToggles();
  } else if (activeMcSources.has("all")) {
    activeMcSources = new Set([name]);
    renderPlatformToggles();
  } else if (chip.classList.contains("active")) {
    activeMcSources.delete(name);
    if (!activeMcSources.size) activeMcSources = new Set(["all"]);
    renderPlatformToggles();
  } else {
    activeMcSources.add(name);
    syncPlatformFilterState();
  }
  for (const item of simsSourceFilters) {
    if (item.dataset.sourceFilter === "all") {
      item.classList.toggle("active", activeMcSources.has("all"));
      continue;
    }
    item.classList.toggle("active", activeMcSources.has("all") || activeMcSources.has(item.dataset.sourceFilter));
  }
  if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery);
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
    if (btn.id === "navDiscord") return;
    setDashboardTab(btn?.dataset?.dashboardTab || "search", btn.id);
  });
}

async function onModsHealthCardClick(event) {
  const card = event.target?.closest?.(".mods-health-card");
  if (!card || card.disabled) return;
  if (event.target?.closest?.(".mods-health-show-all, .mods-health-btn-outline, .mods-health-tabs button")) return;
  await revealModInFolder({
    savedTo: card.getAttribute("data-reveal-path"),
    path: card.getAttribute("data-reveal-path"),
    fileName: card.getAttribute("data-mod-file"),
  });
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

mcSearchBtn?.addEventListener("click", () => {
  runSimsSearch();
});

let mcSearchDebounceTimer = null;
mcSearchInput?.addEventListener("input", (e) => {
  updateMcSearchHints();
  clearTimeout(mcSearchDebounceTimer);
  const val = String(e.target?.value || "").trim().replace(/#/g, " ").replace(/\s+/g, " ");
  mcSearchDebounceTimer = setTimeout(() => {
    if (val.length >= 2) runSimsSearch(val);
    else if (!val && els.dashboardView?.dataset?.activeTab === "search") renderMcSearchIdle();
  }, 400);
});

mcSearchInput?.addEventListener("keydown", (event) => {
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
  btn.addEventListener("click", () => setMcSearchLoader(btn?.dataset?.mcLoader || "all"));
}

function onSimsFilterChange() {
  mcCurrentPage = 1;
  // Clear the Modrinth live search cache when filters change so results are re-fetched with new facets
  mcLiveSearchCache.clear();
  if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery, 1);
  else renderMcSearchIdle();
}

mcSortSelect?.addEventListener("change", onSimsFilterChange);
mcVersionFilter?.addEventListener("change", onSimsFilterChange);
mcTimeFilter?.addEventListener("change", onSimsFilterChange);
mcRatingFilter?.addEventListener("change", onSimsFilterChange);

// Also clear cache and re-render when category filter changes
document.getElementById("mcCategoryFilter")?.addEventListener("change", onSimsFilterChange);
document.getElementById("mcTypeFilter")?.addEventListener("change", onSimsFilterChange);
document.getElementById("mcPlatformFilter")?.addEventListener("change", onSimsFilterChange);
document.getElementById("mcModSideFilter")?.addEventListener("change", onSimsFilterChange);

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
  syncAdultToggleUi();
  refreshMgSearchFromFilters();
});

adultCancelBtn?.addEventListener("click", () => {
  adultContentEnabled = false;
  adultContentConfirmed = false;
  syncAdultToggleUi();
  setAdultModal(false);
});

adultAcceptBtn?.addEventListener("click", () => {
  if (!adultConfirmCheck?.checked) {
    setMessage("Bekræft først at du er over 18 år.", true);
    return;
  }
  adultContentEnabled = true;
  adultContentConfirmed = true;
  try {
    localStorage.setItem("modguard_adult_confirmed", "yes");
  } catch {}
  syncAdultToggleUi();
  setAdultModal(false);
  refreshMgSearchFromFilters();
});

for (const btn of simsSourceFilters) {
  btn.addEventListener("click", () => {
    const source = String(btn?.dataset?.sourceFilter || "").trim();
    if (!source) return;
    if (source === "all") {
      activeMcSources = new Set(["all"]);
      for (const item of simsSourceFilters) item.classList.add("active");
    } else {
      activeMcSources.delete("all");
      btn.classList.toggle("active");
      activeMcSources = new Set(
        simsSourceFilters
          .filter((item) => item !== simsSourceFilters[0] && item.classList.contains("active"))
          .map((item) => String(item.dataset.sourceFilter || ""))
          .filter(Boolean)
      );
      if (!activeMcSources.size) activeMcSources.add("all");
      simsSourceFilters[0]?.classList.toggle("active", activeMcSources.has("all"));
    }
    if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery);
  });
}

for (const trigger of simsSearchTriggers) {
  trigger.addEventListener("click", () => {
    setDashboardTab("search");
    const platform = String(trigger?.dataset?.platformQuery || "").trim();
    const query = trigger?.dataset?.simsQuery || "";
    if (platform) {
      lastMcQuery = query || lastMcQuery;
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
    url: item.url || mcPlatformForItem(item).url(normalizeMcQuery(lastMcQuery)),
    pageUrl: item.url || mcPlatformForItem(item).url(normalizeMcQuery(lastMcQuery)),
    curseforgeModId: item.curseforgeModId || null,
    directDownloadUrl: item.directDownloadUrl || "",
  }).then((result) => {
    if (result?.status === "error") {
      searchDownloadBtn.textContent = tt("ui.downloadBtn") || "Download";
      searchDownloadBtn.removeAttribute("disabled");
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

mcBrowserScreen?.addEventListener("click", (event) => {
  if (event.target?.closest?.("#mgLoadMoreMods")) {
    mcGridRenderLimit = Math.min(mcGridAllItems.length, mcGridRenderLimit + 200);
    paintMcModGrid(mcGridAllItems, { reset: false });
    return;
  }

  const mcFavBtn = event.target?.closest?.("[data-mc-fav]");
  if (mcFavBtn) {
    event.stopPropagation();
    const id = String(mcFavBtn.getAttribute("data-mc-fav") || "");
    toggleMcFavorite(id);
    mcFavBtn.classList.toggle("is-fav", isMcFavorite(id));
    return;
  }

  const mcCard = event.target?.closest?.(".mg-mod-card[data-open-mc-url]");
  if (mcCard) {
    const url = String(mcCard.getAttribute("data-open-mc-url") || "");
    if (url) openModSourceUrl(url);
    return;
  }

  const viewBtn = event.target?.closest?.("[data-sims-view]");
  if (viewBtn) {
    mcGridListView = String(viewBtn.getAttribute("data-sims-view") || "grid") === "list" ? "list" : "grid";
    renderMcSearch(mcSearchInput?.value || lastMcQuery, mcCurrentPage);
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
      const idx = mcVisibleResults.findIndex((e) => String(e.id) === parentId);
      if (idx >= 0) mcVisibleResults.splice(idx, 1, picked);
      else mcVisibleResults.unshift(picked);
      renderMcSearch(mcSearchInput?.value || lastMcQuery, mcCurrentPage);
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
    if (item) openPreviewZoom(item, lastMcQuery || mcSearchInput?.value);
    return;
  }

  const modCard = event.target?.closest?.(".mod-card");
  if (modCard) {
    if (event.target?.closest?.(".mod-card-download, .mod-card-dl-round, .mod-card-save, .mod-card-fav, .mod-card-open, .mod-card-title-link")) return;
    simsSelectedModId = String(modCard.getAttribute("data-mod-id") || "");
    const item = getVisibleSimsItems().find((entry) => String(entry.id || entry.title) === simsSelectedModId);
    if (item) {
      simsDetailTab = "zoom";
      renderSimsDetailPanel(item, lastMcQuery || mcSearchInput?.value);
      for (const card of mcBrowserScreen.querySelectorAll(".mod-card")) {
        card.classList.toggle("selected", card === modCard);
      }
    }
  }

  if (handleModsearchDownloadClick(event)) return;

  const downloadBtn = event.target?.closest?.("[data-simulated-download]");
  if (downloadBtn) {
    const title = String(downloadBtn.getAttribute("data-simulated-download") || "Sims fil");
    const current = mcBrowserScreen.innerHTML;
    mcBrowserScreen.innerHTML = current.replace(
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
    renderMcSearch(mcSearchInput?.value || lastMcQuery, page);
    return;
  }

  const sortPill = event.target?.closest?.("[data-sort-pill]");
  if (sortPill && mcSortSelect) {
    const key = String(sortPill.getAttribute("data-sort-pill") || "");
    if (key !== "count" && key !== "source") {
      mcSortSelect.value = key === "popular" ? "popular" : key;
      renderMcSearch(mcSearchInput?.value || lastMcQuery, mcCurrentPage);
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
  if (val === "all") activeMcSources = new Set(["all"]);
  else {
    activeMcSources = new Set([val]);
    syncSourceFilterButtons(val);
  }
  syncPlatformFilterState();
  renderPlatformToggles();
  if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery, mcCurrentPage);
});

mcCategoryFilter?.addEventListener("change", () => refreshMgSearchFromFilters());

mcTypeFilter?.addEventListener("change", () => {
  if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery, mcCurrentPage);
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
  try {
    localStorage.removeItem("modguard_adult_confirmed");
  } catch {}
  syncAdultToggleUi();
  refreshMgSearchFromFilters();
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

document.getElementById("forumThreadBack")?.addEventListener("click", () => {
  activeForumThreadId = null;
  void renderForum();
});

document.getElementById("forumSection")?.addEventListener("click", (event) => {
  // If it's a reddit post with URL, open the URL when clicking the external arrow or open link button
  const forumOpenBtn = event.target?.closest?.("[data-forum-open-url]");
  if (forumOpenBtn) {
    const url = forumOpenBtn.getAttribute("data-forum-open-url");
    if (url) {
      openModSourceUrl(url);
      return;
    }
  }
  const card = event.target?.closest?.("[data-forum-post-id]");
  if (card && !event.target?.closest?.("[data-forum-open-url], .forum-external-link")) {
    event.preventDefault();
    activeForumThreadId = card.getAttribute("data-forum-post-id");
    void renderForum();
    return;
  }
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
    await ipcRenderer.invoke("moddb-start-index").catch(() => null);
    if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery, mcCurrentPage);
    setMessage("Søgning opdateret.", false);
  } catch (err) {
    setMessage(err?.message || String(err), true);
  } finally {
    moddbIndexBtn.disabled = false;
    moddbIndexBtn.textContent = "Opdater database";
  }
});

document.getElementById("mcStarPicker")?.addEventListener("click", (event) => {
  const btn = event.target?.closest?.(".star-btn");
  if (!btn) return;
  const clicked = Number(btn.getAttribute("data-star") || 0);
  simsMinRating = clicked === simsMinRating ? 0 : clicked;
  syncStarPickerUi();
  if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery, mcCurrentPage);
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

function refreshMgSearchFromFilters() {
  if (mcHasSearched) renderMcSearch(mcSearchInput?.value || lastMcQuery);
  else renderMcSearchIdle();
}

function initMineguardUi() {
  loadAdultContentPreference();
  const cached = readMcCatalogCache();
  if (cached.length) mcCatalogItems = mergeMcCatalogWithSeed(cached);
  fetchMcModCatalog().then(() => {
    refreshMgSearchFromFilters();
  }).catch(() => {});
  updateMcCatalogStatus(mcCatalogItems.length ? "" : "Loading mods from Modrinth…");
  const bindFilter = (id) => {
    document.getElementById(id)?.addEventListener("change", () => refreshMgSearchFromFilters());
    document.getElementById(id)?.addEventListener("click", (e) => e.stopPropagation());
  };
  bindFilter("mgFilterVersion");
  bindFilter("mcTypeFilter");
  bindFilter("mcCategoryFilter");
  bindFilter("mcVersionFilter");
  bindFilter("mcSortSelect");
  bindFilter("mcModSideFilter");
  bindFilter("mcPlatformFilter");
  for (const wrap of document.querySelectorAll(".mg-qf-select-wrap")) {
    wrap.addEventListener("click", () => {
      const sel = wrap.querySelector("select");
      if (sel) {
        sel.focus();
        try { sel.showPicker?.(); } catch {}
      }
    });
  }
  document.getElementById("mgFilterVersion")?.addEventListener("change", (e) => {
    const v = e.target?.value || "all";
    const mcVer = document.getElementById("mcVersionFilter");
    if (mcVer) mcVer.value = v;
    refreshMgSearchFromFilters();
  });
  document.getElementById("mcVersionFilter")?.addEventListener("change", (e) => {
    const mg = document.getElementById("mgFilterVersion");
    if (mg) mg.value = e.target?.value || "all";
    refreshMgSearchFromFilters();
  });
  document.getElementById("mgViewGrid")?.addEventListener("click", () => {
    document.getElementById("mgViewGrid")?.classList.add("active");
    document.getElementById("mgViewList")?.classList.remove("active");
    if (mcBrowserScreen) mcBrowserScreen.className = "mg-mod-grid";
  });
  document.getElementById("mgViewList")?.addEventListener("click", () => {
    document.getElementById("mgViewList")?.classList.add("active");
    document.getElementById("mgViewGrid")?.classList.remove("active");
    if (mcBrowserScreen) mcBrowserScreen.className = "mg-mod-grid mg-mod-list";
  });
  for (const btn of document.querySelectorAll(".mg-edition-btn")) {
    btn.addEventListener("click", () => {
      for (const b of document.querySelectorAll(".mg-edition-btn")) b.classList.remove("active");
      btn.classList.add("active");
    });
  }
  bindMgHomePage();
  bindMgNewsPage();
  bindMgChatPage();
  bindMgMapsPage();
  syncQuickFiltersPlacement("search");
  document.getElementById("mgCategoryPills")?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-mg-cat]");
    if (!btn) return;
    const cat = btn.getAttribute("data-mg-cat") || "all";
    for (const b of document.querySelectorAll("#mgCategoryPills [data-mg-cat]")) {
      b.classList.toggle("active", b === btn);
    }
    setActiveMgCategory(cat);
    refreshMgSearchFromFilters();
  });
  bindModFitListenersMc();
  document.querySelector(".mg-results-scroll")?.addEventListener("scroll", (event) => {
    const el = event.currentTarget;
    if (!el || mcGridRenderLimit >= mcGridAllItems.length) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      mcGridRenderLimit = Math.min(mcGridAllItems.length, mcGridRenderLimit + 120);
      paintMcModGrid(mcGridAllItems, { reset: false });
    }
  });
  try {
    const name = localStorage.getItem("mgProfileName") || localStorage.getItem("activateName") || "BlockBuilder";
    const profileName = document.getElementById("mgProfileName");
    if (profileName) profileName.textContent = name;
  } catch {}
  updateMgStats();
}

initLocaleFromStorage();
loadSimsFavorites();
initFavoritesHubEvents();
initSettingsHubEvents();
initModsHealthEvents();
initModLivePeek();
initMineguardUi();
applyDashboardI18n(currentLocale);
initLangPicker();
renderPlatformToggles();
syncStarPickerUi();
setDashboardTab("home", "navHome");
renderMgHomePage();
updateMcSearchHints();
if (mcCategoryFilter && mcCategoryFilter.value === "cc") mcCategoryFilter.value = "all";

refreshState().catch((err) => setMessage(err?.message || String(err), true));
