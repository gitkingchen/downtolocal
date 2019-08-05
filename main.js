const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const async = require('async');
const request = require('request');

const imgReg = /(http[s]?:)?\/\/[0-9a-zA-Z.]*qhimg.*?\.(jpg|jpeg|gif|png|webp|ico)/g;
const destLocPath = 'www/static/localres/';

var destSaveLoc = path.join(__dirname,destLocPath);

const locMap = {
		searchPath:'/www',
		files:['.html']
	}

fsPathSys(locMap.searchPath,path.join(__dirname,locMap.searchPath), locMap.files);

function fsPathSys(stPath, fspath, targetFile) { //路径，['.js', '.phtml']
	let stat = fs.statSync(fspath)//返回实际存在的路径的相关属性
	if(stat.isDirectory()) {
		fs.readdir(fspath, isDirectory)
		function isDirectory(err, files) {//读取目录里所有文件
			if(err) {
				console.log('err',err)
				return err
			} else {
				files.forEach((item, index) => {
					if(item === '__MACOSX') { //mac无用文件
						execSync('rm -rf '+ fspath +'/__MACOSX')
					} else {
						//let nowPath = `${fspath}\\${item}`
						let nowPath = path.join(fspath,item);
						let stat = fs.statSync(nowPath)
						if(!stat.isDirectory()) {//如果路径不是目录，说明到底了
							targetFile.forEach((obj, index) => {
								if(~item.indexOf(obj)) {
									readMatchFile(stPath,nowPath)
								}
							})
						} else {//如果是目录，再执行
							fsPathSys(stPath,nowPath, targetFile)
						}
					}
					
				})
			}
		}
	}
	else {
		targetFile.forEach((obj, index) => {
			readMatchFile(stPath,fspath)
		})
	}	
}
	
/*下载图片*/
var downloadImgs = function(src, dest, callback) {//源地址，目标地址
	request(src).pipe(fs.createWriteStream(dest)).on('close', function() {//读取到的目标图片，写到最终目录里
		callback(dest);
	});
}

function startDownload(dir,imageLinks){
	var newDir = dir.indexOf('.') == -1?dir:path.dirname(dir);
	async.mapSeries(imageLinks, function(src, callback) {
		if(src.indexOf('http') == -1) src = 'http:'+src;
		downloadImgs(src , path.resolve(newDir,src.split("/")[src.split("/").length -1]) , function(data){
			// 图片保存的最终地址（目录+文件名）
			callback(null, src);
		});
	}, function(err, results) {
	});
}
/*下载图片*/

/*读文件*/
function readMatchFile(stPath,curPath) {
	let readAble = fs.createReadStream(curPath)
	let body = ''
	readAble.on('data', (chunk) => {
	  body += chunk
	})
	readAble.on('end', () => {
		matchDemo(stPath,curPath, body)
	})
}
/*读文件*/


/*创建目录*/
function mkdirsSync(name)  {
	if (fs.existsSync(name))  {
		return true;
	} else {
		if (mkdirsSync(path.dirname(name)))  {
			fs.mkdirSync(name);
			return true;
		}
	}
}
/*创建目录*/


function matchDemo(stPath,curPath, body) {
	var dirname = curPath.match(new RegExp(stPath.replace(/\//g,'\\\\')+'\\\\(.*)'));//没有目录归属的情况
	var proDestDir;
	
	if(body.match(imgReg) && dirname){//匹配到CDN图片的

    	if(dirname[1].indexOf('\\') != -1 ){//如果还有目录 / 
    		proDestDir = path.join(destSaveLoc,dirname[1]) 
			mkdirsSync(path.dirname(proDestDir));
		}else{//没有目录，直接进来
			proDestDir = path.join(destSaveLoc,'/',dirname[1].split('.')[0])
			mkdirsSync(proDestDir);
		}

		startDownload(proDestDir ,body.match(imgReg));//存放的目录位置，图片数组
		var endbody = body.replace(imgReg,function(matched){//替换相对地址
			
			var targetPath;
			if(dirname[1].indexOf('\\') != -1){
				targetPath = path.dirname(dirname[1]).replace(/\\/g,'/')
			}else{
				targetPath = dirname[1].split('.')[0]
			}

			return '/static/localres/' + targetPath + '/' + matched.split("/")[matched.split("/").length -1];
			
		});

		writeFs(curPath,endbody);
	}
}

/*写文件*/
function writeFs(curPath, body) {//重写替换后的文件
	fs.writeFile(curPath, body, (err) => {
	  	if (err) throw err;
	});
}



process.on('exit', (code) => {
  console.log('已匹配结束');
});



/*
	2种方式：
		原来什么结构就输出什么结构
		结构简单，以hash做区分

*/
