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

// Custom event for chat history updates
const CHAT_HISTORY_EVENT = 'chatHistoryUpdate';

export default function AvatarVideoStream({ avatarName, onClose }: AvatarVideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const initializationRef = useRef<boolean>(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const sessionInitPromiseRef = useRef<Promise<void> | null>(null);
  const openaiAssistantRef = useRef<OpenAIAssistant | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const history = localStorage.getItem('avatarChatHistory');
    if (history) {
      setChatHistory(JSON.parse(history));
    }
  }, []);

  // Listen for chat history updates
  useEffect(() => {
    const handleChatUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setChatHistory(customEvent.detail);
      }
    };

    window.addEventListener(CHAT_HISTORY_EVENT, handleChatUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'avatarChatHistory') {
        if (e.newValue) {
          setChatHistory(JSON.parse(e.newValue));
        } else {
          setChatHistory([]);
        }
      }
    });

    return () => {
      window.removeEventListener(CHAT_HISTORY_EVENT, handleChatUpdate);
      window.removeEventListener('storage', (e) => {
        if (e.key === 'avatarChatHistory') {
          if (e.newValue) {
            setChatHistory(JSON.parse(e.newValue));
          } else {
            setChatHistory([]);
          }
        }
      });
    };
  }, []);

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

  // Initialize streaming avatar session
  const initializeAvatarSession = async () => {
    // If we already have a session initialization in progress, return that promise
    if (sessionInitPromiseRef.current) {
      return sessionInitPromiseRef.current;
    }

    // If we're already initialized, don't create a new session
    if (initializationRef.current) {
      return;
    }

    // Create a new initialization promise
    sessionInitPromiseRef.current = (async () => {
      try {
        setError(null);
        const token = await fetchAccessToken();
        const newAvatar = new StreamingAvatar({ token });

        // Initialize OpenAI Assistant
        const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        const openaiAssistantId = process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID;
        
        if (!openaiApiKey || !openaiAssistantId) {
          throw new Error('OpenAI API key or Assistant ID not set in environment variables');
        }

        const openaiAssistant = new OpenAIAssistant(openaiApiKey, openaiAssistantId);
        await openaiAssistant.initialize();
        openaiAssistantRef.current = openaiAssistant;

        // Set up event listeners
        const handleStreamReady = (event: any) => {
          if (event.detail && videoRef.current) {
            videoRef.current.srcObject = event.detail;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(console.error);
            };
          } else {
            console.error("Stream is not available");
            setError("Stream is not available");
          }
        };

        const handleStreamDisconnected = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          if (!isClosing) {
            setError("Stream disconnected");
          }
        };

        newAvatar.on(StreamingEvents.STREAM_READY, handleStreamReady);
        newAvatar.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
        
        const newSessionData = await newAvatar.createStartAvatar({
          quality: AvatarQuality.High,
          avatarName,
        });

        console.log("Session data:", newSessionData);
        setAvatar(newAvatar);
        setSessionData(newSessionData);
        initializationRef.current = true;

        // Store cleanup function
        cleanupRef.current = () => {
          newAvatar.off(StreamingEvents.STREAM_READY, handleStreamReady);
          newAvatar.off(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected);
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize avatar session:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize avatar session');
        initializationRef.current = false;
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
      sessionInitPromiseRef.current = null;
      openaiAssistantRef.current = null;
      
      // Finally close the modal
      onClose();
    } catch (error) {
      console.error('Failed to terminate session:', error);
      setError('Failed to terminate session');
    } finally {
      setIsClosing(false);
    }
  };

  // Handle speaking event
  const handleSpeak = async () => {
    if (avatar && openaiAssistantRef.current && userInput) {
      try {
        console.log("User question:", userInput);
        const response = await openaiAssistantRef.current.getResponse(userInput);
        console.log("OpenAI Assistant response:", response);

        // Add to chat history
        const newMessage: ChatMessage = {
          question: userInput,
          response: response,
          timestamp: new Date().toLocaleString()
        };
        
        // Update state and localStorage
        const updatedHistory = [...chatHistory, newMessage];
        setChatHistory(updatedHistory);
        localStorage.setItem('avatarChatHistory', JSON.stringify(updatedHistory));
        
        // Dispatch event to notify other windows
        const event = new CustomEvent(CHAT_HISTORY_EVENT, { 
          detail: updatedHistory,
          bubbles: true,
          composed: true
        });
        window.dispatchEvent(event);

        await avatar.speak({
          text: response,
          taskType: TaskType.REPEAT,
        });
        setUserInput('');
      } catch (error) {
        console.error('Failed to speak:', error);
        setError('Failed to send message');
      }
    }
  };

  useEffect(() => {
    initializeAvatarSession();
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (avatar) {
        avatar.stopAvatar().catch(console.error);
      }
      initializationRef.current = false;
      sessionInitPromiseRef.current = null;
      openaiAssistantRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Top bar with controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4 flex justify-between items-center">
        <Link 
          href="/chat-history" 
          target="_blank"
          className="text-white hover:text-blue-400 transition-colors"
          onClick={(e) => {
            if (!e.ctrlKey) {
              e.preventDefault();
            }
          }}
        >
          View Chat History
        </Link>
        <button
          onClick={terminateAvatarSession}
          disabled={isClosing}
          className={`text-white hover:text-red-400 transition-colors ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
      </div>

      {/* Input container */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black bg-opacity-50">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-white bg-opacity-10 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSpeak();
              }
            }}
            disabled={isClosing}
          />
          <button
            onClick={handleSpeak}
            disabled={isClosing}
            className={`px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Speak
          </button>
        </div>
      </div>
    </div>
  );
} 