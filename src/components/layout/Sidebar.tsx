import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useState, useEffect } from "react";
import { db } from "@/lib/db-client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { OfflineSyncIndicator } from "./OfflineSyncIndicator";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  FileText,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Printer,
  Clock,
  CheckCircle2,
  Wallet,
  Activity,
  GraduationCap,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { useShift } from "@/hooks/useShift";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NairaSign } from "../icons/NairaSign";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar = ({ onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const {
    canAccessInventory,
    canAccessUsers,
    canAccessReports,
    canAccessExpenses,
    isAdmin,
  } = usePermissions();
  const { settings: storeSettings } = useStoreSettings();
  const [storeLogo, setStoreLogo] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('PharmCare Pro');

  useEffect(() => {
    if (storeSettings) {
      setStoreLogo(storeSettings.logo_url || '');
      setStoreName(storeSettings.name || 'PharmCare Pro');
    }
  }, [storeSettings]);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Sales: true,
    Terminal: false
  });

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/",
      condition: true
    },
    {
      icon: Package,
      label: "Inventory",
      path: "/inventory",
      condition: canAccessInventory()
    },
    {
      icon: ShoppingCart,
      label: "Sales",
      path: "/sales",
      condition: true,
      children: [
        {
          icon: NairaSign,
          label: "Point of Sale",
          path: "/sales"
        },
        {
          icon: Receipt,
          label: "Receipts",
          path: "/receipts"
        },
        {
          icon: Printer,
          label: "Print History",
          path: "/print-history",
          condition: canAccessReports()
        },
        {
          icon: ShoppingCart,
          label: "Refunds",
          path: "/refunds",
          condition: canAccessReports()
        },
      ]
    },
    {
      icon: Clock,
      label: "Staff Shifts",
      path: "/shifts",
      condition: isAdmin
    },
    {
      icon: FileText,
      label: "Reports",
      path: "/reports",
      condition: canAccessReports(),
      children: [
        {
          icon: FileText,
          label: "Standard Reports",
          path: "/reports"
        },
        {
          icon: Activity,
          label: "Live Analytics",
          path: "/analytics"
        },
        {
          icon: CheckCircle2,
          label: "Cash Reconciliation",
          path: "/reconciliation"
        },
      ]
    },
    {
      icon: Wallet,
      label: "Expenses",
      path: "/expenses",
      condition: canAccessExpenses()
    },
    {
      icon: Wallet,
      label: "Credit Manager",
      path: "/credit-management",
      condition: true
    },
    {
      icon: Users,
      label: "Suppliers",
      path: "/suppliers",
      condition: canAccessInventory()
    },
    {
      icon: Users,
      label: "Users",
      path: "/users",
      condition: canAccessUsers()
    },
    {
      icon: Settings,
      label: "Settings",
      path: "/settings",
      condition: true
    },
    {
      icon: LayoutDashboard,
      label: "Terminal Utility",
      path: "/technical-guide",
      condition: true,
      children: [
        {
          icon: ShieldAlert,
          label: "Technical Guide",
          path: "/technical-guide"
        },
        {
          icon: GraduationCap,
          label: "Training",
          path: "/training"
        }
      ]
    }
  ];

  // Auto-expand menu if a child is active
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child =>
          location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path))
        );
        if (isChildActive) {
          setExpandedMenus(prev => ({ ...prev, [item.label]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={cn(
      "flex h-full md:h-screen w-full flex-col bg-gradient-to-b from-background to-muted/30 border-r shadow-sm transition-all duration-300 ease-in-out",
      isCollapsed ? "md:w-20" : "md:w-64"
    )}>
      {/* Header with Logo and Store Name */}
      <div className={cn(
        "flex items-center p-4 border-b bg-card bg-gradient-to-r from-card to-muted/10 transition-all duration-300",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <div className={cn("flex items-center gap-3 flex-1 min-w-0", isCollapsed ? "justify-center" : "")}>
          {storeLogo && (
            <div className={cn(
              "rounded-lg overflow-hidden border-2 border-primary/20 flex-shrink-0 shadow-sm flex items-center justify-center bg-white p-1",
              isCollapsed ? "w-8 h-8" : "w-10 h-10"
            )}>
              <img
                src={storeLogo}
                alt="Store Logo"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {!isCollapsed && (
            <h1 className="text-lg font-bold text-primary truncate animate-in fade-in duration-300">
              {storeName}
            </h1>
          )}
        </div>
        
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="md:hidden flex-shrink-0 hover:bg-primary/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Desktop Collapse/Expand control */}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden md:flex flex-shrink-0 hover:bg-primary/10 text-muted-foreground hover:text-foreground h-8 w-8 rounded-md"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4 text-primary font-bold" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* User Profile Section */}
      {user && (
        <div className="px-4 py-4 border-b bg-card/50">
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/20 cursor-pointer">
                    <span className="text-sm font-semibold text-primary">
                      {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col gap-0.5 z-50">
                <p className="font-semibold text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase().replace('_', ' ')}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                <span className="text-sm font-semibold text-primary">
                  {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation Menu */}
      <nav className={cn(
        "flex-1 space-y-1 p-3 overflow-y-auto custom-scrollbar transition-all",
        isCollapsed ? "px-2" : "px-3"
      )}>
        {menuItems.map((item) => {
          if (!item.condition) return null;

          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus[item.label];

          // Check if parent is active (either directly or via children)
          const isParentActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/") ||
            (item.children?.some(child => location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path))));

          if (isCollapsed) {
            if (hasChildren) {
              return (
                <div key={item.label} className="flex justify-center py-0.5">
                  <DropdownMenu>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-12 justify-center h-11 px-0 transition-all duration-200 border-l-4 rounded-md relative group",
                              isParentActive
                                ? "bg-primary text-primary-foreground shadow-md border-primary"
                                : "hover:bg-accent/50 border-transparent text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <span className="font-medium">{item.label}</span>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="start" className="w-56 ml-2 bg-card border shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                      <DropdownMenuLabel className="text-primary font-semibold text-xs py-1.5 px-3 bg-muted/20">{item.label}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.children!.map((child) => {
                        if (child.condition === false) return null;
                        const isChildActive = location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path));

                        return (
                          <DropdownMenuItem
                            key={child.path}
                            onClick={() => handleNavigate(child.path)}
                            className={cn(
                              "flex items-center gap-3 cursor-pointer py-2 px-3 text-sm transition-colors rounded-sm focus:bg-primary focus:text-primary-foreground",
                              isChildActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            <child.icon className="h-4 w-4 flex-shrink-0" />
                            <span>{child.label}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            } else {
              return (
                <div key={item.label} className="flex justify-center py-0.5">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-12 justify-center h-11 px-0 transition-all duration-200 border-l-4 rounded-md",
                          isParentActive
                            ? "bg-primary text-primary-foreground shadow-md border-primary"
                            : "hover:bg-accent/50 border-transparent text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => handleNavigate(item.path)}
                      >
                        <item.icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <span className="font-medium">{item.label}</span>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            }
          }

          return (
            <div key={item.label} className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between items-center h-11 px-4 transition-all duration-200 group border-l-4",
                  isParentActive
                    ? "bg-primary text-primary-foreground shadow-md border-primary"
                    : "hover:bg-accent/50 hover:translate-x-1 border-transparent"
                )}
                onClick={() => {
                  if (hasChildren) {
                    toggleMenu(item.label);
                  } else {
                    handleNavigate(item.path);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors",
                    isParentActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className={cn("font-medium", isParentActive && "font-semibold")}>
                    {item.label}
                  </span>
                </div>
                {hasChildren && (
                  <ChevronLeft className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExpanded ? "-rotate-90" : ""
                  )} />
                )}
              </Button>

              {hasChildren && isExpanded && (
                <div className="ml-4 pl-4 border-l-2 border-primary/10 space-y-1 animate-in fade-in slide-in-from-left-2 duration-200">
                  {item.children!.map((child) => {
                    if (child.condition === false) return null;
                    const isChildActive = location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path));

                    return (
                      <Button
                        key={child.path}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 h-10 px-4 transition-all duration-200 text-sm",
                          isChildActive
                            ? "bg-primary text-primary-foreground shadow-sm border-l-4 border-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                        )}
                        onClick={() => handleNavigate(child.path)}
                      >
                        <child.icon className={cn("h-4 w-4", isChildActive ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span>{child.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t bg-card/50">
        {isCollapsed ? (
          <div className="flex justify-center">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-12 justify-center h-11 px-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all border-l-4 border-transparent rounded-md"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="font-medium text-destructive">Logout</span>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-11 px-4 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </Button>
        )}
      </div>

      {/* Sync Indicator & Footer */}
      <div className={cn(
        "p-3 border-t bg-card/30 flex transition-all duration-300",
        isCollapsed ? "justify-center" : "items-center justify-between"
      )}>
        <OfflineSyncIndicator collapsed={isCollapsed} />
        {!isCollapsed && <p className="text-xs text-muted-foreground animate-in fade-in duration-300">© T-Tech</p>}
      </div>
    </div>
  );
};

export default Sidebar;;
