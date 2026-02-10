"use client";

import { Users, Wallet, Calendar, TrendingUp } from "lucide-react";

import { getStudents } from "../actions/studentActions";
import { getTransactions } from "../actions/financeActions";
import { getLessons } from "../actions/calendarActions";
import { useEffect, useState } from "react";


interface DashboardViewProps {
    onViewChange: (view: "dashboard" | "students" | "finance" | "reports" | "schedule" | "recital" | "library") => void;
}

export default function DashboardView({ onViewChange }: DashboardViewProps) {
    const [stats, setStats] = useState({
        studentCount: 0,
        monthlyIncome: 0,
        todayLessonsCount: 0
    });
    const [todaysLessons, setTodaysLessons] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const [studentData, transactions, events] = await Promise.all([
                getStudents(),
                getTransactions(),
                getLessons()
            ]);

            // Calculate Student Count
            const studentCount = studentData.length;

            // Calculate Monthly Income
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthlyIncome = transactions
                .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
                .reduce((sum, t) => sum + t.amount, 0);

            // Calculate Today's Lessons
            // Simple check if start date is today
            const todayStr = now.toISOString().split('T')[0];
            const todayEvents = events.filter(e => e.start.startsWith(todayStr));

            setStats({
                studentCount,
                monthlyIncome,
                todayLessonsCount: todayEvents.length
            });

            setTodaysLessons(todayEvents.map(e => {
                // Find matching student by name to get their color
                const matchingStudent = studentData.find(s => s.name === e.title);
                return {
                    name: e.title, // Assuming Title is Student Name for now
                    piece: e.description || "練習曲（未設定）",
                    time: new Date(e.start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                    color: matchingStudent?.color || "bg-pink-500"
                };
            }));
        };
        fetchData();
    }, []);

    const statItems = [
        { label: "生徒数", value: stats.studentCount.toString(), icon: Users, color: "text-pink-400" },
        { label: "今月の収入", value: `¥${stats.monthlyIncome.toLocaleString()}`, icon: Wallet, color: "text-emerald-400" },
        { label: "今日のレッスン", value: stats.todayLessonsCount.toString(), icon: Calendar, color: "text-pink-400" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <header>
                <h2 className="text-3xl font-bold text-gradient mb-2">ダッシュボード</h2>
                <p className="text-t-secondary">おかえりなさい！今日も素敵なレッスンを。</p>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statItems.map((stat, idx) => {
                    const Icon = stat.icon;
                    // Map stat colors to semantic variables if needed, or use inline styles mapped to theme
                    // Using accent for default pink-400, success for emerald-400
                    const iconColor = stat.color.includes("emerald") ? "text-success" : "text-accent";

                    return (
                        <div key={stat.label} className="glass-card p-5 flex items-center gap-4">
                            <div className="p-3 bg-accent-bg rounded-xl">
                                <Icon className={`w-6 h-6 ${iconColor}`} />
                            </div>
                            <div>
                                <p className="text-sm text-t-secondary">{stat.label}</p>
                                <p className="text-2xl font-bold text-t-primary">{stat.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* Today's Schedule */}
            <section>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-t-primary">
                    <Calendar className="w-5 h-5 text-accent" />
                    今日のレッスン
                </h3>
                <div className="glass-card divide-y divide-card-border">
                    <div className="glass-card divide-y divide-card-border">
                        {todaysLessons.length === 0 ? (
                            <div className="p-4 text-center text-t-muted">今日のレッスンはありません</div>
                        ) : (
                            todaysLessons.map((lesson, i) => (
                                <div key={i} className="p-4 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl ${lesson.color} flex items-center justify-center text-white font-bold text-lg`}>
                                        {lesson.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-t-primary">{lesson.name}</p>
                                        <p className="text-sm text-t-secondary">{lesson.piece}</p>
                                    </div>
                                    <span className="text-sm font-medium text-accent bg-accent-bg px-3 py-1 rounded-full">
                                        {lesson.time}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section>
                <h3 className="text-xl font-semibold mb-4">クイックアクション</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "生徒を追加", icon: Users, view: "students" },
                        { label: "収支を記録", icon: Wallet, view: "finance" },
                        { label: "予定を確認", icon: Calendar, view: "schedule" },
                        { label: "報告を作成", icon: TrendingUp, view: "reports" },
                    ].map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.label}
                                onClick={() => onViewChange(action.view as "students" | "finance" | "schedule" | "reports")}
                                className="glass-card p-4 flex flex-col items-center gap-2 hover:bg-accent-bg-hover transition-colors"
                            >
                                <Icon className="w-6 h-6 text-accent" />
                                <span className="text-sm font-medium text-t-secondary">{action.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
