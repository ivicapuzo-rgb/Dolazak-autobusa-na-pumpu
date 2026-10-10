# PRD — Dolazak autobusa na pumpu (Fuel Pump Bus Tracker)

## Original problem statement
Android aplikacija za evidenciju dolaska autobusa na pumpu za točenje goriva (nafte). Početni ekran sa ilustracijom autobusa i natpisom "Dolazak autobusa na pumpu", ukupan broj autobusa u popisu ("kom"), promenjiv datum iz kalendara. Kartice: STIGLO / ČEKA SE (koliko treba da dođe) / NE DOLAZI (isključeni). Formular za unos: broj autobusa, automatsko vreme dolaska, mesto sipanja 1-8, i opcija "autobus ne dolazi". Lista sa filterima: Stigli (redom po opadajućem vremenu), Koji fale, Koji ne dolaze. Admin panel zaključan lozinkom "puzopb" sa izveštajem i PDF (A4) eksportom koji se čuva na telefonu. Mogućnost dodavanja vanrednog autobusa (garažni broj van spiska). Spisak: Solaris + BMC.

## User choices
- Data: local only (offline, na telefonu)
- Design: refreshed modern (iOS-Native Clean, plava/navy tema)
- Time: automatski trenutno vreme pri evidentiranju
- PDF: sve (stigli + koji fale + koji ne dolaze) za datum
- Slika: generička ilustracija autobusa

## Architecture
- Expo Router (file-based), 3 bottom tabs: Danas / Autobusi / Izveštaj
- Fully client-side; persistence via `@/src/utils/storage` (AsyncStorage), keys `pumpa_buses_v1`, `pumpa_records_v1`
- State: `src/data/DataContext.tsx` (buses, records-by-date, selectedDate, stats, selectors)
- Seed manifest: `src/data/seed.ts` (Solaris + BMC = 185 buses, exactly per user list)
- PDF: `src/utils/pdf.ts` (expo-print A4 HTML + expo-sharing)
- Theme: `src/theme.ts` from `design_guidelines.json`
- No backend used.

## Persona
Operater na pumpi — brz unos napolju, veliki tap-targeti, čitljivi brojevi.

## Implemented (2026-06)
- Home: total kom badge, date bar (arrows + native calendar), 3 stat cards, entry form (garažni broj, mesto 1-8, auto vreme), sticky EVIDENTIRAJ DOLAZAK + NE DOLAZI, vanredni auto-add
- Autobusi: segmented Stigli/Čekaju/Ne dolaze sa brojačima, search, Stigli sortirani po opadajućem vremenu, revert (Vrati), "Dodaj vanredno" modal
- Izveštaj: password gate ("puzopb"), stat cards, sekcije (Stigli po vremenu, Koji fale, Ne dolaze), PDF (A4) izvoz na telefonu, reset dana, zaključaj
- Toasts, haptics, offline persistence — tested (iteration_1, all pass)

## Implemented — update 2026-06 (v2)
- PDF auto-save u Preuzimanja (Android SAF): prvi put korisnik jednom izabere folder (npr. Download), URI se pamti, dalje se čuva automatski sa imenom `Izvestaj_DD-MM-YYYY.pdf`. iOS koristi share sheet. Web prikazuje info poruku.
- Statistika mesta sipanja (1–8): horizontalni grafikon po danu u Izveštaju + u PDF-u; najkorišćenije mesto istaknuto.
- Istorija po danima: lista svih dana sa evidencijom (stiglo/čeka/ne dolazi), tap postavlja izabrani dan.
- Izvoz izveštaja za period: Od/Do datumi + PDF sa svim danima u opsegu (`Izvestaj_..._do_....pdf`).

## Implemented — update 2026-06 (v3)
- Deljenje PDF-a: dugme "Podeli" (Sharing share sheet → Viber, mejl, WhatsApp…) uz dnevni izveštaj i uz period.
- Napomena uz autobus: opciono polje + brze opcije (Kasnio / Kvar / Van reda / OK) na unosu; prikazuje se u listi, izveštaju i PDF-u.
- Nedeljni pregled: zbir po nedeljama (Mon-based) + "Najprometniji dani" (top 5 po broju sipanja).
- Pregled po autobusu (7 dana): pretraga po garažnom broju → prikaz datuma/vremena/mesta/napomene za poslednjih 7 dana, sa "Izdaj PDF" (sačuvaj) i "Podeli".

## Implemented — update 2026-06 (v4)
- Nedeljni PDF: dugmad "Nedeljni PDF" (sačuvaj) i "Podeli" u sekciji Nedeljni pregled — poseban PDF sa zbirom po nedeljama, najprometnijim danima i sipanjima po danima.
- Grafikon po danima (14 dana): stubičasti grafikon u Izveštaju koji pokazuje broj sipanja po danu, sa istaknutim najprometnijim danom i današnjim datumom.

## Implemented — update 2026-06 (v5)
- Dodaj vanredno: izbor marke pri dodavanju (Solaris / BMC / Minibus).
- Brisanje iz popisa: dugme (korpa) na svakom redu u listi Autobusi + potvrda pre brisanja; uklanja autobus iz popisa (istorija evidencije ostaje).
- Marka model proširen sa "Minibus".

## Implemented — update 2026-06 (v6)
- Auto-update preko GitHub Releases (Android, samo na instaliranom APK buildu):
  - `src/config.ts` drži repo (ivicapuzo-rgb/Dolazak-autobusa-na-pumpu).
  - `src/update/version.ts` semver poređenje; `src/update/UpdateContext.tsx` provajder + modal.
  - Proverava `releases/latest` na startu i na povratku u prvi plan (throttle 30 min) + ručno dugme u Izveštaju.
  - Ako je tag novija verzija od app.json `version`, prikaže modal sa release notes; dugme preuzima .apk asset (progress) i otvara Android installer (intent VIEW + FileProvider). Fallback: "Dozvoli instalaciju" → MANAGE_UNKNOWN_APP_SOURCES.
  - app.json: dodat `android.permissions: ["REQUEST_INSTALL_PACKAGES"]`.
  - NAPOMENA: ne radi u Expo Go / web-u; radi samo na realnom APK buildu. Pozadinsko obaveštenje dok je app zatvoren zahteva push (nije deo ovog rešenja).

## Backlog
- P1: PDF izvoz koji automatski čuva fajl sa imenom (datum) u Downloads/Documents
- P1: Dnevni pregled više dana / istorija i izvoz opsega datuma
- P2: Statistika po mestima sipanja (koje mesto najviše korišćeno)
- P2: Zaključaj admin trajno (PIN u secure store) i promena lozinke
- P2: Dark mode
