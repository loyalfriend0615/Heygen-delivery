"use client";

import { useRef, useState } from "react";

interface IdleVideoPlayerProps {
  idleVideoUrl: string;
  onVideoEnd: () => void;
  onError: (error: string) => void;
  style?: React.CSSProperties;
  loop?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export default function IdleVideoPlayer({ idleVideoUrl, onVideoEnd, onError, style, loop, videoRef }: IdleVideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef || internalRef;
  const [error, setError] = useState<string | null>(null);

  const handleVideoError = () => {
    setError("Failed to load idle video");
    onError("Failed to load idle video");
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className="w-full h-full object-contain absolute inset-0"
      autoPlay
      playsInline
      muted
      src={idleVideoUrl}
      onEnded={onVideoEnd}
      onError={handleVideoError}
      style={style}
      loop={loop}
    />
  );
} 