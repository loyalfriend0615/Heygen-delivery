'use client';

import { useEffect, useRef, useState } from 'react';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType
} from "@heygen/streaming-avatar";
import { OpenAIAssistant } from '../lib/openai-assistant';
import Link from 'next/link';

interface AvatarVideoStreamProps {
  avatarName: string;
  onClose: () => void;
}

interface ChatMessage {
  question: string;
  response: string;
  timestamp: string;
}

// Custom events for communication
const CHAT_HISTORY_EVENT = 'chatHistoryUpdate';
const AVATAR_READY_EVENT = 'avatarReady';
const CHAT_REQUEST_EVENT = 'chatRequest';
const AVATAR_SPEAKING_STARTED = 'avatarSpeakingStarted';
const AVATAR_SPEAKING_ENDED = 'avatarSpeakingEnded';

// Chroma keying utility
function applyChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  options: { minHue: number; maxHue: number; minSaturation: number; threshold: number }
) {
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true, alpha: true });
  if (!ctx || sourceVideo.readyState < 2) return;
  targetCanvas.width = sourceVideo.videoWidth;
  targetCanvas.height = sourceVideo.videoHeight;
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
  const imageData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Convert RGB to HSV
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta === 0) h = 0;
    else if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : delta / max;
    const v = max / 255;
    // Chroma key: set green pixels to black
    const isGreen =
      h >= options.minHue &&
      h <= options.maxHue &&
      s > options.minSaturation &&
      v > 0.15 &&
      g > r * options.threshold &&
      g > b * options.threshold;
    if (isGreen) {
      data[i] = 0;     // R
      data[i + 1] = 0; // G
      data[i + 2] = 0; // B
      data[i + 3] = 255; // Opaque black
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

export default function AvatarVideoStream({ avatarName, onClose }: AvatarVideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const initializationRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const sessionInitPromiseRef = useRef<Promise<void> | null>(null);
  const openaiAssistantRef = useRef<OpenAIAssistant | null>(null);
  const pendingChatRequestsRef = useRef<{ question: string; timestamp: number }[]>([]);
  const isReadyRef = useRef<boolean>(false);
  const chromaKeyConfigRef = useRef({ minHue: 103, maxHue: 337, minSaturation: 0.75, threshold: 1.0 });
  const chromaKeyStopRef = useRef<() => void>();

  // Helper function to fetch access token
  const fetchAccessToken = async (): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY;
    if (!apiKey) {
      throw new Error('HEYGEN_API_KEY is not set in environment variables');
    }

    const response = await fetch(
      "https://api.heygen.com/v1/streaming.create_token",
      {
        method: "POST",
        headers: { 
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`);
    }

    const { data } = await response.json();
    if (!data?.token) {
      throw new Error('No token received from API');
    }

    console.log("Access token received");
    return data.token;
  };

  // Initialize OpenAI Assistant
  const initializeOpenAI = async () => {
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openaiAssistantId = process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID;
    
    if (!openaiApiKey || !openaiAssistantId) {
      throw new Error('OpenAI API key or Assistant ID not set in environment variables');
    }

    try {
      const assistant = new OpenAIAssistant(openaiApiKey, openaiAssistantId);
      await assistant.initialize();
      openaiAssistantRef.current = assistant;
    } catch (error) {
      console.error('Failed to initialize OpenAI Assistant:', error);
      throw error;
    }
  };

  // Process pending chat requests
  const processPendingChatRequests = async () => {
    console.log("[AvatarVideoStream] Checking pending chat requests:", pendingChatRequestsRef.current.length);
    if (!isReadyRef.current) {
      console.log("[AvatarVideoStream] Components not ready for processing pending requests");
      return;
    }

    console.log("[AvatarVideoStream] Processing pending requests with avatar:", !!avatar, "OpenAI:", !!openaiAssistantRef.current);
    
    while (pendingChatRequestsRef.current.length > 0) {
      const request = pendingChatRequestsRef.current.shift();
      if (request) {
        console.log("[AvatarVideoStream] Processing pending chat request:", request.question);
        try {
          const response = await openaiAssistantRef.current?.getResponse(request.question);
          if (!response) {
            console.error("[AvatarVideoStream] No response from OpenAI Assistant");
            continue;
          }
          console.log("[AvatarVideoStream] OpenAI Assistant response:", response);

          // Add to chat history
          const newMessage: ChatMessage = {
            question: request.question,
            response,
            timestamp: new Date().toLocaleString()
          };
          
          // Update localStorage
          const history = localStorage.getItem('avatarChatHistory');
          const chatHistory = history ? JSON.parse(history) : [];
          const updatedHistory = [...chatHistory, newMessage];
          localStorage.setItem('avatarChatHistory', JSON.stringify(updatedHistory));
          
          // Dispatch event to notify other windows
          console.log("[AvatarVideoStream] Updating chat history");
          const event = new CustomEvent(CHAT_HISTORY_EVENT, { 
            detail: updatedHistory,
            bubbles: true,
            composed: true
          });
          window.dispatchEvent(event);

          // Make avatar speak
          console.log("[AvatarVideoStream] Making avatar speak response");
          try {
            const currentAvatar = (window as any).avatar;
            if (!currentAvatar) {
              throw new Error("Avatar not available");
            }
            // Set localStorage for speaking started
            console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to started");
            localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'started', question: request.question }));
            await currentAvatar.speak({
              text: response,
              taskType: TaskType.REPEAT
            });
            // Set localStorage for speaking ended
            console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to ended");
            localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'ended', question: request.question }));
            console.log("[AvatarVideoStream] Avatar finished speaking");
          } catch (speakError) {
            console.error("[AvatarVideoStream] Failed to make avatar speak:", speakError);
            setError("Failed to make avatar speak");
            // Set localStorage for speaking ended (error case)
            console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to ended (error case)");
            localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'ended', question: request.question }));
          }
        } catch (error) {
          console.error("[AvatarVideoStream] Failed to process pending request:", error);
          setError("Failed to process pending request");
        }
      }
    }
  };

  // Initialize streaming avatar session
  const initializeAvatarSession = async () => {
    console.log("[AvatarVideoStream] Starting avatar session initialization");
    if (sessionInitPromiseRef.current) {
      console.log("[AvatarVideoStream] Session initialization already in progress");
      return sessionInitPromiseRef.current;
    }

    if (initializationRef.current) {
      console.log("[AvatarVideoStream] Session already initialized");
      return;
    }

    sessionInitPromiseRef.current = (async () => {
      try {
        setError(null);
        
        // Initialize OpenAI Assistant first
        console.log("[AvatarVideoStream] Initializing OpenAI Assistant");
        await initializeOpenAI();
        console.log("[AvatarVideoStream] OpenAI Assistant initialized");
        
        // Then initialize avatar
        console.log("[AvatarVideoStream] Fetching access token");
        const token = await fetchAccessToken();
        console.log("[AvatarVideoStream] Access token received");
        
        console.log("[AvatarVideoStream] Creating new avatar instance");
        const newAvatar = new StreamingAvatar({ token });

        // Set up event listeners
        const handleStreamReady = (event: any) => {
          console.log("[AvatarVideoStream] Stream ready event received");
          if (event.detail && videoRef.current) {
            videoRef.current.srcObject = event.detail;
            videoRef.current.onloadedmetadata = () => {
              console.log("[AvatarVideoStream] Video metadata loaded");
              videoRef.current?.play().catch(console.error);
            };
          } else {
            console.error("[AvatarVideoStream] Stream is not available");
            setError("Stream is not available");
          }
        };

        const handleStreamDisconnected = () => {
          console.log("[AvatarVideoStream] Stream disconnected");
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          if (!isClosing) {
            setError("Stream disconnected");
          }
        };

        newAvatar.on(StreamingEvents.STREAM_READY, handleStreamReady);
        newAvatar.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
        
        console.log("[AvatarVideoStream] Creating avatar session");
        const newSessionData = await newAvatar.createStartAvatar({
          quality: AvatarQuality.High,
          avatarName,
        });

        console.log("[AvatarVideoStream] Session data received:", newSessionData);
        
        // Store cleanup function
        cleanupRef.current = () => {
          console.log("[AvatarVideoStream] Running cleanup");
          newAvatar.off(StreamingEvents.STREAM_READY, handleStreamReady);
          newAvatar.off(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        };

        // Store avatar instance globally and dispatch event
        console.log("[AvatarVideoStream] Storing avatar instance globally");
        (window as any).avatar = newAvatar;
        window.dispatchEvent(new CustomEvent(AVATAR_READY_EVENT, {
          detail: newAvatar,
          bubbles: true,
          composed: true
        }));
        console.log("[AvatarVideoStream] Avatar ready event dispatched");

        // Set the avatar state
        setAvatar(newAvatar);
        setSessionData(newSessionData);
        initializationRef.current = true;

        // Set ready state immediately since we have the avatar instance
        isReadyRef.current = true;
        console.log("[AvatarVideoStream] Components ready for processing requests");
        
        // Process any pending chat requests
        console.log("[AvatarVideoStream] Processing pending chat requests");
        await processPendingChatRequests();
      } catch (error) {
        console.error('[AvatarVideoStream] Failed to initialize avatar session:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize avatar session');
        initializationRef.current = false;
        isReadyRef.current = false;
      } finally {
        sessionInitPromiseRef.current = null;
      }
    })();

    return sessionInitPromiseRef.current;
  };

  // End the avatar session
  const terminateAvatarSession = async () => {
    if (!avatar || !sessionData) {
      onClose();
      return;
    }

    try {
      setIsClosing(true);
      
      // Run cleanup first
      if (cleanupRef.current) {
        cleanupRef.current();
      }

      // Then stop the avatar
      await avatar.stopAvatar();
      
      // Clear state
      setAvatar(null);
      setSessionData(null);
      initializationRef.current = false;
      isReadyRef.current = false;
      sessionInitPromiseRef.current = null;
      openaiAssistantRef.current = null;
      
      // Remove global avatar instance
      delete (window as any).avatar;
      
      // Finally close the modal
      onClose();
    } catch (error) {
      console.error('Failed to terminate session:', error);
      setError('Failed to terminate session');
    } finally {
      setIsClosing(false);
    }
  };

  // Chroma key processing loop
  const startChromaKey = () => {
    if (!videoRef.current || !canvasRef.current) return;
    let stopped = false;
    function render() {
      if (stopped) return;
      applyChromaKey(videoRef.current!, canvasRef.current!, chromaKeyConfigRef.current);
      requestAnimationFrame(render);
    }
    render();
    chromaKeyStopRef.current = () => { stopped = true; };
  };

  // Listen for chroma key config changes
  useEffect(() => {
    function updateConfigFromStorage() {
      const stored = localStorage.getItem('chromaKeyConfig');
      if (stored) {
        chromaKeyConfigRef.current = JSON.parse(stored);
      }
    }
    updateConfigFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chromaKeyConfig') {
        updateConfigFromStorage();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Start chroma keying when video is ready
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    let started = false;
    const tryStart = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        !started
      ) {
        started = true;
        startChromaKey();
      }
    };
    videoRef.current.addEventListener('loadedmetadata', tryStart);
    tryStart();
    return () => {
      if (chromaKeyStopRef.current) chromaKeyStopRef.current();
      videoRef.current?.removeEventListener('loadedmetadata', tryStart);
    };
  }, []);

  useEffect(() => {
    console.log("[AvatarVideoStream] Component mounted");
    initializeAvatarSession();
    
    // Listen for chat requests via storage events
    console.log("[AvatarVideoStream] Setting up storage event listener");
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentChatRequest' && e.newValue) {
        console.log("[AvatarVideoStream] Received chat request via storage");
        try {
          const chatRequest = JSON.parse(e.newValue);
          handleChatRequest(new CustomEvent(CHAT_REQUEST_EVENT, {
            detail: { question: chatRequest.question }
          }));
        } catch (error) {
          console.error("[AvatarVideoStream] Failed to parse chat request:", error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      console.log("[AvatarVideoStream] Component unmounting");
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (avatar) {
        avatar.stopAvatar().catch(console.error);
      }
      initializationRef.current = false;
      isReadyRef.current = false;
      sessionInitPromiseRef.current = null;
      openaiAssistantRef.current = null;
      delete (window as any).avatar;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle chat request
  const handleChatRequest = async (event: Event) => {
    console.log("[AvatarVideoStream] Received chat request event");
    const customEvent = event as CustomEvent;
    const { question } = customEvent.detail;
    console.log("[AvatarVideoStream] Question received:", question);

    if (!isReadyRef.current) {
      console.log("[AvatarVideoStream] Components not ready, queueing request");
      pendingChatRequestsRef.current.push({
        question,
        timestamp: Date.now()
      });
      return;
    }

    try {
      console.log("[AvatarVideoStream] Processing question through OpenAI Assistant");
      const response = await openaiAssistantRef.current?.getResponse(question);
      if (!response) {
        throw new Error("No response from OpenAI Assistant");
      }
      console.log("[AvatarVideoStream] OpenAI Assistant response:", response);

      // Add to chat history
      const newMessage: ChatMessage = {
        question,
        response,
        timestamp: new Date().toLocaleString()
      };
      
      // Update localStorage
      const history = localStorage.getItem('avatarChatHistory');
      const chatHistory = history ? JSON.parse(history) : [];
      const updatedHistory = [...chatHistory, newMessage];
      localStorage.setItem('avatarChatHistory', JSON.stringify(updatedHistory));
      
      // Dispatch event to notify other windows
      console.log("[AvatarVideoStream] Updating chat history");
      const event = new CustomEvent(CHAT_HISTORY_EVENT, { 
        detail: updatedHistory,
        bubbles: true,
        composed: true
      });
      window.dispatchEvent(event);

      // Make avatar speak
      console.log("[AvatarVideoStream] Making avatar speak response");
      try {
        const currentAvatar = (window as any).avatar;
        if (!currentAvatar) {
          throw new Error("Avatar not available");
        }
        // Set localStorage for speaking started
        console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to started");
        localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'started', question }));
        await currentAvatar.speak({
          text: response,
          taskType: TaskType.REPEAT
        });
        // Set localStorage for speaking ended
        console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to ended");
        localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'ended', question }));
        console.log("[AvatarVideoStream] Avatar finished speaking");
      } catch (speakError) {
        console.error("[AvatarVideoStream] Failed to make avatar speak:", speakError);
        setError("Failed to make avatar speak");
        // Set localStorage for speaking ended (error case)
        console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to ended (error case)");
        localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'ended', question }));
      }
    } catch (error) {
      console.error('[AvatarVideoStream] Failed to process chat request:', error);
      setError('Failed to process chat request');
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Top bar with controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-6 py-4">
        <Link 
          href="/chat-interface" 
          target="_blank"
          className="bg-black/60 text-white rounded-lg px-4 py-2 hover:text-blue-400 hover:bg-black/80 transition-colors"
          onClick={(e) => {
            if (!e.ctrlKey) {
              e.preventDefault();
            }
          }}
        >
          Open Chat Interface
        </Link>
        <button
          onClick={terminateAvatarSession}
          disabled={isClosing}
          className={`bg-black/60 text-white rounded-lg px-4 py-2 hover:text-red-400 hover:bg-black/80 transition-colors ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isClosing ? 'Closing...' : 'Close'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Video container */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover absolute top-0 left-0"
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover absolute top-0 left-0 pointer-events-none"
        />
      </div>
    </div>
  );
} 