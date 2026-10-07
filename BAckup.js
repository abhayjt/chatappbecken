const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Use CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

// MySQL connection
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

// Routes
app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/messages', (req, res) => {
  const { sender, receiver } = req.query;
  const sql = `
    SELECT id, sender, receiver, message, image, is_read, created_at 
    FROM messages 
    WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
    ORDER BY created_at
  `;
  db.query(sql, [sender, receiver, receiver, sender], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

app.post('/upload', upload.single('image'), (req, res) => {
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', ({ roomId, userId }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', { userId });

    socket.on('offer', (payload) => {
      socket.to(roomId).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
      socket.to(roomId).emit('answer', payload);
    });

    socket.on('ice-candidate', (candidate) => {
      socket.to(roomId).emit('ice-candidate', candidate);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  socket.on('signal', (data) => {
    const { signal, to } = data;
    socket.to(to).emit('signal', { signal, from: socket.id });
  });

  socket.on('typing', ({ sender, receiver }) => {
    socket.broadcast.emit('userTyping', { sender });
  });

  socket.on('sendMessage', ({ sender, receiver, message, image }) => {
    let imageUrl = null;

    if (image && image.startsWith('data:image/')) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const imageName = `${Date.now()}.png`;
      const imagePath = path.join(uploadDir, imageName);
      fs.writeFileSync(imagePath, imageBuffer);
      imageUrl = `/uploads/${imageName}`;
    }

    const sql = `INSERT INTO messages (sender, receiver, message, image) VALUES (?, ?, ?, ?)`;
    db.query(sql, [sender, receiver, message, imageUrl], (err, result) => {
      if (err) throw err;

      const newMessage = {
        id: result.insertId,
        sender,
        receiver,
        message,
        image: imageUrl,
        is_read: 0,
        created_at: new Date()
      };

      io.emit('receiveMessage', newMessage);
    });
  });

  // New feature: mark messages as read
  socket.on('markAsRead', ({ sender, receiver }) => {
    const sql = `UPDATE messages SET is_read = 1 WHERE sender = ? AND receiver = ? AND is_read = 0`;
    db.query(sql, [sender, receiver], (err, result) => {
      if (err) {
        console.error('Failed to update read status:', err);
      } else {
        console.log(`Marked messages as read from ${sender} to ${receiver}`);
        socket.to(receiver).emit('messagesRead', { sender });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});




app.get('/lastseenmessage', (req, res) => {
  const { sender, receiver } = req.query;
  const sql = `
    SELECT id, sender, receiver, message, image, is_read, created_at
    FROM messages
    WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
    ORDER BY created_at DESC
    LIMIT 1
  `;
  db.query(sql, [sender, receiver, receiver, sender], (err, result) => {
    if (err) throw err;
    res.json(result[0] || {});  // Return the first row if present, otherwise return an empty object
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
