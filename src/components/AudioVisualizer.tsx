import React, { useEffect, useRef } from 'react';
import { audioPlayer } from '../utils/audioPlayer';

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barCount = 28,
  height = 54,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const freqData = new Uint8Array(32);
    let phase = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, width, h);

      if (isPlaying) {
        audioPlayer.getFrequencyData(freqData);
      }

      const barWidth = Math.max(3, (width - (barCount - 1) * 3) / barCount);
      phase += 0.08;

      for (let i = 0; i < barCount; i++) {
        let value = 0;

        if (isPlaying) {
          // Use real analyser data blended with synthetic wave for visual appeal
          const freqIndex = Math.floor((i / barCount) * freqData.length);
          const raw = freqData[freqIndex] || 0;
          const wave = Math.sin(phase + i * 0.35) * 15 + 15;
          value = Math.max(10, Math.min(h - 4, (raw / 255) * h + wave * 0.4));
        } else {
          // Idle low state
          value = 4 + Math.sin(phase * 0.5 + i * 0.2) * 2;
        }

        const x = i * (barWidth + 3);
        const y = h - value;

        // Gradient from electric indigo to neon cyan
        const gradient = ctx.createLinearGradient(0, y, 0, h);
        gradient.addColorStop(0, '#22d3ee'); // cyan-400
        gradient.addColorStop(0.5, '#6366f1'); // indigo-500
        gradient.addColorStop(1, '#4338ca'); // indigo-700

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, value, [3, 3, 0, 0]);
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, barCount]);

  return (
    <div className={`overflow-hidden rounded-xl bg-slate-950/40 p-2 border border-white/5 backdrop-blur-md ${className}`}>
      <canvas
        ref={canvasRef}
        width={360}
        height={height}
        className="w-full h-full block"
        aria-label="Real-time audio frequency visualizer"
      />
    </div>
  );
};
