'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Appointment {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    status: string;
    type?: string;
    patientName?: string;
    doctorName?: string;
    reason?: string;
}

interface AppointmentCalendarProps {
    appointments: Appointment[];
    onDateClick?: (date: Date) => void;
    onAppointmentClick?: (appointment: Appointment) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function AppointmentCalendar({
    appointments,
    onDateClick,
    onAppointmentClick
}: AppointmentCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Create calendar grid
    const calendarDays: (Date | null)[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarDays.push(new Date(year, month - 1, daysInPrevMonth - i));
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(year, month, i));
    }

    // Next month days
    const remainingDays = 42 - calendarDays.length; // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
        calendarDays.push(new Date(year, month + 1, i));
    }

    const getAppointmentsForDate = (date: Date | null) => {
        if (!date) return [];
        const dateStr = date.toISOString().split('T')[0];
        return appointments.filter(apt => {
            const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
            return aptDate === dateStr;
        });
    };

    const isToday = (date: Date | null) => {
        if (!date) return false;
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const isCurrentMonth = (date: Date | null) => {
        if (!date) return false;
        return date.getMonth() === month;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
            case 'scheduled':
                return 'bg-blue-500';
            case 'completed':
                return 'bg-green-500';
            case 'cancelled':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        {MONTHS[month]} {year}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleToday}>
                            Today
                        </Button>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {/* Day headers */}
                    {DAYS.map(day => (
                        <div
                            key={day}
                            className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-400"
                        >
                            {day}
                        </div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map((date, index) => {
                        const dayAppointments = getAppointmentsForDate(date);
                        const isTodayDate = isToday(date);
                        const isCurrentMonthDate = isCurrentMonth(date);

                        return (
                            <div
                                key={index}
                                className={`
                  bg-white dark:bg-gray-900 p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                  ${!isCurrentMonthDate && 'opacity-40'}
                `}
                                onClick={() => date && onDateClick?.(date)}
                            >
                                <div className={`
                  text-sm font-medium mb-1
                  ${isTodayDate && 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white'}
                  ${!isTodayDate && isCurrentMonthDate && 'text-gray-900 dark:text-gray-100'}
                  ${!isTodayDate && !isCurrentMonthDate && 'text-gray-400'}
                `}>
                                    {date?.getDate()}
                                </div>

                                {/* Appointments */}
                                <div className="space-y-1">
                                    {dayAppointments.slice(0, 2).map(apt => (
                                        <div
                                            key={apt.appointmentId}
                                            className={`text-xs p-1 rounded truncate ${getStatusColor(apt.status)} text-white cursor-pointer hover:opacity-80`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAppointmentClick?.(apt);
                                            }}
                                        >
                                            {new Date(apt.appointmentDate).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })} - {apt.patientName || apt.doctorName || apt.patientId?.slice(0, 8) || apt.doctorId?.slice(0, 8) || 'Appointment'}
                                        </div>
                                    ))}
                                    {dayAppointments.length > 2 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            +{dayAppointments.length - 2} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-blue-500" />
                        <span>Scheduled</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-green-500" />
                        <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-red-500" />
                        <span>Cancelled</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
