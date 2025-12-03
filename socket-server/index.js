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
    path: '/api/socket',
    maxHttpBufferSize: 1e8, // 100 MB
    cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// In-memory storage
const chatRooms = new Map();
const userRooms = new Map();
const socketUsers = new Map();
const lastPartners = new Map(); // Map<userId, string[]>
let waitingQueue = []; // Array of { userId, socketId }

// Helper function to generate IDs
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Broadcast online user count
    const broadcastUserCount = () => {
        const count = io.engine.clientsCount;
        io.emit('online-users', count);
    };

    broadcastUserCount();

    socket.on('join-chat', (userId) => {
        // Store socket-user mapping
        socketUsers.set(socket.id, userId);

        // Check if user is already in a room or queue, remove them if so to prevent duplicates
        if (waitingQueue.some(u => u.userId === userId)) {
            waitingQueue = waitingQueue.filter(u => u.userId !== userId);
        }

        // Cleanup any existing room for this user (if they are somehow still mapped)
        const existingRoomId = userRooms.get(userId);
        if (existingRoomId) {
            handleCleanup(userId);
        }

        // Try to find a partner from the queue
        let partnerSocketId = null;
        let partnerUserId = null;

        // Get recent partners history (default to empty array)
        const recentPartners = lastPartners.get(userId) || [];

        // We need to find a valid partner in the queue
        let partnerIndex = -1;

        // RELAXED MATCHING: If queue is small (e.g. just 1 person waiting), ignore history to ensure they match.
        const ignoreHistory = waitingQueue.length <= 1;

        for (let i = 0; i < waitingQueue.length; i++) {
            const potential = waitingQueue[i];

            // Skip if it's the user themselves
            if (potential.userId === userId) continue;

            // Skip if this person is in the recent partners history (UNLESS we are desperate)
            if (!ignoreHistory && recentPartners.includes(potential.userId)) continue;

            // Check if socket is still active
            const partnerSocket = io.sockets.sockets.get(potential.socketId);
            if (!partnerSocket) {
                // Remove stale user from queue and decrement index to not skip next one
                waitingQueue.splice(i, 1);
                i--;
                continue;
            }

            // Found a valid partner!
            partnerIndex = i;
            partnerSocketId = potential.socketId;
            partnerUserId = potential.userId;
            break;
        }

        if (partnerSocketId && partnerUserId && partnerIndex !== -1) {
            // Remove partner from queue
            waitingQueue.splice(partnerIndex, 1);

            // Match found! Create a room
            const roomId = generateId();

            chatRooms.set(roomId, {
                id: roomId,
                users: [partnerUserId, userId],
                messages: [],
                createdAt: Date.now(),
            });

            userRooms.set(userId, roomId);
            userRooms.set(partnerUserId, roomId);

            // Update history for current user
            let userHistory = lastPartners.get(userId) || [];
            userHistory.unshift(partnerUserId);
            if (userHistory.length > 5) userHistory.pop(); // Keep last 5
            lastPartners.set(userId, userHistory);

            // Update history for partner
            let partnerHistory = lastPartners.get(partnerUserId) || [];
            partnerHistory.unshift(userId);
            if (partnerHistory.length > 5) partnerHistory.pop(); // Keep last 5
            lastPartners.set(partnerUserId, partnerHistory);

            // Join current user
            socket.join(roomId);

            // Join partner user
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            if (partnerSocket) {
                partnerSocket.join(roomId);

                // Notify both
                io.to(roomId).emit('room-joined', { roomId, userCount: 2 });
                io.to(roomId).emit('user-joined', { userCount: 2 });
            } else {
                // Edge case: Partner disconnected right at match time
                // Put current user back in queue
                waitingQueue.unshift({ userId, socketId: socket.id });
                chatRooms.delete(roomId);
                userRooms.delete(userId);
                userRooms.delete(partnerUserId);
            }

        } else {
            // No partner found, add to waiting queue
            waitingQueue.push({ userId, socketId: socket.id });
        }
    });

    socket.on('send-message', (data) => {
        const userId = socketUsers.get(socket.id);
        if (!userId) return;

        const roomId = userRooms.get(userId);
        if (!roomId) return;

        const room = chatRooms.get(roomId);
        if (!room) return;

        const message = {
            id: generateId(),
            content: data.content,
            image: data.image,
            timestamp: Date.now(),
            userId: userId,
            roomId,
        };

        room.messages.push(message);
        io.to(roomId).emit('new-message', message);
    });

    socket.on('typing', (data) => {
        const userId = socketUsers.get(socket.id);
        if (!userId) return;

        const roomId = userRooms.get(userId);
        if (!roomId) return;
        socket.to(roomId).emit('user-typing', data.isTyping);
    });

    const handleCleanup = (userId) => {
        // Remove from queue if present
        waitingQueue = waitingQueue.filter(u => u.userId !== userId);

        const roomId = userRooms.get(userId);
        if (!roomId) return;

        const room = chatRooms.get(roomId);
        if (room) {
            room.users = room.users.filter(id => id !== userId);

            if (room.users.length === 0) {
                chatRooms.delete(roomId);
            } else {
                socket.to(roomId).emit('user-left', { userCount: room.users.length });
                socket.to(roomId).emit('partner-disconnected');
            }
        }

        userRooms.delete(userId);
        socket.leave(roomId);
    };

    socket.on('leave-chat', (userId) => {
        handleCleanup(userId);
        socketUsers.delete(socket.id);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const userId = socketUsers.get(socket.id);
        if (userId) {
            handleCleanup(userId);
            socketUsers.delete(socket.id);
        }
        broadcastUserCount();
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
