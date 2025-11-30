'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '@/types';
import { getUserId, getAnonymousName, formatTimestamp } from '@/lib/utils';
import { Send, UserX, Loader, Image as ImageIcon, X, Smile } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

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

    const [isPartnerDisconnected, setIsPartnerDisconnected] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
        // Connect to external Socket.IO server (deployed separately)
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

        if (!socketUrl) {
            console.warn('NEXT_PUBLIC_SOCKET_URL not configured. Chat will not work.');
            return;
        }

        const newSocket = io(socketUrl);

        newSocket.on('connect', () => {
            console.log('Connected to chat');
            setIsConnected(true);
            newSocket.emit('join-chat', userId);
        });

        newSocket.on('room-joined', (data: { roomId: string; userCount: number }) => {
            setRoomId(data.roomId);
            setUserCount(data.userCount);
            setIsPartnerDisconnected(false);
        });

        newSocket.on('user-joined', (data: { userCount: number }) => {
            setUserCount(data.userCount);
            setIsPartnerDisconnected(false);
        });

        newSocket.on('user-left', (data: { userCount: number }) => {
            setUserCount(data.userCount);
        });

        newSocket.on('partner-disconnected', () => {
            setIsPartnerDisconnected(true);
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

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert("Please select an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("Image size should be less than 5MB");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isConnected || userCount !== 2 || isPartnerDisconnected) return;

        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleSendMessage = () => {
        if ((!inputMessage.trim() && !selectedImage) || !socket || !isConnected) return;

        socket.emit('send-message', {
            userId,
            content: inputMessage,
            image: selectedImage
        });

        setInputMessage('');
        setSelectedImage(null);
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
            setUserCount(0); // Reset user count
            setIsPartnerDisconnected(false);
            setSelectedImage(null);

            // Wait a bit before re-joining to ensure server processes the leave
            setTimeout(() => {
                socket.emit('join-chat', userId);
            }, 300);
        }
    };

    return (
        <Card className="h-[600px] flex flex-col border border-border bg-card/50 backdrop-blur-xl overflow-hidden shadow-sm relative">
            {/* Image View Modal */}
            {viewingImage && (
                <div
                    className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setViewingImage(null)}
                >
                    <div className="relative max-w-[90%] max-h-[90%] p-2">
                        <button
                            onClick={() => setViewingImage(null)}
                            className="absolute -top-8 right-0 text-foreground hover:text-primary transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <div className="relative rounded-lg overflow-hidden shadow-2xl border border-border">
                            {/* Transparent overlay to prevent drag/save */}
                            <div
                                className="absolute inset-0 z-10 bg-transparent"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <img
                                src={viewingImage}
                                alt="Shared image"
                                className="max-w-full max-h-[80vh] object-contain select-none pointer-events-none"
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Disconnect Overlay */}
            {isPartnerDisconnected && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="text-center p-6 rounded-xl bg-card border border-border shadow-lg max-w-sm mx-4">
                        <UserX className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-bold mb-2">Stranger Disconnected</h3>
                        <p className="text-muted-foreground mb-6">
                            The other person has left the chat.
                        </p>
                        <Button
                            onClick={handleLeaveChat}
                            className="w-full bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
                        >
                            Find New Stranger
                        </Button>
                    </div>
                </div>
            )}

            {/* Header */}
            <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                            Anonymous Chat
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            {isConnected ? (
                                userCount === 2 ? (
                                    <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                                        <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mr-2 animate-pulse"></span>
                                        Connected with stranger
                                    </Badge>
                                ) : (
                                    <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                                        <Loader className="w-3 h-3 mr-2 animate-spin" />
                                        Waiting for stranger...
                                    </Badge>
                                )
                            ) : (
                                <Badge variant="destructive" className="bg-destructive/20 text-destructive dark:text-destructive-foreground">
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
                        className="bg-destructive/20 hover:bg-destructive/30 text-destructive dark:text-destructive-foreground"
                    >
                        <UserX className="h-4 w-4 mr-2" />
                        Next
                    </Button>
                </div>
            </CardHeader>

            {/* Messages */}
            <div className={`flex-1 p-4 min-h-0 overflow-y-auto custom-scrollbar ${isPartnerDisconnected ? 'blur-sm' : ''}`}>
                {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            {!process.env.NEXT_PUBLIC_SOCKET_URL ? (
                                <>
                                    <p className="text-lg mb-2">💬 Live Chat</p>
                                    <p className="text-sm max-w-md mx-auto">
                                        To enable real-time chat, deploy the Socket.IO server separately.
                                        See <code className="text-primary">SOCKET-DEPLOYMENT.md</code> for instructions.
                                    </p>
                                </>
                            ) : userCount === 2 ? (
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
                                    className={`max-w-[70%] px-4 py-2 glass-message ${isOwnMessage
                                        ? 'text-foreground'
                                        : 'text-foreground'
                                        }`}
                                >
                                    <div className="relative z-10">
                                        {message.image && (
                                            <div
                                                className="relative mb-2 rounded-lg overflow-hidden group cursor-zoom-in"
                                                onClick={() => setViewingImage(message.image!)}
                                            >
                                                {/* Transparent overlay to prevent drag/save but allow click */}
                                                <div
                                                    className="absolute inset-0 z-10 bg-transparent"
                                                    onContextMenu={(e) => e.preventDefault()}
                                                />
                                                <img
                                                    src={message.image}
                                                    alt="Shared image"
                                                    className="max-w-full max-h-48 object-cover rounded-lg select-none pointer-events-none"
                                                    draggable={false}
                                                />
                                            </div>
                                        )}
                                        {message.content && <p className="text-sm mb-1">{message.content}</p>}
                                        <p className="text-xs opacity-70">
                                            {formatTimestamp(message.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-secondary/60 backdrop-blur-md border border-border/50 rounded-2xl px-4 py-2 shadow-sm">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></span>
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                                <span className="text-xs text-muted-foreground ml-2 self-center animate-pulse">Stranger is typing...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <CardContent
                className={`p-4 border-t border-border ${isPartnerDisconnected ? 'blur-sm' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {selectedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-border" />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:bg-destructive/90"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}

                {/* Emoji Picker */}
                {showEmojiPicker && (
                    <div className="mb-2 relative">
                        <div className="absolute bottom-0 left-0 z-50">
                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    setInputMessage(prev => prev + emojiData.emoji);
                                    setShowEmojiPicker(false);
                                }}
                                width={300}
                                height={400}
                            />
                        </div>
                    </div>
                )}

                <div className="flex gap-2 mb-2">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isConnected || userCount !== 2 || isPartnerDisconnected}
                        className="shrink-0"
                    >
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={!isConnected || userCount !== 2 || isPartnerDisconnected}
                        className="shrink-0"
                    >
                        <Smile className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-background border-input"
                        disabled={!isConnected || userCount !== 2 || isPartnerDisconnected}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={(!inputMessage.trim() && !selectedImage) || !isConnected || userCount !== 2 || isPartnerDisconnected}
                        size="icon"
                        className="bg-gradient-to-r from-primary to-pink-500 hover:opacity-90 shrink-0"
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
