import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const admin = await prisma.admin.findUnique({
            where: { username: 'admin' },
        });

        if (!admin) {
            // Fallback for initial setup if seed didn't run or something is wrong
            // But for security, we should probably just fail. 
            // However, to avoid locking out, maybe we can check env var as backup?
            // The user requested "not include in the public repo", so env var is okay as backup, 
            // but DB is preferred.
            // For now, let's strictly use DB as we just seeded it.
            return NextResponse.json({ error: 'Admin user not found' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, admin.password);

        if (isValid) {
            const cookieStore = await cookies();
            cookieStore.set('admin_token', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
