'use client';

import { useEffect, useState, useRef } from 'react';
import { Mic, MessageSquare, Send, Play, Square } from "lucide-react";
import Toast from '../components/Toast';
import AvatarVideoStream from '../components/AvatarVideoStream';
import ChromaKeyPanel from '../components/ChromaKeyPanel';
import AudioHandler from '../components/AudioHandler';
import AudioVisualizer from '../components/AudioVisualizer';
import AudioSignalAnimation from '../components/AudioSignalAnimation';

// Custom events for communication
const CHAT_HISTORY_EVENT = 'chatHistoryUpdate';
const AVATAR_SPEAKING_STARTED = 'avatarSpeakingStarted';
const AVATAR_SPEAKING_ENDED = 'avatarSpeakingEnded';

interface ChatMessage {
  question: string;
  response: string;
  timestamp: string;
}

declare global {
  interface Window {
    currentChatQuestion?: string;
  }
}

export default function ChatInterface() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [mode, setMode] = useState<'text' | 'audio'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentQuestionRef = useRef<string>('');

  // Load chat history from localStorage on mount
  useEffect(() => {
    const history = localStorage.getItem('avatarChatHistory');
    if (history) {
      setChatHistory(JSON.parse(history));
    }
  }, []);

  // Listen for chat history updates
  useEffect(() => {
    const handleChatHistoryUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setChatHistory([...customEvent.detail]);
    };
    window.addEventListener(CHAT_HISTORY_EVENT, handleChatHistoryUpdate);
    return () => window.removeEventListener(CHAT_HISTORY_EVENT, handleChatHistoryUpdate);
  }, []);

  // Listen for avatar speaking status via localStorage (cross-tab)
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'avatarSpeakingStatus' && event.newValue) {
        try {
          const { status } = JSON.parse(event.newValue);
          if (status === 'started') {
            setIsLoading(true);
          } else if (status === 'ended') {
            setIsLoading(false);
            currentQuestionRef.current = '';
          }
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Poll localStorage for chat history changes every 1 second
  useEffect(() => {
    let lastHistory = JSON.stringify(chatHistory);
    const interval = setInterval(() => {
      const history = localStorage.getItem('avatarChatHistory');
      if (history && history !== lastHistory) {
        const parsed = JSON.parse(history);
        setChatHistory(parsed);
        lastHistory = history;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Mode toggle logic ---
  const toggleMode = () => {
    setMode((prev) => (prev === 'text' ? 'audio' : 'text'));
    if (isRecording) setIsRecording(false);
  };

  // --- Send/Record button logic ---
  const handleSendOrRecord = () => {
    if (mode === 'text') {
      handleSpeak();
    } else {
      if (isRecording) {
        setIsRecording(false);
      } else {
        setIsRecording(true);
      }
    }
  };

  // --- Chat logic (same as before) ---
  const handleSpeak = async () => {
    if (!userInput.trim()) return;
    try {
      const currentInput = userInput;
      currentQuestionRef.current = currentInput;
      window.currentChatQuestion = currentInput;
      setUserInput('');
      setChatHistory(prev => [
        ...prev,
        {
          question: currentInput,
          response: '...',
          timestamp: new Date().toLocaleString()
        }
      ]);
      localStorage.setItem('currentChatRequest', JSON.stringify({
        question: currentInput,
        timestamp: Date.now()
      }));
      setIsLoading(true);
    } catch (error) {
      setError('Failed to send message');
      setToastMessage('Failed to send message');
      setShowToast(true);
      setIsLoading(false);
      currentQuestionRef.current = '';
    }
  };

  const handleTranscriptionComplete = async (text: string) => {
    if (!text.trim()) return;
    try {
      currentQuestionRef.current = text;
      setChatHistory(prev => [
        ...prev,
        {
          question: text,
          response: '...',
          timestamp: new Date().toLocaleString()
        }
      ]);
      localStorage.setItem('currentChatRequest', JSON.stringify({
        question: text,
        timestamp: Date.now()
      }));
      setIsLoading(true);
      setUserInput('');
    } catch (error) {
      setError('Failed to send transcribed message');
      setToastMessage('Failed to send transcribed message');
    setShowToast(true);
      setIsLoading(false);
      currentQuestionRef.current = '';
    }
  };

  const clearHistory = () => setShowToast(true);
  const handleConfirmClear = () => {
    try {
      localStorage.removeItem('avatarChatHistory');
      setChatHistory([]);
      const event = new CustomEvent(CHAT_HISTORY_EVENT, { detail: [], bubbles: true, composed: true });
      window.dispatchEvent(event);
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'avatarChatHistory',
        newValue: null,
        oldValue: localStorage.getItem('avatarChatHistory'),
        storageArea: localStorage,
        url: window.location.href
      }));
      setShowToast(false);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };
  const handleCancelClear = () => setShowToast(false);

  return (
    <>
      <style jsx global>{`
        /* For all browsers supporting ::-webkit-scrollbar */
        ::-webkit-scrollbar {
          width: 12px !important;
          background-color: #f3f4f6 !important;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #e5e7eb !important;
          border-radius: 8px !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: #d1d5db !important;
        }
        /* For Firefox */
        html, body, .chat-interface-container {
          scrollbar-color: #e5e7eb #f3f4f6 !important;
          scrollbar-width: thin !important;
        }
        /* Force light input area */
        .chat-interface-container .input-area {
          background-color: #fff !important;
          color: #111827 !important;
        }
        .chat-interface-container .input-area input {
          background-color: #fff !important;
          color: #111827 !important;
        }
      `}</style>
      <div className="chat-interface-container min-h-screen bg-[#f3f4f6] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Chat Interface</h1>
            <button
              onClick={clearHistory}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Clear History
            </button>
          </div>

          {/* Chat History */}
          <div className="space-y-4 mb-8" ref={chatContainerRef}>
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8 bg-white rounded-lg shadow">
                No chat history available
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">{message.timestamp}</p>
                    <p className="font-semibold text-gray-800">Q: {message.question}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">A: {message.response}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Interface - v0 style */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
            <div className="flex items-center w-full max-w-3xl mx-auto gap-2">
              {/* Mode toggle button (left) */}
              <button
                className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                onClick={toggleMode}
                aria-label={mode === 'text' ? 'Switch to Audio' : 'Switch to Chat'}
                type="button"
              >
                {mode === 'text' ? <Mic className="h-5 w-5 text-gray-900" /> : <MessageSquare className="h-5 w-5 text-gray-900" />}
              </button>

              {/* Input field or audio visualizer */}
              <div className="input-area flex-1 relative bg-white rounded-lg h-12 overflow-hidden border border-gray-200">
                {mode === 'text' ? (
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="w-full h-full px-4 outline-none"
                    placeholder="Type your message..."
                    disabled={isLoading}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isLoading) handleSpeak();
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center px-4">
                    {isRecording ? (
                      <AudioSignalAnimation isRecording={isRecording} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        Tap to record audio
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Send/Record button (right) */}
              <button
                className="h-12 w-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                onClick={handleSendOrRecord}
                aria-label={mode === 'text' ? 'Send Message' : isRecording ? 'Stop Recording' : 'Start Recording'}
                type="button"
                disabled={isLoading || (mode === 'text' && !userInput.trim())}
              >
                {mode === 'text' ? (
                  isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Send className="h-5 w-5 text-gray-900" />
                  )
                ) : isRecording ? (
                  <Square className="h-5 w-5 text-gray-900" />
                ) : (
                  <Play className="h-5 w-5 text-gray-900" />
                )}
              </button>
              <ChromaKeyPanel />
            </div>
          </div>
        </div>

        {/* Audio Handler */}
        <AudioHandler
          isRecording={isRecording}
          onTranscriptionComplete={handleTranscriptionComplete}
          onRecordingStatusChange={setRecordingStatus}
        />

        {/* Toast Notification */}
        {showToast && (
          <Toast
            message="Are you sure you want to clear all chat history?"
            type="warning"
            onConfirm={handleConfirmClear}
            onCancel={handleCancelClear}
            duration={0}
          />
        )}
      </div>
    </>
  );
} 