import React from "react";
import { colors } from "../theme";
import HeroCarousel from "./HeroCarousel";

// One shared tile style for all four quick actions — the two live features
// (order/orders) and the two not-yet-built ones (fleet status/dispatch)
// read as equal-weight peers instead of two different visual treatments.
const TILES = (navy, gold) => [
  {
    path: "/order",
    label: "Create New Order",
    sub: "Drone or ground robot",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
      </svg>
    ),
  },
  {
    path: "/orders",
    label: "Manage Orders",
    sub: "Track your shipments",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    ),
  },
  {
    path: "/fleet-status",
    label: "Robot Fleet Status",
    sub: "84% Active",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="9" width="14" height="10" rx="2"></rect>
        <line x1="12" y1="9" x2="12" y2="5"></line>
        <circle cx="12" cy="4" r="1" fill={navy} stroke="none"></circle>
        <circle cx="9" cy="14" r="1.2" fill={navy} stroke="none"></circle>
        <circle cx="15" cy="14" r="1.2" fill={navy} stroke="none"></circle>
      </svg>
    ),
  },
  {
    path: "/dispatch-telemetry",
    label: "Dispatch Telemetry",
    sub: (
      <span style={{ fontSize: 11, background: "#f0fdf4", color: "#16a34a", padding: "1px 8px", borderRadius: 4, fontWeight: 700 }}>
        LIVE
      </span>
    ),
    gold: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={gold} stroke="none">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    ),
  },
];

class HomePage extends React.Component {
  render() {
    const { user, navigate } = this.props;
    const tiles = TILES(colors.navy, colors.gold);
    return (
      <div style={{ width: "100%", flexShrink: 0 }}>
        <div className="homepage-hero">
          <HeroCarousel user={user} />

          <div className="homepage-tiles-overlay">
            {tiles.map((tile) => (
              <div
                key={tile.path}
                className="homepage-tile"
                onClick={() => navigate(tile.path)}
              >
                <div className={"icon-badge" + (tile.gold ? " gold" : "")}>
                  {tile.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                    {tile.label}
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {tile.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="homepage-floating-actions">
            <div
              className="homepage-floating-btn"
              onClick={() => navigate("/support")}
              title="Customer Support"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div
              className="homepage-floating-btn"
              onClick={() => navigate("/settings")}
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="homepage-footer">
          <div className="homepage-footer-columns">
            <div className="homepage-footer-group wide">
              <div className="homepage-footer-heading">Our Company</div>
              <div className="homepage-footer-subcols">
                <div className="homepage-footer-col">
                  <span>About CityDrop</span>
                  <span>Our Portfolio</span>
                  <span>CityDrop Blog</span>
                </div>
                <div className="homepage-footer-col">
                  <span>Careers</span>
                  <span>Newsroom</span>
                  <span>Transportation Contracting Opportunities</span>
                </div>
              </div>
            </div>

            <div className="homepage-footer-group">
              <div className="homepage-footer-heading">Policy Center</div>
              <div className="homepage-footer-col">
                <span>Terms of Use</span>
                <span>Privacy &amp; Security</span>
                <span>Ad Choices</span>
                <span className="with-badge">
                  Your Privacy Choices
                  <svg width="30" height="16" viewBox="0 0 40 20">
                    <rect x="1" y="1" width="38" height="18" rx="9" fill="none" stroke="#0a5dc2" strokeWidth="1.5" />
                    <path d="M6 10l2.5 2.5L13 7" fill="none" stroke="#0a5dc2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M27 7l6 6M33 7l-6 6" stroke="#0a5dc2" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="homepage-footer-group">
              <div className="homepage-footer-heading">Follow CityDrop</div>
              <div className="homepage-footer-social">
                <a title="Email">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 6l9 7 9-7" />
                  </svg>
                </a>
                <a title="Facebook">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                    <path d="M14 21v-9h3l.5-3H14V7.5A1.5 1.5 0 0 1 15.5 6H17V3h-2.5A4.5 4.5 0 0 0 10 7.5V9H7v3h3v9" />
                  </svg>
                </a>
                <a title="X">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M5 5l14 14M19 5L5 19" />
                  </svg>
                </a>
                <a title="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a title="LinkedIn">
                  <svg viewBox="0 0 24 24">
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif" fill="currentColor">in</text>
                  </svg>
                </a>
                <a title="YouTube">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="6" width="18" height="12" rx="4" />
                    <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
                  </svg>
                </a>
                <a title="Pinterest">
                  <svg viewBox="0 0 24 24">
                    <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fontFamily="Georgia, serif" fill="currentColor">P</text>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="homepage-footer-bottom">
            &copy; {new Date().getFullYear()} CityDrop Logistics Technology. All rights reserved.
          </div>
        </div>
      </div>
    );
  }
}

export default HomePage;
