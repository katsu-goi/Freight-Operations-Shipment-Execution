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

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>

      {/* Bottom contact bar — subtle, matches poster footer */}
      <div className="absolute bottom-0 inset-x-0 z-10 hidden lg:flex items-center justify-center gap-6 py-2.5 text-[10px] text-white/80 bg-[#E81B75]/90 backdrop-blur-sm border-t border-white/20">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white/80" /> 352 Escolta St., Tomas Pinpin Binondo, Manila
        </span>
        <span className="opacity-60">•</span>
        <span>airshipexpresss@gmail.com</span>
        <span className="opacity-60">•</span>
        <span>0945 441 8789</span>
      </div>
    </div>
  );
}
