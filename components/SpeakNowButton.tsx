
import React, { useState, useRef, useEffect } from 'react';
import { AudioSource } from '../services/audioService';

interface SpeakNowButtonProps {
  onStart: (source: AudioSource) => void;
  onStop: () => void;
  isStreaming: boolean;
  isLoading: boolean;
}

const SpeakNowButton: React.FC<SpeakNowButtonProps> = ({ onStart, onStop, isStreaming, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sources = [
    { id: AudioSource.MIC, label: 'Microphone' },
    { id: AudioSource.INTERNAL, label: 'Internal Speaker' },
    { id: AudioSource.SHARE, label: 'Share Tab/Screen' },
    { id: AudioSource.BOTH, label: 'Both Speaker & Mic' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (source: AudioSource) => {
    setIsOpen(false);
    onStart(source);
  };

  if (isStreaming) {
    return (
      <button
        onClick={onStop}
        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all flex items-center space-x-2 shadow-lg shadow-red-900/20"
      >
        <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
        <span>Stop Transcribing</span>
      </button>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="flex items-center">
        <button
          disabled={isLoading}
          onClick={() => handleAction(AudioSource.MIC)}
          className={`px-8 py-3 ${isLoading ? 'bg-gray-700' : 'bg-lime-500 hover:bg-lime-600'} text-black font-bold rounded-l-full transition-all flex items-center space-x-2`}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          )}
          <span>{isLoading ? 'Connecting...' : 'Speak Now'}</span>
        </button>
        <button
          disabled={isLoading}
          onClick={() => setIsOpen(!isOpen)}
          className={`p-3 ${isLoading ? 'bg-gray-800' : 'bg-lime-400 hover:bg-lime-500'} text-black rounded-r-full border-l border-lime-600 transition-all`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-zinc-900 shadow-2xl ring-1 ring-white/10 focus:outline-none z-50">
          <div className="py-1">
            {sources.map((src) => (
              <button
                key={src.id}
                onClick={() => handleAction(src.id)}
                className="block w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-lime-400 transition-colors"
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakNowButton;
