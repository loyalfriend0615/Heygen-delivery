'use client';

import { useEffect, useState, useRef } from 'react';
import Toast from '../components/Toast';
import AvatarVideoStream from '../components/AvatarVideoStream';
import ChromaKeyPanel from '../components/ChromaKeyPanel';

// Custom events for communication
const CHAT_HISTORY_EVENT = 'chatHistoryUpdate';
const AVATAR_SPEAKING_STARTED = 'avatarSpeakingStarted';
const AVATAR_SPEAKING_ENDED = 'avatarSpeakingEnded';

interface ChatMessage {
  question: string;
  response: string;
  timestamp: string;
}

export default function ChatInterface() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
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
      // Always set the chat history to the new array from the event
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
          const { status, question } = JSON.parse(event.newValue);
          console.log('[ChatInterface] Storage event:', status, question);
          if (question === currentQuestionRef.current) {
            if (status === 'started') {
              setIsLoading(true);
            } else if (status === 'ended') {
              setIsLoading(false);
              currentQuestionRef.current = '';
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
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

  const handleSpeak = async () => {
    if (!userInput.trim()) return;

    try {
      console.log("[ChatInterface] Sending chat request:", userInput);
      
      // Store the current input before clearing it
      const currentInput = userInput;
      currentQuestionRef.current = currentInput; // Store the current question
      console.log("[ChatInterface] Stored current question:", currentQuestionRef.current);
      setUserInput('');
      
      // Optimistically add the question to chat history with a placeholder response
      setChatHistory(prev => [
        ...prev,
        {
          question: currentInput,
          response: '...',
          timestamp: new Date().toLocaleString()
        }
      ]);
      
      // Store chat request in localStorage
      localStorage.setItem('currentChatRequest', JSON.stringify({
        question: currentInput,
        timestamp: Date.now()
      }));
      console.log("[ChatInterface] Chat request stored in localStorage");
      
      // Show loading state
      setIsLoading(true);
    } catch (error) {
      console.error('[ChatInterface] Failed to send message:', error);
      setError('Failed to send message');
      setToastMessage('Failed to send message');
      setShowToast(true);
      setIsLoading(false);
      currentQuestionRef.current = ''; // Clear the current question on error
    }
  };

  const clearHistory = () => {
    setShowToast(true);
  };

  const handleConfirmClear = () => {
    try {
      // Clear localStorage
      localStorage.removeItem('avatarChatHistory');
      // Clear state
      setChatHistory([]);
      // Dispatch event to notify other windows
      const event = new CustomEvent(CHAT_HISTORY_EVENT, { 
        detail: [],
        bubbles: true,
        composed: true
      });
      window.dispatchEvent(event);
      // Also dispatch a storage event to ensure all windows are updated
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'avatarChatHistory',
        newValue: null,
        oldValue: localStorage.getItem('avatarChatHistory'),
        storageArea: localStorage,
        url: window.location.href
      }));
      // Hide toast
      setShowToast(false);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const handleCancelClear = () => {
    setShowToast(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Chat Interface</h1>
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
            <div className="text-center text-gray-500 py-8">
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

        {/* Input Interface */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="max-w-4xl mx-auto flex gap-2 items-center">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={isLoading ? "Waiting for response..." : "Type your message..."}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSpeak();
                }
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleSpeak}
              disabled={isLoading || !userInput.trim()}
              className={`px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                isLoading || !userInput.trim() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                'Send'
              )}
            </button>
            <ChromaKeyPanel />
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message="Are you sure you want to clear all chat history?"
          type="warning"
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
          duration={0} // Don't auto-dismiss
        />
      )}
    </div>
  );
} 