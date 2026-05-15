interface StatusBadgeProps {
  online: boolean;
}

export default function StatusBadge({ online }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        online
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-red-500/15 text-red-400'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
        }`}
      />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
