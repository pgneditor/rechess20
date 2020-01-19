const Octokit = require("@octokit/rest")

const fs = require('fs')

const octokit = Octokit({
    auth: process.env.RECHESS_GITHUB_API_TOKEN,
    userAgent: "React Chess"
})

function putfile(path, content, sha, callback){
    console.log("put", path, "size", content.length, "sha", sha)

    let contentb64 = new Buffer(content).toString("base64")

    let req = {
        owner: "pgneditor",
        repo: "rechess20",
        path: path,
        content: contentb64,        
        message: "backup",
        "commiter.name": "Pgn Editor",
        "commiter.email": "pgneditorapplication@gmail.com",        
    }

    if(sha){
        req.sha = sha
    }

    octokit.repos.createOrUpdateFile(req).then(
        res => {
            console.log("ok writing", path)
            fs.writeFileSync("temp.txt", JSON.stringify(res, null, 2))
            callback({
                error: false,
                status: `Written ${path}.`
            })
        },
        err => {
            console.log("failed writing", path)
            fs.writeFileSync("temp.txt", JSON.stringify(err, null, 2))
            callback({
                error: true,
                status: `Failed writing ${path}.`
            })
        }
    )
}

function getfile(path, callback, errcallback){
    octokit.repos.getContents({
        owner: "pgneditor",
        repo: "rechess20",
        path: path        
    }).then(
        res => callback(res),
        err => errcallback(err)
    )
}

function getrepo(){
    octokit.repos.get({
        owner: "pgneditor",
        repo: "rechess20"  
    }).then(
        res => console.log(res),
        err => console.log(err)
    )
}

function update(UPDATE_PATH, content, callback){        
    getfile(UPDATE_PATH,
        (res)=>{
            putfile(UPDATE_PATH, content, res.data.sha, callback)
        },
        (err)=>{
            putfile(UPDATE_PATH, content, null, callback)
        }
    )
}

module.exports.update = update
