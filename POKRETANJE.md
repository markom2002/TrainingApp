# Pokretanje aplikacije

Za korišćenje na laptopu i telefonu pokreni **Pokreni-na-telefonu.cmd** iz glavnog foldera projekta.

- Laptop: **http://localhost:7089/dashboard**
- Telefon: adresa koju ispiše skripta, npr. **http://192.168.1.8:7089/dashboard**. Telefon i laptop treba da budu na istoj Wi-Fi mreži, a laptop uključen.

Ova lokalna verzija koristi HTTP i ne traži instaliranje certifikata.

## Razvoj sa automatskim osvježavanjem

Potrebni su .NET 8 SDK, Node.js 22, npm i pokrenut SQL Server. ConnectionStrings:DefaultConnection u BE/appsettings.Development.json treba da odgovara tvojoj SQL Server instanci.

Prva priprema iz glavnog foldera projekta:

```powershell
dotnet restore BE/BE.sln
dotnet ef database update --project BE
```

Pokreni API u jednom terminalu:

```powershell
dotnet run --project BE --launch-profile local-preview --configuration Release
```

Ako je API već pokrenut preko Pokreni-na-telefonu.cmd, koristi postojeći proces.

U drugom terminalu:

```powershell
cd FE/training-app-frontend
npm.cmd ci
npm.cmd start
```

Otvori **http://localhost:4200/login**, sa http u adresi. Oba terminala ostaju otvorena. Za naredno pokretanje frontenda dovoljno je npm.cmd start.

Angular prosljeđuje /api zahtjeve lokalnom backendu preko proxy.conf.json. Ako mijenjaš proxy ili način pokretanja, zaustavi i ponovo pokreni frontend.

Za osvježavanje verzije koja se služi na portu 7089 nakon izmjene izvornog koda:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-LocalPreview.ps1 -Build
```

Ako dotnet ef nije dostupan, instaliraj dotnet-ef verziju 8.x. Lokalni HTTP je za razvoj i kućnu mrežu; javno hostovanje koristi zasebnu HTTPS konfiguraciju opisanu u MOBILNA-APLIKACIJA.md.
