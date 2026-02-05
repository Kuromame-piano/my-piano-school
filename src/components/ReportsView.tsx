"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Music, Sparkles } from "lucide-react";

import { getStudents, Student } from "../actions/studentActions";

const TEMPLATES = [
    { id: 1, label: "順調に進んでいます", text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、順調に進んでいます。特に{良かった点}が素晴らしかったです。\n\n次回も{次回の目標}を中心に練習してみてください。引き続きよろしくお願いいたします！" },
    { id: 2, label: "とても頑張りました", text: "本日のレッスンもお疲れ様でした！\n\n今日は{曲名}に集中して取り組みました。{良かった点}がとても良くなっていて、日々の練習の成果が出ていますね！\n\n次回のレッスンまでに{次回の目標}を意識して練習してみてください。" },
    { id: 3, label: "次回へ向けて", text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、少し難しい箇所がありましたが、焦らずゆっくり進めていきましょう。{アドバイス}\n\n次回は{次回の目標}から始めますね。引き続きよろしくお願いいたします！" },
];

export default function ReportsView() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
    const [customText, setCustomText] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        getStudents().then(setStudents);
    }, []);

    const generateMessage = () => {
        if (!selectedStudent) return "生徒を選択してください";

        let message = selectedTemplate.text;
        // Try to find an active piece
        const activePiece = selectedStudent.pieces.find(p => p.status === "active");
        const pieceTitle = activePiece ? activePiece.title : "練習曲";

        message = message.replace("{曲名}", pieceTitle);
        message = message.replace("{良かった点}", customText || "リズム感");
        message = message.replace("{次回の目標}", "表現力");
        message = message.replace("{アドバイス}", "ゆっくり片手ずつ練習してみてください");
        return message;
    };

    const handleCopy = () => {
        if (!selectedStudent) return;
        navigator.clipboard.writeText(generateMessage());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-3xl font-bold text-gradient mb-2">レッスン報告</h2>
                <p className="text-slate-400">テンプレートから報告メッセージを作成</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <label className="block text-sm font-medium text-slate-400 mb-3">生徒を選択</label>
                        {students.length === 0 ? (
                            <p className="text-slate-500 text-sm">生徒データがありません</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                {students.map((student) => {
                                    const activePiece = student.pieces.find(p => p.status === "active");
                                    return (
                                        <button key={student.id} onClick={() => setSelectedStudent(student)} className={`p-4 rounded-xl text-left ${selectedStudent?.id === student.id ? "bg-violet-500/20 border border-violet-500/30" : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"}`}>
                                            <p className="font-medium">{student.name}</p>
                                            {activePiece && (
                                                <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1"><Music className="w-3.5 h-3.5" />{activePiece.title}</p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-6">
                        <label className="block text-sm font-medium text-slate-400 mb-3">テンプレートを選択</label>
                        <div className="space-y-2">
                            {TEMPLATES.map((template) => (
                                <button key={template.id} onClick={() => setSelectedTemplate(template)} className={`w-full p-4 rounded-xl text-left ${selectedTemplate.id === template.id ? "bg-violet-500/20 border border-violet-500/30" : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"}`}>
                                    <p className="font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" />{template.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <label className="block text-sm font-medium text-slate-400 mb-3">今日良かった点（任意）</label>
                        <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600" placeholder="例: テンポが安定していた" />
                    </div>
                </div>

                <div className="glass-card p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">プレビュー</h3>
                        <button onClick={handleCopy} disabled={!selectedStudent} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${copied ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"}`}>
                            {copied ? <><Check className="w-4 h-4" />コピーしました</> : <><Copy className="w-4 h-4" />コピー</>}
                        </button>
                    </div>
                    <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-5 whitespace-pre-wrap text-slate-300 leading-relaxed">{generateMessage()}</div>
                    <p className="text-sm text-slate-500 mt-4 text-center">コピーしたメッセージをLINEに貼り付けて送信してください</p>
                </div>
            </div>
        </div>
    );
}
