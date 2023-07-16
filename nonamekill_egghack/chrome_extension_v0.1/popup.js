// Note 1: Popup cannot access web content, so have to trigger content scripts by chrome.scripting.executeScript()
// Note 2: This script will run again whenever the extension icon is clicked

// initialize
(async () => {
    let storageList = await chrome.storage.sync.get(["MainSwitch"]);
    let mainSwitch = storageList["MainSwitch"];
    document.getElementById("egghackOnBtn").className = (mainSwitch=="ON") ? "active" : "inactive";
    document.getElementById("egghackOffBtn").className = (mainSwitch=="OFF") ? "active" : "inactive";
})();


async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

document.getElementById('egghackOnBtn').addEventListener('click', async ()=>{
    let tab = await getCurrentTab();
    await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['egghack_start.js'],
        world: "MAIN"
    });
    document.getElementById("egghackOnBtn").className = "active";
    document.getElementById("egghackOffBtn").className = "inactive";
    await chrome.storage.sync.set({ "MainSwitch": "ON" });
});

document.getElementById('egghackOffBtn').addEventListener('click', async ()=>{
    let tab = await getCurrentTab();
    await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['egghack_stop.js'],
        world: "MAIN"
    });
    document.getElementById("egghackOnBtn").className = "inactive";
    document.getElementById("egghackOffBtn").className = "active";
    await chrome.storage.sync.set({ "MainSwitch": "OFF" });
});

// https://developer.chrome.com/docs/extensions/mv3/user_interface/
// https://developer.chrome.com/docs/extensions/reference/action/
// https://developer.chrome.com/docs/extensions/reference/tabs/#get-the-current-tab
