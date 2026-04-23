import React from 'react';

export function Card({ children, className = '', padding = 'p-6', shadow = 'shadow-sm', ...props }) {
  return (
    <div className={`rounded-2xl bg-white ${padding} ${shadow} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
