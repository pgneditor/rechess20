const fs = require('fs')

let server = fs.readFileSync('server.js').toString()

let mm = server.match(/src\/module\/chessboard.js\?vno=[0-9\.]+/)
server = server.replace(mm[0], `src/module/chessboard.js?vno=${fs.statSync("src/module/chessboard.js").mtimeMs}`)

for(let matcher of [
    [new RegExp('src\/js\/[^"]+', 'g'), new RegExp('(src\/js\/[a-zA-Z0-9\.]+)')],
    [new RegExp('src\/css\/[^"]+', 'g'), new RegExp('(src\/css\/[a-zA-Z0-9\.]+)')]
]){
    for(let wholematch of server.match(matcher[0])){
        const path = wholematch.match(matcher[1])[1]        
        const mtimeMs = fs.statSync(path).mtimeMs
        const wholereplace = path + "?ver=" + mtimeMs
        if(wholematch != wholereplace){
            console.log("versioning", path)
            server = server.replace(wholematch, wholereplace)
        }        
    }
}

fs.writeFileSync('server.js', server)
