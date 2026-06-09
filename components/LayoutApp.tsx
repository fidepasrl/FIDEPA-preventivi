import AppSidebar from "./AppSidebar";
import AppFeedbackButton from "./AppFeedbackButton";
import Topbar from "./Topbar";
import AuthGuard from "@/components/AuthGuard";

export default function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F2F2F2]">
        <Topbar />

        <div className="flex">
          <AppSidebar />

          <main className="flex-1 min-h-[calc(100vh-4rem)] p-6 overflow-x-hidden">
            {children}
          </main>
        </div>

        <AppFeedbackButton />
      </div>
    </AuthGuard>
  );
}