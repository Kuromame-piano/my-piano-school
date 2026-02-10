"use client";

import { useState } from "react";
import { Menu, Music } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import DashboardView from "@/components/DashboardView";
import StudentsView from "@/components/StudentsView";
import FinanceView from "@/components/FinanceView";
import ReportsView from "@/components/ReportsView";
import ScheduleView from "@/components/ScheduleView";
import RecitalView from "@/components/RecitalView";
import SheetMusicView from "@/components/SheetMusicView";
import GlobalSearch from "@/components/GlobalSearch";

type View = "dashboard" | "students" | "finance" | "reports" | "schedule" | "recital" | "library";

export default function Home() {
    const [activeView, setActiveView] = useState<View>("dashboard");
    const [globalSearchStudentId, setGlobalSearchStudentId] = useState<number | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleSearchSelect = (studentId: number) => {
        setGlobalSearchStudentId(studentId);
        setActiveView("students");
    };

    const renderView = () => {
        switch (activeView) {
            case "dashboard":
                return <DashboardView onViewChange={setActiveView} />;
            case "students":
                return <StudentsView initialStudentId={globalSearchStudentId} />;
            case "finance":
                return <FinanceView />;
            case "reports":
                return <ReportsView />;
            case "schedule":
                return <ScheduleView />;
            case "recital":
                return <RecitalView />;
            case "library":
                return <SheetMusicView />;
            default:
                return <DashboardView onViewChange={setActiveView} />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                activeView={activeView}
                onViewChange={setActiveView}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <main className="flex-1 overflow-y-auto">
                {/* モバイル用ヘッダー */}
                <header className="lg:hidden sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-card-border px-4 py-3 flex items-center gap-3 shadow-sm">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-t-muted hover:text-accent hover:bg-accent-bg-hover rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 premium-gradient rounded-lg">
                            <Music className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-sm text-t-primary">Piano Manager</span>
                    </div>
                </header>

                {/* メインコンテンツ */}
                <div className="p-4 sm:p-6 lg:p-12">
                    <GlobalSearch onSelect={handleSearchSelect} />
                    <div className="max-w-6xl mx-auto">
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
}
