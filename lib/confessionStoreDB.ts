import { Confession, Reply } from '@/types';
import { generateId } from './utils';
import { connectDB } from './db/mongodb';
import { ConfessionModel } from './models/Confession';
import { cacheGet, cacheSet, cacheDel } from './db/redis';

/**
 * MongoDB-backed confession store with Redis caching
 * This replaces the old JSON file-based storage
 */
class ConfessionStoreDB {
    private initialized = false;

    private async ensureConnection() {
        if (!this.initialized) {
            await connectDB();
            this.initialized = true;
        }
    }

    // ---------------------------------------------------------------------
    // Retrieval methods with caching
    // ---------------------------------------------------------------------
    async getAllConfessions(): Promise<Confession[]> {
        await this.ensureConnection();

        // Fetch all confessions directly from DB without caching
        const confessions = await ConfessionModel.find({ isReported: { $ne: true } })
            .sort({ timestamp: -1 })
            .lean()
            .exec();

        return confessions as Confession[];
    }

    async getConfession(id: string): Promise<Confession | null> {
        await this.ensureConnection();

        // Try cache first
        const cacheKey = `confession:${id}`;
        const cached = await cacheGet<Confession>(cacheKey);
        if (cached) {
            return cached;
        }

        // Fetch from DB
        const confession = await ConfessionModel.findOne({ id }).lean().exec();

        if (confession) {
            // Cache for 5 minutes
            await cacheSet(cacheKey, confession, 300);
        }

        return confession as Confession | null;
    }

    // ---------------------------------------------------------------------
    // Creation / mutation methods
    // ---------------------------------------------------------------------
    async createConfession(content: string, tags?: string[], ip?: string): Promise<Confession> {
        await this.ensureConnection();

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

        await ConfessionModel.create(confession);

        // Invalidate cache
        await cacheDel('confessions:all');
        await cacheDel('confessions:trending');

        return confession;
    }

    async addReply(confessionId: string, content: string): Promise<Reply | null> {
        await this.ensureConnection();

        const confession = await ConfessionModel.findOne({ id: confessionId });
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
        await confession.save();

        // Invalidate cache
        await cacheDel(`confession:${confessionId}`);
        await cacheDel('confessions:all');

        return reply;
    }

    async voteConfession(confessionId: string, voteType: 'upvote' | 'downvote'): Promise<boolean> {
        await this.ensureConnection();

        const confession = await ConfessionModel.findOne({ id: confessionId });
        if (!confession) return false;

        if (voteType === 'upvote') {
            confession.upvotes++;
        } else {
            confession.downvotes++;
        }

        await confession.save();

        // Invalidate cache
        await cacheDel(`confession:${confessionId}`);
        await cacheDel('confessions:all');
        await cacheDel('confessions:trending');

        return true;
    }

    async voteReply(confessionId: string, replyId: string, voteType: 'upvote' | 'downvote'): Promise<boolean> {
        await this.ensureConnection();

        const confession = await ConfessionModel.findOne({ id: confessionId });
        if (!confession) return false;

        const reply = confession.replies.find((r) => r.id === replyId);
        if (!reply) return false;

        if (voteType === 'upvote') {
            reply.upvotes++;
        } else {
            reply.downvotes++;
        }

        await confession.save();

        // Invalidate cache
        await cacheDel(`confession:${confessionId}`);
        await cacheDel('confessions:all');

        return true;
    }

    async removeVoteConfession(confessionId: string, voteType: 'upvote' | 'downvote'): Promise<boolean> {
        await this.ensureConnection();

        const confession = await ConfessionModel.findOne({ id: confessionId });
        if (!confession) return false;

        if (voteType === 'upvote' && confession.upvotes > 0) {
            confession.upvotes--;
        } else if (voteType === 'downvote' && confession.downvotes > 0) {
            confession.downvotes--;
        }

        await confession.save();

        // Invalidate cache
        await cacheDel(`confession:${confessionId}`);
        await cacheDel('confessions:all');
        await cacheDel('confessions:trending');

        return true;
    }

    // ---------------------------------------------------------------------
    // Reporting & moderation
    // ---------------------------------------------------------------------
    async reportConfession(confessionId: string): Promise<boolean> {
        await this.ensureConnection();

        const confession = await ConfessionModel.findOne({ id: confessionId });
        if (!confession) return false;

        confession.isReported = true;
        confession.reportCount = (confession.reportCount || 0) + 1;

        // Auto-delete if reported 5+ times
        if (confession.reportCount >= 5) {
            await ConfessionModel.deleteOne({ id: confessionId });
        } else {
            await confession.save();
        }

        // Invalidate cache
        await cacheDel(`confession:${confessionId}`);
        await cacheDel('confessions:all');

        return true;
    }

    async getTrendingConfessions(limit: number = 10): Promise<Confession[]> {
        await this.ensureConnection();

        // Try cache first
        const cacheKey = `confessions:trending:${limit}`;
        const cached = await cacheGet<Confession[]>(cacheKey);
        if (cached) {
            return cached;
        }

        // Fetch from DB
        const confessions = await ConfessionModel.find({ isReported: { $ne: true } })
            .sort({ upvotes: -1, downvotes: 1, timestamp: -1 })
            .limit(limit)
            .lean()
            .exec();

        // Cache for 2 minutes
        await cacheSet(cacheKey, confessions, 120);

        return confessions as Confession[];
    }

    async searchConfessions(query: string): Promise<Confession[]> {
        await this.ensureConnection();

        const lower = query.toLowerCase();
        const confessions = await ConfessionModel.find({
            $or: [
                { content: { $regex: lower, $options: 'i' } },
                { tags: { $regex: lower, $options: 'i' } },
            ],
            isReported: { $ne: true },
        })
            .sort({ timestamp: -1 })
            .lean()
            .exec();

        return confessions as Confession[];
    }

    // ---------------------------------------------------------------------
    // Admin utilities
    // ---------------------------------------------------------------------
    async deleteConfession(id: string): Promise<boolean> {
        await this.ensureConnection();

        const result = await ConfessionModel.deleteOne({ id });

        // Invalidate cache
        await cacheDel(`confession:${id}`);
        await cacheDel('confessions:all');
        await cacheDel('confessions:trending');

        return result.deletedCount > 0;
    }

    async deleteReply(confessionId: string, replyId: string): Promise<boolean> {
        await this.ensureConnection();

        const confession = await ConfessionModel.findOne({ id: confessionId });
        if (!confession) return false;

        const initialLength = confession.replies.length;
        confession.replies = confession.replies.filter((r) => r.id !== replyId);

        if (confession.replies.length < initialLength) {
            await confession.save();

            // Invalidate cache
            await cacheDel(`confession:${confessionId}`);
            await cacheDel('confessions:all');

            return true;
        }

        return false;
    }

    async getReportedConfessions(): Promise<Confession[]> {
        await this.ensureConnection();

        const confessions = await ConfessionModel.find({
            $or: [{ isReported: true }, { reportCount: { $gt: 0 } }],
        })
            .sort({ reportCount: -1 })
            .lean()
            .exec();

        return confessions as Confession[];
    }

    // ---------------------------------------------------------------------
    // Migration helper
    // ---------------------------------------------------------------------
    async seedFromJSON(confessions: Confession[]): Promise<void> {
        await this.ensureConnection();

        // Only seed if database is empty
        const count = await ConfessionModel.countDocuments();
        if (count === 0 && confessions.length > 0) {
            console.log(`🌱 Seeding ${confessions.length} confessions from JSON...`);
            await ConfessionModel.insertMany(confessions);
            console.log('✅ Seeding complete');
        }
    }
}

export const confessionStoreDB = new ConfessionStoreDB();
