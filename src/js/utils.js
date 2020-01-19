function md2html(content){
    let html = markdownconverter.makeHtml(content)
    html = html.replace(/<a href=/g, `<a rel="noopener noreferrer" target="_blank" href=`)
    return html
}

function IS_FIREFOX(){    
    return navigator.userAgent.includes("Firefox/")
}

//console.log("IS_FIREFOX", IS_FIREFOX())

function IS_DEV(){
    return document.location.host.match(/localhost/)
}

var gif

try{
    var e = React.createElement

    var RESOURCES = JSON.parse(atob(RESOURCES_JSON_B64))

    var initgif = function(){
        gif = new GIF({
            workers: 2,
            quality: 10
        })
    
        gif.on('finished', function(blob) {
            window.open(URL.createObjectURL(blob));
        })
    }

    var initstockfish = function(callback){
        if(typeof stockfish != "undefined"){
            stockfish.terminate()
        }

        stockfish = new Worker("src/cdn/stockfish.wasm.js")

        stockfish.onmessage = function(data){
            if(callback) callback(data)
        }
    }

    console.log(`React Chess Client ( ${IS_DEV() ? "Development" : "Production"} ). Query interval ${QUERY_INTERVAL}.`)
}catch(err){
    console.log("warning: no client", err)
}

function UID(){
    return "uid_" + Math.random().toString(36).substring(2,9)
}

//https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
function toHHMMSS(sec_num) {
    if(!sec_num) return "00:00:00"
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

function tokMG(x){
    if(isNaN(x)) return 0
    if(!x) return 0
    if(x < 1e3) return x
    if(x < 1e6) return `${Math.round(x / 1e3)} k`
    if(x < 1e9) return `${Math.round(x / 1e6)} M`
    return `${Math.round(x / 1e9)} G`
}

//https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
seed = 1
function random(){
    seed += 1
    x = Math.sin(seed) * 10000
    return x - Math.floor(x)
}

function removeallchilds(node){
    while (node.firstChild){
        node.removeChild(node.firstChild)
    }
}

function getlocalelse(key, def){
    let stored = localStorage.getItem(key)
    if(!stored) return def
    try{
        let obj = JSON.parse(stored)
        return obj
    }catch(err){return stored}
}

function getlocalintelse(key, def){
    let stored = getlocalelse(key, null)
    if(stored === null){
        return def
    }
    let num = parseInt(stored)
    if(isNaN(num)) return def
    return num
}

function storelocal(key, obj){
    let blobjson = JSON.stringify(obj)
    localStorage.setItem(key, blobjson)
    return blobjson.length
}

function formatpercent(x){
    return Math.round(x*100)
}

function api(topic, payload, callback){
    fetch('/api', {
        method: "POST",
        headers: {
        "Content-Type": "application/json"
        },
        body: JSON.stringify({
            topic: topic,
            payload: payload
        })
    }).then(
        (response)=>response.text().then(
            (text)=>{
                //console.log("api ok", text)
                try{                    
                    let response = JSON.parse(text)
                    callback(response)
                }catch(err){
                    console.log("parse error", err)
                    callback({error: "Error: Could not parse response JSON."})
                }                
            },
            (err)=>{
                console.log("api error", err)
                callback({error: "Error: API error in get response text."})
            }
        ),
        (err)=>{
            console.log("api error", err)
            callback({error: "Error: API error in fetch."})
        }
    )
}

function getelse(obj, key, defaultvalue){
    if(key in obj) return obj[key]
    return defaultvalue
}

class Vect_{
    constructor(x, y){
        this.x = x
        this.y = y
    }

    s(s){
        return new Vect_(this.x * s, this.y * s)
    }

    m(v){
        return new Vect_(this.x - v.x, this.y - v.y)
    }

    p(v){
        return new Vect_(this.x + v.x, this.y + v.y)
    }

    l(){
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }
}
function Vect(x, y){return new Vect_(x, y)}

function getStyle(className) {
    let cssText = ""
    for(let si=0;si<document.styleSheets.length;si++){
        let classes = document.styleSheets[si].rules || document.styleSheets[0].cssRules
        for (let x = 0; x < classes.length; x++) {                            
            if (classes[x].selectorText == className) {
                cssText += classes[x].cssText || classes[x].style.cssText
            }         
        }
    }    
    return cssText
}

function scoretocolor(score){
    return Math.floor(Math.min(( Math.abs(score) / 1000.0 ) * 192.0 + 63.0, 255.0))
}

function scoretorgb(score){
    return `rgb(${score < 0 ? scoretocolor(score) : 0},${score > 0 ? scoretocolor(score) : 0},0)`
}

function randcol(){
	return Math.floor(128 + random() * 128)
}

function randrgb(){
	return `rgb(${randcol()},${randcol()},${randcol()})`
}

function strippedfen(fen){
    return fen.split(" ").slice(0, 4).join(" ")
}

function downloadcontent(content, name){
    let file = new Blob([content])
    let a = document.createElement("a")
    let url = URL.createObjectURL(file)
    a.href = url
    a.download = name || "download.txt"
    document.body.appendChild(a)        
    a.click()
    setTimeout(function(){
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    }, 0)
}

class ArrayContainer{
    constructor(list){
        this.list = list
    }
}

Array.prototype.flatten = function(){
    let newlist = []
    for(let elem of this){        
        if(elem instanceof ArrayContainer){
            for(let ae of elem.list){
                newlist.push(ae)
            }
        }else{
            newlist.push(elem)
        }
    }    
    return newlist
}

function parseDrawing(comment){
    if(comment.match(/:/)) return null

    let drawing = {
        kind: "circle",
        color: "green",
        thickness: 5,
        opacity: 9,
        squares: []
    }   

    let sqstr = null 

    if(comment.includes("@")){
        let parts = comment.split("@")
        comment = parts[0]
        sqstr = parts[1]
    }

    let ok

    do{
        ok = false

        let m = comment.match(/^([lwxz])(.*)/)    

        if(m){
            drawing.kind = {l: "circle", w: "arrow", x: "square", z: "image"}[m[1]]
            comment = m[2]
            ok = true
        }

        m = comment.match(/^([rnuy])(.*)/)
        if(m){
            drawing.color = {r: "red", n: "green", u: "blue", y: "yellow"}[m[1]]
            comment = m[2]
            ok = true
        }
        m = comment.match(/^t([0-9])(.*)/)
        if(m){
            drawing.thickness = parseInt(m[1])
            comment = m[2]
            ok = true
        }
        m = comment.match(/^o([0-9])(.*)/)
        if(m){
            drawing.opacity = parseInt(m[1])
            comment = m[2]
            ok = true
        }
    }while(ok)

    ok = true

    if(sqstr) comment = sqstr

    if(drawing.kind == "image"){
        m = comment.match(/^([^\s#]*)(.*)/)
        drawing.name = m[1]
        return drawing
    }

    do{        
        m = comment.match(/^([a-z][0-9])(.*)/)
        if(m){            
            drawing.squares.push(m[1])
            comment = m[2]
        }else{
            ok = false
        }
    }while(ok)

    return drawing
}

function parseDrawings(comment){
    let drawings = []

    let ok = true

    do{
        let m = comment.match(/([^#]*)#([^#\s]*)(.*)/)
        if(m){
            comment = m[1] + m[3]
            let pd = parseDrawing(m[2])
            if(pd) drawings.push(pd)
        }else{
            ok = false
        }
    }while(ok)

    return drawings
}

function parseProps(comment){
    let props = {}

    let ok = true

    do{
        let m = comment.match(/([^#]*)#([^#:]+):([^#\s]*)(.*)/)
        if(m){
            comment = m[1] + m[4]
            props[m[2]] = m[3]
        }else{
            ok = false
        }
    }while(ok)

    return props
}

function stripsan(san){
    let strippedsan = san.replace(new RegExp(`[\+#]*`, "g"), "")
    return strippedsan
}
