const express = require('express');

const app = express();

app.get("/", function(req,res){
    res.write("Hello World!");
    res.end();
});

app.listen(8080);