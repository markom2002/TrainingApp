# Pokretanje Gym App

Na desktopu koristi **Gym App**. Precica pokrece server ako ne radi i otvara aplikaciju. Ne gradi aplikaciju ponovo pri svakom otvaranju; za objavljivanje izmena i dalje koristi `scripts/Start-PersonalApp.ps1`.

Za prvo podesavanje klikni desnim dugmetom na **Gym App - podesavanje** i izaberi **Run as administrator**. To dozvoljava pristup samo lokalnim uredjajima preko privatnog Wi-Fi-ja i pravi Windows zadatak **Gym App Auto Start**, koji pokrece skriveni monitor pri prijavi tog korisnika u Windows. Ako Windows odbije podesavanje, skripta prijavljuje gresku; detalji su u `.local-logs/windows-setup.log`.

Monitor proverava server svakih 30 sekundi i ponovo ga pokrece ako je stao. Pri promeni lokalne IP adrese obnavlja adresu i serverski sertifikat. Ako promenis mrezu, koristi novu adresu koju ispise pokretac; stara instalirana precica na telefonu moze zahtevati otvaranje nove adrese.

Telefon koristi isti server i nalog kao laptop. Laptop mora biti ukljucen, prijavljen u Windows i povezan na istu privatnu mrezu. Iskljucen ili uspavan laptop ne moze slati podatke telefonu. Za dostupan server i kada je laptop iskljucen potreban je zaseban hosting; ovaj pokretac to ne obezbedjuje. Vec pripremljena offline aplikacija i dalje moze lokalno sacuvati novi trening do sledece sinhronizacije.

Desktop precice mozes ponovo napraviti komandom `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Install-GymShortcut.ps1`. Automatsko pokretanje se iskljucuje kroz Task Scheduler iskljucivanjem zadatka **Gym App Auto Start**.
