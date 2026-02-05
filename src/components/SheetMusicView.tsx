"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Music, User, Star, FileText, Pencil, Trash2, Users, Link, ExternalLink } from "lucide-react";
import { getSheetMusic, saveSheetMusic, deleteSheetMusic, getAssignments, assignToStudent, removeAssignment, SheetMusic, StudentAssignment } from "../actions/sheetMusicActions";
import { getStudents, Student } from "../actions/studentActions";

export default function SheetMusicView() {
    const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMusic, setSelectedMusic] = useState<SheetMusic | null>(null);
    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMusic, setEditingMusic] = useState<SheetMusic | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [musicData, studentData] = await Promise.all([
            getSheetMusic(),
            getStudents(),
        ]);
        setSheetMusic(musicData);
        setStudents(studentData);
        setLoading(false);
    };

    const loadAssignments = async (musicId: number) => {
        const data = await getAssignments(musicId);
        setAssignments(data);
    };

    const handleSelectMusic = async (music: SheetMusic) => {
        setSelectedMusic(music);
        await loadAssignments(music.id);
    };

    const filteredMusic = sheetMusic.filter(
        (m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.composer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSaveMusic = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);

            const musicData: SheetMusic = {
                id: editingMusic ? editingMusic.id : Date.now(),
                title: formData.get("title") as string,
                composer: formData.get("composer") as string,
                difficulty: parseInt(formData.get("difficulty") as string),
                genre: formData.get("genre") as string,
                pdfUrl: formData.get("pdfUrl") as string,
                notes: formData.get("notes") as string,
            };

            await saveSheetMusic(musicData);
            await loadData();
            setIsAddModalOpen(false);
            setEditingMusic(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMusic = async (musicId: number) => {
        if (!confirm("この楽譜を削除しますか？")) return;
        await deleteSheetMusic(musicId);
        setSelectedMusic(null);
        await loadData();
    };

    const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedMusic || isSaving) return;
        setIsSaving(true);
        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            const studentId = parseInt(formData.get("studentId") as string);
            const student = students.find((s) => s.id === studentId);
            if (!student) return;

            await assignToStudent(selectedMusic.id, studentId, student.name);
            await loadAssignments(selectedMusic.id);
            setIsAssignModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveAssignment = async (studentId: number) => {
        if (!selectedMusic) return;
        if (!confirm("この割り当てを解除しますか？")) return;
        await removeAssignment(selectedMusic.id, studentId);
        await loadAssignments(selectedMusic.id);
    };

    const getDifficultyStars = (level: number) => {
        return Array(5).fill(0).map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < level ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
        ));
    };

    const genres = ["クラシック", "ポップス", "ジャズ", "練習曲", "連弾", "その他"];

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">楽譜ライブラリ</h2>
                    <p className="text-slate-400">よく使う楽譜を管理し生徒に割り当て</p>
                </div>
                <button onClick={() => { setEditingMusic(null); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    <Plus className="w-5 h-5" />楽譜を追加
                </button>
            </header>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" placeholder="曲名・作曲者で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:border-violet-500/50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Music List */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">読み込み中...</div>
                    ) : filteredMusic.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <Music className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500">楽譜がまだ登録されていません</p>
                        </div>
                    ) : (
                        filteredMusic.map((music) => (
                            <button key={music.id} onClick={() => handleSelectMusic(music)} className={`w-full glass-card p-5 text-left hover:bg-slate-800/50 transition-all ${selectedMusic?.id === music.id ? "ring-2 ring-violet-500/50" : ""}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-violet-500/10 rounded-xl">
                                            <Music className="w-6 h-6 text-violet-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{music.title}</h3>
                                            <p className="text-sm text-slate-400">{music.composer}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs px-2 py-1 bg-slate-800 rounded-full text-slate-400">{music.genre}</span>
                                                <div className="flex">{getDifficultyStars(music.difficulty)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Detail Panel */}
                <div className="space-y-4">
                    {selectedMusic ? (
                        <>
                            <div className="glass-card p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="font-bold text-xl">{selectedMusic.title}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingMusic(selectedMusic); setIsAddModalOpen(true); }} className="p-2 hover:bg-slate-800 rounded-lg"><Pencil className="w-4 h-4 text-slate-400" /></button>
                                        <button onClick={() => handleDeleteMusic(selectedMusic.id)} className="p-2 hover:bg-rose-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                                    </div>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-500" />{selectedMusic.composer}</p>
                                    <div className="flex items-center gap-2"><Star className="w-4 h-4 text-slate-500" />{getDifficultyStars(selectedMusic.difficulty)}</div>
                                    <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />{selectedMusic.genre}</p>
                                    {selectedMusic.pdfUrl && (
                                        <a href={selectedMusic.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-violet-400 hover:text-violet-300">
                                            <ExternalLink className="w-4 h-4" />楽譜を開く
                                        </a>
                                    )}
                                </div>
                                {selectedMusic.notes && (
                                    <p className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400">{selectedMusic.notes}</p>
                                )}
                            </div>

                            {/* Assignments */}
                            <div className="glass-card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" />割り当て済み生徒</h4>
                                    <button onClick={() => setIsAssignModalOpen(true)} className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1"><Plus className="w-4 h-4" />追加</button>
                                </div>
                                {assignments.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-4">まだ割り当てられていません</p>
                                ) : (
                                    <div className="space-y-2">
                                        {assignments.map((a) => (
                                            <div key={a.studentId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg group">
                                                <span>{a.studentName}</span>
                                                <button onClick={() => handleRemoveAssignment(a.studentId)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 rounded"><X className="w-4 h-4 text-rose-400" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="glass-card p-8 text-center">
                            <Music className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500">楽譜を選択してください</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingMusic(null); }} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => { setIsAddModalOpen(false); setEditingMusic(null); }} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingMusic ? "楽譜を編集" : "新規楽譜"}</h3>
                        <form onSubmit={handleSaveMusic} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">曲名 <span className="text-red-400">*</span></label>
                                <input name="title" required defaultValue={editingMusic?.title} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: エリーゼのために" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">作曲者</label>
                                <input name="composer" defaultValue={editingMusic?.composer} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: ベートーヴェン" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">難易度</label>
                                    <select name="difficulty" defaultValue={editingMusic?.difficulty || 3} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">ジャンル</label>
                                    <select name="genre" defaultValue={editingMusic?.genre || "クラシック"} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                        {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">PDF URL</label>
                                <input name="pdfUrl" type="url" defaultValue={editingMusic?.pdfUrl} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">メモ</label>
                                <textarea name="notes" rows={2} defaultValue={editingMusic?.notes} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="練習ポイントなど..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : (editingMusic ? "更新する" : "追加する")}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Modal */}
            {isAssignModalOpen && selectedMusic && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAssignModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setIsAssignModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">生徒に割り当て</h3>
                        <form onSubmit={handleAssign} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">生徒を選択</label>
                                <select name="studentId" required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                    <option value="">選択してください</option>
                                    {students
                                        .filter((s) => !assignments.find((a) => a.studentId === s.id))
                                        .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                                    }
                                </select>
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : "割り当てる"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
