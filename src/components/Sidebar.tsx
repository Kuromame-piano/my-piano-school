"use client";

import {
    LayoutDashboard,
    Users,
    Wallet,
    FileText,
    Calendar,
    Music,
    Mic2,
} from "lucide-react";

type View = "dashboard" | "students" | "finance" | "reports" | "schedule" | "recital";

interface SidebarProps {
    activeView: View;
    onViewChange: (view: View) => void;
}

const NAV_ITEMS = [
    { id: "dashboard" as View, label: "ダッシュボード", icon: LayoutDashboard },
    { id: "students" as View, label: "生徒管理", icon: Users },
    { id: "finance" as View, label: "月謝・経費", icon: Wallet },
    { id: "reports" as View, label: "レッスン報告", icon: FileText },
    { id: "schedule" as View, label: "スケジュール", icon: Calendar },
    { id: "recital" as View, label: "発表会", icon: Mic2 },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
    return (
        <aside className="w-64 h-screen border-r border-slate-800 bg-slate-950/50 p-6 flex flex-col shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
                <div className="p-2 premium-gradient rounded-xl">
                    <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg">Piano Manager</h1>
                    <p className="text-xs text-slate-500">レッスン管理システム</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-600 text-center">
                    Play On Music
                </p>
            </div>
        </aside>
    );
}
