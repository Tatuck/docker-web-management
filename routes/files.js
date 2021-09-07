var express = require("express");
var app = express.Router();

app.get("/files/:id", function(req, res){
    const id = req.params.id;
    if(!id) return res.status(400).render("errorpage", {error:"Id can't be none"});
    const container = docker.getContainer(id);
    res.render("files", {id:container.id, container_name:container.id.substr(0,12)});
});

module.exports = app;