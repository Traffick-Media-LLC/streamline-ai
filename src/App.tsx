import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HamburgerMenu from "./components/HamburgerMenu";
import MapPage from "./pages/MapPage";
import ChatPage from "./pages/ChatPage";
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
            <div className="min-h-screen">
              <header className="fixed top-0 right-0 p-4 z-50">
                <HamburgerMenu />
              </header>
              <main className="pt-16">
                <Routes>
                  <Route 
                    path="/" 
                    element={<MapPage />}
                  />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route 
                    path="/chat" 
                    element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="/products" 
                    element={
                      <ProtectedRoute requiredRole="admin">
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
              </main>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
