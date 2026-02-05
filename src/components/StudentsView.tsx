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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
    getStudents,
    saveStudent,
    archiveStudent,
    getLessonNotes,
    addLessonNote,
    deleteLessonNote,
    getStudentProgress,
    Student,
} from "../actions/studentActions";

type DetailTab = "active" | "completed" | "notes" | "progress";

export default function StudentsView() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        loadStudents();
    }, [showArchived]);

    const loadStudents = async () => {
        setLoading(true);
        const data = await getStudents(showArchived);
        setStudents(data);
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

    // Progress chart
    const [progressData, setProgressData] = useState<{ month: string; completedCount: number }[]>([]);

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
        let updatedStudent: Student | undefined;
        setStudents((prev) =>
            prev.map((s) => {
                if (s.id === studentId) {
                    updatedStudent = { ...s, pieces: s.pieces.map((p) => (p.id === pieceId ? { ...p, progress } : p)) };
                    return updatedStudent;
                }
                return s;
            })
        );

        if (selectedStudent?.id === studentId) {
            setSelectedStudent((prev) =>
                prev ? { ...prev, pieces: prev.pieces.map((p) => (p.id === pieceId ? { ...p, progress } : p)) } : null
            );
        }

        if (updatedStudent) await saveStudent(updatedStudent);
    };

    const handleCompletePiece = async (studentId: number, pieceId: number) => {
        const today = new Date().toLocaleDateString("ja-JP");
        let updatedStudent: Student | undefined;

        setStudents((prev) =>
            prev.map((s) => {
                if (s.id === studentId) {
                    updatedStudent = { ...s, pieces: s.pieces.map((p) => (p.id === pieceId ? { ...p, status: "completed", progress: 100, completedAt: today } : p)) };
                    return updatedStudent;
                }
                return s;
            })
        );

        if (selectedStudent?.id === studentId) {
            setSelectedStudent((prev) =>
                prev ? { ...prev, pieces: prev.pieces.map((p) => (p.id === pieceId ? { ...p, status: "completed", progress: 100, completedAt: today } : p)) } : null
            );
        }

        if (updatedStudent) await saveStudent(updatedStudent);
    };

    const handleAddPiece = async (studentId: number) => {
        const title = prompt("新しい曲名を入力してください");
        if (!title) return;

        const newPiece = { id: Date.now(), title, progress: 0, status: "active" as const, startedAt: new Date().toLocaleDateString("ja-JP") };
        let updatedStudent: Student | undefined;

        setStudents((prev) =>
            prev.map((s) => {
                if (s.id === studentId) {
                    updatedStudent = { ...s, pieces: [newPiece, ...s.pieces] };
                    return updatedStudent;
                }
                return s;
            })
        );

        if (selectedStudent?.id === studentId) {
            setSelectedStudent((prev) => (prev ? { ...prev, pieces: [newPiece, ...prev.pieces] } : null));
        }

        if (updatedStudent) await saveStudent(updatedStudent);
    };

    const handleArchiveStudent = async (studentId: number, archive: boolean) => {
        await archiveStudent(studentId, archive);
        setSelectedStudent(null);
        await loadStudents();
    };

    const handleAddLessonNote = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedStudent) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        await addLessonNote(selectedStudent.id, {
            date: formData.get("date") as string,
            content: formData.get("content") as string,
            pieces: [],
        });

        await loadLessonNotes(selectedStudent.id);
        setIsAddNoteModalOpen(false);
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

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">生徒管理</h2>
                    <p className="text-slate-400">生徒情報と練習中の曲を管理</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium border transition-colors ${showArchived ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
                    >
                        <Archive className="w-4 h-4" />
                        {showArchived ? "アーカイブ済みを表示中" : "アーカイブ済みを表示"}
                    </button>
                    <button onClick={() => { setEditingStudent(null); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                        <Plus className="w-5 h-5" />
                        生徒を追加
                    </button>
                </div>
            </header>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" placeholder="生徒名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-violet-500/50" />
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">読み込み中...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map((student) => (
                        <button key={student.id} onClick={() => { setSelectedStudent(student); setActiveTab("active"); }} className={`glass-card p-5 text-left hover:bg-slate-800/50 transition-all group ${student.archived ? "opacity-60" : ""}`}>
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-xl ${student.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>{student.name[0]}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-lg truncate">{student.name}</p>
                                        {student.archived && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">アーカイブ</span>}
                                    </div>
                                    <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1"><Calendar className="w-3.5 h-3.5" />{student.lessonDay}</p>
                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5" />{student.address}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-violet-400" />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <p className="text-xs text-slate-500 mb-2">練習中: {student.pieces.filter((p) => p.status === "active").length}曲</p>
                                <div className="flex gap-2 flex-wrap">
                                    {student.pieces.filter((p) => p.status === "active").slice(0, 2).map((piece) => (
                                        <span key={piece.id} className="text-xs px-2.5 py-1 bg-violet-500/10 text-violet-300 rounded-full">{piece.title.length > 12 ? piece.title.slice(0, 12) + "..." : piece.title}</span>
                                    ))}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
                    <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>

                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-5">
                                <div className={`w-20 h-20 rounded-2xl ${selectedStudent.color} flex items-center justify-center text-white font-bold text-3xl shadow-xl`}>{selectedStudent.name[0]}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-2xl font-bold">{selectedStudent.name}</h3>
                                        {selectedStudent.archived && <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">アーカイブ</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                                        <p className="text-slate-400 flex items-center gap-2"><Phone className="w-4 h-4" />{selectedStudent.phone}</p>
                                        <p className="text-slate-500 flex items-center gap-2"><MapPin className="w-4 h-4" />{selectedStudent.address}</p>
                                        {selectedStudent.email && <p className="text-slate-500 flex items-center gap-2"><Mail className="w-4 h-4" />{selectedStudent.email}</p>}
                                        {selectedStudent.birthDate && <p className="text-slate-500 flex items-center gap-2"><Cake className="w-4 h-4" />{selectedStudent.birthDate}</p>}
                                    </div>
                                    {(selectedStudent.parentName || selectedStudent.parentPhone) && (
                                        <div className="mt-2 text-sm text-slate-500 flex items-center gap-2 border-t border-slate-800 pt-2">
                                            <User className="w-4 h-4" />
                                            <span>保護者: {selectedStudent.parentName} {selectedStudent.parentPhone && `(${selectedStudent.parentPhone})`}</span>
                                        </div>
                                    )}
                                    {selectedStudent.memo && (
                                        <div className="mt-2 text-sm text-slate-400 italic bg-slate-800/30 p-2 rounded-lg">
                                            <FileText className="w-3 h-3 inline mr-1" />
                                            {selectedStudent.memo}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleArchiveStudent(selectedStudent.id, !selectedStudent.archived)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-colors ${selectedStudent.archived ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"}`}
                                >
                                    {selectedStudent.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                    {selectedStudent.archived ? "復元" : "アーカイブ"}
                                </button>
                                <button onClick={() => openEditModal(selectedStudent)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors">
                                    <Pencil className="w-4 h-4" /> 編集
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit mb-6 flex-wrap">
                            <button onClick={() => setActiveTab("active")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${activeTab === "active" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}><Music className="w-4 h-4" />練習中 ({selectedStudent.pieces.filter((p) => p.status === "active").length})</button>
                            <button onClick={() => setActiveTab("completed")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${activeTab === "completed" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500 hover:text-slate-300"}`}><History className="w-4 h-4" />合格履歴 ({selectedStudent.pieces.filter((p) => p.status === "completed").length})</button>
                            <button onClick={() => setActiveTab("notes")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${activeTab === "notes" ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"}`}><StickyNote className="w-4 h-4" />ノート</button>
                            <button onClick={() => setActiveTab("progress")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${activeTab === "progress" ? "bg-pink-500/20 text-pink-300" : "text-slate-500 hover:text-slate-300"}`}><TrendingUp className="w-4 h-4" />上達グラフ</button>
                        </div>

                        {/* Tab Content */}
                        <div className="space-y-4">
                            {activeTab === "active" && (
                                <>
                                    <button onClick={() => handleAddPiece(selectedStudent.id)} className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-violet-500/50 rounded-xl text-slate-500 hover:text-violet-400 font-medium flex items-center justify-center gap-2"><Plus className="w-5 h-5" />新しい曲を追加</button>
                                    {selectedStudent.pieces.filter((p) => p.status === "active").map((piece) => (
                                        <div key={piece.id} className="glass-card p-5 space-y-4">
                                            <div className="flex items-start justify-between">
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
                                                <button onClick={() => handleCompletePiece(selectedStudent.id, piece.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg font-medium text-sm"><Check className="w-4 h-4" />合格！</button>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">進捗</span><span className="text-violet-400 font-medium">{piece.progress}%</span></div>
                                                <input type="range" min="0" max="100" value={piece.progress} onChange={(e) => handleUpdateProgress(selectedStudent.id, piece.id, parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-violet-500" />
                                            </div>
                                        </div>
                                    ))}
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
                                    <button onClick={() => setIsAddNoteModalOpen(true)} className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl text-slate-500 hover:text-blue-400 font-medium flex items-center justify-center gap-2"><Plus className="w-5 h-5" />レッスンノートを追加</button>
                                    {loadingNotes ? (
                                        <p className="text-center py-8 text-slate-500">読み込み中...</p>
                                    ) : lessonNotes.length === 0 ? (
                                        <p className="text-center py-8 text-slate-600">レッスンノートはまだありません</p>
                                    ) : (
                                        lessonNotes.map((note) => (
                                            <div key={note.id} className="glass-card p-5 group">
                                                <div className="flex items-start justify-between mb-2">
                                                    <p className="text-sm text-blue-400 font-medium">{note.date}</p>
                                                    <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 rounded-lg transition-opacity"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                                                </div>
                                                <p className="text-slate-300 whitespace-pre-wrap">{note.content}</p>
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
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Student Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingStudent ? "生徒情報を編集" : "新規生徒の登録"}</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
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
                                color: editingStudent ? editingStudent.color : colors[Math.floor(Math.random() * colors.length)],
                                pieces: editingStudent ? editingStudent.pieces : [],
                                archived: editingStudent?.archived || false,
                            };

                            await saveStudent(newStudentData);
                            await loadStudents();
                            if (selectedStudent?.id === newStudentData.id) setSelectedStudent(newStudentData);
                            setIsAddModalOpen(false);
                            setEditingStudent(null);
                        }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-4">基本情報</h4>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">お名前 <span className="text-red-400">*</span></label><input name="name" defaultValue={editingStudent?.name} required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: 山田 花子" /></div>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">電話番号</label><input name="phone" defaultValue={editingStudent?.phone} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: 090-1234-5678" /></div>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">メールアドレス</label><input name="email" type="email" defaultValue={editingStudent?.email} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: example@email.com" /></div>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">住所</label><input name="address" defaultValue={editingStudent?.address} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: 江東区清澄白河..." /></div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-4">詳細情報</h4>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">レッスン日時</label><input name="lessonDay" defaultValue={editingStudent?.lessonDay} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: 毎週火曜 14:00" /></div>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">生年月日</label><input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" /></div>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">保護者氏名</label><input name="parentName" defaultValue={editingStudent?.parentName} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: 山田 太郎" /></div>
                                    <div><label className="block text-sm font-medium text-slate-400 mb-2">保護者電話番号</label><input name="parentPhone" defaultValue={editingStudent?.parentPhone} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: 090-0000-0000" /></div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">メモ (特記事項など)</label>
                                <textarea name="memo" defaultValue={editingStudent?.memo} rows={3} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 focus:border-violet-500/50" placeholder="例: 発表会への参加希望、苦手な音階など" />
                            </div>
                            <button type="submit" className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg hover:shadow-xl mt-6">{editingStudent ? "更新する" : "登録する"}</button>
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
                                <label className="block text-sm font-medium text-slate-400 mb-2">日付</label>
                                <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">レッスン内容・メモ</label>
                                <textarea name="content" rows={5} required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="今日のレッスン内容、注意点、次回への課題など..." />
                            </div>
                            <button type="submit" className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg">保存する</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
