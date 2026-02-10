"use client";

import { useState, useEffect } from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, Download, X, Pencil, Trash2, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, BarChart3, Receipt, Users, Calendar, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
    getTransactions,
    getTransactionsByMonth,

    getMonthlySummary,
    getAnnualSummary,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getLessonPayments,
    saveLessonPayment,
    getTuitionPayments,
    saveTuitionPayment,
    Transaction,
    LessonPayment,
    TuitionPayment,
} from "../actions/financeActions";
import "jspdf-autotable";
import { getStudents, Student } from "../actions/studentActions";
import { getLessons, CalendarEvent } from "../actions/calendarActions";
import { ChartColors } from "../lib/chartColors";

type TabType = "transactions" | "lessons" | "chart" | "invoice" | "annual";

export default function FinanceView() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>("transactions");
    const [chartData, setChartData] = useState<{ month: string; income: number; expense: number; profit: number }[]>([]);

    // Month selector
    const [selectedDate, setSelectedDate] = useState(new Date());
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [addType, setAddType] = useState<"income" | "expense">("expense");
    const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

    // Invoice
    const [invoiceStudent, setInvoiceStudent] = useState<Student | null>(null);
    const [invoiceAmount, setInvoiceAmount] = useState("10000");
    const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);

    // Annual Report
    const [annualYear, setAnnualYear] = useState(new Date().getFullYear());
    const [annualSummary, setAnnualSummary] = useState<{
        totalIncome: number;
        totalExpense: number;
        expenseByCategory: { category: string; amount: number }[];
        monthlyBreakdown: { month: string; income: number; expense: number }[];
    } | null>(null);

    const loadAnnualSummary = async () => {
        const summary = await getAnnualSummary(annualYear);
        setAnnualSummary(summary);
    };

    // Lesson payments
    const [lessonPayments, setLessonPayments] = useState<LessonPayment[]>([]);
    const [tuitionPayments, setTuitionPayments] = useState<TuitionPayment[]>([]);
    const [monthLessons, setMonthLessons] = useState<CalendarEvent[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lessonViewMode, setLessonViewMode] = useState<"monthly" | "per-lesson">("monthly");

    useEffect(() => {
        const fetchData = async () => {
            const [txData, studentData, summaryData] = await Promise.all([
                getTransactionsByMonth(selectedYear, selectedMonth),
                getStudents(),
                getMonthlySummary(6),
            ]);
            setTransactions(txData);
            setStudents(studentData);
            setChartData(summaryData);
            setChartData(summaryData);
        };
        fetchData();
        if (activeTab === "annual") {
            loadAnnualSummary();
        }
    }, [selectedYear, selectedMonth, activeTab, annualYear]);



    const generateInvoicePDF = async () => {
        if (!invoiceStudent) return;

        try {
            const doc = new jsPDF();

            // Load Japanese font (TTF) from local
            const fontBytes = await fetch("/fonts/SawarabiGothic-Regular.ttf").then(res => res.arrayBuffer());
            const fontBase64 = btoa(
                new Uint8Array(fontBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            doc.addFileToVFS("SawarabiGothic-Regular.ttf", fontBase64);
            doc.addFont("SawarabiGothic-Regular.ttf", "SawarabiGothic", "normal");
            doc.setFont("SawarabiGothic");

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

            doc.text(`${invoiceMonth}月分 レッスン料`, 30, 115);
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
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("PDF生成に失敗しました。詳細: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const generateAnnualReportPDF = async () => {
        if (!annualSummary) return;

        try {
            const doc = new jsPDF();

            // Load Japanese font (TTF) from local
            const fontBytes = await fetch("/fonts/SawarabiGothic-Regular.ttf").then(res => res.arrayBuffer());

            const fontBase64 = btoa(
                new Uint8Array(fontBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            doc.addFileToVFS("SawarabiGothic-Regular.ttf", fontBase64);
            doc.addFont("SawarabiGothic-Regular.ttf", "SawarabiGothic", "normal");
            doc.setFont("SawarabiGothic");

            doc.setFontSize(24);
            doc.text(`${annualYear}年 年間収支レポート`, 105, 30, { align: "center" });

            doc.setFontSize(14);
            doc.text(`総収入: ¥${annualSummary.totalIncome.toLocaleString()}`, 20, 50);
            doc.text(`総支出: ¥${annualSummary.totalExpense.toLocaleString()}`, 20, 60);
            doc.text(`収支差額: ¥${(annualSummary.totalIncome - annualSummary.totalExpense).toLocaleString()}`, 20, 70);

            // Monthly Breakdown Table
            doc.text("月別推移", 20, 90);
            (doc as any).autoTable({
                startY: 95,
                head: [["月", "収入", "支出", "差額"]],
                body: annualSummary.monthlyBreakdown.map(m => [
                    m.month,
                    `¥${m.income.toLocaleString()}`,
                    `¥${m.expense.toLocaleString()}`,
                    `¥${(m.income - m.expense).toLocaleString()}`
                ]),
                styles: { font: "SawarabiGothic" },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 20;

            // Expense Breakdown Table
            doc.text("経費内訳", 20, finalY);
            (doc as any).autoTable({
                startY: finalY + 5,
                head: [["カテゴリ", "金額"]],
                body: annualSummary.expenseByCategory.map(e => [
                    e.category,
                    `¥${e.amount.toLocaleString()}`
                ]),
                styles: { font: "SawarabiGothic" },
            });

            doc.save(`年間収支レポート_${annualYear}.pdf`);
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("PDF生成に失敗しました。詳細: " + (error instanceof Error ? error.message : String(error)));
        }
    };



    useEffect(() => {
        if (activeTab === "lessons" && students.length > 0) {
            loadLessonPayments();
        }
    }, [activeTab, selectedYear, selectedMonth, lessonViewMode, students]);

    const loadLessonPayments = async () => {
        setLoadingLessons(true);

        if (lessonViewMode === "monthly") {
            // 月謝制の生徒
            const monthlyStudents = students.filter((s) => !s.archived && s.paymentType === "monthly");
            const tuitionData = await getTuitionPayments(selectedYear, selectedMonth + 1);

            // 各月謝制生徒の支払いレコードを作成
            const merged: TuitionPayment[] = monthlyStudents.map((student) => {
                const existing = tuitionData.find((t) => t.studentId === student.id);
                return existing || {
                    studentId: student.id,
                    studentName: student.name,
                    year: selectedYear,
                    month: selectedMonth + 1,
                    paid: false,
                    amount: student.monthlyFee || 0,
                };
            });
            setTuitionPayments(merged);
        } else {
            // 都度払いの生徒 - カレンダーからレッスン取得
            const startOfMonth = new Date(selectedYear, selectedMonth, 1);
            const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
            const lessons = await getLessons(startOfMonth.toISOString(), endOfMonth.toISOString());
            setMonthLessons(lessons);

            const perLessonStudents = students.filter((s) => !s.archived && s.paymentType === "per-lesson");
            const payments = await getLessonPayments(selectedYear, selectedMonth);

            // カレンダーのレッスンと生徒をマッチング
            const merged: LessonPayment[] = lessons
                .map((lesson) => {
                    // カレンダーイベント名から生徒を探す（部分一致）
                    const student = perLessonStudents.find((s) => lesson.title.includes(s.name) || s.name.includes(lesson.title));
                    if (!student) return null;

                    const lessonDateStr = lesson.start.split("T")[0];
                    const existing = payments.find((p) => p.lessonDate === lessonDateStr && p.studentId === student.id);

                    return existing || {
                        id: Date.now() + Math.random(),
                        studentId: student.id,
                        studentName: student.name,
                        lessonDate: lessonDateStr,
                        amount: student.monthlyFee || 0,
                        paid: false,
                    };
                })
                .filter((p): p is LessonPayment => p !== null);

            setLessonPayments(merged);
        }

        setLoadingLessons(false);
    };

    const handlePrevMonth = () => {
        setSelectedDate(new Date(selectedYear, selectedMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedDate(new Date(selectedYear, selectedMonth + 1, 1));
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    };

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const filteredTransactions = filterType === "all" ? transactions : transactions.filter((t) => t.type === filterType);

    const handleExportCSV = () => {
        const headers = ["日付", "種別", "カテゴリ", "内容", "金額", "生徒名"];
        const rows = transactions.map((t) => [t.date, t.type === "income" ? "収入" : "支出", t.category, t.description, t.type === "income" ? t.amount : -t.amount, t.studentName || ""]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        // BOM付きUTF-8でExcelの文字化けを防ぐ
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `収支_${selectedYear}_${selectedMonth + 1}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleAddOrUpdateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSaving) return; // 二重クリック防止
        setIsSaving(true);

        try {
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);

            const tx: Transaction = {
                id: editingTransaction ? editingTransaction.id : Date.now(),
                type: addType,
                category: formData.get("category") as string,
                description: formData.get("description") as string,
                amount: parseInt(formData.get("amount") as string) || 0,
                date: formData.get("date") as string || new Date().toLocaleDateString("ja-JP"),
                studentName: addType === "income" ? (formData.get("studentName") as string) : undefined,
            };

            if (editingTransaction) {
                await updateTransaction(tx);
            } else {
                await addTransaction(tx);
            }

            // Refresh data
            const updatedTx = await getTransactionsByMonth(selectedYear, selectedMonth);
            setTransactions(updatedTx);
            setIsAddModalOpen(false);
            setEditingTransaction(null);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        if (!confirm("この取引を削除してよろしいですか？")) return;
        await deleteTransaction(id);
        const updatedTx = await getTransactionsByMonth(selectedYear, selectedMonth);
        setTransactions(updatedTx);
    };

    const handleEditTransaction = (tx: Transaction) => {
        setEditingTransaction(tx);
        setAddType(tx.type);
        setIsAddModalOpen(true);
    };

    const handleToggleLessonPayment = async (payment: LessonPayment) => {
        const updated = {
            ...payment,
            paid: !payment.paid,
            paidDate: !payment.paid ? new Date().toLocaleDateString("ja-JP") : undefined,
        };
        await saveLessonPayment(updated);
        await loadLessonPayments();
    };

    const handleToggleTuitionPayment = async (payment: TuitionPayment) => {
        const updated = {
            ...payment,
            paid: !payment.paid,
            paidDate: !payment.paid ? new Date().toLocaleDateString("ja-JP") : undefined,
        };
        await saveTuitionPayment(updated);
        await loadLessonPayments();
    };

    const handleUpdateLessonAmount = async (payment: LessonPayment, newAmount: number) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await saveLessonPayment({ ...payment, amount: newAmount });
            await loadLessonPayments();
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTuitionAmount = async (payment: TuitionPayment, newAmount: number) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await saveTuitionPayment({ ...payment, amount: newAmount });
            await loadLessonPayments();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">レッスン料・経費管理</h2>
                    <p className="text-gray-500">収入と支出を記録・管理</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Month Selector */}
                    <div className="flex items-center gap-2 bg-card-solid p-1.5 rounded-xl border border-card-border">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-accent-bg-hover rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4 text-t-secondary" />
                        </button>
                        <span className="font-medium text-sm min-w-[100px] text-center text-t-primary">{formatMonthYear(selectedDate)}</span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-accent-bg-hover rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4 text-t-secondary" />
                        </button>
                    </div>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-card-solid hover:bg-accent-bg-hover border border-card-border rounded-xl font-medium text-t-primary">
                        <Download className="w-4 h-4" />CSV出力
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setAddType("expense"); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl">
                        <Plus className="w-5 h-5" />記録を追加
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-card-solid rounded-xl w-fit border border-card-border overflow-x-auto max-w-full">
                <button onClick={() => setActiveTab("transactions")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium whitespace-nowrap ${activeTab === "transactions" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <Wallet className="w-4 h-4" />取引一覧
                </button>
                <button onClick={() => setActiveTab("lessons")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium whitespace-nowrap ${activeTab === "lessons" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <Receipt className="w-4 h-4" />レッスン料管理
                </button>
                <button onClick={() => setActiveTab("chart")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium whitespace-nowrap ${activeTab === "chart" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <BarChart3 className="w-4 h-4" />グラフ
                </button>
                <button onClick={() => setActiveTab("invoice")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium whitespace-nowrap ${activeTab === "invoice" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <FileDown className="w-4 h-4" />請求書
                </button>
                <button onClick={() => setActiveTab("annual")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium whitespace-nowrap ${activeTab === "annual" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <FileDown className="w-4 h-4" />年間レポート
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3"><div className="p-2.5 bg-emerald-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-400" /></div><span className="text-sm text-slate-400">{formatMonthYear(selectedDate)}の収入</span></div>
                    <p className="text-2xl font-bold text-emerald-400">¥{totalIncome.toLocaleString()}</p>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3"><div className="p-2.5 bg-rose-500/10 rounded-xl"><TrendingDown className="w-5 h-5 text-rose-400" /></div><span className="text-sm text-slate-400">{formatMonthYear(selectedDate)}の支出</span></div>
                    <p className="text-2xl font-bold text-rose-400">¥{totalExpense.toLocaleString()}</p>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3"><div className="p-2.5 bg-violet-500/10 rounded-xl"><Wallet className="w-5 h-5 text-violet-400" /></div><span className="text-sm text-slate-400">収支</span></div>
                    <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>¥{balance.toLocaleString()}</p>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === "transactions" && (
                <>
                    <div className="flex gap-2">
                        {(["all", "income", "expense"] as const).map((type) => (
                            <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-lg font-medium text-sm ${filterType === type ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                                {type === "all" ? "すべて" : type === "income" ? "収入" : "支出"}
                            </button>
                        ))}
                    </div>

                    <div className="glass-card divide-y divide-pink-100">
                        {filteredTransactions.length === 0 ? (
                            <div className="p-8 text-center text-t-muted">この月の取引はありません</div>
                        ) : (
                            filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                                <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-accent-bg-hover group transition-colors">
                                    <div className={`p-2.5 rounded-xl ${tx.type === "income" ? "bg-emerald-100" : "bg-rose-100"}`}>
                                        {tx.type === "income" ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : <TrendingDown className="w-5 h-5 text-rose-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate text-t-primary">{tx.description}</p>
                                        <p className="text-sm text-t-secondary">{tx.category}{tx.studentName && ` • ${tx.studentName}`}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{tx.type === "income" ? "+" : "-"}¥{tx.amount.toLocaleString()}</p>
                                        <p className="text-xs text-t-muted">{tx.date}</p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditTransaction(tx)} className="p-2 hover:bg-card-border rounded-lg"><Pencil className="w-4 h-4 text-t-secondary" /></button>
                                        <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4 text-rose-600" /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {activeTab === "lessons" && (
                <div className="glass-card">
                    <div className="p-5 border-b border-pink-100">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg text-gray-700">{formatMonthYear(selectedDate)}のレッスン料支払い状況</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {lessonViewMode === "monthly" ? (
                                        <>支払い済み: {tuitionPayments.filter((p) => p.paid).length} / {tuitionPayments.length}件</>
                                    ) : (
                                        <>支払い済み: {lessonPayments.filter((p) => p.paid).length} / {lessonPayments.length}件</>
                                    )}
                                </p>
                            </div>
                            <div className="flex gap-2 p-1 bg-accent-bg rounded-xl">
                                <button
                                    onClick={() => setLessonViewMode("monthly")}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${lessonViewMode === "monthly" ? "bg-accent text-white" : "text-t-secondary hover:bg-accent-bg-hover"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        月謝制
                                    </div>
                                </button>
                                <button
                                    onClick={() => setLessonViewMode("per-lesson")}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${lessonViewMode === "per-lesson" ? "bg-accent text-white" : "text-t-secondary hover:bg-accent-bg-hover"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Receipt className="w-4 h-4" />
                                        都度払い
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    {loadingLessons ? (
                        <div className="p-8 text-center text-gray-400">読み込み中...</div>
                    ) : lessonViewMode === "monthly" ? (
                        // 月謝制の表示
                        tuitionPayments.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">月謝制の生徒はいません</div>
                        ) : (
                            <div className="divide-y divide-pink-100">
                                {tuitionPayments.sort((a, b) => a.studentName.localeCompare(b.studentName)).map((payment, idx) => (
                                    <div key={`${payment.studentId}-${payment.year}-${payment.month}-${idx}`} className="p-4 flex items-center gap-4 hover:bg-pink-50 transition-colors">
                                        <button
                                            onClick={() => handleToggleTuitionPayment(payment)}
                                            disabled={isSaving}
                                            className={`p-2.5 rounded-lg transition-colors ${payment.paid ? "bg-emerald-100 hover:bg-emerald-200" : "bg-gray-100 hover:bg-gray-200"
                                                } ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                        >
                                            {payment.paid ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-t-muted" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${payment.paid ? "text-t-muted line-through" : "text-t-primary"}`}>{payment.studentName}</p>
                                            <p className="text-sm text-t-secondary">月謝 {payment.year}年{payment.month}月分</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-t-secondary">¥</span>
                                                <input
                                                    type="number"
                                                    defaultValue={payment.amount || ""}
                                                    onBlur={(e) => {
                                                        const newAmount = Number(e.target.value) || 0;
                                                        if (newAmount !== payment.amount) {
                                                            handleUpdateTuitionAmount(payment, newAmount);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    disabled={isSaving}
                                                    className={`w-28 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-right font-medium text-input-text focus:outline-none focus:ring-2 focus:ring-accent ${isSaving ? "opacity-50 cursor-not-allowed" : ""
                                                        }`}
                                                    placeholder="金額"
                                                    min="0"
                                                    step="100"
                                                />
                                            </div>
                                            <span className={`text-sm font-medium px-3 py-1.5 rounded-full whitespace-nowrap ${payment.paid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                                }`}>
                                                {payment.paid ? "支払い済み" : "未払い"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // 都度払いの表示
                        lessonPayments.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">この月のレッスンはありません</div>
                        ) : (
                            <div className="divide-y divide-pink-100">
                                {lessonPayments.sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()).map((payment, idx) => (
                                    <div key={`${payment.studentId}-${payment.lessonDate}-${idx}`} className="p-4 flex items-center gap-4 hover:bg-pink-50 transition-colors">
                                        <button
                                            onClick={() => handleToggleLessonPayment(payment)}
                                            disabled={isSaving}
                                            className={`p-2.5 rounded-lg transition-colors ${payment.paid ? "bg-emerald-100 hover:bg-emerald-200" : "bg-gray-100 hover:bg-gray-200"
                                                } ${isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                        >
                                            {payment.paid ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-t-muted" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${payment.paid ? "text-t-muted line-through" : "text-t-primary"}`}>{payment.studentName}</p>
                                            <p className="text-sm text-t-secondary">
                                                {new Date(payment.lessonDate).toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-t-secondary">¥</span>
                                                <input
                                                    type="number"
                                                    defaultValue={payment.amount || ""}
                                                    onBlur={(e) => {
                                                        const newAmount = Number(e.target.value) || 0;
                                                        if (newAmount !== payment.amount) {
                                                            handleUpdateLessonAmount(payment, newAmount);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    disabled={isSaving}
                                                    className={`w-28 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-right font-medium text-input-text focus:outline-none focus:ring-2 focus:ring-accent ${isSaving ? "opacity-50 cursor-not-allowed" : ""
                                                        }`}
                                                    placeholder="金額"
                                                    min="0"
                                                    step="100"
                                                />
                                            </div>
                                            <span className={`text-sm font-medium px-3 py-1.5 rounded-full whitespace-nowrap ${payment.paid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                                }`}>
                                                {payment.paid ? "支払い済み" : "未払い"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {activeTab === "chart" && (
                <div className="glass-card p-6">
                    <h3 className="font-semibold text-lg mb-6 text-t-primary">過去6ヶ月の収支推移</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={ChartColors.grid} />
                                <XAxis dataKey="month" stroke={ChartColors.axis} />
                                <YAxis stroke={ChartColors.axis} tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: ChartColors.tooltip.bg, border: `1px solid ${ChartColors.tooltip.border}`, borderRadius: "12px", color: ChartColors.tooltip.text }}
                                    labelStyle={{ color: ChartColors.tooltip.text }}
                                    formatter={(value) => [`¥${Number(value).toLocaleString()}`, ""]}
                                />
                                <Legend />
                                <Bar dataKey="income" name="収入" fill={ChartColors.success} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="支出" fill={ChartColors.danger} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeTab === "invoice" && (
                <div className="glass-card p-6 max-w-md">
                    <h3 className="font-semibold text-lg mb-6 text-gray-700">PDF請求書を生成</h3>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-t-secondary mb-2">生徒を選択</label>
                            <select value={invoiceStudent?.id || ""} onChange={(e) => setInvoiceStudent(students.find((s) => s.id === parseInt(e.target.value)) || null)} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus">
                                <option value="">選択してください</option>
                                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-t-secondary mb-2">対象月</label>
                            <select value={invoiceMonth} onChange={(e) => setInvoiceMonth(parseInt(e.target.value))} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => <option key={m} value={m}>{m}月</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-t-secondary mb-2">金額</label>
                            <input type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" />
                        </div>
                        <button onClick={generateInvoicePDF} disabled={!invoiceStudent} className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                            <FileDown className="w-5 h-5" />PDFをダウンロード
                        </button>
                    </div>
                </div>
            )}

            {/* Annual Report Tab */}
            {activeTab === "annual" && annualSummary && (
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-t-primary">年間収支レポート（確定申告用）</h3>
                        <div className="flex gap-4">
                            <select value={annualYear} onChange={(e) => setAnnualYear(parseInt(e.target.value))} className="px-4 py-2 bg-input-bg border border-input-border rounded-lg text-t-primary">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                            <button onClick={generateAnnualReportPDF} className="px-4 py-2 premium-gradient rounded-lg text-white font-medium shadow-lg">
                                PDFダウンロード
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-4 bg-emerald-100 rounded-xl border border-emerald-200">
                            <p className="text-sm text-emerald-700 mb-1">総収入</p>
                            <p className="text-2xl font-bold text-gray-700">¥{annualSummary.totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-rose-100 rounded-xl border border-rose-200">
                            <p className="text-sm text-rose-700 mb-1">総支出</p>
                            <p className="text-2xl font-bold text-gray-700">¥{annualSummary.totalExpense.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-blue-100 rounded-xl border border-blue-200">
                            <p className="text-sm text-blue-700 mb-1">収支差額</p>
                            <p className="text-2xl font-bold text-gray-700">¥{(annualSummary.totalIncome - annualSummary.totalExpense).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-semibold mb-4 text-gray-700">月別推移</h4>
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-600 border-b border-pink-200">
                                    <tr>
                                        <th className="pb-2">月</th>
                                        <th className="pb-2">収入</th>
                                        <th className="pb-2">支出</th>
                                        <th className="pb-2">差額</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-pink-100">
                                    {annualSummary.monthlyBreakdown.map((m, i) => (
                                        <tr key={i} className="group hover:bg-pink-50">
                                            <td className="py-2 text-gray-700">{m.month}</td>
                                            <td className="py-2 text-emerald-600">¥{m.income.toLocaleString()}</td>
                                            <td className="py-2 text-rose-600">¥{m.expense.toLocaleString()}</td>
                                            <td className="py-2 text-gray-700">¥{(m.income - m.expense).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4 text-gray-700">経費内訳</h4>
                            <table className="w-full text-sm text-left">
                                <thead className="text-gray-600 border-b border-pink-200">
                                    <tr>
                                        <th className="pb-2">カテゴリ</th>
                                        <th className="pb-2">金額</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-pink-100">
                                    {annualSummary.expenseByCategory.map((e, i) => (
                                        <tr key={i} className="group hover:bg-pink-50">
                                            <td className="py-2 text-gray-700">{e.category}</td>
                                            <td className="py-2 text-gray-700">¥{e.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-modal-overlay backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingTransaction(null); }} />
                    <div className="relative z-10 w-full max-w-md bg-modal-bg border border-modal-border rounded-3xl p-8 shadow-2xl">
                        <button onClick={() => { setIsAddModalOpen(false); setEditingTransaction(null); }} className="absolute top-6 right-6 p-2 text-t-muted hover:text-t-primary"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingTransaction ? "取引を編集" : "収支を記録"}</h3>
                        <div className="flex gap-2 p-1 bg-accent-bg rounded-xl mb-6">
                            <button type="button" onClick={() => setAddType("income")} className={`flex-1 py-2.5 rounded-lg font-medium ${addType === "income" ? "bg-emerald-100 text-emerald-700" : "text-t-secondary hover:bg-accent-bg-hover"}`}>収入</button>
                            <button type="button" onClick={() => setAddType("expense")} className={`flex-1 py-2.5 rounded-lg font-medium ${addType === "expense" ? "bg-rose-100 text-rose-700" : "text-t-secondary hover:bg-accent-bg-hover"}`}>支出</button>
                        </div>
                        <form onSubmit={handleAddOrUpdateTransaction} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">日付</label>
                                <input name="date" type="date" defaultValue={editingTransaction?.date ? new Date(editingTransaction.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">カテゴリ</label>
                                <select name="category" defaultValue={editingTransaction?.category} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus">
                                    {addType === "income" ? <option value="月謝">月謝</option> : <><option value="交通費">交通費</option><option value="教材">教材</option><option value="その他">その他</option></>}
                                </select>
                            </div>
                            {addType === "income" && (
                                <div>
                                    <label className="block text-sm font-medium text-t-secondary mb-2">生徒名</label>
                                    <select name="studentName" defaultValue={editingTransaction?.studentName || ""} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus">
                                        <option value="">選択してください</option>
                                        {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">内容</label>
                                <input name="description" required defaultValue={editingTransaction?.description} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder={addType === "income" ? "例: 2月分月謝" : "例: 清澄白河 往復"} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-t-secondary mb-2">金額</label>
                                <input name="amount" type="number" required defaultValue={editingTransaction?.amount} className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus" placeholder="例: 12000" />
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${addType === "income" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-rose-500 to-red-600"} ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}>
                                {isSaving ? "保存中..." : (editingTransaction ? "更新する" : "記録する")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
