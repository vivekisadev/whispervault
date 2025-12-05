import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { ChatMessage, ChatRoom } from './types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory storage
const chatRooms = new Map<string, ChatRoom>();
const userRooms = new Map<string, string>();

const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

app.prepare().then(() => {
    const server = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // Initialize Socket.io 
    const io = new SocketIOServer(server, {
        path: '/api/socket',
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? 'https://whispervault.vercel.app'
                : '*',
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Helper to broadcast online count
        const broadcastOnlineCount = () => {
            const count = userRooms.size;
            // Fake multiplier: 1.5x
            const displayCount = Math.max(count, Math.floor(count * 1.5));
            io.emit('online-users', displayCount);
        };

        // Send current count immediately
        broadcastOnlineCount();

        // Helper to clean up user session
        const cleanupUserSession = (socket: any) => {
            const userId = socket.data.userId;
            if (!userId) return;

            const roomId = userRooms.get(userId);
            if (roomId) {
                const room = chatRooms.get(roomId);
                if (room) {
                    room.users = room.users.filter(id => id !== userId);

                    if (room.users.length === 0) {
                        chatRooms.delete(roomId);
                    } else {
                        socket.to(roomId).emit('partner-disconnected');
                        socket.to(roomId).emit('user-left', { userCount: room.users.length });
                    }
                }
                socket.leave(roomId);
            }

            userRooms.delete(userId);
            socket.data.userId = null;
            broadcastOnlineCount();
        };

        socket.on('join-chat', () => {
            // If user is already in a session, clean it up first
            if (socket.data.userId) {
                cleanupUserSession(socket);
            }

            // Generate a long, unique random ID for this session
            // This ensures unlimited unique IDs and decouples from socket.id
            const userId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
            socket.data.userId = userId;

            // Tell the client their assigned User ID
            socket.emit('your-userid', userId);

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

            // Update online count
            broadcastOnlineCount();
        });

        socket.on('send-message', (data: {
            content: string;
            image?: string;
            audio?: string;
            replyTo?: {
                id: string;
                content: string;
                username: string;
                audio?: string;
                image?: string;
            }
        }) => {
            const userId = socket.data.userId;
            if (!userId) return;

            const roomId = userRooms.get(userId);
            if (!roomId) return;

            const room = chatRooms.get(roomId);
            if (!room) return;

            const message: ChatMessage = {
                id: generateId(),
                content: data.content,
                image: data.image,
                audio: data.audio,
                replyTo: data.replyTo,
                timestamp: Date.now(),
                userId: userId,
                roomId,
            };

            room.messages.push(message);

            // Send to sender (with their ID)
            socket.emit('new-message', message);

            // Send to partner (with masked ID)
            // We use 'stranger' as the ID so the client knows it's not them
            socket.to(roomId).emit('new-message', {
                ...message,
                userId: 'stranger'
            });
        });

        socket.on('typing', (data: { isTyping: boolean }) => {
            const userId = socket.data.userId;
            if (!userId) return;

            const roomId = userRooms.get(userId);
            if (!roomId) return;
            socket.to(roomId).emit('user-typing', data.isTyping);
        });

        socket.on('leave-chat', () => {
            cleanupUserSession(socket);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            cleanupUserSession(socket);
        });
    });

    console.log('Socket.io initialized');

    server.listen(port, '0.0.0.0', () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
