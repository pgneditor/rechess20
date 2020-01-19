const Heroku = require('heroku-client')
const heroku = new Heroku({ token: process.env.RECHESS_API_TOKEN })

const fs = require('fs')

function removeall(){
    heroku.get('/apps/rechess/config-vars').then(cv => {
        let body = {}
        for(let v in cv){
            body[v] = null            
        }
        heroku.patch('/apps/rechess/config-vars', {body: body}).then((cv)=>{
            console.log(cv)
        })
    })
}

function setall(){
    let bat = fs.readFileSync("makeenv.bat").toString()
    let body = {}
    let r = /set (.*)=(.*)/g
    let m = r.exec(bat)
    while(m != null){
        let key = m[1]
        let value = m[2]        
        body[key] = value
        m = r.exec(bat)
    }
    body["RECHESS_GITHUB_API_TOKEN"] = process.env.RECHESS_GITHUB_API_TOKEN
    console.log("request", body)
    heroku.patch('/apps/rechess/config-vars', {body: body}).then((cv)=>{            
        console.log("response", cv)
    })
}

function deleteapp(){
    heroku.delete('/apps/rechess').then((res)=>{            
        console.log(res)
    })
}

function regions(){
    heroku.get('/regions').then((res)=>{            
        console.log(res)
    })
}

function stacks(){
    heroku.get('/stacks').then((res)=>{            
        console.log(res)
    })
}

function createapp(){
    heroku.post('/apps', {body: {
        name: "rechess",
        region: "eu",
        stack: "heroku-18"
    }}).then((res)=>{
        console.log(res)
    })
}

eval(`${process.argv[2]}()`)
