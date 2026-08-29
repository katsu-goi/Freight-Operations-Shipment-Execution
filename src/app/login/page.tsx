import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 lg:p-8 overflow-hidden bg-[#F9C2D8]">
      {/* Full SPEED poster — whole image visible, no zoom/crop */}
      <div className="absolute inset-0 bg-[#FAD9E8]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-bg.jpg"
          alt="Airship Express — SPEED is the Future of Business"
          className="w-full h-full object-contain object-center"
          loading="eager"
          decoding="async"
        />
        {/* Very subtle veil only for legibility — keeps poster colors true */}
        <div className="absolute inset-0 bg-slate-900/[0.06]" />
      </div>

      {/* Centered glass card — like Hirna Portal */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
