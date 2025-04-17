
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import ScanPage from "./pages/ScanPage";
import ScanResults from "./pages/ScanResults";
import NotFound from "./pages/NotFound";
import AccountSettings from "./pages/AccountSettings";
import ScanHistory from "./pages/ScanHistory";
import Documentation from "./pages/Documentation";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PrivateRoute from "./components/auth/PrivateRoute";
import ReportsPage from "./pages/ReportsPage";
import VulnerabilitiesPage from "./pages/VulnerabilitiesPage";
import RepositoriesPage from "./pages/RepositoriesPage";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/docs" element={<Documentation />} />
            
            {/* Protected routes */}
            <Route path="/" element={<PrivateRoute element={<Index />} />} />
            <Route path="/scan" element={<PrivateRoute element={<ScanPage />} />} />
            <Route path="/results" element={<PrivateRoute element={<ScanResults />} />} />
            <Route path="/history" element={<PrivateRoute element={<ScanHistory />} />} />
            <Route path="/settings" element={<PrivateRoute element={<AccountSettings />} />} />
            <Route path="/reports" element={<PrivateRoute element={<ReportsPage />} />} />
            <Route path="/vulnerabilities" element={<PrivateRoute element={<VulnerabilitiesPage />} />} />
            <Route path="/repositories" element={<PrivateRoute element={<RepositoriesPage />} />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
