"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Music, Sparkles, Plus, X, Pencil, Trash2, History, FileDown, Bell, Cake, AlertCircle } from "lucide-react";
import { jsPDF } from "jspdf";
import { getStudents, Student } from "../actions/studentActions";
import { getTemplates, saveTemplate, updateTemplate, deleteTemplate, getReportHistory, saveReportHistory, ReportTemplate, ReportHistory } from "../actions/reportActions";
import { getTuitionPayments, TuitionPayment } from "../actions/financeActions";

type TabType = "report" | "history" | "notifications" | "invoice";

export default function ReportsView() {
    const [students, setStudents] = useState<Student[]>([]);
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
    const [customText, setCustomText] = useState("");
    const [nextGoal, setNextGoal] = useState("");
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("report");

    // Template editing
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);

    // History
    const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Notifications
    const [unpaidStudents, setUnpaidStudents] = useState<{ name: string; studentId: number }[]>([]);
    const [birthdays, setBirthdays] = useState<{ name: string; date: string; daysUntil: number }[]>([]);

    // Invoice
    const [invoiceStudent, setInvoiceStudent] = useState<Student | null>(null);
    const [invoiceAmount, setInvoiceAmount] = useState("10000");
    const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [studentData, templateData] = await Promise.all([
            getStudents(),
            getTemplates(),
        ]);
        setStudents(studentData);
        setTemplates(templateData);
        if (templateData.length > 0) setSelectedTemplate(templateData[0]);
    };

    useEffect(() => {
        if (activeTab === "history") loadHistory();
        if (activeTab === "notifications") loadNotifications();
    }, [activeTab]);

    const loadHistory = async () => {
        setLoadingHistory(true);
        const history = await getReportHistory();
        setReportHistory(history);
        setLoadingHistory(false);
    };

    const loadNotifications = async () => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Check unpaid tuition
        const payments = await getTuitionPayments(currentYear, currentMonth);
        const allStudents = await getStudents();

        const paidIds = new Set(payments.filter((p) => p.paid).map((p) => p.studentId));
        const unpaid = allStudents.filter((s) => !paidIds.has(s.id)).map((s) => ({ name: s.name, studentId: s.id }));
        setUnpaidStudents(unpaid);

        // Check birthdays this month
        const bdays = allStudents
            .filter((s) => s.birthDate)
            .map((s) => {
                const bday = new Date(s.birthDate!);
                const thisYearBday = new Date(currentYear, bday.getMonth(), bday.getDate());
                const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return { name: s.name, date: `${bday.getMonth() + 1}/${bday.getDate()}`, daysUntil };
            })
            .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 30)
            .sort((a, b) => a.daysUntil - b.daysUntil);
        setBirthdays(bdays);
    };

    const generateMessage = () => {
        if (!selectedStudent || !selectedTemplate) return "生徒とテンプレートを選択してください";

        let message = selectedTemplate.text;
        const activePiece = selectedStudent.pieces.find((p) => p.status === "active");
        const pieceTitle = activePiece ? activePiece.title : "練習曲";

        message = message.replace("{曲名}", pieceTitle);
        message = message.replace("{良かった点}", customText || "リズム感");
        message = message.replace("{次回の目標}", nextGoal || "表現力");
        message = message.replace("{アドバイス}", customText || "ゆっくり片手ずつ練習してみてください");
        return message;
    };

    const handleCopy = async () => {
        if (!selectedStudent || !selectedTemplate) return;
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
            templateLabel: selectedTemplate.label,
        });
    };

    const handleSaveTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const templateData = {
            label: formData.get("label") as string,
            text: formData.get("text") as string,
        };

        if (editingTemplate && editingTemplate.isCustom) {
            await updateTemplate({ ...editingTemplate, ...templateData });
        } else {
            await saveTemplate(templateData);
        }

        await loadData();
        setIsTemplateModalOpen(false);
        setEditingTemplate(null);
    };

    const handleDeleteTemplate = async (templateId: number) => {
        if (!confirm("このテンプレートを削除しますか？")) return;
        await deleteTemplate(templateId);
        await loadData();
    };

    const generateInvoicePDF = () => {
        if (!invoiceStudent) return;

        const doc = new jsPDF();
        const now = new Date();

        // Header
        doc.setFontSize(24);
        doc.text("請求書", 105, 30, { align: "center" });

        // Date
        doc.setFontSize(10);
        doc.text(`発行日: ${now.toLocaleDateString("ja-JP")}`, 150, 50);

        // Student info
        doc.setFontSize(14);
        doc.text(`${invoiceStudent.name} 様`, 20, 70);

        // Line
        doc.line(20, 80, 190, 80);

        // Details
        doc.setFontSize(12);
        doc.text("項目", 30, 95);
        doc.text("金額", 150, 95);
        doc.line(20, 100, 190, 100);

        doc.text(`${invoiceMonth}月分 月謝`, 30, 115);
        doc.text(`¥${parseInt(invoiceAmount).toLocaleString()}`, 150, 115);

        doc.line(20, 125, 190, 125);

        // Total
        doc.setFontSize(14);
        doc.text("合計", 30, 145);
        doc.text(`¥${parseInt(invoiceAmount).toLocaleString()}`, 150, 145);

        // Footer
        doc.setFontSize(10);
        doc.text("※ 上記金額をお振込みにてお支払いください。", 20, 180);

        doc.save(`請求書_${invoiceStudent.name}_${invoiceMonth}月.pdf`);
    };

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-3xl font-bold text-gradient mb-2">レッスン報告</h2>
                <p className="text-slate-400">メッセージ生成・履歴・通知・請求書</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit flex-wrap">
                <button onClick={() => setActiveTab("report")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium ${activeTab === "report" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <Sparkles className="w-4 h-4" />報告作成
                </button>
                <button onClick={() => setActiveTab("history")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium ${activeTab === "history" ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <History className="w-4 h-4" />送信履歴
                </button>
                <button onClick={() => setActiveTab("notifications")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium ${activeTab === "notifications" ? "bg-amber-500/20 text-amber-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <Bell className="w-4 h-4" />通知
                    {(unpaidStudents.length > 0 || birthdays.length > 0) && <span className="w-2 h-2 bg-rose-500 rounded-full" />}
                </button>
                <button onClick={() => setActiveTab("invoice")} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium ${activeTab === "invoice" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <FileDown className="w-4 h-4" />請求書
                </button>
            </div>

            {activeTab === "report" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        {/* Student selector */}
                        <div className="glass-card p-6">
                            <label className="block text-sm font-medium text-slate-400 mb-3">生徒を選択</label>
                            {students.length === 0 ? (
                                <p className="text-slate-500 text-sm">生徒データがありません</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
                                    {students.map((student) => {
                                        const activePiece = student.pieces.find((p) => p.status === "active");
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

                        {/* Template selector */}
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-slate-400">テンプレートを選択</label>
                                <button onClick={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                                    <Plus className="w-3 h-3" />新規作成
                                </button>
                            </div>
                            <div className="space-y-2">
                                {templates.map((template) => (
                                    <div key={template.id} className={`p-4 rounded-xl text-left flex items-center gap-2 ${selectedTemplate?.id === template.id ? "bg-violet-500/20 border border-violet-500/30" : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"}`}>
                                        <button onClick={() => setSelectedTemplate(template)} className="flex-1 text-left">
                                            <p className="font-medium flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-violet-400" />
                                                {template.label}
                                                {template.isCustom && <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full">カスタム</span>}
                                            </p>
                                        </button>
                                        {template.isCustom && (
                                            <div className="flex gap-1">
                                                <button onClick={() => { setEditingTemplate(template); setIsTemplateModalOpen(true); }} className="p-1.5 hover:bg-slate-700 rounded-lg"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                                                <button onClick={() => handleDeleteTemplate(template.id)} className="p-1.5 hover:bg-rose-500/20 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Custom inputs */}
                        <div className="glass-card p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">今日良かった点</label>
                                <input type="text" value={customText} onChange={(e) => setCustomText(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600" placeholder="例: テンポが安定していた" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">次回の目標</label>
                                <input type="text" value={nextGoal} onChange={(e) => setNextGoal(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600" placeholder="例: 表現力を意識する" />
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="glass-card p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">プレビュー</h3>
                            <button onClick={handleCopy} disabled={!selectedStudent || !selectedTemplate} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${copied ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"}`}>
                                {copied ? <><Check className="w-4 h-4" />コピーしました</> : <><Copy className="w-4 h-4" />コピー</>}
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-5 whitespace-pre-wrap text-slate-300 leading-relaxed">{generateMessage()}</div>
                        <p className="text-sm text-slate-500 mt-4 text-center">コピーしたメッセージをLINEに貼り付けて送信してください</p>
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="glass-card">
                    <div className="p-5 border-b border-slate-800">
                        <h3 className="font-semibold text-lg">送信履歴</h3>
                    </div>
                    {loadingHistory ? (
                        <div className="p-8 text-center text-slate-500">読み込み中...</div>
                    ) : reportHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">送信履歴はありません</div>
                    ) : (
                        <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                            {reportHistory.map((record) => (
                                <div key={record.id} className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-medium">{record.studentName}</p>
                                        <span className="text-sm text-slate-500">{record.date}</span>
                                    </div>
                                    <p className="text-xs text-violet-400 mb-2">{record.templateLabel}</p>
                                    <p className="text-sm text-slate-400 whitespace-pre-wrap line-clamp-3">{record.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "notifications" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card">
                        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-rose-500/10 rounded-lg"><AlertCircle className="w-5 h-5 text-rose-400" /></div>
                            <div>
                                <h3 className="font-semibold">未払い月謝</h3>
                                <p className="text-sm text-slate-500">{new Date().getMonth() + 1}月分</p>
                            </div>
                        </div>
                        {unpaidStudents.length === 0 ? (
                            <div className="p-8 text-center text-emerald-400">すべて支払い済みです ✓</div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {unpaidStudents.map((s) => (
                                    <div key={s.studentId} className="p-4 flex items-center gap-3">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full" />
                                        <span>{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-card">
                        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
                            <div className="p-2 bg-pink-500/10 rounded-lg"><Cake className="w-5 h-5 text-pink-400" /></div>
                            <div>
                                <h3 className="font-semibold">今月の誕生日</h3>
                                <p className="text-sm text-slate-500">30日以内</p>
                            </div>
                        </div>
                        {birthdays.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">今月の誕生日はありません</div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {birthdays.map((b, i) => (
                                    <div key={i} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Cake className="w-4 h-4 text-pink-400" />
                                            <span>{b.name}</span>
                                        </div>
                                        <span className="text-sm text-pink-400">{b.date} {b.daysUntil === 0 ? "🎉 今日！" : `(${b.daysUntil}日後)`}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "invoice" && (
                <div className="glass-card p-6 max-w-md">
                    <h3 className="font-semibold text-lg mb-6">PDF請求書を生成</h3>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">生徒を選択</label>
                            <select value={invoiceStudent?.id || ""} onChange={(e) => setInvoiceStudent(students.find((s) => s.id === parseInt(e.target.value)) || null)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                <option value="">選択してください</option>
                                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">対象月</label>
                            <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(parseInt(e.target.value))} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => <option key={m} value={m}>{m}月</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">金額</label>
                            <input type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                        </div>
                        <button onClick={generateInvoicePDF} disabled={!invoiceStudent} className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                            <FileDown className="w-5 h-5" />PDFをダウンロード
                        </button>
                    </div>
                </div>
            )}

            {/* Template Modal */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => setIsTemplateModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingTemplate ? "テンプレートを編集" : "新規テンプレート"}</h3>
                        <form onSubmit={handleSaveTemplate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">テンプレート名</label>
                                <input name="label" required defaultValue={editingTemplate?.label} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 発表会に向けて" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">テンプレート内容</label>
                                <textarea name="text" rows={8} required defaultValue={editingTemplate?.text} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="利用可能な変数: {曲名}, {良かった点}, {次回の目標}, {アドバイス}" />
                                <p className="text-xs text-slate-500 mt-2">変数: {"{曲名}"}, {"{良かった点}"}, {"{次回の目標}"}, {"{アドバイス}"}</p>
                            </div>
                            <button type="submit" className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg">{editingTemplate ? "更新する" : "保存する"}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
