'use client';

import { useState } from 'react';
import { Send, X, Smile } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

import { Confession } from '@/types';

interface NewConfessionProps {
    onConfessionCreated: (newConfession: Confession) => void;
}

export default function NewConfession({ onConfessionCreated }: NewConfessionProps) {
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleAddTag = () => {
        if (tagInput.trim() && tags.length < 5 && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim().toLowerCase()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async () => {
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch('/api/confessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, tags }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create confession');
            }

            const data = await response.json();
            const newConfession = data.confession;

            if (!newConfession) {
                throw new Error('Received invalid response from server');
            }

            setContent('');
            setTags([]);
            setSuccessMessage('Confession posted successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
            onConfessionCreated(newConfession);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const remainingChars = 500 - content.length;

    return (
        <Card className="border border-white/10 bg-card/50 backdrop-blur-xl shadow-lg">
            <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4 text-foreground tracking-tight">Share Your Confession</h3>

                <div className="space-y-4">
                    <div className="relative">
                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 left-0 z-50">
                                <EmojiPicker
                                    onEmojiClick={(emojiData) => {
                                        setContent(prev => prev + emojiData.emoji);
                                        setShowEmojiPicker(false);
                                    }}
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}

                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's on your mind? Share anonymously..."
                            className="min-h-[120px] resize-none bg-secondary/30 border-border focus:border-primary rounded-lg text-[15px] placeholder:text-muted-foreground"
                            maxLength={500}
                        />

                        {/* Emoji Button */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="absolute bottom-2 right-2 h-8 w-8 hover:bg-secondary"
                        >
                            <Smile className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex-1 mr-4">
                            <div className="flex gap-2">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                    placeholder="Add tags..."
                                    className="h-10 text-sm bg-secondary/30 border-border focus:border-primary rounded-lg"
                                    disabled={tags.length >= 5}
                                />
                                <Button
                                    onClick={handleAddTag}
                                    disabled={!tagInput.trim() || tags.length >= 5}
                                    variant="secondary"
                                    size="sm"
                                    className="h-10 px-4 bg-secondary hover:bg-secondary/80"
                                >
                                    Add
                                </Button>
                            </div>
                        </div>

                        <span className={`text-xs font-medium ${remainingChars < 50 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {remainingChars}
                        </span>
                    </div>

                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer pl-3 pr-2 py-1 rounded-md font-medium"
                                >
                                    #{tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-2 hover:text-destructive transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {successMessage && (
                        <div className="text-sm text-green-400 font-medium bg-green-500/10 backdrop-blur-2xl p-4 rounded-2xl border border-green-500/20 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting}
                        className="w-full h-11 font-bold text-base rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(233,30,99,0.3)] hover:shadow-[0_0_25px_rgba(233,30,99,0.5)]"
                    >
                        {isSubmitting ? 'Posting...' : 'Post Anonymously'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
