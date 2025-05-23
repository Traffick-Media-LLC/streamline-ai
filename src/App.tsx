
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import Auth2Page from "./pages/Auth2Page";
import NotFound from "./pages/NotFound";
import AdminPage from "./pages/AdminPage";
import EmployeesPage from "./pages/admin/EmployeesPage";
import OrganizationPage from "./pages/admin/OrganizationPage";
import PermissionsPage from "./pages/admin/PermissionsPage";
import BrandsPage from "./pages/admin/BrandsPage";
import ProductsPage from "./pages/admin/ProductsPage";
import KnowledgePage from "./pages/admin/KnowledgePage";
import DriveFilesPage from "./pages/admin/DriveFilesPage";
import EmployeeDirectory from "./pages/EmployeeDirectory";

import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  // Remove the lazy import for Auth component since it's not being used
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth2" element={<Auth2Page />} />
        <Route path="/employee-directory" element={<EmployeeDirectory />} />

        {/* Admin Routes with AdminLayout */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="permissions" element={<PermissionsPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="drive-files" element={<DriveFilesPage />} /> {/* New route */}
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
