'use strict';

/**
 * Sharded on-disk corpus store.
 *
 * Small corpora stay in one readable corpus.json (unchanged format, so
 * backups / restore / reveal keep working). Large corpora are split:
 *   corpus.json            -> metadata manifest + __shards listing
 *   corpus-shards/cards-N  -> at most SHARD_SIZE cards each
 *
 * Only shards whose content actually changed are rewritten, so a single
 * card edit on a million-card corpus touches one small file instead of the
 * whole thing. load() assembles the full corpus again for the renderer.
 */
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');

const SHARD_SIZE = 2000;
const PREFIX = 'cards-';
const lastHashes = new Map();   /* corpusPath -> Map(file -> hash) */

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { return null; }
}

async function writeJsonAtomic(file, obj) {
  const tmp = file + '.tmp';
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(obj), 'utf8');
  await fs.rename(tmp, file);
}

function shardDir(corpusPath) { return path.join(path.dirname(corpusPath), 'corpus-shards'); }

async function exists(file) {
  try { await fs.stat(file); return true; } catch (e) { return false; }
}

/* Read a corpus; transparently assemble sharded ones. */
async function load(userDir, corpusPath) {
  const raw = await readJson(corpusPath);
  if (!raw) return null;
  if (!Array.isArray(raw.__shards)) return raw;

  const dir = shardDir(corpusPath);
  const cards = [];
  for (const s of raw.__shards) {
    const part = await readJson(path.join(dir, s.file));
    if (Array.isArray(part)) cards.push.apply(cards, part);
  }
  const out = Object.assign({}, raw, { cards: cards });
  delete out.__shards;
  return out;
}

/* True when a corpus is stored as shards. */
async function isSharded(corpusPath) {
  const raw = await readJson(corpusPath);
  return !!(raw && Array.isArray(raw.__shards));
}

async function save(userDir, corpusPath, db) {
  const cards = Array.isArray(db && db.cards) ? db.cards : [];
  if (cards.length <= SHARD_SIZE) {
    await writeJsonAtomic(corpusPath, db);
    lastHashes.delete(corpusPath);
    return { ok: true, sharded: false, shards: 0, cards: cards.length };
  }

  const dir = shardDir(corpusPath);
  await fs.mkdir(dir, { recursive: true });
  let hashes = lastHashes.get(corpusPath);
  if (!hashes) { hashes = new Map(); lastHashes.set(corpusPath, hashes); }

  const shards = [];
  const keep = {};
  let written = 0;
  for (let i = 0, n = 0; i < cards.length; i += SHARD_SIZE, n++) {
    const chunk = cards.slice(i, i + SHARD_SIZE);
    const text = JSON.stringify(chunk);
    const hash = crypto.createHash('sha1').update(text).digest('hex');
    const file = PREFIX + String(n).padStart(5, '0') + '.json';
    const dest = path.join(dir, file);
    if (hashes.get(file) !== hash || !(await exists(dest))) {
      await writeJsonAtomic(dest, chunk);
      written++;
    }
    hashes.set(file, hash);
    keep[file] = 1;
    shards.push({ file: file, count: chunk.length, hash: hash });
  }

  /* drop shards left over from a previously larger corpus */
  let removed = 0;
  const files = await fs.readdir(dir).catch(() => []);
  for (const f of files) {
    if (f.indexOf(PREFIX) !== 0 || !/\.json$/.test(f) || keep[f]) continue;
    await fs.rm(path.join(dir, f), { force: true });
    hashes.delete(f);
    removed++;
  }

  const manifest = Object.assign({}, db);
  delete manifest.cards;
  manifest.__shards = shards;
  await writeJsonAtomic(corpusPath, manifest);
  return { ok: true, sharded: true, shards: shards.length, written: written, removed: removed, cards: cards.length };
}

/* Full assembled corpus, used by auto-backup so restore stays lossless. */
async function assembled(userDir, corpusPath) { return load(userDir, corpusPath); }

function forget(corpusPath) { lastHashes.delete(corpusPath); }

module.exports = { load, save, isSharded, assembled, forget, SHARD_SIZE };
