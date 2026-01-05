
import React, { useState, useCallback, useRef, useEffect } from 'react';
import SpeakNowButton from './components/SpeakNowButton';
import SubtitleOverlay from './components/SubtitleOverlay';
import WebhookConfig from './components/WebhookConfig';
import { AudioService, AudioSource } from './services/audioService';
import { GeminiLiveService } from './services/geminiService';

const App: React.FC = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => localStorage.getItem('transcribe_webhook_url') || '');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [recentPayloads, setRecentPayloads] = useState<any[]>([]);

  const audioServiceRef = useRef(new AudioService());
  const geminiServiceRef = useRef(new GeminiLiveService());
  const transcriptionTimeoutRef = useRef<any | null>(null);

  useEffect(() => {
    localStorage.setItem('transcribe_webhook_url', webhookUrl);
  }, [webhookUrl]);

  const pushToWebhook = async (text: string) => {
    if (!webhookUrl) return;
    
    // Construct the endpoint URL to target /transcription
    let targetEndpoint = webhookUrl.replace(/\/+$/, '');
    if (!targetEndpoint.endsWith('/transcription')) {
      targetEndpoint += '/transcription';
    }

    const payload = {
      text,
      timestamp: new Date().toISOString(),
      type: 'transcription_chunk',
      session_id: 'live_session_' + Date.now().toString(36)
    };

    setRecentPayloads(prev => [payload, ...prev].slice(0, 5));
    setWebhookStatus('sending');
    
    try {
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setWebhookStatus('success');
      } else {
        setWebhookStatus('error');
      }
    } catch (e) {
      console.error('Webhook push failed:', e);
      setWebhookStatus('error');
    }
  };

  const handleStartTranscription = async (source: AudioSource) => {
    setIsLoading(true);
    setError(null);
    try {
      const stream = await audioServiceRef.current.getStream(source);
      
      await geminiServiceRef.current.startStreaming(stream, {
        onTranscription: (text, isFinal) => {
          setTranscription(prev => {
            const next = prev ? `${prev} ${text}` : text;
            const words = next.split(' ');
            if (words.length > 20) {
              return words.slice(-15).join(' ');
            }
            return next;
          });

          // Expose to webhook endpoint
          pushToWebhook(text);

          if (transcriptionTimeoutRef.current) clearTimeout(transcriptionTimeoutRef.current);
          transcriptionTimeoutRef.current = setTimeout(() => {
            setTranscription('');
          }, 5000);
        },
        onError: (err) => {
          setError(err);
          handleStopTranscription();
        },
        onClose: () => {
          handleStopTranscription();
        }
      });

      setIsStreaming(true);
    } catch (err: any) {
      setError(err.message || "Failed to start audio capture");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTranscription = useCallback(() => {
    geminiServiceRef.current.stop();
    audioServiceRef.current.stop();
    setIsStreaming(false);
    setTranscription('');
    setWebhookStatus('idle');
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col items-center justify-center p-4">
      <WebhookConfig 
        url={webhookUrl} 
        onUpdate={setWebhookUrl} 
        recentPayloads={recentPayloads} 
      />
      
      <div className="max-w-md w-full text-center space-y-8 relative z-10">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-white">
            TRANSCRIBE <span className="text-lime-500 underline decoration-lime-500/30 underline-offset-8">LIVE</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">
            Gemini 2.5 Multi-Source Intelligence
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-mono animate-in fade-in slide-in-from-top-2">
            <span className="font-bold mr-2">[ERROR]</span> {error}
          </div>
        )}

        <div className="flex flex-col items-center space-y-6">
          <SpeakNowButton 
            onStart={handleStartTranscription}
            onStop={handleStopTranscription}
            isStreaming={isStreaming}
            isLoading={isLoading}
          />
          
          <div className="h-6 flex items-center justify-center">
            {isStreaming ? (
              <div className="flex items-center space-x-3 bg-white/5 px-4 py-1 rounded-full border border-white/5">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-lime-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                </span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-lime-500">Broadcasting Stream</span>
                
                {webhookUrl && (
                  <div className="flex items-center pl-2 border-l border-white/10 space-x-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      webhookStatus === 'sending' ? 'bg-blue-500 animate-pulse' :
                      webhookStatus === 'success' ? 'bg-green-500' :
                      webhookStatus === 'error' ? 'bg-red-500' : 'bg-zinc-700'
                    }`} />
                    <span className="text-[9px] text-zinc-500">/transcription</span>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-zinc-600 text-[10px] uppercase tracking-widest font-mono">System Standby</span>
            )}
          </div>
        </div>
      </div>

      <SubtitleOverlay text={transcription} />

      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black opacity-100"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-50"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-lime-500/5 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse [animation-delay:1s]"></div>
      </div>
    </div>
  );
};

export default App;
