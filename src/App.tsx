
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import KnowledgeManager from "./components/KnowledgeManager";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import Header from "./components/Header";
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
            <div className="min-h-screen flex flex-col">
              <ProtectedRoute>
                <Header />
              </ProtectedRoute>
              <main className="flex-1">
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="/map" 
                    element={
                      <ProtectedRoute>
                        <MapPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="/chat" 
                    element={
                      <ProtectedRoute>
                        <ChatPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminPage />
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
                  <Route 
                    path="*" 
                    element={
                      <ProtectedRoute>
                        <NotFound />
                      </ProtectedRoute>
                    }
                  />
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
