import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from "date-fns";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Analytics() {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const monthStart = startOfMonth(new Date(selectedMonth));
  const monthEnd = endOfMonth(new Date(selectedMonth));

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

  const { data: attendanceData } = useQuery({
    queryKey: ["analytics-attendance", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          students (id, name, roll_number, department),
          subjects (id, name, code)
        `)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data;
    },
  });

  // Calculate daily attendance trends
  const dailyTrends = () => {
    if (!attendanceData) return [];
    
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = attendanceData.filter(r => r.date === dayStr);
      const present = dayRecords.filter(r => r.status === "present").length;
      const absent = dayRecords.filter(r => r.status === "absent").length;
      const late = dayRecords.filter(r => r.status === "late").length;
      const total = dayRecords.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
      
      return {
        date: format(day, "MMM dd"),
        present,
        absent,
        late,
        rate,
      };
    }).filter(d => d.present + d.absent + d.late > 0);
  };

  // Calculate subject-wise breakdown
  const subjectBreakdown = () => {
    if (!attendanceData || !subjects) return [];
    
    return subjects.map(subject => {
      const subjectRecords = attendanceData.filter(r => r.subject_id === subject.id);
      const present = subjectRecords.filter(r => r.status === "present").length;
      const total = subjectRecords.length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return {
        name: subject.code,
        fullName: subject.name,
        present,
        total,
        rate,
      };
    }).filter(s => s.total > 0);
  };

  // Calculate students with low attendance
  const lowAttendanceStudents = () => {
    if (!attendanceData || !students) return [];
    
    const threshold = 75; // 75% attendance threshold
    
    return students.map(student => {
      const studentRecords = attendanceData.filter(r => r.student_id === student.id);
      const present = studentRecords.filter(r => r.status === "present").length;
      const late = studentRecords.filter(r => r.status === "late").length;
      const total = studentRecords.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
      
      return {
        id: student.id,
        name: student.name,
        rollNumber: student.roll_number,
        department: student.department,
        present,
        total,
        rate,
      };
    })
    .filter(s => s.total > 0 && s.rate < threshold)
    .sort((a, b) => a.rate - b.rate);
  };

  // Calculate overall statistics
  const overallStats = () => {
    if (!attendanceData) return { totalClasses: 0, avgRate: 0, trend: 0 };
    
    const totalClasses = attendanceData.length;
    const present = attendanceData.filter(r => r.status === "present").length;
    const late = attendanceData.filter(r => r.status === "late").length;
    const avgRate = totalClasses > 0 ? Math.round(((present + late) / totalClasses) * 100) : 0;
    
    // Calculate trend (compare with previous month)
    const prevMonth = format(subMonths(new Date(selectedMonth), 1), "yyyy-MM");
    const trend = 0; // Could be calculated by comparing with previous month data
    
    return { totalClasses, avgRate, trend };
  };

  const trends = dailyTrends();
  const breakdown = subjectBreakdown();
  const lowAttendance = lowAttendanceStudents();
  const stats = overallStats();

  // Generate month options (last 6 months)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Attendance Analytics
                </h1>
                <p className="text-muted-foreground mt-1">Monthly attendance insights and trends</p>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Overall Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{stats.totalClasses}</div>
                      <div className="text-sm text-muted-foreground">Total Records</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold">{stats.avgRate}%</div>
                      <div className="text-sm text-muted-foreground">Average Attendance</div>
                    </div>
                    {stats.avgRate >= 75 ? (
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-red-600">{lowAttendance.length}</div>
                      <div className="text-sm text-muted-foreground">Low Attendance Alerts</div>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Attendance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance Trends</CardTitle>
                <CardDescription>Attendance rate and distribution throughout the month</CardDescription>
              </CardHeader>
              <CardContent>
                {trends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No attendance data for this month</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="present" stroke="hsl(var(--chart-1))" name="Present" />
                      <Line yAxisId="left" type="monotone" dataKey="absent" stroke="hsl(var(--chart-2))" name="Absent" />
                      <Line yAxisId="left" type="monotone" dataKey="late" stroke="hsl(var(--chart-3))" name="Late" />
                      <Line yAxisId="right" type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} name="Rate %" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Subject-wise Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Subject-wise Breakdown</CardTitle>
                  <CardDescription>Attendance rate by subject</CardDescription>
                </CardHeader>
                <CardContent>
                  {breakdown.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={breakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={entry => `${entry.name} (${entry.rate}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="present"
                          >
                            {breakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {breakdown.map((subject, index) => (
                          <div key={subject.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium">{subject.fullName}</span>
                            </div>
                            <Badge variant={subject.rate >= 75 ? "default" : "destructive"}>
                              {subject.rate}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Subject Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Subject Comparison</CardTitle>
                  <CardDescription>Compare attendance across subjects</CardDescription>
                </CardHeader>
                <CardContent>
                  {breakdown.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={breakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill="hsl(var(--chart-1))" name="Present" />
                        <Bar dataKey="total" fill="hsl(var(--chart-4))" name="Total Classes" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Low Attendance Students */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Students with Low Attendance
                </CardTitle>
                <CardDescription>Students below 75% attendance threshold</CardDescription>
              </CardHeader>
              <CardContent>
                {lowAttendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    All students have good attendance! 🎉
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Classes Attended</TableHead>
                          <TableHead>Attendance Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowAttendance.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.rollNumber}</TableCell>
                            <TableCell>{student.department}</TableCell>
                            <TableCell>
                              {student.present} / {student.total}
                            </TableCell>
                            <TableCell>
                              <Badge variant={student.rate < 50 ? "destructive" : "secondary"}>
                                {student.rate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
