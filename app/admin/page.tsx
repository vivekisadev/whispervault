'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Trash2, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import { Confession } from '@/types';
import { formatTimestamp } from '@/lib/utils';

export default function AdminPage() {
    const router = useRouter();

    // Client‑side auth guard – in case middleware missed the token
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/admin/data');
                if (res.status === 401) router.replace('/admin/login');
            } catch (e) {
                console.error('Auth check failed', e);
            }
        };
        checkAuth();
    }, []);

    // State
    const [stats, setStats] = useState<any>(null);
    const [reports, setReports] = useState<Confession[]>([]);
    const [blockedIps, setBlockedIps] = useState<string[]>([]);
    const [allConfessions, setAllConfessions] = useState<Confession[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [ipToBlock, setIpToBlock] = useState('');

    // Fetch admin data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/data');
            const data = await res.json();
            setStats(data.stats);
            setReports(data.reports);
            setBlockedIps(data.blockedIps);
            setAllConfessions(data.allConfessions || []);
        } catch (error) {
            console.error('Failed to fetch admin data', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Admin actions (delete, block, unblock)
    const handleAction = async (action: string, payload: any) => {
        try {
            await fetch('/api/admin/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload }),
            });
            fetchData();
        } catch (error) {
            console.error('Action failed', error);
        }
    };

    // Helper: unique tags list
    const uniqueTags = Array.from(new Set(allConfessions.flatMap(c => c.tags ?? [])));

    // Filtered confessions based on selectedTag
    const displayedConfessions = selectedTag
        ? allConfessions.filter(c => c.tags?.includes(selectedTag))
        : allConfessions;

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
                    </div>
                    <Button onClick={fetchData} variant="outline" size="icon">
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Confessions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.totalConfessions || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Active Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-500">{stats?.totalReports || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Blocked IPs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{stats?.totalBlockedIps || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="reports" className="w-full">
                    <TabsList className="bg-secondary/50 border border-border">
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                        <TabsTrigger value="all">All Posts</TabsTrigger>
                        <TabsTrigger value="security">Security (IP Ban)</TabsTrigger>
                    </TabsList>

                    {/* Reports Tab */}
                    <TabsContent value="reports" className="mt-6 space-y-6">
                        {reports.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-card/50 rounded-lg border border-border">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No active reports. Good job!</p>
                            </div>
                        ) : (
                            reports.map(confession => (
                                <Card key={confession.id} className="bg-card border-border">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="destructive" className="bg-destructive/20 text-destructive hover:bg-destructive/30">
                                                    {confession.reportCount} Reports
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatTimestamp(confession.timestamp)}
                                                </span>
                                            </div>
                                            <Button variant="destructive" size="sm" onClick={() => handleAction('delete_confession', { id: confession.id })}>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Post
                                            </Button>
                                        </div>
                                        <p className="text-foreground whitespace-pre-wrap mb-4">{confession.content}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {confession.tags?.map(tag => (
                                                <Badge key={tag} variant="secondary">#{tag}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    {/* All Posts Tab */}
                    <TabsContent value="all" className="mt-6 space-y-6">
                        {/* Tag Filter Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => setSelectedTag('')}
                                className={`px-3 py-1 rounded-full border border-border/40 text-sm ${selectedTag === '' ? 'bg-primary text-primary-foreground' : 'bg-card/20 text-foreground'}`}
                            >
                                All Tags
                            </button>
                            {uniqueTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={`px-3 py-1 rounded-full border border-border/40 text-sm ${selectedTag === tag ? 'bg-primary text-primary-foreground' : 'bg-card/20 text-foreground'}`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                        {displayedConfessions.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-card/50 rounded-lg border border-border">
                                <p>No confessions available.</p>
                            </div>
                        ) : (
                            displayedConfessions.map(confession => (
                                <Card key={confession.id} className="bg-card border-border">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-xs text-muted-foreground">{formatTimestamp(confession.timestamp)}</span>
                                            <Button variant="destructive" size="sm" onClick={() => handleAction('delete_confession', { id: confession.id })}>
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </div>
                                        <p className="text-foreground whitespace-pre-wrap mb-2">{confession.content}</p>
                                        {confession.ip && (
                                            <div className="text-xs text-muted-foreground mb-2">IP: {confession.ip}</div>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {confession.tags?.map(tag => (
                                                <Badge key={tag} variant="secondary">#{tag}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="mt-6 space-y-6">
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle>Block IP Address</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <Input
                                        placeholder="Enter IP address (e.g., 192.168.1.1)"
                                        value={ipToBlock}
                                        onChange={e => setIpToBlock(e.target.value)}
                                        className="bg-secondary/20"
                                    />
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            handleAction('block_ip', { ip: ipToBlock });
                                            setIpToBlock('');
                                        }}
                                        disabled={!ipToBlock}
                                    >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Block IP
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Blocked IPs</h3>
                            {blockedIps.length === 0 ? (
                                <p className="text-muted-foreground">No IPs blocked.</p>
                            ) : (
                                <div className="grid gap-4">
                                    {blockedIps.map(ip => (
                                        <div key={ip} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border">
                                            <span className="font-mono">{ip}</span>
                                            <Button variant="outline" size="sm" onClick={() => handleAction('unblock_ip', { ip })}>
                                                Unblock
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
