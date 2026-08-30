import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex flex-col lg:flex-row overflow-hidden bg-[#FAD9E8]">
      {/* Full SPEED poster — untouched. No crop, no filter, no veil over the 5 DROP-OFF POINT cards. */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-bg.jpg"
          alt="Airship Express — SPEED is the Future of Business"
          className="w-full h-full object-contain object-center bg-[#FAD9E8]"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Glass card — centered (frosted) so the 5 DROP-OFF POINT strip remains visible through the blur, as requested */}
      <div className="relative z-10 w-full min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
