/* Built-in manual: product guide + AI/API guide */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};
  var U = CC.util;
  var t = function () { return window.t.apply(null, arguments); };

  var GUIDE = [
    {
      id: 'start', title: '五分钟上手',
      html: '<p>这是一套「资料为正本、图只是画法」的工具。卡片存内容，图存位置与连线；同一张卡片可以出现在多张图里，改一处，处处同步。</p>' +
        '<h3>第一次打开</h3><ol>' +
        '<li>软件会自动建一张图和一个「中心主题」，光标已在标题上，直接改名即可。</li>' +
        '<li>按 <kbd>Tab</kbd> 或点「新增节点」加子节点；双击画布空白也能加。</li>' +
        '<li>双击位置靠近某个节点（340px 内）会自动连成它的子节点；离得远则是一个悬浮节点。按住 <kbd>Shift</kbd> 双击永远是悬浮，不连线。</li>' +
        '<li>拖动节点时连线会实时跟随；拖父节点会带走整个分支。松手即保存。</li>' +
        '<li>右下角可以缩放；工具栏「自动排布」会重新整理树。</li></ol>' +
        '<h3>界面分区</h3><ul>' +
        '<li>顶部：导航（首页/图/大纲/资料/检索/检查/记录/回收站）、搜索、撤销重做、AI、主题、语言、设置、帮助。</li>' +
        '<li>第二行：图标签。点「+」新建图，右键标签可改名、复制、存模板、删除。</li>' +
        '<li>右侧：属性面板。选中节点后出现，改标题、正文、附注、标签、分类、样式。</li></ul>'
    },
    {
      id: 'map', title: '图与视图',
      html: '<h3>新建与切换</h3><p>图标签栏的「+」新建一张图；点标签切换。每张图有自己的摆位和连线，但卡片内容共用一份正本。</p>' +
        '<h3>三种结构</h3><ul>' +
        '<li><b>树状</b>：从左到右的层级，最常用。</li>' +
        '<li><b>组织图</b>：从上到下，适合汇报关系、目录。</li>' +
        '<li><b>自由连线</b>：节点位置完全由你摆，适合概念图。</li></ul>' +
        '<p>切换结构时，已有摆位会被保留或转换；「自动排布」会清掉手动偏移，回到自动布局。</p>' +
        '<h3>焦点模式</h3><p>选中节点后点工具栏的准星，只显示它和相邻一层，退出再点一次。适合在大图里看局部。</p>' +
        '<h3>模板</h3><p>把当前图右键标签「存为模板」，以后在图标签「+」旁边或首页从模板新建，会复制结构和卡片内容。</p>' +
        '<h3>导出</h3><p>工具栏「…」里有：导出 PNG（整图或当前视野）、导出 SVG、导出 Markdown 大纲。超过 2600 个节点时只导出当前视野，避免卡死。</p>'
    },
    {
      id: 'node', title: '节点与卡片',
      html: '<h3>新增</h3><p>三种方式：工具栏「新增节点」、右键节点「新增子节点/同级」、双击画布空白。靠近已有节点时会自动连线。</p>' +
        '<h3>编辑</h3><p>双击节点打开右侧属性面板。标题是图上显示的文字；正文是详细内容；附注是可留空的补充，不影响节点本身。</p>' +
        '<p>标题为空时，图上显示正文第一行；正文也空则显示灰色的「未命名」，不会是白板。</p>' +
        '<h3>样式</h3><ul><li>形状：圆角 / 方形 / 胶囊。</li><li>填充：8 个色板；文字颜色会自动取对比色。</li><li>图标：填一个 emoji 或字符，显示在标题左侧。</li><li>字号：小 / 中 / 大；B 切换加粗。</li><li>链接：填 https://…，点右侧按钮用系统浏览器打开。</li></ul>' +
        '<h3>其他操作</h3><ul><li>折叠：有子节点的右上角会显示「+N」，点它收起/展开。</li><li>复制：右键「复制节点」，或 <kbd>Ctrl</kbd>+<kbd>D</kbd>。</li><li>对齐：多选后右键「左对齐 / 顶对齐」。</li><li>删除：<kbd>Delete</kbd>，进入回收站，可取回。</li><li>区域框：选中多个节点，工具栏「…」→「区域框」，给一组节点加虚线范围。</li></ul>'
    },
    {
      id: 'edge', title: '连线',
      html: '<h3>手动拉线</h3><ol><li>点工具栏「拉线」，按钮变亮。</li><li>点起点节点，再点终点节点。</li><li>在弹窗里选类型（层次/同义/反义/因果/例证/对照/引用/自定），可写说明、选颜色、勾「标为存疑」。</li></ol>' +
        '<p>按 <kbd>Esc</kbd> 取消拉线。连线的说明只在 55% 以上缩放显示。</p>' +
        '<h3>编辑与删除</h3><p>双击连线打开同一个弹窗；右键连线可以标存疑或删除。存疑连线在图上用橙色虚线加「?」，会出现在「检查」里。</p>' +
        '<h3>层次线与其他线</h3><p>「层次」决定树的父子关系（布局会用它）；同义、因果等只是关系，不影响树结构，画成带箭头的曲线。</p>'
    },
    {
      id: 'canvas', title: '画布上的编辑与选择',
      html: '<h3>就地改字</h3><p>双击节点，标题会变成一个输入框，直接在上面打字就行，不用去右侧面板。<kbd>Enter</kbd> 提交、<kbd>Esc</kbd> 取消，点到别处也会提交。改完立刻生效，布局会自动重排，这次改动也能照常撤销重做。</p>' +
        '<p>想改整张卡的正文、附注或样式，还是用右键「编辑」打开右侧属性面板。</p>' +
        '<h3>框选</h3><p>在空白处按住 <kbd>Shift</kbd> 拖出一个矩形，框内的节点会一起被选中。按住 <kbd>Shift</kbd> 再框一次是在原选择上追加。</p>' +
        '<p>也可以点工具栏上的虚线方框按钮进入框选模式，此后直接拖动就是框选，不必每次按 <kbd>Shift</kbd>。再点一次该按钮退出。</p>' +
        '<p>框选之后可以整批拖动、批量连线，或用 <kbd>Delete</kbd> 一起删除。</p>' +
        '<h3>缩略图导航</h3><p>画布左下角的小图是整张地图的缩略图，浅色方块表示当前视野。点一下或按住拖动，视口就会跳到对应位置；在几十万张卡片的大图里，这是最快的找路方式。</p>' +
        '<p>用工具栏的地图图标按钮或画布右键「更多」菜单可以显示/隐藏缩略图。这个选择按图保存，换一张图各自记住。</p>'
    },
    {
      id: 'outline', title: '大纲视图',
      html: '<p>大纲与图是同一份数据：这里改标题、调层级，图上立刻变；反过来也一样。</p><ul>' +
        '<li>点标题直接改，回车提交。</li><li><kbd>Tab</kbd> 降一级，<kbd>Shift</kbd>+<kbd>Tab</kbd> 升一级。</li><li><kbd>Enter</kbd> 新增同级；行尾「+」新增子项。</li><li>顶部可全部展开/收起。</li></ul>' +
        '<p>大纲只显示当前选中的那张图。</p>'
    },
    {
      id: 'cards', title: '资料库',
      html: '<p>资料库是正本：每张卡片可以自由填写，不预设固定栏位。</p>' +
        '<h3>字段</h3><ul><li>标题、正文、附注（选用）、标签、分类、来源。</li><li>来源记录：手记 / 笔记 / 导入 / AI 起草，带时间，方便追溯。</li></ul>' +
        '<h3>整理</h3><ul><li>筛选：全部 / 未入图 / 已入图，按标签、语言（已移除界面入口）、时间过滤。</li><li>勾选多张后底部出现批量条：加标签、设分类、移入回收站。</li><li>相近内容：属性面板底部会提示相似卡片，可合并或忽略。合并会把标签、附注、来源并过去，原卡片进回收站。</li></ul>' +
        '<p>列表一次显示 400 条，可用筛选或「加载更多」查看后面的。</p>'
    },
    {
      id: 'search', title: '检索',
      html: '<h3>全文</h3><p>一次搜标题、正文、附注、标签。支持错字近似和简繁互通（「笔记」能搜到「筆記」）。</p>' +
        '<h3>筛选</h3><p>标签、是否入图、更新时间、是否有待处理批注，可组合。常用条件点「存为视图」，下次一键套用。</p>' +
        '<h3>关系</h3><p>按连线类型列出全部关系，例如所有同义关系、所有存疑连线。</p>' +
        '<h3>结构</h3><p>找孤立节点、最深分支、重复节点、断线（端点已删除的连线）。</p>' +
        '<h3>批量操作</h3><p>勾选结果后可：由结果成图、批量加标签、批量连到某个节点。</p>'
    },
    {
      id: 'health', title: '检查（原「体检」）',
      html: '<p>检查页只做提示，不会改动资料。五类内容：</p><ul>' +
        '<li><b>未入图的资料</b>：卡片存在，但没放进任何一张图。可以一键为它们成图。</li>' +
        '<li><b>孤立节点</b>：图里有节点没有任何连线，通常是漏连了。</li>' +
        '<li><b>存疑连线</b>：拉线时勾了「存疑」，或 AI 校阅标出的不确定关系。</li>' +
        '<li><b>重复内容</b>：标题/正文高度相似，建议合并。</li>' +
        '<li><b>断线</b>：连线的另一头已在回收站或被删除。</li></ul>' +
        '<p>点条目可以直接跳到对应图或卡片处理。</p>'
    },
    {
      id: 'history', title: '记录、快照与回收站',
      html: '<h3>变更记录</h3><p>每次结构性修改都会记一条。点「回退到此前」能把整份资料恢复到那一步之前，回退前会自动存一个还原点。</p>' +
        '<h3>还原点</h3><p>导入、采纳 AI、批量整理、合并前会自动留存；也可以手动「立即留存还原点」并命名。自动快照最多 12 个，手动快照单独保留。</p>' +
        '<h3>撤销/重做</h3><p><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>，顶部也有按钮。</p>' +
        '<h3>回收站</h3><p>删除的卡片在这里，可单张取回或全部取回；「彻底删除」不可撤销。连线会保留，取回后自动恢复。</p>'
    },
    {
      id: 'io', title: '导入与备份',
      html: '<h3>导入</h3><p>支持 XMind（.xmind）、OPML、Markdown / TXT 大纲。导入后统一变成卡片与图，不保留原图文件。可以选择「转成一张新图」或「只加入资料库」。</p>' +
        '<p>导入后会显示自检报告：成功多少、跳过多少（空标题）、明细。导入的卡片会记录来源，方便追溯。</p>' +
        '<h3>备份</h3><p>设置 → 一键备份，写成一个可读的 .wef（JSON）。还原时可「合并」或「覆盖」；合并按 id 去重。</p>' +
        '<p>密钥永远不会写进备份。换机器后需要重新填一次密钥。</p>' +
        '<h3>数据在哪</h3><p>设置里显示资料路径，可一键在文件夹中显示。删除软件不会自动删资料，请自行备份。</p>'
    },
    {
      id: 'settings', title: '设置、隐私与费用',
      html: '<h3>语言与主题</h3><p>界面语言共 7 种：简体中文、繁體中文、英語、日本語、西班牙語、法語、韓語。全部界面文案与内置手册均为人工翻译，切换后同一屏只出现一种语言。默认「跟随系统」：用电脑语言，匹配不到就用英文。</p><p>主题有明亮、纸感、暗色、墨色。</p>' +
        '<h3>AI 服务</h3><p>自备服务地址、模型名与密钥；也可以勾「使用本机模型」，不填密钥直连 Ollama / LM Studio。详见「AI 与 API」页。</p>' +
        '<h3>隐私</h3><ul><li>无账号、无遥测、无云同步。</li><li>只有你主动点 AI 动作时，才会把所选范围的文字发到你填的地址。</li><li>密钥用系统加密保存在本机，不写日志、不进备份，可一键清除。</li></ul>' +
        '<h3>费用</h3><p>软件本身免费、无订阅。AI 费用由你的服务商按用量收取。</p>'
    },
    {
      id: 'keys', title: '快捷键',
      html: '<table class="help-table"><tr><th>按键</th><th>作用</th></tr>' +
        '<tr><td><kbd>N</kbd></td><td>新增卡片</td></tr>' +
        '<tr><td><kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>全文检索</td></tr>' +
        '<tr><td><kbd>Ctrl</kbd>+<kbd>S</kbd></td><td>立即保存</td></tr>' +
        '<tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd></td><td>撤销 / 重做</td></tr>' +
        '<tr><td><kbd>Ctrl</kbd>+<kbd>N</kbd></td><td>快速新增卡片</td></tr>' +
        '<tr><td><kbd>Ctrl</kbd>+<kbd>D</kbd></td><td>复制选中节点</td></tr>' +
        '<tr><td><kbd>Delete</kbd></td><td>删除选中节点（进回收站）</td></tr>' +
        '<tr><td><kbd>Enter</kbd></td><td>编辑选中节点</td></tr>' +
        '<tr><td><kbd>F</kbd> / <kbd>G</kbd></td><td>聚焦 / 适应窗口（图视图）</td></tr>' +
        '<tr><td><kbd>F11</kbd></td><td>全屏</td></tr>' +
        '<tr><td><kbd>1</kbd>–<kbd>9</kbd></td><td>切换视图</td></tr>' +
        '<tr><td><kbd>Esc</kbd></td><td>取消 / 关闭</td></tr></table>'
    }
  ];

  var AI = [
    {
      id: 'ai-what', title: 'AI 能做什么',
      html: '<p>AI 是助手，不是自动改稿器。四个动作：</p><ul>' +
        '<li><b>起草</b>：贴入笔记或文档，生成一份脑图草稿（节点+连线），逐条勾选后才写入。</li>' +
        '<li><b>整理</b>：对选中节点做归纳、合并、改名、调整层级，产出建议清单。</li>' +
        '<li><b>简述</b>：对节点、附注或长文做摘要，可以附到卡片附注。</li>' +
        '<li><b>校阅</b>：只批注不改动，指出事实错误、关系误用、重复矛盾、结构缺漏、命名不一致，并给把握程度；可只批注本图，或与全库比对。</li></ul>' +
        '<p>所有结果先是草稿，必须逐条确认才进正本；关掉面板不会写入任何东西。</p>'
    },
    {
      id: 'ai-api', title: 'API 与密钥是什么',
      html: '<p><b>API</b>（应用程序接口）是服务商给程序用的入口。你不在网页里聊天，而是让软件把文字发到一个地址，服务返回结果。</p>' +
        '<p><b>API Key（密钥）</b>是一串类似 <code>sk-...</code> 的密码，用来证明「这次调用是你的」，费用记在你账上。它等同于密码：不要发人、不要截图、不要提交到代码库。</p>' +
        '<p>为什么自备：软件不收款、不代购，也不经过我们的服务器。你直接和自己的服务商结算，停用软件也不会影响你的额度。</p>' +
        '<h3>兼容格式</h3><p>软件按 OpenAI 的 <code>/chat/completions</code> 格式调用，绝大多数服务都兼容这种格式；不兼容的（如只提供自家协议的）不能直接用。</p>'
    },
    {
      id: 'ai-apply', title: '怎么申请（通用步骤）',
      html: '<ol>' +
        '<li>打开服务商官网，注册账号（通常要邮箱或手机号）。</li>' +
        '<li>进入「控制台 / API Keys / 开发者中心」。</li>' +
        '<li>创建 API Key，复制保存（多数只显示一次）。</li>' +
        '<li>充值或领取免费额度（有的服务需要先实名或绑定支付方式）。</li>' +
        '<li>在服务商文档里确认两件事：<b>Base URL</b>（接口地址）和<b>模型名</b>（model）。</li>' +
        '<li>回到本软件：设置 → AI 服务，填地址、模型、密钥，点「测试连接」。</li></ol>' +
        '<p class="help-warn">各家后台界面会改版，按钮名称可能不同；认准「API Key」和「Base URL / endpoint」这两个词即可。</p>'
    },
    {
      id: 'ai-providers', title: '常见服务商对照',
      html: '<p class="help-warn">第二列是官网，第三列才是给软件用的 API 地址。API 地址粘到浏览器里不会有网页，别当成官网。</p>' +
        '<table class="help-table"><tr><th>服务</th><th>官网</th><th>API 地址（Base URL）</th><th>模型名示例</th><th>说明</th></tr>' +
        '<tr><td>OpenAI</td><td><a href="https://openai.com" target="_blank" rel="noreferrer">https://openai.com</a></td><td><code>https://api.openai.com/v1</code></td><td><code>gpt-4o-mini</code></td><td>需海外支付方式，国内访问可能受限</td></tr>' +
        '<tr><td>DeepSeek</td><td><a href="https://www.deepseek.com" target="_blank" rel="noreferrer">https://www.deepseek.com</a></td><td><code>https://api.deepseek.com/v1</code></td><td><code>deepseek-chat</code></td><td>国内可直连，价格低，中文好</td></tr>' +
        '<tr><td>月之暗面 Kimi</td><td><a href="https://www.moonshot.cn" target="_blank" rel="noreferrer">https://www.moonshot.cn</a></td><td><code>https://api.moonshot.cn/v1</code></td><td><code>moonshot-v1-8k</code></td><td>国内直连</td></tr>' +
        '<tr><td>智谱</td><td><a href="https://www.zhipuai.cn" target="_blank" rel="noreferrer">https://www.zhipuai.cn</a></td><td><code>https://open.bigmodel.cn/api/paas/v4</code></td><td><code>glm-4-flash</code></td><td>有免费模型，注意地址不带 /v1</td></tr>' +
        '<tr><td>阿里百炼</td><td><a href="https://www.aliyun.com/product/bailian" target="_blank" rel="noreferrer">https://www.aliyun.com/product/bailian</a></td><td><code>https://dashscope.aliyuncs.com/compatible-mode/v1</code></td><td><code>qwen-plus</code></td><td>兼容模式地址较长</td></tr>' +
        '<tr><td>OpenRouter</td><td><a href="https://openrouter.ai" target="_blank" rel="noreferrer">https://openrouter.ai</a></td><td><code>https://openrouter.ai/api/v1</code></td><td><code>openai/gpt-4o-mini</code></td><td>一个密钥调用多家模型</td></tr>' +
        '<tr><td>本机 Ollama</td><td><a href="https://ollama.com" target="_blank" rel="noreferrer">https://ollama.com</a></td><td><code>http://127.0.0.1:11434/v1</code></td><td><code>llama3.1</code> / <code>qwen2.5</code></td><td>不填密钥，勾「使用本机模型」</td></tr>' +
        '<tr><td>本机 LM Studio</td><td><a href="https://lmstudio.ai" target="_blank" rel="noreferrer">https://lmstudio.ai</a></td><td><code>http://127.0.0.1:1234/v1</code></td><td>以 LM Studio 显示为准</td><td>需在 LM Studio 里启动 Local Server</td></tr></table>' +
        '<p>API 地址一般填到 <code>/v1</code> 为止（智谱是 <code>/api/paas/v4</code>），软件会自动补 <code>/chat/completions</code>。填错了也能自动纠正一次。</p>' +
        '<h3>密钥页（复制密钥用）</h3>' +
        '<p>OpenAI <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com/api-keys</a> · ' +
        'DeepSeek <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">platform.deepseek.com/api_keys</a> · ' +
        '月之暗面 <a href="https://platform.moonshot.cn/console/api-keys" target="_blank" rel="noreferrer">platform.moonshot.cn/console/api-keys</a> · ' +
        '智谱 <a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank" rel="noreferrer">open.bigmodel.cn/usercenter/apikeys</a> · ' +
        '阿里百炼 <a href="https://bailian.console.aliyun.com" target="_blank" rel="noreferrer">bailian.console.aliyun.com</a> · ' +
        'OpenRouter <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a></p>' +
        '<p class="help-warn">只使用这些官方域名。搜索里的「镜像站」「代充站」可能是仿冒站点，输入密钥前先核对域名。</p>'
    },
    {
      id: 'ai-local', title: '用本机模型（不花钱）',
      html: '<h3>Ollama</h3><ol><li>安装 Ollama，打开终端执行 <code>ollama pull qwen2.5</code>（或 llama3.1）。</li><li>确认 <code>ollama list</code> 里有模型。</li><li>软件里地址填 <code>http://127.0.0.1:11434/v1</code>，模型填 <code>qwen2.5</code>，勾「使用本机模型」，密钥留空。</li><li>点「测试连接」。</li></ol>' +
        '<h3>LM Studio</h3><ol><li>安装后在「Discover」下载一个模型。</li><li>打开左侧「Local Server」，Start Server（默认 1234 端口）。</li><li>地址填 <code>http://127.0.0.1:1234/v1</code>，模型名复制界面上显示的标识。</li></ol>' +
        '<p>本机模型的速度取决于显卡与内存；7B–14B 模型通常够做起草和校阅，长文会慢。离线也能用，数据不出本机。</p>'
    },
    {
      id: 'ai-fill', title: '在软件里怎么填',
      html: '<ol><li>顶部「设置」→「AI 服务」。</li><li>服务地址：粘贴 Base URL。</li><li>模型名称：粘贴服务商文档里的 model id，必须完全一致。</li><li>密钥：粘贴 API Key（只存本机，界面不会回显）。</li><li>点「测试连接」：成功会显示毫秒数；失败会直接说原因。</li></ol>' +
        '<p>测试成功后，顶部 AI 按钮不再灰。打开 AI 面板，选起草/整理/简述/校阅，先用一小段文字试。</p>' +
        '<h3>范围</h3><p>默认只送选中的节点或分支；「与全库比对」会送更多文字，费用更高。面板会标注发送范围。</p>'
    },
    {
      id: 'ai-errors', title: '错误码与排查',
      html: '<table class="help-table"><tr><th>提示</th><th>原因</th><th>怎么办</th></tr>' +
        '<tr><td>401 / 403</td><td>密钥无效、过期或没有该模型权限</td><td>重新复制密钥；确认账号已开通该模型</td></tr>' +
        '<tr><td>404</td><td>地址不对（多数是漏了 /v1 或多写了路径）</td><td>按上面的对照表重填；别填到 /chat/completions 之后</td></tr>' +
        '<tr><td>429</td><td>请求太频繁或额度用尽</td><td>等一会儿；检查余额与限流</td></tr>' +
        '<tr><td>超时</td><td>模型太久没返回（长文、慢模型、网络差）</td><td>缩小范围或换更快的模型</td></tr>' +
        '<tr><td>连不上</td><td>地址错、断网、本机模型没启动</td><td>浏览器打开 Base URL 看是否有响应；本机模型先 Start Server</td></tr>' +
        '<tr><td>返回空 / 解析失败</td><td>模型没按 JSON 输出，或触发了内容限制</td><td>换模型重试；保留原始返回可手动复制</td></tr>' +
        '<tr><td>模型不存在</td><td>model 名写错或账号无权</td><td>从服务商文档复制完整 model id</td></tr></table>' +
        '<p>软件不会静默重试，失败就是失败，避免重复扣费。</p>'
    },
    {
      id: 'ai-cost', title: '费用与省法',
      html: '<p>按 token（字/词片段）计费，输入和输出分别计价。一次起草几百字通常几分钱到几毛钱，长文校阅会更高。</p><ul>' +
        '<li>先用「简述」看摘要，再决定是否要「整理/校阅」。</li>' +
        '<li>范围选「仅所选节点」，不要默认全库。</li>' +
        '<li>长文先删无关段落，或分几次送。</li>' +
        '<li>本机模型零调用费，只费电。</li>' +
        '<li>每次调用后界面会显示耗时与 token 用量，便于估算。</li></ul>' +
        '<p>余额与账单在服务商后台查看，本软件不记录也不代扣。</p>'
    },
    {
      id: 'ai-privacy', title: '发出去的是什么',
      html: '<p>只有你主动点「生成草稿」时才会联网。发送内容 = 你选的范围（标题、正文、附注、标签、父子关系）+ 你写的额外指令。</p>' +
        '<ul><li>不发：密钥以外的本机路径、其它图、回收站、历史记录、备份。</li><li>「与全库比对」会额外发送全库的标题与正文摘要，请确认没有敏感内容。</li><li>返回内容只存在本机，不上传任何地方。</li><li>不想联网时，用本机模型或直接不点 AI。</li></ul>'
    },
    {
      id: 'ai-faq', title: '常见问题',
      html: '<h3>为什么 AI 按钮是灰的？</h3><p>还没填地址/模型，或既没密钥也没勾本机模型。</p>' +
        '<h3>测试连接成功，但起草失败？</h3><p>多半是模型不支持 JSON 输出或上下文太长。换模型、缩短素材。</p>' +
        '<h3>可以让 AI 直接改我的资料吗？</h3><p>不会。所有结果先列草稿，逐条勾选才写入；校阅只批注。</p>' +
        '<h3>换电脑后 AI 不能用了？</h3><p>密钥不随备份走，重新填一次即可。</p>' +
        '<h3>会偷偷重试或扣费吗？</h3><p>不会自动重试；每次调用都需要你点。</p>'
    }
  ];

  function localizedGuide() {
    var lang = CC.i18n.getLang();
    if (lang === 'zh-TW') {
      return GUIDE.map(function (s) { return { id: s.id, title: CC.toTW(s.title), html: CC.toTW(s.html) }; });
    }
    if (lang !== 'zh-CN' && CC.HELP_I18N && CC.HELP_I18N[lang]) return CC.HELP_I18N[lang].guide;
    return GUIDE;
  }

  function localizedAI() {
    var lang = CC.i18n.getLang();
    if (lang === 'zh-TW') {
      return AI.map(function (s) { return { id: s.id, title: CC.toTW(s.title), html: CC.toTW(s.html) }; });
    }
    if (lang !== 'zh-CN' && CC.HELP_I18N && CC.HELP_I18N[lang]) return CC.HELP_I18N[lang].ai;
    return AI;
  }

  function mount(root, tab) {
    var current = tab === 'ai' ? 'ai' : 'guide';
    var sections = current === 'ai' ? localizedAI() : localizedGuide();
    var langNote = '';

    root.innerHTML =
      '<div class="help-view">' +
        '<aside class="help-side">' +
          '<div class="help-tabs">' +
            '<button class="help-tab' + (current === 'guide' ? ' active' : '') + '" data-tab="guide">' + U.esc(t('help.guide')) + '</button>' +
            '<button class="help-tab' + (current === 'ai' ? ' active' : '') + '" data-tab="ai">' + U.esc(t('help.ai')) + '</button>' +
          '</div>' +
          '<input class="input sm help-search" id="help-search" placeholder="' + U.esc(t('help.search')) + '">' +
          '<nav class="help-toc">' + sections.map(function (s) {
            return '<button class="help-toc-item" data-go="' + s.id + '">' + U.esc(s.title) + '</button>';
          }).join('') + '</nav>' +
        '</aside>' +
        '<div class="help-main">' +
          '<div class="help-head">' +
            '<h1>' + U.esc(current === 'ai' ? t('help.ai') : t('help.guide')) + '</h1>' +
            '<p>' + U.esc(current === 'ai' ? t('help.aiSub') : t('help.guideSub')) + '</p>' +
          '</div>' +
          langNote +
          '<div class="help-articles">' + sections.map(function (s) {
            return '<article class="help-article" id="h-' + s.id + '" data-search="' + U.esc((s.title + ' ' + s.html.replace(/<[^>]+>/g, ' ')).toLowerCase()) + '">' +
              '<h2>' + U.esc(s.title) + '</h2>' + s.html + '</article>';
          }).join('') + '</div>' +
        '</div>' +
      '</div>';

    root.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { mount(root, b.getAttribute('data-tab')); };
    });
    root.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () {
        var el = document.getElementById('h-' + b.getAttribute('data-go'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
    var input = root.querySelector('#help-search');
    input.oninput = function () {
      var q = input.value.trim().toLowerCase();
      root.querySelectorAll('.help-article').forEach(function (a) {
        a.style.display = !q || a.getAttribute('data-search').indexOf(q) >= 0 ? '' : 'none';
      });
      root.querySelectorAll('.help-toc-item').forEach(function (b) {
        var el = document.getElementById('h-' + b.getAttribute('data-go'));
        b.style.display = !q || (el && el.style.display !== 'none') ? '' : 'none';
      });
    };
  }

  CC.help = { mount: mount };
})();
