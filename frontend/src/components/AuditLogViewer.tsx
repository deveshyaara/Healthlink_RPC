"use client";

import { useEffect, useState } from "react";
import { auditApi, type AuditLog } from "@/lib/api-client";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { Activity, ChevronDown, ChevronRight, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AuditLogViewerProps {
    limit?: number;
    className?: string;
}

function getActionColor(action: string): string {
    if (action.includes("create")) return "text-green-600";
    if (action.includes("update")) return "text-blue-600";
    if (action.includes("delete") || action.includes("revoke")) return "text-red-600";
    if (action.includes("login") || action.includes("register")) return "text-purple-600";
    return "text-gray-600";
}

function getActionIcon(action: string): string {
    if (action.includes("create")) return "🆕";
    if (action.includes("update")) return "✏️";
    if (action.includes("delete") || action.includes("revoke")) return "🗑️";
    if (action.includes("login")) return "🔐";
    if (action.includes("register")) return "👤";
    return "📝";
}

function AuditLogEntry({ log }: { log: AuditLog }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-l-2 border-muted pl-4 pb-4 last:pb-0">
            <div className="flex items-start gap-3">
                <div className="mt-1 text-xl">{getActionIcon(log.action)}</div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("font-medium", getActionColor(log.action))}>
                            {log.action}
                        </p>
                        <Badge variant="outline" className="text-xs">
                            {log.user_id || "System"}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>

                        {log.ip_address && (
                            <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {log.ip_address}
                            </span>
                        )}
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? (
                                    <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        Hide Details
                                    </>
                                ) : (
                                    <>
                                        <ChevronRight className="h-3 w-3 mr-1" />
                                        Show Details
                                    </>
                                )}
                            </Button>

                            {expanded && (
                                <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AuditLogViewer({ limit = 20, className }: AuditLogViewerProps) {
    const { toast } = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [limit]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await auditApi.getAll({ limit }) || [];
            setLogs(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch audit logs";
            setError(errorMessage);

            toast({
                variant: "destructive",
                title: "Error Loading Audit Logs",
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <SkeletonTable rows={limit} columns={3} className={className} />;
    }

    if (error && logs.length === 0) {
        return (
            <EmptyState
                icon="alert"
                title="Audit Logs Unavailable"
                description="Audit logs could not be loaded. This feature may not be enabled on the backend."
                className={className}
            />
        );
    }

    if (logs.length === 0) {
        return (
            <EmptyState
                icon="inbox"
                title="No Audit Logs"
                description="No activity has been logged yet. Actions will appear here as they happen."
                className={className}
            />
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Audit Log</h3>
                <Badge variant="secondary" className="ml-auto">
                    {logs.length} {logs.length === 1 ? "entry" : "entries"}
                </Badge>
            </div>

            <div className="space-y-6">
                {logs.map((log) => (
                    <AuditLogEntry key={log.id} log={log} />
                ))}
            </div>
        </div>
    );
}
