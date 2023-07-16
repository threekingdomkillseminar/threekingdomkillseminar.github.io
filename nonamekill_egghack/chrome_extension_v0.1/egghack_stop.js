if (window.EH_on){
    WebSocket.prototype.send = EH_originalSendFunction;
    console.log("[Egghack Stopped]");
}