import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 text-niu-cyan animate-spin" />
      <p className="text-text-muted text-sm">{message}</p>
    </div>
  );
}
