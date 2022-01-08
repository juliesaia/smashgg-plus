
console.log("Smash.gg Plus Active!");
// console.log = function() {}

let sleep = ms => new Promise(r => setTimeout(r, ms));
let waitFor = async function waitFor(f){
    var current_pathname = location.pathname
    while(!f()){
        await sleep(50);
        if (location.pathname != current_pathname){
            throw new Error("URL changed, reject promise")
        }
    }
    return f();
};

// insert css as link tag at the bottom of html doc
function insertCSS(file) {
    // removeCSS(file)
    if(document.querySelectorAll("#dark-mode").length == 0){
        const style = document.createElement('link')
        style.rel = 'stylesheet'
        style.type = 'text/css'
        style.href = chrome.runtime.getURL('style.css')
        style.id = file
        document.getElementsByTagName('html')[0].appendChild(style)
    }
}

// keep removing inserted css link elements until none are left
// (while loop just in case there was a bug that made >2 elements)
function removeCSS(file) {
    var cssNode = document.getElementById(file)
    while (cssNode) {
        cssNode.parentNode.removeChild(cssNode)
        cssNode = document.getElementById(file)
    }
}

// check darkmode setting and create appropriate button
// darkmode on: sun
// darkmode off: moon
function makeDarkModeButton(result) {
    chrome.storage.sync.get(["darkMode"], (result) => {

        if (result.darkMode) {
            insertCSS("dark-mode")
        }

        var container_el = document.querySelectorAll(".sgg118ne.sgg1CIc0.sgg1f4az")[3]
        var button_el = document.querySelectorAll(".sgg118ne.sgg1CIc0.sgg1f4az")[3].children[1]
        var button_clone = button_el.cloneNode(true)

        button_clone.id = "dark-mode-button"

        button_clone.lastChild.lastChild.lastChild.classList.remove("flag-icon")
        button_clone.lastChild.lastChild.lastChild.classList.remove("flag-icon-us")
        button_clone.lastChild.lastChild.lastChild.classList.add("fa")
        button_clone.lastChild.lastChild.lastChild.classList.add("fa-fw")
        if (result.darkMode) {
            button_clone.lastChild.lastChild.lastChild.classList.add("fa-sun-o")
        }
        else {
            button_clone.lastChild.lastChild.lastChild.classList.add("fa-moon-o")
        }

        // on click, if the button is sun disable dark mode and change to moon
        // if button is moon enable dark mode and change to sun
        button_clone.addEventListener("click", (event) => {
            if (event.target.classList.toString().includes("sun")) { // this is so stupid
                // turn off dark mode
                chrome.storage.sync.set({ "darkMode": false }, () => {
                    removeCSS("dark-mode")
                    event.target.classList.remove("fa-sun-o")
                    event.target.classList.add("fa-moon-o")
                })
            }
            else {
                // turn on dark mode
                chrome.storage.sync.set({ "darkMode": true }, () => {
                    insertCSS("dark-mode")
                    event.target.classList.remove("fa-moon-o")
                    event.target.classList.add("fa-sun-o")
                })
            }
        })

        container_el.appendChild(button_clone)

    })
}



entrant_id = 0;

nametoseed = {}

seed_valid = false

set_valid = false

page_ready = false

a_tags = []

chrome.runtime.onMessage.addListener(
    (message) => {
        entrant_id = message
    }
)


// check if darkmode before page loads, skip waiting for onload if true
chrome.storage.sync.get(["darkMode"], (result) => {
    if (result.darkMode) {
        insertCSS("dark-mode")
    }
})

window.addEventListener("load", (event) => {
    check_buttons()
})

// keep checking for url change, run func if the end matches url_end
function check_url(time, func, url_end, second_to_last) {

    // problem: the first time check_url runs needs to be a special case
    // if the first site the user visits satisfies url_end then old_url hasnt been set yet
    // solution: have a .didrun property on the function itself to check that

    // new problem: check_url gets called multiple times and all the calls share the same .didrun
    // solution: make .didrun an object and differentiate the calls with keys of url_end in that object

    // i am a genius

    if (!check_url.didrun) check_url.didrun = {}

    var old_url = location.pathname
    var new_url
    setTimeout(() => {
        new_url = location.pathname

        if (!check_url.didrun[url_end] || new_url != old_url) {
            // console.log(new_url);
            // console.log(url_end);
            if (second_to_last){
                if(location.pathname.split("/")[5] == url_end){
                    console.log("router change!");
                    func()
                }
            }
            else{
                if (new_url.endsWith(url_end)) {
                    console.log("router change!");
                    func()
                }
            }
            check_url.didrun[url_end] = true
            
        }


        check_url(time, func, url_end, second_to_last)

    }, time)
}

function check_slug(time){
    var old_slug = location.href.split("/")[4]
    var old_event = location.href.split("/")[6]
    var new_slug
    var new_event

    setTimeout(() => {
        new_slug = location.href.split("/")[4]
        new_event = location.href.split("/")[6]
        regex = new RegExp("https://smash.gg/tournament/.*?/event/.*?")
        if (regex.test(location.href)) {
            if (!check_slug.didrun || new_slug != old_slug || new_event != old_event){
                entrant_id = 0
                // console.log(location.pathname);
                if (location.pathname.split("/").length == 5){
                    // /overview not in url yet
                    getSeeds(location.pathname.split("/").slice(1,5).join("/"))
                }
                else{
                    getSeeds(location.pathname.split("/").slice(1,5).join("/"))
                }
                check_slug.didrun = true
            }
        }

        check_slug(time)
    }, time);
}

// TODO:
// get entrant number somehow
// convert to number of 500 entrant long pages
// await that many fetches in parallel
// that way you dont have to do it sequentially until it returns an empty array, parallel would be way faster

// done! :)

async function getSeeds(slug) {
    seed_valid = false
    console.log(slug);
    var data
    nametoseed = {}

    var params = {
        operationName: "EventEntrantNum",
        query: `
        query EventEntrantNum($slug: String!) {
            event(slug: $slug){
                numEntrants
            }
        }`,
        variables: JSON.stringify({
            slug: slug
        })
    }

    var url = new URL('https://smash.gg/api/-/gql')

    url.search = new URLSearchParams(params).toString()

    console.log("calling api for attendee number...");

    var response = await fetch(url)
    var json = await response.json()

    var attendeeCount = json.data.event.numEntrants

    // console.log("waiting for attendee number to appear...");

    // await waitFor(() => {
    //     // var attendees = document.querySelectorAll(".gg-color-slate")
    //     // return attendees.length == 1
    //     var attendees = document.querySelectorAll(".sgg118ne.sgg1CIc0.sgg1f4az")
        
    //     for (var el of attendees){
    //         if (el.innerText.includes("ENTRANTS")) return true
    //     }
    //     return false
    // })

    console.log("got attendee number!");

    // var attendees = document.querySelectorAll(".sgg118ne.sgg1CIc0.sgg1f4az")
    // var index
    // for (var [i, el] of attendees.entries()){
    //     if (el.innerText.includes("ENTRANTS")){
    //         index = i
    //         break
    //     }
    // }

    // var count = parseInt(document.querySelectorAll(".gg-color-slate")[0].innerText.split(" ")[5].replace(",",""))
    // var count = parseInt(document.querySelectorAll(".sgg118ne.sgg1CIc0.sgg1f4az")[index].firstElementChild.innerText.replace(",",""))

    attendeeCount = Math.floor(attendeeCount/500)+1

    var api_calls = []

    var nodes = []

    for (var i = 0; i < attendeeCount; i++){
        var params = {
            operationName: "Seeds",
            query: `
            query Seeds($slug: String!) {
                event(slug: $slug){
                    entrants(query:{
                        page: ${i}
                        perPage: 500
                    }){
                    nodes{
                        name
                        initialSeedNum
                    }
                    }
                }
            }`,
            variables: JSON.stringify({
                slug: slug
            })
        }

        var url = new URL('https://smash.gg/api/-/gql')

        url.search = new URLSearchParams(params).toString()

        var to_push = fetch(url)
        to_push.then(() => {console.log("Page done!");})

        api_calls.push(to_push)
    }
    
    console.log("calling api for seeds...");

    var responses = await Promise.all(api_calls)

    var jsons = await Promise.all(responses.map((response) => response.json()))

    for (var json of jsons){
        nodes = nodes.concat(json.data.event.entrants.nodes)
    }
        
    console.log(`seed queries done!`);

    for (var node of nodes) {
        
        // nametoseed[slot.entrant.name.replace(" | ", "")] = slot.entrant.initialSeedNum
        if (node.name.includes("| ")) {
            // has sponsor tag
            // why cant the sponsor be a separate property smashgg why do you make me do this
            nametoseed[node.name.split("| ")[node.name.split("| ").length-1]] = node.initialSeedNum
        }
        else {
            // no sponsor tag
            nametoseed[node.name] = node.initialSeedNum
        }
        // man this sucks i wish i could work with ids instead of whatever the user sees
    }
    // console.log(nametoseed); 

    console.log("done getting seeds!");
    seed_valid = true
}

// keep checking if button got deleted
function check_buttons() {
    if (document.querySelector("#dark-mode-button") == null && !location.pathname.endsWith("/register")){
        makeDarkModeButton();
    }
    setTimeout(() => {
        check_buttons()
    }, 50);
}


// IMPORTANT check_slug needs to be first otherwise overviewfunc happens before entrant_id is reset
check_slug(50)

// keep checking url until overview is visited
check_url(50, overviewFunc, "/overview")
// check_url(50, overviewFunc, "/matches")
// todo?

check_url(50, standingsFunc, "/standings")
check_url(50, setFunc, "set", true)

// 1. wait until entrant id was set by message sent from background.js
// 2. request entrant sets from /api/-/gql using entrant id and event slug
// 3. set response global and when page loads call add buttons

async function overviewFunc() {
    // console.log("Checking if entrant ID is set...");
    // if (entrant_id == 0) {
    //     // console.log("entrant ID not set yet");
    //     setTimeout(overviewFunc, 50)
    //     return
    // }

    set_valid = false

    addSeeds()

    var current_pathname = location.pathname

    console.log("waiting for entrant id...");

    await waitFor(() => entrant_id != 0)

    if (location.pathname != current_pathname){
        // stale, this happens when the user first loads a tournament that
        // they didnt enter, and then switches pages to one they did
        // the original wait will then complete and the view in bracket button duplicates
        return
    }

    console.log(`Entrant ID Set! ${entrant_id}`);
    response_global = {}

    var params = {
        operationName: "EventSets",
        query: `
        query EventSets($slug: String!, $entrant: [ID]!) {
            event(slug: $slug){
                id
                sets(filters: {
                entrantIds: $entrant
                }) {
                nodes{
                    slots(includeByes: false){
                    entrant {
                        name
                        initialSeedNum
                    }
                    }
                    phaseGroup {
                    id
                    phase {
                        id
                    }
                    }
                }
                }
            }
        }`,
        variables: JSON.stringify({
            slug: location.pathname.substring(1, location.pathname.lastIndexOf("/")),
            entrant: [entrant_id],
        })
    }

    var url = new URL('https://smash.gg/api/-/gql')

    url.search = new URLSearchParams(params).toString()

    // console.log(`URL: ${url}`);

    console.log("calling api for sets...");

    response = await fetch(url)
    data = await response.json()
    console.log("set query response!");
    console.log(data);
    response_global = data.data
    set_valid = true
    

// TODO:
// current system checks if the query returns no sets to determine if the user
// entered the tournament
// but this doesnt work if they were manually added (px finals)


    // console.log("Waiting for document to load...");
    // await waitFor(() => document.body.innerText.includes("View all standings"))
    // console.log(`Your Schedule: ${document.body.innerText.includes("Your Schedule")}`);

    if (document.readyState == "complete") {
        if (response_global.event.sets.nodes.length != 0){
            addButtons()
        }
        else{
            // if not entered in tournament skip
            addSeeds()
        }
    }
    else {
        if (response_global.event.sets.nodes.length != 0){
            window.addEventListener("load", addButtons);
        }
        else{
            window.addEventListener("load", addSeeds);
        }
    }


    // after page is loaded check if the view match buttons have loaded every 50 ms
    // then copy existing button with new url href from response global
    // it is currently 6:21 AM i have no clue how this ended up being functional
    
    async function addButtons() {
        page_ready = false
        console.log("waiting for page to be ready...");

        await waitFor(() => {
            a_tags = []
            for (const span of document.querySelectorAll("span")) {
                if (span.textContent.includes("View Match")) {
                    a_tags.push(span.parentElement.parentElement)
                }
            }
            // console.log(`a_tags: ${a_tags.length}`);
            // console.log(`nodes: ${response_global.event.sets.nodes.length}`);
            return a_tags.length / 2 == response_global.event.sets.nodes.length
        })

        console.log("page is ready!");
        page_ready = true
        var count = 0
        
        for (var el of response_global.event.sets.nodes) {

            var bracket_url = `${location.href.substring(0, location.href.lastIndexOf("/"))}/brackets/${el.phaseGroup.phase.id}/${el.phaseGroup.id}`



            for (var index of [count, count + 1]) {
                // console.log(`Index: ${index}`);
                var to_push = a_tags[index].cloneNode(true)

                to_push.href = bracket_url

                to_push.lastChild.firstChild.lastChild.textContent = "View In Bracket"

                // console.log(to_push);

                a_tags[index].parentElement.appendChild(to_push)
            }
            count += 2

        }

        // console.log("dict done");
        // console.log(nametoseed);


        // TODO: figure out a way to tell when all the full name elements are loaded
        // 3 * entrant matches + 1 for user + up to 8 for "Displaying 1 - 8" at bottom
        // for melody overview w/o extension: 3*7 + 1 + 8 = 30
        // maybe: a_tags.length * 3 / 2 + 1 + scan for "Displaying 1 - 8"
        
        // done!

        
    }
}

async function addSeeds(){

    await waitFor( () => document.body != null)

    a_tags = []
    for (const span of document.querySelectorAll("span")) {
        if (span.textContent.includes("View Match")) {
            a_tags.push(span.parentElement.parentElement)
        }
    }
    
    console.log("waiting for full name elements to be ready...");

    await waitFor( () => document.querySelectorAll(".gg-color-slate").length >= 1)

    console.log(document.querySelectorAll(".gg-color-slate"));

    var full_name_list = []

    var full_name_wait

    var entrant_promise = waitFor( () => entrant_id != 0)

    var onpageready_promise = waitFor( () => document.body.innerText.includes("Displaying"))

    // console.log("racing...");

    await Promise.race([entrant_promise, onpageready_promise])

    // console.log("race done!");

    if ((entrant_id != 0 || (entrant_id == 0 && !document.body.innerText.includes("Displaying"))) && location.href.endsWith("/overview")){

        console.log("page not ready, entrant id set so user must have entered tournament");

        full_name_wait = waitFor(() => {
            full_name_list = document.querySelectorAll("[class*='nameSection-makeStyles-jss']")
    
            // var top_8 = document.body.innerText.charAt(document.body.innerText.lastIndexOf("Displaying 1 - ") + "Displaying 1 - ".length)
            var top_8 = parseInt(document.querySelectorAll(".gg-color-slate")[0].innerText.split(" ")[3])-parseInt(document.querySelectorAll(".gg-color-slate")[0].innerText.split(" ")[1])+1

            // console.log(a_tags);
            // console.log(full_name_list);
            // console.log(top_8);

            return full_name_list.length == a_tags.length * 3/2 + 1 + top_8
        })
    }
    else{
        console.log("page ready, user must not have entered tournament");
        full_name_wait = waitFor(() => {
            full_name_list = document.querySelectorAll("[class*='nameSection-makeStyles-jss']")

            // var top_8 = document.body.innerText.charAt(document.body.innerText.lastIndexOf("Displaying 1 - ") + "Displaying 1 - ".length)
            var top_8 = parseInt(document.querySelectorAll(".gg-color-slate")[0].innerText.split(" ")[3])-parseInt(document.querySelectorAll(".gg-color-slate")[0].innerText.split(" ")[1])+1

            // console.log(a_tags);
            // console.log(full_name_list);
            // console.log(top_8);

            return full_name_list.length == a_tags.length * 3/2 + top_8
        })
        
    }

    seed_wait = waitFor(() => seed_valid == true)

    await Promise.all([full_name_wait, seed_wait])

    console.log("ready to inject seeds!");
    // console.log(full_name_list);
    
    var clones = []

    for (var name_el of full_name_list) {
        var clone = name_el.cloneNode(true)

        var element_text

        if (name_el.parentElement.parentElement.parentElement.children[0].children[0].children[0].childElementCount == 1) {
            // no sponsor tag
            element_text = name_el.parentElement.parentElement.parentElement.children[0].children[0].children[0].children[0].innerText
        }
        else {
            // sponsor tag
            element_text = name_el.parentElement.parentElement.parentElement.children[0].children[0].children[0].children[1].innerText
        }

        var seed = nametoseed[element_text]

        clone.innerText = `Seed: ${seed}`

        clones.push(clone)
    }

    for (var [i, name_el] of full_name_list.entries()){
        name_el.parentElement.parentElement.appendChild(clones[i])
    }

    var amount_with_seed_els = document.querySelectorAll("[class*='nameSection-makeStyles-jss']").length
    console.log(amount_with_seed_els);
    var current_pathname = location.pathname
    var current_search = location.current_search

    // smashgg deletes the seeds for some reason sadge
    function resetSeeds(){

        if (location.pathname == current_pathname){

            full_name_list = document.querySelectorAll("[class*='nameSection-makeStyles-jss']")

            if (location.search != current_search){
                clones = []

                for (var name_el of full_name_list) {
                    var clone = name_el.cloneNode(true)
            
                    var element_text
            
                    if (name_el.parentElement.parentElement.parentElement.children[0].children[0].children[0].childElementCount == 1) {
                        // no sponsor tag
                        element_text = name_el.parentElement.parentElement.parentElement.children[0].children[0].children[0].children[0].innerText
                    }
                    else {
                        // sponsor tag
                        element_text = name_el.parentElement.parentElement.parentElement.children[0].children[0].children[0].children[1].innerText
                    }
            
                    var seed = nametoseed[element_text]
            
                    clone.innerText = `Seed: ${seed}`
            
                    clones.push(clone)
                }
            }

            if (full_name_list.length != amount_with_seed_els){

                for (var [i, name_el] of full_name_list.entries()){
                    name_el.parentElement.parentElement.appendChild(clones[i])
                }
            }
            setTimeout(() => {
                resetSeeds()
            }, 50);
            current_pathname = location.pathname
        }
    }
    if (!location.pathname.endsWith("/overview"))
    resetSeeds()
    // await waitFor( () => amount_with_seed_els != document.querySelectorAll("[class*='nameSection-makeStyles-jss']").length )
    

    
}

async function standingsFunc(){
    addSeeds()
}



async function setFunc(){
    await waitFor( () => document.body != null)
    
    console.log("waiting for set count elements to be ready...");

    var game_count_wait = waitFor( () => document.querySelectorAll(".EntrantScore__record").length == 2)

    var seed_wait = waitFor(() => seed_valid == true)

    await Promise.all([game_count_wait, seed_wait])

    var player1 = document.querySelectorAll(".Player__gamertag")[0]
    var player2 = document.querySelectorAll(".Player__gamertag")[1]

    var player1score = player1.parentElement.parentElement.parentElement.lastChild
    var player2score = player2.parentElement.parentElement.parentElement.lastChild

    var player1scoreclone = player1score.cloneNode(true)
    var player2scoreclone = player2score.cloneNode(true)

    player1scoreclone.innerHTML = `&nbsp;Seed: ${nametoseed[player1.innerText]}`
    player2scoreclone.innerHTML = `&nbsp;Seed: ${nametoseed[player2.innerText]}`

    if (player1.innerText != "bye"){
        player1score.insertAdjacentElement("beforebegin", player1scoreclone)
    }
    if (player2.innerText != "bye"){
        player2score.insertAdjacentElement("beforebegin", player2scoreclone)
    }

}