var express = require("express");
var app = express.Router();
const WebSocket = require("ws");
const http = require("http");
const config = require("../config.json");

app.get("/terminal/:id", function(req, res){
    const id = req.params.id;
    if(!id){
        return res.redirect("/");
    }
    var container = docker.getContainer(id);
    res.render("terminal", {container_name: container.id.substr(0, 10), container_id:container.id});
});

const server = http.createServer();
const wss = new WebSocket.Server({server:server, path:"/terminal"});

var sessions = {}

wss.on('connection', function(ws){
    ws.on('message', function(msg){
        try{
            messageHandler(JSON.parse(msg.toString()), ws);
        }catch{

        }
    });
})

const msgCodes = {
    start: 0,
    stdin: 1,
    stdout: 2,
    stdoutError:3,
    end: 4
}

function sendMessage(ws, msg, code) {
    ws.send(JSON.stringify([code, msg]));
}

class stdHandler{
    constructor(ws){
        this.stdOut = {
            write: function(content) {
                sendMessage(ws, content.toString(), msgCodes.stdout);
            }
        }
        this.stdErr = {
            write: function(content) {
                console.log("ERRROR");
                console.log(content);
                sendMessage(ws, content.toString(), msgCodes.stdoutError);
            }
        }
    }
}

const specialCharactersParser = {
    Enter: [13],
    Backspace:[127],
    ArrowUp: [27, 91, 65],
    ArrowDown: [27, 91, 66],
    ArrowLeft: [27, 91, 68],
    ArrowRight: [27, 91, 67]
}
const specialCharactersAvoid = ["Shift", "Control", "Alt"]

/*
process.stdin.resume();
process.stdin.setEncoding("utf-8");
process.stdin.setRawMode(true);

process.stdin.on("data", function(key){
    console.log(key);
    var charCode = [];
    for(let i=0; i<key.length; i++){
        charCode.push(key.charCodeAt(i))
    }
    console.log(charCode);
});*/


function messageHandler(message, ws){
    switch(message[0]){
        case msgCodes.start:
            const container = docker.getContainer(message[1]);
            container.exec({
                Cmd: ["sh"],
                AttachStdout: true,
                AttachStdin: true,
                AttachStderr: true,
                Tty: true,
                stream: true
            }, function(err, exec){
                if(err) return sendMessage(ws, err.message, msgCodes.stdoutError);
                exec.start({hijack:true, stdin:true, Detach:false}, function(err, stream){
                    if(err) return sendMessage(ws, err.message, msgCodes.stdoutError);
                    stream.on("close", function(ev){
                        sendMessage(ws, "[STREAM_END]", msgCodes.end);;
                        ws.close();
                    });
                    ws.on("message", function(key){
                        if(key in specialCharactersAvoid){
                            return;
                        }
                        var char = specialCharactersParser[key];
                        if(char){
                            for(let i=0; i<char.length; i++){
                                stream.write(String.fromCharCode(char[i]));
                            }
                        }else{
                            stream.write(key);
                        }
                    });
                    
                    var handler = new stdHandler(ws);
                    ws.on("close", function (ev) {
                        stream.end();
                    });
                    container.modem.demuxStream(stream, handler.stdOut, handler.stdErr);
                });
            });
            sessions[message[2]] = container;

    }
}

server.listen(config.websocketPort);

/*
app.post("/terminal/:id", function(req, res){
    const id = req.params.id;
    if(!id){
        return res.redirect("/");
    }
    var container = docker.getContainer(id);
    container.exec({
        Cmd: ["bash", "-c", "echo test $VAR"],
        Env: ["VAR=holaquetal"],
        AttachStdout: true,
        AttachStderr: true,
        AttachStdin: true
    }, function(err, exec){
        if(err){
            console.log(err);
            return res.status(500).send(err.message);
        }

        exec.start({
            stream: true,
            stdin: true,
            stdout: true,
            stderr: true
        },function(err, stream){
            if(err){
                console.log(err);
                return res.status(500).send(err.message);
            }
            stream.pipe(res);

            exec.inspect(function(err, data){
                if(err) console.log(err);
                console.log(data);
            });
        });
    });
});
*/

module.exports = app;