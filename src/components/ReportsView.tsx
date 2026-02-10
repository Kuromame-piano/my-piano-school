"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Music, Sparkles, Plus, X, Pencil, Trash2, History } from "lucide-react";
import { getStudents, Student } from "../actions/studentActions";

import { getReportHistory, saveReportHistory, ReportHistory } from "../actions/reportActions";

type TabType = "report" | "history";

export default function ReportsView() {
    const [students, setStudents] = useState<Student[]>([]);

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedBody, setSelectedBody] = useState<string>("");
    const [selectedClosing, setSelectedClosing] = useState<string>("");
    const [activeTab, setActiveTab] = useState<TabType>("report");

    // Report fields
    const [customText, setCustomText] = useState("");
    const [nextGoal, setNextGoal] = useState("");
    const [adviceText, setAdviceText] = useState("");
    const [copied, setCopied] = useState(false);

    // Auto-generated suggestions
    const SUGGESTIONS = {
        goodPoints: [
            "リズム感が安定してきました",
            "譜読みが早くなりました",
            "指の形がとても綺麗です",
            "強弱の表現が豊かになりました",
            "集中して練習に取り組めました",
            "難しいパッセージもスムーズに弾けました",
            "左手の伴奏が安定してきました",
            "ペダリングが上手になりました",
            "テンポをキープできています",
            "全体を通して流れが良くなりました"
        ],
        nextGoals: [
            "指の形を意識しましょう",
            "強弱記号に注意しましょう",
            "スラーとスタッカートの弾き分けを大切に",
            "手首の力を抜いて弾きましょう",
            "テンポを一定に保つ練習をしましょう",
            "左手の音量バランスに気をつけましょう",
            "フレーズの終わりを丁寧に",
            "休符しっかりと数えましょう",
            "指番号を守って練習しましょう",
            "暗譜に挑戦してみましょう"
        ],
        advice: [
            "片手ずつの練習を大切に",
            "メトロノームを使って練習しましょう",
            "録音して自分の音を聴いてみましょう",
            "難しい箇所はリズム変奏で練習すると良いです",
            "最初はゆっくり、徐々にテンポを上げましょう",
            "楽譜に書き込みをして注意点を忘れないように",
            "練習の前に指の体操をすると良いですよ",
            "毎日少しずつでもピアノに触れましょう",
            "好きな曲を聴いてイメージを膨らませましょう",
            "リラックスして演奏することを心がけましょう"
        ]
    };

    const getRandomSuggestion = (category: keyof typeof SUGGESTIONS) => {
        const list = SUGGESTIONS[category];
        const randomIndex = Math.floor(Math.random() * list.length);
        return list[randomIndex];
    };

    const handleShuffle = (category: keyof typeof SUGGESTIONS) => {
        const suggestion = getRandomSuggestion(category);
        if (category === "goodPoints") setCustomText(suggestion);
        if (category === "nextGoals") setNextGoal(suggestion);
        if (category === "advice") setAdviceText(suggestion);
    };

    // Body sentences (10 patterns)
    const BODY_SENTENCES = [
        "{曲名}、順調に進んでいます。特に{良かった点}が素晴らしかったです。",
        "今日は{曲名}に集中して取り組みました。{良かった点}がとても良くなっていて、日々の練習の成果が出ていますね！",
        "{曲名}、少し難しい箇所がありましたが、焦らず一緒に進めていきましょう。{アドバイス}",
        "{曲名}の練習を通して、大きな成長が見られました！特に{良かった点}の上達が素晴らしいです。",
        "{曲名}、もう少しで仕上がりそうですね。{良かった点}が特に良くなってきました。",
        "今日から{曲名}に挑戦しましたね。初めてでしたが、{良かった点}が既にできていて素晴らしかったです。",
        "{曲名}の練習で、リズム感がとても良くなってきましたね！{良かった点}も素晴らしかったです。",
        "{曲名}、表現力が格段にアップしていますね！{良かった点}の表現が特に印象的でした。",
        "今日は基礎練習を中心に行いました。{良かった点}がしっかりできていて、着実に力がついています。",
        "発表会で演奏する{曲名}の練習を進めました。{良かった点}が特に良く、本番が楽しみです！"
    ];

    // Closing sentences (10 patterns)
    const CLOSING_SENTENCES = [
        "次回も{次回の目標}を中心に練習してみてください。引き続きよろしくお願いいたします！",
        "次回のレッスンまでに{次回の目標}を意識して練習してみてくださいね。",
        "次回は{次回の目標}から始めますね。引き続きよろしくお願いいたします！",
        "この調子で、次は{次回の目標}にチャレンジしてみましょう。楽しみにしています！",
        "仕上げとして{次回の目標}を意識して、丁寧に練習してみてください。",
        "次回は{次回の目標}を中心に進めていきましょう！",
        "引き続き{次回の目標}に取り組んでいきましょう。頑張ってください！",
        "次回は{次回の目標}を意識して、さらに深みのある演奏を目指しましょう。",
        "次回は{曲名}を使って{次回の目標}を確認していきますね。",
        "{次回の目標}を中心に仕上げていきましょう。応援しています！"
    ];

    // Template editing - removed
    // History
    const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const studentData = await getStudents();
        setStudents(studentData);
        // Default selections
        if (BODY_SENTENCES.length > 0) setSelectedBody(BODY_SENTENCES[0]);
        if (CLOSING_SENTENCES.length > 0) setSelectedClosing(CLOSING_SENTENCES[0]);
    };

    useEffect(() => {
        if (activeTab === "history") loadHistory();
    }, [activeTab]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        const history = await getReportHistory();
        setReportHistory(history);
        setLoadingHistory(false);
    };

    const generateMessage = () => {
        if (!selectedStudent) return "生徒を選択してください";
        if (!selectedBody || !selectedClosing) return "文章パターンを選択してください";

        let message = "本日のレッスンもお疲れ様でした！\n\n" + selectedBody + "\n\n" + selectedClosing;
        const activePiece = selectedStudent.pieces.find((p) => p.status === "active");
        const pieceTitle = activePiece ? activePiece.title : "練習曲";

        message = message.replace(/{曲名}/g, pieceTitle);
        message = message.replace(/{良かった点}/g, customText || getRandomSuggestion("goodPoints"));
        message = message.replace(/{次回の目標}/g, nextGoal || getRandomSuggestion("nextGoals"));
        message = message.replace(/{アドバイス}/g, adviceText || getRandomSuggestion("advice"));
        return message;
    };

    const handleCopy = async () => {
        if (!selectedStudent) return;
        const message = generateMessage();
        navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);

        // Save to history
        await saveReportHistory({
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            date: new Date().toLocaleString("ja-JP"),
            message,
            templateLabel: "カスタム報告",
        });
    };

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-3xl font-bold text-gradient mb-2">レッスン報告</h2>
                <p className="text-gray-500">メッセージ生成・履歴</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-card-solid rounded-xl w-fit flex-wrap border border-card-border">
                <button onClick={() => setActiveTab("report")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium ${activeTab === "report" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <Sparkles className="w-4 h-4" />報告作成
                </button>
                <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium ${activeTab === "history" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <History className="w-4 h-4" />送信履歴
                </button>
            </div>

            {activeTab === "report" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        {/* Student selector */}
                        <div className="glass-card p-6">
                            <label className="block text-sm font-medium text-t-secondary mb-3">生徒を選択</label>
                            {students.length === 0 ? (
                                <p className="text-t-muted text-sm">生徒データがありません</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                    {students.map((student) => {
                                        const activePiece = student.pieces.find((p) => p.status === "active");
                                        return (
                                            <button key={student.id} onClick={() => setSelectedStudent(student)} className={`p-4 rounded-xl text-left ${selectedStudent?.id === student.id ? "bg-accent-bg border border-accent" : "bg-card-solid border border-card-border hover:bg-accent-bg-hover"}`}>
                                                <p className="font-medium text-t-primary">{student.name}</p>
                                                {activePiece && (
                                                    <p className="text-sm text-t-secondary flex items-center gap-1.5 mt-1"><Music className="w-3.5 h-3.5" />{activePiece.title}</p>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Template selector replacement: Modular selectors */}
                        <div className="glass-card p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-3">1. 本文を選択</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {BODY_SENTENCES.map((text, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedBody(text)}
                                            className={`w-full p-3 rounded-xl text-left text-sm transition-colors ${selectedBody === text ? "bg-accent-bg border border-accent ring-1 ring-accent" : "bg-card-solid border border-card-border hover:bg-accent-bg-hover"}`}
                                        >
                                            {text}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-3">2. 締めを選択</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {CLOSING_SENTENCES.map((text, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedClosing(text)}
                                            className={`w-full p-3 rounded-xl text-left text-sm transition-colors ${selectedClosing === text ? "bg-accent-bg border border-accent ring-1 ring-accent" : "bg-card-solid border border-card-border hover:bg-accent-bg-hover"}`}
                                        >
                                            {text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Custom inputs */}
                        <div className="glass-card p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">今日良かった点</label>
                                <div className="flex gap-2">
                                    <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)} className="flex-1 px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text placeholder:text-t-placeholder focus:border-input-border-focus" placeholder="例: テンポが安定していた" />
                                    {/* Using direct colors for sparkle button to keep it distinctive or use accent */}
                                    <button onClick={() => handleShuffle("goodPoints")} className="p-3 bg-accent-bg hover:bg-accent-bg-hover text-accent rounded-xl transition-colors" title="ランダムに入力">
                                        <Sparkles className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">次回の目標</label>
                                <div className="flex gap-2">
                                    <input type="text" value={nextGoal} onChange={(e) => setNextGoal(e.target.value)} className="flex-1 px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text placeholder:text-t-placeholder focus:border-input-border-focus" placeholder="例: 表現力を意識する" />
                                    <button onClick={() => handleShuffle("nextGoals")} className="p-3 bg-accent-bg hover:bg-accent-bg-hover text-accent rounded-xl transition-colors" title="ランダムに入力">
                                        <Sparkles className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">アドバイス</label>
                                <div className="flex gap-2">
                                    <input type="text" value={adviceText} onChange={(e) => setAdviceText(e.target.value)} className="flex-1 px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text placeholder:text-t-placeholder focus:border-input-border-focus" placeholder="例: 片手ずつ練習しましょう" />
                                    <button onClick={() => handleShuffle("advice")} className="p-3 bg-accent-bg hover:bg-accent-bg-hover text-accent rounded-xl transition-colors" title="ランダムに入力">
                                        <Sparkles className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="glass-card p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg text-t-primary">プレビュー</h3>
                            <button onClick={handleCopy} disabled={!selectedStudent || !selectedBody || !selectedClosing} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${copied ? "bg-success-bg text-emerald-700" : "bg-accent-bg text-accent hover:bg-accent-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"}`}>
                                {copied ? <><Check className="w-4 h-4" />コピーしました</> : <><Copy className="w-4 h-4" />コピー</>}
                            </button>
                        </div>
                        <div className="flex-1 bg-card-solid border border-card-border rounded-xl p-5 whitespace-pre-wrap text-t-primary leading-relaxed">{generateMessage()}</div>
                        <p className="text-sm text-t-muted mt-4 text-center">コピーしたメッセージをLINEに貼り付けて送信してください</p>
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="glass-card">
                    <div className="p-5 border-b border-card-border">
                        <h3 className="font-semibold text-lg text-t-primary">送信履歴</h3>
                    </div>
                    {loadingHistory ? (
                        <div className="p-8 text-center text-t-muted">読み込み中...</div>
                    ) : reportHistory.length === 0 ? (
                        <div className="p-8 text-center text-t-muted">送信履歴はありません</div>
                    ) : (
                        <div className="divide-y divide-card-border max-h-[600px] overflow-y-auto">
                            {reportHistory.map((record) => (
                                <div key={record.id} className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-medium text-t-primary">{record.studentName}</p>
                                        <span className="text-sm text-t-secondary">{record.date}</span>
                                    </div>
                                    <p className="text-xs text-accent mb-2">{record.templateLabel}</p>
                                    <p className="text-sm text-t-secondary whitespace-pre-wrap line-clamp-3">{record.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}


        </div>
    );
}
