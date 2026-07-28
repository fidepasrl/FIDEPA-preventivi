"use client";

import type { ChangeEvent, FocusEvent } from "react";
import {
  finalizzaInputImporto,
  formattaInputImporto,
  preparaInputImporto,
} from "@/lib/importi";

type ImportoInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  compact?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

export default function ImportoInput({
  value,
  onChange,
  className = "",
  inputClassName = "",
  compact = false,
  placeholder,
  disabled = false,
}: ImportoInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(formattaInputImporto(event.target.value));
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onChange(finalizzaInputImporto(event.target.value));
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    onChange(preparaInputImporto(event.target.value));
  }

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 pointer-events-none">
        €
      </span>
      <input
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full min-w-0 border border-gray-300 rounded-md bg-white outline-none focus:border-[#64B445] text-right disabled:cursor-not-allowed disabled:bg-[#F2F2F2] disabled:text-gray-500 ${
          compact ? "pl-8 pr-3 py-2" : "pl-8 pr-3 py-3"
        } ${inputClassName}`}
      />
    </div>
  );
}
