import { useState, useRef, useEffect } from 'react';

interface AudioHandlerProps {
  onTranscriptionComplete: (text: string) => void;
  isRecording: boolean;
  onRecordingStatusChange: (status: string) => void;
}

export default function AudioHandler({ onTranscriptionComplete, isRecording, onRecordingStatusChange }: AudioHandlerProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendToWhisper(audioBlob);
      };

      mediaRecorder.start(1000);
      onRecordingStatusChange('Recording... Speak now');
    } catch (error) {
      console.error('Error starting recording:', error);
      onRecordingStatusChange('Error: ' + (error as Error).message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      onRecordingStatusChange('Processing audio...');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const sendToWhisper = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      onRecordingStatusChange('');
      onTranscriptionComplete(data.text);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      onRecordingStatusChange('Error: Failed to transcribe audio');
    }
  };

  return null; // This is a utility component, no UI needed
} 