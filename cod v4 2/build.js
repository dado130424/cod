#!/usr/bin/env node
// Script di build: sincronizza i file sorgente in dist/ e compila l'exe con Tauri.
//
// Uso:
//   node build.js              -> sincronizza + compila l'exe
//   node build.js --sync-only  -> solo sincronizzazione (utile per testare nel browser)

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = __dirname;
const onlySync = process.argv.includes('--sync-only');

// File e cartelle che Tauri incorpora nell'exe (copiati in dist/)
const ITEMS = ['index.html', 'game.js', 'libs', 'models', 'textures'];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function sync() {
  const dist = path.join(root, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  console.log('Sincronizzo i file sorgente in dist/ ...');
  for (const item of ITEMS) {
    const src = path.join(root, item);
    const dst = path.join(dist, item);
    if (!fs.existsSync(src)) {
      console.log('  ! mancante (saltato): ' + item);
      continue;
    }
    copyRecursive(src, dst);
    console.log('  ok ' + item);
  }
  console.log('Sync completato.');
}

sync();

if (onlySync) {
  console.log('\n(Solo sync: compilazione saltata.)');
  process.exit(0);
}

// Assicura che cargo sia nel PATH (rustup lo installa in ~/.cargo/bin)
const cargoBin = path.join(os.homedir(), '.cargo', 'bin');
const sep = process.platform === 'win32' ? ';' : ':';
const env = { ...process.env, PATH: cargoBin + sep + (process.env.PATH || '') };

console.log('\nAvvio la compilazione Tauri (la prima volta può richiedere minuti)...\n');
const result = spawnSync('npx', ['tauri', 'build'], {
  stdio: 'inherit',
  cwd: root,
  env,
  shell: process.platform === 'win32',
});

process.exit(result.status === null ? 1 : result.status);
