"use client";

import { useState } from "react";
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
            <Sidebar activeView={activeView} onViewChange={setActiveView} />
            <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                <GlobalSearch onSelect={handleSearchSelect} />
                <div className="max-w-6xl mx-auto">
                    {renderView()}
                </div>
            </main>
        </div>
    );
}
