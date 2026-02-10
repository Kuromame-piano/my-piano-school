"use client";

import { Users, Wallet, Calendar, TrendingUp, ChevronLeft, ChevronRight, StickyNote, FileText, CalendarPlus } from "lucide-react";

import { getStudents, Student } from "../actions/studentActions";
import { getTransactions, getTuitionPayments, Transaction, TuitionPayment } from "../actions/financeActions";
import { getLessons, CalendarEvent } from "../actions/calendarActions";

import { useEffect, useState, useRef, useCallback } from "react";


import { NavigationPayload } from "@/app/page";

interface DashboardViewProps {
    onNavigate: (payload: NavigationPayload | "dashboard" | "students" | "finance" | "reports" | "schedule" | "recital" | "library") => void;
}

interface TodayLesson {
    name: string;
    piece: string;
    time: string;
    color: string;
    studentId?: number;
}

interface UnpaidStudent {
    id: number;
    name: string;
    amount: number;
}

interface Achievement {
    studentName: string;
    pieceTitle: string;
    date: string;
    studentId: number;
}

interface BirthdayStudent {
    name: string;
    date: string;
    day: number;
    age: number;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
    const [stats, setStats] = useState({
        studentCount: 0,
        monthlyIncome: 0,
        unpaidCount: 0
    });
    const [todaysLessons, setTodaysLessons] = useState<TodayLesson[]>([]);
    const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([]);
    const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayStudent[]>([]);

    const [selectedDate, setSelectedDate] = useState(new Date());

    // Cache student data for daily lesson lookups
    const studentsRef = useRef<Student[]>([]);

    // Effect 1: Static data – runs only on mount
    useEffect(() => {
        const fetchStaticData = async () => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const [studentData, transactions, tuitionPayments] = await Promise.all([
                getStudents(),
                getTransactions(),
                getTuitionPayments(currentYear, currentMonth + 1)
            ]);

            studentsRef.current = studentData;

            // 1. Calculate Stats
            const activeStudents = studentData.filter(s => !s.archived && s.status !== "休会");
            const studentCount = activeStudents.length;

            const monthlyIncome = transactions
                .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
                .reduce((sum, t) => sum + t.amount, 0);

            // 2. Unpaid Tuition Logic
            const paidStudentIds = tuitionPayments.filter(p => p.paid).map(p => p.studentId);

            const unpaidList = activeStudents
                .filter(s => s.paymentType === 'monthly' && !paidStudentIds.includes(s.id))
                .map(s => ({
                    id: s.id,
                    name: s.name,
                    amount: s.monthlyFee || 0
                }));

            setStats({
                studentCount,
                monthlyIncome,
                unpaidCount: unpaidList.length
            });
            setUnpaidStudents(unpaidList);

            // 4. Recent Achievements (Completed pieces in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const achievements: any[] = [];
            activeStudents.forEach(s => {
                s.pieces.forEach(p => {
                    if (p.status === 'completed' && p.completedAt) {
                        const completedDate = new Date(p.completedAt);
                        if (completedDate >= thirtyDaysAgo) {
                            achievements.push({
                                studentName: s.name,
                                pieceTitle: p.title,
                                date: completedDate.toLocaleDateString('ja-JP'),
                                studentId: s.id
                            });
                        }
                    }
                });
            });
            achievements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setRecentAchievements(achievements.slice(0, 5));

            // 5. Upcoming Birthdays (This month)
            const birthdays = activeStudents
                .filter(s => {
                    if (!s.birthDate) return false;
                    const birthDate = new Date(s.birthDate);
                    return birthDate.getMonth() === currentMonth;
                })
                .map(s => {
                    const birthDate = new Date(s.birthDate!);
                    return {
                        name: s.name,
                        date: `${birthDate.getMonth() + 1}/${birthDate.getDate()}`,
                        day: birthDate.getDate(),
                        age: currentYear - birthDate.getFullYear()
                    };
                })
                .sort((a, b) => a.day - b.day);

            setUpcomingBirthdays(birthdays);
        };
        fetchStaticData();
    }, []);

    // Effect 2: Daily lessons – runs only when selectedDate changes
    useEffect(() => {
        const fetchDailyLessons = async () => {
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const dayEvents = await getLessons(startOfDay.toISOString(), endOfDay.toISOString());
            const studentData = studentsRef.current;

            setTodaysLessons(dayEvents.map(e => {
                const matchingStudent = studentData.find(s => s.name === e.title);
                return {
                    name: e.title,
                    piece: e.description || "練習曲",
                    time: new Date(e.start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                    color: matchingStudent?.color || "bg-pink-500",
                    studentId: matchingStudent?.id
                };
            }));
        };
        fetchDailyLessons();
    }, [selectedDate]);

    const statItems = [
        { label: "生徒数", value: stats.studentCount.toString(), icon: Users, color: "text-pink-400", sub: "人" },
        { label: "今月の収入", value: `¥${stats.monthlyIncome.toLocaleString()}`, icon: Wallet, color: "text-emerald-400", sub: "" },
        { label: "未納月謝", value: stats.unpaidCount.toString(), icon: Users, color: stats.unpaidCount > 0 ? "text-red-400" : "text-gray-400", sub: "人" },
    ];

    const handlePrevDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    const handleToday = () => {
        setSelectedDate(new Date());
    };

    // Helper to format date for header
    const getFormattedDate = (date: Date) => {
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

        return {
            dateStr: date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }),
            weekday: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
            isToday
        };
    };

    const { dateStr, weekday, isToday } = getFormattedDate(selectedDate);

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-1">ダッシュボード</h2>
                    <p className="text-t-secondary">教室の状況を一目で確認できます</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-4xl font-bold text-t-primary">
                        {getFormattedDate(new Date()).dateStr}
                        <span className="text-lg text-t-secondary ml-2">
                            ({getFormattedDate(new Date()).weekday})
                        </span>
                    </p>
                </div>
            </header>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statItems.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="glass-card p-5 flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-opacity-10 ${stat.color.replace('text-', 'bg-')}`}>
                                <Icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm text-t-secondary">{stat.label}</p>
                                <p className="text-2xl font-bold text-t-primary">
                                    {stat.value}
                                    <span className="text-sm font-normal text-t-muted ml-1">{stat.sub}</span>
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Today's Schedule */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="glass-card h-full">
                        <div className="p-4 border-b border-card-border flex justify-between items-center">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-t-primary">
                                <Calendar className="w-5 h-5 text-accent" />
                                {isToday ? "今日のレッスン" : `${selectedDate.getMonth() + 1}/${selectedDate.getDate()}(${weekday})のレッスン`}
                            </h3>
                            <div className="flex items-center gap-2">
                                {/* Navigation */}
                                <div className="flex items-center bg-card-bg-hover rounded-lg p-1 gap-1">
                                    <button
                                        onClick={handlePrevDay}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-card-hover rounded-md text-t-secondary transition-colors"
                                        title="前日"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleToday}
                                        className="px-3 h-8 text-sm font-medium hover:bg-card-hover rounded-md text-t-primary transition-colors"
                                    >
                                        今日
                                    </button>
                                    <button
                                        onClick={handleNextDay}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-card-hover rounded-md text-t-secondary transition-colors"
                                        title="翌日"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => onNavigate("schedule")}
                                    className="text-sm text-accent hover:underline"
                                >
                                    全て見る
                                </button>
                            </div>
                        </div>
                        <div className="divide-y divide-card-border">
                            {todaysLessons.length === 0 ? (
                                <div className="p-8 text-center text-t-muted flex flex-col items-center gap-2">
                                    <Calendar className="w-8 h-8 opacity-20" />
                                    <p>レッスンはありません</p>
                                </div>
                            ) : (
                                todaysLessons.map((lesson, i) => (
                                    <div key={i} className="p-4 flex items-center gap-4 hover:bg-card-bg-hover transition-colors group">
                                        <div className="flex flex-col items-center min-w-[60px]">
                                            <span className="text-xl font-semibold text-t-primary leading-none">
                                                {lesson.time}
                                            </span>
                                        </div>
                                        <div className={`w-10 h-10 rounded-full ${lesson.color} flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
                                            {lesson.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-t-primary truncate">{lesson.name}</p>
                                            <p className="text-sm text-t-secondary truncate">{lesson.piece}</p>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg tooltip-trigger transition-colors"
                                                title="生徒ノート"
                                                onClick={() => lesson.studentId && onNavigate({ view: "students", studentId: lesson.studentId, initialTab: "notes" })}
                                            >
                                                <StickyNote className="w-5 h-5" />
                                            </button>
                                            <button
                                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                title="レッスン報告"
                                                onClick={() => lesson.studentId && onNavigate({ view: "reports", studentId: lesson.studentId })}
                                            >
                                                <FileText className="w-5 h-5" />
                                            </button>
                                            <button
                                                className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                                title="次回予約"
                                                onClick={() => onNavigate({ view: "schedule", scheduleStudentName: lesson.name })}
                                            >
                                                <CalendarPlus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Widgets */}
                <div className="space-y-6">
                    {/* Unpaid Tuition Widget */}
                    <section className="glass-card">
                        <div className="p-4 border-b border-card-border flex justify-between items-center bg-red-500/5">
                            <h3 className="text-md font-semibold flex items-center gap-2 text-t-primary">
                                <Wallet className="w-4 h-4 text-red-400" />
                                未納の月謝
                                {unpaidStudents.length > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {unpaidStudents.length}
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={() => onNavigate("finance")}
                                className="text-sm text-t-secondary hover:text-t-primary"
                            >
                                管理
                            </button>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                            {unpaidStudents.length === 0 ? (
                                <div className="p-4 text-center text-sm text-t-muted">
                                    未納者はいません 🎉
                                </div>
                            ) : (
                                <div className="divide-y divide-card-border">
                                    {unpaidStudents.map((s) => (
                                        <div key={s.id} className="p-3 flex justify-between items-center hover:bg-card-bg-hover">
                                            <span className="text-sm font-medium text-t-primary">{s.name}</span>
                                            <span className="text-sm text-t-secondary">¥{s.amount?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Recent Achievements Widget */}
                    <section className="glass-card">
                        <div className="p-4 border-b border-card-border">
                            <h3 className="text-md font-semibold flex items-center gap-2 text-t-primary">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                最近の達成
                            </h3>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto">
                            {recentAchievements.length === 0 ? (
                                <div className="p-4 text-center text-sm text-t-muted">
                                    最近の達成はありません
                                </div>
                            ) : (
                                <div className="divide-y divide-card-border">
                                    {recentAchievements.map((item, i) => (
                                        <div key={i} className="p-3 hover:bg-card-bg-hover">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-bold text-t-primary">{item.studentName}</span>
                                                <span className="text-xs sm:text-sm text-t-muted">{item.date}</span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-t-secondary line-clamp-1">
                                                「{item.pieceTitle}」を仕上げました！
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Upcoming Birthdays Widget */}
                    <section className="glass-card">
                        <div className="p-4 border-b border-card-border">
                            <h3 className="text-md font-semibold flex items-center gap-2 text-t-primary">
                                <div className="i-lucide-cake w-4 h-4 text-pink-400" /> {/* Using generic icon logic if Cake not imported, but let's assume we can import it or use gift */}
                                今月のお誕生日 🎂
                            </h3>
                        </div>
                        <div className="max-h-[150px] overflow-y-auto">
                            {upcomingBirthdays.length === 0 ? (
                                <div className="p-4 text-center text-sm text-t-muted">
                                    今月のお誕生日はありません
                                </div>
                            ) : (
                                <div className="divide-y divide-card-border">
                                    {upcomingBirthdays.map((s, i) => (
                                        <div key={i} className="p-3 flex items-center justify-between hover:bg-card-bg-hover">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">🎉</span>
                                                <span className="text-sm font-medium text-t-primary">{s.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-xs sm:text-sm text-t-secondary">{s.date}</span>
                                                <span className="block text-xs sm:text-sm font-bold text-accent">{s.age}歳</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
