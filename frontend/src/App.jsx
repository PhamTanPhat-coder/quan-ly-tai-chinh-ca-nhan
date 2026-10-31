import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SetupFunds from "./pages/SetupFunds";
import Dashboard from "./pages/Dashboard";
import Debts from "./pages/Debts";
import Reports from "./pages/Reports";

const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem("isAuth") === "true";
  const hasSetup = localStorage.getItem("hasSetup") === "true";
  const location = useLocation();

  if (!isAuth) return <Navigate to="/login" replace />;
  if (isAuth && !hasSetup && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <SetupFunds />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="debts" element={<Debts />} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
