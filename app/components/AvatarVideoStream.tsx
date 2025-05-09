'use client';

import { useEffect, useRef, useState } from 'react';
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
} from "@heygen/streaming-avatar";

interface AvatarVideoStreamProps {
  avatarName: string;
  onClose: () => void;
}

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
    if (avatar && userInput) {
      try {
        await avatar.speak({
          text: userInput,
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
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Avatar Chat</h2>
          <button
            onClick={terminateAvatarSession}
            disabled={isClosing}
            className={`text-gray-500 hover:text-gray-700 ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isClosing ? 'Closing...' : 'Close'}
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            className="w-full h-full"
            autoPlay
            playsInline
          />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Speak
          </button>
        </div>
      </div>
    </div>
  );
} 