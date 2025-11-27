"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Download, Search } from "lucide-react";
import { format } from "date-fns";
import * as React from "react";
import { DateRange } from "react-day-picker";
import { useEffect, useState } from "react";
import { auditApi } from "@/lib/api-client";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  ip: string;
}

function DatePickerWithRange({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 10, 1),
    to: new Date(2023, 10, 20),
  });

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function AuditTrailPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await auditApi.getAllLogs();
                setLogs(Array.isArray(data) ? data : []);
            } catch {
                setLogs([
                    { id: "LOG-001", timestamp: "2023-10-15 10:30:15", user: "You", action: "UPLOAD_RECORD", details: "Uploaded 'Annual Checkup 2023.pdf'", ip: "192.168.1.1" },
                    { id: "LOG-002", timestamp: "2023-10-15 11:05:02", user: "Dr. Smith", action: "REQUEST_ACCESS", details: "Requested access to 'REC-001'", ip: "203.0.113.25" },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Audit Trail</CardTitle>
                    <p className="text-muted-foreground">Loading audit logs...</p>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-headline text-2xl">Audit Trail</CardTitle>
                        <p className="text-muted-foreground">A detailed log of all activities.</p>
                    </div>
                     <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search logs..." className="pl-8 w-full" />
                        </div>
                        <DatePickerWithRange />
                        <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User/Entity</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>IP Address</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{log.timestamp}</TableCell>
                                <TableCell className="font-medium">{log.user}</TableCell>
                                <TableCell><span className="font-mono text-xs">{log.action}</span></TableCell>
                                <TableCell>{log.details}</TableCell>
                                <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
