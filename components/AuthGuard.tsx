"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [verifica, setVerifica] = useState(true);

  useEffect(() => {
    async function controllaSessione() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        window.location.href = "/login";
        return;
      }

      setVerifica(false);
    }

    controllaSessione();
  }, []);

  if (verifica) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Verifica accesso...
      </div>
    );
  }

  return <>{children}</>;
}
