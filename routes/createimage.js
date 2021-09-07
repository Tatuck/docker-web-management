var express = require("express");
var app = express.Router();
const fs = require("fs");
const tar = require("tar-fs");
const rimraf = require("rimraf");

if(!fs.existsSync("dockerImages/")){
    fs.mkdirSync("dockerImages/");
}

app.get("/images", function(req, res){
    var files = [];
    fs.readdirSync("dockerImages/").forEach(file=>{
        files.push(file);
    });
    res.render("images", {images:files});
});

app.get("/image/:name", function(req, res){
    const name = req.params.name;
    if(!name){
        return res.redirect("/createimage");
    }
    try{
        const fileContent = fs.readFileSync("dockerImages/"+name+"/Dockerfile");
        res.render("image", {image_name:name, content:fileContent.toString("utf-8")});
    }catch(err){
        return res.status(400).render("errorpage", {error:err.message})
    }
});

app.post("/image/:name", function(req, res){
    const name = req.params.name;
    if(!name){
        return res.redirect("/createimage");
    }
    const method = req.query.method;
    switch(method){
        case "save":
            var fileContent = req.body.content;
            if(fileContent === undefined){
                return res.status(400).send("File content can't be none");
            }
            fs.writeFileSync("dockerImages/"+name+"/Dockerfile", fileContent);
            return res.status(200).send("done");
        case "delete":
            rimraf.sync("dockerImages/"+name);
            return res.status(200).send("done");
        case "create":
            try{
                if(!fs.existsSync("dockerImages/"+name)){
                    fs.mkdirSync("dockerImages/"+name);
                }
                fs.writeFileSync("dockerImages/"+name+"/Dockerfile", "");
                res.send("done");
            }catch(err){
                res.status(500).send(err.message);
            }
            break;
        case "build":
            var fileContent = req.body.content;
            var imageTag = req.params.imagetag;
            if(fileContent === undefined){
                return res.status(400).send("File content can't be none");
            }
            fs.writeFileSync("dockerImages/"+name+"/Dockerfile", fileContent);

            docker.buildImage(
                tar.pack("dockerImages/"+name),
                {
                    t:imageTag
                }, function(err, stream){
                if(err){
                    console.log(err)
                    return res.status(500).send(err.message);
                }
                stream.pipe(res);
            });
            break;
    }
});

app.get("/installedimage/:id", function(req, res){
    const id = req.params.id;
    if(!id) return res.redirect("/images");
    var image = docker.getImage(id);
    image.inspect(function(err, data){
        if(err) return res.status(500).render("errorpage", {error:err.message});
        var arrayData = [];
        for(key in data){
            arrayData.push([key, data[key]]);
        }
        var imageName;
        if(data["RepoTags"] && data["RepoTags"][0]){
            imageName = data["RepoTags"][0];
        }else{
            imageName = data["Id"];
        }
        res.render("installedimage", {
            image_name: imageName,
            data:arrayData
        })
    });
});

module.exports = app;