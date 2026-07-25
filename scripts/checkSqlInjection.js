/**
 * Escaneo estático anti SQL injection en src/.
 * Falla si detecta patrones peligrosos (concatenación de input en SQL).
 *
 * Uso: npm run test:sqli
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const DANGEROUS = [
  {
    name: 'LIMIT/OFFSET interpolado (usar ?)',
    re: /LIMIT\s*\$\{|OFFSET\s*\$\{/i
  },
  {
    name: 'Concatenación + con SQL sospechosa',
    re: /\.query\s*\(\s*[^,)]*\+/
  },
  {
    name: 'query con template + req./query./body./params.',
    re: /\.query\s*\(\s*`[^`]*\$\{[^}]*(?:req\.|query\.|body\.|params\.)[^}]*\}/
  }
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

const files = walk(SRC);
let failed = 0;

for (const file of files) {
  const rel = path.relative(path.join(__dirname, '..'), file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes('eslint-disable') || line.includes('sql-safe-ok')) continue;
    for (const rule of DANGEROUS) {
      if (rule.re.test(line)) {
        console.error(`FAIL  ${rel}:${i + 1} — ${rule.name}`);
        console.error(`      ${line.trim()}`);
        failed += 1;
      }
    }
  }
}

if (failed) {
  console.error(`\n${failed} hallazgo(s) de riesgo SQL. Corrija antes de desplegar.`);
  process.exit(1);
}

console.log(`OK  Escaneo SQL injection: ${files.length} archivos sin patrones peligrosos.`);
