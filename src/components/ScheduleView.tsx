"use client";

import { useState, useEffect, useReducer } from "react";
import { Calendar, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Clock, AlignLeft, Plus, Pencil, Trash2, CalendarDays } from "lucide-react";

import { getLessons, createLesson, updateLesson, deleteLesson, CalendarEvent } from "../actions/calendarActions";
import { getStudents, Student } from "../actions/studentActions";
import { useToast } from "@/contexts/ToastContext";

type ViewMode = "month" | "week" | "summary";

// Form state management with useReducer
type LessonFormState = {
    titleMode: "student" | "trial" | "other";
    customTitle: string;
    lessonDuration: number;
    customDuration: number | "";
    showCustomDuration: boolean;
    lessonDate: string;
    startTime: string;
    endTime: string;
    saving: boolean;
    showMemo: boolean;
};

type LessonFormAction =
    | { type: "SET_TITLE_MODE"; mode: "student" | "trial" | "other" }
    | { type: "SET_CUSTOM_TITLE"; title: string }
    | { type: "SET_DURATION"; duration: number }
    | { type: "SET_CUSTOM_DURATION"; duration: number | "" }
    | { type: "SET_LESSON_DATE"; date: string }
    | { type: "SET_START_TIME"; time: string }
    | { type: "SET_END_TIME"; time: string }
    | { type: "TOGGLE_CUSTOM_DURATION"; show: boolean }
    | { type: "TOGGLE_MEMO"; show: boolean }
    | { type: "SET_SAVING"; saving: boolean }
    | { type: "RESET_FORM"; defaults?: Partial<LessonFormState> }
    | { type: "LOAD_EVENT"; event: CalendarEvent; students: Student[] };

const initialFormState: LessonFormState = {
    titleMode: "student",
    customTitle: "",
    lessonDuration: 45,
    customDuration: "",
    showCustomDuration: false,
    lessonDate: "",
    startTime: "",
    endTime: "",
    saving: false,
    showMemo: false,
};

function formatTimeFromDate(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function calculateEndTime(startTime: string, duration: number): string {
    if (!startTime) return "";
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + duration);
    return formatTimeFromDate(date);
}


// Custom Time Picker Component
const CustomTimePicker = ({ value, onChange, className = "" }: { value: string; onChange: (value: string) => void; className?: string }) => {
    // Determine initial values, default to empty if not set
    const [hStr, mStr] = value ? value.split(":") : ["", ""];

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const baseMinutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, ..., 55

    // Ensure the current minute value is available in options (e.g. for calculated end times like 09:43)
    const currentMinuteVal = mStr ? parseInt(mStr, 10) : NaN;
    const minutes = [...baseMinutes];
    if (!isNaN(currentMinuteVal) && !baseMinutes.includes(currentMinuteVal)) {
        minutes.push(currentMinuteVal);
        minutes.sort((a, b) => a - b);
    }

    const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newHour = e.target.value;
        const currentMinute = mStr || "00";
        onChange(`${newHour}:${currentMinute}`);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMinute = e.target.value;
        const currentHour = hStr || "09"; // Default hour if not set
        onChange(`${currentHour}:${newMinute}`);
    };

    return (
        <div className={`flex gap-1 ${className}`}>
            <div className="relative flex-1">
                <select
                    value={hStr}
                    onChange={handleHourChange}
                    className="w-full appearance-none px-1 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus text-center text-lg font-mono"
                >
                    <option value="" disabled>--</option>
                    {hours.map((h) => (
                        <option key={h} value={String(h).padStart(2, "0")}>
                            {String(h).padStart(2, "0")}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex items-center text-lg text-t-muted">:</div>
            <div className="relative flex-1">
                <select
                    value={mStr}
                    onChange={handleMinuteChange}
                    className="w-full appearance-none px-1 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus text-center text-lg font-mono"
                >
                    <option value="" disabled>--</option>
                    {minutes.map((m) => (
                        <option key={m} value={String(m).padStart(2, "0")}>
                            {String(m).padStart(2, "0")}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

// Custom Date Picker Component
const CustomDatePicker = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Initialize viewDate from value or today
    const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());

    useEffect(() => {
        if (isOpen && value) {
            setViewDate(new Date(value));
        }
    }, [isOpen, value]);

    const getDaysInMonth = (year: number, month: number) => {
        const date = new Date(year, month, 1);
        const days = [];

        // Previous month days
        const firstDay = date.getDay(); // 0 = Sunday
        const prevMonth = new Date(year, month, 0);
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonth.getDate() - i),
                currentMonth: false
            });
        }

        // Current month days
        const lastDay = new Date(year, month + 1, 0);
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({
                date: new Date(year, month, i),
                currentMonth: true
            });
        }

        // Next month days
        const remaining = 42 - days.length; // Ensure 6 rows for consistency
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                currentMonth: false
            });
        }
        return days;
    };

    const handleDateClick = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
        setIsOpen(false);
    };

    const days = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus text-lg text-left"
            >
                <span className={!value ? "text-t-muted" : ""}>
                    {value ? new Date(value).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }) : "日付を選択"}
                </span>
                <CalendarDays className="w-5 h-5 text-t-muted" />
            </button>

            {isOpen && (
                <div className="mt-2 w-full bg-card shadow-lg border border-card-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                            className="p-1 hover:bg-bg-secondary rounded-full"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-lg">
                            {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                            className="p-1 hover:bg-bg-secondary rounded-full"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {weekDays.map((d, i) => (
                            <div key={i} className={`text-xs font-bold ${i === 0 ? "text-danger" : i === 6 ? "text-accent" : "text-t-muted"}`}>
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, i) => {
                            const isSelected = value && day.date.toDateString() === new Date(value).toDateString();
                            const isToday = day.date.toDateString() === new Date().toDateString();
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleDateClick(day.date)}
                                    className={`
                                        h-10 w-full rounded-lg text-sm font-medium transition-colors
                                        ${day.currentMonth ? "text-t-primary" : "text-t-muted opacity-50"}
                                        ${isSelected ? "bg-accent text-white shadow-md" : isToday ? "bg-accent-bg text-accent" : "hover:bg-bg-secondary"}
                                    `}
                                >
                                    {day.date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

function lessonFormReducer(state: LessonFormState, action: LessonFormAction): LessonFormState {
    switch (action.type) {
        case "SET_TITLE_MODE":
            return { ...state, titleMode: action.mode, customTitle: "" };

        case "SET_CUSTOM_TITLE":
            return { ...state, customTitle: action.title };

        case "SET_DURATION": {
            const newState = { ...state, lessonDuration: action.duration };
            // Auto-calculate end time if start time is set
            if (state.startTime) {
                newState.endTime = calculateEndTime(state.startTime, action.duration);
            }
            return newState;
        }

        case "SET_CUSTOM_DURATION": {
            const newState = { ...state, customDuration: action.duration };
            // If valid number, update lessonDuration and auto-calculate end time
            if (typeof action.duration === "number" && action.duration > 0) {
                newState.lessonDuration = action.duration;
                if (state.startTime) {
                    newState.endTime = calculateEndTime(state.startTime, action.duration);
                }
            }
            return newState;
        }

        case "SET_LESSON_DATE":
            return { ...state, lessonDate: action.date };

        case "SET_START_TIME": {
            const newState = { ...state, startTime: action.time };
            // Auto-calculate end time based on duration
            if (action.time) {
                newState.endTime = calculateEndTime(action.time, state.lessonDuration);
            }
            return newState;
        }

        case "SET_END_TIME":
            return { ...state, endTime: action.time };

        case "TOGGLE_CUSTOM_DURATION":
            return {
                ...state,
                showCustomDuration: action.show,
                customDuration: action.show ? state.customDuration : "",
            };

        case "TOGGLE_MEMO":
            return { ...state, showMemo: action.show };

        case "SET_SAVING":
            return { ...state, saving: action.saving };

        case "RESET_FORM":
            return { ...initialFormState, ...action.defaults };

        case "LOAD_EVENT": {
            const { event, students } = action;
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);

            const eventDuration = Math.round(
                (endDate.getTime() - startDate.getTime()) / 60000
            );
            const standardDurations = [30, 45, 60, 90];
            const isCustomDuration = !standardDurations.includes(eventDuration);

            // Determine title mode
            let titleMode: "student" | "trial" | "other" = "student";
            let customTitle = "";

            if (event.title === "体験レッスン") {
                titleMode = "trial";
            } else if (students.some((s) => s.name === event.title)) {
                titleMode = "student";
            } else {
                titleMode = "other";
                customTitle = event.title;
            }

            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            const lessonDate = `${year}-${month}-${day}`;

            return {
                titleMode,
                customTitle,
                lessonDuration: eventDuration,
                customDuration: isCustomDuration ? eventDuration : "",
                showCustomDuration: isCustomDuration,
                lessonDate,
                startTime: formatTimeFromDate(startDate),
                endTime: formatTimeFromDate(endDate),
                saving: false,
                showMemo: !!event.description, // Open memo if description exists
            };
        }

        default:
            return state;
    }
}



import useSWR, { mutate } from "swr";

// ... imports

export default function ScheduleView({ initialStudentName }: { initialStudentName?: string } = {}) {
    const toast = useToast();
    const [mounted, setMounted] = useState(false);
    // Remove local state for events/students as they are now SWR driven
    // const [events, setEvents] = useState<CalendarEvent[]>([]); 
    // const [students, setStudents] = useState<Student[]>([]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
    const [presetStudentName, setPresetStudentName] = useState<string>("");
    const [isMiniCalendarOpen, setIsMiniCalendarOpen] = useState(false);

    // Consolidated form state with useReducer
    const [formState, dispatch] = useReducer(lessonFormReducer, initialFormState);

    // Form validation errors
    const [formErrors, setFormErrors] = useState<{
        title?: string;
        startTime?: string;
        endTime?: string;
        customDuration?: string;
    }>({});

    // SWR for Students
    const { data: students = [] } = useSWR(
        ['students'],
        getStudents
    );

    // Calculate date range for main view
    const getRange = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        let startDate: Date, endDate: Date;

        if (viewMode === "month" || viewMode === "summary") {
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0, 23, 59, 59);
        } else {
            const dayOfWeek = currentDate.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() + diff);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        }
        return { start: startDate.toISOString(), end: endDate.toISOString() };
    };

    const { start: startIso, end: endIso } = getRange();

    // SWR for Lessons (Main View)
    const { data: events = [], mutate: mutateEvents } = useSWR(
        ['lessons', startIso, endIso],
        () => getLessons(startIso, endIso)
    );

    // SWR for Mini Calendar (if needed separate, but usually main events cover it if in same month)
    // Actually, mini calendar often shows adjacent months. 
    // Optimization: If we just fetch a buffer around current view, we might not need separate fetch.
    // For now, let's keep the hook but maybe duplicate data fetching is okay as it's cached by SWR if keys match?
    // Keys won't match if ranges differ. 
    // Let's implement a separate SWR for mini calendar to ensure dots appear.

    const { start: miniStart, end: miniEnd } = (() => {
        const year = miniCalendarDate.getFullYear();
        const month = miniCalendarDate.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59);
        return { start: start.toISOString(), end: end.toISOString() };
    })();

    const { data: miniEvents = [] } = useSWR(
        ['lessons', miniStart, miniEnd],
        () => getLessons(miniStart, miniEnd)
    );

    // Merge events for display (simple dedupe)
    const allEvents = [...events, ...miniEvents].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);


    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync mini calendar with current date
    useEffect(() => {
        setMiniCalendarDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }, [currentDate]);

    // ... (handlePrev, handleNext, etc. remain same)

    const handlePrev = () => {
        if (viewMode === "month" || viewMode === "summary") {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        } else {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            setCurrentDate(newDate);
        }
    };

    const handleNext = () => {
        if (viewMode === "month" || viewMode === "summary") {
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

    // ... (Form validation remains same)
    const validateForm = (showToast: boolean = false): boolean => {
        const errors: typeof formErrors = {};
        // ... (validation logic same)
        if (formState.titleMode === "student") {
            const form = document.querySelector("form");
            const titleElement = form?.querySelector('[name="title"]') as HTMLSelectElement | HTMLInputElement;
            if (!titleElement?.value?.trim()) {
                errors.title = "生徒名を選択してください";
            }
        } else if (formState.titleMode === "other" && !formState.customTitle.trim()) {
            errors.title = "タイトルを入力してください";
        }

        if (!formState.lessonDate) errors.startTime = "レッスン日を入力してください";
        if (!formState.startTime) errors.startTime = "開始時刻を入力してください";
        if (!formState.endTime) errors.endTime = "終了時刻を入力してください";
        else if (formState.lessonDate && formState.startTime && formState.endTime) {
            const startDateTime = new Date(`${formState.lessonDate}T${formState.startTime}`);
            const endDateTime = new Date(`${formState.lessonDate}T${formState.endTime}`);
            if (endDateTime <= startDateTime) errors.endTime = "終了時刻は開始時刻より後に設定してください";
        }

        if (formState.showCustomDuration) {
            if (!formState.customDuration) errors.customDuration = "カスタム時間を入力してください";
            else if (typeof formState.customDuration === "number" && (formState.customDuration < 1 || formState.customDuration > 300))
                errors.customDuration = "カスタム時間は1〜300分の間で入力してください";
        }

        setFormErrors(errors);
        if (showToast && Object.keys(errors).length > 0) toast.error("入力内容に誤りがあります");
        return Object.keys(errors).length === 0;
    };

    const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validate form before submission
        if (!validateForm(true)) {
            return;
        }

        dispatch({ type: "SET_SAVING", saving: true });

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        // Construct start and end dates from separate fields
        const startDateTime = new Date(`${formState.lessonDate}T${formState.startTime}`);
        const endDateTime = new Date(`${formState.lessonDate}T${formState.endTime}`);

        // Handle smart location default
        const location = formData.get("location") as string;
        if (location && typeof window !== "undefined") {
            localStorage.setItem("lastLessonLocation", location);
        }

        const eventData = {
            title: formData.get("title") as string,
            start: startDateTime.toISOString(),
            end: endDateTime.toISOString(),
            location: location,
            description: formData.get("description") as string,
        };

        // Optimistic update
        const newEvent: CalendarEvent = {
            id: editingEvent ? editingEvent.id : `temp-${Date.now()}`,
            ...eventData
        };

        const updatedEvents = editingEvent
            ? events.map(e => e.id === editingEvent.id ? { ...e, ...eventData } : e)
            : [...events, newEvent];

        // Mutate local cache immediately
        mutateEvents(updatedEvents, false);

        setIsAddModalOpen(false);
        setEditingEvent(null);
        setSelectedEvent(null);
        setFormErrors({});
        dispatch({ type: "RESET_FORM" });

        try {
            let result;
            if (editingEvent) {
                result = await updateLesson({ id: editingEvent.id, ...eventData });
            } else {
                result = await createLesson(eventData);
            }

            if (result.success) {
                toast.success(editingEvent ? "レッスンを更新しました" : "レッスンを作成しました");

                if (typeof window !== "undefined") {
                    localStorage.setItem("lastLessonDuration", formState.lessonDuration.toString());
                }

                // Trigger revalidation to get real ID from server
                mutateEvents();
            } else {
                throw new Error(result.error as string);
            }
        } catch (error: any) {
            console.error("Failed to save lesson:", error);
            const errorMessage = error?.message || (editingEvent ? "レッスンの更新に失敗しました" : "レッスンの作成に失敗しました");
            toast.error(errorMessage);
            mutateEvents(); // Rollback
        } finally {
            dispatch({ type: "SET_SAVING", saving: false });
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("このレッスンを削除しますか？")) return;

        // Optimistic update
        const updatedEvents = events.filter(e => e.id !== eventId);
        mutateEvents(updatedEvents, false);
        setSelectedEvent(null);

        try {
            const result = await deleteLesson(eventId);

            if (result.success) {
                toast.success("レッスンを削除しました");
                mutateEvents(); // Revalidate
            } else {
                throw new Error(result.error as string);
            }
        } catch (error: any) {
            console.error("Failed to delete lesson:", error);
            const errorMessage = error?.message || "レッスンの削除に失敗しました";
            toast.error(errorMessage);
            mutateEvents(); // Rollback
        }
    };

    const openEditModal = (event: CalendarEvent) => {
        setEditingEvent(event);
        dispatch({ type: "LOAD_EVENT", event, students });
        setIsAddModalOpen(true);
        setSelectedEvent(null);
    };





    const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const numValue = value === "" ? "" : parseInt(value);
        dispatch({ type: "SET_CUSTOM_DURATION", duration: numValue });
    };

    const openAddModal = (studentName?: string, presetDate?: Date) => {
        setEditingEvent(null);
        setPresetStudentName(studentName || "");

        // Smart defaults based on current view and time
        const now = new Date();

        // Get last used duration
        const lastDuration = typeof window !== "undefined"
            ? parseInt(localStorage.getItem("lastLessonDuration") || "45")
            : 45;

        let lessonDate: string;
        let startTime: string;
        let endTime: string;

        if (presetDate) {
            // Use the preset date with a sensible default time
            const year = presetDate.getFullYear();
            const month = String(presetDate.getMonth() + 1).padStart(2, '0');
            const day = String(presetDate.getDate()).padStart(2, '0');
            lessonDate = `${year}-${month}-${day}`;
            startTime = "10:00";
            const endMinutes = lastDuration % 60;
            const endHoursTotal = 10 + Math.floor(lastDuration / 60);
            endTime = `${String(endHoursTotal).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        } else {
            // Round to next hour
            const nextHour = new Date(now);
            if (nextHour.getMinutes() > 0) {
                nextHour.setHours(nextHour.getHours() + 1);
            }
            nextHour.setMinutes(0);
            nextHour.setSeconds(0);

            const year = nextHour.getFullYear();
            const month = String(nextHour.getMonth() + 1).padStart(2, '0');
            const day = String(nextHour.getDate()).padStart(2, '0');
            lessonDate = `${year}-${month}-${day}`;

            const hours = String(nextHour.getHours()).padStart(2, '0');
            const minutes = String(nextHour.getMinutes()).padStart(2, '0');
            startTime = `${hours}:${minutes}`;

            const end = new Date(nextHour.getTime() + lastDuration * 60000);
            const endHours = String(end.getHours()).padStart(2, '0');
            const endMinutes = String(end.getMinutes()).padStart(2, '0');
            endTime = `${endHours}:${endMinutes}`;
        }

        dispatch({
            type: "RESET_FORM",
            defaults: {
                lessonDate,
                startTime,
                endTime,
                lessonDuration: lastDuration,
            },
        });

        setIsAddModalOpen(true);
    };

    // Handle initial student name preset
    useEffect(() => {
        if (initialStudentName && mounted && students.length > 0) {
            openAddModal(initialStudentName);
        }
    }, [initialStudentName, mounted, students.length]);

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
        return allEvents.filter(e => {
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
        if (viewMode === "month" || viewMode === "summary") {
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
            <div className="w-full lg:w-[220px] flex-shrink-0 space-y-4 lg:space-y-6">
                <div className="hidden lg:block">
                    <button onClick={() => openAddModal()} className="w-full flex items-center justify-center gap-2 px-4 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                        <Plus className="w-5 h-5" />
                        <span>作成</span>
                    </button>
                </div>

                {/* Mini Calendar - Desktop: always visible, Mobile: collapsible */}
                {/* Mobile toggle button */}
                <button
                    onClick={() => setIsMiniCalendarOpen(!isMiniCalendarOpen)}
                    className="lg:hidden w-full flex items-center justify-between px-4 py-3 glass-card text-sm font-medium text-t-primary"
                >
                    <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        {miniCalendarDate.getMonth() + 1}月 {miniCalendarDate.getFullYear()}
                    </span>
                    {isMiniCalendarOpen ? <ChevronUp className="w-4 h-4 text-t-secondary" /> : <ChevronDown className="w-4 h-4 text-t-secondary" />}
                </button>

                <div className={`${isMiniCalendarOpen ? "block" : "hidden"} lg:block`}>
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
                </div>

                {/* Mobile only: Add Button */}
                <div className="lg:hidden">
                    <button onClick={() => openAddModal()} className="w-full flex items-center justify-center gap-2 px-4 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all">
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
                            {(viewMode === "month" || viewMode === "summary") ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
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
                        <button onClick={() => setViewMode("summary")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${viewMode === "summary" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                            <AlignLeft className="w-4 h-4" />集計
                        </button>
                    </div>
                </header>

                <div className="flex-1 min-h-0">
                    {/* Week View */}
                    {viewMode === "week" && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-2 h-full overflow-y-auto">
                            {getWeekDays().map((day, i) => {
                                const dayEvents = getEventsForDay(day);
                                const isToday = day.toDateString() === new Date().toDateString();
                                return (
                                    <div key={i} onClick={() => openAddModal(undefined, day)} className={`glass-card p-2 sm:p-3 min-h-[150px] sm:min-h-[300px] cursor-pointer ${isToday ? "ring-2 ring-accent" : ""}`}>
                                        <div className="text-center mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-card-border relative">
                                            <p className="text-xs sm:text-sm text-t-secondary">{dayNames[i]}</p>
                                            <p className={`text-lg sm:text-xl font-bold ${isToday ? "text-accent" : "text-t-primary"}`}>{day.getDate()}</p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openAddModal(undefined, day); }}
                                                className="absolute top-0 right-0 p-1 text-t-muted hover:text-accent hover:bg-accent-bg rounded-md transition-colors"
                                                title="レッスンを追加"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-2">
                                            {dayEvents.map((event, idx) => (
                                                <button key={event.id} onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }} className={`w-full text-left p-1.5 sm:p-2 rounded-lg ${colors[idx % 5]}/20 border border-${colors[idx % 5].replace("bg-", "")}/30 hover:bg-accent-bg-hover transition-colors`}>
                                                    <p className="text-[10px] sm:text-xs text-accent mb-0.5">{formatTime(event.start)}</p>
                                                    <p className="text-xs sm:text-sm font-medium truncate text-t-primary">{event.title}</p>
                                                </button>
                                            ))}
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

                {/* Summary View */}
                {viewMode === "summary" && (
                    <div className="h-full overflow-y-auto pr-2">
                        <div className="glass-card p-6">
                            <h3 className="font-semibold text-lg mb-4 text-t-primary">レッスン実施状況 ({formatMonthYear(currentDate)})</h3>
                            {events.length === 0 ? (
                                <p className="text-center py-8 text-t-muted">レッスン記録がありません</p>
                            ) : (
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-card-border">
                                                <th className="py-3 px-4 font-medium text-t-secondary text-sm">生徒名</th>
                                                <th className="py-3 px-4 font-medium text-t-secondary text-sm">回数</th>
                                                <th className="py-3 px-4 font-medium text-t-secondary text-sm">実施日</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-card-border">
                                            {Object.entries(
                                                events.reduce((acc, event) => {
                                                    const name = event.title;
                                                    if (!acc[name]) acc[name] = [];
                                                    acc[name].push(new Date(event.start));
                                                    return acc;
                                                }, {} as Record<string, Date[]>)
                                            ).sort((a, b) => b[1].length - a[1].length).map(([name, dates]) => (
                                                <tr key={name} className="hover:bg-accent-bg-hover/50 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-t-primary">{name}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-accent-bg text-accent text-xs font-bold">{dates.length}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-t-secondary">
                                                        <div className="flex flex-wrap gap-2">
                                                            {dates.sort((a, b) => a.getTime() - b.getTime()).map((date, idx) => (
                                                                <span key={idx} className="bg-card-solid border border-card-border px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                                                    {date.getDate()}日({["日", "月", "火", "水", "木", "金", "土"][date.getDay()]})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>




            {/* Event Detail Modal */}
            {
                selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="fixed inset-0 bg-modal-overlay backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
                        <div className="relative z-10 w-full sm:max-w-md lg:max-w-lg bg-modal-bg border border-modal-border rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto safe-area-bottom shadow-xl">
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
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="fixed inset-0 bg-modal-overlay backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingEvent(null); }} />
                        <div className="relative z-10 w-full sm:max-w-lg lg:max-w-xl bg-modal-bg border border-modal-border rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto safe-area-bottom shadow-xl">
                            <button onClick={() => { setIsAddModalOpen(false); setEditingEvent(null); }} className="absolute top-6 right-6 p-2 text-t-muted hover:text-t-primary z-20"><X className="w-6 h-6" /></button>
                            <h3 className="text-2xl font-bold text-gradient mb-6">{editingEvent ? "レッスンを編集" : "新規レッスン"}</h3>
                            <form onSubmit={handleSaveEvent} className={`space-y-6 transition-opacity ${formState.saving ? "opacity-50" : "opacity-100"}`}>

                                {/* Section 1: Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-t-secondary mb-2">レッスン種別 <span className="text-danger">*</span></label>
                                        <div className="flex gap-2 p-1 bg-card-solid rounded-xl border border-card-border">
                                            <button
                                                type="button"
                                                disabled={formState.saving}
                                                onClick={() => dispatch({ type: "SET_TITLE_MODE", mode: "student" })}
                                                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${formState.titleMode === "student"
                                                    ? "bg-accent-bg text-accent shadow-sm"
                                                    : "text-t-secondary hover:bg-accent-bg-hover"
                                                    }`}
                                            >
                                                生徒名
                                            </button>
                                            <button
                                                type="button"
                                                disabled={formState.saving}
                                                onClick={() => dispatch({ type: "SET_TITLE_MODE", mode: "trial" })}
                                                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${formState.titleMode === "trial"
                                                    ? "bg-accent-bg text-accent shadow-sm"
                                                    : "text-t-secondary hover:bg-accent-bg-hover"
                                                    }`}
                                            >
                                                体験レッスン
                                            </button>
                                            <button
                                                type="button"
                                                disabled={formState.saving}
                                                onClick={() => dispatch({ type: "SET_TITLE_MODE", mode: "other" })}
                                                className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${formState.titleMode === "other"
                                                    ? "bg-accent-bg text-accent shadow-sm"
                                                    : "text-t-secondary hover:bg-accent-bg-hover"
                                                    }`}
                                            >
                                                その他
                                            </button>
                                        </div>
                                    </div>

                                    {formState.titleMode === "student" && (
                                        <div>
                                            <label className="block text-sm font-medium text-t-secondary mb-2">生徒名 <span className="text-danger">*</span></label>
                                            <select
                                                key={presetStudentName || "student-select"}
                                                name="title"
                                                required
                                                disabled={formState.saving}
                                                defaultValue={editingEvent?.title || presetStudentName || ""}
                                                onBlur={() => validateForm(false)}
                                                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus disabled:cursor-not-allowed appearance-none"
                                            >
                                                <option value="">生徒を選択してください</option>
                                                {students
                                                    .filter(s => !s.archived)
                                                    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
                                                    .map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                            {formErrors.title && (
                                                <p className="text-danger text-sm mt-1">{formErrors.title}</p>
                                            )}
                                        </div>
                                    )}

                                    {formState.titleMode === "trial" && (
                                        <input type="hidden" name="title" value="体験レッスン" />
                                    )}

                                    {formState.titleMode === "other" && (
                                        <div>
                                            <label className="block text-sm font-medium text-t-secondary mb-2">タイトル <span className="text-danger">*</span></label>
                                            <input
                                                name="title"
                                                required
                                                disabled={formState.saving}
                                                value={formState.customTitle}
                                                onChange={(e) => dispatch({ type: "SET_CUSTOM_TITLE", title: e.target.value })}
                                                onBlur={() => validateForm(false)}
                                                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus disabled:cursor-not-allowed"
                                                placeholder="例: 保護者面談"
                                            />
                                            {formErrors.title && (
                                                <p className="text-danger text-sm mt-1">{formErrors.title}</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-dashed border-card-border" />

                                {/* Section 2: Date & Time */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-t-secondary mb-2">レッスン日 <span className="text-danger">*</span></label>
                                        <CustomDatePicker
                                            value={formState.lessonDate}
                                            onChange={(date) => dispatch({ type: "SET_LESSON_DATE", date })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-t-secondary mb-2">時間設定 <span className="text-danger">*</span></label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {[30, 45, 60, 90].map((duration) => (
                                                <button
                                                    key={duration}
                                                    type="button"
                                                    onClick={() => {
                                                        dispatch({ type: "TOGGLE_CUSTOM_DURATION", show: false });
                                                        dispatch({ type: "SET_DURATION", duration });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${!formState.showCustomDuration && formState.lessonDuration === duration
                                                        ? "bg-accent-bg border-accent text-accent"
                                                        : "bg-card-solid border-card-border text-t-secondary hover:bg-accent-bg-hover"
                                                        }`}
                                                >
                                                    {duration}分
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => dispatch({ type: "TOGGLE_CUSTOM_DURATION", show: true })}
                                                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${formState.showCustomDuration
                                                    ? "bg-accent-bg border-accent text-accent"
                                                    : "bg-card-solid border-card-border text-t-secondary hover:bg-accent-bg-hover"
                                                    }`}
                                            >
                                                手動入力
                                            </button>
                                        </div>

                                        {formState.showCustomDuration && (
                                            <div className="mb-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="300"
                                                    className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus"
                                                    placeholder="分数を入力 (例: 75)"
                                                    value={formState.customDuration}
                                                    onChange={handleCustomDurationChange}
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3 items-center">
                                            <div>
                                                <CustomTimePicker
                                                    value={formState.startTime}
                                                    onChange={(time) => dispatch({ type: "SET_START_TIME", time })}
                                                />
                                            </div>
                                            <div className="flex items-center justify-center text-t-muted">〜</div>
                                            <div>
                                                <CustomTimePicker
                                                    value={formState.endTime}
                                                    onChange={(time) => dispatch({ type: "SET_END_TIME", time })}
                                                />
                                            </div>
                                        </div>
                                        {(formErrors.startTime || formErrors.endTime) && (
                                            <p className="text-danger text-sm mt-1">{formErrors.startTime || formErrors.endTime}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-card-border" />

                                {/* Section 3: Optional Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-t-secondary mb-2">場所（任意）</label>
                                        <input
                                            name="location"
                                            disabled={formState.saving}
                                            defaultValue={editingEvent?.location || (typeof window !== "undefined" ? localStorage.getItem("lastLessonLocation") || "" : "")}
                                            className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus disabled:cursor-not-allowed"
                                            placeholder="例: 自宅スタジオ"
                                        />
                                    </div>

                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => dispatch({ type: "TOGGLE_MEMO", show: !formState.showMemo })}
                                            className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                                        >
                                            {formState.showMemo ? "− メモを隠す" : "+ メモを追加"}
                                        </button>

                                        {formState.showMemo && (
                                            <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                                                <textarea
                                                    name="description"
                                                    rows={3}
                                                    disabled={formState.saving}
                                                    defaultValue={editingEvent?.description}
                                                    className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus disabled:cursor-not-allowed resize-none"
                                                    placeholder="練習曲、注意点など..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button type="submit" disabled={formState.saving} className="w-full py-3.5 premium-gradient rounded-xl font-bold text-white shadow-lg disabled:opacity-50 hover:shadow-xl hover:scale-[1.02] transition-all">
                                        {formState.saving ? (editingEvent ? "更新中..." : "作成中...") : (editingEvent ? "更新する" : "作成する")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
