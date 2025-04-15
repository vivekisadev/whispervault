import { NextRequest, NextResponse } from 'next/server';
import { blockIP, unblockIP, isIPBlocked } from '@/lib/db/redis';

export async function POST(request: NextRequest) {
    try {
        const { action, ip, reason } = await request.json();

        if (!ip) {
            return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
        }

        if (action === 'block') {
            const blocked = await blockIP(ip, reason || 'Admin action');
            return NextResponse.json({
                success: blocked,
                message: blocked ? 'IP blocked successfully' : 'Failed to block IP'
            });
        } else if (action === 'unblock') {
            const unblocked = await unblockIP(ip);
            return NextResponse.json({
                success: unblocked,
                message: unblocked ? 'IP unblocked successfully' : 'Failed to unblock IP'
            });
        } else if (action === 'check') {
            const blocked = await isIPBlocked(ip);
            return NextResponse.json({ blocked });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('IP blocking error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ip = searchParams.get('ip');

        if (!ip) {
            return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
        }

        const blocked = await isIPBlocked(ip);
        return NextResponse.json({ blocked });
    } catch (error) {
        console.error('IP check error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
