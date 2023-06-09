// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
// clientPlayer <=> middleserver <=> [clientServer]


const middleServerList = [
    "wss://tkks-mid1.threekingdomkil.repl.co/",
    "wss://tkks-mid2.threekingdomkil.repl.co/",
    "wss://tkks-mid3.threekingdomkil.repl.co/",
    "wss://tkks-mid4.threekingdomkil.repl.co/",
    "wss://tkks-mid5.threekingdomkil.repl.co/"
];

var bannedKeys=[];
//var bannedIps=[];

var rooms=[];
var events=[];
var clients={};
var bannedKeyWords=[];
var messages={
    create:function(key,nickname,avatar,config,mode){
        if(this.onlineKey!=key) return;
        this.nickname=util.getNickname(nickname);
        this.avatar=avatar;
        var room={};
        rooms.push(room);
        this.room=room;
        delete this.status;
        room.owner=this;
        room.key=key;
        this.sendl('createroom',key);
    },
    enter:function(key,nickname,avatar){
        this.nickname=util.getNickname(nickname);
        this.avatar=avatar;
        var room=false;
        for(var i of rooms){
            if(i.key==key){
                room=i;
                break;
            }
        }
        if(!room){
            this.sendl('enterroomfailed');
            return;
        }
        this.room=room;
        delete this.status;
        if(room.owner){
            if(room.servermode&&!room.owner._onconfig&&config&&mode){
                room.owner.sendl('createroom',index,config,mode);
                room.owner._onconfig=this;
                room.owner.nickname=util.getNickname(nickname);
                room.owner.avatar=avatar;
            }
            else if(!room.config||(room.config.gameStarted&&(!room.config.observe||!room.config.observeReady))){
                this.sendl('enterroomfailed');
            }
            else{
                this.owner=room.owner;
                this.owner.sendl('onconnection',this.wsid);
            }
            util.updaterooms();
        }
    },
    changeAvatar:function(nickname,avatar){
        this.nickname=util.getNickname(nickname);
        this.avatar=avatar;
        util.updateclients();
    },
    server:function(cfg){
        if(cfg){
            this.servermode=true;
            var room=rooms[cfg[0]];
            if(!room||room.owner){
                this.sendl('reloadroom',true);
            }
            else{
                room.owner=this;
                this.room=room;
                this.nickname=util.getNickname(cfg[1]);
                this.avatar=cfg[2];
                this.sendl('createroom',cfg[0],{},'auto')
            }
        }
        else{
            for(var i=0;i<rooms.length;i++){
                if(!rooms[i].owner){
                    rooms[i].owner=this;
                    rooms[i].servermode=true;
                    this.room=rooms[i];
                    this.servermode=true;
                    break;
                }
            }
            util.updaterooms();
        }
    },
    key:function(id){
        if(!id||typeof id!='object'){
            this.sendl('denied','key');
            this.closePlayer();
            clearTimeout(this.keyCheck);
            delete this.keyCheck;
            return;
        }
        else if(bannedKeys.indexOf(id[0])!=-1){
            bannedIps.push(this._socket.remoteAddress);
            this.closePlayer();
        }
        this.onlineKey=id[0];
        clearTimeout(this.keyCheck);
        delete this.keyCheck;
    },
    events:function(cfg,id,type){
        if(bannedKeys.indexOf(id)!=-1||typeof id!='string'||this.onlineKey!=id){
            bannedIps.push(this._socket.remoteAddress);
            console.log(id, this._socket.remoteAddress);
            this.closePlayer();
            return;
        }
        var changed=false;
        var time=(new Date()).getTime();
        if(cfg&&id){
            if(typeof cfg=='string'){
                for(var i=0;i<events.length;i++){
                    if(events[i].id==cfg){
                        if(type=='join'){
                            if(events[i].members.indexOf(id)==-1){
                                events[i].members.push(id);
                            }
                            changed=true;
                        }
                        else if(type=='leave'){
                            var index=events[i].members.indexOf(id);
                            if(index!=-1){
                                events[i].members.splice(index,1);
                                if(events[i].members.length==0){
                                    events.splice(i--,1);
                                }
                            }
                            changed=true;
                        }
                    }
                }
            }
            else if(cfg.hasOwnProperty('utc')&&
                    cfg.hasOwnProperty('day')&&
                    cfg.hasOwnProperty('hour')&&
                    cfg.hasOwnProperty('content')){
                if(events.length>=20){
                    this.sendl('eventsdenied','total');
                }
                else if(cfg.utc<=time){
                    this.sendl('eventsdenied','time');
                }
                else if(util.isBanned(cfg.content)){
                    this.sendl('eventsdenied','ban');
                }
                else{
                    cfg.nickname=util.getNickname(nickname);
                    cfg.avatar=cfg.nickname||'caocao';
                    cfg.creator=id;
                    cfg.id=util.getid();
                    cfg.members=[id];
                    events.unshift(cfg);
                    changed=true;
                }
            }
        }
        if(changed){
            util.updateevents();
        }
    },
    config:function(config){
        var room=this.room;
        if(room&&room.owner==this){
            if(room.servermode){
                room.servermode=false;
                if(this._onconfig){
                    if(clients[this._onconfig.wsid]){
                        this._onconfig.owner=this;
                        this.sendl('onconnection',this._onconfig.wsid);
                    }
                    delete this._onconfig;
                }
            }
            room.config=config;
        }
        util.updaterooms();
    },
    status:function(str){
        if(typeof str=='string'){
            this.status=str;
        }
        else{
            delete this.status;
        }
        util.updateclients();
    },
    send:function(id,message){
        if(clients[id]&&clients[id].owner==this){
            try{
                clients[id].send(message);
            }
            catch(e){
                clients[id].closePlayer();
            }
        }
    },
    close:function(id){
        if(clients[id]&&clients[id].owner==this){
            clients[id].closePlayer();
        }
    },
};
var util={
    getNickname:function(str){
        return typeof str=='string'?(str.slice(0,12)):'无名玩家';
    },
    isBanned:function(str){
        for(var i of bannedKeyWords){
            if(str.indexOf(i)!=-1) return true;
        }
        return false;
    },
    sendl:function(){
        var args=[];
        for(var i=0;i<arguments.length;i++){
            args.push(arguments[i]);
        }
        try{
            this.send(JSON.stringify(args));
        }
        catch(e){
            this.closePlayer();
        }
    },
    getid:function(){
        return (Math.floor(1000000000+9000000000*Math.random())).toString();
    },
    getroomlist:function(){
        var roomlist=[];
        for(var i=0;i<rooms.length;i++){
            rooms[i]._num=0;
        }
        for(var i in clients){
            if(clients[i].room&&!clients[i].servermode){
                clients[i].room._num++;
            }
        }
        for(var i=0;i<rooms.length;i++){
            if(rooms[i].servermode){
                roomlist[i]='server';
            }
            else if(rooms[i].owner&&rooms[i].config){
                if(rooms[i]._num==0){
                    rooms[i].owner.sendl('reloadroom');
                }
                roomlist.push([rooms[i].owner.nickname,rooms[i].owner.avatar,
                rooms[i].config,rooms[i]._num,rooms[i].key]);
            }
            delete rooms[i]._num;
        }
        return roomlist;
    },
    getclientlist:function(){
        var clientlist=[];
        for(var i in clients){
            clientlist.push([clients[i].nickname,clients[i].avatar,!clients[i].room,clients[i].status,clients[i].wsid,clients[i].onlineKey]);
        }
        return clientlist;
    },
    updaterooms:function(){
        var roomlist=util.getroomlist();
        var clientlist=util.getclientlist();
        for(var i in clients){
            if(!clients[i].room){
                clients[i].sendl('updaterooms',roomlist,clientlist);
            }
        }
    },
    updateclients:function(){
        var clientlist=util.getclientlist();
        for(var i in clients){
            if(!clients[i].room){
                clients[i].sendl('updateclients',clientlist);
            }
        }
    },
    checkevents:function(){
        if(events.length){
            var time=(new Date()).getTime();
            for(var i=0;i<events.length;i++){
                if(events[i].utc<=time){
                    events.splice(i--,1);
                }
            }
        }
        return events;
    },
    updateevents:function(){
        util.checkevents();
        for(var i in clients){
            if(!clients[i].room){
                clients[i].sendl('updateevents',events);
            }
        }
    }
};
function createWSStoMiddleServer(url){
    const wss = new WebSocket(url);
    wss.addEventListener('open',function(event){
        changeStatus(url, "waiting for player");
        var clientplayerConnected = false;
        wss.send("I_am_clientserver");
        wss.addEventListener('message', (event)=>{
            let message = event.data;
            if (clientplayerConnected){  // player already connected
                if (message=="ms_playerClosed"){  // clientPlayer disconnected but middleServer still connected
                    clientplayerConnected = false;
                    clearInterval(wss.heartbeat);
                    for(var i=0;i<rooms.length;i++){
                        if(rooms[i].owner==this){
                            for(var j in clients){
                                if(clients[j].room==rooms[i]&&clients[j]!=this){
                                    clients[j].sendl('selfclose');
                                    // clients[j].closePlayer();
                                    // delete clients[j];
                                }
                            }
                            rooms.splice(i--,1);
                        }
                    }
                    if(clients[this.wsid]){
                        if(this.owner){
                            this.owner.sendl('onclose',this.wsid);
                        }
                        delete clients[this.wsid];
                    }
                    if(this.room) util.updaterooms();
                    else util.updateclients();
                    // client should want to disconnect with server, so close and reconnect with middleServer
                    wss.close();
                    changeStatus(url, "connecting");
                    createWSStoMiddleServer(url);
                    return;
                }
                if(!clients[this.wsid]) return;
                if(message=='heartbeat'){
                    this.beat=false;
                }
                else if(this.owner){
                    this.owner.sendl('onmessage',this.wsid,message);
                }
                else{
                    var arr;
                    try{
                        arr=JSON.parse(message);
                        if(!Array.isArray(arr)){
                            throw('err');
                        }
                    }
                    catch(e){
                        this.sendl('denied','banned');
                        return;
                    }
                    if(arr.shift()=='server'){
                        var type=arr.shift();
                        if(messages[type]){
                            messages[type].apply(this,arr);
                        }
                    }
                }
            } else {  // middleserver connected but player not connected
                if (message=="ms_playerConnected"){  // player just connected
                    changeStatus(url, "player connected");
                    clientplayerConnected = true;
                    wss.sendl=util.sendl;
                    // if(bannedIps.indexOf(ws._socket.remoteAddress)!=-1){
                    //     ws.sendl('denied','banned');
                    //     setTimeout(function(){
                    //         ws.closePlayer();
                    //     },500);
                    //     return;
                    // }
                    wss.keyCheck=setTimeout(function(){
                        wss.sendl('denied','key');
                        setTimeout(function(){
                            wss.closePlayer();
                        },500);
                    },2000);
                    wss.wsid=util.getid();
                    clients[wss.wsid]=wss;
                    wss.sendl('roomlist',util.getroomlist(),util.checkevents(),util.getclientlist(wss),wss.wsid);
                    wss.heartbeat=setInterval(function(){
                        if(wss.beat){
                            wss.closePlayer();
                            clearInterval(wss.heartbeat);
                        }
                        else{
                            wss.beat=true;
                            try{
                                wss.send('heartbeat');
                            }
                            catch(e){
                                wss.closePlayer();
                            }
                        }
                    },60000);
                }
            }
        })
        wss.closePlayer = () => {  // (Original .close()) When server want to disconnect with player, send to middleserver
            changeStatus(url, "waiting for player");
            wss.send("cs_close");
        }
        wss.addEventListener('close', (event)=>{  // middleServer disconnected
            changeStatus(url, "closed");
        });

    });
    return wss;
    
}

function connectToMiddleServers(){
    middleServerList.map(middleServerURL=>{
        changeStatus(middleServerURL, "connecting");
        createWSStoMiddleServer(middleServerURL);
    });
}

const statusColor = {
    "connecting": "yellow",
    "waiting for player": "lightgreen",
    "player connected": "green",
    "closed": "red"
}
function changeStatus(url, status){
    document.getElementById(url).style.backgroundColor = statusColor[status];
    document.getElementById(url).innerText = status;
}

function initialize(){
    let tbody = document.createElement("tbody");
    for (let middleServerURL of middleServerList){
        let tr = document.createElement("tr");
        let td = document.createElement("td");
        td.innerText = middleServerURL;
        tr.appendChild(td);
        let td2 = document.createElement("td");
        td2.innerText = "-";
        td2.setAttribute("id", middleServerURL);
        td2.setAttribute("style", "background-color: lightgray;");
        tr.appendChild(td2);
        tbody.appendChild(tr);
    }
    document.getElementById("statusTable").lastElementChild.replaceWith(tbody);
}
