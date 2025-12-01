'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { io } from 'socket.io-client';
import { Confession } from '@/types';
import ConfessionCard from '@/components/ConfessionCard';
import NewConfession from '@/components/NewConfession';
import Chat from '@/components/Chat';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Search, Users, Menu, ArrowUpRight, Lock, Github, Star } from 'lucide-react';
import GuidelinesModal from '@/components/GuidelinesModal';



export default function Home() {
  const [activeTab, setActiveTab] = useState<'confessions' | 'chat'>('confessions');
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [starCount, setStarCount] = useState<number | null>(null);

  const fetchConfessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/confessions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfessions(data.confessions || []);
    } catch (error) {
      console.error('Error fetching confessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfessions();

    // Fetch GitHub Stars
    fetch('https://api.github.com/repos/vivekisadev/whispervault')
      .then(res => res.json())
      .then(data => setStarCount(data.stargazers_count))
      .catch(err => console.error('Failed to fetch stars:', err));

    // Connect to Socket.IO server (separate server in production)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    if (socketUrl) {
      const socket = io(socketUrl);

      socket.on('online-users', (count: number) => {
        setOnlineUsers(count);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, []);

  // ... (keep existing code)


  const handleNewConfession = (newConfession: Confession) => {
    setConfessions(prev => [newConfession, ...prev]);
  };

  // ... (keep existing code)


  //this is for search functionality
  const filteredConfessions = confessions.filter(confession => {
    const matchesSearch = confession.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (confession.tags && confession.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesTag = selectedTag ? confession.tags && confession.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const uniqueTags = Array.from(new Set(confessions.flatMap(c => c.tags || [])));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GuidelinesModal />
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/40 border-b border-white/10 supports-[backdrop-filter]:bg-background/40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          {/* Logo Wrapper */}
          <div className="relative">
            {/* Logo Group */}
            <div className="flex items-center gap-1 group cursor-pointer select-none">
              {/* Icon Container - Transparent */}
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-transparent transition-all duration-300 group-hover:scale-105">
                {/* Logo using Mask for Color Control */}
                <div
                  className="w-8 h-8 bg-foreground group-hover:bg-primary transition-colors duration-300"
                  style={{
                    maskImage: "url('/logo.png')",
                    maskSize: "contain",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskImage: "url('/logo.png')",
                    WebkitMaskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                  }}
                />
              </div>

              {/* Text */}
              <div className="flex flex-col leading-none">
                <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                  Whisper Vault
                </span>
              </div>
            </div>

            {/* Hanging Tag for Desktop - Star Repo (below logo) */}
            <div className="hidden sm:block absolute left-1 top-full flex flex-col items-start z-10">
              {/* Connection Line - Increased height for spacing */}
              <div className="w-px h-4 bg-gradient-to-b from-border/50 to-transparent ml-4"></div>
              {/* Tag */}
              <a
                href="https://github.com/vivekisadev/whispervault"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/90 backdrop-blur-md border border-white/10 shadow-lg text-xs font-medium text-white hover:scale-105 hover:bg-black transition-all duration-300 group animate-[swing_3s_ease-in-out_infinite] whitespace-nowrap"
                style={{
                  transformOrigin: 'top center',
                }}
              >
                <Github className="w-4 h-4 text-white" />
                <span className="font-bold">Star on GitHub</span>
                <div className="flex items-center gap-1 pl-2 border-l border-white/20 ml-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  <span className="text-white">{starCount !== null ? starCount : '...'}</span>
                </div>
              </a>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setActiveTab('confessions')}
              className={`text-sm font-medium transition-colors ${activeTab === 'confessions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Confessions
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`text-sm font-medium transition-colors ${activeTab === 'chat' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Live Chat
            </button>
          </nav >

          {/* Actions */}
          < div className="flex items-center gap-2" >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-white/10 shadow-sm text-sm font-medium text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-foreground font-semibold">{onlineUsers}</span>
              <span className="hidden md:inline text-xs opacity-70">Active Users</span>
              <span className="md:hidden text-xs opacity-70">Active</span>
            </div>

            <a
              href="https://github.com/vivekisadev"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-white/10 shadow-sm text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-300 group"
            >
              <span className="text-xs opacity-70">Created by</span>
              <span className="text-foreground font-semibold group-hover:[text-shadow:0_0_15px_rgba(0,0,0,0.4)] dark:group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300">Vivek</span>
              <ArrowUpRight className="w-3 h-3 opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <ThemeToggle />
          </div >
        </div >

        {/* Hanging Tag for Mobile - Creator */}
        < div className="sm:hidden absolute right-6 top-16 flex flex-col items-end" >
          {/* Connection Line */}
          < div className="w-px h-1 bg-gradient-to-b from-white/20 to-transparent" ></div >
          {/* Tag */}
          < a
            href="https://github.com/vivekisadev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-md border border-white/10 shadow-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-300 group animate-[swing_3s_ease-in-out_infinite]"
            style={{
              transformOrigin: 'top center',
            }
            }
          >
            <span className="opacity-70">by</span>
            <span className="text-foreground font-semibold group-hover:[text-shadow:0_0_15px_rgba(0,0,0,0.4)] dark:group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300">Vivek</span>
            <ArrowUpRight className="w-3 h-3 opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a >
        </div >
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
        {/* Mobile Tab Switcher */}
        {/* ... (keep mobile tabs) ... */}

        {activeTab === 'confessions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              <NewConfession onConfessionCreated={handleNewConfession} />

              {/* Desktop Stats & Guidelines */}
              <div className="hidden lg:block space-y-6">
                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Community
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" /> Online
                      </span>
                      <span className="font-bold text-green-500 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        {onlineUsers}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <MessageCircle className="h-4 w-4" /> Total Posts
                      </span>
                      <span className="font-bold">{confessions.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li>• Be respectful and kind</li>
                      <li>• No hate speech or bullying</li>
                      <li>• Don't share personal info</li>
                      <li>• Keep it anonymous</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Feed */}
            <div className="lg:col-span-8 space-y-8">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search confessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border/40 h-10"
                />
              </div>

              {/* Tag Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedTag('')}
                  className={`px-3 py-1 rounded-full border border-border/40 text-sm ${selectedTag === '' ? 'bg-primary text-primary-foreground' : 'bg-card/20 text-foreground'}`}
                  suppressHydrationWarning
                >
                  All Tags
                </button>
                {uniqueTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-full border border-border/40 text-sm ${selectedTag === tag ? 'bg-primary text-primary-foreground' : 'bg-card/20 text-foreground'}`}
                    suppressHydrationWarning
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              {/* List */}
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : filteredConfessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No confessions found. Be the first to share!
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredConfessions.map((confession) => (
                    <ConfessionCard
                      key={confession.id}
                      confession={confession}
                      onUpdate={fetchConfessions}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Chat />
          </div>
        )
        }
      </main >

      {/* Footer */}
      < footer className="border-t border-border/40 py-8 mt-auto bg-background/50" >
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Whisper Vault. Created by{' '}
            <a
              href="https://github.com/vivekisadev"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-1 text-foreground font-medium group transition-all duration-300"
            >
              <span className="relative transition-all duration-300 group-hover:[text-shadow:0_0_20px_rgba(0,0,0,0.6),0_0_30px_rgba(0,0,0,0.3)] dark:group-hover:[text-shadow:0_0_20px_rgba(255,255,255,0.8),0_0_30px_rgba(255,255,255,0.4)] group-hover:text-foreground">
                Vivek
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-foreground/70 transition-all duration-300 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:[filter:drop-shadow(0_0_8px_rgba(0,0,0,0.4))] dark:group-hover:[filter:drop-shadow(0_0_8px_rgba(255,255,255,0.6))]" />
            </a>
          </p>
        </div>
      </footer >
    </div >
  );
}
