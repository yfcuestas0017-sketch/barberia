import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPassword from "./pages/ForgotPassword";
import AdminLayout from "./components/AdminLayout";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPerfil from "./pages/admin/AdminPerfil";
import Barbers from "./pages/admin/Barbers";
import Services from "./pages/admin/Services";
import Promotions from "./pages/admin/Promotions";
import Appointments from "./pages/admin/Appointments";
import Movements from "./pages/admin/Movements";
import Reviews from "./pages/admin/Reviews";
import IncomesView from "./components/IncomesView/IncomesView";
import BarberLayout from "./components/BarberLayout";
import BarberDashboard from "./pages/barber/BarberDashboard";
import BarberAppointments from "./pages/barber/BarberAppointments";
import BarberSchedule from "./pages/barber/BarberSchedule";
import BarberReviews from "./pages/barber/BarberReviews";
import BarberPromotions from "./pages/barber/BarberPromotions";
import BarberProfile from "./pages/barber/BarberProfile";
import ClientLayout from "./components/ClientLayout";
import ClientHome from "./pages/client/ClientHome";
import ClientBooking from "./pages/client/ClientBooking";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientProfile from "./pages/client/ClientProfile";
import ClientReview from "./pages/client/ClientReview";
import ResponsiveTables from "./components/ResponsiveTables";

// Siempre al final para que sus reglas de celular tengan prioridad
import "./responsive.css";


function App() {
  return (
    <BrowserRouter>

      <AuthProvider>

        <ResponsiveTables />

        <Routes>

          <Route path="/" element={<Home />} />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/recuperar"
            element={<ForgotPassword />}
          />

          {/* ========================= */}
          {/* ADMINISTRADOR */}
          {/* ========================= */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="barberos" element={<Barbers />} />
            <Route path="servicios" element={<Services />} />
            <Route path="promociones" element={<Promotions />} />
            <Route path="citas" element={<Appointments />} />
            <Route path="ingresos" element={<IncomesView role="ADMIN" />} />
            <Route path="movimientos" element={<Movements />} />
            <Route path="resenas" element={<Reviews />} />
            <Route path="perfil" element={<AdminPerfil />} />
          </Route>

          {/* ========================= */}
          {/* BARBERO */}
          {/* ========================= */}

          <Route
            path="/barbero"
            element={
              <ProtectedRoute roles={["BARBERO"]}>
                <BarberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<BarberDashboard />} />
            <Route path="citas" element={<BarberAppointments />} />
            <Route path="ingresos" element={<IncomesView role="BARBERO" />} />
            <Route path="horario" element={<BarberSchedule />} />
            <Route path="promociones" element={<BarberPromotions />} />
            <Route path="resenas" element={<BarberReviews />} />
            <Route path="perfil" element={<BarberProfile />} />
          </Route>

          {/* ========================= */}
          {/* CLIENTE */}
          {/* ========================= */}

          <Route
            path="/cliente"
            element={
              <ProtectedRoute roles={["CLIENTE"]}>
                <ClientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClientHome />} />
            <Route path="reservar" element={<ClientBooking />} />
            <Route path="citas" element={<ClientAppointments />} />
            <Route path="perfil" element={<ClientProfile />} />
            <Route path="resenas/:id" element={<ClientReview />} />
          </Route>

        </Routes>

      </AuthProvider>

    </BrowserRouter>
  );
}

export default App;
