const fs = require('fs')

const open = require('open')

const superagent = require('superagent')

const fromEntries = require('object.fromentries')

const DEFAULT_VARIANT = "atomic"

if (!Object.fromEntries){
	fromEntries.shim()
}

const JOIN_WITH_TEAM = true
const JOIN_SOLO = false

const BASE_URL = "https://lichess.org"

const TEAMS = `theoreticians "Theoreticians" by atomicexpert
tacticians "Tacticians" by linetester3
tricksters "Tricksters" by sefulesefarka
hobbyists "Hobbyists" by handywebprojects`

const ALLUSERS = TEAMS.split("\n").map((line)=>line.match(/" by (.*)/)[1])

function inferteam(username){
    let teams = TEAMS.split("\n")
    let team = teams.find((t)=>t.match(new RegExp("by " + username)))
    return team.split(" ")[0]
}

const SCHEDULE = [
    0,
    6,
    12,
    18
]

function schedulenext(t){    
    let d = new Date(t)
    let year = d.getUTCFullYear()
    let month = d.getUTCMonth()
    let date = d.getUTCDate()
    let hour = d.getUTCHours()    
    for(let sch of SCHEDULE.slice().reverse()){
        if(hour >= sch){
            let time = new Date(Date.UTC(year, month, date, sch, 0, 0, 0)).getTime()
            let schtime = time + 6 * 60 * 60 * 1000
            return new Date(schtime)
        }
    }
}

let state = {
}

function readstate(){
    try{
        let content = fs.readFileSync("tourney.json")
        state = JSON.parse(content)
    }catch(err){
        console.log("no stored state could be obtained, falling back to empty state", err)
    }
}

function writestate(){
    fs.writeFileSync("tourney.json", JSON.stringify(state, null, 2))
}

readstate()

let command = process.argv[2]

if(command == "login"){
    let username = process.argv[3]
    let password = process.argv[4]

    superagent.agent()
    .post(`https://lichess.org/login?referrer=%2F`)        
    .set("Referer", `https://lichess.org/login?referrer=%2F`)                
    .type("form")
    .send({username: username, password: password})        
    .end((err, res)=>{
        fs.writeFileSync("temp.txt", JSON.stringify({err: err, res: res}, null, 2))

        let hdr = res.header

        if(!hdr["set-cookie"]){
            console.log("no set-cookie header")                
            process.exit()
        }
        
        let setcookie = hdr['set-cookie'][0]

        console.log("set-cookie", setcookie)

        let m = setcookie.match(/lila2=([^;]+);/)

        if(!m){
            console.log("no lila2 cookie")
            process.exit()
        }

        let lila2 = m[1]

        console.log("obtained cookie", lila2)

        if(!state.users) state.users = {}

        state.users[username] = {
            lila2: lila2
        }

        writestate()
    })
}

if(command == "getpage"){
    let username = process.argv[3]
    let url = process.argv[4]

    let cookie = "lila2=" + state.users[username].lila2

    superagent
    .get(BASE_URL + url)        
    .set("Cookie", cookie)
    .end((err, res)=>{
        fs.writeFileSync("temp.txt", JSON.stringify({err: err, res: res}, null, 2))
    })
}

function jointourney(id, username, teamid){
    let turl = BASE_URL + "/tournament/" + id
    let jurl = turl + "/join"

    let cookie = "lila2=" + state.users[username].lila2

    superagent
    .post(jurl)
    .redirects(0)
    .set("Content-Type", "application/json; charset=UTF-8")
    .set("Cookie", cookie)
    .send({
        p: null,
        team: teamid || null
    })
    .end((err, res)=>{            
        fs.writeFileSync("temp.txt", JSON.stringify({err: err, res: res}, null, 2))
    })           
}

if(command == "join"){
    let id = process.argv[3]
    let username = process.argv[4]

    let teamid = process.argv[5] || inferteam(username)

    jointourney(id, username, teamid)
}

function joinall(id, tb){
    let i = 0
    for(let username of ALLUSERS){
        setTimeout(function(){
            console.log("join", username)
            jointourney(id, username, tb ? inferteam(username) : null)
        }, (i++)*1000)
    }
}

if(command == "joinall"){
    let id = process.argv[3]
    let tb = process.argv[4] ? JOIN_WITH_TEAM : JOIN_SOLO

    joinall(id, tb)
}

if(command == "createtourney"){
    let username = process.argv[3]

    let cookie = "lila2=" + state.users[username].lila2

    superagent
    .post(BASE_URL + "/tournament/new")
    .redirects(0)
    .type("form")
    .send({
        "name": "Atomic Rapid",
        "clockTime": "5",
        "clockIncrement": "10",
        "minutes": "360",
        "waitMinutes": "5",
        "variant": DEFAULT_VARIANT,
        "rated": "true",
        "conditions.minRating.rating": "",
        "conditions.minRating.perf": "",
        "conditions.maxRating.rating": "",
        "conditions.maxRating.perf": "",
        "conditions.nbRatedGame.nb": "",
        "conditions.nbRatedGame.perf": "",
        "startDate": "",
        "berserkable": "true"
    })        
    .set("Cookie", cookie)
    .end((err, res)=>{            
        fs.writeFileSync("temp.txt", JSON.stringify({err: err, res: res}, null, 2))
    })
}

if(command == "createteambattle"){
    let username = process.argv[3]
    let team = process.argv[4] || inferteam(username)
    if(team.length < 2) team = inferteam(username)

    let startDate = process.argv[5] || schedulenext(new Date().getTime()).getTime()

    let cookie = "lila2=" + state.users[username].lila2

    superagent.agent()
    .post(BASE_URL + "/tournament/new")    
    .redirects(0)
    .type("form")
    .send({
        "name": "Atomic Rapid",
        "clockTime": "5",
        "clockIncrement": "10",
        "minutes": "360",
        "waitMinutes": "5",
        "variant": DEFAULT_VARIANT,
        "rated": "true",
        "conditions.minRating.rating": "",
        "conditions.minRating.perf": "",
        "conditions.maxRating.rating": "",
        "conditions.maxRating.perf": "",
        "conditions.nbRatedGame.nb": "",
        "conditions.nbRatedGame.perf": "",
        "berserkable": "true",
        "startDate": `${startDate}`,
        "teamBattleByTeam": team
    })        
    .set("Cookie", cookie)
    .end((err, res)=>{            
        fs.writeFileSync("temp.txt", JSON.stringify({err: err, res: res}, null, 2))

        let location = err.response.header.location

        console.log("location", location)

        if((!location) || (!location.match(/edit\//))){
            console.log("not allowed to create tourney")
            process.exit()
        }

        let m = location.match(/edit\/(.*)/)
        
        let id = m[1]

        let turl = BASE_URL + "/tournament/" + id

        console.log(turl)                

        superagent.agent()
        .post(BASE_URL + location)    
        .redirects(0)
        .type("form")
        .send({
            "teams": TEAMS,
            "nbLeaders": "5"
        })        
        .set("Cookie", cookie)
        .end((err, res)=>{            
            fs.writeFileSync("temp.txt", JSON.stringify({err: err, res: res}, null, 2))            

            let sdms = parseInt(startDate)

            let next = schedulenext(sdms)

            state.tourneys[id] = {
                id: id,
                startsAt: startDate,
                startsAtDate: new Date(sdms),
                next: next,
                nextTimeStamp: next.getTime(),
                createdBy: username,
                fullName: "Atomic Rapid Team Battle"
            }

            writestate()

            open(turl)

            joinall(id, JOIN_WITH_TEAM)
        })
    })
}

if(command == "getteambattles"){ 
    superagent
    .get(BASE_URL + "/api/tournament")            
    .end((err, res)=>{
        fs.writeFileSync("temp.txt", JSON.stringify({err: err, res: res}, null, 2))

        let tourneysblob = JSON.parse(res.text)

        let tourneys = []

        for(let kind of ["created", "started"]){
            tourneys = tourneys.concat(tourneysblob[kind])
        }

        let atomicteambattles = tourneys.filter((t)=>(t.perf.key == DEFAULT_VARIANT)&&(t.battle)&&(t.fullName == "Atomic Rapid Team Battle"))

        if(!state.tourneys){
            state.tourneys = {}
        }

        for(let tb of atomicteambattles){
            let schn = schedulenext(new Date(tb.startsAt).getTime())
            console.log(tb.id + " " + tb.createdBy + " " + tb.fullName + " # " + tb.nbPlayers, "\n", schn, schn.getTime())
            //open(BASE_URL + "/tournament/" + tb.id)
            let next = schedulenext(tb.startsAt)
            state.tourneys[tb.id] = {
                id: tb.id,
                startsAtDate: new Date(tb.startsAt),
                startsAt: tb.startsAt,                
                next: next,
                nextTimeStamp: next.getTime(),
                createdBy: tb.createdBy,
                fullName: tb.fullName
            }
        }

        let newentries = Object.entries(state.tourneys).filter((entry)=>entry[1].startsAt > new Date().getTime())
        state.tourneys = Object.fromEntries(newentries)

        writestate()

        console.log(state.tourneys)

        let next = schedulenext(new Date())
        for(let i=0; i<10; i++){
            console.log("next\n", next, next.getTime())
            next = schedulenext(next)
        }        
    })
}
