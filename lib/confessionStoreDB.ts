import { Confession, Reply } from '@/types';
import { generateId } from './utils';
import { prisma } from './db/prisma';
import { cacheGet, cacheSet, cacheDel } from './db/redis';

/**
 * Prisma/PostgreSQL-backed confession store with Redis caching
 */
class ConfessionStoreDB {

    // In-memory fallback
    private fallbackConfessions: Confession[] = [];

    // Helper to map DB result to App type
    private mapConfession(c: any): Confession {
        return {
            id: c.id,
            content: c.content,
            timestamp: c.timestamp instanceof Date ? c.timestamp.getTime() : new Date(c.timestamp).getTime(),
            upvotes: c.upvotes,
            downvotes: c.downvotes,
            replies: c.replies ? c.replies.map((r: any) => this.mapReply(r)) : [],
            tags: c.tags,
            isReported: c.isReported,
            reportCount: c.reportCount,
            ip: c.ip || undefined,
        };
    }

    private mapReply(r: any): Reply {
        return {
            id: r.id,
            confessionId: r.confessionId,
            content: r.content,
            timestamp: r.timestamp instanceof Date ? r.timestamp.getTime() : new Date(r.timestamp).getTime(),
            isReported: r.isReported,
            reportCount: r.reportCount,
        };
    }

    // ---------------------------------------------------------------------
    // Retrieval methods with caching
    // ---------------------------------------------------------------------
    async getAllConfessions(): Promise<Confession[]> {
        try {
            // Fetch all confessions directly from DB without caching
            const confessions = await prisma.confession.findMany({
                where: { isReported: false },
                orderBy: { timestamp: 'desc' },
                include: { replies: true },
            });

            return confessions.map(c => this.mapConfession(c));
        } catch (error) {
            console.error('Database connection failed, using in-memory fallback:', error);
            return this.fallbackConfessions;
        }
    }

    async getConfession(id: string): Promise<Confession | null> {
        // Try cache first
        const cacheKey = `confession:${id}`;
        const cached = await cacheGet<Confession>(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            // Fetch from DB
            const confession = await prisma.confession.findUnique({
                where: { id },
                include: { replies: true },
            });

            if (confession) {
                const mapped = this.mapConfession(confession);
                // Cache for 5 minutes
                await cacheSet(cacheKey, mapped, 300);
                return mapped;
            }
        } catch (error) {
            console.error('Database error in getConfession:', error);
            return this.fallbackConfessions.find(c => c.id === id) || null;
        }

        return null;
    }

    // ---------------------------------------------------------------------
    // Creation / mutation methods
    // ---------------------------------------------------------------------
    async createConfession(content: string, tags?: string[], ip?: string): Promise<Confession> {
        try {
            const confession = await prisma.confession.create({
                data: {
                    content,
                    tags: tags || [],
                    ip,
                    timestamp: new Date(),
                },
                include: { replies: true },
            });

            // Invalidate cache
            await cacheDel('confessions:all');
            await cacheDel('confessions:trending');

            return this.mapConfession(confession);
        } catch (error) {
            console.error('Database error in createConfession, using fallback:', error);

            const newConfession: Confession = {
                id: generateId(),
                content,
                tags: tags || [],
                timestamp: Date.now(),
                upvotes: 0,
                downvotes: 0,
                replies: [],
                isReported: false,
                reportCount: 0,
                ip
            };

            this.fallbackConfessions.unshift(newConfession);
            return newConfession;
        }
    }

    async addReply(confessionId: string, content: string): Promise<Reply | null> {
        try {
            const reply = await prisma.reply.create({
                data: {
                    confessionId,
                    content,
                    timestamp: new Date(),
                },
            });

            // Invalidate cache
            await cacheDel(`confession:${confessionId}`);
            await cacheDel('confessions:all');

            return this.mapReply(reply);
        } catch (e) {
            return null;
        }
    }

    async voteConfession(confessionId: string, voteType: 'upvote' | 'downvote'): Promise<boolean> {
        try {
            await prisma.confession.update({
                where: { id: confessionId },
                data: {
                    [voteType === 'upvote' ? 'upvotes' : 'downvotes']: {
                        increment: 1,
                    },
                },
            });

            // Invalidate cache
            await cacheDel(`confession:${confessionId}`);
            await cacheDel('confessions:all');
            await cacheDel('confessions:trending');

            return true;
        } catch (e) {
            return false;
        }
    }



    async removeVoteConfession(confessionId: string, voteType: 'upvote' | 'downvote'): Promise<boolean> {
        try {
            // We need to check if value > 0 first, but atomic decrement is safer. 
            // Prisma doesn't support 'decrement if > 0' natively in one query easily without raw SQL or check.
            // For simplicity, we'll just decrement. If it goes below 0, we can fix it or ignore.
            // Better: fetch first.
            const c = await prisma.confession.findUnique({ where: { id: confessionId }, select: { upvotes: true, downvotes: true } });
            if (!c) return false;

            if (voteType === 'upvote' && c.upvotes > 0) {
                await prisma.confession.update({ where: { id: confessionId }, data: { upvotes: { decrement: 1 } } });
            } else if (voteType === 'downvote' && c.downvotes > 0) {
                await prisma.confession.update({ where: { id: confessionId }, data: { downvotes: { decrement: 1 } } });
            }

            // Invalidate cache
            await cacheDel(`confession:${confessionId}`);
            await cacheDel('confessions:all');
            await cacheDel('confessions:trending');

            return true;
        } catch (e) {
            return false;
        }
    }

    // ---------------------------------------------------------------------
    // Reporting & moderation
    // ---------------------------------------------------------------------
    async reportConfession(confessionId: string): Promise<boolean> {
        try {
            const c = await prisma.confession.update({
                where: { id: confessionId },
                data: {
                    // isReported: true, // Don't hide immediately
                    reportCount: { increment: 1 },
                },
            });

            // Auto-delete if reported 5+ times - DISABLED per user request
            // if (c.reportCount >= 5) {
            //     await prisma.confession.delete({ where: { id: confessionId } });
            // }

            // Invalidate cache
            await cacheDel(`confession:${confessionId}`);
            await cacheDel('confessions:all');

            return true;
        } catch (e) {
            return false;
        }
    }

    async reportReply(replyId: string): Promise<boolean> {
        try {
            const r = await prisma.reply.update({
                where: { id: replyId },
                data: {
                    reportCount: { increment: 1 },
                    isReported: true,
                },
            });

            // Invalidate cache
            await cacheDel(`confession:${r.confessionId}`);
            await cacheDel('confessions:all');

            return true;
        } catch (e) {
            return false;
        }
    }

    async getTrendingConfessions(limit: number = 10): Promise<Confession[]> {
        // Try cache first
        const cacheKey = `confessions:trending:${limit}`;
        const cached = await cacheGet<Confession[]>(cacheKey);
        if (cached) {
            return cached;
        }

        // Fetch from DB
        const confessions = await prisma.confession.findMany({
            where: { isReported: false },
            orderBy: [
                { upvotes: 'desc' },
                { downvotes: 'asc' },
                { timestamp: 'desc' },
            ],
            take: limit,
            include: { replies: true },
        });

        const mapped = confessions.map(c => this.mapConfession(c));

        // Cache for 2 minutes
        await cacheSet(cacheKey, mapped, 120);

        return mapped;
    }

    async searchConfessions(query: string): Promise<Confession[]> {
        const confessions = await prisma.confession.findMany({
            where: {
                isReported: false,
                OR: [
                    { content: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query } }, // Exact match for tags in array
                    // For partial tag match, we might need raw query or just rely on content.
                    // Prisma 'has' is for exact element match in array.
                ],
            },
            orderBy: { timestamp: 'desc' },
            include: { replies: true },
        });

        return confessions.map(c => this.mapConfession(c));
    }

    // ---------------------------------------------------------------------
    // Admin utilities
    // ---------------------------------------------------------------------
    async deleteConfession(id: string): Promise<boolean> {
        try {
            await prisma.confession.delete({ where: { id } });

            // Invalidate cache
            await cacheDel(`confession:${id}`);
            await cacheDel('confessions:all');
            await cacheDel('confessions:trending');

            return true;
        } catch (e) {
            return false;
        }
    }

    async deleteReply(confessionId: string, replyId: string): Promise<boolean> {
        try {
            await prisma.reply.delete({ where: { id: replyId } });

            // Invalidate cache
            await cacheDel(`confession:${confessionId}`);
            await cacheDel('confessions:all');

            return true;
        } catch (e) {
            return false;
        }
    }

    async getReportedConfessions(): Promise<Confession[]> {
        const confessions = await prisma.confession.findMany({
            where: {
                OR: [
                    { isReported: true },
                    { reportCount: { gt: 0 } },
                    {
                        replies: {
                            some: {
                                OR: [
                                    { isReported: true },
                                    { reportCount: { gt: 0 } }
                                ]
                            }
                        }
                    }
                ],
            },
            orderBy: { reportCount: 'desc' },
            include: { replies: true },
        });

        return confessions.map(c => this.mapConfession(c));
    }

    async dismissReport(id: string): Promise<boolean> {
        try {
            await prisma.confession.update({
                where: { id },
                data: {
                    isReported: false,
                    reportCount: 0,
                },
            });

            // Invalidate cache
            await cacheDel(`confession:${id}`);
            await cacheDel('confessions:all');
            await cacheDel('confessions:trending');

            return true;
        } catch (e) {
            return false;
        }
    }

    // ---------------------------------------------------------------------
    // Migration helper
    // ---------------------------------------------------------------------
    async seedFromJSON(confessions: Confession[]): Promise<void> {
        // Only seed if database is empty
        const count = await prisma.confession.count();
        if (count === 0 && confessions.length > 0) {
            console.log(`🌱 Seeding ${confessions.length} confessions from JSON...`);

            for (const c of confessions) {
                await prisma.confession.create({
                    data: {
                        id: c.id,
                        content: c.content,
                        timestamp: new Date(c.timestamp),
                        upvotes: c.upvotes,
                        downvotes: c.downvotes,
                        tags: c.tags || [],
                        isReported: c.isReported || false,
                        reportCount: c.reportCount || 0,
                        ip: c.ip,
                        replies: {
                            create: c.replies.map(r => ({
                                id: r.id,
                                content: r.content,
                                timestamp: new Date(r.timestamp),
                            })),
                        },
                    },
                });
            }
            console.log('✅ Seeding complete');
        }
    }
}

export const confessionStoreDB = new ConfessionStoreDB();
