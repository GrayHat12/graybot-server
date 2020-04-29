var debug = require("debug");
var http = require("http");
var fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

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
  }
  closeConnection() {
    log("connection closed", { key: this.key });
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

var server = http
  .createServer(function(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    log("ping", { url: req.url, data: req.socket.address() });
    if (req.headers.accept && req.headers.accept == "text/event-stream") {
      if (req.url == "/events") {
        sendSSE(req, res);
      } else {
        res.writeHead(404);
        res.end();
      }
    } else if (req.url == "/message") {
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
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.write(fs.readFileSync(__dirname + "/server.log"));
      res.end();
    }
  })
  .listen(3000, () => {
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
