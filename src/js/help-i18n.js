/* Short, fully translated manual for non-Chinese languages.
   The detailed Chinese manual stays in help.js. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};

  var en = {
    guide: [
      { id: 'start', title: 'Five-minute start', html:
        '<p>A new map opens with a central topic. Rename it, then add children with <kbd>Tab</kbd> or the New node button.</p><ul>' +
        '<li>Double-click empty space near a node to create a linked child; hold <kbd>Shift</kbd> to create a floating node.</li>' +
        '<li>Drag a node: the whole branch moves and its links follow live.</li>' +
        '<li>Zoom at the bottom right; press <kbd>G</kbd> to fit the map.</li></ul>' },
      { id: 'map', title: 'Maps and nodes', html:
        '<p>Each tab is a different view of the same corpus. Switch structure between tree, org chart and free links; auto arrange resets manual positions.</p>' +
        '<p>The right panel edits the selected card: title, body, optional note, tags, category and style (shape, fill, icon, size, link).</p>' },
      { id: 'edge', title: 'Links', html:
        '<p>Press Link, then click the source and the target. Choose a type, add a note, pick a colour or mark it doubtful. Double-click a link to edit it; doubtful links appear in Check.</p>' },
      { id: 'corpus', title: 'Corpus, search and check', html:
        '<p>Cards are the source of truth. Search covers titles, bodies, notes and tags, tolerates typos and simplified/traditional variants; filters can be saved as views.</p>' +
        '<p>Check lists unmapped cards, isolated nodes, doubtful links, duplicates and broken links. History rolls back; trash keeps deleted cards.</p>' },
      { id: 'io', title: 'Import and backup', html:
        '<p>Import XMind, OPML or Markdown outlines; they become the same corpus. Backup writes one readable .wef JSON file; restore can merge or replace.</p>' },
      { id: 'ai', title: 'AI in one minute', html:
        '<p>AI drafts maps, organizes nodes, summarizes and reviews. Everything stays a draft until you confirm item by item; review only annotates.</p>' },
      { id: 'keys', title: 'Keyboard', html:
        '<p><kbd>N</kbd> new card · <kbd>Ctrl</kbd>+<kbd>K</kbd> search · <kbd>Ctrl</kbd>+<kbd>S</kbd> save · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>F</kbd> focus · <kbd>G</kbd> fit · <kbd>F11</kbd> full screen · <kbd>1</kbd>-<kbd>9</kbd> views.</p>' }
    ],
    ai: [
      { id: 'what', title: 'What AI does', html:
        '<p>Four actions: draft a map from notes, organize selected nodes, summarize, and review. Review never edits; every result is a draft you confirm.</p>' },
      { id: 'api', title: 'API and key', html:
        '<p>An API is the provider endpoint your app calls. The API key is a password tied to your account and billing; treat it like a password.</p>' },
      { id: 'setup', title: 'Set it up', html:
        '<p>1. Create an API key in the provider console. 2. Copy its Base URL and model id. 3. Paste address, model and key in Settings → AI, then press Test connection.</p>' },
      { id: 'providers', title: 'Common providers', html:
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Ollama</b> <code>http://127.0.0.1:11434/v1</code> (no key, tick local model).</p>' +
        '<p>Official sites: OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">Use only these official domains. Mirror or top-up sites found in search may be impostors; check the domain before pasting a key.</p>' },
      { id: 'errors', title: 'Errors and cost', html:
        '<p>401 key, 404 address, 429 quota, timeout, cannot connect. There is no silent retry.</p>' +
        '<p>You pay the provider per token. Only the selected scope is sent; local models cost nothing. Nothing leaves the machine unless you run an AI action.</p>' }
    ]
  };

  var ja = {
    guide: [
      { id: 'start', title: '5分で開始', html:
        '<p>新しいマップは中心トピック付きで開きます。名前を変え、<kbd>Tab</kbd> か「ノード追加」で子を増やします。</p><ul>' +
        '<li>ノードの近くの空白をダブルクリックすると子を作って接続します。<kbd>Shift</kbd> を押すと浮いたノードになります。</li>' +
        '<li>ノードをドラッグすると枝ごと動き、線もリアルタイムで追従します。</li>' +
        '<li>右下で拡大縮小、<kbd>G</kbd> で全体を表示します。</li></ul>' },
      { id: 'map', title: 'マップとノード', html:
        '<p>タブごとに同じ資料を別の見方で表示します。構造はツリー・組織図・自由リンクから選べ、自動整列で手動配置を戻せます。</p>' +
        '<p>右パネルでタイトル、本文、任意の注記、タグ、分類、スタイル（形・塗り・アイコン・文字サイズ・リンク）を編集します。</p>' },
      { id: 'edge', title: 'リンク', html:
        '<p>「リンク」を押し、始点と終点をクリックします。種類・説明・色・不確かを設定でき、ダブルクリックで編集します。不確かな線は点検に表示されます。</p>' },
      { id: 'corpus', title: '資料・検索・点検', html:
        '<p>カードが正本です。検索はタイトル・本文・注記・タグを対象に、誤字や簡体/繁体の差も許容します。条件はビューとして保存できます。</p>' +
        '<p>点検は未配置カード、孤立ノード、不確かな線、重複、切断を一覧します。履歴から巻き戻せ、削除はゴミ箱に残ります。</p>' },
      { id: 'io', title: '読み込みとバックアップ', html:
        '<p>XMind・OPML・Markdown を取り込むと同じ正本になります。バックアップは読める .wef（JSON）1ファイルで、復元は統合か上書きを選べます。</p>' },
      { id: 'ai', title: 'AI の基本', html:
        '<p>AI は草案作成・整理・要約・校閲を行います。すべて草案で、一件ずつ確認するまで正本に入りません。校閲は注記だけです。</p>' },
      { id: 'keys', title: 'キーボード', html:
        '<p><kbd>N</kbd> 新規カード · <kbd>Ctrl</kbd>+<kbd>K</kbd> 検索 · <kbd>Ctrl</kbd>+<kbd>S</kbd> 保存 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 元に戻す · <kbd>F</kbd> フォーカス · <kbd>G</kbd> 全体表示 · <kbd>F11</kbd> 全画面 · <kbd>1</kbd>-<kbd>9</kbd> 画面切替。</p>' }
    ],
    ai: [
      { id: 'what', title: 'AI でできること', html:
        '<p>草案作成・整理・要約・校閲の4つです。校閲は書き換えず、結果はすべて確認待ちの草案です。</p>' },
      { id: 'api', title: 'API とキー', html:
        '<p>API はサービス事業者の窓口で、アプリがそこへ文章を送ります。API キーはアカウントと請求に結びついたパスワードです。他人に見せないでください。</p>' },
      { id: 'setup', title: '設定手順', html:
        '<p>1. 事業者のコンソールで API キーを作成。2. Base URL とモデル名を控える。3. 設定 → AI に3つを貼り、「接続テスト」を押す。</p>' },
      { id: 'providers', title: '主なサービス', html:
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Ollama</b> <code>http://127.0.0.1:11434/v1</code>（キー不要・ローカルモデルにチェック）。</p>' +
        '<p>公式サイト：OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>。</p>' +
        '<p class="help-warn">上記の公式ドメインだけを使ってください。検索で出るミラーや代行チャージは偽サイトの可能性があります。キーを貼る前にドメインを確認してください。</p>' },
      { id: 'errors', title: 'エラーと費用', html:
        '<p>401 キー、404 アドレス、429 枠、タイムアウト、接続不可。自動再試行はしません。</p>' +
        '<p>費用は事業者がトークン単位で請求します。送るのは選択範囲だけ。ローカルモデルは無料で、AI を実行しない限り外部へ出ません。</p>' }
    ]
  };

  var es = {
    guide: [
      { id: 'start', title: 'Primeros pasos', html:
        '<p>Un mapa nuevo abre con un tema central. Renómbralo y añade hijos con <kbd>Tab</kbd> o el botón Nuevo nodo.</p><ul>' +
        '<li>Doble clic cerca de un nodo crea un hijo enlazado; con <kbd>Mayús</kbd> creas un nodo flotante.</li>' +
        '<li>Al arrastrar un nodo se mueve toda la rama y sus enlaces siguen en vivo.</li>' +
        '<li>Zoom abajo a la derecha; <kbd>G</kbd> ajusta el mapa.</li></ul>' },
      { id: 'map', title: 'Mapas y nodos', html:
        '<p>Cada pestaña es otra vista del mismo corpus. Cambia entre árbol, organigrama y enlaces libres; ordenar reinicia las posiciones manuales.</p>' +
        '<p>El panel derecho edita la tarjeta: título, cuerpo, nota opcional, etiquetas, categoría y estilo (forma, relleno, icono, tamaño, enlace).</p>' },
      { id: 'edge', title: 'Enlaces', html:
        '<p>Pulsa Enlazar y haz clic en origen y destino. Elige tipo, nota, color o marca dudoso. Doble clic edita; los dudosos aparecen en Revisión.</p>' },
      { id: 'corpus', title: 'Corpus, búsqueda y revisión', html:
        '<p>Las tarjetas son la fuente de verdad. La búsqueda cubre títulos, cuerpos, notas y etiquetas, tolera errores y variantes; los filtros se guardan como vistas.</p>' +
        '<p>Revisión lista tarjetas sin mapa, nodos aislados, enlaces dudosos, duplicados y rotos. El historial revierte; la papelera conserva lo borrado.</p>' },
      { id: 'io', title: 'Importar y copias', html:
        '<p>Importa XMind, OPML o Markdown; todo pasa al mismo corpus. La copia es un .wef JSON legible; restaurar puede combinar o reemplazar.</p>' },
      { id: 'ai', title: 'IA en un minuto', html:
        '<p>La IA crea borradores, organiza, resume y revisa. Todo sigue siendo borrador hasta que confirmes uno a uno; revisar solo anota.</p>' },
      { id: 'keys', title: 'Teclado', html:
        '<p><kbd>N</kbd> tarjeta · <kbd>Ctrl</kbd>+<kbd>K</kbd> buscar · <kbd>Ctrl</kbd>+<kbd>S</kbd> guardar · <kbd>Ctrl</kbd>+<kbd>Z</kbd> deshacer · <kbd>F</kbd> enfoque · <kbd>G</kbd> ajustar · <kbd>F11</kbd> pantalla completa · <kbd>1</kbd>-<kbd>9</kbd> vistas.</p>' }
    ],
    ai: [
      { id: 'what', title: 'Qué hace la IA', html:
        '<p>Cuatro acciones: borrador, organizar, resumir y revisar. Revisar no edita; todo resultado es un borrador que tú confirmas.</p>' },
      { id: 'api', title: 'API y clave', html:
        '<p>Una API es el punto del proveedor al que la app envía texto. La clave es una contraseña ligada a tu cuenta y facturación; no la compartas.</p>' },
      { id: 'setup', title: 'Configuración', html:
        '<p>1. Crea una clave en la consola del proveedor. 2. Copia su Base URL y el modelo. 3. Pega los tres en Ajustes → IA y pulsa Probar conexión.</p>' },
      { id: 'providers', title: 'Proveedores habituales', html:
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Ollama</b> <code>http://127.0.0.1:11434/v1</code> (sin clave, marca modelo local).</p>' +
        '<p>Sitios oficiales: OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">Usa solo estos dominios oficiales. Los sitios espejo o de recarga que aparecen en búsquedas pueden ser falsos; comprueba el dominio antes de pegar una clave.</p>' },
      { id: 'errors', title: 'Errores y coste', html:
        '<p>401 clave, 404 dirección, 429 cuota, tiempo agotado, sin conexión. No hay reintentos silenciosos.</p>' +
        '<p>Pagas al proveedor por token. Solo se envía el alcance elegido; un modelo local no cuesta. Nada sale del equipo si no ejecutas IA.</p>' }
    ]
  };

  var fr = {
    guide: [
      { id: 'start', title: 'Premiers pas', html:
        '<p>Une nouvelle carte s’ouvre avec un sujet central. Renommez-le, puis ajoutez des enfants avec <kbd>Tab</kbd> ou le bouton Nouveau nœud.</p><ul>' +
        '<li>Double-cliquez près d’un nœud pour créer un enfant relié ; avec <kbd>Maj</kbd>, le nœud reste flottant.</li>' +
        '<li>Glisser un nœud déplace toute la branche, liens compris, en direct.</li>' +
        '<li>Zoom en bas à droite ; <kbd>G</kbd> ajuste la carte.</li></ul>' },
      { id: 'map', title: 'Cartes et nœuds', html:
        '<p>Chaque onglet est une vue du même corpus. Passez d’un arbre à un organigramme ou à des liens libres ; la disposition auto efface les positions manuelles.</p>' +
        '<p>Le panneau de droite modifie la fiche : titre, corps, note facultative, étiquettes, catégorie et style (forme, remplissage, icône, taille, lien).</p>' },
      { id: 'edge', title: 'Liens', html:
        '<p>Cliquez sur Relier, puis sur la source et la cible. Choisissez type, note, couleur ou douteux. Double-clic pour modifier ; les liens douteux apparaissent dans Vérification.</p>' },
      { id: 'corpus', title: 'Corpus, recherche et vérification', html:
        '<p>Les fiches sont la source de vérité. La recherche couvre titres, corps, notes et étiquettes, tolère fautes et variantes ; les filtres se sauvent en vues.</p>' +
        '<p>Vérification liste fiches hors carte, nœuds isolés, liens douteux, doublons et liens cassés. L’historique revient en arrière ; la corbeille conserve les fiches.</p>' },
      { id: 'io', title: 'Import et sauvegardes', html:
        '<p>Importez XMind, OPML ou Markdown : tout rejoint le même corpus. La sauvegarde est un seul .wef JSON lisible ; la restauration fusionne ou remplace.</p>' },
      { id: 'ai', title: 'IA en une minute', html:
        '<p>L’IA rédige des brouillons, organise, résume et relit. Tout reste brouillon jusqu’à votre validation, élément par élément ; la relecture ne fait qu’annoter.</p>' },
      { id: 'keys', title: 'Clavier', html:
        '<p><kbd>N</kbd> fiche · <kbd>Ctrl</kbd>+<kbd>K</kbd> rechercher · <kbd>Ctrl</kbd>+<kbd>S</kbd> enregistrer · <kbd>Ctrl</kbd>+<kbd>Z</kbd> annuler · <kbd>F</kbd> focus · <kbd>G</kbd> ajuster · <kbd>F11</kbd> plein écran · <kbd>1</kbd>-<kbd>9</kbd> vues.</p>' }
    ],
    ai: [
      { id: 'what', title: 'Ce que fait l’IA', html:
        '<p>Quatre actions : brouillon, organiser, résumer, relire. La relecture ne modifie jamais ; tout résultat est un brouillon à confirmer.</p>' },
      { id: 'api', title: 'API et clé', html:
        '<p>Une API est le point d’accès du fournisseur auquel l’app envoie du texte. La clé est un mot de passe lié à votre compte et à la facturation ; gardez-la privée.</p>' },
      { id: 'setup', title: 'Configuration', html:
        '<p>1. Créez une clé dans la console du fournisseur. 2. Copiez l’URL de base et le modèle. 3. Collez les trois dans Réglages → IA, puis Testez la connexion.</p>' },
      { id: 'providers', title: 'Fournisseurs courants', html:
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Ollama</b> <code>http://127.0.0.1:11434/v1</code> (sans clé, cochez modèle local).</p>' +
        '<p>Sites officiels : OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">N’utilisez que ces domaines officiels. Les sites miroirs ou de recharge trouvés dans une recherche peuvent être des imposteurs ; vérifiez le domaine avant de coller une clé.</p>' },
      { id: 'errors', title: 'Erreurs et coût', html:
        '<p>401 clé, 404 adresse, 429 quota, délai dépassé, connexion impossible. Aucun nouvel essai silencieux.</p>' +
        '<p>Vous payez le fournisseur au token. Seule la portée choisie est envoyée ; un modèle local est gratuit. Rien ne sort sans action IA.</p>' }
    ]
  };

  var ko = {
    guide: [
      { id: 'start', title: '5분 시작', html:
        '<p>새 맵은 중심 주제와 함께 열립니다. 이름을 바꾸고 <kbd>Tab</kbd> 또는 「새 노드」로 자식을 늘리세요.</p><ul>' +
        '<li>노드 근처 빈 곳을 더블클릭하면 자식을 만들어 연결합니다. <kbd>Shift</kbd>를 누르면 떠 있는 노드가 됩니다.</li>' +
        '<li>노드를 끌면 가지 전체가 움직이고 연결선도 실시간으로 따라옵니다.</li>' +
        '<li>오른쪽 아래에서 확대/축소, <kbd>G</kbd>로 화면에 맞춥니다.</li></ul>' },
      { id: 'map', title: '맵과 노드', html:
        '<p>탭마다 같은 자료를 다른 방식으로 봅니다. 구조는 트리·조직도·자유 연결 중에서 고르고, 자동 정렬은 수동 배치를 지웁니다.</p>' +
        '<p>오른쪽 패널에서 제목, 본문, 선택 메모, 태그, 분류, 스타일(모양·채우기·아이콘·크기·링크)을 편집합니다.</p>' },
      { id: 'edge', title: '연결', html:
        '<p>「연결」을 누르고 시작과 대상을 차례로 클릭합니다. 종류·설명·색·불확실을 정하고 더블클릭으로 편집합니다. 불확실한 연결은 점검에 표시됩니다.</p>' },
      { id: 'corpus', title: '자료·검색·점검', html:
        '<p>카드가 원본입니다. 검색은 제목·본문·메모·태그를 대상으로 하며 오타와 간체/번체 차이를 허용합니다. 조건은 보기로 저장할 수 있습니다.</p>' +
        '<p>점검은 맵에 없는 카드, 고립 노드, 불확실한 연결, 중복, 끊긴 연결을 보여 줍니다. 기록에서 되돌릴 수 있고 삭제는 휴지통에 남습니다.</p>' },
      { id: 'io', title: '가져오기와 백업', html:
        '<p>XMind·OPML·Markdown을 가져오면 같은 원본이 됩니다. 백업은 읽을 수 있는 .wef(JSON) 한 파일이며 복원은 병합 또는 덮어쓰기를 고릅니다.</p>' },
      { id: 'ai', title: 'AI 한눈에', html:
        '<p>AI는 초안 작성, 정리, 요약, 검토를 합니다. 모두 초안이며 하나씩 확인하기 전에는 원본에 들어가지 않습니다. 검토는 주석만 답니다.</p>' },
      { id: 'keys', title: '키보드', html:
        '<p><kbd>N</kbd> 새 카드 · <kbd>Ctrl</kbd>+<kbd>K</kbd> 검색 · <kbd>Ctrl</kbd>+<kbd>S</kbd> 저장 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 실행 취소 · <kbd>F</kbd> 포커스 · <kbd>G</kbd> 화면 맞춤 · <kbd>F11</kbd> 전체 화면 · <kbd>1</kbd>-<kbd>9</kbd> 화면 전환.</p>' }
    ],
    ai: [
      { id: 'what', title: 'AI가 하는 일', html:
        '<p>초안·정리·요약·검토 네 가지입니다. 검토는 고치지 않으며 모든 결과는 확인 전까지 초안입니다.</p>' },
      { id: 'api', title: 'API와 키', html:
        '<p>API는 서비스 제공자의 접점이며 앱이 이곳으로 글을 보냅니다. API 키는 계정과 결제에 연결된 비밀번호이므로 공유하지 마세요.</p>' },
      { id: 'setup', title: '설정 순서', html:
        '<p>1. 제공자 콘솔에서 API 키를 만듭니다. 2. Base URL과 모델명을 복사합니다. 3. 설정 → AI에 셋을 붙이고 「연결 테스트」를 누릅니다.</p>' },
      { id: 'providers', title: '주요 서비스', html:
        '<p><b>OpenAI</b> <code>https://api.openai.com/v1</code> · <b>DeepSeek</b> <code>https://api.deepseek.com/v1</code> · <b>Moonshot</b> <code>https://api.moonshot.cn/v1</code> · <b>Ollama</b> <code>http://127.0.0.1:11434/v1</code> (키 없음, 로컬 모델 체크).</p>' +
        '<p>공식 사이트: OpenAI <code>https://openai.com</code> · DeepSeek <code>https://www.deepseek.com</code> · Moonshot <code>https://www.moonshot.cn</code> · Zhipu <code>https://www.zhipuai.cn</code> · Alibaba Bailian <code>https://www.aliyun.com/product/bailian</code> · OpenRouter <code>https://openrouter.ai</code> · Ollama <code>https://ollama.com</code> · LM Studio <code>https://lmstudio.ai</code>.</p>' +
        '<p class="help-warn">위의 공식 도메인만 사용하세요. 검색에 나오는 미러나 대리 충전 사이트는 사칭일 수 있습니다. 키를 붙이기 전에 도메인을 확인하세요.</p>' },
      { id: 'errors', title: '오류와 비용', html:
        '<p>401 키, 404 주소, 429 한도, 시간 초과, 연결 불가. 자동 재시도는 없습니다.</p>' +
        '<p>비용은 제공자가 토큰 단위로 청구합니다. 선택한 범위만 보내며 로컬 모델은 무료입니다. AI를 실행하지 않으면 외부로 나가지 않습니다.</p>' }
    ]
  };

  CC.HELP_I18N = { en: en, ja: ja, es: es, fr: fr, ko: ko };
})();
