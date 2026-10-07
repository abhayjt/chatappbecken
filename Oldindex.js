// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/',(res,rep)=>{


   console.log("Wokin Fine ");
})

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', ({ roomId, userId }) => {
    socket.join(roomId); // Join the specified room
    console.log(`${userId} joined room ${roomId}`);

    // Emit to all clients in the room, including the sender
    io.to(roomId).emit('user-connected', userId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});





