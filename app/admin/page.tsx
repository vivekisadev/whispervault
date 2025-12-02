'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Trash2, Ban, CheckCircle, RefreshCw, AlertTriangle, Activity, Lock, LogOut } from 'lucide-react';
import { Confession } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPage() {
    const router = useRouter();

    // Client‑side auth guard
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
            setBlockedIps(data.blockedIps || []);
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

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            router.replace('/admin/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    // Admin actions
    const handleAction = async (action: string, payload: any) => {
        try {
            // Optimistic updates for smoother UI
            if (action === 'dismiss_report' || action === 'delete_confession') {
                setReports(prev => prev.filter(c => c.id !== payload.id));
                setAllConfessions(prev => prev.filter(c => c.id !== payload.id));
            }
            if (action === 'unblock_ip') {
                setBlockedIps(prev => prev.filter(ip => ip !== payload.ip));
            }
            if (action === 'block_ip') {
                if (!blockedIps.includes(payload.ip)) {
                    setBlockedIps(prev => [...prev, payload.ip]);
                }
            }

            await fetch('/api/admin/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload }),
            });

            // Re-fetch to ensure sync
            fetchData();
        } catch (error) {
            console.error('Action failed', error);
            fetchData(); // Revert on error
        }
    };

    // Helper: unique tags list
    const uniqueTags = Array.from(new Set(allConfessions.flatMap(c => c.tags ?? [])));

    // Filtered confessions
    const displayedConfessions = selectedTag
        ? allConfessions.filter(c => c.tags?.includes(selectedTag))
        : allConfessions;

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 shadow-xl"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                Admin Command Center
                            </h1>
                            <p className="text-muted-foreground">Manage confessions, reports, and security</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={fetchData}
                            variant="outline"
                            size="icon"
                            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="destructive"
                            size="icon"
                            className="rounded-full hover:bg-destructive/90 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </motion.div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: 'Total Confessions', value: stats?.totalConfessions || 0, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { title: 'Active Reports', value: stats?.totalReports || 0, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                        { title: 'Blocked IPs', value: stats?.totalBlockedIps || 0, icon: Lock, color: 'text-red-500', bg: 'bg-red-500/10' },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="bg-card/40 backdrop-blur-md border-white/5 hover:border-primary/20 transition-all duration-300">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                                        <h3 className="text-3xl font-bold">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content */}
                <Tabs defaultValue="reports" className="w-full">
                    <TabsList className="w-full justify-start bg-card/30 backdrop-blur-md p-1 rounded-xl border border-white/5 mb-6 overflow-x-auto">
                        <TabsTrigger value="reports" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg px-6">
                            Reports <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">{reports.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="all" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg px-6">
                            All Posts
                        </TabsTrigger>
                        <TabsTrigger value="security" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg px-6">
                            Security
                        </TabsTrigger>
                    </TabsList>

                    {/* Reports Tab */}
                    <TabsContent value="reports" className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            {reports.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-20 bg-card/20 rounded-2xl border border-dashed border-white/10"
                                >
                                    <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500/50" />
                                    <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
                                    <p className="text-muted-foreground">No active reports to review.</p>
                                </motion.div>
                            ) : (
                                reports.map((confession) => (
                                    <motion.div
                                        key={confession.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                                    >
                                        <Card className="bg-card/40 backdrop-blur-md border-red-500/20 shadow-lg overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                                            <CardContent className="p-6">
                                                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="destructive" className="animate-pulse">
                                                            {confession.reportCount} Reports
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            ID: {confession.id.slice(0, 8)}...
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatTimestamp(confession.timestamp)}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleAction('dismiss_report', { id: confession.id })}
                                                            className="hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50"
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                            Keep
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleAction('delete_confession', { id: confession.id })}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </Button>
                                                        {confession.ip && (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => handleAction('block_ip', { ip: confession.ip })}
                                                                className="bg-zinc-800 hover:bg-zinc-700"
                                                            >
                                                                <Ban className="h-4 w-4 mr-2" />
                                                                Block IP
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-black/20 p-4 rounded-xl mb-4 border border-white/5">
                                                    <p className="text-lg leading-relaxed whitespace-pre-wrap">{confession.content}</p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-wrap gap-2">
                                                        {confession.tags?.map(tag => (
                                                            <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                                                #{tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    {confession.ip && (
                                                        <div className="text-xs font-mono text-muted-foreground bg-black/30 px-2 py-1 rounded">
                                                            IP: {confession.ip}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </TabsContent>

                    {/* All Posts Tab */}
                    <TabsContent value="all" className="space-y-6">
                        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-card/20 rounded-xl border border-white/5">
                            <button
                                onClick={() => setSelectedTag('')}
                                className={`px-4 py-1.5 rounded-full text-sm transition-all ${selectedTag === '' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-secondary/50 hover:bg-secondary'}`}
                            >
                                All Tags
                            </button>
                            {uniqueTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={`px-4 py-1.5 rounded-full text-sm transition-all ${selectedTag === tag ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-secondary/50 hover:bg-secondary'}`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <AnimatePresence mode="popLayout">
                                {displayedConfessions.map((confession) => (
                                    <motion.div
                                        key={confession.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <Card className="bg-card/30 backdrop-blur-sm border-white/5 hover:bg-card/40 transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <p className="text-foreground/90 mb-2 line-clamp-2">{confession.content}</p>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>{formatTimestamp(confession.timestamp)}</span>
                                                            {confession.ip && (
                                                                <span className="font-mono bg-black/20 px-1.5 py-0.5 rounded">
                                                                    {confession.ip}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleAction('delete_confession', { id: confession.id })}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="space-y-6">
                        <Card className="bg-card/40 backdrop-blur-md border-white/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Ban className="h-5 w-5 text-red-500" />
                                    Block IP Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4 max-w-md">
                                    <Input
                                        placeholder="Enter IP address (e.g., 192.168.1.1)"
                                        value={ipToBlock}
                                        onChange={e => setIpToBlock(e.target.value)}
                                        className="bg-black/20 border-white/10"
                                    />
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            handleAction('block_ip', { ip: ipToBlock });
                                            setIpToBlock('');
                                        }}
                                        disabled={!ipToBlock}
                                    >
                                        Block
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold px-1">Blocked IP Addresses</h3>
                            <div className="grid gap-3">
                                <AnimatePresence mode="popLayout">
                                    {blockedIps.length === 0 ? (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-muted-foreground italic px-1"
                                        >
                                            No IPs are currently blocked.
                                        </motion.p>
                                    ) : (
                                        blockedIps.map(ip => (
                                            <motion.div
                                                key={ip}
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="flex items-center justify-between p-4 bg-card/20 rounded-xl border border-white/5 group hover:border-red-500/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                                        <Lock className="h-4 w-4 text-red-500" />
                                                    </div>
                                                    <span className="font-mono text-lg">{ip}</span>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleAction('unblock_ip', { ip })}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50"
                                                >
                                                    Unblock
                                                </Button>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
