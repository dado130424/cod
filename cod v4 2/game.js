// Variabili globali
let scene, camera, renderer;
let player = {
    health: 100,
    maxHealth: 100,
    speed: 0.1,
    jumpSpeed: 0.25,
    doubleJumpSpeed: 0.3, // Salto più potente per il doppio salto
    gravity: 0.008,
    velocityY: 0,
    isGrounded: true,
    position: { x: 0, y: 1.7, z: 0 },
    rotation: { x: 0, y: 0 },
    ammo: 15,
    maxAmmo: 15,
    reloadCooldown: 0,
    isReloading: false,
    currentWeapon: 'pistol', // 'pistol', 'machineGun', o 'shotgun'
    machineGunAmmo: 100,
    maxMachineGunAmmo: 100,
    machineGunReloadCooldown: 0,
    isMachineGunReloading: false,
    shotgunAmmo: 8,
    maxShotgunAmmo: 8,
    shotgunReloadCooldown: 0,
    isShotgunReloading: false,
    shotgunFireCooldown: 0, // Nuovo cooldown per fucile
    fireRate: 0,
    isMouseDown: false,
    grenades: 3, // Munizioni granate
    grenadeCooldown: 0, // Cooldown granate
    jumpsRemaining: 2, // Salti rimanenti (per doppio salto)
    maxJumps: 2, // Massimo numero di salti
    hasDoubleJumped: false, // Flag per tracciare se hai già fatto il doppio salto
    spacePressed: false, // Flag per tracciare se spazio è stato premuto
    eKeyPressed: false, // Flag per tracciare se E è premuto
    // Sistema abilità speciali
    abilities: {
        speed: { active: false, duration: 0, maxDuration: 600, cooldown: 0, maxCooldown: 300 }, // 10 secondi durata, 5 cooldown
        shield: { active: false, duration: 0, maxDuration: 480, cooldown: 0, maxCooldown: 240 }, // 8 secondi durata, 4 cooldown
        invisibility: { active: false, duration: 0, maxDuration: 360, cooldown: 0, maxCooldown: 450 } // 6 secondi durata, 7.5 cooldown
    },
    currentAbility: null,
    shieldHealth: 0,
    baseSpeed: 0.1,
    // Sistema XP e livelli
    xp: 0,
    level: 1,
    xpForNextLevel: 200,
    skillPoints: 0,
    healthRegen: 0,
    shieldMax: 50,
    // Nuove variabili per le abilità
    attackDamageMultiplier: 1,
    attackSpeedMultiplier: 1,
    projectilesPierce: 0,
    reloadSpeedMultiplier: 1,
    damageReduction: 0,
    speedMultiplier: 1,
    jumpMultiplier: 1,
    maxGrenades: 3,
    grenadeRadius: 1,
    grenadeFireDuration: 0,
    grenadeFireDamage: 0,
    burnTimer: 0, // Frame residui di bruciatura (boss)
    skillTree: {
        // Ramo Attacco
        attack_damage_1: 0,
        attack_speed_1: 0,
        attack_pierce_1: 0,
        attack_reload_1: 0,
        // Ramo Difesa
        defense_regen_1: 0,
        defense_health_1: 0,
        defense_regen_2: 0,
        defense_damage_reduction_1: 0,
        // Ramo Utilità
        utility_speed_1: 0,
        utility_jump_1: 0,
        utility_grenades_1: 0,
        utility_fire_persistence_1: 0
    }
};
let gun, machineGun, shotgun, enemies = [], platformEnemies = [], bullets = [], platforms = [], columns = [], healthPickups = [], grenades = [], crystals = [];
let ghostTemplate = null; // Modello fantasma precaricato (clonato per ogni nemico)
let ghostTemplateFailed = false;
let boss = null;            // Boss attivo
let bossActive = false;
let bossWave = false;
let bossFireballs = [];     // Palle di fuoco lanciate dal boss
let breakingPlatforms = []; // Piattaforme che stanno cadendo
let centralPlatformMissing = false;
let sunTemplate = null;     // Modello 3D del sole (precaricato, usato come palla di fuoco)
let skeletonModel = null;   // Modello scheletro boss (precaricato)
let skeletonMixer = null;   // AnimationMixer dell'animazione Idle
let skeletonBones = null;   // Ossa del boss per l'animazione procedurale (passo, fendente)
let abilityTreeOpen = false;
let cameraShakeIntensity = 0;
let keys = {};
let mouse = { x: 0, y: 0, locked: false };
let gameRunning = true;
let isPaused = false;
let pauseMenu = null;
let startTime = Date.now();
// Sistema a ondate
let wave = 0;
let waveInProgress = false;
let waveEnemiesTotal = 0;
let waveEnemiesSpawned = 0;
let waveSpawnTimer = 0;
let waveSpawnInterval = 800; // Intervallo spawn nemici dentro un'ondata (ms)
let intermissionTimer = 0;
let audioContext, shootSound, hitSound, ambientSound, grenadeExplosionSound, enemyDeathSound;
let kills = 0; // Contatore uccisioni
let recoil = 0; // Rinculo visivo della camera
let muzzleFlash; // Flash di volata
let muzzleTimer = 0;
let settings = { sensitivity: 0.002, masterVolume: 1.0 };
let masterGain = null;
let gameStarted = false; // Menu principale
let settingsOpenedFrom = 'main';

// Cheat code system
let cheatSequence = '';
const cheatCode = 'davide123';
const bossCheatCode = 'spawnaboss';
let cheatTimeout;

// --- Liste dedicate per le animazioni ambientali ---
// Aggiornare queste liste invece di percorrere l'intera scena con scene.traverse
// a ogni frame: la scena contiene centinaia di oggetti (boss con 170 ossa,
// 23 piattaforme, 15 alberi, ~90 sfere delle nuvole...).
let blinkingLights = [];   // luci delle antenne (lampeggio)
let spinningMeshes = [];   // mesh dei cristalli (rotazione)

// --- Cache delle texture ---
// Una sola istanza (e un solo upload in GPU) per combinazione file + repeat.
// Prima ogni piattaforma creava il proprio TextureLoader: la stessa JPEG
// 2835x1960 veniva caricata 23 volte, cioe' ~640 MB di VRAM duplicata.
const textureCache = new Map();

function loadSharedTexture(path, repeatX, repeatY) {
    const key = repeatX === undefined ? path : path + '|' + repeatX + '|' + repeatY;
    let texture = textureCache.get(key);
    if (!texture) {
        texture = new THREE.TextureLoader().load(path);
        if (repeatX !== undefined) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(repeatX, repeatY);
        }
        textureCache.set(key, texture);
    }
    return texture;
}

// --- Pool dei proiettili ---
// Geometrie e materiali condivisi e mesh riutilizzate: prima ogni sparo
// (compresi gli 8 pallet del fucile a pompa) allocava geometria, materiale e
// mesh nuovi, con relativo churn di buffer GPU e di garbage collector.
const bulletPool = [];
const bulletGeometries = new Map();
const bulletMaterials = new Map();

// Vettori di appoggio riusati dallo spread (evitano allocazioni a ogni sparo).
const _shotDir = new THREE.Vector3();
const _shotRight = new THREE.Vector3();
const _shotUp = new THREE.Vector3();

function getBulletGeometry(size, segments) {
    const key = segments + ':' + size;
    let geometry = bulletGeometries.get(key);
    if (!geometry) {
        geometry = new THREE.SphereGeometry(size, segments, segments);
        bulletGeometries.set(key, geometry);
    }
    return geometry;
}

function getBulletMaterial(color, emissiveIntensity, shininess) {
    const key = color + ':' + emissiveIntensity + ':' + shininess;
    let material = bulletMaterials.get(key);
    if (!material) {
        material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: emissiveIntensity,
            shininess: shininess,
            specular: 0xffffff
        });
        bulletMaterials.set(key, material);
    }
    return material;
}

// Prende una mesh dal pool (o ne crea una nuova) gia' configurata come proiettile.
function acquireBullet(size, segments, color, emissiveIntensity, shininess) {
    const bullet = bulletPool.pop() || new THREE.Mesh();
    bullet.geometry = getBulletGeometry(size, segments);
    bullet.material = getBulletMaterial(color, emissiveIntensity, shininess);
    bullet.visible = true;
    bullet.scale.set(1, 1, 1);
    bullet.rotation.set(0, 0, 0);
    bullet.userData = null;
    if (!bullet.velocity) bullet.velocity = new THREE.Vector3();
    return bullet;
}

// Rimette il proiettile nel pool invece di abbandonarlo al garbage collector.
function releaseBullet(bullet, index) {
    if (bullets[index] === bullet) {
        bullets.splice(index, 1);
    } else {
        const found = bullets.indexOf(bullet);
        if (found !== -1) bullets.splice(found, 1);
    }
    scene.remove(bullet);
    bullet.userData = null;
    bullet.visible = false;
    if (bulletPool.length < 256) bulletPool.push(bullet);
}

// --- Pool di luci dinamiche ---
// Tutte le luci che nel gioco si accendono e si spengono (cristalli, pickup,
// granate, esplosioni, campo di fuoco, palle di fuoco) vengono prese da questo
// pool e non vengono mai aggiunte o rimosse dalla scena: cambia solo la loro
// intensita'.
//
// Il motivo e' che three.js costruisce la chiave della cache degli shader anche
// dal NUMERO di luci presenti (numPointLights). Aggiungere o togliere una sola
// luce obbliga quindi a ricompilare i programmi di tutti i materiali: misurato
// nel gioco, una luce in piu' faceva passare i programmi da 9 a 14 (decine di ms
// di scatto) a ogni granata lanciata, cristallo raccolto o palla di fuoco.
// Con il pool il conteggio resta identico dall'avvio alla fine della partita.
const DYNAMIC_LIGHT_SLOTS = 15; // 8 cristalli + 3 pickup + 4 slot per gli effetti
let dynamicLights = [];
let freeDynamicLights = [];

function createDynamicLightPool() {
    for (let i = 0; i < DYNAMIC_LIGHT_SLOTS; i++) {
        const light = new THREE.PointLight(0xffffff, 0, 1);
        light.position.set(0, -100, 0); // parcheggiata fuori dal mondo
        light.castShadow = false;
        scene.add(light);
        dynamicLights.push(light);
        freeDynamicLights.push(light);
    }
}

// Restituisce una luce accesa e posizionabile. Se il pool e' esaurito restituisce
// null: l'effetto funziona comunque, semplicemente non emette luce.
function acquireDynamicLight(color, intensity, distance) {
    const light = freeDynamicLights.pop();
    if (!light) return null;
    light.color.setHex(color);
    light.intensity = intensity;
    light.distance = distance;
    light.visible = true;
    light.position.set(0, 0, 0);
    return light;
}

// Spegne la luce e la rimette nel pool, senza toccare il numero di luci in scena.
function releaseDynamicLight(light) {
    if (!light) return;
    light.intensity = 0;
    // La luce puo' essere figlia di un gruppo appena rimosso: la riporto in scena.
    if (light.parent !== scene) scene.add(light);
    light.position.set(0, -100, 0);
    if (freeDynamicLights.indexOf(light) === -1) freeDynamicLights.push(light);
}

// true se l'oggetto e' (ancora) agganciato alla scena.
function isInScene(object) {
    let node = object;
    while (node.parent) node = node.parent;
    return node === scene;
}

// Rete di sicurezza: se un oggetto che portava con se' una luce del pool viene
// rimosso senza passare da releaseDynamicLight, la luce uscirebbe dalla scena e
// il numero di luci cambierebbe (costringendo three.js a ricompilare gli shader).
// Qui la recupero e la rimetto a disposizione. Costa 15 confronti per frame.
function reconcileDynamicLights() {
    for (let i = 0; i < dynamicLights.length; i++) {
        const light = dynamicLights[i];
        if (isInScene(light)) continue;
        light.intensity = 0;
        light.position.set(0, -100, 0);
        scene.add(light);
        if (freeDynamicLights.indexOf(light) === -1) freeDynamicLights.push(light);
    }
}

// Raccoglie i materiali unici di un albero di oggetti.
function collectMaterials(root, out) {
    root.traverse(function(child) {
        if (!child.material) return;
        const list = Array.isArray(child.material) ? child.material : [child.material];
        for (let i = 0; i < list.length; i++) {
            if (out.indexOf(list[i]) === -1) out.push(list[i]);
        }
    });
    return out;
}

// Forza il passaggio in VRAM di tutte le texture usate da questi materiali.
function uploadAllTextures(materials) {
    let uploaded = 0;
    const seen = [];
    materials.forEach(function(material) {
        for (const key in material) {
            const value = material[key];
            if (value && value.isTexture && seen.indexOf(value) === -1) {
                seen.push(value);
                renderer.initTexture(value);
                uploaded++;
            }
        }
    });
    return uploaded;
}

// Precarica in GPU tutto quello che e' gia' in memoria, cosi' la partita non deve
// piu' compilare shader ne' caricare texture: three.js lo fa in modo pigro, alla
// prima volta che un materiale viene effettivamente disegnato, quindi la prima
// volta che si equipaggia la mitragliatrice, che appare un nemico o che il boss
// lancia una palla di fuoco si pagava uno scatto.
function preloadAssets() {
    // 1) I modelli che vivono in memoria ma non sono ancora nella scena (fantasmi,
    //    boss, sole) li aggancio temporaneamente: renderer.compile() compila i
    //    programmi con la stessa configurazione di luci della partita.
    const temporary = [];
    [ghostTemplate, skeletonModel, sunTemplate].forEach(function(obj) {
        if (obj && !obj.parent) { scene.add(obj); temporary.push(obj); }
    });

    // 2) Materiali che nascono solo durante il gioco (esplosione, fuoco,
    //    particelle): una mesh invisibile per famiglia copre i loro shader.
    const warmups = [
        new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 })
        ),
        new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0x220000, emissiveIntensity: 0.5 })
        )
    ];
    // Gli aloni della palla di fuoco nascono pigramente al primo lancio: li creo
    // adesso, altrimenti il loro shader (additivo e senza nebbia) si compilerebbe
    // alla prima palla di fuoco del boss.
    warmups.push(new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 4, 4),
        getSunHaloLayers()[0].material
    ));

    warmups.forEach(function(mesh) {
        mesh.visible = false;
        scene.add(mesh);
    });

    const materials = collectMaterials(scene, []);
    renderer.compile(scene, camera);
    const uploaded = uploadAllTextures(materials);

    // 3) Stacco solo gli oggetti temporanei.
    //    ATTENZIONE: qui non va chiamato dispose(). Dispose su un materiale fa
    //    rilasciare a three.js il programma compilato (renderer.info.programs lo
    //    perde) e butta via anche le texture in VRAM: tutto il precaricamento
    //    appena fatto verrebbe annullato. Le mesh di warmup sono minuscole,
    //    tenerle in cache e' esattamente lo scopo.
    temporary.forEach(function(obj) { scene.remove(obj); });
    warmups.forEach(function(mesh) { scene.remove(mesh); });

    console.log('Precaricamento: ' + uploaded + ' texture in GPU, ' +
                renderer.info.programs.length + ' shader compilati, ' +
                renderer.info.memory.geometries + ' geometrie');
}

// Inizializzazione del gioco
function init() {
    loadSettings();
    
    // Creazione scena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 30, 120);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(player.position.x, player.position.y, player.position.z);
    
    // Aggiungi la camera alla scena così le armi (figli della camera) vengono renderizzate
    scene.add(camera);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('gameCanvas'),
        antialias: false,
        // Sui portatili con doppia GPU forza la scheda dedicata invece di quella integrata.
        powerPreference: 'high-performance',
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Cielo luminoso
    renderer.setClearColor(0x87ceeb, 1);
    
    // Pool di luci dinamiche: va creato prima di tutto cio' che accende luci a
    // runtime (cristalli, pickup, granate, esplosioni, palle di fuoco).
    createDynamicLightPool();
    
    // Crea cielo con nuvole e sole
    createSky();
    
    // Luci migliorate per cielo luminoso
    const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.4);
    scene.add(ambientLight);
    
    // Luce puntuale dinamica
    const pointLight = new THREE.PointLight(0xffaa00, 0.8, 20);
    pointLight.position.set(0, 10, 0);
    // NB: questa PointLight non proietta ombre. In three.js una point light con
    // castShadow usa una shadow map cubica, cioe' 6 render completi della scena
    // per frame. L'ombra direzionale del sole e' l'unica indispensabile.
    pointLight.castShadow = false;
    scene.add(pointLight);
    
    // Luce colorata per atmosfera
    const spotLight = new THREE.SpotLight(0x00ffff, 0.4);
    spotLight.position.set(-20, 20, -20);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.3;
    spotLight.castShadow = true;
    scene.add(spotLight);
    
    // Terreno migliorato con texture
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    
    // Carica texture dell'erba
    const groundTexture = loadSharedTexture('textures/texture_erba.jpg', 20, 20);
    
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        map: groundTexture,
        color: 0x222222, // Grigio molto scuro per erba molto più scura
        emissive: 0x111122,
        emissiveIntensity: 0.005, // Emissività quasi nulla
        shininess: 5 // Molto meno riflettente
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.castShadow = false;
    scene.add(ground);
    
    // Crea piattaforme
    createPlatforms();
    
    // Crea ambiente
    createEnvironment();
    
    // Crea cristalli di abilità
    for (let i = 0; i < 2; i++) {
        createCrystal();
    }
    
    // Crea oggetti cura
    createHealthPickups();
    
    // Muri per delimitare l'area
    createWalls();
    
    // Creazione pistola
    createGun();
    
    // Creazione mitragliatrice
    createMachineGun();
    
    // Creazione fucile a pompa
    createShotgun();
    
    // Precarica il modello del fantasma (usato per i nemici)
    loadGhostTemplate(function() {});
    
    // Precarica il modello dello scheletro (boss)
    loadSkeletonTemplate();
    
    // Precarica il modello del sole (usato come palla di fuoco del boss)
    loadSunTemplate();
    
    // Flash di volata
    createMuzzleFlash();
    
    // Mesh "warmup" invisibile: precompila lo shader dei proiettili (Phong con
    // specular e senza mappa) durante il caricamento, così il primo sparo non scatta.
    const warmupBullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.8, shininess: 200, specular: 0xffffff })
    );
    warmupBullet.visible = false;
    scene.add(warmupBullet);
    
    // Event listeners
    setupEventListeners();
    
    // Inizializza suoni
    initAudio();
    
    // Avvia suono ambient
    if (audioContext && ambientSound) {
        // Avvia suono ambient dopo l'interazione dell'utente
        document.addEventListener('click', function initAudioOnInteraction() {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            playAmbientSound();
            document.removeEventListener('click', initAudioOnInteraction);
        }, { once: true });
    }
    
    // Aggiorna display XP iniziale
    updateXPDisplay();
    
    // Inizio game loop
    animate();
}

function createSky() {
    // Sole
    const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 1
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(30, 40, -20);
    scene.add(sun);
    
    // Luce solare
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(30, 40, -20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);
    
    // Nuvole
    for (let i = 0; i < 15; i++) {
        createCloud();
    }
}

function createCloud() {
    const cloudGroup = new THREE.Group();
    
    // Crea nuvola con sfere multiple
    const cloudParts = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < cloudParts; i++) {
        const cloudGeometry = new THREE.SphereGeometry(
            2 + Math.random() * 3, 
            8, 
            6
        );
        const cloudMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            emissive: 0xffffff,
            emissiveIntensity: 0.1
        });
        const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        // Posizione casuale relativa al centro della nuvola
        cloudPart.position.set(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 8
        );
        
        cloudGroup.add(cloudPart);
    }
    
    // Posizione casuale nel cielo
    cloudGroup.position.set(
        (Math.random() - 0.5) * 100,
        25 + Math.random() * 15,
        (Math.random() - 0.5) * 100
    );
    
    scene.add(cloudGroup);
}
function initAudio() {
    // Crea contesto audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Nodo master per il volume generale
    masterGain = audioContext.createGain();
    masterGain.gain.value = settings.masterVolume;
    masterGain.connect(audioContext.destination);
    
    // Crea suono sparo
    shootSound = createShootSound();
    
    // Crea suono colpo
    hitSound = createHitSound();
    
    // Crea suono ambient
    ambientSound = createAmbientSound();
    
    // Crea suono esplosione granata
    grenadeExplosionSound = createGrenadeExplosionSound();
    
    // Crea suono morte nemico
    enemyDeathSound = createEnemyDeathSound();
}

function createShootSound() {
    const duration = 0.1;
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Suono sparo sintetizzato
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Rumore bianco filtrato
        const noise = (Math.random() - 0.5) * 2;
        // Envelope
        const envelope = Math.exp(-t * 30);
        // Frequenza modulata
        const freq = 200 + Math.sin(t * 100) * 50;
        const wave = Math.sin(2 * Math.PI * freq * t) * 0.3;
        data[i] = (noise * 0.7 + wave * 0.3) * envelope;
    }
    
    return buffer;
}

function createHitSound() {
    const duration = 0.15;
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Suono impatto sintetizzato
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Rumore con envelope
        const noise = (Math.random() - 0.5) * 2;
        const envelope = Math.exp(-t * 20);
        // Click iniziale
        const click = t < 0.01 ? 1 : 0;
        data[i] = (noise * 0.8 + click * 0.2) * envelope;
    }
    
    return buffer;
}

function createAmbientSound() {
    const duration = 2.0;
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Suono ambient sintetizzato (basso ronzio)
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const wave = Math.sin(2 * Math.PI * 100 * t) * 0.1 + 
                    Math.sin(2 * Math.PI * 150 * t) * 0.05;
        const envelope = Math.exp(-t * 0.5);
        data[i] = wave * envelope * 0.3;
    }
    
    return buffer;
}

function createGrenadeExplosionSound() {
    const duration = 0.8;
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Suono esplosione granata sintetizzato
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Rumore bianco per l'esplosione
        const noise = (Math.random() - 0.5) * 2;
        // Bassa frequenza per il boato
        const boom = Math.sin(2 * Math.PI * 50 * t) * 0.5;
        // Envelope che decade rapidamente
        const envelope = Math.exp(-t * 8);
        // Combina rumore e bassa frequenza
        data[i] = (noise * 0.7 + boom * 0.3) * envelope;
    }
    
    return buffer;
}

function createEnemyDeathSound() {
    const duration = 0.4;
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Suono morte nemico sintetizzato
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Frequenza discendente per effetto "caduta"
        const freq = 200 * (1 - t / duration);
        const wave = Math.sin(2 * Math.PI * freq * t);
        // Envelope che decade
        const envelope = Math.exp(-t * 5);
        // Aggiungi un po' di rumore per effetto "sgradevole"
        const noise = (Math.random() - 0.5) * 0.1;
        data[i] = (wave * 0.8 + noise) * envelope * 0.4;
    }
    
    return buffer;
}

function playShootSound() {
    if (!audioContext || !shootSound) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = shootSound;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
}

function playHitSound() {
    if (!audioContext || !hitSound) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = hitSound;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
}

function playAmbientSound() {
    if (!audioContext || !ambientSound) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = ambientSound;
    source.loop = true;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.1;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
    
    return source;
}

function playGrenadeExplosionSound() {
    if (!audioContext || !grenadeExplosionSound) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = grenadeExplosionSound;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
}

function playEnemyDeathSound() {
    if (!audioContext || !enemyDeathSound) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = enemyDeathSound;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
}

function createHealthPickups() {
    // Posizioni dei pickup di cura
    const pickupPositions = [
        { x: 0, y: 1.5, z: 0, type: 'ground' }, // Centro in basso
        { x: 0, y: 9.5, z: 0, type: 'platform' }, // Piattaforma centrale (y: 8)
        { x: -8, y: 11.5, z: 0, type: 'platform' } // Piattaforma a sinistra (y: 10)
    ];
    
    pickupPositions.forEach((pos, index) => {
        // Crea geometria per il pickup (forma a croce medica)
        const pickupGroup = new THREE.Group();
        
        // Parte centrale della croce
        const centerGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const pickupMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00,
            emissive: 0x00aa00,
            emissiveIntensity: 0.5,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });
        const center = new THREE.Mesh(centerGeometry, pickupMaterial);
        center.position.y = 0;
        pickupGroup.add(center);
        
        // Bracci orizzontali della croce
        const armGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.3);
        const arm = new THREE.Mesh(armGeometry, pickupMaterial);
        arm.position.y = 0;
        pickupGroup.add(arm);
        
        // Luce pulsante (dal pool)
        const light = acquireDynamicLight(0x00ff00, 0.5, 3);
        if (light) {
            light.position.set(0, 0.5, 0);
            pickupGroup.add(light);
        }
        
        // Posiziona il pickup
        pickupGroup.position.set(pos.x, pos.y, pos.z);
        pickupGroup.userData = {
            isHealthPickup: true,
            healAmount: 50,
            rotationSpeed: 0.02,
            floatOffset: Math.random() * Math.PI * 2,
            type: pos.type,
            light: light
        };
        
        pickupGroup.castShadow = true;
        pickupGroup.receiveShadow = false;
        
        scene.add(pickupGroup);
        healthPickups.push(pickupGroup);
    });
}

function updateHealthPickups() {
    if (!gameRunning) return;
    
    healthPickups.forEach((pickup, index) => {
        // Rotazione e animazione fluttuante
        pickup.rotation.y += pickup.userData.rotationSpeed;
        const floatY = Math.sin(Date.now() * 0.001 + pickup.userData.floatOffset) * 0.1;
        const originalY = pickup.userData.type === 'ground' ? 1.5 : 
                        pickup.userData.type === 'platform' && pickup.position.x === 0 ? 9.5 : 11.5;
        pickup.position.y = originalY + floatY;
        
        // Controlla collisione con colonne
        columns.forEach((column) => {
            const distance = pickup.position.distanceTo(column.position);
            if (distance < 1.0) { // Raggio di collisione colonne
                // Calcola la direzione di respinta
                const pushDirection = pickup.position.clone().sub(column.position).normalize();
                pushDirection.multiplyScalar(1.0 - distance); // Spingi fuori dalla colonna
                
                // Applica la respinta
                pickup.position.sub(pushDirection);
            }
        });
        
        // Controlla collisione con muri giocatore
        const distance = pickup.position.distanceTo(camera.position);
        if (distance < 1.5) {
            // Curazione del giocatore
            player.health = Math.min(player.maxHealth, player.health + pickup.userData.healAmount);
            updateHealthBar();
            
            // Suono di cura
            playHealSound();
            
            // Rimuovi il pickup
            scene.remove(pickup);
            healthPickups.splice(index, 1);
            releaseDynamicLight(pickup.userData.light);
            
            // Respawn dopo 30 secondi
            setTimeout(() => {
                respawnHealthPickup(pickup.userData.type, index);
            }, 30000);
        }
    });
}

function gainXP(amount) {
    player.xp += amount;
    updateXPDisplay();
    
    // Controlla se è salito di livello
    if (player.xp >= player.xpForNextLevel) {
        levelUp();
    }
}

function levelUp() {
    player.level++;
    player.skillPoints += 1;
    player.xp -= player.xpForNextLevel;
    player.xpForNextLevel = Math.floor(player.xpForNextLevel * 1.2); // Aumenta XP richiesto del 20%
    
    // Notifica di level up
    const notification = document.createElement('div');
    notification.textContent = `LEVEL UP! Livello ${player.level}`;
    notification.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffff00;
        font-size: 32px;
        font-weight: bold;
        text-shadow: 0 0 10px rgba(255, 255, 0, 0.8);
        pointer-events: none;
        z-index: 1000;
        animation: levelUpNotif 2s ease-out forwards;
    `;
    
    if (!document.getElementById('levelUpStyle')) {
        const style = document.createElement('style');
        style.id = 'levelUpStyle';
        style.textContent = `
            @keyframes levelUpNotif {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

function updateXPDisplay() {
    const xpPercent = (player.xp / player.xpForNextLevel) * 100;
    
    let xpBar = document.getElementById('xpBar');
    let xpFill = document.getElementById('xpFill');
    let xpText = document.getElementById('xpText');
    let levelDisplay = document.getElementById('levelDisplay');
    let skillPointsDisplay = document.getElementById('skillPoints');
    
    if (xpBar && xpFill && xpText && levelDisplay && skillPointsDisplay) {
        xpFill.style.width = xpPercent + '%';
        xpText.textContent = `${player.xp}/${player.xpForNextLevel} XP`;
        levelDisplay.textContent = `LV ${player.level}`;
        skillPointsDisplay.textContent = player.skillPoints;
    }
    refreshAbilityTreeUI();
}

function purchaseAbility(id) {
    // Definizione delle abilità con costi e prerequisiti
    const abilities = {
        // Ramo Attacco
        'attack_damage_1': { cost: 1, prerequisite: null },
        'attack_speed_1': { cost: 2, prerequisite: 'attack_damage_1' },
        'attack_pierce_1': { cost: 3, prerequisite: 'attack_speed_1' },
        'attack_reload_1': { cost: 6, prerequisite: 'attack_pierce_1' },
        // Ramo Difesa
        'defense_regen_1': { cost: 2, prerequisite: null },
        'defense_health_1': { cost: 3, prerequisite: 'defense_regen_1' },
        'defense_regen_2': { cost: 4, prerequisite: 'defense_health_1' },
        'defense_damage_reduction_1': { cost: 8, prerequisite: 'defense_regen_2' },
        // Ramo Utilità
        'utility_speed_1': { cost: 1, prerequisite: null },
        'utility_jump_1': { cost: 2, prerequisite: 'utility_speed_1' },
        'utility_grenades_1': { cost: 3, prerequisite: 'utility_jump_1' },
        'utility_fire_persistence_1': { cost: 4, prerequisite: 'utility_grenades_1' }
    };
    
    // Verifica se l'abilità esiste
    if (!abilities[id]) {
        showAbilityMessage('Abilità non trovata', '#ff6666');
        return;
    }
    
    const ability = abilities[id];
    
    // Verifica se l'abilità è già stata acquistata
    if (player.skillTree[id] > 0) {
        showAbilityMessage('Abilità già acquistata', '#ff6666');
        return;
    }
    
    // Verifica prerequisiti
    if (ability.prerequisite && player.skillTree[ability.prerequisite] === 0) {
        showAbilityMessage('Prerequisito mancante', '#ff6666');
        return;
    }
    
    // Verifica punti abilità
    if (player.skillPoints < ability.cost) {
        showAbilityMessage('Punti abilità insufficienti', '#ff6666');
        return;
    }
    
    // Acquista l'abilità
    player.skillPoints -= ability.cost;
    player.skillTree[id] = 1;
    applySkillAbility(id);
    updateXPDisplay();
    showAbilityMessage('Potenzia acquistato!', '#66ff66');
}

function applySkillAbility(id) {
    switch (id) {
        // Ramo Attacco
        case 'attack_damage_1':
            player.attackDamageMultiplier = 1.15;
            break;
        case 'attack_speed_1':
            player.attackSpeedMultiplier = 1.2;
            break;
        case 'attack_pierce_1':
            player.projectilesPierce = 1;
            break;
        case 'attack_reload_1':
            player.reloadSpeedMultiplier = 0.75;
            break;
            
        // Ramo Difesa
        case 'defense_regen_1':
            player.healthRegen = 0.5;
            break;
        case 'defense_health_1':
            player.maxHealth += 25;
            player.health += 25;
            break;
        case 'defense_regen_2':
            player.healthRegen = 1;
            break;
        case 'defense_damage_reduction_1':
            player.damageReduction = 0.25;
            break;
            
        // Ramo Utilità
        case 'utility_speed_1':
            player.speedMultiplier = 1.25;
            break;
        case 'utility_jump_1':
            player.jumpMultiplier = 1.3;
            player.maxJumps = 3;
            break;
        case 'utility_grenades_1':
            player.maxGrenades = 5;
            player.grenadeRadius = 1.5;
            break;
        case 'utility_fire_persistence_1':
            player.grenadeFireDuration = 4;
            player.grenadeFireDamage = 2;
            break;
    }
}

function refreshAbilityTreeUI() {
    const abilities = {
        // Ramo Attacco
        'attack_damage_1': { cost: 1, prerequisite: null },
        'attack_speed_1': { cost: 2, prerequisite: 'attack_damage_1' },
        'attack_pierce_1': { cost: 3, prerequisite: 'attack_speed_1' },
        'attack_reload_1': { cost: 6, prerequisite: 'attack_pierce_1' },
        // Ramo Difesa
        'defense_regen_1': { cost: 2, prerequisite: null },
        'defense_health_1': { cost: 3, prerequisite: 'defense_regen_1' },
        'defense_regen_2': { cost: 4, prerequisite: 'defense_health_1' },
        'defense_damage_reduction_1': { cost: 8, prerequisite: 'defense_regen_2' },
        // Ramo Utilità
        'utility_speed_1': { cost: 1, prerequisite: null },
        'utility_jump_1': { cost: 2, prerequisite: 'utility_speed_1' },
        'utility_grenades_1': { cost: 3, prerequisite: 'utility_jump_1' },
        'utility_fire_persistence_1': { cost: 4, prerequisite: 'utility_grenades_1' }
    };
    
    Object.keys(abilities).forEach(id => {
        const node = document.getElementById(`node-${id.replace(/_/g, '-')}`);
        if (!node) return;
        
        const button = node.querySelector('button');
        const ability = abilities[id];
        const purchased = player.skillTree[id] > 0;
        const hasPrerequisite = !ability.prerequisite || player.skillTree[ability.prerequisite] > 0;
        const canAfford = player.skillPoints >= ability.cost;
        
        if (purchased) {
            node.classList.add('purchased');
            if (button) {
                button.textContent = 'Acquistato';
                button.disabled = true;
            }
        } else {
            node.classList.remove('purchased');
            if (button) {
                button.textContent = `Acquista (${ability.cost})`;
                button.disabled = !hasPrerequisite || !canAfford;
            }
        }
    });
}

function showAbilityMessage(message, color) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: #111;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 1001;
        box-shadow: 0 0 20px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 1400);
}

function screenshake(intensity, duration) {
    cameraShakeIntensity = intensity;
    setTimeout(() => {
        cameraShakeIntensity = 0;
    }, duration);
}

function respawnHealthPickup(type, originalIndex) {
    // Posizioni originali per respawn
    const positions = {
        'ground': { x: 0, y: 1.5, z: 0 },
        'platform': [
            { x: 0, y: 9.5, z: 0 },
            { x: -8, y: 11.5, z: 0 }
        ]
    };
    
    let pos;
    if (type === 'ground') {
        pos = positions.ground;
    } else {
        pos = positions.platform[originalIndex - 1]; // -1 perché ground è index 0
    }
    
    // Ricrea il pickup
    const pickupGroup = new THREE.Group();
    
    // Parte centrale della croce
    const centerGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const pickupMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00ff00,
        emissive: 0x00aa00,
        emissiveIntensity: 0.5,
        shininess: 100,
        transparent: true,
        opacity: 0.9
    });
    const center = new THREE.Mesh(centerGeometry, pickupMaterial);
    center.position.y = 0;
    pickupGroup.add(center);
    
    // Bracci orizzontali della croce
    const armGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.3);
    const arm = new THREE.Mesh(armGeometry, pickupMaterial);
    arm.position.y = 0;
    pickupGroup.add(arm);
    
    // Luce pulsante (dal pool)
    const light = acquireDynamicLight(0x00ff00, 0.5, 3);
    if (light) {
        light.position.set(0, 0.5, 0);
        pickupGroup.add(light);
    }
    
    // Posiziona il pickup
    pickupGroup.position.set(pos.x, pos.y, pos.z);
    pickupGroup.userData = {
        isHealthPickup: true,
        healAmount: 50,
        rotationSpeed: 0.02,
        floatOffset: Math.random() * Math.PI * 2,
        type: type,
        light: light
    };
    
    pickupGroup.castShadow = true;
    pickupGroup.receiveShadow = false;
    
    scene.add(pickupGroup);
    healthPickups.push(pickupGroup);
}

function playHealSound() {
    if (!audioContext) return;
    
    // Crea suono di cura sintetizzato
    const duration = 0.3;
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Suono ascendente positivo
        const freq = 400 + t * 400; // Da 400Hz a 800Hz
        const wave = Math.sin(2 * Math.PI * freq * t);
        // Envelope dolce
        const envelope = Math.sin(t * Math.PI / duration);
        data[i] = wave * envelope * 0.3;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
}

function createPlatforms() {
    // Posizioni delle piattaforme - design più interessante e vario
    const platformPositions = [
        // Area centrale - hub principale
        { x: 0, y: 6, z: 0, width: 8, depth: 8, type: 'central' },
        
        // Bracci estesi a forma di croce
        { x: -15, y: 4, z: 0, width: 6, depth: 4, type: 'west' },
        { x: 15, y: 4, z: 0, width: 6, depth: 4, type: 'east' },
        { x: 0, y: 4, z: -15, width: 4, depth: 6, type: 'north' },
        { x: 0, y: 4, z: 15, width: 4, depth: 6, type: 'south' },
        
        // Piattaforme angolari alte
        { x: -20, y: 8, z: -20, width: 5, depth: 5, type: 'corner' },
        { x: 20, y: 8, z: -20, width: 5, depth: 5, type: 'corner' },
        { x: -20, y: 8, z: 20, width: 5, depth: 5, type: 'corner' },
        { x: 20, y: 8, z: 20, width: 5, depth: 5, type: 'corner' },
        
        // Scala verticale a est
        { x: 25, y: 3, z: 0, width: 4, depth: 4, type: 'step' },
        { x: 30, y: 6, z: 0, width: 4, depth: 4, type: 'step' },
        { x: 35, y: 9, z: 0, width: 4, depth: 4, type: 'step' },
        
        // Ponte sospeso a nord
        { x: -8, y: 7, z: -25, width: 3, depth: 8, type: 'bridge' },
        { x: 0, y: 7, z: -25, width: 3, depth: 8, type: 'bridge' },
        { x: 8, y: 7, z: -25, width: 3, depth: 8, type: 'bridge' },
        
        // Area bassa ovest
        { x: -25, y: 2, z: 10, width: 7, depth: 5, type: 'low' },
        { x: -25, y: 2, z: 18, width: 7, depth: 5, type: 'low' },
        
        // Piattaforme fluttuanti casuali
        { x: -10, y: 10, z: 10, width: 4, depth: 4, type: 'floating' },
        { x: 12, y: 11, z: -8, width: 3, depth: 3, type: 'floating' },
        { x: -5, y: 9, z: -12, width: 4, depth: 4, type: 'floating' },
        { x: 8, y: 12, z: 8, width: 3, depth: 3, type: 'floating' },
        
        // Base operativa
        { x: 0, y: 1.5, z: 30, width: 10, depth: 6, type: 'base' },
        
        // Torre centrale
        { x: 0, y: 15, z: 0, width: 6, depth: 6, type: 'tower' }
    ];
    
    const grayPlatformTexture = loadSharedTexture('textures/texture_piattaforme_grigie.jpg', 2, 2);
    const woodPlatformTexture = loadSharedTexture('textures/texture_piattaforme_marroni_legno.jpg', 2, 4);
    
    platformPositions.forEach((pos, index) => {
        // Texture condivise tra tutte le piattaforme (vedi loadSharedTexture).
        // Il repeat e' gia' impostato per ciascun tipo: 2x2 le grigie, 2x4 il legno.
        const platformTexture = pos.type === 'bridge' ? woodPlatformTexture : grayPlatformTexture;
        
        const platformGeometry = new THREE.BoxGeometry(pos.width, 0.5, pos.depth);
        
        // Materiale diverso per piattaforme di legno con meno riflettanza
        let platformMaterial;
        if (pos.type === 'bridge') {
            platformMaterial = new THREE.MeshPhongMaterial({ 
                map: platformTexture,
                color: 0xffffff, // Bianco per mostrare il legno originale
                emissive: 0x222222,
                emissiveIntensity: 0.01, // Molto bassa emissività
                shininess: 10 // Molto meno riflettente
            });
        } else {
            platformMaterial = new THREE.MeshPhongMaterial({ 
                map: platformTexture,
                color: 0x333333, // Grigio molto scuro per rendere la texture molto più scura
                emissive: 0x222222,
                emissiveIntensity: 0.02, // Ridotta emissività
                shininess: 100
            });
        }
        
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(pos.x, pos.y, pos.z);
        platform.receiveShadow = true;
        platform.castShadow = true;
        platform.userData = { 
            isPlatform: true, 
            width: pos.width, 
            depth: pos.depth,
            height: pos.y,
            type: pos.type
        };
        
        scene.add(platform);
        platforms.push(platform);
        
        // Aggiungi elementi decorativi per alcuni tipi
        if (pos.type === 'tower') {
            // Luce sulla torre
            const towerLight = new THREE.PointLight(0xffffff, 1, 15);
            towerLight.position.set(pos.x, pos.y + 2, pos.z);
            scene.add(towerLight);
        }
        
        if (pos.type === 'corner') {
            // Piccole luci decorative
            const cornerLight = new THREE.PointLight(0xffd700, 0.5, 5);
            cornerLight.position.set(pos.x, pos.y + 1, pos.z);
            scene.add(cornerLight);
        }
    });
}

function createEnvironment() {
    // Alberi low poly
    for (let i = 0; i < 15; i++) {
        createTree();
    }
    
    // Rocce sparse
    for (let i = 0; i < 8; i++) {
        createRock();
    }
    
    // Cristalli energetici
    for (let i = 0; i < 6; i++) {
        createCrystal();
    }
    
    // Antenne torri
    for (let i = 0; i < 4; i++) {
        createAntenna();
    }
}

function createTree() {
    const treeGroup = new THREE.Group();
    
    // Tronco
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 6);
    const trunkMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        emissive: 0x4B2F1F,
        emissiveIntensity: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Foliage (corona)
    const foliageGeometry = new THREE.SphereGeometry(2, 6, 5);
    const foliageMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x228B22,
        emissive: 0x0F4F0F,
        emissiveIntensity: 0.2
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 3.5;
    foliage.scale.y = 1.2;
    foliage.castShadow = true;
    treeGroup.add(foliage);
    
    // Posizione casuale ai bordi
    const angle = Math.random() * Math.PI * 2;
    const distance = 35 + Math.random() * 10;
    treeGroup.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
    );
    
    scene.add(treeGroup);
}

function createRock() {
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    const rockMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x696969,
        emissive: 0x2a2a2a,
        emissiveIntensity: 0.1
    });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    
    // Scala e posizione casuali
    const scale = 0.5 + Math.random() * 1.5;
    rock.scale.set(scale, scale * 0.7, scale);
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 20;
    rock.position.set(
        Math.cos(angle) * distance,
        scale * 0.35,
        Math.sin(angle) * distance
    );
    
    rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
}

function createCrystal(type = null) {
    const crystalGroup = new THREE.Group();
    
    // Tipi di cristalli con abilità diverse
    const crystalTypes = ['speed', 'shield', 'invisibility'];
    const crystalType = type || crystalTypes[Math.floor(Math.random() * crystalTypes.length)];
    
    // Colori e proprietà in base al tipo
    let color, emissiveColor, abilityName;
    switch(crystalType) {
        case 'speed':
            color = 0xFFFF00; // Giallo
            emissiveColor = 0xFFFF00;
            abilityName = 'VELOCITÀ';
            break;
        case 'shield':
            color = 0x00FF00; // Verde
            emissiveColor = 0x00FF00;
            abilityName = 'SCUDO';
            break;
        case 'invisibility':
            color = 0xFF00FF; // Magenta
            emissiveColor = 0xFF00FF;
            abilityName = 'INVISIBILITÀ';
            break;
    }
    
    // Cristallo principale
    const crystalGeometry = new THREE.OctahedronGeometry(0.8, 0);
    const crystalMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: emissiveColor,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8
    });
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystalGroup.add(crystal);
    spinningMeshes.push(crystal);
    
    // Luce pulsante (dal pool: vedi createDynamicLightPool)
    const crystalLight = acquireDynamicLight(color, 0.8, 8);
    if (crystalLight) {
        crystalLight.position.set(0, 1, 0);
        crystalGroup.add(crystalLight);
    }
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 6);
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x444444,
        emissive: 0x222222,
        emissiveIntensity: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.1;
    crystalGroup.add(base);
    
    // Aggiungi dati personalizzati
    crystalGroup.userData = {
        type: crystalType,
        name: abilityName,
        collectible: true,
        rotationSpeed: 0.02,
        floatOffset: Math.random() * Math.PI * 2,
        spinMesh: crystal,
        light: crystalLight
    };
    
    // Posizione su piattaforme casuali
    if (platforms.length > 0) {
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
        const platformData = randomPlatform.userData;
        
        crystalGroup.position.set(
            randomPlatform.position.x + (Math.random() - 0.5) * platformData.width * 0.6,
            platformData.height + 0.5,
            randomPlatform.position.z + (Math.random() - 0.5) * platformData.depth * 0.6
        );
    }
    
    crystals.push(crystalGroup);
    scene.add(crystalGroup);
}

function updateCrystals() {
    if (!gameRunning) return;
    
    crystals.forEach((crystal, index) => {
        // Animazione di rotazione e fluttuazione
        crystal.rotation.y += crystal.userData.rotationSpeed;
        crystal.position.y += Math.sin(Date.now() * 0.001 + crystal.userData.floatOffset) * 0.002;

        // Check raccolta
        const distance = Math.sqrt(
            Math.pow(crystal.position.x - player.position.x, 2) +
            Math.pow(crystal.position.z - player.position.z, 2)
        );

        if (distance < 1.5) {
            // Attiva l'abilità
            activateAbility(crystal.userData.type);

            // Rimuovi cristallo
            scene.remove(crystal);
            crystals.splice(index, 1);
            // ... e togli la sua mesh dalla lista delle animazioni ambientali
            const spinIdx = spinningMeshes.indexOf(crystal.userData.spinMesh);
            if (spinIdx !== -1) spinningMeshes.splice(spinIdx, 1);
            // La luce torna nel pool (resta in scena, si spegne soltanto)
            releaseDynamicLight(crystal.userData.light);

            // Suono di raccolta
            playCrystalCollectSound();

            // Mostra notifica
            showAbilityNotification(crystal.userData.name);
            
            // Respawn dopo 30 secondi
            setTimeout(() => {
                createCrystal();
            }, 30000);
        }
    });
    
    // Assicura che ci siano sempre almeno 2 cristalli
    if (crystals.length < 2) {
        createCrystal();
    }
}

function activateAbility(type) {
    const ability = player.abilities[type];
    if (ability.cooldown > 0) return;
    
    // Disattiva altre abilità
    Object.keys(player.abilities).forEach(key => {
        if (key !== type) {
            player.abilities[key].active = false;
        }
    });
    
    // Attiva la nuova abilità
    ability.active = true;
    ability.duration = ability.maxDuration;
    ability.cooldown = ability.maxCooldown;
    player.currentAbility = type;
    
    // Applica effetti immediati
    switch(type) {
        case 'speed':
            player.speed = player.baseSpeed * 1.8;
            break;
        case 'shield':
            player.shieldHealth = 100; // 100 punti di scudo
            break;
        case 'invisibility':
            // Rendi il giocatore parzialmente invisibile ai nemici
            break;
    }
}

function takeDamage(amount) {
    // Prima controlla se lo scudo è attivo
    if (player.abilities.shield.active && player.shieldHealth > 0) {
        // Lo scudo assorbe tutto il danno
        player.shieldHealth -= amount;
        
        // Se lo scudo si esaurisce, disattiva l'abilità
        if (player.shieldHealth <= 0) {
            player.shieldHealth = 0;
            deactivateAbility('shield');
        }
        
        // Effetto visivo del danno allo scudo e screenshake
        showShieldDamage();
        screenshake(0.3, 200);
        return false; // Nessun danno alla salute
    }
    
    // Applica riduzione del danno se disponibile
    const reducedAmount = amount * (1 - (player.damageReduction || 0));
    
    // Danno normale alla salute
    player.health -= reducedAmount;
    updateHealthBar();
    screenshake(0.5, 300); // Screenshake quando viene colpito
    flashDamageScreen(); // Flash rosso quando viene colpito
    
    if (player.health <= 0) {
        gameOver();
    }
    
    return true; // Danno alla salute applicato
}

function showShieldDamage() {
    // Crea effetto visivo quando lo scudo assorbe danno
    const notification = document.createElement('div');
    notification.textContent = 'SCUDO ASSORBE IL DANNO!';
    notification.style.cssText = `
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #00ff00;
        font-size: 20px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 1000;
        animation: shieldDamage 1s ease-out forwards;
    `;
    
    // Aggiungi animazione CSS se non esiste
    if (!document.getElementById('shieldDamageStyle')) {
        const style = document.createElement('style');
        style.id = 'shieldDamageStyle';
        style.textContent = `
            @keyframes shieldDamage {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 1000);
}

function updateAbilities() {
    Object.keys(player.abilities).forEach(type => {
        const ability = player.abilities[type];
        const slotElement = document.getElementById(`${type}Ability`);
        const timerElement = document.getElementById(`${type}Timer`);
        const cooldownElement = document.getElementById(`${type}Cooldown`);
        
        // Aggiorna durata
        if (ability.active && ability.duration > 0) {
            ability.duration--;
            
            // Aggiorna UI
            slotElement.classList.add('active');
            timerElement.textContent = Math.ceil(ability.duration / 60) + 's';
            cooldownElement.style.display = 'none';
            
            // Controlla se l'abilità è terminata
            if (ability.duration === 0) {
                deactivateAbility(type);
            }
        } else {
            slotElement.classList.remove('active');
            timerElement.textContent = '';
        }
        
        // Aggiorna cooldown
        if (ability.cooldown > 0) {
            ability.cooldown--;
            cooldownElement.style.display = 'block';
            cooldownElement.textContent = Math.ceil(ability.cooldown / 60) + 's';
        } else {
            cooldownElement.style.display = 'none';
        }
    });
    
    // Aggiorna barra dello scudo
    const shieldHealthBar = document.getElementById('shieldHealthBar');
    const shieldHealthFill = document.getElementById('shieldHealthFill');
    
    if (player.abilities.shield.active && player.shieldHealth > 0) {
        shieldHealthBar.style.display = 'block';
        shieldHealthFill.style.width = (player.shieldHealth / 100) * 100 + '%';
    } else {
        shieldHealthBar.style.display = 'none';
    }
}

function deactivateAbility(type) {
    const ability = player.abilities[type];
    ability.active = false;
    
    // Rimuovi effetti
    switch(type) {
        case 'speed':
            player.speed = player.baseSpeed;
            break;
        case 'shield':
            player.shieldHealth = 0;
            break;
        case 'invisibility':
            // Rendi il giocatore visibile
            break;
    }
    
    if (player.currentAbility === type) {
        player.currentAbility = null;
    }
}

function playCrystalCollectSound() {
    if (!audioContext) return;
    
    const duration = 0.3;
    const sampleRate = audioContext.sampleRate;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 5) * 0.3 +
                  Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 8) * 0.2;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.4;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    source.start();
}

function showAbilityNotification(abilityName) {
    // Crea elemento notifica
    const notification = document.createElement('div');
    notification.textContent = `${abilityName} ATTIVATA!`;
    notification.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 1000;
        animation: abilityNotification 2s ease-out forwards;
    `;
    
    // Aggiungi animazione CSS
    if (!document.getElementById('abilityNotificationStyle')) {
        const style = document.createElement('style');
        style.id = 'abilityNotificationStyle';
        style.textContent = `
            @keyframes abilityNotification {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// Il fantasma ha una sola mesh: non esistono versioni medium/low, quindi ogni
// nemico resta sempre visibile. Il vecchio updateLODs() percorreva l'intera
// gerarchia di ogni nemico a ogni frame solo per riassegnare visible = true:
// e' stato rimosso (nessun effetto visivo).

function createAntenna() {
    const antennaGroup = new THREE.Group();
    
    // Palo principale
    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.1, 8, 6);
    const poleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xCCCCCC,
        emissive: 0x666666,
        emissiveIntensity: 0.1
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 4;
    antennaGroup.add(pole);
    
    // Luce lampeggiante in cima
    const lightGeometry = new THREE.SphereGeometry(0.2, 6, 6);
    const lightMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFF0000,
        emissive: 0xFF0000,
        emissiveIntensity: 1
    });
    const lightBulb = new THREE.Mesh(lightGeometry, lightMaterial);
    lightBulb.position.y = 8;
    antennaGroup.add(lightBulb);
    
    // Luce effettiva. Il lampeggio modula l'intensita', non la visibilita':
    // togliere e rimettere una luce nella scena cambia il numero di luci attive
    // e obbliga three.js a ricompilare gli shader di tutti i materiali.
    const antennaLight = new THREE.PointLight(0xFF0000, 1, 10);
    antennaLight.position.y = 8;
    antennaLight.userData = { blinkSpeed: 60 + Math.random() * 60, blinkTimer: 0, baseIntensity: 1 };
    antennaGroup.add(antennaLight);
    blinkingLights.push(antennaLight);
    
    // Base
    const baseGeometry = new THREE.BoxGeometry(1, 0.5, 1);
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        emissive: 0x111111,
        emissiveIntensity: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    antennaGroup.add(base);
    
    // Posizione su piattaforme alte
    const highPlatforms = platforms.filter(p => p.userData.height > 6);
    if (highPlatforms.length > 0) {
        const randomPlatform = highPlatforms[Math.floor(Math.random() * highPlatforms.length)];
        const platformData = randomPlatform.userData;
        
        antennaGroup.position.set(
            randomPlatform.position.x,
            platformData.height,
            randomPlatform.position.z
        );
    }
    
    scene.add(antennaGroup);
}

function createWalls() {
    const wallTexture = loadSharedTexture('textures/texture_muro.jpg', 6, 1);
    
    // Materiale unico per tutti i muri
    const wallMaterial = new THREE.MeshPhongMaterial({ 
        map: wallTexture,
        color: 0x888888,
        shininess: 30
    });
    
    const wallHeight = 5;
    const wallThickness = 0.5;
    const areaSize = 50;
    
    // Muri perimetrali
    const walls = [
        { pos: [0, wallHeight/2, areaSize/2], size: [areaSize, wallHeight, wallThickness] }, // Nord
        { pos: [0, wallHeight/2, -areaSize/2], size: [areaSize, wallHeight, wallThickness] }, // Sud
        { pos: [areaSize/2, wallHeight/2, 0], size: [wallThickness, wallHeight, areaSize] }, // Est
        { pos: [-areaSize/2, wallHeight/2, 0], size: [wallThickness, wallHeight, areaSize] }  // Ovest
    ];
    
    walls.forEach(wall => {
        const geometry = new THREE.BoxGeometry(...wall.size);
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        mesh.position.set(...wall.pos);
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        scene.add(mesh);
    });
    
    // Aggiungi colonne decorative con texture
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 22;
        const columnGeometry = new THREE.CylinderGeometry(0.8, 1, 8, 8);
        const columnMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x6a5acd,
            emissive: 0x4433aa,
            emissiveIntensity: 0.2,
            shininess: 50
        });
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(
            Math.cos(angle) * distance,
            4,
            Math.sin(angle) * distance
        );
        column.castShadow = true;
        column.receiveShadow = true;
        column.userData = { 
            isColumn: true,
            isPlatform: true, // Aggiungi questa proprietà per trattarla come piattaforma
            height: 8, // Altezza della colonna per il sistema di piattaforme
            width: 1.6, // Diametro della base
            depth: 1.6 // Diametro della base
        };
        scene.add(column);
        
        // Aggiungi la colonna all'array delle piattaforme e a quello delle colonne (collisioni)
        platforms.push(column);
        columns.push(column);
    }
}

function loadWeaponModel(path, parentGroup, options) {
    const loader = new THREE.FBXLoader();
    loader.load(path, function(object) {
        // Prepara le mesh (disattiva le ombre)
        object.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                if (child.isSkinnedMesh) {
                    // Le mesh skinnate hanno bounding sphere inaffidabili: senza questo
                    // flag possono sparire quando la camera guarda altrove.
                    child.frustumCulled = false;
                }
            }
        });
        
        // Applica texture PBR esplicite se fornite (fucile)
        if (options.textures) {
            applyWeaponTextures(object, options.textures);
        }

        // Scurisce i materiali delle armi (opzionale): i materiali FBX di default
        // sono grigi molto chiari e appaiono quasi bianchi.
        if (options.darken) {
            object.traverse(function(child) {
                if (child.isMesh && child.material && child.material.color) {
                    child.material.color.multiplyScalar(options.darken);
                }
            });
        }
        
        // Misura il bounding box nello spazio locale del modello, escludendo le
        // mesh skinnate: la loro geometria base (bind pose) ha dimensioni enormi
        // e fuori centro che falserebbero sia la scala che l'orientamento.
        object.updateMatrixWorld(true);
        const box = new THREE.Box3();
        let hasStaticMesh = false;
        object.traverse(function(child) {
            if (child.isMesh && !child.isSkinnedMesh) {
                box.union(new THREE.Box3().setFromObject(child));
                hasStaticMesh = true;
            }
        });
        if (!hasStaticMesh) {
            box.setFromObject(object);
        }
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const s = (options.targetSize || 0.5) / maxDim;
        
        // Contenitore per normalizzare posizione/scala/rotazione in modo pulito
        const container = new THREE.Group();
        container.add(object);
        object.position.sub(center); // centra il modello nell'origine del contenitore
        container.scale.setScalar(s);
        
        // Orientamento automatico: asse più lungo (canna) in avanti, altezza in alto
        const axes = [
            { axis: 'x', len: size.x },
            { axis: 'y', len: size.y },
            { axis: 'z', len: size.z }
        ].sort(function(a, b) { return b.len - a.len; });
        
        const barrel = axes[0].axis; // canna = asse più lungo
        const height = axes[1].axis; // altezza = secondo asse
        const width  = axes[2].axis; // larghezza = asse più corto
        
        const target = { x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3() };
        target[barrel].set(0, 0, -1); // canna verso la direzione di mira (-Z)
        target[height].set(0, 1, 0);  // altezza verso l'alto (+Y)
        target[width].set(1, 0, 0);   // larghezza verso destra (+X)
        
        const m = new THREE.Matrix4();
        m.makeBasis(target.x, target.y, target.z);
        // Se (canna, altezza, larghezza) forma una base sinistrorsa il determinante è -1
        // e la matrice sarebbe una riflessione: setFromRotationMatrix la gestirebbe male
        // (armi sdraiate o girate). Invertiamo la larghezza per ottenere una rotazione pura.
        if (m.determinant() < 0) {
            target[width].multiplyScalar(-1);
            m.makeBasis(target.x, target.y, target.z);
        }
        container.quaternion.setFromRotationMatrix(m);
        
        // Regolazioni manuali opzionali per rifinire l'orientamento
        if (options.rotX) container.rotateX(options.rotX);
        if (options.rotY) container.rotateY(options.rotY);
        if (options.rotZ) container.rotateZ(options.rotZ);
        
        parentGroup.add(container);
        
        console.log('[' + (options.label || path) + '] box: ' + size.x.toFixed(3) + ' x ' + size.y.toFixed(3) + ' x ' + size.z.toFixed(3) + ' | scala: ' + s.toFixed(4) + ' | canna: ' + barrel + ', altezza: ' + height + ', larghezza: ' + width);
    }, undefined, function(error) {
        console.error('Errore caricamento arma', path, error);
    });
}

function applyWeaponTextures(object, tex) {
    const textureLoader = new THREE.TextureLoader();
    const albedo = textureLoader.load(tex.albedo);
    albedo.encoding = THREE.sRGBEncoding;
    const normal = textureLoader.load(tex.normal);
    const roughness = textureLoader.load(tex.roughness);
    const metalness = textureLoader.load(tex.metalness);
    const ao = textureLoader.load(tex.ao);
    
    object.traverse(function(child) {
        if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
                map: albedo,
                normalMap: normal,
                roughnessMap: roughness,
                metalnessMap: metalness,
                aoMap: ao,
                roughness: 0.2,
                metalness: 0.7,
                color: 0xffffff
            });
            child.material.needsUpdate = true;
        }
    });
}

function createShotgun() {
    shotgun = new THREE.Group();
    shotgun.position.set(0.24, -0.24, -0.5);
    shotgun.userData.basePosition = shotgun.position.clone();
    shotgun.visible = false; // Inizialmente nascosto
    camera.add(shotgun);
    loadWeaponModel('models/weapon_shotgun.fbx', shotgun, { targetSize: 0.9, label: 'shotgun', darken: 0.4   });
}

function createMachineGun() {
    machineGun = new THREE.Group();
    machineGun.position.set(0.22, -0.28, -0.6);
    machineGun.userData.basePosition = machineGun.position.clone();
    machineGun.visible = false; // Inizialmente nascosta
    camera.add(machineGun);
    loadWeaponModel('models/weapon_rifle.fbx', machineGun, {
        targetSize: 0.85,
        label: 'rifle',
        rotY: Math.PI, // Corregge orientamento: gira la mitragliatrice di 180°
        rotX: Math.PI, // Corregge orientamento: ribalta la mitragliatrice verticalmente
        textures: {
            albedo: 'textures/weapon_rifle_albedo.png',
            normal: 'textures/weapon_rifle_normal.png',
            roughness: 'textures/weapon_rifle_roughness.png',
            metalness: 'textures/weapon_rifle_metallic.png',
            ao: 'textures/weapon_rifle_ao.png'
        }
    });
}

function createGun() {
    gun = new THREE.Group();
    gun.position.set(0.25, -0.26, -0.45);
    gun.userData.basePosition = gun.position.clone();
    gun.visible = true; // La pistola è l'arma iniziale
    camera.add(gun);
    loadWeaponModel('models/weapon_pistol.fbx', gun, { targetSize: 0.45, label: 'pistol', darken: 0.4 });
}

function createGrenade() {
    const grenadeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const grenadeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x228B22,
        emissive: 0x006400,
        emissiveIntensity: 0.3,
        shininess: 80
    });
    const grenade = new THREE.Mesh(grenadeGeometry, grenadeMaterial);
    
    // Anello di sicurezza
    const ringGeometry = new THREE.TorusGeometry(0.18, 0.03, 6, 12);
    const ringMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x696969,
        emissive: 0x2a2a2a,
        emissiveIntensity: 0.2,
        shininess: 100
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    grenade.add(ring);
    
    // Luce verde (dal pool)
    const grenadeLight = acquireDynamicLight(0x00ff00, 0.5, 2);
    if (grenadeLight) {
        grenade.userData.light = grenadeLight;
        grenade.add(grenadeLight);
    }
    
    // Posizione iniziale dalla camera
    grenade.position.copy(camera.position);
    
    // Direzione del lancio basata sull'altezza del mirino
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Calcola la traiettoria in base all'inclinazione verticale della camera
    const verticalAngle = camera.rotation.x; // -π/3 a π/3
    const horizontalPower = 0.3;
    const verticalPower = 0.15 + (verticalAngle * 0.2); // Più in alto miri, più lontano va
    
    // Aggiungi traiettoria parabolica
    grenade.velocity = new THREE.Vector3(
        direction.x * horizontalPower,
        verticalPower,
        direction.z * horizontalPower
    );
    grenade.gravity = 0.008;
    grenade.lifetime = 180; // 3 secondi
    grenade.exploded = false;
    
    scene.add(grenade);
    grenades.push(grenade);
}

function throwGrenade() {
    if (player.grenadeCooldown > 0) return;
    if (player.grenades <= 0) {
        showAbilityMessage('Niente granate!', '#ff6666');
        return;
    }
    
    player.grenadeCooldown = 1200; // 20 secondi a 60 FPS
    player.grenades--;
    createGrenade();
}

function createDoubleJumpEffect() {
    // Crea particelle per l'effetto visivo del doppio salto
    for (let i = 0; i < 8; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Posizione attorno al giocatore
        const angle = (i / 8) * Math.PI * 2;
        particle.position.set(
            camera.position.x + Math.cos(angle) * 0.5,
            camera.position.y,
            camera.position.z + Math.sin(angle) * 0.5
        );
        
        // Velocità esplosiva
        particle.velocity = new THREE.Vector3(
            Math.cos(angle) * 0.1,
            0.05,
            Math.sin(angle) * 0.1
        );
        
        particle.lifetime = 20;
        scene.add(particle);
        
        // Animazione e rimozione
        const animateParticle = () => {
            if (particle.lifetime <= 0) {
                scene.remove(particle);
                return;
            }
            
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.01; // Gravità leggera
            particle.material.opacity -= 0.04;
            particle.lifetime--;
            
            requestAnimationFrame(animateParticle);
        };
        
        requestAnimationFrame(animateParticle);
    }
    
    // Suono per doppio salto (opzionale)
    // playDoubleJumpSound();
}

function createEnemyDeathAnimation(enemy) {
    // Crea l'animazione di morte del nemico
    const deathAnimation = {
        enemy: enemy,
        startTime: Date.now(),
        duration: 1000, // 1 secondo di animazione
        isAnimating: true
    };
    
    // Cambia il colore del nemico per indicare che è stato colpito
    enemy.traverse(child => {
        if (child.isMesh && child.material && child.material.color) {
            const originalColor = child.material.color.getHex();
            child.material.color.setHex(0xff0000); // Rosso sangue
            if (child.material.emissive) child.material.emissive.setHex(0x660000);
            child.material.emissiveIntensity = 0.8;
            
            // Salva il colore originale per il ripristino
            child.userData.originalColor = originalColor;
        }
    });
    
    // Inizia l'animazione di caduta
    const animateDeath = () => {
        if (!deathAnimation.isAnimating) return;
        
        const elapsed = Date.now() - deathAnimation.startTime;
        const progress = Math.min(elapsed / deathAnimation.duration, 1);
        
        // Animazione di caduta all'indietro
        enemy.rotation.z = progress * Math.PI / 2; // Caduta all'indietro
        enemy.rotation.x = progress * Math.PI / 6; // Leggera rotazione laterale
        
        // Caduta verso il basso
        enemy.position.y -= progress * 0.05;
        
        // Dissolvenza
        enemy.traverse(child => {
            if (child.isMesh && child.material) {
                child.material.opacity = 1 - progress;
                child.material.transparent = true;
            }
        });
        
        // Rimuovi parti del corpo in modo casuale durante la caduta
        if (progress > 0.3 && !enemy.userData.partsRemoved) {
            enemy.userData.partsRemoved = true;
            
            // Crea esplosione di particelle rosse
            for (let i = 0; i < 8; i++) {
                const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                const particleMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xff4444,
                    emissive: 0x220000,
                    emissiveIntensity: 0.5
                });
                const particle = new THREE.Mesh(particleGeometry, particleMaterial);
                
                particle.position.copy(enemy.position);
                particle.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.15,
                    Math.random() * 0.1 + 0.05,
                    (Math.random() - 0.5) * 0.15
                );
                
                scene.add(particle);
                
                // Animazione delle particelle
                const animateParticle = () => {
                    particle.position.add(particle.velocity);
                    particle.velocity.y -= 0.003; // Gravità
                    particle.rotation.x += 0.2;
                    particle.rotation.y += 0.2;
                    
                    // Rimuovi dopo un po'
                    if (particle.position.y < -1) {
                        scene.remove(particle);
                    } else {
                        requestAnimationFrame(animateParticle);
                    }
                };
                
                requestAnimationFrame(animateParticle);
            }
        }
        
        // Continua l'animazione
        if (progress < 1) {
            requestAnimationFrame(animateDeath);
        } else {
            // Rimuovi il nemico completamente
            scene.remove(enemy);
            deathAnimation.isAnimating = false;
        }
    };
    
    // Avvia l'animazione
    animateDeath();
    
    return deathAnimation;
}

function loadGhostTemplate(onReady) {
    // Precarica il modello del fantasma una sola volta e clonalo per ogni nemico.
    // Prima veniva ricaricato e ri-parsato a ogni spawn, causando scatti.
    if (ghostTemplate || ghostTemplateFailed) {
        if (onReady) onReady();
        return;
    }
    const loader = new THREE.FBXLoader();
    loader.load('models/big_ghost_lite.fbx', function(object) {
        console.log('FBX fantasma precaricato');
        object.animations = [];
        object.scale.set(1.0, 1.0, 1.0);
        object.position.y = 0.2;
        object.traverse(function(child) {
            if (child.isMesh) {
                child.material = new THREE.MeshPhongMaterial({
                    color: 0x888888, // Grigio medio
                    emissive: 0x222222,
                    emissiveIntensity: 0.3,
                    transparent: true,
                    opacity: 0.7, // Semi-trasparente per effetto fantasma
                    shininess: 30
                });
                child.castShadow = false; // I fantasmi non fanno ombre
                child.receiveShadow = true;
                child.userData.lodLevel = 'high';
            }
        });
        ghostTemplate = object;
        if (onReady) onReady();
    }, undefined, function(error) {
        console.error('Errore nel caricamento del modello FBX:', error);
        ghostTemplateFailed = true;
        if (onReady) onReady();
    });
}

function createEnemy() {
    const enemyGroup = new THREE.Group();
    
    // Usa il modello del fantasma precaricato (o un fallback se non è disponibile)
    if (ghostTemplate) {
        const object = ghostTemplate.clone(true);
        // Clona i materiali così ogni nemico ha materiali propri: il colore cambia
        // durante l'animazione di morte senza influenzare gli altri nemici.
        object.traverse(function(child) {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
            }
        });
        enemyGroup.add(object);
    } else {
        // Fallback: nemico semplice se il modello non è ancora disponibile
        const fallbackGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
        const fallbackMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff3333,
            emissive: 0xaa0000,
            emissiveIntensity: 0.3
        });
        const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        fallbackMesh.position.y = 0.75;
        fallbackMesh.castShadow = true;
        fallbackMesh.userData.lodLevel = 'high';
        enemyGroup.add(fallbackMesh);
    }
    
    // Posizione casuale - anche sulle piattaforme
    const spawnOnPlatform = Math.random() < 0.7; // 70% di possibilità di spawnare su piattaforma
    let spawnPosition;
    let homePlatform = null;
    
    if (spawnOnPlatform && platforms.length > 0) {
        // Scegli una piattaforma casuale
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
        const platformData = randomPlatform.userData;
        
        // Posizione casuale sulla piattaforma
        const offsetX = (Math.random() - 0.5) * (platformData.width * 0.8);
        const offsetZ = (Math.random() - 0.5) * (platformData.depth * 0.8);
        
        spawnPosition = {
            x: randomPlatform.position.x + offsetX,
            y: platformData.height + 1, // Un po' sopra la piattaforma
            z: randomPlatform.position.z + offsetZ
        };
        homePlatform = randomPlatform;
    } else {
        // Spawn a terra ai bordi
        const angle = Math.random() * Math.PI * 2;
        const distance = 20 + Math.random() * 10;
        spawnPosition = {
            x: Math.cos(angle) * distance,
            y: 0.70,
            z: Math.sin(angle) * distance
        };
    }
    
    enemyGroup.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
    enemyGroup.health = 30;
    enemyGroup.speed = 0.02 + Math.random() * 0.02;
    enemyGroup.damage = 10;
    enemyGroup.attackCooldown = 0;
    enemyGroup.hasAttacked = false; // Traccia se il nemico ha già attaccato
    enemyGroup.userData = { 
        isOnPlatform: spawnOnPlatform,
        velocityY: 0,
        isGrounded: spawnOnPlatform,
        homePlatform: homePlatform,
        isPlatformOnly: spawnOnPlatform && Math.random() < 0.5 // 50% dei nemici su piattaforme sono platform-only
    };
    
    scene.add(enemyGroup);
    
    // Aggiungi all'array appropriato
    if (enemyGroup.userData.isPlatformOnly) {
        platformEnemies.push(enemyGroup);
    } else {
        enemies.push(enemyGroup);
    }
}

function shoot() {
    if (!gameRunning) return;
    
    // Controlla arma corrente
    if (player.currentWeapon === 'pistol') {
        shootPistol();
    } else if (player.currentWeapon === 'machineGun') {
        shootMachineGun();
    } else if (player.currentWeapon === 'shotgun') {
        shootShotgun();
    }
}

function shootPistol() {
    if (player.isReloading || player.ammo <= 0) return;
    
    player.ammo--;
    updateAmmoDisplay();
    
    // Suono sparo
    playShootSound();
    
    // Creazione proiettile
    createBullet(15, 0xffff00, 0.08);
    
    // Flash di volata e rinculo della camera
    flashMuzzle();
    applyRecoil(0.015);
    
    // Effetto rinculo
    gun.position.z += 0.1;
    setTimeout(() => {
        gun.position.z -= 0.1;
    }, 50);
    
    // Auto-ricarica quando finiscono i colpi (dopo aver sparato l'ultimo colpo)
    if (player.ammo === 0) {
        startReload();
    }
}

function shootShotgun() {
    if (player.isShotgunReloading || player.shotgunAmmo <= 0 || player.shotgunFireCooldown > 0) return;
    
    player.shotgunAmmo--;
    player.shotgunFireCooldown = 60; // 1 secondo a 60 FPS
    updateAmmoDisplay();
    
    // Suono sparo
    playShootSound();
    
    // Crea 8 pallets con spread a cono
    const spreadAngle = 0.3; // 17 gradi di spread totale
    const numPellets = 8;
    
    for (let i = 0; i < numPellets; i++) {
        const angle = (i / (numPellets - 1) - 0.5) * spreadAngle;
        createShotgunPellet(30, 0xffff00, 0.04, angle); // 30 danni = 1 colpo kill
    }
    
    // Flash di volata e rinculo della camera
    flashMuzzle();
    applyRecoil(0.06);
    
    // Effetto rinculo forte
    shotgun.position.z += 0.15;
    shotgun.position.x += (Math.random() - 0.5) * 0.1;
    shotgun.position.y += (Math.random() - 0.5) * 0.08;
    
    // Reset graduale del rinculo
    setTimeout(() => {
        shotgun.position.copy(shotgun.userData.basePosition);
    }, 100);
    
    // Auto-ricarica quando finiscono i colpi (dopo aver sparato l'ultimo colpo)
    if (player.shotgunAmmo === 0) {
        startShotgunReload();
    }
}

function createShotgunPellet(damage, color, size, spreadAngle) {
    const pellet = acquireBullet(size, 6, color, 0.6, 150);
    
    // Posizione iniziale dalla camera
    pellet.position.copy(camera.position);
    
    // DEBUG: Rendi i pallets più grandi per vederli
    pellet.scale.set(2, 2, 2); // Ingrandisci per debug
    
    // Direzione base dello sparo
    camera.getWorldDirection(_shotDir);
    
    // Applica spread orizzontale
    _shotRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    
    _shotDir.add(_shotRight.multiplyScalar(Math.sin(spreadAngle)));
    _shotDir.normalize();
    
    pellet.velocity.copy(_shotDir).multiplyScalar(0.8); // Velocità più alta
    pellet.damage = damage;
    pellet.lifetime = 10; // Gittata cortissima - 10 frame (metà di prima)
    pellet.userData = { isShotgunPellet: true };
    
    scene.add(pellet);
    bullets.push(pellet);
}

function shootMachineGun() {
    if (player.isMachineGunReloading || player.machineGunAmmo <= 0) return;
    
    // Controllo fire rate (10 colpi al secondo)
    if (player.fireRate > 0) return;
    
    player.machineGunAmmo--;
    updateAmmoDisplay();
    
    // Suono sparo
    playShootSound();
    
    // Creazione proiettile (metà danno) con spread elevato
    createBulletWithSpread(7.5, 0xff0000, 0.08, 4.5); // spread di ~4.5 gradi
    
    // Flash di volata e rinculo della camera
    flashMuzzle();
    applyRecoil(0.008);
    
    // Effetto rinculo visivo forte
    const recoilX = (Math.random() - 0.5) * 0.08;
    const recoilY = (Math.random() - 0.5) * 0.06;
    const recoilZ = 0.08;
    
    // Applica rinculo cumulativo
    machineGun.position.x += recoilX;
    machineGun.position.y += recoilY;
    machineGun.position.z += recoilZ;
    
    // Reset graduale del rinculo
    setTimeout(() => {
        machineGun.position.copy(machineGun.userData.basePosition);
    }, 40);
    
    // Imposta fire rate
    player.fireRate = 6; // 6 frame = ~10 colpi al secondo a 60 FPS
    
    // Auto-ricarica quando finiscono i colpi (dopo aver sparato l'ultimo colpo)
    if (player.machineGunAmmo === 0) {
        startMachineGunReload();
    }
}

function createBullet(damage, color, size) {
    const bullet = acquireBullet(size, 8, color, 0.8, 200);
    
    // Posizione iniziale dall'arma corrente
    const weapon = player.currentWeapon === 'pistol' ? gun : machineGun;
    const gunWorldPosition = new THREE.Vector3();
    weapon.getWorldPosition(gunWorldPosition);
    bullet.position.copy(gunWorldPosition);
    
    // Direzione dello sparo
    camera.getWorldDirection(_shotDir);
    
    bullet.velocity.copy(_shotDir).multiplyScalar(0.5);
    bullet.damage = damage;
    bullet.lifetime = 60;
    bullet.enemiesHit = 0; // Traccia quanti nemici ha colpito
    bullet.maxPierce = player.projectilesPierce || 0; // Massimo nemici che può attraversare
    
    scene.add(bullet);
    bullets.push(bullet);
}

function createBulletWithSpread(damage, color, size, spreadAngle) {
    const bullet = acquireBullet(size, 8, color, 0.8, 200);
    
    // Posizione iniziale dalla camera
    bullet.position.copy(camera.position);
    
    // Direzione base dello sparo
    camera.getWorldDirection(_shotDir);
    
    // Sistema di spread molto semplice e diretto
    const spread = spreadAngle * (Math.PI / 180);
    
    // Genera valori casuali per ogni proiettile
    const randomX = (Math.random() - 0.5) * spread * 2;
    const randomY = (Math.random() - 0.5) * spread * 2;
    
    // Allinea i vettori di spread con la camera
    _shotRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _shotUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    
    // Applica lo spread in modo diretto
    _shotDir.x += _shotRight.x * randomX + _shotUp.x * randomY;
    _shotDir.y += _shotRight.y * randomX + _shotUp.y * randomY;
    _shotDir.z += _shotRight.z * randomX + _shotUp.z * randomY;
    
    // Normalizza la direzione
    _shotDir.normalize();
    
    bullet.velocity.copy(_shotDir).multiplyScalar(0.5);
    bullet.damage = damage;
    bullet.lifetime = 60;
    bullet.enemiesHit = 0; // Traccia quanti nemici ha colpito
    bullet.maxPierce = player.projectilesPierce || 0; // Massimo nemici che può attraversare
    
    scene.add(bullet);
    bullets.push(bullet);
}

function reload() {
    // Ricarica manuale basata sull'arma corrente
    switch (player.currentWeapon) {
        case 'pistol':
            startReload();
            break;
        case 'machineGun':
            startMachineGunReload();
            break;
        case 'shotgun':
            startShotgunReload();
            break;
    }
}

function startReload() {
    if (player.isReloading || player.ammo >= player.maxAmmo) return;
    
    player.isReloading = true;
    const baseReloadTime = 120; // 2 secondi a 60 FPS
    player.reloadCooldown = baseReloadTime * (player.reloadSpeedMultiplier || 1);
    updateAmmoDisplay();
}

function startMachineGunReload() {
    if (player.isMachineGunReloading || player.machineGunAmmo >= player.maxMachineGunAmmo) return;
    
    player.isMachineGunReloading = true;
    const baseReloadTime = 360; // 6 secondi a 60 FPS
    player.machineGunReloadCooldown = baseReloadTime * (player.reloadSpeedMultiplier || 1);
    updateAmmoDisplay();
}

function startShotgunReload() {
    if (player.isShotgunReloading || player.shotgunAmmo >= player.maxShotgunAmmo) return;
    
    player.isShotgunReloading = true;
    const baseReloadTime = 180; // 3 secondi a 60 FPS
    player.shotgunReloadCooldown = baseReloadTime * (player.reloadSpeedMultiplier || 1);
    updateAmmoDisplay();
}

function updateReload() {
    const reloadBar = document.getElementById('reloadBar');
    const reloadFill = document.getElementById('reloadFill');
    
    // Aggiorna cooldown del fucile
    if (player.shotgunFireCooldown > 0) {
        player.shotgunFireCooldown--;
    }
    
    // Aggiorna cooldown granate (continua anche con altre armi)
    if (player.grenadeCooldown > 0) {
        player.grenadeCooldown--;
    }
    
    // Ricarica pistola
    if (player.isReloading && player.reloadCooldown > 0) {
        reloadBar.style.display = 'block';
        player.reloadCooldown--;
        
        const baseReloadTime = 120;
        const progress = 1 - (player.reloadCooldown / (baseReloadTime * (player.reloadSpeedMultiplier || 1)));
        reloadFill.style.width = (progress * 100) + '%';
        
        if (player.reloadCooldown <= 0) {
            player.ammo = player.maxAmmo;
            player.isReloading = false;
            reloadBar.style.display = 'none';
            updateAmmoDisplay();
        }
    }
    
    // Ricarica mitragliatrice
    if (player.isMachineGunReloading) {
        reloadBar.style.display = 'block';
        player.machineGunReloadCooldown--;
        
        const baseReloadTime = 360;
        const progress = 1 - (player.machineGunReloadCooldown / (baseReloadTime * (player.reloadSpeedMultiplier || 1)));
        reloadFill.style.width = (progress * 100) + '%';
        
        if (player.machineGunReloadCooldown <= 0) {
            player.machineGunAmmo = player.maxMachineGunAmmo;
            player.isMachineGunReloading = false;
            reloadBar.style.display = 'none';
            updateAmmoDisplay();
        }
    }
    
    // Ricarica fucile
    if (player.isShotgunReloading) {
        reloadBar.style.display = 'block';
        player.shotgunReloadCooldown--;
        
        const baseReloadTime = 180;
        const progress = 1 - (player.shotgunReloadCooldown / (baseReloadTime * (player.reloadSpeedMultiplier || 1)));
        reloadFill.style.width = (progress * 100) + '%';
        
        if (player.shotgunReloadCooldown <= 0) {
            player.shotgunAmmo = player.maxShotgunAmmo;
            player.isShotgunReloading = false;
            reloadBar.style.display = 'none';
            updateAmmoDisplay();
        }
    }
    
    if (!player.isReloading && !player.isMachineGunReloading && !player.isShotgunReloading) {
        reloadBar.style.display = 'none';
    }
    
    // Aggiorna fire rate
    if (player.fireRate > 0) {
        player.fireRate--;
    }
    
    // Aggiorna ogni frame l'indicatore di cooldown e numero granate
    updateGrenadeCooldown();
}

function updateAmmoDisplay() {
    let ammoText;
    
    if (player.currentWeapon === 'pistol') {
        ammoText = player.isReloading ? "RICARICA..." : `${player.ammo} / ∞`;
    } else if (player.currentWeapon === 'machineGun') {
        ammoText = player.isMachineGunReloading ? "RICARICA..." : `${player.machineGunAmmo} / ${player.maxMachineGunAmmo}`;
    } else if (player.currentWeapon === 'shotgun') {
        ammoText = player.isShotgunReloading ? "RICARICA..." : `${player.shotgunAmmo} / ${player.maxShotgunAmmo}`;
    }
    
    document.getElementById('ammo').textContent = ammoText;
    
    // Aggiorna indicatore arma
    const weaponIndicator = document.getElementById('weaponIndicator');
    if (weaponIndicator) {
        let weaponName, weaponColor;
        
        switch(player.currentWeapon) {
            case 'pistol':
                weaponName = 'PISTOLA';
                weaponColor = '#ffaa00';
                break;
            case 'machineGun':
                weaponName = 'MITRAGLIATRICE';
                weaponColor = '#ff6600';
                break;
            case 'shotgun':
                weaponName = 'FUCILE';
                weaponColor = '#ffff00';
                break;
        }
        
        weaponIndicator.textContent = weaponName;
        weaponIndicator.style.color = weaponColor;
    }
    
    // Aggiorna icone armi
    updateWeaponIcons();
}

function updateWeaponIcons() {
    // Rimuovi classe active da tutte le icone
    document.querySelectorAll('.weaponIcon').forEach(icon => {
        icon.classList.remove('active');
    });
    
    // Aggiungi classe active all'icona dell'arma corrente
    const activeIcon = document.getElementById(player.currentWeapon + 'Icon');
    if (activeIcon) {
        activeIcon.classList.add('active');
    }
    
    // Aggiorna icona granata (sempre visibile ma non active)
    const grenadeIcon = document.getElementById('grenadeIcon');
    if (grenadeIcon) {
        // Mostra sempre l'icona granata ma mai come active
        grenadeIcon.classList.remove('active');
    }
    
    // Aggiorna indicatore cooldown granate
    updateGrenadeCooldown();
}

function updateGrenadeCooldown() {
    const cooldownElement = document.getElementById('grenadeCooldown');
    if (cooldownElement) {
        if (player.grenadeCooldown > 0) {
            const seconds = Math.ceil(player.grenadeCooldown / 60);
            cooldownElement.textContent = seconds + 's';
            cooldownElement.style.display = 'block';
        } else {
            cooldownElement.style.display = 'none';
        }
    }
    // Aggiorna il contatore di granate rimaste
    const countElement = document.getElementById('grenadeCount');
    if (countElement) {
        countElement.textContent = player.grenades;
    }
}

function switchWeapon(weaponType) {
    if (player.currentWeapon === weaponType) return;
    
    player.currentWeapon = weaponType;
    
    // Nascondi/mostra armi
    gun.visible = false;
    machineGun.visible = false;
    shotgun.visible = false;
    
    if (weaponType === 'pistol') {
        gun.visible = true;
    } else if (weaponType === 'machineGun') {
        machineGun.visible = true;
    } else if (weaponType === 'shotgun') {
        shotgun.visible = true;
    }
    
    updateAmmoDisplay();
}

function updatePlayer() {
    if (!gameRunning) return;
    
    // Applica rigenerazione salute se acquistata
    if (player.healthRegen > 0 && player.health < player.maxHealth) {
        player.regenTimer = (player.regenTimer || 0) + 1;
        if (player.regenTimer >= 60) { // Ogni 60 frames (1 secondo a 60 FPS)
            player.health = Math.min(player.maxHealth, player.health + player.healthRegen);
            player.regenTimer = 0;
            updateHealthBar(); // Aggiorna la UI solo quando la salute cambia
        }
    }
    
    // Fuoco automatico per mitragliatrice
    if ((player.isMouseDown || player.eKeyPressed) && player.currentWeapon === 'machineGun') {
        shoot();
    }
    
    // Sistema di doppio salto con click separati
    if (keys[' '] && !player.spacePressed) {
        player.spacePressed = true; // Impedisce ripetizioni
        
        if (player.isGrounded) {
            // Primo salto normale
            player.velocityY = player.jumpSpeed * (player.jumpMultiplier || 1);
            player.isGrounded = false;
            player.currentPlatform = null;
            player.jumpsRemaining = player.maxJumps - 1; // Usa maxJumps invece di 1
            player.hasDoubleJumped = false;
        } else if (!player.hasDoubleJumped && player.jumpsRemaining > 0) {
            // Secondo salto (doppio salto) più potente
            player.velocityY = player.doubleJumpSpeed * (player.jumpMultiplier || 1);
            player.jumpsRemaining = 0;
            player.hasDoubleJumped = true;
            
            // Effetto visivo per il doppio salto
            createDoubleJumpEffect();
        }
    }
    
    // Resetta il flag quando il tasto viene rilasciato
    if (!keys[' ']) {
        player.spacePressed = false;
    }
    
    // Gravità
    player.velocityY -= player.gravity;
    const newY = camera.position.y + player.velocityY;
    
    // Controllo terra
    if (newY <= 1.7) {
        camera.position.y = 1.7;
        player.velocityY = 0;
        player.isGrounded = true;
        player.currentPlatform = null;
        player.jumpsRemaining = player.maxJumps; // Resetta salti
        player.hasDoubleJumped = false;
    } else {
        // Controllo piattaforme solo se non siamo già su una piattaforma
        if (!player.currentPlatform || player.velocityY > 0) {
            let foundPlatform = null;
            
            platforms.forEach(platform => {
                const platformData = platform.userData;
                const platformTop = platformData.height + 0.25;
                
                // Controlla se il giocatore sta per atterrare sulla piattaforma
                if (newY > platformTop - 0.5 && newY < platformTop + 1 && player.velocityY <= 0) {
                    let onPlatform = false;
                    
                    // Controlla se è una colonna (circolare) o una piattaforma rettangolare
                    if (platformData.isColumn) {
                        // Per le colonne, usa controllo circolare
                        const distance = Math.sqrt(
                            Math.pow(camera.position.x - platform.position.x, 2) + 
                            Math.pow(camera.position.z - platform.position.z, 2)
                        );
                        onPlatform = distance < platformData.width / 2; // width è il diametro
                    } else {
                        // Per le piattaforme rettangolari, usa controllo rettangolare
                        const dx = Math.abs(camera.position.x - platform.position.x);
                        const dz = Math.abs(camera.position.z - platform.position.z);
                        onPlatform = dx < platformData.width / 2 && dz < platformData.depth / 2;
                    }
                    
                    if (onPlatform) {
                        foundPlatform = platform;
                    }
                }
            });
            
            if (foundPlatform) {
                const platformData = foundPlatform.userData;
                camera.position.y = platformData.height + 1.7;
                player.velocityY = 0;
                player.isGrounded = true;
                player.currentPlatform = foundPlatform;
                player.jumpsRemaining = player.maxJumps; // Resetta salti
                player.hasDoubleJumped = false;
            } else {
                camera.position.y = newY;
                player.isGrounded = false;
                player.currentPlatform = null;
            }
        } else {
            // Se siamo già su una piattaforma, controlla se siamo ancora sopra di essa
            const platformData = player.currentPlatform.userData;
            let stillOnPlatform = false;
            
            // Controlla se è una colonna (circolare) o una piattaforma rettangolare
            if (platformData.isColumn) {
                // Per le colonne, usa controllo circolare
                const distance = Math.sqrt(
                    Math.pow(camera.position.x - player.currentPlatform.position.x, 2) + 
                    Math.pow(camera.position.z - player.currentPlatform.position.z, 2)
                );
                stillOnPlatform = distance < platformData.width / 2;
            } else {
                // Per le piattaforme rettangolari, usa controllo rettangolare
                const dx = Math.abs(camera.position.x - player.currentPlatform.position.x);
                const dz = Math.abs(camera.position.z - player.currentPlatform.position.z);
                stillOnPlatform = dx < platformData.width / 2 && dz < platformData.depth / 2;
            }
            
            if (!stillOnPlatform) {
                // Siamo usciti dalla piattaforma
                player.currentPlatform = null;
                player.isGrounded = false;
                camera.position.y = newY;
            } else {
                // Restiamo sulla piattaforma
                camera.position.y = platformData.height + 1.7;
                player.velocityY = 0;
            }
        }
    }
    
    // Movimento WASD + controlli stile Doom
    const moveVector = new THREE.Vector3();
    
    // Controlli WASD normali
    const actualSpeed = player.speed * (player.speedMultiplier || 1);
    if (keys['w'] || keys['W']) moveVector.z -= actualSpeed;
    if (keys['s'] || keys['S']) moveVector.z += actualSpeed;
    if (keys['a'] || keys['A']) moveVector.x -= actualSpeed;
    if (keys['d'] || keys['D']) moveVector.x += actualSpeed;
    
    // Controlli stile Doom (frecce)
    // Freccia su/giù per movimento avanti/indietro
    if (keys['ArrowUp']) moveVector.z -= actualSpeed;
    if (keys['ArrowDown']) moveVector.z += actualSpeed;
    
    // Freccia sinistra/destra per rotazione visuale
    if (keys['ArrowLeft']) {
        player.rotation.y += 0.03; // Rotazione più fluida e precisa
        camera.rotation.y = player.rotation.y;
    }
    if (keys['ArrowRight']) {
        player.rotation.y -= 0.03;
        camera.rotation.y = player.rotation.y;
    }
    
    // Applica movimento relativo alla rotazione della camera
    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    
    // Calcola nuova posizione
    const newPosition = camera.position.clone().add(moveVector);
    
    // Controlla collisione con colonne
    columns.forEach((column) => {
        const distance = newPosition.distanceTo(column.position);
        if (distance < 1.0) { // Raggio di collisione colonne
            // Calcola la direzione di respinta
            const pushDirection = newPosition.clone().sub(column.position).normalize();
            pushDirection.multiplyScalar(1.0 - distance); // Spingi fuori dalla colonna
            
            // Applica la respinta
            newPosition.sub(pushDirection);
        }
    });
    
    // Applica screenshake se attivo
    if (cameraShakeIntensity > 0) {
        const shake = new THREE.Vector3(
            (Math.random() - 0.5) * cameraShakeIntensity,
            (Math.random() - 0.5) * cameraShakeIntensity,
            (Math.random() - 0.5) * cameraShakeIntensity
        );
        newPosition.add(shake);
    }
    
    // Applica movimento corretto
    camera.position.copy(newPosition);
    player.position.x = camera.position.x;
    player.position.y = camera.position.y;
    player.position.z = camera.position.z;
    
    // Limiti del mondo
    const boundary = 24;
    camera.position.x = Math.max(-boundary, Math.min(boundary, camera.position.x));
    camera.position.z = Math.max(-boundary, Math.min(boundary, camera.position.z));
    
    // Applica il rinculo visivo della camera
    camera.rotation.x = player.rotation.x + recoil;
    recoil *= 0.8;
    if (Math.abs(recoil) < 0.0005) recoil = 0;
    
    // Aggiorna ricarica
    updateReload();
}

function updateEnemies() {
    if (!gameRunning) return;
    
    // Aggiorna nemici normali (iterazione inversa: i nemici possono essere rimossi)
    for (let i = enemies.length - 1; i >= 0; i--) {
        updateRegularEnemy(enemies[i], i, enemies);
    }
    
    // Aggiorna nemici solo piattaforma
    for (let i = platformEnemies.length - 1; i >= 0; i--) {
        updatePlatformOnlyEnemy(platformEnemies[i], i, platformEnemies);
    }
}

function updateRegularEnemy(enemy, index, enemyArray) {
    // Applica gravità ai nemici
    if (!enemy.userData.isGrounded) {
        enemy.userData.velocityY -= player.gravity;
        const newY = enemy.position.y + enemy.userData.velocityY;
        
        // Controllo terra
        if (newY <= 0.7) {
            enemy.position.y = 0.7;
            enemy.userData.velocityY = 0;
            enemy.userData.isGrounded = true;
        } else {
            // Controllo piattaforme
            let foundPlatform = null;
            
            platforms.forEach(platform => {
                const platformData = platform.userData;
                const platformTop = platformData.height + 0.25;
                
                if (newY > platformTop - 0.5 && newY < platformTop + 1 && enemy.userData.velocityY <= 0) {
                    const dx = Math.abs(enemy.position.x - platform.position.x);
                    const dz = Math.abs(enemy.position.z - platform.position.z);
                    
                    if (dx < platformData.width / 2 && dz < platformData.depth / 2) {
                        foundPlatform = platform;
                    }
                }
            });
            
            if (foundPlatform) {
                const platformData = foundPlatform.userData;
                enemy.position.y = platformData.height + 0.7;
                enemy.userData.velocityY = 0;
                enemy.userData.isGrounded = true;
            } else {
                enemy.position.y = newY;
            }
        }
    }
    
    // Movimento verso il giocatore (solo se a terra e giocatore visibile)
    if (enemy.userData.isGrounded) {
        // Controlla se il giocatore è invisibile
        if (player.abilities.invisibility.active) {
            // Se il giocatore è invisibile, i nemici si muovono casualmente o restano fermi
            if (Math.random() < 0.02) { // 2% di possibilità di cambiare direzione
                const randomAngle = Math.random() * Math.PI * 2;
                const randomDirection = new THREE.Vector3(
                    Math.cos(randomAngle) * enemy.speed * 0.3,
                    0,
                    Math.sin(randomAngle) * enemy.speed * 0.3
                );
                enemy.position.add(randomDirection);
            }
            
            // Non attaccare quando il giocatore è invisibile
            return;
        }
        
        // Comportamento normale quando il giocatore è visibile
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, enemy.position);
        direction.y = 0; // Mantieni i nemici a terra
        direction.normalize();
        
        enemy.position.add(direction.multiplyScalar(enemy.speed));
        
        // Controlla se il nemico è ancora su una piattaforma dopo il movimento
        let stillOnPlatform = false;
        platforms.forEach(platform => {
            const platformData = platform.userData;
            const dx = Math.abs(enemy.position.x - platform.position.x);
            const dz = Math.abs(enemy.position.z - platform.position.z);
            
            if (dx < platformData.width / 2 && dz < platformData.depth / 2 && 
                Math.abs(enemy.position.y - (platformData.height + 0.7)) < 0.1) {
                stillOnPlatform = true;
            }
        });
        
        // Se il nemico esce dalla piattaforma, fa cadere
        if (!stillOnPlatform && enemy.position.y > 1.0) {
            enemy.userData.isGrounded = false;
            enemy.userData.velocityY = 0;
        }
    }
    
    // Rotazione verso il giocatore
    enemy.lookAt(camera.position);
    
    // Attacco se vicino
    const distance = enemy.position.distanceTo(camera.position);
    if (distance < 2 && enemy.attackCooldown <= 0) {
        takeDamage(enemy.damage);
        enemy.attackCooldown = 60; // 1 secondo a 60 FPS
        enemy.hasAttacked = true; // Segna che ha attaccato
        
        // Fai morire il nemico dopo aver attaccato
        enemy.health = 0;
        playEnemyDeathSound();
        createEnemyDeathAnimation(enemy);
        enemyArray.splice(index, 1);
        return; // Esci dalla funzione per evitare problemi
    }
    
    if (enemy.attackCooldown > 0) enemy.attackCooldown--;
    
    // Rimuovi nemici morti
    if (enemy.health <= 0) {
        kills++;
        gainXP(25);
        playEnemyDeathSound();
        scene.remove(enemy);
        enemyArray.splice(index, 1);
    }
}

function updatePlatformOnlyEnemy(enemy, index, enemyArray) {
    if (!enemy.userData.homePlatform) return;
    
    const platformData = enemy.userData.homePlatform.userData;
    
    // Mantieni il nemico sulla sua piattaforma
    const dx = Math.abs(enemy.position.x - enemy.userData.homePlatform.position.x);
    const dz = Math.abs(enemy.position.z - enemy.userData.homePlatform.position.z);
    
    // Se il nemico è ai bordi della piattaforma, fermalo
    const maxX = platformData.width / 2 - 0.5;
    const maxZ = platformData.depth / 2 - 0.5;
    
    // Movimento verso il giocatore ma limitato alla piattaforma
    // Controlla se il giocatore è invisibile
    if (player.abilities.invisibility.active) {
        // Se il giocatore è invisibile, i nemici sulle piattaforme si muovono casualmente
        if (Math.random() < 0.02) { // 2% di possibilità di cambiare direzione
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDirection = new THREE.Vector3(
                Math.cos(randomAngle) * enemy.speed * 0.3,
                0,
                Math.sin(randomAngle) * enemy.speed * 0.3
            );
            
            const newX = enemy.position.x + randomDirection.x;
            const newZ = enemy.position.z + randomDirection.z;
            
            // Controlla i limiti della piattaforma
            const platformDx = Math.abs(newX - enemy.userData.homePlatform.position.x);
            const platformDz = Math.abs(newZ - enemy.userData.homePlatform.position.z);
            
            if (platformDx <= maxX && platformDz <= maxZ) {
                enemy.position.x = newX;
                enemy.position.z = newZ;
            }
        }
        
        // Non attaccare quando il giocatore è invisibile
        return;
    }
    
    // Comportamento normale quando il giocatore è visibile
    const direction = new THREE.Vector3();
    direction.subVectors(camera.position, enemy.position);
    direction.y = 0;
    direction.normalize();
    
    const moveVector = direction.multiplyScalar(enemy.speed);
    const newX = enemy.position.x + moveVector.x;
    const newZ = enemy.position.z + moveVector.z;
    
    // Controlla i limiti della piattaforma
    const platformDx = Math.abs(newX - enemy.userData.homePlatform.position.x);
    const platformDz = Math.abs(newZ - enemy.userData.homePlatform.position.z);
    
    if (platformDx <= maxX && platformDz <= maxZ) {
        enemy.position.x = newX;
        enemy.position.z = newZ;
    }
    
    // Mantieni l'altezza corretta sulla piattaforma
    enemy.position.y = platformData.height + 0.7;
    
    // Rotazione verso il giocatore
    enemy.lookAt(camera.position);
    
    // Attacco se vicino
    const distance = enemy.position.distanceTo(camera.position);
    if (distance < 2 && enemy.attackCooldown <= 0) {
        takeDamage(enemy.damage);
        enemy.attackCooldown = 60;
        enemy.hasAttacked = true; // Segna che ha attaccato
        
        // Fai morire il nemico dopo aver attaccato
        enemy.health = 0;
        playEnemyDeathSound();
        createEnemyDeathAnimation(enemy);
        enemyArray.splice(index, 1);
        return; // Esci dalla funzione per evitare problemi
    }
    
    if (enemy.attackCooldown > 0) enemy.attackCooldown--;
    
    // Rimuovi nemici morti
    if (enemy.health <= 0) {
        kills++;
        gainXP(25);
        playEnemyDeathSound();
        scene.remove(enemy);
        enemyArray.splice(index, 1);
    }
}

function updateGrenades() {
    for (let i = grenades.length - 1; i >= 0; i--) {
        const grenade = grenades[i];
        
        // Aggiorna posizione
        grenade.position.add(grenade.velocity);
        
        // Applica gravità
        grenade.velocity.y -= grenade.gravity;
        
        // Rotazione
        grenade.rotation.x += 0.1;
        grenade.rotation.z += 0.05;
        
        // Decrementa lifetime
        grenade.lifetime--;
        
        // Controlla collisione con terreno o piattaforme
        if (grenade.position.y <= 0.5 || grenade.lifetime <= 0) {
            explodeGrenade(grenade, i);
            continue;
        }
        
        // Controlla collisione con piattaforme
        platforms.forEach(platform => {
            const platformData = platform.userData;
            const platformTop = platformData.height + 0.25;
            
            if (grenade.position.y <= platformTop + 0.2) {
                const dx = Math.abs(grenade.position.x - platform.position.x);
                const dz = Math.abs(grenade.position.z - platform.position.z);
                
                if (dx < platformData.width / 2 && dz < platformData.depth / 2) {
                    explodeGrenade(grenade, i);
                    return;
                }
            }
        });
    }
}

function explodeGrenade(grenade, index) {
    if (grenade.exploded) return;
    grenade.exploded = true;
    
    // Suono esplosione granata
    playGrenadeExplosionSound();
    
    // Rimuovi granata (la sua luce torna nel pool prima che esca dalla scena)
    releaseDynamicLight(grenade.userData.light);
    scene.remove(grenade);
    grenades.splice(index, 1);
    
    // Crea esplosione
    const explosionGeometry = new THREE.SphereGeometry(3, 8, 8);
    const explosionMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6600,
        transparent: true,
        opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(grenade.position);
    scene.add(explosion);
    
    // Luce esplosione (dal pool)
    const explosionLight = acquireDynamicLight(0xff6600, 2, 10);
    if (explosionLight) explosionLight.position.copy(grenade.position);
    
    // Danno ai nemici nel raggio
    const explosionRadius = 4;
    
    // Controlla nemici normali
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distance = enemy.position.distanceTo(grenade.position);
        
        if (distance < explosionRadius) {
            const damage = Math.floor(50 * (1 - distance / explosionRadius)); // Danno decrescente con distanza
            enemy.health -= damage;
            
            // Suono colpo
            playHitSound();
            
            // Controlla se nemico è morto
            if (enemy.health <= 0) {
                playEnemyDeathSound();
                scene.remove(enemy);
                enemies.splice(i, 1);
                kills++; // Incrementa uccisioni
            }
        }
    }
    
    // Controlla nemici piattaforma
    for (let i = platformEnemies.length - 1; i >= 0; i--) {
        const enemy = platformEnemies[i];
        const distance = enemy.position.distanceTo(grenade.position);
        
        if (distance < explosionRadius) {
            const damage = Math.floor(50 * (1 - distance / explosionRadius));
            enemy.health -= damage;
            
            playHitSound();
            
            if (enemy.health <= 0) {
                playEnemyDeathSound();
                scene.remove(enemy);
                platformEnemies.splice(i, 1);
                kills++; // Incrementa uccisioni
            }
        }
    }
    
    // Danno al boss
    if (bossActive && boss && !boss.dead) {
        const distance = boss.group.position.distanceTo(grenade.position);
        if (distance < explosionRadius + 3) {
            boss.health -= 50;
            playHitSound();
            updateBossHealthBar();
            if (boss.health <= 0) defeatBoss();
        }
    }
    
    // Crea fuoco persistente se l'abilità è attiva
    if (player.grenadeFireDuration > 0) {
        createFireField(grenade.position, player.grenadeFireDuration, player.grenadeFireDamage);
    }
    
    // Rimuovi esplosione dopo un po' (e libera la luce di nuovo nel pool)
    setTimeout(() => {
        scene.remove(explosion);
        releaseDynamicLight(explosionLight);
    }, 200);
}

function createFireField(position, duration, damagePerSecond) {
    // Crea campo di fuoco visivo
    const fireGeometry = new THREE.CircleGeometry(3, 16);
    const fireMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4500,
        transparent: true,
        opacity: 0.6
    });
    const fireField = new THREE.Mesh(fireGeometry, fireMaterial);
    fireField.position.copy(position);
    fireField.position.y = 0.1; // Leggermente sopra il terreno
    fireField.rotation.x = -Math.PI / 2; // Orizzontale
    scene.add(fireField);
    
    // Crea luce arancione per il fuoco (dal pool)
    const fireLight = acquireDynamicLight(0xff4500, 1, 8);
    if (fireLight) {
        fireLight.position.copy(position);
        fireLight.position.y = 1;
    }
    
    // Particelle di fuoco
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Posizione casuale nel raggio del campo di fuoco
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = Math.random() * 2.5;
        particle.position.set(
            position.x + Math.cos(angle) * radius,
            position.y + Math.random() * 0.5,
            position.z + Math.sin(angle) * radius
        );
        
        // Velocità verso l'alto
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            Math.random() * 0.03 + 0.02,
            (Math.random() - 0.5) * 0.02
        );
        
        particle.lifetime = Math.floor(Math.random() * 30 + 20);
        scene.add(particle);
        
        // Aggiungi alle particelle esistenti
        if (!window.fireParticles) window.fireParticles = [];
        window.fireParticles.push(particle);
    }
    
    // Danno continuo ai nemici nel campo di fuoco
    const damageInterval = setInterval(() => {
        if (!gameRunning) {
            clearInterval(damageInterval);
            return;
        }
        
        // Controlla nemici normali
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const distance = enemy.position.distanceTo(position);
            
            if (distance < 3) { // Raggio del campo di fuoco
                enemy.health -= damagePerSecond;
                playHitSound();
                
                if (enemy.health <= 0) {
                    playEnemyDeathSound();
                    scene.remove(enemy);
                    enemies.splice(i, 1);
                    kills++;
                    player.xp += 25; // XP diretto invece di gainXP
                    updateXPDisplay();
                }
            }
        }
        
        // Controlla nemici piattaforma
        for (let i = platformEnemies.length - 1; i >= 0; i--) {
            const enemy = platformEnemies[i];
            const distance = enemy.position.distanceTo(position);
            
            if (distance < 3) {
                enemy.health -= damagePerSecond;
                playHitSound();
                
                if (enemy.health <= 0) {
                    playEnemyDeathSound();
                    scene.remove(enemy);
                    platformEnemies.splice(i, 1);
                    kills++;
                    player.xp += 25; // XP diretto invece di gainXP
                    updateXPDisplay();
                }
            }
        }
    }, 1000); // Danno ogni secondo
    
    // Rimuovi il campo di fuoco dopo la durata
    setTimeout(() => {
        clearInterval(damageInterval);
        scene.remove(fireField);
        releaseDynamicLight(fireLight);
    }, duration * 1000);
}

function updateFireParticles() {
    if (!window.fireParticles) window.fireParticles = [];
    
    for (let i = window.fireParticles.length - 1; i >= 0; i--) {
        const particle = window.fireParticles[i];
        
        // Aggiorna posizione
        particle.position.add(particle.velocity);
        
        // Applica gravità
        particle.velocity.y -= 0.001;
        
        // Decrementa lifetime
        particle.lifetime--;
        
        // Fade out
        particle.material.opacity = particle.lifetime / 50 * 0.8;
        
        // Rimuovi se scaduto
        if (particle.lifetime <= 0) {
            scene.remove(particle);
            window.fireParticles.splice(i, 1);
        }
    }
}

function updateBullets() {
    // Reset del flag "colpito questo frame" per evitare danni multipli dei pallets
    enemies.forEach(enemy => { enemy.hitThisFrame = false; });
    platformEnemies.forEach(enemy => { enemy.hitThisFrame = false; });
    
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.velocity);
        bullet.lifetime--;
        
        // Controlla collisioni con colonne (solo per bloccare i proiettili)
        let columnHit = false;
        for (let c = 0; c < columns.length; c++) {
            if (bullet.position.distanceTo(columns[c].position) < 1.0) { // Raggio di collisione colonne
                // Rimuovi proiettile (torna nel pool)
                releaseBullet(bullet, i);
                columnHit = true;
                break;
            }
        }
        
        if (columnHit) continue; // Salta al prossimo proiettile se ha colpito una colonna
        
        // Controlla collisioni con nemici normali
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distance = bullet.position.distanceTo(enemy.position);
            
            if (distance < 2.5) { // Aumentato da 1.8 a 2.5 per colpire anche la testa alta
                // Headshot: colpo nella parte alta del nemico infligge danno doppio
                const isHeadshot = bullet.position.y > enemy.position.y + 1.1;
                const damageMultiplier = isHeadshot ? 2 : 1;
                let damageDealt = 0;
                // Per i pallets del fucile, applica danno solo una volta per nemico per frame
                if (bullet.userData && bullet.userData.isShotgunPellet) {
                    if (!enemy.hitThisFrame) {
                        enemy.health -= bullet.damage * damageMultiplier;
                        damageDealt = bullet.damage * damageMultiplier;
                        enemy.hitThisFrame = true; // Impedisce danni multipli nello stesso frame
                    }
                } else {
                    enemy.health -= bullet.damage * damageMultiplier;
                    damageDealt = bullet.damage * damageMultiplier;
                }
                
                // Suono colpo e feedback visivo
                if (damageDealt > 0) {
                    playHitSound();
                    showHitMarker(isHeadshot);
                    showDamageNumber(enemy.position, damageDealt, isHeadshot);
                }
                
                // Incrementa conteggio nemici colpiti
                bullet.enemiesHit++;
                
                // Controlla se il proiettile ha esaurito la penetrazione
                if (bullet.enemiesHit >= bullet.maxPierce + 1) {
                    releaseBullet(bullet, i);
                    break; // Esci dal loop dei nemici
                }
                
                // Se non ha più penetrazione, esci dal loop ma continua a viaggiare
                if (bullet.maxPierce <= 0) {
                    break; // Esci dal loop dei nemici
                }
            }
        }
        
        // Se il proiettile è stato consumato nel loop nemici, passa al prossimo
        // Controllo O(1): se il proiettile e' stato rilasciato, in posizione i
        // ora c'e' un altro elemento (o niente). Prima qui c'era bullets.includes,
        // che scandiva tutto l'array per ogni proiettile a ogni frame.
        if (bullets[i] !== bullet) continue;
        
        // Controlla collisioni con nemici solo piattaforma
        for (let j = platformEnemies.length - 1; j >= 0; j--) {
            const enemy = platformEnemies[j];
            const distance = bullet.position.distanceTo(enemy.position);
            
            if (distance < 2.2) { // Aumentato da 1.5 a 2.2 per colpire anche la testa alta
                // Headshot: colpo nella parte alta del nemico infligge danno doppio
                const isHeadshot = bullet.position.y > enemy.position.y + 1.1;
                const damageMultiplier = isHeadshot ? 2 : 1;
                let damageDealt = 0;
                // Per i pallets del fucile, applica danno solo una volta per nemico per frame
                if (bullet.userData && bullet.userData.isShotgunPellet) {
                    if (!enemy.hitThisFrame) {
                        enemy.health -= bullet.damage * damageMultiplier;
                        damageDealt = bullet.damage * damageMultiplier;
                        enemy.hitThisFrame = true; // Impedisce danni multipli nello stesso frame
                    }
                } else {
                    enemy.health -= bullet.damage * damageMultiplier;
                    damageDealt = bullet.damage * damageMultiplier;
                }
                
                // Suono colpo e feedback visivo
                if (damageDealt > 0) {
                    playHitSound();
                    showHitMarker(isHeadshot);
                    showDamageNumber(enemy.position, damageDealt, isHeadshot);
                }
                
                // Incrementa conteggio nemici colpiti
                bullet.enemiesHit++;
                
                // Controlla se il proiettile ha esaurito la penetrazione
                if (bullet.enemiesHit >= bullet.maxPierce + 1) {
                    releaseBullet(bullet, i);
                    break; // Esci dal loop dei nemici
                }
                
                // Se non ha più penetrazione, esci dal loop ma continua a viaggiare
                if (bullet.maxPierce <= 0) {
                    break; // Esci dal loop dei nemici
                }
            }
        }
        
        // Se il proiettile è stato consumato, passa al prossimo
        // Controllo O(1): se il proiettile e' stato rilasciato, in posizione i
        // ora c'e' un altro elemento (o niente). Prima qui c'era bullets.includes,
        // che scandiva tutto l'array per ogni proiettile a ogni frame.
        if (bullets[i] !== bullet) continue;
        
        // Controlla collisione con il boss (hitbox cilindrico: il boss è ~12 unità alto)
        if (bossActive && boss && !boss.dead) {
            const dx = bullet.position.x - boss.group.position.x;
            const dz = bullet.position.z - boss.group.position.z;
            const horizDist = Math.sqrt(dx * dx + dz * dz);
            const by = boss.group.position.y;
            if (horizDist < 5 && bullet.position.y > by - 0.5 && bullet.position.y < by + 12.5) {
                boss.health -= bullet.damage;
                playHitSound();
                const hitPos = new THREE.Vector3(boss.group.position.x, boss.group.position.y + 6, boss.group.position.z);
                showDamageNumber(hitPos, bullet.damage, false);
                releaseBullet(bullet, i);
                updateBossHealthBar();
                if (boss.health <= 0) defeatBoss();
                continue;
            }
        }
        
        // Rimuovi proiettili scaduti
        if (bullet.lifetime <= 0 && bullets[i] === bullet) {
            releaseBullet(bullet, i);
        }
    }
}

function updateHealthBar() {
    const healthPercent = Math.max(0, player.health / player.maxHealth * 100);
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = `${Math.round(Math.max(0, player.health))}/${player.maxHealth}`;
    
    // Cambia colore della barra della salute in base alla salute
    const healthFill = document.getElementById('healthFill');
    if (healthPercent > 60) {
        healthFill.style.background = 'linear-gradient(90deg, #00ff00, #66ff66, #99ff99)';
    } else if (healthPercent > 30) {
        healthFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc66, #ffdd99)';
    } else {
        healthFill.style.background = 'linear-gradient(90deg, #ff0000, #ff6666, #ff9999)';
    }
    
    updateVignette();
}

function gameOver() {
    gameRunning = false;
    const survivalTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('survivalTime').textContent = survivalTime;
    document.getElementById('kills').textContent = kills;
    document.getElementById('gameOver').style.display = 'block';
    document.exitPointerLock();
}

function restart() {
    // Reset giocatore
    player.health = player.maxHealth;
    player.ammo = player.maxAmmo;
    player.machineGunAmmo = player.maxMachineGunAmmo;
    player.shotgunAmmo = player.maxShotgunAmmo;
    player.reloadCooldown = 0;
    player.machineGunReloadCooldown = 0;
    player.shotgunReloadCooldown = 0;
    player.currentWeapon = 'pistol';
    player.fireRate = 0;
    player.isMouseDown = false;
    player.eKeyPressed = false; // Resetta flag E
    player.grenades = 3; // Reset granate
    player.grenadeCooldown = 0; // Reset cooldown granate
    player.jumpsRemaining = player.maxJumps; // Reset salti
    player.hasDoubleJumped = false; // Reset doppio salto
    player.spacePressed = false; // Reset flag spazio
    camera.position.set(0, 1.7, 0);
    player.position = { x: 0, y: 1.7, z: 0 };
    
    // Reset statistiche
    kills = 0;
    
    // Pulizia nemici e proiettili
    enemies.forEach(enemy => scene.remove(enemy));
    platformEnemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    healthPickups.forEach(pickup => {
        releaseDynamicLight(pickup.userData.light);
        scene.remove(pickup);
    });
    grenades.forEach(grenade => {
        releaseDynamicLight(grenade.userData.light);
        scene.remove(grenade);
    });
    enemies = [];
    platformEnemies = [];
    bullets = [];
    healthPickups = [];
    grenades = [];
    
    clearBoss();
    restoreCentralPlatform();
    player.burnTimer = 0;
    
    // Reset UI
    updateHealthBar();
    updateAmmoDisplay();
    document.getElementById('gameOver').style.display = 'none';
    
    // Reset armi
    gun.visible = true;
    machineGun.visible = false;
    shotgun.visible = false;
    
    // Reset timer e ondate
    startTime = Date.now();
    resetWaves();
    
    gameRunning = true;
}

function resetWaves() {
    wave = 0;
    waveInProgress = false;
    waveEnemiesTotal = 0;
    waveEnemiesSpawned = 0;
    waveSpawnTimer = 0;
    bossWave = false;
    intermissionTimer = 90; // 1.5 secondi prima della prima ondata
    updateWaveDisplay();
}

function updateWaves() {
    if (!gameRunning) return;
    
    if (waveInProgress) {
        if (bossWave) {
            // Onda boss: completa quando il boss è stato sconfitto
            if (!bossActive) {
                completeWave();
            }
        } else {
            // Spawna i nemici dell'ondata
            if (waveEnemiesSpawned < waveEnemiesTotal) {
                waveSpawnTimer += 16; // ~60 FPS
                if (waveSpawnTimer >= waveSpawnInterval) {
                    waveSpawnTimer = 0;
                    createEnemy();
                    waveEnemiesSpawned++;
                }
            }
            
            // Ondata completata quando tutti i nemici sono stati eliminati
            if (waveEnemiesSpawned >= waveEnemiesTotal && enemies.length === 0 && platformEnemies.length === 0) {
                completeWave();
            }
        }
    } else {
        // Intermezzo tra le ondate
        if (intermissionTimer > 0) {
            intermissionTimer--;
            updateWaveCountdown();
        } else {
            startWave();
        }
    }
}

function startWave() {
    wave++;
    waveInProgress = true;
    
    if (wave % 10 === 0) {
        // Ogni 10 ondate: ondata boss
        bossWave = true;
        waveEnemiesTotal = 0;
        waveEnemiesSpawned = 0;
        updateWaveDisplay();
        showWaveBanner('ONDATA ' + wave + ' - BOSS!');
        spawnBoss();
    } else {
        bossWave = false;
        waveEnemiesTotal = Math.min(4 + wave * 2, 30);
        waveEnemiesSpawned = 0;
        waveSpawnTimer = 0;
        updateWaveDisplay();
        showWaveBanner('ONDATA ' + wave);
    }
}

function completeWave() {
    waveInProgress = false;
    intermissionTimer = 180; // 3 secondi di pausa tra ondate
    
    // Ricompensa tra ondate: cura e ricarica armi
    player.health = Math.min(player.maxHealth, player.health + 25);
    player.ammo = player.maxAmmo;
    player.machineGunAmmo = player.maxMachineGunAmmo;
    player.shotgunAmmo = player.maxShotgunAmmo;
    player.grenades = player.maxGrenades;
    updateHealthBar();
    updateAmmoDisplay();
    
    showWaveBanner('ONDATA ' + wave + ' COMPLETATA! +25 HP');
    updateWaveDisplay();
}

function updateWaveDisplay() {
    const el = document.getElementById('waveDisplay');
    if (!el) return;
    if (waveInProgress) {
        if (bossWave) {
            el.textContent = 'ONDATA ' + wave + '  |  BOSS';
        } else {
            const remaining = (waveEnemiesTotal - waveEnemiesSpawned) + enemies.length + platformEnemies.length;
            el.textContent = 'ONDATA ' + wave + '  |  Nemici: ' + remaining;
        }
    } else {
        el.textContent = 'ONDATA ' + wave + ' COMPLETATA';
    }
}

function updateWaveCountdown() {
    const el = document.getElementById('waveDisplay');
    if (!el) return;
    const seconds = Math.ceil(intermissionTimer / 60);
    el.textContent = 'Prossima ondata tra ' + seconds + 's';
}

function showWaveBanner(text) {
    const banner = document.createElement('div');
    banner.className = 'waveBanner';
    banner.textContent = text;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 2000);
}

// ==== ANIMAZIONE PROCEDURALE DEL BOSS ====
// L'FBX del boss contiene una sola clip Idle, molto leggera: sopra di essa (che il
// mixer continua a riprodurre) aggiungiamo qui la posa di guardia con le spade in
// avanti, il passo e il fendente dell'attacco. Le ossa vanno ruotate nel loro spazio
// locale DOPO il mixer, altrimenti l'Idle sovrascriverebbe ogni modifica.

const _bossBoneAxisX = new THREE.Vector3(1, 0, 0);
const _bossBoneAxisY = new THREE.Vector3(0, 1, 0);
const _bossBoneAxisZ = new THREE.Vector3(0, 0, 1);
const _bossBoneQuat = new THREE.Quaternion();

function rotateBossBone(bone, axis, angle) {
    if (!bone || !isFinite(angle) || angle === 0) return;
    _bossBoneQuat.setFromAxisAngle(axis, angle);
    bone.quaternion.multiply(_bossBoneQuat);
}

// Posa di guardia: senza di questa lo scheletro resta con le spade penzoloni ai
// fianchi, nella posa "da esposizione" della bind pose.
const BOSS_GUARD_ARM = -0.38;   // braccia portate in avanti (asse Z locale)
const BOSS_GUARD_BLADE = 0.32;  // fallback lame (asse X locale) se la posa non è calcolata

// Le lame sono agganciate alle mani (l'osso arma sta dentro la mano) ma il filo
// punta verso il basso: è la tipica posa "da esposizione" del modello. Ruotiamo
// l'osso di ~180° attorno all'asse verticale del mondo (in avanti/indietro) così la
// lama sale verso l'alto, come una spada impugnata.
function computeBossWeaponPose(model, bones) {
    model.updateMatrixWorld(true);
    // Angolo leggermente diverso per lato: le due lame si aprono a "V" verso l'esterno
    const sides = [
        { bone: bones.weaponL, angle: Math.PI - 0.28 },
        { bone: bones.weaponR, angle: Math.PI + 0.28 }
    ];
    const pose = { l: null, r: null };
    const worldAxis = new THREE.Vector3(0, 0, 1);

    sides.forEach(function (side, i) {
        const bone = side.bone;
        if (!bone) return;

        const qWorld = new THREE.Quaternion();
        bone.getWorldQuaternion(qWorld);

        // Rotazione espressa in mondo (R) convertita nello spazio locale dell'osso:
        //   Δlocale = Qmondo⁻¹ · R · Qmondo
        const flip = qWorld.clone().conjugate()
            .multiply(new THREE.Quaternion().setFromAxisAngle(worldAxis, side.angle))
            .multiply(qWorld);

        // Asse su cui modulare l'oscillazione (asse X del mondo) nella posa
        // già ribaltata: così l'attacco fa oscillare la lama in avanti/indietro.
        const original = bone.quaternion.clone();
        bone.quaternion.multiply(flip);
        const qFlipped = new THREE.Quaternion();
        bone.getWorldQuaternion(qFlipped);
        const swingAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(qFlipped.clone().invert());
        bone.quaternion.copy(original);

        pose[i === 0 ? 'l' : 'r'] = { flip: flip, swingAxis: swingAxis };
    });

    return pose;
}

function applyBossWeaponPose(bone, weaponPose, swing) {
    if (!bone) return;
    if (!weaponPose) {
        // Fallback (modello senza le ossa delle armi)
        rotateBossBone(bone, _bossBoneAxisX, BOSS_GUARD_BLADE - 0.6 * swing);
        return;
    }
    bone.quaternion.multiply(weaponPose.flip);      // lama verso l'alto
    rotateBossBone(bone, weaponPose.swingAxis, -0.95 * swing); // fendente avanti/indietro
}

function animateBoss(boss, moving) {
    const rig = boss.rig;
    if (!rig || !boss.pivot) return;

    boss.animTime += 1 / 60;
    if (boss.throwTimer > 0) boss.throwTimer--;

    // --- Passo: l'ampiezza si accende/spegne dolcemente, la fase avanza sempre
    boss.stepAmount += ((moving ? 1 : 0) - boss.stepAmount) * 0.15;
    boss.walkPhase += 0.11 * (0.25 + 0.75 * boss.stepAmount);
    const step = Math.sin(boss.walkPhase);
    const legSwing = 0.24 * boss.stepAmount;

    rotateBossBone(rig.thighL, _bossBoneAxisZ, legSwing * step);
    rotateBossBone(rig.thighR, _bossBoneAxisZ, -legSwing * step);
    // Polpacci: si piegano appena nella fase in cui la gamba va avanti
    rotateBossBone(rig.calfL, _bossBoneAxisZ, -legSwing * 0.5 * Math.max(0, step));
    rotateBossBone(rig.calfR, _bossBoneAxisZ, -legSwing * 0.5 * Math.max(0, -step));
    // Piedi: compensano il passo per restare paralleli al terreno
    rotateBossBone(rig.footL, _bossBoneAxisZ, -legSwing * 0.45 * step);
    rotateBossBone(rig.footR, _bossBoneAxisZ, legSwing * 0.45 * step);

    // --- Fendente: boss.swing segue boss.swingTarget (0 = guardia, + = alzata, - = fendente)
    boss.swing += (boss.swingTarget - boss.swing) * 0.2;
    const swing = boss.swing;

    // --- Braccia: guardia + oscillazione del passo + fendente
    const armSwing = 0.16 * boss.stepAmount * step;
    const throwLift = boss.throwTimer > 0 ? 0.9 * (boss.throwTimer / 18) : 0;

    rotateBossBone(rig.upperArmL, _bossBoneAxisZ, BOSS_GUARD_ARM + armSwing + swing);
    rotateBossBone(rig.upperArmR, _bossBoneAxisZ, BOSS_GUARD_ARM - armSwing + swing + throwLift);
    rotateBossBone(rig.forearmL, _bossBoneAxisZ, 0.22 * swing);
    rotateBossBone(rig.forearmR, _bossBoneAxisZ, 0.22 * swing + throwLift * 0.4);

    // --- Lame: impugnate verso l'alto, poi modulate dal fendente
    applyBossWeaponPose(rig.weaponL, rig.weaponPose && rig.weaponPose.l, swing);
    applyBossWeaponPose(rig.weaponR, rig.weaponPose && rig.weaponPose.r, swing);

    // --- Torso: torsione e piegata in avanti nel fendente
    rotateBossBone(rig.spine, _bossBoneAxisY, 0.22 * swing);
    rotateBossBone(rig.spine, _bossBoneAxisZ, 0.05 + 0.22 * Math.max(0, -swing));

    // --- Corpo: oscillazione verticale del passo, respiro da fermo, inclinazione
    const bob = 0.16 * boss.stepAmount * (0.5 - 0.5 * Math.cos(boss.walkPhase * 2))
              + 0.05 * Math.sin(boss.animTime * 2.2) * (1 - boss.stepAmount);
    boss.pivot.position.y = bob;
    boss.pivot.rotation.z = 0.035 * boss.stepAmount * step;
    boss.tilt += (boss.tiltTarget - boss.tilt) * 0.18;
    boss.pivot.rotation.x = boss.tilt;
}

// ==== MODELLO, NORMALIZZAZIONE E OSSA DEL BOSS ====

function computeSkinnedWorldBounds(object) {
    // Bounding box reale (coordinate mondo) dei vertici dopo lo skinning.
    // Box3.setFromObject usa la geometria in "bind pose", che per le mesh skinnate
    // puo' essere enorme e fuori centro (stesso bug gia' risolto per il fucile a pompa).
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const v = new THREE.Vector3();
    object.updateMatrixWorld(true);
    object.traverse(function(child) {
        if (child.isSkinnedMesh && child.geometry && child.geometry.attributes.position) {
            const pos = child.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                child.boneTransform(i, v);
                v.applyMatrix4(child.matrixWorld);
                min.min(v);
                max.max(v);
            }
        }
    });
    if (min.x === Infinity) {
        return new THREE.Box3().setFromObject(object);
    }
    return new THREE.Box3(min, max);
}

function measureAnimatedBounds(object, mixer) {
    // Unione dei box skinati campionando tutta l'animazione: se misurassimo solo la
    // posa di riposo il boss risulterebbe fuori misura (e con i piedi staccati da terra)
    // appena l'animazione comincia a scorrere.
    const samples = 6;
    const total = new THREE.Box3();
    const clipDuration = (object.animations && object.animations.length > 0)
        ? object.animations[0].duration : 0;
    for (let i = 0; i < samples; i++) {
        if (mixer && clipDuration > 0) {
            mixer.setTime(clipDuration * (i / samples));
        }
        total.union(computeSkinnedWorldBounds(object));
    }
    if (mixer) mixer.setTime(0);
    return total;
}

// Ossa del boss usate dall'animazione procedurale (nomi dello scheletro Biped)
const BOSS_BONES = {
    upperArmL: 'Bip01-L-UpperArm', upperArmR: 'Bip01-R-UpperArm',
    forearmL: 'Bip01-L-Forearm', forearmR: 'Bip01-R-Forearm',
    weaponL: 'Bip01-L_Weapon', weaponR: 'Bip01-R_Weapon',
    thighL: 'Bip01-L-Thigh', thighR: 'Bip01-R-Thigh',
    calfL: 'Bip01-L-Calf', calfR: 'Bip01-R-Calf',
    footL: 'Bip01-L-Foot', footR: 'Bip01-R-Foot',
    spine: 'Bip01-Spine1'
};

function cacheBossBones(model) {
    const bones = {};
    for (const key in BOSS_BONES) {
        bones[key] = model.getObjectByName(BOSS_BONES[key]) || null;
    }
    return bones;
}

function loadSkeletonTemplate() {
    // Precarica il modello dello scheletro (boss) e le sue texture una sola volta.
    const loader = new THREE.FBXLoader();
    loader.load('models/boss_skeleton.fbx', function(object) {
        object.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false; // le mesh skinnate possono sparire altrimenti
            }
        });
        applySkeletonTextures(object);

        // Animazione Idle (creata prima della normalizzazione: serve a misurare
        // l'ingombro reale del modello mentre l'animazione scorre)
        if (object.animations && object.animations.length > 0) {
            skeletonMixer = new THREE.AnimationMixer(object);
            skeletonMixer.clipAction(object.animations[0]).play();
        }
        // Normalizza il modello: il bounding box in "bind pose" delle mesh skinnate e'
        // inaffidabile, quindi usiamo il vero box dei vertici skinati campionato su
        // tutta l'animazione (vedi measureAnimatedBounds).
        const box = measureAnimatedBounds(object, skeletonMixer);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const targetHeight = 12; // altezza da boss (~12 unità)
        const s = targetHeight / size.y;
        object.scale.setScalar(s);
        object.position.set(-center.x * s, -box.min.y * s, -center.z * s);
        console.log('Scheletro boss normalizzato: ' + size.y.toFixed(1) + ' -> ' + targetHeight + ' unità');
        skeletonBones = cacheBossBones(object);
        // Posa delle armi (lame verso l'alto invece che penzoloni)
        if (skeletonBones) skeletonBones.weaponPose = computeBossWeaponPose(object, skeletonBones);
        skeletonModel = object;
    }, undefined, function(error) {
        console.error('Errore nel caricamento dello scheletro boss:', error);
        skeletonModel = null;
    });
}

// ---------------------------------------------------------------------------
// Palla di fuoco del boss: modello 3D del sole (models/sun.fbx).
// Il modello ("Sun" di Sebastian Sosnowski, Fab) e' formato da due sfere
// concentriche: il nucleo (UnstableStarCore) e un guscio appena piu' grande
// (UnstableStarref). Il FBX non referenzia nessuna texture e porta 10 materiali
// a palette mai usati (la geometria ha un solo gruppo), quindi li sostituiamo
// con un materiale solare unico.
// La sua clip anima la rotazione delle due sfere sull'asse verticale, con il
// guscio al doppio della velocita' del nucleo: la replichiamo in
// updateBossFireballs (piu' economico di un AnimationMixer per proiettile).
const SUN_DIAMETER = 4.4;                 // diametro in gioco (= vecchia sfera 2.2)
const SUN_SPIN_CORE = 0.013;              // rad/frame del nucleo (~1 giro ogni 8 s)
const SUN_SPIN_SHELL = SUN_SPIN_CORE * 2; // il guscio gira al doppio (come la clip)

function loadSunTemplate() {
    const loader = new THREE.FBXLoader();
    loader.load('models/sun.fbx', function(object) {
        const textureLoader = new THREE.TextureLoader();
        const surface = textureLoader.load('textures/sun_surface.jpg');
        surface.encoding = THREE.sRGBEncoding;
        surface.wrapS = THREE.RepeatWrapping;
        surface.wrapT = THREE.RepeatWrapping;
        
        const core = object.getObjectByName('UnstableStarCore');
        const shell = object.getObjectByName('UnstableStarref');
        if (core) {
            // Il nucleo si illumina da solo: map per il dettaglio, emissiveMap
            // perche' il sole non deve dipendere dalle luci della scena
            core.material = new THREE.MeshStandardMaterial({
                map: surface,
                emissive: 0xffffff,
                emissiveMap: surface,
                // 0.4 e non 1: il renderer ha exposure 1.8 e tone mapping ACES, quindi
                // con valori alti il sole diventa un disco bianco bruciato. Misurato
                // sulla scena vera: a 0.4 la superficie resta dorata (255,245,99) e
                // mottled, a 0.9 diventa (255,254,132), cioè quasi bianca.
                emissiveIntensity: 0.4,
                roughness: 1,
                metalness: 0,
                fog: false
            });
        }
        if (shell) {
            // Guscio additivo: bagliore che lascia intravedere il nucleo ruotare sotto
            shell.material = new THREE.MeshBasicMaterial({
                map: surface,
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            });
        }
        object.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });
        
        // Normalizza: il modello e' una sfera centrata nell'origine, diametro ~20.2
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const s = SUN_DIAMETER / Math.max(size.x, size.y, size.z);
        object.scale.setScalar(s);
        object.position.set(-center.x * s, -center.y * s, -center.z * s);
        
        // Un contenitore tiene il modello gia' normalizzato: clonandolo otteniamo
        // proiettili direttamente in "unita' di gioco" (nessuna scala annidata da
        // tenere in conto quando si aggiunge l'alone o la luce).
        const holder = new THREE.Group();
        holder.add(object);
        sunTemplate = holder;
        console.log('Sole normalizzato: ' + size.x.toFixed(1) + ' -> ' + SUN_DIAMETER + ' unita\'');
    }, undefined, function(error) {
        console.error('Errore nel caricamento del sole:', error);
        sunTemplate = null;
    });
}

function applySkeletonTextures(object) {
    const textureLoader = new THREE.TextureLoader();
    const baseColor = textureLoader.load('textures/boss_skeleton_basecolor.png');
    baseColor.encoding = THREE.sRGBEncoding;
    const normal = textureLoader.load('textures/boss_skeleton_normal.jpg');
    const rough = textureLoader.load('textures/boss_skeleton_rough.png');
    
    object.traverse(function(child) {
        if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
                map: baseColor,
                normalMap: normal,
                roughnessMap: rough,
                roughness: 0.9,
                metalness: 0.05
            });
            child.material.needsUpdate = true;
        }
    });
}

function detachSkeletonModel() {
    if (skeletonModel && skeletonModel.parent) {
        skeletonModel.parent.remove(skeletonModel);
    }
}

function spawnBoss() {
    if (bossActive) return;
    bossActive = true;
    
    // Rompe la piattaforma centrale per fare spazio al boss
    breakCentralPlatform();
    
    const bossGroup = new THREE.Group();
    bossGroup.position.set(0, 0, 0);

    // Il modello sta in un gruppo interno ("pivot"): inclinazioni e oscillazioni
    // avvengono così nel sistema di riferimento del boss (che ruota su Y per guardare
    // il giocatore) e non sugli assi del mondo.
    const bossPivot = new THREE.Group();
    bossGroup.add(bossPivot);
    
    // Usa il modello dello scheletro precaricato (o un fallback box rosso)
    if (skeletonModel) {
        detachSkeletonModel();
        // Il modello è già normalizzato (scala + posizione) in loadSkeletonTemplate
        skeletonModel.rotation.set(0, 0, 0);
        bossPivot.add(skeletonModel);
    } else {
        const fallbackGeom = new THREE.BoxGeometry(4, 6, 4);
        const fallbackMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0x440000, emissiveIntensity: 0.35 });
        const fallback = new THREE.Mesh(fallbackGeom, fallbackMat);
        fallback.position.y = 3;
        fallback.castShadow = true;
        fallback.receiveShadow = true;
        bossPivot.add(fallback);
    }
    
    scene.add(bossGroup);
    
    const maxHealth = 2400 + wave * 360;
    boss = {
        group: bossGroup,
        model: skeletonModel,
        health: maxHealth,
        maxHealth: maxHealth,
        dead: false,
        slamCooldown: 240,
        fireballCooldown: 360,
        speed: 0.035,
        slamState: 'idle',    // idle | windup | strike | recover
        slamTimer: 0,
        slamDirection: new THREE.Vector3(),
        slamRadius: 4.5,
        // Animazione procedurale (vedi animateBoss)
        pivot: bossPivot,
        rig: skeletonBones,
        animTime: 0,
        walkPhase: 0,
        stepAmount: 0,   // 0 = fermo, 1 = passo a piena ampiezza
        swing: 0,        // braccia: 0 guardia, + alzata, - fendente
        swingTarget: 0,
        tilt: 0,         // inclinazione del busto
        tiltTarget: 0,
        throwTimer: 0    // frame residui del lancio della palla di fuoco
    };
    
    showBossHealthBar();
    updateBossHealthBar();
    showWaveBanner('BOSS!');
}

function updateBoss() {
    if (!bossActive || !boss) return;
    
    if (boss.slamCooldown > 0) boss.slamCooldown--;
    if (boss.fireballCooldown > 0) boss.fireballCooldown--;
    
    // Aggiorna l'animazione Idle dello scheletro (scrive la posa di base sulle ossa)
    if (skeletonMixer) skeletonMixer.update(1 / 60);
    
    // Ruota il boss verso il giocatore (il modello guarda verso +Z)
    const faceDir = new THREE.Vector3();
    faceDir.subVectors(camera.position, boss.group.position);
    faceDir.y = 0;
    if (faceDir.lengthSq() > 0.0001) {
        boss.group.rotation.y = Math.atan2(faceDir.x, faceDir.z);
    }

    // Movimento: insegue il giocatore (solo quando non sta attaccando)
    let bossMoving = false;
    if (boss.slamState === 'idle') {
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(camera.position, boss.group.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();
        if (dist > 6) {
            toPlayer.normalize();
            boss.group.position.x += toPlayer.x * boss.speed;
            boss.group.position.z += toPlayer.z * boss.speed;
            boss.group.position.x = Math.max(-22, Math.min(22, boss.group.position.x));
            boss.group.position.z = Math.max(-22, Math.min(22, boss.group.position.z));
            bossMoving = true;
        }
    }
    
    if (boss.slamState === 'idle' && boss.slamCooldown <= 0) {
        startBossSlam();
    }
    
    if (boss.fireballCooldown <= 0) {
        launchBossFireball();
        boss.fireballCooldown = 600 + Math.floor(Math.random() * 240); // ~10-14 secondi
    }
    
    updateBossSlam();
    animateBoss(boss, bossMoving);      // animazione procedurale sopra l'Idle
    updateBossFireballs();
    updateBossHealthBar();
}

function startBossSlam() {
    boss.slamState = 'windup';
    boss.slamTimer = 25;
    boss.swingTarget = 0.95;   // alza le spade dietro la testa
    boss.tiltTarget = -0.24;   // si piega indietro
}

function updateBossSlam() {
    if (boss.slamState === 'idle') return;
    boss.slamTimer--;
    
    if (boss.slamState === 'windup') {
        // Si prepara: si piega indietro (l'inclinazione la applica animateBoss sul
        // pivot, così segue la direzione in cui il boss sta guardando)
        if (boss.slamTimer <= 0) {
            boss.slamState = 'strike';
            boss.slamTimer = 8;
            boss.swingTarget = -1.15;  // fende in avanti
            boss.tiltTarget = 0.4;
            // Direzione verso il giocatore
            boss.slamDirection.subVectors(camera.position, boss.group.position);
            boss.slamDirection.y = 0;
            boss.slamDirection.normalize();
        }
    } else if (boss.slamState === 'strike') {
        // Si lancia in avanti e schianta
        boss.group.position.x += boss.slamDirection.x * 0.45;
        boss.group.position.z += boss.slamDirection.z * 0.45;
        if (boss.slamTimer <= 0) {
            // Momento dell'impatto
            const dist = boss.group.position.distanceTo(camera.position);
            if (dist < boss.slamRadius) {
                takeDamage(20); // Doppio del danno dei nemici normali
                screenshake(0.9, 400);
                playHitSound();
            }
            boss.slamState = 'recover';
            boss.slamTimer = 20;
        }
    } else if (boss.slamState === 'recover') {
        // Si rialza e torna in guardia
        boss.swingTarget = 0;
        boss.tiltTarget = 0;
        if (boss.slamTimer <= 0) {
            boss.slamState = 'idle';
            boss.slamCooldown = 240 + Math.floor(Math.random() * 120); // 4-6 secondi
        }
    }
}

function launchBossFireball() {
    if (boss) boss.throwTimer = 18; // alza il braccio destro per il lancio
    const fireball = createSunFireball();
    fireball.position.copy(boss.group.position);
    fireball.position.y += 5;
    
    const dir = new THREE.Vector3();
    dir.subVectors(camera.position, fireball.position).normalize();
    
    fireball.userData.velocity = dir.multiplyScalar(0.2); // più lenta
    
    scene.add(fireball);
    bossFireballs.push(fireball);
}

// Costruisce un proiettile-sole. Clona il modello precaricato (clone() condivide
// geometrie e materiali: costo trascurabile) e gli aggiunge bagliore e luce.
// Aloni della palla di fuoco: geometrie e materiali condivisi, creati una volta
// sola (prima ogni palla di fuoco ne creava di nuovi).
let sunHaloLayers = null;
function getSunHaloLayers() {
    if (!sunHaloLayers) {
        sunHaloLayers = [
            { radius: 2.8, opacity: 0.15 },
            { radius: 3.4, opacity: 0.07 }
        ].map(function(layer) {
            return {
                geometry: new THREE.SphereGeometry(layer.radius, 12, 12),
                material: new THREE.MeshBasicMaterial({
                    color: 0xff8a2a,
                    transparent: true,
                    opacity: layer.opacity,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    fog: false
                })
            };
        });
    }
    return sunHaloLayers;
}

function createSunFireball() {
    const fireball = new THREE.Group();
    
    if (sunTemplate) {
        const sun = sunTemplate.clone();
        // Riferimenti alle due sfere da far ruotare: li cerchiamo nel clone (e non
        // in userData, che Object3D.clone() copia via JSON e perderebbe gli oggetti)
        fireball.userData.core = sun.getObjectByName('UnstableStarCore');
        fireball.userData.shell = sun.getObjectByName('UnstableStarref');
        fireball.add(sun);
        
        // Bagliore: due gusci additivi concentrici danno il decadimento morbido che
        // manca alla scena (non c'è bloom). Il guscio del modello è solo 1% più
        // grande del nucleo, quindi da solo non basta a leggere come "fuoco".
        getSunHaloLayers().forEach(function(layer) {
            const halo = new THREE.Mesh(layer.geometry, layer.material);
            (fireball.userData.halos || (fireball.userData.halos = [])).push(halo);
            fireball.add(halo);
        });
        
        // Il sole illumina ciò che gli sta intorno mentre vola (luce dal pool)
        const light = acquireDynamicLight(0xff7a20, 1.2, 16);
        if (light) {
            fireball.userData.light = light;
            fireball.add(light);
        }
    } else {
        // Fallback: la vecchia sfera rossa, se il modello non è ancora caricato
        const fallback = new THREE.Mesh(
            new THREE.SphereGeometry(2.2, 16, 16),
            new THREE.MeshPhongMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 0.8 })
        );
        fireball.userData.fallback = fallback;
        fireball.add(fallback);
    }
    
    // Dati condivisi con updateBossFireballs (solo valori: velocity viene assegnata
    // dal lancio)
    fireball.userData.damage = 10; // Danno pari a un fantasma normale
    fireball.userData.lifetime = 400;
    fireball.userData.radius = 2.4;
    fireball.userData.isFireball = true;
    
    return fireball;
}

function updateBossFireballs() {
    for (let i = bossFireballs.length - 1; i >= 0; i--) {
        const fb = bossFireballs[i];
        fb.position.add(fb.userData.velocity);
        
        // Il sole gira su sé stesso: nucleo e guscio sull'asse verticale, il guscio
        // al doppio della velocità (come la clip originale del modello).
        if (fb.userData.core) fb.userData.core.rotation.z += SUN_SPIN_CORE;
        if (fb.userData.shell) fb.userData.shell.rotation.z += SUN_SPIN_SHELL;
        // Bagliore che respira + luce che tremola
        if (fb.userData.halos) {
            const pulse = 1 + 0.06 * Math.sin(fb.userData.lifetime * 0.22);
            fb.userData.halos.forEach(function(halo) { halo.scale.setScalar(pulse); });
        }
        if (fb.userData.light) {
            fb.userData.light.intensity = 1.2 + 0.25 * Math.sin(fb.userData.lifetime * 0.35);
        } else if (fb.userData.fallback) {
            // Fallback: il vecchio proiettile ruotava su sé stesso
            fb.userData.fallback.rotation.x += 0.1;
            fb.userData.fallback.rotation.y += 0.1;
        }
        fb.userData.lifetime--;
        
        // Colpisce il giocatore
        if (fb.position.distanceTo(camera.position) < fb.userData.radius + 0.6) {
            takeDamage(fb.userData.damage);
            applyBurn(5); // Brucia per 5 secondi
            scene.remove(fb);
            releaseDynamicLight(fb.userData.light);
            bossFireballs.splice(i, 1);
            continue;
        }
        
        // Colpisce il terreno o scade
        if (fb.position.y <= 0.4 || fb.userData.lifetime <= 0) {
            scene.remove(fb);
            releaseDynamicLight(fb.userData.light);
            bossFireballs.splice(i, 1);
            continue;
        }
    }
}

function applyBurn(seconds) {
    player.burnTimer = seconds * 60; // frame (~60 FPS)
}

function updateBurn() {
    const overlay = document.getElementById('burnOverlay');
    if (player.burnTimer > 0) {
        player.burnTimer--;
        if (overlay && overlay.style.opacity !== '1') overlay.style.opacity = '1';
        // Danno da bruciatura ogni secondo (60 frame)
        if (player.burnTimer % 60 === 0) {
            takeDamage(2);
        }
    } else {
        if (overlay && overlay.style.opacity !== '0') overlay.style.opacity = '0';
    }
}

function defeatBoss() {
    if (!bossActive || !boss || boss.dead) return;
    boss.dead = true;
    bossActive = false;
    detachSkeletonModel();
    scene.remove(boss.group);
    bossFireballs.forEach(fb => {
        releaseDynamicLight(fb.userData.light);
        scene.remove(fb);
    });
    bossFireballs = [];
    hideBossHealthBar();
    boss = null;
    kills++;
    gainXP(150);
    playEnemyDeathSound();
    showWaveBanner('BOSS SCONFITTO!');
}

function clearBoss() {
    detachSkeletonModel();
    if (boss && boss.group) scene.remove(boss.group);
    boss = null;
    bossActive = false;
    bossWave = false;
    bossFireballs.forEach(fb => {
        releaseDynamicLight(fb.userData.light);
        scene.remove(fb);
    });
    bossFireballs = [];
    breakingPlatforms.forEach(p => {
        releaseDynamicLight(p.userData && p.userData.light);
        scene.remove(p);
    });
    breakingPlatforms = [];
    player.burnTimer = 0;
    hideBossHealthBar();
}

function showBossHealthBar() {
    const el = document.getElementById('bossHealthBar');
    if (el) el.style.display = 'block';
}

function hideBossHealthBar() {
    const el = document.getElementById('bossHealthBar');
    if (el) el.style.display = 'none';
}

function updateBossHealthBar() {
    const fill = document.getElementById('bossHealthFill');
    if (fill && boss) {
        const pct = Math.max(0, (boss.health / boss.maxHealth) * 100);
        fill.style.width = pct + '%';
    }
}

function breakCentralPlatform() {
    const idx = platforms.findIndex(p => p.userData && p.userData.type === 'central');
    if (idx !== -1) {
        const central = platforms[idx];
        platforms.splice(idx, 1); // non è più calpestabile
        central.userData.breaking = true;
        central.userData.breakVelocity = 0;
        breakingPlatforms.push(central);
        centralPlatformMissing = true;
    }
    // Fa cadere anche il pickup di cura sopra la piattaforma centrale
    for (let i = healthPickups.length - 1; i >= 0; i--) {
        const p = healthPickups[i];
        if (p.userData.type === 'platform' && p.position.x === 0 && Math.abs(p.position.z) < 0.5) {
            healthPickups.splice(i, 1);
            p.userData.breaking = true;
            p.userData.breakVelocity = 0;
            breakingPlatforms.push(p);
        }
    }
}

function updateBreakingPlatforms() {
    for (let i = breakingPlatforms.length - 1; i >= 0; i--) {
        const plat = breakingPlatforms[i];
        plat.userData.breakVelocity -= 0.02;
        plat.position.y += plat.userData.breakVelocity;
        plat.rotation.x += 0.03;
        plat.rotation.z += 0.02;
        if (plat.position.y < -10) {
            releaseDynamicLight(plat.userData && plat.userData.light);
            scene.remove(plat);
            breakingPlatforms.splice(i, 1);
        }
    }
}

function restoreCentralPlatform() {
    if (!centralPlatformMissing) return;
    centralPlatformMissing = false;
    
    // Riusa la texture condivisa invece di ricaricarla (e re-uploadarla in GPU)
    // a ogni ripristino della piattaforma centrale.
    const platformTexture = loadSharedTexture('textures/texture_piattaforme_grigie.jpg', 2, 2);
    const geometry = new THREE.BoxGeometry(8, 0.5, 8);
    const material = new THREE.MeshPhongMaterial({ 
        map: platformTexture,
        color: 0x333333,
        emissive: 0x222222,
        emissiveIntensity: 0.02,
        shininess: 100
    });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(0, 6, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    platform.userData = { isPlatform: true, width: 8, depth: 8, height: 6, type: 'central' };
    scene.add(platform);
    platforms.push(platform);
    
    // Ricrea anche il pickup di cura centrale
    respawnHealthPickup('platform', 1);
}

function setupEventListeners() {
    // Tastiera
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // Ignora i comandi di gioco quando il menu principale è aperto
        if (!gameStarted) return;
        
        // Cheat code detection
        if (e.key.length === 1) {
            cheatSequence += e.key.toLowerCase();
            
            // Resetta il timeout
            clearTimeout(cheatTimeout);
            cheatTimeout = setTimeout(() => {
                cheatSequence = '';
            }, 2000); // 2 secondi per completare la sequenza
            
            // Controlla se il cheat code è stato inserito
            if (cheatSequence.includes(cheatCode)) {
                // Applica il cheat
                player.xp += 1000000; // Aumentato a 1 milione di XP
                
                // Gestisci multipli level up
                while (player.xp >= player.xpForNextLevel) {
                    levelUp();
                }
                
                updateXPDisplay();
                
                // Feedback visivo
                showAbilityMessage('CHEAT ACTIVATED! +1000000 XP', '#ffff00');
                
                // Resetta la sequenza
                cheatSequence = '';
                clearTimeout(cheatTimeout);
            }
            
            // Cheat: fa spawnare istantaneamente il boss
            if (cheatSequence.includes(bossCheatCode)) {
                spawnBoss();
                showAbilityMessage('CHEAT: BOSS SPAWNATO!', '#ff3333');
                cheatSequence = '';
                clearTimeout(cheatTimeout);
            }
        }
        
        // Tasto P per albero abilità
        if (e.key === 'p' || e.key === 'P') {
            const pauseMenu = document.getElementById('pauseMenu');
            if (pauseMenu && pauseMenu.style.display === 'block') return;
            if (abilityTreeOpen) {
                closeAbilityTree();
            } else {
                openAbilityTree();
            }
        }
        
        // Controlli stile Doom
        if (e.key === 'e' || e.key === 'E') {
            if (mouse.locked && gameRunning) {
                player.eKeyPressed = true;
                shoot();
            }
        }
        
        // Cambio arma con 1, 2 e 3
        if (e.key === '1') {
            switchWeapon('pistol');
        } else if (e.key === '2') {
            switchWeapon('machineGun');
        } else if (e.key === '3') {
            switchWeapon('shotgun');
        }
        
        // Ricarica
        if (e.key === 'r' || e.key === 'R') {
            reload();
        }
        
        // Granata
        if (e.key === 'g' || e.key === 'G') {
            throwGrenade();
        }
        
        // Pausa
        if (e.key === 'Escape') {
            togglePause();
        }
        
        // Menu pausa con I
        if (e.key === 'i' || e.key === 'I') {
            if (isPaused) {
                hidePauseMenu();
                isPaused = false;
                if (!mouse.locked) {
                    document.body.requestPointerLock();
                }
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        
        // Resetta flag E quando viene rilasciato
        if (e.key === 'e' || e.key === 'E') {
            player.eKeyPressed = false;
        }
    });
    
    // Mouse wheel per cambio arma
    document.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            // Scroll su - arma precedente
            if (player.currentWeapon === 'shotgun') {
                switchWeapon('machineGun');
            } else if (player.currentWeapon === 'machineGun') {
                switchWeapon('pistol');
            } else {
                switchWeapon('shotgun');
            }
        } else {
            // Scroll giù - arma successiva
            if (player.currentWeapon === 'pistol') {
                switchWeapon('machineGun');
            } else if (player.currentWeapon === 'machineGun') {
                switchWeapon('shotgun');
            } else {
                switchWeapon('pistol');
            }
        }
    });
    
    // Mouse
    document.addEventListener('click', () => {
        if (!mouse.locked && gameRunning && gameStarted && !isPaused) {
            document.getElementById('gameCanvas').requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        mouse.locked = document.pointerLockElement === document.getElementById('gameCanvas');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!mouse.locked) return;
        
        player.rotation.y -= e.movementX * settings.sensitivity;
        player.rotation.x -= e.movementY * settings.sensitivity;
        player.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, player.rotation.x));
        
        camera.rotation.order = 'YXZ';
        camera.rotation.y = player.rotation.y;
        camera.rotation.x = player.rotation.x;
    });
    
    document.addEventListener('mousedown', (e) => {
        if (e.button === 0 && mouse.locked) {
            player.isMouseDown = true;
            shoot();
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            player.isMouseDown = false;
        }
    });
    
    // Restart button
    document.getElementById('restartBtn').addEventListener('click', restart);
    
    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function openAbilityTree() {
    abilityTreeOpen = true;
    const menu = document.getElementById('abilityTreeMenu');
    if (menu) {
        menu.style.display = 'block';
    }
    // Pausa il gioco
    if (!isPaused) {
        isPaused = true;
    }
}

function closeAbilityTree() {
    abilityTreeOpen = false;
    const menu = document.getElementById('abilityTreeMenu');
    if (menu) {
        menu.style.display = 'none';
    }
    // Riprendi il gioco se non è in pausa dal menu principale
    isPaused = false;
}

function togglePause() {
    if (!gameRunning || !gameStarted) return; // Non pausare se il gioco è finito o nel menu
    
    // Non togglare la pausa se il menu impostazioni è aperto
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu && settingsMenu.style.display === 'flex') return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        showPauseMenu();
        // Blocca il puntatore del mouse
        if (mouse.locked) {
            document.exitPointerLock();
        }
    } else {
        hidePauseMenu();
        // Riattiva il puntatore del mouse
        if (!mouse.locked) {
            document.body.requestPointerLock();
        }
    }
}

function showPauseMenu() {
    // Crea il menu di pausa
    pauseMenu = document.createElement('div');
    pauseMenu.id = 'pauseMenu';
    pauseMenu.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(20, 20, 40, 0.95), rgba(40, 40, 80, 0.95));
        border: 3px solid #00ffff;
        border-radius: 15px;
        padding: 30px;
        text-align: center;
        color: white;
        font-family: 'Arial', sans-serif;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        z-index: 1000;
        min-width: 300px;
    `;
    
    // Titolo
    const title = document.createElement('h2');
    title.textContent = 'PAUSA';
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: #00ffff;
        font-size: 32px;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
        letter-spacing: 3px;
    `;
    pauseMenu.appendChild(title);
    
    // Pulsante Ricomincia
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'RICOMINCIA';
    restartBtn.style.cssText = `
        display: block;
        width: 100%;
        padding: 15px;
        margin: 10px 0;
        background: linear-gradient(135deg, #ff4444, #cc0000);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
    `;
    restartBtn.addEventListener('click', restartGame);
    restartBtn.addEventListener('mouseenter', () => {
        restartBtn.style.transform = 'scale(1.05)';
        restartBtn.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.5)';
    });
    restartBtn.addEventListener('mouseleave', () => {
        restartBtn.style.transform = 'scale(1)';
        restartBtn.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.3)';
    });
    pauseMenu.appendChild(restartBtn);
    
    // Pulsante Continua
    const continueBtn = document.createElement('button');
    continueBtn.textContent = 'CONTINUA';
    continueBtn.style.cssText = `
        display: block;
        width: 100%;
        padding: 15px;
        margin: 10px 0;
        background: linear-gradient(135deg, #44ff44, #00cc00);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(68, 255, 68, 0.3);
    `;
    continueBtn.addEventListener('click', () => {
        isPaused = false;
        hidePauseMenu();
        if (!mouse.locked) {
            document.body.requestPointerLock();
        }
    });
    continueBtn.addEventListener('mouseenter', () => {
        continueBtn.style.transform = 'scale(1.05)';
        continueBtn.style.boxShadow = '0 6px 20px rgba(68, 255, 68, 0.5)';
    });
    continueBtn.addEventListener('mouseleave', () => {
        continueBtn.style.transform = 'scale(1)';
        continueBtn.style.boxShadow = '0 4px 15px rgba(68, 255, 68, 0.3)';
    });
    pauseMenu.appendChild(continueBtn);
    
    // Pulsante Impostazioni
    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'IMPOSTAZIONI';
    settingsBtn.style.cssText = `
        display: block;
        width: 100%;
        padding: 15px;
        margin: 10px 0;
        background: linear-gradient(135deg, #4444ff, #0000cc);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(68, 68, 255, 0.3);
    `;
    settingsBtn.addEventListener('click', showSettings);
    settingsBtn.addEventListener('mouseenter', () => {
        settingsBtn.style.transform = 'scale(1.05)';
        settingsBtn.style.boxShadow = '0 6px 20px rgba(68, 68, 255, 0.5)';
    });
    settingsBtn.addEventListener('mouseleave', () => {
        settingsBtn.style.transform = 'scale(1)';
        settingsBtn.style.boxShadow = '0 4px 15px rgba(68, 68, 255, 0.3)';
    });
    pauseMenu.appendChild(settingsBtn);
    
    // Pulsante Menu principale
    const menuBtn = document.createElement('button');
    menuBtn.textContent = 'MENU PRINCIPALE';
    menuBtn.style.cssText = `
        display: block;
        width: 100%;
        padding: 15px;
        margin: 10px 0;
        background: linear-gradient(135deg, #aaaaaa, #666666);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(170, 170, 170, 0.3);
    `;
    menuBtn.addEventListener('click', returnToMainMenu);
    menuBtn.addEventListener('mouseenter', () => {
        menuBtn.style.transform = 'scale(1.05)';
        menuBtn.style.boxShadow = '0 6px 20px rgba(170, 170, 170, 0.5)';
    });
    menuBtn.addEventListener('mouseleave', () => {
        menuBtn.style.transform = 'scale(1)';
        menuBtn.style.boxShadow = '0 4px 15px rgba(170, 170, 170, 0.3)';
    });
    pauseMenu.appendChild(menuBtn);
    
    // Istruzioni
    const instructions = document.createElement('p');
    instructions.textContent = 'Premi I per chiudere il menu';
    instructions.style.cssText = `
        margin: 20px 0 0 0;
        color: #aaaaaa;
        font-size: 14px;
    `;
    pauseMenu.appendChild(instructions);
    
    document.body.appendChild(pauseMenu);
}

function hidePauseMenu() {
    if (pauseMenu) {
        document.body.removeChild(pauseMenu);
        pauseMenu = null;
    }
}

function restartGame() {
    // Nascondi il menu di pausa
    hidePauseMenu();
    
    // Resetta le variabili del giocatore
    player.health = player.maxHealth;
    player.position = { x: 0, y: 1.7, z: 0 };
    player.rotation = { x: 0, y: 0 };
    player.velocityY = 0;
    player.isGrounded = true;
    player.ammo = player.maxAmmo;
    player.machineGunAmmo = player.maxMachineGunAmmo;
    player.shotgunAmmo = player.maxShotgunAmmo;
    player.grenades = 3;
    player.jumpsRemaining = player.maxJumps;
    player.hasDoubleJumped = false;
    player.spacePressed = false;
    player.reloadCooldown = 0;
    player.isReloading = false;
    player.machineGunReloadCooldown = 0;
    player.isMachineGunReloading = false;
    player.shotgunReloadCooldown = 0;
    player.isShotgunReloading = false;
    player.shotgunFireCooldown = 0;
    player.fireRate = 0;
    player.isMouseDown = false;
    player.grenadeCooldown = 0;
    
    // Resetta la posizione della camera
    camera.position.set(player.position.x, player.position.y, player.position.z);
    camera.rotation.set(0, 0, 0);
    
    // Rimuovi tutti i nemici
    enemies.forEach(enemy => scene.remove(enemy));
    platformEnemies.forEach(enemy => scene.remove(enemy));
    enemies = [];
    platformEnemies = [];
    
    // Rimuovi tutti i proiettili
    bullets.forEach(bullet => scene.remove(bullet));
    bullets = [];
    
    // Rimuovi tutte le granate
    grenades.forEach(grenade => scene.remove(grenade));
    grenades = [];
    
    clearBoss();
    restoreCentralPlatform();
    player.burnTimer = 0;
    
    // Resetta i contatori e le ondate
    kills = 0;
    resetWaves();
    startTime = Date.now();
    
    // Resetta la pausa
    isPaused = false;
    gameRunning = true;
    
    // Aggiorna la UI
    updateHealthBar();
    updateAmmoDisplay();
    
    // Resetta i tasti premuti
    keys = {};
    
    // Riattiva il puntatore del mouse
    if (!mouse.locked) {
        document.body.requestPointerLock();
    }
    
    console.log('Gioco riavviato!');
}

function showSettings() {
    openSettings('pause');
}

// ==== MENU PRINCIPALE E IMPOSTAZIONI ====

function loadSettings() {
    try {
        const saved = localStorage.getItem('cod_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (typeof parsed.sensitivity === 'number') settings.sensitivity = parsed.sensitivity;
            if (typeof parsed.masterVolume === 'number') settings.masterVolume = parsed.masterVolume;
        }
    } catch (e) {}
}

function saveSettings() {
    try {
        localStorage.setItem('cod_settings', JSON.stringify(settings));
    } catch (e) {}
}

function showMainMenu() {
    const menu = document.getElementById('mainMenu');
    if (menu) menu.style.display = 'flex';
}

function hideMainMenu() {
    const menu = document.getElementById('mainMenu');
    if (menu) menu.style.display = 'none';
}

function hideSettingsMenu() {
    const menu = document.getElementById('settingsMenu');
    if (menu) menu.style.display = 'none';
}

function startGame() {
    hideMainMenu();
    hideSettingsMenu();
    gameStarted = true;
    isPaused = false;
    gameRunning = true;
    startTime = Date.now();
    
    // Reset completo del giocatore
    player.health = player.maxHealth;
    player.ammo = player.maxAmmo;
    player.machineGunAmmo = player.maxMachineGunAmmo;
    player.shotgunAmmo = player.maxShotgunAmmo;
    player.grenades = player.maxGrenades;
    player.grenadeCooldown = 0;
    player.currentWeapon = 'pistol';
    player.fireRate = 0;
    player.isMouseDown = false;
    player.eKeyPressed = false;
    player.reloadCooldown = 0;
    player.isReloading = false;
    player.machineGunReloadCooldown = 0;
    player.isMachineGunReloading = false;
    player.shotgunReloadCooldown = 0;
    player.isShotgunReloading = false;
    player.shotgunFireCooldown = 0;
    player.jumpsRemaining = player.maxJumps;
    player.hasDoubleJumped = false;
    player.spacePressed = false;
    player.rotation = { x: 0, y: 0 };
    camera.position.set(0, 1.7, 0);
    camera.rotation.set(0, 0, 0);
    player.position = { x: 0, y: 1.7, z: 0 };
    kills = 0;
    
    // Reset abilità attive
    player.abilities.speed.active = false;
    player.abilities.shield.active = false;
    player.abilities.invisibility.active = false;
    player.shieldHealth = 0;
    player.speed = player.baseSpeed;
    
    // Pulisci nemici e proiettili residui
    enemies.forEach(enemy => scene.remove(enemy));
    platformEnemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    grenades.forEach(grenade => scene.remove(grenade));
    enemies = [];
    platformEnemies = [];
    bullets = [];
    grenades = [];
    
    clearBoss();
    restoreCentralPlatform();
    player.burnTimer = 0;
    
    // Mostra la pistola
    gun.visible = true;
    machineGun.visible = false;
    shotgun.visible = false;
    
    resetWaves();
    updateHealthBar();
    updateAmmoDisplay();
    
    if (!mouse.locked) {
        document.getElementById('gameCanvas').requestPointerLock();
    }
}

function openSettings(from) {
    settingsOpenedFrom = from;
    if (from === 'main') hideMainMenu();
    if (from === 'pause') hidePauseMenu();
    
    document.getElementById('sensitivitySlider').value = settings.sensitivity;
    document.getElementById('volumeSlider').value = settings.masterVolume;
    document.getElementById('sensitivityValue').textContent = (settings.sensitivity * 1000).toFixed(1);
    document.getElementById('volumeValue').textContent = Math.round(settings.masterVolume * 100) + '%';
    
    const menu = document.getElementById('settingsMenu');
    if (menu) menu.style.display = 'flex';
}

function closeSettings() {
    hideSettingsMenu();
    saveSettings();
    if (settingsOpenedFrom === 'pause') {
        isPaused = true;
        showPauseMenu();
    } else {
        showMainMenu();
    }
}

function updateSensitivity(value) {
    settings.sensitivity = parseFloat(value);
    document.getElementById('sensitivityValue').textContent = (settings.sensitivity * 1000).toFixed(1);
    saveSettings();
}

function updateVolume(value) {
    settings.masterVolume = parseFloat(value);
    document.getElementById('volumeValue').textContent = Math.round(settings.masterVolume * 100) + '%';
    if (masterGain) masterGain.gain.value = settings.masterVolume;
    saveSettings();
}

function returnToMainMenu() {
    hidePauseMenu();
    isPaused = false;
    gameStarted = false;
    gameRunning = true;
    
    // Pulisci il campo di battaglia
    enemies.forEach(enemy => scene.remove(enemy));
    platformEnemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    grenades.forEach(grenade => scene.remove(grenade));
    enemies = [];
    platformEnemies = [];
    bullets = [];
    grenades = [];
    
    clearBoss();
    restoreCentralPlatform();
    player.burnTimer = 0;
    
    if (mouse.locked) document.exitPointerLock();
    showMainMenu();
}

// ==== FEEDBACK VISIVO DI COMBATTIMENTO ====

function createMuzzleFlash() {
    muzzleFlash = new THREE.Group();
    
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffaa, 
        transparent: true, 
        opacity: 0.95
    });
    
    // Nucleo luminoso del flash
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), flashMaterial);
    muzzleFlash.add(core);
    
    // Raggi a stella nel piano frontale
    const spikeGeometry = new THREE.ConeGeometry(0.05, 0.3, 4);
    const spikes = [
        { x: 0.14, y: 0, rz: -Math.PI / 2 },
        { x: -0.14, y: 0, rz: Math.PI / 2 },
        { x: 0, y: 0.14, rz: 0 },
        { x: 0, y: -0.14, rz: Math.PI }
    ];
    spikes.forEach(s => {
        const spike = new THREE.Mesh(spikeGeometry, flashMaterial);
        spike.position.set(s.x, s.y, 0);
        spike.rotation.z = s.rz;
        muzzleFlash.add(spike);
    });
    
    muzzleFlash.visible = false;
    scene.add(muzzleFlash);
}

function flashMuzzle() {
    if (!muzzleFlash) return;
    muzzleFlash.visible = true;
    
    // Posiziona il flash davanti alla camera, all'altezza del muso
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    
    muzzleFlash.position.copy(camera.position)
        .addScaledVector(dir, 1.0)
        .addScaledVector(right, 0.3)
        .addScaledVector(up, -0.3);
    
    // Orienta il flash verso la camera e aggiunge rotazione casuale
    muzzleFlash.quaternion.copy(camera.quaternion);
    muzzleFlash.rotateZ(Math.random() * Math.PI * 2);
    
    const s = 0.8 + Math.random() * 0.8;
    muzzleFlash.scale.set(s, s, s);
    
    muzzleTimer = 2;
}

function updateMuzzleFlash() {
    if (muzzleTimer > 0) {
        muzzleTimer--;
        if (muzzleTimer === 0 && muzzleFlash) {
            muzzleFlash.visible = false;
        }
    }
}

function applyRecoil(amount) {
    recoil += amount;
    if (recoil > 0.12) recoil = 0.12;
}

function showHitMarker(crit) {
    const marker = document.getElementById('hitMarker');
    if (!marker) return;
    marker.classList.remove('show', 'crit');
    if (crit) marker.classList.add('crit');
    void marker.offsetWidth; // Forza il reflow per riavviare l'animazione
    marker.classList.add('show');
}

function showDamageNumber(worldPosition, damage, crit) {
    const point = worldPosition.clone();
    point.y += 1.2;
    point.project(camera);
    if (point.z > 1) return; // Dietro la camera
    
    const x = (point.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-point.y * 0.5 + 0.5) * window.innerHeight;
    
    const el = document.createElement('div');
    el.className = 'damageNumber' + (crit ? ' crit' : '');
    el.textContent = (crit ? 'CRIT ' : '') + '-' + Math.round(damage);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function flashDamageScreen() {
    const overlay = document.getElementById('damageOverlay');
    if (!overlay) return;
    overlay.classList.remove('flash');
    void overlay.offsetWidth;
    overlay.classList.add('flash');
}

function updateVignette() {
    const vignette = document.getElementById('vignette');
    if (!vignette) return;
    const healthPercent = Math.max(0, player.health / player.maxHealth);
    let opacity = 0;
    if (healthPercent < 0.5) {
        opacity = (0.5 - healthPercent) * 1.6;
    }
    vignette.style.opacity = opacity.toFixed(2);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Non aggiornare la logica di gioco se in pausa o nel menu principale
    if (isPaused || !gameStarted) {
        updateEnvironment(); // Sfondo animato anche nei menu
        renderer.render(scene, camera);
        return;
    }
    
    updatePlayer();
    updateBurn(); // Danno da bruciatura del boss
    updateEnemies();
    updateBullets();
    updateGrenades();
    updateFireParticles(); // Aggiorna particelle di fuoco
    updateHealthPickups();
    updateCrystals();
    updateAbilities();
    updateWaves(); // Sistema a ondate
    updateBoss(); // Logica del boss
    updateBreakingPlatforms(); // Piattaforme che cadono
    updateEnvironment(); // Aggiorna animazioni ambientali
    updateMuzzleFlash(); // Aggiorna flash di volata
    
    renderer.render(scene, camera);
}

function updateEnvironment() {
    // Prima di disegnare il frame, riporta in scena le luci del pool che fossero
    // rimaste orfane: il conteggio delle luci deve restare identico per sempre.
    reconcileDynamicLights();
    // Solo le liste di oggetti animati (niente scene.traverse: costava un giro
    // su tutta la gerarchia della scena a ogni frame, menu compreso).
    for (let i = 0; i < blinkingLights.length; i++) {
        const light = blinkingLights[i];
        light.userData.blinkTimer++;
        if (light.userData.blinkTimer >= light.userData.blinkSpeed) {
            light.intensity = light.intensity > 0 ? 0 : light.userData.baseIntensity;
            light.userData.blinkTimer = 0;
        }
    }
    for (let i = 0; i < spinningMeshes.length; i++) {
        const mesh = spinningMeshes[i];
        mesh.rotation.y += 0.01;
        mesh.rotation.x += 0.005;
    }
}

// --- Schermata di caricamento iniziale ---
(function() {
    const screen = document.getElementById('loadingScreen');
    const bar = document.getElementById('loadingBarFill');
    const text = document.getElementById('loadingText');
    let finished = false;
    const startTime = Date.now();
    const MIN_LOADING_MS = 2000;       // Durata minima della schermata di caricamento
    const FAKE_PROGRESS_MS = 4500;     // tempo in cui la barra finta arriva al 99%

    // Barra volutamente finta: non e' collegata al caricamento reale. Sale con una
    // curva che rallenta e tocca il 99% in FAKE_PROGRESS_MS, poi si ferma li' e non
    // lo supera mai. Se il caricamento finisce prima, scatta al 100%; se finisce
    // dopo, resta ferma al 99% finche' non e' davvero completo.
    let fakePct = 0;

    function setBar(pct) {
        if (bar) bar.style.width = pct.toFixed(1) + '%';
        if (text) text.textContent = 'Caricamento... ' + Math.floor(pct) + '%';
    }

    const progressTimer = setInterval(function() {
        if (finished) return;
        const t = Math.min(1, (Date.now() - startTime) / FAKE_PROGRESS_MS);
        fakePct = 99 * (1 - (1 - t) * (1 - t)); // ease-out: 55% a 2 s, 82% a 3 s, 99% a 4,5 s
        setBar(fakePct);
    }, 80);

    function hideLoadingScreen() {
        if (finished) return;
        finished = true;
        clearInterval(progressTimer);
        if (text) text.textContent = 'Preparazione...';

        // Un attimo di respiro: cosi' il testo qui sopra viene disegnato prima del
        // lavoro pesante che segue, che blocca il thread per qualche istante.
        setTimeout(function() {
            // Porta in GPU tutte le texture e compila tutti gli shader (compresi
            // quelli delle armi nascoste, dei nemici, del boss e del sole): da qui
            // in poi la partita non deve piu' preparare nulla.
            try {
                if (renderer && scene && camera) preloadAssets();
            } catch (e) {
                console.warn('Precaricamento risorse non riuscito:', e);
            }

            // Mantieni lo schermo visibile per un minimo di tempo per evitare flash
            const elapsed = Date.now() - startTime;
            const delay = Math.max(0, MIN_LOADING_MS - elapsed);

            setTimeout(function() {
                setBar(100);
                if (text) text.textContent = 'Pronto!';
                setTimeout(function() {
                    if (screen) screen.classList.add('hidden');
                    setTimeout(function() {
                        if (screen) screen.style.display = 'none';
                    }, 700);
                }, 250);
            }, delay);
        }, 60);
    }

    if (THREE && THREE.DefaultLoadingManager) {
        THREE.DefaultLoadingManager.onStart = function() {
            if (screen) screen.style.display = 'flex';
        };
        // NB: onProgress non guida piu' la barra (volutamente finta), ma resta
        // utile in console per capire a che punto e' il caricamento reale.
        THREE.DefaultLoadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
            if (itemsTotal > 0 && itemsLoaded === itemsTotal) {
                console.log('Risorse caricate: ' + itemsTotal + '/' + itemsTotal);
            }
        };
        THREE.DefaultLoadingManager.onLoad = function() {
            hideLoadingScreen();
        };
        THREE.DefaultLoadingManager.onError = function(url) {
            console.warn('Errore nel caricamento di una risorsa:', url);
        };
    }

    // Rete di sicurezza: evita di restare bloccati sullo schermo di caricamento
    setTimeout(function() {
        if (!finished) {
            console.warn('Timeout caricamento: chiudo forzatamente la schermata.');
            hideLoadingScreen();
        }
    }, 30000);
})();

// Avvia il gioco
init();
