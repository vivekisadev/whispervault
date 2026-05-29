export interface Confession {
    id: string;
    content: string;
    timestamp: number;
    upvotes: number;
    downvotes: number;
    replies: Reply[];
    tags?: string[];
    isReported?: boolean;
    reportCount?: number;
    ip?: string;
}

export interface Reply {
    id: string;
    confessionId: string;
    content: string;
    timestamp: number;
    isReported?: boolean;
    reportCount?: number;
}

export interface ChatMessage {
    id: string;
    content: string;
    timestamp: number;
    userId: string;
    roomId: string;
    image?: string;
    audio?: string;
    reaction?: string;
    isReported?: boolean;
    replyTo?: {
        id: string;
        content: string;
        username: string;
        audio?: string;
        image?: string;
    }
}

export interface ChatRoom {
    id: string;
    users: string[];
    messages: ChatMessage[];
    createdAt: number;
}

export interface User {
    id: string;
    anonymousName: string;
    joinedAt: number;
    currentRoom?: string;
}

export interface Report {
    id: string;
    targetId: string; // confession or message id
    targetType: 'confession' | 'message';
    reason: string;
    timestamp: number;
    reporterId: string;
}

export interface VoteAction {
    targetId: string;
    targetType: 'confession' | 'reply';
    voteType: 'upvote' | 'downvote';
    userId: string;
}
