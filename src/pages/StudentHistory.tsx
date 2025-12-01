import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export default function StudentHistory() {
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: studentAttendance } = useQuery({
    queryKey: ["student-attendance", selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return null;

      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          subjects (name, code)
        `)
        .eq("student_id", selectedStudent)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudent,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      present: "default",
      absent: "destructive",
      late: "secondary",
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateStats = (subjectId?: string) => {
    if (!studentAttendance) return { total: 0, present: 0, absent: 0, late: 0, percentage: 0 };

    const filtered = subjectId
      ? studentAttendance.filter((a) => a.subject_id === subjectId)
      : studentAttendance;

    const total = filtered.length;
    const present = filtered.filter((a) => a.status === "present").length;
    const absent = filtered.filter((a) => a.status === "absent").length;
    const late = filtered.filter((a) => a.status === "late").length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { total, present, absent, late, percentage };
  };

  const selectedStudentData = students?.find((s) => s.id === selectedStudent);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="shadow-xl border-primary/10">
            <CardHeader className="space-y-4">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Student Attendance History
              </CardTitle>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} - {student.roll_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!selectedStudent ? (
                <div className="text-center py-8 text-muted-foreground">
                  Please select a student to view their attendance history
                </div>
              ) : !studentAttendance?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found for this student
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedStudentData && (
                    <div className="grid gap-4 p-4 bg-secondary/10 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Name</div>
                          <div className="font-medium">{selectedStudentData.name}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Roll Number</div>
                          <div className="font-medium">{selectedStudentData.roll_number}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Department</div>
                          <div className="font-medium">{selectedStudentData.department}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Year</div>
                          <div className="font-medium">{selectedStudentData.year}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="w-full justify-start overflow-x-auto">
                      <TabsTrigger value="all">All Subjects</TabsTrigger>
                      {subjects?.map((subject) => (
                        <TabsTrigger key={subject.id} value={subject.id}>
                          {subject.code}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                      {(() => {
                        const stats = calculateStats();
                        return (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-2xl font-bold">{stats.total}</div>
                                  <div className="text-xs text-muted-foreground">Total Classes</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                                  <div className="text-xs text-muted-foreground">Present</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                                  <div className="text-xs text-muted-foreground">Absent</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                                  <div className="text-xs text-muted-foreground">Late</div>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-2xl font-bold text-blue-600">{stats.percentage}%</div>
                                  <div className="text-xs text-muted-foreground">Attendance</div>
                                </CardContent>
                              </Card>
                            </div>
                            <div className="rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {studentAttendance.map((record) => (
                                    <TableRow key={record.id}>
                                      <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                                      <TableCell>
                                        <div className="text-sm">
                                          <div className="font-medium">{record.subjects?.name}</div>
                                          <div className="text-muted-foreground">{record.subjects?.code}</div>
                                        </div>
                                      </TableCell>
                                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </>
                        );
                      })()}
                    </TabsContent>

                    {subjects?.map((subject) => (
                      <TabsContent key={subject.id} value={subject.id} className="space-y-4">
                        {(() => {
                          const stats = calculateStats(subject.id);
                          const subjectRecords = studentAttendance.filter((a) => a.subject_id === subject.id);
                          return (
                            <>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">{stats.total}</div>
                                    <div className="text-xs text-muted-foreground">Total Classes</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                                    <div className="text-xs text-muted-foreground">Present</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                                    <div className="text-xs text-muted-foreground">Absent</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
                                    <div className="text-xs text-muted-foreground">Late</div>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-blue-600">{stats.percentage}%</div>
                                    <div className="text-xs text-muted-foreground">Attendance</div>
                                  </CardContent>
                                </Card>
                              </div>
                              <div className="rounded-lg border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {subjectRecords.map((record) => (
                                      <TableRow key={record.id}>
                                        <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </>
                          );
                        })()}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
