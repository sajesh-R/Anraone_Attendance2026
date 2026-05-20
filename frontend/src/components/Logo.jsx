import React from 'react';

const Logo = ({ className = "h-8" }) => (
  <svg 
    viewBox="0 0 320 80" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMinYMid meet"
  >
    {/* Abstract Symbol */}
    <g transform="translate(0, 10)">
      {/* Top Left Wing */}
      <path 
        d="M28.5 22C18.5 20.5 5 10 2 8C5 6 35 4 45 6L55 20L28.5 22Z" 
        fill="url(#logo_grad_1)"
      />
      {/* Top Right Wing */}
      <path 
        d="M60 20L75 6C85 4 105 6 110 8C105 10 85 20.5 75 22L60 20Z" 
        fill="url(#logo_grad_2)"
      />
      {/* Bottom Wing */}
      <path 
        d="M57.5 25C65 35 70 65 65 72H35C30 65 45 35 57.5 25Z" 
        fill="url(#logo_grad_3)"
      />
    </g>

    {/* Text: anraone */}
    <text 
      x="125" 
      y="58" 
      fill="#1A1C2E" 
      style={{ 
        fontSize: '52px', 
        fontWeight: '700', 
        fontFamily: "'Inter', sans-serif", 
        letterSpacing: '-1.5px',
        fontVariantLigatures: 'none'
      }}
    >
      anraone
    </text>

    <defs>
      <linearGradient id="logo_grad_1" x1="2" y1="8" x2="55" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#9DE7FC" />
        <stop offset="1" stopColor="#3DBBE3" />
      </linearGradient>
      <linearGradient id="logo_grad_2" x1="110" y1="8" x2="60" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00AEEF" />
        <stop offset="1" stopColor="#2A7EB3" />
      </linearGradient>
      <linearGradient id="logo_grad_3" x1="35" y1="72" x2="57.5" y2="25" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3E83C5" />
        <stop offset="1" stopColor="#21409A" />
      </linearGradient>
    </defs>
  </svg>
);

export default Logo;
