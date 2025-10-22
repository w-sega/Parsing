const regexCache = {
  coordPattern: /^coord/,
  valuePattern: /^\/|true|false|register|signUp|basic|http/i,
  chinesePattern: /^[\u4e00-\u9fa5]+$/,
  camelCasePattern: /\b[_a-z]+(?:[A-Z][a-z]+)+\b/,
};
const SCANNER_FILTER = {
  api: (function() {
    return function(match, url, resultsSet) {
      match = match.slice(1, -1);
      if (/%3c|%3e/i.test(match) && /svg/i.test(match)) {
        return false;
      }
      if (SCANNER_CONFIG.API.FONT_PATTERN.test(match)) {
        return false;
      }
      if (match.endsWith('.vue')) {
        resultsSet?.vueFiles?.set(match, url);
        return true;
      }
      if (SCANNER_CONFIG.API.IMAGE_PATTERN.test(match)) {
        resultsSet?.imageFiles?.set(match, url);
        return true;
      }
      if (SCANNER_CONFIG.API.JS_PATTERN.test(match)) {
        resultsSet?.jsFiles?.set(match, url);
        return true;
      }
      if (SCANNER_CONFIG.API.DOC_PATTERN.test(match)) {
        resultsSet?.docFiles?.set(match, url);
        return true;
      }
      const lcMatch = match.toLowerCase();
      const shouldFilter = SCANNER_CONFIG.API.FILTERED_CONTENT_TYPES.some(type => 
        lcMatch==type.toLowerCase()
      );
      if (shouldFilter) {
        return false;
      }
      if (match.startsWith('./')) {
        resultsSet?.moduleFiles?.set(match, url);
        return true;
      }
      if (match.startsWith('/')) {
       if (match.includes('<') || match.includes('>')) {
          return false;
        }
        
        // 规则2: 拒绝包含中文、空格及代码中常见的特殊符号 (如 *, ^ 等)
        if (/[\u4e00-\u9fa5\s*,(^]/.test(match)) {
            return false;
        }

        // 规则3: 路径中必须至少包含一个英文字母 (a-z, A-Z)
        // 这条规则可以非常有效地过滤掉 '/:', '/^' 等不含字母的无效路径
        if (!/[a-zA-Z]/.test(match)) {
          return false;
        }
        
        // 规则4: 路径长度至少为2个字符
        if (match.length < 2) {
          return false;
        }
        resultsSet?.absoluteApis?.set(match, url);
      } else {
        if (/^(audio|blots|core|ace|icon|css|formats|image|js|modules|text|themes|ui|video|static|attributors|application)/.test(match)) return false;
        if(match.length<=4) return false;
        resultsSet?.apis?.set(match, url);
      }
      return true;
    };
  })(),

   domain: (function() {
    const COMMON_TLDS = new Set([
        'com', 'cn', 'org', 'net', 'gov', 'edu', 'io', 'co', 'info', 'biz', 
        'top', 'xyz', 'app', 'gov', 'mil', 'edu', 'int', 'ai', 'hk', 'mo', 'tw',
        'jp', 'kr', 'uk', 'us', 'de', 'fr', 'ru', 'au', 'ca', 'in', 'eu'
    ]);
    const EXCLUDED_KEYWORDS = new Set([
        'prototype', 'style', 'document', 'window', 'event', 'target', 'payload',
        'component', 'options', 'this', 'jquery', 'angular', 'react', 'vue'
    ]);
    const ALLOWED_SINGLE_LETTER_SUBDOMAINS = new Set(['m', 'w', 'v']);

    return function(match, url, resultsSet) {
      // 步骤 1 & 2: 预处理和提取主机部分
      let cleanMatch = match.toLowerCase().trim().replace(/^['"`]|['"`]$/g, '');
      cleanMatch = cleanMatch.replace(/^(?:https?:\/\/)?(?:www\.)?/, '');
      const hostPart = cleanMatch.split('/')[0].split('?')[0];
      
      // 步骤 3: 提取纯域名用于校验
      const domainForValidation = hostPart.split(':')[0];

      // 步骤 4 & 5: 基础校验和分段
      if (!domainForValidation.includes('.')) return false;
      const parts = domainForValidation.split('.');
      if (parts.length < 2) return false;

      // 步骤 6: 顶级域名(TLD)校验
      const tld = parts[parts.length - 1];
      if (!COMMON_TLDS.has(tld)) return false;

      // ====================【本次修改的核心】====================
      // 步骤 7 (新增): 针对 .top 结尾域名的特殊严格校验
      if (tld === 'top') {
          // 创建一个专门用于 .top 域名的、更严格的黑名单
          const TOP_BLACKLIST = new Set([
              'offset', 'margins', 'height', 'width', 'parent', 'scroll', 'click', 'pos',
              'relative', 'left', 'right', 'bottom', 'css', 'opts', 'bounds', 'hset',
              'layer', 'page', 'client', 'inner', 't-this', 'position', 'coord', 'top-e','top-e.top', 'obj', 'rect3', 'rect', 'me', 'info', 'p2', 'p1', 'paddings', 'box', 'container', 'reference', 'ge', 'mb',
              'top', 'center', 'middle', 'align', 'text', 'font', 'color', 'background',
              'border', 'padding', 'margin', 'display', 'flex', 'grid', 'block', 'inline',
              'absolute', 'fixed', 'static', 'sticky', 'float', 'clear', 'visibility',
              'opacity', 'z-index', 'overflow', 'hidden', 'auto', 'visible', 'clip',
              'transform', 'transition', 'animation', 'keyframes', 'cursor', 'pointer',
              'hover', 'active', 'focus', 'disabled', 'selected', 'checked', 'required',
              'readonly', 'placeholder', 'label', 'title', 'alt', 'src', 'href', 'url',
              'data', 'value', 'name', 'id', 'class', 'style', 'type', 'method', 'action',
              'target', 'rel', 'async', 'defer', 'module', 'import', 'export', 'function',
              'var', 'let', 'const', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
              'case', 'default', 'break', 'continue', 'throw', 'try', 'catch', 'finally',
              'new', 'this', 'super', 'extends', 'implements', 'interface', 'package',
              'private', 'protected', 'public', 'static', 'void', 'null', 'undefined',
              'true', 'false', 'boolean', 'number', 'string', 'object', 'array', 'date',
              'math', 'json', 'regexp', 'promise', 'await', 'async', 'then', 'catch',
              'event', 'listener', 'handler', 'callback', 'timeout', 'interval', 'delay',
              'element', 'node', 'document', 'window', 'navigator', 'screen', 'location',
              'history', 'storage', 'cookie', 'session', 'local', 'indexeddb', 'websql',
              'fetch', 'xhr', 'ajax', 'axios', 'jquery', 'vue', 'react', 'angular',
              'svelte', 'ember', 'backbone', 'knockout', 'mithril', 'polymer', 'lit',
              'stencil', 'preact', 'inferno', 'solid', 'alpine', 'stimulus', 'hotwired',
              'bootstrap', 'foundation', 'bulma', 'tailwind', 'materialize', 'semantic',
              'uikit', 'antd', 'element', 'iview', 'vuetify', 'quasar', 'prime', 'chakra',
              'next', 'nuxt', 'sapper', 'gatsby', 'astro', 'eleventy', 'hexo', 'jekyll',
              'hugo', 'middleman', 'metalsmith', 'wintersmith', 'brunch', 'parcel',
              'rollup', 'webpack', 'browserify', 'esbuild', 'swc', 'vite', 'snowpack',
              'rome', 'prettier', 'eslint', 'stylelint', 'commitlint', 'husky', 'lintstaged',
              'jest', 'mocha', 'chai', 'sinon', 'cypress', 'playwright', 'puppeteer',
              'karma', 'jasmine', 'ava', 'tape', 'qunit', 'testcafe', 'nightwatch',
              'protractor', 'selenium', 'appium', 'detox', 'wdio', 'cucumber', 'gherkin',
              'bdd', 'tdd', 'unit', 'integration', 'e2e', 'fixture', 'mock', 'stub',
              'spy', 'snapshot', 'coverage', 'istanbul', 'nyc', 'benchmark', 'performance',
              'load', 'stress', 'smoke', 'sanity', 'regression', 'exploratory', 'manual',
              'automation', 'ci', 'cd', 'github', 'gitlab', 'bitbucket', 'jenkins',
              'travis', 'circle', 'drone', 'buddy', 'codeship', 'teamcity', 'bamboo',
              'appveyor', 'azure', 'aws', 'gcp', 'digitalocean', 'linode', 'vultr',
              'heroku', 'netlify', 'vercel', 'firebase', 'supabase', 'mongodb', 'mysql',
              'postgres', 'sqlite', 'oracle', 'mssql', 'redis', 'memcached', 'couchdb',
              'rethinkdb', 'dynamodb', 'cassandra', 'neo4j', 'arangodb', 'orientdb',
              'faunadb', 'cosmosdb', 'graphql', 'rest', 'soap', 'grpc', 'rpc', 'json',
              'xml', 'yaml', 'toml', 'ini', 'csv', 'tsv', 'markdown', 'asciidoc',
              'rst', 'textile', 'orgmode', 'creole', 'mediawiki', 'dokuwiki', 'tiddlywiki',
              'confluence', 'notion', 'obsidian', 'logseq', 'roam', 'bear', 'iawriter',
              'ulysses', 'scrivener', 'finaldraft', 'celtx', 'fountain', 'markup',
              'markdown', 'commonmark', 'multimarkdown', 'pandoc', 'latex', 'context',
              'tex', 'bibtex', 'asciimath', 'mathml', 'mathjax', 'katex', 'plotly',
              'd3', 'chartjs', 'highcharts', 'echarts', 'apexcharts', 'canvasjs',
              'amcharts', 'c3', 'nvd3', 'victory', 'recharts', 'vis', 'sigma', 'cytoscape',
              'cola', 'dagre', 'klay', 'springy', 'arbor', 'vivagraph', 'graphviz',
              'mermaid', 'nomnoml', 'plantuml', 'blockdiag', 'seqdiag', 'actdiag',
              'nwdiag', 'rackdiag', 'packetdiag', 'c4', 'structurizr', 'ilograph',
              'lucidchart', 'drawio', 'excalidraw', 'tldraw', 'figma', 'sketch', 'xd',
              'illustrator', 'photoshop', 'gimp', 'inkscape', 'affinity', 'coreldraw',
              'canva', 'piktochart', 'venngage', 'infogram', 'chartblocks', 'visme',
              'adalo', 'bubble', 'webflow', 'wix', 'squarespace', 'shopify', 'bigcommerce',
              'magento', 'woocommerce', 'prestashop', 'opencart', 'oscommerce', 'zen',
              'xcart', 'volusion', 'ecwid', 'shopify', 'bigcartel', 'spree', 'solidus',
              'satchmo', 'saleor', 'sylius', 'vendure', 'medusajs', 'reaction', 'reactioncommerce',
              'reaction', 'reaction', 'reaction', 'reaction', 'reaction', 'reaction',
              'reaction', 'reaction', 'reaction', 'reaction', 'reaction', 'reaction',
              'reaction', 'reaction', 'reaction', 'reaction', 'reaction', 'reaction'
          ]);
          // 只要域名的任何一部分在这个黑名单里，就判定为误报
          if (parts.some(part => TOP_BLACKLIST.has(part.split('-')[0]))) {
              return false;
          }
          
          // 增强过滤：长度检查 - 排除过短或过长的域名部分
          if (parts.some(part => part.length < 2 || part.length > 20)) {
              return false;
          }
          
          // 增强过滤：数字检查 - 排除纯数字或数字开头的域名部分
          if (parts.some(part => /^\d+$/.test(part) || /^\d/.test(part))) {
              return false;
          }
          
          // 增强过滤：特殊字符检查 - 排除包含非字母数字字符的域名
          if (parts.some(part => /[^a-z0-9-]/.test(part))) {
              return false;
          }
          
          // 增强过滤：常见误报模式检查
          const commonFalsePatterns = [
              /^[a-z]_[a-z]/i,    // 单字母下划线模式
              /^\d+[a-z]+\d+$/i,  // 数字字母数字模式
              /^[a-z]+\d+[a-z]+$/i // 字母数字字母模式
          ];
          
          if (parts.some(part => commonFalsePatterns.some(pattern => pattern.test(part)))) {
              return false;
          }
      }
      
      // ====================【新增 .info 域名过滤】====================
      // 针对 .info 结尾域名的过滤校验
      if (tld === 'info') {
          // 使用与 .top 相同的黑名单和过滤规则
          if (parts.some(part => TOP_BLACKLIST.has(part.split('-')[0]))) {
              return false;
          }
          
          // 相同的增强过滤规则
          if (parts.some(part => part.length < 2 || part.length > 20)) {
              return false;
          }
          
          if (parts.some(part => /^\d+$/.test(part) || /^\d/.test(part))) {
              return false;
          }
          
          if (parts.some(part => /[^a-z0-9-]/.test(part))) {
              return false;
          }
          
          const commonFalsePatterns = [
              /^[a-z]_[a-z]/i,
              /^\d+[a-z]+\d+$/i,
              /^[a-z]+\d+[a-z]+$/i
          ];
          
          if (parts.some(part => commonFalsePatterns.some(pattern => pattern.test(part)))) {
              return false;
          }
      }
      // ==========================================================

      // 步骤 8: 通用关键词黑名单校验
      if (parts.some(part => EXCLUDED_KEYWORDS.has(part))) return false;
      
      // 步骤 9 & 10: 格式和启发式规则校验
      if (parts.some(part => part.startsWith('-') || part.endsWith('-') || part === '')) return false;
      if (parts[0].length === 1 && !ALLOWED_SINGLE_LETTER_SUBDOMAINS.has(parts[0])) return false;

      // 检查是否在域名黑名单中
      if (SCANNER_CONFIG.DOMAIN.BLACKLIST.includes(hostPart)) {
        return false;
      }
      
      // 所有校验通过，存入结果
      resultsSet?.domains?.set(hostPart, url);
      return true;
    };
  })(),



  ip: (function() {
    const validate = {
      notSpecial(ip) {
        return !SCANNER_CONFIG.IP.SPECIAL_RANGES.some(range => range.test(ip));
      }
    };

    return function(match, url, resultsSet) {
      match = match.replace(/^[`'"\[\{]|[`'"\]\}]$/g, '');
      const ipMatch = match.match(SCANNER_CONFIG.PATTERNS.IP);
      if (ipMatch) {
        const extractedIp = ipMatch[0];
        if (!validate.notSpecial(extractedIp)) return false;
        resultsSet?.ips?.set(extractedIp, url);
      }
      return true;
    };
  })(),

  phone: (match, url, resultsSet) => {
    resultsSet?.phones?.set(match, url);
    return true;
  },

  email: (match, url, resultsSet) => {
    resultsSet?.emails?.set(match, url);
    return true;
  },

  idcard: (match, url, resultsSet) => {
    resultsSet?.idcards?.set(match, url);
    return true;
  },

  url: (match, url, resultsSet) => {
    try {
      // 优先处理 GitHub 链接
      if (match.toLowerCase().includes('github.com/')) {  
        resultsSet?.githubUrls?.set(match, url);
      } else {
      // 将所有其他匹配到的有效URL放入“其他URL”分类
        resultsSet?.urls?.set(match, url);
      }
    } catch (e) {
      // 正则表达式可能会匹配到一些无效的URL片段，这里捕获错误以防止崩溃
      // 可以取消下面的注释来查看哪些URL被跳过了
      // console.warn('跳过无效的URL片段:', match);
    }
    return true;
  },

  jwt: (match, url, resultsSet) => {
    resultsSet?.jwts?.set(match, url);
    return true;
  },

  aws_key: (match, url, resultsSet) => {
    resultsSet?.awsKeys?.set(match, url);
    return true;
  },

  company: (match, url, resultsSet) => {
    if(/[（）]/.test(match)&&!match.match(/（\S*）/)) return false;
    if (Array.from(SCANNER_CONFIG.BLACKLIST.CHINESE_BLACKLIST).some(blackWord=>match.includes(blackWord))) return false;
    resultsSet?.companies?.set(match, url);
    return true;
  },

  credentials: (match, url, resultsSet) => {
    const valueMatch = match.replace(/\s+/g,'').split(/[:=]/);
    var key = valueMatch[0].replace(/['"]/g,'').toLowerCase();
    var value = valueMatch[1].replace(/['"\{\}\[\]\，\：\。\？\、\?\!\>\<]/g,'').toLowerCase();
    if (!value.length) {
      return false; 
    }
    if (regexCache.coordPattern.test(key) || regexCache.valuePattern.test(value) || value.length<=1) return false;
    if (regexCache.chinesePattern.test(value)) return false;
    
    resultsSet?.credentials?.set(match, url);
    return true;
  },

  cookie: (match, url, resultsSet) => {
    const valueMatch = match.replace(/\s+/g,'').split(/[:=]/);
    if (valueMatch[1].replace(/['"]/g,'').length<4) {
      return false;
    }
    var key = valueMatch[0].replace(/['"<>]/g,'').toLowerCase();
    var value = valueMatch[1].replace(/['"<>]/g,'').toLowerCase();
    if (!value.length||key==value) {
      return false; 
    }
    if (value.length<12){
      if(Array.from(SCANNER_CONFIG.BLACKLIST.SHORT_VALUES).some(blackWord=>value.includes(blackWord))||Array.from(SCANNER_CONFIG.BLACKLIST.MEDIUM_VALUES).some(blackWord=>value.includes(blackWord))){ return false; }
    }else{
      if(Array.from(SCANNER_CONFIG.BLACKLIST.MEDIUM_VALUES).some(blackWord=>value.includes(blackWord))){ return false; }
    }
    resultsSet?.cookies?.set(match, url);
    return true;
  },

  id_key: (match, url, resultsSet) => {
    const hasDelimiter = match.match(/[:=]/);
    
    if (hasDelimiter || match.length >= 32) {
      if (hasDelimiter) {
        const valueMatch = match.replace(/\s+/g,'').split(/[:=]/);
        var key = valueMatch[0].replace(/['"<>]/g,'');
        var value = valueMatch[1].replace(/['">]/g,'');
        const keyLower = key.toLowerCase();
        const valueLower = value.toLowerCase();
        
        if (!value.length || keyLower === valueLower) {
          return false;
        }
        if(Array.from(SCANNER_CONFIG.ID_KEY.KEY_BLACKLIST).some(blackWord=>keyLower.includes(blackWord))){ return false; }
        if(value.length<16){
          if(Array.from(SCANNER_CONFIG.BLACKLIST.SHORT_VALUES).some(blackWord=>valueLower.includes(blackWord))||Array.from(SCANNER_CONFIG.BLACKLIST.MEDIUM_VALUES).some(blackWord=>valueLower.includes(blackWord))){ return false; }
        }else{
          if(Array.from(SCANNER_CONFIG.BLACKLIST.MEDIUM_VALUES).some(blackWord=>valueLower.includes(blackWord))||Array.from(SCANNER_CONFIG.BLACKLIST.LONG_VALUES).some(blackWord=>valueLower.includes(blackWord))){ return false; }
        }
        if (key === "key" && (value.length <= 8 || regexCache.camelCasePattern.test(value))) {
          return false;
        }
        if (value.length <= 3) {
          return false;
        }
      } else {
        if (/^[a-zA-Z]+$/.test(match.slice(1,-1))) {
          return false;
        }
        if(Array.from(SCANNER_CONFIG.BLACKLIST.MEDIUM_VALUES).some(blackWord=>match.includes(blackWord))||Array.from(SCANNER_CONFIG.BLACKLIST.LONG_VALUES).some(blackWord=>match.includes(blackWord))){ return false; }
      }
      resultsSet?.idKeys?.set(match, url);
      return true;
    }
    return false;
  },

  finger: (fingerName, fingerClass, fingerType, fingerDescription, url, resultsSet, fingerExtType, fingerExtName) => {
    var fingerprint = {};
    fingerprint.type = fingerType;
    fingerprint.name = fingerClass;
    fingerprint.description = `通过${fingerName}识别到${fingerClass}${fingerDescription}`;
    fingerprint.version = fingerClass;
    if(fingerExtType){
      fingerprint.extType = fingerExtType;
      fingerprint.extName = fingerExtName;
    }
    chrome.runtime.sendMessage({
      type: 'UPDATE_BUILDER',
      finger: fingerprint
    });
    resultsSet?.fingers?.set(fingerClass, url);
    return true;
  }
};

self.SCANNER_FILTER = SCANNER_FILTER;
self.apiFilter = SCANNER_FILTER.api;
self.domainFilter = SCANNER_FILTER.domain;
self.ipFilter = SCANNER_FILTER.ip;
self.SCANNER_FILTER.domain_resource = self.SCANNER_FILTER.domain;