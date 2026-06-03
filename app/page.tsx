import LayoutApp from "@/components/LayoutApp";

export default function Home() {
  return (
    <LayoutApp>
      <div className="relative flex flex-col items-center justify-center h-[75vh] overflow-hidden">
        <img
          src="/fidepa.png"
          alt="FIDEPA"
          className="absolute inset-0 m-auto h-[30%] opacity-60"
        />

        <div className="relative z-10 flex flex-col items-center">
          <p className="text-[13px] uppercase tracking-[0.3em] text-gray-400">
            Work in Progress
          </p>

          <h1 className="mt-3 text-4xl font-light text-[#2B2F5E]">
            Stay Tuned
          </h1>
        </div>
      </div>
    </LayoutApp>
  );
}