
const express = require('express')

var app = express()

// the __dirname is the location of index.js
app.get('/', function (req, res) {
    console.log(req.url)
    res.sendFile(__dirname + '/' + 'index.html')
})

// any other get requests (files)
app.get('/*', function (req, res) {
    console.log(req.url);
    res.sendFile(__dirname + req.url)
})

// listen specific PORT
const port = 5000
const server = app.listen(port, function () {
    console.log('Node server is running at port: ' + port)
})