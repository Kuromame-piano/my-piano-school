"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, User, ChevronLeft, ChevronRight, X, Clock, AlignLeft } from "lucide-react";

import { getLessons, CalendarEvent } from "../actions/calendarActions";

export default function ScheduleView() {
    const [mounted, setMounted] = useState(false);
    const [todaysLessons, setTodaysLessons] = useState<any[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

    const fetchEvents = async () => {
        // Calculate start and end of the current month view
        // Actually, let's just fetch the current month.
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        // Fetch a bit more padding for safety if needed, but strict month is fine for now
        const events = await getLessons(startOfMonth.toISOString(), endOfMonth.toISOString());

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Filter text logic
        const todayItems = events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate >= startOfToday && eventDate < endOfToday;
        });

        const futureItems = events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate >= now; // Just show future events from the fetched batch
        });

        // Map Today's events
        setTodaysLessons(todayItems.map((e, index) => ({
            id: e.id,
            title: e.title,
            start: e.start,
            end: e.end,
            time: new Date(e.start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            endTime: new Date(e.end).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            location: e.location || "場所未定",
            piece: e.description || "",
            description: e.description || "",
            color: ["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"][index % 5]
        })));

        // Map Future events (Upcoming in this month)
        setUpcomingEvents(futureItems.map(e => ({
            id: e.id,
            day: new Date(e.start).toLocaleDateString('ja-JP', { weekday: 'long' }),
            date: new Date(e.start).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' }),
            title: e.title,
            time: new Date(e.start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            location: e.location,
            description: e.description
        })));
    };

    useEffect(() => {
        setMounted(true);
        fetchEvents();
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    };

    if (!mounted) return null;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">スケジュール</h2>
                    <p className="text-slate-400">レッスンスケジュールを確認</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-xl border border-slate-700">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-700 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                    <span className="font-bold text-lg min-w-[120px] text-center">{formatMonthYear(currentDate)}</span>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-700 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2"><Calendar className="w-5 h-5 text-violet-400" />{formatMonthYear(currentDate)}のレッスン</h3>
                    {upcomingEvents.length === 0 && todaysLessons.length === 0 ? (
                        <div className="glass-card p-12 text-center"><p className="text-slate-500">この月の予定はありません</p></div>
                    ) : (
                        <div className="space-y-4">
                            {/* Combine logic to show sorted list or just reuse logic. For now, showing 'Upcoming' list as the main list for the month view is cleaner */}
                            {[...todaysLessons.filter(t => !upcomingEvents.find(u => u.id === t.id)), ...upcomingEvents]
                                .sort((a, b) => new Date(a.date || a.start).getTime() - new Date(b.date || b.start).getTime())
                                .map((item, index) => (
                                    <button key={item.id + index} onClick={() => setSelectedEvent(item)} className="w-full glass-card p-5 flex gap-5 text-left hover:bg-slate-800/50 transition-all select-none">
                                        <div className="flex flex-col items-center min-w-[60px]">
                                            <div className="text-sm text-slate-400">{item.day || new Date(item.start).toLocaleDateString('ja-JP', { weekday: 'short' })}</div>
                                            <div className="text-xl font-bold text-slate-200">{item.date?.split('月')[1] || new Date(item.start).getDate()}</div>
                                        </div>
                                        <div className="w-0.5 bg-slate-800 self-stretch mx-2" />

                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="text-lg font-semibold">{item.title}</h4>
                                                <span className="text-sm font-medium text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">{item.time}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                                {item.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{item.location}</span>}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <p className="text-sm text-slate-400 mb-3">Googleカレンダー連携</p>
                        <a
                            href="https://calendar.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium text-slate-300 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Calendar className="w-4 h-4" />
                            カレンダーを開く
                        </a>
                        <p className="text-xs text-slate-600 mt-3 text-center">※ Google Calendarを表示します</p>
                    </div>
                </div>
            </div>

            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>

                        <h3 className="text-2xl font-bold text-gradient mb-6">{selectedEvent.title}</h3>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-violet-500/10 rounded-xl"><Clock className="w-6 h-6 text-violet-400" /></div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">日時</p>
                                    <p className="font-semibold text-lg">{selectedEvent.date || new Date(selectedEvent.start).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
                                    <p className="text-slate-300">{selectedEvent.time} 〜 {selectedEvent.endTime}</p>
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-xl"><MapPin className="w-6 h-6 text-blue-400" /></div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">場所</p>
                                        <p className="font-medium text-slate-200">{selectedEvent.location}</p>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl"><AlignLeft className="w-6 h-6 text-emerald-400" /></div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">詳細</p>
                                        <p className="text-slate-300 whitespace-pre-wrap">{selectedEvent.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setSelectedEvent(null)} className="w-full mt-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-white transition-colors">閉じる</button>
                    </div>
                </div>
            )}
        </div>
    );
}
