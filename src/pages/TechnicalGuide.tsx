
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Terminal, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TechnicalGuide = () => {
    const { toast } = useToast();

    const repairCommands = `# OFFLINE INFRASTRUCTURE HEALER
# Run these in your terminal if you experience issues

# 1. Restart MySQL Service
net stop MySQL80 && net start MySQL80

# 2. Check Backend Logs
cd server
tail -n 100 server_debug.log

# 3. Clear Local Storage Cache
(In Browser Console) -> localStorage.clear(); sessionStorage.clear();
`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(repairCommands);
        toast({
            title: "Commands Copied",
            description: "Troubleshooting commands copied to clipboard.",
        });
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8 animate-fade-in">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    Offline Technical Guide
                </h1>
                <p className="text-muted-foreground">
                    Infrastructure status and troubleshooting for the PharmCare Pro Offline terminal.
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="border-blue-200 bg-blue-50/30 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            System Architecture
                        </CardTitle>
                        <CardDescription>
                            Current runtime environment: <strong>Node.js + MySQL (Local)</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-card rounded border">
                                <p className="font-bold">Backend Port</p>
                                <p className="text-muted-foreground">80 (Nginx Proxy)</p>
                            </div>
                            <div className="p-3 bg-card rounded border">
                                <p className="font-bold">Database</p>
                                <p className="text-muted-foreground">MySQL 8.0</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-md overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white">
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5" />
                            Repair & Troubleshooting
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Common commands for maintaining the local terminal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="relative group">
                            <pre className="bg-slate-950 text-slate-50 p-6 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">
                                {repairCommands}
                            </pre>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-4 right-4"
                                onClick={copyToClipboard}
                            >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 bg-amber-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="h-5 w-5" />
                            Data Integrity Warning
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            This is an offline-first terminal. Ensure you use the <strong>Sync Indicator</strong> in the sidebar to monitor data flow when internet is available. Never manually modify the SQL database unless instructed by support.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TechnicalGuide;
