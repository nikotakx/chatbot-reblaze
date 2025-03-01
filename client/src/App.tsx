import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/Chat";
import Admin from "@/pages/Admin";
import Header from "@/components/Header";
import ChatInterface from "@/components/ChatInterface";
import AdminPanel from "@/components/AdminPanel";
import { useIsMobile } from "@/hooks/use-mobile";

function MainLayout() {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [showAdmin, setShowAdmin] = useState(false);
  
  // Handle toggling between admin and chat views
  const handleToggleAdmin = () => {
    if (isMobile) {
      // On mobile, navigate to the appropriate route
      setLocation(location === "/admin" ? "/" : "/admin");
    } else {
      // On desktop, toggle the admin panel
      setShowAdmin(!showAdmin);
    }
  };
  
  // Ensure showAdmin state is synchronized with the URL on desktop
  useEffect(() => {
    if (!isMobile) {
      setShowAdmin(location === "/admin");
    }
  }, [location, isMobile]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header onToggleAdmin={handleToggleAdmin} />
      
      <div className="flex flex-1 overflow-hidden">
        {isMobile ? (
          // Mobile layout - show either chat or admin based on route
          <Switch>
            <Route path="/" component={Chat} />
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        ) : (
          // Desktop layout - Chat is always visible, admin panel can be toggled
          <>
            <ChatInterface className={showAdmin ? "hidden md:flex" : "flex"} />
            {showAdmin && <AdminPanel />}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={MainLayout} />
        <Route path="/admin" component={MainLayout} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
