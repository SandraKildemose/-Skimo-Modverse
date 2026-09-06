/* 16 FAQ-fliser (4×4) — da + en; sv/no/fr falder tilbage til en */
(function () {
	const da = [
		{ t: 'Hvad er ModGuard?', s: 'Overblik', b: '<p><strong>ModGuard</strong> er Skimos lag omkring mods og downloads: du får viden og kontrol, før filer kører.</p><p>Brug guiden for installation og denne FAQ for hurtige svar.</p>' },
		{ t: 'Installation', s: 'Download og zip', b: '<p>Hent zip, åbn den og flyt appen til <strong>Programmer</strong> på Mac eller tilsvarende på Windows.</p><p>Se også <strong>install.html</strong> for build og enhedsgrænser.</p>' },
		{ t: 'Abonnement og kode', s: 'Aktivering', b: '<p>Koden fra købet indtastes på abonnement-siden og knytter ModGuard til dine produkter og enheder.</p><p>Under <strong>Abonnementer</strong> kan du følge status og fornyelse.</p>' },
		{ t: 'Kontakt support', s: 'Hjælp', b: '<p>Fejl i kode, app der ikke starter eller andet — skriv via <strong>Kontakt</strong> med platform og hvad du har prøvet.</p>' },
		{ t: 'Sikre downloads', s: 'Før du kører', b: '<p>Hent kun fra kilder du stoler på, og lad ModGuard køre før du pakker mods ud i spilmappen.</p><p>Vær skeptisk over for “et klik”-installere og reklame med gratis premium.</p>' },
		{ t: 'Fake mods og repacks', s: 'Svindel', b: '<p>Populære packs kopieres ofte med malware. Tjek filstørrelse, udgiver og checksum hvis du kan.</p><p>ModGuard hjælper med at flagge mistænkelige filer tidligt.</p>' },
		{ t: 'Antivirus og ModGuard', s: 'Sammen', b: '<p>ModGuard er et supplement: det fokuserer på mod-pipeline og filadfærd omkring dine spil.</p><p>Hold også OS og antivirus opdateret for bedste beskyttelse.</p>' },
		{ t: 'Familie og enheder', s: 'Deling', b: '<p>Abonnementet følger de enheder du har købt. Del ikke koder offentligt — de kan misbruges.</p><p>Brug kontakt hvis du skal flytte enheder mellem familiemedlemmer.</p>' },
		{ t: 'Roblox og executors', s: 'Risiko', b: '<p>Executors og “gratis Robux”-værktøj er ofte scams eller malware. Installer ikke ukendte .exe fra chat.</p><p>ModGuard understøtter en mere forsigtig tilgang til downloads.</p>' },
		{ t: 'Minecraft modpacks', s: 'Packs', b: '<p>Store modpacks er attraktive for repackere. Sammenlign med officielle kilder som CurseForge/Modrinth når du kan.</p><p>Scan før du lægger nye JAR-filer i mods-mappen.</p>' },
		{ t: 'The Sims 4 og CC', s: 'Mods-mappe', b: '<p>CC og script mods lægges i <strong>Mods</strong>. Usynlige .exe i en “CC”-zip er et rødt flag.</p><p>Hold Mods-mappen ryddelig og tag backup af saves.</p>' },
		{ t: 'Opdateringer', s: 'Version', b: '<p>Opdater Skimo/ModGuard når der kommer nye builds — sikkerhedsregler og signaturer forbedres løbende.</p><p>Tjek download-siden eller mail fra os.</p>' },
		{ t: 'Fejlfinding af scanning', s: 'Scan', b: '<p>Hvis scanningen hænger: tjek diskplads, genstart appen og prøv en mindre mappe først.</p><p>Kontakt os med log eller skærmbillede hvis det gentager sig.</p>' },
		{ t: 'Privatliv og data', s: 'Data', b: '<p>Vi behandler kun det, der er nødvendigt for produktet og support — se privatlivspolitik på siden.</p><p>Del aldrig kode eller personlige oplysninger i offentlige tråde.</p>' },
		{ t: 'Ny bruger — start her', s: 'Trin 1', b: '<p>Læs kort FAQ her, åbn <strong>Guiden</strong> for billeder, og hent derefter ModGuard.</p><p>Tag det roligt: ét trin ad gangen.</p>' },
		{ t: 'Tredjeparts mods', s: 'Risiko', b: '<p>Mods er tredjepartskode uden garanti. Du vælger selv at installere — ModGuard giver ekstra gennemsigtighed.</p><p>Ved tvivl: vent med at køre filen og spørg i support.</p>' }
	];
	const en = [
		{ t: 'What is ModGuard?', s: 'Overview', b: '<p><strong>ModGuard</strong> is Skimo’s layer around mods and downloads: you get context and control before files run.</p><p>Use the Guide for install steps and this FAQ for quick answers.</p>' },
		{ t: 'Installation', s: 'Zip and app', b: '<p>Open the zip and install the app the way you normally do on <strong>Mac</strong> or <strong>Windows</strong>.</p><p>See <strong>install.html</strong> for builds and device limits.</p>' },
		{ t: 'Subscription and code', s: 'Activation', b: '<p>Your purchase code is entered on the subscriptions page and ties ModGuard to your products and devices.</p><p>Manage renewal under <strong>Subscriptions</strong>.</p>' },
		{ t: 'Contact support', s: 'Help', b: '<p>Code errors, app not starting — use <strong>Contact</strong> with your platform and what you already tried.</p>' },
		{ t: 'Safer downloads', s: 'Before you run', b: '<p>Download from sources you trust and let ModGuard run before unpacking mods into game folders.</p><p>Be wary of “one-click” installers and ads for free premium.</p>' },
		{ t: 'Fake mods and repacks', s: 'Scams', b: '<p>Popular packs are often re-uploaded with malware. Compare size, publisher and checksum when possible.</p><p>ModGuard helps flag suspicious files early.</p>' },
		{ t: 'Antivirus and ModGuard', s: 'Together', b: '<p>ModGuard complements antivirus with a focus on the mod pipeline around your games.</p><p>Keep OS and AV updated too.</p>' },
		{ t: 'Family and devices', s: 'Sharing', b: '<p>Your plan covers the devices you bought. Do not post codes publicly — they can be abused.</p><p>Contact us if you need to move devices within a household.</p>' },
		{ t: 'Roblox and executors', s: 'Risk', b: '<p>Executors and “free Robux” tools are often scams or malware. Avoid unknown .exe from chat.</p><p>ModGuard encourages safer download habits.</p>' },
		{ t: 'Minecraft modpacks', s: 'Packs', b: '<p>Large packs attract repackers. Prefer official sources like CurseForge/Modrinth when you can.</p><p>Scan before dropping new JARs into the mods folder.</p>' },
		{ t: 'The Sims 4 and CC', s: 'Mods folder', b: '<p>CC and scripts live in <strong>Mods</strong>. Hidden .exe inside a “CC” zip is a red flag.</p><p>Keep the folder tidy and back up saves.</p>' },
		{ t: 'Updates', s: 'Version', b: '<p>Update Skimo/ModGuard when new builds ship — rules and signatures improve over time.</p><p>Check the download page or email from us.</p>' },
		{ t: 'Scan troubleshooting', s: 'Scan', b: '<p>If a scan hangs: check disk space, restart the app, try a smaller folder first.</p><p>Contact us with a screenshot if it keeps happening.</p>' },
		{ t: 'Privacy and data', s: 'Data', b: '<p>We only process what the product and support need — see the privacy policy on the site.</p><p>Never share codes or personal data in public threads.</p>' },
		{ t: 'New user — start here', s: 'Step 1', b: '<p>Skim this FAQ, open the <strong>Guide</strong> for visuals, then download ModGuard.</p><p>One step at a time.</p>' },
		{ t: 'Third-party mods', s: 'Risk', b: '<p>Mods are third-party code without a warranty. You choose to install — ModGuard adds transparency.</p><p>If unsure, do not run the file and ask support.</p>' }
	];
	window.SkimoFaqTilePack = { da, en, sv: en, no: en, fr: en };
})();
