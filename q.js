/* 
  *将线上资源改为本地资源引用
  *@version 1.0
  *@author jinchen on 2019/08/22
  
  *参数说明：
  
    REG：要替换的资源正则（image，css，js 等）
    BIT：取HASH的位数，主要为了区分同一个项目内的资源中有相同文件名，但不是相同文件的问题
    CDNRULE：HASH
    
    搜索目录：
    LOCMAP = {
      searchPath: "/example", 从哪个位置开始搜索，字符串
      //files: [".html",".css",".phtml",".md",".vue",".sass",".scss",".less",".js"], 要匹配的文件类型
      files: [], 默认为空
      数组为空是会扫描所有类型的文件，如果不知道有什么类型的文件，推荐用，但会扫描很多不必要的文件，比如图片 字体 媒体资源等，这里不做区分，因为类型太多。
      如果明确要匹配的文件类型，请指定文件类型
      destLocPath: path.join(__dirname, "example/www/static/localres/") 匹配到的资源存放的位置
    }
    
    排除搜索目录：
    EXCLUDETARGET = {
      path:["config","pub.html"],
      //path:[], 默认为空，精确到文件或者目录
      keyword:['node_modules'] 
      //keyword:[] 默认为空，精确到路径关键词，区分大小写 比如：/node_modules/ 不限层级
    }



  *其他说明：
  
    1.同一级下，命名为相同名字的目录和文件名，并不会相互覆盖，在建立好目录后，都会追加到
    相应的目录里（Ep:demo目录和demo.html）
    2.脚本应放在要匹配目录的外层
    3.在一个项目目录里，针对同一个文件名命名的文件，如果发现在匹配时有相同的名字时，会采用
    获取CDN中的hash值来做区分

  *优化点：
  
    1.增加匹配所有文件功能    
    2.增加目录排除功能
    3.兼容windows/mac
    4.区分文件命名
    5.增加超时处理
    6.增加错误日志

*/
const {
  execSync
} = require("child_process");
const fs = require("fs");
const path = require("path");
const async = require("async");
const request = require("request");
const chalk = require('chalk');

const REG = /(http[s]?:)?\/\/[0-9a-zA-Z.]*(qhimg|qhmsg|qhres).*?\.(jpg|jpeg|gif|png|webp|ico)/g;
const BIT = 8;
const CDNRULE = '[0-9a-zA-Z!]{'+ BIT +',}';//8位hash，不同公司不一样，为了区分相同文件名的情况
const LOCMAP = {
  searchPath: "/example",
  files: [],
  destLocPath: path.join(__dirname, "example/www/static/localres/")
};

const EXCLUDETARGET = {
  path:["config","pub.html"],
  keyword:['demo']
}


let fsPathSys = (fspath, targetFile) => {
  let stat = fs.statSync(fspath);
  if (stat.isDirectory()) { //是否是目录
    let isDirectory = (err, files) => {
      //读取目录里所有文件
      if (err) {
        console.log("err", err);
        return err;
      } else {
        files.forEach((item, index) => {
          if (item === "__MACOSX") {
            //删除mac无用文件
            execSync("rm -rf " + fspath + "/__MACOSX");
          } else {
            let nowPath = path.join(fspath, item);
            //console.log("fspath", fspath); //E:\work\downtolocal\example
            //console.log("item", item); //pub.html
            
            let isNeed = true;
            switch(true){
              case EXCLUDETARGET.path.length > 0:
              EXCLUDETARGET.path.forEach((item,i) => {
                if (
                  nowPath ===
                  path.join(__dirname, LOCMAP.searchPath, item)
                ) {
                  isNeed = false;
                  return;
                }
              })
              
              case EXCLUDETARGET.keyword.length > 0:
              EXCLUDETARGET.keyword.forEach((item,i) => {
                if (
                  nowPath.split(path.sep).join('/').match(new RegExp('\/'+item+'\/','g'))
                ) {
                  isNeed = false;
                  return;
                }
              })
              
            }

            if (!isNeed) return;

            let stat = fs.statSync(nowPath);

            if (!stat.isDirectory()) {
              //如果路径不是目录，说明到底了
              if(targetFile.length > 0){
                targetFile.forEach((obj, index) => {
                  if (item.indexOf(obj) != -1) {
                    readMatchFile(nowPath);
                  }
                });
              }else{
                readMatchFile(nowPath);
              }
            } else {
              //如果是目录，再执行
              fsPathSys(nowPath, targetFile);
            }
          }
        });
      }
    }
    fs.readdir(fspath, isDirectory); //读取路径
  } else {
    targetFile.forEach((obj, index) => {
      readMatchFile(fspath);
    });
  }
}

fsPathSys(
  path.join(__dirname, LOCMAP.searchPath),
  LOCMAP.files
);

/*下载*/
let 
errStr = '', //错误日志
succNum = 0, //下载成功数
failNum = 0; //下载失败数
let startDownload = (dir, imageLinks) => {// 存放的目录位置,[下载链接1,下载链接2]
  let newDir = dir.indexOf(".") == -1 ? dir : path.dirname(dir);
  async.mapSeries(
    imageLinks,
    (src, callback) => {
      console.log(chalk.cyan.bold('下载',src));
      if (src.indexOf("http") == -1) src = "http:" + src;
      let errType = '错误类型：';
      //文件源地址，下载后存放的目标地址
      let dest = path.resolve(newDir, dealFileName(src));
      request({url:src,timeout: 4000})
        .on('error', (err) => {//要在pipe之前
          failNum++;
          if(err.code == 'ESOCKETTIMEDOUT'){
            errType += '超时';
          }else{
            errType += '其他';
          }
          errStr += `${errType}\r\n状态码：${err.code}\r\n源文件地址：${src}\r\n替换后的地址：${dest}\r\n\r\n\r\n`;
          callback(null, src);
        })
        .pipe(fs.createWriteStream(dest))
        .on("close", () => {
          succNum++;
          //读取到目标，写到最终目录里
          callback(null, src);
        });

    }
  );
}
/*下载*/

/*读取文件流*/
let readMatchFile = (curPath) => {
  let readAble = fs.createReadStream(curPath);
  let body = "";
  readAble.on("data", chunk => {
    body += chunk;
  });
  readAble.on("end", () => {
    matchDemo(curPath, body);
  });
}
/*读文件*/

/*创建目录*/
let mkdirsSync = (name) => {
  if (fs.existsSync(name)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(name))) {
      fs.mkdirSync(name);
      return true;
    }
  }
}
/*创建目录*/

/*处理文件名*/
let dealFileName = (matched) => {
  let fileName = matched.split("/")[matched.split("/").length - 1];
  let hash = matched.match(new RegExp(CDNRULE,'g'));
  let tag = hash?hash[0].substring(0,BIT):'';
  fileName = (tag?(tag+'_'):'')+fileName;
  return fileName;
}
/*处理文件名*/

/*匹配文件*/
let 
fileNum = 0,//一共读了多少文件
matchFileNum = 0;//匹配的文件数
let matchDemo = (curPath, body) => {
  fileNum++;
  //读取文件内容，进行内容的替换
  //console.log('curPath',curPath)// E:\work\downtolocal\example\demo.html
  let proDestDir = '',targetPath = '',dirname = curPath.split(path.sep).join('/').match(
    new RegExp(LOCMAP.searchPath + "\/(.*)")
  );

  if (body.match(REG) && dirname) {
    matchFileNum++;
    //匹配到CDN
    if (dirname[1].indexOf("/") != -1) {
      //如果有目录
      proDestDir = path.join(LOCMAP.destLocPath, dirname[1]);
      targetPath = path.dirname(dirname[1]);
      mkdirsSync(path.dirname(proDestDir));
    } else {
      //没有目录
      proDestDir = path.join(LOCMAP.destLocPath, "/", dirname[1].split(".")[0]);
      targetPath = dirname[1].split(".")[0];
      mkdirsSync(proDestDir);
    }

    
    startDownload(proDestDir, body.match(REG)); //文件内的资源下载
    let endbody = body.replace(REG, (matched) => {//逐一替换
      
      //进行地址替换
      return (
        "/static/localres/" +
        targetPath +
        "/" +
        dealFileName(matched)
      );
    });

    //重写替换后的文件
    fs.writeFile(curPath, endbody, err => {
      if (err) throw err;
    });
  }
}
/*匹配文件*/

/*程序结束*/
process.on("exit", code => {
  //必须执行同步操作
  console.log(chalk.red.bold('已匹配结束'));
  console.log(`共扫描的文件数是：${fileNum}个`,);
  console.log(`其中匹配的文件数是：${matchFileNum}个`);
  console.log(`成功下载的资源数是：${succNum}个`);
  console.log(`失败下载的资源数是：${failNum}个`);
});
/*程序结束*/

/*
  程序结束前
  当 Node.js 清空其事件循环并且没有其他工作要安排时，会触发 'beforeExit' 事件。
*/
process.on("beforeExit", code => {
  //可以执行异步操作
  if(errStr){
    fs.writeFile('./error.txt', `失败下载的资源数是：${failNum}个\r\n${errStr}`,() => {
      console.log(chalk.red.bold('已生成错误日志:error.txt'));
      process.exit();//不加会循环beforeExit  
    })
  }
});
/*程序结束前*/
