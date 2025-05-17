"use client";

import { useEffect, useRef } from "react";

interface SlidingBarsVisualizerProps {
  isRecording: boolean;
}

export default function SlidingBarsVisualizer({ isRecording }: SlidingBarsVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barsRef = useRef<{ height: number; x: number; direction: "left" | "right" }[]>([]);

  useEffect(() => {
    if (!isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Config
    const totalBarsPerSide = 16;
    const barWidth = 3;
    const gap = 4;
    const centerGap = 40; // width of the center gap in px

    // Calculate canvas width
    const canvas = canvasRef.current!;
    const totalWidth = (totalBarsPerSide * (barWidth + gap)) * 2 + centerGap;
    canvas.width = totalWidth;
    canvas.height = 40;

    // Create initial bars
    const leftBars = Array.from({ length: totalBarsPerSide }, (_, i) => ({
      height: Math.random() * 20 + 10,
      x: i * (barWidth + gap),
      direction: "left" as const,
    }));
    const rightBars = Array.from({ length: totalBarsPerSide }, (_, i) => ({
      height: Math.random() * 20 + 10,
      x: canvas.width - (i + 1) * (barWidth + gap),
      direction: "right" as const,
    }));
    barsRef.current = [...leftBars, ...rightBars];

    startAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line
  }, [isRecording]);

  const startAnimation = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const centerX = canvas.width / 2;
    const barWidth = 3;
    const gap = 4;
    const centerGap = 40;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;

      // Draw center line
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();

      // Move and draw bars
      barsRef.current = barsRef.current.map((bar) => {
        let newX = bar.x;
        if (bar.direction === "left") {
          newX += 1.5;
          // If bar reaches the center gap, reset to left edge
          if (newX + barWidth > centerX - centerGap / 2) {
            return {
              height: Math.random() * 20 + 10,
              x: 0,
              direction: "left" as const,
            };
          }
        } else {
          newX -= 1.5;
          // If bar reaches the center gap, reset to right edge
          if (newX < centerX + centerGap / 2) {
            return {
              height: Math.random() * 20 + 10,
              x: canvas.width - barWidth,
              direction: "right" as const,
            };
          }
        }
        return {
          ...bar,
          x: newX,
        };
      });

      // Draw bars
      ctx.fillStyle = "#000";
      barsRef.current.forEach((bar) => {
        const halfHeight = bar.height / 2;
        ctx.fillRect(bar.x, centerY - halfHeight, barWidth, bar.height);
      });

      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: isRecording ? "block" : "none", maxHeight: 40 }}
    />
  );
} 