import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { AuthGuard } from "@/components/AuthGuard";

export default function Attendance() {
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ["attendance", selectedSubject, selectedDate],
    queryFn: async () => {
      if (!selectedSubject) return [];
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("subject_id", selectedSubject)
        .eq("date", dateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSubject,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const records = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: studentId,
        subject_id: selectedSubject,
        date: dateStr,
        status,
        marked_by: user.id,
      }));

      // Delete existing attendance for this date and subject
      await supabase
        .from("attendance")
        .delete()
        .eq("subject_id", selectedSubject)
        .eq("date", dateStr);

      // Insert new attendance records
      const { error } = await supabase.from("attendance").insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attendance marked successfully!");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      setAttendanceData({});
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to mark attendance");
    },
  });

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-success text-white"><Check className="h-3 w-3 mr-1" />Present</Badge>;
      case "absent":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Absent</Badge>;
      case "late":
        return <Badge className="bg-warning text-white"><Clock className="h-3 w-3 mr-1" />Late</Badge>;
      default:
        return <Badge variant="outline">Not Marked</Badge>;
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto p-6">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
              <CardDescription>Record student attendance for each subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Subject</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {selectedSubject && students && students.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => {
                          const existing = existingAttendance?.find((a) => a.student_id === student.id);
                          const currentStatus = attendanceData[student.id] || existing?.status;
                          
                          return (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.roll_number}</TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{student.department}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={currentStatus === "present" ? "default" : "outline"}
                                    className={currentStatus === "present" ? "bg-success hover:bg-success/90" : ""}
                                    onClick={() => handleStatusChange(student.id, "present")}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={currentStatus === "absent" ? "destructive" : "outline"}
                                    onClick={() => handleStatusChange(student.id, "absent")}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={currentStatus === "late" ? "default" : "outline"}
                                    className={currentStatus === "late" ? "bg-warning hover:bg-warning/90" : ""}
                                    onClick={() => handleStatusChange(student.id, "late")}
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => markAttendanceMutation.mutate()}
                      disabled={Object.keys(attendanceData).length === 0 || markAttendanceMutation.isPending}
                      size="lg"
                    >
                      {markAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {!selectedSubject
                    ? "Please select a subject to mark attendance"
                    : "No students registered yet"}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
