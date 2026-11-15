/* Sample corpus for the demo button */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util, S = CC.store;
  var t = function () { return window.t.apply(null, arguments); };

  function load() {
    S.createSnapshot(t('common.import') + ' · demo', true, true);
    var mapA, mapB, nodes;

    S.commit('import', t('demo.name'), function () {
      var defs = [
        { title: '笔记方法', body: '同一份资料可以有多种记法，重点是资料本身，而不是某一种图。', tags: ['方法'], langs: ['中文', 'English'], note: '这是示例卡片，可自由修改或删除。', key: 'root' },
        { title: '卡片盒笔记', body: '一张卡片一个想法，卡片之间用链接连起来。', tags: ['卡片', '方法'], langs: ['中文'], key: 'a' },
        { title: '康奈尔笔记', body: '页面分三栏：线索、笔记、总结。', tags: ['纸笔'], langs: ['中文'], key: 'b' },
        { title: '大纲笔记', body: '用缩进表达层次，适合结构清楚的资料。', tags: ['结构'], langs: ['中文'], key: 'c' },
        { title: '思维导图', body: '把层次画成图，适合整体把握。', tags: ['绘图'], langs: ['中文', '日本語'], key: 'd' },
        { title: 'Zettelkasten', body: '德语，卡片盒方法的源头概念。', tags: ['卡片'], langs: ['Deutsch', 'English'], note: '与「卡片盒笔记」同义。', key: 'e' },
        { title: '间隔重复', body: '在快要遗忘时复习，效率最高。', tags: ['记忆'], langs: ['中文'], key: 'f', map: 'B' },
        { title: '遗忘曲线', body: '艾宾浩斯描述的记忆衰减曲线。', tags: ['记忆'], langs: ['中文'], key: 'g', map: 'B' },
        { title: '主动回忆', body: '先回想再看答案，比重复阅读有效。', tags: ['记忆'], langs: ['中文'], key: 'h', map: 'B' },
        { title: '交错练习', body: '把不同类型的问题混着练。', tags: ['练习'], langs: ['中文'], note: '', key: 'i', map: 'B' }
      ];
      var made = {};
      defs.forEach(function (d) {
        var c = S.newCard({
          title: d.title,
          body: d.body,
          note: d.note || '',
          tags: d.tags,
          langs: d.langs,
          sources: [{ kind: 'note', ref: '示例笔记', at: Date.now() }]
        }, true);
        made[d.key] = c.id;
      });

      mapA = S.newMap(t('demo.mapA'), { silent: true });
      mapB = S.newMap(t('demo.mapB'), { structure: 'free', silent: true });

      function link(m, from, to, type, label, uncertain) {
        m.edges.push({ id: U.uid('e'), from: made[from], to: made[to], type: type, color: '', label: label || '', uncertain: !!uncertain });
      }
      link(mapA, 'root', 'a', 'hierarchy');
      link(mapA, 'root', 'b', 'hierarchy');
      link(mapA, 'root', 'c', 'hierarchy');
      link(mapA, 'root', 'd', 'hierarchy');
      link(mapA, 'a', 'e', 'hierarchy', '同义');
      link(mapA, 'c', 'd', 'contrast', '结构 vs 图');
      link(mapA, 'a', 'd', 'reference', '', false);
      link(mapA, 'b', 'c', 'cause', '整理后更清楚', true);

      link(mapB, 'g', 'f', 'cause', '据此安排复习');
      link(mapB, 'f', 'h', 'example', '');
      link(mapB, 'h', 'i', 'contrast', '', true);
      link(mapB, 'g', 'h', 'reference', '');

      ['f', 'g', 'h', 'i'].forEach(function (k, i) {
        mapB.positions[made[k]] = { x: (i % 2) * 300, y: Math.floor(i / 2) * 150 };
      });

      mapA.updatedAt = Date.now();
      mapB.updatedAt = Date.now();
      S.settings().lastMapId = mapA.id;
      S.state().meta.sample = true;
      S.state().reviews.unshift({
        id: U.uid('r'), at: Date.now(), mapId: mapA.id, scope: 'map',
        items: [
          { id: U.uid('i'), cardId: made.b, edgeId: null, location: '康奈尔笔记', problem: '示例批注：这一条与「大纲笔记」的分工还不够清楚。', suggestion: '可补一句：康奈尔偏纸笔版面，大纲偏结构。', confidence: 'high', status: 'pending' },
          { id: U.uid('i'), cardId: made.d, edgeId: null, location: '思维导图', problem: '示例批注：缺少出现场景。', suggestion: '补一个使用场景的附注。', confidence: 'low', status: 'pending' }
        ]
      });
    }, { snapshot: false });

    U.toast(t('demo.loaded'), 'ok');
    CC.app.goMap(S.currentMap().id);
  }

  CC.demo = { load: load };
})();
