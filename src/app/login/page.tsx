import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 lg:p-6 overflow-hidden bg-slate-900">
      {/* Background — SPEED poster */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        {/* Pink wash + dark gradient for legibility — blends poster into form */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#E81B75]/30 via-slate-900/25 to-slate-900/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-pink-500/10" />
        {/* Soft vignette */}
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.35)]" />
      </div>

      {/* Content — card floats over poster, blended via backdrop-blur */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
