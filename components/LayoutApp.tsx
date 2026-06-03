import AppSidebar from "./AppSidebar";
import AppFeedbackButton from "./AppFeedbackButton";
import Topbar from "./Topbar";

export default function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F2F2F2] text-[#2B2F5E]">
      <Topbar />

      <div className="flex">
        <AppSidebar />

        <section className="flex-1 p-10">{children}</section>
      </div>

      <AppFeedbackButton />
    </main>
  );
}