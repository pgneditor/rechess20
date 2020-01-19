const express = require('express')
const spawn = require('child_process').spawn
const fs = require('fs')
const { performance } = require('perf_hooks')

const chessboard = require('./src/module/chessboard.js')
const sse = require('./src/module/sse.js')
const { update } = require('./octokit.js')

const fromEntries = require('object.fromentries')

const UPDATE_PATH = "analysis/backup.txt"

const DEFAULT_VARIANT = "atomic"

if (!Object.fromEntries){
	fromEntries.shim()
}

const app = express()

let engine

function IS_DEV(){
  return process.env.RECHESS_DEV
}

const AUTH_TOPICS = ["bucket:put", "engine:go", "engine:stop", "engine:kill", "git:put"]

const QUERY_INTERVAL = process.env.QUERY_INTERVAL || 3000

const PORT = process.env.PORT || 8080

const MATE_SCORE = 10000

let sacckeyb64 = ""
let i = 1
do{
    var chunk = process.env[`SACCKEY_CHUNK${i++}`]
    if(chunk) sacckeyb64 += chunk
}while(chunk)
const sacckey = new Buffer(sacckeyb64, 'base64').toString("ascii")
//console.log("sacckey", sacckey)
var bucket = null
fs.writeFile("composedsacckey.json", sacckey, function(err) {
    console.log("written sacckey")

    var admin = require("firebase-admin")

    admin.initializeApp({
        credential: admin.credential.cert("composedsacckey.json"),
        storageBucket: "pgneditor-1ab96.appspot.com"
    })

    bucket = admin.storage().bucket()

    console.log("bucket created"/*, bucket*/)
})

const ENGINE_READY = 0
const ENGINE_RUNNING = 1
const ENGINE_STOPPING = 2

function strippedfen(fen){
  return fen.split(" ").slice(0, 4).join(" ")
}

class Engine{
  setcommand(command, payload, res){
    this.command = command
    this.payload = payload
    if(command == "go") console.log("fen", payload.fen, "gocnt", payload.gocnt)
    res.send(JSON.stringify({ok: "set command " + command + " current state " + this.analysisinfo.state}))
  }

  processstdout(data){
    data = data.replace(/\r/g, "")
    for(let line of data.split("\n")){
      this.processstdoutline(line)
    }
  }

  processstdoutline(line){           
    if(line.match(/^bestmove/)){
      console.log("bestmove received")      
      this.analysisinfo.state = ENGINE_READY

      ssesend(this.analysisinfo)

      return
    }
    if(line.match(/^info/)){
      let depth = null
      let mdepth = line.match(/ depth (.+)/)
      if(mdepth){
        depth = parseInt(mdepth[1])          
      }                
      let mtime = line.match(/ time (.+)/)
      if(mtime){
        this.analysisinfo.time = parseInt(mtime[1])          
      }                
      let mnodes = line.match(/ nodes (.+)/)
      if(mnodes){
        this.analysisinfo.nodes = parseInt(mnodes[1])          
      }                
      let mnps = line.match(/ nps (.+)/)
      if(mnps){
        this.analysisinfo.nps = parseInt(mnps[1])          
      }                
      let move = null
      let mp = line.match(/ pv (.+)/)      
      if(mp){
        let pv = mp[1].split(" ")
        move = pv[0]          
        let state = this.analyzedboard.getstate()
        let pvsan = []
        for(let algeb of pv){
          try{
            let move = this.analyzedboard.algebtomove(algeb)
            pvsan.push(this.analyzedboard.movetosan(move))            
            this.analyzedboard.pushalgeb(algeb)
          }catch(err){
            //console.log(err)
          }                                
        }
        this.pvsans[move] = pvsan
        this.pvalgebs[move] = pv
        this.analyzedboard.setstate(state)
      }        
      if(depth){
        if(depth < this.highestdepth) return
        this.highestdepth = depth
      }        
      if(!move) return
      let scorecp = null
      let mscp = line.match(/ score cp (.+)/)
      if(mscp){
        scorecp = parseInt(mscp[1])
      }
      let scoremate = null
      let msmate = line.match(/ score mate (.+)/)
      if(msmate){
        scoremate = parseInt(msmate[1])
      }
      let scorenumerical = scorecp
      if(scoremate){
        if(scoremate < 0){
          scorenumerical = - MATE_SCORE - scoremate
        }else{
          scorenumerical = MATE_SCORE - scoremate
        }
      }        
      this.pvs[move] = {depth: this.highestdepth, scorecp: scorecp, scoremate: scoremate, scorenumerical: scorenumerical}        
      let newpvs = {}
      for(let move in this.pvs){
        if(this.pvs[move].depth >= (this.highestdepth - 1)){
          newpvs[move] = this.pvs[move]
        }
      }
      this.pvs = newpvs        
      this.sortedpvs = Object.keys(this.pvs).sort((a, b)=>this.pvs[b].scorenumerical - this.pvs[a].scorenumerical)                                
      if(this.sortedpvs.length >= this.multipv){
        let mindepth = null
        for(let move of this.sortedpvs.slice(0, this.multipv)){            
          let currentdepth = this.pvs[move].depth
          if(mindepth === null) mindepth = currentdepth
          else if(currentdepth < mindepth) mindepth = currentdepth
        }
        this.completeddepth = mindepth          
      }        
      if(this.completeddepth > this.lastcompleteddepth){
        this.lastcompleteddepth = this.completeddepth        
        let summary = []
        let i = 0
        for(let uci of this.sortedpvs.slice()){
          if(i<this.multipv){            
            summary.push({
              multipv: i+1,
              depth: this.lastcompleteddepth,
              uci: uci,
              scorenumerical: this.pvs[uci].scorenumerical,
              pvsans: this.pvsans[uci]
            })                    
          }        
          i++
        }
        //console.log(summary)
        this.analysisinfo.lastcompleteddepth = this.lastcompleteddepth
        this.analysisinfo.summary = summary
        
        if(this.analysisinfo.lastcompleteddepth >= 0){
          ssesend(this.analysisinfo)
        }        
      }
    }      
  }

  issuecommand(command){
      console.log("engine command", command)
      this.process.stdin.write(command + "\n")      
  }

  go(payload){
    if(payload.gocnt < this.lastgocnt) return

    this.highestdepth = 0
    this.completeddepth = 0
    this.lastcompleteddepth = 0
    this.pvs = {}
    this.pvsans = {}
    this.pvalgebs = {}
    this.sortedpvs = []
    this.time = 0
    this.nodes = 0
    this.nps = 0

    this.multipv = payload.multipv || 1    
    this.threads = payload.threads || 1
    this.analyzedfen = payload.fen            
    this.variant = payload.variant || DEFAULT_VARIANT    
    this.analysiskey = payload.analysiskey || `analysis/${this.variant}/${strippedfen(this.analyzedfen)}`    
    this.analyzedboard = chessboard.ChessBoard().setfromfen(this.analyzedfen, this.variant)

    this.analysisinfo = {      
      multipv: this.multipv,    
      analyzedfen: this.analyzedfen,        
      variant: this.variant,
      threads: this.thrads,
      analysiskey: this.analysiskey,
      lastcompleteddepth: 0,
      summary: []
    }

    this.issuecommand(`setoption name UCI_Variant value ${this.variant == "standard" ? "chess" : this.variant}`)        
    this.issuecommand(`setoption name MultiPV value ${this.multipv}`)    
    this.issuecommand(`setoption name Threads value ${this.threads}`)    
    this.issuecommand(`position fen ${this.analyzedfen}`)    
    this.issuecommand(`go infinite`)   

    this.analysisinfo.state = ENGINE_RUNNING    

    this.lastgocommand = performance.now()

    ssesend(this.analysisinfo)
  }

  stop(){
    if(this.analysisinfo.state != ENGINE_RUNNING) return
    this.issuecommand("stop")
    this.analysisinfo.state = ENGINE_STOPPING    

    ssesend(this.analysisinfo)
  }

  spawn(){
      this.summary = [ "engine ready" ]

      this.process = spawn(this.path)

      this.process.stdout.on('data', (data)=>{
          this.processstdout(`${data}`)
      })

      this.process.stderr.on('data', (data)=>{
          this.processstdout(`${data}`)
      })

      this.analysisinfo = {
        state: ENGINE_READY,
        summary: [],        
        lastcompleteddepth: 0,        
        time: 0,
        nodes: 0,
        nps: 0,
        multipv: null,
        analyzedfen: null,        
        variant: null,
        threads: null,
        analysiskey: null,
      }
  }

  kill(){
    this.process.kill()

    this.spawn()

    return "engine killed"
  }

  checkcommand(){    
    if(this.command){
      if(this.command == "go"){        
        if(this.payload.gocnt >= this.lastgocnt){
          if(this.analysisinfo.state != ENGINE_READY){            
              this.stop()          
          }else{          
            if( (performance.now() - this.lastgocommand) < 1000 ){
              return
            }
            this.go(this.payload)
            this.command = null
          }
        }
        this.lastgocnt = this.payload.gocnt
        }
      if(this.command == "stop"){        
        this.stop()          
        this.command = null
      }      
    }
  }

  constructor(path){
      this.path = path

      this.spawn()

      this.lastgocommand = 0
      this.lastgocnt = 0

      setInterval(this.checkcommand.bind(this), 200)
  }
}

engine = new Engine(IS_DEV() ? './src/bin/stockfish' : '/app/src/bin/stockfish')

let RESOURCE_ITEMS = [
  {path: "src/docs/index.md", key: "index"}
]

let RESOURCES_JSON_B64 = Buffer.from(JSON.stringify(Object.fromEntries(RESOURCE_ITEMS.map((item)=>[item.key, fs.readFileSync(item.path).toString()])))).toString('base64')

app.get('/', (req, res) => res.send(`
<!DOCTYPE html>
<html lang="en">

  <head>

    <meta charset="utf-8" />

    <title>React Chess</title>

    <link rel="icon" href="/src/icon/favicon.ico" />

    <link rel="stylesheet" href="src/css/style.css?ver=1577052137991.4358" />   
    <link rel="stylesheet" href="src/piece/alpha.css" />   

    ${(IS_DEV())?
    `
        <!--<script crossorigin src="https://unpkg.com/react@16/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@16/umd/react-dom.development.js"></script>--!>
        <script src="src/cdn/react.development.js"></script>
        <script src="src/cdn/react-dom.development.js"></script>
        <script src="src/cdn/jszip.js"></script>
        <script src="src/cdn/gif.js"></script>        
    `:`
        <!--<script crossorigin src="https://unpkg.com/react@16/umd/react.production.min.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@16/umd/react-dom.production.min.js"></script>--!>
        <script src="src/cdn/react.production.min.js"></script>
        <script src="src/cdn/react-dom.production.min.js"></script>
        <script src="src/cdn/jszip.min.js"></script>        
        <script src="src/cdn/gif.js"></script>        
    `}

    <script src="src/cdn/showdown.min.js"></script>

    <script>
    const QUERY_INTERVAL = ${QUERY_INTERVAL}
    const INITIAL_GO_CNT = ${engine.lastgocnt}
    const RESOURCES_JSON_B64 = "${RESOURCES_JSON_B64}"
    </script>
    <script src="src/js/utils.js?ver=1579410769463.6377"></script>
    <script src="src/js/indexeddb.js?ver=1579421938078.164"></script>
    <script src="src/js/lichess.js?ver=1579153422407.1287"></script>
    <script src="src/module/chessboard.js?vno=1579334861429.4084"></script>
    <script src="src/js/engine.js?ver=1579258145719.7246"></script>
    <script src="src/js/chess.js?ver=1579340222210.3394"></script>
    <script src="src/js/widgets.js?ver=1579410179245.798"></script>        

  </head>

  <body>

    <div id="root"></div>

    <script src="src/js/index.js?ver=1579433158930.2678"></script>

  </body>

</html>
`))

app.use(express.static(__dirname))
app.use(express.json({limit: '100MB'}))

//////////////////////////////////////////////////
// sse

const MAX_SSE_CONNECTIONS = 100

let sseconnections = []
app.use(sse)

app.get('/stream', function(req, res) {  
  res.sseSetup()  
  sseconnections.push(res)
  while(sseconnections.length > MAX_SSE_CONNECTIONS) sseconnections.shift()
  console.log("new stream", req.hostname, "conns", sseconnections.length)
})

app.get('/gif.worker.js', function(req, res) {  
  res.sendFile(`${__dirname}/src/cdn/gif.worker.js`)
})

function ssesend(obj){
  for(let i = 0; i < sseconnections.length; i++){
    sseconnections[i].sseSend(obj)
  }
}

//////////////////////////////////////////////////

const HANDLERS = {
  "engine:go": function(res, payload){
    engine.setcommand("go", payload, res)    
  },
  "engine:stop":function(res, _){
    engine.setcommand("stop", null, res)
  },
  "engine:query":function(res, _){    
    res.send(JSON.stringify(engine.analysisinfo))
  }
  ,
  "engine:kill":function(res, _){    
    engine.setcommand("kill", null, res)
  }
  ,
  "bucket:put":function(res, payload){    
    let filename = payload.filename    
    let content = payload.content
    console.log(`put bucket ${filename} content size ${content.length}`)
    fs.writeFile("temp.txt", content, function(err) {
        console.log("written file locally")
        bucket.upload("temp.txt", {destination: filename}, (err, file, apiResoponse)=>{
            console.log("upload result", err, apiResoponse)
            res.send(JSON.stringify({error: err, apiresponse: apiResoponse}))
        })    
    })
  }
  ,
  "bucket:get":function(res, payload){    
    if(!bucket){
      res.send(JSON.stringify({error: "Error: No bucket."}))
      return
    }
    let filename = payload.filename
    console.log("dowloading", filename)
    bucket.file(filename).download((err, contents)=>{
        if(err){
            res.send(JSON.stringify({error: "Error: Not found."}))
        }else{
            res.send(JSON.stringify({content: contents.toString()}))
        }            
    })
  },
  "git:put":function(res, payload){    
    let filename = payload.filename    
    let content = payload.content
    console.log(`git put ${filename} content size ${content.length}`)
    update(filename, content, (result)=>{
      res.send(JSON.stringify(result))
    })
  }
}

const DONT_LOG_TOPICS = ["engine:query"]

app.post('/api', (req, res) => {                
  let body = req.body

  let topic = body.topic  
  let payload = body.payload

  if(AUTH_TOPICS.includes(topic)){
    if(payload.pass != process.env.PASS){
      res.send(JSON.stringify({error: "Error: Not authorized."}))
      console.log("not authorized")
      return
    }
  }

  if(!DONT_LOG_TOPICS.includes(topic)){
    console.log("api", topic)
  }

  try{
    HANDLERS[topic](res, payload)    
  }catch(err){
    console.log("api error", err)
    res.send(JSON.stringify({error: `API Error: ${err}`}))
  }  
})

console.log("query interval", QUERY_INTERVAL)

setInterval(function(){  
  ssesend("tick")  
}, QUERY_INTERVAL)

app.listen(PORT, () => console.log(`React Chess listening on port ${PORT}.`))
