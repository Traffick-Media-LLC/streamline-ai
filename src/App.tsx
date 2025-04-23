
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MapPage from "./pages/MapPage";
import ProductManagementPage from "./pages/ProductManagementPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import KnowledgeManager from "./components/KnowledgeManager";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route 
                path="/" 
                element={<MapPage />}
              />
              <Route path="/auth" element={<AuthPage />} />
              <Route 
                path="/products" 
                element={
                  <ProtectedRoute>
                    <ProductManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/knowledge" 
                element={
                  <ProtectedRoute>
                    <KnowledgeManager />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
