function getclassforpiece(p, style){
    let kind = p.kind
    if(p.color == WHITE) kind = "w" + kind
    return ( style || "alpha" ) + "piece" + kind
}

class Board extends React.PureComponent{
    constructor(props){
        super(props)           
        this.props = props || {}

        this.id = props.id || "board"

        this.squaresize = this.props.squaresize || 60        

        this.positionchangedcallback = this.props.positionchangedcallback
        this.analysisinfocallback = this.props.analysisinfocallback
        this.playenginemovecallback = this.props.playenginemovecallback

        this.dragpiececanvasdivref = React.createRef()        
        this.backgroundcanvasref = React.createRef()
        this.squarecanvasref = React.createRef()
        this.highlightcanvasref = React.createRef()
        this.weightscanvasref = React.createRef()
        this.analysiscanvasref = React.createRef()
        this.drawingscanvasref = React.createRef()        
        this.gifcanvasref = React.createRef()
        this.piececanvasref = React.createRef()
        this.piecedivref = React.createRef()
        this.dragpiececanvasref = React.createRef()        
        this.dragpiecedivref = React.createRef()        

        this.game = Game({variant: this.props.variant || DEFAULT_VARIANT}).setfromfen()        
    }

    doflip(){
        this.game.flip = !this.game.flip        
        this.positionchanged()
    }

    fasq(sq){
        if(this.game.flip) return Square(LAST_SQUARE - sq.file, LAST_SQUARE - sq.rank)
        return sq
    }
    
    boardsize(){
        return this.squaresize * NUM_SQUARES
    }

    setgame(game){
        this.game = game        
        this.positionchanged()
        return this
    }

    getsquarecanvas(){return this.squarecanvasref.current}
    gethighlightcanvas(){return this.highlightcanvasref.current}
    getweightscanvas(){return this.weightscanvasref.current}
    getanalysiscanvas(){return this.analysiscanvasref.current}
    getdrawingscanvas(){return this.drawingscanvasref.current}    
    getbackgroundcanvas(){return this.backgroundcanvasref.current}
    getpiececanvas(){return this.piececanvasref.current}
    getdragpiececanvas(){return this.dragpiececanvasref.current}

    squarelight(sq){return ( ( sq.file + sq.rank ) % 2 ) == 0}

    piecemargin(){return ( this.squaresize - this.piecesize() ) / 2}

    squarecoords(sq){
        return Vect(sq.file * this.squaresize, sq.rank * this.squaresize)
    }

    piececoords(sq){
        let sc = this.squarecoords(this.fasq(sq))
        return Vect(sc.x + this.piecemargin(), sc.y + this.piecemargin())
    }

    drawsquares(){
        this.squarecanvas = this.getsquarecanvas()
        this.backgroundcanvas = this.getbackgroundcanvas()
        this.backgroundcanvas.loadbackgroundimage('src/img/backgrounds/wood.jpg')
        for(let sq of ALL_SQUARES){
            this.squarecanvas.fillStyle(this.squarelight(sq) ? "#eed" : "#aab")
            let sqcoords = this.squarecoords(sq)
            this.squarecanvas.fillRect(sqcoords, Vect(this.squaresize, this.squaresize))
        }        
    }

    highlightlastmove(){        
        let currentnode = this.game.getcurrentnode()
        let highlightcanvas = this.gethighlightcanvas()
        highlightcanvas.clear()        
        if(currentnode.genalgeb){                        
            let move = this.game.board.movefromalgeb(currentnode.genalgeb)                        
            this.drawmovearrow(highlightcanvas, move, {
                scalefactor: this.arrowscalefactor()
            })
        }
    }

    arrowscalefactor(){
        return this.boardsize() / 560
    }

    highlightweights(){
        let currentnode = this.game.getcurrentnode()
        let weightscanvas = this.getweightscanvas()
        weightscanvas.clear()        
        if(this.trainon) return
        for(let child of currentnode.sortedchilds()){
            let move = this.game.board.movefromalgeb(child.genalgeb)
            this.drawmovearrow(weightscanvas, move, {
                scalefactor: this.arrowscalefactor(),
                auxscalefactor: 1.2,
                color: "#00f",
                opacity: child.weights[0] / 10
            })
        }
    }

    clearanalysisinfo(){
        let analysiscanvas = this.getanalysiscanvas()
        analysiscanvas.clear()        
    }

    getlms(){
        return this.game.board.legalmovesforallpieces()
    }

    highlightanalysisinfo(analysisinfo){        
        let lms = this.getlms()
        this.clearanalysisinfo()        
        if(strippedfen(analysisinfo.analyzedfen) != strippedfen(this.game.fen())){                        
            return
        }
        let analysiscanvas = this.getanalysiscanvas()        
        let i = analysisinfo.summary.length                     
        for(let item of analysisinfo.summary.slice().reverse()){                                    
            let move = this.game.board.movefromalgeb(item.uci)
            this.drawmovearrow(analysiscanvas, move, {
                scalefactor: this.arrowscalefactor(),
                auxscalefactor: 1/i--,
                color: scoretorgb(item.scorenumerical)
            })            
            let detailedmove = lms.find((m)=>this.game.board.movetoalgeb(m) == item.uci)
            if(detailedmove){
                item.san = this.game.board.movetosan(detailedmove)
                item.move = detailedmove                                
            }
        }                
        if(this.analysisinfocallback) this.analysisinfocallback(analysisinfo)
    }

    analysiskey(){        
        return `analysis/${this.game.variant}/${strippedfen(this.game.getcurrentnode().fen)}`
    }

    setpromkind(kind){        
        this.promkind = kind
    }

    getgifcanvas(){
        let gc = this.gifcanvasref.current
        gc.clear()
        gc.ctx.drawImage(this.getbackgroundcanvas().canvasref.current, 0, 0)        
        gc.ctx.globalAlpha = 0.2
        gc.ctx.drawImage(this.getsquarecanvas().canvasref.current, 0, 0)        
        gc.ctx.globalAlpha = 1
        gc.ctx.drawImage(this.gethighlightcanvas().canvasref.current, 0, 0)        
        gc.ctx.globalAlpha = 1
        gc.ctx.drawImage(this.getpiececanvas().canvasref.current, 0, 0)        
        gc.ctx.globalAlpha = 1
        gc.ctx.drawImage(this.getdrawingscanvas().canvasref.current, 0, 0)        
        return gc
    }

    calcdrawingstyle(r,g,b,o){
        return `rgb(${r},${g},${b},${(o+1)/10})` 
    }

    getdrawingcolor(drawing){
        return {
            red: this.calcdrawingstyle(255,0,0,drawing.opacity),
            green: this.calcdrawingstyle(0,127,0,drawing.opacity),
            blue: this.calcdrawingstyle(0,0,255,drawing.opacity),
            yellow: this.calcdrawingstyle(192,192,0,drawing.opacity)
        }[drawing.color]
    }

    calcdrawingsize(size){
        return size * this.squaresize / 60
    }

    highlightcomment(){        
        let drawings = this.game.getcurrentnode().drawings()
        let drawingscanvas = this.getdrawingscanvas()        
        drawingscanvas.clear()
        let b = this.game.board
        for(let drawing of drawings){                     
            try{
                let squares = drawing.squares.map(algeb=>this.fasq(b.algebtosquare(algeb)))
                switch(drawing.kind){
                    case "circle":                                        
                        for(let sq of squares){
                            let sqmc = this.squaremiddlecoords(sq)
                            drawingscanvas.lineWidth(this.calcdrawingsize(drawing.thickness))
                            drawingscanvas.strokeStyle(this.getdrawingcolor(drawing))
                            drawingscanvas.strokeCircle(sqmc, this.squaresize / 2.5)                            
                        }
                        break
                    case "arrow":
                        for(let i=0;i<squares.length/2;i++){
                            let move = Move(squares[i*2], squares[i*2+1])                            
                            this.drawmovearrow(drawingscanvas, move, {
                                color: this.getdrawingcolor(drawing),
                                auxscalefactor: drawing.thickness / 5
                            })
                        }
                        break
                    case "square":                                        
                        drawing.opacity /= 2
                        for(let sq of squares){
                            let sqc = this.squarecoords(sq)
                            drawingscanvas.fillStyle(this.getdrawingcolor(drawing))
                            drawingscanvas.fillRect(sqc.p(Vect(this.piecemargin(), this.piecemargin())), Vect(this.piecesize(), this.piecesize()))
                        }
                        break
                }
            }catch(err){
                console.log(err)
            }            
        }
    }

    draw(){                        
        try{
            this.gifcanvasref.current.clear()
            this.drawpieces()
            this.highlightlastmove()
            this.highlightweights()
            this.highlightcomment()
        }catch(err){}
    }

    reset(variant){
        this.game.setfromfen(null, variant)
        this.positionchanged()
    }

    settrain(state){        
        this.trainon = state.trainwhite || state.trainblack
        this.traincolor = state.trainwhite
        this.trainerror = state.trainerror
        this.traineng = state.traineng
        this.trainrootnode = this.game.getcurrentnode()        
        this.positionchanged()
    }

    piecesize(){return this.squaresize * 0.85}

    drawpiece(canvas, coords, p){        
        const klasssel = "." + getclassforpiece(p, this.piecestyle)                                                    
        let img
        if(!this.imgcache) this.imgcache = {}
        if(this.imgcache[klasssel]){
            img = this.imgcache[klasssel]
            canvas.ctx.drawImage(img.e, coords.x, coords.y, this.piecesize(), this.piecesize())
        }else{
            let style = getStyle(klasssel)            
            let imgurl = style.match(/url\("(.*?)"/)[1]                
            let imgurlparts = imgurl.split(",")
            let svgb64 = imgurlparts[1]
            let svg = atob(svgb64)
            let newsvg = svg.replace(/^<svg/, `<svg width="${this.piecesize()}" height="${this.piecesize()}"`)
            let newsvgb64 = btoa(newsvg)
            let newimgurl = imgurlparts[0] + "," + newsvgb64            
            let img = Img().width(this.piecesize()).height(this.piecesize())                            
            let fen = this.game.fen()
            img.e.onload = ()=>{
                if(this.game.fen() == fen){
                    canvas.ctx.drawImage(img.e, coords.x, coords.y, this.piecesize(), this.piecesize())
                }                
                this.imgcache[klasssel] = img                
            }
            img.e.src = newimgurl                                                        
        }   
    }

    drawpieces(){                
        let dragpiececanvas = this.getdragpiececanvas()
        dragpiececanvas.clear()            
        let piececanvas = this.getpiececanvas()        
        piececanvas.clear()
        for(let sq of ALL_SQUARES){
            let p = this.game.board.pieceatsquare(sq)
            if(!p.isempty()){                
                let pc = this.piececoords(sq)
                this.drawpiece(piececanvas, pc, p)
            }
        }
    }

    componentDidMount(){
        this.drawsquares()
        this.draw()
    }

    coordstosq(coords){return this.fasq(Square(Math.floor(coords.x / this.squaresize), Math.floor(coords.y / this.squaresize)))}

    clearpiece(sq){
        let piececanvas = this.getpiececanvas()
        piececanvas.clearRect(this.piececoords(sq), Vect(this.piecesize(), this.piecesize()))        
    }

    piecedragstart(ev){
        ev.preventDefault()                        
        let bcr = this.dragpiececanvasdivref.current.getBoundingClientRect()
        this.piecedragorig = Vect(ev.clientX - bcr.x, ev.clientY - bcr.y)        
        this.draggedsq = this.coordstosq(this.piecedragorig)        
        this.draggedpiece = this.game.board.pieceatsquare(this.draggedsq)
        if(!this.draggedpiece.isempty()){
            this.draggedpiececoords = this.piececoords(this.draggedsq)        
            this.clearpiece(this.draggedsq)
            this.piecedragon = true            
        }        
    }

    piecemousemove(ev){
        if(this.piecedragon){
            let bcr = this.dragpiececanvasdivref.current.getBoundingClientRect()
            this.piecedragvect = Vect(ev.clientX - bcr.x, ev.clientY - bcr.y)
            this.piecedragdiff = this.piecedragvect.m(this.piecedragorig)
            this.dragtargetsq = this.coordstosq(this.piecedragvect)            
            
            let dragpiececanvas = this.getdragpiececanvas()
            dragpiececanvas.clear()
            this.drawpiece(dragpiececanvas, this.draggedpiececoords.p(this.piecedragdiff), this.draggedpiece)
        }
    }

    makemove(move){                
        this.game.makemove(move)
        this.positionchanged()
    }

    tobegin(){
        this.game.tobegin()
        this.positionchanged()        
    }

    back(){
        this.game.back()
        this.positionchanged()        
    }

    forward(){
        this.game.forward()
        this.positionchanged()        
    }

    toend(){
        this.game.toend()
        this.positionchanged()        
    }

    del(){
        this.game.del()
        this.positionchanged()        
    }

    setfromnode(node){
        this.game.setfromnode(node)
        this.positionchanged()
    }

    setfromgame(game){
        this.game = game
        this.positionchanged()
    }

    resettrainroot(){
        this.setfromnode(this.trainrootnode)
    }

    getopptrainnode(){        
        let sortedchilds = this.game.getcurrentnode().sortedchildsopp()        
        let selchild
        if(this.trainerror){
            if(sortedchilds.find((child)=>child.geterror() > 0)){
                sortedchilds.sort((a, b)=>b.geterror() - a.geterror())                            
                selchild = sortedchilds[0]
            }                        
        }
        if(!selchild){
            let choices = []
            for(let child of sortedchilds) choices = choices.concat(Array(child.opptrainweight()).fill(child))                    
            let rnd = Math.floor(Math.random()*choices.length)                        
            selchild = choices[rnd]
        }                   
        return selchild    
    }

    hint(){
        let sortedchilds = this.game.getcurrentnode().sortedchildsme()
        if(sortedchilds.length == 0){
            window.alert("No hint move.")
            return
        }
        this.hinton = true
        this.setfromnode(sortedchilds[0])
    }

    positionchanged(){                                
        this.draw()

        // train
        if(this.trainon){                        
            this.clearanalysisinfo()            
            if(this.game.board.turn != this.traincolor){                      
                if(this.hinton){                    
                    this.hinton = false
                    setTimeout(this.positionchanged.bind(this), 2000)
                    return
                }
                let sortedchilds = this.game.getcurrentnode().sortedchildsopp()
                if(sortedchilds.length == 0){
                    if((this.game.currentnodeid == this.trainrootnode.id)&&(!this.traineng)){
                        window.alert("No training moves.")
                    }else{
                        if(this.traineng){
                            this.playenginemovecallback()
                        }else{
                            this.resettrainroot()
                        }                        
                    }
                }else{
                    let opptrainnode = this.getopptrainnode()
                    this.setfromnode(opptrainnode)                 
                }                
            }
        }

        if(this.positionchangedcallback){
            this.positionchangedcallback(this)
        }
    }

    piecemouseup(){
        if(this.piecedragon){
            
            let dragpiececanvas = this.getdragpiececanvas()
            dragpiececanvas.clear()            
            this.drawpiece(dragpiececanvas, this.piececoords(this.fasq(this.dragtargetsq)), this.draggedpiece)

            let move = Move(this.draggedsq, this.dragtargetsq)
            
            let valid = this.getlms().find((testmove)=>testmove.roughlyequalto(move))
            if(valid){                
                if(valid.prompiece){
                    if(this.promkind){
                        valid.prompiece = Piece(this.promkind)
                    }else{
                        let pkind = window.prompt(`Enter promotion piece letter : ${this.game.board.promkinds().join(" , ")}`)
                        if(pkind) valid.prompiece = Piece(pkind)
                    }                    
                }                
                if(this.trainon){                    
                    let currentnode = this.game.getcurrentnode()                
                    let sortedchilds = currentnode.sortedchildsme()                    
                    let movechild = sortedchilds.find((child)=>child.genalgeb == this.game.board.movetoalgeb(valid))                                
                    if(movechild){
                        currentnode.moderrorrec(-1)
                        this.makemove(valid)    
                    }else{
                        if(sortedchilds.length == 0){                            
                            if(this.traineng && this.playenginemovecallback){                                
                                this.makemove(valid)
                            }else{
                                this.resettrainroot()
                            }                            
                        }else{
                            window.alert("Wrong move!")                                                        
                            currentnode.moderrorrec(3)
                        }                        
                    }
                }else{                    
                    this.makemove(valid)
                }                
            }            
            this.drawpieces()
        }
        this.piecedragon = false
    }

    squaremiddlecoords(sq){
        return Vect(this.fasq(sq).file, this.fasq(sq).rank).s(this.squaresize).p(Vect(this.squaresize/2, this.squaresize/2))
    }

    drawmovearrow(canvas, move, argsopt){
        canvas.arrow(this.squaremiddlecoords(move.fromsq), this.squaremiddlecoords(move.tosq), argsopt)
    }

    render(){        
        const canv = function(ref, op){return e('div', {style: {position: "absolute", opacity: op || 1}}, e(Canvas, {ref: ref, width: this.boardsize(), height: this.boardsize(), style: {position: "absolute"}}))}.bind(this)
        const canvdiv = function(ref, op){return e('div', {ref: ref, style: {position: "absolute", opacity: op || 1}}, null)}.bind(this)
        return e('div', {style: {position: "relative", width: `${this.boardsize()}px`, height: `${this.boardsize()}px`}},
            canv(this.backgroundcanvasref),
            canv(this.squarecanvasref, 0.3),
            canv(this.highlightcanvasref),
            canv(this.weightscanvasref),
            canv(this.analysiscanvasref),
            canv(this.drawingscanvasref),
            canv(this.gifcanvasref),
            canvdiv(this.piecedivref),
            canvdiv(this.dragpiecedivref),
            canv(this.piececanvasref),
            e('div', {
                style: {position: "absolute"},
                draggable: true,
                ref: this.dragpiececanvasdivref,                
                onDragStart: this.piecedragstart.bind(this),
                onMouseMove: this.piecemousemove.bind(this),
                onMouseUp: this.piecemouseup.bind(this)
            }, e(Canvas, {ref: this.dragpiececanvasref, width: this.boardsize(), height: this.boardsize(), style: {position: "absolute"}}, null))
        )
    }
}
