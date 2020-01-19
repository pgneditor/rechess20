const ENGINE_READY = 0
const ENGINE_RUNNING = 1
const ENGINE_STOPPING = 2

const MATE_SCORE = 10000

const VERBOSE = false

class Engine{
  setcommand(command, payload){
    this.command = command
    this.payload = payload
    //if(command == "go") console.log("fen", payload.fen)    
  }

  processstdout(data){    
    data = data.replace(/\r/g, "")
    for(let line of data.split("\n")){
      this.processstdoutline(line)
    }
  }

  processstdoutline(line){           
      if(VERBOSE) console.log("line", line)
    if(line.match(/^bestmove/)){
      if(VERBOSE) console.log("bestmove received")      
      this.analysisinfo.state = ENGINE_READY

      this.sendanalysisinfo(this.analysisinfo)

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
            if(VERBOSE) console.log(err)
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
        if(VERBOSE) console.log(summary)
        this.analysisinfo.lastcompleteddepth = this.lastcompleteddepth
        this.analysisinfo.summary = summary
        
        if(this.analysisinfo.lastcompleteddepth >= 0){
          this.sendanalysisinfo(this.analysisinfo)
        }        
      }
    }      
  }

  issuecommand(command){
      if(VERBOSE) console.log("engine command", command)
      stockfish.postMessage(command)
  }

  go(payload){
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
    this.analyzedfen = payload.fen     
    this.variant = payload.variant || DEFAULT_VARIANT        
    this.analysiskey = payload.analysiskey || `analysis/${this.variant}/${strippedfen(this.analyzedfen)}`               
    this.analyzedboard = ChessBoard().setfromfen(this.analyzedfen, this.variant)

    this.analysisinfo = {      
      multipv: this.multipv,    
      analyzedfen: this.analyzedfen,        
      variant: this.variant,
      analysiskey: this.analysiskey,
      lastcompleteddepth: 0,
      summary: []
    }

    this.issuecommand(`setoption name UCI_Variant value ${this.variant == "standard" ? "chess" : this.variant}`)
    this.issuecommand(`setoption name MultiPV value ${this.multipv}`)        
    this.issuecommand(`position fen ${this.analyzedfen}`)    
    this.issuecommand(`go infinite`)   

    this.analysisinfo.state = ENGINE_RUNNING    

    this.lastgocommand = performance.now()

    this.sendanalysisinfo(this.analysisinfo)
  }

  stop(){
    if(this.analysisinfo.state != ENGINE_RUNNING) return
    this.issuecommand("stop")
    this.analysisinfo.state = ENGINE_STOPPING    

    this.sendanalysisinfo(this.analysisinfo)
  }

  processstockfish(message){
    this.processstdout(message.data)    
  }

  spawn(){
      this.summary = [ "engine ready" ]

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

      initstockfish(this.processstockfish.bind(this))
  }

  checkcommand(){    
    if(this.command){
        if(this.command == "go"){                
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
        if(this.command == "stop"){        
            this.stop()          
            this.command = null
        }      
    }
  }

  constructor(sendanalysisinfo){      
      this.sendanalysisinfo = sendanalysisinfo

      this.spawn()

      setInterval(this.checkcommand.bind(this), 200)
  }
}
