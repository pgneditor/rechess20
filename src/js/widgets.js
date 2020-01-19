const SET_SELECTED = true
const DO_RENDER = true

function pushRight(m, element){
    return e('div', {style: {display: "inline-block", marginLeft: `${m}px`}}, element)
}

class Combo extends React.PureComponent{
    constructor(props){
        super(props)        
        this.props = props
        this.id = this.props.id
        this.settings = props.settings || {}
        this.changecallback = props.changecallback
        this.default = this.props.selected
        this.state = {
            selected: this.id ? getlocalelse(this.id, this.default) : this.default
        }
        if(this.props.forceselected) this.state.selected = this.props.forceselected        
        this.setvalue(this.state.selected)
    }

    setvalue(value, render){
        if(!this.id) return
        try{
            let parsedvalue = this.props.valuetype == "int" ? parseInt(value) : value        
            storelocal(this.id, parsedvalue.toString())
            this.settings[this.id] = parsedvalue
        }catch(err){}
        if(render) this.setState({selected: value})
    }

    onchange(ev){
        let value = ev.target.value
        this.setvalue(value)
        this.setState({selected: value})
        if(this.changecallback) this.changecallback(value)
    }

    render(){        
        return e('select', {style: {...{}, ...this.props.addstyle}, className: `${this.props.className}`, onChange: this.onchange.bind(this), value: this.state.selected}, this.props.options.map((option)=>e('option', {key: option[0], value: option[0]}, option[1])))
    }
}

class PersistentCheck extends Combo{
    constructor(props){
        super(props)        
        this.props = props
        this.id = props.id || "persistentcheck"
        this.settings = props.settings || {}
        this.state = {
            checked: getlocalelse(`${this.id}/checked`, !(!props.default))
        }
        this.settings[this.id] = this.state.checked
    }

    changed(){                
        storelocal(`${this.id}/checked`, !this.state.checked)
        this.settings[this.id] = !this.state.checked
        this.setState({checked: !this.state.checked})
    }

    render(){        
        return e('input', {type: "checkbox", checked: this.state.checked, key: this.id + "checkbox", onChange: this.changed.bind(this)}, null)
    }
}

class EditableCombo extends Combo{
    constructor(props){
        super(props)                
        this.props = props
        this.id = props.id || "editablecombo"                

        this.callbacks = this.props.callbacks || []

        if(this.props.mergecallback){
            this.callbacks.push({
                name: "Merge",
                bc: "#ddf",
                callback: this.props.mergecallback}
            )
        }

        if(this.props.savecallback){
            this.callbacks.push({
                name: "     \uE800     ",
                bc: "#afa",
                font: "custom",
                callback: this.props.savecallback
            })
        }

        if(this.props.loadcallback){
            this.callbacks.push({
                name: "     \uF112     ",
                bc: "#ffa",
                font: "custom",
                callback: this.props.loadcallback
            })
        }

        if(this.props.removecallback){
            this.callbacks.push({
                name: "\uF1F8",
                bc: "#faa",
                font: "custom",
                callback: this.props.removecallback
            })
        }

        this.state = {
            options: getlocalelse(`${this.id}/options`, [["default", "Default"]]),
            selected: getlocalelse(`${this.id}/selected`, "default")
        }        
        this.selected = this.state.selected
        this.settings = {}
    }

    onchange(ev){
        let value = ev.target.value
        if(this.id) storelocal(`${this.id}/selected`, value)
        this.setState({selected: value})
        this.selected = value
        if(this.props.changecallback) this.props.changecallback(value, this.settings[this.id + "autoload"])
    }

    add(){
        let item = window.prompt("Add item", this.props.addcallback ? this.props.addcallback() : "")
        if(item){
            let temp = this.state.options
            temp.push([item, item])
            storelocal(`${this.id}/options`, temp)
            storelocal(`${this.id}/selected`, item)
            this.setState({
                options: temp,
                selected: item
            })
            this.selected = item
            if(this.props.changecallback) this.props.changecallback(item, this.settings[this.id + "autoload"])
        }
    }

    delete(){
        if(this.state.selected == "default"){
            window.alert("Default cannot be deleted.")
            return
        }
        let temp = this.state.options
        temp = temp.filter((option)=>option[0] != this.state.selected)
        storelocal(`${this.id}/options`, temp)
        storelocal(`${this.id}/selected`, "default")
        this.setState({
            options: temp,
            selected: "default"
        })
        this.selected = "default"
        if(this.props.changecallback) this.props.changecallback("default", this.settings[this.id + "autoload"])
    }

    callback(callback){
        callback.callback(this.state.selected)
    }

    render(){        
        return e('div', {style: {display: "flex"}}, 
            e('select', {key: "combo", className: `${this.props.className}`, onChange: this.onchange.bind(this), value: this.state.selected}, this.state.options.map((option)=>e('option', {key: option[0], value: option[0]}, option[1]))),
            this.props.omitautoload ? null : e(PersistentCheck, {key: "autoload", id: this.id + "autoload", settings: this.settings}, null),
            e('input', {type: "button", style: {fontFamily: "custom", backgroundColor: "#afa"}, value: "\uE802", key: "add", onClick: this.add.bind(this)}, null),
            e('input', {type: "button", style: {fontFamily: "custom", backgroundColor: "#faa"}, value: "\uE801", key: "delete", onClick: this.delete.bind(this)}, null),
            (this.callbacks).map((callback)=>
                e('input', {type: "button", style: {backgroundColor: callback.bc, fontFamily: callback.font || "initial"}, value: callback.name, key: callback.name, onClick: this.callback.bind(this, callback)}, null),
            )
        )        
    }
}

class Img_{
    constructor(){
        this.e = document.createElement('img')
    }

    width(width){
        this.e.setAttribute("width", width)
        return this
    }

    height(height){
        this.e.setAttribute("height", height)
        return this
    }

    set src(src){
        this.e.src = src
    }

    get naturalWidth(){return this.e.naturalWidth}
    get naturalHeight(){return this.e.naturalHeight}
}
function Img(){return new Img_()}

class Canvas extends React.Component {
    constructor(props){
        super()
        this.width = props.width || 600
        this.height = props.height || 400
        this.canvasref = React.createRef()
    }

    arrow(from, to, argsopt){        
        let diff = to.m(from)
        let l = diff.l()
        let rot = Math.asin((to.y - from.y)/l)        
        if(to.x < from.x) rot = Math.PI - rot             
        let args = argsopt || {}        
        let scalefactor = getelse(args, "scalefactor", 1)
        let auxscalefactor = getelse(args, "auxscalefactor", 1)
        let linewidth = getelse(args, "linewidth", 16) * scalefactor * auxscalefactor
        let halflinewidth = linewidth / 2
        let pointheight = getelse(args, "pointheight", 40) * scalefactor * auxscalefactor
        let pointwidth = getelse(args, "pointwidth", 30) * scalefactor * auxscalefactor
        let halfpointwidth = pointwidth / 2
        let color = getelse(args, "color", "#ff0")        
        let opacity = getelse(args, "opacity", 1)        
        let lineheight = l - pointheight
        this.ctx.save()
        this.ctx.globalAlpha = opacity
        this.ctx.translate(from.x, from.y)
        this.ctx.rotate(rot)
        this.ctx.fillStyle = color
        this.ctx.beginPath()
        this.ctx.moveTo(0, 0)
        this.ctx.lineTo(0, halflinewidth)        
        this.ctx.lineTo(lineheight, halflinewidth)
        this.ctx.lineTo(lineheight, halflinewidth + halfpointwidth)
        this.ctx.lineTo(l, 0)
        this.ctx.lineTo(lineheight, - ( halflinewidth + halfpointwidth ) )
        this.ctx.lineTo(lineheight, - halflinewidth)
        this.ctx.lineTo(0, -halflinewidth)        
        this.ctx.lineTo(0, 0)        
        this.ctx.closePath()
        this.ctx.fill()
        this.ctx.restore()
    }

    downloadHref(name, kind){
        let dt = this.canvas.toDataURL('image/' + kind)
        dt = dt.replace(/^data:image\/[^;]*/, 'data:application/octet-stream')
        dt = dt.replace(/^data:application\/octet-stream/, 'data:application/octet-stream;headers=Content-Disposition%3A%20attachment%3B%20filename=' + name + "." + kind)
        return dt
    }

    componentDidMount(){
        this.canvas = this.canvasref.current
        this.ctx = this.canvas.getContext("2d")
    }

    clear(){
        this.ctx.clearRect(0, 0, this.width, this.height)
    }

    fillRect(orig, size){
        this.ctx.fillRect(orig.x, orig.y, size.x, size.y)
    }

    strokeCircle(orig, radius){        
        this.ctx.beginPath()
        this.ctx.arc(orig.x, orig.y, radius, 0, 2 * Math.PI)
        this.ctx.stroke()
    }

    clearRect(orig, size){
        this.ctx.clearRect(orig.x, orig.y, size.x, size.y)
    }

    fillStyle(fs){
        this.ctx.fillStyle = fs
    }

    strokeStyle(ss){
        this.ctx.strokeStyle = ss
    }

    lineWidth(lw){
        this.ctx.lineWidth = lw
    }

    bimgloaded(){
        let mulx = Math.floor(this.width / this.bimg.naturalWidth) + 1
        let muly = Math.floor(this.height / this.bimg.naturalHeight) + 1                
        for(let x = 0; x < mulx; x++) for(let y = 0; y < muly; y++){
            this.ctx.drawImage(this.bimg.e, x * this.bimg.naturalWidth, y * this.bimg.naturalHeight)
        }
    }

    loadbackgroundimage(url){
        this.bimg = Img()
        this.bimg.e.addEventListener("load", this.bimgloaded.bind(this))
        this.bimg.src = url
    }

    render(){
        return(            
            e('canvas', {ref: this.canvasref, width: this.width, height:this.height}, null)
        )
    }
}

class TemplateComponent extends React.Component{
    constructor(props){
        super(props)        
        this.props = props        
        this.state = {
            
        }
    }
    
    render(){        
        return e('div', {}, null)
    }
}

function createfromfieldwidget(field, settings){
    if(field.kind == "checkbox"){
        return e(PersistentCheck, {id: field.id, default: field.default, settings: settings, key: field.id + "widget"}, null)
    }    
    if(field.kind == 'combo'){
        return e(Combo, {id: field.id, valuetype: field.valuetype, selected: field.selected, options: field.options, settings: settings, key: field.id + "widget"}, null)
    }
    return null
}

class Form extends React.Component{
    constructor(props){
        super(props)        
        this.props = props        
        this.id = this.props.id || "form"
        this.fields = this.props.fields
        this.settings = this.props.settings
        this.state = {
            
        }
    }
    
    render(){        
        return e('div', {key: "formcontainer", style: {fontFamily: "monospace", padding: "3px"}},
            e('table', {key: "formtable", cellPadding: 3},
                e('thead', {key: "formtablehead"},
                    e('tr', {key: "formtableheadtr"},
                        e('td', {key: "formtableheadnametd"}, "Name"),
                        e('td', {key: "formtableheadwidgettd"}, "Input")
                    )
                ),
                e('tbody', {key: "formtablebody"},
                    this.fields.map((field)=>
                        e('tr', {key: field.id + "tr"},
                            e('td', {key: field.id + "nametd"}, field.name),
                            e('td', {key: field.id + "widgettd"}, createfromfieldwidget(field, this.settings))
                        )
                    )
                )
            )
        )
    }
}

class Labeled extends React.Component{
    constructor(props){
        super(props)        
        this.props = props        
        this.state = {
            
        }
    }
    
    render(){        
        return e('div', {style: {display: "flex", alignItems: "center"}},
            e('div', {style: {padding: "2px", backgroundColor: "#eee", fontFamily: "monospace", marginLeft: "2px", marginRight: "2px"}}, this.props.label),
            this.props.element
        )
    }
}

class EditableList extends React.Component{
    constructor(props){
        super(props)                
        this.props = props  
        // id is used for storing the state of the widget and for a settings key
        this.id = this.props.id
        if(this.id){
            this.selectedid = this.id + "/selected"
            this.optionsid = this.id + "/options"
        }
        // settings is an object in which the field designated by id will be set to the current value
        this.settings = this.props.settings
        // defaultselected is used when no selected value is given and no stored value is available
        this.defaultselected = this.props.default
        // selected forces the selection to a given value      
        this.selected = this.props.selected
        // defaultoptions is a list of [ value, displayName ] tuples, it is used when no stored options are available
        this.defaultoptions = this.props.defaultoptions
        // options forces the options to a given list
        this.options = this.props.options
        // width
        this.width = this.props.width || 200
        // height
        this.height = this.props.height || 16
        // rolled
        this.rolled = false
        // load callback
        this.loadcallback = this.props.loadcallback
        // change callback ( defaults to load callback )
        this.changecallback = this.props.changecallback
        // add callback
        this.addcallback = this.props.addcallback

        if(!this.changecallback){
            this.changecallback = this.loadcallback
        }

        let storedselected = getlocalelse(this.selectedid, null)

        if(storedselected){
            if(!this.selected){
                this.selected = storedselected
            }            
        }else{
            if(!this.selected){
                this.selected = this.defaultselected
            }
        }        

        let storedoptions = getlocalelse(this.optionsid, null)

        if(storedoptions){            
            if(!this.options){
                this.options = storedoptions
            }
        }else{
            if(!this.options){
                this.options = this.defaultoptions
            }
        }
        
        this.setoptions(this.options)

        if((!this.selected)&&(this.options.length>0)){
            this.selected = this.options[0][0]
        }

        this.setselected(this.selected)

        this.state = this.createstate()
    }

    createstate(){
        return {
            selected: this.selected,
            options: this.options,
            rolled: this.rolled
        }        
    }

    build(){
        this.setState(this.createstate())
    }

    setsettings(){
        if(this.settings){
            this.settings[this.id] = {
                selected: this.selected,
                options: this.options
            }
        }
    }

    setselected(selected){
        this.selected = selected || null
        if(this.id){
            storelocal(this.selectedid, this.selected)
        }
        this.setsettings()
    }

    setoptions(options, setsel){
        this.options = options || []
        if(this.id){
            storelocal(this.optionsid, this.options)
        }                
        this.setsettings()
        if(setsel){
            this.setselected(this.options.length ? this.options[0][0] : null)
        }
    }

    findoptionbyvalue(value){        
        return this.options.find((testoption)=>testoption[0] == value)
    }

    getindexofoptionvalue(value){
        for(let i in this.options){
            if(this.options[i][0] == value) return parseInt(i)
        }
        return null
    }

    getdisplayforvalue(value){
        if(!value) return null
        let option = this.findoptionbyvalue(value)
        if(!option) return null
        return option[1]
    }

    getvaluefordisplay(display){
        return display
    }

    add(){
        let optiondisplay, optionvalue
        if(this.addcallback){
            [ optionvalue, optiondisplay ] = this.addcallback()
        }else{
            optiondisplay = window.prompt("Add option:")
            optionvalue = this.getvaluefordisplay(optiondisplay)
        }                
        if(optionvalue){
            if(this.findoptionbyvalue(optionvalue)){                
            }else{
                this.options.push([optionvalue, optiondisplay])
                this.setoptions(this.options)                
            }
            this.setselected(optionvalue)
            this.build()
            if(this.changecallback) this.changecallback(this.selected, this.options)
        }
    }

    switchroll(){
        this.rolled = !this.rolled
        this.build()
    }

    selectoptionbyvalue(optionvalue){
        this.setselected(optionvalue)
        if(!this.props.dontrolluponselect) this.rolled = false
        this.build()
        if(this.changecallback) this.changecallback(this.selected, this.options)
        if(this.loadcallback) this.loadcallback(this.selected)
    }

    loadcurrentoptionvalue(){        
        if(this.selected && this.loadcallback){
            this.loadcallback(this.selected)
        }
    }

    deletecurrentoption(){
        if(this.options.length == 0){
            window.alert("No option to delete.")
        }else{
            this.setoptions(this.options.filter((option)=>option[0] != this.selected))
            if(this.options.length > 0){
                this.setselected(this.options[0][0])
            }else{
                this.setselected(null)
            }
            this.build()
            if(this.changecallback) this.changecallback(this.selected, this.options)
        }           
    }

    cbutton(key, caption, callback, addstyle){
        return e('button', {key: key + "button", onClick: this[callback].bind(this), style: {...addstyle, ...{height: `${this.height + 2}px`, marginLeft: "2px", fontSize: `${this.height - 5}px`}}}, caption)
    }

    drag(value, ev){
        ev.persist()                
        if(ev.type == "dragstart"){                                    
            ev.dataTransfer.setData("text/plain", value)
            this.setState({dragged: value})
        }        
        if(ev.type == "dragenter"){                        
            this.setState({dragisover: value})
        }        
        if(ev.type == "dragleave"){            
            this.setState({dragisover: null})
        }        
        if(ev.type == "dragover"){        
            ev.preventDefault()    
            this.setState({dragisover: value})
        }                
        if(ev.type == "drop"){            
            this.setState({dragisover: null, dragged: null})
            let draggedi = this.getindexofoptionvalue(this.state.dragged)
            if(draggedi === null) return
            let dropi = this.getindexofoptionvalue(value)
            if(dropi === null) return
            if(draggedi == dropi) return
            let newoptions = this.options.slice()            
            let draggedentry = [ this.state.dragged, this.getdisplayforvalue(this.state.dragged)]            
            let dropentry = [ value, this.getdisplayforvalue(value)]            
            newoptions[draggedi] = new ArrayContainer([])
            newoptions[dropi] = new ArrayContainer(dropi > draggedi ? [dropentry, draggedentry] : [draggedentry, dropentry])                        
            this.setoptions(newoptions.flatten())
            this.build()
            if(this.changecallback) this.changecallback(this.selected, this.options)
        }        
        if(ev.type == "dragend"){            
            this.setState({dragisover: null, dragged: null})
        }        
    }

    componentDidUpdate(){        
        if(this.selected){
            if(this.optionrefs[this.selected].current){
                this.optionrefs[this.selected].current.scrollIntoView()
            }
        }
    }
    
    render(){                        
        this.optionrefs = {}
        this.state.options.forEach(opt=>this.optionrefs[opt[0]] = React.createRef())
        return e('div', {className: "unselectable", key: this.id + "maincontainer", style: {display: "inline-block", fontFamily: "monospace", fontSize: `${this.height - 2}px`}},
            e('div', {key: this.id + "flexcontainer", style: {position: "relative", display: "flex", alignItems: "center"}},
                e('div', {key: this.id + "selecteddiv", onMouseDown: this.switchroll.bind(this), style: {cursor: "pointer", position: "relative", width: `${this.width}px`, height: `${this.height}px`, backgroundColor: "#eee", padding: "2px", paddingLeft: "6px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textAlign: "left", direction: this.props.selectedtextdir || "ltr"}},
                    this.getdisplayforvalue(this.state.selected)
                ),
                this.cbutton(this.id + "roll", ">", "switchroll", {backgroundColor: "#ddf"}),                
                this.cbutton(this.id + "add", "+", "add", {backgroundColor: "#ffa"}),
                this.cbutton(this.id + "del", "X", "deletecurrentoption", {backgroundColor: "#faa"}),
                this.cbutton(this.id + "load", "Load", "loadcurrentoptionvalue", {backgroundColor: "#afa"}),                
                ( this.state.rolled && (this.state.options.length > 0) ) ?
                    e('div', {key: this.id + "options", style: {minWidth: `${this.width + 120}px`, maxWidth: `${this.width + 120}px`, position: "absolute", top: `${this.height + 5}px`, backgroundColor: "#007", zIndex: this.props.zindex || 100, overflowY : "scroll", maxHeight: "300px"}},
                        this.state.options.map((option)=>e('div', {ref: this.optionrefs[option[0]], key: option[0] + "container", style: {display: "flex", alignItems: "center"}},
                            e('div', {key: option[0] + "drag", draggable: true, onDragStart: this.drag.bind(this, option[0]), onDragEnd: this.drag.bind(this, option[0]), onDragEnter: this.drag.bind(this, option[0]), onDragLeave: this.drag.bind(this, option[0]), onDragOver: this.drag.bind(this, option[0]), onDrop: this.drag.bind(this, option[0]), style: {margin: "2px", minWidth: "20px", maxWidth: "20px", height: `${this.height}px`, backgroundColor: this.state.dragisover == option[0] ? "#0f0" : this.state.dragged == option[0] ? "#00f" : "#ffa", display: "inline-block", cursor: "move"}}, null),
                            e('div', {key: option[0], onMouseDown: this.selectoptionbyvalue.bind(this, option[0]), style: {display: "inline-block", padding: "2px", paddingLeft: "6px", margin: "2px", backgroundColor: this.state.selected == option[0] ? "#afa" : "#ddf", cursor: "pointer"}}, option[1])),
                        )
                    )
                :
                    null
            )
        )
    }
}

class TextCanvas{
    constructor(width, height){
        this.width = width
        this.height = height
        this.canvas = document.createElement('canvas')
        this.canvas.setAttribute("width", this.width)
        this.canvas.setAttribute("height", this.height)

        this.ctx = this.canvas.getContext("2d")
    }

    imageLoaded(){
        this.ctx.globalAlpha = this.imgop
        this.ctx.drawImage(this.img.e, this.imgcoords.x, this.imgcoords.y, this.imgsize.x, this.imgsize.y)
        if(this.drawimgcallback) this.drawimgcallback()
    }

    drawImage(url, coords, size, op, callback){
        this.img = Img()
        this.imgcoords = coords || Vect(0,0)
        this.imgsize = size || Vect(100,100)
        this.imgop = op || 1
        this.drawimgcallback = callback
        this.img.e.addEventListener("load", this.imageLoaded.bind(this))        
        this.img.src = url
    }

    clear(){
        this.ctx.clearRect(0, 0, this.width, this.height)
    }

    getLines(text, maxWidth) {
        let words = text.split(" ")
        let lines = []
        let currentLine = words[0]
    
        for (let i = 1; i < words.length; i++) {
            var word = words[i]
            var width = this.ctx.measureText(currentLine + " " + word).width
            if (width < maxWidth) {
                currentLine += " " + word
            } else {
                lines.push(currentLine)
                currentLine = word
            }
        }
        lines.push(currentLine)
        return lines
    }

    renderText(text, maxwidth, lineheight, x, y){
        let lines = this.getLines(text, maxwidth)
        for(let i in lines){
            this.ctx.fillText(lines[i], x, y + i * lineheight)
        }
    }
}