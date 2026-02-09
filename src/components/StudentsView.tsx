"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Music,
    Phone,
    MapPin,
    Calendar,
    ChevronRight,
    X,
    Check,
    History,
    Pencil,
    Mail,
    User,
    FileText,
    Cake,
    Archive,
    ArchiveRestore,
    StickyNote,
    TrendingUp,
    Trash2,
    ImagePlus,
    Book,
    Trophy,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
    getStudents,
    saveStudent,
    archiveStudent,
    getLessonNotes,
    addLessonNote,
    deleteLessonNote,
    updateLessonNote,
    getStudentProgress,
    Student,
    RecitalRecord,
} from "../actions/studentActions";
import { getSheetMusic, SheetMusic } from "../actions/sheetMusicActions";

type DetailTab = "active" | "completed" | "notes" | "progress" | "recital";

interface StudentsViewProps {
    initialStudentId?: number | null;
}

export default function StudentsView({ initialStudentId }: StudentsViewProps = {}) {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        loadStudents();
    }, [showArchived]);

    useEffect(() => {
        if (initialStudentId && students.length > 0) {
            const student = students.find(s => s.id === initialStudentId);
            if (student) {
                setSelectedStudent(student);
                setActiveTab("active");
            }
        }
    }, [initialStudentId, students]);

    const loadStudents = async () => {
        setLoading(true);
        const [studentData, sheetMusicData] = await Promise.all([
            getStudents(showArchived),
            getSheetMusic()
        ]);
        setStudents(studentData);
        setSheetMusicLibrary(sheetMusicData);
        setLoading(false);
    };

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>("active");

    // Lesson notes
    const [lessonNotes, setLessonNotes] = useState<{ id: number; date: string; content: string; pieces?: string[] }[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
    const [noteSearchQuery, setNoteSearchQuery] = useState("");

    // Add piece modal
    const [isAddPieceModalOpen, setIsAddPieceModalOpen] = useState(false);
    const [addingPieceForStudentId, setAddingPieceForStudentId] = useState<number | null>(null);

    // Progress chart
    const [progressData, setProgressData] = useState<{ month: string; completedCount: number }[]>([]);

    // Recital
    const [isAddRecitalModalOpen, setIsAddRecitalModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit note
    const [editingNote, setEditingNote] = useState<{ id: number; date: string; content: string } | null>(null);

    // Sheet Music Library
    const [sheetMusicLibrary, setSheetMusicLibrary] = useState<SheetMusic[]>([]);
    const [useLibrary, setUseLibrary] = useState(false);

    const filteredStudents = students.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (selectedStudent && activeTab === "notes") {
            loadLessonNotes(selectedStudent.id);
        } else if (selectedStudent && activeTab === "progress") {
            loadProgressData(selectedStudent.id);
        }
    }, [selectedStudent, activeTab]);

    const loadLessonNotes = async (studentId: number) => {
        setLoadingNotes(true);
        const notes = await getLessonNotes(studentId);
        setLessonNotes(notes);
        setLoadingNotes(false);
    };

    const loadProgressData = async (studentId: number) => {
        const data = await getStudentProgress(studentId);
        setProgressData(data);
    };

    const handleUpdateProgress = async (studentId: number, pieceId: number, progress: number) => {
        const student = students.find((s) => s.id === studentId);
        if (!student) return;

        const updatedStudent = {
            ...student,
            pieces: student.pieces.map((p) => (p.id === pieceId ? { ...p, progress } : p)),
        };

        // UIを即座に更新
        setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));

        if (selectedStudent?.id === studentId) {
            setSelectedStudent(updatedStudent);
        }

        // データを保存
        await saveStudent(updatedStudent);
    };

    const handleCompletePiece = async (studentId: number, pieceId: number) => {
        const student = students.find((s) => s.id === studentId);
        if (!student) return;

        const today = new Date().toLocaleDateString("ja-JP");
        const updatedStudent = {
            ...student,
            pieces: student.pieces.map((p) =>
                p.id === pieceId ? { ...p, status: "completed" as const, progress: 100, completedAt: today } : p
            ),
        };

        // UIを即座に更新
        setStudents((prev) => prev.map((s) => (s.id === studentId ? updatedStudent : s)));

        if (selectedStudent?.id === studentId) {
            setSelectedStudent(updatedStudent);
        }

        // データを保存
        await saveStudent(updatedStudent);
    };

    const openAddPieceModal = (studentId: number) => {
        setAddingPieceForStudentId(studentId);
        setIsAddPieceModalOpen(true);
    };

    const handleAddPieceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!addingPieceForStudentId || isSaving) return;
        setIsSaving(true);

        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            let title = formData.get("title") as string;
            const coverImage = formData.get("coverImage") as string;
            const sheetMusicIdStr = formData.get("sheetMusicId") as string;

            let sheetMusicId: number | undefined;
            if (useLibrary && sheetMusicIdStr) {
                sheetMusicId = parseInt(sheetMusicIdStr);
                const selectedMusic = sheetMusicLibrary.find(m => m.id === sheetMusicId);
                if (selectedMusic) {
                    title = selectedMusic.title;
                }
            }

            const newPiece = {
                id: Date.now(),
                title,
                progress: 0,
                status: "active" as const,
                startedAt: new Date().toLocaleDateString("ja-JP"),
                coverImage: coverImage || undefined,
                sheetMusicId,
            };

            const student = students.find((s) => s.id === addingPieceForStudentId);
            if (student) {
                const updatedStudent = {
                    ...student,
                    pieces: [newPiece, ...student.pieces],
                };

                // UIを即座に更新
                setStudents((prev) => prev.map((s) => (s.id === addingPieceForStudentId ? updatedStudent : s)));

                if (selectedStudent?.id === addingPieceForStudentId) {
                    setSelectedStudent(updatedStudent);
                }

                // データを保存
                await saveStudent(updatedStudent);
            }

            setIsAddPieceModalOpen(false);
            setAddingPieceForStudentId(null);
            setUseLibrary(false);
            setIsSaving(false);  // surely reset saving state
        } catch (error) {
            console.error("Failed to add piece:", error);
            setIsSaving(false);
        }
    };

    const handleArchiveStudent = async (studentId: number, archive: boolean) => {
        await archiveStudent(studentId, archive);
        setSelectedStudent(null);
        await loadStudents();
    };

    const handleAddLessonNote = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedStudent || isSaving) return;
        setIsSaving(true);

        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);

            await addLessonNote(selectedStudent.id, {
                date: formData.get("date") as string,
                content: formData.get("content") as string,
                pieces: [],
            });

            await loadLessonNotes(selectedStudent.id);
            setIsAddNoteModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        if (!selectedStudent) return;
        if (!confirm("このノートを削除しますか？")) return;
        await deleteLessonNote(selectedStudent.id, noteId);
        await loadLessonNotes(selectedStudent.id);
    };

    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setIsAddModalOpen(true);
    };

    const handleUpdateNote = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedStudent || !editingNote || isSaving) return;
        setIsSaving(true);
        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            await updateLessonNote(
                selectedStudent.id,
                editingNote.id,
                formData.get("date") as string,
                formData.get("content") as string
            );
            await loadLessonNotes(selectedStudent.id);
            setEditingNote(null);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gradient mb-1 sm:mb-2">生徒管理</h2>
                        <p className="text-sm sm:text-base text-gray-500">生徒情報と練習中の曲を管理</p>
                    </div>
                    <button onClick={() => { setEditingStudent(null); setIsAddModalOpen(true); }} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm sm:text-base shrink-0">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden xs:inline">生徒を追加</span>
                        <span className="xs:hidden">追加</span>
                    </button>
                </div>
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${showArchived ? "bg-amber-500/20 border-amber-500/30 text-amber-600" : "bg-white border-pink-200 text-gray-600 hover:bg-pink-50"}`}
                >
                    <Archive className="w-4 h-4" />
                    {showArchived ? "アーカイブ中" : "アーカイブを表示"}
                </button>
            </header>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="生徒名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-pink-200 rounded-xl text-gray-700 placeholder:text-gray-400 focus:border-pink-400 shadow-sm" />
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">読み込み中...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map((student) => (
                        <button key={student.id} onClick={() => { setSelectedStudent(student); setActiveTab("active"); }} className={`glass-card p-5 text-left hover:bg-pink-50 transition-all group ${student.archived ? "opacity-60" : ""} ${student.status === "休会中" ? "border-amber-400" : ""} ${student.status === "退会" ? "border-rose-400" : ""}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-xl ${student.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>{student.name[0]}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-lg truncate">{student.name}</p>
                                        {student.gradeLevel && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">{student.gradeLevel}</span>}
                                        {student.status && student.status !== "継続中" && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${student.status === "休会中" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>{student.status}</span>
                                        )}
                                        {student.archived && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">アーカイブ</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1"><Calendar className="w-3.5 h-3.5" />{student.lessonDay}</p>
                                    <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5" />{student.address}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-pink-500" />
                            </div>
                            <div className="mt-4 pt-4 border-t border-pink-100">
                                <p className="text-xs text-gray-500 mb-2">練習中: {student.pieces.filter((p) => p.status === "active").length}曲</p>
                                <div className="flex gap-2 flex-wrap">
                                    {student.pieces.filter((p) => p.status === "active").slice(0, 2).map((piece) => (
                                        <span key={piece.id} className="text-xs px-2.5 py-1 bg-pink-100 text-pink-600 rounded-full">{piece.title.length > 12 ? piece.title.slice(0, 12) + "..." : piece.title}</span>
                                    ))}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
                    <div className="relative z-10 w-full sm:max-w-4xl bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl p-4 sm:p-8 max-h-[90vh] overflow-y-auto safe-area-bottom shadow-xl">
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 z-20 p-2 text-gray-400 hover:text-pink-500 bg-pink-50 rounded-full"><X className="w-5 h-5" /></button>

                        <div className="mb-6 sm:mb-8">
                            <div className="flex items-start gap-3 sm:gap-5 pr-10">
                                <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl ${selectedStudent.color} flex items-center justify-center text-white font-bold text-xl sm:text-3xl shadow-xl shrink-0`}>{selectedStudent.name[0]}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-xl sm:text-2xl font-bold">{selectedStudent.name}</h3>
                                        {selectedStudent.gradeLevel && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">{selectedStudent.gradeLevel}</span>}
                                        {selectedStudent.status && selectedStudent.status !== "継続中" && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedStudent.status === "休会中" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>{selectedStudent.status}</span>
                                        )}
                                        {selectedStudent.archived && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">アーカイブ</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 sm:mt-2 text-xs sm:text-sm">
                                        <p className="text-gray-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{selectedStudent.phone}</p>
                                        <p className="text-gray-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{selectedStudent.address}</p>
                                        {selectedStudent.email && <p className="text-gray-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{selectedStudent.email}</p>}
                                        {selectedStudent.birthDate && <p className="text-gray-500 flex items-center gap-1.5"><Cake className="w-3.5 h-3.5" />{selectedStudent.birthDate}</p>}
                                    </div>
                                    {(selectedStudent.parentName || selectedStudent.parentPhone) && (
                                        <div className="mt-1.5 text-xs sm:text-sm text-gray-500 flex items-center gap-1.5 border-t border-pink-100 pt-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            <span>保護者: {selectedStudent.parentName} {selectedStudent.parentPhone && `(${selectedStudent.parentPhone})`}</span>
                                        </div>
                                    )}
                                    {selectedStudent.memo && (
                                        <div className="mt-1.5 text-xs sm:text-sm text-gray-600 italic bg-pink-50 p-2 rounded-lg">
                                            <FileText className="w-3 h-3 inline mr-1" />
                                            {selectedStudent.memo}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => handleArchiveStudent(selectedStudent.id, !selectedStudent.archived)}
                                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedStudent.archived ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
                                >
                                    {selectedStudent.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{selectedStudent.archived ? "復元" : "アーカイブ"}</span>
                                </button>
                                <button onClick={() => openEditModal(selectedStudent)} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-pink-50 hover:bg-pink-100 text-gray-600 rounded-xl text-sm font-medium transition-colors">
                                    <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">編集</span>
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1.5 sm:gap-2 p-1 bg-pink-50 rounded-xl mb-4 sm:mb-6 overflow-x-auto no-scrollbar">
                            <button onClick={() => setActiveTab("active")} className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 ${activeTab === "active" ? "bg-pink-200 text-pink-700" : "text-gray-500 hover:text-pink-500"}`}><Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />練習中</button>
                            <button onClick={() => setActiveTab("completed")} className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 ${activeTab === "completed" ? "bg-emerald-100 text-emerald-600" : "text-gray-500 hover:text-emerald-500"}`}><History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />合格履歴</button>
                            <button onClick={() => setActiveTab("notes")} className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 ${activeTab === "notes" ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:text-blue-500"}`}><StickyNote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />ノート</button>
                            <button onClick={() => setActiveTab("progress")} className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 ${activeTab === "progress" ? "bg-pink-100 text-pink-600" : "text-gray-500 hover:text-pink-500"}`}><TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />上達</button>
                            <button onClick={() => setActiveTab("recital")} className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 ${activeTab === "recital" ? "bg-rose-100 text-rose-600" : "text-gray-500 hover:text-rose-500"}`}><Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />発表会</button>
                        </div>

                        {/* Tab Content */}
                        <div className="space-y-4 min-h-[300px] sm:min-h-[400px]">
                            {activeTab === "active" && (
                                <>
                                    <button onClick={() => openAddPieceModal(selectedStudent.id)} className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl text-slate-500 hover:text-violet-400 font-medium flex items-center justify-center gap-2"><Plus className="w-5 h-5" />新しい曲を追加</button>
                                    {selectedStudent.pieces.filter((p) => p.status === "active").length === 0 ? (
                                        <p className="text-center py-8 text-slate-600">練習中の曲はまだありません</p>
                                    ) : (
                                        selectedStudent.pieces.filter((p) => p.status === "active").map((piece) => (
                                            <div key={piece.id} className="glass-card p-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {piece.coverImage ? (
                                                            <img src={piece.coverImage} alt={piece.title} className="w-12 h-12 rounded-lg object-cover" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                                                                <Music className="w-6 h-6 text-slate-500" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h4 className="font-semibold text-lg">{piece.title}</h4>
                                                            <p className="text-sm text-slate-500">開始: {piece.startedAt}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleCompletePiece(selectedStudent.id, piece.id)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg font-medium text-sm transition-colors"><Check className="w-4 h-4" />合格！</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}

                            {activeTab === "completed" && (
                                selectedStudent.pieces.filter((p) => p.status === "completed").length === 0 ? (
                                    <p className="text-center py-12 text-slate-600">まだ合格した曲はありません</p>
                                ) : (
                                    selectedStudent.pieces.filter((p) => p.status === "completed").map((piece) => (
                                        <div key={piece.id} className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                            {piece.coverImage ? (
                                                <img src={piece.coverImage} alt={piece.title} className="w-12 h-12 rounded-lg object-cover" />
                                            ) : (
                                                <div className="p-2 bg-emerald-500/10 rounded-lg"><Music className="w-5 h-5 text-emerald-400" /></div>
                                            )}
                                            <div className="flex-1"><h4 className="font-medium text-emerald-100">{piece.title}</h4><p className="text-xs text-emerald-500/60">合格: {piece.completedAt}</p></div>
                                        </div>
                                    ))
                                )
                            )}

                            {activeTab === "notes" && (
                                <>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="日付や内容で検索..."
                                                value={noteSearchQuery}
                                                onChange={(e) => setNoteSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-pink-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400"
                                            />
                                        </div>
                                        <button onClick={() => setIsAddNoteModalOpen(true)} className="px-4 py-2.5 premium-gradient rounded-xl text-white font-medium flex items-center gap-2 whitespace-nowrap"><Plus className="w-4 h-4" />追加</button>
                                    </div>
                                    {loadingNotes ? (
                                        <p className="text-center py-8 text-gray-400">読み込み中...</p>
                                    ) : lessonNotes.filter(note =>
                                        note.date.includes(noteSearchQuery) ||
                                        note.content.toLowerCase().includes(noteSearchQuery.toLowerCase())
                                    ).length === 0 ? (
                                        <p className="text-center py-8 text-gray-400">{noteSearchQuery ? "検索結果がありません" : "レッスンノートはまだありません"}</p>
                                    ) : (
                                        lessonNotes
                                            .filter(note =>
                                                note.date.includes(noteSearchQuery) ||
                                                note.content.toLowerCase().includes(noteSearchQuery.toLowerCase())
                                            )
                                            .map((note) => (
                                                <div key={note.id} className="glass-card p-5 group">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <p className="text-sm text-blue-500 font-medium">{note.date}</p>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => setEditingNote({ id: note.id, date: note.date, content: note.content })} className="p-1.5 hover:bg-blue-100 rounded-lg"><Pencil className="w-4 h-4 text-blue-600" /></button>
                                                            <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                                                </div>
                                            ))
                                    )}
                                </>
                            )}

                            {activeTab === "progress" && (
                                <div className="glass-card p-6">
                                    <h4 className="font-semibold text-lg mb-4">合格曲数の推移</h4>
                                    {progressData.length === 0 || progressData.every((d) => d.completedCount === 0) ? (
                                        <p className="text-center py-12 text-slate-600">まだデータがありません</p>
                                    ) : (
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={progressData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                                                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }} labelStyle={{ color: "#f8fafc" }} />
                                                    <Line type="monotone" dataKey="completedCount" name="合格曲数" stroke="#ec4899" strokeWidth={2} dot={{ fill: "#ec4899" }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            )}



                            {activeTab === "recital" && (
                                <>
                                    <button onClick={() => setIsAddRecitalModalOpen(true)} className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-rose-500/50 rounded-xl text-slate-500 hover:text-rose-400 font-medium flex items-center justify-center gap-2"><Plus className="w-5 h-5" />発表会履歴を追加</button>
                                    {(!selectedStudent.recitalHistory || selectedStudent.recitalHistory.length === 0) ? (
                                        <p className="text-center py-8 text-slate-600">発表会履歴はまだありません</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {selectedStudent.recitalHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                                                <div key={record.id} className="glass-card p-5">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                                                <Trophy className="w-5 h-5 text-rose-400" />
                                                                {record.eventName || "(未設定)"}
                                                            </h4>
                                                            <p className="text-sm text-slate-500">{record.date}</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2 text-sm">
                                                        <p className="text-slate-300"><span className="text-slate-500">演奏曲:</span> {record.piece || "(未設定)"}</p>
                                                        {record.venue && <p className="text-gray-600"><span className="text-slate-500">会場:</span> {record.venue}</p>}
                                                        {record.memo && <p className="text-gray-600 italic">{record.memo}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-2xl bg-white border border-pink-200 rounded-3xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingStudent ? "生徒情報を編集" : "新規生徒の登録"}</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (isSaving) return;
                            setIsSaving(true);
                            try {
                                const form = e.target as HTMLFormElement;
                                const formData = new FormData(form);
                                const colors = ["bg-pink-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"];

                                const newStudentData: Student = {
                                    id: editingStudent ? editingStudent.id : Date.now(),
                                    name: formData.get("name") as string,
                                    phone: formData.get("phone") as string,
                                    email: formData.get("email") as string,
                                    address: formData.get("address") as string,
                                    lessonDay: formData.get("lessonDay") as string,
                                    birthDate: formData.get("birthDate") as string,
                                    parentName: formData.get("parentName") as string,
                                    parentPhone: formData.get("parentPhone") as string,
                                    memo: formData.get("memo") as string,
                                    gradeLevel: formData.get("gradeLevel") as string,
                                    status: formData.get("status") as string,
                                    color: editingStudent ? editingStudent.color : colors[Math.floor(Math.random() * colors.length)],
                                    pieces: editingStudent ? editingStudent.pieces : [],
                                    archived: editingStudent?.archived || false,
                                    recitalHistory: editingStudent?.recitalHistory || [],
                                };

                                await saveStudent(newStudentData);
                                await loadStudents();
                                if (selectedStudent?.id === newStudentData.id) setSelectedStudent(newStudentData);
                                setIsAddModalOpen(false);
                                setEditingStudent(null);
                            } finally {
                                setIsSaving(false);
                            }
                        }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-700 border-b border-pink-200 pb-2 mb-4">基本情報</h4>
                                    <div><label className="block text-sm font-medium text-gray-600 mb-2">お名前 <span className="text-red-500">*</span></label><input name="name" defaultValue={editingStudent?.name} required className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: 山田 花子" /></div>
                                    <div><label className="block text-sm font-medium text-gray-600 mb-2">電話番号</label><input name="phone" defaultValue={editingStudent?.phone} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: 090-1234-5678" /></div>
                                    <div><label className="block text-sm font-medium text-gray-600 mb-2">メールアドレス</label><input name="email" type="email" defaultValue={editingStudent?.email} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: example@email.com" /></div>
                                    <div><label className="block text-sm font-medium text-gray-600 mb-2">住所</label><input name="address" defaultValue={editingStudent?.address} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: 江東区清澄白河..." /></div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-700 border-b border-pink-200 pb-2 mb-4">詳細情報</h4>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">レッスン日時</label>
                                        <input name="lessonDay" defaultValue={editingStudent?.lessonDay} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: 毎週火曜 14:00" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">生年月日</label>
                                        <input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">学年</label>
                                        <select name="gradeLevel" defaultValue={editingStudent?.gradeLevel || ""} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400">
                                            <option value="">選択してください</option>
                                            <optgroup label="未就学">
                                                <option value="年少">年少</option>
                                                <option value="年中">年中</option>
                                                <option value="年長">年長</option>
                                            </optgroup>
                                            <optgroup label="小学生">
                                                <option value="小1">小学1年</option>
                                                <option value="小2">小学2年</option>
                                                <option value="小3">小学3年</option>
                                                <option value="小4">小学4年</option>
                                                <option value="小5">小学5年</option>
                                                <option value="小6">小学6年</option>
                                            </optgroup>
                                            <optgroup label="中学生">
                                                <option value="中1">中学1年</option>
                                                <option value="中2">中学2年</option>
                                                <option value="中3">中学3年</option>
                                            </optgroup>
                                            <optgroup label="高校生">
                                                <option value="高1">高校1年</option>
                                                <option value="高2">高校2年</option>
                                                <option value="高3">高校3年</option>
                                            </optgroup>
                                            <optgroup label="その他">
                                                <option value="大学生">大学生</option>
                                                <option value="社会人">社会人</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">ステータス</label>
                                        <select name="status" defaultValue={editingStudent?.status || "継続中"} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400">
                                            <option value="継続中">継続中</option>
                                            <option value="休会中">休会中</option>
                                            <option value="退会">退会</option>
                                        </select>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-600 mb-2">保護者氏名</label><input name="parentName" defaultValue={editingStudent?.parentName} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: 山田 太郎" /></div>
                                    <div><label className="block text-sm font-medium text-gray-600 mb-2">保護者電話番号</label><input name="parentPhone" defaultValue={editingStudent?.parentPhone} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: 090-0000-0000" /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">メモ (特記事項など)</label>
                                <textarea name="memo" defaultValue={editingStudent?.memo} rows={3} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700 focus:border-pink-400" placeholder="例: 発表会への参加希望、苦手な音階など" />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg hover:shadow-xl mt-6 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : (editingStudent ? "更新する" : "登録する")}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Note Modal */}
            {isAddNoteModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddNoteModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setIsAddNoteModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">レッスンノートを追加</h3>
                        <form onSubmit={handleAddLessonNote} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">日付</label>
                                <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">レッスン内容・メモ</label>
                                <textarea name="content" rows={5} required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="今日のレッスン内容、注意点、次回への課題など..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : "保存する"}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Note Modal */}
            {editingNote && selectedStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingNote(null)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setEditingNote(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">レッスンノートを編集</h3>
                        <form onSubmit={handleUpdateNote} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">日付</label>
                                <input name="date" type="date" defaultValue={editingNote.date} required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">レッスン内容・メモ</label>
                                <textarea name="content" rows={5} defaultValue={editingNote.content} required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="今日のレッスン内容、注意点、次回への課題など..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : "更新する"}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Piece Modal */}
            {isAddPieceModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsAddPieceModalOpen(false); setAddingPieceForStudentId(null); setUseLibrary(false); }} />
                    <div className="relative z-10 w-full max-w-md bg-white border border-pink-200 rounded-3xl p-8">
                        <button onClick={() => { setIsAddPieceModalOpen(false); setAddingPieceForStudentId(null); setUseLibrary(false); }} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">新しい曲を追加</h3>

                        {/* Toggle between library and manual input */}
                        <div className="flex gap-2 mb-5">
                            <button type="button" onClick={() => setUseLibrary(false)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!useLibrary ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>手動入力</button>
                            <button type="button" onClick={() => setUseLibrary(true)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${useLibrary ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>ライブラリから選択</button>
                        </div>

                        <form onSubmit={handleAddPieceSubmit} className="space-y-5">
                            {useLibrary ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">楽譜を選択 <span className="text-red-500">*</span></label>
                                    <select name="sheetMusicId" required className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700">
                                        <option value="">選択してください</option>
                                        {sheetMusicLibrary.map((music) => (
                                            <option key={music.id} value={music.id}>
                                                {music.title} {music.composer ? `- ${music.composer}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                    <input type="hidden" name="title" value="__FROM_LIBRARY__" />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">曲名 <span className="text-red-500">*</span></label>
                                        <input name="title" required className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700" placeholder="例: エリーゼのために" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">カバー画像URL（任意）</label>
                                        <input name="coverImage" type="url" className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700" placeholder="https://..." />
                                    </div>
                                </>
                            )}
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : "追加する"}</button>
                        </form>
                    </div>
                </div>
            )}



            {/* Add Recital Modal */}
            {isAddRecitalModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddRecitalModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setIsAddRecitalModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">発表会履歴を追加</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!selectedStudent || isSaving) return;
                            setIsSaving(true);
                            try {
                                const form = e.target as HTMLFormElement;
                                const formData = new FormData(form);
                                const newRecord: RecitalRecord = {
                                    id: Date.now(),
                                    date: formData.get("date") as string,
                                    eventName: formData.get("eventName") as string,
                                    piece: formData.get("piece") as string,
                                    venue: formData.get("venue") as string || undefined,
                                    memo: formData.get("memo") as string || undefined,
                                };
                                const updatedStudent = {
                                    ...selectedStudent,
                                    recitalHistory: [...(selectedStudent.recitalHistory || []), newRecord],
                                };
                                await saveStudent(updatedStudent);
                                setSelectedStudent(updatedStudent);
                                setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
                                setIsAddRecitalModalOpen(false);
                            } finally {
                                setIsSaving(false);
                            }
                        }} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">発表会名</label>
                                <input name="eventName" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 第10回 ピアノ発表会" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">開催日 <span className="text-red-500">*</span></label>
                                <input name="date" type="date" required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">演奏曲</label>
                                <input name="piece" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: エリーゼのために" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">会場</label>
                                <input name="venue" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 東京文化会館" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">備考</label>
                                <textarea name="memo" rows={2} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 初めての発表会、上手に演奏できた" />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : "追加する"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
