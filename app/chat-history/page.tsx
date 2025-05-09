'use client';

import { useEffect, useState, useRef } from 'react';
import Toast from '../components/Toast';

interface ChatMessage {
  question: string;
  response: string;
  timestamp: string;
}

// Custom event for chat history updates
const CHAT_HISTORY_EVENT = 'chatHistoryUpdate';

export default function ChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showToast, setShowToast] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load initial chat history
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

    // Listen for both storage and custom events
    window.addEventListener('storage', (e) => {
      if (e.key === 'avatarChatHistory' && e.newValue) {
        setChatHistory(JSON.parse(e.newValue));
      }
    });
    window.addEventListener(CHAT_HISTORY_EVENT, handleChatUpdate);

    return () => {
      window.removeEventListener('storage', (e) => {
        if (e.key === 'avatarChatHistory' && e.newValue) {
          setChatHistory(JSON.parse(e.newValue));
        }
      });
      window.removeEventListener(CHAT_HISTORY_EVENT, handleChatUpdate);
    };
  }, []);

  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

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
          <h1 className="text-3xl font-bold">Chat History</h1>
          <button
            onClick={clearHistory}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            Clear History
          </button>
        </div>
        <div className="space-y-4">
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
      </div>

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