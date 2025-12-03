'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Trash2, Ban, CheckCircle, RefreshCw, AlertTriangle, Activity, Lock, LogOut, Search, Filter, MessageSquare } from 'lucide-react';
import { Confession } from '@/types';
import { formatTimestamp } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPage() {
    const router = useRouter();

    // Client‑side auth guard with session timeout (1 minute of inactivity)
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

        // Session timeout: 1 minute of inactivity
        let inactivityTimer: NodeJS.Timeout;

        const resetInactivityTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(async () => {
                // Auto-logout after 1 minute of inactivity
                await fetch('/api/admin/logout', { method: 'POST' });
                router.replace('/admin/login');
            }, 60000); // 60 seconds = 1 minute
        };

        // Track user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => {
            document.addEventListener(event, resetInactivityTimer);
        });

        // Start the timer
        resetInactivityTimer();

        // Cleanup
        return () => {
            clearTimeout(inactivityTimer);
            activityEvents.forEach(event => {
                document.removeEventListener(event, resetInactivityTimer);
            });
        };
    }, [router]);

    // State
    const [stats, setStats] = useState<any>(null);
    const [reports, setReports] = useState<Confession[]>([]);
    const [blockedIps, setBlockedIps] = useState<string[]>([]);
    const [allConfessions, setAllConfessions] = useState<Confession[]>([]);
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [ipToBlock, setIpToBlock] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsChangingPassword(true);
        try {
            const res = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                alert('Password updated successfully');
                setCurrentPassword('');
                setNewPassword('');
            } else {
                alert(data.error || 'Failed to update password');
            }
        } catch (error) {
            console.error('Failed to update password', error);
            alert('An error occurred');
        } finally {
            setIsChangingPassword(false);
        }
    };

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

        // Auto-refresh data every minute (60 seconds)
        const refreshInterval = setInterval(() => {
            fetchData();
        }, 60000); // 60 seconds = 1 minute

        return () => {
            clearInterval(refreshInterval);
        };
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
            if (action === 'delete_reply') {
                setAllConfessions(prev => prev.map(c => {
                    if (c.id === payload.confessionId) {
                        return {
                            ...c,
                            replies: c.replies.filter(r => r.id !== payload.replyId)
                        };
                    }
                    return c;
                }));
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



    // Sorting function
    const sortFn = (a: { timestamp: number }, b: { timestamp: number }) => {
        return sortOrder === 'newest'
            ? b.timestamp - a.timestamp
            : a.timestamp - b.timestamp;
    };

    // Filtered & Sorted Lists
    const displayedConfessions = allConfessions
        .filter(c => {
            const matchesTag = selectedTag ? c.tags?.includes(selectedTag) : true;
            const matchesSearch = searchQuery
                ? c.content.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.includes(searchQuery)
                : true;
            return matchesTag && matchesSearch;
        })
        .sort(sortFn);

    const displayedReports = [...reports].sort(sortFn);



    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Navbar */}
            <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/40 border-b border-white/10 supports-[backdrop-filter]:bg-background/40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                Admin Console
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={fetchData}
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: 'Total Confessions', value: stats?.totalConfessions || 0, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'group-hover:border-blue-500/30' },
                        { title: 'Active Reports', value: stats?.totalReports || 0, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'group-hover:border-amber-500/30' },
                        { title: 'Blocked IPs', value: stats?.totalBlockedIps || 0, icon: Lock, color: 'text-red-500', bg: 'bg-red-500/10', border: 'group-hover:border-red-500/30' },
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group"
                        >
                            <Card className={`bg-card/30 backdrop-blur-md border-white/10 transition-all duration-300 ${stat.border}`}>
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                                        <h3 className="text-3xl font-bold tracking-tight">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-xl ${stat.bg} transition-transform duration-300 group-hover:scale-110`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content */}
                <Tabs defaultValue="reports" className="w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <TabsList className="bg-secondary/30 backdrop-blur-md p-1 rounded-xl border border-white/5">
                            <TabsTrigger value="reports" className="data-[state=active]:bg-background/60 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-4 transition-all">
                                Reports <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0">{reports.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="all" className="data-[state=active]:bg-background/60 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-4 transition-all">
                                All Posts
                            </TabsTrigger>
                            <TabsTrigger value="security" className="data-[state=active]:bg-background/60 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-4 transition-all">
                                Security
                            </TabsTrigger>
                        </TabsList>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search content or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background/50 border-white/10 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    {/* Reports Tab */}
                    <TabsContent value="reports" className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            {displayedReports.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-24 bg-card/20 rounded-3xl border border-dashed border-white/10"
                                >
                                    <div className="p-4 bg-green-500/10 rounded-full mb-4">
                                        <CheckCircle className="h-12 w-12 text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
                                    <p className="text-muted-foreground">No active reports to review.</p>
                                </motion.div>
                            ) : (
                                <div className="grid gap-4">
                                    {displayedReports.map((confession) => (
                                        <motion.div
                                            key={confession.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                        >
                                            <Card className="bg-card/40 backdrop-blur-md border-red-500/20 shadow-lg overflow-hidden group hover:bg-card/50 transition-colors">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <Badge variant="destructive" className="animate-pulse shadow-red-500/20 shadow-lg">
                                                                {confession.reportCount} Reports
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
                                                                {confession.id}
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
                                                                className="hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50 transition-colors"
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                                Keep
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleAction('delete_confession', { id: confession.id })}
                                                                className="shadow-lg shadow-red-500/20"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </Button>
                                                            {confession.ip && (
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => handleAction('block_ip', { ip: confession.ip })}
                                                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                                                >
                                                                    <Ban className="h-4 w-4 mr-2" />
                                                                    Block IP
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="bg-background/40 p-5 rounded-xl mb-4 border border-white/5">
                                                        <p className="text-lg leading-relaxed whitespace-pre-wrap">{confession.content}</p>
                                                    </div>

                                                    {/* Reported Replies */}
                                                    {confession.replies && confession.replies.some(r => r.isReported || (r.reportCount && r.reportCount > 0)) && (
                                                        <div className="mt-4 space-y-3">
                                                            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                                                                <AlertTriangle className="h-4 w-4" /> Reported Replies
                                                            </h4>
                                                            {confession.replies.filter(r => r.isReported || (r.reportCount && r.reportCount > 0)).map(reply => (
                                                                <div key={reply.id} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex justify-between items-start gap-4">
                                                                    <div className="space-y-1">
                                                                        <p className="text-sm text-foreground/90">{reply.content}</p>
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                            <span className="text-red-400 font-medium">{reply.reportCount} Reports</span>
                                                                            <span>•</span>
                                                                            <span>{formatTimestamp(reply.timestamp)}</span>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleAction('delete_reply', { confessionId: confession.id, replyId: reply.id })}
                                                                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between mt-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {confession.tags?.map(tag => (
                                                                <Badge key={tag} variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 border-primary/10">
                                                                    #{tag}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        {confession.ip && (
                                                            <div className="text-xs font-mono text-muted-foreground bg-black/20 px-2 py-1 rounded border border-white/5">
                                                                IP: {confession.ip}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </TabsContent>



                    {/* All Posts Tab */}
                    <TabsContent value="all" className="space-y-6">
                        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-card/20 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2 mr-2 text-muted-foreground">
                                <Filter className="h-4 w-4" />
                                <span className="text-sm font-medium">Filter:</span>
                            </div>
                            <button
                                onClick={() => setSelectedTag('')}
                                className={`px-4 py-1.5 rounded-full text-sm transition-all ${selectedTag === '' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                            >
                                All
                            </button>
                            {uniqueTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag)}
                                    className={`px-4 py-1.5 rounded-full text-sm transition-all ${selectedTag === tag ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <AnimatePresence mode="popLayout">
                                {displayedConfessions.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-12 text-muted-foreground"
                                    >
                                        No confessions found matching your criteria.
                                    </motion.div>
                                ) : (
                                    displayedConfessions.map((confession) => (
                                        <motion.div
                                            key={confession.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                        >
                                            <Card className="bg-card/30 backdrop-blur-sm border-white/5 hover:bg-card/40 transition-all hover:border-primary/20 group">
                                                <CardContent className="p-5">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1 space-y-2">
                                                            <p className="text-foreground/90 leading-relaxed">{confession.content}</p>
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Activity className="h-3 w-3" />
                                                                    {formatTimestamp(confession.timestamp)}
                                                                </span>
                                                                {confession.ip && (
                                                                    <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded border border-white/5">
                                                                        {confession.ip}
                                                                    </span>
                                                                )}
                                                                {confession.tags && confession.tags.length > 0 && (
                                                                    <div className="flex gap-1">
                                                                        {confession.tags.map(tag => (
                                                                            <span key={tag} className="text-primary/70">#{tag}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Replies List */}
                                                            {confession.replies && confession.replies.length > 0 && (
                                                                <div className="mt-4 pl-4 border-l-2 border-white/10 space-y-3">
                                                                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                                        <MessageSquare className="h-3 w-3" />
                                                                        Replies ({confession.replies.length})
                                                                    </div>
                                                                    {confession.replies.map(reply => (
                                                                        <div key={reply.id} className="bg-secondary/20 rounded-lg p-3 flex justify-between items-start gap-3 group/reply">
                                                                            <div className="space-y-1">
                                                                                <p className="text-sm text-foreground/80">{reply.content}</p>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {formatTimestamp(reply.timestamp)}
                                                                                </div>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => handleAction('delete_reply', { confessionId: confession.id, replyId: reply.id })}
                                                                                className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/reply:opacity-100 transition-all"
                                                                            >
                                                                                <Trash2 className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                                            onClick={() => handleAction('delete_confession', { id: confession.id })}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </TabsContent>

                    {/* Security Tab */}
                    <TabsContent value="security" className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="bg-card/40 backdrop-blur-md border-white/10 h-fit">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Ban className="h-5 w-5 text-red-500" />
                                        Block IP Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-3">
                                        <Input
                                            placeholder="Enter IP address (e.g., 192.168.1.1)"
                                            value={ipToBlock}
                                            onChange={e => setIpToBlock(e.target.value)}
                                            className="bg-background/50 border-white/10 focus:ring-red-500/20"
                                        />
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                handleAction('block_ip', { ip: ipToBlock });
                                                setIpToBlock('');
                                            }}
                                            disabled={!ipToBlock}
                                            className="shadow-lg shadow-red-500/20"
                                        >
                                            Block
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        Blocking an IP will prevent them from posting new confessions or reporting existing ones.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-card/40 backdrop-blur-md border-white/10 h-fit">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Lock className="h-5 w-5 text-primary" />
                                        Change Admin Password
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <Input
                                            type="password"
                                            placeholder="Current Password"
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            className="bg-background/50 border-white/10 focus:ring-primary/20"
                                        />
                                        <Input
                                            type="password"
                                            placeholder="New Password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="bg-background/50 border-white/10 focus:ring-primary/20"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!currentPassword || !newPassword || isChangingPassword}
                                            className="w-full"
                                        >
                                            {isChangingPassword ? 'Updating...' : 'Update Password'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold px-1 flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-primary" />
                                    Blocked List
                                </h3>
                                <div className="grid gap-3">
                                    <AnimatePresence mode="popLayout">
                                        {blockedIps.length === 0 ? (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center py-8 bg-card/20 rounded-xl border border-dashed border-white/10"
                                            >
                                                <p className="text-muted-foreground italic">No IPs are currently blocked.</p>
                                            </motion.div>
                                        ) : (
                                            blockedIps.map(ip => (
                                                <motion.div
                                                    key={ip}
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="flex items-center justify-between p-3 bg-card/30 rounded-xl border border-white/5 group hover:border-red-500/30 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-red-500/10 rounded-lg">
                                                            <Lock className="h-4 w-4 text-red-500" />
                                                        </div>
                                                        <span className="font-mono text-sm">{ip}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleAction('unblock_ip', { ip })}
                                                        className="text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
                                                    >
                                                        Unblock
                                                    </Button>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
