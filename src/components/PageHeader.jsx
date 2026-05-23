import React from 'react';

export default function PageHeader({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-xl">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700" />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-white/5" />

      {/* Content */}
      <div className="relative px-8 py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {Icon && (
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-300 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 opacity-60" />
    </div>
  );
}