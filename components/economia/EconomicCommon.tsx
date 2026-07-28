"use client";

import { useEffect, useRef, type ReactNode } from "react";
import AppIcon, { type AppIconName } from "@/components/AppIcon";
import { formattaEuro } from "@/lib/importi";

export function EconomicCard({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-[#2B2F5E]">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  tooltip,
  tone = "default",
  strong = false,
}: {
  label: string;
  value: number;
  tooltip: string;
  tone?: "default" | "positive" | "warning" | "danger";
  strong?: boolean;
}) {
  const toneClass = {
    default: "text-[#2B2F5E]",
    positive: "text-[#4D9635]",
    warning: "text-[#B87800]",
    danger: "text-red-600",
  }[tone];

  return (
    <div
      className="min-w-0 rounded-2xl border border-white bg-white px-4 py-4 shadow-[0_5px_18px_rgba(15,23,42,0.05)]"
      title={tooltip}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${toneClass}`}>
          {label}
        </p>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-[11px] font-bold text-gray-500"
          aria-label={tooltip}
        >
          ?
        </span>
      </div>
      <p className={`mt-2 truncate text-lg ${strong ? "font-bold" : "font-semibold"} ${toneClass}`}>
        {formattaEuro(value)}
      </p>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  icon = "plus",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: AppIconName;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#64B445] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5AA03E] disabled:cursor-not-allowed disabled:bg-gray-400 cursor-pointer"
    >
      <AppIcon name={icon} size={16} />
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  icon,
  danger = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: AppIconName;
  danger?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
        danger
          ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
          : "border-gray-200 bg-white text-[#2B2F5E] hover:bg-[#F2F2F2]"
      }`}
    >
      {icon ? <AppIcon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

const STILI_STATO: Record<string, string> = {
  riconciliato: "bg-[#EAF6E5] text-[#4D9635]",
  pagato: "bg-[#EAF6E5] text-[#4D9635]",
  emesso: "bg-[#E8F2FA] text-[#2D80B3]",
  fattura: "bg-[#E8F2FA] text-[#2D80B3]",
  contanti: "bg-gray-100 text-gray-600",
  risolta: "bg-[#EAF6E5] text-[#4D9635]",
  da_documentare: "bg-[#FFF4D6] text-[#9A6800]",
  da_associare: "bg-[#FFF4D6] text-[#9A6800]",
  da_verificare: "bg-[#FFF4D6] text-[#9A6800]",
  parzialmente_riconciliato: "bg-[#FFF0E8] text-[#B45D24]",
  parzialmente_pagato: "bg-[#FFF0E8] text-[#B45D24]",
  anomalia: "bg-red-50 text-red-600",
  critica: "bg-red-50 text-red-600",
  attenzione: "bg-[#FFF4D6] text-[#9A6800]",
  aperta: "bg-[#FFF4D6] text-[#9A6800]",
  in_lavorazione: "bg-[#E8F2FA] text-[#2D80B3]",
  annullato: "bg-gray-100 text-gray-500",
  ignorata: "bg-gray-100 text-gray-500",
  bozza: "bg-gray-100 text-gray-600",
  da_emettere: "bg-[#FFF4D6] text-[#9A6800]",
  scaduto: "bg-red-50 text-red-600",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        STILI_STATO[value] || "bg-gray-100 text-gray-600"
      }`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-[#F8F9FB] px-4 py-7 text-center text-sm text-gray-500">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-[#2B2F5E]">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:ring-4 focus:ring-[#5E9AD3]/10";

export function Modal({
  title,
  description,
  onClose,
  children,
  size = "xl",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "lg" | "xl" | "2xl" | "4xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const width = { lg: "max-w-lg", xl: "max-w-xl", "2xl": "max-w-2xl", "4xl": "max-w-4xl" }[
    size
  ];

  useEffect(() => {
    const panel = panelRef.current;
    const primo = panel?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
    );
    primo?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#111827]/45 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="economic-modal-title"
        className={`max-h-[92vh] w-full overflow-hidden rounded-2xl bg-white shadow-2xl ${width}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 id="economic-modal-title" className="text-lg font-semibold text-[#2B2F5E]">
              {title}
            </h3>
            {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-[#F2F2F2] cursor-pointer"
            aria-label="Chiudi finestra"
          >
            <AppIcon name="x" size={17} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
      {message}
    </p>
  ) : null;
}
