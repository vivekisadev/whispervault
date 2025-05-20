// Data persistence utilities for confessions
import fs from 'fs';
import path from 'path';
import { Confession } from '@/types';

const dataFilePath = path.resolve(process.cwd(), 'data', 'confessions.json');

// Ensure data directory exists
function ensureDataDir() {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

export function loadConfessions(): Confession[] {
    ensureDataDir();
    if (!fs.existsSync(dataFilePath)) {
        return [];
    }
    try {
        const raw = fs.readFileSync(dataFilePath, 'utf-8');
        const data = JSON.parse(raw) as Confession[];
        return data;
    } catch (e) {
        console.error('Failed to load confessions from file', e);
        return [];
    }
}

export function saveConfessions(confessions: Confession[]): void {
    ensureDataDir();
    try {
        const json = JSON.stringify(confessions, null, 2);
        fs.writeFileSync(dataFilePath, json, 'utf-8');
    } catch (e) {
        console.error('Failed to save confessions to file', e);
    }
}
