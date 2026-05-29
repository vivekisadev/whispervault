import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ChatMessage, ChatRoom } from '@/types';
import { generateId } from './utils';

export type SocketServer = SocketIOServer;

// In-memory storage (replace with Redis in production)
const chatRooms = new Map<string, ChatRoom>();
const userRooms = new Map<string, string>(); // userId -> roomId
const socketUsers = new Map<string, string>(); // socketId -> userId

export const initializeSocket = (server: NetServer): SocketIOServer => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join random chat room
        socket.on('join-chat', (userId: string) => {
            socketUsers.set(socket.id, userId);
            // Find available room or create new one
            let roomId: string | null = null;

            for (const [id, room] of chatRooms.entries()) {
                if (room.users.length === 1) {
                    roomId = id;
                    break;
                }
            }

            if (!roomId) {
                roomId = generateId();
                chatRooms.set(roomId, {
                    id: roomId,
                    users: [],
                    messages: [],
                    createdAt: Date.now(),
                });
            }

            const room = chatRooms.get(roomId)!;
            room.users.push(userId);
            userRooms.set(userId, roomId);

            socket.join(roomId);
            socket.emit('room-joined', { roomId, userCount: room.users.length });

            // Notify other user
            socket.to(roomId).emit('user-joined', { userCount: room.users.length });
        });

        // Send message
        socket.on('send-message', (data: { content: string }) => {
            const userId = socketUsers.get(socket.id);
            if (!userId) return;

            const roomId = userRooms.get(userId);
            if (!roomId) return;

            const room = chatRooms.get(roomId);
            if (!room) return;

            const message: ChatMessage = {
                id: generateId(),
                content: data.content,
                timestamp: Date.now(),
                userId: userId,
                roomId,
            };

            room.messages.push(message);
            io.to(roomId).emit('new-message', message);
        });

        // User is typing
        socket.on('typing', (data: { isTyping: boolean }) => {
            const userId = socketUsers.get(socket.id);
            if (!userId) return;

            const roomId = userRooms.get(userId);
            if (!roomId) return;

            socket.to(roomId).emit('user-typing', data.isTyping);
        });

        // Leave chat
        socket.on('leave-chat', (userId: string) => {
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

        // Report message
        socket.on('report-message', (data: { messageId: string; reason: string }) => {
            // Handle report (implement moderation logic)
            console.log('Message reported:', data);
            socket.emit('report-submitted', { success: true });
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);

            const userId = socketUsers.get(socket.id);
            if (userId) {
                socketUsers.delete(socket.id);
            }

            // Find and remove user from their room
            for (const [userId, roomId] of userRooms.entries()) {
                const room = chatRooms.get(roomId);
                if (room && room.users.includes(userId)) {
                    room.users = room.users.filter(id => id !== userId);

                    if (room.users.length === 0) {
                        chatRooms.delete(roomId);
                    } else {
                        socket.to(roomId).emit('user-left', { userCount: room.users.length });
                    }

                    userRooms.delete(userId);
                    break;
                }
            }
        });
    });

    return io;
};
