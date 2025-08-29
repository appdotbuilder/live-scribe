
import { Clock, MessageSquare, Mic, TrendingUp } from 'lucide-react';

interface SessionStatsProps {
  duration: number;
  messageCount: number;
  averageConfidence: number;
  isActive: boolean;
}

export function SessionStats({ duration, messageCount, averageConfidence, isActive }: SessionStatsProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stats = [
    {
      icon: Clock,
      label: 'Duration',
      value: formatDuration(duration),
      color: 'text-blue-600'
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      value: messageCount.toString(),
      color: 'text-green-600'
    },
    {
      icon: TrendingUp,
      label: 'Avg. Confidence',
      value: `${(averageConfidence * 100).toFixed(1)}%`,
      color: 'text-purple-600'
    },
    {
      icon: Mic,
      label: 'Status',
      value: isActive ? 'Recording' : 'Stopped',
      color: isActive ? 'text-green-600' : 'text-gray-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-white/50 border border-slate-200/50">
          <stat.icon className={`h-4 w-4 ${stat.color}`} />
          <div>
            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            <p className="text-sm font-semibold text-slate-800">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}