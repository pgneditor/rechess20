const AI_LEVEL_2_RATING = {
    1: 1350,
    2: 1420,
    3: 1500,
    4: 1600,
    5: 1700,
    6: 1900,
    7: 2200,
    8: 2600
  }
  
function ailevel2rating(ailevel){  
let rating = AI_LEVEL_2_RATING[ailevel]
if(!rating) return 1500
return rating
}

class LichessGame_{
    constructor(obj, myUsername){

        this.id = obj.id

        this.moves = []
        if(obj.moves) this.moves = obj.moves.split(" ")

        if(!obj.players.white) obj.players.white = {}
        if(!obj.players.black) obj.players.black = {}

        this.whiteAILevel = obj.players.white.aiLevel || 0
        this.blackAILevel = obj.players.black.aiLevel || 0

        if(!obj.players.white.user) obj.players.white.user = {
            id: "none",
            name: `Stockfish AI level ${this.whiteAILevel}`,
            rating: ailevel2rating(this.whiteAILevel)
        }

        if(!obj.players.black.user) obj.players.black.user = {
            id: "none",
            name: `Stockfish AI level ${this.blackAILevel}`,
            rating: ailevel2rating(this.blackAILevel)
        }

        this.myUsername = myUsername

        this.whiteName = obj.players.white.user.name
        this.blackName = obj.players.black.user.name

        this.meWhite = this.myUsername.toLowerCase() == this.whiteName.toLowerCase()
        this.meBlack = this.myUsername.toLowerCase() == this.blackName.toLowerCase()

        this.myColor = "none"
        if(this.meWhite) this.myColor = "white"
        if(this.meBlack) this.myColor = "black"

        this.opponentName = this.meWhite ? this.blackName : this.whiteName
        
        this.whiteTitle = obj.players.white.user.title || ""
        this.blackTitle = obj.players.black.user.title || ""

        this.whiteBot = this.whiteTitle == "BOT"
        this.blackBot = this.blackTitle == "BOT"

        this.oppKind = "human"

        if(this.meWhite && this.blackBot) this.oppKind = "bot"
        if(this.meBlack && this.whiteBot) this.oppKind = "bot"

        this.someBot = this.whiteBot || this.blackBot

        this.whiteTitledName = this.whiteTitle == "" ? this.whiteName : this.whiteTitle + " " + this.whiteName
        this.blackTitledName = this.blackTitle == "" ? this.blackName : this.blackTitle + " " + this.blackName

        this.opponentTitledName = this.meWhite ? this.blackTitledName : this.whiteTitledName

        this.whiteRating = obj.players.white.rating
        this.blackRating = obj.players.black.rating

        if(obj.clock){
            this.clockInitial = obj.clock.initial
            this.clockIncrement = obj.clock.increment
            this.clockStr = `${this.clockInitial} + ${this.clockIncrement}`
        }else{
            this.clockInitial = "?"
            this.clockIncrement = "?"
            this.clockStr = `?`
        }        

        this.winner = obj.winner

        this.result = 0.5
        this.resultStr = "1/2 - 1/2"        
        this.myResult = 0.5        

        if(this.winner){            
            if(this.winner == "white"){
                this.result = 1
                this.resultStr = "1-0"
                this.myResult = this.myUsername.toLowerCase() == this.whiteName.toLowerCase() ? 1 : 0
            }else{
                this.result = 0
                this.resultStr = "0-1"
                this.myResult = this.myUsername.toLowerCase() == this.blackName.toLowerCase() ? 1 : 0
            }
        }                

        this.perf = obj.perf        
        this.variant = obj.variant || "?"
        
        if(this.perf == "correspondence"){
            this.perf = this.perf + " " + this.variant
            if(obj.daysPerTurn){
                this.clockStr = obj.daysPerTurn + " day(s)"
            }
        }

        this.whiteTitled = ( this.whiteTitle != "" ) && ( !this.whiteBot )
        this.blackTitled = ( this.blackTitle != "" ) && ( !this.blackBot )
        this.someTitled = ( this.whiteTitled || this.blackTitled )
        this.opponentTitle = this.meWhite ? this.blackTitle : this.whiteTitle
        this.opponentTitled = ( ( this.meWhite && this.BlackTitled ) || ( this.meBlack && this.whiteTitled ) )

        this.meWon = ( this.myResult == 1 )
        this.meLost = ( this.myResult == 0 )
        this.draw = ( this.result == 0.5 )

        this.rated = obj.rated        

        this.whiteHuman = (!this.whiteBot) && (!this.whiteAILevel)
        this.blackHuman = (!this.blackBot) && (!this.blackAILevel)        
        this.bothHuman = this.whiteHuman && this.blackHuman

        this.humanRated = this.bothHuman && this.rated

        this.myRating = undefined
        if(this.meWhite) this.myRating = this.whiteRating
        if(this.meBlack) this.myRating = this.blackRating

        this.opponentRating = undefined
        if(this.meWhite) this.opponentRating = this.blackRating
        if(this.meBlack) this.opponentRating = this.whiteRating

        this.ratingDiff = undefined
        if(this.myRating && this.opponentRating) this.ratingDiff = this.myRating - this.opponentRating

        this.plies = 0
        try{
        this.plies = obj.moves.split(" ").length
        }catch(err){console.log(err)}
    }

    get summary(){
        return `${this.whiteTitledName} ( ${this.whiteRating} ) - ${this.blackTitledName} ( ${this.blackRating} ) [ ${this.perf} ${this.clockStr} ] ${this.resultStr}`
    }

    get summarypadded(){        
        return `${this.meLost ? "( * )" : "_____"} ${this.whiteTitledName.padEnd(20, "_")} ( ${this.whiteRating} ) - ${this.blackTitledName.padEnd(20, "_")} ( ${this.blackRating} ) [ ${this.perf.padEnd(12, "_")} ${this.clockStr.padEnd(10, "_")} ] ${this.resultStr.padEnd(16, "_")}`
    }
}
function LichessGame(obj, myUsername){return new LichessGame_(obj, myUsername)}

const LICH_API_GAMES_EXPORT = "api/games/user"

function lichapiget(path, headers, token, callback, errcallback){

    args = {...{
        method: "GET"
    }, headers}

    if ( token ){
        args.headers.Authorization= `Bearer ${token}`
    }

    let fullpath = "https://lichess.org/" + path

    fetch(fullpath, args).then(
        (response) => response.text().then(
            (content) => callback(content),
            (err) => errcallback(err)
        ),
        err => errcallback(err)
    )

}

function processgames(user, callback, content){        
    try{        
        let games = content.split("\n").filter((x)=>x.length > 0).map((x)=>LichessGame(JSON.parse(x), user))
        callback(games)
    }catch(err){console.log(content, err)}
}

function getlichessgames(user, token, max, callback){
    lichapiget(LICH_API_GAMES_EXPORT + `/${user}?max=${max}`, {Accept: "application/x-ndjson"}, token, processgames.bind(null, user, callback), processgames)
}
