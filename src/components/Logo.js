import React from "react";
import { colors } from "../theme";

// Small brand mark: a gold badge with a drop-off pin — used in the header
// and on the login screen so "CityDrop" reads as a mark, not just text.
function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <rect width="34" height="34" rx="10" fill={colors.gold} />
      <path
        d="M17 8c-3.31 0-6 2.69-6 6 0 4.5 6 11 6 11s6-6.5 6-11c0-3.31-2.69-6-6-6z"
        fill="#ffffff"
      />
      <circle cx="17" cy="14" r="2.3" fill={colors.navy} />
    </svg>
  );
}

export default Logo;
