import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

    // Load and decode audio for visualization
    useEffect(() => {
        const loadAudio = async () => {
            try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                setAudioBuffer(decodedBuffer);
                setDuration(decodedBuffer.duration);
                setIsLoading(false);
                audioContext.close();
            } catch (error) {
                console.error("Error loading audio:", error);
                setIsLoading(false);
            }
        };

        loadAudio();
    }, [src]);

    // Draw waveform
    useEffect(() => {
        if (!canvasRef.current || !audioBuffer) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            const data = audioBuffer.getChannelData(0);
            const step = Math.ceil(data.length / width);
            const amp = height / 2;

            ctx.clearRect(0, 0, width, height);

            // Draw background bars (inactive)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < width; i += 4) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                    const datum = data[(i * step) + j];
                    if (datum < min) min = datum;
                    if (datum > max) max = datum;
                }
                // Normalize height
                const barHeight = Math.max(2, (max - min) * amp);
                const y = (height - barHeight) / 2;

                // Rounded rect
                ctx.beginPath();
                ctx.roundRect(i, y, 2, barHeight, 2);
                ctx.fill();
            }

            // Draw active bars (progress)
            if (isPlaying || currentTime > 0) {
                const progressWidth = (currentTime / duration) * width;

                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, progressWidth, height);
                ctx.clip();

                // Gradient for active part
                const gradient = ctx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, '#ec4899'); // Pink
                gradient.addColorStop(1, '#8b5cf6'); // Violet
                ctx.fillStyle = gradient;

                for (let i = 0; i < width; i += 4) {
                    let min = 1.0;
                    let max = -1.0;
                    for (let j = 0; j < step; j++) {
                        const datum = data[(i * step) + j];
                        if (datum < min) min = datum;
                        if (datum > max) max = datum;
                    }
                    const barHeight = Math.max(2, (max - min) * amp);
                    const y = (height - barHeight) / 2;

                    ctx.beginPath();
                    ctx.roundRect(i, y, 2, barHeight, 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        };

        draw();
    }, [audioBuffer, currentTime, duration, isPlaying]);

    // Handle audio events
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

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

    const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = percentage * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 bg-secondary/50 backdrop-blur-sm rounded-full p-1.5 pr-3 min-w-[160px] border border-white/10 h-10">
            <audio ref={audioRef} src={src} preload="metadata" />

            <button
                onClick={togglePlay}
                disabled={isLoading}
                className="w-7 h-7 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:scale-105 transition-transform shrink-0"
            >
                {isLoading ? (
                    <Loader className="w-3 h-3 animate-spin" />
                ) : isPlaying ? (
                    <Pause className="w-3 h-3 fill-current" />
                ) : (
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                )}
            </button>

            <div className="flex-1 flex flex-col justify-center gap-0.5 h-full relative group">
                <canvas
                    ref={canvasRef}
                    width={120}
                    height={24}
                    className="w-full h-6 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                    onClick={handleSeek}
                />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                {formatTime(currentTime || duration)}
            </span>
        </div>
    );
}
