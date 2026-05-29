import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: Request) {
    try {
        // Optional: Add basic security so only you or your cron service can hit this
        const authHeader = request.headers.get('authorization');
        
        // You can set a CRON_SECRET in your .env and pass it in the Authorization header: `Bearer <CRON_SECRET>`
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Run a simple query to keep the database connection alive
        await prisma.$queryRaw`SELECT 1`;
        
        return NextResponse.json({ status: 'ok', message: 'Database pinged successfully' });
    } catch (error) {
        console.error('Database ping failed:', error);
        return NextResponse.json({ status: 'error', message: 'Database ping failed' }, { status: 500 });
    }
}
