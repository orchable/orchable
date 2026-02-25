import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/common/Layout";
import { HomePage } from "./pages/Home";
import { DesignerPage } from "./pages/Designer";
import { LauncherPage } from "./pages/Launcher";
import { MonitorPage } from "./pages/Monitor";
import { BatchProgress } from "./pages/BatchProgress";
import { AssetLibrary } from "./pages/AssetLibrary";
import { CalculatorPage } from "./pages/Calculator";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { HubBrowse } from "./pages/hub/HubBrowse";
import { AssetDetail } from "./pages/hub/AssetDetail";
import { CreatorProfile } from "./pages/hub/CreatorProfile";

import { AuthProvider } from "./contexts/AuthContext";
import { TierProvider } from "./contexts/TierContext";
import { Login } from "./pages/Login";
import { AuthCallback } from "./pages/AuthCallback";
import { ProtectedRoute } from "./components/common/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TierProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner duration={5000} closeButton />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/designer" element={<ProtectedRoute><DesignerPage /></ProtectedRoute>} />
                    <Route path="/launcher" element={<ProtectedRoute><LauncherPage /></ProtectedRoute>} />
                    <Route path="/monitor" element={<ProtectedRoute><MonitorPage /></ProtectedRoute>} />
                    <Route path="/batch/:batchId" element={<ProtectedRoute><BatchProgress /></ProtectedRoute>} />
                    <Route path="/assets" element={<ProtectedRoute><AssetLibrary /></ProtectedRoute>} />
                    <Route path="/calculator" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/hub" element={<HubBrowse />} />
                    <Route path="/hub/:category" element={<HubBrowse />} />
                    <Route path="/hub/c/:type/:slug" element={<AssetDetail />} />
                    <Route path="/hub/creators/:userId" element={<CreatorProfile />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </TierProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
