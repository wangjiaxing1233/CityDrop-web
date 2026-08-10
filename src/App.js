import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { colors } from "./theme";
import { logout } from "./utils";
import Logo from "./components/Logo";
import LoginPage from "./components/LoginPage";
import HomePage from "./components/HomePage";
import OrderPage from "./components/OrderPage";
import MyOrdersPage from "./components/MyOrdersPage";
import OrderDetailPage from "./components/OrderDetailPage";
import SupportPage from "./components/SupportPage";
import SettingsPage from "./components/SettingsPage";

const backLinkStyle = {
  color: "#4b5563",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  fontWeight: 600,
  marginTop: 12,
  marginBottom: 28,
};

const pageHeadingStyle = {
  color: colors.navy,
  marginTop: 0,
  fontWeight: 700,
  fontSize: 24,
  marginBottom: 40,
};

// react-router v6 only exposes URL params via the useParams hook, which class
// components can't call directly — this tiny function component reads the
// param and hands it to OrderDetailPage as a plain prop, same as before.
function OrderDetailRoute({ navigate }) {
  const { orderId } = useParams();
  return <OrderDetailPage orderId={orderId} navigate={navigate} />;
}

// Robot Fleet Status and Dispatch System Telemetry are both stubs with
// identical layout — same "Coming Soon" empty-state, just different
// icon/title/copy — so they share this one component instead of being
// copy-pasted.
function ComingSoonPage({ navigate, icon, title, message }) {
  return (
    <div style={{ width: "100%" }}>
      <a onClick={() => navigate("/")} style={backLinkStyle}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>&larr;</span> Back to Home
      </a>
      <h2 style={pageHeadingStyle}>{title}</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "56px 24px",
          background: "#ffffff",
          border: "1px dashed #cbd5e1",
          borderRadius: 16,
        }}
      >
        <div
          className="icon-badge gold"
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            marginBottom: 20,
            fontSize: 30,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: colors.gold,
            background: "#fcefd9",
            padding: "3px 10px",
            borderRadius: 999,
            marginBottom: 14,
          }}
        >
          Coming Soon
        </span>
        <div
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Function not available now
        </div>
        <div
          style={{
            color: colors.muted,
            fontSize: 14,
            marginTop: 8,
            textAlign: "center",
            maxWidth: 360,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Auth is session/cookie based now — there's no token to check, so this
    // is a best-effort restore (a stale username here with an expired
    // session just means the first authenticated call fails and the user
    // gets logged out then).
    const username = localStorage.getItem("username");
    if (username) {
      setAuthed(true);
      setUser(username);
    }
  }, []);

  const handleLoginSuccess = (username) => {
    localStorage.setItem("username", username);
    setAuthed(true);
    setUser(username);
    navigate("/");
  };

  const handleLogout = () => {
    logout().catch(() => {});
    localStorage.removeItem("username");
    setAuthed(false);
    setUser(null);
    navigate("/");
  };

  const requireAuth = (element) =>
    authed ? element : <LoginPage handleLoginSuccess={handleLoginSuccess} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f7",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          width: "100%",
          background: colors.navy,
          position: "sticky",
          top: 0,
          zIndex: 1000,
          padding: "16px 24px",
          boxSizing: "border-box",
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.12)",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <a
              onClick={() => navigate("/")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 800,
                color: "#ffffff",
                fontSize: 21,
                cursor: "pointer",
                letterSpacing: "-0.6px",
              }}
            >
              <Logo size={30} />
              CityDrop
            </a>
            <div className="top-nav-links">
              <a className="top-nav-link" onClick={() => navigate("/")}>
                Home
              </a>
              <a className="top-nav-link" onClick={() => navigate("/order")}>
                Solutions
              </a>
              <a className="top-nav-link" onClick={() => navigate("/support")}>
                Support
              </a>
              <span className="top-nav-link static">Investor Relations</span>
              <span className="top-nav-link static">About Us</span>
              <span className="top-nav-link static">Careers</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
            }}
          >
            {authed ? (
              <>
                <a
                  onClick={handleLogout}
                  style={{
                    color: "#ff4d4f",
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  Log out
                </a>
                <span style={{ color: "#ffffff", opacity: 0.65 }}>
                  ({user})
                </span>
              </>
            ) : (
              <a
                onClick={() => navigate("/login")}
                style={{
                  color: "#ffffff",
                  cursor: "pointer",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Sign in / Register
              </a>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          // The home hero is meant to be full-bleed (edge to edge, no
          // card/margin) — every other page keeps the normal page padding.
          padding: isHome ? 0 : "24px 24px",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage user={user} navigate={navigate} />} />
          <Route
            path="/login"
            element={<LoginPage handleLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/order"
            element={requireAuth(<OrderPage navigate={navigate} />)}
          />
          <Route
            path="/orders"
            element={requireAuth(<MyOrdersPage navigate={navigate} />)}
          />
          <Route
            path="/orders/:orderId"
            element={requireAuth(<OrderDetailRoute navigate={navigate} />)}
          />
          <Route path="/support" element={<SupportPage navigate={navigate} />} />
          <Route path="/settings" element={<SettingsPage navigate={navigate} />} />
          <Route
            path="/fleet-status"
            element={
              <ComingSoonPage
                navigate={navigate}
                icon="🤖"
                title="Robot Fleet Status"
                message="Backend integration for real-time fleet telemetry is under development."
              />
            }
          />
          <Route
            path="/dispatch-telemetry"
            element={
              <ComingSoonPage
                navigate={navigate}
                icon="⚡"
                title="Dispatch System Telemetry"
                message="Live tracking for automatic dynamic queuing modes is coming in a later phase."
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
