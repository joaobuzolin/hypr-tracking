import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageSkeleton } from "@/components/layout/PageSkeleton";
import { usePreloadPages } from "@/hooks/usePreloadPages";

// Lazy load pages for better performance
const InsertionOrders = lazy(() => import("./pages/InsertionOrders"));
const Campanhas = lazy(() => import("./pages/Campanhas"));
const Criativos = lazy(() => import("./pages/Criativos"));
const CriativoDetails = lazy(() => import("./pages/CriativoDetails"));
const Reports = lazy(() => import("./pages/Reports"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AppContent = () => {
  usePreloadPages();
  
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/" element={<ProtectedRoute><InsertionOrders /></ProtectedRoute>} />
              <Route path="/insertion-orders" element={<ProtectedRoute><InsertionOrders /></ProtectedRoute>} />
              <Route path="/insertion-orders/:insertionOrderId/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
              <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
              <Route path="/campanhas/:campaignGroupId/criativos" element={<ProtectedRoute><Criativos /></ProtectedRoute>} />
              <Route path="/insertion-orders/:insertionOrderId/criativos/new" element={<ProtectedRoute><CriativoDetails /></ProtectedRoute>} />
              <Route path="/criativos" element={<ProtectedRoute><Criativos /></ProtectedRoute>} />
              <Route path="/criativos/:id" element={<ProtectedRoute><CriativoDetails /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  );
};

const App = () => <AppContent />;

export default App;