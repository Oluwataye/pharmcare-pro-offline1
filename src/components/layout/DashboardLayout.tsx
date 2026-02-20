
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ShiftStatusHeader } from "../shifts/ShiftStatusHeader";

const DashboardLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const pageTitle = location.pathname === '/' ? 'Dashboard' :
    location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';

  return (
    <div className="flex h-screen flex-col md:flex-row overflow-hidden">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden flex items-center justify-between border-b p-4 bg-background">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary">PharmaCare Pro</h1>
        </div>
        <ShiftStatusHeader />
      </div>

      {/* Sidebar - hidden on mobile by default unless toggled */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block md:flex-shrink-0 z-20`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-50/50 flex flex-col min-w-0">
        {/* Top Sticky Header */}
        <header className="h-16 border-b bg-white/70 backdrop-blur-lg px-8 hidden md:flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-xl text-slate-800 capitalize tracking-tight">
              {pageTitle}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <ShiftStatusHeader />
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
