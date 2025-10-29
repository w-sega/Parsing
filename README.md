# Parsing

Parsing 是一个 Chrome 插件，选择ai分析当前页面的Js代码，内置提示词，不再需要单拎js。以及信息收集功能，提升渗透测试效率

## 功能

1. 非自动形式的js敏感信息扫描。
2. 截获当前页面的请求，并获取其来源js，以此选择性分析js源码，存在swagger类的接口文档，可单独分析。若存在jsmap，则可用jsmap_Inspector进行分析，在jsmap.html接入ai接口。
3. 提供多种分析方式的快捷按钮，支持自定义提示词内容，多种ai模型的分析。
4. ai分析提取到的接口和参数，支持一键发送到发包器，发包器可更改参数，使用当前cookie一键发包。
5. 快捷功能提供批量打开网站，一键解锁页面隐藏元素，批量探测网站标题。

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
