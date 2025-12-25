import { cn } from "@/lib/utils";

interface SkeletonTableProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export function SkeletonTable({
    rows = 5,
    columns = 4,
    className
}: SkeletonTableProps) {
    return (
        <div className={cn("w-full", className)}>
            <div className="rounded-md border">
                <div className="overflow-hidden">
                    {/* Header */}
                    <div className="border-b bg-muted/50">
                        <div className="flex items-center gap-4 p-4">
                            {Array.from({ length: columns }).map((_, i) => (
                                <div
                                    key={`header-${i}`}
                                    className="h-4 flex-1 animate-pulse rounded bg-muted-foreground/20"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    {Array.from({ length: rows }).map((_, rowIndex) => (
                        <div
                            key={`row-${rowIndex}`}
                            className="border-b last:border-0"
                        >
                            <div className="flex items-center gap-4 p-4">
                                {Array.from({ length: columns }).map((_, colIndex) => (
                                    <div
                                        key={`cell-${rowIndex}-${colIndex}`}
                                        className="h-4 flex-1 animate-pulse rounded bg-muted-foreground/10"
                                        style={{
                                            animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
