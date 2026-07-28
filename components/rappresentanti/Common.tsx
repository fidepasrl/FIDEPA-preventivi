"use client";

import AppIcon from "@/components/AppIcon";

export const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#64B445] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#579f3b] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#2B2F5E]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#2B2F5E] hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-50";
export const inputClass =
  "min-h-11 w-full rounded-xl border border-[#2B2F5E]/15 bg-white px-3.5 py-2.5 text-sm text-[#2B2F5E] outline-none placeholder:text-[#2B2F5E]/40 focus:border-[#5E9AD3] focus:ring-2 focus:ring-[#5E9AD3]/15";

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#2B2F5E]/55" aria-label="Breadcrumb">
      {items.map((item, indice) => (
        <span key={`${item.label}-${indice}`} className="flex items-center gap-2">
          {indice > 0 && <span>/</span>}
          {item.href ? <a href={item.href} className="hover:text-[#2D80B3]">{item.label}</a> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-sm text-[#2B2F5E]/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[#2B2F5E]/8 bg-white p-4 shadow-[0_8px_25px_rgba(43,47,94,0.05)] sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-semibold text-[#2B2F5E]">{title}</h2>}
            {description && <p className="mt-1 text-xs text-[#2B2F5E]/55">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "green" | "gold" | "red" }) {
  const colori = {
    blue: "bg-[#5E9AD3]/12 text-[#2D80B3]",
    green: "bg-[#64B445]/12 text-[#4D9634]",
    gold: "bg-[#D79D06]/12 text-[#B27D00]",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="rounded-2xl border border-[#2B2F5E]/8 bg-white p-4 shadow-sm">
      <div className={`mb-3 h-2 w-10 rounded-full ${colori[tone]}`} />
      <p className="text-2xl font-bold text-[#2B2F5E]">{value}</p>
      <p className="mt-0.5 text-xs text-[#2B2F5E]/55">{label}</p>
    </div>
  );
}

export function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-[#64B445]/12 text-[#4D9634]" : "bg-gray-100 text-gray-500"}`}>
      {label || (active ? "Attivo" : "Non attivo")}
    </span>
  );
}

export function BadgeList({
  items,
  max = 2,
}: {
  items: Array<{ id: string; label: string; color?: string }>;
  max?: number;
}) {
  if (items.length === 0) return <span className="text-xs text-[#2B2F5E]/35">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, max).map((item) => (
        <span
          key={item.id}
          className="inline-flex max-w-44 truncate rounded-full border border-[#2B2F5E]/10 bg-[#F6F7FA] px-2.5 py-1 text-[11px] font-medium text-[#2B2F5E]"
          style={item.color ? { borderColor: `${item.color}55`, backgroundColor: `${item.color}16` } : undefined}
          title={item.label}
        >
          {item.label}
        </span>
      ))}
      {items.length > max && <span className="px-1 py-1 text-[11px] font-semibold text-[#2D80B3]">+{items.length - max} altri</span>}
    </div>
  );
}

export function EmptyState({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#2B2F5E]/20 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5E9AD3]/10 text-[#2D80B3]">
        <AppIcon name="addressBook" size={23} />
      </div>
      <p className="mt-4 text-sm font-medium text-[#2B2F5E]">{title}</p>
      {actionLabel && onAction && <button type="button" onClick={onAction} className={`${primaryButton} mt-5`}><AppIcon name="plus" size={16} />{actionLabel}</button>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/80" />)}</div>;
}

export function Modal({ title, children, onClose, width = "max-w-2xl" }: { title: string; children: React.ReactNode; onClose: () => void; width?: string }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#2B2F5E]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className={`max-h-[92vh] w-full ${width} overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold text-[#2B2F5E]">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#2B2F5E]/55 hover:bg-[#F2F2F2]" aria-label="Chiudi"><AppIcon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, error = false, onClose }: { message: string; error?: boolean; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[1500] flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${error ? "bg-red-600" : "bg-[#2B2F5E]"}`}>
      <span>{message}</span><button type="button" onClick={onClose} aria-label="Chiudi"><AppIcon name="x" size={15} /></button>
    </div>
  );
}

export function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-[#2B2F5E]">
      <span>{label}{required && <span className="text-red-500"> *</span>}</span>
      <span className="mt-1.5 block">{children}</span>
      {error && <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>}
    </label>
  );
}
