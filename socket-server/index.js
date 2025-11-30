// Standalone Socket.IO Server for Production
// Deploy this separately on Railway, Render, or Fly.io

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Set your Vercel URL here
    credentials: true
}));

const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// In-memory storage
const chatRooms = new Map();
const userRooms = new Map();

// Helper function to generate IDs
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Broadcast online user count
    io.emit('online-users', io.engine.clientsCount);

    socket.on('join-chat', (userId) => {
        let roomId = null;

        // Find an available room with only 1 user
        for (const [id, room] of chatRooms.entries()) {
            if (room.users.length === 1) {
                roomId = id;
                break;
            }
        }

        // Create new room if none available
        if (!roomId) {
            roomId = generateId();
            chatRooms.set(roomId, {
                id: roomId,
                users: [],
                messages: [],
                createdAt: Date.now(),
            });
        }

        const room = chatRooms.get(roomId);
        room.users.push(userId);
        userRooms.set(userId, roomId);

        socket.join(roomId);
        socket.emit('room-joined', { roomId, userCount: room.users.length });
        socket.to(roomId).emit('user-joined', { userCount: room.users.length });

        console.log(`User ${userId} joined room ${roomId}`);
    });

    socket.on('send-message', (data) => {
        const roomId = userRooms.get(data.userId);
        if (!roomId) return;

        const room = chatRooms.get(roomId);
        if (!room) return;

        const message = {
            id: generateId(),
            content: data.content,
            image: data.image,
            timestamp: Date.now(),
            userId: data.userId,
            roomId,
        };

        room.messages.push(message);
        io.to(roomId).emit('new-message', message);
    });

    socket.on('typing', (data) => {
        const roomId = userRooms.get(data.userId);
        if (!roomId) return;
        socket.to(roomId).emit('user-typing', data.isTyping);
    });

    socket.on('leave-chat', (userId) => {
        const roomId = userRooms.get(userId);
        if (!roomId) return;

        const room = chatRooms.get(roomId);
        if (room) {
            room.users = room.users.filter(id => id !== userId);

            if (room.users.length === 0) {
                chatRooms.delete(roomId);
            } else {
                socket.to(roomId).emit('user-left', { userCount: room.users.length });
            }
        }

        userRooms.delete(userId);
        socket.leave(roomId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        io.emit('online-users', io.engine.clientsCount);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        onlineUsers: io.engine.clientsCount,
        activeRooms: chatRooms.size
    });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`Socket.IO server running on port ${PORT}`);
});
