import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";

export default function Students() {
  const navigate = useNavigate();

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("roll_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto p-6">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student List</CardTitle>
                  <CardDescription>Manage all registered students</CardDescription>
                </div>
                <Button onClick={() => navigate("/register")}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading students...</p>
                </div>
              ) : students?.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No students registered yet</p>
                  <Button onClick={() => navigate("/register")}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register First Student
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students?.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.roll_number}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.department}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Year {student.year}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {student.phone || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
