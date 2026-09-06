(function () {
    const robotSvg = [
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
        '<rect x="5" y="7" width="14" height="11" rx="3" fill="currentColor" opacity="0.18"></rect>',
        '<path d="M12 3.5v3M9 3.5h6M8 8.5h8a2.5 2.5 0 0 1 2.5 2.5v4A2.5 2.5 0 0 1 16 17.5H8A2.5 2.5 0 0 1 5.5 15v-4A2.5 2.5 0 0 1 8 8.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>',
        '<circle cx="10" cy="12.5" r="1.1" fill="currentColor"></circle>',
        '<circle cx="14" cy="12.5" r="1.1" fill="currentColor"></circle>',
        '<path d="M9.5 15.2c.7.5 1.5.8 2.5.8s1.8-.3 2.5-.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>',
        '</svg>'
    ].join('');

    const PHONE_DISPLAY = '+45 61 31 41 53';
    const PHONE_TEL = '+4561314153';
    const EMAIL = 'skimo.sec@hotmail.com';
    const HOURS_DA = 'mandag–fredag kl. 9–17 (CET)';
    const HOURS_EN = 'Monday–Friday, 9am–5pm CET';

    const copy = {
        da: {
            openLabel: 'Åbn chatbot',
            title: 'Chatbot',
            subtitle: 'Skriv bare herunder.',
            placeholder: 'Skriv dit spørgsmål…',
            send: 'Send',
            close: 'Luk',
            greeting: 'Hej, har du et spørgsmål? Spørg løs.',
            languageSwitch: {
                askMismatch:
                    'Det lyder som om du skriver på {{name}}. Vil du skifte denne chat til {{name}}? Skriv **ja** eller **nej**.',
                askExplicit: 'Vil du skifte denne chat til {{name}}? Skriv **ja** eller **nej**.',
                switched: 'Sådan — chatten er nu på dansk.',
                cancelled: 'Okay — vi bliver ved det sprog, du allerede bruger.',
                remind: 'Skriv bare **ja** eller **nej**.',
                already: 'Chatten er allerede på {{name}}.'
            },
            answers: {
                contact:
                    'Du må meget gerne ringe på <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> — vi er her ' +
                    HOURS_DA +
                    '. Du kan også skrive til <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>. ' +
                    'Ellers kan du gå ind på siden <a href="contact.html">Kontakt</a> og trykke på kontaktfeltet dér, så har du det hele samlet.',
                phone:
                    'Du kan ringe til os på <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>. Vi sidder klar ' +
                    HOURS_DA +
                    '. Hvis du hellere vil skrive eller se flere muligheder, så smut forbi <a href="contact.html">Kontakt</a> på siden.',
                subscription:
                    'På <a href="abonnement.html">Abonnement</a> vælger du, hvilke spil du vil have beskyttelse til. ' +
                    'Når du har valgt, kan du følge vejen videre til download og installation. ' +
                    'Er du i tvivl om noget undervejs, er du altid velkommen til at skrive her eller bruge <a href="contact.html">Kontakt</a>.',
                minecraft:
                    'Minecraft er med lige nu. ModGuard er med til at passe på dig, når du henter mods og filer — på en måde, så det føles tryggere i hverdagen. ' +
                    'Du kan vælge det på <a href="abonnement.html?focusProduct=minecraft-player">abonnementssiden for Minecraft</a>. ' +
                    'Trin til at komme i gang finder du i <a href="guide.html">guiden</a>.',
                sims:
                    'Sims er med lige nu. ModGuard hjælper dig med at holde custom content og downloads lidt mere overskuelige og trygge. ' +
                    'Vælg det på <a href="abonnement.html?focusProduct=sims">abonnement for Sims</a>. ' +
                    'Har du brug for at se, hvordan du kommer i gang, kig i <a href="guide.html">guiden</a>.',
                release:
                    'GTA, Fallout, Stardew Valley, Baldur\'s Gate 3, Cities: Skylines og Skyrim står som “kommer snart”. Vi har ikke en dato at dele endnu — men du må gerne spørge igen senere eller skrive via <a href="contact.html">Kontakt</a>.',
                games:
                    'Lige nu er Minecraft og Sims klar. De andre spil på listen kommer, vi ved bare ikke præcis hvornår endnu. ' +
                    'Vælg det, du vil have, på <a href="abonnement.html">Abonnement</a>.',
                refund:
                    'Hvis noget driller med installationen, så skriv endelig til os på <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> eller ring på <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>. ' +
                    'Fortæl kort hvad der skete — vi kigger på det og finder en løsning. Ved fejl kan tilbagebetaling også vurderes.',
                parents:
                    'Mange forældre vil gerne vide, at børnene ikke bare henter “noget fra nettet” uden omtanke. ModGuard er tænkt som en ekstra ven i baggrunden, der hjælper med at fange det, der ser forkert ud, før det når ind på computeren — uden at det skal føles teknisk eller tungt.',
                guide:
                    'Hvis du vil have det hele i rolige trin med billeder, så er <a href="guide.html">guiden</a> et godt sted at starte. ' +
                    'Den viser vej fra du har valgt beskyttelse, til du er kørende.',
                installflow:
                    'Når du har valgt beskyttelse på <a href="abonnement.html">Abonnement</a>, kommer du videre gennem en kort loading og så til <a href="install.html">install-siden</a>, hvor du vælger styresystem og henter din fil. ' +
                    'Spørg endelig hvis et trin driller.',
                modguard:
                    'ModGuard er Skimos måde at hjælpe dig på, når du modder eller henter ting til dit spil. ' +
                    'Kort sagt: den prøver at være der, før noget mærkeligt lander på computeren — den kigger efter det, der ofte skaber problemer, og giver dig et puf i den rigtige retning. ' +
                    'Du behøver ikke forstå alt bagved; det vigtigste er, at det føles tryggere i hverdagen. ' +
                    'Læs mere i ro og mag på forsiden og i <a href="guide.html">guiden</a>.',
                safety:
                    'Vi ved godt, at det kan være svært at vide, hvad man tør hente. ModGuard er med til at gøre det lidt lettere at sove trygt — den hjælper med at fange ting, der ikke ser rigtige ud, før du åbner dem. ' +
                    'Det erstatter ikke sund fornuft, men den er en ekstra hånd på ryggen.',
                home:
                    'Forsiden er dit udgangspunkt — der kan du se spillene, læse om Skimo og finde vej videre. Tryk på “Hjem” i menuen eller på Skimo-logoet øverst for at komme tilbage til <a href="index.html">forsiden</a>.',
                default:
                    'Det kan jeg godt forstå du spørger om. Jeg har ikke et færdigt svar på lige præcis det her i chatten — men du kan altid skrive til <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>, ringe på <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> (' +
                    HOURS_DA +
                    '), eller gå til <a href="contact.html">Kontakt</a> på siden. Så hjælper vi dig videre med et smil.'
            }
        },
        en: {
            openLabel: 'Open chatbot',
            title: 'Chatbot',
            subtitle: 'Just type below.',
            placeholder: 'Type your question…',
            send: 'Send',
            close: 'Close',
            greeting: 'Hi — got a question? Go ahead and ask.',
            languageSwitch: {
                askMismatch:
                    'It sounds like you’re writing in {{name}}. Do you want to switch this chat to {{name}}? Type **yes** or **no**.',
                askExplicit: 'Do you want to switch this chat to {{name}}? Type **yes** or **no**.',
                switched: 'Done — this chat is now in English.',
                cancelled: 'Okay — we’ll stay on the language you’re using now.',
                remind: 'Just reply **yes** or **no**.',
                already: 'This chat is already in {{name}}.'
            },
            answers: {
                contact:
                    'You can call us on <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> — we’re here ' +
                    HOURS_EN +
                    '. You can also email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>. ' +
                    'Or open the <a href="contact.html">Contact</a> page and use the contact options there.',
                phone:
                    'Sure — you can reach us at <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>. We’re available ' +
                    HOURS_EN +
                    '. If you prefer to write or see everything in one place, head to <a href="contact.html">Contact</a>.',
                subscription:
                    'On <a href="abonnement.html">Subscriptions</a> you pick which games you want protection for, then follow the steps to download and install. ' +
                    'If anything feels confusing, message us here or use <a href="contact.html">Contact</a>.',
                minecraft:
                    'Minecraft is available now. ModGuard is there to make modding and downloads feel a bit safer day to day — without you needing to be an expert. ' +
                    'Choose it on the <a href="abonnement.html?focusProduct=minecraft-player">Minecraft subscription</a> page. ' +
                    'For step-by-step help, see the <a href="guide.html">guide</a>.',
                sims:
                    'The Sims is available now. ModGuard helps keep custom content and downloads a little calmer and safer. ' +
                    'Pick it on the <a href="abonnement.html?focusProduct=sims">Sims subscription</a> page. ' +
                    'The <a href="guide.html">guide</a> walks you through getting started.',
                release:
                    'GTA, Fallout, Stardew Valley, Baldur\'s Gate 3, Cities: Skylines and Skyrim are listed as coming soon. We don’t have a date to share yet — you’re welcome to ask again later or write via <a href="contact.html">Contact</a>.',
                games:
                    'Right now Minecraft and The Sims are ready. The other games on the list are on the way; we don’t know exact timing yet. ' +
                    'Choose what you need on <a href="abonnement.html">Subscriptions</a>.',
                refund:
                    'If something goes wrong with installation, email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> or call <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> and tell us briefly what happened — we’ll help sort it out, and refunds can be looked at if there’s a real issue.',
                parents:
                    'A lot of parents worry about what kids download. ModGuard is meant to be a quiet helper in the background — it flags stuff that doesn’t look right before it gets opened, in a simple, non-scary way. No need to dive into technical detail.',
                guide:
                    'For calm, step-by-step help with pictures, the <a href="guide.html">guide</a> is the friendliest place to start.',
                installflow:
                    'After you choose protection on <a href="abonnement.html">Subscriptions</a>, you’ll go through a short loading screen and then the <a href="install.html">install page</a> where you pick your system and download your file. Shout if a step sticks.',
                modguard:
                    'ModGuard is Skimo’s way of looking out for you when you mod or download things for your game. In plain words: it tries to catch the sketchy stuff before it lands on your computer, and nudges you in a safer direction. ' +
                    'You don’t need to understand how every part works — the point is that everyday gaming feels a bit safer. ' +
                    'The front page and <a href="guide.html">guide</a> tell the story in more detail, still without jargon.',
                safety:
                    'Downloading mods can feel like a guessing game. ModGuard helps by spotting things that don’t look right before you open them — an extra bit of peace of mind, not a lecture.',
                home:
                    'The front page is home base — games, about Skimo, and where to go next. Use “Home” in the menu or tap the Skimo logo up top to return to <a href="index.html">the front page</a>.',
                default:
                    'Good question — I don’t have a perfect ready-made answer for that in this little chat. Email <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>, call <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> (' +
                    HOURS_EN +
                    '), or visit <a href="contact.html">Contact</a> on the site and we’ll help you properly.'
            }
        },
        sv: {
            openLabel: 'Öppna chatbot',
            title: 'Chatbot',
            subtitle: 'Skriv bara här nedanför.',
            placeholder: 'Skriv din fråga…',
            send: 'Skicka',
            close: 'Stäng',
            greeting: 'Hej — har du en fråga? Kör bara på.',
            languageSwitch: {
                askMismatch:
                    'Det låter som att du skriver på {{name}}. Vill du byta den här chatten till {{name}}? Skriv **ja** eller **nej**.',
                askExplicit: 'Vill du byta den här chatten till {{name}}? Skriv **ja** eller **nej**.',
                switched: 'Klart — chatten är nu på svenska.',
                cancelled: 'Okej — vi fortsätter på det språk du använder nu.',
                remind: 'Svara bara **ja** eller **nej**.',
                already: 'Chatten är redan på {{name}}.'
            },
            answers: {
                contact:
                    'Du får gärna ringa <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> — vi finns här måndag–fredag 9–17 (CET). ' +
                    'Du kan också mejla <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>. ' +
                    'Annars gå till sidan <a href="contact.html">Kontakt</a> och använd kontaktvägarna där.',
                phone:
                    'Ring oss gärna på <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>. Vi är tillgängliga måndag–fredag 9–17 CET. ' +
                    'Vill du hellre skriva eller se allt samlat finns <a href="contact.html">Kontakt</a>.',
                subscription:
                    'På <a href="abonnement.html">Abonnemang</a> väljer du vilka spel du vill ha skydd för och följer sedan stegen för nedladdning och installation. ' +
                    'Om något känns otydligt — skriv här eller använd <a href="contact.html">Kontakt</a>.',
                minecraft:
                    'Minecraft finns med nu. ModGuard finns där för att moddning och nedladdningar ska kännas lite tryggare i vardagen — utan krångel. ' +
                    'Välj på <a href="abonnement.html?focusProduct=minecraft-player">Minecraft-abonnemanget</a>. ' +
                    'Steg-för-steg finns i <a href="guide.html">guiden</a>.',
                sims:
                    'Sims finns med nu. ModGuard hjälper till med custom content och nedladdningar på ett enklare, tryggare sätt. ' +
                    'Välj på <a href="abonnement.html?focusProduct=sims">Sims-abonnemanget</a>. ' +
                    'Se <a href="guide.html">guiden</a> för att komma igång.',
                release:
                    'GTA, Fallout, Stardew Valley, Baldur\'s Gate 3, Cities: Skylines och Skyrim är “kommer snart”. Vi har inget datum ännu — fråga gärna senare eller skriv via <a href="contact.html">Kontakt</a>.',
                games:
                    'Just nu är Minecraft och Sims klara. Övriga spel kommer, vi vet inte exakt när än. ' +
                    'Välj på <a href="abonnement.html">Abonnemang</a>.',
                refund:
                    'Om installationen strular — mejla <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> eller ring <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> och berätta kort vad som hände. Vi hjälper dig vidare; vid fel kan återbetalning ses över.',
                parents:
                    'Många föräldrar vill veta att barnen inte laddar ner “vad som helst”. ModGuard är tänkt som en lugn hjälpare i bakgrunden som reagerar om något ser fel ut — utan tekniskt språk.',
                guide:
                    'Vill du ha lugna steg med bilder är <a href="guide.html">guiden</a> bästa stället.',
                installflow:
                    'Efter du valt skydd på <a href="abonnement.html">Abonnemang</a> kommer en kort laddning och sedan <a href="install.html">installationsidan</a> där du väljer system och laddar ner filen. Hoj om något fastnar.',
                modguard:
                    'ModGuard är Skimos sätt att hjälpa dig när du moddar eller laddar ner saker till spelet. Enkelt sagt: den försöker fånga det som ser riskabelt ut innan det hamnar på datorn — utan att du behöver vara expert. ' +
                    'Läs mer i lugn och ro på startsidan och i <a href="guide.html">guiden</a>.',
                safety:
                    'Det kan vara svårt att veta vad man vågar ladda ner. ModGuard ger ett extra lager trygghet innan du öppnar filer — utan att det känns krångligt.',
                home:
                    'Startsidan är navet — spel, om Skimo och vägar vidare. Använd “Hem” i menyn eller Skimo-loggan uppe till vänster för att gå till <a href="index.html">startsidan</a>.',
                default:
                    'Bra fråga — jag har inget färdigt svar på precis det här i chatten. Mejla <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>, ring <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> (mån–fre 9–17 CET) eller gå till <a href="contact.html">Kontakt</a> så hjälper vi dig.'
            }
        },
        no: {
            openLabel: 'Åpne chatbot',
            title: 'Chatbot',
            subtitle: 'Skriv bare her under.',
            placeholder: 'Skriv spørsmålet ditt…',
            send: 'Send',
            close: 'Lukk',
            greeting: 'Hei — har du et spørsmål? Bare spør i vei.',
            languageSwitch: {
                askMismatch:
                    'Det høres ut som du skriver på {{name}}. Vil du bytte denne chatten til {{name}}? Skriv **ja** eller **nei**.',
                askExplicit: 'Vil du bytte denne chatten til {{name}}? Skriv **ja** eller **nei**.',
                switched: 'Ferdig — chatten er nå på norsk.',
                cancelled: 'Greit — vi fortsetter på språket du bruker nå.',
                remind: 'Svar bare **ja** eller **nei**.',
                already: 'Chatten er allerede på {{name}}.'
            },
            answers: {
                contact:
                    'Du kan ringe oss på <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> — vi er her mandag–fredag kl. 9–17 (CET). ' +
                    'Du kan også sende e-post til <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>. ' +
                    'Ellers: gå til siden <a href="contact.html">Kontakt</a> og bruk kontaktmulighetene der.',
                phone:
                    'Ring gjerne <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>. Vi er tilgjengelige mandag–fredag 9–17 CET. ' +
                    'Vil du heller skrive eller se alt samlet, finner du <a href="contact.html">Kontakt</a>.',
                subscription:
                    'På <a href="abonnement.html">Abonnement</a> velger du hvilke spill du vil ha beskyttelse for, og følger så stegene for nedlasting og installasjon. ' +
                    'Er du usikker, skriv her eller bruk <a href="contact.html">Kontakt</a>.',
                minecraft:
                    'Minecraft er med nå. ModGuard er med for at modding og nedlastinger skal føles litt tryggere i hverdagen — uten at du må være teknisk. ' +
                    'Velg på <a href="abonnement.html?focusProduct=minecraft-player">Minecraft-abonnementet</a>. ' +
                    'Steg-for-steg finner du i <a href="guide.html">guiden</a>.',
                sims:
                    'Sims er med nå. ModGuard hjelper med custom content og nedlastinger på en enklere, tryggere måte. ' +
                    'Velg på <a href="abonnement.html?focusProduct=sims">Sims-abonnementet</a>. ' +
                    'Se <a href="guide.html">guiden</a> for å komme i gang.',
                release:
                    'GTA, Fallout, Stardew Valley, Baldur\'s Gate 3, Cities: Skylines og Skyrim står som «kommer snart». Vi har ikke dato ennå — spør gjerne senere eller skriv via <a href="contact.html">Kontakt</a>.',
                games:
                    'Akkurat nå er Minecraft og Sims klare. De andre spillene kommer; vi vet ikke nøyaktig når ennå. ' +
                    'Velg på <a href="abonnement.html">Abonnement</a>.',
                refund:
                    'Hvis installasjonen krangler — send e-post til <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> eller ring <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> og fortell kort hva som skjedde. Vi hjelper deg; ved feil kan refusjon vurderes.',
                parents:
                    'Mange foreldre vil vite at barna ikke laster ned «hva som helst». ModGuard er tenkt som en rolig hjelper i bakgrunnen som reagerer hvis noe ser feil ut — uten tungt fagspråk.',
                guide:
                    'Vil du ha rolige steg med bilder, er <a href="guide.html">guiden</a> et fint sted å starte.',
                installflow:
                    'Etter du har valgt beskyttelse på <a href="abonnement.html">Abonnement</a>, kommer en kort lasting og så <a href="install.html">installasjonssiden</a> der du velger system og laster ned filen. Si fra hvis du står fast.',
                modguard:
                    'ModGuard er Skimos måte å passe på deg når du modder eller laster ned ting til spillet. Enkelt forklart: den prøver å fange det som virker risabelt før det lander på maskinen — uten at du må skjønne alt som skjer under panseret. ' +
                    'Les mer i ro og mak på forsiden og i <a href="guide.html">guiden</a>.',
                safety:
                    'Det er ikke alltid lett å vite hva man tør laste ned. ModGuard gir et ekstra lag med trygghet før du åpner filer — uten at det føles komplisert.',
                home:
                    'Forsiden er utgangspunktet — spill, om Skimo og veier videre. Bruk «Hjem» i menyen eller Skimo-logoen øverst for å gå til <a href="index.html">forsiden</a>.',
                default:
                    'Godt spørsmål — jeg har ikke et ferdig svar på akkurat det i denne chatten. Send e-post til <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>, ring <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> (man–fre 9–17 CET), eller gå til <a href="contact.html">Kontakt</a>, så hjelper vi deg videre.'
            }
        },
        fr: {
            openLabel: 'Ouvrir le chatbot',
            title: 'Chatbot',
            subtitle: 'Écrivez simplement ci-dessous.',
            placeholder: 'Posez votre question…',
            send: 'Envoyer',
            close: 'Fermer',
            greeting: 'Salut — une question ? Vas-y, écris-la.',
            languageSwitch: {
                askMismatch:
                    'On dirait que tu écris en {{name}}. Tu veux passer ce chat en {{name}} ? Réponds **oui** ou **non**.',
                askExplicit: 'Tu veux passer ce chat en {{name}} ? Réponds **oui** ou **non**.',
                switched: 'C’est bon — ce chat est maintenant en français.',
                cancelled: 'D’accord — on reste sur la langue actuelle.',
                remind: 'Réponds simplement **oui** ou **non**.',
                already: 'Ce chat est déjà en {{name}}.'
            },
            answers: {
                contact:
                    'Tu peux nous appeler au <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> — nous sommes là du lundi au vendredi, 9h–17h (CET). ' +
                    'Tu peux aussi écrire à <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>. ' +
                    'Sinon, ouvre la page <a href="contact.html">Contact</a> sur le site et utilise les moyens de contact.',
                phone:
                    'Oui — le numéro, c’est <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>. Disponible du lundi au vendredi, 9h–17h CET. ' +
                    'Pour tout voir au même endroit : page <a href="contact.html">Contact</a>.',
                subscription:
                    'Sur <a href="abonnement.html">Abonnements</a>, tu choisis les jeux que tu veux protéger, puis tu suis les étapes pour télécharger et installer. ' +
                    'Si un truc bloque, écris ici ou passe par <a href="contact.html">Contact</a>.',
                minecraft:
                    'Minecraft est dispo maintenant. ModGuard est là pour rendre mods et téléchargements un peu plus rassurants au quotidien — sans jargon. ' +
                    'Choisis sur la page <a href="abonnement.html?focusProduct=minecraft-player">abonnement Minecraft</a>. ' +
                    'Le <a href="guide.html">guide</a> explique les étapes calmement.',
                sims:
                    'Les Sims sont dispo maintenant. ModGuard aide pour le contenu personnalisé et les téléchargements, de façon plus simple. ' +
                    'C’est sur la page <a href="abonnement.html?focusProduct=sims">abonnement Sims</a>. ' +
                    'Le <a href="guide.html">guide</a> aide à démarrer.',
                release:
                    'GTA, Fallout, Stardew Valley, Baldur\'s Gate 3, Cities: Skylines et Skyrim sont « bientôt ». On n’a pas de date — tu peux repasser plus tard ou écrire via <a href="contact.html">Contact</a>.',
                games:
                    'Pour l’instant Minecraft et Les Sims sont prêts. Les autres arrivent, sans date précise. ' +
                    'Choisis sur <a href="abonnement.html">Abonnements</a>.',
                refund:
                    'Si l’installation coince, écris à <a href="mailto:' + EMAIL + '">' + EMAIL + '</a> ou appelle le <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> en expliquant vite fait — on t’aide, et un remboursement peut être regardé en cas de souci.',
                parents:
                    'Beaucoup de parents veulent que ce soit moins “au hasard” quand les enfants téléchargent. ModGuard, c’est une petite aide discrète qui signale ce qui a l’air louche avant l’ouverture — sans blabla technique.',
                guide:
                    'Pour des étapes douces avec des images, le <a href="guide.html">guide</a> est le meilleur endroit.',
                installflow:
                    'Après avoir choisi ta protection sur <a href="abonnement.html">Abonnements</a>, tu passes par un court chargement puis la page <a href="install.html">installation</a> pour choisir ton système et télécharger. Dis-moi si ça bloque.',
                modguard:
                    'ModGuard, c’est la façon de Skimo de veiller sur toi quand tu moddes ou télécharges pour ton jeu. En clair : ça essaie d’attraper ce qui semble risqué avant que ça arrive sur ton PC — sans que tu aies besoin de tout comprendre sous le capot. ' +
                    'La page d’accueil et le <a href="guide.html">guide</a> racontent la suite, toujours simplement.',
                safety:
                    'Télécharger des mods, c’est parfois stressant. ModGuard ajoute une couche de tranquillité avant d’ouvrir les fichiers — sans prise de tête.',
                home:
                    'L’accueil, c’est le point de départ — jeux, présentation, liens utiles. Utilise « Accueil » dans le menu ou le logo Skimo en haut pour revenir à <a href="index.html">l’accueil</a>.',
                default:
                    'Bonne question — je n’ai pas une réponse toute faite pour ça dans ce petit chat. Écris à <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>, appelle le <a href="tel:' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a> (lun–ven 9h–17h CET), ou va sur <a href="contact.html">Contact</a> : on s’occupe de toi.'
            }
        }
    };

    function getLang() {
        let code = 'da';
        if (window.SkimoI18n && typeof window.SkimoI18n.getLanguage === 'function') {
            code = String(window.SkimoI18n.getLanguage() || 'da').toLowerCase();
        } else {
            code = String(document.documentElement.getAttribute('lang') || document.documentElement.lang || 'da').toLowerCase();
        }
        // Siden sætter ofte lang="nb" for norsk — chatbotten bruger nøglen "no".
        if (code === 'nb' || code === 'nn') code = 'no';
        if (!copy[code]) code = 'da';
        return code;
    }

    function currentCopy() {
        return copy[getLang()] || copy.da;
    }

    /** Sprognavn til bekræftelsestekst (UI-sprog → målsprog). */
    const LANG_LABELS = {
        da: { da: 'dansk', en: 'engelsk', sv: 'svensk', no: 'norsk', fr: 'fransk' },
        en: { da: 'Danish', en: 'English', sv: 'Swedish', no: 'Norwegian', fr: 'French' },
        sv: { da: 'danska', en: 'engelska', sv: 'svenska', no: 'norska', fr: 'franska' },
        no: { da: 'dansk', en: 'engelsk', sv: 'svensk', no: 'norsk', fr: 'fransk' },
        fr: { da: 'danois', en: 'anglais', sv: 'suédois', no: 'norvégien', fr: 'français' }
    };

    /** Grov scores for brugerens tekst (til svar + mismatch-tilbud). */
    function scoreUserTextLang(text) {
        const raw = String(text || '').trim();
        const ui = getLang();
        if (!raw) return { bestRaw: ui, max: -1, effective: ui };
        const lower = raw.toLowerCase();
        const scores = { da: 0, en: 0, sv: 0, no: 0, fr: 0 };

        if (/\b(spørgsmål)\b/.test(lower)) scores.da += 4;
        if (/\b(spørsmål)\b/.test(lower)) scores.no += 4;
        if (/\b(och|är|tack|vad|hur|fråga|skicka|måste|också)\b/.test(lower)) scores.sv += 2;
        if (/\b(hej)\b/.test(lower)) {
            scores.da += 1;
            scores.sv += 1;
        }
        if (/\b(hei)\b/.test(lower)) scores.no += 2;
        if (/\b(bare|noget|hvad|vælge|besøge|trykke|abonnement|hente)\b/.test(lower)) scores.da += 2;
        if (/\b(bare|noe|velge|trykke|abonnement|laste)\b/.test(lower)) scores.no += 2;
        if (/[åäö]/i.test(raw) && !/\b(the|what|how|when)\b/.test(lower)) scores.sv += 2;
        if (/[æøå]/i.test(raw) && /[äö]/i.test(raw) === false) {
            scores.da += 1;
            scores.no += 1;
        }
        if (/\b(how|what|when|where|the|you|your|hello|hi|please|can|write|question|contact|call|phone|download|home)\b/.test(lower)) scores.en += 3;
        if (/[éèêëàùçâîôï]/i.test(raw)) scores.fr += 2;
        if (/\b(bonjour|salut|merci|comment|vous|pour|avec|quand|abonnement|télécharger|installer)\b/.test(lower)) scores.fr += 3;

        let bestRaw = 'da';
        let max = -1;
        Object.keys(scores).forEach((k) => {
            if (scores[k] > max) {
                max = scores[k];
                bestRaw = k;
            }
        });
        let effective = bestRaw;
        if (max < 2) effective = ui;
        if (!copy[effective]) effective = ui;
        return { bestRaw: bestRaw, max: max, effective: effective };
    }

    /** Svar på det sprog brugeren skriver på (grovt skøn). */
    function detectLangFromUserText(text) {
        return scoreUserTextLang(text).effective;
    }

    /** Tilbyd skift af hele siden hvis teksten tydeligt er på et andet sprog end UI. */
    function getMismatchTargetLanguage(text) {
        const ui = getLang();
        const { bestRaw, max } = scoreUserTextLang(text);
        const raw = String(text || '').trim();
        if (bestRaw === ui) return null;
        if (max < 3) return null;
        if (!copy[bestRaw]) return null;
        if (raw.length < 10) return null;
        return bestRaw;
    }

    function extractMentionedTargetLang(text) {
        const lower = String(text || '').toLowerCase();
        const hits = [];
        if (/\b(français|francais|fransk|french)\b/.test(lower) || /\ben français\b/.test(lower)) hits.push('fr');
        if (/\b(engelsk|english|engelska|anglais)\b/.test(lower) || /\bin english\b/.test(lower) || /\bpå\s+engelsk\b/.test(lower)) hits.push('en');
        if (/\b(dansk|danish)\b/.test(lower) || /\bpå\s+dansk\b/.test(lower)) hits.push('da');
        if (/\b(svensk|swedish|svenska)\b/.test(lower) || /\bpå\s+svenska\b/.test(lower)) hits.push('sv');
        if (/\b(norsk|norwegian|bokmål|bokmal|nynorsk)\b/.test(lower) || /\bpå\s+norsk\b/.test(lower)) hits.push('no');
        const uniq = [...new Set(hits)];
        if (uniq.length !== 1) return null;
        return uniq[0];
    }

    function hasLanguageSwitchIntent(text) {
        const t = String(text || '').trim();
        const lower = t.toLowerCase();
        if (
            /^(engelsk|english|dansk|danish|svensk|swedish|norsk|norwegian|fransk|french|français|francais|svenska|anglais)\.?$/i.test(t)
        ) {
            return true;
        }
        return /(skift|switch|change|bytt|byt|endre|sett|set|sprog|språk|sprak|language|langue|oversæt|översätt|traduire|traduis|translate|whole\s+site|hele\s+siden|hele\s+nettsiden|all\s+page|toute\s+la\s+page|cette\s+page|på\s+(engelsk|dansk|svenska|svensk|norsk|fransk|français)|in\s+(english|danish|swedish|norwegian|french)|vil\s+(ha|gerne)|jeg\s+vil|i\s+want|je\s+veux|jag\s+vill|jeg\s+ønsker|kan\s+du|could\s+you|kunne\s+du|please\s+(use|switch)|use\s+(english|danish|swedish|norwegian|french)|speak\s+(english|danish|french|swedish|norwegian)|tale\s+engelsk|snakk\s+engelsk|parle(r|z)?\s*(anglais|français|francais)?|changer\s+(de\s+)?langue|byta\s+språk)/i.test(
            lower
        );
    }

    /** Eksplicit ønske om andet sprog — kræver stadig ja i næste trin. */
    function tryExplicitLanguageSwitch(text) {
        const raw = String(text || '').trim();
        const target = extractMentionedTargetLang(raw);
        if (!target) return null;
        if (!hasLanguageSwitchIntent(raw)) {
            if (raw.length > 48) return null;
            if (/(minecraft|sims|modguard|abonnement|subscription|refund|payment|installation)/i.test(raw)) return null;
        }
        return target;
    }

    function isAffirmative(text) {
        const t = String(text || '')
            .trim()
            .replace(/[.!?]+$/g, '')
            .trim()
            .toLowerCase();
        if (!t) return false;
        if (/^(ja|jep|jo|jaha|yes|yep|yeah|yup)\b/.test(t)) return true;
        if (/^(ok|okay|okey|okej|sure|oui|javisst|gjerne|gerne)\b/.test(t)) return true;
        if (/^(absolutely|definitely|go ahead|please do)\b/.test(t)) return true;
        return false;
    }

    function isNegative(text) {
        const t = String(text || '')
            .trim()
            .replace(/[.!?]+$/g, '')
            .trim()
            .toLowerCase();
        return /^(nej|nei|no|nope|non|nah|nein)\b/.test(t);
    }

    function langDisplayName(ui, target) {
        const row = LANG_LABELS[ui] || LANG_LABELS.en;
        return row[target] || LANG_LABELS.en[target] || target;
    }

    function buildLanguageSwitchAsk(kind, target) {
        const ui = getLang();
        const pack = copy[ui] || copy.da;
        const ls = pack.languageSwitch || copy.da.languageSwitch;
        const name = langDisplayName(ui, target);
        const tpl = kind === 'mismatch' ? ls.askMismatch : ls.askExplicit;
        return tpl.replace(/\{\{name\}\}/g, name);
    }

    function formatAlreadyMessage(target) {
        const ui = getLang();
        const pack = copy[ui] || copy.da;
        const ls = pack.languageSwitch || copy.da.languageSwitch;
        const name = langDisplayName(ui, target);
        return ls.already.replace(/\{\{name\}\}/g, name);
    }

    function packForUserMessage(userText) {
        const code = detectLangFromUserText(userText);
        return copy[code] || copy.da;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function detectAnswer(message, messages) {
        const text = String(message || '').trim().toLowerCase();
        const m = messages || currentCopy().answers;

        const asksPhone =
            /\b(ring|opkald|call|phone|téléphone|appeler|anruf|telefon|ringa|telefonsamtal)\b/.test(text);
        const asksContact =
            /\b(kontakt|contact|support|hjælp|help|hjelp|hjalp|aide|écrit|write|skriv)\b/.test(text) ||
            /\b(e[\s-]?mail|email)\b/.test(text) ||
            /\bmail\b/.test(text) ||
            /\be[\s-]?post\b/.test(text) ||
            asksPhone;
        const asksModguard =
            /(modguard|mod guard|hvordan virker|how does|comment ça marche|fungerar|fungerer|virker)/.test(text);
        const asksInstallPage = /(install|installation|hente|download|laste|nedlasting|télécharger|zip|exe)/.test(text);
        const asksRelease =
            /(hvornår|kommer|dato|release|when|launch|släpps|lanser|sortie|quand|når)/.test(text);
        const asksRefund =
            /(tilbagebetaling|refund|refusion|refusjon|återbetal|rembourse|money back|pengene tilbage)/.test(text);
        const isMinecraft = /(minecraft|java|forge|fabric|modrinth)/.test(text);
        const isSims = /(sims|sims 4|custom content|\bcc\b)/.test(text);
        const isComingSoonGame = /(gta|fallout|stardew|baldur|bg3|cities|skyrim)/.test(text);
        const asksGames = /(spil|games|game|produkter|products|jeux|spell|spill)/.test(text);
        const asksParents = /(forældre|barn|børn|parent|parents|under 18|familie|family|enfants)/.test(text);
        const asksHome = /(forside|hjem|home|front page|startsida|accueil|hjemmeside)/.test(text);

        if (!text) return m.default;
        if (asksPhone) return m.phone;
        if (asksModguard) return m.modguard;
        if (asksHome) return m.home;
        if (asksContact) return m.contact;
        if (asksRefund) return m.refund;
        if (isMinecraft) return m.minecraft;
        if (isSims) return m.sims;
        if (asksRelease && isComingSoonGame) return m.release;
        if (isComingSoonGame) return m.release;
        if (asksGames) return m.games;
        if (asksParents) return m.parents;
        if (asksInstallPage) return m.installflow;
        if (/(guide|trin|step|kom i gang|setup|komma igång|komme i gang|démarrer)/.test(text)) return m.guide;
        if (/(abonnement|subscription|plan|pris|price|betaling|payment|betale|køb|köp)/.test(text)) return m.subscription;
        if (/(sikker|trygg|safety|safe|virus|beskyt|beskyttelse|sécur|säker|trygghet)/.test(text)) return m.safety;
        return m.default;
    }

    function appendMessage(messagesEl, html, role) {
        const item = document.createElement('div');
        item.className = 'skimo-ai-message ' + role;
        item.innerHTML = html;
        messagesEl.appendChild(item);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendUserMessage(messagesEl, text) {
        appendMessage(messagesEl, escapeHtml(text), 'user');
    }

    function buildWidget() {
        if (document.querySelector('.skimo-ai-widget')) return document.querySelector('.skimo-ai-widget');

        const widget = document.createElement('aside');
        widget.className = 'skimo-ai-widget';
        widget.setAttribute('aria-hidden', 'true');
        widget.innerHTML = [
            '<div class="skimo-ai-head">',
            '  <div class="skimo-ai-brand">',
            '    <span class="skimo-ai-avatar">' + robotSvg + '</span>',
            '    <div>',
            '      <p class="skimo-ai-title"></p>',
            '      <p class="skimo-ai-subtitle"></p>',
            '    </div>',
            '  </div>',
            '  <button type="button" class="skimo-ai-close" aria-label="Close">×</button>',
            '</div>',
            '<div class="skimo-ai-body">',
            '  <div class="skimo-ai-messages"></div>',
            '</div>',
            '<form class="skimo-ai-form">',
            '  <input class="skimo-ai-input" type="text" autocomplete="off">',
            '  <button type="submit" class="skimo-ai-send"></button>',
            '</form>'
        ].join('');

        document.body.appendChild(widget);
        return widget;
    }

    function syncWidgetCopy(widget) {
        const ui = currentCopy();
        const title = widget.querySelector('.skimo-ai-title');
        const subtitle = widget.querySelector('.skimo-ai-subtitle');
        const input = widget.querySelector('.skimo-ai-input');
        const send = widget.querySelector('.skimo-ai-send');
        const close = widget.querySelector('.skimo-ai-close');
        if (title) title.textContent = ui.title;
        if (subtitle) subtitle.textContent = ui.subtitle;
        if (input) input.placeholder = ui.placeholder;
        if (send) send.textContent = ui.send;
        if (close) {
            close.setAttribute('aria-label', ui.close);
            close.title = ui.close;
        }
        document.querySelectorAll('.skimo-ai-trigger').forEach((trigger) => {
            trigger.setAttribute('aria-label', ui.openLabel);
            trigger.setAttribute('title', ui.openLabel);
        });
    }

    function openWidget(widget) {
        refreshWidgetLanguage(widget);
        widget.classList.add('is-open');
        widget.setAttribute('aria-hidden', 'false');
        const input = widget.querySelector('.skimo-ai-input');
        if (input) {
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => input.focus());
            });
        }
    }

    function closeWidget(widget) {
        widget.classList.remove('is-open');
        widget.setAttribute('aria-hidden', 'true');
    }

    function seedGreeting(widget) {
        const messagesEl = widget.querySelector('.skimo-ai-messages');
        if (!messagesEl || messagesEl.childElementCount > 0) return;
        const item = document.createElement('div');
        item.className = 'skimo-ai-message ai';
        item.setAttribute('data-skimo-greeting', '1');
        item.innerHTML = currentCopy().greeting;
        messagesEl.appendChild(item);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    /** Synk titel, knapper, placeholder + opdater velkomsthilsen når sidens sprog skifter. */
    function refreshWidgetLanguage(widget) {
        if (!widget) return;
        syncWidgetCopy(widget);
        const greetingEl = widget.querySelector('.skimo-ai-messages [data-skimo-greeting="1"]');
        if (greetingEl) {
            greetingEl.innerHTML = currentCopy().greeting;
        }
    }

    function wireWidget(widget) {
        const close = widget.querySelector('.skimo-ai-close');
        const form = widget.querySelector('.skimo-ai-form');
        const input = widget.querySelector('.skimo-ai-input');
        const messagesEl = widget.querySelector('.skimo-ai-messages');
        let pendingTargetLang = null;

        function submitQuestion() {
            const value = String(input.value || '').trim();
            if (!value) return;
            appendUserMessage(messagesEl, value);
            input.value = '';

            function runNormalReply() {
                const pack = packForUserMessage(value);
                window.queueMicrotask(() => {
                    appendMessage(messagesEl, detectAnswer(value, pack.answers), 'ai');
                });
            }

            if (pendingTargetLang) {
                if (isAffirmative(value)) {
                    const target = pendingTargetLang;
                    pendingTargetLang = null;
                    if (window.SkimoI18n && typeof window.SkimoI18n.setLanguage === 'function') {
                        window.SkimoI18n.setLanguage(target, { source: 'manual' });
                    }
                    window.setTimeout(() => {
                        refreshWidgetLanguage(widget);
                        const switchedPack = copy[target] || copy.da;
                        const ls = switchedPack.languageSwitch || copy.da.languageSwitch;
                        appendMessage(messagesEl, ls.switched, 'ai');
                    }, 10);
                    return;
                }
                if (isNegative(value)) {
                    pendingTargetLang = null;
                    const ls = (currentCopy().languageSwitch || copy.da.languageSwitch);
                    window.queueMicrotask(() => appendMessage(messagesEl, ls.cancelled, 'ai'));
                    return;
                }
                const short = value.length <= 24 && value.trim().split(/\s+/).filter(Boolean).length <= 4;
                if (short) {
                    const ls = (currentCopy().languageSwitch || copy.da.languageSwitch);
                    window.queueMicrotask(() => appendMessage(messagesEl, ls.remind, 'ai'));
                    return;
                }
                pendingTargetLang = null;
            }

            const explicit = tryExplicitLanguageSwitch(value);
            if (explicit) {
                if (explicit === getLang()) {
                    window.queueMicrotask(() => appendMessage(messagesEl, formatAlreadyMessage(explicit), 'ai'));
                    return;
                }
                pendingTargetLang = explicit;
                window.queueMicrotask(() => appendMessage(messagesEl, buildLanguageSwitchAsk('explicit', explicit), 'ai'));
                return;
            }

            const mismatch = getMismatchTargetLanguage(value);
            if (mismatch) {
                pendingTargetLang = mismatch;
                window.queueMicrotask(() => appendMessage(messagesEl, buildLanguageSwitchAsk('mismatch', mismatch), 'ai'));
                return;
            }

            runNormalReply();
        }

        if (close) {
            close.addEventListener('click', () => closeWidget(widget));
        }

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                submitQuestion();
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && widget.classList.contains('is-open')) {
                closeWidget(widget);
            }
        });
    }

    function initTriggers(widget) {
        document.querySelectorAll('.skimo-ai-trigger').forEach((trigger) => {
            if (trigger.dataset.aiBound === '1') return;
            trigger.dataset.aiBound = '1';
            trigger.innerHTML = robotSvg;
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                seedGreeting(widget);
                openWidget(widget);
            });
        });
    }

    function listenForLanguageChanges(widget) {
        const run = () => window.setTimeout(() => refreshWidgetLanguage(widget), 0);
        document.addEventListener('skimo:languagechange', run);
        document.addEventListener('click', (event) => {
            if (event.target.closest('.lang-choice[data-lang]')) {
                window.setTimeout(() => refreshWidgetLanguage(widget), 10);
            }
        });
        document.addEventListener('change', (event) => {
            if (event.target.matches('.language-selector select')) {
                window.setTimeout(() => refreshWidgetLanguage(widget), 10);
            }
        });
        const observer = new MutationObserver(() => refreshWidgetLanguage(widget));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.querySelector('.skimo-ai-trigger')) return;
        const widget = buildWidget();
        refreshWidgetLanguage(widget);
        wireWidget(widget);
        initTriggers(widget);
        listenForLanguageChanges(widget);
    });
})();
