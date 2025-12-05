import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '@/types';
import { generateId, generateAnonymousName, formatTimestamp, formatChatTimestamp } from '@/lib/utils';
import { Send, UserX, Loader, Image as ImageIcon, X, Smile, Reply, Mic, Trash2, Square } from 'lucide-react';
import SwipeableMessage from './SwipeableMessage';
import AudioPlayer from './AudioPlayer';
import AudioWaveform from './AudioWaveform';
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

    // Generate NEW identity for each chat session (never persist)
    const [chatUserId] = useState(() => generateId());
    const [chatName] = useState(() => generateAnonymousName());

    const [isPartnerDisconnected, setIsPartnerDisconnected] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [myUserId, setMyUserId] = useState<string | null>(null);
    // Inside Chat component
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        // Connect to external Socket.IO server (deployed separately)
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

        if (!socketUrl) {
            console.warn('NEXT_PUBLIC_SOCKET_URL not configured. Chat will not work.');
            return;
        }

        const newSocket = io(socketUrl, {
            path: '/api/socket',
        });

        newSocket.on('connect', () => {
            console.log('Connected to chat');
            // Don't set isConnected here yet, wait for identity
            newSocket.emit('join-chat', chatUserId);
        });

        newSocket.on('your-userid', (id: string) => {
            setMyUserId(id);
            setIsConnected(true); // Now we are fully connected with identity
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

        newSocket.on('new-reaction', (data: { messageId: string, reaction: string }) => {
            setMessages(prev => prev.map(msg =>
                msg.id === data.messageId ? { ...msg, reaction: data.reaction } : msg
            ));
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            setMyUserId(null);
        });

        setSocket(newSocket);

        return () => {
            newSocket.emit('leave-chat');
            newSocket.close();
        };
    }, []);

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
            content: inputMessage,
            image: selectedImage,
            chatUserId,
            replyTo: replyingTo ? {
                id: replyingTo.id,
                content: replyingTo.content || (replyingTo.audio ? "🎤 Audio Message" : replyingTo.image ? "📷 Image" : "Message"),
                username: 'Stranger' // Since it's anonymous
            } : undefined
        });

        setInputMessage('');
        setSelectedImage(null);
        setReplyingTo(null);
        socket.emit('typing', { isTyping: false, userId: chatUserId });
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setRecordingStream(stream);

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (audioBlob.size === 0) {
                    console.warn("Audio recording was empty");
                    return;
                }
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result as string;
                    if (socket && isConnected) {
                        socket.emit('send-message', {
                            content: '',
                            audio: base64Audio,
                            chatUserId,
                            replyTo: replyingTo ? {
                                id: replyingTo.id,
                                content: replyingTo.content || (replyingTo.audio ? "🎤 Audio Message" : replyingTo.image ? "📷 Image" : "Message"),
                                username: 'Stranger'
                            } : undefined
                        });
                        setReplyingTo(null);
                    }
                };
            };

            mediaRecorder.start(100); // Collect chunks every 100ms
            setIsRecording(true);
            setRecordingDuration(0);
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopRecordingAndSend = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setRecordingStream(null);
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = null; // Prevent sending
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setRecordingStream(null);
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTyping = (value: string) => {
        setInputMessage(value);

        if (socket && isConnected) {
            socket.emit('typing', { isTyping: value.length > 0, userId: chatUserId });
        }
    };

    const handleReaction = (messageId: string, reaction: string) => {
        // Optimistic update
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, reaction } : msg
        ));

        if (socket && isConnected) {
            socket.emit('add-reaction', { messageId, reaction, roomId });
        }
    };

    const handleLeaveChat = () => {
        if (socket) {
            socket.emit('leave-chat');
            setMessages([]);
            setRoomId(null);
            setUserCount(0); // Reset user count
            setIsPartnerDisconnected(false);
            setSelectedImage(null);
            setMyUserId(null);

            // Wait a bit before re-joining to ensure server processes the leave
            setTimeout(() => {
                socket.emit('join-chat', chatUserId);
            }, 300);
        }
    };

    return (
        <Card className="h-[500px] sm:h-[600px] flex flex-col border border-border bg-card/50 backdrop-blur-xl overflow-hidden shadow-sm relative">
            {/* Image View Modal */}
            {/* Image View Modal - Full Screen Fixed */}
            {viewingImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setViewingImage(null)}
                >
                    <div className="relative w-full h-full p-4 flex items-center justify-center">
                        <button
                            onClick={() => setViewingImage(null)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-[110]"
                        >
                            <X className="h-8 w-8" />
                        </button>

                        {/* Image Container - Full size, no crop */}
                        <div className="relative w-full h-full flex items-center justify-center">
                            {/* Transparent overlay to prevent drag/save */}
                            <div
                                className="absolute inset-0 z-10 bg-transparent"
                                onContextMenu={(e) => e.preventDefault()}
                            />
                            <img
                                src={viewingImage}
                                alt="Shared image"
                                className="max-w-full max-h-full object-contain select-none pointer-events-none shadow-2xl"
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
            <div className={`flex-1 p-3 sm:p-4 min-h-0 overflow-y-auto custom-scrollbar ${isPartnerDisconnected ? 'blur-sm' : ''}`}>
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
                        const isOwnMessage = message.userId === myUserId;
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fade-in`}
                            >
                                <SwipeableMessage
                                    message={message}
                                    onReply={setReplyingTo}
                                    onReact={handleReaction}
                                    isOwnMessage={isOwnMessage}
                                >
                                    <div
                                        className={`max-w-[70%] px-4 py-2 backdrop-blur-md border rounded-2xl shadow-sm ${isOwnMessage
                                            ? 'bg-primary/20 border-primary/20 text-foreground rounded-tr-sm'
                                            : 'bg-secondary/30 border-border/50 text-foreground rounded-tl-sm'
                                            }`}
                                    >
                                        {message.replyTo && (
                                            <div className="mb-2 p-2 rounded-md bg-black/5 dark:bg-black/20 border-l-4 border-primary/70 text-xs flex flex-col">
                                                <span className="text-primary font-bold text-[10px] uppercase tracking-wider mb-0.5">{message.replyTo.username}</span>
                                                <span className="opacity-80 line-clamp-1 italic">{message.replyTo.content}</span>
                                            </div>
                                        )}
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
                                            {message.audio && (
                                                <div className="mt-1 mb-1">
                                                    <AudioPlayer src={message.audio} />
                                                </div>
                                            )}
                                            <p className="text-[10px] opacity-70 text-right mt-1">
                                                {formatChatTimestamp(message.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                </SwipeableMessage>
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
                className={`p-3 sm:p-4 border-t border-border ${isPartnerDisconnected ? 'blur-sm' : ''}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {replyingTo && (
                    <div className="mb-2 px-4 py-2 bg-secondary/50 border border-border rounded-lg flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Reply className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex flex-col text-sm">
                                <span className="font-medium text-primary">Replying to Stranger</span>
                                <span className="text-muted-foreground truncate max-w-[200px]">
                                    {replyingTo.content || (replyingTo.audio ? "🎤 Audio Message" : replyingTo.image ? "📷 Image" : "Message")}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setReplyingTo(null)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

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

                <div className="flex gap-2 mb-2 items-center">
                    {isRecording ? (
                        <div className="flex-1 flex items-center gap-3 bg-background/80 backdrop-blur-md border border-primary/20 rounded-2xl px-4 py-2 shadow-inner animate-in fade-in duration-200">
                            {/* Trash / Cancel */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={cancelRecording}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full shrink-0"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            {/* Visualizer Container */}
                            <div className="flex-1 h-10 flex items-center justify-center relative overflow-hidden mx-2">
                                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                    <div className="w-full h-[1px] bg-primary"></div>
                                </div>
                                <AudioWaveform stream={recordingStream} isRecording={isRecording} />
                            </div>

                            {/* Timer */}
                            <span className="text-xs font-mono font-medium text-primary/80 tabular-nums shrink-0 w-12 text-center">
                                {formatDuration(recordingDuration)}
                            </span>

                            {/* Send Button */}
                            <Button
                                size="icon"
                                onClick={stopRecordingAndSend}
                                className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shrink-0 shadow-md transform hover:scale-105 transition-all"
                            >
                                <Send className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <>
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
                                maxLength={1000}
                            />
                            {inputMessage.trim() || selectedImage ? (
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!isConnected || userCount !== 2 || isPartnerDisconnected}
                                    size="icon"
                                    className="bg-gradient-to-r from-primary to-pink-500 hover:opacity-90 shrink-0"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={startRecording}
                                    disabled={!isConnected || userCount !== 2 || isPartnerDisconnected}
                                    size="icon"
                                    variant="outline"
                                    className="shrink-0 hover:bg-primary/10 hover:text-primary border-primary/20"
                                >
                                    <Mic className="h-4 w-4" />
                                </Button>
                            )}
                        </>
                    )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                    You are chatting as <span className="text-primary font-medium">{chatName}</span>
                </p>
            </CardContent>
        </Card>
    );
}
