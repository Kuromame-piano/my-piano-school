"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Music, User, Star, FileText, Pencil, Trash2, ExternalLink, Library } from "lucide-react";
import { getSheetMusic, saveSheetMusic, deleteSheetMusic, SheetMusic } from "../actions/sheetMusicActions";
import { getStudents, Student } from "../actions/studentActions";

export default function SheetMusicView() {
    const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"title" | "composer" | "difficulty" | "genre">("title");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedMusic, setSelectedMusic] = useState<SheetMusic | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMusic, setEditingMusic] = useState<SheetMusic | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const musicData = await getSheetMusic();
        setSheetMusic(musicData);
        setLoading(false);
    };

    const handleSelectMusic = (music: SheetMusic) => {
        setSelectedMusic(music);
    };

    const filteredMusic = sheetMusic.filter(
        (m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.composer.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        const order = sortOrder === "asc" ? 1 : -1;
        if (sortBy === "title") return a.title.localeCompare(b.title, "ja") * order;
        if (sortBy === "composer") return a.composer.localeCompare(b.composer, "ja") * order;
        if (sortBy === "difficulty") return ((a.difficulty || 0) - (b.difficulty || 0)) * order;
        if (sortBy === "genre") return (a.genre || "").localeCompare(b.genre || "", "ja") * order;
        return 0;
    });

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
                difficulty: formData.get("difficulty") ? parseInt(formData.get("difficulty") as string) : undefined,
                genre: formData.get("genre") as string || undefined,
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


    const getDifficultyStars = (level: number) => {
        return Array(5).fill(0).map((_, i) => (
            <Star key={i} className={`w-4 h-4 ${i < level ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
        ));
    };

    const genres = ["クラシック", "ポップス", "ジャズ", "練習曲", "連弾", "その他"];

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">楽譜ライブラリ</h2>
                    <p className="text-gray-500">教本・楽譜のカタログを管理</p>
                </div>
                <button onClick={() => { setEditingMusic(null); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    <Plus className="w-5 h-5" />楽譜を追加
                </button>
            </header>

            {/* Search and Sort */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t-muted" />
                    <input type="text" placeholder="曲名・作曲者で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-input-bg border border-input-border rounded-xl text-input-text placeholder:text-t-placeholder focus:border-input-border-focus" />
                </div>
                <div className="flex bg-card-solid rounded-xl border border-card-border p-1">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent text-sm font-medium text-t-secondary px-3 py-2 rounded-lg focus:outline-none">
                        <option value="title">曲名順</option>
                        <option value="composer">作曲者順</option>
                        <option value="difficulty">難易度順</option>
                        <option value="genre">ジャンル順</option>
                    </select>
                    <button onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")} className="px-3 hover:bg-accent-bg-hover rounded-lg text-t-secondary">
                        {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Music List */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        <div className="text-center py-12 text-t-muted">読み込み中...</div>
                    ) : filteredMusic.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <Music className="w-12 h-12 text-t-muted mx-auto mb-4" />
                            <p className="text-t-secondary">楽譜がまだ登録されていません</p>
                        </div>
                    ) : (
                        filteredMusic.map((music) => (
                            <button key={music.id} onClick={() => handleSelectMusic(music)} className={`w-full glass-card p-5 text-left hover:bg-accent-bg-hover transition-all ${selectedMusic?.id === music.id ? "ring-2 ring-accent" : ""}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-accent-bg rounded-xl">
                                            <Music className="w-6 h-6 text-accent" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-t-primary">{music.title}</h3>
                                            <p className="text-sm text-t-secondary">{music.composer}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-3 mt-2">
                                                    {music.genre && <span className="text-xs px-2 py-1 bg-accent-bg rounded-full text-accent">{music.genre}</span>}
                                                    {music.difficulty && <div className="flex">{getDifficultyStars(music.difficulty)}</div>}
                                                </div>
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
                                    <h3 className="font-bold text-xl text-t-primary">{selectedMusic.title}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingMusic(selectedMusic); setIsAddModalOpen(true); }} className="p-2 hover:bg-accent-bg-hover rounded-lg"><Pencil className="w-4 h-4 text-t-secondary" /></button>
                                        <button onClick={() => handleDeleteMusic(selectedMusic.id)} className="p-2 hover:bg-danger-bg rounded-lg"><Trash2 className="w-4 h-4 text-danger" /></button>
                                    </div>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <p className="flex items-center gap-2 text-t-primary"><User className="w-4 h-4 text-t-muted" />{selectedMusic.composer}</p>

                                    {selectedMusic.difficulty && <div className="flex items-center gap-2"><Star className="w-4 h-4 text-t-muted" />{getDifficultyStars(selectedMusic.difficulty)}</div>}
                                    {selectedMusic.genre && <p className="flex items-center gap-2 text-t-primary"><FileText className="w-4 h-4 text-t-muted" />{selectedMusic.genre}</p>}
                                    {selectedMusic.pdfUrl && (
                                        <a href={selectedMusic.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:text-accent-hover">
                                            <ExternalLink className="w-4 h-4" />楽譜を開く
                                        </a>
                                    )}
                                </div>
                                {selectedMusic.notes && (
                                    <p className="mt-4 pt-4 border-t border-card-border text-sm text-t-secondary">{selectedMusic.notes}</p>
                                )}
                            </div>

                            {/* Info Card */}

                        </>
                    ) : (
                        <div className="glass-card p-8 text-center">
                            <Music className="w-10 h-10 text-t-muted mx-auto mb-3" />
                            <p className="text-t-secondary">楽譜を選択してください</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="fixed inset-0 bg-modal-overlay backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingMusic(null); }} />
                    <div className="relative z-10 w-full sm:max-w-md lg:max-w-lg bg-modal-bg border border-modal-border rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto safe-area-bottom shadow-xl">
                        <button onClick={() => { setIsAddModalOpen(false); setEditingMusic(null); }} className="absolute top-6 right-6 p-2 text-t-muted hover:text-t-primary"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingMusic ? "楽譜を編集" : "新規楽譜"}</h3>
                        <form onSubmit={handleSaveMusic} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">曲名 <span className="text-danger">*</span></label>
                                <input name="title" required defaultValue={editingMusic?.title} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="例: エリーゼのために" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">作曲者</label>
                                <input name="composer" defaultValue={editingMusic?.composer} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="例: ベートーヴェン" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-t-secondary mb-2">難易度</label>
                                    <select name="difficulty" defaultValue={editingMusic?.difficulty || ""} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus">
                                        <option value="">未設定</option>
                                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-t-secondary mb-2">ジャンル</label>
                                    <select name="genre" defaultValue={editingMusic?.genre || ""} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus">
                                        <option value="">未設定</option>
                                        {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">PDF URL</label>
                                <input name="pdfUrl" type="url" defaultValue={editingMusic?.pdfUrl} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">メモ</label>
                                <textarea name="notes" rows={2} defaultValue={editingMusic?.notes} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="練習ポイントなど..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : (editingMusic ? "更新する" : "追加する")}</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
