import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Criativos from "./pages/Criativos";
import CriativoDetails from "./pages/CriativoDetails";
import Reports from "./pages/Reports";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import InsertionOrders from "./pages/InsertionOrders";

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<ProtectedRoute><InsertionOrders /></ProtectedRoute>} />
          <Route path="/insertion-orders" element={<ProtectedRoute><InsertionOrders /></ProtectedRoute>} />
          <Route path="/insertion-orders/:insertionOrderId/criativos" element={<ProtectedRoute><Criativos /></ProtectedRoute>} />
          <Route path="/insertion-orders/:insertionOrderId/criativos/new" element={<ProtectedRoute><CriativoDetails /></ProtectedRoute>} />
          <Route path="/criativos" element={<ProtectedRoute><Criativos /></ProtectedRoute>} />
          <Route path="/criativos/:id" element={<ProtectedRoute><CriativoDetails /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;