import Image from "next/image";
import Link from "next/link";

export default function Topbar() {
  const now = new Date();

  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <header className="h-16 bg-[#5E9AD3] text-white flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/feedback" className="cursor-pointer">
          <Image
            src="/fidepabutton.png"
            alt="Feedback"
            width={36}
            height={36}
            className="rounded-full"
          />
        </Link>

        <Image
          src="/fidepa.png"
          alt="FIDEPA"
          width={130}
          height={40}
          priority
        />

        <span className="text-sm font-medium text-white/90 border-l border-white/40 pl-4">
          Portale di gestione aziendale
        </span>
      </div>

      <div className="text-sm font-medium tracking-wide">
        {today.charAt(0).toUpperCase() + today.slice(1)}
      </div>
    </header>
  );
}