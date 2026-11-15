# Movement Lab / 3D

## Trenutni prikaz

Movement Lab prikazuje svih 48 vježbi iz kataloga koristeći lokalni skinned model `athlete-v3.glb`. Porijeklo modela i CC0 licenca opisani su u [dokumentaciji modela](FE/training-app-frontend/public/models/README.md). Model, sprave, šipke, bučice i sajle učitavaju se iz aplikacije.

Log Workout služi za izbor vježbi i unos serija. Movement Lab služi za pregled tehnike; izbor vježbe u njemu ne mijenja spremljeni nacrt treninga. Dugme Technique uz odabranu vježbu otvara njen prikaz.

Kontrole uključuju Auto, Front, Side i Back kameru, Play/Pause, 0.5×/1× i klizač položaja. Kadar obuhvata uzorke cijelog pokreta i ostaje stabilan tokom ponavljanja. Bočni pogled na paralelne šipke ima blagi otklon da stub ne zaklanja figuru. Ciljna mišićna grupa označena je koralno-narandžastom bojom; reverse fly i face pull izdvajaju zadnje rame.

## Pokreti i kontakt s opremom

Svaki ID ima zasebnu postavku i putanju u [motion-3d.ts](FE/training-app-frontend/src/app/components/exercise-picker/motion-3d.ts). Analitička inverzna kinematika čuva dužine udova. Fiksni hvat računa se do centra dlana, uključujući odmak od zapešća, pa šake prate nepomične ručke i šipke.

- Propadanje koristi gotovo vertikalne podlaktice, putanju ramena oko laktova i simetrično savijene noge. Šake ostaju na paralelnim ručkama.
- Zgibovi imaju razmak između glave i šipke. Šipka kod čučnja prati zadnji oslonac, a kod mrtvog dizanja ostaje ispred nogu.
- Neutralni hvat prati luk podlaktice. Svaka šaka može imati zaseban hvat, tako da oslonac na klupi ili podu ostane otvoren dok druga drži teg ili prati pokret.
- Veslački ergometar odvaja opružanje nogu, kretanje trupa i povlačenje ručke prema donjem dijelu prsnog koša. Kettlebell swing koristi dugačke, blago savijene ruke.
- Sajla za cable crunch ima dva kraja užeta. Zapešća se zasebno pokreću kod wrist curla, a gornji dio kičme kod cable cruncha.

[joint-volume.ts](FE/training-app-frontend/src/app/components/exercise-picker/joint-volume.ts) koristi dual-quaternion skinning za očuvanje volumena pri rotaciji zglobova, uključujući sjenke. Oznake mišića zadržavaju teksturu modela; ilustrativna kontrakcija pomjera površinu najviše 3,5 mm prije deformacije skeletom.

## Učitavanje i pristupačnost

3D scena učitava se kada je otvoreni prikaz vidljiv. Animacija pauzira kada prikaz nije vidljiv, kartica preglednika je skrivena ili korisnik izabere Pause. Postavka reduced motion pokreće prikaz pauziran. Ako WebGL prikaz nije dostupan, aplikacija prikazuje zamjenski prikaz i dugme za ponovno učitavanje.

## Provjere

Nakon instalacije frontend zavisnosti, iz korijena repozitorija pokreni:

```powershell
node scripts/Verify-MovementRig.mjs
```

Provjera učitava stvarni model i ispituje 1.968 poza za 48 vježbi: konačne vrijednosti transformacija kostiju, normalizovane rotacije šaka, kontinuitet zapešća i kontakt dlanova s fiksnom opremom. Za propadanje provjerava i uglove lakta u početnoj i završnoj pozi, vertikalnost podlaktica, položaj lakta izvan trupa i poravnanje koljena.

Angular testovi provjeravaju domet, dužine udova, relevantne putanje, razmak glave od šipke i odvojeno ponašanje unosa i pregleda. Vizuelni pregled obuhvata svih 48 vježbi u dvije faze iz automatskog i bočnog ugla, uz dodatne početne, srednje i završne poze za korigovane pokrete.

Animacije su ručno modelirane ilustracije. Ove provjere nisu biomehanička validacija svake građe tijela, sprave ili individualne tehnike.
