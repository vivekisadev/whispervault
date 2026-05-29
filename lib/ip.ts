import { headers } from 'next/headers';

/**
 * Get the client's IP address from request headers
 * Works with various proxy configurations (Vercel, Cloudflare, etc.)
 */
export async function getUserIP(): Promise<string> {
    const headersList = await headers();

    // Try various headers in order of preference
    const ip =
        headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
        headersList.get('x-real-ip') ||
        headersList.get('cf-connecting-ip') || // Cloudflare
        headersList.get('x-client-ip') ||
        'unknown';

    return ip;
}

/**
 * Hash IP address for privacy (optional)
 * Use this if you want to store hashed IPs instead of plain IPs
 */
export async function hashIP(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
