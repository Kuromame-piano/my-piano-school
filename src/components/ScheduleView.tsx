"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, ChevronLeft, ChevronRight, X, Clock, AlignLeft, Plus, Pencil, Trash2, CalendarDays } from "lucide-react";

import { getLessons, createLesson, updateLesson, deleteLesson, CalendarEvent } from "../actions/calendarActions";
import { getStudents, Student } from "../actions/studentActions";

type ViewMode = "month" | "week";

export default function ScheduleView() {
    const [mounted, setMounted] = useState(false);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [saving, setSaving] = useState(false);
    const [lessonDuration, setLessonDuration] = useState(45);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());

    const fetchEvents = async () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        let startDate: Date, endDate: Date;

        if (viewMode === "month") {
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0, 23, 59, 59);
        } else {
            // Week view - get current week
            const dayOfWeek = currentDate.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday start
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() + diff);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        }

        const fetchedEvents = await getLessons(startDate.toISOString(), endDate.toISOString());
        setEvents(fetchedEvents);
    };

    useEffect(() => {
        setMounted(true);
        const loadData = async () => {
            await fetchEvents();
            const studentData = await getStudents();
            setStudents(studentData);
        };
        loadData();
    }, [currentDate, viewMode]);

    // Sync mini calendar with current date
    useEffect(() => {
        setMiniCalendarDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }, [currentDate]);

    // Fetch events for mini calendar month (for event count dots)
    useEffect(() => {
        const fetchMiniCalendarEvents = async () => {
            const year = miniCalendarDate.getFullYear();
            const month = miniCalendarDate.getMonth();
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            // Only fetch if different from current view
            if (viewMode === "month" &&
                currentDate.getFullYear() === year &&
                currentDate.getMonth() === month) {
                return; // Already have the data
            }

            if (viewMode === "week") {
                const weekStart = getWeekStart(currentDate);
                const weekEnd = getWeekEnd(currentDate);

                // Check if mini calendar month overlaps with current week
                if (startDate <= weekEnd && endDate >= weekStart) {
                    return; // Already have the data
                }
            }

            // Fetch mini calendar month events in background
            const miniEvents = await getLessons(startDate.toISOString(), endDate.toISOString());
            // Merge with existing events without duplicates
            setEvents(prev => {
                const existingIds = new Set(prev.map(e => e.id));
                const newEvents = miniEvents.filter(e => !existingIds.has(e.id));
                return [...prev, ...newEvents];
            });
        };

        if (mounted) {
            fetchMiniCalendarEvents();
        }
    }, [miniCalendarDate, mounted]);

    const handlePrev = () => {
        if (viewMode === "month") {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        } else {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            setCurrentDate(newDate);
        }
    };

    const handleNext = () => {
        if (viewMode === "month") {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        } else {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 7);
            setCurrentDate(newDate);
        }
    };

    const formatMonthYear = (date: Date) => date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

    const formatWeekRange = (date: Date) => {
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return `${monday.getMonth() + 1}/${monday.getDate()} 〜 ${sunday.getMonth() + 1}/${sunday.getDate()}`;
    };

    const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const eventData = {
            title: formData.get("title") as string,
            start: new Date(formData.get("start") as string).toISOString(),
            end: new Date(formData.get("end") as string).toISOString(),
            location: formData.get("location") as string,
            description: formData.get("description") as string,
        };

        if (editingEvent) {
            await updateLesson({ id: editingEvent.id, ...eventData });
        } else {
            await createLesson(eventData);
        }

        await fetchEvents();
        setIsAddModalOpen(false);
        setEditingEvent(null);
        setSelectedEvent(null);
        setSaving(false);
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("このレッスンを削除しますか？")) return;
        await deleteLesson(eventId);
        await fetchEvents();
        setSelectedEvent(null);
    };

    const openEditModal = (event: CalendarEvent) => {
        setEditingEvent(event);
        setStartTime(formatDateForInput(event.start));
        setEndTime(formatDateForInput(event.end));
        setIsAddModalOpen(true);
        setSelectedEvent(null);
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStartTime(newStart);
        if (newStart) {
            const startDate = new Date(newStart);
            const endDate = new Date(startDate.getTime() + lessonDuration * 60000);
            setEndTime(endDate.toISOString().slice(0, 16));
        }
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDuration = parseInt(e.target.value);
        setLessonDuration(newDuration);
        if (startTime) {
            const startDate = new Date(startTime);
            const endDate = new Date(startDate.getTime() + newDuration * 60000);
            setEndTime(endDate.toISOString().slice(0, 16));
        }
    };

    const openAddModal = () => {
        setEditingEvent(null);
        setStartTime(formatDateForInput());
        const now = new Date();
        now.setMinutes(0);
        const endDate = new Date(now.getTime() + lessonDuration * 60000);
        setEndTime(endDate.toISOString().slice(0, 16));
        setIsAddModalOpen(true);
    };

    // Generate week days for weekly view
    const getWeekDays = () => {
        const dayOfWeek = currentDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(currentDate);
        monday.setDate(currentDate.getDate() + diff);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const getEventsForDay = (date: Date) => {
        return events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.toDateString() === date.toDateString();
        }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    };

    const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

    const formatDateForInput = (isoString?: string) => {
        if (!isoString) {
            const now = new Date();
            now.setMinutes(0);
            now.setSeconds(0);
            return now.toISOString().slice(0, 16);
        }
        return new Date(isoString).toISOString().slice(0, 16);
    };

    const dayNames = ["月", "火", "水", "木", "金", "土", "日"];
    const colors = ["bg-accent", "bg-info", "bg-success", "bg-warning", "bg-violet-500"];

    // Mini calendar functions
    const getMiniCalendarDays = () => {
        const year = miniCalendarDate.getFullYear();
        const month = miniCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 月曜日始まりに調整
        const startDayOfWeek = firstDay.getDay();
        const adjustedStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

        const days = [];

        // 前月の日付で埋める
        for (let i = adjustedStart - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, isCurrentMonth: false });
        }

        // 今月の日付
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            days.push({ date, isCurrentMonth: true });
        }

        // 次月の日付で埋める（42日分になるまで）
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i);
            days.push({ date, isCurrentMonth: false });
        }

        return days;
    };

    const getWeekStart = (date: Date) => {
        const dayOfWeek = date.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const getWeekEnd = (date: Date) => {
        const weekStart = getWeekStart(date);
        const sunday = new Date(weekStart);
        sunday.setDate(weekStart.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return sunday;
    };

    const isDateInCurrentWeek = (date: Date) => {
        const weekStart = getWeekStart(currentDate);
        const weekEnd = getWeekEnd(currentDate);
        return date >= weekStart && date <= weekEnd;
    };

    const handleMiniCalendarClick = (date: Date) => {
        setCurrentDate(date);
        if (viewMode === "month") {
            setViewMode("week");
        }
    };

    const handleMiniCalendarPrev = () => {
        setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() - 1, 1));
    };

    const handleMiniCalendarNext = () => {
        setMiniCalendarDate(new Date(miniCalendarDate.getFullYear(), miniCalendarDate.getMonth() + 1, 1));
    };

    const getEventCountForDate = (date: Date) => {
        return events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.toDateString() === date.toDateString();
        }).length;
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {/* Sidebar (Mini Calendar & Controls) */}
            <div className="w-full lg:w-[220px] flex-shrink-0 space-y-6">
                <div className="hidden lg:block">
                    <button onClick={openAddModal} className="w-full flex items-center justify-center gap-2 px-4 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                        <Plus className="w-5 h-5" />
                        <span>作成</span>
                    </button>
                </div>

                {/* Mini Calendar */}
                <div className="glass-card p-1.5 w-full max-w-[220px] mx-auto lg:mx-0">
                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                        <button onClick={handleMiniCalendarPrev} className="p-0.5 hover:bg-accent-bg-hover rounded transition-colors">
                            <ChevronLeft className="w-2.5 h-2.5 text-t-secondary" />
                        </button>
                        <h3 className="font-semibold text-xs text-t-primary">
                            {miniCalendarDate.getMonth() + 1}月 {miniCalendarDate.getFullYear()}
                        </h3>
                        <button onClick={handleMiniCalendarNext} className="p-0.5 hover:bg-accent-bg-hover rounded transition-colors">
                            <ChevronRight className="w-2.5 h-2.5 text-t-secondary" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-px mb-0.5">
                        {["月", "火", "水", "木", "金", "土", "日"].map((day, i) => (
                            <div key={i} className="text-center text-[8px] font-medium text-t-muted">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px">
                        {getMiniCalendarDays().map((dayInfo, i) => {
                            const isToday = dayInfo.date.toDateString() === new Date().toDateString();
                            const isInCurrentWeek = isDateInCurrentWeek(dayInfo.date);
                            const eventCount = getEventCountForDate(dayInfo.date);

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleMiniCalendarClick(dayInfo.date)}
                                    className={`
                                        relative aspect-square flex items-center justify-center rounded-sm text-[8px] transition-all
                                        ${!dayInfo.isCurrentMonth ? "text-t-muted/50" : "text-t-primary"}
                                        ${isToday ? "bg-accent text-white font-bold hover:bg-accent-hover" : "hover:bg-accent-bg-hover"}
                                        ${isInCurrentWeek && !isToday ? "bg-accent-bg font-medium" : ""}
                                    `}
                                >
                                    {dayInfo.date.getDate()}
                                    {eventCount > 0 && !isToday && (
                                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-accent" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile only: Add Button */}
                <div className="lg:hidden">
                    <button onClick={openAddModal} className="w-full flex items-center justify-center gap-2 px-4 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all">
                        <Plus className="w-5 h-5" />
                        <span>レッスンを追加</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-card-border">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-t-primary">
                            {viewMode === "month" ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
                        </h2>
                        <div className="flex items-center bg-card-solid rounded-lg border border-card-border p-0.5">
                            <button onClick={handlePrev} className="p-1.5 hover:bg-accent-bg-hover rounded-md transition-colors"><ChevronLeft className="w-4 h-4 text-t-secondary" /></button>
                            <button onClick={handleNext} className="p-1.5 hover:bg-accent-bg-hover rounded-md transition-colors"><ChevronRight className="w-4 h-4 text-t-secondary" /></button>
                        </div>
                    </div>

                    <div className="flex gap-1 p-1 bg-card-solid rounded-xl border border-card-border">
                        <button onClick={() => setViewMode("month")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${viewMode === "month" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                            <Calendar className="w-4 h-4" />月
                        </button>
                        <button onClick={() => setViewMode("week")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${viewMode === "week" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                            <CalendarDays className="w-4 h-4" />週
                        </button>
                    </div>
                </header>

                <div className="flex-1 min-h-0">
                    {/* Week View */}
                    {viewMode === "week" && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 h-full overflow-y-auto">
                            {getWeekDays().map((day, i) => {
                                const dayEvents = getEventsForDay(day);
                                const isToday = day.toDateString() === new Date().toDateString();
                                return (
                                    <div key={i} className={`glass-card p-2 sm:p-3 min-h-[150px] sm:min-h-[300px] ${isToday ? "ring-2 ring-accent" : ""}`}>
                                        <div className="text-center mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-card-border">
                                            <p className="text-xs sm:text-sm text-t-secondary">{dayNames[i]}</p>
                                            <p className={`text-lg sm:text-xl font-bold ${isToday ? "text-accent" : "text-t-primary"}`}>{day.getDate()}</p>
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-2">
                                            {dayEvents.length === 0 ? (
                                                <p className="text-xs text-t-muted text-center py-2 sm:py-4">-</p>
                                            ) : (
                                                dayEvents.map((event, idx) => (
                                                    <button key={event.id} onClick={() => setSelectedEvent(event)} className={`w-full text-left p-1.5 sm:p-2 rounded-lg ${colors[idx % 5]}/20 border border-${colors[idx % 5].replace("bg-", "")}/30 hover:bg-accent-bg-hover transition-colors`}>
                                                        <p className="text-[10px] sm:text-xs text-accent mb-0.5">{formatTime(event.start)}</p>
                                                        <p className="text-xs sm:text-sm font-medium truncate text-t-primary">{event.title}</p>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Month View */}
                    {viewMode === "month" && (
                        <div className="h-full overflow-y-auto pr-2">
                            {events.length === 0 ? (
                                <div className="glass-card p-12 text-center h-[300px] flex items-center justify-center"><p className="text-t-muted">この月の予定はありません</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map((event, index) => (
                                        <button key={event.id} onClick={() => setSelectedEvent(event)} className="w-full glass-card p-4 flex gap-4 text-left hover:bg-accent-bg-hover transition-all items-center">
                                            <div className="flex flex-col items-center min-w-[50px]">
                                                <div className="text-xs text-t-secondary">{new Date(event.start).toLocaleDateString("ja-JP", { weekday: "short" })}</div>
                                                <div className="text-lg font-bold text-t-primary">{new Date(event.start).getDate()}</div>
                                            </div>
                                            <div className="w-0.5 h-10 bg-accent/20 mx-2" />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-4">
                                                    <h4 className="text-base font-semibold text-t-primary truncate">{event.title}</h4>
                                                    <span className="text-xs font-medium text-accent bg-accent-bg px-2 py-0.5 rounded-full whitespace-nowrap">{formatTime(event.start)}</span>
                                                </div>
                                                {event.location && <p className="text-xs text-t-secondary flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{event.location}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Content */}


            {/* Event Detail Modal */}
            {
                selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
                        <div className="absolute inset-0 bg-modal-overlay backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
                        <div className="relative z-10 w-full sm:max-w-md bg-modal-bg border border-modal-border rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 safe-area-bottom shadow-2xl">
                            <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 p-2 text-t-muted hover:text-t-primary"><X className="w-6 h-6" /></button>

                            <h3 className="text-2xl font-bold text-gradient mb-6">{selectedEvent.title}</h3>

                            <div className="space-y-5">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-accent-bg rounded-xl"><Clock className="w-5 h-5 text-accent" /></div>
                                    <div>
                                        <p className="text-sm text-t-secondary mb-1">日時</p>
                                        <p className="font-semibold text-t-primary">{new Date(selectedEvent.start).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "long" })}</p>
                                        <p className="text-t-primary">{formatTime(selectedEvent.start)} 〜 {formatTime(selectedEvent.end)}</p>
                                    </div>
                                </div>

                                {selectedEvent.location && (
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-info-bg rounded-xl"><MapPin className="w-5 h-5 text-info" /></div>
                                        <div>
                                            <p className="text-sm text-t-secondary mb-1">場所</p>
                                            <p className="font-medium text-t-primary">{selectedEvent.location}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.description && (
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-success-bg rounded-xl"><AlignLeft className="w-5 h-5 text-success" /></div>
                                        <div>
                                            <p className="text-sm text-t-secondary mb-1">詳細</p>
                                            <p className="text-t-primary whitespace-pre-wrap">{selectedEvent.description}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button onClick={() => openEditModal(selectedEvent)} className="flex-1 py-3 bg-card-solid hover:bg-accent-bg-hover border border-card-border rounded-xl font-medium text-t-primary flex items-center justify-center gap-2">
                                    <Pencil className="w-4 h-4" />編集
                                </button>
                                <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="flex-1 py-3 bg-danger-bg hover:bg-danger-bg/80 rounded-xl font-medium text-danger flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" />削除
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add/Edit Event Modal */}
            {
                isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-modal-overlay backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingEvent(null); }} />
                        <div className="relative z-10 w-full max-w-md bg-modal-bg border border-modal-border rounded-3xl p-8 shadow-2xl">
                            <button onClick={() => { setIsAddModalOpen(false); setEditingEvent(null); }} className="absolute top-6 right-6 p-2 text-t-muted hover:text-t-primary"><X className="w-6 h-6" /></button>
                            <h3 className="text-2xl font-bold text-gradient mb-6">{editingEvent ? "レッスンを編集" : "新規レッスン"}</h3>
                            <form onSubmit={handleSaveEvent} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-t-secondary mb-2">タイトル（生徒名など） <span className="text-danger">*</span></label>
                                    <input name="title" list="student-names" required defaultValue={editingEvent?.title} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="例: 山田花子" />
                                    <datalist id="student-names">
                                        {students.map(s => <option key={s.id} value={s.name} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-t-secondary mb-2">レッスン時間</label>
                                    <select value={lessonDuration} onChange={handleDurationChange} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus">
                                        <option value={30}>30分</option>
                                        <option value={45}>45分</option>
                                        <option value={60}>60分</option>
                                        <option value={90}>90分</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-t-secondary mb-2">開始日時 <span className="text-danger">*</span></label>
                                        <input name="start" type="datetime-local" required value={startTime} onChange={handleStartTimeChange} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-t-secondary mb-2">終了日時 <span className="text-danger">*</span></label>
                                        <input name="end" type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-t-secondary mb-2">場所</label>
                                    <input name="location" defaultValue={editingEvent?.location} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="例: 自宅スタジオ" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-t-secondary mb-2">メモ</label>
                                    <textarea name="description" rows={3} defaultValue={editingEvent?.description} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="練習曲、注意点など..." />
                                </div>
                                <button type="submit" disabled={saving} className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg disabled:opacity-50">
                                    {saving ? "保存中..." : (editingEvent ? "更新する" : "作成する")}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
