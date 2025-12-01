import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, Users, ClipboardList, UserPlus, FileText, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to logout");
    } else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  return (
    <nav className="border-b bg-card shadow-[var(--shadow-soft)]">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AttendEase
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/students" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Register
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/attendance" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Mark
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/records" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Records
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
