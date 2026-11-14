# Athlete League

Otvori **Journey**, izaberi rank i pritisni **Preview … effect**. Preview ima zvuk i kada su automatske zvučne nagrade isključene. Ne mijenja XP niti tvoju postavku glasnoće. Replay sound ponavlja zvuk, Stop sound ga prekida.

| Rank | Ukupni XP | Zvuk i proslava |
| --- | ---: | --- |
| Iron | 0 | Kratak metalni udar; čelični dolazak i dim kovačnice |
| Bronze | 400 | Tri bubnjarska udara i rog; bakrene žeravice |
| Silver | 1.200 | Metalni napad i kristalni odjek; hladno strujanje |
| Gold | 2.500 | Durska pobjednička fanfara; sunčeva energija |
| Platinum | 4.500 | Sinkopirani elektronski puls i bass drop; aurora |
| Diamond | 7.500 | Ledena zvona i kaskada; plavi vrtlozi |
| Elite | 11.500 | Tamni growl, prekidi ritma i molski rogovi; energija praznine |
| Master | 17.000 | Bubnjevi, horne i hor; svjetlosna krila |
| Legend | 25.000 | Duži uspon, veliki udar, melodija i hor; zlatno-ljubičasta pomrčina |

Svaki rank ima vlastiti stereo WAV i aranžman, od 1,55 do 5,2 sekunde. Zvukovi su originalno generisani pomoću scripts/Generate-RankAudio.mjs; audio iz igre nije preuzet. Provjera formata, signala, različitih datoteka i klipinga: node scripts/Verify-RankAudio.mjs. Stilska referenca: [Brawl Stars rank proslave](https://www.youtube.com/watch?v=V6QtqgXB13I).

Pozadina je originalni WebGL shader s turbulentnim dimom, svjetlosnim rasipanjem i sitnim iskrama. Svaki rank ima poseban ulazak značke i drugačiji tok energije. Platno ima ograničenu rezoluciju i brzinu osvježavanja; skriven tab prekida renderovanje. Reduce motion prikazuje statičan kadar i isključuje pokret proslave. Ako WebGL nije dostupan, ostaje gradijentna pozadina i upotrebljiv dijalog.

Trening donosi 40 XP, novi dnevni rekord dodatne kilaže 50 XP, a achievementi 50–1.000 XP. Postoje 42 osnovna milestonea i dodatni prema smjeru i ličnom cilju težine, do 50 ukupno. Backend računa XP iz sačuvanih zapisa. Animacija ne dodaje bodove.

Novo otključani achievement prikazuje karticu i XP nagradu. Rank-up otvara proslavu preko ekrana. Keep evolving nastavlja; Escape zatvara; Tab ostaje unutar dijaloga; zatvaranje vraća fokus. Više nagrada možeš preskočiti.

Prvo otvaranje postojećeg računa postavlja tihu početnu vrijednost. Browser pamti već viđene achievemente i najviši proslavljeni rank odvojeno po računu. Osvježavanje ne ponavlja proslave. Drugi browser ili uređaj postavlja vlastitu početnu vrijednost; ovo nije serverski dnevnik obavijesti. Brisanje ili ispravka treninga ponovo izračunava stvarni XP.
