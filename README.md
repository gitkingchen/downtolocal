# downtolocal
## 介绍
**downtolocal** —— 是一个将线上资源改为本地资源引用的工具，平时在工作中，引用静态资源是通过CDN的方式，但也有可能CDN需要批量更换的情况（比如域名即将失效等不可控的因素或者项目想本地部署），需要紧急处理，但资源太多，每个都右键保存实属苦逼，所以此工具因此场景而诞生。
## 使用
- REG：要替换的资源正则（image，css，js 等）；
- BIT：取HASH的位数，主要为了区分同一个项目内的资源中有相同文件名，但不是相同文件的问题；
- CDNRULE：HASH；
```
LOCMAP = {
      searchPath: "/src", 从哪个位置开始搜索，字符串
      //files: [".html",".css",".phtml",".md",".vue",".sass",".scss",".less",".js"], 要匹配的文件类型
      files: [], 默认为空
      数组为空是会扫描所有类型的文件，如果不知道有什么类型的文件，推荐用，但会扫描很多不必要的文件，比如图片 字体 媒体资源等，这里不做区分，因为类型太多。
      如果明确要匹配的文件类型，请指定文件类型
      destLocPath: path.join(__dirname, "src/www/static/localres/") 匹配到的资源存放的位置
}
```
    
    
```
EXCLUDETARGET = {
      path:["application/controllers","application/models","application/test.html"],
      //path:[], 默认为空，精确到文件或者目录
      keyword:['node_modules'] 
      //keyword:[] 默认为空，精确到路径关键词，区分大小写 比如：/node_modules/ 不限层级
 }
```

```
node q.js
```

## 说明
- 1.同一级下，命名为相同名字的目录和文件名，并不会相互覆盖，在建立好目录后，都会追加到相应的目录里（Ep:demo目录和demo.html）
- 2.脚本应放在要匹配目录的外层
- 3.在一个项目目录里，针对同一个文件名命名的文件，如果发现在匹配时有相同的名字时，会采用获取CDN中的hash值来做区分

## 优化点
- 1.增加匹配所有文件功能    
- 2.增加目录排除功能
- 3.兼容windows/mac
- 4.区分文件命名
- 5.增加超时处理
- 6.增加错误日志

## License

[MIT](https://github.com/gitkingchen/downtolocal/blob/master/LICENSE)

Copyright (c) 2019-present jinchen