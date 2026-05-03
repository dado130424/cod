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
    skillTree: {
        attack_damage: 0,
        attack_speed: 0,
        attack_explosive: 0,
        defense_shield: 0,
        defense_health: 0,
        defense_regen: 0
    }
};
let gun, machineGun, shotgun, enemies = [], platformEnemies = [], bullets = [], platforms = [], healthPickups = [], grenades = [], crystals = [];
let abilityTreeOpen = false;
let cameraShakeIntensity = 0;
let keys = {};
let mouse = { x: 0, y: 0, locked: false };
let gameRunning = true;
let isPaused = false;
let pauseMenu = null;
let startTime = Date.now();
let enemySpawnTimer = 0;
let enemySpawnInterval = 2000; // Spawn nemici ogni 2 secondi
let audioContext, shootSound, hitSound, ambientSound, grenadeExplosionSound, enemyDeathSound;
let kills = 0; // Contatore uccisioni

// Sistema LOD
const LOD_DISTANCES = {
    near: 15,
    far: 40
};

// Inizializzazione del gioco
function init() {
    // Creazione scena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87ceeb, 30, 120);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(player.position.x, player.position.y, player.position.z);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('gameCanvas'),
        antialias: false,
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
    
    // Crea cielo con nuvole e sole
    createSky();
    
    // Luci migliorate per cielo luminoso
    const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.4);
    scene.add(ambientLight);
    
    // Luce puntuale dinamica
    const pointLight = new THREE.PointLight(0xffaa00, 0.8, 20);
    pointLight.position.set(0, 10, 0);
    pointLight.castShadow = true;
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
    const textureLoader = new THREE.TextureLoader();
    const groundTexture = textureLoader.load('textures/texture_erba.jpg');
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(20, 20);
    
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
    gainNode.connect(audioContext.destination);
    source.start();
}

function playHitSound() {
    if (!audioContext || !hitSound) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = hitSound;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
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
    gainNode.connect(audioContext.destination);
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
    gainNode.connect(audioContext.destination);
    source.start();
}

function playEnemyDeathSound() {
    if (!audioContext || !enemyDeathSound) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = enemyDeathSound;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
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
        
        // Luce pulsante
        const light = new THREE.PointLight(0x00ff00, 0.5, 3);
        light.position.y = 0.5;
        pickupGroup.add(light);
        
        // Posiziona il pickup
        pickupGroup.position.set(pos.x, pos.y, pos.z);
        pickupGroup.userData = {
            isHealthPickup: true,
            healAmount: 50,
            rotationSpeed: 0.02,
            floatOffset: Math.random() * Math.PI * 2,
            type: pos.type
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
        scene.traverse((child) => {
            if (child.userData && child.userData.isColumn) {
                const distance = pickup.position.distanceTo(child.position);
                if (distance < 1.0) { // Raggio di collisione colonne
                    // Calcola la direzione di respinta
                    const pushDirection = pickup.position.clone().sub(child.position).normalize();
                    pushDirection.multiplyScalar(1.0 - distance); // Spingi fuori dalla colonna
                    
                    // Applica la respinta
                    pickup.position.sub(pushDirection);
                }
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
    const maxLevels = {
        attack_damage: 1,
        attack_speed: 1,
        attack_explosive: 1,
        defense_shield: 1,
        defense_health: 2,
        defense_regen: 1
    };
    
    const costs = {
        attack_damage: [1],
        attack_speed: [1],
        attack_explosive: [2],
        defense_shield: [1],
        defense_health: [1, 2],
        defense_regen: [2]
    };
    
    if (!maxLevels.hasOwnProperty(id)) return;
    const currentLevel = player.skillTree[id];
    if (currentLevel >= maxLevels[id]) return;
    
    const cost = costs[id][currentLevel];
    if (player.skillPoints < cost) {
        showAbilityMessage('Punti abilità insufficienti', '#ff6666');
        return;
    }
    
    player.skillPoints -= cost;
    player.skillTree[id]++;
    applySkillAbility(id);
    updateXPDisplay();
    showAbilityMessage('Potenzia acquistato!', '#66ff66');
}

function applySkillAbility(id) {
    switch (id) {
        case 'attack_damage':
            player.attackDamageMultiplier = (player.attackDamageMultiplier || 1) + 0.2;
            break;
        case 'attack_speed':
            player.attackSpeedMultiplier = (player.attackSpeedMultiplier || 1) + 0.15;
            break;
        case 'attack_explosive':
            player.attackExplosive = true;
            break;
        case 'defense_shield':
            player.shieldMax += 25;
            player.shieldHealth += 25;
            break;
        case 'defense_health':
            player.maxHealth += 20;
            player.health += 20;
            break;
        case 'defense_regen':
            player.healthRegen = 0.02;
            break;
    }
}

function refreshAbilityTreeUI() {
    const nodes = [
        'attack_damage', 'attack_speed', 'attack_explosive',
        'defense_shield', 'defense_health', 'defense_regen'
    ];
    nodes.forEach(id => {
        const node = document.getElementById(`node-${id.replace('_', '-')}`);
        if (!node) return;
        const button = node.querySelector('button');
        const purchased = player.skillTree[id];
        if (purchased) {
            node.classList.add('purchased');
            if (button) {
                button.textContent = 'Acquistato';
                button.disabled = true;
            }
        } else {
            node.classList.remove('purchased');
            if (button) {
                button.textContent = 'Acquista';
                button.disabled = player.skillPoints < (id === 'attack_explosive' || id === 'defense_regen' ? 2 : 1);
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
    
    // Luce pulsante
    const light = new THREE.PointLight(0x00ff00, 0.5, 3);
    light.position.y = 0.5;
    pickupGroup.add(light);
    
    // Posiziona il pickup
    pickupGroup.position.set(pos.x, pos.y, pos.z);
    pickupGroup.userData = {
        isHealthPickup: true,
        healAmount: 50,
        rotationSpeed: 0.02,
        floatOffset: Math.random() * Math.PI * 2,
        type: type
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
    gainNode.connect(audioContext.destination);
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
    
    platformPositions.forEach((pos, index) => {
        // Carica texture appropriata per tipo di piattaforma
        const textureLoader = new THREE.TextureLoader();
        let platformTexture;
        
        // Piattaforme grigie (step) usano texture grigia
        if (pos.type === 'step') {
            platformTexture = textureLoader.load('textures/texture_piattaforme_grigie.jpg');
        }
        // Piattaforme di legno (bridge) usano texture di legno
        else if (pos.type === 'bridge') {
            platformTexture = textureLoader.load('textures/texture_piattaforme_marroni_legno.jpg');
        }
        // Tutte le altre piattaforme usano texture grigia di default
        else {
            platformTexture = textureLoader.load('textures/texture_piattaforme_grigie.jpg');
        }
        
        platformTexture.wrapS = THREE.RepeatWrapping;
        platformTexture.wrapT = THREE.RepeatWrapping;
        
        // Imposta repeat appropriato per le dimensioni della piattaforma
        if (pos.type === 'bridge') {
            platformTexture.repeat.set(2, 4); // Per le piattaforme di legno
        } else {
            platformTexture.repeat.set(2, 2); // Per le piattaforme grigie
        }
        
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
    
    // Luce pulsante
    const crystalLight = new THREE.PointLight(color, 0.8, 8);
    crystalLight.position.y = 1;
    crystalGroup.add(crystalLight);
    
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
        floatOffset: Math.random() * Math.PI * 2
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
    
    // Danno normale alla salute
    player.health -= amount;
    updateHealthBar();
    screenshake(0.5, 300); // Screenshake quando viene colpito
    
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
    gainNode.connect(audioContext.destination);
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

function updateEnemyLOD(enemy) {
    const distance = enemy.position.distanceTo(camera.position);
    
    enemy.children.forEach(child => {
        if (child.userData.lodLevel) {
            switch(child.userData.lodLevel) {
                case 'high':
                    child.visible = distance <= LOD_DISTANCES.near;
                    break;
                case 'medium':
                    child.visible = distance > LOD_DISTANCES.near && distance <= LOD_DISTANCES.far;
                    break;
                case 'low':
                    child.visible = distance > LOD_DISTANCES.far;
                    break;
            }
        }
    });
}

function updateLODs() {
    // Aggiorna LOD per tutti i nemici
    enemies.forEach(enemy => {
        if (enemy && enemy.position) {
            updateEnemyLOD(enemy);
        }
    });
    
    // Aggiorna LOD per altri oggetti se necessario
    // Esempio: alberi, rocce, ecc.
    scene.traverse((child) => {
        if (child.userData.lodLevels) {
            const distance = child.position.distanceTo(camera.position);
            child.userData.lodLevels.forEach((lod, index) => {
                if (lod.mesh) {
                    lod.mesh.visible = distance >= lod.minDistance && distance < lod.maxDistance;
                }
            });
        }
    });
}

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
    
    // Luce effettiva
    const antennaLight = new THREE.PointLight(0xFF0000, 1, 10);
    antennaLight.position.y = 8;
    antennaLight.userData = { blinkSpeed: 60 + Math.random() * 60, blinkTimer: 0 };
    antennaGroup.add(antennaLight);
    
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
    // Carica texture del muro in modo sincrono
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('textures/texture_muro.jpg');
    
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(6, 1);
    
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
        
        // Aggiungi la colonna all'array delle piattaforme
        platforms.push(column);
    }
}

function createShotgun() {
    const shotgunGroup = new THREE.Group();
    
    // Corpo del fucile
    const bodyGeometry = new THREE.BoxGeometry(0.35, 0.25, 1.2);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        emissive: 0x4A2C17,
        emissiveIntensity: 0.1,
        shininess: 60,
        specular: 0x333333
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0.3, -0.25, -0.6);
    body.castShadow = false;
    shotgunGroup.add(body);
    
    // Canna del fucile
    const barrelGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.9);
    const barrelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x654321,
        emissive: 0x321F0F,
        emissiveIntensity: 0.2,
        shininess: 100,
        specular: 0x555555
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.3, -0.25, -1.05);
    barrel.castShadow = false;
    shotgunGroup.add(barrel);
    
    // Pompa/azione
    const pumpGeometry = new THREE.BoxGeometry(0.15, 0.35, 0.2);
    const pumpMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4A4A4A,
        emissive: 0x222222,
        emissiveIntensity: 0.1
    });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.position.set(0.3, -0.35, -0.3);
    shotgunGroup.add(pump);
    
    // Impugnatura
    const gripGeometry = new THREE.BoxGeometry(0.18, 0.3, 0.12);
    const gripMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2F2F2F,
        emissive: 0x111111,
        emissiveIntensity: 0.1
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0.3, -0.45, -0.6);
    shotgunGroup.add(grip);
    
    // Guardia del grilletto
    const guardGeometry = new THREE.BoxGeometry(0.25, 0.05, 0.15);
    const guardMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1C1C1C,
        emissive: 0x0A0A0A,
        emissiveIntensity: 0.1
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0.3, -0.5, -0.4);
    shotgunGroup.add(guard);
    
    shotgun = shotgunGroup;
    shotgun.visible = false; // Inizialmente nascosto
    camera.add(shotgun);
}

function createMachineGun() {
    const machineGunGroup = new THREE.Group();
    
    // Corpo della mitragliatrice
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.2, 1.0);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2a2a2a,
        emissive: 0x111111,
        emissiveIntensity: 0.1,
        shininess: 80,
        specular: 0x444444
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0.3, -0.3, -0.5);
    body.castShadow = false;
    machineGunGroup.add(body);
    
    // Canna lunga
    const barrelGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.8);
    const barrelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a,
        emissive: 0x050505,
        emissiveIntensity: 0.2,
        shininess: 150,
        specular: 0x666666
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.3, -0.3, -0.9);
    barrel.castShadow = false;
    machineGunGroup.add(barrel);
    
    // Caricatore
    const magazineGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.4);
    const magazineMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x111111,
        emissive: 0x111111,
        emissiveIntensity: 0.1
    });
    const magazine = new THREE.Mesh(magazineGeometry, magazineMaterial);
    magazine.position.set(0.3, -0.5, -0.2);
    machineGunGroup.add(magazine);
    
    // Impugnatura
    const gripGeometry = new THREE.BoxGeometry(0.2, 0.25, 0.15);
    const gripMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        emissive: 0x111111,
        emissiveIntensity: 0.1
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0.3, -0.45, -0.6);
    machineGunGroup.add(grip);
    
    // Dettagli
    const detailGeometry = new THREE.BoxGeometry(0.45, 0.05, 0.15);
    const detailMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x555555,
        emissive: 0x222222,
        emissiveIntensity: 0.1
    });
    const detail = new THREE.Mesh(detailGeometry, detailMaterial);
    detail.position.set(0.3, -0.25, -0.3);
    machineGunGroup.add(detail);
    
    machineGun = machineGunGroup;
    machineGun.visible = false; // Inizialmente nascosta
    camera.add(machineGun);
}

function createGun() {
    const gunGroup = new THREE.Group();
    
    // Corpo della pistola con materiali migliori
    const gunGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.8);
    const gunMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a,
        emissive: 0x111111,
        emissiveIntensity: 0.1,
        shininess: 100,
        specular: 0x444444
    });
    const gunMesh = new THREE.Mesh(gunGeometry, gunMaterial);
    gunMesh.position.set(0.3, -0.3, -0.5);
    gunMesh.castShadow = false;
    gunGroup.add(gunMesh);
    
    // Canna con dettagli
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
    const barrelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x0a0a0a,
        emissive: 0x050505,
        emissiveIntensity: 0.2,
        shininess: 200,
        specular: 0x666666
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.3, -0.3, -0.8);
    barrel.castShadow = false;
    gunGroup.add(barrel);
    
    // Grilletto migliorato
    const triggerGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.05);
    const triggerMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2a2a2a,
        emissive: 0x151515,
        emissiveIntensity: 0.1,
        shininess: 80
    });
    const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
    trigger.position.set(0.3, -0.4, -0.2);
    gunGroup.add(trigger);
    
    // Dettagli aggiuntivi
    const detailGeometry = new THREE.BoxGeometry(0.35, 0.05, 0.1);
    const detailMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x444444,
        emissive: 0x222222,
        emissiveIntensity: 0.1
    });
    const detail = new THREE.Mesh(detailGeometry, detailMaterial);
    detail.position.set(0.3, -0.25, -0.3);
    gunGroup.add(detail);
    
    gun = gunGroup;
    camera.add(gun);
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
    
    // Luce verde
    const grenadeLight = new THREE.PointLight(0x00ff00, 0.5, 2);
    grenade.add(grenadeLight);
    
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
    
    player.grenadeCooldown = 1200; // 20 secondi a 60 FPS
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
    enemy.children.forEach(child => {
        if (child.material) {
            const originalColor = child.material.color.getHex();
            child.material.color.setHex(0xff0000); // Rosso sangue
            child.material.emissive.setHex(0x660000);
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
        enemy.children.forEach(child => {
            if (child.material) {
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

function createEnemy() {
    const enemyGroup = new THREE.Group();
    
    // Carica il modello FBX del fantasma senza animazioni
    const loader = new THREE.FBXLoader();
    loader.load('models/big_ghost_lite.fbx', function(object) {
        console.log('FBX caricato:', object);
        
        // Rimuovi animazioni se presenti
        object.animations = [];
        
        // Scala il modello per adattarlo al gioco
        object.scale.set(1.0, 1.0, 1.0); // Ridotto del 50% (2.0 * 0.5)
        
        // Posiziona il modello più in basso
        object.position.y = 0.2;
        
        // Applica materiale fantasma grigio/trasparente
        object.traverse(function(child) {
            if (child.isMesh) {
                console.log('Trovato mesh:', child.name);
                
                // Crea materiale fantasma grigio con trasparenza
                child.material = new THREE.MeshPhongMaterial({
                    color: 0x888888, // Grigio medio
                    emissive: 0x222222, // Leggera emissione grigia
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
        
        enemyGroup.add(object);
        console.log('Nemico aggiunto alla scena:', enemyGroup);
        
        // Imposta LOD iniziale
        updateEnemyLOD(enemyGroup);
    }, undefined, function(error) {
        console.error('Errore nel caricamento del modello FBX:', error);
        
        // Fallback: crea un nemico semplice se il modello non carica
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
    });
    
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
    
    // Auto-ricarica quando finiscono i colpi
    if (player.ammo === 0) {
        startReload();
        return;
    }
    
    // Creazione proiettile
    createBullet(15, 0xffff00, 0.08);
    
    // Effetto rinculo
    gun.position.z += 0.1;
    setTimeout(() => {
        gun.position.z -= 0.1;
    }, 50);
}

function shootShotgun() {
    if (player.isShotgunReloading || player.shotgunAmmo <= 0 || player.shotgunFireCooldown > 0) return;
    
    player.shotgunAmmo--;
    player.shotgunFireCooldown = 60; // 1 secondo a 60 FPS
    updateAmmoDisplay();
    
    // Suono sparo
    playShootSound();
    
    // Auto-ricarica quando finiscono i colpi
    if (player.shotgunAmmo === 0) {
        startShotgunReload();
        return;
    }
    
    // Crea 8 pallets con spread a cono
    const spreadAngle = 0.3; // 17 gradi di spread totale
    const numPellets = 8;
    
    console.log('Creating shotgun pellets...');
    
    for (let i = 0; i < numPellets; i++) {
        const angle = (i / (numPellets - 1) - 0.5) * spreadAngle;
        createShotgunPellet(30, 0xffff00, 0.04, angle); // 30 danni = 1 colpo kill
    }
    
    console.log('Total pellets created:', numPellets);
    
    // Effetto rinculo forte
    shotgun.position.z += 0.15;
    shotgun.position.x += (Math.random() - 0.5) * 0.1;
    shotgun.position.y += (Math.random() - 0.5) * 0.08;
    
    // Reset graduale del rinculo
    setTimeout(() => {
        shotgun.position.z = -0.6;
        shotgun.position.x = 0.3;
        shotgun.position.y = -0.25;
    }, 100);
}

function createShotgunPellet(damage, color, size, spreadAngle) {
    const pelletGeometry = new THREE.SphereGeometry(size, 6, 6);
    const pelletMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.6,
        shininess: 150,
        specular: 0xffffff
    });
    const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
    
    // Aggiungi luce piccola ma più visibile
    const pelletLight = new THREE.PointLight(color, 1.0, 5); // Aumentata intensità
    pellet.add(pelletLight);
    
    // Posizione iniziale dalla camera
    pellet.position.copy(camera.position);
    
    // DEBUG: Rendi i pallets più grandi per vederli
    pellet.scale.set(2, 2, 2); // Ingrandisci per debug
    
    // Direzione base dello sparo
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Applica spread orizzontale
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    
    const finalDirection = direction.clone();
    finalDirection.add(right.multiplyScalar(Math.sin(spreadAngle)));
    finalDirection.normalize();
    
    pellet.velocity = finalDirection.multiplyScalar(0.8); // Velocità più alta
    pellet.damage = damage;
    pellet.lifetime = 10; // Gittata cortissima - 10 frame (metà di prima)
    pellet.userData = { isShotgunPellet: true };
    
    console.log('Created shotgun pellet at position:', pellet.position);
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
    
    // Auto-ricarica quando finiscono i colpi
    if (player.machineGunAmmo === 0) {
        startMachineGunReload();
        return;
    }
    
    // Creazione proiettile (metà danno) con spread elevato
    createBulletWithSpread(7.5, 0xff0000, 0.08, 4.5); // 270 gradi di spread totale
    
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
        machineGun.position.x = 0.3;
        machineGun.position.y = -0.3;
        machineGun.position.z = -0.5;
    }, 40);
    
    // Imposta fire rate
    player.fireRate = 6; // 6 frame = ~10 colpi al secondo a 60 FPS
}

function createBullet(damage, color, size) {
    const bulletGeometry = new THREE.SphereGeometry(size, 8, 8);
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        shininess: 200,
        specular: 0xffffff
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Aggiungi luce al proiettile
    const bulletLight = new THREE.PointLight(color, 1, 5);
    bullet.add(bulletLight);
    
    // Posizione iniziale dall'arma corrente
    const weapon = player.currentWeapon === 'pistol' ? gun : machineGun;
    const gunWorldPosition = new THREE.Vector3();
    weapon.getWorldPosition(gunWorldPosition);
    bullet.position.copy(gunWorldPosition);
    
    // Direzione dello sparo
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    bullet.velocity = direction.multiplyScalar(0.5);
    bullet.damage = damage;
    bullet.lifetime = 60;
    
    scene.add(bullet);
    bullets.push(bullet);
}

function createBulletWithSpread(damage, color, size, spreadAngle) {
    const bulletGeometry = new THREE.SphereGeometry(size, 8, 8);
    const bulletMaterial = new THREE.MeshPhongMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        shininess: 200,
        specular: 0xffffff
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Aggiungi luce al proiettile
    const bulletLight = new THREE.PointLight(color, 1, 5);
    bullet.add(bulletLight);
    
    // Posizione iniziale dalla camera
    bullet.position.copy(camera.position);
    
    // Direzione base dello sparo
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    // Sistema di spread molto semplice e diretto
    const spread = spreadAngle * (Math.PI / 180);
    
    // Genera valori casuali per ogni proiettile
    const randomX = (Math.random() - 0.5) * spread * 2;
    const randomY = (Math.random() - 0.5) * spread * 2;
    
    // Crea vettori per lo spread
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    
    // Allinea i vettori con la camera
    right.applyQuaternion(camera.quaternion);
    up.applyQuaternion(camera.quaternion);
    
    // Calcola la direzione finale modificando direttamente la direzione
    const finalDirection = direction.clone();
    
    // Applica lo spread in modo diretto
    finalDirection.x += right.x * randomX + up.x * randomY;
    finalDirection.y += right.y * randomX + up.y * randomY;
    finalDirection.z += right.z * randomX + up.z * randomY;
    
    // Normalizza la direzione
    finalDirection.normalize();
    
    bullet.velocity = finalDirection.multiplyScalar(0.5);
    bullet.damage = damage;
    bullet.lifetime = 60;
    
    // Debug: aggiungi un colore leggermente diverso per vedere se funziona
    if (Math.random() < 0.3) { // 30% dei proiettili con colore diverso per debug
        bullet.material.color.setHex(0x00ff00); // Verde brillante
        bulletLight.color.setHex(0x00ff00);
    }
    
    scene.add(bullet);
    bullets.push(bullet);
}

function startReload() {
    if (player.isReloading) return;
    
    player.isReloading = true;
    player.reloadCooldown = 120; // 2 secondi a 60 FPS
    updateAmmoDisplay();
}

function startMachineGunReload() {
    if (player.isMachineGunReloading) return;
    
    player.isMachineGunReloading = true;
    player.machineGunReloadCooldown = 360; // 6 secondi a 60 FPS
    updateAmmoDisplay();
}

function startShotgunReload() {
    if (player.isShotgunReloading) return;
    
    player.isShotgunReloading = true;
    player.shotgunReloadCooldown = 180; // 3 secondi a 60 FPS
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
    if (player.isReloading) {
        reloadBar.style.display = 'block';
        player.reloadCooldown--;
        
        const progress = 1 - (player.reloadCooldown / 120);
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
        
        const progress = 1 - (player.machineGunReloadCooldown / 360);
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
        
        const progress = 1 - (player.shotgunReloadCooldown / 180);
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
        player.health = Math.min(player.maxHealth, player.health + player.healthRegen);
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
            player.velocityY = player.jumpSpeed;
            player.isGrounded = false;
            player.currentPlatform = null;
            player.jumpsRemaining = 1; // Rimane un salto
            player.hasDoubleJumped = false;
        } else if (!player.hasDoubleJumped && player.jumpsRemaining > 0) {
            // Secondo salto (doppio salto) più potente
            player.velocityY = player.doubleJumpSpeed;
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
    if (keys['w'] || keys['W']) moveVector.z -= player.speed;
    if (keys['s'] || keys['S']) moveVector.z += player.speed;
    if (keys['a'] || keys['A']) moveVector.x -= player.speed;
    if (keys['d'] || keys['D']) moveVector.x += player.speed;
    
    // Controlli stile Doom (frecce)
    // Freccia su/giù per movimento avanti/indietro
    if (keys['ArrowUp']) moveVector.z -= player.speed;
    if (keys['ArrowDown']) moveVector.z += player.speed;
    
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
    scene.traverse((child) => {
        if (child.userData && child.userData.isColumn) {
            const distance = newPosition.distanceTo(child.position);
            if (distance < 1.0) { // Raggio di collisione colonne
                // Calcola la direzione di respinta
                const pushDirection = newPosition.clone().sub(child.position).normalize();
                pushDirection.multiplyScalar(1.0 - distance); // Spingi fuori dalla colonna
                
                // Applica la respinta
                newPosition.sub(pushDirection);
            }
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
    player.position.z = camera.position.z;
    
    // Limiti del mondo
    const boundary = 24;
    camera.position.x = Math.max(-boundary, Math.min(boundary, camera.position.x));
    camera.position.z = Math.max(-boundary, Math.min(boundary, camera.position.z));
    
    // Aggiorna ricarica
    updateReload();
}

function updateEnemies() {
    if (!gameRunning) return;
    
    // Aggiorna nemici normali
    enemies.forEach((enemy, index) => {
        updateRegularEnemy(enemy, index, enemies);
    });
    
    // Aggiorna nemici solo piattaforma
    platformEnemies.forEach((enemy, index) => {
        updatePlatformOnlyEnemy(enemy, index, platformEnemies);
    });
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
    
    // Rimuovi granata
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
    
    // Luce esplosione
    const explosionLight = new THREE.PointLight(0xff6600, 2, 10);
    explosionLight.position.copy(grenade.position);
    scene.add(explosionLight);
    
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
    
    // Rimuovi esplosione dopo un po'
    setTimeout(() => {
        scene.remove(explosion);
        scene.remove(explosionLight);
    }, 200);
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.velocity);
        bullet.lifetime--;
        
        // Controlla collisioni con colonne (solo per bloccare i proiettili)
        let columnHit = false;
        scene.traverse((child) => {
            if (child.userData && child.userData.isColumn && !columnHit) {
                const distance = bullet.position.distanceTo(child.position);
                if (distance < 1.0) { // Raggio di collisione colonne
                    // Rimuovi proiettile
                    scene.remove(bullet);
                    bullets.splice(i, 1);
                    columnHit = true;
                }
            }
        });
        
        if (columnHit) continue; // Salta al prossimo proiettile se ha colpito una colonna
        
        // Controlla collisioni con nemici normali
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distance = bullet.position.distanceTo(enemy.position);
            
            if (distance < 2.5) { // Aumentato da 1.8 a 2.5 per colpire anche la testa alta
                // Per i pallets del fucile, applica danno solo una volta per nemico per frame
                if (bullet.userData && bullet.userData.isShotgunPellet) {
                    if (!enemy.hitThisFrame) {
                        enemy.health -= bullet.damage;
                        enemy.hitThisFrame = true; // Impedisce danni multipli nello stesso frame
                    }
                } else {
                    enemy.health -= bullet.damage;
                }
                
                // Suono colpo
                playHitSound();
                
                // Rimuovi proiettile
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                // Controlla se nemico è morto
                if (enemy.health <= 0) {
                    playEnemyDeathSound();
                    scene.remove(enemy);
                    enemies.splice(j, 1);
                    kills++; // Incrementa uccisioni
                    gainXP(25); // Guadagna 25 XP per ogni nemico ucciso
                }
                break;
            }
        }
        
        // Controlla collisioni con nemici solo piattaforma
        for (let j = platformEnemies.length - 1; j >= 0; j--) {
            const enemy = platformEnemies[j];
            const distance = bullet.position.distanceTo(enemy.position);
            
            if (distance < 2.2) { // Aumentato da 1.5 a 2.2 per colpire anche la testa alta
                // Per i pallets del fucile, applica danno solo una volta per nemico per frame
                if (bullet.userData && bullet.userData.isShotgunPellet) {
                    if (!enemy.hitThisFrame) {
                        enemy.health -= bullet.damage;
                        enemy.hitThisFrame = true; // Impedisce danni multipli nello stesso frame
                    }
                } else {
                    enemy.health -= bullet.damage;
                }
                
                // Suono colpo
                playHitSound();
                
                // Rimuovi proiettile
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                // Controlla se nemico è morto
                if (enemy.health <= 0) {
                    playEnemyDeathSound();
                    scene.remove(enemy);
                    platformEnemies.splice(j, 1);
                    kills++; // Incrementa uccisioni
                    gainXP(25); // Guadagna 25 XP per ogni nemico ucciso
                }
                break;
            }
        }
        
        // Rimuovi proiettili scaduti
        if (bullet.lifetime <= 0 && bullets.includes(bullet)) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

function updateHealthBar() {
    const healthPercent = Math.max(0, player.health / player.maxHealth * 100);
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = `${Math.max(0, player.health)}/${player.maxHealth}`;
    
    // Cambia colore della barra della salute in base alla salute
    const healthFill = document.getElementById('healthFill');
    if (healthPercent > 60) {
        healthFill.style.background = 'linear-gradient(90deg, #00ff00, #66ff66, #99ff99)';
    } else if (healthPercent > 30) {
        healthFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc66, #ffdd99)';
    } else {
        healthFill.style.background = 'linear-gradient(90deg, #ff0000, #ff6666, #ff9999)';
    }
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
    healthPickups.forEach(pickup => scene.remove(pickup));
    grenades.forEach(grenade => scene.remove(grenade));
    enemies = [];
    platformEnemies = [];
    bullets = [];
    healthPickups = [];
    grenades = [];
    
    // Reset UI
    updateHealthBar();
    updateAmmoDisplay();
    document.getElementById('gameOver').style.display = 'none';
    
    // Reset armi
    gun.visible = true;
    machineGun.visible = false;
    shotgun.visible = false;
    
    // Reset timer
    startTime = Date.now();
    enemySpawnTimer = 0;
    
    gameRunning = true;
}

function spawnEnemies() {
    if (!gameRunning) return;
    
    enemySpawnTimer += 16; // ~60 FPS
    
    if (enemySpawnTimer >= enemySpawnInterval) {
        createEnemy();
        enemySpawnTimer = 0;
        
        // Aumenta difficoltà nel tempo
        if (enemySpawnInterval > 500) {
            enemySpawnInterval -= 50;
        }
    }
}

function setupEventListeners() {
    // Tastiera
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
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
        if (!mouse.locked && gameRunning) {
            document.getElementById('gameCanvas').requestPointerLock();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        mouse.locked = document.pointerLockElement === document.getElementById('gameCanvas');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!mouse.locked) return;
        
        player.rotation.y -= e.movementX * 0.002;
        player.rotation.x -= e.movementY * 0.002;
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
    
    // Tasto P per aprire albero delle abilità
    document.addEventListener('keydown', (e) => {
        if (e.key === 'p' || e.key === 'P') {
            const pauseMenu = document.getElementById('pauseMenu');
            if (pauseMenu && pauseMenu.style.display === 'block') return;
            if (abilityTreeOpen) {
                closeAbilityTree();
            } else {
                openAbilityTree();
            }
        }
    });
    
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
    if (!gameRunning) return; // Non pausare se il gioco è finito
    
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
    
    // Resetta i contatori
    kills = 0;
    enemySpawnTimer = 0;
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
    // Placeholder per le impostazioni
    alert('Impostazioni - Funzionalità in arrivo!');
}

function animate() {
    requestAnimationFrame(animate);
    
    // Se il gioco è in pausa, non aggiornare la logica di gioco
    if (isPaused) {
        renderer.render(scene, camera);
        return;
    }
    
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateGrenades();
    updateHealthPickups();
    updateCrystals();
    updateAbilities();
    updateLODs();
    spawnEnemies();
    updateEnvironment(); // Aggiorna animazioni ambientali
    
    renderer.render(scene, camera);
}

function updateEnvironment() {
    // Animazione luci antenne
    scene.traverse((child) => {
        if (child.isPointLight && child.userData.blinkSpeed) {
            child.userData.blinkTimer++;
            if (child.userData.blinkTimer >= child.userData.blinkSpeed) {
                child.visible = !child.visible;
                child.userData.blinkTimer = 0;
            }
        }
    });
    
    // Animazione cristalli
    scene.traverse((child) => {
        if (child.parent && child.parent.children.includes(child) && 
            child.geometry && child.geometry.type === 'OctahedronGeometry') {
            child.rotation.y += 0.01;
            child.rotation.x += 0.005;
        }
    });
}

// Avvia il gioco
init();
