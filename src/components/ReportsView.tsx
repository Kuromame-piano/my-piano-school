"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Music, Sparkles, User, ChevronRight, ChevronLeft, Search, Quote } from "lucide-react";
import { getStudents, Student } from "../actions/studentActions";

// Setup for templates
type Template = {
    id: string;
    label: string;
    title: string;
    text: string;
    color: string;
};

const TEMPLATES: Template[] = [
    {
        id: "steady",
        label: "順調",
        title: "順調に進んでいます",
        text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、順調に進んでいます。特に{良かった点}が素晴らしかったです。\n\n次回も{次回の目標}を中心に練習してみてください。引き続きよろしくお願いいたします！",
        color: "bg-blue-100 text-blue-700 border-blue-200"
    },
    {
        id: "growth",
        label: "成長",
        title: "大きな成長が見られました",
        text: "本日のレッスンもお疲れ様でした！\n\n今日は{曲名}に集中して取り組みました。{良かった点}がとても良くなっていて、日々の練習の成果が出ていますね！\n\n{次回の目標}を意識して練習してみてくださいね。応援しています！",
        color: "bg-green-100 text-green-700 border-green-200"
    },
    {
        id: "challenge",
        label: "挑戦",
        title: "難しい箇所も頑張りました",
        text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、少し難しい箇所がありましたが、{良かった点}などの良い部分もたくさんありました。焦らず一緒に進めていきましょう。\n\nおうちでは{アドバイス}を心がけてみてください。次回も楽しみにしています！",
        color: "bg-purple-100 text-purple-700 border-purple-200"
    },
    {
        id: "finish",
        label: "仕上げ",
        title: "仕上げの段階です",
        text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、もう少しで仕上がりそうですね。{良かった点}が特に良くなってきました。\n\n仕上げに向けて{次回の目標}を意識して、丁寧に練習してみてください。",
        color: "bg-orange-100 text-orange-700 border-orange-200"
    },
    {
        id: "new_piece",
        label: "新曲",
        title: "新しい曲への挑戦",
        text: "本日のレッスンもお疲れ様でした！\n\n今日から{曲名}に挑戦しましたね。初めてでしたが、{良かった点}が既にできていて素晴らしかったです。\n\n次回は{次回の目標}を中心に進めていきましょう！",
        color: "bg-teal-100 text-teal-700 border-teal-200"
    },
    {
        id: "expression",
        label: "表現力",
        title: "表現力が豊かになりました",
        text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、表現力がどんどんアップしていますね！{良かった点}の表現が特に印象的でした。\n\n{次回の目標}を意識して、さらに深みのある演奏を目指しましょう。",
        color: "bg-pink-100 text-pink-700 border-pink-200"
    },
    {
        id: "basics",
        label: "基礎",
        title: "基礎練習を頑張りました",
        text: "本日のレッスンもお疲れ様でした！\n\n今日は基礎練習を中心に行いました。{良かった点}がしっかりできていて、着実に力がついています。\n\nおうちでは{アドバイス}も取り入れてみてくださいね。次回も一緒に頑張りましょう！",
        color: "bg-slate-100 text-slate-700 border-slate-200"
    },
    {
        id: "recital",
        label: "発表会",
        title: "発表会に向けて",
        text: "本日のレッスンもお疲れ様でした！\n\n発表会で演奏する{曲名}の練習を進めました。{良かった点}が特に良く、本番が楽しみです！\n\n{次回の目標}を中心に仕上げていきましょう。応援しています！",
        color: "bg-indigo-100 text-indigo-700 border-indigo-200"
    },
];

const SUGGESTIONS = {
    goodPoints: [
        "リズム感が安定してきました", "譜読みが早くなりました", "指の形がとても綺麗です",
        "強弱の表現が豊かになりました", "集中して練習に取り組めました", "難しいパッセージもスムーズに"
    ],
    nextGoals: [
        "指の形を意識しましょう", "強弱記号に注意しましょう", "スラーとスタッカートの弾き分け",
        "手首の力を抜いて", "テンポを一定に保つ練習", "左手の音量バランス"
    ],
    advice: [
        "片手ずつの練習を大切に", "メトロノームを使って練習", "録音して自分の音を聴いてみましょう",
        "難しい箇所はリズム変奏で", "楽譜に書き込みをして注意点を忘れないように"
    ]
};

export default function ReportsView({ initialStudentId }: { initialStudentId?: number }) {
    // State
    const [step, setStep] = useState(1);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    // Custom inputs
    const [customText, setCustomText] = useState(""); // 良かった点
    const [nextGoal, setNextGoal] = useState("");     // 次回の目標
    const [adviceText, setAdviceText] = useState(""); // アドバイス

    // Editable preview
    const [editableMessage, setEditableMessage] = useState("");

    // UI states
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    // Initial load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const studentData = await getStudents();
            setStudents(studentData);

            // Handle initial student selection if provided
            if (initialStudentId) {
                const student = studentData.find(s => s.id === initialStudentId);
                if (student) {
                    handleStudentSelect(student);
                }
            }
        } catch (error) {
            console.error("Failed to load students:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper functions
    const getRandomSuggestion = (category: keyof typeof SUGGESTIONS) => {
        const list = SUGGESTIONS[category];
        return list[Math.floor(Math.random() * list.length)];
    };

    const handleShuffle = (category: keyof typeof SUGGESTIONS) => {
        const suggestion = getRandomSuggestion(category);
        if (category === "goodPoints") setCustomText(suggestion);
        if (category === "nextGoals") setNextGoal(suggestion);
        if (category === "advice") setAdviceText(suggestion);
    };

    const handleStudentSelect = (student: Student) => {
        setSelectedStudent(student);
        // Reset inputs when student changes
        setCustomText("");
        setNextGoal("");
        setAdviceText("");
        setSelectedTemplate(null);
        setStep(2);
    };

    const generateMessage = () => {
        if (!selectedTemplate) return "";

        let message = selectedTemplate.text;
        const activePiece = selectedStudent?.pieces.find(p => p.status === "active");
        const pieceTitle = activePiece ? activePiece.title : "練習曲";

        // Replace placeholders
        message = message.replace(/{曲名}/g, pieceTitle);
        message = message.replace(/{良かった点}/g, customText || "レッスンの取り組み");
        message = message.replace(/{次回の目標}/g, nextGoal || "課題");
        message = message.replace(/{アドバイス}/g, adviceText || "日々の積み重ね");

        return message;
    };

    const handleGoToPreview = () => {
        setEditableMessage(generateMessage());
        setStep(3);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(editableMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Filtered students
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.pieces && s.pieces.some(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gradient mb-1 sm:mb-2">レッスン報告</h2>
                    <p className="text-sm sm:text-base text-gray-500">保護者へのレッスン報告メッセージを作成します</p>
                </div>
                {/* Step Indicator */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-card-solid px-3 sm:px-4 py-2 rounded-full border border-card-border self-start sm:self-auto">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${step >= 1 ? "bg-accent text-white" : "bg-input-bg text-t-muted"}`}>1</div>
                    <div className={`w-5 sm:w-8 h-1 ${step >= 2 ? "bg-accent" : "bg-input-bg"}`}></div>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${step >= 2 ? "bg-accent text-white" : "bg-input-bg text-t-muted"}`}>2</div>
                    <div className={`w-5 sm:w-8 h-1 ${step >= 3 ? "bg-accent" : "bg-input-bg"}`}></div>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${step >= 3 ? "bg-accent text-white" : "bg-input-bg text-t-muted"}`}>3</div>
                </div>
            </header>

            {/* STEP 1: Select Student */}
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="glass-card p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                            <h3 className="text-xl font-bold text-t-primary flex items-center gap-2">
                                <User className="w-5 h-5 text-accent" />
                                生徒を選択
                            </h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t-secondary" />
                                <input
                                    type="text"
                                    placeholder="名前や曲名で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:border-accent outline-none"
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-t-muted">読み込み中...</div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-8 text-center text-t-muted">
                                {searchQuery ? "一致する生徒が見つかりません" : "生徒データがありません"}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredStudents.map((student) => {
                                    const activePiece = student.pieces.find((p) => p.status === "active");
                                    return (
                                        <button
                                            key={student.id}
                                            onClick={() => handleStudentSelect(student)}
                                            className="group p-4 rounded-xl text-left bg-card-solid border border-card-border hover:bg-accent-bg-hover hover:border-accent transition-all duration-200"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${student.color || "bg-pink-500"}`}
                                                >
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-t-primary group-hover:text-accent transition-colors">{student.name}</p>
                                                    <p className="text-xs text-t-secondary">{student.lessonDay || "レッスン日未設定"}</p>
                                                </div>
                                            </div>
                                            {activePiece ? (
                                                <div className="flex items-center gap-1.5 text-sm text-t-secondary bg-background/50 p-2 rounded-lg">
                                                    <Music className="w-3.5 h-3.5 text-accent" />
                                                    <span className="truncate">{activePiece.title}</span>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-t-muted pl-1">練習曲なし</div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STEP 2: Select Template & Edit */}
            {step === 2 && selectedStudent && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setStep(1)} className="p-2 hover:bg-card-hover rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-t-secondary" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${selectedStudent.color || "bg-pink-500"}`}
                            >
                                {selectedStudent.name.charAt(0)}
                            </div>
                            <h3 className="text-xl font-bold text-t-primary">{selectedStudent.name}さんの報告を作成</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Templates */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-t-primary flex items-center gap-2">
                                <Quote className="w-4 h-4 text-accent" />
                                テンプレートを選択
                            </h4>
                            <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => setSelectedTemplate(template)}
                                        className={`w-full p-4 rounded-xl text-left border transition-all duration-200 relative overflow-hidden ${selectedTemplate?.id === template.id
                                            ? "bg-accent-bg border-accent ring-1 ring-accent shadow-md"
                                            : "bg-card-solid border-card-border hover:bg-white/80"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${template.color}`}>
                                                {template.label}
                                            </span>
                                            {selectedTemplate?.id === template.id && <Check className="w-4 h-4 text-accent" />}
                                        </div>
                                        <p className="font-bold text-sm text-t-primary mb-1">{template.title}</p>
                                        <p className="text-xs text-t-secondary line-clamp-2">{template.text}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right: Custom Inputs */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-t-primary flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-accent" />
                                内容をカスタマイズ
                            </h4>
                            <div className="glass-card p-6 space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-t-secondary flex items-center justify-between">
                                        良かった点
                                        <button onClick={() => handleShuffle("goodPoints")} className="text-xs text-accent hover:underline flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />ランダム入力
                                        </button>
                                    </label>
                                    <input
                                        type="text"
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value)}
                                        className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:border-accent outline-none transition-colors"
                                        placeholder="例: リズムが安定していました"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-t-secondary flex items-center justify-between">
                                        次回の目標
                                        <button onClick={() => handleShuffle("nextGoals")} className="text-xs text-accent hover:underline flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />ランダム入力
                                        </button>
                                    </label>
                                    <input
                                        type="text"
                                        value={nextGoal}
                                        onChange={(e) => setNextGoal(e.target.value)}
                                        className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:border-accent outline-none transition-colors"
                                        placeholder="例: 強弱記号を意識しましょう"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-t-secondary flex items-center justify-between">
                                        アドバイス
                                        <span className="text-xs text-t-muted">(必要な場合のみ)</span>
                                        <button onClick={() => handleShuffle("advice")} className="text-xs text-accent hover:underline flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />ランダム入力
                                        </button>
                                    </label>
                                    <input
                                        type="text"
                                        value={adviceText}
                                        onChange={(e) => setAdviceText(e.target.value)}
                                        className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:border-accent outline-none transition-colors"
                                        placeholder="例: 片手練習を取り入れましょう"
                                    />
                                </div>

                                <div className="pt-4 border-t border-card-border">
                                    <button
                                        onClick={handleGoToPreview}
                                        disabled={!selectedTemplate}
                                        className="w-full py-3 bg-accent text-white rounded-xl font-bold shadow-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                                    >
                                        プレビューへ進む
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: Preview */}
            {step === 3 && selectedStudent && selectedTemplate && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setStep(2)} className="p-2 hover:bg-card-hover rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-t-secondary" />
                        </button>
                        <h3 className="text-xl font-bold text-t-primary">メッセージの確認</h3>
                    </div>

                    <div className="glass-card p-1">
                        <div className="bg-card-solid/50 p-6 rounded-t-xl border-b border-card-border">
                            <h4 className="font-bold text-center text-t-primary mb-1">レッスン報告</h4>
                            <p className="text-center text-xs text-t-secondary">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div className="p-8">
                            <textarea
                                value={editableMessage}
                                onChange={(e) => setEditableMessage(e.target.value)}
                                className="w-full bg-white p-6 rounded-2xl shadow-sm border border-border/50 text-t-primary leading-relaxed resize-none focus:border-accent outline-none min-h-[250px]"
                                rows={10}
                            />
                        </div>
                        <div className="p-6 bg-card-solid/30 rounded-b-xl border-t border-card-border flex flex-col items-center gap-4">
                            <button
                                onClick={handleCopy}
                                className={`w-full py-4 rounded-xl font-bold shadow transition-all flex items-center justify-center gap-2 text-lg ${copied
                                    ? "bg-emerald-500 text-white"
                                    : "bg-accent text-white hover:bg-accent-hover"
                                    }`}
                            >
                                {copied ? <><Check className="w-6 h-6" />コピーしました！</> : <><Copy className="w-6 h-6" />コピーする</>}
                            </button>
                            <p className="text-xs text-t-muted">
                                コピーしたメッセージをLINEやメールに貼り付けて送信してください
                            </p>
                        </div>
                    </div>

                    <div className="text-center">
                        <button onClick={() => setStep(1)} className="text-t-secondary hover:text-accent underline text-sm">
                            最初からやり直す
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
