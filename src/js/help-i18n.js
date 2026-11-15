/* Detailed manual for the six non-Chinese UI languages (12 guide + 10 AI sections). */
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
        '<p>Backup writes one readable .wef JSON file. Restore can merge by id or replace everything. Keys never enter backups.</p>' },
      { id: 'settings', title: 'Settings and privacy', html:
        '<p>Interface language and theme apply immediately. The data panel shows the file location and format version, and opens the folder.</p>' +
        '<p>There is no account, telemetry or cloud sync. Only an AI action sends the selected text to your endpoint; everything else is local.</p>' },
      { id: 'keys', title: 'Keyboard', html:
        '<p><kbd>N</kbd> new card · <kbd>Ctrl</kbd>+<kbd>K</kbd> search · <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>F</kbd> focus · <kbd>G</kbd> fit · <kbd>F11</kbd> full screen · <kbd>1</kbd>-<kbd>9</kbd> views.</p>' }
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
        '<p>バックアップは読める .wef（JSON）1ファイルです。復元は ID で統合するか上書きするかを選べます。キーは含まれません。</p>' },
      { id: 'settings', title: '設定とプライバシー', html:
        '<p>言語とテーマはすぐ反映されます。データ欄には保存場所と形式バージョンが出て、フォルダーを開けます。</p>' +
        '<p>アカウント・テレメトリ・クラウド同期はありません。AI を実行したときだけ選択範囲が送られ、それ以外はローカルです。</p>' },
      { id: 'keys', title: 'キーボード', html:
        '<p><kbd>N</kbd> 新規カード · <kbd>Ctrl</kbd>+<kbd>K</kbd> 検索 · <kbd>Ctrl</kbd>+<kbd>S</kbd> 保存 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 元に戻す · <kbd>F</kbd> フォーカス · <kbd>G</kbd> 全体表示 · <kbd>F11</kbd> 全画面 · <kbd>1</kbd>-<kbd>9</kbd> 画面切替。</p>' }
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
        '<p>La copia es un .wef JSON legible; restaurar puede combinar por id o reemplazar. Las claves nunca entran en la copia.</p>' },
      { id: 'settings', title: 'Ajustes y privacidad', html:
        '<p>Idioma y tema se aplican al instante. El panel de datos muestra ubicación y versión del formato, y abre la carpeta.</p>' +
        '<p>Sin cuenta, telemetría ni nube. Solo una acción de IA envía el texto seleccionado a tu servicio; el resto es local.</p>' },
      { id: 'keys', title: 'Teclado', html:
        '<p><kbd>N</kbd> tarjeta · <kbd>Ctrl</kbd>+<kbd>K</kbd> buscar · <kbd>Ctrl</kbd>+<kbd>S</kbd> guardar · <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshacer · <kbd>F</kbd> enfoque · <kbd>G</kbd> ajustar · <kbd>F11</kbd> pantalla completa · <kbd>1</kbd>-<kbd>9</kbd> vistas.</p>' }
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
        '<p>La sauvegarde est un .wef JSON lisible ; la restauration fusionne par id ou remplace. Les clés n’y entrent jamais.</p>' },
      { id: 'settings', title: 'Réglages et confidentialité', html:
        '<p>Langue et thème s’appliquent aussitôt. Le panneau données indique l’emplacement et la version du format, et ouvre le dossier.</p>' +
        '<p>Sans compte, télémétrie ni cloud. Seule une action IA envoie le texte sélectionné à votre service ; le reste est local.</p>' },
      { id: 'keys', title: 'Clavier', html:
        '<p><kbd>N</kbd> fiche · <kbd>Ctrl</kbd>+<kbd>K</kbd> rechercher · <kbd>Ctrl</kbd>+<kbd>S</kbd> enregistrer · <kbd>Ctrl</kbd>+<kbd>Z</kbd> annuler · <kbd>F</kbd> focus · <kbd>G</kbd> ajuster · <kbd>F11</kbd> plein écran · <kbd>1</kbd>-<kbd>9</kbd> vues.</p>' }
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
        '<p>백업은 읽을 수 있는 .wef(JSON) 한 파일입니다. 복원은 ID 병합 또는 덮어쓰기를 고릅니다. 키는 포함되지 않습니다.</p>' },
      { id: 'settings', title: '설정과 개인정보', html:
        '<p>언어와 테마는 즉시 적용됩니다. 자료 패널에 저장 위치와 형식 버전이 나오고 폴더를 열 수 있습니다.</p>' +
        '<p>계정·텔레메트리·클라우드가 없습니다. AI를 실행할 때만 선택 범위가 전송되고 나머지는 로컬입니다.</p>' },
      { id: 'keys', title: '키보드', html:
        '<p><kbd>N</kbd> 새 카드 · <kbd>Ctrl</kbd>+<kbd>K</kbd> 검색 · <kbd>Ctrl</kbd>+<kbd>S</kbd> 저장 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 실행 취소 · <kbd>F</kbd> 포커스 · <kbd>G</kbd> 화면 맞춤 · <kbd>F11</kbd> 전체 화면 · <kbd>1</kbd>-<kbd>9</kbd> 화면 전환.</p>' }
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
