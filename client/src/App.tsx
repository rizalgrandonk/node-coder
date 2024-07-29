import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/login/LoginPage";
import FormPage from "./pages/print-form/PrintFormPage";
import DashboardPage from "./pages/print-dashboard/PrintDashboard";

function App() {
  const isLoggedIn = () => {
    // Replace with your actual login logic
    return localStorage.getItem("isLoggedIn") === "true";
  };

  const hasFilledForm = () => {
    // Replace with your actual form submission logic
    return localStorage.getItem("hasFilledForm") === "true";
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/form" element={isLoggedIn() ? <FormPage /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={isLoggedIn() && hasFilledForm() ? <DashboardPage /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
