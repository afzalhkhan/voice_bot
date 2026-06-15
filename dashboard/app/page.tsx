import CallDispatcher from '@/components/CallDispatcher';
import BulkDialer from '@/components/BulkDialer';
import BrowserTester from '@/components/BrowserTester';
import { Cpu, Radio, Shield, HelpCircle } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col items-center p-6 md:p-12 relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* Background Soft Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 flex flex-col gap-8 w-full max-w-7xl">
        
        {/* Sleek, Premium Custom Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 tracking-widest uppercase mb-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
              Real-Time AI Voice Console
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Voice Assistant <span className="text-indigo-400 font-light">Control Hub</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Configure and manage the AI food and grocery voice ordering assistant.</p>
          </div>
          
          {/* Status Badges */}
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              LiveKit Server Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 shadow-sm">
              <Cpu className="w-3.5 h-3.5" />
              Agent: Active
            </span>
          </div>
        </header>

        {/* Flat Grid Layout with Premium Spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
          <BrowserTester />
          <CallDispatcher />
          <BulkDialer />
        </div>

      </div>
    </main>
  );
}
