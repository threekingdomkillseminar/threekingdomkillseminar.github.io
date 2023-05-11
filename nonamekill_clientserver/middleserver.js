// https://github.com/websockets/ws
// clientPlayer <=> [middleserver] <=> clientServer

function middleserver(port){
	var WebSocketServer=require('ws').Server;
	var wss=new WebSocketServer({port:port});
	var clientPlayer = null;
	var clientServer = null;

	wss.on('connection',function(ws){
		let firstMessaged = false;
		let identity = null;
		// if client don't send message in 2 sec, it should be client player
		// because clent player won't send message until it reveived message 
		let identityCheckTimeout = setTimeout(() => {
			// this is clientPlayer
			if (clientPlayer){  // another clientPlayer already connected
				console.log("another player already connected!");
				ws.close();
			} else if (!clientServer){  // server not connected
				console.log("clientServer not yet connected!");
				ws.close();
			} else {
				firstMessaged = true;
				clientPlayer = ws;
				identity="clientPlayer";
				console.log("player connected");
				clientServer.send("ms_playerConnected");
			}
		}, 2000);
		ws.on('message',(data) => {
			// data is in binary buffer format
			console.log("%s: %s", identity, data)
			if (firstMessaged==false){  // this is (clientServer's) first message
				clearTimeout(identityCheckTimeout);
				firstMessaged = true;
				if (data=="I_am_clientserver"){  // this is client server
					if (clientServer){
						console.log("client server already exist!");
						ws.send("client server already exist!");
						ws.close();
					} else {
						clientServer = ws;
						identity="clientServer";
						console.log("server connected");
					}
				} else {
					console.log("bug: not clientplayer nor clientserver");
				}
			} else {  // this is NOT the first message
				let message = data.toString();
				if (identity=="clientServer"){
					if (message=="cs_close"){
						clientPlayer.close();
						clientPlayer = null;
					} else {
						clientPlayer.send(message);
					}
				} else if (identity=="clientPlayer") {
					clientServer.send(message);
				}
			}
		});
		
		ws.on('close',() => {
			if (identity=="clientPlayer"){
				console.log("clientPlayer disconnected");
				clientPlayer = null;
				if (clientServer){
					clientServer.send("ms_playerClosed");
				}
			} else if (identity=="clientServer") {
				console.log("connection between middleServer and clientServer closed")
				clientServer = null;
				if (clientPlayer) {
					clientPlayer.close();
					clientPlayer = null;
				}
			}
		});
	
	});
}

middleserver(8080);
