import LoginForm from "./LoginForm";

function PanelShopee() {
  return (
    <div className="h-[380px] rounded-[16px] border-4 border-[#E81B75] overflow-hidden flex flex-col relative bg-gradient-to-br from-[#FF8C2F] to-[#F55D0B] shadow-lg shadow-black/10">
      <div className="absolute inset-0 opacity-[0.18] pointer-events-none">
        <svg viewBox="0 0 310 380" className="w-full h-full" preserveAspectRatio="none">
          <path d="M 0 300 L 0 270 L 22 270 L 22 250 L 45 250 L 45 275 L 68 275 L 68 240 L 95 240 L 95 260 L 115 260 L 115 230 L 145 230 L 145 265 L 170 265 L 170 245 L 200 245 L 200 275 L 230 275 L 230 255 L 260 255 L 260 285 L 285 285 L 285 260 L 310 260 L 310 380 L 0 380 Z" fill="#7A2B00" />
        </svg>
      </div>
      <div className="pt-6 flex flex-col items-center">
        <div className="w-[68px] h-[58px] bg-white rounded-[12px] flex items-center justify-center border border-[#FF6B2E]/20 shadow-sm relative">
          <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 w-[36px] h-[18px] border-[3.5px] border-[#FF6B2E] rounded-t-full border-b-0" />
          <span className="text-[34px] font-black text-[#FF6B2E] leading-none">S</span>
        </div>
        <div className="mt-6 text-center">
          <p className="text-[16px] font-black text-white leading-none tracking-wide">DROP-OFF</p>
          <p className="text-[16px] font-black text-white leading-none tracking-wide mt-1">POINT</p>
        </div>
      </div>
      <div className="mt-auto flex justify-center pb-3 relative">
        <div className="relative scale-[0.95] origin-bottom">
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[160px] h-[28px] bg-black/15 rounded-full blur-[2px]" />
          <div className="relative flex flex-col items-center">
            <div className="w-[78px] h-[52px] bg-[#FF7EB8] rounded-b-[12px] border border-[#7A2B00]/30 flex items-center justify-center relative -mb-1">
              <div className="w-[44px] h-[18px] bg-[#FF6B9E] rounded-[6px]" />
            </div>
            <div className="w-[72px] h-[64px] bg-[#A56A3A] rounded-full border border-[#7A2B00] relative flex items-center justify-center">
              <div className="w-[52px] h-[44px] bg-[#F5D0B0] rounded-full flex flex-col items-center justify-center relative">
                <div className="flex gap-2">
                  <span className="w-[14px] h-[14px] bg-white rounded-full flex items-center justify-center"><span className="w-[8px] h-[8px] bg-[#1A1A1A] rounded-full relative"><span className="absolute w-[3px] h-[3px] bg-white rounded-full top-[1px] left-[1px]" /></span></span>
                  <span className="w-[14px] h-[14px] bg-white rounded-full flex items-center justify-center"><span className="w-[8px] h-[8px] bg-[#1A1A1A] rounded-full relative"><span className="absolute w-[3px] h-[3px] bg-white rounded-full top-[1px] left-[1px]" /></span></span>
                </div>
                <div className="w-[8px] h-[4px] bg-[#8D4A2A] rounded-full mt-1" />
                <div className="w-[16px] h-[6px] border-b-2 border-[#7A2B00] rounded-b-full mt-1" />
              </div>
              <div className="absolute -top-[10px] -right-[6px] w-[28px] h-[28px] bg-white rounded-full border border-[#E81B75] flex items-center justify-center">
                <div className="relative w-[22px] h-[22px]">
                  <span className="absolute w-[9px] h-[9px] bg-[#FF7EB8] rounded-full -top-[1px] left-[3px]" />
                  <span className="absolute w-[9px] h-[9px] bg-[#FF7EB8] rounded-full top-[5px] -right-[1px]" />
                  <span className="absolute w-[9px] h-[9px] bg-[#FF7EB8] rounded-full top-[5px] -left-[1px]" />
                  <span className="absolute w-[7px] h-[7px] bg-[#FFD93D] rounded-full top-[6px] left-[7px] border border-white" />
                </div>
              </div>
            </div>
            <div className="absolute -left-[18px] top-[54px] w-[22px] h-[18px] bg-[#FF6B2E] rounded-[4px] border border-white flex items-center justify-center"><span className="text-[8px] font-black text-white">S</span></div>
            <div className="absolute -right-[18px] top-[54px] w-[22px] h-[18px] bg-[#FF6B2E] rounded-[4px] border border-white flex items-center justify-center"><span className="text-[8px] font-black text-white">S</span></div>
            <div className="w-[42px] h-[18px] bg-[#FF7EB8] rounded-t-[6px] -mt-1 border border-[#7A2B00]/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelGoGo() {
  return (
    <div className="h-[380px] rounded-[16px] border-4 border-[#E81B75] overflow-hidden flex flex-col relative bg-gradient-to-b from-[#2A9BFF] to-[#0A5DFF] shadow-lg shadow-black/10">
      <div className="absolute bottom-0 w-full h-[80px] opacity-[0.16] pointer-events-none">
        <svg viewBox="0 0 310 80" className="w-full h-full" preserveAspectRatio="none"><path d="M0 50 Q90 10 155 30 T310 35 L310 80 L0 80 Z" fill="#0A3D7A" /><path d="M0 60 L30 52 L45 65 L70 55 L95 70 L120 58 L145 72 L170 60 L200 75 L230 65 L260 78 L310 60 L310 80 L0 80 Z" fill="white" opacity="0.5" /></svg>
      </div>
      <div className="pt-5 flex justify-center">
        <div className="w-[88px] h-[64px] bg-white rounded-b-[18px] border-2 border-[#002B7A] relative flex flex-col items-center justify-center overflow-hidden shadow-md" style={{clipPath:"polygon(0 0,100% 0,86% 28%,50% 100%,14% 28%)"}}>
          <div className="absolute top-0 w-full h-[18px] bg-white" />
          <div className="w-full h-full bg-[#0A5DFF] flex flex-col items-center justify-center pt-2">
            <span className="text-[13px] font-black text-[#0A2A6B] tracking-wider" style={{WebkitTextStroke:"0.6px white"}}>GOGO</span>
            <span className="text-[8px] font-black text-white tracking-[2px] -mt-1">XPRESS</span>
          </div>
          <div className="absolute top-[4px] w-[10px] h-[10px] bg-[#FF7A00] rounded-full border border-white flex items-center justify-center"><span className="w-[3px] h-[3px] bg-white rounded-full" /></div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-[14px] font-black text-white tracking-wide leading-none">DROP-OFF</p>
        <p className="text-[14px] font-black text-white tracking-wide leading-none mt-1">POINT</p>
      </div>
      <div className="mt-auto pb-4 flex justify-center">
        <div className="relative">
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[170px] h-[28px] bg-black/20 rounded-full blur-[3px]" />
          <div className="absolute -inset-3 bg-white/95 rounded-full blur-[1px] -z-0" style={{width:"170px", height:"90px", left:"50%", transform:"translateX(-50%) rotate(-8deg)"}} />
          <div className="relative w-[152px] h-[84px] bg-white rounded-[16px] border-2 border-[#0A2A6B] rotate-[-8deg] overflow-hidden flex items-center justify-center shadow-md">
            <div className="w-[144px] h-[76px] bg-[#F0F7FF] rounded-[12px] overflow-hidden relative">
              <div className="absolute bottom-0 w-full h-[28px] bg-[#2E8B57]" />
              <div className="absolute bottom-[18px] left-[10px] w-[22px] h-[18px] bg-[#3DD68C] border border-white rotate-[-2deg]"><div className="w-full h-[6px] bg-[#7BE0A8]" /></div>
              <div className="absolute bottom-[16px] left-[36px] w-[24px] h-[22px] bg-[#FF8C42] border border-white -rotate-[1deg]"><div className="w-full h-[7px] bg-[#FFB07A]" /></div>
              <div className="absolute bottom-[14px] left-[64px] w-[26px] h-[26px] bg-[#2A9BFF] border border-white"><div className="w-full h-[8px] bg-[#7AC0FF]" /></div>
              <div className="absolute bottom-[18px] right-[18px] w-[20px] h-[16px] bg-[#FFD23C] border border-white"><div className="w-full h-[5px] bg-[#FFEB8A]" /></div>
              <div className="absolute bottom-[6px] left-[12px] right-[12px] h-[10px] bg-white rounded-full opacity-90" />
              <div className="absolute bottom-[9px] left-1/2 w-[16px] h-[3px] bg-[#FF3B30] rounded-full -translate-x-1/2 rotate-[-8deg]" />
            </div>
            <div className="absolute right-[6px] bottom-[18px] w-[10px] h-[10px] bg-[#0A5DFF] rounded-full border border-white flex items-center justify-center"><span className="w-[4px] h-[4px] bg-white rounded-full" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelTikTok() {
  return (
    <div className="h-[380px] rounded-[16px] border-4 border-[#E81B75] overflow-hidden flex flex-col relative bg-[#0A0A0A] shadow-lg shadow-black/20">
      <div className="absolute inset-0 pointer-events-none opacity-90">
        <span className="absolute left-[18px] top-[14px] w-[10px] h-[10px] bg-[#E81B75] rotate-45" />
        <span className="absolute right-[14px] top-[12px] text-[#00F2EA] text-[14px] font-bold">×</span>
        <span className="absolute right-[14px] top-[46px] text-[#FF3B7A] text-[12px] font-bold">×</span>
        <span className="absolute left-[14px] top-[86px] text-[#00F2EA] text-[12px] font-bold">×</span>
        <span className="absolute right-[14px] top-[108px] text-[#00D0FF] text-[12px] font-bold">×</span>
        <span className="absolute right-[20px] top-[142px] w-[2px] h-[2px] bg-[#FF3B7A] rounded-full" />
        <span className="absolute left-[28px] top-[168px] w-[8px] h-[8px] border border-[#00F2EA] rotate-45" />
        <span className="absolute right-[22px] top-[168px] w-[10px] h-[10px] border border-[#00F2EA] rotate-45 opacity-80" />
        <span className="absolute left-[14px] top-[224px] w-[6px] h-[6px] border border-[#00F2EA] rotate-45" />
        <span className="absolute right-[6px] top-[200px] text-white/80 text-[10px]">≋</span>
        <span className="absolute left-[10px] top-[264px] text-white/80 text-[10px]">≋</span>
        <span className="absolute right-[8px] top-[270px] text-white/80 text-[10px]">≋</span>
        <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 w-[84px] h-[74px] border-[3px] border-[#00F2EA] rotate-0" style={{clipPath:"polygon(50% 0,0 100%,100% 100%)"}}>
          <div className="w-full h-full border border-[#00F2EA]/60" style={{clipPath:"polygon(50% 10%,10% 90%,90% 90%)"}} />
        </div>
        <span className="absolute right-[18px] bottom-[76px] w-[22px] h-[14px] border border-[#FF3B7A] rotate-0" style={{clipPath:"polygon(50% 0,0 100%,100% 100%)"}} />
      </div>
      <div className="pt-6 flex justify-center relative">
        <div className="flex items-center gap-2">
          <span className="relative w-[22px] h-[22px] flex items-center justify-center">
            <span className="absolute text-white text-[18px]">♪</span>
            <span className="absolute text-[#00F2EA] text-[18px] -translate-x-[1px] opacity-90">♪</span>
            <span className="absolute text-[#FF0050] text-[18px] translate-x-[1px] opacity-90">♪</span>
          </span>
          <span className="text-white font-black text-[15px] tracking-tight">TikTok Shop</span>
        </div>
      </div>
      <div className="mt-6 mx-4 bg-white rounded-[8px] border border-black/10 shadow-[3px_3px_0_#00F2EA,-3px_-2px_0_#FF0050] p-4 text-center">
        <p className="text-[12px] font-black text-[#0A0A0A] leading-none tracking-wide">DROP-OFF</p>
        <p className="text-[12px] font-black text-[#0A0A0A] leading-none tracking-wide mt-1">POINT</p>
      </div>
    </div>
  );
}

function PanelLaz() {
  return (
    <div className="h-[380px] rounded-[16px] border-4 border-[#E81B75] overflow-hidden flex flex-col relative bg-gradient-to-b from-[#1E3A8A] to-[#0A245C] shadow-lg shadow-black/10">
      <div className="absolute top-[58px] left-1/2 -translate-x-1/2 w-[88px] h-[56px] bg-white/10 rounded-[14px] border border-white/15 backdrop-blur-sm" />
      <div className="pt-5 flex justify-center relative">
        <div className="w-[46px] h-[34px] bg-gradient-to-br from-[#FF8A00] via-[#FF3A75] to-[#8A4FFF] rounded-full flex items-center justify-center border border-white shadow-md relative" style={{clipPath:"path('M 23 30 C 12 22 0 10 7 2 C 11 -3 17 1 23 6 C 29 1 35 -3 39 2 C 46 10 34 22 23 30 Z')"}}>
          <span className="text-white font-black text-[12px] absolute" style={{top:"10px"}}>Laz</span>
          <span className="absolute w-[12px] h-[7px] bg-white/40 rounded-full top-[5px] left-[8px] blur-[1px]" />
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-[14px] font-black text-white tracking-wide leading-none">DROP-OFF</p>
        <p className="text-[14px] font-black text-white tracking-wide leading-none mt-1">POINT</p>
      </div>
      <div className="mt-auto pb-2 flex justify-center">
        <div className="relative w-[160px] h-[140px] flex items-center justify-center">
          <div className="absolute bottom-[6px] w-[110px] h-[18px] bg-black/20 rounded-full blur-[4px]" />
          <div className="relative scale-[0.92]">
            <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 w-[110px] h-[110px]">
              <span className="absolute w-[36px] h-[44px] bg-[#00BFFF] rounded-full -top-[2px] left-1/2 -translate-x-1/2 border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#FF3B30] rounded-full top-[8px] right-[6px] rotate-[36deg] border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#FF9500] rounded-full top-[28px] right-[-2px] border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#FFD60A] rounded-full top-[54px] right-[6px] border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#4CD964] rounded-full bottom-[6px] right-[18px] border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#5AC8FA] rounded-full -bottom-[2px] left-1/2 -translate-x-1/2 border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#5856D6] rounded-full bottom-[6px] left-[18px] border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#FF2D55] rounded-full top-[54px] left-[6px] border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#FFCC00] rounded-full top-[28px] left-[-2px] border border-white" />
              <span className="absolute w-[36px] h-[44px] bg-[#007AFF] rounded-full top-[8px] left-[6px] border border-white" />
            </div>
            <div className="relative w-[84px] h-[84px] bg-white rounded-full border-2 border-[#E0E0E0] flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute top-[10px] left-[8px] w-[10px] h-[10px] bg-[#FFB8D0] rounded-full" />
              <div className="absolute top-[10px] right-[8px] w-[10px] h-[10px] bg-[#FFB8D0] rounded-full" />
              <div className="w-full flex justify-center gap-6 mt-1">
                <span className="w-[12px] h-[12px] bg-white border border-[#1A1A1A] rounded-full flex items-center justify-center"><span className="w-[7px] h-[7px] bg-[#1A1A1A] rounded-full" /></span>
                <span className="w-[14px] h-[4px] border-t-[3px] border-[#1A1A1A] rounded-t-full mt-1" />
              </div>
              <div className="w-[9px] h-[6px] bg-[#FF3B30] rotate-45 mt-1 relative"><span className="absolute w-[9px] h-[6px] bg-[#FF3B30] -rotate-90 -top-[2px]" /></div>
              <div className="w-[26px] h-[20px] bg-[#1A1A1A] rounded-full mt-1 flex flex-col items-center justify-center relative">
                <div className="w-[16px] h-[10px] bg-[#FF8FA0] rounded-full mt-1" />
                <div className="absolute -top-[2px] w-[16px] h-[6px] bg-white rounded-b-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex flex-col bg-[#FAD9E8] overflow-hidden">
      {/* Full SPEED poster header behind — keep top visuals */}
      <div className="absolute inset-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/login-bg.jpg" alt="" className="w-full h-full object-contain object-top opacity-[0.92] bg-[#FAD9E8]" loading="eager" />
      </div>

      {/* Center 5-column layout like image_1 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-3 sm:p-4 lg:p-6">
        {/* Top SPEED black bar spacer — keep visible via bg image, but ensure content below aligns */}
        <div className="w-full max-w-[1580px] flex-1 flex items-center">
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-3 items-stretch">
            <PanelShopee />
            <PanelGoGo />
            {/* Center floating glassmorphic login — strictly retained as image_2, compact to match 380px panel */}
            <div className="h-[380px] rounded-[16px] border-4 border-[#E81B75] overflow-hidden shadow-xl flex flex-col bg-[#2A0A1A]/20 backdrop-blur-2xl">
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <LoginForm compact />
              </div>
            </div>
            <PanelTikTok />
            <PanelLaz />
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] font-semibold text-[#7A1B4A]/70">
          352 Escolta St., Tomas Pinpin Binondo, Manila • airshipexpresss@gmail.com • 0945 441 8789
        </p>
      </div>
    </div>
  );
}
