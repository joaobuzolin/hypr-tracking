import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import CampaignGroups from "./pages/CampaignGroups";
import Creatives from "./pages/Creatives";
import CreativeDetails from "./pages/CreativeDetails";
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
          <Route path="/insertion-orders/:insertionOrderId/campaigns" element={<ProtectedRoute><CampaignGroups /></ProtectedRoute>} />
          <Route path="/insertion-orders/:insertionOrderId/campaigns/:campaignGroupId/creatives" element={<ProtectedRoute><Creatives /></ProtectedRoute>} />
          <Route path="/insertion-orders/:insertionOrderId/campaigns/:campaignGroupId/creatives/new" element={<ProtectedRoute><CreativeDetails /></ProtectedRoute>} />
          <Route path="/creatives/:id" element={<ProtectedRoute><CreativeDetails /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;