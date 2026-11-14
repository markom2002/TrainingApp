# FORM na telefonu i računaru

## Jednostavno korištenje na istom Wi-Fiju — bez certifikata

Trenutni način lokalnog pokretanja je dvoklik na **Pokreni-na-telefonu.cmd**. Otvara lokalni HTTP pregled:

- Laptop: **http://localhost:7089/dashboard**
- Telefon na istoj mreži: **http://192.168.1.8:7089/dashboard** (IP laptopa se može promijeniti).

Koristi **http**, bez slova **s**. Ovaj režim ne traži certifikate i ne koristi offline service worker. Laptop mora ostati uključen. Prijava i spremanje rade preko iste lokalne adrese. Ovo je pregled u browseru, ne PWA instalacija. HTTP veza nije šifrirana; koristi ga samo na svom privatnom Wi-Fiju.

Za ponovno građenje nakon izmjena koda:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-LocalPreview.ps1 -Build
```

Režim `local-preview` izričito uključuje `LocalPreview__AllowHttp=true` samo u Development okruženju. HTTP refresh cookie za lokalne adrese koristi zasebno ime `training_refresh_local`, tako da se ne sukobljava s postojećim HTTPS cookiejem. Produkcijski cookie ostaje Secure; ova iznimka se ne aktivira u Production okruženju.

Starije upute za certifikate u nastavku su opcionalne i nisu potrebne za ovaj način korištenja.

FORM je sada pripremljen kao PWA: instalira se na početni ekran i otvara u vlastitom prozoru. Isti račun i baza koriste se na svim uređajima. Ovo nije APK niti objava na App Storeu.

## Pokretanje nadogradnje lokalno

Zaustavi postojeći API terminal s `Ctrl+C`, pa iz glavnog foldera:

```powershell
dotnet ef database update --project BE --configuration Release
dotnet run --project BE --launch-profile https
```

U drugom terminalu:

```powershell
cd FE/training-app-frontend
npm.cmd start
```

Otvori https://localhost:4200. Migracija dodaje mjerenja težine i pojedinačne serije; postojeći treninzi ostaju sačuvani.

## Kako radi napredak

- Trening: možeš zadržati brzi unos jednakih serija ili izabrati **Log individual sets** za drugačija ponavljanja, sekunde i kilažu po seriji. **Add set** kopira zadnju seriju.
- **Repeat** u historiji otvara novi trening s prethodnim vježbama i serijama. Datum je novi; prethodne bilješke se ne kopiraju i original se ne mijenja.
- Streak: jedan bod za svaki datum s treningom. Najviše dva dana odmora između treninga čuvaju niz; veća pauza započinje novi. Koriste se UTC datumi, isto na svim uređajima. Deset takvih dana otključava **Unstoppable**.
- XP: 40 po treningu, 50 po rekordu i bonusi za achievemente. Svakih 500 XP je novi nivo.
- Rekord: najveća dodatna kilaža u vježbi na jednom datumu uspoređuje se s ranijim datumima. Prvi unos postavlja početnu vrijednost; više unosa istog dana ne proizvodi lance rekorda. Ovo je rekord kilaže, bez procjene 1RM-a ili izjednačavanja broja ponavljanja.
- Težina: u **Your journey** unesi kg i datum. Isti datum možeš ispraviti ponovnim spremanjem, a pojedini unos izbrisati. Po želji odaberi smjer **Gain** ili **Lose** za milestone od 2 kg u odnosu na prvi unos; **Just tracking** je početna opcija.
- Achievementi i XP izračunavaju se iz spremljenih podataka. Izmjene i brisanje mogu promijeniti milestone i ukupni XP. Budući datumi treninga ne ulaze u napredak.

## Priprema instalabilne verzije

### Brzi pregled na telefonu preko kućnog Wi-Fija

Za lokalnu instalaciju s provjerenim certifikatom, dvoklikni `Pokreni-na-telefonu.cmd` na laptopu ili pokreni:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-TrustedPhoneApp.ps1
```

Skripta pravi lokalni CA i serverski certifikat s tačnom privatnom Wi-Fi IP adresom te pokreće aplikaciju s tim certifikatom. Privatni CA ključ ostaje neizvoziv u Windows korisničkom spremištu; serverski PFX i lozinka ostaju u ignorisanom `artifacts/phone-https` folderu, izvan webroota. Ne dodaje se automatski povjerenje ni na jedan uređaj. Na telefonu otvori adresu `/phone-setup.html` koju skripta ispiše (trenutno `https://192.168.1.8:7089/phone-setup.html`). Stranica daje preuzimanje **javnog** `form-local-root.cer` certifikata, njegov SHA-256 otisak i korake za oba sistema.

- **Android:** Settings → Security & privacy → More security settings → Encryption & credentials → Install a certificate → **CA certificate**. Odaberi preuzeti `form-local-root.cer`. Imena menija zavise od proizvođača; pretraga postavki za „certifikat” je često najbrža. Zatvori Chrome i ponovo otvori aplikaciju. [Google upute](https://support.google.com/pixelphone/answer/2844832?hl=en).
- **iPhone:** preuzmi certifikat u Safariju, instaliraj profil kroz General → VPN & Device Management, zatim uključi potpuno povjerenje za **FORM Local Development CA** kroz General → About → Certificate Trust Settings. [Apple upute](https://support.apple.com/en-us/102390).

Nakon prihvatanja certifikata, `/phone-setup.html` provjerava da li je veza pouzdana. Instalacija je zatim dostupna kroz podržani preglednik ili dugme kada preglednik ponudi instalacijski događaj. Samo „Nastavi” na upozorenju o certifikatu ne daje ovo povjerenje. Instalaciju na fizičkom telefonu treba dovršiti na uređaju; ne može se automatski potvrditi s laptopa.

Za provjereni lokalni HTTPS koristi ovu skriptu i ubuduće. Standardni `dotnet run --launch-profile phone` sam ne učitava prilagođeni certifikat. Promjena IP adrese traži ponovno pokretanje skripte; isti CA se ponovo koristi, pa ga ne treba ponovo instalirati dok se ne promijeni. Ako više ne želiš lokalni CA, ukloni **FORM Local Development CA** iz korisničkih certifikata telefona. Laptop takođe neće automatski vjerovati novom CA-u; po želji instaliraj javni certifikat u njegov korisnički Trusted Root Certification Authorities.

Za lokalni pregled oba uređaja trebaju biti na istoj privatnoj Wi-Fi mreži. API možeš pokrenuti s `dotnet run --project BE --launch-profile phone --configuration Release`; profil sluša na LAN adresama na HTTPS portu 7089. Na telefonu otvori `https://IP-ADRESA-LAPTOPA:7089/dashboard` (trenutno `https://192.168.1.8:7089/dashboard`). Laptop treba ostati uključen. Adresa se može promijeniti na drugoj mreži.

Ako Windows Firewall blokira pristup, u administratorskom PowerShellu pokreni `scripts/Enable-PhoneAccess.ps1`. Skripta otvara samo port ove aplikacije, za lokalne uređaje na privatnom Wi-Fiju. Ne mijenjaj javnu mrežu u privatnu ako joj ne vjeruješ.

Razvojni certifikat je izdan za `localhost`, pa telefon pri korištenju IP adrese može prikazati upozorenje o certifikatu. Ručna potvrda je samo za pregled vlastite lokalne aplikacije. Za pouzdanu PWA instalaciju treba HTTPS adresa s certifikatom kojem telefon vjeruje.

Za instalaciju na telefon potreban je dostupan HTTPS URL kojem telefon vjeruje. `localhost` na telefonu označava telefon, ne računar; razvojni certifikat s računara se automatski ne prenosi na telefon.

Iz glavnog foldera pokreni:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Build-MobileApp.ps1
```

Izlaz je `artifacts/mobile-app`. Sadrži ASP.NET API i produkcijski Angular/PWA na istoj adresi; frontend koristi relativni `/api`. Za stvarni hosting treba:

1. .NET 8 hosting s trajnim SQL Serverom i pouzdanim HTTPS certifikatom.
2. Postaviti `ConnectionStrings__DefaultConnection` i privatni `Jwt__Key` (najmanje 32 UTF-8 bajta). `Jwt__Issuer` i `Jwt__Audience` po početnim postavkama su `TrainingApp` i `TrainingAppUsers`. Ne koristiti razvojni ključ za javni hosting.
3. Primijeniti migracije na odabranu bazu i pokrenuti `dotnet BE.dll` iz objavljenog foldera. Hosting/proxy treba sačuvati HTTPS shemu aplikacije.
4. Otvoriti HTTPS adresu na telefonu i prijaviti se.

Nijedan hosting nije automatski objavljen niti je aplikacija instalirana na tvoj telefon.

## Instalacija

- **Android:** otvori HTTPS adresu u Chromeu → izbornik → **Install app / Add to Home screen**. Na stranici **Your journey** postoji i kartica **Install app** kada preglednik ponudi instalaciju.
- **iPhone:** otvori u Safariju → **Share → Add to Home Screen** → uključi **Open as Web App** ako je ponuđeno → **Add**.
- **Računar:** Chrome/Edge → instalacija aplikacije iz adresne trake ili izbornika.

Instalacijske opcije ovise o pregledniku; [MDN opisuje zahtjeve za instalaciju PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

Za prijavu, spremanje i učitavanje napretka potrebna je mreža. Bez veze aplikacija pokazuje zaseban offline ekran; ne prikazuje lažnu potvrdu spremanja. Service worker ne sprema privatne API odgovore. Service worker je aktivan u produkcijskom buildu, dok `npm.cmd start` služi za razvoj.
