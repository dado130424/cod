# COD v4.2 — Documentazione tecnica

> Panoramica del progetto, istruzioni di avvio e controlli sono nel **[README principale](../README.md)**.
> Questo documento raccoglie i dettagli implementativi: correzioni, ottimizzazioni e scelte tecniche, con i numeri misurati.

Un gioco sparatutto in prima persona (FPS) sviluppato interamente per browser utilizzando **Three.js**. Il gioco combina meccaniche di combattimento classiche con un sistema di progressione RPG, alberi delle abilità e nemici AI.

![Version](https://img.shields.io/badge/version-4.2-blue)
![License](https://img.shields.io/badge/license-MPL--2.0-blueviolet)
![Technology](https://img.shields.io/badge/tech-Three.js-orange)

## 🎮 Caratteristiche Principali

- **Gameplay FPS Fluido**: movimento fluido con salto e **doppio salto**, rinculo, flash di volata, hit marker e headshot (danno doppio).
- **Arsenale**: 3 armi diverse con meccaniche di ricarica e danni unici.
- **Sistema RPG**: Guadagna esperienza (XP) sconfiggendo nemici, sali di livello e ottieni punti abilità.
- **Albero delle Abilità (Skill Tree)**: Sblocca potenziamenti passivi e attivi (inclusa la rigenerazione della salute).
- **Nemici AI**: Nemici che inseguono il giocatore e reagiscono al combattimento.
- **Grafica 3D**: ambienti generati proceduralmente con effetto nebbia, geometrie e materiali condivisi tra le istanze e un'unica animazione ambientale per frame.
- **Caricamento iniziale**: tutte le texture vengono portate in VRAM e tutti gli shader compilati durante la schermata di caricamento, così il gioco non ha scatti successivi (vedi [Precaricamento completo](#precaricamento-completo-preloadassets)).
- **Audio Integrato**: Effetti sonori per spari, esplosioni e interfacce.

## 🛠️ Correzioni e Bilanciamento (v4.2)

Questa versione include importanti correzioni e bilanciamenti:
- ✅ **Fix Rigenerazione Salute**: L'abilità di rigenerazione nell'albero delle competenze ora funziona correttamente, curando il giocatore nel tempo.
- ✅ **Animazione del Boss**: il boss anima ora passo, spade impugnate con le lame verso l'alto e fendente d'attacco (l'FBX contiene una sola clip Idle molto leggera, quindi il resto è animazione procedurale sulle ossa), invece di scivolare fermo e fluttuando con le spade in posa da esposizione.
- ✅ **Palla di fuoco del boss**: al posto della sfera rossa ora viene lanciato il modello 3D del sole (`models/sun.fbx` con `textures/sun_surface.jpg`): nucleo autolluminante e guscio additivo che ruotano su sé stessi (come la clip originale del modello), bagliore che pulsa e luce arancione che illumina il terreno mentre vola.
- ⚖️ **Bilanciamento XP**: La progressione di livello è stata ricalibrata per essere più sfidante.
  - XP iniziale richiesta aumentata da 100 a **200**.
  - Moltiplicatore di difficoltà per livello passato da 1.1 a **1.2**.
  - XP guadagnata per nemico ridotta da 50 a **25**.

## ⚡ Ottimizzazioni (v4.2)

Interventi mirati al carico di GPU, memoria video e CPU per frame:

- **Texture delle piattaforme condivise**: `createPlatforms()` istanziava un `TextureLoader` *dentro* il ciclo, caricando la stessa JPEG 2835×1960 **23 volte** (~640 MB di VRAM duplicata) e `restoreCentralPlatform()` ne caricava una nuova a ogni ripristino (con leak della precedente). Ora una sola istanza per tipo (grigia 2×2, legno 2×4) tramite `loadSharedTexture()`.
- **Ombre**: la `PointLight` non proietta più ombre. In three.js una point light con `castShadow` usa una shadow map cubica, cioè **6 render completi della scena per frame**; restano l'ombra direzionale del sole e quella dello spot. I passaggi di shadow passano da 8 a 2 per frame.
- **Niente `scene.traverse` per frame**: `updateEnvironment()` percorreva l'intera gerarchia della scena a ogni frame (boss con 170 ossa, 23 piattaforme, 15 alberi, ~90 sfere di nuvole) solo per animare 4 luci e 8 cristalli. Ora usa due liste dedicate (`blinkingLights`, `spinningMeshes`).
- **Lampeggio delle antenne via intensità**: prima si alternava `light.visible`, cambiando il numero di luci attive e obbligando three.js a **ricompilare gli shader di tutti i materiali** a ogni lampeggio (una pausa ogni 1-2 secondi). Ora l'intensità va a 0 e torna al valore base: nessuna ricompilazione.
- **Pool di luci dinamiche**: three.js costruisce la chiave della cache degli shader anche dal **numero di luci** in scena. Cristalli, pickup, granate, esplosioni, campi di fuoco e palle di fuoco aggiungevano e toglievano luci di continuo: una sola luce in più faceva passare i programmi da 9 a 14 (decine di ms di scatto) a ogni evento. Ora le 15 luci dinamiche (8 cristalli + 3 pickup + 4 slot per gli effetti) vengono create all'avvio e restano sempre in scena: cambia solo la loro intensità. Una funzione di riconciliazione per frame recupera eventuali luci rimaste orfane, così il conteggio non può cambiare nemmeno per errore. Costo: 4 luci sempre presenti in più (28 invece di 24), a fronte di zero ricompilazioni.
- **Pool dei proiettili**: geometrie e materiali sono condivisi e le mesh riutilizzate (`acquireBullet`/`releaseBullet`). Prima ogni sparo — compresi gli 8 pallet del fucile a pompa — allocava geometria, materiale e mesh nuovi. Verificato: **300 spari consecutivi riusano 1 sola mesh**, 1 geometria e 1 materiale.
- **Controllo collisioni O(1)**: `updateBullets()` usava `bullets.includes(bullet)` per ogni proiettile a ogni frame (O(n²)); ora è un confronto su indice.
- **`updateLODs()` rimossa**: percorreva la gerarchia di ogni nemico a ogni frame solo per riassegnare `visible = true`, che era già il valore di default.
- **Renderer**: aggiunto `powerPreference: 'high-performance'`, così sui portatili con doppia GPU si usa la scheda dedicata.

## 🚀 Caricamento iniziale e schermata di caricamento

### Precaricamento completo (`preloadAssets()`)

three.js carica texture e shader **in modo pigro**, alla prima volta che un materiale viene effettivamente disegnato. Misurato nel gioco: appena finito il caricamento c'erano **6 texture su GPU** mentre le 5 mappe 4K della mitragliatrice erano già decodificate in RAM; equipaggiandola, il primo render passava da 6 a 11 texture e costava **~1 secondo** di scatto. Il boss, a sua volta, caricava le sue 3 mappe 2048² solo al primo spawn (ondata 10).

Alla fine del caricamento il gioco ora:

1. aggancia temporaneamente alla scena i modelli che vivono in memoria ma non sono ancora in scena (fantasmi, boss, sole) e alcune mesh di warmup per i materiali che nascono solo durante il gioco (esplosione, fuoco, particelle, aloni della palla di fuoco);
2. chiama `renderer.compile()` e forza il passaggio in VRAM di **tutte** le texture con `renderer.initTexture()`;
3. stacca i temporanei **senza chiamare `dispose()`**: `dispose()` su un materiale farebbe rilasciare a three.js il programma compilato e buttare via le texture, annullando tutto il precaricamento.

Misurato nel browser, dall'avvio in poi: **13 shader, 15 texture in GPU, 28 luci** — identici dopo cambio d'arma, spawn del boss, palla di fuoco, granata, esplosione, raccolta di cristalli e pickup (prima: ogni granata ricompilava 5-6 shader).

### Barra di caricamento volutamente finta

La barra della schermata di caricamento **non è collegata al caricamento reale**: sale con una curva che rallenta (`99 · (1 − (1 − t)²)`) e tocca il **99% in 4,5 secondi**, poi si ferma lì. Quando il caricamento finisce davvero scatta al 100% e mostra "Pronto!":

- se il caricamento è **più veloce** del previsto (browser cache calda) la barra salta al 100%;
- se è **più lento** (prima apertura, exe appena installato) resta ferma al 99% mentre il precaricamento lavora, invece di mentire arrivando al 100% e restandoci.

`THREE.DefaultLoadingManager.onProgress` non guida più la barra (logga solo a caricamento completato).

## 🕹️ Controlli

| Tasto | Azione |
| :--- | :--- |
| **W, A, S, D** oppure **Frecce ↑ ↓** | Muovi il personaggio |
| **Frecce ← →** | Ruota la visuale |
| **Mouse** | Mira |
| **Click sinistro** oppure **E** | Sparo |
| **R** | Ricarica arma |
| **Spazio** | Salta / Doppio Salto |
| **G** | Lancia granata |
| **1, 2, 3** oppure **rotella del mouse** | Cambia arma |
| **P** | Apri/chiudi l'albero delle abilità |
| **ESC** | Pausa |

## 🚀 Come eseguirlo

Serve un server statico (aprendo `index.html` con `file://` il browser blocca il caricamento di modelli e texture):

```bash
python3 -m http.server 8000      # oppure: npx http-server -p 8000
```

Per l'app desktop: `npm install`, poi `npm run sync` (solo sincronizzazione in `dist/`) oppure `npm run build` (sincronizza e compila l'exe Tauri).

## 📂 Struttura del Progetto

```text
.
├── index.html        # Punto di ingresso HTML e stili CSS
├── game.js           # Logica principale del gioco, rendering Three.js e AI
├── README.md         # Questo file
├── libs/             # three.js (r128), FBXLoader e fflate
├── models/           # Modelli FBX (boss, fantasma, armi, sole)
├── textures/         # Texture dei modelli e del terreno
├── build.js          # Sincronizza in dist/ e compila l'exe Tauri
└── src-tauri/        # Progetto Tauri (app desktop)
```

> `_sun_preview.html` è una pagina di prova per guardare la palla di fuoco del boss con le stesse impostazioni del renderer di gioco: va aperta da un server locale (es. `python3 -m http.server 8000`) perché carica `game.js` via `fetch`.

### Crediti degli asset

- Sole (`models/sun.fbx`, `textures/sun_surface.jpg`) — "Sun" di **Sebastian Sosnowski**, scaricato da **Fab** (asset uid `47617169-00e1-4856-8f53-bbbaea605ad5`).
- Scheletro del boss, fantasma e armi — asset di terze parti inclusi nel progetto.

## 🧩 Sviluppo Futuro

Pianificazioni per le prossime versioni:
- [ ] Sistema di salvataggio dei progressi (LocalStorage).
- [ ] Nuove mappe e ambienti variabili.
- [ ] Modalità multiplayer locale o online.
- [ ] Aggiunta di nuovi tipi di nemici e boss.
- [ ] Menu impostazioni audio e video.

## 🤝 Contributi

I contributi sono benvenuti! Sentiti libero di aprire una *Issue* per segnalare bug o una *Pull Request* per nuove funzionalità.

## 📄 Licenza

Il codice di questo progetto è distribuito sotto **Mozilla Public License 2.0**: il testo completo è in [`LICENSE`](../LICENSE). I modelli e le texture (`models/`, `textures/`) sono opere di terze parti e restano di proprietà dei rispettivi autori.

---
*Sviluppato con ❤️ utilizzando Three.js*
