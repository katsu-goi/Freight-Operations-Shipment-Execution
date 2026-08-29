import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex flex-col lg:flex-row overflow-hidden bg-[#FAD9E8]">
      {/* Full SPEED poster — untouched, full image, responsive */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-bg.jpg"
          alt="Airship Express — SPEED is the Future of Business"
          className="w-full h-full object-contain object-center lg:object-cover bg-[#FAD9E8]"
          loading="eager"
          decoding="async"
        />
        {/* Hirna-style subtle veil — does not recolor the poster, just lifts the card */}
        <div className="absolute inset-0 bg-slate-900/[0.04] lg:bg-slate-900/[0.08]" />
      </div>

      {/* Glass card — Hirna Portal style, fully responsive */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
