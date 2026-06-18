import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ShoppingCart,
    Package,
    Clock,
    FileText,
    Search,
    BookOpen,
    HelpCircle,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    ShieldAlert,
    Terminal,
    NairaSign,
    RefreshCw,
    Wallet,
    Info,
    Check,
    Coins,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- TRAINING GUIDE CONTENT DATA ---

interface ButtonDetail {
    label: string;
    icon: any;
    action: string;
    industryStandard: string;
}

interface GuideSection {
    id: string;
    title: string;
    description: string;
    roles: string[];
    icon: any;
    color: string;
    bg: string;
    details: {
        title: string;
        steps: string[];
    }[];
    buttons: ButtonDetail[];
    sop: {
        type: "info" | "warning" | "success";
        title: string;
        text: string;
    }[];
}

const guides: GuideSection[] = [
    {
        id: "sales",
        title: "Sales & Point of Sale (POS)",
        description: "Standard checkout procedures, payment split processing, and debtor transaction logging.",
        roles: ["CASHIER", "DISPENSER", "PHARMACIST", "ADMIN", "SUPER_ADMIN"],
        icon: ShoppingCart,
        color: "text-blue-500",
        bg: "bg-blue-50/50 dark:bg-blue-950/20",
        details: [
            {
                title: "Processing a New Sale",
                steps: [
                    "Search and Select: Use the POS search bar to select products. Search by name, brand, or SKU.",
                    "Quantity Verification: Adjust quantity based on prescription limits. Do not exceed stock levels.",
                    "Checkout Dialog: Click 'Proceed to Payment' to open the transaction sheet.",
                    "Complete & Print: Confirm payment method and print/save receipt."
                ]
            },
            {
                title: "Split Payments & Credit Transactions",
                steps: [
                    "Split Payment: Choose 'Split Payment' if a customer wants to pay partly with Cash and partly with Bank Transfer.",
                    "Pay Later (Debtor Credit): For registered account customers, click 'Pay Later' to log the transaction under credit balance. Always confirm identity."
                ]
            }
        ],
        buttons: [
            {
                label: "Pay Later",
                icon: Coins,
                action: "Logs the sale amount to the customer's credit account instead of requesting immediate payment.",
                industryStandard: "Restricted to vetted customers with established credit limits. Promotes customer loyalty while ensuring clear accounts receivable."
            },
            {
                label: "Split Payment",
                icon: Wallet,
                action: "Divides payment between multiple payment modes (e.g. Cash + Card or Cash + Bank Transfer).",
                industryStandard: "Prevents loss of sales due to transfer limits. Reduces reconciliation errors by mapping payment types accurately."
            },
            {
                label: "Refund / Approve Refund",
                icon: HelpCircle,
                action: "Initiates return flow. Admins must authorize the cash return to drawer.",
                industryStandard: "Strict double-entry audit check. All product returns must go back to inventory records before cash is disbursed."
            }
        ],
        sop: [
            {
                type: "info",
                title: "Double-Verification Rule",
                text: "Always read out the name, brand, dosage strength, and expiration date of the drug to the customer before finalizing payment."
            },
            {
                type: "warning",
                title: "Manual Discount Limit",
                text: "Manual overrides and custom price discounts are logged under user audit files. Do not apply discounts without supervisor consent."
            }
        ]
    },
    {
        id: "inventory",
        title: "Inventory & Batch Expiry Control",
        description: "Stock entries, Low-Stock alerts, Batch tracking, and Expiry management.",
        roles: ["PHARMACIST", "ADMIN", "SUPER_ADMIN"],
        icon: Package,
        color: "text-emerald-500",
        bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
        details: [
            {
                title: "Managing Inventory & Low Stock",
                steps: [
                    "Track Levels: The inventory page highlights current stock levels, low-stock warnings, and soon-to-expire drugs.",
                    "Alert System: Products below the set 'Low Stock Threshold' trigger warning badges in inventory lists."
                ]
            },
            {
                title: "Batch & Expiry Auditing",
                steps: [
                    "Batch Input: Every new inventory entry requires a batch number for tracking and audits.",
                    "First In, First Out (FIFO): Always position stock with closer expiry dates in front of shelves (FIFO methodology)."
                ]
            }
        ],
        buttons: [
            {
                label: "Add Product",
                icon: Package,
                action: "Opens the stock entry form. Requires product name, unit cost, selling price, low-stock threshold, batch, and expiry.",
                industryStandard: "Required for every batch received. Simplifies tracking for pharmacovigilance and recall procedures."
            },
            {
                label: "Adjust Stock",
                icon: RefreshCw,
                action: "Logs stock discrepancies (damage, count error, write-off) with reason code.",
                industryStandard: "Must specify audit justification. Stock shrinkage logs must be reviewed by the chief pharmacist monthly."
            }
        ],
        sop: [
            {
                type: "warning",
                title: "Expiry Monitoring",
                text: "Audit shelves monthly for drugs expiring within 90 days. Flag them in database adjustments and shelf stickers."
            },
            {
                type: "success",
                title: "Batch Segregation",
                text: "Never mix separate batches of the same drug in a single shelf container. Batch ID tracking ensures clear recall boundaries."
            }
        ]
    },
    {
        id: "shifts",
        title: "Shifts & Cash reconciliation",
        description: "Opening cash drawers, break management, and closing-shift reconciliations.",
        roles: ["CASHIER", "DISPENSER", "ADMIN", "SUPER_ADMIN"],
        icon: Clock,
        color: "text-amber-500",
        bg: "bg-amber-50/50 dark:bg-amber-950/20",
        details: [
            {
                title: "Starting and Ending Shifts",
                steps: [
                    "Clock In: Log in and enter physical cash in drawer. This sets your opening balance.",
                    "End Shift: At the end of the day, count physical cash in drawer, enter it, and submit the shift details."
                ]
            },
            {
                title: "Handling Cash Variances",
                steps: [
                    "System Calculation: System automatically compares sales record cash vs. physical cash counted.",
                    "Reconciliation Report: Any variance (positive or negative) is logged for the Admin to review."
                ]
            }
        ],
        buttons: [
            {
                label: "Start Shift",
                icon: Clock,
                action: "Initializes cashier duty session and prompts input for 'Opening Balance'.",
                industryStandard: "Secures drawer accountability. Cashiers must never inherit a drawer without checking current cash levels."
            },
            {
                label: "End Shift",
                icon: AlertCircle,
                action: "Stops active session, prompts for final counted cash in drawer.",
                industryStandard: "Enforces cash flow transparency. Drawer count must occur immediately upon shift completion."
            }
        ],
        sop: [
            {
                type: "warning",
                title: "Reconciliation Discrepancies",
                text: "Variances exceeding ₦1,000 must be escalated to the Admin immediately with logged explanation notes."
            }
        ]
    },
    {
        id: "governance",
        title: "Governance & Financial Control",
        description: "Offline database synchronizations, expense tracking, and transaction audit logs.",
        roles: ["ADMIN", "SUPER_ADMIN"],
        icon: FileText,
        color: "text-purple-500",
        bg: "bg-purple-50/50 dark:bg-purple-950/20",
        details: [
            {
                title: "Offline Sync Monitor",
                steps: [
                    "Sync Indicator: Located in the sidebar. Displays whether the local database has pending sync items to the cloud database.",
                    "Conflict Resolution: System automatically syncs database tables when internet connectivity is detected."
                ]
            },
            {
                title: "Profit & Loss (P&L) Audit",
                steps: [
                    "Financial Reports: View real-time calculations: Revenue - Cost of Goods Sold (COGS) - Expenses = Net Profit.",
                    "Audit Trails: Monitor user activity logs to detect unauthorized inventory edits or sales deletions."
                ]
            }
        ],
        buttons: [
            {
                label: "Sync Now",
                icon: RefreshCw,
                action: "Triggers immediate sync queue process to transfer local transactions to the cloud registry.",
                industryStandard: "Guarantees data redundancy and remote access. Must be executed at least once before server shutdown."
            },
            {
                label: "Log Expense",
                icon: Wallet,
                action: "Logs petty cash or bank expenses directly, automatically deducting from the store net profit.",
                industryStandard: "All cash deductions must be verified against receipts and logged under the correct expenditure categories."
            },
            {
                label: "Force End Shift",
                icon: ShieldAlert,
                action: "Admin-level override to close a staff member's shift if they forget to log out.",
                industryStandard: "Used to avoid shift overlaps. Automatically seals cash drawer data at the current time."
            }
        ],
        sop: [
            {
                type: "success",
                title: "Data Backup Security",
                text: "System performs local automatic backups on database shut down. Ensure the host machine is shut down properly."
            },
            {
                type: "info",
                title: "Audit Trail Audits",
                text: "Inspect transaction logs weekly to spot anomalies, refund approvals, and unauthorized price updates."
            }
        ]
    }
];

export const TrainingGuide = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("");

    // Normalizing role (defaults to CASHIER if missing)
    const userRole = useMemo(() => {
        return user?.role || "DISPENSER";
    }, [user]);

    const isAdmin = useMemo(() => {
        return userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    }, [userRole]);

    // Filter guides based on user role (Admin sees all, others see only specific ones)
    const filteredGuides = useMemo(() => {
        return guides.filter((g) => isAdmin || g.roles.includes(userRole));
    }, [userRole, isAdmin]);

    // Automatically set default active tab based on filtered guides
    useMemo(() => {
        if (filteredGuides.length > 0 && !activeTab) {
            setActiveTab(filteredGuides[0].id);
        }
    }, [filteredGuides, activeTab]);

    // Search filter across guides, details, and buttons
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const query = searchQuery.toLowerCase();

        return filteredGuides.filter((g) => {
            const matchTitle = g.title.toLowerCase().includes(query);
            const matchDesc = g.description.toLowerCase().includes(query);
            const matchDetails = g.details.some(
                (d) =>
                    d.title.toLowerCase().includes(query) ||
                    d.steps.some((s) => s.toLowerCase().includes(query))
            );
            const matchButtons = g.buttons.some(
                (b) =>
                    b.label.toLowerCase().includes(query) ||
                    b.action.toLowerCase().includes(query)
            );
            const matchSop = g.sop.some(
                (s) =>
                    s.title.toLowerCase().includes(query) ||
                    s.text.toLowerCase().includes(query)
            );
            return matchTitle || matchDesc || matchDetails || matchButtons || matchSop;
        });
    }, [searchQuery, filteredGuides]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Search and Header Section */}
            <div className="bg-card/50 backdrop-blur-md border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                    <h2 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2 text-primary">
                        <BookOpen className="h-5 w-5" />
                        Interactive Training Center
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {isAdmin
                            ? "Administrator View: All guides and operational controls visible."
                            : `Logged in as: ${userRole.replace("_", " ")}. Showing guides relevant to your workspace.`}
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search buttons, pages, SOPs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background/80"
                    />
                    {searchQuery && (
                        <Badge
                            variant="secondary"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-2 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                        >
                            Clear
                        </Badge>
                    )}
                </div>
            </div>

            {/* Render Search Results if query exists */}
            {searchResults !== null ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                            Search Results ({searchResults.length})
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                            Show All
                        </Button>
                    </div>

                    {searchResults.length === 0 ? (
                        <Card className="border-dashed py-12 text-center text-muted-foreground">
                            <HelpCircle className="h-10 w-10 mx-auto opacity-30 mb-2" />
                            <p className="font-medium">No instructional guides found matching "{searchQuery}"</p>
                            <p className="text-xs">Try searching for "POS", "expiry", "variance", or "reconcile".</p>
                        </Card>
                    ) : (
                        searchResults.map((guide) => (
                            <GuideCard key={guide.id} guide={guide} />
                        ))
                    )}
                </div>
            ) : (
                /* Tab layout for organized training */
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex justify-center md:justify-start overflow-x-auto pb-1">
                        <TabsList className="bg-muted/50 p-1 border rounded-lg h-auto flex flex-wrap gap-1">
                            {filteredGuides.map((guide) => {
                                const Icon = guide.icon;
                                return (
                                    <TabsTrigger
                                        key={guide.id}
                                        value={guide.id}
                                        className={cn(
                                            "gap-2 py-2 px-3 text-xs md:text-sm transition-all duration-300",
                                            "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {guide.title.split(" & ")[0]}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {filteredGuides.map((guide) => (
                        <TabsContent key={guide.id} value={guide.id} className="mt-0 outline-none space-y-6">
                            <GuideCard guide={guide} />
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
};

// --- SUB-COMPONENT FOR RENDERING SINGLE GUIDE DETAILS ---

interface GuideCardProps {
    guide: GuideSection;
}

const GuideCard = ({ guide }: GuideCardProps) => {
    const GuideIcon = guide.icon;

    return (
        <Card className="border shadow-md overflow-hidden bg-card transition-all hover:shadow-lg">
            {/* Header banner */}
            <div className={cn("p-6 flex items-start gap-4 border-b", guide.bg)}>
                <div className={cn("p-3 rounded-xl bg-background shadow-md border", guide.color)}>
                    <GuideIcon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                        <h3 className="text-xl font-bold tracking-tight text-foreground">{guide.title}</h3>
                        <Badge variant="outline" className="bg-background text-[10px]">
                            {guide.roles.map((r) => r.replace("_", " ")).join(" | ")}
                        </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">{guide.description}</p>
                </div>
            </div>

            <CardContent className="p-6 space-y-8">
                {/* Walkthrough section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {guide.details.map((detail, index) => (
                        <div key={index} className="space-y-3 p-4 bg-muted/20 border rounded-xl">
                            <h4 className="font-semibold text-sm flex items-center gap-2 border-b pb-2 text-foreground/90">
                                <span className="flex items-center justify-center h-5 w-5 text-[10px] font-bold rounded-full bg-primary/10 text-primary">
                                    {index + 1}
                                </span>
                                {detail.title}
                            </h4>
                            <ul className="space-y-3">
                                {detail.steps.map((step, sIdx) => {
                                    const [boldPart, rest] = step.split(": ");
                                    return (
                                        <li key={sIdx} className="flex gap-2 items-start text-xs leading-relaxed text-muted-foreground">
                                            <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0 text-primary" />
                                            <span>
                                                <strong className="text-foreground/85 font-medium">{boldPart}</strong>
                                                {rest ? `: ${rest}` : ""}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* SOP alerts */}
                {guide.sop.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <ShieldAlert className="h-4 w-4 text-primary" />
                            Standard Operating Procedures (SOP)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {guide.sop.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "p-4 rounded-xl border flex items-start gap-3",
                                        item.type === "info" && "bg-blue-50/30 border-blue-200/50 dark:bg-blue-950/10 dark:border-blue-900/30",
                                        item.type === "warning" && "bg-amber-50/30 border-amber-200/50 dark:bg-amber-950/10 dark:border-amber-900/30",
                                        item.type === "success" && "bg-green-50/30 border-green-200/50 dark:bg-green-950/10 dark:border-green-900/30"
                                    )}
                                >
                                    {item.type === "info" && <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />}
                                    {item.type === "warning" && <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />}
                                    {item.type === "success" && <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />}
                                    <div className="space-y-1">
                                        <h5 className="font-semibold text-xs text-foreground/90">{item.title}</h5>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Button reference section */}
                <div className="space-y-3 border-t pt-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Terminal className="h-4 w-4 text-primary" />
                        Button Reference Dictionary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {guide.buttons.map((btn, bIdx) => {
                            const BtnIcon = btn.icon;
                            return (
                                <div key={bIdx} className="bg-card border rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5 bg-muted/60">
                                                <BtnIcon className="h-3 w-3 text-primary" />
                                                {btn.label}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Action</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            <strong className="text-foreground/80 font-medium">Function:</strong> {btn.action}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-dashed bg-muted/10 rounded p-2 text-[10px] leading-relaxed text-muted-foreground">
                                        <span className="font-bold text-foreground/70 block uppercase tracking-wider text-[8px] mb-1">Industry Standard</span>
                                        {btn.industryStandard}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
