import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { confessionStoreDB as confessionStore } from '@/lib/confessionStoreDB';
import { blockIP, unblockIP } from '@/lib/db/redis';

// Force Node.js runtime (required for Mongoose)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_token');

        if (!token || token.value !== 'true') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, id, confessionId, replyId, ip } = body;

        switch (action) {
            case 'delete_confession':
                if (id) {
                    await confessionStore.deleteConfession(id);
                    return NextResponse.json({ success: true });
                }
                break;

            case 'delete_reply':
                if (confessionId && replyId) {
                    await confessionStore.deleteReply(confessionId, replyId);
                    return NextResponse.json({ success: true });
                }
                break;

            case 'block_ip':
                if (ip) {
                    const blocked = await blockIP(ip, 'Admin action');
                    return NextResponse.json({ success: blocked });
                }
                break;

            case 'unblock_ip':
                if (ip) {
                    const unblocked = await unblockIP(ip);
                    return NextResponse.json({ success: unblocked });
                }
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    } catch (error) {
        console.error('Admin action error:', error);
        return NextResponse.json(
            { error: 'Failed to perform admin action' },
            { status: 500 }
        );
    }
}
