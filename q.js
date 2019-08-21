/* 

  使用说明：

  其他说明：
  1.同一级下，命名为相同名字的目录和文件名，并不会相互覆盖，在建立好目录后，都会追加到
  相应的目录里（Ep:demo目录和demo.html）
  2.区分windows和mac的路径
  3.脚本应放在要匹配目录的外层
  4.在一个项目目录里，针对同一个文件名命名的文件，如果发现在匹配时有相同的名字时，会采用
  获取CDN中的hash值来做区分

  优化步骤：
  1.增加目录排除功能
  2.区别windows和mac
  3.优化代码
  4.跑本地版和safec，寻找问题，index问题，css
  5.增加超时
  6.下载错误输出日志
  7.匹配所有文件
  8.成功多少个，失败多少个
  9.忽略node_modules/package.json等

*/
const {
  execSync
} = require("child_process");
const fs = require("fs");
const path = require("path");
const async = require("async");
const request = require("request");
const chalk = require('chalk');

const imgReg = /(http[s]?:)?\/\/[0-9a-zA-Z.]*(qhimg|qhmsg|qhres).*?\.(jpg|jpeg|gif|png|webp|ico)/g;
//const imgReg = /(http[s]?:)?\/\/[0-9a-zA-Z.]*(qhimg|qhmsg|qhres).*?\.(css)/g;
const bit = 8;
const cdnRule = '[0-9a-zA-Z!]{'+ bit +',}';//8位hash，不同公司不一样，为了区分相同文件名的情况
const locMap = {
  searchPath: "/src",
  //files: [".html",".css",".phtml",".md",".vue",".sass",".scss",".less",".js"],
  files: [],
  /*数组为空是所有文件，会扫描所有类型的文件，如果不知道有什么类型的文件，推荐用，但会扫描很多不必要的文件
  比如图片 字体 媒体资源等
  */
  destLocPath: "src/www/static/localres/"
};

const destSaveLoc = path.join(__dirname, locMap.destLocPath); // E:\work\downtolocal\example\www\static\localres\
const excludeTarget = [
  // "config",
  // "pub.html",
  // "/application/views",
  // "www",
  // "demo",
  // "popup"
]; //精确到文件或者目录

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

            if (excludeTarget.length > 0) { //对定义的目录进行过滤
              let isNeed = true;
              excludeTarget.forEach((item,i)=>{
                if (
                  nowPath ===
                  path.join(__dirname, locMap.searchPath, item)
                ) {
                  isNeed = false;
                }
              })
              
              if (!isNeed) return;
            }

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
  path.join(__dirname, locMap.searchPath),
  locMap.files
);

/*下载*/
let errStr = '';
let succNum = 0,failNum = 0;
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
let dealFileName = (matched) => {
  let fileName = matched.split("/")[matched.split("/").length - 1];
  let hash = matched.match(new RegExp(cdnRule,'g'));
  let tag = hash?hash[0].substring(0,bit):'';
  fileName = (tag?(tag+'_'):'')+fileName;
  return fileName;
}

/*匹配文件*/
let fileNum = 0;
let matchFileNum = 0;
let matchDemo = (curPath, body) => {
  //一共读了多少文件
  fileNum++;
  //读取文件内容，进行内容的替换
  //console.log('curPath',curPath)// E:\work\downtolocal\example\demo.html
  let proDestDir = '',targetPath = '',dirname = curPath.split(path.sep).join('/').match(
    new RegExp(locMap.searchPath + "\/(.*)") // 用RegExp 可以拼接变量
  );

  if (body.match(imgReg) && dirname) {
    matchFileNum++;
    //匹配到CDN
    if (dirname[1].indexOf("/") != -1) {
      //如果有目录
      proDestDir = path.join(destSaveLoc, dirname[1]);
      targetPath = path.dirname(dirname[1]);
      mkdirsSync(path.dirname(proDestDir));
    } else {
      //没有目录
      proDestDir = path.join(destSaveLoc, "/", dirname[1].split(".")[0]);
      targetPath = dirname[1].split(".")[0];
      mkdirsSync(proDestDir);
    }

    
    startDownload(proDestDir, body.match(imgReg)); //文件内的资源下载
    let endbody = body.replace(imgReg, (matched) => {//逐一替换
      
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

process.on("exit", code => {
  //必须执行同步操作
  console.log(chalk.red.bold('已匹配结束'));
  console.log(`共扫描的文件数是：${fileNum}个`,);
  console.log(`其中匹配的文件数是：${matchFileNum}个`);
  console.log(`成功下载的资源数是：${succNum}个`);
  console.log(`失败下载的资源数是：${failNum}个`);
});


process.on("beforeExit", code => {
  //可以执行异步操作
  //当 Node.js 清空其事件循环并且没有其他工作要安排时，会触发 'beforeExit' 事件。
  if(errStr){
    fs.writeFile('./error.txt', `失败下载的资源数是：${failNum}个\r\n${errStr}`, () => {
      console.log(chalk.red.bold('已生成错误日志:error.txt'));
      process.exit();//不加会循环beforeExit
    });
  }
});
