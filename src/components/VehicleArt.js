import React from "react";

// There's no ground-robot photo asset in the app (only the drone shot used
// on the login screen), so this hand-drawn scene stands in for one — same
// navy/gold palette, same "same-city street" idea as the drone photo, sized
// to sit in the same hero-banner slot on the order detail page.
export function RobotHeroBanner({ style }) {
  return (
    <svg viewBox="0 0 900 180" width="100%" height="100%" style={style} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="robotHeroBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E2761" />
          <stop offset="100%" stopColor="#141a47" />
        </linearGradient>
      </defs>
      <rect width="900" height="180" fill="url(#robotHeroBg)" />
      <g fill="#2a3372" opacity="0.6">
        <rect x="10" y="116" width="34" height="60" />
        <rect x="50" y="94" width="26" height="82" />
        <rect x="84" y="126" width="38" height="50" />
        <rect x="780" y="104" width="30" height="72" />
        <rect x="816" y="126" width="26" height="50" />
        <rect x="848" y="84" width="34" height="92" />
      </g>
      <rect x="0" y="176" width="900" height="4" fill="#0f1436" />
      <g transform="translate(450,68)">
        <rect x="-30" y="20" width="60" height="46" rx="12" fill="#EAF0FC" />
        <rect x="-22" y="-18" width="44" height="36" rx="10" fill="#ffffff" />
        <circle cx="-9" cy="0" r="5" fill="#1E2761" />
        <circle cx="9" cy="0" r="5" fill="#1E2761" />
        <line x1="0" y1="-18" x2="0" y2="-30" stroke="#E8A33D" strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="-32" r="4" fill="#E8A33D" />
        <circle cx="-18" cy="70" r="8" fill="#0f1436" />
        <circle cx="18" cy="70" r="8" fill="#0f1436" />
      </g>
      <g transform="translate(505,108)">
        <rect x="0" y="0" width="34" height="30" rx="4" fill="#E8A33D" />
        <line x1="0" y1="15" x2="34" y2="15" stroke="#c9871f" strokeWidth="2" />
        <line x1="17" y1="0" x2="17" y2="30" stroke="#c9871f" strokeWidth="2" />
      </g>
    </svg>
  );
}

// Small tile version of the same character for use as a compact thumbnail
// (delivery-option rows) — same face, cropped tight, own tinted background.
export function RobotFace({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <rect width="64" height="64" rx="14" fill="#EAF0FC" />
      <rect x="17" y="30" width="30" height="24" rx="8" fill="#ffffff" stroke="#c9d6f2" />
      <rect x="20" y="10" width="24" height="20" rx="7" fill="#ffffff" stroke="#c9d6f2" />
      <circle cx="27" cy="19" r="3" fill="#1E2761" />
      <circle cx="37" cy="19" r="3" fill="#1E2761" />
      <line x1="32" y1="10" x2="32" y2="4" stroke="#E8A33D" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="3" r="2.5" fill="#E8A33D" />
      <circle cx="21" cy="50" r="4" fill="#1E2761" opacity="0.5" />
      <circle cx="43" cy="50" r="4" fill="#1E2761" opacity="0.5" />
    </svg>
  );
}
