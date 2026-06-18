
import { TrainingGuide } from "@/components/training/TrainingGuide";
import { BookOpen, GraduationCap, ShieldCheck, Zap } from "lucide-react";

const Training = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 animate-in fade-in duration-500">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
                <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-1 shadow-sm">
                    <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Terminal Operational Training
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Understand your daily workflows, dashboard controls, button functions, and pharmacy standard operating procedures (SOPs).
                </p>
            </div>

            <TrainingGuide />

            <div className="text-center py-6 opacity-60">
                <p className="text-xs text-muted-foreground">
                    PharmCare Pro Offline System | Standard governance guidelines.
                </p>
            </div>
        </div>
    );
};

export default Training;
