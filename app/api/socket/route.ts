import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { ChatMessage, ChatRoom } from '@/types';
import { generateId } from '@/lib/utils';

// In-memory storage
const chatRooms = new Map<string, ChatRoom>();
const userRooms = new Map<string, string>();

export async function GET(req: NextRequest) {
    const res = (req as any).res;

    if (!res.socket.server.io) {
        console.log('Initializing Socket.io');

        const httpServer: NetServer = res.socket.server;
        const io = new SocketIOServer(httpServer, {
            path: '/api/socket',
            addTrailingSlash: false,
        });

        io.on('connection', (socket) => {
            console.log('User connected:', socket.id);

            socket.on('join-chat', (userId: string) => {
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
                socket.to(roomId).emit('user-joined', { userCount: room.users.length });
            });

            socket.on('send-message', (data: { userId: string; content: string }) => {
                const roomId = userRooms.get(data.userId);
                if (!roomId) return;

                const room = chatRooms.get(roomId);
                if (!room) return;

                const message: ChatMessage = {
                    id: generateId(),
                    content: data.content,
                    timestamp: Date.now(),
                    userId: data.userId,
                    roomId,
                };

                room.messages.push(message);
                io.to(roomId).emit('new-message', message);
            });

            socket.on('typing', (data: { userId: string; isTyping: boolean }) => {
                const roomId = userRooms.get(data.userId);
                if (!roomId) return;
                socket.to(roomId).emit('user-typing', data.isTyping);
            });

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

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });

        res.socket.server.io = io;
    }

    res.end();
}
