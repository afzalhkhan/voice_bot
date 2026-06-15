"use client";

import { useState } from 'react';
import { Users, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function BulkDialer() {
    const [input, setInput] = useState('');
    const [prompt, setPrompt] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [results, setResults] = useState<any[]>([]);

    const handleBulkDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setResults([]);

        const numbers = input.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);

        if (numbers.length === 0) {
            setStatus('error');
            return;
        }

        try {
            const res = await fetch('/api/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numbers, prompt }),
            });

            const data = await res.json();
            setResults(data.results || []);

            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (err: any) {
            setStatus('error');
        }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-6 rounded-2xl shadow-xl hover:border-slate-800 transition-all duration-300 w-full">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Campaign Queue</h2>
                    <p className="text-xs text-slate-400 mt-1">Dial multiple outbound calls in a queue.</p>
                </div>
                <Users className="w-5 h-5 text-indigo-400/80" />
            </div>

            <form onSubmit={handleBulkDispatch} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Numbers (Comma/Newline)</label>
                    <textarea
                        placeholder="+919876543210&#10;+919988776655&#10;+12125551234"
                        required
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 h-28 resize-none font-mono placeholder-slate-700 transition-all"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Campaign Context Prompt</label>
                    <input
                        type="text"
                        placeholder="e.g. Survey about food orders..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-slate-700 transition-all"
                    />
                </div>

                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transform active:scale-95"
                >
                    {status === 'loading' ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Enqueuing...
                        </>
                    ) : (
                        <>
                            <Users className="w-4 h-4" /> Start Campaign Queue
                        </>
                    )}
                </button>

                {status === 'success' && (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 mt-2 border border-slate-800/80 p-2 rounded-xl bg-slate-950/40">
                        {results.map((res, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800/40 text-xs">
                                <span className="font-mono text-slate-300">{res.phoneNumber}</span>
                                {res.status === 'dispatched' ? (
                                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Dispatched</span>
                                ) : (
                                    <span className="text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </form>
        </div>
    );
}
