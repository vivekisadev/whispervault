import { NextRequest, NextResponse } from 'next/server';
import { confessionStoreDB as confessionStore } from '@/lib/confessionStoreDB';
import { getUserIP } from '@/lib/ip';
import { prisma } from '@/lib/db/prisma';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Security: Check if request is from a real browser
function isBrowserRequest(request: NextRequest): boolean {
    const userAgent = request.headers.get('user-agent') || '';
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Check for common browser user agents
    const browserPatterns = [
        /Mozilla/i,
        /Chrome/i,
        /Safari/i,
        /Firefox/i,
        /Edge/i,
        /Opera/i
    ];

    const hasBrowserUA = browserPatterns.some(pattern => pattern.test(userAgent));

    // Check if it's a known bot/tool
    const botPatterns = [
        /curl/i,
        /postman/i,
        /insomnia/i,
        /python/i,
        /java/i,
        /axios/i,
        /fetch/i,
        /node-fetch/i,
        /got/i,
        /request/i,
        /http-client/i,
        /bot/i,
        /crawler/i,
        /spider/i
    ];

    const isBot = botPatterns.some(pattern => pattern.test(userAgent));

    // Must have valid origin or referer from our domain
    const host = request.headers.get('host') || '';
    const hasValidOrigin = Boolean(
        (origin && origin.includes(host)) ||
        (referer && referer.includes(host))
    );

    return hasBrowserUA && !isBot && hasValidOrigin;
}

// Rate limiting: Max 5 votes per IP per minute
function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const limit = rateLimitMap.get(ip);

    if (!limit || now > limit.resetTime) {
        // Reset or create new limit
        rateLimitMap.set(ip, {
            count: 1,
            resetTime: now + 60000 // 1 minute
        });
        return true;
    }

    if (limit.count >= 5) {
        return false; // Rate limit exceeded
    }

    limit.count++;
    return true;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, limit] of rateLimitMap.entries()) {
        if (now > limit.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 300000);

// POST - Vote on confession or reply
export async function POST(request: NextRequest) {
    try {
        // Security Check 1: Verify it's a browser request
        if (!isBrowserRequest(request)) {
            return NextResponse.json(
                { error: 'Invalid request source. Please use the website.' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { targetId, targetType, voteType, action } = body;

        if (!targetId || !targetType || !voteType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get user's IP for tracking
        const ip = await getUserIP();

        // Security Check 2: Rate limiting
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a minute.' },
                { status: 429 }
            );
        }

        let success = false;

        if (action === 'remove') {
            // Remove vote from database
            await prisma.vote.deleteMany({
                where: {
                    ip,
                    targetId,
                    targetType,
                },
            });

            // Remove vote from confession/reply counts
            if (targetType === 'confession') {
                success = await confessionStore.removeVoteConfession(targetId, voteType);
            }
        } else {
            // Check if user already voted differently
            const existingVote = await prisma.vote.findUnique({
                where: {
                    ip_targetId_targetType: {
                        ip,
                        targetId,
                        targetType,
                    },
                },
            });

            // If switching vote type, remove old vote first
            if (existingVote && existingVote.voteType !== voteType) {
                await confessionStore.removeVoteConfession(targetId, existingVote.voteType as 'upvote' | 'downvote');
            }

            // Upsert the vote (create or update)
            await prisma.vote.upsert({
                where: {
                    ip_targetId_targetType: {
                        ip,
                        targetId,
                        targetType,
                    },
                },
                update: {
                    voteType,
                },
                create: {
                    ip,
                    targetId,
                    targetType,
                    voteType,
                },
            });

            // Add vote to confession/reply counts
            if (targetType === 'confession') {
                success = await confessionStore.voteConfession(targetId, voteType);
            }
        }

        if (!success && targetType === 'confession') {
            return NextResponse.json(
                { error: 'Vote failed' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Vote error:', error);
        return NextResponse.json(
            { error: 'Failed to process vote' },
            { status: 500 }
        );
    }
}
