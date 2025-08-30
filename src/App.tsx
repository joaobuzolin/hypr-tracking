import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import InsertionOrders from "@/pages/InsertionOrders";
import CampaignGroups from "@/pages/CampaignGroups";
import Creatives from "@/pages/Creatives";
import CreativeDetails from "@/pages/CreativeDetails";
import Reports from "@/pages/Reports";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <InsertionOrders />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/insertion-orders" element={
              <ProtectedRoute>
                <AppLayout>
                  <InsertionOrders />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/insertion-orders/:insertionOrderId/campaign-groups" element={
              <ProtectedRoute>
                <AppLayout>
                  <CampaignGroups />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/insertion-orders/:insertionOrderId/campaign-groups/:campaignGroupId/creatives" element={
              <ProtectedRoute>
                <AppLayout>
                  <Creatives />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/insertion-orders/:insertionOrderId/campaign-groups/:campaignGroupId/creatives/:creativeId" element={
              <ProtectedRoute>
                <AppLayout>
                  <CreativeDetails />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <AppLayout>
                  <Reports />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;