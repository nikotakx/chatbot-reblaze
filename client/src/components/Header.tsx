import { Link, useLocation } from "wouter";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Settings, MessageSquare } from "lucide-react";
import RealtimeStatus from "./RealtimeStatus";

interface HeaderProps {
  onToggleAdmin: () => void;
}

export default function Header({ onToggleAdmin }: HeaderProps) {
  const [location] = useLocation();
  const isAdmin = location === "/admin";

  return (
    <header className="bg-background border-b border-border py-4 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link href="/">
          <span className="text-primary text-xl font-semibold cursor-pointer">
            L11-CHAT-AI
          </span>
        </Link>
        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
          Beta
        </span>
        <RealtimeStatus className="ml-3" />
      </div>

      <div className="flex items-center space-x-4">
        {/* ThemeSwitcher removed as requested */}
        <button
          onClick={onToggleAdmin}
          className="text-sm flex items-center space-x-1 text-muted-foreground hover:text-primary transition"
        >
          {isAdmin ? (
            <>
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </>
          )}
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Admin User</span>
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <span className="text-xs font-medium">A</span>
          </div>
        </div>
      </div>
    </header>
  );
}
