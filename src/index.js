var express = require("express");
var app = express();
var multer = require("multer");
var upload = multer();
const config = require("./config.json");

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.set('views', __dirname + '/views');
app.use(express.json());
app.use(upload.array("content"));

var Docker = require('dockerode');
docker = new Docker();

app.use('/', require('./routes/index'));
app.use('/', require('./routes/edit'));
app.use('/', require('./routes/logs'));
app.use('/', require('./routes/create'));
app.use('/', require('./routes/terminal'));
app.use('/', require('./routes/createimage'));
app.use('/', require('./routes/files'));
app.use('/api', require('./routes/api'));
app.use('/static', express.static('css'));
app.use('/img', express.static('images'));

app.use(function(req, res, next){
    res.statusCode = 404;
    res.render('error', {'status_code':res.statusCode});
});

app.use(function(error, req, res, next){
    res.statusCode = error.status || 500;
    res.render('error', {'status_code':res.statusCode});
    console.error(error);
});

/*
process.on("uncaughtException", function(reason, promise){
    console.log('Unhandled exception (', promise, ') reason:', reason)
})
process.on("unhandledRejection", function(err){
    console.log('Unhandled exception:', reason)
})*/

app.listen(config.webpagePort);