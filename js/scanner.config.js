// 统一的扫描器配置
const SCANNER_CONFIG = {
  // API 相关配置
  API: {
    PATTERN: /['"`](?:\/|\.\.\/|\.\/)[^\/\>\< \)\(\}\,\'\"\\](?:[^\^\>\< \)\(\,\'\"\\])*?['"`]|['"`][a-zA_Z0-9]+(?<!text|application)\/(?:[^\^\>\< \)\(\{\}\,\'\"\\])*?["'`]/g,
    // 图片文件模式
    IMAGE_PATTERN: /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|mp3|mp4|m4a|wav|swf)(?:\?[^'"]*)?$/i,
    // JS文件模式
    JS_PATTERN: /\.(js|jsx|ts|tsx|less)(?:\?[^'"]*)?$/i,
    // 文档文件模式
    DOC_PATTERN: /\.(pdf|doc|docx|xls|xlsx|ppt|exe|apk|zip|7z|dll|dmg|pptx|txt|rar|md|csv)(?:\?[^'"]*)?$/i,
    // css字体模式
    FONT_PATTERN: /\.(ttf|eot|woff|woff2|otf|css)(?:\?[^'"]*)?$/i,
    // 需要跳过的第三方JS库正则匹配规则
    SKIP_JS_PATTERNS: [
      // jQuery相关
      /^jquery([.-]?\d*\.?\d*\.?\d*)?(?:[\.-]cookie)?(?:[\.-]fancybox)?(?:[\.-]validate)?(?:[\.-]artDialog)?(?:[\.-]blockui)?(?:[\.-]pack)?(?:[\.-]base64)?(?:[\.-]md5)?(?:[\.-]min)?\.js$/i,
      /^(?:vue|vue-router|vuex)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
      // React相关
      /^(react|react-dom)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
      // Bootstrap相关
      /^bootstrap(?:\.bundle)?[.-]?\d*\.?\d*\.?\d*(?:[\.-]datepicker|datetimepicker)?(?:[\.-]zh-CN)?(?:[\.-]min)?\.js$/i,
      // UI框架相关
      /^(layui|lay|layer|liger|h-ui|element-ui|ueditor|kindeditor|ant-design)[.-]?\d*\.?\d*\.?\d*(?:[\.-]all)?(?:\.admin)?(?:[\.-]config)?(?:[\.-]min)?\.js$/i,
      // 图表相关
      /^(echarts|chart|highcharts)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,     
      // 工具库相关
      /^(lodash|moment|katex|tableexport|axios|plupload|pqgrid|md5)[.-]?\d*\.?\d*\.?\d*(?:\.full)?(?:\.min)?\.js$/i,     
      // 其他常用库
      /^(polyfill|modernizr|device|less|isotope.pkgd|lhgdialog|kendo.web|dataTables|editor|seajs-style|seajs-text|tinymce|jsencrypt|backbone|select2|underscore|ext-all|ext-unigui-min|exporter|buttons|v5_float_4)[.-]?\d*\.?\d*\.?\d*(?:[\.-]dev)?(?:[\.-]html5|bootstrap|print|full)?(?:[\.-]min)?\.js$/i,      
      // 日期选择器
      /^(datepicker|datetimepicker|wdatepicker|laydate)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,   
      // 语言包
      /^(?:zh|en|zh-cn|zh-tw|ja|ko)[.-]?\d*\.?\d*\.?\d*(?:\.min)?\.js$/i,
    ],
    // 需要过滤的内容类型
    FILTERED_CONTENT_TYPES: [  
      'multipart/form-data',
      'node_modules/',
      'pause/break',
      'partial/ajax',
      'chrome/',
      'firefox/',
      'edge/',
      'examples/element-ui',
      'static/js/',
      'static/css/',
      'stylesheet/less',
      'jpg/jpeg/png/pdf',
      //日期类型
      'yyyy/mm/dd',
      'dd/mm/yyyy',
      'mm/dd/yy',
      'yy/mm/dd',
      'm/d/Y',
      'm/d/y',
      'xx/xx',
      'zrender/vml/vml'
    ]
  },
  DOMAIN: {
    // 域名黑名单：不会展示以下域名
    BLACKLIST: [
      'el.datepicker.today','video.info','audio.info','console.info','beian.mps.gov.cn','developer.mozilla.org',
'po.info','gmail.com','www.baidu.com','w3.org','app.baidu.com','api.map.baidu.com','bs.baidu.com','maps.google.com','github.com','example.com','nexample.com',
      'obj.style.top',
      'window.top',
      'top-e.top',
      'mydragdiv.style.top',
      'container.style.top',
      'location.host',
      'page.info',
      'res.info',
      'console.info',
      'item.info'
    ]
  },

    // IP 相关配置
  IP: {
    // 特殊 IP 范围（保留地址和特殊用途地址）
    SPECIAL_RANGES: [
      /^0\.0\.0\.0$/,          // 当前网络
      /^255\.255\.255\.255$/   // 广播地址
    ]
  },
  PATTERNS: {
// 域名匹配 - HTML页面
    DOMAIN: /\b(?:(?!this)[a-z0-9%-]+\.)*?(?:(?!this)[a-z0-9%-]{2,}\.)[a-z]{2,10}(?:\:\d{1,5})?(?![a-zA-Z0-9._=>\(\);!}-])\b/g,
    DOMAIN_RESOURCE: /["'](?:(?:[a-z0-9]+:)?\/\/)?(?:(?!this)[a-z0-9%-]+\.)*?(?:[a-z0-9%-]{2,}\.)[a-z]{2,10}(?![a-zA-Z0-9.])(?:\:\d{1,5})?\S*?["']/g,
    // 域名匹配 - 资源文件
    DOMAIN_FILTER: /\b(?:[a-zA-Z0-9%-]+\.)+[a-z]{2,10}(?:\:\d{1,5})?\b/,
    // IP 地址匹配 - HTML页面
    IP: /(?<!\.|\d)(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?::\d{1,5})?(?!\.|[0-9])/g,
    // IP 地址匹配 - 资源文件
    IP_RESOURCE: /["'](?:(?:[a-zA-Z0-9%-]+\:)?\/\/)?(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?::\d{1,5}|\/)?\S*?["']/g,
    get API() {
      return SCANNER_CONFIG.API.PATTERN;
    },
    PHONE: /(?<!\d|\.)(?:13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9]|198|199)\d{8}(?!\d)/g,
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+(?!\.png)\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/g,
    IDCARD: /(?:\d{6}(?:19|20)(?:0\d|10|11|12)(?:[0-2]\d|30|31)\d{3}$)|(?:\d{6}(?:18|19|20)\d{2}(?:0[1-9]|10|11|12)(?:[0-2]\d|30|31)\d{3}(?:\d|X|x))(?!\d)/g,
    URL: /(?:https?|wss?|ftp):\/\/(?:(?:[\w-]+\.)+[a-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?(?:\/[^\s\>\)\}\<'"]*)?/gi,
    JWT: /["'](?:ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}|ey[A-Za-z0-9_\/+-]{10,}\.[A-Za-z0-9._\/+-]{10,})["']/g,
    COMPANY: /(?:[\u4e00-\u9fa5\（\）]{4,15}[^的](?:公司|中心)|[\u4e00-\u9fa5\（\）]{2,10}[^的](?:软件)|[\u4e00-\u9fa5]{2,15}(?:科技|集团))(?!法|点|与|查)/g,
    get CREDENTIALS() {
      return {
        type: 'CREDENTIALS',
        patterns: SCANNER_CONFIG.CREDENTIALS.PATTERNS
      };
    },
    COOKIE: /\b\w*(?:token|PHPSESSID|JSESSIONID)\s*[:=]\s*["']?(?!localStorage)(?:[a-zA-Z0-9-._]{4,})["']?/ig,
    get ID_KEY() {
      return {
        type: 'ID_KEY',
        patterns: SCANNER_CONFIG.ID_KEY.PATTERNS
      };
    },
    get FINGER() {
      return {
        type: 'FINGER',
        patterns: SCANNER_CONFIG.FINGER.PATTERNS
      };
    }
  },
  // 统一的黑名单配置
  BLACKLIST: {
    // 值黑名单 - 从 ID_KEY 配置中移出
    SHORT_VALUES: new Set([
      'up','in','by','of','is','on','to','no',
      'age','all','app','ang','bar','bea','big','bug','can','com','con','cry','dom',
      'dow','emp','ent','eta','eye','for','get','gen','has','hei','hid','ing','int',
      'ken','key','lea','log','low','met','mod','new','nor','not','num','red','obj',
      'old','out','pic','pre','pro','pop','pun','put','rad','ran','ref','red','reg',
      'ren','rig','row','sea','set','seq','shi','str','sub','sup','sun','tab','tan',
      'tip','top','uri','url','use','ver','via','rce','sum','bit','kit','uid'
    ]),
    MEDIUM_VALUES: new Set([
      'null','node','when','face','read','load','body','left','mark','down',
      'ctrl','play','ntal','head','item','init','hand','next','nect','json',
      'long','slid','less','view','html','tion','rect','link','char','core',
      'turn','atom','tech','type','main','size','time','full','card','more',
      'wrap','this','tool','late','note','leng','area','bool','pick','parm',
      'axis','high','true','date','tend','work','lang','func','able','dark',
      'term','info','data','opts','self','void','pace','list','brac','cret',
      'tive','sult','text','stor','back','port','case','pare','dent','blot',
      'fine','reif','cord','else','fail','rend','leav','hint','coll','move',
      'with','base','rate','name','hile','lete','post','pect','icon','auth',
      'jump','wave','land','wood','lize','room','chat','user','vice','ress',
      'line','send','mess','calc','http','rame','rest','last','guar','iate',
      'ment','task','stat','fill','coun','faul','rece','arse','exam','good',
      'gest','word','cast','lock','slot','fund','plus','thre','sign','pack',
      'reak','code','tent','math','lect','draw','lend','glow','past','blue',
      'dial','purp'
    ]),
    LONG_VALUES: new Set([
      'about','alias','apply','array','basic','beare','begin','black','break',
      'broad','catch','class','close','clear','click','clude','color','count',
      'cover','croll','crypt','error','false','fault','fetch','final','found',
      'gener','green','group','guard','index','inner','input','inter','light',
      'login','opera','param','parse','panel','place','print','phony','radio',
      'range','right','refer','serve','share','shift','style','tance','title',
      'token','tract','trans','trave','valid','video','white','write',

      'button','cancel','create','double','finger','global','insert','module',
      'normal','object','popper','triple','search','select','simple','single',
      'status','statis','switch','system','visual','verify','detail','screen',
      'member','change','buffer','grade'
    ]),
    CHINESE_BLACKLIST: new Set([
      '请','输入','前往','整个','常用','咨询','为中心','是否','以上','目前','任务',
      '或者','推动','需要','直接','识别','获取','用于','清除','遍历','使用','是由',
      '您','用户','一家','项目','等','造价','判断','通过','为了','可以','掌握',
      '传统','杀毒','允许','分析','包括','很多','接','未经','方式','些','的','第三方',
      '因此','形式','任何','提交','多数','其他','执行','操作','维护','或','其它',
      '分享','导致','一概','所有','及其','以及','应当','条件','除非','否则','违反',
      '将被','提供','无法','建立','打造','帮助','依法','鉴于','快速','构建','是','在',
      '去','恶意','挖矿','流氓','勒索','依靠','基于','通常','这','个','没有','并','、',
      '，','查看','确保','提高','减少','检查','更新','卸载','常见','依赖','进行','测试',
      '作弊',' '
    ])
  },
  

    // ID密钥相关配置
  ID_KEY: {
    PATTERNS: [
      {name: '微信开放平台密钥', pattern: /wx[a-z0-9]{15,18}/g},
      {name: 'AWS密钥', pattern: /AKIA[0-9A-Z]{16}/g},  
      {name: '阿里云密钥', pattern: /LTAI[A-Za-z\d]{12,30}/g},
      {name: 'Google API密钥', pattern: /AIza[0-9A-Za-z_\-]{35}/g},
      {name: '腾讯云密钥', pattern: /AKID[A-Za-z\d]{13,40}/g},
      {name: '京东云密钥', pattern: /JDC_[0-9A-Z]{25,40}/g},
      {name: '其他AWS密钥', pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g},
      {name: '支付宝开放平台密钥', pattern: /(?:AKLT|AKTP)[a-zA-Z0-9]{35,50}/g},
      {name: 'GitLab Token1', pattern: /glpat-[a-zA-Z0-9\-=_]{20,22}/g},
      {name: 'GitHub Token2', pattern: /(?:ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}/g},
      {name: 'Apple开发者密钥', pattern: /APID[a-zA-Z0-9]{32,42}/g},
      {name: '企业微信密钥', pattern: /ww[a-z0-9]{15,18}/g},
      {name: 'key1', pattern: /(?:['"]?(?:[\w-]*(?:secret|oss|bucket|key)[\w-]*)|ak["']?)\s*[:=]\s*(?:"(?!\+)[^\,\s\"\(\>\<]{6,}"|'(?!\+)[^\,\s\'\(\>\<]{6,}'|[0-9a-zA-Z_-]{16,})/ig},
      {name: 'key2', pattern: /["'][a-zA-Z0-9]{32}["']/g}
    ],

    // 关键词黑名单
    KEY_BLACKLIST: new Set([
      'size', 'row', 'dict', 'up', 'highlight', 'cabin', 'cross','time'
    ])
  },
  CREDENTIALS: {
    PATTERNS: [
      {pattern: /['"]\w*(?:pwd|pass|user|member|account|password|passwd|admin|root|system)[_-]?(?:id|name)?[0-9]*["']\s*[:=]\s*(?:['"][^\,\s\"\(]*["'])/gi},
      {pattern: /\w*(?:pwd|pass|user|member|account|password|passwd|admin|root|system)[_-]?(?:id|name)?[0-9]*\s*[:=]\s*(?:['"][^\,\s\"\(]*["'])/gi},
      {pattern: /['"]\w*(?:pwd|pass|user|member|account|password|passwd|admin|root|system)[_-]?(?:id|name)?[0-9]*\s*[:=]\s*(?:[^\,\s\"\(]*)["']/gi},
    ]
  },

  // 添加构建工具配置
  FINGER: {
    PATTERNS: [
      {class: 'Webpack', name: 'Webpack页面特征', pattern: /(?:webpackJsonp|__webpack_require__|webpack-dev-server)/i, description: '构建工具，用于前端资源打包', type: 'builder'},
      {class: 'Webpack', name: 'Webpack文件特征', pattern: /(?:chunk|main|app|vendor|common)s?(?:[-.][a-f0-9]{8,20})+.(?:css|js)/i, description: '构建工具，用于前端资源打包', type: 'builder'},
      {class: 'VisualStudio', name: 'Visual Studio页面特征', pattern: /visual\sstudio/i, description: '开发工具，用于网页开发', type: 'builder'},
      {class: 'Cloudflare CDN', name: '页面特征', pattern: /cdnjs.cloudflare.com/i, description: '服务，用于网页加速', type: 'cdn'},
      {class: 'jsDelivr CDN', name: '页面特征', pattern: /cdn.jsdelivr.net/i, description: '服务，用于网页加速', type: 'cdn'},
      {class: 'Django', name: '页面特征', pattern: /csrfmiddlewaretoken/i, description: '框架', type: 'framework',extType: 'technology',extName: 'Python'},
    ]
  },
};

// 导出配置
self.SCANNER_CONFIG = SCANNER_CONFIG;
self.API_CONFIG = SCANNER_CONFIG.API;
self.DOMAIN_CONFIG = SCANNER_CONFIG.DOMAIN;
self.IP_CONFIG = SCANNER_CONFIG.IP;