const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

const rooms = {}; // roomCode => { players: {id: {username, collection, money}} }

wss.on('connection', ws => {
  ws.id = Math.random().toString(36).substr(2,9);
  ws.room = null;

  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch(e){ return; }

    if(data.type === 'joinRoom'){
      const code = data.roomCode;
      ws.room = code;
      if(!rooms[code]) rooms[code] = { players:{} };
      rooms[code].players[ws.id] = { username: data.username, collection: Array(8).fill(null), money: 30 };
      broadcastRoom(code);
    }

    if(data.type === 'update'){
      const room = rooms[ws.room];
      if(!room) return;
      if(data.collection) room.players[ws.id].collection = data.collection;
      if(data.money !== undefined) room.players[ws.id].money = data.money;
      broadcastRoom(ws.room);
    }

    if(data.type==='buy' || data.type==='sell' || data.type==='stealAttempt' || data.type==='stealSuccess'){
      broadcastRoom(ws.room, data);
    }
  });

  ws.on('close', () => {
    if(ws.room && rooms[ws.room]){
      delete rooms[ws.room].players[ws.id];
      if(Object.keys(rooms[ws.room].players).length === 0) delete rooms[ws.room];
      else broadcastRoom(ws.room);
    }
  });
});

function broadcastRoom(code, extra=null){
    const room = rooms[code];
    if(!room) return;
    const payload = { type:'roomUpdate', players: room.players };
    if(extra) Object.assign(payload, extra);
    Object.values(wss.clients).forEach(client=>{
        if(client.readyState === WebSocket.OPEN && client.room===code){
            client.send(JSON.stringify({...payload, you: client.id}));
        }
    });
}
