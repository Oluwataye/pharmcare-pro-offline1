
import { TrainingGuide } from "@/components/training/TrainingGuide";
import { BookOpen, GraduationCap, ShieldCheck, Zap } from "lucide-react";

const Training = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-2">
                    <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Master PharmCare Pro
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Everything you need to know about our new enterprise governance and financial management tools.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-3 transition-all hover:shadow-md">
                    <Zap className="h-8 w-8 text-amber-500 bg-amber-50 p-1.5 rounded-lg" />
                    <h3 className="font-bold">Quick Setup</h3>
                    <p className="text-sm text-muted-foreground">Get started with shift management and expense tracking in minutes.</p>
                </div>
                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-3 transition-all hover:shadow-md">
                    <ShieldCheck className="h-8 w-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-lg" />
                    <h3 className="font-bold">Accountability</h3>
                    <p className="text-sm text-muted-foreground">Learn about shift reconciliation and transaction audit logs.</p>
                </div>
                <div className="p-6 bg-card border rounded-xl shadow-sm space-y-3 transition-all hover:shadow-md">
                    <BookOpen className="h-8 w-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
                    <h3 className="font-bold">Financials</h3>
                    <p className="text-sm text-muted-foreground">Master the P&L reports and credit management for robust audits.</p>
                </div>
            </div>

            <TrainingGuide />

            <div className="text-center py-10 opacity-70">
                <p className="text-sm text-muted-foreground">
                    PharmCare Pro Offline Version 2.4 | Support: <span className="text-primary font-medium">support@pharmcare.local</span>
                </p>
            </div>
        </div>
    );
};

export default Training;
