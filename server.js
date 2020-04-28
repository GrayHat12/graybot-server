var debug = require('debug');
var https = require("https");
var fs = require("fs");
const dotenv = require('dotenv');
dotenv.config();

debug.enable('*');
debug = debug('https');
var id = '=>';

const connections = new Map();
class Custom {
  res;
  key;
  open;
  req;
  constructor(key , res, req) {
    this.key = key;
    this.res = res;
    this.open = true;
    this.req = req;
    this.closeConnection = this.closeConnection.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }
  closeConnection() {
    log('connection closed',{key : this.key});
    connections.delete(this.key);
  }
  sendMessage(message) {
    if (JSON.parse(message)["key"] == this.key) {
      return;
    }
    this.res.write("event: mr\n");
    this.res.write(`data: ${message}\n\n`);
  }
}

var server = https
  .createServer(function(req, res) {
    log('ping',{url : req.url, data : req.socket.address()});
    if (req.headers.accept && req.headers.accept == "text/event-stream") {
      if (req.url == "/events") {
        sendSSE(req, res);
      } else {
        res.writeHead(404);
        res.end();
      }
    } else if (req.url == "/message") {
        var body = "";
        req.on('data', function (chunk) {
            body += chunk;
        });
        req.on('end', function () {
            res.writeHead(200);
            res.write("done");
            res.end();
            body = body.replace(/ /g,'').replace(/\t/g,'').replace(/\n/g,'');
            connections.forEach((value,key,map)=>{
                value.sendMessage(body);
            });
        });
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(fs.readFileSync(__dirname + "/server.log"));
      res.end();
    }
  }).listen(process.env.port,()=>{
    log('started',server.address());
  });

function sendSSE(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  var con = new Custom(req.socket.localAddress, res, req);
  req.on("close", con.closeConnection);
  connections.set(con.key, con);
  log('new connection',{data : req.socket.address()});
  fs.writeFileSync(__dirname + "/server.log","");
  constructSSE(res, con.key);
}

function constructSSE(res, data) {
    res.write("event: key\n");
    res.write(`data: ${data}\n\n`);
}

function log(message = '',data){
  debug(`${id}\n\t\t${message}\n\t\t${JSON.stringify(data)}\n\t\t${connections.size}`);
}