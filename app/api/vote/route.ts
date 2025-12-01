import { NextRequest, NextResponse } from 'next/server';
import { confessionStoreDB as confessionStore } from '@/lib/confessionStoreDB';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';

// POST - Vote on confession or reply
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetId, targetType, voteType, action } = body;

        if (!targetId || !targetType || !voteType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        let success = false;

        if (action === 'remove') {
            // Remove vote
            if (targetType === 'confession') {
                success = await confessionStore.removeVoteConfession(targetId, voteType);
            }
        } else {
            // Add vote
            if (targetType === 'confession') {
                success = await confessionStore.voteConfession(targetId, voteType);
            }
        }

        if (!success) {
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
