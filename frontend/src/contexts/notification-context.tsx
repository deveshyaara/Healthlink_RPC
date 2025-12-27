'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { Bell, Calendar, FileText, Pill, Activity } from 'lucide-react';

interface Notification {
    id: string;
    type: 'appointment' | 'prescription' | 'lab_result' | 'consent' | 'system';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    data?: any;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}

interface NotificationProviderProps {
    children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [socket, setSocket] = useState<any>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Initialize Socket.io connection
    useEffect(() => {
        // Check if socket.io-client is available
        if (typeof window === 'undefined') return;

        // For now, use mock notifications instead of actual Socket.io
        // TODO: Uncomment when socket.io-client is installed
        /*
        const socketIo = require('socket.io-client');
        const newSocket = socketIo(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
          auth: {
            token: localStorage.getItem('token'),
          },
        });
    
        newSocket.on('connect', () => {
          console.log('Connected to notification server');
        });
    
        newSocket.on('notification', (notification: Notification) => {
          handleNewNotification(notification);
        });
    
        setSocket(newSocket);
    
        return () => {
          newSocket.disconnect();
        };
        */

        // Mock notification for demonstration
        const mockInterval = setInterval(() => {
            const mockNotifications = [
                {
                    type: 'appointment',
                    title: 'Upcoming Appointment',
                    message: 'You have an appointment with Dr. Smith in 15 minutes',
                },
                {
                    type: 'lab_result',
                    title: 'Lab Results Available',
                    message: 'Your CBC test results are now available',
                },
                {
                    type: 'prescription',
                    title: 'New Prescription',
                    message: 'Dr. Johnson has prescribed new medication',
                },
            ];

            // Randomly send a mock notification every 30 seconds (for demo)
            if (Math.random() > 0.95) {
                const mock = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
                handleNewNotification({
                    id: Date.now().toString(),
                    type: mock.type as any,
                    title: mock.title,
                    message: mock.message,
                    timestamp: new Date().toISOString(),
                    read: false,
                });
            }
        }, 30000);

        return () => {
            clearInterval(mockInterval);
        };
    }, []);

    const handleNewNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        showToastNotification(notification);
    };

    const showToastNotification = (notification: Notification) => {
        const icons = {
            appointment: Calendar,
            prescription: Pill,
            lab_result: FileText,
            consent: Bell,
            system: Activity,
        };

        const Icon = icons[notification.type];

        toast(notification.title, {
            description: notification.message,
            icon: <Icon className="h-4 w-4" />,
            action: {
                label: 'View',
                onClick: () => {
                    // Handle navigation based on notification type
                    console.log('Navigate to:', notification.type);
                },
            },
        });
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                clearNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}
