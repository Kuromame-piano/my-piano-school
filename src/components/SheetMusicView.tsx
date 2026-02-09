"use client";

import { useState, useEffect } from "react";
import { Plus, Search, X, Music, User, Star, FileText, Pencil, Trash2, ExternalLink, Library } from "lucide-react";
import { getSheetMusic, saveSheetMusic, deleteSheetMusic, SheetMusic } from "../actions/sheetMusicActions";
import { getStudents, Student } from "../actions/studentActions";

export default function SheetMusicView() {
    const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
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
                    <p className="text-gray-500">教本・楽譜のカタログを管理（生徒への割り当ては生徒管理から行います）</p>
                </div>
                <button onClick={() => { setEditingMusic(null); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    <Plus className="w-5 h-5" />楽譜を追加
                </button>
            </header>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="曲名・作曲者で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-pink-200 rounded-xl text-gray-700 placeholder:text-gray-400 focus:border-pink-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Music List */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        <div className="text-center py-12 text-gray-400">読み込み中...</div>
                    ) : filteredMusic.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">楽譜がまだ登録されていません</p>
                        </div>
                    ) : (
                        filteredMusic.map((music) => (
                            <button key={music.id} onClick={() => handleSelectMusic(music)} className={`w-full glass-card p-5 text-left hover:bg-pink-50 transition-all ${selectedMusic?.id === music.id ? "ring-2 ring-pink-400" : ""}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-pink-100 rounded-xl">
                                            <Music className="w-6 h-6 text-pink-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-700">{music.title}</h3>
                                            <p className="text-sm text-gray-500">{music.composer}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-xs px-2 py-1 bg-pink-100 rounded-full text-pink-600">{music.genre}</span>
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
                                    <h3 className="font-bold text-xl text-gray-700">{selectedMusic.title}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingMusic(selectedMusic); setIsAddModalOpen(true); }} className="p-2 hover:bg-gray-100 rounded-lg"><Pencil className="w-4 h-4 text-gray-600" /></button>
                                        <button onClick={() => handleDeleteMusic(selectedMusic.id)} className="p-2 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                                    </div>
                                </div>
                                <div className="space-y-3 text-sm">
                                    <p className="flex items-center gap-2 text-gray-700"><User className="w-4 h-4 text-gray-500" />{selectedMusic.composer}</p>
                                    <div className="flex items-center gap-2"><Star className="w-4 h-4 text-gray-500" />{getDifficultyStars(selectedMusic.difficulty)}</div>
                                    <p className="flex items-center gap-2 text-gray-700"><FileText className="w-4 h-4 text-gray-500" />{selectedMusic.genre}</p>
                                    {selectedMusic.pdfUrl && (
                                        <a href={selectedMusic.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-500 hover:text-pink-600">
                                            <ExternalLink className="w-4 h-4" />楽譜を開く
                                        </a>
                                    )}
                                </div>
                                {selectedMusic.notes && (
                                    <p className="mt-4 pt-4 border-t border-pink-100 text-sm text-gray-600">{selectedMusic.notes}</p>
                                )}
                            </div>

                            {/* Info Card */}
                            <div className="glass-card p-6 bg-blue-50 border-blue-200">
                                <div className="flex items-start gap-3">
                                    <Library className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-semibold mb-1">生徒への割り当てについて</p>
                                        <p className="text-blue-600">この楽譜を生徒に割り当てるには、<span className="font-medium">生徒管理</span>画面から生徒を選択し、「練習中」または「教本」タブで追加してください。</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-card p-8 text-center">
                            <Music className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">楽譜を選択してください</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingMusic(null); }} />
                    <div className="relative z-10 w-full max-w-md bg-white border border-pink-200 rounded-3xl p-8 shadow-2xl">
                        <button onClick={() => { setIsAddModalOpen(false); setEditingMusic(null); }} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingMusic ? "楽譜を編集" : "新規楽譜"}</h3>
                        <form onSubmit={handleSaveMusic} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">曲名 <span className="text-red-500">*</span></label>
                                <input name="title" required defaultValue={editingMusic?.title} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700" placeholder="例: エリーゼのために" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">作曲者</label>
                                <input name="composer" defaultValue={editingMusic?.composer} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700" placeholder="例: ベートーヴェン" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">難易度</label>
                                    <select name="difficulty" defaultValue={editingMusic?.difficulty || 3} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700">
                                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">ジャンル</label>
                                    <select name="genre" defaultValue={editingMusic?.genre || "クラシック"} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700">
                                        {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">PDF URL</label>
                                <input name="pdfUrl" type="url" defaultValue={editingMusic?.pdfUrl} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">メモ</label>
                                <textarea name="notes" rows={2} defaultValue={editingMusic?.notes} className="w-full px-4 py-3 bg-white border border-pink-200 rounded-xl text-gray-700" placeholder="練習ポイントなど..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : (editingMusic ? "更新する" : "追加する")}</button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
