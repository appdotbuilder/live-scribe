export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-slate-100 text-slate-800 p-3 rounded-lg max-w-[80%]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}