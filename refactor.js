const fs = require('fs')

// https://stackoverflow.com/questions/1431094/how-do-i-replace-a-character-at-a-particular-index-in-javascript
String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
}

let files = [
    "config",
    "ReadMe.md",
    "octokit.js",    
    "src/js/index.js",
    "src/docs/index.md"
]

let search = process.argv[2]

let r = new RegExp(search, "g")

for(let file of files){    
    let content = fs.readFileSync(file).toString()    
    let m = r.exec(content)
    let indices = []
    while(m){
        indices.unshift(m.index)
        m = r.exec(content)
    }
    let newcontent = content
    for(let index of indices){
        console.log("---------------\nreplacing\n---------------", file, index)
        console.log(content.substring(Math.max(0, index - 100), Math.min(content.length, index + 100)))
        newcontent = newcontent.replaceAt(index, process.argv[3])
    }    
    fs.writeFileSync(file, newcontent)
}
