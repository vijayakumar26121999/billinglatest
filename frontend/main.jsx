import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import Stock from "./screens/Stock.jsx";
import FoodItems from "./screens/FoodItems.jsx";
import { useAuth } from "./hooks/useAuth.js";
import Login from "./components/Login.jsx";
import Navbar from "./components/Navbar.jsx";
import Billing from "./screens/Billing.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import DashboardSettings from "./screens/DashboardSettings.jsx";
import InvoiceHistory from "./screens/InvoiceHistory.jsx";
import Tables from "./screens/Tables.jsx";
import Users from "./screens/Users.jsx";
import InvoiceSettings from "./screens/InvoiceSettings.jsx";
import AppConfig from "./screens/AppConfig.jsx";
import Reports from "./screens/Reports.jsx";
import LicenseActivation from "./screens/LicenseActivation.jsx";
import LicenseManagement from "./screens/LicenseManagement.jsx";
import MobileScannerSetup from "./screens/MobileScannerSetup.jsx";

function App() {
  const { user, login, logout } = useAuth();
  const [screen, setScreen] = useState("BILLING");
  const [selectedTable, setSelectedTable] = useState(null);
  const [newBillId, setNewBillId] = useState(null);
  const [appType, setAppType] = useState("RESTAURANT");
  const [initialPaymentFilter, setInitialPaymentFilter] = useState("ALL");
  const [initialDateRange, setInitialDateRange] = useState("ALL");

  // Persistent Billing State (Independent for RESTAURANT and GROCERY)
  const [billingData, setBillingData] = useState({
    RESTAURANT: {
      cart: [], discount: 0, discountType: "AMOUNT", paymentMethod: "CASH",
      cashReceived: "", customerName: "", customerPhone: ""
    },
    GROCERY: {
      cart: [], discount: 0, discountType: "AMOUNT", paymentMethod: "CASH",
      cashReceived: "", customerName: "", customerPhone: ""
    }
  });

  const [licenseStatus, setLicenseStatus] = useState({ hasLicense: true, license: null });
  const [loadingLicense, setLoadingLicense] = useState(true);

  // New Item Creation State (Persistence across navigation)
  const [newItemData, setNewItemData] = useState({
    name: "",
    price: "",
    mrp: "",
    tax: "",
    category: "",
    stock: "",
    editingId: null
  });

  // Global Toast State
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    fetch("http://localhost:4000/api/global-config")
      .then(r => r.json())
      .then(data => setAppType(data.app_type));

    // Check license status
    fetch("http://localhost:4000/api/license/status")
      .then(r => r.json())
      .then(data => {
        setLicenseStatus(data);
        setLoadingLicense(false);
      })
      .catch(() => setLoadingLicense(false));
  }, [licenseStatus.hasLicense]);


  useEffect(() => {
    if (user) {
      setScreen("BILLING");
    }
  }, [user]);

  function navigate(s, params = {}) {
    // Always clear table when navigating via Navbar (user explicit click)
    // This ensures clicking "Billing" opens Take Away mode
    setSelectedTable(null);
    if (s !== "HISTORY") setNewBillId(null);

    if (s === "HISTORY") {
      setInitialPaymentFilter(params.paymentFilter || "ALL");
      setInitialDateRange(params.dateRange || "ALL");
    } else {
      setInitialPaymentFilter("ALL");
      setInitialDateRange("ALL");
    }

    setScreen(s);
  }

  function handleTableSelect(table) {
    setSelectedTable(table);
    setScreen("BILLING");
  }

  function handleAppTypeChange(type) {
    setAppType(type);
    // Reload or reset bits if needed
    setScreen("BILLING");
  }


  if (loadingLicense) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-white text-xl">Loading Application...</div>
      </div>
    );
  }

  if (!licenseStatus.hasLicense || (licenseStatus.license && licenseStatus.license.status !== "ACTIVE")) {
    return <LicenseActivation onActivated={(lic) => setLicenseStatus({ hasLicense: true, license: lic })} />;
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh" }}>
      <div className="title-bar" />
      <Navbar
        user={user}
        screen={screen}
        setScreen={navigate}
        onLogout={logout}
        appType={appType}
        toast={toast}
        onClearToast={() => setToast(null)}
        onShowToast={showToast}
      />

      <div className="p-4" style={{ flex: 1 }}>
        <div className="page-enter" key={appType}>
          {screen === "BILLING" && (
            <Billing
              user={user}
              selectedTable={selectedTable}
              appType={appType}
              billingData={billingData[appType]}
              onUpdateBilling={(data) => setBillingData(prev => ({
                ...prev,
                [appType]: { ...prev[appType], ...data }
              }))}
              onClearBilling={() => setBillingData(prev => ({
                ...prev,
                [appType]: {
                  cart: [], discount: 0, discountType: "AMOUNT", paymentMethod: "CASH",
                  cashReceived: "", customerName: "", customerPhone: ""
                }
              }))}
              onOrderSaved={() => navigate("TABLES")}
              onPaymentSuccess={(id) => {
                setNewBillId(id);
                navigate("HISTORY");
              }}
              onShowToast={showToast}
            />
          )}
          {screen === "TABLES" && <Tables user={user} onSelectTable={handleTableSelect} />}
          {screen === "HISTORY" && <InvoiceHistory initialBillId={newBillId} appType={appType} initialPaymentFilter={initialPaymentFilter} initialDateRange={initialDateRange} />}
          {screen === "DASHBOARD" && <Dashboard user={user} appType={appType} onNavigateToHistory={(filter, range) => navigate("HISTORY", { paymentFilter: filter, dateRange: range })} />}
          {screen === "REPORTS" && <Reports user={user} />}
          {screen === "STOCK" && <Stock user={user} />}
          {screen === "FOOD" && (
            <FoodItems
              appType={appType}
              newItemData={newItemData}
              onUpdateNewItem={(data) => setNewItemData(prev => ({ ...prev, ...data }))}
            />
          )}
          {screen === "USERS" && <Users user={user} />}
          {screen === "INVOICE_SETTINGS" && <InvoiceSettings user={user} />}
          {screen === "DASHBOARD_SETTINGS" && <DashboardSettings user={user} />}
          {screen === "APP_CONFIG" && <AppConfig user={user} onTypeChange={handleAppTypeChange} licenseFeatures={licenseStatus.license?.features || []} />}
          {screen === "LICENSE" && <LicenseManagement user={user} />}
          {screen === "SCANNER" && <MobileScannerSetup user={user} />}
        </div>
      </div>
      <div className="text-center pb-2 opacity-30 select-none" style={{ fontSize: "10px", color: "#94a3b8" }}>
        Copyrights <a href="http://www.ctrlplustech.com" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }} onMouseOver={(e) => e.target.style.textDecoration = "underline"} onMouseOut={(e) => e.target.style.textDecoration = "none"}>CtrlPlusTech</a>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
