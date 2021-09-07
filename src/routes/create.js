var express = require('express');
var app = express.Router();

const requestBody = [
    {
        "name":"Hostname",	
        "type":"string"
    },
    {
        "name":"Domainname",	
        "type":"string"
    },
    {
        "name":"User",	
        "type":"string"
    },
    {
        "name":"WorkingDir",	
        "type":"string"
    },
    {
        "name":"NetworkDisabled",	
        "type":"boolean"
    },
    {
        "name":"MacAddress",	
        "type":"string"
    },
    {
        "name":"CpuShares",	
        "type":"string"
    },
    {
        "name":"Memory",	
        "type":"number"
    },
    {
        "name":"CpuPeriod",	
        "type":"number"
    },
    {
        "name":"CpuQuota",	
        "type":"number"
    },
    {
        "name":"CpuRealtimePeriod",	
        "type":"number"
    },
    {
        "name":"CpuRealtimeRuntime",	
        "type":"number"
    },
    {
        "name":"DiskQuota",	
        "type":"number"
    },
    {
        "name":"KernelMemory",	
        "type":"number"
    },
    {
        "name":"MemoryReservation",	
        "type":"number"
    },
    {
        "name":"MemorySwap",	
        "type":"number"
    },
    {
        "name":"NanoCpus",	
        "type":"number"
    },
    {
        "name":"RestartPolicy",	
        "type":"object",
        "object": [
            {
                "name":"Name",
                "type": "select",
                "object":[["off", ""], "always", "unless-stopped", "on-failure"]
            },
            {
                "name":"MaximumRetryCount",
                "type": "number"
            }
        ]
    },
    {
        "name":"MemoryReservation",	
        "type":"number"
    },
    {
        "name":"MemoryReservation",	
        "type":"number"
    }
]

app.get('/create', function(req, res){
    res.render('create', {parameters:requestBody});
});

app.post('/create', function(req, res){
    var config = req.body.config
    config.AttachStdin = false;
    config.AttachStdout = true;
    config.AttachStdin = false;
    config.OpenStdin = true;
    config.StdinOnce = true;
    docker.createContainer(config).then(function(container){
        return res.send(container.id);
    }).catch(function(err){
        return res.status(500).send(err.message);
    });
});

module.exports = app;