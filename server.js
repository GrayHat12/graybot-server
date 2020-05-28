var debug = require("debug");
var http = require("http");
var fs = require("fs");
const dotenv = require("dotenv");
const Gtube = require('gtube');
const Item = require('gtube/lib/Item');
dotenv.config();
const bigData = require('./stock-market/bigdata.json');
const url = require('url');
//const TrainedClassifier = require('./stock-market/estimator'); //uncomment when adding prediction script


debug.enable("*");
debug = debug("http");
var id = "=>";
var uniqueId = 0;

const connections = new Map();
class Custom {
  res;
  key;
  open;
  req;
  constructor(key, res, req) {
    this.key = key;
    this.res = res;
    this.open = true;
    this.req = req;
    this.closeConnection = this.closeConnection.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.searchTerm = this.searchTerm.bind(this);
    this.emit = this.emit.bind(this);
    this.recoverItem = this.recoverItem.bind(this);
  }
  closeConnection() {
    log("connection closed", { key: this.key });
    broadcastConnection();
    connections.delete(this.key);
  }
  sendMessage(message) {
    if (JSON.parse(message)["key"] == this.key) {
      return;
    }
    this.res.write("event: mr\n");
    this.res.write(`data: ${message}\n\n`);
  }
  sendConnection(size) {
    this.res.write("event: up\n");
    this.res.write(`data: ${size}\n\n`);
  }
  emit(eventKey,data){
    this.res.write(`event: ${eventKey}\n`);
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  searchTerm(recdata){
    var ob = new Gtube(recdata['term']);
    if('_nextpageref' in recdata){
      ob._nextpageref = recdata['_nextpageref'];
    }
    ob.process(true).then((val)=>{
      if(val==true){
        var items = [];
        for(var i=0;i<ob.size;i++){
          items.push(ob.item(i).data);
        }
        this.emit('sr',{items:items});
      }else{
        this.emit('srer',{error:ob._error});
      }
    });
  }
  recoverItem(recdata){
    var item = new Item(recdata['data']);
    item.getItemData().then((val)=>{
      this.emit('item',{data:val});
    }).catch((err)=>{
      this.emit('iter',{error: err});
    });
  }
}

var server = http
  .createServer(function(req, res) {
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*");
    log("ping", { url: req.url, data: req.socket.address() });
    if (req.headers.accept && req.headers.accept == "text/event-stream") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (req.url == "/events") {
        sendSSE(req, res);
      } else {
        res.writeHead(404);
        res.end();
      }
    } else if (req.url == "/message") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      var body = "";
      req.on("data", function(chunk) {
        body += chunk;
        log('chunk',chunk);
      });
      req.on("end", function() {
        res.writeHead(200);
        res.write("done");
        res.end();
        body = body
          .replace(/\t/g, "")
          .replace(/\n/g, "");
        try {
          var recdata = JSON.parse(body);
          log("recieved data with key",{key : recdata['key']});
          if (connections.has(recdata['key'])) {
            connections.forEach((value, key, map) => {
              value.sendMessage(body);
            });
          } else {
            log("unauthorized attempt to send message", {
              req: req.socket.address(),
            });
          }
        } catch (ex) {
          log("invalid request body", { body: body });
        }
      });
    } else if (req.url == "/search") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      var body = "";
      req.on("data", function(chunk) {
        body += chunk;
        log('chunk',chunk);
      });
      req.on("end", function() {
        body = body
          .replace(/\t/g, "")
          .replace(/\n/g, "");
        try{
          var recdata = JSON.parse(body);
          log("recieved data with key",{key : recdata['key']});
          if (connections.has(recdata['key'])) {
            connections.get(recdata['key']).searchTerm(recdata);
          } else {
            log("unauthorized attempt to search song", {
              req: req.socket.address(),
            });
            res.writeHead(202)
            res.write(`{error:"key not found"}`);
          }
        }catch(err){
          res.writeHead(400);
          res.write(`{error:"${err}"}`);
        }
        res.end();
      });
    } else if (req.url == "/song") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      var body = "";
      req.on("data", function(chunk) {
        body += chunk;
        log('chunk',chunk);
      });
      req.on("end", function() {
        body = body
          .replace(/\t/g, "")
          .replace(/\n/g, "");
        try{
          var recdata = JSON.parse(body);
          log("recieved data with key",{key : recdata['key']});
          if (connections.has(recdata['key'])) {
            connections.get(recdata['key']).recoverItem(recdata);
          } else {
            log("unauthorized attempt to search song", {
              req: req.socket.address(),
            });
            res.writeHead(202)
            res.write(`{error:"key not found"}`);
          }
        }catch(err){
          res.writeHead(400);
          res.write(`{error:"${err}"}`);
        }
        res.end();
      });
    } else if (req.url == "/companies") {
      //res.setHeader("Access-Control-Allow-Origin", "https://master.d223052u932tmn.amplifyapp.com");
      var companyList = Object.keys(bigData['Symbol']);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({list : companyList}));
    } else if (url.parse(req.url,true).pathname == "/company") {
      //res.setHeader("Access-Control-Allow-Origin", "https://master.d223052u932tmn.amplifyapp.com");
      var queryObject = url.parse(req.url,true).query;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({data : bigData['Symbol'][queryObject.name]}));
    } else if(url.parse(req.url,true).pathname == '/feature'){
      //res.setHeader("Access-Control-Allow-Origin", "https://master.d223052u932tmn.amplifyapp.com");
      var queryObject = url.parse(req.url,true).query;
      res.setHeader('Content-Type', 'application/json');
      var featureName = queryObject.f;
      var companyName = queryObject.c;
      var smalldata = bigData['Symbol'][companyName]['Technical Analysis'];
      var datatosend = {
        f: featureName,
        c: companyName,
        data : []
      };
      var dates = Object.keys(smalldata);
      for(var i=0;i<dates.length;i++){
        var date = dates[i];
        var value = smalldata[date][featureName];
        if(value!=null && typeof value!='undefined'){
          var key = Object.keys(value);
          value = value[key];
          datatosend.data.push({
            date : date,
            value : value
          });
        }
      }
      res.end(JSON.stringify(datatosend));
    } else if(url.parse(req.url,true).pathname == '/features'){
      //res.setHeader("Access-Control-Allow-Origin", "https://master.d223052u932tmn.amplifyapp.com");
      res.setHeader('Content-Type', 'application/json');
      var queryObject = url.parse(req.url,true).query;
      var companyName = queryObject.c;
      try{var smalldata = bigData['Symbol'][companyName]['Technical Analysis'];}
      catch(err){res.end('{error : "Failed 222"}')}
      var datatosend = {data : [],c: companyName};
      var dates = Object.keys(smalldata);
      for(var i=0;i<dates.length;i++){
        var date = dates[i];
        var features = Object.keys(smalldata[date]);
        for(var j=0;j<features.length;j++){
          if(datatosend.data.includes(features[j])) continue;
          datatosend.data.push(features[j]);
        }
      }
      res.end(JSON.stringify(datatosend));
    } else {
      res.setHeader("Access-Control-Allow-Origin", "https://master.d223052u932tmn.amplifyapp.com");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(fs.readFileSync(__dirname + "/server.log"));
      res.end();
    }
  })
.listen(process.env.PORT || 3000, () => {
    log("started", server.address());
  });

function sendSSE(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  var con = new Custom(''+uniqueId++, res, req);
  req.on("close", con.closeConnection);
  connections.set(con.key, con);
  log("new connection", { data: req.socket.address(), uid: con.key });
  constructSSE(res, con.key);
  broadcastConnection();
}

function broadcastConnection(){
  connections.forEach((value, key, map) => {
    value.sendConnection(connections.size);
  });
}

function constructSSE(res, data) {
  res.write("event: key\n");
  res.write(`data: "${data}"\n\n`);
  log("assigned key", { key: data });
}

function log(message = "", data) {
  debug(
    `${id}\n\t\t${message}\n\t\t${JSON.stringify(data)}\n\t\t${
      connections.size
    }`
  );
}