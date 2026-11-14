# FORM na Androidu i iPhoneu

Ovo je tvoja privatna web aplikacija s instalacijom na početni ekran (PWA), bez objavljivanja u trgovini aplikacija. Baza i server ostaju na laptopu. Laptop mora biti uključen, a telefon na istoj privatnoj Wi-Fi mreži. Bez servera može se prikazati offline stranica, ali se treninzi ne spremaju.

## Pokretanje

Dvaput klikni `Pokreni-na-telefonu.cmd`. Pokretač gradi najnoviju verziju i pokreće HTTPS server. Ispisuje tačnu adresu za telefon. Trenutna adresa:

**https://192.168.1.8:7089/phone-setup.html**

Ako telefon ne može otvoriti adresu, u administratorskom PowerShellu iz foldera projekta pokreni:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Enable-PhoneAccess.ps1
```

Pravilo dopušta samo port aplikacije na privatnom Wi-Fi-ju, uređajima iz lokalne mreže. Ne otvaraj port na routeru.

## Prvo povezivanje — jednom po telefonu

Na stranici `phone-setup.html` preuzmi javni FORM certifikat. Privatni ključevi ostaju na laptopu. Stranica prikazuje otisak certifikata koji možeš uporediti s ispisom pokretača.

**Android:** u postavkama potraži „CA certificate“ / „CA certifikat“, izaberi instalaciju CA certifikata i odaberi preuzeti `form-local-root.cer`. Ponovo otvori Chrome i adresu aplikacije. U meniju izaberi „Install app“ / „Add to Home screen“.

**iPhone:** otvori adresu u Safariju, preuzmi certifikat i instaliraj profil u Settings → General → VPN & Device Management. Zatim u General → About → Certificate Trust Settings uključi povjerenje za FORM Local Development CA. Ponovo otvori Safari i aplikaciju, pa Share → Add to Home Screen → Open as Web App → Add.

## Svakodnevno korištenje

Pokreni aplikaciju na laptopu, a na telefonu dodirni FORM ikonu. Prijava se obnavlja automatski do isteka 30-dnevne sesije, odjave ili brisanja kolačića. Safari/Chrome i instalirana aplikacija mogu imati odvojene spremnike prijave; prvi put se prijavi u instaliranoj aplikaciji.

Quick Log služi za brz unos, Movement Lab za pregled pokreta. Jedinice kg/lbs biraš zasebno na svakoj vježbi. Nedavne vježbe ostaju pri vrhu izbora na istom uređaju.

Ako promijeniš mrežu ili laptop dobije novu IP adresu, ponovo pokreni pokretač i koristi novu ispisanu adresu. Za rad izvan kućne mreže potreban je zaseban HTTPS hosting ili privatni VPN; to nije konfigurirano ovim lokalnim paketom.
