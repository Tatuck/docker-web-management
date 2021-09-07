var express = require('express');
var app = express.Router();

app.get('/edit/:id', function(req, res){
    const id = req.params.id;
    if(!id){
        return res.redirect('/');
    }
    var container = docker.getContainer(id);
    const method = req.query.method
    if (method){
        switch(method){
            case "start":
                container.start(function(err, data){
                    if(err) return res.status(500).send(err);
                });
                break;
            case "stop":
                container.stop(function(err, data){
                    if(err) return res.status(500).send(err);
                });
                break;
            case "kill":
                container.kill(function(err, data){
                    if(err) return res.status(500).send(err);
                });
                break;
            case "restart":
                container.restart(function(err, data){
                    if(err) return res.status(500).send(err);
                });
                break;
            case "delete":
                container.kill(function(err, data){
                    container.remove(function(err, data){
                        if(err) return res.status(500).send(err);
                    });
                });
                break;
        }
        return res.send("done");
    }
    container.inspect(function (err, data) {
        if(err){
            res.render('errorpage', {'error':err.json.message});
            return;
        }
        var ports = []
        for(port in data.HostConfig.PortBindings){
            let hostPorts = []
            for(let i=0; i<data.HostConfig.PortBindings[port].length; i++){
                hostPorts.push(`${data.HostConfig.PortBindings[port][i].HostPort}`);
            }
            ports.push(`${port} => ${hostPorts.join(', ')}`)
        }
        var mounts = []
        data.Mounts.forEach(mount=>{
            mounts.push(`${mount.Type} ${(mount.RW) ? ("Read Write") : ("Only read") }: ${mount.Source}:${mount.Destination}`)
        });
        var dns;
        try{
            dns = data.HostConfig.Dns.join("\n");
        }catch{
            dns = undefined;
        }
        res.render('edit', {
            'container_name':data.Name,
            'id':id,
            'running':data.State.Running,
            'data':[
                //Info
                ['ID',data.Id],
                ['Name',data.Name],
                ['Created',data.Created],
                ['State',data.State.Status],
                ['Last start',data.State.StartedAt.split('.')[0]],
                ['Last stop',data.State.FinishedAt.split('.')[0]],
                //System
                ['Image',data.Config.Image],
                ['CMD',data.Config.Cmd],
                ['Entrypoint',data.Config.Entrypoint],
                ['Path',data.Path],
                ['Arguments',data.Args],
                ['Environmental variables', data.Config.Env],
                //Details
                ['Mounts',mounts],
                //Network
                ['Ports',ports],
                ['All ports public',data.HostConfig.PublishAllPorts],
                ['DNS',dns],
                ['Gateway',data.NetworkSettings.Gateway],
                ['Bridge',data.NetworkSettings.Bridge],
                ['AutoRemove',data.HostConfig.AutoRemove]
            ],
            'editable':[
                //Details
                ['CpuShares',data.HostConfig.CpuShares, 'number', "CpuShares"],
                ['Memory limit (bytes)',data.HostConfig.Memory, 'number', "Memory"],
                ['Disk limit (bytes)',data.HostConfig.DiskQuota, 'number', "DiskQuota"],
                //Other
                ['Restart policy',data.HostConfig.RestartPolicy.Name, 'array', ["no", "always", "unless-stopped", "on-failure"], "RestartPolicyName"],
                ['Restart policy maximun retry count', data.HostConfig.RestartPolicy.MaximumRetryCount, 'number', "RestartPolicyNameRetryCount"]
            ]
        });
    });
})

app.post('/edit/:id', function(req, res){
    const id = req.params.id;
    if(!id){
        return res.redirect('/');
    }
    var container = docker.getContainer(id);
    const method = req.query.method;
    if (method == "config"){
        var config = req.body.config;
        if(!config) return res.status(400).send("No config in body");
        var sendConfig = {}
        for(item in config){
            if (item == "RestartPolicyName"){
                if (!sendConfig["RestartPolicy"]) sendConfig["RestartPolicy"] = {};
                sendConfig["RestartPolicy"]["Name"] = config[item];
                continue;
            }
            if (item == "RestartPolicyNameRetryCount"){
                if (!sendConfig["RestartPolicy"]) sendConfig["RestartPolicy"] = {};
                sendConfig["RestartPolicy"]["MaximumRetryCount"] = config[item];
                continue;
            } 
            sendConfig[item] = config[item];
        }
        container.update(sendConfig, function(err, data){
            if(err){
                return res.status(500).send(err);
            }
            res.send("done");
        });
    }
});

app.get('/edit', function(req, res){
    return res.redirect('/');
})

module.exports = app;