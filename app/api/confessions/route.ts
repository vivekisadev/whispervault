import { NextRequest, NextResponse } from 'next/server';
import { confessionStoreDB as confessionStore } from '@/lib/confessionStoreDB';
import { isIPBlocked } from '@/lib/db/redis';
import { validateContent } from '@/lib/utils';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';

// GET - Fetch all confessions
export async function GET(request: NextRequest) {
    try {
        console.log('📥 GET /api/confessions - Request received');
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const query = searchParams.get('query');

        console.log(`📊 Query params - type: ${type}, query: ${query}`);

        let confessions;

        if (type === 'trending') {
            console.log('🔥 Fetching trending confessions...');
            confessions = await confessionStore.getTrendingConfessions();
        } else if (query) {
            console.log(`🔍 Searching confessions for: ${query}`);
            confessions = await confessionStore.searchConfessions(query);
        } else {
            console.log('📋 Fetching all confessions...');
            confessions = await confessionStore.getAllConfessions();
        }

        console.log(`✅ Found ${confessions.length} confessions`);

        // Sanitize confessions (remove IP)
        const sanitizedConfessions = confessions.map(({ ip, ...rest }) => rest);
        console.log('🎉 Returning confessions to client');
        return NextResponse.json({ confessions: sanitizedConfessions });
    } catch (error) {
        console.error('❌ GET confessions error:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json({ error: 'Failed to fetch confessions' }, { status: 500 });
    }
}

// POST - Create new confession
export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1';

        // Check if IP is blocked (Redis-based)
        const blocked = await isIPBlocked(ip);
        if (blocked) {
            return NextResponse.json({ error: 'You are banned from posting.' }, { status: 403 });
        }

        const body = await request.json();
        const { content, tags } = body;

        // Validate content
        const validation = validateContent(content);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const confession = await confessionStore.createConfession(content, tags, ip);
        return NextResponse.json({ confession }, { status: 201 });
    } catch (error) {
        console.error('POST confession error:', error);
        return NextResponse.json({ error: 'Failed to create confession' }, { status: 500 });
    }
}
