import { AlertCircle, FileQuestion, Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon?: "inbox" | "alert" | "file" | React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    };
    className?: string;
}

const iconMap = {
    inbox: Inbox,
    alert: AlertCircle,
    file: FileQuestion,
};

export function EmptyState({
    icon = "inbox",
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    const IconComponent = typeof icon === "string" && icon in iconMap
        ? iconMap[icon as keyof typeof iconMap]
        : null;

    return (
        <div className={cn("flex flex-col items-center justify-center py-12 px-4", className)}>
            <div className="rounded-full bg-muted p-6 mb-4">
                {IconComponent ? (
                    <IconComponent className="h-12 w-12 text-muted-foreground" />
                ) : (
                    icon
                )}
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
            </h3>

            {description && (
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                    {description}
                </p>
            )}

            {action && (
                <Button onClick={action.onClick} size="sm">
                    {action.icon || <Plus className="mr-2 h-4 w-4" />}
                    {action.label}
                </Button>
            )}
        </div>
    );
}
