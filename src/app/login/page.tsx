import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Full SPEED poster — untouched, no color tampering */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-bg.jpg"
          alt="Airship Express — SPEED is the Future of Business"
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        {/* Hirna-style subtle veil for legibility — does not tint the poster */}
        <div className="absolute inset-0 bg-slate-900/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent" />
      </div>

      {/* Centered glass card — like Hirna Portal */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
