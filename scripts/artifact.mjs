// Gera dist/artifact.html: o build sem o esqueleto <html>/<head>/<body>,
// que o Artifact adiciona sozinho na publicação.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8')
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta [^>]*>/gi, '')
  .trim();
writeFileSync('dist/artifact.html', html + '\n');
