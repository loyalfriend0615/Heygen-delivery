'use client';

import { useEffect, useRef, useState } from 'react';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType
} from "@heygen/streaming-avatar";
import { OpenAIAssistant } from '../lib/openai-assistant';
import Link from 'next/link';
import IdleVideoPlayer from './IdleVideoPlayer';

interface AvatarVideoStreamProps {
  avatarName: string;
  idleVideoUrl: string;
  toLiveVideoUrl: string;
  toIdleVideoUrl: string;
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

export default function AvatarVideoStream({ avatarName, idleVideoUrl, toLiveVideoUrl, toIdleVideoUrl, onClose }: AvatarVideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showIdleVideo, setShowIdleVideo] = useState(true);
  const [isAvatarStreamReady, setIsAvatarStreamReady] = useState(false);
  const initializationRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const sessionInitPromiseRef = useRef<Promise<void> | null>(null);
  const openaiAssistantRef = useRef<OpenAIAssistant | null>(null);
  const pendingChatRequestsRef = useRef<{ question: string; timestamp: number }[]>([]);
  const isReadyRef = useRef<boolean>(false);
  const chromaKeyConfigRef = useRef({ minHue: 103, maxHue: 337, minSaturation: 0.75, threshold: 1.0 });
  const chromaKeyStopRef = useRef<() => void>();
  const avatarStreamRef = useRef<MediaStream | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityCountdownRef = useRef<number>(30);
  const inactivityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [phase, setPhase] = useState<'idle' | 'to_live' | 'stream' | 'to_idle'>('idle');
  const phaseRef = useRef(phase);
  const [pendingTransitionToLive, setPendingTransitionToLive] = useState(false);
  const toLiveVideoRef = useRef<HTMLVideoElement>(null);
  const toIdleVideoRef = useRef<HTMLVideoElement>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const [pendingResponse, setPendingResponse] = useState<{ question: string; response: string } | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { avatarRef.current = avatar; }, [avatar]);

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
            throw new Error("No response from OpenAI Assistant");
          }
          console.log("[AvatarVideoStream] OpenAI Assistant response:", response);

          // Store the response for later use
          console.log("[AvatarVideoStream] Storing response for later speaking");
          setPendingResponse({ question: request.question, response });
        } catch (error) {
          console.error("[AvatarVideoStream] Failed to process pending request:", error);
          setError("Failed to process pending request");
        }
      }
    }
  };

  // Shared function to update chat history and dispatch event
  function updateChatHistory(question: string, response: string) {
    const newMessage: ChatMessage = {
      question,
      response,
      timestamp: new Date().toLocaleString()
    };
    const history = localStorage.getItem('avatarChatHistory');
    const chatHistory = history ? JSON.parse(history) : [];
    const updatedHistory = [...chatHistory, newMessage];
    localStorage.setItem('avatarChatHistory', JSON.stringify(updatedHistory));
    // Dispatch event to notify other windows
    const event = new CustomEvent(CHAT_HISTORY_EVENT, {
      detail: updatedHistory,
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
  }

  // Make avatar speak the pending response when in stream phase
  const speakPendingResponse = async () => {
    console.log("[AvatarVideoStream] Checking if should speak pending response:", { 
      hasPendingResponse: !!pendingResponse, 
      hasAvatar: !!avatar, 
      phase 
    });
    if (!pendingResponse || !avatar || phase !== 'stream') {
      console.log("[AvatarVideoStream] Not ready to speak:", { 
        pendingResponse: !!pendingResponse, 
        avatar: !!avatar, 
        phase 
      });
      return;
    }
    console.log("[AvatarVideoStream] Making avatar speak pending response");
    try {
      const currentAvatar = (window as any).avatar;
      if (!currentAvatar) {
        throw new Error("Avatar not available");
      }
      // Set localStorage for speaking started
      console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to started");
      localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'started', question: pendingResponse.question }));
      // Update chat history here
      updateChatHistory(pendingResponse.question, pendingResponse.response);
      await currentAvatar.speak({
        text: pendingResponse.response,
        taskType: TaskType.REPEAT
      });
      // Clear pending response after speaking
      setPendingResponse(null);
    } catch (speakError) {
      console.error("[AvatarVideoStream] Failed to make avatar speak:", speakError);
      setError("Failed to make avatar speak");
      // Set localStorage for speaking ended (error case)
      console.log("[AvatarVideoStream] Setting avatarSpeakingStatus to ended (error case)");
      localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'ended', question: pendingResponse.question }));
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
          if (event.detail) {
            avatarStreamRef.current = event.detail;
            // If videoRef is available (video is rendered), attach stream
            if (videoRef.current) {
              videoRef.current.srcObject = event.detail;
              videoRef.current.onloadedmetadata = () => {
                console.log("[AvatarVideoStream] Video metadata loaded");
                videoRef.current?.play().catch(console.error);
              };
            }
          } else {
            console.warn("[AvatarVideoStream] Stream is not available yet, will retry on next event.");
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
        newAvatar.on(StreamingEvents.AVATAR_STOP_TALKING, (event) => {
          console.log('[Heygen] AVATAR_STOP_TALKING event received:', event);
          // Set avatarSpeakingStatus to ended for the current question
          const lastQuestion = (window as any).currentChatQuestion || '';
          localStorage.setItem('avatarSpeakingStatus', JSON.stringify({ status: 'ended', question: lastQuestion }));

          // Only start inactivity timer if in 'stream' phase (live state)
          if (phaseRef.current === 'stream') {
            clearInactivityTimers();
            inactivityCountdownRef.current = 20;
            console.log('[InactivityTimer][LOCAL] Started: 20 seconds');
            inactivityIntervalRef.current = setInterval(() => {
              inactivityCountdownRef.current -= 1;
              console.log(`[InactivityTimer][LOCAL] Countdown: ${inactivityCountdownRef.current}s`);
            }, 1000);
            inactivityTimeoutRef.current = setTimeout(() => {
              console.log('[InactivityTimer][LOCAL] Timer expired, transitioning to idle phase');
              clearInactivityTimers();
              transitionToIdlePhase();
            }, 20000);
          } else {
            console.log('[InactivityTimer][LOCAL] Not starting timer: phase is', phaseRef.current);
          }
        });
        
        console.log("[AvatarVideoStream] Creating avatar session");
        const newSessionData = await newAvatar.createStartAvatar({
          quality: AvatarQuality.High,
          avatarName
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

  // Cleanup avatar session (stop avatar, cleanup, clear state, remove global, clear video)
  const cleanupAvatarSession = async () => {
    console.log('[Cleanup][DEBUG] cleanupAvatarSession called. avatar:', !!avatarRef.current, 'sessionData:', !!sessionData);
    try {
      setIsClosing(true);
      if (cleanupRef.current) {
        console.log('[Cleanup][DEBUG] Running cleanup before stopAvatar');
        cleanupRef.current();
      }
      if (avatarRef.current) {
        console.log('[Cleanup][DEBUG] Calling avatarRef.current.stopAvatar()');
        await avatarRef.current.stopAvatar();
      setAvatar(null);
        avatarRef.current = null;
        delete (window as any).avatar;
      }
      setSessionData(null);
      initializationRef.current = false;
      isReadyRef.current = false;
      sessionInitPromiseRef.current = null;
      openaiAssistantRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        console.log('[Cleanup][DEBUG] Cleared videoRef srcObject');
      }
      console.log('[Cleanup][DEBUG] Avatar session closed');
    } catch (error) {
      setError('Failed to terminate session');
      console.error('[Cleanup][DEBUG] Error terminating session:', error);
    } finally {
      setIsClosing(false);
    }
  };

  // End the avatar session and close modal
  const terminateAvatarSession = async () => {
    await cleanupAvatarSession();
    onClose();
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
    handleChatInput();
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
        // Update chat history here
        updateChatHistory(question, response);
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

  // Handler: when chat input is received, set pendingTransitionToLive
  function handleChatInput() {
    console.log('[AvatarVideoStream][DEBUG] handleChatInput called. phase:', phase, 'pendingTransitionToLive:', pendingTransitionToLive);
    // Stop/reset inactivity timer on user input
    clearInactivityTimers();
    if (phase === 'idle') {
      setPendingTransitionToLive(true);
      // Start avatar session creation in background immediately
      console.log('[AvatarVideoStream][DEBUG] Starting avatar session creation immediately on user input');
      initializeAvatarSession();
      // Do NOT pause or end the idle video here; let it finish its loop
    }
  }

  // Handler: when idle video ends, check if we should transition
  function handleIdleVideoEnd() {
    console.log('[AvatarVideoStream][DEBUG] handleIdleVideoEnd called. phase:', phase, 'pendingTransitionToLive:', pendingTransitionToLive);
    if (phase === 'idle' && pendingTransitionToLive) {
      console.log('[AvatarVideoStream][DEBUG] Transitioning to to_live phase');
      setPhase('to_live');
      setPendingTransitionToLive(false);
      // Play to_live video
      if (toLiveVideoRef.current) {
        console.log('[AvatarVideoStream][DEBUG] Playing to_live video');
        toLiveVideoRef.current.currentTime = 0;
        toLiveVideoRef.current.play().catch(error => {
          console.error('[AvatarVideoStream][DEBUG] Error playing to_live video:', error);
        });
      } else {
        console.error('[AvatarVideoStream][DEBUG] to_live video ref is not available');
      }
    } else {
      // If we're in idle phase but not pending transition, just loop the idle video
      if (phase === 'idle' && idleVideoRef.current) {
        console.log('[AvatarVideoStream][DEBUG] Looping idle video');
        idleVideoRef.current.currentTime = 0;
        idleVideoRef.current.play().catch(() => {});
      }
    }
  }

  const handleIdleVideoError = (error: string) => {
    setError(error);
    setShowIdleVideo(false);
  };

  // Preload to_live and to_idle videos
  useEffect(() => {
    if (toLiveVideoUrl && toLiveVideoRef.current) {
      toLiveVideoRef.current.src = toLiveVideoUrl;
      toLiveVideoRef.current.load();
    }
    if (toIdleVideoUrl && toIdleVideoRef.current) {
      toIdleVideoRef.current.src = toIdleVideoUrl;
      toIdleVideoRef.current.load();
    }
  }, [toLiveVideoUrl, toIdleVideoUrl]);

  // Handler: when to_live video ends, transition to 'stream' phase
  function handleToLiveVideoEnd() {
    console.log('[AvatarVideoStream][DEBUG] to_live video ended, transitioning to stream phase');
    setPhase('stream');
  }

  // Attach stream to video when avatar stream video is present and phase is 'stream'
  useEffect(() => {
    if (phase === 'stream' && videoRef.current && avatarStreamRef.current) {
      videoRef.current.srcObject = avatarStreamRef.current;
      videoRef.current.play().catch(console.error);
      setIsAvatarStreamReady(true);
      const handler = () => {
        videoRef.current?.play().catch(console.error);
        setIsAvatarStreamReady(true);
      };
      videoRef.current.addEventListener('loadedmetadata', handler);
      return () => {
        videoRef.current?.removeEventListener('loadedmetadata', handler);
      };
    }
  }, [phase]);

  // Only make avatar speak when entering stream phase
  useEffect(() => {
    console.log('[AvatarVideoStream][DEBUG] useEffect phase:', phase);
    if (phase === 'stream') {
      console.log('[AvatarVideoStream][DEBUG] In stream phase, making avatar speak pending response');
      // Add a small delay to ensure stream is ready
      setTimeout(() => {
        speakPendingResponse();
      }, 1000);
    }
  }, [phase]);

  // Helper to clear inactivity timer and interval
  function clearInactivityTimers() {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      console.log('[InactivityTimer][DEBUG] Cleared inactivity timeout');
    }
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current);
      console.log('[InactivityTimer][DEBUG] Cleared inactivity interval');
    }
  }

  // Transition to idle phase (play to_idle_video, then idle_video)
  async function transitionToIdlePhase() {
    console.log('[LiveToIdle][DEBUG] transitionToIdlePhase called');
    await cleanupAvatarSession();
    setPhase('to_idle');
    // Play to_idle_video
    if (toIdleVideoRef.current) {
      toIdleVideoRef.current.currentTime = 0;
      toIdleVideoRef.current.play().catch(() => {});
      console.log('[LiveToIdle][DEBUG] Playing to_idle_video');
    }
  }

  // Handler: when to_idle video ends, transition to idle phase
  function handleToIdleVideoEnd() {
    console.log('[LiveToIdle][DEBUG] to_idle_video ended, transitioning to idle phase');
    setPhase('idle');
    setPendingTransitionToLive(false); // Reset pending transition flag
    if (idleVideoRef.current) {
      idleVideoRef.current.currentTime = 0;
      idleVideoRef.current.play().catch(() => {});
      console.log('[LiveToIdle][DEBUG] Looping idle_video');
    }
  }

  // Listen for avatar speaking status to start inactivity timer
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'avatarSpeakingStatus' && e.newValue) {
        try {
          const { status } = JSON.parse(e.newValue);
          if (status === 'ended') {
            // Start inactivity timer (20s)
            clearInactivityTimers();
            inactivityCountdownRef.current = 20;
            console.log('[InactivityTimer] Started: 20 seconds');
            inactivityIntervalRef.current = setInterval(() => {
              inactivityCountdownRef.current -= 1;
              console.log(`[InactivityTimer] Countdown: ${inactivityCountdownRef.current}s`);
            }, 1000);
            inactivityTimeoutRef.current = setTimeout(() => {
              console.log('[InactivityTimer] Timer expired, transitioning to idle phase');
              clearInactivityTimers();
              transitionToIdlePhase();
            }, 20000);
          } else if (status === 'started') {
            // Cancel inactivity timer if avatar starts speaking again
            clearInactivityTimers();
            console.log('[InactivityTimer] Cancelled (avatar started speaking)');
          }
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInactivityTimers();
    };
  }, []);

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
      <div className="h-screen relative">
        {/* Idle Video (always present, visible in 'idle' phase) */}
        <IdleVideoPlayer
          idleVideoUrl={idleVideoUrl}
          onVideoEnd={handleIdleVideoEnd}
          onError={handleIdleVideoError}
          style={{ display: phase === 'idle' ? 'block' : 'none' }}
          loop={!pendingTransitionToLive}
          videoRef={idleVideoRef}
        />
        {/* to_live Video (always present, visible in 'to_live' phase) */}
        <video
          ref={toLiveVideoRef}
          className="w-full h-full object-contain absolute inset-0"
          style={{ display: phase === 'to_live' ? 'block' : 'none' }}
          onEnded={handleToLiveVideoEnd}
          playsInline
        />
        {/* Avatar Stream Video (always present, visible in 'stream' phase) */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover absolute top-0 left-0"
          autoPlay
          playsInline
          style={{ display: phase === 'stream' ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover absolute top-0 left-0 pointer-events-none"
          style={{ display: phase === 'stream' ? 'block' : 'none' }}
        />
        {/* Spinner if avatar stream not ready after to_live video ends */}
        {phase === 'stream' && !isAvatarStreamReady && (
          <div className="w-full h-full flex items-center justify-center bg-black absolute top-0 left-0">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
        {/* to_idle Video (always present, visible in 'to_idle' phase) */}
        <video
          ref={toIdleVideoRef}
          className="w-full h-full object-contain absolute inset-0"
          style={{ display: phase === 'to_idle' ? 'block' : 'none' }}
          onEnded={handleToIdleVideoEnd}
          playsInline
        />
      </div>
    </div>
  );
} 