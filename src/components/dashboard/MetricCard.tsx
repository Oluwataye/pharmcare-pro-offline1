
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    description?: string;
    colorScheme?: "primary" | "success" | "danger" | "warning" | "info";
    className?: string;
}

export const MetricCard = ({
    title,
    value,
    icon: Icon,
    description,
    colorScheme = "primary",
    className,
}: MetricCardProps) => {
    const schemes = {
        primary: "border-blue-500/20 bg-blue-50/50 text-blue-700",
        success: "border-green-500/20 bg-green-50/50 text-green-700",
        danger: "border-red-500/20 bg-red-50/50 text-red-700",
        warning: "border-amber-500/20 bg-amber-50/50 text-amber-700",
        info: "border-indigo-500/20 bg-indigo-50/50 text-indigo-700",
    };

    const iconColors = {
        primary: "text-blue-500",
        success: "text-green-500",
        danger: "text-red-500",
        warning: "text-amber-500",
        info: "text-indigo-500",
    };

    return (
        <Card className={cn("overflow-hidden border shadow-sm transition-all hover:shadow-md", schemes[colorScheme], className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn("h-4 w-4", iconColors[colorScheme])} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="mt-1 text-xs text-muted-foreground opacity-80">{description}</p>
                )}
            </CardContent>
        </Card>
    );
};
