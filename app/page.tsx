'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Confession } from '@/types';
import ConfessionCard from '@/components/ConfessionCard';
import NewConfession from '@/components/NewConfession';
import Chat from '@/components/Chat';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Search, Users, Menu } from 'lucide-react';

import GuidelinesModal from '@/components/GuidelinesModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'confessions' | 'chat'>('confessions');
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);

  const fetchConfessions = async () => {
    try {
      const response = await fetch('/api/confessions');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.confessions)) {
          setConfessions(data.confessions);
        } else if (Array.isArray(data)) {
          setConfessions(data);
        } else {
          setConfessions([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch confessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfessions();

    // Connect to socket for real-time online count
    const socket = io({ path: '/api/socket' });

    socket.on('online-users', (count: number) => {
      setOnlineUsers(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Unique tags for filter dropdown
  const uniqueTags = Array.from(new Set(confessions.flatMap(c => c.tags ?? [])));

  const filteredConfessions = confessions.filter(c => {
    const matchesSearch = c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag ? c.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GuidelinesModal />
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/30 border-b border-white/5 supports-[backdrop-filter]:bg-background/30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <MessageCircle className="h-6 w-6" />
            <span>AnonyChat</span>
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
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
        {/* Mobile Tab Switcher */}
        <div className="md:hidden mb-8 flex p-1 bg-secondary/50 rounded-lg">
          <button
            onClick={() => setActiveTab('confessions')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'confessions' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Confessions
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'chat' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            Live Chat
          </button>
        </div>

        {activeTab === 'confessions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              <NewConfession onConfessionCreated={fetchConfessions} />

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
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-auto bg-background/50">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2024 AnonyChat. A safe space for anonymous sharing.</p>
        </div>
      </footer>
    </div>
  );
}
