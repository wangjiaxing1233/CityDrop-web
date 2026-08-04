import React from "react";
import { colors } from "./theme";
import LoginPage from "./components/LoginPage";
import HomePage from "./components/HomePage";
import OrderPage from "./components/OrderPage";
import MyOrdersPage from "./components/MyOrdersPage";
import OrderDetailPage from "./components/OrderDetailPage";
import SupportPage from "./components/SupportPage";
import SettingsPage from "./components/SettingsPage";

// No react-router-dom here — matching staybooking/staysbookingfe/src/App.js,
// this class component itself decides what's on screen using plain state:
//   - this.state.authed      -> show LoginPage, or the app shell
//   - this.state.page        -> which page inside the shell ("home",
//                                "order", "myOrders", "orderDetail", ...)
//   - this.state.params      -> extra data the current page needs
//                                (e.g. { orderId: "A1234" } for orderDetail)
//
// Trade-off, on purpose: this means there's no real "/orders/A1234" URL you
// can refresh or share — that's the piece citydrop-web's version has (via
// react-router-dom) that this version doesn't. Once this style feels
// comfortable, that's the next thing worth adding back.
class App extends React.Component {
  state = {
    authed: false,
    user: null,
    page: "home",
    params: {},
  };

  componentDidMount() {
    const authToken = localStorage.getItem("authToken");
    const userEmail = localStorage.getItem("userEmail");
    if (authToken) {
      this.setState({ authed: true, user: userEmail });
    }
  }

  handleLoginSuccess = (token, email) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userEmail", email);
    this.setState({ authed: true, user: email, page: "home", params: {} });
  };

  handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    this.setState({ authed: false, user: null, page: "home", params: {} });
  };

  // Passed down to every page as a prop — this is this version's
  // replacement for react-router-dom's useNavigate(). Calling
  // navigate('orderDetail', { orderId: 'A1234' }) is the same idea as
  // calling navigate('/orders/A1234') in the citydrop-web version.
  navigate = (page, params = {}) => {
    this.setState({ page, params });
  };

  renderContent() {
    switch (this.state.page) {
      case "order":
        return <OrderPage navigate={this.navigate} />;
      case "myOrders":
        return <MyOrdersPage navigate={this.navigate} />;
      case "orderDetail":
        return (
          <OrderDetailPage
            orderId={this.state.params.orderId}
            navigate={this.navigate}
          />
        );
      case "support":
        return <SupportPage navigate={this.navigate} />;
      case "settings":
        return <SettingsPage navigate={this.navigate} />;
      case "home":
      default:
        return <HomePage user={this.state.user} navigate={this.navigate} />;
    }
  }

  render() {
    if (!this.state.authed) {
      return <LoginPage handleLoginSuccess={this.handleLoginSuccess} />;
    }

    // This card-shell wrapper (grey page background behind a centered,
    // bordered, rounded white card) is what makes the app match the
    // deployed prototype's look. It mirrors citydrop-web's AppShell.jsx —
    // same maxWidth/margin/border/borderRadius/minHeight numbers — just
    // written as plain divs here instead of antd's <Layout>, and using
    // this.navigate(...) instead of react-router-dom's <Link>.
    return (
      <div style={{ minHeight: "100vh" }}>
        <div
          style={{
            maxWidth: 960,
            margin: "32px auto 90px",
            background: "#fff",
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            minHeight: 640,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 28px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <a
              onClick={() => this.navigate("home")}
              style={{
                fontWeight: "bold",
                color: colors.navy,
                fontSize: 17,
                cursor: "pointer",
              }}
            >
              CityDrop
            </a>
            <div
              style={{
                display: "flex",
                gap: 20,
                fontSize: 14,
                alignItems: "center",
              }}
            >
              <a
                onClick={() => this.navigate("home")}
                style={{ color: colors.muted, cursor: "pointer" }}
              >
                Home
              </a>
              <a
                onClick={this.handleLogout}
                style={{ color: colors.muted, cursor: "pointer" }}
              >
                Log out{this.state.user ? " (" + this.state.user + ")" : ""}
              </a>
            </div>
          </div>
          <div style={{ padding: "26px 28px" }}>{this.renderContent()}</div>
        </div>
      </div>
    );
  }
}

export default App;
