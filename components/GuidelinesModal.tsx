'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Shield, Heart, UserX, AlertTriangle } from 'lucide-react';

export default function GuidelinesModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        setIsOpen(true);
    }, []);

    const handleAccept = () => {
        setIsOpen(false);
    };

    if (!isMounted || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="p-6 pb-4 border-b border-border bg-secondary/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold text-foreground">Community Guidelines</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Welcome to AnonyChat! Please read and accept our rules to continue.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
                        <Heart className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground text-sm">Be Respectful</h4>
                            <p className="text-xs text-muted-foreground">Treat everyone with kindness. Harassment and bullying are strictly prohibited.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
                        <UserX className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground text-sm">Stay Anonymous</h4>
                            <p className="text-xs text-muted-foreground">Do not share personal information (names, addresses, phone numbers) of yourself or others.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-semibold text-foreground text-sm">No Hate Speech</h4>
                            <p className="text-xs text-muted-foreground">Content promoting violence, discrimination, or illegal activities will be removed.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-2">
                    <Button
                        onClick={handleAccept}
                        className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base rounded-lg"
                    >
                        I Agree & Continue
                    </Button>
                </div>
            </div>
        </div>
    );
}
