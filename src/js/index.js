const markdownconverter = new showdown.Converter()

const START_ANIMATION = true
const RECORD_ANIMATION = true

const LOAD_DELAY = 1000
const ALERT_DELAY = 3000

const DO_COMMENTS = true

function ALL_STORES(){return [ ["engine", "analysiskey"] , ["study", "title"] ]}

let TREE_WIDTH = 20000

const BACKUP_REMOTE = 0
const BACKUP_LOCAL = 1
const BACKUP_BLOB = 2
const BACKUP_GIT = 3

const ASK_FOR_PASS = true
const STORE_PASS = true

const DO_COPY = true

const OMIT_ALERT = true

const SQUARE_SIZE = getlocalintelse("piecesize", 60)

const BOARD_SIZE = SQUARE_SIZE * NUM_SQUARES
const HALF_BOARD_SIZE = BOARD_SIZE / 2
const BOARD_SIZE_PX = BOARD_SIZE + "px"

const TAB_WIDTH_PX = "855px"

const LEGAL_MOVES_WIDTH = 280
const ENGINE_PANEL_WIDTH = 280
const GAME_TEXT_WIDTH = 280

const APP_WIDTH = BOARD_SIZE + LEGAL_MOVES_WIDTH + ENGINE_PANEL_WIDTH + GAME_TEXT_WIDTH + 30
const APP_HEIGHT = BOARD_SIZE + 140

const TAB_GROUP = [
    {key: "animations", caption: "Anims"},
    {key: "images", caption: "Imgs"},
    {key: "settings", caption: "Settings"},
    {key: "tree", caption: "Tree"},
    {key: "about", caption: "About"}
]

const MOVE_COLOR_PRESETS = {
    "0,0": "#99f",
    "0,1": "#f00"
}

const SETTINGS_FIELDS = [
    {
        id: "uselocalstockfish",
        name: "Use local Stockfish",
        kind: "checkbox",
        default: true
    },
    {
        id: "autosavestudyonbackup",
        name: "Auto save study on backup",
        kind: "checkbox",
        default: true
    },
    {
        id: "useflashalerts",
        name: "Use flash alerts",
        kind: "checkbox",
        default: true
    },
    {
        id: "copyfliponmerge",
        name: "Copy flip on merge",
        kind: "checkbox",
        default: true
    },
    {
        id: "useeventsource",
        name: "Use event source",
        kind: "checkbox",
        default: true
    },
    {
        id: "consolelog",
        name: "Console log",
        kind: "checkbox",
        default: false
    },
    {
        id: "piecesize",
        name: "Piece size",
        kind: "combo",
        valuetype: "int",
        selected: 60,
        options: Array(17).fill(null).map((_,i)=>[(i+4)*5,(i+4)*5])
    },
    {
        id: "oppminrating",
        name: "Opponent minimal rating",
        kind: "combo",
        valuetype: "int",
        selected: 1700,
        options: Array(6).fill(null).map((_,i)=>[(i+15)*100,(i+15)*100])
    },
    {
        id: "minrequireddepth",
        name: "Min required depth",
        kind: "combo",
        valuetype: "int",
        selected: 5,
        options: Array(21).fill(null).map((_,i)=>[(i+1),(i+1)])
    },
    {
        id: "goheavymultipv",
        name: "Go heavy multipv",
        kind: "combo",
        valuetype: "int",
        selected: 10,
        options: Array(6).fill(null).map((_,i)=>[(i+1)*5,(i+1)*5])
    },
    {
        id: "goheavythreads",
        name: "Go heavy threads",
        kind: "combo",
        valuetype: "int",
        selected: 8,
        options: Array(4).fill(null).map((_,i)=>[(i+1)*2,(i+1)*2])
    },
    {
        id: "gotimeout",
        name: "Go timeout",
        kind: "combo",
        valuetype: "int",
        selected: 500,
        options: Array(21).fill(null).map((_,i)=>[(i)*250,(i)*250])
    },
    {
        id: "condgotimeout",
        name: "Conditional go timeout",
        kind: "combo",
        valuetype: "int",
        selected: 4000,        
        options: Array(11).fill(null).map((_,i)=>[(i+3)*1000,(i+3)*1000])
    }
]

class App extends React.Component{
    resetanalysisinfo(){
        this.analysisinfo = {
            state: ENGINE_READY,
            summary: []
        }
    }

    constructor(props){
        super(props)

        this.props = props

        this.state = {
            selected: this.props.selected,
            gametext: "",
            fentext: "",            
            linetext: "",
            legalmoves: [],
            trainwhite: false,
            trainblack: false,
            trainerror: false,
            traineng: false,            
            loading: true,
            loadmsg: "React Chess Loading ...",
            lichessgames: [["none", "Select game ..."]],
            settingson: false,
            treeon: false,
            alerton: false,
            alertmsg: ""
        }

        this.settings = {

        }

        this.resetanalysisinfo()

        this.state.analysisinfo = this.analysisinfo

        this.boardref = React.createRef()        
        this.multipvcomboref = React.createRef()        
        this.threadscomboref =  React.createRef()                
        this.enginebarcontref = React.createRef()        
        this.enginebarref = React.createRef()        
        this.lichessuserscomboref = React.createRef()                
        this.studycomboref = React.createRef()        
        this.savegamebuttonref = React.createRef()        

        this.gocnt = INITIAL_GO_CNT
        this.shouldgo = false

        this.savegamelabel = "Save game [ : ]"

        this.images = e('div', {},
            "No images were found."
        )

        this.createimages()
    }

    alert(msg){
        if(this.settings.useflashalerts){
            this.setState({
                alerton: true,
                alertmsg: msg
            })
            this.setstatelater({
                alerton: false,
                alertmsg: ""
            }, ALERT_DELAY)
        }else{
            window.alert(msg)
        }
    }

    setstoredgame(){
        let storedgame = localStorage.getItem("game")                        
        if(storedgame) this.board.setgame(Game().fromblob(JSON.parse(storedgame)))
        else this.positionchanged(this.board)
    }

    getlichessgames(){                
        let max = getlocalintelse("lichessnumgames", 100)
        if(isNaN(max)) max = 100        
        getlichessgames(this.lichessuserscomboref.current.selected, "df2ctPoDh1u3JwJu", max, (games)=>{                        
            games = games.filter((game)=>game.opponentRating > this.settings.oppminrating)
            if(games.length == 0){
                this.alert("No games were found.")
                return
            }
            let i = 1
            this.lichessgames = Object.fromEntries(games.map((game)=>[`${i++}#${game.summary}`, game]))            
            i = 0
            this.setState({
                lichessgames: [{summary: "select", summarypadded: "Select game ..."}].concat(games).map((game)=>[
                    `${i}#${game.summary}`, `${i++ == 0 ? "" : (i-1).toString().padEnd(4, "_")} ${game.summarypadded} ${game.id ? game.id : ""}`
                ])
            })            
        })
    }

    clearenginebar(){
        this.enginebarcontref.current.style.backgroundColor = "#aaa"
        this.enginebarref.current.style.height = "0px"
    }

    setenginebar(){
        if(!this.fenok()){
            this.clearenginebar()
            return
        }

        try{
            let score = this.analysisinfo.summary[0].scorenumerical

            let bar = score * HALF_BOARD_SIZE / 500
            if(bar < -HALF_BOARD_SIZE) bar = -HALF_BOARD_SIZE
            if(bar > HALF_BOARD_SIZE) bar = HALF_BOARD_SIZE

            this.enginebarref.current.style.height = ( HALF_BOARD_SIZE - bar ) + "px"                    
            this.enginebarcontref.current.style.backgroundColor = scoretorgb(score)
        }catch(err){
            this.clearenginebar()
        }
    }

    checkawaitenginemove(analysisinfo){        
        if(this.awaitenginemove){           
            if(!analysisinfo.summary){                
                return
            }         
            if(analysisinfo.summary.length == 0){                
                return
            }
            if(!analysisinfo.summary[0].move){                
                return
            }
            if(!this.fenok()){                
                return
            }
            if(analysisinfo.summary[0].depth < 12){
                return
            }   
            if(analysisinfo.summary[0].depth < 20){        
                if(!((performance.now() - this.awaitenginemove) > Math.floor(1000 + Math.random() * 9000))){
                    return
                }
            }                        
            this.awaitenginemove = false        
            this.stop()                    
            this.board.makemove(analysisinfo.summary[0].move)                            
        }               
    }

    analysisinfo2text(analysisinfo){
        if(!this.fenok()) return ""

        if(analysisinfo.lastcompleteddepth == 0) return ""

        let text = `depth ${analysisinfo.lastcompleteddepth}\n\n`
        if(analysisinfo.summary){
            text += analysisinfo.summary.map(item=>`${item.pvsans[0].padEnd(8, " ")} ${item.scorenumerical}`).join("\n")
        }
        return text
    }

    processanalysisinfo(analysisinfo){              
        let running = analysisinfo.state != ENGINE_READY

        let egb = document.getElementById("enginegobutton")
        if(egb) egb.style.backgroundColor = running ? "#eee" : "#afa"
        let eghb = document.getElementById("enginegoheavybutton")
        if(eghb) eghb.style.backgroundColor = running ? "#aaa" : "#6c6"
        let esb = document.getElementById("enginestopbutton")
        if(esb) esb.style.backgroundColor = running ? "#faa" : "#eee"                        

        if(running){      
            this.analysisinfo = analysisinfo              
            this.oldenginestate = ENGINE_RUNNING            

            if(this.analysisinfo.lastcompleteddepth < this.settings.minrequireddepth){
                this.setgametext(this.analysisinfo2text(analysisinfo))                                                                 
                return
            }

            if(!this.fenok()) return

            if(this.analysisinfo.analysiskey) dbget("engine", this.analysisinfo.analysiskey, (success, result)=>{
                if(success && result){
                    let oldanalysisinfo = result
                    if(this.analysisinfo.lastcompleteddepth > oldanalysisinfo.lastcompleteddepth){                        
                        dbput("engine", this.analysisinfo, ()=>{})
                    }else{                        
                        this.setgametext(this.analysisinfo2text(analysisinfo))
                        return
                    }
                }else{                    
                    dbput("engine", this.analysisinfo, ()=>{})
                }

                this.analysisinfo.stored = false
                this.board.highlightanalysisinfo(this.analysisinfo)

                if(this.trainengon){
                    this.board.clearanalysisinfo()
                }                                    

                this.dolater("setenginebar", 100)                
            })                        
        }else{            
            this.analysisinfo.state = analysisinfo.state                    
            this.analysisinfo.stored = true
            if(this.oldenginestate == ENGINE_RUNNING){
                this.showstoredanalysis()
            }
            this.oldenginestate = ENGINE_READY
        }                       
    }

    enginerunning(){
        return ( this.analysisinfo.state != ENGINE_READY )
    }

    condgo(){
        if( this.fenok() || (!this.shouldgo) ) return
        this.go()
    }

    clog(content){
        if(this.settings.consolelog){
            console.log(content)
        }
    }

    setupsource(){
        this.clog(`setting up event source with interval ${QUERY_INTERVAL} ms`)        

        this.source = new EventSource('/stream')

        this.source.addEventListener('message', function(e){
            let analysisinfo = JSON.parse(e.data)
            if(analysisinfo == "tick"){
                this.lasttick = performance.now()
            }else{
                this.processanalysisinfo(analysisinfo)
            }            
        }.bind(this), false)

        this.source.addEventListener('open', function(e){            
            this.clog("connection opened")
        }.bind(this), false)

        this.source.addEventListener('error', function(e){
            if (e.readyState == EventSource.CLOSED) {                
                this.clog("connection closed")
            }
        }.bind(this), false)
    }

    checksource(){
        let elapsed = performance.now() - this.lasttick

        if(elapsed > 2 * QUERY_INTERVAL){
            this.clog("event source timed out, setting up new")

            this.lasttick = performance.now()

            this.setupsource()
        }
        else{
            
        }
    }

    componentDidMount(){        
        if(this.settings.uselocalstockfish){            
            this.engine = new Engine(this.processanalysisinfo.bind(this))
        }

        this.clog("getting games")
        this.getlichessgames()    

        this.board = this.boardref.current        

        this.board.setpromkind(this.promcomboref.current.state.selected)

        this.dolater("setstoredgame", 0)

        if(!this.settings.useeventsource){            
            this.lasttick = performance.now()

            setInterval(function(){
                api("engine:query", {}, (response)=>{                
                    if(response.error){
                        this.alert(response.error)
                    }else{
                        let analysisinfo = response
                        this.processanalysisinfo(analysisinfo)
                    }                    
                })
            }.bind(this), QUERY_INTERVAL)
        }        

        if(this.settings.useeventsource){
            this.setupsource()

            setInterval(this.checksource.bind(this), QUERY_INTERVAL)
        }

        this.setstatelater({
            loading: false
        }, LOAD_DELAY)                
    }

    reset(){
        let variant = this.variantcomboref.current.state.selected
        let ok = window.prompt(`Are you sure you delete every move and create a fresh ${variant} game ? ( y = yes, ENTER = no )`)
        if(ok){
            this.resetanalysisinfo()
            this.board.reset(variant)
        }        
    }

    showstoredanalysis(){
        this.board.clearanalysisinfo()                 

        dbget("engine", this.board.analysiskey(), (success, result)=>{            
            if(success && result && (!this.trainon)){                                                
                let state = this.analysisinfo.state
                this.analysisinfo = result
                this.analysisinfo.state = state                
                this.analysisinfo.stored = true                       
                this.board.highlightanalysisinfo(this.analysisinfo)
                this.dolater("setenginebar", 100)                
            }else{                                        
                this.analysisinfo.stored = true                       
                this.analysisinfo.summary = []
                this.setState({analysisinfo: this.analysisinfo})                    
            }

            this.setenginebar()
        })
    }

    positionchanged(board){                              
        if(this.board){                                                            
            if(this.enginerunning()){                
                if(!this.trainengon){         
                    this.stop()           
                    this.dolater("go", this.settings.gotimeout)
                }                
            }

            this.board.clearanalysisinfo()
            this.clearenginebar()

            this.dolater("showstoredanalysis", 250)            
            this.dolater("showlegalmoves", 250)
            this.dolater("condgo", this.settings.condgotimeout)                                         

            this.savegamelater()

            let comment = this.board.game.getcurrentnode().comment
            document.getElementById("commenttext").value = comment                        

            if(this.animationscomboref)if(this.animationscomboref.current){
                this.animationscomboref.current.setoptions(this.board.game.animations)
                this.animationscomboref.current.setselected(this.board.game.selectedAnimation)
                this.animationscomboref.current.build()
                if(this.selectedanimationcomboref)if(this.selectedanimationcomboref.current){
                    let selanim = this.board.game.selectedAnimation
                    let animdesc = this.board.game.animationDescriptors[selanim]
                    this.selectedanimationcomboref.current.setoptions(animdesc.list)
                    this.selectedanimationcomboref.current.setselected(animdesc.selected)
                    this.selectedanimationcomboref.current.build()
                }
            }               
        }        
    }

    cleartimeout(timeoutname){
        if(this[timeoutname]){
            clearTimeout(this[timeoutname])
            this[timeoutname] = null
        }
    }

    dolater(funcname, delay){
        let timeoutname = funcname + "timeout"
        this.cleartimeout(timeoutname)
        this[timeoutname] = setTimeout(this[funcname].bind(this), delay)
    }

    showlegalmoves(){
        let sortedchilds = this.board.game.getcurrentnode().sortedchilds()
        let lms = this.board.getlms()                                    

        let legalmoves = lms.map((move)=>({
            move: move,
            algeb: this.board.game.board.movetoalgeb(move),
            san: this.board.game.board.movetosan(move),
            weights: [0,0],
            highlighted: 0,
            error: 0
        })).sort((a, b)=>a.san.localeCompare(b.san))

        let currentnodeid = this.board.game.currentnodeid        

        for(let item of legalmoves){
            let child = sortedchilds.find((ch)=>ch.gensan == item.san)
            if(child){
                item.highlighted = 1 + ( 10 * parseInt(child.weights[0]) ) + parseInt(child.weights[1])                                        
                item.weights = child.weights.map(weight=>parseInt(weight))
                item.error = child.geterror()
            }                
            let movenodeid = currentnodeid + "_" + item.san
            let movenode = this.board.game.gamenodes[movenodeid]
            item.treesize = 0
            if(movenode){
                item.treesize = movenode.subnodes().length                    
            }
        }

        legalmoves.sort((a, b)=>b.highlighted - a.highlighted)

        this.setState({                
            legalmoves: legalmoves,
            fentext: this.board.game.getcurrentnode().fen,
            linetext: "root " + this.board.game.line()
        })
    }

    stats(){
        dbgetall(ALL_STORES(), {}, function(success, result){
            let gametext = `Engine\n --> ${Object.keys(result.engine).length}\n`
            if(success){
                for(let study in result.study){
                    gametext += `${study}\n --> ${Object.keys(result.study[study].gamenodes).length}\n`
                }
                this.setgametext(gametext)
            }else{
                this.alert("Could not get stats.")
            }
        }.bind(this))
    }

    tobegin(){        
        this.board.tobegin()
    }

    back(){        
        this.board.back()
    }

    forward(){        
        this.board.forward()
    }

    toend(){        
        this.board.toend()
    }

    del(){        
        this.board.del()
    }

    makemove(move){
        this.board.makemove(move)
    }

    weightchanged(item, i, value){                
        value = parseInt(value)
        let childs = this.board.game.getcurrentnode().sortedchilds()
        let node = childs.find(ch=>ch.gensan == item.san)
        if(node){
            node.weights[i] = value
            this.board.draw()
            this.positionchanged()
        }else{
            this.board.makemove(item.move)
            this.board.back()
            childs = this.board.game.getcurrentnode().sortedchilds()
            node = childs.find(ch=>ch.gensan == item.san)
            if(node){
                node.weights[i] = value
                this.board.draw()
                this.positionchanged()
            }else{
                this.clog("todo: added node not found")
            }
        }
    }

    go(argsopt){                        
        let args = argsopt || {}

        this.shouldgo = true

        let lms = this.board.getlms()

        let multipv = Math.min(parseInt(this.multipvcomboref.current.state.selected),lms.length)
        if(multipv == 0){
            this.alert("No legal moves to analyze.")
            return
        }                

        let threads = this.threadscomboref.current.state.selected

        if(args.heavy){
            multipv = this.settings.goheavymultipv
            threads = this.settings.goheavythreads
        }

        let payload = {
            variant: this.board.game.variant,
            fen: this.board.game.board.fen,
            multipv: multipv,
            threads: threads,
            gocnt: this.gocnt
        }

        if(this.settings.uselocalstockfish){
            this.engine.setcommand("go", payload)
        }else{
            let [ _ , pass ] = this.askpass(ASK_FOR_PASS, STORE_PASS)
            this.gocnt++

            api("engine:go", {...payload, ...{pass: pass}}, (response)=>{
                this.clog(`go received : ${response}`)
                if(response.error){
                    this.alert(response.error)
                    localStorage.removeItem("pass")
                }
            })        
        }
    }

    stop(){        
        this.shouldgo = false

        if(this.settings.uselocalstockfish){
            this.engine.setcommand("stop", {})
        }else{
            let [ _ , pass ] = this.askpass(ASK_FOR_PASS, STORE_PASS)
            api("engine:stop", {pass: pass}, (response)=>{
                this.clog(`stop received : ${response}`)
                if(response.error){
                    this.alert(response.error)
                    localStorage.removeItem("pass")
                }
            })        
        }
    }

    kill(){   
        if(this.settings.uselocalstockfish){
            this.engine.spawn()
        }else{     
            let [ _ , pass ] = this.askpass(ASK_FOR_PASS, STORE_PASS)
            api("engine:kill", {pass: pass}, (response)=>{
                this.clog(`kill received : ${response}`)
                if(response.error){
                    this.alert(response.error)
                    localStorage.removeItem("pass")
                }
            })
        }
    }

    askpass(ask, store){
        let storedpass = localStorage.getItem("pass") 
        let pass = storedpass || ( ask ? window.prompt("PASS") : null )
        if(store){
            localStorage.setItem("pass", pass)
        }
        return [ storedpass, pass ]
    }

    backup(local){
        this.cleartimeout("savegametimeout")

        this.savegame()

        if(this.settings.autosavestudyonbackup){
            this.save(this.studycomboref.current.selected, OMIT_ALERT)            
        }

        let [ storedpass, pass ] = this.askpass(!local, !STORE_PASS)

        localStorage.removeItem("pass")

        dbgetall(ALL_STORES(), {}, function(success, result){
            if(success){                
                let grandobj = result

                grandobj.local = Object.entries(localStorage)

                let content = JSON.stringify(grandobj)

                let origsize = content.length

                let zip = new JSZip()

                zip.file("backup", content)

                zip.generateAsync({
                    type: "base64",
                    compression: "DEFLATE",
                    compressionOptions: {
                        level: 9
                    }            
                }).then((content)=>{
                    let compsize = content.length
                    let comprate = compsize / origsize                    
                    this.setgametext(`Original size ${origsize}.\nCompressed size ${compsize}.\nCompression rate ${formatpercent(comprate)} %.`)
                    if(local == BACKUP_GIT){
                        api("git:put", {pass: pass, filename: "analysis/backup.txt", content: content}, (response)=>{                                                        
                            if(response.error){                    
                                this.alert(response.status)
                                localStorage.removeItem("pass")                                
                            }else{
                                this.alert(response.status)
                                localStorage.setItem("pass", pass)
                            }
                        })
                    }else if(local){                        
                        if(storedpass){
                            localStorage.setItem("pass", storedpass)
                        }
                        setTimeout(function(){
                            if(local == BACKUP_LOCAL){
                                downloadcontent(content, "backup.txt")
                            }else{
                                this.setgametext(content, DO_COPY)
                            }                        
                        }.bind(this), 1000)
                    }else{
                        api("bucket:put", {pass: pass, filename: "backup", content: content}, (response)=>{                                                        
                            if(response.error){                    
                                this.alert(response.error)
                                localStorage.removeItem("pass")                                
                            }else{
                                this.alert(`Stored ${response.apiresponse.name}. Size ${response.apiresponse.size}.`)
                                localStorage.setItem("pass", pass)
                            }
                        })
                    }
                })
            }else{
                this.alert("There was a problem collecting stored analysis.")
            }
        }.bind(this))
        
    }

    reloadlater(delay){
        setTimeout(function(){document.location.reload()}, delay)
    }

    restorecontent(content){
        this.cleartimeout("savegametimeout")

        let errcallback = function(err){
            this.clog(err)            
            this.alert("Restore failed. Reloading app.")
            this.reloadlater(ALERT_DELAY)
        }.bind(this)

        this.setState({loading: true, loadmsg: "Unzipping Data ..."})

        let unzip = new JSZip()            
        unzip.loadAsync(content, {base64: true}).then(
            (unzip)=>{
                unzip.file("backup").async("text").then(
                    (content)=>{                    
                        let grandobj = JSON.parse(content)                    
                        let local = grandobj.local
                        for(let entry of local){
                            localStorage.setItem(entry[0], entry[1])
                        }
                        let cnt = local.length
                        let qcnt = 0
                        for(let store in grandobj){
                            if(store != "local"){                        
                                qcnt += Object.keys(grandobj[store]).length
                            }
                        }
                        let allcnt = cnt + qcnt

                        this.setState({loading: true, loadmsg: `Restoring Data ( ${allcnt} Entries ) ...`})

                        for(let store in grandobj){
                            if(store != "local"){                        
                                let blob = grandobj[store]                                                
                                for(let id in blob){
                                    cnt++
                                    dbput(store, blob[id], (success, _)=>{
                                        if(success){
                                            qcnt--
                                            if(qcnt == 0){
                                                this.setState({loading: true, loadmsg: "Done, Reloading App ..."})

                                                this.reloadlater(1000)
                                            }else{
                                                let done = allcnt - qcnt
                                                if((done % 100) == 0){
                                                    document.getElementById("loadingdiv").innerHTML = `Restored ${done} / ${allcnt} entries, ${formatpercent(done / allcnt)} % complete ...`
                                                }                                        
                                            }
                                        }
                                    })
                                }
                            }
                        }
                    }
                    ,
                    (err) => {
                        errcallback(err)
                    }
                )
            },
            (err) => {
                errcallback(err)
            }
        )            
    }

    restore(){
        this.setState({loading: true, loadmsg: "Fetching Data ..."})

        api("bucket:get", {filename: "backup"}, (response)=>{
            if(response.error){
                this.alert(response.error)                
            }else{
                this.restorecontent(response.content)
            }            
        })
    }

    trainchanged(kind){        
        let setstate
        if(kind == "white"){
            setstate = {
                trainwhite: !this.state.trainwhite,
                trainblack: false,
                trainerror: this.state.trainerror,
                traineng: this.state.traineng
            }
        }else if(kind == "black"){
            setstate = {
                trainwhite: false,
                trainblack: !this.state.trainblack,
                trainerror: this.state.trainerror,
                traineng: this.state.traineng
            }
        }else if(kind == "error"){
            setstate = {
                trainwhite: this.state.trainwhite,
                trainblack: this.state.trainblack,
                trainerror: !this.state.trainerror,
                traineng: this.state.traineng
            }
        }else if(kind == "eng"){
            setstate = {
                trainwhite: this.state.trainwhite,
                trainblack: this.state.trainblack,
                trainerror: this.state.trainerror,
                traineng: !this.state.traineng
            }
        }
        this.trainon = setstate.trainwhite || setstate.trainblack
        this.trainengon = this.trainon && setstate.traineng
        setstate.gametext = `Training ${(setstate.trainwhite ? "white" : "") + (setstate.trainblack ? "black" : "") + (this.trainon ? "" : "off")}.\nTrain by ${setstate.trainerror ? "error" : "weights"}.\n${setstate.traineng ? "Use engine to finish line." : "Use presets only."}`
        this.board.settrain(setstate)        

        this.setState(setstate)        

        this.positionchanged()
    }

    analysisinfocallback(analysisinfo){               
        if(this.trainengon){
            this.checkawaitenginemove(analysisinfo)                     
        }else{
            this.analysisinfo = analysisinfo            

            this.setState({analysisinfo: this.analysisinfo})
        }
    }
    
    flip(){
        this.board.doflip()
    }

    lichess(){
        window.open(`https://lichess.org/analysis/${this.board.game.variant}/${this.board.game.fen()}`)
    }

    enginemoveclicked(item){
        this.board.makemove(item.move)
    }

    save(study, omitalert){        
        this.savegame()
        
        let obj = this.board.game.serialize()
        obj.title = study
        dbput("study", obj, (success, result)=>{
            let msg = `Study saved to "${study}".`
            if(success){
                if(omitalert){
                    this.clog(msg)
                }else{
                    this.alert(msg)
                }
            }else{
                this.alert(`Error! Study could not be save to "${study}".`)
            }
        })
    }

    load(study, callback){                
        dbget("study", study, (success, result)=>{            
            if(success){
                this.board.setgame(Game().fromblob(result))
                if(callback) callback()
            }else{
                console.log("problem loading study", result)
            }
        })
    }

    remove(study){
        dbdelete("study", study, (success, result)=>{
            if(success){
                this.alert(`Removed study "${study}".`)
            }else{
                this.alert(`Failed to removed study "${study}".`)
            }
        })
    }

    setstatelater(setstate, delay){
        setTimeout(function(){
            this.setState(setstate)
        }.bind(this), delay )
    }

    setgametextbackgroundcolor(color){        
        document.getElementById("gametext").style.backgroundColor = color
    }

    setgametext(text, copy){                        
        let gte = document.getElementById("gametext")
        gte.value = text
        if(copy) setTimeout(function(){
            gte.focus()
            gte.select()
            if(!IS_FIREFOX()){
                document.execCommand("copy")
            }            
        }.bind(this), 0)
    }

    line(){                
        this.setgametext(this.board.game.line(), DO_COPY)
    }

    pgn(){
        this.setgametext(this.board.game.pgn(DO_COMMENTS), DO_COPY)
    }

    reduce(){        
        this.board.setfromgame(this.board.game.reduce())
    }

    ok(item, i){           
        this.board.makemove(item.move)
        let node = this.board.game.getcurrentnode()
        node.weights[i] = 5
        node.weights[1 - i] = 0        
    }

    addstudy(){
        return this.board.game.line()
    }

    hint(){
        this.board.hint()
    }

    playenginemovecallback(){
        this.awaitenginemove = performance.now()
        this.go()
    }

    studieschanged(study, autoload){
        if(autoload){
            this.load(study)
        }
    }

    loadlichessgame(summary){                
        let lichessgame = this.lichessgames[summary]
        if(lichessgame){
            window.open(`https://lichess.org/${lichessgame.id}`)
            let game = Game({flip: lichessgame.meBlack}).fromsans(lichessgame.moves)
            this.board.setgame(game)
        }
    }

    merge(study){        
        let g = this.board.game.clone()
        this.load(study, function(){
            this.alert(this.board.game.merge(g))        
            if(this.settings.copyfliponmerge){
                this.board.game.flip = g.flip
            }        
            this.board.setfromgame(this.board.game)
        }.bind(this))                        
    }

    selecttab(tab){
        let newon = !(this.settings[tab + "on"])

        for(let t of TAB_GROUP){
            this.settings[t.key + "on"] = false            
        }        
        
        this.settings[tab + "on"] = newon

        let setobj = Object.fromEntries(TAB_GROUP.map((tab)=>[tab.key + "on", this.settings[tab.key + "on"]]))

        this.setState(setobj)
    }

    nodeclicked(node){
        this.board.setfromnode(node)
    }

    buildtree(node, rgbopt){
        let current = node.id == node.parentgame.currentnodeid
        let rgb = rgbopt || randrgb()        
        if(node.childids.length > 1) rgb = randrgb()
        let tree = e('div', {style: {margin: rgb == rgbopt ? "0px" : "3px", backgroundColor: rgb, display: "flex", flexDirection: "column", alignItems: "center"}},
            e('div', {id: current ? "seltree" : UID(), onMouseDown: this.nodeclicked.bind(this, node), style: {width: "60px", cursor: "pointer", padding: "2px", borderWidth: "3px", borderColor: current ? "#0f0" : "#ddd", borderStyle: "solid", margin: "1px", backgroundColor: node.gensan ? node.turn() ? "#000" : "#fff" : "#070", color: node.turn() ? "#fff" : "#000", textAlign: "center"}},
                node.gensan ? `${node.fullmovenumber()}. ${node.gensan}` : "root"
            ),            
            e('div', {style: {display: "flex", flexDirection: "row"}},
                node.sortedchilds().map((child)=>
                    e('div', {style: {}, key: UID()}, this.buildtree(child, rgb))
                )
            )
        )                
        return tree
    }

    tree(){
        if(this.board){            
            seed = 10
            return e('div', {style: {width: `${TREE_WIDTH}px`}}, this.buildtree(this.board.game.getrootnode()))
        }else{
            return "No game tree available."
        }
    }

    uploadimage(content, nameorig){
        let canvas = this.board.getdragpiececanvas()
        let img = Img()        
        img.src = content                
        img.e.onload = ()=>{        
            console.log("img loaded")
            canvas.ctx.drawImage(img.e, 0, 0)        
            let name = window.prompt("Image name :", nameorig)
            dbput("image", {
                name: name,
                imgsrc: content
            }, function(ok, event){
                if(ok){
                    this.alert(`Image ${name} stored.`)
                    this.createimages()
                }else{
                    this.alert(`Storing image ${name} failed.`)
                }
            }.bind(this))
        }
    }

    //https://stackoverflow.com/questions/11313414/html5-drag-and-drop-load-text-file-in-a-textbox-with-javascript
    ondrop(ev){
        ev.persist()
        ev.preventDefault()

        let file = ev.dataTransfer.files[0]
        let reader = new FileReader()

        let plaintext = true

        reader.onload = function(event){          
            let content = event.target.result            
            if(!plaintext) return this.uploadimage(content, file.name)
            this.setgametextbackgroundcolor("#fff")
            this.setgametext(`Uploaded content of size ${content.length}.`)
            try{
                let contentplain = atob(content)
            }catch(err){
                plaintext = false
                return reader.readAsDataURL(file)                
            }
            this.restorecontent(content)
        }.bind(this)

        reader.readAsText(file)
    }

    clearanalysis(){
        let analysiskey = this.board.analysiskey()
        dbdelete("engine", analysiskey, ()=>{
            this.alert(`Analaysis stored under key ${analysiskey} was deleted.`)
            this.showstoredanalysis()
        })
    }

    clearpass(){
        localStorage.removeItem("pass")
    }

    fenok(){
        if(!this.board) return false        
        return ( this.analysisinfo.analysiskey == this.board.analysiskey() )
    }

    savegame(){
        let len = storelocal("game", this.board.game.serialize())
        this.savegamebuttonref.current.style.backgroundColor = "#ddd"
        this.savegamelabel = `Save game [ ${this.board.game.getrootnode().subnodes().length} : ${len} ]`
        this.savegamebuttonref.current.value = this.savegamelabel
    }

    savegamelater(){        
        this.savegamebuttonref.current.style.backgroundColor = "#afa"        
        this.dolater("savegame", 1000)
    }

    onpaste(ev){
        ev.persist()
        ev.stopPropagation()
        ev.preventDefault()
    
        let content = ev.clipboardData.getData('Text')        

        this.restorecontent(content)        
    }

    restoregit(){        
        fetch("https://raw.githubusercontent.com/pgneditor/rechess20/master/analysis/backup.txt").then(
            (response)=>response.text().then(
                content => {
                    this.restorecontent(content)
                },
                err => {                    
                    this.clog(err)
                    this.alert("Error: Response content could not be obtained.")
                }
            ),
            err => {
                this.clog(err)
                this.alert("Error: Fetch failed.")
            }
        )
    }

    tabcontainer(key, content){
        let issettings = ( key == "settings" ) && (!this.settingscreated)
        if(issettings) this.settingscreated = true
        if(this.settings[key + "on"] || issettings){            
            return e('div', {key: key, id: key, style: {
                position: "absolute", width: TAB_WIDTH_PX, height: BOARD_SIZE_PX,
                backgroundColor: "#ddd",
                overflow: "scroll",
                display: issettings ? this.settings.settingson ? "initial" : "none" : "initial"
            }},
            content)
        }
        return null
    }

    highlightgametext(ev){        
        ev.persist()
        ev.preventDefault()
        this.setgametextbackgroundcolor("#0f0")
    }

    delmoveitem(item){        
        this.board.game.makemove(item.move)
        this.del()
    }

    addfav(){
        return [ this.board.game.currentnodeid, this.board.game.line() ]
    }

    loadfav(fav){        
        let node = this.board.game.gamenodes[fav]        
        if(node){
            this.board.setfromnode(node)
        }
    }

    movecolor(weights){
        let presetkey = `${weights[0]},${weights[1]}`
        let preset = MOVE_COLOR_PRESETS[presetkey]
        if(preset){
            return preset
        }
        return `rgb(${weights[1] ? 255 - weights[1]/10*255 : 0},${(160+weights[0]/10*95)*(weights[1] > 0 ? 0.7 : 1)},0)`
    }

    execcommand(command){
        this.cleartimeout("savegametimeout")
        if(command == "clean"){
            localStorage.clear()
            indexedDB.deleteDatabase("rechessdb")
            this.alert("Deleted localstorage and indexedDB. Reloading app.")
            this.reloadlater(ALERT_DELAY)
        }
    }

    commandtexthandler(ev){
        ev.persist()
        if(ev.keyCode == 13){
            let command = ev.target.value
            ev.target.value = ""
            this.execcommand(command)
        }
    }

    pasteline(ev){
        let content = ev.clipboardData.getData('Text')        
        let moves = content.split(/ |\./).filter(item=>item.match(/^[a-zA-Z]/))        
        let game = Game().fromsans(moves)
        this.board.setgame(game)
    }

    promcombochanged(value){
        this.board.setpromkind(value)
    }

    commentchanged(ev){        
        let comment = ev.target.value
        this.board.game.getcurrentnode().comment = comment                        
        this.board.highlightcomment()
        this.savegamelater()
    }
    
    componentDidUpdate(){        
        this.commenttext = document.getElementById("commenttext")        
        this.commenttext.addEventListener("input", this.commentchanged.bind(this))
        this.variantcomboref.current.setvalue(this.board.game.variant, DO_RENDER)
    }

    animationschanged(selected, options){
        this.board.game.selectedAnimation = selected
        this.board.game.animations = options
        for(let key in this.board.game.animationDescriptors){
            if(!options.find(opt=>opt[0] == key)){
                delete this.board.game.animationDescriptors[key]
                this.alert(`Deleted animation ${key}.`)
            }
        }
        for(let entry of options){
            let key = entry[0]
            if(!this.board.game.animationDescriptors[key]){
                this.board.game.animationDescriptors[key] = {
                    list: [],
                    selected: null
                }
                this.alert(`Created animation ${key}.`)
            }
        }
        if(selected){
            let selnode = selected.split("__")[0]
            if(this.board.game.gamenodes[selnode]){
                this.board.setfromnode(this.board.game.gamenodes[selnode])
            }
        }        
        this.savegamelater()
    }

    selectedanimationchanged(selected, options){
        let selanim = this.board.game.selectedAnimation
        let animdesc = this.board.game.animationDescriptors[selanim]
        animdesc.selected = selected
        animdesc.list = options
        if(selected){
            let selnode = selected.split("__")[0]
            if(this.board.game.gamenodes[selnode]){
                this.board.setfromnode(this.board.game.gamenodes[selnode])
            }
        }        
    }

    addanimationcallback(){
        let key = this.board.game.currentnodeid + "__" + UID()
        let value = window.prompt("Animation title :", "Animation " + this.board.game.line())        
        return [ key, value ]
    }

    addtoselectedanimationcallback(){
        let key = this.board.game.currentnodeid + "__" + UID()
        let value = "root " + this.board.game.line()        
        setTimeout(this.forward.bind(this), 500)
        return [ key, value ]
    }

    playanimation(start, record){        
        if(start) this.animationplaying = true

        if(!this.animationplaying){
            return
        }

        if(record){
            this.recordanimation = true            
            initgif()
        }

        let selanim = this.board.game.selectedAnimation
        let animdesc = this.board.game.animationDescriptors[selanim]        
        
        if(!animdesc.list.length){
            this.alert("No frames to animate.")
        }
        
        if(record){
            this.currentframe = 0
        }else if(start){            
            this.currentframe = animdesc.list.findIndex(x=>x[0] == animdesc.selected)
        }                

        if(this.currentframe < 0){
            this.stopnimation()
            return
        }

        let selkey = animdesc.list[this.currentframe][0]
        let selnode = selkey.split("__")[0]
        animdesc.selected = selkey
        this.selectedanimationcomboref.current.setselected(selkey)

        if(this.board.game.gamenodes[selnode]){
            this.board.setfromnode(this.board.game.gamenodes[selnode])

            if(this.recordanimation){
                this.createanimationframe(function(canvas){
                    let props = this.board.game.getcurrentnode().props()

                    gif.addFrame(canvas, {delay: props.delay || 1000})

                    this.board.getgifcanvas().setState({})

                    this.stepframe(animdesc)
                }.bind(this))
            }else{
                this.stepframe(animdesc)
            }
        }else{
            this.stepframe(animdesc)
        }        
    }

    stepframe(animdesc){
        this.currentframe++

        if(this.currentframe >= animdesc.list.length){
            if(this.recordanimation){
                this.stopnimation()
                this.alert("Recording done.")                
                gif.render()
                return
            }
            this.currentframe = 0
        }   

        setTimeout(this.playanimation.bind(this, !START_ANIMATION, !RECORD_ANIMATION), 500)
    }

    createanimationframe(callback){
        let bs = this.board.boardsize()

        let canvas = document.createElement('canvas')
        canvas.setAttribute("width", bs * 2)
        canvas.setAttribute("height", bs)

        let ctx = canvas.getContext('2d')

        ctx.drawImage(this.board.getgifcanvas().canvasref.current, 0, 0)

        let commentcanvas = new TextCanvas(bs, bs)

        commentcanvas.ctx.fillStyle = "#FFFFFF"
        commentcanvas.ctx.fillRect(0, 0, bs, bs)

        let drawings = this.board.game.getcurrentnode().drawings()

        let imgname = null
        let drawing = null
        for(let drw of drawings){
            if(drw.kind == "image"){
                imgname = drw.name
                drawing = drw
                break
            }
        }

        if(imgname){
            dbget("image", imgname, function(succes, result){
                if(succes && result){                    
                    let ds = bs * drawing.thickness / 9
                    let dm = ( bs - ds ) / 2
                    console.log(ds, dm)
                    commentcanvas.drawImage(result.imgsrc, Vect(dm,dm), Vect(ds, ds), drawing.opacity / 9, function(){
                        ctx.drawImage(commentcanvas.canvas, bs, 0)
                        commentcanvas.clear()
                        this.setcommentcanvas(commentcanvas, ctx)
                        callback(canvas)
                    }.bind(this))
                }else{
                    this.setcommentcanvas(commentcanvas, ctx)
                    callback(canvas)
                }
            }.bind(this))
        }else{
            this.setcommentcanvas(commentcanvas, ctx)
            callback(canvas)
        }
    }

    setcommentcanvas(commentcanvas, ctx){
        let bs = this.board.boardsize()

        commentcanvas.ctx.globalAlpha = 1

        commentcanvas.ctx.textBaseline = "top"
        commentcanvas.ctx.fillStyle = "#000000"
        this.commentfontsize = bs / 12
        this.commentmargin = this.commentfontsize / 3
        commentcanvas.ctx.font = `${this.commentfontsize}px serif`
        let message = this.board.game.getcurrentnode().comment.split("#")[0]
        if(message) commentcanvas.renderText(message, bs - 2 * this.commentmargin, this.commentfontsize * 1.1, this.commentmargin, this.commentmargin)
        
        ctx.drawImage(commentcanvas.canvas, bs, 0)

        commentcanvas.clear()

        commentcanvas.ctx.font = `${this.commentfontsize / 1.1}px serif`
        commentcanvas.ctx.fillStyle = "#00FF00"                

        commentcanvas.renderText("animation created by", bs - 2 * this.commentmargin, this.commentfontsize * 1.1, this.commentmargin, bs - 2 * this.commentfontsize)

        commentcanvas.ctx.fillStyle = "#0000FF"                

        commentcanvas.renderText("https://rechess.herokuapp.com", bs - 2 * this.commentmargin, this.commentfontsize * 1.1, this.commentmargin, bs - this.commentfontsize)

        ctx.drawImage(commentcanvas.canvas, bs, 0)
    }

    stopnimation(){
        this.animationplaying = false
        this.currentframe = null
        this.recordanimation = false
    }

    animations(){        
        if(!this.board) return
        let selanim = this.board.game.selectedAnimation
        let animdesc = selanim ? this.board.game.animationDescriptors[selanim] : null
        return e('div', {style: {padding: "5px"}},
            e(EditableList, {
                options: this.board.game.animations, width: 400,
                selected: selanim,
                addcallback: this.addanimationcallback.bind(this),
                changecallback: this.animationschanged.bind(this),
                ref: this.animationscomboref = React.createRef(),
                zindex: 200
            }, null),
            e('button', {onClick: this.playanimation.bind(this, START_ANIMATION, !RECORD_ANIMATION), style: {marginLeft: "5px", backgroundColor: "#aaf"}}, "Play"),
            e('button', {onClick: this.stopnimation.bind(this), style: {marginLeft: "5px", backgroundColor: "#faa"}}, "Stop"),
            e('button', {onClick: this.playanimation.bind(this, START_ANIMATION, RECORD_ANIMATION), style: {marginLeft: "5px", backgroundColor: "#ffa"}}, "Record"),
            animdesc ?
                e('div', {style: {padding: "5px", backgroundColor: "#ccc", margin: "5px"}},
                    e(EditableList, {
                        dontrolluponselect: true,
                        selectedtextdir: "rtl",
                        options: animdesc.list, width: 400,
                        selected: animdesc.selected,
                        addcallback: this.addtoselectedanimationcallback.bind(this),
                        changecallback: this.selectedanimationchanged.bind(this),
                        ref: this.selectedanimationcomboref = React.createRef()
                    }, null)                
                )
            :
                null
        )
    }

    deleteimage(name){
        dbdelete("image", name, function(){
            this.createimages()
            this.selecttab("images")
        }.bind(this))
    }

    createimages(){
        dbgetall([["image", "name"]], {}, function(success, result){                        
            if(success && result){                                
                this.images = e('div', {style: {display: "flex", flexWrap: "wrap", alignItems: "top"}},
                    Object.entries(result.image).map(entry=>e('div', {style: {display: "inline-block", margin: "3px"}, key: entry[0]},
                        e('div', {style: {backgroundColor: "#ffe", padding: "3px"}},
                            e('div', {style: {margin: "5px", fontSize: "16px", color: "#00f"}},
                                entry[0],
                                e('button', {style: {margin: "5px"}, onClick: this.deleteimage.bind(this, entry[0])}, "Delete " + entry[0]),
                            ),                        
                            e('img', {src: entry[1].imgsrc})
                        )
                    ))
                )
            }
        }.bind(this))        
    }

    render(){                                        
        //console.log("render", UID())        
        let summary = this.state.analysisinfo.summary.map((item)=>item.san ?
            e('div', {key: "summarycont" + item.san},
                e('div', {key: "enginemovecont" + item.uci, style: {color: scoretorgb(item.scorenumerical), display: "flex", alignItems: "center"}},
                    e('div', {className: "summaryitem", style: {fontSize: "11px", width: "20px"}, key: "enginedepth" + item.uci}, `${item.depth}`),
                    e('div', {className: "summaryitem", onMouseDown: this.enginemoveclicked.bind(this, item), style: {width: "80px", fontWeight: "bold", fontSize: "20px", cursor: "pointer"}, key: "enginesan" + item.san}, `${item.san}`),
                    e('div', {className: "summaryitem", style: {fontSize: "16px", width: "60px"}, key: "enginescore" + item.uci}, `${item.scorenumerical}`),
                    [0, 1].map((i)=>
                        e('button', {className: "summaryitem", onClick: this.ok.bind(this, item, i), style: {backgroundColor: i ? "#ffd" : "#afa", marginRight: "10px", fontSize: "12px", width: "40px"}, key: `ok${item, i}`}, `+${i ? "opp" : "me"}`),
                    )
                ),
                e('div', {key: "pvsans" + item.san}, item.pvsans ? ["\u00A0\u2011>"].concat(item.pvsans.slice(1)).join("\u00A0").replace(/\-/g, "\u2011") : "?")
            )
            :
            e('div', {key: "enginedummy" + item.multipv}, null)
        )    

        let settingsform = e(Form, {settings: this.settings, fields: SETTINGS_FIELDS, key: "settingsform"}, null)        

        if(!this.fenok()){                        
            summary = null
        }        

        this.promcomboref = React.createRef()
        let promcombo = e(Combo, {id: "promcombo", changecallback: this.promcombochanged.bind(this), ref: this.promcomboref, key: "promcombo", options: [                            
                ["q", "Queen"],
                ["r", "Rook"],
                ["b", "Bishop"],
                ["n", "Knight"]
            ]
        })

        this.variantcomboref = React.createRef()        
        let variantcombo = e(Combo, {
            forceselected: this.board ? this.board.game.variant : "standard",
            id: "variantcombo",
            ref: this.variantcomboref,
            options: SUPPORTED_VARIANTS}, null)

        let dom = (
            e('div', {key: "rootdiv", style: {position: "relative", width: `${APP_WIDTH}px`, height: `${APP_HEIGHT}px`}},                
                e('div', {key: "loadingdiv", id: "loadingdiv", className: "blink_me", style: {position: "absolute", top: "50px", width: "100%", textAlign: "center", fontSize: "20px", color: "#770"}}, this.state.loadmsg),
                e('div', {key: "appdiv", style: {backgroundImage: "url(/src/img/backgrounds/wood.jpg)", position: "absolute", width: `${APP_WIDTH}px`, height: `${APP_HEIGHT}px`, opacity: this.state.loading ? 0.0 : 1}},                
                    e('div', {key: "gamesdiv", style: {marginTop: "3px", marginLeft: "5px", height: "22px"}},                                            
                        e('div', {key: "gamescombocont", style: {position: "absolute"}},
                            e(Combo, {key: "gamescombo", changecallback: this.loadlichessgame.bind(this), addstyle: {width: `${APP_WIDTH -10}px`, fontFamily: "monospace", fontSize: "14px"}, options: this.state.lichessgames}, null),
                        ),
                        e('div', {key: "gamescombocontrcont", style: {position: "absolute", marginTop: "1px", left: BOARD_SIZE_PX, display: "flex"}},
                            e(Labeled, {label: "user", element: e(EditableCombo, {omitautoload: true, ref: this.lichessuserscomboref, changecallback: this.getlichessgames.bind(this), key: "lichessuser", id: "lichessuser"})}),                        
                            e(Labeled, {label: "num games", element: e(EditableCombo, {omitautoload: true, changecallback: this.getlichessgames.bind(this), key: "lichessnumgames", id: "lichessnumgames"})}),                        
                        )
                    ),
                    e('div', {key: "studydiv", style: {marginTop: "3px", marginBottom: "3px", marginLeft: "5px", display: "flex"}},                                            
                        e(EditableCombo, {ref: this.studycomboref, changecallback: this.studieschanged.bind(this), addcallback: this.addstudy.bind(this), key: "study", id: "study", mergecallback: this.merge.bind(this), savecallback: this.save.bind(this), loadcallback: this.load.bind(this), removecallback: this.remove.bind(this)}, null),                        
                        TAB_GROUP.map((tab)=>e('button', {
                            key: tab.key + "button",
                            onClick: this.selecttab.bind(this, tab.key),
                            style: {
                                backgroundColor: this.settings[tab.key + "on"] ? "#afa" : "#eee"
                            }                            
                        }, tab.caption)),
                        pushRight(2, e(EditableList, {
                            id: "favline",
                            addcallback: this.addfav.bind(this),
                            loadcallback: this.loadfav.bind(this)
                        }, null)),
                    ),
                    e('div', {key: "flexdiv", style: {display: "flex", alignItems: "center", marginLeft: "4px"}}, 
                        e(Board, {squaresize: SQUARE_SIZE, key: "board", ref: this.boardref, playenginemovecallback: this.playenginemovecallback.bind(this), analysisinfocallback: this.analysisinfocallback.bind(this), positionchangedcallback: this.positionchanged.bind(this)}, null),
                        e('div', {key: "enginebarcont", ref: this.enginebarcontref, style: {position: "relative", width: "10px", height: BOARD_SIZE_PX}}, 
                            e('div', {key: "enginebar", ref: this.enginebarref, style: {position: "absolute", backgroundColor: "#eee", width: "10px"}}, null)
                        ),
                        e('div', {key: "legalmovescont", style: {backgroundColor: "#fff", position: "relative", width: `${LEGAL_MOVES_WIDTH}px`, height: BOARD_SIZE_PX}},
                            e('div', {key: "legalmoves", style: {position: "absolute", overflow: "scroll", width: `${LEGAL_MOVES_WIDTH}px`, height: BOARD_SIZE_PX}}, this.state.legalmoves.map((item)=>
                                e('div', {key: item.algeb + "cont", style: {display: "flex", alignItems: "center"}},                                
                                    e('div', {key: item.algeb + "move", onClick: this.makemove.bind(this, item.move), style: {marginRight: "3px", width: "60px", backgroundColor: item.highlighted ? this.movecolor(item.weights) : '#ddd', padding: "1px", paddingLeft: "3px", marginLeft: "3px", marginTop: "1px", fontSize: "14px", cursor: "pointer", color: "#000", fontFamily: "monospace", fontWeight: item.highlighted ? "bold" : "normal"}}, (this.state.trainwhite || this.state.trainblack) ? "???" : item.san),
                                    e(Combo, {changecallback: this.weightchanged.bind(this, item, 0), key: item.algeb + "meweight", options: Array(11).fill(null).map((_,i)=>[i,i]), selected: item.weights[0]}),
                                    e(Combo, {changecallback: this.weightchanged.bind(this, item, 1), key: item.algeb + "oppweight", options: Array(11).fill(null).map((_,i)=>[i,i]), selected: item.weights[1]}),
                                    [0, 1].map((i)=>
                                        e('button', {className: "summaryitem", onClick: this.ok.bind(this, item, i), style: {fontSize: "11px", backgroundColor: i ? "#ffd" : "#afa"}, key: `ok${item.algeb}${i}`}, `+${i ? "opp" : "me"}`),
                                    ),
                                    e('button', {className: "summaryitem", onClick: this.delmoveitem.bind(this, item), style: {fontSize: "11px", backgroundColor: "#faa", width: "15px"}, key: `delmove${item.algeb}`}, `X`),                                    
                                    e("div", {key: item.algeb + "treesize", style: {fontSize: "10px", marginLeft: "5px"}}, `${item.treesize ? item.treesize : ""}`)
                                )
                            )), 
                            this.tabcontainer("animations", this.animations()),
                            this.tabcontainer("images", this.images),
                            this.tabcontainer("settings", settingsform),
                            this.tabcontainer("tree", this.tree()),                                               
                            this.tabcontainer("about", "Loading ..."),
                        ),
                        e('div', {key: "enginepanel", style: {backgroundColor: this.state.analysisinfo.stored ? "#eee" : this.trainon ? "#eee" : "#afa", fontFamily: "monospace", paddingLeft: "5px", width: `${ENGINE_PANEL_WIDTH}px`, height: BOARD_SIZE_PX, overflow: "scroll"}},
                            summary,
                            this.enginerunning() && ( this.state.analysisinfo.summary.length > 0 ) && this.fenok() && (!this.state.analysisinfo.stored) ?
                            [
                                e('div', {key: "time", style: {marginTop: "20px"}}, `\u00A0time\u00A0\u00A0\u00A0${toHHMMSS(Math.round(this.state.analysisinfo.time / 1000))}`),
                                e('div', {key: "nodes"}, `\u00A0nodes\u00A0\u00A0${tokMG(this.state.analysisinfo.nodes)}`),
                                e('div', {key: "nps"}, `\u00A0nps\u00A0\u00A0\u00A0\u00A0${tokMG(this.state.analysisinfo.nps)} / s`)
                            ]
                            :
                            null
                        ),
                        e('div', {key: "textsdiv", style: {display: "flex", flexDirection: "column", backgroundColor: "#eee"}},
                            e('textarea', {key: "gametext", id: "gametext", onPaste: this.onpaste.bind(this), onDrop: this.ondrop.bind(this), onDragLeave: this.setgametextbackgroundcolor.bind(this, "#fff"), onDragEnter: this.highlightgametext.bind(this), onDragOver: this.highlightgametext.bind(this), ref: this.gametextref, onChange: ()=>{}, value: this.state.gametext, style: {color: "#333", paddingLeft: "5px", width: `${GAME_TEXT_WIDTH}px`, height: `${BOARD_SIZE / 4 - 7}px`}}, null),
                            e('textarea', {key: "commenttext", id: "commenttext", style: {fontSize: "16px", color: "#333", paddingLeft: "5px", width: `${GAME_TEXT_WIDTH}px`, height: `${BOARD_SIZE / 4 * 3 - 7}px`, marginTop: "1px"}}, null)
                        )                        
                    ),
                    e('div', {key: "fentextdiv", style: {display: "flex", marginLeft: "4px", marginTop: "4px"}},                        
                        e('input', {key: "fentext", onChange: ()=>{}, value: this.state.fentext, style: { width: `${BOARD_SIZE - 9}px`, fontFamily: "monospace", fontSize: "11px", paddingLeft: "3px" }, type: 'text'}, null),                                        
                        e('input', {key: "linetext", id: "linetext", onPaste: this.pasteline.bind(this), onChange: ()=>{}, value: this.state.linetext, style: { marginLeft: "2px", width: TAB_WIDTH_PX, fontFamily: "monospace", fontSize: "14px", whiteSpace: "no-wrap", overflow: "hidden", textAlign: "left", textOverflow: "ellipsis", direction: "rtl", paddingLeft: "3px" }, type: 'text'}, null),                                        
                    ),
                    e('div', {key: "controldiv", style: {display: "flex", marginTop: "5px", marginLeft: "5px", alignItems: "center"}},
                        e('input', {className: "controlbutton", style: {fontFamily: "lichess", backgroundColor: "#f77"}, key: "reset", type: 'button', value: 'i', onClick: this.reset.bind(this)}, null),                    
                        variantcombo,
                        e('input', {className: "controlbutton", key: "tobegin", type: 'button', value: 'W', style: {fontFamily: "lichess", backgroundColor: "#aaf"}, onClick: this.tobegin.bind(this)}, null),
                        e('input', {className: "controlbutton", key: "back", type: 'button', value: 'Y', style: {fontFamily: "lichess", backgroundColor: "#afa"}, onClick: this.back.bind(this)}, null),
                        e('input', {className: "controlbutton", key: "forward", type: 'button', value: 'X', style: {fontFamily: "lichess", backgroundColor: "#afa"}, onClick: this.forward.bind(this)}, null),
                        e('input', {className: "controlbutton", key: "toend", type: 'button', value: 'V', style: {fontFamily: "lichess", backgroundColor: "#aaf"}, onClick: this.toend.bind(this)}, null),
                        promcombo,
                        e('input', {className: "controlbutton", style: {fontFamily: "lichess", backgroundColor: "#f77"}, key: "del", type: 'button', value: 'L', onClick: this.del.bind(this)}, null),
                        e('input', {className: "controlbutton", style: {backgroundColor: this.state.analysisinfo.state == ENGINE_RUNNING ? "#eee" : "#afa"}, id: "enginegobutton", key: "enginego", type: 'button', value: 'Go', onClick: this.go.bind(this)}, null),
                        e('input', {className: "controlbutton", style: {backgroundColor: this.state.analysisinfo.state == ENGINE_RUNNING ? "#aaa" : "#6c6"}, id: "enginegoheavybutton", key: "enginegoheavy", type: 'button', value: 'GoH', onClick: this.go.bind(this, {heavy: true})}, null),
                        e('input', {className: "controlbutton", style: {backgroundColor: this.state.analysisinfo.state == ENGINE_RUNNING ? "#faa" : "#eee"}, id: "enginestopbutton", key: "enginestop", type: 'button', value: 'Stop', onClick: this.stop.bind(this)}, null),
                        e('input', {className: "controlbutton", style: {backgroundColor: "#ffa"}, key: "enginekill", type: 'button', value: 'Kill', onClick: this.kill.bind(this)}, null),
                        e('input', {className: "controlbutton", style: {fontFamily: "lichess", backgroundColor: "#aff"}, key: "flip", type: 'button', value: 'B', onClick: this.flip.bind(this)}, null),
                        e('input', {className: "controlbutton", style: {backgroundColor: "#ddd"}, key: "lichess", type: 'button', value: 'Lichess', onClick: this.lichess.bind(this)}, null),
                        e('input', {className: "controlbutton", style: {backgroundColor: "#ccf"}, key: "hint", type: 'button', value: 'Hint', onClick: this.hint.bind(this)}, null),
                        e('div', {key: "traindiv", style: {display: "flex", alignItems: "center", margin: "3px", backgroundColor: "#ffa"}, padding: "3px"},
                            e('label', {key: "trainlabeleng", className: "trainlabel", style: {marginLeft: "3px"}}, "eng"),
                            e('input', {type: "checkbox", key: "traineng", checked: this.state.traineng, onChange: this.trainchanged.bind(this, "eng")}, null),                        
                            e('label', {key: "trainlabelwhite", className: "trainlabel"}, "white"),
                            e('input', {type: "checkbox", key: "trainwhite", checked: this.state.trainwhite, onChange: this.trainchanged.bind(this, "white")}, null),
                            e('label', {key: "trainlabelblack", className: "trainlabel"}, "black"),
                            e('input', {type: "checkbox", key: "trainblack", checked: this.state.trainblack, onChange: this.trainchanged.bind(this, "black")}, null),
                            e('label', {key: "trainlabelerror", className: "trainlabel"}, "error"),
                            e('input', {type: "checkbox", key: "trainerror", checked: this.state.trainerror, onChange: this.trainchanged.bind(this, "error")}, null),                                              
                        ),
                        e(Labeled, {label: "multipv", element: e(Combo, {className: "combo", ref: this.multipvcomboref, id: "multipvcombo", key: "multipvcombo", options: Array(20).fill(null).map((_,i)=>[i+1, i+1])}, null)}),
                        e(Labeled, {label: "threads", element: e(Combo, {className: "combo", ref: this.threadscomboref, id: "threadscombo", key: "threadscombo", options: Array(8).fill(null).map((_,i)=>[i+1, i+1])}, null)}),                        
                        e('input', {className: "controlbutton", key: "line", type: 'button', value: 'Line', style: {backgroundColor: "#afa"}, onClick: this.line.bind(this)}, null),                    
                        e('input', {className: "controlbutton", key: "pgn", type: 'button', value: 'PGN', style: {backgroundColor: "#ffa"}, onClick: this.pgn.bind(this)}, null),                    
                        e('input', {className: "controlbutton", key: "reduce", type: 'button', value: 'Reduce', style: {backgroundColor: "#faa"}, onClick: this.reduce.bind(this)}, null),                                            
                    ),
                    e('div', {key: "controldiv2", style: {display: "flex", marginTop: "3px", marginLeft: "5px", alignItems: "center"}},
                        e('input', {className: "controlbutton", ref: this.savegamebuttonref, key: "savegame", type: 'button', value: this.savegamelabel, style: {backgroundColor: "#afa", width: "200px",}, onClick: this.savegame.bind(this)}, null),
                        e('input', {className: "controlbutton", key: "backup", type: 'button', value: 'Backup', style: {backgroundColor: "#aff"}, onClick: this.backup.bind(this, BACKUP_REMOTE)}, null),
                        e('input', {className: "controlbutton", key: "backupgit", type: 'button', value: 'Backup Git', style: {backgroundColor: "#7aa"}, onClick: this.backup.bind(this, BACKUP_GIT)}, null),
                        e('input', {className: "controlbutton", key: "showblob", type: 'button', value: 'Backup blob', style: {backgroundColor: "#ddd"}, onClick: this.backup.bind(this, BACKUP_BLOB)}, null),
                        e('input', {className: "controlbutton", key: "backuplocal", type: 'button', value: 'Download', style: {backgroundColor: "#aaa"}, onClick: this.backup.bind(this, BACKUP_LOCAL)}, null),
                        e('input', {className: "controlbutton", key: "restore", type: 'button', value: 'Restore', style: {backgroundColor: "#fbf"}, onClick: this.restore.bind(this)}, null),                    
                        e('input', {className: "controlbutton", key: "restoregit", type: 'button', value: 'Restore Git', style: {backgroundColor: "#a7a"}, onClick: this.restoregit.bind(this)}, null),                    
                        e('input', {className: "controlbutton", key: "stats", type: 'button', value: 'Stats', style: {backgroundColor: "#eee"}, onClick: this.stats.bind(this)}, null),                    
                        e('input', {className: "controlbutton", key: "clearanalysis", type: 'button', value: 'Clear analysis', style: {backgroundColor: "#aaf"}, onClick: this.clearanalysis.bind(this)}, null),                    
                        e('input', {className: "controlbutton", key: "clearpass", type: 'button', value: 'Clear pass', style: {backgroundColor: "#f77"}, onClick: this.clearpass.bind(this)}, null),                                            
                        e('input', {className: "controlbutton", key: "commandtext", type: 'text', style: {marginLeft: "3px", width: "100px"}, onKeyDown: this.commandtexthandler.bind(this)}, null),                    
                    )
                ),
                e('div', {key: "alertdiv", style: {zIndex: 1000, position: "absolute", top: "55px", left: "10px", width: "800px", height: "100px", backgroundColor: "#ffa", display: this.state.alerton ? "flex" : "none", alignItems: "center", justifyContent: "space-around", borderStyle: "solid", borderWidth: "10px", borderColor: "#777", color: "#00f"}},
                    e('div', {key: "alertmsgdiv", style: {width: "780px", textAlign: "center"}}, this.state.alertmsg)
                )
            )
        )

        if(this.settings.treeon) setTimeout(function(){            
            document.getElementById("seltree").scrollIntoView({block: "center", inline: "center"/*, behavior : "smooth"*/})
        }.bind(this), 250)

        if(this.settings.abouton){            
            setTimeout(function(){
                document.getElementById("about").innerHTML = `<div style="padding: 5px;">${md2html(RESOURCES.index)}</div>`
            }.bind(this), 0)            
        }

        return dom
    }
}

initdb(function(success, result){
    if(success){        
        ReactDOM.render(
            e(App, {}, null),
            document.getElementById('root')
        )
    }else{
        console.log("db failed")
        window.alert("Error: indexedDB failed. Refresh the page.")
    }    
})
