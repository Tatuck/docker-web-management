var express = require('express');
var stream = require('stream');
var app = express.Router();
const fs = require("fs");
const tar = require("tar-fs");
const rimraf = require("rimraf");

/*
var config = require('../config.json')

const server = http.createServer(express);
const wss = new ws.Server({server})


wss.on('connection', function connection(ws){
    ws.on('message', function incoming(data){
        const parsedData = JSON.parse(data.toString());
        switch(parsedData.method){
            case "pull":
                docker.pull(parsedData.data, function(err, stream){
                    if(err){
                        ws.send(JSON.stringify({type:"error", data:err}))
                        return;
                    }
                    console.log(stream);
                    console.log("/////////////////////////////////////////////////////////////////////////")
                    ws.send(JSON.stringify({type:"message", data:"downloaded"}));
                });
                break;
            case "listimages":
                docker.listImages(function(err, data){
                    if(err){
                        return ws.send(JSON.stringify({type:"error", data:err}));
                    }
                    data.forEach((image)=>{
                        images.push(image.RepoTags);
                    })
                    ws.send(JSON.stringify({type:"message", data:images}))
                });
                break;
        }

    })
})


process.on('exit', function(code){
    wss.off()
})

server.listen(config.websocketPort, function(){
    console.log("Websocket listening, port:",config.websocketPort)
})
*/

app.get('/listimagesname', function(req, res){
    let images = []
    docker.listImages(function(err, data){
        if(err){
            return res.json({type:"error", data:err});
        }
        data.forEach((image)=>{
            if(image.RepoTags && image.RepoTags[0]){
                images.push(image.RepoTags[0]);
            }else{
                images.push(image.Id.substr(0,12));
            }
        })
        res.json({type:"message", data:images});
    });
});

app.get('/listimages', function(req, res){
    docker.listImages(function(err, data){
        if(err) return res.status(500).send(err.message);
        res.json(data);
    });
});

app.get("/pullimage", function(req, res){
    const tag = req.query.tag;
    if(!tag) return res.status(400).send("Tag can't be none");
    docker.pull(tag, function(err, stream){
        if(err) return res.status(500).send(err.message);
        stream.pipe(res);
    });
});

app.get("/imageremove/:name", function(req, res){
    const name = req.params.name;
    if(!name) return res.status(400).send("Image name can't be none");
    const image = docker.getImage(name);
    if(!image) return res.status(500).send("Couldn't find that image");
    image.remove(function(err, data){
        if(err) return res.status(500).send(err.message);
        res.json(data);
    })
})

app.get('/logs/:id', function(req, res){
    if(!req.params.id){
        return res.redirect('/');
    }
    var container = docker.getContainer(req.params.id);
    if (req.query.follow=="true"){
        var logStream = new stream.PassThrough();
        logStream.on('data', function(chunk){
            res.write(chunk.toString('utf8'));
        });
        res.setHeader('Keep-Alive', 'timeout=99999999');
        container.logs({follow:true, stdout:true, stderr:true}, function(err, stream){
            if (err){
                return res.send(err);
            }
            container.modem.demuxStream(stream, logStream, logStream);
            stream.on('end', function(){
                logStream.end('[STREAM STOPPED]');
                res.end();
            });
        });
    }else{
        container.logs({stdout:true, stderr:true}, function(err, logs){
            if (err){
                return res.send(err.message);
            }
            res.send(logs.toString('utf8'));
        });
    }
});

app.get("/files/:id", function(req, res){
    const id = req.params.id;
    if(!id) return res.status(400).render("errorpage", {error:"Id can't be none"});
    var container = docker.getContainer(id);
    if(!container) return res.status(500).render("errorpage", {error:"Couldn't find the container"});
    if(!fs.existsSync("temp/"+container.id+"/extract") || req.query.update=="true"){
        container.getArchive({path:"/"}, function(err, stream){
            if(err) return res.status(500).render("errorpage", {error:err.message});
            try{
                if(fs.existsSync("temp/"+container.Id)) rimraf.sync("temp/"+container.Id);
            }catch(err){
                return res.status(500).send(err.message);;
            }
            try{
                if(!fs.existsSync("temp/")) fs.mkdirSync("temp");
                if(!fs.existsSync("temp/"+container.id)) fs.mkdirSync("temp/"+container.id);    
            }catch(err){
                return res.status(500).send(err.message);
            }
            res.write(JSON.stringify({info:"Getting files", type:"info"}));
            var writeStream = fs.createWriteStream("temp/"+container.id+"/files.tar");
            stream.pipe(writeStream);
    
            stream.on("end", ()=>{
                res.write(JSON.stringify({info:"Extracting", type:"info"}));
                fs.createReadStream("temp/"+container.id+"/files.tar")
                    .pipe(tar.extract("temp/"+container.id+"/extract"))
                        .on("finish", function(){
                            res.end(JSON.stringify({info:"Finished", type:"info"}));
    
                        });
            });
        });
    }else{
        res.end(JSON.stringify({info:"Finished", type:"info"}));
    }
});

app.post("/listfiles/:id", function(req, res){
    const id = req.params.id;
    if(!id) return res.status(400).send("Id can't be none");
    var container = docker.getContainer(id);
    if(!container) return res.status(500).send("Couldn't find the container");
    if(!fs.existsSync("temp/"+container.id+"/extract")) return res.status(500).send("Couldn't find files");
    const path = req.body.path;
    var fullPath = "temp/"+container.id+"/extract"
    if(path){
        fullPath+=path;
    }
    var sendFiles = [];
    fs.readdir(fullPath, {withFileTypes:true}, function(err, files){
        if(err) return res.status(500).send(err.message);
        files.forEach(file=>{;
            sendFiles.push([file.name, file.isDirectory()])
        });
        res.json(sendFiles);
    });
});

app.post("/file/:id", function(req, res){
    const id = req.params.id;
    if(!id) return res.status(400).send("Id can't be none");
    const container = docker.getContainer(id);
    if(!container) return res.status(500).send("Couldn't find the container");
    var path = req.body.path;
    if(!path) return res.status(400).send("Path can't be none");
    if(req.query.method != "upload"){
        if(!fs.existsSync("temp/"+container.id+"/extract"+path)) return res.status(500).send("Couldn't find the file");
    }
    switch(req.query.method){
        case "get":
            fs.createReadStream("temp/"+container.id+"/extract"+path, {encoding:"utf-8"}).pipe(res);
            break;
        case "save":
            if(!req.body.content) return res.status(400).send("File data can't be none");
            fs.writeFileSync("temp/"+container.id+"/extract"+path, req.body.content);
            res.json({type:"info", info:"done"});
            break;
        case "download":
            var pathSplit = path.split("/");
            filename = pathSplit.pop();
            path = pathSplit.join("/");
            if(filename){
                tar.pack("temp/"+container.id+"/extract"+path, {entries:[filename]}).pipe(res);
            }else{
                tar.pack("temp/"+container.id+"/extract"+path).pipe(res);
            }
            break;
        case "upload":
            if(!req.files) return res.status(400).send("File data can't be none");
            var filenames = [];
            for(let i=0; i<req.files.length; i++){
                fs.writeFileSync("temp/"+container.id+"/extract"+path+req.files[i].originalname, req.files[i].buffer);
                filenames.push(req.files[i].originalname)
            }
            tar.pack("temp/"+container.id+"/extract"+path, {
                entries:filenames, 
                finish: function(pack){
                    container.putArchive("temp/"+container.id+"/temp.tar", {path:path}, function(err, data){
                        if(err) return res.status(500).send(err.message);
                        res.json({type:"info", info:"uploaded "+path});
                    });
                }
            }).pipe(fs.createWriteStream("temp/"+container.id+"/temp.tar"));
            
            break;
    }
});

module.exports = app;