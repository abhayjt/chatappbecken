const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const fs = require('fs');
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

const onlineUsers = new Map();

// MySQL Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'SWAPsij@1980',
  database: 'chat_app'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// API to get past messages between two users

app.get('/', (req, res) => {
   console.log("Workin Fine ");
  });
  

app.get('/messages', (req, res) => {
  const { sender, receiver } = req.query;
  const sql = `SELECT * FROM messages WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) ORDER BY created_at`;
  db.query(sql, [sender, receiver, receiver, sender], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  //Add Vide call 

 console.log('New user connected:', socket.id);  
 socket.on('signal', (data) => {     
  console.log('Signal received:', data); 

   const { signal, to } = data;   
    // Forward the signaling message to the intended recipient    
    socket.to(to).emit('signal', { signal: signal, from: socket.id }); }); 
    // Broadcast the signal to the specified user    
  //socket.broadcast.emit('signal', data);   }); 


   
   socket.on('disconnect', () => { console.log('User disconnected Abhay:', socket.id); });

  //End the  video codel 
socket.on('typing', ({ sender, receiver }) => {
    socket.broadcast.emit('userTyping', { sender });
  });

socket.on('typing', ({ receiver , sender}) => {
    socket.broadcast.emit('userTyping', { receiver });
  });



  // Listen for new messages
  socket.on('sendMessage', ({ sender, receiver, message }) => {
    const sql = `INSERT INTO messages (sender, receiver, message) VALUES (?, ?, ?)`;
    db.query(sql, [sender, receiver, message], (err, result) => {
      if (err) throw err;

      // Emit the new message to the receiver
      io.emit('receiveMessage', { id: result.insertId, sender, receiver, message, created_at: new Date() });
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});



//Add The Code  video  confrancing  




//End the code  video confrencing code 

// Start the server
server.listen(3000, () => console.log('Server running on port 3000'));
