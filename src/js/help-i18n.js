/* Detailed manual for the six non-Chinese UI languages (15 guide + 10 AI sections). */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};

  var en = {
    guide: [
      { id: 'start', title: 'Five-minute start', html:
        '<p>A new map opens with a central topic. Rename it, then add children with <kbd>Tab</kbd> or New node.</p><ul>' +
        '<li>Double-click empty space near a node: a linked child is created. Hold <kbd>Shift</kbd> to create a floating node.</li>' +
        '<li>Drag a node: the whole branch moves and its links follow live.</li>' +
        '<li>Zoom at the bottom right; <kbd>G</kbd> fits the map, <kbd>F</kbd> isolates the selection.</li></ul>' },
      { id: 'map', title: 'Maps and views', html:
        '<p>Each tab is a separate view over the same corpus. Switch structure between tree, org chart and free links; auto arrange clears manual offsets.</p>' +
        '<p>Focus shows the selected node and its neighbours only. Templates copy structure and card content into a new map. Export the current map as PNG, SVG or Markdown from the “…” menu.</p>' },
      { id: 'node', title: 'Nodes and cards', html:
        '<p>The right panel edits the selected card: title, body, optional note, tags, category and style (shape, fill, icon, size, bold, hyperlink).</p>' +
        '<p>Collapse a branch with the “+N” pill, duplicate a node from the context menu, align several selected nodes, or draw a boundary around a group. Deleting moves the card to Trash.</p>' },
      { id: 'edge', title: 'Links', html:
        '<p>Press Link, then click source and target. Choose a type (hierarchy, synonym, cause…), add a note, pick a colour or mark it doubtful. Double-click a link to edit; doubtful links appear in Check.</p>' },
      { id: 'canvas', title: 'Editing and selecting on the canvas', html:
        '<h3>Renaming in place</h3><p>Double-click a node and its title turns into a text box: type straight into it, without opening the side panel. <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels, and clicking away also commits. The change applies at once, the layout re-flows, and it can be undone and redone like any other edit.</p>' +
        '<p>To change the body, note or style of the whole card, use “Edit” in the context menu to open the side panel.</p>' +
        '<h3>Marquee selection</h3><p>Hold <kbd>Shift</kbd> and drag on empty canvas to draw a rectangle; every node inside it gets selected. Holding <kbd>Shift</kbd> for a second box adds to the current selection.</p>' +
        '<p>You can also press the dashed-rectangle button in the toolbar to stay in marquee mode, then drag without <kbd>Shift</kbd>. Press the button again to leave it.</p>' +
        '<p>Once several nodes are selected you can drag them as a group, link them in one go, or delete them together with <kbd>Delete</kbd>.</p>' +
        '<h3>Minimap</h3><p>The small map at the bottom left shows the whole map; the pale rectangle marks the current viewport. Click it or drag it and the viewport jumps to that spot — on a map with hundreds of thousands of cards this is the quickest way to find your way around.</p>' +
        '<p>Show or hide it with the map-icon button in the toolbar or from the canvas “…” menu. The choice is stored per map, so each map remembers its own setting.</p>' },
      { id: 'style', title: 'Appearance, attachments and output', html:
        '<h3>Theme library</h3><p>The “…” menu on the canvas holds a Theme library with six palettes (Default, Paper, Ink, Night, Forest, Dusk). The theme is stored per map: changing it affects that map only, and never touches the cards themselves.</p>' +
        '<p>A theme applies to the canvas — background, link colours and tag colours change — while the surrounding interface keeps its own look.</p>' +
        '<h3>Summary nodes</h3><p>A card can carry a one-line summary. It is drawn straight onto the node and appears once the map is at full detail. Three styles are available: plain, callout (a bordered block) and badge (a small label in the corner).</p>' +
        '<p>Edit the text in the Summary field of the side panel and switch style with the buttons next to it. An empty summary costs the node no extra space.</p>' +
        '<h3>Link line styles</h3><p>Double-click a link to set three things: the line type (solid, dashed, dotted), the arrow (filled, open, none) and the width (thin, medium, thick). Doubtful links keep their orange dashed look and the question mark.</p>' +
        '<p>These settings are purely visual: the relation type does not change, and search and Check still work by type.</p>' +
        '<h3>Attachments</h3><p>A card can carry images or any other file. Use Add image or Add file in the Attachments block of the side panel. The bytes live in a local attachments folder; the corpus file keeps only the name, size and type, so backups stay small.</p>' +
        '<p>Images are drawn under the node as a thumbnail. Open shows the file with your default program, Show in folder reveals it in the file browser.</p>' +
        '<h3>Presentation mode</h3><p>The play button in the toolbar (also in the “…” menu) starts a full-screen presentation that follows the map structure: root first, then level by level.</p>' +
        '<p><kbd>←</kbd> <kbd>→</kbd> or <kbd>Space</kbd> turn pages, <kbd>Home</kbd> / <kbd>End</kbd> jump to the first and last slide, <kbd>Esc</kbd> leaves the presentation.</p>' +
        '<h3>A4 printing</h3><p>The print button in the toolbar lays the current view out on A4 landscape pages and then opens the system print dialog. Wide maps are split across pages; the margin is 10 mm.</p>' +
        '<p>Check the range first if you like — what prints is the map itself, without any interface controls.</p>' },
      { id: 'runtime', title: 'Streaming AI and local storage', html:
        '<h3>Text as it is written</h3><p>After you press Generate, the reply appears a piece at a time above the result area instead of arriving all at once. Long answers are much easier to steer early.</p>' +
        '<p>Streaming only changes how the reply is shown: it is still parsed into a draft and nothing reaches your corpus until you confirm each item.</p>' +
        '<h3>A real cancel</h3><p>While generating, the “Cancel request” button becomes available. It does not just close the dialog — the main process aborts the in-flight network request, so the connection stops immediately and nothing keeps billing in the background.</p>' +
        '<p>A cancelled call is recorded as “Cancelled” in the ledger; it produces no result.</p>' +
        '<h3>Call ledger</h3><p>“Call ledger” in the AI panel lists every call: time, action, model, status, tokens, duration and the error message when one failed. The log lives only in a local <code>ai-ledger.json</code>; it is never exported in a .wef backup and never uploaded.</p>' +
        '<p>Up to 300 entries are kept, oldest first to go. The panel can clear the whole log in one click.</p>' +
        '<h3>Sharded storage for large corpora</h3><p>Once the card count passes a threshold, the corpus switches from one <code>corpus.json</code> to shards: metadata stays in corpus.json while cards are split into files of 2000 in a <code>corpus-shards/</code> folder.</p>' +
        '<p>On save only the shards whose content actually changed are rewritten, so editing one card no longer rewrites the whole library. Auto-backup reassembles the shards into a full corpus before writing, so a restore is always lossless. Settings → Data shows whether storage is single-file or sharded.</p>' +
        '<h3>Incremental layout and background warm-up</h3><p>Dragging a branch reindexes only the nodes that moved instead of rebuilding the whole spatial grid. The coarse overview used at very low zoom is computed in a Web Worker after the visible frame has been painted, so the interface stays responsive.</p>' +
        '<p>When idle, the app drops stale measurement caches and unused layout models, so memory does not keep growing during a long session.</p>' },
      { id: 'outline', title: 'Outline', html:
        '<p>The outline edits the same data as the map. Change a title or level here and the map follows immediately, and vice versa.</p>' +
        '<p><kbd>Tab</kbd> indents, <kbd>Shift</kbd>+<kbd>Tab</kbd> outdents, <kbd>Enter</kbd> adds a sibling; the row buttons add children and siblings.</p>' },
      { id: 'cards', title: 'Corpus', html:
        '<p>Cards are the source of truth, with no fixed fields. Tags, category and provenance are optional but make search and review easier.</p>' +
        '<p>Similar cards are suggested in the panel; merge only if you decide to. Select several cards for bulk tags, category or trash. Reverse lookup shows which maps use a card.</p>' },
      { id: 'search', title: 'Search', html:
        '<p>Full text covers titles, bodies, notes and tags, tolerates typos and simplified/traditional variants. Filters (tags, mapped state, date, open annotations) can be combined and saved as views.</p>' +
        '<p>Relation search lists every link by type; structure search finds isolated nodes, the deepest branch, duplicates and broken links.</p>' },
      { id: 'health', title: 'Check', html:
        '<p>Check lists unmapped cards, isolated nodes, doubtful links, duplicates and broken links. It only reports; click an item to jump and fix it yourself.</p>' },
      { id: 'history', title: 'History and trash', html:
        '<p>Every structural edit is logged. Roll back restores the whole corpus to just before a step, saving the current state as a restore point first. Manual restore points can be named.</p>' +
        '<p>Deleted cards go to Trash and can be restored; links are kept so a restore is lossless. “Delete forever” is irreversible.</p>' },
      { id: 'io', title: 'Import and backup', html:
        '<p>Import XMind, OPML or Markdown outlines; everything becomes the same corpus, with provenance recorded. The import report shows how many nodes were imported or skipped.</p>' +
        '<p>XMind labels and markers become card tags, relationships become edges, and topic fill/shape, hyperlinks and attachments are preserved; summary topics become card summaries.</p>' +
        '<p>Backup writes one readable .wef JSON file. Restore can merge by id or replace everything. Keys never enter backups.</p>' +
        '<p>You can also drop a .wef (or an auto-backup corpus-*.json) onto the window, or pick it in Import: it is detected by content and offered as a restore, never parsed as an outline. One auto-backup is kept at each start (last 10 kept).</p>' +
        '<p>Export the whole corpus at once as Markdown, JSON, CSV or OPML: maps first, unassigned cards last, never settings or keys.</p>' },
      { id: 'settings', title: 'Settings and privacy', html:
        '<p>Interface language and theme apply immediately. The data panel shows the file location and format version, and opens the folder.</p>' +
        '<p>There is no account, telemetry or cloud sync. Only an AI action sends the selected text to your endpoint; everything else is local.</p>' },
      { id: 'whatsnew', title: 'What is new', html:
        '<p><b>Quick capture</b>: press Ctrl+Shift+Space anywhere for a note box; Enter saves a card. <b>Relation graph</b>: the Relations view draws all cards and links as a force-directed network. <b>Backlinks &amp; [[links]]</b>: see who points to a card and write [[titles]] in the body. <b>Markdown preview</b>: toggle Preview on the body field. <b>Bundle</b>: export corpus + attachments as one .wefz. <b>PDF</b>: export the map directly from its More menu. <b>Tag manager</b>: rename, merge and colour tags. <b>Card templates</b> and a 3-step first-run tour are also included.</p>' },
      { id: 'structures', title: 'Diagram structures', html:
        '<p>Each map picks its own structure from the toolbar button. Besides Tree, Org chart and Free links, four more are available: <b>Fishbone</b> (cause/effect spine), <b>Timeline</b> (horizontal sequence), <b>Radial</b> (mind-map style) and <b>Matrix</b> (four quadrants). Switching only changes placement, never the corpus cards.</p>' },
      { id: 'keys', title: 'Keyboard', html:
        '<p><kbd>Ctrl</kbd>+<kbd>K</kbd> search · <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>F</kbd> focus · <kbd>G</kbd> fit · <kbd>F11</kbd> full screen · <kbd>1</kbd>-<kbd>9</kbd> views.</p>' +
        '<p>In Settings you can re-record any shortcut or reset them all, keep several AI profiles that share one API key, and create independent libraries (switching reloads the window; existing data stays in place).</p>' }
    ],
    ai: [
      { id: 'what', title: 'What AI does', html:
        '<p>Draft creates a map from notes; Organize groups, merges, renames and restructures; Summarize condenses selected nodes or a long text; Review only annotates, with location, problem, suggestion and confidence.</p>' +
        '<p>Everything is a draft until you confirm item by item. Closing the panel writes nothing.</p>' },
      { id: 'api', title: 'API and key', html:
        '<p>An API is the provider endpoint your app calls. The API key is a password tied to your account and billing. It is as sensitive as a password: never share it or paste it into a screenshot.</p>' +
        '<p>The app follows the OpenAI <code>/chat/completions</code> format, so most providers work; local servers work too.</p>' },
      { id: 'setup', title: 'Get a key and connect', html:
        '<ol><li>Sign up on the provider site and open its console / API Keys page.</li><li>Create a key and copy it; note the Base URL and the exact model id from the docs.</li><li>In Settings → AI, paste address, model and key, then press Test connection.</li></ol>' },
      { id: 'providers', title: 'Common providers', html:
        '<p>The Base URL is for the app, not a website to open.</p>' +
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Zhipu</b> <code>https://open.bigmodel.cn/api/paas/v4</code> · <b>Alibaba Bailian</b> <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code> · <b>OpenRouter</b> <code>https://openrouter.ai/api/v1</code>.</p>' +
        '<p>Official sites: OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">Use only these official domains. Mirror or top-up sites found in search may be impostors; check the domain before pasting a key.</p>' },
      { id: 'local', title: 'Local models', html:
        '<p>Ollama: install, run <code>ollama pull qwen2.5</code>, then use <code>http://127.0.0.1:11434/v1</code> and model <code>qwen2.5</code>, ticking “Use a local model”.</p>' +
        '<p>LM Studio: download a model, start Local Server (port 1234), use <code>http://127.0.0.1:1234/v1</code> and the model id shown in the app. No key is needed; data stays on the machine.</p>' },
      { id: 'fill', title: 'Using the panel', html:
        '<p>Choose an action, then a scope: selected nodes, the whole map, or compare with the corpus. Paste source text for Draft and press Generate.</p>' +
        '<p>Results list new nodes, links, renames and merges; tick what you want and accept. Review items can be marked resolved or attached to a card as a note.</p>' },
      { id: 'errors', title: 'Errors', html:
        '<p><b>401/403</b> key or permission · <b>404</b> wrong address (often a missing /v1) · <b>429</b> rate or quota · <b>timeout</b> model too slow · <b>cannot connect</b> no network or local server not started · <b>empty</b> model returned nothing.</p>' +
        '<p>The app never retries silently; you decide when to try again or change model.</p>' },
      { id: 'cost', title: 'Cost', html:
        '<p>Providers bill per token, input and output separately. A draft of a few hundred words usually costs a fraction of a cent; reviewing a long document costs more.</p>' +
        '<p>Save by sending only the selection, summarising before organising, trimming long text, or using a local model. The panel shows elapsed time and token usage after every call.</p>' },
      { id: 'privacy', title: 'Privacy', html:
        '<p>Only the chosen scope plus your instruction is sent, and only when you press Generate. Keys are stored with system encryption, never logged, never included in backups, and can be cleared with one click.</p>' },
      { id: 'faq', title: 'FAQ', html:
        '<p><b>AI button grey?</b> No endpoint/model, or no key and local mode off. <b>Test OK but draft fails?</b> The model may not support JSON output or the text is too long. <b>New computer?</b> Keys do not travel with backups; enter them again.</p>' }
    ]
  };

  var ja = {
    guide: [
      { id: 'start', title: '5分で開始', html:
        '<p>新しいマップは中心トピック付きで開きます。名前を変え、<kbd>Tab</kbd> か「ノード追加」で子を増やします。</p><ul>' +
        '<li>ノードの近くの空白をダブルクリックすると子を作って接続します。<kbd>Shift</kbd> を押すと浮いたノードになります。</li>' +
        '<li>ノードをドラッグすると枝ごと動き、線もリアルタイムで追従します。</li>' +
        '<li>右下で拡大縮小、<kbd>G</kbd> で全体表示、<kbd>F</kbd> で選択だけを表示します。</li></ul>' },
      { id: 'map', title: 'マップと表示', html:
        '<p>タブごとに同じ資料を別の見方で表示します。構造はツリー・組織図・自由リンクから選べ、自動整列は手動配置を戻します。</p>' +
        '<p>フォーカスは選択ノードと隣接だけを表示します。テンプレートは構造とカード内容を新しいマップに複製します。PNG・SVG・Markdown へは「…」から書き出します。</p>' },
      { id: 'node', title: 'ノードとカード', html:
        '<p>右パネルでタイトル、本文、任意の注記、タグ、分類、スタイル（形・塗り・アイコン・文字サイズ・太字・リンク）を編集します。</p>' +
        '<p>「+N」で枝を畳み、右クリックで複製、複数選択で整列、囲み枠も作れます。削除はゴミ箱へ移動します。</p>' },
      { id: 'edge', title: 'リンク', html:
        '<p>「リンク」を押し、始点と終点をクリックします。種類・説明・色・不確かを設定し、ダブルクリックで編集します。不確かな線は点検に表示されます。</p>' },
      { id: 'canvas', title: 'キャンバスでの編集と選択', html:
        '<h3>その場で名前を変える</h3><p>ノードをダブルクリックするとタイトルが入力欄になり、サイドパネルを開かずにそのまま入力できます。<kbd>Enter</kbd>で確定、<kbd>Esc</kbd>で取り消し、別の場所をクリックしても確定します。変更はすぐに反映され、レイアウトも組み直され、他の編集と同じように元に戻せます。</p>' +
        '<p>本文・補足・スタイルなどカード全体を直すときは、右クリックの「編集」でサイドパネルを開いてください。</p>' +
        '<h3>矩形選択</h3><p>空いた場所で<kbd>Shift</kbd>を押しながらドラッグすると長方形が引かれ、中のノードがすべて選択されます。もう一度<kbd>Shift</kbd>を押したまま四角えると、選択に追加されます。</p>' +
        '<p>ツールバーの破線ボタンは矩形選択モードの切り替えです。押した状態では<kbd>Shift</kbd>なしでそのままドラッグすれば選択できます。もう一度押すと解除されます。</p>' +
        '<p>複数選択後はまとめて移動、まとめて接続、<kbd>Delete</kbd>で一括削除できます。</p>' +
        '<h3>ミニマップ</h3><p>キャンバス左下の小さな図がマップ全体を示し、薄い長方形が現在の表示範囲です。クリックまたはドラッグするとその位置へ表示が移動します。数十万枚のカードのあるマップでは、これが一番早い道しるべになります。</p>' +
        '<p>表示・非表示はツールバーの地図アイコン、またはキャンバス右クリックの「…」メニューから切り替えます。設定はマップごとに保存されます。</p>' },
      { id: 'style', title: '外観・添付・書き出し', html:
        '<h3>テーマ集</h3><p>キャンバスの「…」メニューに「テーマ集」があり、6 種類の配色（標準・和紙・墨・夜・森・夕暮）を選べます。テーマは図ごとに保存されるので、変えたのはその図だけで、カードのデータには一切触れません。</p>' +
        '<p>テーマはキャンバスにだけ適用されます。背景・線の色・タグの色が変わりますが、画面自体の見た目はそのままです。</p>' +
        '<h3>概要ノード</h3><p>カードには一行の概要を書けます。ノードに直接描かれ、詳細表示のときに見えます。書き方は 3 種類——通常、コールアウト（枠で囲んだブロック）、バッジ（角の小さなラベル）。</p>' +
        '<p>サイドパネルの「概要」欄で文章を直し、隣のボタンで書き方を切り替えます。空なら余白も広がりません。</p>' +
        '<h3>リンクの線スタイル</h3><p>リンクをダブルクリックすると、線の種類（実線・破線・点線）、矢印（塗りつぶし・開いた形・なし）、太さ（細・中・太）を設定できます。不確かなリンクはオレンジの破線と「?」のままです。</p>' +
        '<p>これは見た目だけの設定で、関係の種類は変わりません。検索も検査も以前どおり種類で見つけます。</p>' +
        '<h3>添付ファイル</h3><p>カードには画像や任意のファイルを添えられます。サイドパネルの「添付」欄で「画像を追加」か「ファイルを追加」を選びます。中身はローカルの添付フォルダに置き、コーパスファイルには名前・大きさ・種類だけが残るので、バックアップは膨らみません。</p>' +
        '<p>画像はノードの下にサムネイルとして描かれます。「開く」は既定のプログラムで、「フォルダーに表示」は保存場所を出します。</p>' +
        '<h3>発表モード</h3><p>ツールバーの再生ボタン（または「…」メニュー）から全画面発表が始まり、図の構造順に進みます。まず根のノード、その下へ段階的に。</p>' +
        '<p><kbd>←</kbd> <kbd>→</kbd> または <kbd>Space</kbd> でページ送り、<kbd>Home</kbd> / <kbd>End</kbd> で最初と最後へ、<kbd>Esc</kbd> で終了します。</p>' +
        '<h3>A4 印刷</h3><p>ツールバーの印刷ボタンが現在の表示を A4 横向きのページに割り付け、システムの印刷ダイアログを開きます。広い図は複数ページに分かれ、余白は 10 ミリです。</p>' +
        '<p>必要なら先に範囲を確認してください。印刷されるのは図そのものだけで、画面の操作部品は含まれません。</p>' },
      { id: 'runtime', title: 'AI ストリーミングとローカル保存', html:
        '<h3>生成されながら表示</h3><p>「生成」を押すと、返答が結果欄の上に少しずつ現れます。まとめて届くのを待たなくてよいので、長い回答ほど早く方向を確認できます。</p>' +
        '<p>ストリーミングは表示の仕方だけを変えます。最後はこれまでどおり下書きに解析され、項目ごとに確認するまでデータベースには書き込まれません。</p>' +
        '<h3>本当に中止する</h3><p>生成中は「リクエストを中止」が使えるようになります。ダイアログを閉じるだけではなく、メインプロセスが送信中のネットワーク要求を直接中断します。接続はその場で切れ、裏で課金が続くこともありません。</p>' +
        '<p>中止した呼び出しは履歴に「中止」と残り、結果は作られません。</p>' +
        '<h3>呼び出し履歴</h3><p>AI パネルの「呼び出し履歴」には、時刻・動作・モデル・状態・トークン数・所要時間、失敗したときのエラーが並びます。記録はローカルの <code>ai-ledger.json</code> だけにあり、.wef バックアップにも入らず、外部にも送られません。</p>' +
        '<p>最大 300 件までで、古いものから消えます。パネルから一括でクリアできます。</p>' +
        '<h3>大規模コーパスの分割保存</h3><p>カードが一定数を超えると、単一の <code>corpus.json</code> から分割保存へ自動で切り替わります。メタデータは corpus.json のまま、カードは 2000 枚ずつ <code>corpus-shards/</code> 内の小さなファイルに分かれます。</p>' +
        '<p>保存時に書き直すのは内容が変わったファイルだけなので、1 枚直すためにライブラリ全体を書き直す必要がありません。自動バックアップは分割を完全なコーパスに組み直してから書き出すため、復元は常に無損失です。設定 → データで現在の方式を確認できます。</p>' +
        '<h3>段階的なレイアウトと裏側の準備</h3><p>枝をドラッグしても、動いたノードだけを再索引し、空間グリッド全体を作り直しません。縮小時の粗い概観は Web Worker で、見えているフレームを描いたあとに計算するので画面が止まりません。</p>' +
        '<p>暇なときに古い計測キャッシュと使っていないレイアウトモデルを捨てるため、長時間起動してもメモリが増え続けません。</p>' },
      { id: 'outline', title: 'アウトライン', html:
        '<p>アウトラインはマップと同じデータを編集します。ここでタイトルや階層を変えるとマップに即反映し、逆も同じです。</p>' +
        '<p><kbd>Tab</kbd> で下げ、<kbd>Shift</kbd>+<kbd>Tab</kbd> で上げ、<kbd>Enter</kbd> で同じ階層を追加します。</p>' },
      { id: 'cards', title: '資料', html:
        '<p>カードが正本で、固定項目はありません。タグ・分類・出典は任意ですが、検索と見直しが楽になります。</p>' +
        '<p>似たカードはパネルに提案されます。統合するかは自分で決めます。複数選択で一括タグ・分類・削除ができ、逆引きで使用中のマップを確認できます。</p>' },
      { id: 'search', title: '検索', html:
        '<p>全文検索はタイトル・本文・注記・タグを対象に、誤字や簡体/繁体の差も許容します。条件は組み合わせてビューとして保存できます。</p>' +
        '<p>関係検索は種類ごとの一覧、構造検索は孤立・最深・重複・切断を探します。</p>' },
      { id: 'health', title: '点検', html:
        '<p>未配置カード、孤立ノード、不確かな線、重複、切断を一覧します。表示のみで、項目を押すとその場所へ移動します。</p>' },
      { id: 'history', title: '履歴とゴミ箱', html:
        '<p>構造の変更は記録されます。巻き戻すとその直前へ戻り、現在の状態は復元ポイントとして保存されます。</p>' +
        '<p>削除したカードはゴミ箱から戻せます。線も保持されるため復元は失われません。「完全削除」は取り消せません。</p>' },
      { id: 'io', title: '読み込みとバックアップ', html:
        '<p>XMind・OPML・Markdown を取り込むと同じ正本になり、出典も記録されます。取り込みレポートに成功・スキップ数が出ます。</p>' +
        '<p>バックアップは読める .wef（JSON）1ファイルです。復元は ID で統合するか上書きするかを選べます。キーは含まれません。</p>' +
        '<p>.wef（または自動バックアップの corpus-*.json）はウィンドウにドロップしても、「読み込み」で選んでも構いません。内容でバックアップと判定され、アウトラインとしては読み込まれず復元ダイアログが出ます。起動時に 1 部、最近 10 部を保持します。</p>' +
        '<p>正本はまとめて Markdown・JSON・CSV・OPML のいずれかで書き出せます。図ごとにまとめ、最後に未配置のカードが来ます。設定やキーは含まれません。</p>' },
      { id: 'settings', title: '設定とプライバシー', html:
        '<p>言語とテーマはすぐ反映されます。データ欄には保存場所と形式バージョンが出て、フォルダーを開けます。</p>' +
        '<p>アカウント・テレメトリ・クラウド同期はありません。AI を実行したときだけ選択範囲が送られ、それ以外はローカルです。</p>' },
      { id: 'whatsnew', title: '新機能', html:
        '<p><b>クイック入力</b>: どこでも Ctrl+Shift+Space で入力ボックス、Enter でカード保存。<b>関係図</b>: 全カードと関係を力指向ネットワークで表示。<b>バックリンクと [[リンク]]</b>: 参照元を表示し本文に [[タイトル]] を書ける。<b>Markdown プレビュー</b>: 本文で切替。<b>バンドル</b>: 資料と添付を .wefz 一括書き出し。<b>PDF</b>: マップの「その他」から直接出力。<b>タグ管理</b>、<b>カードテンプレート</b>、初回3ステップ案内も追加。</p>' },
      { id: 'structures', title: '図の構造', html:
        '<p>各マップはツールバーのボタンで構造を選べます。ツリー・組織図・自由リンクに加え、<b>フィッシュボーン</b>（因果）・<b>タイムライン</b>（時系列）・<b>放射図</b>（マインドマップ風）・<b>マトリクス</b>（4象限）を追加しました。構造の切替は配置だけを変え、正本のカードには影響しません。</p>' },
      { id: 'keys', title: 'キーボード', html:
        '<p><kbd>Ctrl</kbd>+<kbd>K</kbd> 検索 · <kbd>Ctrl</kbd>+<kbd>S</kbd> 保存 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 元に戻す · <kbd>F</kbd> フォーカス · <kbd>G</kbd> 全体表示 · <kbd>F11</kbd> 全画面 · <kbd>1</kbd>-<kbd>9</kbd> 画面切替。</p>' +
        '<p>設定ではショートカットの再記録と一括リセット、1 つの API キーを共有する複数の AI プロファイル、独立したライブラリの作成ができます。切り替えると画面が再読み込みされ、既存データはそのまま残ります。</p>' }
    ],
    ai: [
      { id: 'what', title: 'AI でできること', html:
        '<p>草案作成・整理・要約・校閲の4つです。校閲は場所・問題・提案・確信度を注記するだけで、書き換えません。すべて確認するまで草案です。</p>' },
      { id: 'api', title: 'API とキー', html:
        '<p>API は事業者の窓口で、アプリがそこへ文章を送ります。API キーはアカウントと請求に結びついたパスワードで、他人に見せないでください。</p><p>OpenAI の <code>/chat/completions</code> 形式に対応し、多くのサービスとローカルサーバーが使えます。</p>' },
      { id: 'setup', title: 'キー取得と接続', html:
        '<ol><li>公式サイトで登録し、コンソール / API Keys を開きます。</li><li>キーを作成してコピーし、Base URL とモデル名を控えます。</li><li>設定 → AI に3つを貼り、「接続テスト」を押します。</li></ol>' },
      { id: 'providers', title: '主なサービス', html:
        '<p>Base URL はアプリ用で、ウェブサイトではありません。</p>' +
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>智譜</b> <code>https://open.bigmodel.cn/api/paas/v4</code> · <b>阿里百煉</b> <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code> · <b>OpenRouter</b> <code>https://openrouter.ai/api/v1</code>。</p>' +
        '<p>公式サイト：OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>。</p>' +
        '<p class="help-warn">上記の公式ドメインだけを使ってください。検索で出るミラーや代行チャージは偽サイトの可能性があります。キーを貼る前にドメインを確認してください。</p>' },
      { id: 'local', title: 'ローカルモデル', html:
        '<p>Ollama はインストール後に <code>ollama pull qwen2.5</code> を実行し、<code>http://127.0.0.1:11434/v1</code> とモデル <code>qwen2.5</code> を設定して「ローカルモデル」にチェックします。</p>' +
        '<p>LM Studio はモデルを取得して Local Server（1234）を開始し、<code>http://127.0.0.1:1234/v1</code> と表示されたモデル名を使います。キー不要で、データは外に出ません。</p>' },
      { id: 'fill', title: 'パネルの使い方', html:
        '<p>動作を選び、範囲（選択・マップ全体・全資料と比較）を決めます。草案は素材を貼って「生成」を押します。</p>' +
        '<p>結果には新規ノード・リンク・改名・統合が並び、必要なものだけ適用します。校閲は処理済みにするか、カードの注記として残せます。</p>' },
      { id: 'errors', title: 'エラー', html:
        '<p><b>401/403</b> キーか権限 · <b>404</b> アドレス違い（/v1 漏れが多い） · <b>429</b> 回数か枠 · <b>タイムアウト</b> モデルが遅い · <b>接続不可</b> ネットかローカルサーバー · <b>空</b> 応答なし。</p><p>自動再試行はしません。再試行やモデル変更は自分で行います。</p>' },
      { id: 'cost', title: '費用', html:
        '<p>費用はトークン単位で、入力と出力が別計算です。数百字の草案は数円未満、長文の校閲は高くなります。</p><p>選択範囲だけ送る、先に要約する、長文を削る、ローカルモデルを使う、の順で節約できます。実行後に時間とトークン数が表示されます。</p>' },
      { id: 'privacy', title: 'プライバシー', html:
        '<p>送るのは選んだ範囲と指示だけで、「生成」を押したときだけです。キーは端末で暗号化保存し、ログにもバックアップにも入らず、1クリックで消せます。</p>' },
      { id: 'faq', title: 'よくある質問', html:
        '<p><b>AI ボタンが灰色</b>：アドレス/モデル未設定、またはキーもローカル指定もなし。<b>接続成功でも失敗</b>：JSON 非対応か長すぎ。<b>新しい PC</b>：キーはバックアップに含まれないので再入力します。</p>' }
    ]
  };

  var es = {
    guide: [
      { id: 'start', title: 'Primeros pasos', html:
        '<p>Un mapa nuevo abre con un tema central. Renómbralo y añade hijos con <kbd>Tab</kbd> o Nuevo nodo.</p><ul>' +
        '<li>Doble clic cerca de un nodo crea un hijo enlazado; con <kbd>Mayús</kbd> el nodo queda flotante.</li>' +
        '<li>Al arrastrar un nodo se mueve toda la rama y sus enlaces siguen en vivo.</li>' +
        '<li>Zoom abajo a la derecha; <kbd>G</kbd> ajusta el mapa y <kbd>F</kbd> aísla la selección.</li></ul>' },
      { id: 'map', title: 'Mapas y vistas', html:
        '<p>Cada pestaña es una vista del mismo corpus. Cambia entre árbol, organigrama y enlaces libres; ordenar borra los desplazamientos manuales.</p>' +
        '<p>El enfoque muestra solo el nodo y sus vecinos. Las plantillas copian estructura y contenido; exporta PNG, SVG o Markdown desde «…».</p>' },
      { id: 'node', title: 'Nodos y tarjetas', html:
        '<p>El panel derecho edita título, cuerpo, nota opcional, etiquetas, categoría y estilo (forma, relleno, icono, tamaño, negrita, enlace).</p>' +
        '<p>Contrae una rama con «+N», duplica desde el menú, alinea varios nodos o crea un marco de área. Eliminar mueve la tarjeta a la papelera.</p>' },
      { id: 'edge', title: 'Enlaces', html:
        '<p>Pulsa Enlazar y haz clic en origen y destino. Elige tipo (jerarquía, sinónimo, causa…), nota, color o marca dudoso. Doble clic edita; los dudosos aparecen en Revisión.</p>' },
      { id: 'canvas', title: 'Edición y selección en el lienzo', html:
        '<h3>Renombrar en el sitio</h3><p>Haz doble clic en un nodo y su título se convierte en un cuadro de texto: escribe directamente en él, sin abrir el panel lateral. <kbd>Enter</kbd> confirma, <kbd>Esc</kbd> cancela y al hacer clic fuera también se confirma. El cambio se aplica al instante, la disposición se recalcula y se puede deshacer y rehacer como cualquier otra edición.</p>' +
        '<p>Para cambiar el cuerpo, la nota o el estilo de la tarjeta completa, usa «Editar» en el menú contextual para abrir el panel lateral.</p>' +
        '<h3>Selección por recuadro</h3><p>Mantén <kbd>Shift</kbd> y arrastra sobre el lienzo vacío para dibujar un rectángulo: todos los nodos que quedan dentro quedan seleccionados. Mantener <kbd>Shift</kbd> en un segundo recuadro añade a la selección actual.</p>' +
        '<p>También puedes pulsar el botón de rectángulo discontinuo de la barra de herramientas para quedarte en modo recuadro y arrastrar sin <kbd>Shift</kbd>. Púlsalo otra vez para salir.</p>' +
        '<p>Con varios nodos seleccionados puedes moverlos en bloque, enlazarlos de una vez o borrarlos juntos con <kbd>Delete</kbd>.</p>' +
        '<h3>Minimapa</h3><p>El pequeño mapa de la esquina inferior izquierda muestra el mapa entero; el rectángulo claro marca la vista actual. Haz clic o arrástralo y la vista salta a ese punto: en un mapa con cientos de miles de tarjetas es la forma más rápida de orientarse.</p>' +
        '<p>Se muestra u oculta con el botón de icono de mapa de la barra de herramientas o desde el menú «…» del lienzo. La preferencia se guarda por mapa.</p>' },
      { id: 'style', title: 'Apariencia, adjuntos y salida', html:
        '<h3>Biblioteca de temas</h3><p>El menú «…» del lienzo incluye una Biblioteca de temas con seis paletas (Predeterminado, Papel, Tinta, Nocturno, Bosque, Crepúsculo). El tema se guarda por mapa: cambiarlo solo afecta a ese mapa y nunca toca las tarjetas.</p>' +
        '<p>Un tema se aplica al lienzo —cambian el fondo, los colores de los enlaces y los de las etiquetas— mientras que la interfaz conserva su propia apariencia.</p>' +
        '<h3>Nodos de resumen</h3><p>Una tarjeta puede llevar un resumen de una línea. Se dibuja directamente sobre el nodo y aparece cuando el mapa está en detalle completo. Hay tres estilos: simple, destacado (un bloque con borde) e insignia (una etiqueta pequeña en la esquina).</p>' +
        '<p>Edita el texto en el campo Resumen del panel lateral y cambia de estilo con los botones contiguos. Si está vacío, el nodo no ocupa espacio extra.</p>' +
        '<h3>Estilos de línea</h3><p>Haz doble clic en un enlace para fijar tres cosas: el tipo de trazo (continuo, discontinuo, punteado), la flecha (rellena, abierta, ninguna) y el grosor (fino, medio, grueso). Los enlaces dudosos conservan su trazo naranja discontinuo y el signo de interrogación.</p>' +
        '<p>Son ajustes solo visuales: el tipo de relación no cambia, y la búsqueda y el Control siguen funcionando por tipo.</p>' +
        '<h3>Adjuntos</h3><p>Una tarjeta puede llevar imágenes o cualquier archivo. Usa Añadir imagen o Añadir archivo en el bloque Adjuntos del panel lateral. Los bytes viven en una carpeta local de adjuntos; el archivo del corpus solo guarda nombre, tamaño y tipo, así que las copias de seguridad no engordan.</p>' +
        '<p>Las imágenes se dibujan bajo el nodo como miniatura. Abrir las muestra con tu programa habitual y Mostrar en la carpeta las localiza en el explorador de archivos.</p>' +
        '<h3>Modo presentación</h3><p>El botón de reproducción de la barra (también en el menú «…») inicia una presentación a pantalla completa que sigue la estructura del mapa: primero la raíz y luego nivel a nivel.</p>' +
        '<p><kbd>←</kbd> <kbd>→</kbd> o <kbd>Espacio</kbd> pasan de diapositiva, <kbd>Inicio</kbd> / <kbd>Fin</kbd> saltan a la primera y la última, y <kbd>Esc</kbd> sale.</p>' +
        '<h3>Impresión A4</h3><p>El botón de impresión de la barra reparte la vista actual en páginas A4 horizontales y abre el diálogo de impresión del sistema. Los mapas anchos se parten en varias páginas; el margen es de 10 mm.</p>' +
        '<p>Puedes comprobar el alcance antes: lo que se imprime es el mapa, sin los controles de la interfaz.</p>' },
      { id: 'runtime', title: 'IA en streaming y almacenamiento local', html:
        '<h3>Texto mientras se escribe</h3><p>Tras pulsar Generar, la respuesta aparece poco a poco sobre el área de resultados en lugar de llegar de golpe. En las respuestas largas se ve antes si va por buen camino.</p>' +
        '<p>El streaming solo cambia la forma de mostrarla: se sigue analizando como borrador y nada entra en el corpus hasta que confirmas cada elemento.</p>' +
        '<h3>Una cancelación real</h3><p>Durante la generación se activa «Cancelar solicitud». No se limita a cerrar el diálogo: el proceso principal interrumpe la petición de red en curso, la conexión se corta al instante y no sigue consumiendo crédito en segundo plano.</p>' +
        '<p>Una llamada cancelada queda registrada como «Cancelada» y no produce resultados.</p>' +
        '<h3>Registro de llamadas</h3><p>«Registro de llamadas» en el panel de IA muestra cada llamada: hora, acción, modelo, estado, tokens, duración y el error cuando falló. El registro vive solo en un <code>ai-ledger.json</code> local; no se exporta en las copias .wef ni se sube a ningún sitio.</p>' +
        '<p>Se conservan hasta 300 entradas y se descartan las más antiguas. El panel puede vaciarlo de una vez.</p>' +
        '<h3>Almacenamiento fragmentado</h3><p>Cuando el número de tarjetas supera un umbral, el corpus pasa de un único <code>corpus.json</code> a fragmentos: los metadatos siguen en corpus.json y las tarjetas se reparten en archivos de 2000 dentro de <code>corpus-shards/</code>.</p>' +
        '<p>Al guardar solo se reescriben los fragmentos que han cambiado, así que editar una tarjeta ya no reescribe toda la biblioteca. La copia automática recompone los fragmentos antes de escribir, por lo que restaurar nunca pierde datos. Ajustes → Datos indica si el almacenamiento es de archivo único o fragmentado.</p>' +
        '<h3>Layout incremental y preparación en segundo plano</h3><p>Al arrastrar una rama solo se reindexan los nodos que se movieron, en vez de reconstruir toda la rejilla espacial. La vista gruesa de cuando se aleja mucho se calcula en un Web Worker después de pintar el fotograma visible, así que la interfaz sigue respondiendo.</p>' +
        '<p>En reposo se descartan las cachés de medición antiguas y los modelos de layout sin uso, para que la memoria no crezca sin fin en una sesión larga.</p>' },
      { id: 'outline', title: 'Esquema', html:
        '<p>El esquema edita los mismos datos que el mapa: cambia un título o nivel y el mapa sigue al instante, y al revés.</p>' +
        '<p><kbd>Tab</kbd> sangra, <kbd>Mayús</kbd>+<kbd>Tab</kbd> quita sangría y <kbd>Intro</kbd> crea un hermano.</p>' },
      { id: 'cards', title: 'Corpus', html:
        '<p>Las tarjetas son la fuente de verdad, sin campos fijos. Etiquetas, categoría y procedencia son opcionales pero facilitan la búsqueda.</p>' +
        '<p>El panel sugiere tarjetas similares; combina solo si quieres. Selecciona varias para etiquetas, categoría o papelera. La búsqueda inversa muestra en qué mapas están.</p>' },
      { id: 'search', title: 'Buscar', html:
        '<p>La búsqueda cubre títulos, cuerpos, notas y etiquetas, tolera errores y variantes. Los filtros se combinan y se guardan como vistas.</p>' +
        '<p>La búsqueda de relaciones lista los enlaces por tipo; la estructural encuentra aislados, la rama más profunda, duplicados y rotos.</p>' },
      { id: 'health', title: 'Revisión', html:
        '<p>Revisión lista tarjetas sin mapa, nodos aislados, enlaces dudosos, duplicados y rotos. Solo avisa; haz clic para ir a corregirlo.</p>' },
      { id: 'history', title: 'Historial y papelera', html:
        '<p>Cada cambio estructural queda registrado. Volver atrás restaura el corpus justo antes de ese paso y guarda el estado actual como punto de restauración.</p>' +
        '<p>Las tarjetas borradas van a la papelera y se pueden recuperar; los enlaces se conservan. «Eliminar para siempre» es irreversible.</p>' },
      { id: 'io', title: 'Importar y copias', html:
        '<p>Importa XMind, OPML o Markdown; todo pasa al mismo corpus y se registra la procedencia. El informe indica cuántos nodos entraron o se omitieron.</p>' +
        '<p>La copia es un .wef JSON legible; restaurar puede combinar por id o reemplazar. Las claves nunca entran en la copia.</p>' +
        '<p>También puedes arrastrar un .wef (o un corpus-*.json de copia automática) a la ventana, o elegirlo en Importar: se detecta por contenido y se ofrece restaurar, nunca se analiza como esquema. Se guarda una copia en cada inicio (se conservan las 10 últimas).</p>' +
        '<p>Exporta todo el corpus a la vez como Markdown, JSON, CSV u OPML: primero los mapas, al final las tarjetas sin asignar. Nunca incluye ajustes ni claves.</p>' },
      { id: 'settings', title: 'Ajustes y privacidad', html:
        '<p>Idioma y tema se aplican al instante. El panel de datos muestra ubicación y versión del formato, y abre la carpeta.</p>' +
        '<p>Sin cuenta, telemetría ni nube. Solo una acción de IA envía el texto seleccionado a tu servicio; el resto es local.</p>' },
      { id: 'whatsnew', title: 'Novedades', html:
        '<p><b>Captura rápida</b>: Ctrl+Shift+Space en cualquier lugar abre una nota; Enter guarda una tarjeta. <b>Grafo de relaciones</b>: la vista Relaciones dibuja todas las tarjetas y enlaces como red. <b>Referencias y [[enlaces]]</b>: ve quién apunta a una tarjeta y escribe [[títulos]]. <b>Vista Markdown</b>: alterna en el cuerpo. <b>Paquete</b>: exporta corpus y adjuntos en un .wefz. <b>PDF</b>: desde Más del mapa. También hay <b>gestor de etiquetas</b>, <b>plantillas de tarjeta</b> y una guía inicial de 3 pasos.</p>' },
      { id: 'structures', title: 'Estructuras', html:
        '<p>Cada mapa elige su estructura en la barra. Además de Árbol, Organigrama y Enlaces libres: <b>Espina de pescado</b>, <b>Línea de tiempo</b>, <b>Radial</b> y <b>Matriz</b>. Cambiar la estructura solo mueve nodos, nunca las tarjetas.</p>' },
      { id: 'keys', title: 'Teclado', html:
        '<p><kbd>Ctrl</kbd>+<kbd>K</kbd> buscar · <kbd>Ctrl</kbd>+<kbd>S</kbd> guardar · <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshacer · <kbd>F</kbd> enfoque · <kbd>G</kbd> ajustar · <kbd>F11</kbd> pantalla completa · <kbd>1</kbd>-<kbd>9</kbd> vistas.</p>' +
        '<p>En Ajustes puedes regrabar atajos o restablecerlos, guardar varios perfiles de IA que comparten una clave, y crear bibliotecas independientes (al cambiar se recarga la ventana y los datos existentes permanecen).</p>' }
    ],
    ai: [
      { id: 'what', title: 'Qué hace la IA', html:
        '<p>Borrador crea un mapa desde notas; Organizar agrupa, combina, renombra y reestructura; Resumir condensa; Revisar solo anota ubicación, problema, sugerencia y confianza.</p><p>Todo es borrador hasta que confirmas cada elemento.</p>' },
      { id: 'api', title: 'API y clave', html:
        '<p>Una API es el punto del proveedor al que la app envía texto. La clave es una contraseña ligada a tu cuenta y facturación; no la compartas.</p><p>La app usa el formato <code>/chat/completions</code> de OpenAI, así que casi cualquier proveedor y servidor local funciona.</p>' },
      { id: 'setup', title: 'Obtener clave y conectar', html:
        '<ol><li>Regístrate en el sitio oficial y abre Consola / API Keys.</li><li>Crea y copia una clave; apunta Base URL y el id de modelo exacto.</li><li>En Ajustes → IA pega los tres datos y pulsa Probar conexión.</li></ol>' },
      { id: 'providers', title: 'Proveedores habituales', html:
        '<p>La Base URL es para la app, no un sitio web.</p>' +
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Zhipu</b> <code>https://open.bigmodel.cn/api/paas/v4</code> · <b>Alibaba Bailian</b> <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code> · <b>OpenRouter</b> <code>https://openrouter.ai/api/v1</code>.</p>' +
        '<p>Sitios oficiales: OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">Usa solo estos dominios oficiales. Los espejos o sitios de recarga pueden ser falsos; comprueba el dominio antes de pegar una clave.</p>' },
      { id: 'local', title: 'Modelos locales', html:
        '<p>Ollama: instala, ejecuta <code>ollama pull qwen2.5</code>, usa <code>http://127.0.0.1:11434/v1</code> y el modelo <code>qwen2.5</code>, marcando «Usar un modelo local».</p>' +
        '<p>LM Studio: descarga un modelo, inicia Local Server (1234), usa <code>http://127.0.0.1:1234/v1</code> y el id que muestra. Sin clave y sin salir del equipo.</p>' },
      { id: 'fill', title: 'Usar el panel', html:
        '<p>Elige acción y alcance (selección, mapa completo o comparar con el corpus). Pega el texto y pulsa Generar.</p><p>La lista muestra nodos, enlaces, renombres y fusiones; marca lo que quieras y acepta. Las anotaciones se pueden marcar resueltas o añadir como nota.</p>' },
      { id: 'errors', title: 'Errores', html:
        '<p><b>401/403</b> clave o permiso · <b>404</b> dirección (suele faltar /v1) · <b>429</b> límite o cuota · <b>tiempo agotado</b> modelo lento · <b>sin conexión</b> red o servidor local · <b>vacío</b> sin respuesta.</p><p>No hay reintentos silenciosos.</p>' },
      { id: 'cost', title: 'Coste', html:
        '<p>El proveedor cobra por token, entrada y salida por separado. Un borrador corto cuesta muy poco; revisar un documento largo cuesta más.</p><p>Ahorra enviando solo la selección, resumiendo antes, recortando texto o usando un modelo local. El panel muestra tiempo y tokens.</p>' },
      { id: 'privacy', title: 'Privacidad', html:
        '<p>Solo se envía el alcance elegido y tu instrucción, y solo al pulsar Generar. La clave se guarda cifrada en el equipo, no se registra ni entra en copias, y se borra en un clic.</p>' },
      { id: 'faq', title: 'Preguntas frecuentes', html:
        '<p><b>¿Botón gris?</b> Falta dirección/modelo, o clave y modo local desactivado. <b>¿Prueba OK pero falla?</b> El modelo no admite JSON o el texto es largo. <b>¿Otro equipo?</b> La clave no viaja en la copia; vuelve a introducirla.</p>' }
    ]
  };

  var fr = {
    guide: [
      { id: 'start', title: 'Premiers pas', html:
        '<p>Une nouvelle carte s’ouvre avec un sujet central. Renommez-le puis ajoutez des enfants avec <kbd>Tab</kbd> ou Nouveau nœud.</p><ul>' +
        '<li>Double-cliquez près d’un nœud pour créer un enfant relié ; avec <kbd>Maj</kbd>, le nœud reste flottant.</li>' +
        '<li>Glisser un nœud déplace toute la branche, liens compris, en direct.</li>' +
        '<li>Zoom en bas à droite ; <kbd>G</kbd> ajuste la carte et <kbd>F</kbd> isole la sélection.</li></ul>' },
      { id: 'map', title: 'Cartes et vues', html:
        '<p>Chaque onglet est une vue du même corpus. Passez d’un arbre à un organigramme ou à des liens libres ; la disposition auto efface les décalages manuels.</p>' +
        '<p>Le focus n’affiche que le nœud et ses voisins. Les modèles copient structure et contenu ; exportez en PNG, SVG ou Markdown via « … ».</p>' },
      { id: 'node', title: 'Nœuds et fiches', html:
        '<p>Le panneau de droite modifie titre, corps, note facultative, étiquettes, catégorie et style (forme, remplissage, icône, taille, gras, lien).</p>' +
        '<p>Réduisez une branche avec « +N », dupliquez depuis le menu, alignez plusieurs nœuds ou encadrez un groupe. Supprimer envoie la fiche à la corbeille.</p>' },
      { id: 'edge', title: 'Liens', html:
        '<p>Cliquez sur Relier puis sur source et cible. Choisissez type (hiérarchie, synonyme, cause…), note, couleur ou douteux. Double-clic pour modifier ; les liens douteux apparaissent dans Vérification.</p>' },
      { id: 'canvas', title: 'Édition et sélection sur le canevas', html:
        '<h3>Renommer sur place</h3><p>Double-cliquez sur un nœud et son titre devient un champ de saisie : tapez directement dedans, sans ouvrir le panneau latéral. <kbd>Entrée</kbd> valide, <kbd>Échap</kbd> annule, et un clic ailleurs valide aussi. La modification s’applique immédiatement, la disposition se recalcule et elle s’annule et se rétablit comme les autres.</p>' +
        '<p>Pour changer le corps, la note ou le style complet de la fiche, utilisez « Modifier » dans le menu contextuel afin d’ouvrir le panneau latéral.</p>' +
        '<h3>Sélection par cadre</h3><p>Maintenez <kbd>Maj</kbd> et faites glisser sur le canevas vide pour tracer un rectangle : tous les nœuds à l’intérieur sont sélectionnés. Maintenir <kbd>Maj</kbd> lors d’un second cadre ajoute à la sélection courante.</p>' +
        '<p>Vous pouvez aussi activer le bouton au rectangle pointillé de la barre d’outils pour rester en mode cadre et glisser sans <kbd>Maj</kbd>. Cliquez de nouveau pour en sortir.</p>' +
        '<p>Une fois plusieurs nœuds sélectionnés, vous pouvez les déplacer ensemble, les relier d’un coup ou les supprimer avec <kbd>Suppr</kbd>.</p>' +
        '<h3>Mini-carte</h3><p>La petite carte en bas à gauche montre la carte entière ; le rectangle clair indique la vue en cours. Cliquez-la ou faites-la glisser et l’affichage s’y rend : sur une carte de centaines de milliers de fiches, c’est le moyen le plus rapide de s’orienter.</p>' +
        '<p>Elle s’affiche ou se masque avec le bouton d’icône de carte de la barre d’outils ou via le menu « … » du canevas. Le choix est enregistré pour chaque carte.</p>' },
      { id: 'style', title: 'Apparence, pièces jointes et sortie', html:
        '<h3>Bibliothèque de thèmes</h3><p>Le menu «…» du canevas propose une Bibliothèque de thèmes avec six palettes (Par défaut, Papier, Encre, Nuit, Forêt, Crépuscule). Le thème est enregistré par carte : le changer n’affecte que cette carte et ne touche jamais aux fiches.</p>' +
        '<p>Un thème s’applique au canevas — le fond, les couleurs des liens et des étiquettes changent — tandis que l’interface conserve son apparence.</p>' +
        '<h3>Nœuds de résumé</h3><p>Une fiche peut porter un résumé d’une ligne. Il est dessiné directement sur le nœud et apparaît quand la carte est en détail complet. Trois styles sont proposés : simple, encadré (un bloc bordé) et badge (une petite étiquette dans le coin).</p>' +
        '<p>Modifiez le texte dans le champ Résumé du panneau latéral et changez de style avec les boutons voisins. Un résumé vide n’occupe aucune place supplémentaire.</p>' +
        '<h3>Styles de trait</h3><p>Double-cliquez un lien pour régler trois choses : le type de trait (plein, tirets, pointillés), la flèche (pleine, ouverte, aucune) et l’épaisseur (fine, moyenne, épaisse). Les liens douteux gardent leur trait orange et leur point d’interrogation.</p>' +
        '<p>Ces réglages sont purement visuels : le type de relation ne change pas, et la recherche comme le Contrôle continuent de travailler par type.</p>' +
        '<h3>Pièces jointes</h3><p>Une fiche peut porter des images ou n’importe quel fichier. Utilisez Ajouter une image ou Ajouter un fichier dans le bloc Pièces jointes du panneau latéral. Les octets restent dans un dossier local de pièces jointes ; le fichier du corpus ne conserve que le nom, la taille et le type, donc les sauvegardes ne grossissent pas.</p>' +
        '<p>Les images sont dessinées sous le nœud en vignette. Ouvrir les affiche avec votre programme par défaut, Afficher dans le dossier les localise dans l’explorateur de fichiers.</p>' +
        '<h3>Mode présentation</h3><p>Le bouton lecture de la barre d’outils (aussi dans le menu «…») lance une présentation plein écran qui suit la structure de la carte : la racine d’abord, puis niveau par niveau.</p>' +
        '<p><kbd>←</kbd> <kbd>→</kbd> ou <kbd>Espace</kbd> changent de diapositive, <kbd>Début</kbd> / <kbd>Fin</kbd> vont à la première et à la dernière, <kbd>Échap</kbd> quitte.</p>' +
        '<h3>Impression A4</h3><p>Le bouton d’impression de la barre répartit la vue courante sur des pages A4 paysage, puis ouvre la boîte de dialogue d’impression du système. Les cartes larges sont découpées en plusieurs pages ; la marge est de 10 mm.</p>' +
        '<p>Vérifiez l’étendue si vous le souhaitez : ce qui s’imprime, c’est la carte elle-même, sans les commandes de l’interface.</p>' },
      { id: 'runtime', title: 'IA en flux et stockage local', html:
        '<h3>Le texte au fur et à mesure</h3><p>Après « Générer », la réponse apparaît morceau par morceau au-dessus de la zone de résultat au lieu d’arriver d’un bloc. Sur une longue réponse, on voit beaucoup plus tôt si elle prend la bonne direction.</p>' +
        '<p>Le flux ne change que l’affichage : la réponse est toujours analysée en brouillon et rien n’entre dans le corpus avant confirmation de chaque élément.</p>' +
        '<h3>Une annulation réelle</h3><p>Pendant la génération, « Annuler la requête » devient actif. Il ne ferme pas seulement la fenêtre : le processus principal interrompt la requête réseau en cours, la connexion s’arrête aussitôt et rien ne continue à être facturé en arrière-plan.</p>' +
        '<p>Un appel annulé est noté « Annulé » dans le journal et ne produit aucun résultat.</p>' +
        '<h3>Journal des appels</h3><p>« Journal des appels » dans le panneau IA liste chaque appel : heure, action, modèle, état, jetons, durée et le message d’erreur en cas d’échec. Le journal reste dans un <code>ai-ledger.json</code> local ; il n’est jamais exporté dans une sauvegarde .wef ni envoyé ailleurs.</p>' +
        '<p>300 entrées au maximum, les plus anciennes disparaissent en premier. Le panneau permet de tout vider d’un clic.</p>' +
        '<h3>Stockage fractionné</h3><p>Au-delà d’un certain nombre de fiches, le corpus passe d’un seul <code>corpus.json</code> à des fragments : les métadonnées restent dans corpus.json, les fiches sont réparties par fichiers de 2000 dans <code>corpus-shards/</code>.</p>' +
        '<p>À l’enregistrement, seuls les fragments réellement modifiés sont réécrits : corriger une fiche ne réécrit plus toute la bibliothèque. La sauvegarde automatique recompose d’abord les fragments en corpus complet, donc une restauration est toujours sans perte. Réglages → Données indique le mode de stockage.</p>' +
        '<h3>Disposition incrémentale et préparation en arrière-plan</h3><p>Déplacer une branche ne réindexe que les nœuds déplacés, sans reconstruire toute la grille spatiale. La vue grossière du zoom très éloigné est calculée dans un Web Worker après le rendu de l’image visible, l’interface reste donc fluide.</p>' +
        '<p>Au repos, les caches de mesure périmés et les modèles de disposition inutilisés sont libérés : la mémoire ne grossit pas indéfiniment pendant une longue session.</p>' },
      { id: 'outline', title: 'Plan', html:
        '<p>Le plan modifie les mêmes données que la carte : un titre ou un niveau change ici et la carte suit, et inversement.</p>' +
        '<p><kbd>Tab</kbd> indente, <kbd>Maj</kbd>+<kbd>Tab</kbd> désindente, <kbd>Entrée</kbd> crée un voisin.</p>' },
      { id: 'cards', title: 'Corpus', html:
        '<p>Les fiches sont la source de vérité, sans champs fixes. Étiquettes, catégorie et provenance sont facultatifs mais facilitent recherche et relecture.</p>' +
        '<p>Le panneau propose des fiches similaires ; fusionnez seulement si vous le décidez. Sélectionnez plusieurs fiches pour étiquettes, catégorie ou corbeille. La recherche inverse montre les cartes concernées.</p>' },
      { id: 'search', title: 'Rechercher', html:
        '<p>La recherche couvre titres, corps, notes et étiquettes, tolère fautes et variantes. Les filtres se combinent et se sauvent en vues.</p>' +
        '<p>La recherche de relations liste les liens par type ; la structurelle trouve isolés, branche la plus profonde, doublons et liens cassés.</p>' },
      { id: 'health', title: 'Vérification', html:
        '<p>Vérification liste fiches hors carte, nœuds isolés, liens douteux, doublons et liens cassés. Simple alerte ; cliquez pour corriger.</p>' },
      { id: 'history', title: 'Historique et corbeille', html:
        '<p>Chaque changement structurel est enregistré. Revenir restaure le corpus juste avant l’étape et sauvegarde l’état actuel comme point de restauration.</p>' +
        '<p>Les fiches supprimées vont à la corbeille et peuvent revenir ; les liens sont conservés. « Supprimer définitivement » est irréversible.</p>' },
      { id: 'io', title: 'Import et sauvegardes', html:
        '<p>Importez XMind, OPML ou Markdown ; tout rejoint le même corpus avec sa provenance. Le rapport indique les nœuds importés ou ignorés.</p>' +
        '<p>La sauvegarde est un .wef JSON lisible ; la restauration fusionne par id ou remplace. Les clés n’y entrent jamais.</p>' +
        '<p>Vous pouvez aussi déposer un .wef (ou un corpus-*.json de sauvegarde auto) sur la fenêtre, ou le choisir dans Importer : il est reconnu par son contenu et proposé à la restauration, jamais analysé comme plan. Une sauvegarde est faite à chaque démarrage (10 dernières conservées).</p>' +
        '<p>Exportez tout le corpus en une fois au format Markdown, JSON, CSV ou OPML : les plans d’abord, les cartes non classées à la fin, jamais les réglages ni les clés.</p>' },
      { id: 'settings', title: 'Réglages et confidentialité', html:
        '<p>Langue et thème s’appliquent aussitôt. Le panneau données indique l’emplacement et la version du format, et ouvre le dossier.</p>' +
        '<p>Sans compte, télémétrie ni cloud. Seule une action IA envoie le texte sélectionné à votre service ; le reste est local.</p>' },
      { id: 'whatsnew', title: 'Nouveautés', html:
        '<p><b>Capture rapide</b> : Ctrl+Shift+Space partout ouvre une note ; Entrée enregistre une fiche. <b>Graphe de relations</b> : la vue Relations dessine toutes les fiches et liens en réseau. <b>Liens entrants et [[liens]]</b> : voyez qui pointe vers une fiche et écrivez [[titres]]. <b>Aperçu Markdown</b> : basculez dans le corps. <b>Bundle</b> : exportez corpus et pièces en un .wefz. <b>PDF</b> : depuis « Plus » de la carte. Également <b>gestionnaire d’étiquettes</b>, <b>modèles de fiche</b> et une visite guidée en 3 étapes.</p>' },
      { id: 'structures', title: 'Structures', html:
        '<p>Chaque carte choisit sa structure dans la barre. Outre Arbre, Organigramme et Liens libres : <b>Arrête de poisson</b>, <b>Chronologie</b>, <b>Radial</b> et <b>Matrice</b>. Changer de structure ne déplace que les nœuds, jamais les fiches.</p>' },
      { id: 'keys', title: 'Clavier', html:
        '<p><kbd>Ctrl</kbd>+<kbd>K</kbd> rechercher · <kbd>Ctrl</kbd>+<kbd>S</kbd> enregistrer · <kbd>Ctrl</kbd>+<kbd>Z</kbd> annuler · <kbd>F</kbd> focus · <kbd>G</kbd> ajuster · <kbd>F11</kbd> plein écran · <kbd>1</kbd>-<kbd>9</kbd> vues.</p>' +
        '<p>Dans les Réglages vous pouvez réenregistrer les raccourcis ou les réinitialiser, conserver plusieurs profils IA partageant une clé, et créer des bibliothèques indépendantes (changer recharge la fenêtre, les données existantes restent en place).</p>' }
    ],
    ai: [
      { id: 'what', title: 'Ce que fait l’IA', html:
        '<p>Brouillon crée une carte depuis des notes ; Organiser regroupe, fusionne, renomme et restructure ; Résumer condense ; Relire annote lieu, problème, suggestion et confiance.</p><p>Tout reste brouillon jusqu’à validation.</p>' },
      { id: 'api', title: 'API et clé', html:
        '<p>Une API est le point d’accès du fournisseur auquel l’app envoie du texte. La clé est un mot de passe lié au compte et à la facturation ; gardez-la privée.</p><p>L’app suit le format <code>/chat/completions</code> d’OpenAI : la plupart des services et serveurs locaux fonctionnent.</p>' },
      { id: 'setup', title: 'Obtenir une clé et connecter', html:
        '<ol><li>Inscrivez-vous sur le site officiel et ouvrez Console / API Keys.</li><li>Créez et copiez une clé ; notez l’URL de base et l’id de modèle exact.</li><li>Dans Réglages → IA, collez les trois puis Testez la connexion.</li></ol>' },
      { id: 'providers', title: 'Fournisseurs courants', html:
        '<p>L’URL de base sert à l’app, ce n’est pas un site web.</p>' +
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Zhipu</b> <code>https://open.bigmodel.cn/api/paas/v4</code> · <b>Alibaba Bailian</b> <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code> · <b>OpenRouter</b> <code>https://openrouter.ai/api/v1</code>.</p>' +
        '<p>Sites officiels : OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">N’utilisez que ces domaines officiels. Les sites miroirs ou de recharge peuvent être des imposteurs ; vérifiez le domaine avant de coller une clé.</p>' },
      { id: 'local', title: 'Modèles locaux', html:
        '<p>Ollama : installez, lancez <code>ollama pull qwen2.5</code>, utilisez <code>http://127.0.0.1:11434/v1</code> et le modèle <code>qwen2.5</code>, en cochant « Utiliser un modèle local ».</p>' +
        '<p>LM Studio : téléchargez un modèle, démarrez Local Server (1234), utilisez <code>http://127.0.0.1:1234/v1</code> et l’id affiché. Sans clé, sans sortie réseau.</p>' },
      { id: 'fill', title: 'Utiliser le panneau', html:
        '<p>Choisissez une action et une portée (sélection, carte entière, comparaison au corpus). Collez le texte puis Générez.</p><p>La liste montre nœuds, liens, renommages et fusions ; cochez ce que vous voulez. Les annotations peuvent être résolues ou ajoutées en note.</p>' },
      { id: 'errors', title: 'Erreurs', html:
        '<p><b>401/403</b> clé ou permission · <b>404</b> adresse (souvent /v1 manquant) · <b>429</b> débit ou quota · <b>délai</b> modèle lent · <b>injoignable</b> réseau ou serveur local · <b>vide</b> aucune réponse.</p><p>Aucun nouvel essai silencieux.</p>' },
      { id: 'cost', title: 'Coût', html:
        '<p>Le fournisseur facture au token, entrée et sortie séparément. Un brouillon court coûte très peu ; relire un long document coûte plus.</p><p>Économisez en n’envoyant que la sélection, en résumant d’abord, en coupant le texte ou avec un modèle local. Le panneau affiche durée et tokens.</p>' },
      { id: 'privacy', title: 'Confidentialité', html:
        '<p>Seuls la portée choisie et votre instruction sont envoyés, et seulement au clic sur Générer. La clé est chiffrée localement, jamais journalisée ni sauvegardée, et effaçable en un clic.</p>' },
      { id: 'faq', title: 'Questions fréquentes', html:
        '<p><b>Bouton gris ?</b> Adresse/modèle manquant, ou ni clé ni mode local. <b>Test OK mais échec ?</b> Modèle sans JSON ou texte trop long. <b>Nouvel ordinateur ?</b> La clé ne suit pas la sauvegarde ; ressaisissez-la.</p>' }
    ]
  };

  var ko = {
    guide: [
      { id: 'start', title: '5분 시작', html:
        '<p>새 맵은 중심 주제와 함께 열립니다. 이름을 바꾸고 <kbd>Tab</kbd> 또는 새 노드로 자식을 늘리세요.</p><ul>' +
        '<li>노드 근처 빈 곳을 더블클릭하면 자식을 만들어 연결합니다. <kbd>Shift</kbd>를 누르면 떠 있는 노드가 됩니다.</li>' +
        '<li>노드를 끌면 가지 전체가 움직이고 연결선도 실시간으로 따라옵니다.</li>' +
        '<li>오른쪽 아래에서 확대/축소, <kbd>G</kbd>로 맞춤, <kbd>F</kbd>로 선택만 표시합니다.</li></ul>' },
      { id: 'map', title: '맵과 보기', html:
        '<p>탭마다 같은 자료를 다른 방식으로 봅니다. 구조는 트리·조직도·자유 연결 중에서 고르고, 자동 정렬은 수동 배치를 지웁니다.</p>' +
        '<p>포커스는 선택 노드와 이웃만 보여 줍니다. 템플릿은 구조와 카드 내용을 새 맵으로 복사하고, PNG·SVG·Markdown은 「…」에서 내보냅니다.</p>' },
      { id: 'node', title: '노드와 카드', html:
        '<p>오른쪽 패널에서 제목, 본문, 선택 메모, 태그, 분류, 스타일(모양·채우기·아이콘·크기·굵게·링크)을 편집합니다.</p>' +
        '<p>「+N」으로 가지를 접고, 메뉴에서 복제하고, 여러 노드를 정렬하거나 영역 상자를 만들 수 있습니다. 삭제는 휴지통으로 갑니다.</p>' },
      { id: 'edge', title: '연결', html:
        '<p>「연결」을 누르고 시작과 대상을 차례로 클릭합니다. 종류(계층·동의어·원인…), 설명, 색, 불확실을 정하고 더블클릭으로 편집합니다. 불확실한 연결은 점검에 나타납니다.</p>' },
      { id: 'canvas', title: '캔버스에서 편집하고 선택하기', html:
        '<h3>그 자리에서 이름 바꾸기</h3><p>노드를 두 번 클릭하면 제목이 입력칸이 되어 옆 패널을 열지 않고 바로 입력할 수 있습니다. <kbd>Enter</kbd>로 저장하고 <kbd>Esc</kbd>로 취소하며, 다른 곳을 눌러도 저장됩니다. 변경은 바로 반영되고 배치가 다시 계산되며, 다른 편집과 마찬가지로 실행 취소와 재실행이 됩니다.</p>' +
        '<p>본문·메모·스타일 등 카드 전체를 고치려면 오른쪽 클릭의 「편집」으로 옆 패널을 여세요.</p>' +
        '<h3>사각형 선택</h3><p>빈 캔버스에서 <kbd>Shift</kbd>를 누른 채 끌면 사각형이 그려지고 그 안의 노드가 모두 선택됩니다. 다시 <kbd>Shift</kbd>를 누른 채 그려 현재 선택에 더할 수 있습니다.</p>' +
        '<p>도구 모음의 점선 사각형 버튼을 누르면 선택 모드가 계속 유지되어 <kbd>Shift</kbd> 없이 그냥 끌어도 됩니다. 다시 누르면 해제됩니다.</p>' +
        '<p>여러 노드를 고른 뒤에는 한꺼번에 옮기고, 한꺼번에 연결하고, <kbd>Delete</kbd>로 함께 지울 수 있습니다.</p>' +
        '<h3>미니맵</h3><p>캔버스 왼쪽 아래의 작은 지도가 전체 지도를 보여 주고 연한 사각형이 현재 화면입니다. 클릭하거나 끌면 그 위치로 이동합니다. 카드가 수십만 장인 지도에서 길을 찾는 가장 빠른 방법입니다.</p>' +
        '<p>지도 아이콘 버튼이나 캔버스 오른쪽 클릭의 「…」 메뉴에서 표시를 켜고 끌 수 있습니다. 이 설정은 지도마다 따로 저장됩니다.</p>' },
      { id: 'style', title: '외관, 첨부 파일 및 내보내기', html:
        '<h3>테마 라이브러리</h3><p>캔버스의 「…」 메뉴에 「테마 라이브러리」가 있고, 여섯 가지 색 조합(기본, 종이, 먹, 야행, 숲속, 박명)을 고를 수 있습니다. 테마는 지도마다 저장되므로 바꿔도 그 지도에만 적용되고 카드 데이터는 그대로입니다.</p>' +
        '<p>테마는 캔버스에만 적용됩니다. 배경, 연결선 색, 태그 색이 바뀌지만 화면 자체의 모양은 유지됩니다.</p>' +
        '<h3>요약 노드</h3><p>카드에는 한 줄 요약을 쓸 수 있습니다. 노드에 직접 그려지고 상세 보기에서 나타납니다. 서체는 세 가지 — 일반, 강조 블록(테두리 있는 박스), 배지(모서리 작은 라벨).</p>' +
        '<p>사이드 패널의 「요약」 칸에서 문장을 고치고, 옆 버튼으로 모양을 바꿉니다. 비워 두면 노드 크기가 늘지 않습니다.</p>' +
        '<h3>연결선 스타일</h3><p>연결선을 두 번 누르면 세 가지를 정할 수 있습니다: 선 종류(실선·파선·점선), 화살표(채워짐·열림·없음), 굵기(얇게·보통·두껍게). 확실하지 않은 연결선은 주황 파선과 물음표 표시를 그대로 유지합니다.</p>' +
        '<p>이 설정은 모양만 바꾸며 관계 종류는 그대로입니다. 검색과 점검도 예전처럼 종류로 찾습니다.</p>' +
        '<h3>첨부 파일</h3><p>카드에 이미지나 아무 파일이나 붙일 수 있습니다. 사이드 패널의 「첨부」 영역에서 「이미지 추가」 또는 「파일 추가」를 누릅니다. 실제 내용은 로컬 첨부 폴더에 두고, 코퍼스 파일에는 이름·크기·종류만 남기므로 백업이 불어나지 않습니다.</p>' +
        '<p>이미지는 노드 아래에 축소판으로 그려집니다. 「열기」는 기본 프로그램으로, 「폴더에서 표시」는 파일 위치를 파일 탐색기에서 보여 줍니다.</p>' +
        '<h3>발표 모드</h3><p>툴바의 재생 버튼(또는 「…」 메뉴)에서 전체 화면 발표가 시작되며, 지도의 구조 순서로 진행합니다. 루트 노드부터 단계별로 내려갑니다.</p>' +
        '<p><kbd>←</kbd> <kbd>→</kbd> 또는 <kbd>Space</kbd>로 넘기고, <kbd>Home</kbd> / <kbd>End</kbd>로 처음과 끝에 갈 수 있으며, <kbd>Esc</kbd>로 종료합니다.</p>' +
        '<h3>A4 인쇄</h3><p>툴바의 인쇄 버튼이 현재 화면을 A4 가로 페이지에 배치한 뒤 시스템 인쇄 대화상자를 엽니다. 넓은 지도는 여러 페이지로 나뉘며 여백은 10밀리미터입니다.</p>' +
        '<p>원한다면 먼저 범위를 확인하세요. 인쇄되는 것은 지도 자체이며 화면 조작 요소는 포함되지 않습니다.</p>' },
      { id: 'runtime', title: 'AI 스트리밍과 로컬 저장', html:
        '<h3>생성되는 대로 표시</h3><p>「생성」을 누르면 답변이 한꺼번에 도착하지 않고 결과 영역 위에 조금씩 나타납니다. 긴 답변일수록 방향이 맞는지 훨씬 빨리 알 수 있습니다.</p>' +
        '<p>스트리밍은 표시 방식만 바꿉니다. 마지막에는 여전히 초안으로 분석되어, 항목마다 확인하기 전까지 코퍼스에 기록되지 않습니다.</p>' +
        '<h3>실제로 중지하기</h3><p>생성 중에는 「요청 취소」가 활성화됩니다. 창을 닫는 것만이 아니라 메인 프로세스가 진행 중인 네트워크 요청을 직접 중단합니다. 연결이 즉시 끊기고 백그라운드에서 비용이 계속 발생하지 않습니다.</p>' +
        '<p>중지된 호출은 기록에 「중지됨」으로 남고 결과는 만들어지지 않습니다.</p>' +
        '<h3>호출 기록</h3><p>AI 패널의 「호출 기록」에는 시간, 동작, 모델, 상태, 토큰 수, 소요 시간, 실패 시 오류가 표시됩니다. 기록은 로컬 <code>ai-ledger.json</code>에만 있으며 .wef 백업에 포함되지 않고 외부로 전송되지도 않습니다.</p>' +
        '<p>최대 300건까지 보관되고 오래된 것부터 사라집니다. 패널에서 한 번에 비울 수 있습니다.</p>' +
        '<h3>대용량 코퍼스 분할 저장</h3><p>카드 수가 기준을 넘으면 단일 <code>corpus.json</code>에서 분할 저장으로 자동 전환됩니다. 메타데이터는 corpus.json에 남고, 카드는 2000장씩 <code>corpus-shards/</code> 안의 작은 파일로 나뉩니다.</p>' +
        '<p>저장할 때 내용이 바뀐 조각만 다시 쓰므로 카드 하나를 고치려고 전체 라이브러리를 다시 쓰지 않습니다. 자동 백업은 조각을 완전한 코퍼스로 다시 합친 뒤 기록하므로 복원은 항상 손실이 없습니다. 설정 → 데이터에서 현재 방식을 확인할 수 있습니다.</p>' +
        '<h3>증분 레이아웃과 백그라운드 준비</h3><p>가지 하나를 끌면 움직인 노드만 다시 색인하므로 공간 그리드 전체를 다시 만들지 않습니다. 많이 축소했을 때의 개괄 뷰는 보이는 화면을 그린 뒤 Web Worker에서 계산하므로 화면이 멈추지 않습니다.</p>' +
        '<p>유휴 시간에는 오래된 측정 캐시와 쓰지 않는 레이아웃 모델을 정리해, 오래 켜 두어도 메모리가 계속 늘어나지 않습니다.</p>' },
      { id: 'outline', title: '개요', html:
        '<p>개요는 맵과 같은 데이터를 편집합니다. 여기서 제목이나 단계를 바꾸면 맵이 즉시 따라오고, 반대도 같습니다.</p>' +
        '<p><kbd>Tab</kbd>은 내리기, <kbd>Shift</kbd>+<kbd>Tab</kbd>은 올리기, <kbd>Enter</kbd>는 같은 단계 추가입니다.</p>' },
      { id: 'cards', title: '자료', html:
        '<p>카드가 원본이며 고정된 항목은 없습니다. 태그·분류·출처는 선택이지만 검색과 검토에 도움이 됩니다.</p>' +
        '<p>비슷한 카드는 패널에 제안되며 병합 여부는 직접 정합니다. 여러 장을 골라 태그·분류·삭제를 한 번에 하고, 역참조로 어떤 맵에 쓰이는지 봅니다.</p>' },
      { id: 'search', title: '검색', html:
        '<p>전체 검색은 제목·본문·메모·태그를 대상으로 하며 오타와 간체/번체 차이를 허용합니다. 조건을 조합해 보기로 저장할 수 있습니다.</p>' +
        '<p>관계 검색은 종류별 연결 목록, 구조 검색은 고립·가장 깊은 가지·중복·끊긴 연결을 찾습니다.</p>' },
      { id: 'health', title: '점검', html:
        '<p>맵에 없는 카드, 고립 노드, 불확실한 연결, 중복, 끊긴 연결을 보여 줍니다. 표시만 하며 항목을 누르면 해당 위치로 갑니다.</p>' },
      { id: 'history', title: '기록과 휴지통', html:
        '<p>구조 변경은 모두 기록됩니다. 되돌리면 그 단계 직전으로 돌아가고 현재 상태는 복원 지점으로 저장됩니다.</p>' +
        '<p>삭제한 카드는 휴지통에서 되살릴 수 있고 연결도 유지됩니다. 영구 삭제는 되돌릴 수 없습니다.</p>' },
      { id: 'io', title: '가져오기와 백업', html:
        '<p>XMind·OPML·Markdown을 가져오면 같은 원본이 되고 출처가 기록됩니다. 가져오기 보고서에 성공·건너뜀 수가 나옵니다.</p>' +
        '<p>백업은 읽을 수 있는 .wef(JSON) 한 파일입니다. 복원은 ID 병합 또는 덮어쓰기를 고릅니다. 키는 포함되지 않습니다.</p>' +
        '<p>.wef(또는 자동 백업 corpus-*.json)를 창에 끌어다 놓거나 가져오기에서 선택해도 됩니다. 내용으로 백업을 판별해 복원 대화상자를 띄우며 개요로 읽어들이지 않습니다. 시작할 때마다 한 부, 최근 10부를 보관합니다.</p>' +
        '<p>전체 원본을 Markdown·JSON·CSV·OPML 중 하나로 한 번에 내보낼 수 있습니다. 지도별로 묶고 마지막에 미배치 카드가 오며, 설정과 키는 포함되지 않습니다.</p>' },
      { id: 'settings', title: '설정과 개인정보', html:
        '<p>언어와 테마는 즉시 적용됩니다. 자료 패널에 저장 위치와 형식 버전이 나오고 폴더를 열 수 있습니다.</p>' +
        '<p>계정·텔레메트리·클라우드가 없습니다. AI를 실행할 때만 선택 범위가 전송되고 나머지는 로컬입니다.</p>' },
      { id: 'whatsnew', title: '새 기능', html:
        '<p><b>빠른 캡처</b>: 어디서든 Ctrl+Shift+Space로 메모 창, Enter로 카드 저장. <b>관계 그래프</b>: 관계도에서 전체 카드와 링크를 힘 방향 네트워크로 표시. <b>역링크와 [[링크]]</b>: 나를 가리키는 카드를 보고 본문에 [[제목]] 작성. <b>Markdown 미리보기</b>: 본문에서 전환. <b>번들</b>: 원본과 첨부를 .wefz 하나로 내보내기. <b>PDF</b>: 맵의 더보기에서 직접 출력. <b>태그 관리</b>, <b>카드 템플릿</b>, 첫 실행 3단계 안내도 추가되었습니다.</p>' },
      { id: 'structures', title: '도형 구조', html:
        '<p>각 맵은 툴바에서 구조를 선택합니다. 트리·조직도·자유 연결 외에 <b>피쉬본</b>(인과), <b>타임라인</b>(시계열), <b>방사형</b>(마인드맵), <b>매트릭스</b>(4분면)를 추가했습니다. 구조 변경은 배치만 바꾸고 원본 카드는 그대로입니다.</p>' },
      { id: 'keys', title: '키보드', html:
        '<p><kbd>Ctrl</kbd>+<kbd>K</kbd> 검색 · <kbd>Ctrl</kbd>+<kbd>S</kbd> 저장 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 실행 취소 · <kbd>F</kbd> 포커스 · <kbd>G</kbd> 화면 맞춤 · <kbd>F11</kbd> 전체 화면 · <kbd>1</kbd>-<kbd>9</kbd> 화면 전환.</p>' +
        '<p>설정에서 단축키를 다시 기록하거나 초기화하고, 하나의 API 키를 공유하는 여러 AI 프로필을 저장하며, 독립적인 라이브러리를 만들 수 있습니다. 전환하면 창이 다시 로드되고 기존 데이터는 그대로 유지됩니다.</p>' }
    ],
    ai: [
      { id: 'what', title: 'AI가 하는 일', html:
        '<p>초안은 노트에서 맵을 만들고, 정리는 묶기·병합·이름 변경·구조 정리를 하며, 요약은 압축하고, 검토는 위치·문제·제안·확신도만 적습니다.</p><p>모든 결과는 하나씩 확인하기 전까지 초안입니다.</p>' },
      { id: 'api', title: 'API와 키', html:
        '<p>API는 앱이 글을 보내는 서비스 접점입니다. API 키는 계정과 결제에 연결된 비밀번호이므로 공유하지 마세요.</p><p>OpenAI의 <code>/chat/completions</code> 형식을 따르므로 대부분의 서비스와 로컬 서버가 호환됩니다.</p>' },
      { id: 'setup', title: '키 발급과 연결', html:
        '<ol><li>공식 사이트에서 가입하고 콘솔 / API Keys를 엽니다.</li><li>키를 만들어 복사하고 Base URL과 정확한 모델명을 적어 둡니다.</li><li>설정 → AI에 셋을 붙이고 「연결 테스트」를 누릅니다.</li></ol>' },
      { id: 'providers', title: '주요 서비스', html:
        '<p>Base URL은 앱용이며 웹사이트가 아닙니다.</p>' +
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Zhipu</b> <code>https://open.bigmodel.cn/api/paas/v4</code> · <b>Alibaba Bailian</b> <code>https://dashscope.aliyuncs.com/compatible-mode/v1</code> · <b>OpenRouter</b> <code>https://openrouter.ai/api/v1</code>.</p>' +
        '<p>공식 사이트: OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">위의 공식 도메인만 사용하세요. 검색의 미러나 대리 충전 사이트는 사칭일 수 있습니다. 키를 붙이기 전에 도메인을 확인하세요.</p>' },
      { id: 'local', title: '로컬 모델', html:
        '<p>Ollama: 설치 후 <code>ollama pull qwen2.5</code>를 실행하고 <code>http://127.0.0.1:11434/v1</code>과 모델 <code>qwen2.5</code>를 넣은 뒤 「로컬 모델 사용」을 체크합니다.</p>' +
        '<p>LM Studio: 모델을 받고 Local Server(1234)를 시작한 뒤 <code>http://127.0.0.1:1234/v1</code>과 표시된 모델명을 사용합니다. 키가 없고 데이터가 밖으로 나가지 않습니다.</p>' },
      { id: 'fill', title: '패널 사용법', html:
        '<p>동작과 범위(선택·맵 전체·전체 자료와 비교)를 고릅니다. 초안은 자료를 붙이고 「생성」을 누릅니다.</p><p>결과에는 새 노드·연결·이름 변경·병합이 나오며 필요한 것만 적용합니다. 검토는 처리됨으로 표시하거나 카드 메모로 붙일 수 있습니다.</p>' },
      { id: 'errors', title: '오류', html:
        '<p><b>401/403</b> 키/권한 · <b>404</b> 주소(주로 /v1 누락) · <b>429</b> 한도/잔량 · <b>시간 초과</b> 모델 지연 · <b>연결 불가</b> 네트워크/로컬 서버 · <b>빈 응답</b>.</p><p>자동 재시도는 없습니다.</p>' },
      { id: 'cost', title: '비용', html:
        '<p>제공자가 토큰 단위로 입력과 출력을 따로 청구합니다. 짧은 초안은 아주 적고, 긴 문서 검토는 더 듭니다.</p><p>선택만 보내기, 먼저 요약하기, 긴 글 줄이기, 로컬 모델 사용으로 아낄 수 있습니다. 실행 후 시간과 토큰이 표시됩니다.</p>' },
      { id: 'privacy', title: '개인정보', html:
        '<p>선택한 범위와 지시만, 「생성」을 누를 때만 전송됩니다. 키는 시스템 암호화로 저장되고 로그·백업에 들어가지 않으며 한 번에 지울 수 있습니다.</p>' },
      { id: 'faq', title: '자주 묻는 질문', html:
        '<p><b>AI 버튼이 회색?</b> 주소/모델이 없거나 키도 로컬 모드도 꺼짐. <b>연결은 되는데 실패?</b> JSON 미지원 또는 글이 너무 김. <b>새 컴퓨터?</b> 키는 백업에 포함되지 않으니 다시 입력하세요.</p>' }
    ]
  };

  CC.HELP_I18N = { en: en, ja: ja, es: es, fr: fr, ko: ko };
})();
