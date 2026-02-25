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
                    <Route path="/designer" element={<DesignerPage />} />
                    <Route path="/launcher" element={<LauncherPage />} />
                    <Route path="/monitor" element={<MonitorPage />} />
                    <Route path="/batch/:batchId" element={<BatchProgress />} />
                    <Route path="/assets" element={<AssetLibrary />} />
                    <Route path="/calculator" element={<CalculatorPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
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
