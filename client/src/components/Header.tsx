import { Link, useLocation } from "wouter";

interface HeaderProps {
  onToggleAdmin: () => void;
}

export default function Header({ onToggleAdmin }: HeaderProps) {
  const [location] = useLocation();
  const isAdmin = location === "/admin";

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link href="/">
          <a className="text-primary-600 text-xl font-semibold">DocChat</a>
        </Link>
        <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800">Beta</span>
      </div>
      
      <div className="flex space-x-4">
        <button 
          onClick={onToggleAdmin}
          className="text-sm flex items-center space-x-1 text-secondary-700 hover:text-primary-600 transition"
        >
          <i className="fas fa-cog"></i>
          <span>{isAdmin ? "Chat" : "Admin"}</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Admin User</span>
          <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700">
            <i className="fas fa-user text-sm"></i>
          </div>
        </div>
      </div>
    </header>
  );
}
