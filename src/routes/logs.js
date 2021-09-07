var express = require('express')
var app = express.Router();

app.get('/logs/:id', function(req, res){
    if(!req.params.id){
        return res.redirect('/');
    }
    var container = docker.getContainer(req.params.id);
    res.render('logs', {container_id:container.id.substr(0,12), id:container.id})
});

module.exports = app;