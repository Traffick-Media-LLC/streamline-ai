
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PerformanceProvider } from "./contexts/PerformanceContext";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import "./index.css";

// Lazy load pages for code splitting and performance
const HomePage = lazy(() => import("./pages/HomePage"));
const MapPage = lazy(() => import("./pages/MapPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Auth2Page = lazy(() => import("./pages/Auth2Page"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const KnowledgeManager = lazy(() => import("./components/KnowledgeManager"));
const EmployeeDirectory = lazy(() => import("./pages/EmployeeDirectory"));

// Admin Pages
const BrandsPage = lazy(() => import("./pages/admin/BrandsPage"));
const ProductsPage = lazy(() => import("./pages/admin/ProductsPage"));
const PermissionsPage = lazy(() => import("./pages/admin/PermissionsPage"));
const EmployeesPage = lazy(() => import("./pages/admin/EmployeesPage"));
const OrganizationPage = lazy(() => import("./pages/admin/OrganizationPage"));
const KnowledgePage = lazy(() => import("./pages/admin/KnowledgePage"));

// Create reusable loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[60vh]">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>
);

// Configure React Query for optimized data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    }
  }
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PerformanceProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen flex flex-col">
                <Routes>
                  {/* Auth routes - Explicitly NOT protected */}
                  <Route path="/auth" element={
                    <Suspense fallback={<PageLoader />}>
                      <AuthPage />
                    </Suspense>
                  } />
                  <Route path="/auth2" element={
                    <Suspense fallback={<PageLoader />}>
                      <Auth2Page />
                    </Suspense>
                  } />
                  
                  {/* Admin routes with AdminLayout */}
                  <Route 
                    path="/admin/*" 
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <ProtectedRoute requiredRole="admin">
                          <AdminLayout />
                        </ProtectedRoute>
                      </Suspense>
                    }
                  >
                    <Route index element={<AdminPage />} />
                    <Route path="brands" element={<BrandsPage />} />
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="permissions" element={<PermissionsPage />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="organization" element={<OrganizationPage />} />
                    <Route path="knowledge" element={<KnowledgePage />} />
                  </Route>
                  
                  {/* Regular routes with Header */}
                  <Route
                    path="*"
                    element={
                      <>
                        <ProtectedRoute>
                          <Header />
                        </ProtectedRoute>
                        <main className="flex-1">
                          <Suspense fallback={<PageLoader />}>
                            <Routes>
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
                                path="/employees" 
                                element={
                                  <ProtectedRoute>
                                    <EmployeeDirectory />
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
                          </Suspense>
                        </main>
                      </>
                    }
                  />
                </Routes>
              </div>
            </BrowserRouter>
          </PerformanceProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
