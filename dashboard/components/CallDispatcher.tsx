"use client";

import { useState } from 'react';
import { Phone, Loader2, Compass } from 'lucide-react';

export default function CallDispatcher() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [prompt, setPrompt] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        const form = e.target as HTMLFormElement;
        const modelProvider = (form.elements.namedItem('modelProvider') as HTMLSelectElement).value;
        const voice = (form.elements.namedItem('voice') as HTMLSelectElement).value;

        try {
            const res = await fetch('/api/dispatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, prompt, modelProvider, voice }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(`Call dispatched successfully to ${phoneNumber}`);
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to dispatch call');
            }
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Network error');
        }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl hover:border-slate-800 transition-all duration-300 w-full">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">SIP Phone Dial-out</h2>
                    <p className="text-xs text-slate-400 mt-1">Dial a real phone number.</p>
                </div>
                <Compass className="w-5 h-5 text-indigo-400/80" />
            </div>

            <form onSubmit={handleDispatch} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Destination Number</label>
                    <input
                        type="tel"
                        placeholder="e.g. +919876543210"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-slate-700 transition-all"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Custom Prompt Override</label>
                    <textarea
                        placeholder="Configure special context for this specific call..."
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
                    disabled={status === 'loading'}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transform active:scale-95"
                >
                    {status === 'loading' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Placing Call...
                        </>
                    ) : (
                        <>
                            <Phone className="w-4 h-4" /> Dial Outbound SIP
                        </>
                    )}
                </button>

                {message && (
                    <div className={`p-3.5 rounded-xl text-xs border ${status === 'success' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' : 'bg-red-950/40 border-red-900/50 text-red-300'}`}>
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
}
