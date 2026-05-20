interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  valueColor?: string;
}

export default function StatCard({ label, value, subtitle, valueColor }: StatCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </span>
      <span className={`text-xl font-bold leading-tight ${valueColor || 'text-white'}`}>
        {value}
      </span>
      {subtitle && (
        <span className="text-xs text-slate-500">{subtitle}</span>
      )}
    </div>
  );
}
