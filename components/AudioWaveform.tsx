'use client';

import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
    stream: MediaStream | null;
    isRecording: boolean;
    barColor?: string;
}

export default function AudioWaveform({ stream, isRecording, barColor = '#ec4899' }: AudioWaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const historyRef = useRef<number[]>([]);

    useEffect(() => {
        if (!stream || !canvasRef.current) return;

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 1024; // Time domain data
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        // Initialize history with some empty data to start scrolling from right
        const maxBarsInitial = Math.ceil(canvasRef.current.width / 5);
        historyRef.current = new Array(maxBarsInitial).fill(0.02); // Small baseline

        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx || !analyserRef.current || !dataArrayRef.current) return;

            animationRef.current = requestAnimationFrame(draw);

            // Get time domain data
            analyserRef.current.getByteTimeDomainData(dataArrayRef.current as any);

            // Calculate RMS (volume)
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const x = (dataArrayRef.current[i] - 128) / 128;
                sum += x * x;
            }
            const rms = Math.sqrt(sum / bufferLength);

            // Normalize and boost sensitivity
            const sensitivity = 4;
            const volume = Math.min(1, Math.max(0.05, rms * sensitivity)); // Min height 5%

            // Add to history
            historyRef.current.push(volume);

            // Limit history to fit canvas
            const barWidth = 3;
            const gap = 2;
            const maxBars = Math.ceil(canvas.width / (barWidth + gap));

            if (historyRef.current.length > maxBars) {
                historyRef.current.shift();
            }

            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerY = canvas.height / 2;

            historyRef.current.forEach((val, index) => {
                const height = val * canvas.height * 0.8; // Max 80% height
                const x = index * (barWidth + gap);

                // Gradient color
                const gradient = ctx.createLinearGradient(0, centerY - height / 2, 0, centerY + height / 2);
                gradient.addColorStop(0, '#ec4899'); // Pink
                gradient.addColorStop(1, '#8b5cf6'); // Violet

                ctx.fillStyle = gradient;

                // Rounded rect
                ctx.beginPath();
                ctx.roundRect(x, centerY - height / 2, barWidth, height, 2);
                ctx.fill();
            });
        };

        if (isRecording) {
            draw();
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            audioContext.close();
        };
    }, [stream, isRecording]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    canvasRef.current.width = parent.clientWidth;
                    canvasRef.current.height = parent.clientHeight;
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full" width={300} height={40} />;
}
