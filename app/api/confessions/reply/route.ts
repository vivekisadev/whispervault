import { NextRequest, NextResponse } from 'next/server';
import { confessionStoreDB as confessionStore } from '@/lib/confessionStoreDB';

import { validateContent } from '@/lib/utils';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';

// POST - Add reply to confession
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { confessionId, content } = body;

        if (!confessionId || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const validation = validateContent(content, 300); // Limit replies to 300 chars
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const reply = await confessionStore.addReply(confessionId, content);

        if (!reply) {
            return NextResponse.json(
                { error: 'Confession not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ reply }, { status: 201 });
    } catch (error) {
        console.error('Add reply error:', error);
        return NextResponse.json(
            { error: 'Failed to add reply' },
            { status: 500 }
        );
    }
}
