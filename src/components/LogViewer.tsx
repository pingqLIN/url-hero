import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Trash2, X } from 'lucide-react';

type LogEntry = {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
};

// Global log storage to catch logs even when LogViewer is unmounted
const globalLogs: LogEntry[] = [];
const logSubscribers = new Set<() => void>();

const notifySubscribers = () => logSubscribers.forEach(sub => sub());

// Ensure we only override console once to avoid recursion loops during HMR
if (!(globalThis as any).__logViewerIntercepted) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const interceptAndStore = (level: 'info' | 'warn' | 'error', originalFn: Function, args: any[]) => {
    originalFn.apply(console, args);
    const message = args.map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
      catch { return String(a); }
    }).join(' ');

    globalLogs.push({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      level,
      message
    });
    
    // Keep bounded history
    if (globalLogs.length > 200) {
      globalLogs.shift();
    }
    
    notifySubscribers();
  };

  console.log = (...args) => interceptAndStore('info', originalLog, args);
  console.warn = (...args) => interceptAndStore('warn', originalWarn, args);
  console.error = (...args) => interceptAndStore('error', originalError, args);

  (globalThis as any).__logViewerIntercepted = true;
}

const clearLogs = () => {
  globalLogs.length = 0;
  notifySubscribers();
};

export default function LogViewer({ onClose }: { onClose?: () => void }) {
  const [logs, setLogs] = useState<LogEntry[]>([...globalLogs]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => setLogs([...globalLogs]);
    logSubscribers.add(handleUpdate);
    return () => {
      logSubscribers.delete(handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-0 left-0 right-0 z-50 flex h-48 flex-col border-t border-white/20 bg-slate-950/90 font-mono text-[10px] shadow-2xl backdrop-blur-md sm:h-64 sm:text-xs"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-2">
        <div className="flex items-center gap-2 text-white/70">
          <Terminal className="h-4 w-4" />
          <span className="font-semibold tracking-wider">SYSTEM LOGS</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearLogs}
            className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
            title="Clear Logs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
              title="Close Logs"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 relative">
        {logs.length === 0 ? (
          <div className="text-white/30 italic">No logs...</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded">
              <span className="shrink-0 text-white/40">
                {String(log.timestamp.getHours()).padStart(2, '0')}:{String(log.timestamp.getMinutes()).padStart(2, '0')}:{String(log.timestamp.getSeconds()).padStart(2, '0')}.{String(log.timestamp.getMilliseconds()).padStart(3, '0')}
              </span>
              <span className={`shrink-0 w-[5ch] font-bold
                ${log.level === 'info' ? 'text-blue-300' : ''}
                ${log.level === 'warn' ? 'text-amber-300' : ''}
                ${log.level === 'error' ? 'text-red-400' : ''}
              `}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-white/80 whitespace-pre-wrap break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
