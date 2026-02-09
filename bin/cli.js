#!/usr/bin/env node
// cli: inicializa conexion y base de datos
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

// muestra ayuda cuando no hay comando valido
if (!command || command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

if (command !== 'init') {
  console.error(`Comando no reconocido: ${command}`);
  printHelp();
  process.exit(1);
}

const isWin = process.platform === 'win32';
const checkCmd = (cmd) => {
  // valida si un comando existe en path
  const checker = isWin ? 'where' : 'which';
  const res = spawnSync(checker, [cmd], { stdio: 'ignore' });
  return res.status === 0;
};

if (!checkCmd('psql') || !checkCmd('pg_restore')) {
  console.error('PostgreSQL no esta instalado o no esta en PATH.');
  console.error('Se requieren los comandos `psql` y `pg_restore` para inicializar la base de datos.');
  console.error('Esta instalacion iba a crear una base de datos y restaurar `backup/orm-db.sql`.');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, fallback) {
  return new Promise((resolve) => {
    rl.question(`${question}${fallback ? ` (${fallback})` : ''}: `, (answer) => {
      const trimmed = String(answer || '').trim();
      resolve(trimmed || fallback || '');
    });
  });
}

async function main() {
  // recopila la configuracion minima de postgres
  const host = await ask('Host de PostgreSQL', 'localhost');
  const portRaw = await ask('Puerto', '5432');
  const port = Number(portRaw) || 5432;
  const user = await ask('Usuario', 'postgres');
  const password = await ask('Contrasena', '');
  const dbname = await ask('Nombre de la base', 'orm-db');

  const initDbAnswer = await ask('Quieres inicializar la base por primera vez? (s/n)', 'n');
  const shouldInitDb = initDbAnswer.toLowerCase() === 's';

  if (shouldInitDb) {
    console.log('\nSe realizara lo siguiente:');
    console.log(`- Crear la base de datos: ${dbname} (si no existe)`);
    console.log('- Restaurar el esquema base desde backup/orm-db.sql');
  } else {
    console.log('\nSe omitira la creacion/restauracion de la base de datos.');
  }

  const confirm = await ask('Deseas continuar? (s/n)', 's');
  if (confirm.toLowerCase() !== 's') {
    rl.close();
    process.exit(0);
  }

  const env = { ...process.env, PGPASSWORD: password };

  // verifica si la base indicada existe
  const existsCheck = spawnSync('psql', ['-h', host, '-p', String(port), '-U', user, '-d', 'postgres', '-tAc', `SELECT 1 FROM pg_database WHERE datname='${dbname}'`], { env, encoding: 'utf8' });
  if (existsCheck.status !== 0) {
    console.error('No se pudo validar la existencia de la base de datos.');
    console.error(existsCheck.stderr || existsCheck.stdout);
    rl.close();
    process.exit(1);
  }

  const exists = String(existsCheck.stdout || '').trim() === '1';
  if (shouldInitDb) {
    if (!exists) {
      const createDb = spawnSync('psql', ['-h', host, '-p', String(port), '-U', user, '-d', 'postgres', '-c', `CREATE DATABASE \"${dbname}\"`], { env, stdio: 'inherit' });
      if (createDb.status !== 0) {
        console.error('No se pudo crear la base de datos.');
        rl.close();
        process.exit(1);
      }
    } else {
      console.log(`La base ${dbname} ya existe. Se intentara restaurar igualmente.`);
    }
  } else if (!exists) {
    console.error(`La base ${dbname} no existe y elegiste no inicializarla.`);
    rl.close();
    process.exit(1);
  }

  const backupPath = path.join(__dirname, '..', 'backup', 'orm-db.sql');
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup no encontrado: ${backupPath}`);
    rl.close();
    process.exit(1);
  }

  if (shouldInitDb) {
    const restore = spawnSync('pg_restore', ['-h', host, '-p', String(port), '-U', user, '-d', dbname, backupPath], { env, stdio: 'inherit' });
    if (restore.status !== 0) {
      console.error('Fallo la restauracion de la base de datos.');
      rl.close();
      process.exit(1);
    }
  }

  const configPath = path.join(__dirname, '..', 'configs', 'connections.json');
  // guarda la conexion para que el servidor use estos datos
  const configData = {
    config: [
      {
        host,
        database: dbname,
        user,
        password,
        port
      }
    ]
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
  console.log(`Conexion guardada en ${configPath}`);
  console.log('Listo. Ejecuta `npm run start` para levantar el servidor.');
  rl.close();
}

function printHelp() {
  console.log('Uso: express-orm-backend init');
  console.log('Inicializa la base de datos y genera configs/connections.json');
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  rl.close();
  process.exit(1);
});
