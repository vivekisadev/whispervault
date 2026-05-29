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
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';



export default function Home() {
  const [activeTab, setActiveTab] = useState<'confessions' | 'chat'>('confessions');
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [starCount, setStarCount] = useState<number | null>(null);
  const [votesSynced, setVotesSynced] = useState(false);

  const fetchConfessions = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch('/api/confessions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfessions(data.confessions || []);
    } catch (error) {
      console.error('Error fetching confessions:', error);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      fetchConfessions(true);
    }
  }, [activeTab]);

  useEffect(() => {
    // Sync votes from server first (IP-based, works across browsers & incognito)
    import('@/lib/utils').then(({ syncVotesFromServer }) => {
      syncVotesFromServer().then(() => {
        // After syncing votes, fetch confessions
        setVotesSynced(true);
        fetchConfessions();
      });
    });


    // Fetch GitHub Stars
    fetch('https://api.github.com/repos/vivekisadev/whispervault')
      .then(res => res.json())
      .then(data => setStarCount(data.stargazers_count))
      .catch(err => console.error('Failed to fetch stars:', err));

    // Connect to Socket.IO server (separate server in production)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    let socket: any = null;

    if (socketUrl) {
      socket = io(socketUrl, {
        path: '/api/socket',
      });

      socket.on('online-users', (count: number) => {
        setOnlineUsers(count);
      });
    }

    // Auto-refresh confessions every minute (60 seconds)
    const refreshInterval = setInterval(() => {
      fetchConfessions(true); // Background refresh
    }, 60000); // 60 seconds = 1 minute

    // Cleanup function
    return () => {
      if (socket) {
        socket.disconnect();
      }
      clearInterval(refreshInterval);
    };
  }, []);

  // ... (keep existing code)


  const handleNewConfession = (newConfession: Confession) => {
    setConfessions(prev => [newConfession, ...prev]);
  };

  // ... (keep existing code)


  //this is for search functionality
  const filteredConfessions = confessions
    .filter(confession => {
      if (!confession) return false;
      const matchesSearch = confession.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (confession.tags && confession.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      const matchesTag = selectedTag ? confession.tags && confession.tags.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
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
                    maskImage: "url('/vault-logo.svg')",
                    maskSize: "contain",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskImage: "url('/vault-logo.svg')",
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
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        {/* Mobile Tab Switcher */}
        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex p-1 mb-6 bg-secondary/30 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('confessions')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${activeTab === 'confessions'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Confessions
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${activeTab === 'chat'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Live Chat
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'confessions' ? (
            <motion.div
              key="confessions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
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

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6 z-30">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort by:</span>
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => document.getElementById('sort-dropdown')?.classList.toggle('hidden')}
                        className="inline-flex items-center justify-between min-w-[120px] px-4 py-2 text-sm font-medium text-foreground bg-background/50 backdrop-blur-md border border-white/10 rounded-xl shadow-sm hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
                      >
                        <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
                        <svg className="-mr-1 ml-2 h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <div
                        id="sort-dropdown"
                        className="hidden absolute left-0 mt-2 w-32 origin-top-left bg-background/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200 z-50"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setSortOrder('newest');
                              document.getElementById('sort-dropdown')?.classList.add('hidden');
                            }}
                            className={`block w-full text-left px-4 py-2.5 text-sm ${sortOrder === 'newest' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-white/5 hover:text-primary transition-colors'}`}
                          >
                            Newest First
                          </button>
                          <button
                            onClick={() => {
                              setSortOrder('oldest');
                              document.getElementById('sort-dropdown')?.classList.add('hidden');
                            }}
                            className={`block w-full text-left px-4 py-2.5 text-sm ${sortOrder === 'oldest' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-white/5 hover:text-primary transition-colors'}`}
                          >
                            Oldest First
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by tags:</span>
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => document.getElementById('tag-dropdown')?.classList.toggle('hidden')}
                        className="inline-flex items-center justify-between min-w-[140px] px-4 py-2 text-sm font-medium text-foreground bg-background/50 backdrop-blur-md border border-white/10 rounded-xl shadow-sm hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
                      >
                        <span>{selectedTag ? `#${selectedTag}` : 'All Tags'}</span>
                        <svg className="-mr-1 ml-2 h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <div
                        id="tag-dropdown"
                        className="hidden absolute right-0 mt-2 w-56 origin-top-right bg-background/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200 z-50"
                      >
                        <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                          <button
                            onClick={() => {
                              setSelectedTag('');
                              document.getElementById('tag-dropdown')?.classList.add('hidden');
                            }}
                            className={`block w-full text-left px-4 py-2.5 text-sm ${selectedTag === '' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-white/5 hover:text-primary transition-colors'}`}
                          >
                            All Tags
                          </button>
                          {uniqueTags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => {
                                setSelectedTag(tag);
                                document.getElementById('tag-dropdown')?.classList.add('hidden');
                              }}
                              className={`block w-full text-left px-4 py-2.5 text-sm ${selectedTag === tag ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-white/5 hover:text-primary transition-colors'}`}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Backdrop to close dropdown on click outside */}
                    <div
                      className="fixed inset-0 z-[-1] hidden"
                      onClick={(e) => {
                        const dropdown = document.getElementById('tag-dropdown');
                        if (dropdown && !dropdown.classList.contains('hidden')) {
                          dropdown.classList.add('hidden');
                          e.currentTarget.classList.add('hidden');
                        }
                      }}
                      id="dropdown-backdrop"
                    ></div>
                    <script dangerouslySetInnerHTML={{
                      __html: `
                    // Simple click outside handler
                    document.addEventListener('click', function(event) {
                      const dropdown = document.getElementById('tag-dropdown');
                      const button = event.target.closest('button');
                      const isDropdownButton = button && button.innerText.includes('All Tags') || (button && button.innerText.includes('#'));
                      
                      if (dropdown && !dropdown.classList.contains('hidden') && !dropdown.contains(event.target) && !isDropdownButton) {
                        dropdown.classList.add('hidden');
                      }
                    });
                  `
                    }} />
                  </div>
                </div>

                {/* List */}
                {isLoading ? (
                  <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="border border-border/40 bg-card rounded-xl p-6 space-y-4">
                        <div className="flex justify-between">
                          <div className="flex gap-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-20 w-full" />
                        <div className="flex justify-between pt-4">
                          <div className="flex gap-4">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-12" />
                          </div>
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConfessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No confessions found. Be the first to share!
                  </div>
                ) : (
                  <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                      {filteredConfessions.map((confession) => (
                        <motion.div
                          key={confession.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          layout
                        >
                          <ConfessionCard
                            key={`${confession.id}-${votesSynced}`}
                            confession={confession}
                            onUpdate={fetchConfessions}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto"
            >
              <Chat />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-auto bg-background/50">
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
      </footer>
    </div >
  );
}
