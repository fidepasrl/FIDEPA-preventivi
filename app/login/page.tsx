"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

    async function login() {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(error.message);
            return;
        }

        window.location.replace("/");
    }

  return (
    <main className="min-h-screen bg-[#F2F2F2] flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 shadow-sm rounded-sm w-full max-w-md p-8">
        <div className="mb-8">
          <img src="/fidepa.png" alt="FIDEPA" className="h-14 mb-6" />

          <h1 className="text-2xl font-semibold text-[#2B2F5E]">
            Accesso portale
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Inserisci le credenziali per accedere al gestionale.
          </p>
        </div>

        <div className="space-y-4">
          <Campo
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
          />

          <Campo
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
          />
        </div>

        <button
          type="button"
          onClick={login}
          className="mt-8 bg-[#64B445] text-white w-full px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
        >
          Accedi
        </button>
      </div>
    </main>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
      />
    </div>
  );
}