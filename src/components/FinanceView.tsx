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
import { generateInvoicePDF, generateReceiptPDF } from "../lib/pdfGenerator";

type TabType = "transactions" | "lessons" | "chart" | "invoice" | "annual";

import useSWR, { mutate } from "swr";

// ... (imports remain the same)

export default function FinanceView() {
    // State for UI controls (not data)
    const [activeTab, setActiveTab] = useState<TabType>("transactions");

    // Month selector
    const [selectedDate, setSelectedDate] = useState(new Date());
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();

    // State definitions moved up for SWR dependency
    const [invoiceStudent, setInvoiceStudent] = useState<Student | null>(null);
    const [invoiceAmount, setInvoiceAmount] = useState("10000");
    const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1);
    const [invoiceDescription, setInvoiceDescription] = useState("");
    const [documentType, setDocumentType] = useState<"invoice" | "receipt">("invoice");
    const [annualYear, setAnnualYear] = useState(new Date().getFullYear());

    // SWR Fetchers
    const { data: transactions = [], mutate: mutateTransactions } = useSWR(
        ['transactions', selectedYear, selectedMonth],
        () => getTransactionsByMonth(selectedYear, selectedMonth)
    );

    const { data: students = [] } = useSWR(
        ['students'],
        () => getStudents()
    );

    const { data: chartData = [], mutate: mutateChart } = useSWR(
        ['monthlySummary'],
        () => getMonthlySummary(6)
    );

    const { data: annualSummary, mutate: mutateAnnual } = useSWR(
        activeTab === "annual" ? ['annualSummary', annualYear] : null,
        () => getAnnualSummary(annualYear)
    );

    // Initial load for lesson payments is complex due to logic, we can keep useEffect or refactor carefully
    // For now, let's keep lesson payments in local state but trigger load on SWR data change
    const [lessonPayments, setLessonPayments] = useState<LessonPayment[]>([]);
    const [tuitionPayments, setTuitionPayments] = useState<TuitionPayment[]>([]);
    const [monthLessons, setMonthLessons] = useState<CalendarEvent[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);

    // ... (Modal states remain same)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [addType, setAddType] = useState<"income" | "expense">("expense");
    const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

    // ... (Other states)
    const [isSaving, setIsSaving] = useState(false);
    const [paymentFilter, setPaymentFilter] = useState<"all" | "monthly" | "per-lesson">("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "completed">("all");
    const [expandedMemos, setExpandedMemos] = useState<Set<string>>(new Set());

    // Lesson Payment Loading Logic (Dependent on SWR data but processed locally)
    useEffect(() => {
        if (activeTab === "lessons" && students.length > 0) {
            loadLessonPayments();
        }
    }, [activeTab, selectedYear, selectedMonth, students]);

    const loadLessonPayments = async () => {
        setLoadingLessons(true);
        try {
            // These could also be SWR but they depend on specific month selection which is fine
            // We can leave them as explicit fetches for now as they are complex merged data
            // OR we can make them SWR too, but let's stick to the plan of converting main data first.
            const [tuitionData, lessonData, lessonEvents] = await Promise.all([
                getTuitionPayments(selectedYear, selectedMonth + 1),
                getLessonPayments(selectedYear, selectedMonth),
                getLessons(
                    new Date(selectedYear, selectedMonth, 1).toISOString(),
                    new Date(selectedYear, selectedMonth + 1, 0).toISOString()
                )
            ]);

            // ... (Logic to merge students and payments remains the same)
            // 1. Process Monthly Students
            const monthlyStudents = students.filter((s) => !s.archived && s.paymentType === "monthly");
            const mergedTuition: TuitionPayment[] = monthlyStudents.map((student) => {
                const existing = tuitionData.find((t) => t.studentId === student.id);
                return existing || {
                    studentId: student.id,
                    studentName: student.name,
                    year: selectedYear,
                    month: selectedMonth + 1,
                    paid: false,
                    amount: student.monthlyFee || 0,
                    memo: ""
                };
            });
            setTuitionPayments(mergedTuition);

            // 2. Process Per-Lesson Students
            setMonthLessons(lessonEvents);
            const perLessonStudents = students.filter((s) => !s.archived && s.paymentType === "per-lesson");

            const seen = new Set<string>();
            const mergedLessons: LessonPayment[] = lessonEvents
                .map((lesson) => {
                    const student = perLessonStudents.find((s) => lesson.title.includes(s.name) || s.name.includes(lesson.title));
                    if (!student) return null;

                    const lessonDateStr = lesson.start.split("T")[0];
                    const dedupeKey = `${student.id}-${lessonDateStr}`;
                    if (seen.has(dedupeKey)) return null;
                    seen.add(dedupeKey);

                    const existing = lessonData.find((p) => p.lessonDate === lessonDateStr && p.studentId === student.id);

                    return existing || {
                        id: Date.now() + Math.random(),
                        studentId: student.id,
                        studentName: student.name,
                        lessonDate: lessonDateStr,
                        amount: student.monthlyFee || 0,
                        paid: false,
                        memo: ""
                    };
                })
                .filter((p): p is LessonPayment => p !== null);

            setLessonPayments(mergedLessons);

        } catch (error) {
            console.error("Error loading lesson payments:", error);
        } finally {
            setLoadingLessons(false);
        }
    };

    // ... (PDF generation functions remain same)

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
        const headers = ["ID", "日付", "タイプ", "カテゴリ", "内容", "金額", "生徒名"];
        const csvContent = [
            headers.join(","),
            ...filteredTransactions.map((t) =>
                [
                    t.id,
                    t.date,
                    t.type === "income" ? "収入" : "支出",
                    t.category,
                    `"${(t.description || "").replace(/"/g, '""')}"`,
                    t.amount,
                    t.studentName || "",
                ].join(",")
            ),
        ].join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `finance_export_${selectedYear}_${selectedMonth + 1}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // PDF生成関数
    const handleGeneratePDF = async () => {
        if (!invoiceStudent) {
            alert("生徒を選択してください");
            return;
        }

        const amount = parseInt(invoiceAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("有効な金額を入力してください");
            return;
        }

        const issueDate = new Date().toLocaleDateString("ja-JP");

        if (documentType === "invoice") {
            // 請求書生成
            await generateInvoicePDF({
                studentName: invoiceStudent.name,
                amount,
                issueDate,
                targetMonth: invoiceMonth.toString(),
                description: invoiceDescription || undefined,
                paymentType: invoiceStudent.paymentType || "monthly",
            });
        } else {
            // 領収書生成
            const description = invoiceDescription || `${invoiceMonth}月分レッスン料として`;
            await generateReceiptPDF({
                studentName: invoiceStudent.name,
                amount,
                issueDate,
                description,
            });
        }
    };

    const generateAnnualReportPDF = () => {
        if (!annualSummary) return;

        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Annual Report - ${annualYear}`, 10, 20);
        doc.setFontSize(12);
        doc.text(`Total Income: ${annualSummary.totalIncome}`, 10, 30);
        doc.text(`Total Expense: ${annualSummary.totalExpense}`, 10, 40);
        doc.save(`annual_report_${annualYear}.pdf`);
    };

    const handleAddOrUpdateTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        const newTx: Transaction = {
            id: editingTransaction ? editingTransaction.id : Date.now(),
            type: addType,
            category: formData.get("category") as string,
            description: formData.get("description") as string,
            amount: parseInt(formData.get("amount") as string) || 0,
            date: formData.get("date") as string || new Date().toLocaleDateString("ja-JP"),
            studentName: addType === "income" ? (formData.get("studentName") as string) : undefined,
        };

        // Optimistic Update with SWR
        const updatedTransactions = editingTransaction
            ? transactions.map(t => t.id === newTx.id ? newTx : t)
            : [newTx, ...transactions];

        mutateTransactions(updatedTransactions, false); // Update local cache immediately without revalidation yet

        setIsAddModalOpen(false);
        setEditingTransaction(null);

        try {
            let result;
            if (editingTransaction) {
                result = await updateTransaction(newTx);
            } else {
                result = await addTransaction(newTx);
            }

            if (!result.success) throw new Error(String(result.error));

            // Trigger revalidation to get server state
            mutateTransactions();
            mutateChart(); // Update chart too
        } catch (error) {
            console.error("Failed to save transaction:", error);
            alert("保存に失敗しました。");
            mutateTransactions(); // Rollback to server state
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        if (!confirm("この取引を削除してよろしいですか？")) return;

        // Optimistic Update
        const updatedTransactions = transactions.filter(t => t.id !== id);
        mutateTransactions(updatedTransactions, false);

        try {
            const result = await deleteTransaction(id);
            if (!result.success) throw new Error(String(result.error));

            mutateTransactions();
            mutateChart();
        } catch (error) {
            console.error("Failed to delete transaction:", error);
            alert("削除に失敗しました。");
            mutateTransactions(); // Rollback
        }
    };

    const handleEditTransaction = (tx: Transaction) => {
        setEditingTransaction(tx);
        setAddType(tx.type);
        setIsAddModalOpen(true);
    };

    // Helper to refresh everything (used by payments)
    const refreshTransactions = async () => {
        mutateTransactions();
        mutateChart();
        if (activeTab === "annual") mutateAnnual();
    };

    // ... (Payment handlers need to accept refresh callback or use global mutate)
    // Actually handleToggleLessonPayment calls loadLessonPayments AND refreshTransactions
    // so we just update refreshTransactions to use mutate.

    const handleToggleLessonPayment = async (payment: LessonPayment) => {
        // ... (implementation same, just calls refreshTransactions which now uses SWR mutates)
        const updated = {
            ...payment,
            paid: !payment.paid,
            paidDate: !payment.paid ? new Date().toLocaleDateString("ja-JP") : undefined,
        };
        await saveLessonPayment(updated);
        await Promise.all([loadLessonPayments(), refreshTransactions()]);
    };

    // ... (Other handlers similar)
    const handleToggleTuitionPayment = async (payment: TuitionPayment) => {
        const updated = {
            ...payment,
            paid: !payment.paid, // ...
            paidDate: !payment.paid ? new Date().toLocaleDateString("ja-JP") : undefined,
        };
        await saveTuitionPayment(updated);
        await Promise.all([loadLessonPayments(), refreshTransactions()]);
    };

    // ... (Update Amount/Memo handlers similar, just call loadLessonPayments)
    const handleUpdateLessonAmount = async (payment: LessonPayment, newAmount: number) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await saveLessonPayment({ ...payment, amount: newAmount });
            await loadLessonPayments();
            await refreshTransactions(); // Amount change affects totals
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
            await refreshTransactions();
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTuitionMemo = async (payment: TuitionPayment, memo: string) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await saveTuitionPayment({ ...payment, memo });
            await loadLessonPayments();
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateLessonMemo = async (payment: LessonPayment, memo: string) => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            await saveLessonPayment({ ...payment, memo });
            await loadLessonPayments();
        } finally {
            setIsSaving(false);
        }
    };

    // ... (Calculations and Render remain mostly valid as they use `transactions` which is now from SWR)

    // ... (Rest of component)

    // RETURN STATEMENT (Ensure we return the JSX)
    // To safe code space, I'm assuming the render part is identical except for using SWR data.
    // The previous implementation had a huge render block. I will need to replace the logic parts above render.

    // ... (Render code)




    // Calculation for Lessons Tab
    const totalExpectedMonthly = tuitionPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaidMonthly = tuitionPayments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);

    const totalExpectedLesson = lessonPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaidLesson = lessonPayments.filter((p) => p.paid).reduce((sum, p) => sum + p.amount, 0);

    const totalExpected = totalExpectedMonthly + totalExpectedLesson;
    const totalPaid = totalPaidMonthly + totalPaidLesson;
    const totalUnpaid = totalExpected - totalPaid;
    const collectionRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    const visibleStudents = students.filter((s) => {
        if (s.archived) return false;
        if (paymentFilter !== "all" && s.paymentType !== paymentFilter) return false;

        if (statusFilter === "all") return true;

        if (s.paymentType === "monthly") {
            const p = tuitionPayments.find((tp) => tp.studentId === s.id);
            const isPaid = p?.paid ?? false;
            return statusFilter === "completed" ? isPaid : !isPaid;
        } else {
            const sLessons = lessonPayments.filter((lp) => lp.studentId === s.id);
            if (sLessons.length === 0) return statusFilter === "completed";
            const isAllPaid = sLessons.every((lp) => lp.paid);
            return statusFilter === "completed" ? isAllPaid : !isAllPaid;
        }
    });

    return (
        <div className="space-y-4 sm:space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gradient mb-1 sm:mb-2">レッスン料・経費管理</h2>
                    <p className="text-sm sm:text-base text-gray-500">収入と支出を記録・管理</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Month Selector */}
                    <div className="flex items-center gap-1 sm:gap-2 bg-card-solid p-1 sm:p-1.5 rounded-xl border border-card-border">
                        <button onClick={handlePrevMonth} className="p-1.5 sm:p-2 hover:bg-accent-bg-hover rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4 text-t-secondary" />
                        </button>
                        <span className="font-medium text-xs sm:text-sm min-w-[80px] sm:min-w-[100px] text-center text-t-primary">{formatMonthYear(selectedDate)}</span>
                        <button onClick={handleNextMonth} className="p-1.5 sm:p-2 hover:bg-accent-bg-hover rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4 text-t-secondary" />
                        </button>
                    </div>
                    <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-card-solid hover:bg-accent-bg-hover border border-card-border rounded-xl font-medium text-sm sm:text-base text-t-primary">
                        <Download className="w-4 h-4" />CSV出力
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setAddType("expense"); setIsAddModalOpen(true); }} className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 premium-gradient rounded-xl font-medium text-sm sm:text-base text-white shadow-lg hover:shadow-xl">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />記録を追加
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex items-center gap-1 sm:gap-2 p-1 bg-card-solid rounded-xl border border-card-border overflow-x-auto max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                <button onClick={() => setActiveTab("transactions")} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "transactions" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />取引一覧
                </button>
                <button onClick={() => setActiveTab("lessons")} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "lessons" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />レッスン料
                </button>
                <button onClick={() => setActiveTab("chart")} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "chart" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />グラフ
                </button>
                <button onClick={() => setActiveTab("invoice")} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "invoice" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />請求書・領収書
                </button>
                <button onClick={() => setActiveTab("annual")} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === "annual" ? "bg-accent-bg text-accent" : "text-t-secondary hover:text-t-primary hover:bg-accent-bg-hover"}`}>
                    <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />年間レポート
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "transactions" && (
                <>
                    {/* Summary Cards - only visible in transactions tab */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="glass-card p-3 sm:p-5">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3"><div className="p-1.5 sm:p-2.5 bg-emerald-500/10 rounded-lg sm:rounded-xl"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /></div><span className="text-[10px] sm:text-sm text-slate-400 hidden sm:inline">{formatMonthYear(selectedDate)}の収入</span><span className="text-[10px] text-slate-400 sm:hidden">収入</span></div>
                            <p className="text-base sm:text-2xl font-bold text-emerald-400">¥{totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="glass-card p-3 sm:p-5">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3"><div className="p-1.5 sm:p-2.5 bg-rose-500/10 rounded-lg sm:rounded-xl"><TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /></div><span className="text-[10px] sm:text-sm text-slate-400 hidden sm:inline">{formatMonthYear(selectedDate)}の支出</span><span className="text-[10px] text-slate-400 sm:hidden">支出</span></div>
                            <p className="text-base sm:text-2xl font-bold text-rose-400">¥{totalExpense.toLocaleString()}</p>
                        </div>
                        <div className="glass-card p-3 sm:p-5">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3"><div className="p-1.5 sm:p-2.5 bg-violet-500/10 rounded-lg sm:rounded-xl"><Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" /></div><span className="text-[10px] sm:text-sm text-slate-400">収支</span></div>
                            <p className={`text-base sm:text-2xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>¥{balance.toLocaleString()}</p>
                        </div>
                    </div>
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
                                <div key={tx.id} className="p-3 sm:p-4 flex items-center gap-2.5 sm:gap-4 hover:bg-accent-bg-hover group transition-colors">
                                    <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 ${tx.type === "income" ? "bg-emerald-100" : "bg-rose-100"}`}>
                                        {tx.type === "income" ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate text-t-primary text-sm sm:text-base">{tx.description}</p>
                                        <p className="text-xs sm:text-sm text-t-secondary truncate">{tx.category}{tx.studentName && ` • ${tx.studentName}`}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`font-semibold text-sm sm:text-base ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{tx.type === "income" ? "+" : "-"}¥{tx.amount.toLocaleString()}</p>
                                        <p className="text-xs text-t-muted">{tx.date}</p>
                                    </div>
                                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
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
                <div className="space-y-6">
                    {/* Summary Header */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-t-primary">{formatMonthYear(selectedDate)}の集金状況</h3>
                            <span className="text-2xl font-bold text-accent">{collectionRate}% <span className="text-sm text-t-secondary font-normal">完了</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 mb-6 overflow-hidden">
                            <div className="bg-accent h-full rounded-full transition-all duration-500" style={{ width: `${collectionRate}%` }} />
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-100">
                            <div>
                                <p className="text-xs text-t-secondary mb-1">予定総額</p>
                                <p className="font-bold text-t-primary">¥{totalExpected.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-t-secondary mb-1">集金済み</p>
                                <p className="font-bold text-emerald-500">¥{totalPaid.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-t-secondary mb-1">未集金</p>
                                <p className="font-bold text-rose-500">¥{totalUnpaid.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="glass-card p-3 sm:p-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0">
                                {(["all", "monthly", "per-lesson"] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setPaymentFilter(type)}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${paymentFilter === type ? "bg-white text-accent shadow-sm" : "text-t-secondary hover:text-t-primary"}`}
                                    >
                                        {type === "all" ? "すべて" : type === "monthly" ? "月謝制" : "都度払い"}
                                    </button>
                                ))}
                            </div>
                            <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />
                            <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0">
                                {(["all", "unpaid", "completed"] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${statusFilter === status ? "bg-white text-accent shadow-sm" : "text-t-secondary hover:text-t-primary"}`}
                                    >
                                        {status === "all" ? "すべて" : status === "unpaid" ? "未払いあり" : "完了"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Student Grid */}
                    {loadingLessons ? (
                        <div className="p-12 text-center text-t-muted">読み込み中...</div>
                    ) : visibleStudents.length === 0 ? (
                        <div className="p-12 text-center text-t-muted bg-card-solid rounded-xl border border-card-border">該当する生徒はいません</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                            {visibleStudents.map((student) => {
                                const isMonthly = student.paymentType === "monthly";
                                const tuition = isMonthly ? tuitionPayments.find(t => t.studentId === student.id) : null;
                                const lessons = !isMonthly ? lessonPayments.filter(l => l.studentId === student.id).sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()) : [];

                                const hasUnpaid = isMonthly
                                    ? !(tuition?.paid)
                                    : lessons.some(l => !l.paid) || lessons.length === 0; // If no lessons, consider it as nothing to pay, but maybe highlight?

                                const key = `memo-${student.id}`;
                                const isMemoExpanded = expandedMemos.has(key);

                                return (
                                    <div key={`${student.id}-${selectedYear}-${selectedMonth}`} className={`glass-card p-0 overflow-hidden border-l-4 ${hasUnpaid ? "border-l-rose-400" : "border-l-emerald-400"}`}>
                                        <div className="p-4 border-b border-gray-50 bg-white/50 flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-t-primary">{student.name}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isMonthly ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-orange-50 text-orange-600 border-orange-100"}`}>
                                                        {isMonthly ? "月謝制" : "都度払い"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-t-secondary">
                                                    {isMonthly ? `${selectedMonth + 1}月分月謝` : `${lessons.length}回レッスン`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newSet = new Set(expandedMemos);
                                                    if (newSet.has(key)) newSet.delete(key);
                                                    else newSet.add(key);
                                                    setExpandedMemos(newSet);
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors ${isMemoExpanded || (isMonthly ? tuition?.memo : lessons.some(l => l.memo)) ? "bg-yellow-50 text-yellow-600" : "text-gray-300 hover:bg-gray-50"}`}
                                            >
                                                <Receipt className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {/* Generic Memo Field (Collapsible) */}
                                            {(isMemoExpanded || (isMonthly ? tuition?.memo : lessons[0]?.memo)) && (
                                                <div className="mb-3">
                                                    {isMonthly && tuition ? (
                                                        <input
                                                            className="w-full text-xs bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1.5 text-t-primary placeholder-yellow-300 focus:border-yellow-300 focus:ring-1 focus:ring-yellow-300 transition-all"
                                                            placeholder="メモ（次回まとめて等）"
                                                            defaultValue={tuition.memo || ""}
                                                            onBlur={(e) => {
                                                                if (e.target.value !== tuition.memo) handleUpdateTuitionMemo(tuition, e.target.value);
                                                            }}
                                                        />
                                                    ) : !isMonthly && lessons.length > 0 ? (
                                                        // For per-lesson, we just use the first lesson's memo as a "general" memo for now, or we need a student-month memo?
                                                        // The backend only supports memo per payment. Let's attach to the latest lesson or just show the last one?
                                                        // Let's use the first lesson for simplicity or iterate. 
                                                        // Plan said "memo per student card". 
                                                        // I'll attach it to the LAST lesson of the month for visibility, or all? 
                                                        // Let's just show distinct memos if multiple?
                                                        // Or just allow editing the latest lesson's memo.
                                                        <div className="space-y-1">
                                                            {lessons.map((l, idx) => (
                                                                <div key={l.id} className="flex gap-1">
                                                                    <span className="text-[10px] text-t-secondary w-8 pt-1">{new Date(l.lessonDate).getDate()}日</span>
                                                                    <input
                                                                        className="flex-1 text-xs bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1 text-t-primary placeholder-yellow-300 focus:border-yellow-300 focus:ring-1 focus:ring-yellow-300"
                                                                        placeholder="メモ"
                                                                        defaultValue={l.memo || ""}
                                                                        onBlur={(e) => {
                                                                            if (e.target.value !== l.memo) handleUpdateLessonMemo(l, e.target.value);
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}

                                            {isMonthly && tuition ? (
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-t-primary">¥</span>
                                                        <input
                                                            type="number"
                                                            defaultValue={tuition.amount}
                                                            className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-right font-bold text-t-primary focus:border-accent focus:ring-1 focus:ring-accent"
                                                            onBlur={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                if (!isNaN(val) && val !== tuition.amount) handleUpdateTuitionAmount(tuition, val);
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleTuitionPayment(tuition)}
                                                        disabled={isSaving}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${tuition.paid
                                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                            : "bg-white border border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-500"}`}
                                                    >
                                                        {tuition.paid ? (
                                                            <><CheckCircle className="w-4 h-4" /> 支払い済み</>
                                                        ) : (
                                                            "未払い"
                                                        )}
                                                    </button>
                                                </div>
                                            ) : !isMonthly ? (
                                                <div className="space-y-3">
                                                    {lessons.length === 0 ? (
                                                        <div className="text-center text-xs text-t-muted py-2 border border-dashed border-gray-200 rounded-lg">レッスン記録なし</div>
                                                    ) : (
                                                        lessons.map((lesson) => (
                                                            <div key={`${lesson.studentId}-${lesson.lessonDate}`} className="flex items-center justify-between group">
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        onClick={() => handleToggleLessonPayment(lesson)}
                                                                        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${lesson.paid ? "bg-emerald-500 border-emerald-500" : "border-gray-300 group-hover:border-emerald-400"}`}
                                                                    >
                                                                        {lesson.paid && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                                                    </div>
                                                                    <div className="text-sm">
                                                                        <span className="font-medium text-t-primary">{new Date(lesson.lessonDate).getDate()}日</span>
                                                                        <span className="text-xs text-t-secondary ml-1">({new Date(lesson.lessonDate).toLocaleDateString("ja-JP", { weekday: "short" })})</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={lesson.amount}
                                                                        className={`w-16 px-1 py-0.5 text-right text-sm bg-transparent border-b border-transparent focus:border-accent hover:border-gray-200 transition-colors ${lesson.paid ? "text-emerald-600 font-medium" : "text-t-secondary"}`}
                                                                        onBlur={(e) => {
                                                                            const val = parseInt(e.target.value);
                                                                            if (!isNaN(val) && val !== lesson.amount) handleUpdateLessonAmount(lesson, val);
                                                                        }}
                                                                    />
                                                                    <span className="text-xs text-t-muted">円</span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                    <div className="pt-3 mt-3 border-t border-dashed border-gray-100 flex justify-between items-center">
                                                        <span className="text-xs text-t-secondary font-medium">合計（{lessons.filter(l => l.paid).length}/{lessons.length}回）</span>
                                                        <span className="font-bold text-t-primary">
                                                            ¥{lessons.reduce((sum, l) => sum + (l.paid ? l.amount : 0), 0).toLocaleString()}
                                                            <span className="text-xs font-normal text-t-muted"> / ¥{lessons.reduce((sum, l) => sum + l.amount, 0).toLocaleString()}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
                <div className="glass-card p-6 max-w-2xl mx-auto">
                    <h3 className="font-semibold text-xl mb-6 text-t-primary">請求書・領収書の発行</h3>

                    {/* ドキュメントタイプ選択 */}
                    <div className="flex gap-2 p-1 bg-accent-bg rounded-xl mb-6">
                        <button
                            type="button"
                            onClick={() => setDocumentType("invoice")}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                documentType === "invoice"
                                    ? "bg-blue-100 text-blue-700 shadow-sm"
                                    : "text-t-secondary hover:bg-accent-bg-hover"
                            }`}
                        >
                            請求書
                        </button>
                        <button
                            type="button"
                            onClick={() => setDocumentType("receipt")}
                            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                                documentType === "receipt"
                                    ? "bg-green-100 text-green-700 shadow-sm"
                                    : "text-t-secondary hover:bg-accent-bg-hover"
                            }`}
                        >
                            領収書
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-t-secondary mb-2">
                                生徒を選択 <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={invoiceStudent?.id || ""}
                                onChange={(e) => {
                                    const student = students.find((s) => s.id === parseInt(e.target.value)) || null;
                                    setInvoiceStudent(student);
                                    if (student && student.monthlyFee) {
                                        setInvoiceAmount(student.monthlyFee.toString());
                                    }
                                }}
                                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus"
                            >
                                <option value="">選択してください</option>
                                {students
                                    .filter((s) => !s.archived)
                                    .map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.paymentType === "monthly" ? "月謝制" : "都度払い"})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-t-secondary mb-2">
                                対象月
                            </label>
                            <select
                                value={invoiceMonth}
                                onChange={(e) => setInvoiceMonth(parseInt(e.target.value))}
                                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                                    <option key={m} value={m}>
                                        {m}月
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-t-secondary mb-2">
                                金額（円） <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={invoiceAmount}
                                onChange={(e) => setInvoiceAmount(e.target.value)}
                                placeholder="10000"
                                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-t-secondary mb-2">
                                {documentType === "invoice" ? "請求内容" : "但し書き"}
                                <span className="text-xs text-t-muted ml-2">（オプション）</span>
                            </label>
                            <input
                                type="text"
                                value={invoiceDescription}
                                onChange={(e) => setInvoiceDescription(e.target.value)}
                                placeholder={
                                    documentType === "invoice"
                                        ? "例: 2月分レッスン料"
                                        : "例: 2月分レッスン料として"
                                }
                                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-input-text focus:border-input-border-focus"
                            />
                            <p className="text-xs text-t-muted mt-1">
                                空欄の場合は自動的に生成されます
                            </p>
                        </div>

                        {invoiceStudent && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                <h4 className="text-sm font-semibold text-blue-900 mb-2">プレビュー</h4>
                                <div className="text-sm text-blue-800 space-y-1">
                                    <p>
                                        <span className="font-medium">生徒名:</span> {invoiceStudent.name} 様
                                    </p>
                                    <p>
                                        <span className="font-medium">金額:</span> ¥
                                        {parseInt(invoiceAmount || "0").toLocaleString()}
                                    </p>
                                    <p>
                                        <span className="font-medium">対象:</span> {invoiceMonth}月分
                                    </p>
                                    <p>
                                        <span className="font-medium">種類:</span>{" "}
                                        {documentType === "invoice" ? "請求書" : "領収書"}
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleGeneratePDF}
                            disabled={!invoiceStudent}
                            className="w-full py-4 premium-gradient rounded-xl font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-xl transition-all"
                        >
                            <FileDown className="w-5 h-5" />
                            {documentType === "invoice" ? "請求書" : "領収書"}をダウンロード
                        </button>

                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ 重要な注意事項</h4>
                            <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                                <li>
                                    発行者情報（教室名、住所、電話番号など）は src/lib/schoolConfig.ts
                                    で設定してください
                                </li>
                                <li>
                                    領収書には印鑑欄があります。必要に応じて印刷後に押印してください
                                </li>
                                <li>生成されたPDFは法的に有効な形式ですが、内容の正確性をご確認ください</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Annual Report Tab */}
            {activeTab === "annual" && annualSummary && (
                <div className="glass-card p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-xl font-bold text-t-primary">年間収支レポート（確定申告用）</h3>
                        <div className="flex gap-2 sm:gap-4">
                            <select value={annualYear} onChange={(e) => setAnnualYear(parseInt(e.target.value))} className="px-3 sm:px-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm sm:text-base text-t-primary">
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                            </select>
                            <button onClick={generateAnnualReportPDF} className="px-3 sm:px-4 py-2 premium-gradient rounded-lg text-white font-medium text-sm sm:text-base shadow-lg whitespace-nowrap">
                                PDFダウンロード
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-6 sm:mb-8">
                        <div className="p-2.5 sm:p-4 bg-emerald-100 rounded-lg sm:rounded-xl border border-emerald-200">
                            <p className="text-[10px] sm:text-sm text-emerald-700 mb-0.5 sm:mb-1">総収入</p>
                            <p className="text-sm sm:text-2xl font-bold text-gray-700">¥{annualSummary.totalIncome.toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 sm:p-4 bg-rose-100 rounded-lg sm:rounded-xl border border-rose-200">
                            <p className="text-[10px] sm:text-sm text-rose-700 mb-0.5 sm:mb-1">総支出</p>
                            <p className="text-sm sm:text-2xl font-bold text-gray-700">¥{annualSummary.totalExpense.toLocaleString()}</p>
                        </div>
                        <div className="p-2.5 sm:p-4 bg-blue-100 rounded-lg sm:rounded-xl border border-blue-200">
                            <p className="text-[10px] sm:text-sm text-blue-700 mb-0.5 sm:mb-1">収支差額</p>
                            <p className="text-sm sm:text-2xl font-bold text-gray-700">¥{(annualSummary.totalIncome - annualSummary.totalExpense).toLocaleString()}</p>
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="fixed inset-0 bg-modal-overlay backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingTransaction(null); }} />
                    <div className="relative z-10 w-full sm:max-w-md lg:max-w-lg bg-modal-bg border border-modal-border rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto safe-area-bottom shadow-xl">
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
