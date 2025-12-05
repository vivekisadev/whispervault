import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const onLoadedMetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };

        const onEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);

        // Handle case where metadata loads very fast
        if (audio.readyState >= 1) {
            onLoadedMetadata();
        }

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
        };
    }, [src]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current) return;
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width);
        const newTime = percentage * audioRef.current.duration;

        audioRef.current.currentTime = newTime;
        setProgress(percentage * 100);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-3 bg-secondary/50 backdrop-blur-sm rounded-full p-2 pr-4 min-w-[200px] border border-white/10">
            <audio ref={audioRef} src={src} preload="metadata" />

            <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:scale-105 transition-transform shrink-0"
            >
                {isLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
            </button>

            <div className="flex-1 flex flex-col justify-center gap-1">
                <div
                    className="h-1.5 bg-secondary/50 rounded-full cursor-pointer relative overflow-hidden group"
                    onClick={handleSeek}
                >
                    <div
                        className="absolute top-0 left-0 h-full bg-primary transition-all duration-100 rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono leading-none">
                    <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
}
