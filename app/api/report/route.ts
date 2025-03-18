import { NextRequest, NextResponse } from 'next/server';
import { confessionStoreDB as confessionStore } from '@/lib/confessionStoreDB';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';

// POST - Report confession or message
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetId, targetType, reason } = body;

        if (!targetId || !targetType || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        let success = false;

        if (targetType === 'confession') {
            success = await confessionStore.reportConfession(targetId);
        }

        if (!success) {
            return NextResponse.json(
                { error: 'Report failed' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Report submitted successfully. Our team will review it.'
        });
    } catch (error) {
        console.error('Report error:', error);
        return NextResponse.json(
            { error: 'Failed to submit report' },
            { status: 500 }
        );
    }
}
