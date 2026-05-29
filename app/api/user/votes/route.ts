import { NextResponse } from 'next/server';
import { getUserIP } from '@/lib/ip';
import { prisma } from '@/lib/db/prisma';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * GET /api/user/votes
 * Returns all votes for the current user (identified by IP)
 * This allows syncing votes across browsers on the same system
 */
export async function GET() {
    try {
        const ip = await getUserIP();

        if (ip === 'unknown') {
            return NextResponse.json({ votes: {} });
        }

        // Fetch all votes for this IP
        const votes = await prisma.vote.findMany({
            where: { ip },
            select: {
                targetId: true,
                targetType: true,
                voteType: true,
            },
        });

        // Convert to the format expected by localStorage
        // Format: { "targetId-userId": "upvote" | "downvote" }
        const votesMap: Record<string, string> = {};
        votes.forEach(vote => {
            // We use IP as userId for the key to maintain compatibility
            votesMap[`${vote.targetId}-${ip}`] = vote.voteType;
        });

        return NextResponse.json({ votes: votesMap, ip });
    } catch (error) {
        console.error('Error fetching user votes:', error);
        return NextResponse.json({ votes: {}, error: 'Failed to fetch votes' }, { status: 500 });
    }
}
