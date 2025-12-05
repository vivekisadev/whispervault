import React, { useState, useRef } from "react";
import { useDrag } from "@use-gesture/react";
import { motion, useAnimation } from "framer-motion";
import { Reply, Smile, Copy, Flag } from "lucide-react";
import { ChatMessage } from "@/types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SwipeableMessageProps {
    children: React.ReactNode;
    message: ChatMessage;
    onReply: (message: ChatMessage) => void;
    onReact: (messageId: string, emoji: string) => void;
    isOwnMessage: boolean;
}

export default function SwipeableMessage({
    children,
    message,
    onReply,
    onReact,
    isOwnMessage,
}: SwipeableMessageProps) {
    const controls = useAnimation();
    const [showReplyIcon, setShowReplyIcon] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    //Handle Swipe to reply
    const bind = useDrag(({ active, movement: [x] }) => {
        const dragX = x > 0 ? Math.min(x, 100) : 0;

        if (active) {
            controls.set({ x: dragX });
            if (dragX > 50) {
                setShowReplyIcon(true);
            } else {
                setShowReplyIcon(false);
            }
        }
        else {
            if (dragX > 50) {
                onReply(message);
            }
            controls.start({ x: 0 });
            setShowReplyIcon(false);
        }

    }, {
        filterTaps: true,
        axis: 'x',
    });

    //Handle long presss for options
    const handleTouchStart = () => {
        longPressTimer.current = setTimeout(() => {
            setMenuOpen(true);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    return (
        <div className={`relative flex items-center group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`absolute ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} flex items-center justify-center transition-opacity duration-200 ${showReplyIcon ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-primary/20 p-2 rounded-full">
                    <Reply className="w-4 h-4 text-primary" />
                </div>
            </div>

            {/* Draggable Message Container */}
            <motion.div
                {...bind() as any}
                animate={controls}
                className="touch-pan-y"
                style={{ touchAction: 'pan-y' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <div className="cursor-default select-none relative">
                            {children}
                            {message.reaction && (
                                <div className="absolute -bottom-3 right-2 bg-background/90 backdrop-blur-md border border-border/50 rounded-full px-2 py-0.5 text-sm shadow-md animate-in zoom-in duration-200 z-20 flex items-center justify-center min-w-[24px]">
                                    {message.reaction}
                                </div>
                            )}
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="w-64 p-2">
                        <div className="grid grid-cols-6 gap-1 mb-2">
                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                                <button
                                    key={emoji}
                                    className="text-lg hover:bg-secondary rounded-md p-1.5 transition-colors flex items-center justify-center"
                                    onClick={() => {
                                        onReact(message.id, emoji);
                                        setMenuOpen(false);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <DropdownMenuItem onClick={() => onReply(message)}>
                            <Reply className="mr-2 h-4 w-4" />
                            <span>Reply</span>
                        </DropdownMenuItem>
                        {message.content && (
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Copy Text</span>
                            </DropdownMenuItem>
                        )}
                        {!isOwnMessage && (
                            <DropdownMenuItem className="text-destructive">
                                <Flag className="mr-2 h-4 w-4" />
                                <span>Report</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </motion.div>
        </div>
    );
}