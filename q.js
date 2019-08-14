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
  6.下载错误的输出到日志
  7.匹配所有文件

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
  files: [".html",".css",".phtml","php",".scss",".less",".js"],
  destLocPath: "src/www/static/localres/"
};
//console.log('destLocPath',destLocPath) // /example/www/static/localres/

const destSaveLoc = path.join(__dirname, locMap.destLocPath); // E:\work\downtolocal\example\www\static\localres\
//console.log('destSaveLoc',destSaveLoc)
const excludeTarget = [
  // "config",
  // "pub.html",
  // "views",
  // "www",
  // "demo",
  // "popup"
]; //精确到文件或者目录



//console.log('path.sep',path.sep)// windows: \


fsPathSys(
  path.join(__dirname, locMap.searchPath),
  locMap.files
);

function fsPathSys(fspath, targetFile) {
  //console.log("fspath", fspath);
  let stat = fs.statSync(fspath);
  if (stat.isDirectory()) { //是否是目录
    function isDirectory(err, files) {
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
              var isNeed = true;
              for (var i = 0; i < excludeTarget.length; i++) {
                if (
                  nowPath ===
                  path.join(__dirname, locMap.searchPath, excludeTarget[i])
                ) {
                  isNeed = false;
                }
              }
              if (!isNeed) return;
            }

            let stat = fs.statSync(nowPath);
            if (!stat.isDirectory()) {
              //如果路径不是目录，说明到底了
              targetFile.forEach((obj, index) => {
                if (~item.indexOf(obj)) {
                  readMatchFile(nowPath);
                }
              });
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

/*下载*/
var downloadImgs = function(src, dest, callback) {
  //文件源地址，下载后存放的目标地址
  request({url:src,timeout: 5000})
    .on('error', function(err){//要在pipe之前
      if(err.code == 'ESOCKETTIMEDOUT'){
        console.log('超时，下载失败',src,dest)  
      }
      callback(dest);
    })
    .pipe(fs.createWriteStream(dest))
    .on("close", function() {
      //读取到目标，写到最终目录里
      callback(dest);
    });
};

function startDownload(dir, imageLinks) {// 存放的目录位置,[下载链接1,下载链接2]
  var newDir = dir.indexOf(".") == -1 ? dir : path.dirname(dir);
  async.mapSeries(
    imageLinks,
    function(src, callback) {
      console.log(chalk.cyan.bold('下载',src));
      if (src.indexOf("http") == -1) src = "http:" + src;

      downloadImgs(
        src,
        path.resolve(newDir, dealFileName(src)),
        function(data) {//写完文件后
          // 保存的最终地址（目录+文件名）
          // console.log(err.code === 'ETIMEDOUT');
          // console.log(err.connect === true);
          callback(null, src);
        }
      );
    },
    function(err, results) {}
  );
}
/*下载*/

/*读取文件流*/
function readMatchFile(curPath) {
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
function mkdirsSync(name) {
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
function dealFileName(matched){
  var fileName = matched.split("/")[matched.split("/").length - 1];
  var hash = matched.match(new RegExp(cdnRule,'g'));
  var tag = hash?hash[0].substring(0,bit):'';
  fileName = (tag?(tag+'_'):'')+fileName;
  return fileName;
}

function matchDemo(curPath, body) {
  //读取文件内容，进行内容的替换
  //console.log('curPath',curPath)// E:\work\downtolocal\example\demo.html
  var proDestDir = '',targetPath = '',dirname = curPath.split(path.sep).join('/').match(
    new RegExp(locMap.searchPath + "\/(.*)") // 用RegExp 可以拼接变量
  );

  if (body.match(imgReg) && dirname) {
    //匹配到CDN
    //console.log('dirname',dirname)
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

    
    startDownload(proDestDir, body.match(imgReg)); //文件内的一块下载
    var endbody = body.replace(imgReg, function(matched) {//逐一替换
      
      //进行地址替换
      return (
        "/static/localres/" +
        targetPath +
        "/" +
        dealFileName(matched)
      );
    });

    writeFs(curPath, endbody); //将替换后的，写入文件内
  }
}

/*写文件*/
function writeFs(curPath, body) {
  //重写替换后的文件
  fs.writeFile(curPath, body, err => {
    if (err) throw err;
  });
}

process.on("exit", code => {
  console.log(chalk.red.bold('已匹配结束'));
});