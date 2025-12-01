import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Generate anonymous names
const adjectives = [
    'Silent', 'Mysterious', 'Curious', 'Brave', 'Wise', 'Swift', 'Bold', 'Calm',
    'Clever', 'Daring', 'Eager', 'Fierce', 'Gentle', 'Happy', 'Jolly', 'Kind',
    'Lively', 'Mighty', 'Noble', 'Proud', 'Quick', 'Quiet', 'Rapid', 'Sharp'
];

const nouns = [
    'Panda', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk',
    'Owl', 'Raven', 'Phoenix', 'Dragon', 'Falcon', 'Leopard', 'Panther',
    'Jaguar', 'Cheetah', 'Lynx', 'Otter', 'Dolphin', 'Whale', 'Shark'
];

export const generateAnonymousName = (): string => {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999);
    return `${adjective}${noun}${number}`;
};

// Generate unique IDs
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Format timestamp
export const formatTimestamp = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) return 'Just now';
    try {
        return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (e) {
        return 'Just now';
    }
};

// Calculate vote score
export const calculateVoteScore = (upvotes: number, downvotes: number): number => {
    return upvotes - downvotes;
};

// Validate content
export const validateContent = (content: string): { valid: boolean; error?: string } => {
    if (!content || content.trim().length === 0) {
        return { valid: false, error: 'Content cannot be empty' };
    }

    if (content.length > 500) {
        return { valid: false, error: 'Content must be less than 500 characters' };
    }

    // Basic profanity check (can be enhanced)
    const profanityPattern = /\b(spam|test123)\b/gi;
    if (profanityPattern.test(content)) {
        return { valid: false, error: 'Content contains inappropriate words' };
    }

    return { valid: true };
};

// Get random color for user avatar
export const getRandomColor = (): string => {
    const colors = [
        '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b',
        '#ef4444', '#6366f1', '#8b5cf6', '#d946ef', '#06b6d4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

// Check if user has voted
export const hasUserVoted = (
    targetId: string,
    userId: string,
    voteType: 'upvote' | 'downvote'
): boolean => {
    if (typeof window === 'undefined') return false;
    const votes = JSON.parse(localStorage.getItem('userVotes') || '{}');
    return votes[`${targetId}-${userId}`] === voteType;
};

// Save user vote
export const saveUserVote = (
    targetId: string,
    userId: string,
    voteType: 'upvote' | 'downvote'
): void => {
    if (typeof window === 'undefined') return;
    const votes = JSON.parse(localStorage.getItem('userVotes') || '{}');
    votes[`${targetId}-${userId}`] = voteType;
    localStorage.setItem('userVotes', JSON.stringify(votes));
};

// Remove user vote
export const removeUserVote = (targetId: string, userId: string): void => {
    if (typeof window === 'undefined') return;
    const votes = JSON.parse(localStorage.getItem('userVotes') || '{}');
    delete votes[`${targetId}-${userId}`];
    localStorage.setItem('userVotes', JSON.stringify(votes));
};

// Get or create user ID
export const getUserId = (): string => {
    if (typeof window === 'undefined') return 'server-user';
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = generateId();
        localStorage.setItem('userId', userId);
    }
    return userId;
};

// Get or create anonymous name
export const getAnonymousName = (): string => {
    if (typeof window === 'undefined') return 'AnonymousUser';
    let name = localStorage.getItem('anonymousName');
    if (!name) {
        name = generateAnonymousName();
        localStorage.setItem('anonymousName', name);
    }
    return name;
};
