const Octokit = require("@octokit/rest")

const octokit = Octokit({
    auth: process.env.RECHESS_GITHUB_API_TOKEN,
    userAgent: "React Chess"
})

const { Gitlab } = require('gitlab')

const api = new Gitlab({
    token: process.env.RECHESS_GITLAB_API_TOKEN
})

const ALLOWED_ACTIONS = [ "createrepo", "deleterepo"]

function createrepo(name){
    api.Projects.create({
        name: name,
        description: "React Chess",
        visibility: "public"
    }).then(
        projects => console.log("gitlab", projects),
        err => console.log("gitlab", err)
    )

    octokit.repos.createForAuthenticatedUser({
        name: name,
        description: "React Chess"
    }).then(
        projects => console.log("github", projects),
        err => console.log("github", err)
    )      
}

function deleterepo(name){
    api.Projects.remove("pgneditor/" + name).then(
        projects => console.log("gitlab", projects),
        err => console.log("gitlab", err)
    )

    octokit.repos.delete({
        owner: "pgneditor",
        repo: name
    }).then(
        projects => console.log("github", projects),
        err => console.log("github", err)
    )      
}

let action = process.argv[2]

if(!ALLOWED_ACTIONS.includes(action)){
    console.log("Action not allowed. Allowed actions : ", ALLOWED_ACTIONS)
    process.exit()
}

function getname(){
    let name = process.argv[3]
    if(!name){
        console.log("Name required.")
        process.exit()
    }
    return name
}

if(action == "createrepo"){
    createrepo(getname())
}

if(action == "deleterepo"){
    deleterepo(getname())
}
