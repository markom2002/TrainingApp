# Movement Studio / 3D

Vodič koristi lokalni 3D skinned model odraslog muškarca u neutralnom slate stilu, s kompresionim šortsem i detaljima mišića. Porijeklo i CC0 licenca nalaze se u FE/training-app-frontend/public/models/README.md. Model i oprema se ne učitavaju s tuđeg sajta tokom korišćenja aplikacije.

Svih 48 ID-jeva iz kataloga ima eksplicitnu postavku i putanju u motion-3d.ts. Bench i incline, stojeće i sjedeće vježbe, pregibi i potisci, unilateralni pokreti, core, mobilnost i kardio imaju odvojene postavke. Lat pulldown i behind-neck lat pulldown koriste isti sjedeći položaj i široki hvat; šipka se spušta prema prsima odnosno iza glave do ramena. Kosti su animirane analitičkom inverznom kinematikom; dužine nadlaktice, podlaktice, butine i potkoljenice ostaju stalne. Prsti imaju odvojen hvat, zglob šake se pokreće za wrist curl, a gornji dio kičme za cable crunch.

Sprave, klupe, šipke, bučice, sajle, pedale i oslonci renderuju se u istoj 3D sceni. Koralno-narandžasta boja s mekim prelazom označava ciljnu grupu. Reverse fly i face pull izdvajaju zadnje rame. Za posteriorne grupe podrazumijevani 3/4 pogled dolazi otpozadi. Side i Back omogućavaju dodatni pregled.

Play/Pause, 0.5×/1× i klizač omogućavaju pregled položaja. Reduce motion pauzira petlju. Zatvoren ili nevidljiv vodič ne renderuje animaciju; model i renderer se učitavaju tek kada se vodič otvori. Na telefonu je vodič sklopljen da ne otežava unos treninga. Ako WebGL2 nije dostupan, prikazuje se jasna statična zamjena; trening se i dalje može unijeti.

## Dorade pokreta i figure

Model athlete-v3.glb koristi kontinuirano oblikovanje mišića i ponderisane uticaje kostiju. Konture latova, lopatica, trapeza, ramena, prsa i trbuha dopunjene su anatomskim sjenčenjem koje ostaje vidljivo ispod oznaka aktivnih mišića. Materijal je neutralan i mat. Priprema izvornog CC0 modela: scripts/Prepare-Athlete.mjs <putanja-do-originalnog-glb>.

Reverse fly, lateral raise i cable fly imaju luk iz ramena sa stalnim blagim pregibom lakta, stabilnim trupom i stopalima. Bučice prate okvir dlana: osa drške je preko zglobova prstiju, a šaka prati podlakticu. Neutralni i supinirani hvat se razlikuju. Prsti se zatvaraju oko centra hvata; podni oslonci zadržavaju otvorene šake. Mrtva dizanja i nošenje tegova zadržavaju duge ruke; podignuta noga jednonožnog RDL-a ostaje opružena. Kod podizanja na prste ruke prate podizanje tijela. Kamera reverse fly je bliža i usmjerena prema zadnjem ramenu.

Dodatne reference: [Sweat rear lateral raise](https://sweat.com/exercises/rear-lateral-raise) i [ACE deltoid training](https://www.acefitness.org/resources/pros/expert-articles/9074/smart-shoulder-solutions-an-evidence-based-approach-to-training-the-deltoids/).

## Reference i granice provjere

Osnovni obrasci su provjeravani uz [ACE chest press](https://www.acefitness.org/resources/everyone/exercise-library/5/chest-press/), [back squat](https://www.acefitness.org/resources/everyone/exercise-library/11/back-squat/), [deadlift](https://www.acefitness.org/resources/everyone/exercise-library/6/deadlift/), [lying hamstrings curl](https://www.acefitness.org/resources/everyone/exercise-library/153/lying-hamstrings-curl/), [seated row](https://www.acefitness.org/resources/everyone/exercise-library/169/seated-high-back-rows/) i [kneeling hip-flexor stretch](https://www.acefitness.org/resources/everyone/exercise-library/142/kneeling-hip-flexor-stretch/).

Ovo su ručno modelirane edukativne animacije. Testovi provjeravaju domet zglobova, stalne dužine udova, relevantne položaje i WebGL prikaz. To nije biomehanička validacija svih 48 pokreta niti stručna procjena individualne forme. Građa tijela, sprava i udoban raspon pokreta se razlikuju.

## Ostale funkcije

Kalendar prikazuje dane i spremljene treninge. Journey ciljevi Gain/Lose/Track koriste odabranu početnu i ciljnu težinu. Unos kg/lbs automatski se pretvara u zajedničku jedinicu za zapise i rekorde. Rank preview reproducira originalni sintetizirani zvuk na klik bez uključivanja automatskih nagrada; postojeća glasnoća ostaje sačuvana.


## Performance edition audit (2026-11-14)

All 48 catalog movements are rendered at the start, midpoint and end in browser QA. Arm transforms now follow the elbow bend plane rather than only the shortest rotation between two axes. Preacher support slopes down toward the wrists; seated knee poles face forward. Target muscle surface displacement is limited to 3.5 mm, applied to the rest mesh before skinning; it is an illustrative contraction, not measured muscle activation or motion capture.

Technique references consulted (original demonstrations and professional exercise libraries):

- [ACE seated lat pulldown](https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/): seat, thigh support, controlled chest-directed pull.
- [ACE single-arm row](https://www.acefitness.org/resources/everyone/exercise-library/126/single-arm-row/): supported torso and shoulder position.
- [ACE seated shoulder press](https://www.acefitness.org/resources/everyone/exercise-library/186/seated-shoulder-press/): overhead path and shoulder control.
- [ACE arm exercise library](https://www.acefitness.org/resources/everyone/exercise-library/body-part/arms/biceps/): curl and hammer-grip distinctions.
- [NASM dumbbell Romanian deadlift](https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift): hip hinge and posterior-chain movement.
- [Keele University exercise library](https://www.keele.ac.uk/sportatkeele/activekeele/exerciselibrary/): additional movement demonstrations.

These references inform the authored trajectories; a successful render and fixed limb lengths alone do not establish biomechanical correctness for every body shape and machine.
