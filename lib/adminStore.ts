
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BLOCKED_IPS_FILE = path.join(DATA_DIR, 'blocked-ips.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure blocked IPs file exists
if (!fs.existsSync(BLOCKED_IPS_FILE)) {
    fs.writeFileSync(BLOCKED_IPS_FILE, JSON.stringify([], null, 2));
}

export const adminStore = {
    getBlockedIps: (): string[] => {
        try {
            const data = fs.readFileSync(BLOCKED_IPS_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    },

    blockIp: (ip: string) => {
        const ips = adminStore.getBlockedIps();
        if (!ips.includes(ip)) {
            ips.push(ip);
            fs.writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(ips, null, 2));
        }
    },

    unblockIp: (ip: string) => {
        const ips = adminStore.getBlockedIps();
        const newIps = ips.filter(i => i !== ip);
        fs.writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(newIps, null, 2));
    },

    isIpBlocked: (ip: string): boolean => {
        const ips = adminStore.getBlockedIps();
        return ips.includes(ip);
    }
};
