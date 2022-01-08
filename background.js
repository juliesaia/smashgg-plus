// console.log = function() {}

// background.js

// check every web request from smash.gg, if it includes entrantcheckinseed
// then entrantid is present
// afterward send message to content script

chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        console.log(details);
        if (details.method == "POST")
            // Use this to decode the body of your post
            var postedString = decodeURIComponent(String.fromCharCode.apply(null,
                new Uint8Array(details.requestBody.raw[0].bytes)));
        if (postedString && postedString.includes("EntrantCheckInSeed")) {
            var passportObj = JSON.parse(postedString)
            console.log(passportObj)
            console.log(`Entrant Id: ${passportObj[0].variables.entrantId}`);
            // chrome.tabs.get(details.tabId, (tab) => {
                // if (tab.url.endsWith("/overview")){

                if (passportObj.length == 1){ // this cant be right
                    console.log("Correct Entrant ID, sending message!");
                    chrome.tabs.sendMessage(
                        details.tabId,
                        passportObj[0].variables.entrantId,
                    )
                }
            // })
        }

    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
);

// scuffed workaround to https://crbug.com/1024211

let lifeline;

keepAlive();

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
    lifeline = port;
    setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
    port.onDisconnect.addListener(keepAliveForced);
  }
});

function keepAliveForced() {
  lifeline?.disconnect();
  lifeline = null;
  keepAlive();
}

async function keepAlive() {
  if (lifeline) return;
  for (const tab of await chrome.tabs.query({ url: 'https://smash.gg/*' })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => chrome.runtime.connect({ name: 'keepAlive' }),
        // `function` will become `func` in Chrome 93+
      });
      chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(tabId, info, tab) {
  if (info.url && /^(file|https?):/.test(info.url)) {
    keepAlive();
  }
}