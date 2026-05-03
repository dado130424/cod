# COD v4.2 - Browser FPS Game

Un gioco sparatutto in prima persona (FPS) sviluppato interamente per browser utilizzando **Three.js**. Il gioco combina meccaniche di combattimento classiche con un sistema di progressione RPG, alberi delle abilità e nemici AI.

![Version](https://img.shields.io/badge/version-4.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Technology](https://img.shields.io/badge/tech-Three.js-orange)

## 🎮 Caratteristiche Principali

- **Gameplay FPS Fluido**: Movimenti fluidi con supporto per corsa, salto e **doppio salto**.
- **Arsenale**: 3 armi diverse con meccaniche di ricarica e danni unici.
- **Sistema RPG**: Guadagna esperienza (XP) sconfiggendo nemici, sali di livello e ottieni punti abilità.
- **Albero delle Abilità (Skill Tree)**: Sblocca potenziamenti passivi e attivi (inclusa la rigenerazione della salute).
- **Nemici AI**: Nemici che inseguono il giocatore e reagiscono al combattimento.
- **Grafica 3D**: Ambienti generati con effetti di nebbia (fog) e ottimizzazioni LOD.
- **Audio Integrato**: Effetti sonori per spari, esplosioni e interfacce.

## 🛠️ Correzioni e Bilanciamento (v4.2)

Questa versione include importanti correzioni e bilanciamenti:
- ✅ **Fix Rigenerazione Salute**: L'abilità di rigenerazione nell'albero delle competenze ora funziona correttamente, curando il giocatore nel tempo.
- ⚖️ **Bilanciamento XP**: La progressione di livello è stata ricalibrata per essere più sfidante.
  - XP iniziale richiesta aumentata da 100 a **200**.
  - Moltiplicatore di difficoltà per livello passato da 1.1 a **1.2**.
  - XP guadagnata per nemico ridotta da 50 a **25**.

## 🕹️ Controlli

| Tasto | Azione |
| :--- | :--- |
| **W, A, S, D** | Muovi il personaggio |
| **Mouse** | Mira |
| **Click Sinistro** | Sparo |
| **R** | Ricarica arma |
| **Spazio** | Salta / Doppio Salto |
| **Shift** | Corri |
| **G** | Lancia granata |
| **E** | Interagisci / Apri Skill Tree |
| **1, 2, 3** | Cambia arma |

## 🚀 Come Giocare

### Opzione 1: Esecuzione Locale (Consigliata per sviluppo)

Poiché il gioco utilizza moduli ES6 e texture, potrebbe richiedere un server locale per funzionare correttamente senza errori CORS.

1. **Clona il repository**:
   ```bash
   git clone <URL_DEL_TUO_REPO>
   cd cod-v4-2
   ```

2. **Avvia un server locale**:
   Se hai Python installato:
   ```bash
   python3 -m http.server 8000
   ```
   Oppure con Node.js (richiede `http-server`):
   ```bash
   npx http-server -p 8000
   ```

3. **Apri il browser**:
   Vai su `http://localhost:8000`

### Opzione 2: GitHub Pages

Se il repository è configurato per GitHub Pages, puoi giocare direttamente online visitando:
`https://<tuo-username>.github.io/<nome-repo>/`

## 📂 Struttura del Progetto

```text
.
├── index.html        # Punto di ingresso HTML e stili CSS
├── game.js           # Logica principale del gioco, rendering Three.js e AI
├── README.md         # Questo file
└── assets/           # (Opzionale) Cartella per texture e modelli se esterni
```

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

Questo progetto è distribuito sotto licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.

---
*Sviluppato con ❤️ utilizzando Three.js*
