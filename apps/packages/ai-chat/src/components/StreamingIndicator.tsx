export function StreamingIndicator() {
  return (
    <span
      className="inline-flex items-end gap-1.5 py-1 mt-4"
      aria-label="Gerando resposta..."
      role="status"
    >
      <span className="size-1 rounded-full bg-primary animate-[streaming-bounce_1.2s_ease-in-out_infinite_0ms]" />
      <span className="size-1 rounded-full bg-primary animate-[streaming-bounce_1.2s_ease-in-out_infinite_150ms]" />
      <span className="size-1 rounded-full bg-primary animate-[streaming-bounce_1.2s_ease-in-out_infinite_300ms]" />
      <style>{`
        @keyframes streaming-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </span>
  );
}
