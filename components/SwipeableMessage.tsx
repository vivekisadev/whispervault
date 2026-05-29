import React, { useState, useRef } from "react";
import { useDrag } from "@use-gesture/react";
import { motion, useAnimation } from "framer-motion";
import { Reply, Copy, Flag } from "lucide-react";
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

    const bind = useDrag(({ active, movement: [x] }) => {
        const dragX = x > 0 ? Math.min(x, 100) : 0;

        if (active) {
            // Cancel long press if we start dragging
            if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
            controls.set({ x: dragX });
            setShowReplyIcon(dragX > 50);
        } else {
            if (dragX > 50) {
                onReply(message);
            }
            controls.start({ x: 0 });
            setShowReplyIcon(false);
        }
    }, {
        axis: 'x',
        filterTaps: true,
    });

    const handleTouchStart = () => {
        longPressTimer.current = setTimeout(() => {
            setMenuOpen(true);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuOpen(true);
    };

    return (
        <div className={`relative flex items-center group w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div className={`absolute ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} flex items-center justify-center transition-opacity duration-200 ${showReplyIcon ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-primary/20 p-2 rounded-full backdrop-blur-sm">
                    <Reply className="w-4 h-4 text-primary" />
                </div>
            </div>

            <motion.div
                {...bind() as any}
                animate={controls}
                className="touch-pan-y relative"
                style={{ touchAction: 'pan-y' }}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <div className="outline-none">
                            {children}
                            {message.reaction && (
                                <div className="absolute -bottom-2 right-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm animate-in zoom-in duration-200 z-20 flex items-center justify-center min-w-[20px]">
                                    {message.reaction}
                                </div>
                            )}
                        </div>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        align={isOwnMessage ? "end" : "start"}
                        className="w-auto min-w-[160px] p-1.5 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl"
                    >
                        <div className="flex items-center justify-between gap-1 p-1 mb-1.5 bg-white/5 rounded-lg overflow-x-auto no-scrollbar">
                            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                                <button
                                    key={emoji}
                                    className="text-lg hover:scale-125 hover:bg-white/10 rounded p-1 transition-all duration-200 active:scale-95"
                                    onClick={() => {
                                        onReact(message.id, emoji);
                                        setMenuOpen(false);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-0.5">
                            <DropdownMenuItem
                                onClick={() => onReply(message)}
                                className="text-xs py-1.5 focus:bg-white/10 focus:text-white cursor-pointer rounded-md"
                            >
                                <Reply className="mr-2 h-3.5 w-3.5 opacity-70" />
                                <span>Reply</span>
                            </DropdownMenuItem>

                            {message.content && (
                                <DropdownMenuItem
                                    onClick={() => navigator.clipboard.writeText(message.content)}
                                    className="text-xs py-1.5 focus:bg-white/10 focus:text-white cursor-pointer rounded-md"
                                >
                                    <Copy className="mr-2 h-3.5 w-3.5 opacity-70" />
                                    <span>Copy Text</span>
                                </DropdownMenuItem>
                            )}

                            {!isOwnMessage && (
                                <DropdownMenuItem
                                    className="text-xs py-1.5 text-red-400 focus:bg-red-500/20 focus:text-red-300 cursor-pointer rounded-md"
                                >
                                    <Flag className="mr-2 h-3.5 w-3.5 opacity-70" />
                                    <span>Report</span>
                                </DropdownMenuItem>
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </motion.div>
        </div>
    );
}