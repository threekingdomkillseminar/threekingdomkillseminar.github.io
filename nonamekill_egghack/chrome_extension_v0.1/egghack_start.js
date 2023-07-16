if (!EH_initialized){  // init
    var EH_originalSendFunction = WebSocket.prototype.send;
    var EH_isRoomOwner = false;
    var EH_roomOwnerId = "";
    var EH_on = false;
    var EH_initialized = true;
}
if (EH_initialized) {  // start
    WebSocket.prototype.send = async function(...args) {
        if (args!="heartbeat"){
            let repeatMessage = false;
            let message = JSON.parse(...args);
            if (message[0]=="throwEmotion"){
                repeatMessage = true;
            } else if (!EH_isRoomOwner && message[3] && message[3]=="[\"gameStart\"]"){
                EH_isRoomOwner = true;
                EH_roomOwnerId = message[2];
            } else if (EH_isRoomOwner && message[3] && message[3].includes("_noname_func:function(player,target,emotion)")){
                if (JSON.parse(message[3])[3].split(':').at(-1) == EH_roomOwnerId){
                    repeatMessage = true;
                }
            }
            // repeat message if it is throw emotion
            if (repeatMessage){
                let throwInterval = setInterval(()=>{
                    EH_originalSendFunction.call(this, ...args)
                }, 500);
                setTimeout(()=>clearInterval(throwInterval), 5000);
                return null;
            }
        }
        return EH_originalSendFunction.call(this, ...args);
    };
    EH_on = true;
    console.log("[Egghack Activated]");
}
