import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number | string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({
  className = '',
  size = 40,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      width={size}
      height={size}
      className={`inline-block shrink-0 overflow-visible ${className}`}
      style={{ width: size, height: size }}
      aria-label="Vigil'Mada Logo"
    >
      <defs>
        {/* Gradients émeraude/cyan/bleu électrique */}
        <linearGradient id="riskclimSwirl1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D2A0" />
          <stop offset="40%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0066FF" />
        </linearGradient>

        <linearGradient id="riskclimSwirl2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00C49F" />
          <stop offset="50%" stopColor="#0096C7" />
          <stop offset="100%" stopColor="#023E8A" />
        </linearGradient>

        <linearGradient id="riskclimPin" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#00C49F" />
          <stop offset="35%" stopColor="#0096C7" />
          <stop offset="70%" stopColor="#0072C6" />
          <stop offset="100%" stopColor="#0052CC" />
        </linearGradient>
      </defs>

      {/* 1. Lame vortex supérieure droite (Nord-Est) */}
      <path
        d="M 175,170 C 195,100 260,65 335,70 C 390,75 435,115 448,170 C 452,192 450,230 435,260 C 430,235 418,205 395,180 C 360,140 305,124 248,130 C 208,134 186,150 175,170 Z"
        fill="url(#riskclimSwirl1)"
      />

      {/* 2. Lame vortex médiane droite (Est-Sud) */}
      <path
        d="M 240,118 C 300,108 370,132 410,180 C 442,220 448,275 430,325 C 420,292 408,260 382,232 C 345,192 290,180 238,190 C 230,165 234,138 240,118 Z"
        fill="url(#riskclimSwirl2)"
      />

      {/* 3. Lame vortex inférieure gauche (Sud-Ouest) */}
      <path
        d="M 425,320 C 405,390 345,438 275,442 C 220,445 168,418 135,375 C 160,392 195,404 230,406 C 295,408 355,378 388,328 C 402,306 412,278 416,250 C 426,274 428,298 425,320 Z"
        fill="url(#riskclimSwirl1)"
      />

      {/* 4. Lame vortex supérieure gauche (Ouest-Nord) */}
      <path
        d="M 330,428 C 260,445 185,420 140,370 C 100,322 90,255 106,195 C 112,230 125,265 148,295 C 185,342 242,366 302,360 C 322,358 342,350 358,338 C 348,370 340,405 330,428 Z"
        fill="url(#riskclimSwirl2)"
      />

      {/* 5. Courbe intérieure gauche ascendante */}
      <path
        d="M 128,180 C 115,225 120,280 152,322 C 176,355 214,374 254,382 C 224,370 198,346 182,316 C 156,272 156,215 182,170 C 164,168 144,172 128,180 Z"
        fill="url(#riskclimSwirl1)"
      />

      {/* 6. Pointeur de géolocalisation central (Pin SIG) */}
      <path
        d="M 256,400 L 198,264 A 64 64 0 1 1 314,264 Z"
        fill="url(#riskclimPin)"
      />

      {/* 7. Oeil / Perçage central du marqueur */}
      <circle cx="256" cy="240" r="28" fill="#FFFFFF" />
    </svg>
  );
};

export default LogoIcon;
