'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  duration?: number;
}

export default function Toast({ message, type, onConfirm, onCancel, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onCancel();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onCancel]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className={`${getTypeStyles()} text-white rounded-lg shadow-lg p-4 min-w-[300px]`}>
        <div className="flex items-center justify-between">
          <p className="font-medium">{message}</p>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => {
                setIsVisible(false);
                onConfirm();
              }}
              className="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setIsVisible(false);
                onCancel();
              }}
              className="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 