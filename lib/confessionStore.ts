import { Confession, Reply } from '@/types';
import { generateId } from './utils';
import { loadConfessions, saveConfessions } from './dataStore';

/**
 * In‑memory confession store backed by a JSON file.
 * All operations mutate the in‑memory Map and then persist to disk.
 * This makes the data visible to every user (global) without a DB.
 */
class ConfessionStore {
    private confessions: Map<string, Confession> = new Map();

    constructor() {
        // Load any persisted confessions on startup
        const persisted = loadConfessions();
        persisted.forEach(conf => this.confessions.set(conf.id, conf));
    }

    /** Persist the current state to the JSON file */
    private persist() {
        saveConfessions(this.getAllConfessions());
    }

    // ---------------------------------------------------------------------
    // Retrieval methods
    // ---------------------------------------------------------------------
    getAllConfessions(): Confession[] {
        return Array.from(this.confessions.values()).sort((a, b) => b.timestamp - a.timestamp);
    }

    getConfession(id: string): Confession | undefined {
        return this.confessions.get(id);
    }

    // ---------------------------------------------------------------------
    // Creation / mutation methods
    // ---------------------------------------------------------------------
    createConfession(content: string, tags?: string[], ip?: string): Confession {
        const confession: Confession = {
            id: generateId(),
            content,
            timestamp: Date.now(),
            upvotes: 0,
            downvotes: 0,
            replies: [],
            tags,
            isReported: false,
            reportCount: 0,
            ip,
        };
        this.confessions.set(confession.id, confession);
        this.persist();
        return confession;
    }

    addReply(confessionId: string, content: string): Reply | null {
        const confession = this.confessions.get(confessionId);
        if (!confession) return null;
        const reply: Reply = {
            id: generateId(),
            confessionId,
            content,
            timestamp: Date.now(),
            upvotes: 0,
            downvotes: 0,
        };
        confession.replies.push(reply);
        this.persist();
        return reply;
    }

    voteConfession(confessionId: string, voteType: 'upvote' | 'downvote'): boolean {
        const confession = this.confessions.get(confessionId);
        if (!confession) return false;
        if (voteType === 'upvote') confession.upvotes++;
        else confession.downvotes++;
        this.persist();
        return true;
    }

    voteReply(confessionId: string, replyId: string, voteType: 'upvote' | 'downvote'): boolean {
        const confession = this.confessions.get(confessionId);
        if (!confession) return false;
        const reply = confession.replies.find(r => r.id === replyId);
        if (!reply) return false;
        if (voteType === 'upvote') reply.upvotes++;
        else reply.downvotes++;
        this.persist();
        return true;
    }

    removeVoteConfession(confessionId: string, voteType: 'upvote' | 'downvote'): boolean {
        const confession = this.confessions.get(confessionId);
        if (!confession) return false;
        if (voteType === 'upvote' && confession.upvotes > 0) confession.upvotes--;
        else if (voteType === 'downvote' && confession.downvotes > 0) confession.downvotes--;
        this.persist();
        return true;
    }

    // ---------------------------------------------------------------------
    // Reporting & moderation
    // ---------------------------------------------------------------------
    reportConfession(confessionId: string): boolean {
        const confession = this.confessions.get(confessionId);
        if (!confession) return false;
        confession.isReported = true;
        confession.reportCount = (confession.reportCount || 0) + 1;
        if (confession.reportCount >= 5) {
            this.confessions.delete(confessionId);
        }
        this.persist();
        return true;
    }

    getTrendingConfessions(limit: number = 10): Confession[] {
        return Array.from(this.confessions.values())
            .sort((a, b) => {
                const scoreA = a.upvotes - a.downvotes;
                const scoreB = b.upvotes - b.downvotes;
                return scoreB - scoreA;
            })
            .slice(0, limit);
    }

    searchConfessions(query: string): Confession[] {
        const lower = query.toLowerCase();
        return Array.from(this.confessions.values())
            .filter(c => c.content.toLowerCase().includes(lower) || c.tags?.some(t => t.toLowerCase().includes(lower)))
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    // ---------------------------------------------------------------------
    // Admin utilities
    // ---------------------------------------------------------------------
    deleteConfession(id: string): boolean {
        const removed = this.confessions.delete(id);
        if (removed) this.persist();
        return removed;
    }

    deleteReply(confessionId: string, replyId: string): boolean {
        const confession = this.confessions.get(confessionId);
        if (!confession) return false;
        const initial = confession.replies.length;
        confession.replies = confession.replies.filter(r => r.id !== replyId);
        const changed = confession.replies.length < initial;
        if (changed) this.persist();
        return changed;
    }

    getReportedConfessions(): Confession[] {
        return Array.from(this.confessions.values())
            .filter(c => c.isReported || (c.reportCount && c.reportCount > 0))
            .sort((a, b) => (b.reportCount || 0) - (a.reportCount || 0));
    }
}

export const confessionStore = new ConfessionStore();

// Seed sample data only on first run (empty store)
if (confessionStore.getAllConfessions().length === 0) {
    confessionStore.createConfession('I have a crush on my classmate but I\'m too shy to talk to them 😳', ['crush', 'confession']);
    confessionStore.createConfession('Sometimes I pretend to understand in lectures but I\'m completely lost', ['college', 'relatable']);
    confessionStore.createConfession('I think the campus food is actually pretty good, don\'t @ me', ['unpopular-opinion', 'food']);
}
