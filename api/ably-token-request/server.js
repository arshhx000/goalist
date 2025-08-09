const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from the frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Store connected users and messages
let connectedUsers = [];
let chatMessages = [];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send existing messages to new user
  socket.emit('load_messages', chatMessages);
  
  // Send current user count
  io.emit('user_count', connectedUsers.length + 1);

  // Handle user joining
  socket.on('user_joined', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username || 'Anonymous',
      joinedAt: new Date()
    };
    
    connectedUsers.push(user);
    
    // Notify all users about new user
    const joinMessage = {
      id: Date.now(),
      username: 'System',
      message: `${user.username} joined the chat`,
      timestamp: new Date().toISOString(),
      type: 'system'
    };
    
    chatMessages.push(joinMessage);
    io.emit('new_message', joinMessage);
    io.emit('user_count', connectedUsers.length);
  });

  // Handle new messages
  socket.on('send_message', (messageData) => {
    const message = {
      id: Date.now(),
      username: messageData.username || 'Anonymous',
      message: messageData.message,
      timestamp: new Date().toISOString(),
      type: 'user'
    };

    // Store message
    chatMessages.push(message);
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
      chatMessages = chatMessages.slice(-100);
    }

    // Broadcast to all users
    io.emit('new_message', message);
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.broadcast.emit('user_typing', {
      username: data.username,
      isTyping: data.isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove user from connected users
    const userIndex = connectedUsers.findIndex(user => user.id === socket.id);
    if (userIndex !== -1) {
      const user = connectedUsers[userIndex];
      connectedUsers.splice(userIndex, 1);
      
      // Notify about user leaving
      const leaveMessage = {
        id: Date.now(),
        username: 'System',
        message: `${user.username} left the chat`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      
      chatMessages.push(leaveMessage);
      io.emit('new_message', leaveMessage);
      io.emit('user_count', connectedUsers.length);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Gapkar Chat Server running on http://localhost:${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
});
