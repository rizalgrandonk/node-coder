import { Routes, Route, Navigate } from "react-router-dom";
// import LoginPage from "./pages/login/LoginPage";
import FormPage from "./pages/print-form/PrintFormPage";
import DashboardPage from "./pages/print-dashboard/PrintDashboard";

function App() {
  // const isLoggedIn = () => {
  //   // Replace with your actual login logic
  //   // return localStorage.getItem("isLoggedIn") === "true";
  //   return true;
  // };

  // const hasFilledForm = () => {
  //   // Replace with your actual form submission logic
  //   // return localStorage.getItem("hasFilledForm") === "true";
  //   return true;
  // };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/form" />} />
      {/* <Route path="/login" element={<LoginPage />} /> */}
      <Route
        path="/form"
        // element={isLoggedIn() ? <FormPage /> : <Navigate to="/login" />}
        element={<FormPage />}
      />
      <Route
        path="/dashboard"
        element={<DashboardPage />}
        // element={
        //   isLoggedIn() && hasFilledForm() ? (
        //     <DashboardPage />
        //   ) : (
        //     <Navigate to="/login" />
        //   )
        // }
      />
    </Routes>
  );
}

export default App;
