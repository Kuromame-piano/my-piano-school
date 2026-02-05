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
    const [viewMode, setViewMode] = useState<ViewMode>("month");
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [saving, setSaving] = useState(false);
    const [lessonDuration, setLessonDuration] = useState(45);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

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
    const colors = ["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"];

    if (!mounted) return null;

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">スケジュール</h2>
                    <p className="text-slate-400">レッスンスケジュールを管理</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl">
                        <button onClick={() => setViewMode("month")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${viewMode === "month" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>
                            <Calendar className="w-4 h-4" />月
                        </button>
                        <button onClick={() => setViewMode("week")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${viewMode === "week" ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"}`}>
                            <CalendarDays className="w-4 h-4" />週
                        </button>
                    </div>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                        <Plus className="w-5 h-5" />レッスンを追加
                    </button>
                </div>
            </header>

            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-4 bg-slate-800/50 p-2 rounded-xl border border-slate-700 w-fit mx-auto">
                <button onClick={handlePrev} className="p-2 hover:bg-slate-700 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                <span className="font-bold text-lg min-w-[180px] text-center">
                    {viewMode === "month" ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
                </span>
                <button onClick={handleNext} className="p-2 hover:bg-slate-700 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
            </div>

            {/* Week View */}
            {viewMode === "week" && (
                <div className="grid grid-cols-7 gap-2">
                    {getWeekDays().map((day, i) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = day.toDateString() === new Date().toDateString();
                        return (
                            <div key={i} className={`glass-card p-3 min-h-[300px] ${isToday ? "ring-2 ring-violet-500/50" : ""}`}>
                                <div className="text-center mb-3 pb-2 border-b border-slate-800">
                                    <p className="text-sm text-slate-500">{dayNames[i]}</p>
                                    <p className={`text-xl font-bold ${isToday ? "text-violet-400" : ""}`}>{day.getDate()}</p>
                                </div>
                                <div className="space-y-2">
                                    {dayEvents.length === 0 ? (
                                        <p className="text-xs text-slate-600 text-center py-4">-</p>
                                    ) : (
                                        dayEvents.map((event, idx) => (
                                            <button key={event.id} onClick={() => setSelectedEvent(event)} className={`w-full text-left p-2 rounded-lg ${colors[idx % 5]}/20 border border-${colors[idx % 5].replace("bg-", "")}/30 hover:bg-slate-800/50 transition-colors`}>
                                                <p className="text-xs text-violet-400 mb-0.5">{formatTime(event.start)}</p>
                                                <p className="text-sm font-medium truncate">{event.title}</p>
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
                <div className="space-y-4">
                    {events.length === 0 ? (
                        <div className="glass-card p-12 text-center"><p className="text-slate-500">この月の予定はありません</p></div>
                    ) : (
                        <div className="space-y-3">
                            {events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map((event, index) => (
                                <button key={event.id} onClick={() => setSelectedEvent(event)} className="w-full glass-card p-5 flex gap-5 text-left hover:bg-slate-800/50 transition-all">
                                    <div className="flex flex-col items-center min-w-[60px]">
                                        <div className="text-sm text-slate-400">{new Date(event.start).toLocaleDateString("ja-JP", { weekday: "short" })}</div>
                                        <div className="text-xl font-bold text-slate-200">{new Date(event.start).getDate()}</div>
                                    </div>
                                    <div className="w-0.5 bg-slate-800 self-stretch mx-2" />
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="text-lg font-semibold">{event.title}</h4>
                                            <span className="text-sm font-medium text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">{formatTime(event.start)}</span>
                                        </div>
                                        {event.location && <p className="text-sm text-slate-400 flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.location}</p>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>

                        <h3 className="text-2xl font-bold text-gradient mb-6">{selectedEvent.title}</h3>

                        <div className="space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-violet-500/10 rounded-xl"><Clock className="w-5 h-5 text-violet-400" /></div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">日時</p>
                                    <p className="font-semibold">{new Date(selectedEvent.start).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "long" })}</p>
                                    <p className="text-slate-300">{formatTime(selectedEvent.start)} 〜 {formatTime(selectedEvent.end)}</p>
                                </div>
                            </div>

                            {selectedEvent.location && (
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-xl"><MapPin className="w-5 h-5 text-blue-400" /></div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">場所</p>
                                        <p className="font-medium text-slate-200">{selectedEvent.location}</p>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-xl"><AlignLeft className="w-5 h-5 text-emerald-400" /></div>
                                    <div>
                                        <p className="text-sm text-slate-400 mb-1">詳細</p>
                                        <p className="text-slate-300 whitespace-pre-wrap">{selectedEvent.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => openEditModal(selectedEvent)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-white flex items-center justify-center gap-2">
                                <Pencil className="w-4 h-4" />編集
                            </button>
                            <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl font-medium text-rose-300 flex items-center justify-center gap-2">
                                <Trash2 className="w-4 h-4" />削除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Event Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingEvent(null); }} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => { setIsAddModalOpen(false); setEditingEvent(null); }} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingEvent ? "レッスンを編集" : "新規レッスン"}</h3>
                        <form onSubmit={handleSaveEvent} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">タイトル（生徒名など） <span className="text-red-400">*</span></label>
                                <input name="title" list="student-names" required defaultValue={editingEvent?.title} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 山田花子" />
                                <datalist id="student-names">
                                    {students.map(s => <option key={s.id} value={s.name} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">レッスン時間</label>
                                <select value={lessonDuration} onChange={handleDurationChange} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                    <option value={30}>30分</option>
                                    <option value={45}>45分</option>
                                    <option value={60}>60分</option>
                                    <option value={90}>90分</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">開始日時 <span className="text-red-400">*</span></label>
                                    <input name="start" type="datetime-local" required value={startTime} onChange={handleStartTimeChange} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">終了日時 <span className="text-red-400">*</span></label>
                                    <input name="end" type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">場所</label>
                                <input name="location" defaultValue={editingEvent?.location} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 自宅スタジオ" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">メモ</label>
                                <textarea name="description" rows={3} defaultValue={editingEvent?.description} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="練習曲、注意点など..." />
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg disabled:opacity-50">
                                {saving ? "保存中..." : (editingEvent ? "更新する" : "作成する")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
