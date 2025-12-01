'use client';

import { useState } from 'react';
import { Confession } from '@/types';
import { formatTimestamp, calculateVoteScore, getUserId, hasUserVoted, saveUserVote, removeUserVote } from '@/lib/utils';
import { ArrowUp, ArrowDown, MessageCircle, Flag, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface ConfessionCardProps {
    confession: Confession;
    onUpdate: () => void;
}

export default function ConfessionCard({ confession, onUpdate }: ConfessionCardProps) {
    const [showReplies, setShowReplies] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const userId = getUserId();

    // Optimistic UI state
    const [localUpvotes, setLocalUpvotes] = useState(confession.upvotes);
    const [localDownvotes, setLocalDownvotes] = useState(confession.downvotes);
    const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(() => {
        if (hasUserVoted(confession.id, userId, 'upvote')) return 'upvote';
        if (hasUserVoted(confession.id, userId, 'downvote')) return 'downvote';
        return null;
    });

    const voteScore = calculateVoteScore(localUpvotes, localDownvotes);

    const handleVote = async (voteType: 'upvote' | 'downvote') => {
        const previousUpvotes = localUpvotes;
        const previousDownvotes = localDownvotes;
        const previousUserVote = userVote;

        // Optimistic update
        if (userVote === voteType) {
            // Remove vote
            setUserVote(null);
            if (voteType === 'upvote') setLocalUpvotes(prev => prev - 1);
            else setLocalDownvotes(prev => prev - 1);
            removeUserVote(confession.id, userId);
        } else {
            // Change or add vote
            if (userVote) {
                // Switching vote (e.g. up to down)
                if (voteType === 'upvote') {
                    setLocalUpvotes(prev => prev + 1);
                    setLocalDownvotes(prev => prev - 1);
                } else {
                    setLocalUpvotes(prev => prev - 1);
                    setLocalDownvotes(prev => prev + 1);
                }
            } else {
                // New vote
                if (voteType === 'upvote') setLocalUpvotes(prev => prev + 1);
                else setLocalDownvotes(prev => prev + 1);
            }
            setUserVote(voteType);
            saveUserVote(confession.id, userId, voteType);
        }

        try {
            // Server sync
            const action = userVote === voteType ? 'remove' : undefined;

            // If switching votes, we might need two requests or a smarter API. 
            // The current API seems to handle "add" but not explicit "switch".
            // However, the previous logic did a remove then add.
            // Let's replicate the logic but in background.

            if (previousUserVote && previousUserVote !== voteType && action !== 'remove') {
                // Remove old vote first
                await fetch('/api/vote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetId: confession.id,
                        targetType: 'confession',
                        voteType: previousUserVote,
                        action: 'remove',
                    }),
                });
            }

            await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetId: confession.id,
                    targetType: 'confession',
                    voteType,
                    action,
                }),
            });

            // We don't strictly need onUpdate() anymore for the vote count, 
            // but we might want it for other things. 
            // Calling it might overwrite our optimistic state if the server is slow/stale,
            // so we can skip it or debounce it. For now, let's skip it to keep UI stable.
            // onUpdate(); 
        } catch (error) {
            console.error('Vote failed:', error);
            // Revert on error
            setLocalUpvotes(previousUpvotes);
            setLocalDownvotes(previousDownvotes);
            setUserVote(previousUserVote);
            if (previousUserVote) saveUserVote(confession.id, userId, previousUserVote);
            else removeUserVote(confession.id, userId);
        }
    };

    const [localReplies, setLocalReplies] = useState(confession.replies);

    const handleReply = async () => {
        if (!replyContent.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/confessions/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    confessionId: confession.id,
                    content: replyContent,
                }),
            });

            if (!res.ok) throw new Error('Failed to reply');

            const newReply = await res.json();

            // Update local state immediately without refreshing the whole page
            setLocalReplies(prev => {
                const replyWithTimestamp = {
                    ...newReply,
                    timestamp: newReply.timestamp || Date.now()
                };
                const updated = [...prev, replyWithTimestamp];
                return updated;
            });
            setReplyContent('');

            // Optional: Notify parent if needed, but we avoid full re-fetch
            // onUpdate(); 
        } catch (error) {
            console.error('Reply failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReport = async (reason: string) => {
        try {
            await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetId: confession.id,
                    targetType: 'confession',
                    reason,
                }),
            });
            setShowReportModal(false);
            alert('Report submitted successfully');
        } catch (error) {
            console.error('Report failed:', error);
        }
    };

    return (
        <>
            <Card className="border border-border bg-card shadow-none hover:border-primary/50 transition-colors duration-200">
                <CardContent className="p-6">
                    {/* Header: Tags & Time */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap gap-2">
                            {confession.tags && confession.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="text-xs font-bold text-primary hover:text-primary/80 cursor-pointer uppercase tracking-wide"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                            {formatTimestamp(confession.timestamp)}
                        </span>
                    </div>

                    {/* Main Content */}
                    <div className="mb-6">
                        <p className="text-[16px] leading-relaxed text-foreground font-normal whitespace-pre-wrap break-words">
                            {confession.content}
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleVote('upvote')}
                                    className={`h-8 w-8 rounded-md hover:bg-background ${userVote === 'upvote' ? 'text-green-500' : 'text-muted-foreground'
                                        }`}
                                >
                                    <ArrowUp className="h-5 w-5" />
                                </Button>
                                <span className={`text-sm font-bold px-2 min-w-[1.5rem] text-center ${voteScore > 0 ? 'text-green-500' : voteScore < 0 ? 'text-red-500' : 'text-muted-foreground'
                                    }`}>
                                    {voteScore}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleVote('downvote')}
                                    className={`h-8 w-8 rounded-md hover:bg-background ${userVote === 'downvote' ? 'text-red-500' : 'text-muted-foreground'
                                        }`}
                                >
                                    <ArrowDown className="h-5 w-5" />
                                </Button>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowReplies(!showReplies)}
                                className="h-10 px-3 text-muted-foreground hover:text-primary hover:bg-secondary/50 gap-2 rounded-lg transition-colors"
                            >
                                <MessageCircle className="h-5 w-5" />
                                <span className="text-sm font-medium">{localReplies.length}</span>
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowReportModal(true)}
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                            <Flag className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Replies Section */}
                    {showReplies && (
                        <div className="mt-6 pt-6 border-t border-border space-y-6">
                            {/* Reply Input */}
                            <div className="flex gap-3">
                                <Input
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="flex-1 h-11 bg-secondary/30 border-border focus:border-primary rounded-lg"
                                    onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                                />
                                <Button
                                    onClick={handleReply}
                                    disabled={isSubmitting || !replyContent.trim()}
                                    className="h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-lg"
                                >
                                    Reply
                                </Button>
                            </div>

                            {/* Replies List */}
                            <div className="space-y-4">
                                {(localReplies || []).map((reply, index) => (
                                    <div key={reply.id || index} className="glass-message px-4 py-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                        <div className="relative z-10">
                                            <p className="text-sm text-foreground mb-2 leading-relaxed">{reply.content}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                                                <span>{formatTimestamp(reply.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full shadow-lg border-border bg-card">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4 text-foreground">Report Confession</h3>
                            <div className="space-y-2">
                                {['Spam', 'Harassment', 'Inappropriate Content', 'Other'].map((reason) => (
                                    <Button
                                        key={reason}
                                        onClick={() => handleReport(reason)}
                                        variant="ghost"
                                        className="w-full justify-start h-10 hover:bg-secondary"
                                    >
                                        {reason}
                                    </Button>
                                ))}
                            </div>
                            <Separator className="my-4" />
                            <Button
                                onClick={() => setShowReportModal(false)}
                                variant="outline"
                                className="w-full"
                            >
                                Cancel
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
