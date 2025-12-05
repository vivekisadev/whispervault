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
// Format timestamp for chat (e.g., 10:30 AM)
export const formatChatTimestamp = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) return '';
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    }).format(new Date(timestamp));
};

// Format relative time for confessions (e.g., 5 mins ago)
export const formatRelativeTime = (timestamp: number): string => {
    if (!timestamp || isNaN(timestamp)) return 'Just now';
    try {
        return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (e) {
        return 'Just now';
    }
};

// Legacy alias if needed, or we can just replace usages
export const formatTimestamp = formatRelativeTime;

// Calculate vote score
export const calculateVoteScore = (upvotes: number, downvotes: number): number => {
    return upvotes - downvotes;
};

// Validate content
export const validateContent = (content: string, maxLength: number = 500): { valid: boolean; error?: string } => {
    if (!content || content.trim().length === 0) {
        return { valid: false, error: 'Content cannot be empty' };
    }

    if (content.length > maxLength) {
        return { valid: false, error: `Content must be less than ${maxLength} characters` };
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

// Get or create user ID (uses IP from server for cross-browser persistence)
export const getUserId = (): string => {
    if (typeof window === 'undefined') return 'server-user';

    // Use IP from server if available (set during vote sync)
    // This ensures vote keys match between client and server
    let userId = localStorage.getItem('userIP');

    // Fallback to random ID if IP not yet available
    if (!userId) {
        userId = localStorage.getItem('userId');
        if (!userId) {
            userId = generateId();
            localStorage.setItem('userId', userId);
        }
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

// Sync votes from server (IP-based) to localStorage
// This enables cross-browser persistence
export const syncVotesFromServer = async (): Promise<void> => {
    if (typeof window === 'undefined') return;

    try {
        const response = await fetch('/api/user/votes');
        const data = await response.json();

        if (data.votes) {
            // Server votes (IP-based) should override local votes for cross-browser persistence
            // This ensures that votes persist across different browsers on the same system
            const localVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
            const mergedVotes = { ...localVotes, ...data.votes };
            localStorage.setItem('userVotes', JSON.stringify(mergedVotes));

            // Store the IP for future use
            if (data.ip) {
                localStorage.setItem('userIP', data.ip);
            }
        }
    } catch (error) {
        console.error('Failed to sync votes from server:', error);
    }
};
