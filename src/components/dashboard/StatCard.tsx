
import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  variant?: 'default' | 'danger' | 'success' | 'warning';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  trend,
  icon: Icon,
  variant = 'default'
}) => {
  const cardClasses = cn(
    "rounded-lg border p-4 flex flex-col",
    {
      'bg-card border-border/50': variant === 'default',
      'bg-shield-danger/10 border-shield-danger/30': variant === 'danger',
      'bg-shield-low/10 border-shield-low/30': variant === 'success',
      'bg-shield-warning/10 border-shield-warning/30': variant === 'warning',
    }
  );

  const iconClasses = cn(
    "p-2 rounded-md mb-3 w-fit",
    {
      'bg-muted text-foreground': variant === 'default',
      'bg-shield-danger/20 text-shield-danger': variant === 'danger',
      'bg-shield-low/20 text-shield-low': variant === 'success',
      'bg-shield-warning/20 text-shield-warning': variant === 'warning',
    }
  );

  return (
    <div className={cardClasses}>
      {Icon && (
        <div className={iconClasses}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {trend && (
          <div className={`text-xs flex items-center ${trend.isPositive ? 'text-shield-low' : 'text-shield-high'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
