"use client";

import { useState } from "react";
import AppSidebar from "./AppSidebar";
import AppFeedbackButton from "./AppFeedbackButton";
import Topbar from "./Topbar";
import AuthGuard from "@/components/AuthGuard";

export default function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarMobileAperta, setSidebarMobileAperta] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F2F2F2]">
        <Topbar
          onToggleSidebar={() => setSidebarMobileAperta((corrente) => !corrente)}
        />

        <div className="flex items-start">
          <AppSidebar
            mobileOpen={sidebarMobileAperta}
            onClose={() => setSidebarMobileAperta(false)}
          />

          <main className="min-w-0 flex-1 min-h-[calc(100vh-4.5rem)] p-4 sm:p-5 xl:p-7 pb-28 overflow-x-hidden">
            {children}
          </main>
        </div>

        <AppFeedbackButton />
      </div>
    </AuthGuard>
  );
}
