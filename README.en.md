# downtolocal
English | [简体中文](./README.md) 
## Introduction
**downtolocal** —— It is a tool to change online resources to local resource references. Usually, in the work, the reference to static resources is through CDN, but it is also possible that CDN needs to be replaced in batches (such as uncontrollable factors such as domain name is about to expire, or project ideas) Local deployment), urgent processing, but too many resources, each right-click to save is really hard, so this tool was born.
## Use
- REG：The resource regular to be replaced (image, css, js, etc.);
- BIT：Take the number of HASH bits, mainly to distinguish between the same file name in the same project, but not the same file;
- CDNRULE：HASH；
```
LOCMAP = {
      searchPath: "/example", From which location to start searching, string
      //files: [".html",".css",".phtml",".md",".vue",".sass",".scss",".less",".js"], The file type to match
      files: [], Default is empty
      If the array is empty, it will scan all types of files. If you don't know what type of files, it is recommended, but it will scan a lot of unnecessary files, such as images, fonts, media resources, etc. There is no distinction here because there are too many types.
      Specify the file type if you want to match the file type you want to match
      destLocPath: path.join(__dirname, "example/www/static/localres/") The location where the matched resource is stored
}
```
    
    
```
EXCLUDETARGET = {
      path:["config","pub.html"],
      //path:[], Default is empty，Accurate to file or directory
      keyword:['node_modules','demo'] 
      //keyword:[] Default is empty，Accurate to path keywords, case sensitive For example: /node_modules/ Unlimited level
 }
```

```
node q.js
```

## Description
- 1.Under the same level, the directories and file names named the same name will not be overwritten by each other. After the directory is created, it will be appended to the corresponding directory (Ep:demo directory and demo.html)
- 2.The script should be placed in the outer layer to match the directory
- 3.In a project directory, files named for the same file name, if found to have the same name when matching, will use the hash value in the CDN to distinguish

## Optimization point
- 1.Add matching all file functions
- 2.Increase the directory exclusion function
- 3.Compatible with windows/mac
- 4.Differentiate file naming
- 5.Increase timeout processing
- 6.Increase the error log

## License

[MIT](https://github.com/gitkingchen/downtolocal/blob/master/LICENSE)

Copyright (c) 2019-present jinchen