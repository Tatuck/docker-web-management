var express = require('express')
var Docker = require('dockerode');
var docker = new Docker();
var app = express.Router()

app.get('/', function(req, res){
    docker.listContainers(function(err, containers){
        if(err){
            throw err;
        }
        res.render('index', {'all':false,'containers':containers});
    });
})
app.get('/all', function(req, res){
    docker.listContainers({all:true}, function(err, containers){
        if(err){
            throw err;
        }
        res.render('index', {'all':true, 'containers':containers});
    });
})


module.exports= app