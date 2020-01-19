const DATABASE_NAME = "rechessdb"
const DATABASE_VERSION = 3

var db = null

function initdb(callback){
    let req = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    req.onerror = (event) => {
        console.log(event)

        callback(false, event)
    }

    req.onsuccess = (event) => {    
        db = event.target.result

        //console.log("opened", DATABASE_NAME, "version", DATABASE_VERSION)

        callback(true, event)
    }

    req.onupgradeneeded = (event) => {
        console.log("upgrading", DATABASE_NAME, "version", DATABASE_VERSION)
        let db = event.target.result

        try{
            db.createObjectStore("engine", { keyPath: "analysiskey" })
            db.createObjectStore("study", { keyPath: "title" })
        }catch(err){
            console.log("warning: creating db version 1 failed")
        }

        try{
            db.createObjectStore("image", { keyPath: "name" })
        }catch(err){
            console.log("warning: creating db version 2 failed")
        }
    }
}

function dbget(store, key, callback){
    let transaction = db.transaction([store])
    let objectStore = transaction.objectStore(store)
    let request = objectStore.get(key)

    request.onerror = function(event) {

        callback(false, event)

    }

    request.onsuccess = function(event) {

        callback(true, request.result)

    }
}

function dbput(store, obj, callback){
    let objectStore = db.transaction([store], "readwrite").objectStore(store)
    let requestUpdate = objectStore.put(obj)

    requestUpdate.onerror = function(event) {

        callback(false, event)

    }

    requestUpdate.onsuccess = function(event) {

        callback(true, event)

    }
}

function dbdelete(store, key, callback){
    let objectStore = db.transaction([store], "readwrite").objectStore(store)
    let requestUpdate = objectStore.delete(key)

    requestUpdate.onerror = function(event) {

        callback(false, event)

    }

    requestUpdate.onsuccess = function(event) {

        callback(true, event)

    }
}

function dbgetall(storekeylist, cumul, callback){
    if(storekeylist.length == 0){
        callback(true, cumul)
        return
    }

    let storekey = storekeylist.pop()
    let store = storekey[0]
    let key = storekey[1]    

    let objectStore = db.transaction(store).objectStore(store)

    let getall = objectStore.getAll()

    getall.onsuccess = function(event) {        
        let list = event.target.result
        let obj = {}
        for(let elem of list){
            obj[elem[key]] = elem
        }
        cumul[store] = obj
        dbgetall(storekeylist, cumul, callback)
    }

    getall.onerror = function(event) {        
        callback(false, event)
    }
}
