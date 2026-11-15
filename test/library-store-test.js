/* 主进程语料存储回归：验证分片目录按库隔离、默认库路径兼容、装配无损。 */
'use strict';
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const store = require('../electron/corpus-store');

function mkCorpus(tag, n) {
  return {
    formatVersion: 2,
    settings: {},
    maps: [],
    cards: Array.from({ length: n }, function (_, i) { return { id: tag + i, title: tag + i }; })
  };
}

(async function () {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-library-'));
  try {
    const defDir = path.join(tmp, 'default');
    const libDir = path.join(tmp, 'libraries', 'lib2');
    const a = path.join(defDir, 'corpus.json');
    const b = path.join(libDir, 'corpus.json');
    await fs.mkdir(defDir, { recursive: true });
    await fs.mkdir(libDir, { recursive: true });

    /* 两个库都超过分片阈值，分片文件必须落在各自目录内 */
    await store.save(tmp, a, mkCorpus('A', 2100));
    await store.save(tmp, b, mkCorpus('B', 2100));

    const shardsA = path.join(defDir, 'corpus-shards');
    const shardsB = path.join(libDir, 'corpus-shards');
    assert.ok((await fs.readdir(shardsA)).length >= 2, 'A 应有分片');
    assert.ok((await fs.readdir(shardsB)).length >= 2, 'B 应有分片');
    assert.equal((await fs.readdir(tmp)).indexOf('corpus-shards'), -1, '不应再产生全局共享分片目录');

    const ra = await store.load(tmp, a);
    const rb = await store.load(tmp, b);
    assert.equal(ra.cards.length, 2100, 'A 卡片数');
    assert.equal(rb.cards.length, 2100, 'B 卡片数');
    assert.equal(ra.cards[0].id, 'A0', 'A 首卡');
    assert.equal(rb.cards[0].id, 'B0', 'B 不能被 A 覆盖');
    assert.equal(rb.cards[2099].id, 'B2099', 'B 尾卡完整');

    /* 默认库：corpus.json 位于根目录时，分片目录仍是 <root>/corpus-shards */
    const rootCorpus = path.join(tmp, 'corpus.json');
    await store.save(tmp, rootCorpus, mkCorpus('R', 2100));
    assert.ok((await fs.readdir(path.join(tmp, 'corpus-shards'))).length >= 2, '默认库分片目录');
    const rr = await store.load(tmp, rootCorpus);
    assert.equal(rr.cards.length, 2100, '默认库装配');
    assert.equal(rr.cards[0].id, 'R0', '默认库首卡');

    /* 小库仍写单文件，且 assembled 与 load 等价 */
    const small = path.join(tmp, 'small', 'corpus.json');
    await store.save(tmp, small, mkCorpus('S', 3));
    assert.equal((await store.assembled(tmp, small)).cards.length, 3, '小库单文件');

    store.forget(a);
    store.forget(b);

    console.log('library-store: OK (分片按库隔离 / 默认库路径兼容 / 装配无损)');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
