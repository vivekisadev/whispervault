'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '@/types';
import { getUserId, getAnonymousName, formatTimestamp } from '@/lib/utils';
import { Send, UserX, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function Chat() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [userCount, setUserCount] = useState(0);
    const [roomId, setRoomId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const userId = getUserId();
    const anonymousName = getAnonymousName();

    useEffect(() => {
        const newSocket = io({
            path: '/api/socket',
        });

        newSocket.on('connect', () => {
            console.log('Connected to chat');
            setIsConnected(true);
            newSocket.emit('join-chat', userId);
        });

        newSocket.on('room-joined', (data: { roomId: string; userCount: number }) => {
            setRoomId(data.roomId);
            setUserCount(data.userCount);
        });

        newSocket.on('user-joined', (data: { userCount: number }) => {
            setUserCount(data.userCount);
        });

        newSocket.on('user-left', (data: { userCount: number }) => {
            setUserCount(data.userCount);
        });

        newSocket.on('new-message', (message: ChatMessage) => {
            setMessages((prev) => [...prev, message]);
        });

        newSocket.on('user-typing', (isTyping: boolean) => {
            setIsTyping(isTyping);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.emit('leave-chat', userId);
            newSocket.close();
        };
    }, [userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputMessage.trim() || !socket || !isConnected) return;

        socket.emit('send-message', {
            userId,
            content: inputMessage,
        });

        setInputMessage('');
        socket.emit('typing', { userId, isTyping: false });
    };

    const handleTyping = (value: string) => {
        setInputMessage(value);

        if (socket && isConnected) {
            socket.emit('typing', { userId, isTyping: value.length > 0 });
        }
    };

    const handleLeaveChat = () => {
        if (socket) {
            socket.emit('leave-chat', userId);
            setMessages([]);
            setRoomId(null);
            setTimeout(() => {
                socket.emit('join-chat', userId);
            }, 500);
        }
    };

    return (
        <Card className="h-[600px] flex flex-col glass-card border-white/10 bg-card/50 backdrop-blur-xl">
            {/* Header */}
            <CardHeader className="border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Anonymous Chat
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            {isConnected ? (
                                userCount === 2 ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                                        Connected with stranger
                                    </Badge>
                                ) : (
                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                        <Loader className="w-3 h-3 mr-2 animate-spin" />
                                        Waiting for stranger...
                                    </Badge>
                                )
                            ) : (
                                <Badge variant="destructive" className="bg-destructive/20">
                                    <span className="w-2 h-2 bg-destructive rounded-full mr-2"></span>
                                    Connecting...
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button
                        onClick={handleLeaveChat}
                        variant="destructive"
                        size="sm"
                        className="bg-destructive/20 hover:bg-destructive/30"
                    >
                        <UserX className="h-4 w-4 mr-2" />
                        Next
                    </Button>
                </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            {userCount === 2 ? (
                                <>
                                    <p className="text-lg mb-2">Say hi! 👋</p>
                                    <p className="text-sm">Start a conversation with your anonymous stranger</p>
                                </>
                            ) : (
                                <>
                                    <Loader className="animate-spin mx-auto mb-2 h-8 w-8" />
                                    <p className="text-sm">Finding someone to chat with...</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {messages.map((message) => {
                        const isOwnMessage = message.userId === userId;
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fade-in`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwnMessage
                                            ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                                            : 'bg-muted/50 text-foreground backdrop-blur-sm'
                                        }`}
                                >
                                    <p className="text-sm mb-1">{message.content}</p>
                                    <p className="text-xs opacity-70">
                                        {formatTimestamp(message.timestamp)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-muted/50 rounded-2xl px-4 py-2 backdrop-blur-sm">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></span>
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input */}
            <CardContent className="p-4 border-t border-white/10">
                <div className="flex gap-2 mb-2">
                    <Input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-background/50 border-white/10"
                        disabled={!isConnected || userCount !== 2}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || !isConnected || userCount !== 2}
                        size="icon"
                        className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                    You are chatting as <span className="text-primary font-medium">{anonymousName}</span>
                </p>
            </CardContent>
        </Card>
    );
}
