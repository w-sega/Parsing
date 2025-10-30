# Parsing

Parsing 是一个 Chrome 插件，选择ai分析当前页面的Js代码，内置提示词，不再需要单拎js。以及信息收集功能，提升渗透测试效率

## 功能

### 🤖 AI 代码审计引擎
利用多种AI大模型（Gemini, GPT-4o等）一键分析JS代码，挖掘API等。

### 🔬 资产与信息收集
自动扫描网页HTML和JS，提取API、IP、域名、密钥等敏感资产和技术指纹等。

### 🌐 网络逆向与监控
实时记录所有网络请求和JS加载，并能快速定位API在哪个脚本文件中定义。

### 🛡️ 一键未授权测试
提供一键未授权访问测试和批量主机存活探测功能。

### 🗺️ Source Map 工具
自动检查并帮助加载、查看JS文件的Source Map，辅助代码分析。

## 安装使用

1. 下载压缩包后解压，在chrome加载未打包的扩展程序。
2. 打开插件在设置页面配置apikey、白名单域名。


## 功能截图

### 接入jsmap_Inspector
<div style="text-align:center">
    <img src="png/jsmap.png" alt="jsmap" width="80%">
    <img src="png/jsmapfx.png" alt="jsmapfx" width="80%">
    </div>

### 当前请求
<div style="text-align:center">
    <img src="png/dqqq.png" alt="当前请求" width="80%">
    </div>

### js分析
<div style="text-align:center">
    <img src="png/fx.png" alt="js分析" width="80%">
</div>

### 信息收集
<div style="text-align:center">
    <img src="png/xxsj.png" alt="信息收集" width="80%">
    
</div>

### Js列表
<div style="text-align:center">
    <img src="png/jslb.png" alt="js列表" width="80%">
</div>

### AI记录
<div style="text-align:center">
    <img src="png/aijl.png" alt="AI记录" width="80%">
</div>

### 发包器
<div style="text-align:center">
    <img src="png/fbq.png" alt="发包器" width="80%">
</div>

### 子域名收集
<div style="text-align:center">
    <img src="png/zymsj.png" alt="子域名收集" width="80%">
</div>

### 快捷功能
<div style="text-align:center">
    <img src="png/kjgn.png" alt="快捷功能" width="80%">
</div>

### 设置
<div style="text-align:center">
    <img src="png/sz.png" alt="设置" width="80%">
 </div>

### 感谢

jsmap.html来自https://github.com/ynsmroztas/jsmap_inspector 接入了ai分析接口  

信息收集部分规则来自https://github.com/SickleSec/SnowEyes
