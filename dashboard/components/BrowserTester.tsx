"use client";

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, PhoneOff, Play, Radio, Volume2 } from 'lucide-react';
import { Room, RoomEvent } from 'livekit-client';

export default function BrowserTester() {
    const [prompt, setPrompt] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'connected' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

    const roomRef = useRef<Room | null>(null);

    useEffect(() => {
        return () => {
            disconnectSession();
        };
    }, []);

    const startWebRTCSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('Initializing voice connection...');

        const form = e.target as HTMLFormElement;
        const modelProvider = (form.elements.namedItem('modelProvider') as HTMLSelectElement).value;
        const voice = (form.elements.namedItem('voice') as HTMLSelectElement).value;

        try {
            const res = await fetch('/api/web-dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, modelProvider, voice }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to dispatch agent');
            }

            const { token, serverUrl } = data;

            const room = new Room({
                adaptiveStream: true,
                dynacast: true,
            });
            roomRef.current = room;

            room.on(RoomEvent.TrackSubscribed, (track) => {
                if (track.kind === 'audio') {
                    const audioEl = track.attach();
                    document.body.appendChild(audioEl);
                    setIsAgentSpeaking(true);
                }
            });

            room.on(RoomEvent.TrackUnsubscribed, (track) => {
                if (track.kind === 'audio') {
                    track.detach().forEach(el => el.remove());
                    setIsAgentSpeaking(false);
                }
            });

            room.on(RoomEvent.Disconnected, () => {
                setStatus('idle');
                setMessage('Session ended.');
            });

            setMessage('Connecting to LiveKit...');
            await room.connect(serverUrl, token);
            
            setMessage('Activating mic...');
            await room.localParticipant.setMicrophoneEnabled(true);

            setStatus('connected');
            setMessage('Connected. Talk to the assistant.');
            setIsMuted(false);

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(err.message || 'Connection failed');
            disconnectSession();
        }
    };

    const toggleMute = async () => {
        if (!roomRef.current) return;
        const nextMute = !isMuted;
        await roomRef.current.localParticipant.setMicrophoneEnabled(!nextMute);
        setIsMuted(nextMute);
    };

    const disconnectSession = () => {
        if (roomRef.current) {
            roomRef.current.disconnect();
            roomRef.current = null;
        }
        setStatus('idle');
        setIsAgentSpeaking(false);
    };

    return (
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl hover:border-slate-800 transition-all duration-300 w-full">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Browser Playground</h2>
                    <p className="text-xs text-slate-400 mt-1">Talk to the assistant directly over WebRTC.</p>
                </div>
                <Radio className="w-5 h-5 text-indigo-400/80 animate-pulse" />
            </div>

            {status === 'idle' || status === 'error' ? (
                <form onSubmit={startWebRTCSession} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">System Prompt (Persona)</label>
                        <textarea
                            placeholder="e.g., You are a helpful assistant. Sell pizzas with extra cheese..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 h-24 resize-none placeholder-slate-700 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">LLM Provider</label>
                            <select
                                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all"
                                name="modelProvider"
                                defaultValue="groq"
                            >
                                <option value="groq">Groq (Llama 3)</option>
                                <option value="openai">OpenAI (GPT-4o)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Voice</label>
                            <select
                                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all"
                                name="voice"
                                defaultValue="alloy"
                            >
                                <option value="alloy">Alloy (US)</option>
                                <option value="echo">Echo (US)</option>
                                <option value="shimmer">Shimmer (US)</option>
                                <option value="anushka">Anushka (Indian - Sarvam)</option>
                                <option value="aravind">Aravind (Indian - Sarvam)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
                    >
                        <Play className="w-4 h-4 fill-current" /> Connect Browser Mic
                    </button>

                    {message && status === 'error' && (
                        <div className="p-3.5 rounded-xl text-xs bg-red-950/40 border border-red-900/50 text-red-300">
                            {message}
                        </div>
                    )}
                </form>
            ) : (
                <div className="py-6 space-y-6 flex flex-col items-center">
                    
                    {/* Pulsing Mic Circle */}
                    <div className="relative flex items-center justify-center h-28 w-28">
                        <div className={`absolute inset-0 rounded-full bg-indigo-500/5 border border-indigo-500/10 transition-all duration-500 ${isAgentSpeaking ? 'scale-125 bg-indigo-500/10 border-indigo-500/20' : 'animate-pulse'}`}></div>
                        <div className={`h-20 w-20 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center transition-all duration-300 ${isAgentSpeaking ? 'border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : ''}`}>
                            {isMuted ? (
                                <MicOff className="w-6 h-6 text-red-400" />
                            ) : (
                                <Mic className={`w-6 h-6 ${isAgentSpeaking ? 'text-indigo-400' : 'text-slate-400'}`} />
                            )}
                        </div>
                    </div>

                    <div className="text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                            <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                                {isAgentSpeaking ? 'Assistant Speaking' : 'Listening...'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 font-light">{message}</p>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={toggleMute}
                            className={`flex-1 py-2.5 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${isMuted ? 'bg-red-950/40 border-red-900/50 text-red-300' : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-900'}`}
                        >
                            {isMuted ? (
                                <>
                                    <MicOff className="w-3.5 h-3.5 animate-pulse" /> Unmute
                                </>
                            ) : (
                                <>
                                    <Mic className="w-3.5 h-3.5 text-indigo-400" /> Mute Mic
                                </>
                            )}
                        </button>

                        <button
                            onClick={disconnectSession}
                            className="py-2.5 px-4 bg-red-650 hover:bg-red-550 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer"
                        >
                            <PhoneOff className="w-3.5 h-3.5" /> Disconnect
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
