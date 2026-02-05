"use client";

import { useState, useEffect } from "react";
import { Plus, X, Calendar, MapPin, Music, Users, Pencil, Trash2, ChevronRight, GripVertical } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getRecitals, saveRecital, deleteRecital, Recital, RecitalParticipant } from "../actions/recitalActions";
import { getStudents, Student } from "../actions/studentActions";

// Sortable Participant Component
function SortableParticipant({ participant, index, onRemove }: { participant: RecitalParticipant; index: number; onRemove: (id: number) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: participant.studentId });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl group">
            <div {...attributes} {...listeners} className="cursor-grab hover:text-white text-slate-500">
                <GripVertical className="w-5 h-5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-sm">
                {index + 1}
            </div>
            <div className="flex-1">
                <p className="font-medium">{participant.studentName}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Music className="w-3.5 h-3.5" />{participant.piece}
                </p>
            </div>
            <button onClick={() => onRemove(participant.studentId)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 rounded-lg transition-opacity">
                <Trash2 className="w-4 h-4 text-rose-400" />
            </button>
        </div>
    );
}

export default function RecitalView() {
    const [recitals, setRecitals] = useState<Recital[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecital, setSelectedRecital] = useState<Recital | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingRecital, setEditingRecital] = useState<Recital | null>(null);
    const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [recitalData, studentData] = await Promise.all([
            getRecitals(),
            getStudents(),
        ]);
        setRecitals(recitalData);
        setStudents(studentData);
        setLoading(false);
    };

    const handleSaveRecital = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);

            const recitalData: Recital = {
                id: editingRecital ? editingRecital.id : Date.now(),
                name: formData.get("name") as string,
                date: formData.get("date") as string,
                location: formData.get("location") as string,
                description: formData.get("description") as string,
                participants: editingRecital ? editingRecital.participants : [],
            };

            await saveRecital(recitalData);
            await loadData();
            setIsAddModalOpen(false);
            setEditingRecital(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRecital = async (recitalId: number) => {
        if (!confirm("この発表会を削除しますか？")) return;
        await deleteRecital(recitalId);
        setSelectedRecital(null);
        await loadData();
    };

    const handleAddParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRecital || isSaving) return;
        setIsSaving(true);

        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            const studentId = parseInt(formData.get("studentId") as string);
            const student = students.find((s) => s.id === studentId);
            if (!student) return;

            const newParticipant: RecitalParticipant = {
                studentId,
                studentName: student.name,
                piece: formData.get("piece") as string,
                order: selectedRecital.participants.length + 1,
            };

            const updatedRecital = {
                ...selectedRecital,
                participants: [...selectedRecital.participants, newParticipant],
            };

            await saveRecital(updatedRecital);
            setSelectedRecital(updatedRecital);
            await loadData();
            setIsAddParticipantModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveParticipant = async (studentId: number) => {
        if (!selectedRecital) return;
        if (!confirm("この参加者を削除しますか？")) return;

        const updatedParticipants = selectedRecital.participants
            .filter((p) => p.studentId !== studentId)
            .map((p, i) => ({ ...p, order: i + 1 }));

        const updatedRecital = { ...selectedRecital, participants: updatedParticipants };
        await saveRecital(updatedRecital);
        setSelectedRecital(updatedRecital);
        await loadData();
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (!selectedRecital) return;
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = selectedRecital.participants.findIndex((p) => p.studentId === active.id);
            const newIndex = selectedRecital.participants.findIndex((p) => p.studentId === over.id);

            const newParticipants = [...selectedRecital.participants];
            const [moved] = newParticipants.splice(oldIndex, 1);
            newParticipants.splice(newIndex, 0, moved);

            // Update order
            const updatedParticipants = newParticipants.map((p, i) => ({ ...p, order: i + 1 }));

            const updatedRecital = { ...selectedRecital, participants: updatedParticipants };
            setSelectedRecital(updatedRecital); // Optimistic update
            await saveRecital(updatedRecital);
            await loadData();
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    };

    const isPastRecital = (dateStr: string) => {
        return new Date(dateStr) < new Date();
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">発表会管理</h2>
                    <p className="text-slate-400">発表会の日程・曲目・参加者を管理</p>
                </div>
                <button onClick={() => { setEditingRecital(null); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-3 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
                    <Plus className="w-5 h-5" />発表会を追加
                </button>
            </header>

            {loading ? (
                <div className="text-center py-12 text-slate-500">読み込み中...</div>
            ) : recitals.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Music className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">発表会がまだ登録されていません</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recitals.map((recital) => (
                        <button
                            key={recital.id}
                            onClick={() => setSelectedRecital(recital)}
                            className={`glass-card p-5 text-left hover:bg-slate-800/50 transition-all group ${isPastRecital(recital.date) ? "opacity-60" : ""}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        {recital.name}
                                        {isPastRecital(recital.date) && <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full">終了</span>}
                                    </h3>
                                    <p className="text-sm text-violet-400 flex items-center gap-1.5 mt-1">
                                        <Calendar className="w-3.5 h-3.5" />{formatDate(recital.date)}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-violet-400" />
                            </div>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />{recital.location || "場所未定"}
                            </p>
                            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-500" />
                                <span className="text-sm text-slate-400">{recital.participants.length}名参加</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Recital Detail Modal */}
            {selectedRecital && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRecital(null)} />
                    <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setSelectedRecital(null)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>

                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold">{selectedRecital.name}</h3>
                                <p className="text-violet-400 mt-1 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />{formatDate(selectedRecital.date)}
                                </p>
                                <p className="text-slate-500 mt-1 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />{selectedRecital.location || "場所未定"}
                                </p>
                                {selectedRecital.description && (
                                    <p className="text-slate-400 mt-3 text-sm">{selectedRecital.description}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingRecital(selectedRecital); setIsAddModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4 text-slate-300" /></button>
                                <button onClick={() => handleDeleteRecital(selectedRecital.id)} className="p-2 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                            </div>
                        </div>

                        <div className="border-t border-slate-800 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                    <Users className="w-5 h-5 text-violet-400" />参加者 ({selectedRecital.participants.length}名)
                                </h4>
                                <button onClick={() => setIsAddParticipantModalOpen(true)} className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                                    <Plus className="w-4 h-4" />参加者を追加
                                </button>
                            </div>

                            {selectedRecital.participants.length === 0 ? (
                                <p className="text-center py-8 text-slate-600">参加者がまだ登録されていません</p>
                            ) : (
                                <div className="space-y-3">
                                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={selectedRecital.participants.map(p => p.studentId)} strategy={verticalListSortingStrategy}>
                                            {selectedRecital.participants.map((participant, index) => (
                                                <SortableParticipant
                                                    key={participant.studentId}
                                                    participant={participant}
                                                    index={index}
                                                    onRemove={handleRemoveParticipant}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Recital Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingRecital(null); }} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => { setIsAddModalOpen(false); setEditingRecital(null); }} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingRecital ? "発表会を編集" : "新規発表会"}</h3>
                        <form onSubmit={handleSaveRecital} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">発表会名 <span className="text-red-400">*</span></label>
                                <input name="name" required defaultValue={editingRecital?.name} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 2026年春の発表会" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">日付 <span className="text-red-400">*</span></label>
                                <input name="date" type="date" required defaultValue={editingRecital?.date} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">場所</label>
                                <input name="location" defaultValue={editingRecital?.location} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: ○○ホール" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">説明・メモ</label>
                                <textarea name="description" rows={3} defaultValue={editingRecital?.description} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="発表会の詳細など..." />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : (editingRecital ? "更新する" : "作成する")}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Participant Modal */}
            {isAddParticipantModalOpen && selectedRecital && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddParticipantModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setIsAddParticipantModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">参加者を追加</h3>
                        <form onSubmit={handleAddParticipant} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">生徒を選択 <span className="text-red-400">*</span></label>
                                <select name="studentId" required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                    <option value="">選択してください</option>
                                    {students
                                        .filter((s) => !selectedRecital.participants.find((p) => p.studentId === s.id))
                                        .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">演奏曲 <span className="text-red-400">*</span></label>
                                <input name="piece" required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: エリーゼのために" />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>{isSaving ? "保存中..." : "追加する"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
