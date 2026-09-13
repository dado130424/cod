# COD v4.2 — FPS in Three.js

Sparatutto in prima persona con progressione RPG, albero delle abilità e boss, scritto in **JavaScript puro con Three.js**. Gira sia nel browser sia come **app desktop** (Tauri).

![Version](https://img.shields.io/badge/versione-4.2-blue)
![License](https://img.shields.io/badge/licenza-MPL--2.0-blueviolet)
![Three.js](https://img.shields.io/badge/Three.js-r128-orange)
![Piattaforma](https://img.shields.io/badge/piattaforma-Web%20%7C%20Windows-lightgrey)

> Il gioco completo si trova nella cartella **[`cod v4 2/`](cod%20v4%202/)**.
> I dettagli implementativi, le correzioni e i numeri misurati delle ottimizzazioni sono in [`cod v4 2/README.md`](cod%20v4%202/README.md).

## Indice

- [Caratteristiche](#-caratteristiche)
- [Come giocare](#-come-giocare)
  - [Nel browser](#1-nel-browser)
  - [App desktop (Windows)](#2-app-desktop-windows)
- [Costruire l'eseguibile](#-costruire-leseguibile)
- [Controlli](#-controlli)
- [Codici cheat](#-codici-cheat)
- [Struttura del progetto](#-struttura-del-progetto)
- [Sotto il cofano](#-sotto-il-cofano)
- [Crediti degli asset](#-crediti-degli-asset)
- [Licenza](#-licenza)

## 🎮 Caratteristiche

- **Combattimento FPS**: movimento, salto e **doppio salto**, rinculo, flash di volata, hit marker e **headshot** (colpire la parte alta del nemico infligge danno doppio).
- **3 armi** con munizioni, cadenza e ricarica proprie: pistola, mitragliatrice e fucile a pompa (8 pallet per colpo).
- **Granate** con rimbalzo, danno ad area e, con l'abilità dedicata, un **campo di fuoco** persistente.
- **Sistema a ondate**: ogni ondata aumenta il numero di nemici (`min(4 + ondata × 2, 30)`); **ogni 10 ondate arriva il boss**.
- **Boss**: scheletro animato con spade, attacco in mischia che **distrugge la piattaforma centrale**, palla di fuoco lanciata a distanza e barra della salute dedicata.
- **Progressione RPG**: XP, livelli, punti abilità e un **albero delle abilità** con 12 potenziamenti divisi in Attacco, Difesa e Utilità.
- **Abilità temporanee** raccolte dai cristalli: ⚡ velocità, 🛡️ scudo, 👻 invisibilità.
- **Interfaccia completa**: barra della salute, munizioni, contatore ondate, XP, albero delle abilità, menu di pausa, impostazioni e schermata di fine partita.
- **Impostazioni** persistenti (sensibilità del mouse e volume) salvate in `localStorage`.
- **Audio interamente sintetizzato** con la Web Audio API: nessun file audio nel progetto.

## 🚀 Come giocare

### 1. Nel browser

Il gioco carica modelli e texture da file locali, quindi serve un server statico (aprire `index.html` con `file://` viene bloccato dalle regole CORS del browser).

Scarica il progetto (**Code → Download ZIP**) oppure clonalo:

```bash
git clone https://github.com/tuo-utente/tuo-repo.git
cd tuo-repo/"cod v4 2"
```

Poi avvia un server statico nella cartella del gioco:

```bash
python3 -m http.server 8000     # oppure: npx http-server -p 8000
```

Apri <http://localhost:8000> e premi **GIOCA**.

### 2. App desktop (Windows)

L'eseguibile e l'installer sono già compilati e **inclusi nel repository** (e allegati alle Release, quando presenti):

- `COD v4.2_0.1.0_x64-setup.exe` — installer per Windows (NSIS)
- `cod-v4.exe` — l'app senza installazione, avviabile direttamente

L'app si apre in una finestra 1280×720 e contiene già tutti gli asset: non serve un server locale. Per ricompilare: `npm run build` (l'MSI finisce in `src-tauri/target/release/bundle/`).

## 🔧 Costruire l'eseguibile

Requisiti: **Node.js 18+** e il **toolchain Rust** (per Tauri).

```bash
cd "cod v4 2"
npm install          # installa la CLI di Tauri

npm run sync         # sincronizza i sorgenti in dist/ (utile per provare nel browser)
npm run build        # sincronizza e compila l'exe
```

`build.js` copia `index.html`, `game.js`, `libs/`, `models/` e `textures/` nella cartella `dist/` (che è ciò che Tauri incorpora nell'applicazione) e poi lancia `tauri build`. I due artefatti finiscono in `src-tauri/target/release/bundle/`.

## 🕹️ Controlli

| Tasto | Azione |
| :--- | :--- |
| **W A S D** | Muovi il personaggio |
| **Frecce ↑ ↓** | Muovi il personaggio (alternativa) |
| **Frecce ← →** | Ruota la visuale |
| **Mouse** | Mira (il puntatore viene catturato al primo click) |
| **Click sinistro** oppure **E** | Sparo (tenendo premuto con la mitragliatrice si spara in automatico) |
| **R** | Ricarica l'arma |
| **Spazio** | Salto / doppio salto |
| **G** | Lancia una granata |
| **1 / 2 / 3** oppure **rotella del mouse** | Cambia arma (pistola / mitragliatrice / fucile a pompa) |
| **P** | Apri/chiudi l'albero delle abilità |
| **ESC** | Pausa |

Non c'è un tasto per correre: la velocità di movimento aumenta con i potenziamenti dell'albero delle abilità e con il cristallo ⚡.

## 🥚 Codici cheat

Da digitare **durante la partita** (non dal menu): la sequenza si azzera dopo 2 secondi di pausa.

| Codice | Effetto |
| :--- | :--- |
| `davide123` | +1.000.000 XP (scatena tutti i passaggi di livello) |
| `spawnaboss` | Evoca immediatamente il boss |

## 📂 Struttura del progetto

```text
.
├── README.md                      # Questo file
├── LICENSE                        # Mozilla Public License 2.0
├── cod-v4.exe                     # App desktop già compilata (72 MB)
├── COD v4.2_0.1.0_x64-setup.exe   # Installer per Windows (70 MB)
└── cod v4 2/                      # Il gioco
    ├── index.html            # Pagina di ingresso: HUD, menu e stili CSS
    ├── game.js               # Tutta la logica: rendering, input, AI, ondate, boss
    ├── libs/                 # three.js r128, FBXLoader e fflate (già inclusi)
    ├── models/               # Modelli FBX: boss, nemici, armi e sole
    ├── textures/             # Texture di terreno, piattaforme e modelli
    ├── build.js              # Sincronizza in dist/ e compila l'app desktop
    ├── package.json          # Script npm e dipendenza @tauri-apps/cli
    ├── _sun_preview.html     # Paginetta di prova per la palla di fuoco del boss
    ├── _gen_icon.js          # Script che genera app-icon.png
    ├── app-icon.png          # Icona di partenza dell'app
    ├── dist/                 # Generata da build.js (non versionata)
    └── src-tauri/            # Progetto Tauri (finestra desktop + installer)
```

## ⚙️ Sotto il cofano

Tre scelte caratterizzano l'implementazione, tutte documentate con i numeri misurati in [`cod v4 2/README.md`](cod%20v4%202/README.md):

- **Precaricamento completo all'avvio.** three.js carica texture e shader in modo pigro, alla prima volta che un materiale viene disegnato: nel gioco questo significava uno scatto di circa un secondo al primo cambio d'arma. Alla fine del caricamento il gioco aggancia temporaneamente i modelli non ancora in scena, compila tutti gli shader e forza tutte le texture in memoria video: da lì in poi il conteggio non cambia più.
- **Numero di luci costante.** three.js include il numero di luci nella chiave di cache degli shader: aggiungere o togliere una sola luce faceva ricompilare tutti i materiali. Le luci dinamiche (cristalli, pickup, granate, esplosioni, palle di fuoco) vengono ora create all'avvio e restano in scena, variando solo di intensità.
- **Barra di caricamento volutamente finta.** Non è collegata all'avanzamento reale: sale fino al 99% e si ferma lì, e scatta al 100% solo quando il caricamento è davvero terminato.

## 🎨 Crediti degli asset

- Modello del sole (`models/sun.fbx`, `textures/sun_surface.jpg`) — **"Sun" di Sebastian Sosnowski**, scaricato da Fab (asset uid `47617169-00e1-4856-8f53-bbbaea605ad5`).
- Scheletro del boss, fantasma e armi — asset di terze parti inclusi nel progetto.

Se sei l'autore di uno di questi asset e vuoi una dicitura diversa, apri una *issue*.

## 📄 Licenza

Il **codice** di questo progetto è distribuito sotto **Mozilla Public License 2.0** ([MPL-2.0](https://mozilla.org/MPL/2.0/)): il testo completo è nel file [LICENSE](LICENSE).

L'MPL è un *copyleft per file*: puoi usare, modificare e ridistribuire il progetto anche dentro software proprietario, ma i file del progetto che modifichi devono restare sotto MPL. Copyright © Fabio.

I **modelli e le texture** (`models/`, `textures/`) sono opere di terze parti e restano di proprietà dei rispettivi autori: la MPL non si estende a quegli asset.

---

*Sviluppato con ❤️ utilizzando Three.js.*
