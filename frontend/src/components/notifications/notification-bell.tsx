'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/notification-context';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    const recentNotifications = notifications.slice(0, 5);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={markAllAsRead}
                        >
                            Mark all as read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {recentNotifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications
                    </div>
                ) : (
                    <>
                        {recentNotifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.read ? 'bg-accent/50' : ''
                                    }`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="flex items-start justify-between w-full gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium leading-none mb-1">
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                </p>
                            </DropdownMenuItem>
                        ))}

                        {notifications.length > 5 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="justify-center text-sm">
                                    View all notifications
                                </DropdownMenuItem>
                            </>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
