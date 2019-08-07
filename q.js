/* 
  使用说明：
  1.excludeTarget 可以排除文件或目录
  2.

  其他说明：
  1.同一级下，命名为相同名字的目录和文件名，并不会相互覆盖，在建立好目录后，都会追加到
  相应的目录里（Ep:demo目录和demo.html）
  2.区分windows和mac的路径
*/

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const async = require("async");
const request = require("request");

const imgReg = /(http[s]?:)?\/\/[0-9a-zA-Z.]*qhimg.*?\.(jpg|jpeg|gif|png|webp|ico)/g;
const destLocPath = "/example/www/static/localres/";

const destSaveLoc = path.join(__dirname, destLocPath);
const excludeTarget = [
  "config",
  "pub.html",
  "views/admin",
  "views/project3/other.html"
]; //精确到文件或者目录

const locMap = {
  searchPath: "/example",
  files: [".html"]
};

fsPathSys(
  locMap.searchPath,
  path.join(__dirname, locMap.searchPath),
  locMap.files
);

function fsPathSys(stPath, fspath, targetFile) {
  //console.log("stPath", stPath);
  //路径，['.js', '.phtml']
  //console.log("stPath", stPath);
  //console.log("fspath", fspath);
  let stat = fs.statSync(fspath); //返回实际存在的路径的相关属性
  //console.log("stat.isDirectory()", stat.isDirectory());
  if (stat.isDirectory()) {
    fs.readdir(fspath, isDirectory);
    function isDirectory(err, files) {
      //console.log("files", files);
      //读取目录里所有文件
      if (err) {
        console.log("err", err);
        return err;
      } else {
        files.forEach((item, index) => {
          if (item === "__MACOSX") {
            //mac无用文件
            execSync("rm -rf " + fspath + "/__MACOSX");
          } else {
            //let nowPath = `${fspath}\\${item}`
            let nowPath = path.join(fspath, item);
            //path.join(__dirname,stPath,)
            //console.log("fspath", fspath); //E:\work\downtolocal\example
            //console.log("item", item); //pub.html

            if (excludeTarget.length > 0) {
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
            //console.log("nowPath", nowPath); //E:\work\downtolocal\example\pub.html E:\work\downtolocal\example\config E:\work\downtolocal\example\views\admin

            let stat = fs.statSync(nowPath);
            if (!stat.isDirectory()) {
              //如果路径不是目录，说明到底了
              targetFile.forEach((obj, index) => {
                if (~item.indexOf(obj)) {
                  readMatchFile(stPath, nowPath);
                }
              });
            } else {
              //如果是目录，再执行
              fsPathSys(stPath, nowPath, targetFile);
            }
          }
        });
      }
    }
  } else {
    targetFile.forEach((obj, index) => {
      readMatchFile(stPath, fspath);
    });
  }
}

/*下载图片*/
var downloadImgs = function(src, dest, callback) {
  //源地址，目标地址
  request(src)
    .pipe(fs.createWriteStream(dest))
    .on("close", function() {
      //读取到的目标图片，写到最终目录里
      callback(dest);
    });
};

function startDownload(dir, imageLinks) {
  var newDir = dir.indexOf(".") == -1 ? dir : path.dirname(dir);
  async.mapSeries(
    imageLinks,
    function(src, callback) {
      console.log("下载", src);
      if (src.indexOf("http") == -1) src = "http:" + src;
      downloadImgs(
        src,
        path.resolve(newDir, src.split("/")[src.split("/").length - 1]),
        function(data) {
          // 图片保存的最终地址（目录+文件名）
          callback(null, src);
        }
      );
    },
    function(err, results) {}
  );
}
/*下载图片*/

/*读文件*/
function readMatchFile(stPath, curPath) {
  let readAble = fs.createReadStream(curPath);
  let body = "";
  readAble.on("data", chunk => {
    body += chunk;
  });
  readAble.on("end", () => {
    matchDemo(stPath, curPath, body);
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

function matchDemo(stPath, curPath, body) {
  //读取文件内容，进行内容的替换
  var dirname = curPath.match(
    new RegExp(stPath.replace(/\//g, "\\\\") + "\\\\(.*)")
  ); //没有目录归属的情况
  var proDestDir;

  if (body.match(imgReg) && dirname) {
    //匹配到CDN图片的

    if (dirname[1].indexOf("\\") != -1) {
      //如果还有目录 /
      proDestDir = path.join(destSaveLoc, dirname[1]);
      mkdirsSync(path.dirname(proDestDir));
    } else {
      //没有目录，直接进来
      proDestDir = path.join(destSaveLoc, "/", dirname[1].split(".")[0]);
      mkdirsSync(proDestDir);
    }

    startDownload(proDestDir, body.match(imgReg)); //开始进行下载：[存放的目录位置，图片数组]
    var endbody = body.replace(imgReg, function(matched) {
      //进行地址替换

      var targetPath;
      if (dirname[1].indexOf("\\") != -1) {
        targetPath = path.dirname(dirname[1]).replace(/\\/g, "/");
      } else {
        targetPath = dirname[1].split(".")[0];
      }

      return (
        "/static/localres/" +
        targetPath +
        "/" +
        matched.split("/")[matched.split("/").length - 1]
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
  console.log("已匹配结束");
});
