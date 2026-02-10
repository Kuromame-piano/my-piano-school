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

export type NavigationPayload = {
    view: View;
    studentId?: number;
    initialTab?: "active" | "completed" | "notes" | "progress" | "recital";
    scheduleStudentName?: string;
};

export default function Home() {
    const [viewState, setViewState] = useState<NavigationPayload>({ view: "dashboard" });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigate = (payload: NavigationPayload | View) => {
        if (typeof payload === "string") {
            setViewState({ view: payload });
        } else {
            setViewState(payload);
        }
    };

    const handleSearchSelect = (studentId: number) => {
        setViewState({ view: "students", studentId });
    };

    const renderView = () => {
        switch (viewState.view) {
            case "dashboard":
                return <DashboardView onNavigate={handleNavigate} />;
            case "students":
                return <StudentsView initialStudentId={viewState.studentId} initialTab={viewState.initialTab} />;
            case "finance":
                return <FinanceView />;
            case "reports":
                return <ReportsView initialStudentId={viewState.studentId} />;
            case "schedule":
                return <ScheduleView initialStudentName={viewState.scheduleStudentName} />;
            case "recital":
                return <RecitalView />;
            case "library":
                return <SheetMusicView />;
            default:
                return <DashboardView onNavigate={handleNavigate} />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                activeView={viewState.view}
                onViewChange={(view) => handleNavigate(view)}
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
                <div className="p-4 sm:p-6 md:p-8 lg:p-12 safe-area-bottom">
                    <GlobalSearch onSelect={handleSearchSelect} />
                    <div className="max-w-6xl mx-auto">
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
}
