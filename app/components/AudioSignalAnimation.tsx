"use client"

import { useEffect, useRef } from "react"

interface AudioSignalAnimationProps {
  isRecording: boolean
}

export default function AudioSignalAnimation({ isRecording }: AudioSignalAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const barsRef = useRef<{ height: number; x: number }[]>([])

  // Initialize bars
  useEffect(() => {
    if (!isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    // Create initial bars
    const totalBars = 30
    const initialBars = Array.from({ length: totalBars }, (_, i) => ({
      height: Math.random() * 20 + 5, // Random height between 5 and 25
      x: i * 10, // Initial position
    }))

    barsRef.current = initialBars

    // Start animation
    startAnimation()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRecording])

  const startAnimation = () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const animate = () => {
      if (!ctx || !canvas) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw bars
      const centerY = canvas.height / 2
      const barWidth = 3
      const gap = 4

      // Draw horizontal center line
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, centerY)
      ctx.lineTo(canvas.width, centerY)
      ctx.stroke()

      // Update bars
      barsRef.current = barsRef.current.map((bar) => {
        // Move bars to the right
        const newX = bar.x + 1

        // If bar moves out of canvas, reset it to the left with new random height
        if (newX > canvas.width) {
          return {
            height: Math.random() * 20 + 5,
            x: 0,
          }
        }

        return {
          height: bar.height,
          x: newX,
        }
      })

      // Every few frames, update some bar heights to create variation
      if (Math.random() > 0.7) {
        const randomIndex = Math.floor(Math.random() * barsRef.current.length)
        if (barsRef.current[randomIndex]) {
          barsRef.current[randomIndex].height = Math.random() * 20 + 5
        }
      }

      // Draw bars
      ctx.fillStyle = "#000000"
      barsRef.current.forEach((bar) => {
        const halfHeight = bar.height / 2
        ctx.fillRect(bar.x, centerY - halfHeight, barWidth, bar.height)
      })

      // Continue animation if still recording
      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animate()
  }

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: isRecording ? "block" : "none" }} />
} 