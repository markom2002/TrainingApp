# Pokretanje Gym App

Na desktopu postoji samo **Gym App**, sa istom zelenom munjom kao na telefonu. Precica pokrece server ako ne radi i otvara aplikaciju. Ne gradi aplikaciju ponovo pri svakom otvaranju; za objavljivanje izmena i dalje koristi `scripts/Start-PersonalApp.ps1`.

Pri prvom pokretanju ista precica trazi Windows administratorsku potvrdu za podesavanje. To dozvoljava pristup samo lokalnim uredjajima preko privatnog Wi-Fi-ja i pravi Windows zadatak **Gym App Auto Start**, koji pokrece skriveni monitor pri prijavi tog korisnika u Windows. Potvrda se vise ne trazi nakon uspesnog podesavanja. Ako Windows odbije podesavanje, aplikacija ostaje pokrenuta, a sledeci klik ponavlja pokusaj; detalji su u `.local-logs/windows-setup.log`.

Monitor proverava server svakih 30 sekundi i ponovo ga pokrece ako je stao. Pri promeni lokalne IP adrese obnavlja adresu i serverski sertifikat. Ako promenis mrezu, koristi novu adresu koju ispise pokretac; stara instalirana precica na telefonu moze zahtevati otvaranje nove adrese.

Windows zadatak se aktivira odmah nakon podesavanja, bez cekanja na sledecu prijavu. Precica takodje aktivira isti zadatak ako je zaustavljen. Monitor i server koje on pokrene rade preko Task Scheduler-a, nezavisno od zatvaranja prozora precice. Link u pregledniku i na telefonu je puna **HTTPS** adresa, na primer `https://192.168.1.8:7089/dashboard`; nemoj koristiti `http://` na portu 7089.

Telefon koristi isti server i nalog kao laptop. Laptop mora biti ukljucen, prijavljen u Windows i povezan na istu privatnu mrezu. Iskljucen ili uspavan laptop ne moze slati podatke telefonu. Za dostupan server i kada je laptop iskljucen potreban je zaseban hosting; ovaj pokretac to ne obezbedjuje. Vec pripremljena offline aplikacija i dalje moze lokalno sacuvati novi trening do sledece sinhronizacije.

Za offline pokretanje na telefonu jednom otvori instaliranu HTTPS aplikaciju dok je laptop dostupan, prijavi se i sacekaj **Offline ready on this device**. Posle toga aplikaciju mozes zatvoriti i ponovo otvoriti preko njene ikonice bez veze. Otvaranje koristi sacuvane fajlove bez cekanja na laptop. Novi treninzi se cuvaju na telefonu i salju kada je server ponovo dostupan. Istorija je dostupna samo za prethodno otvorene mesece. Prva prijava i priprema zahtevaju vezu. Ne brisi podatke aplikacije dok postoje neposlati treninzi.

Desktop precice mozes ponovo napraviti komandom `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Install-GymShortcut.ps1`. Automatsko pokretanje se iskljucuje kroz Task Scheduler iskljucivanjem zadatka **Gym App Auto Start**.
