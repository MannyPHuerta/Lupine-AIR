import React from 'react';
import { useHeaderStyle } from '@/lib/useHeaderStyle';

/**
 * AppPageHeader — renders one of three header styles based on CompanySettings.headerStyle.
 *
 * Props:
 *   title       — required string
 *   subtitle    — optional string
 *   icon        — optional Lucide icon component
 *   action      — optional JSX (right side)
 *   children    — optional JSX rendered below the title row (e.g. KPI bar)
 *   sticky      — bool, default true
 */
export default function AppPageHeader({ title, subtitle, icon: Icon, action, children, sticky = true }) {
  const style = useHeaderStyle();

  const stickyClass = sticky ? 'sticky top-0 z-10' : '';

  if (style === 'glassmorphism') {
    return (
      <div className={`${stickyClass} relative overflow-hidden shadow-xl`}>
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700" />
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 backdrop-blur-sm bg-white/5" />
        {/* Content */}
        <div className="relative px-6 py-4 max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                  <Icon className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black text-white leading-tight tracking-tight">{title}</h1>
                {subtitle && <p className="text-sm text-slate-300 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 opacity-70" />
      </div>
    );
  }

  if (style === 'neon') {
    return (
      <div className={`${stickyClass} relative overflow-hidden shadow-2xl`}>
        {/* Deep dark base */}
        <div className="absolute inset-0 bg-gray-950" />
        {/* Neon glow blobs */}
        <div className="absolute -top-8 -left-8 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-8 right-16 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
        {/* Content */}
        <div className="relative px-6 py-4 max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="p-2.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight"
                  style={{ color: 'transparent', backgroundImage: 'linear-gradient(90deg, #22d3ee, #a78bfa)', backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  {title}
                </h1>
                {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
        {/* Neon bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400" style={{ boxShadow: '0 0 8px #22d3ee, 0 0 16px #7c3aed' }} />
      </div>
    );
  }

  // Default: classic (original indigo)
  return (
    <div className={`${stickyClass} bg-indigo-900 text-white shadow-lg`}>
      <div className="px-4 py-4 max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-indigo-300" />}
            <div>
              <div className="text-lg font-bold">{title}</div>
              {subtitle && <div className="text-indigo-300 text-xs mt-0.5">{subtitle}</div>}
            </div>
          </div>
          {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}