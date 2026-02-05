"use client";

import { useState, useEffect } from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, Download, X, Pencil, Trash2, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, BarChart3, Receipt } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
    getTransactions,
    getTransactionsByMonth,
    getMonthlySummary,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getLessonPayments,
    saveLessonPayment,
    Transaction,
    LessonPayment,
} from "../actions/financeActions";
import { getStudents, Student } from "../actions/studentActions";
import { getLessons, CalendarEvent } from "../actions/calendarActions";

type TabType = "transactions" | "lessons" | "chart";

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

    // Lesson payments (都度払い)
    const [lessonPayments, setLessonPayments] = useState<LessonPayment[]>([]);
    const [monthLessons, setMonthLessons] = useState<CalendarEvent[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
        };
        fetchData();
    }, [selectedYear, selectedMonth]);

    useEffect(() => {
        if (activeTab === "lessons") {
            loadLessonPayments();
        }
    }, [activeTab, selectedYear, selectedMonth]);

    const loadLessonPayments = async () => {
        setLoadingLessons(true);

        // Get lessons for the month
        const startOfMonth = new Date(selectedYear, selectedMonth, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        const lessons = await getLessons(startOfMonth.toISOString(), endOfMonth.toISOString());
        setMonthLessons(lessons);

        // Get existing payments
        const payments = await getLessonPayments(selectedYear, selectedMonth + 1);

        // Create payment records for each lesson
        const merged: LessonPayment[] = lessons.map((lesson) => {
            const student = students.find((s) => s.name === lesson.title);
            const existing = payments.find((p) => p.lessonDate === lesson.start.split("T")[0] && p.studentId === student?.id);
            return existing || {
                id: Date.now() + Math.random(),
                studentId: student?.id || 0,
                studentName: lesson.title,
                lessonDate: lesson.start.split("T")[0],
                amount: 0,
                paid: false,
            };
        });
        setLessonPayments(merged);
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
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `収支_${selectedYear}_${selectedMonth + 1}.csv`;
        link.click();
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

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">レッスン料・経費管理</h2>
                    <p className="text-slate-400">収入と支出を記録・管理</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Month Selector */}
                    <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <span className="font-medium text-sm min-w-[100px] text-center">{formatMonthYear(selectedDate)}</span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium text-slate-300">
                        <Download className="w-4 h-4" />CSV出力
                    </button>
                    <button onClick={() => { setEditingTransaction(null); setAddType("expense"); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl">
                        <Plus className="w-5 h-5" />記録を追加
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
                <button onClick={() => setActiveTab("transactions")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium ${activeTab === "transactions" ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <Wallet className="w-4 h-4" />取引一覧
                </button>
                <button onClick={() => setActiveTab("lessons")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium ${activeTab === "lessons" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <Receipt className="w-4 h-4" />レッスン料管理
                </button>
                <button onClick={() => setActiveTab("chart")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium ${activeTab === "chart" ? "bg-blue-500/20 text-blue-300" : "text-slate-500 hover:text-slate-300"}`}>
                    <BarChart3 className="w-4 h-4" />グラフ
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
                            <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-lg font-medium text-sm ${filterType === type ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}>
                                {type === "all" ? "すべて" : type === "income" ? "収入" : "支出"}
                            </button>
                        ))}
                    </div>

                    <div className="glass-card divide-y divide-slate-800">
                        {filteredTransactions.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">この月の取引はありません</div>
                        ) : (
                            filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                                <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/30 group">
                                    <div className={`p-2.5 rounded-xl ${tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                                        {tx.type === "income" ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{tx.description}</p>
                                        <p className="text-sm text-slate-500">{tx.category}{tx.studentName && ` • ${tx.studentName}`}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>{tx.type === "income" ? "+" : "-"}¥{tx.amount.toLocaleString()}</p>
                                        <p className="text-xs text-slate-500">{tx.date}</p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditTransaction(tx)} className="p-2 hover:bg-slate-700 rounded-lg"><Pencil className="w-4 h-4 text-slate-400" /></button>
                                        <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2 hover:bg-rose-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {activeTab === "lessons" && (
                <div className="glass-card">
                    <div className="p-5 border-b border-slate-800">
                        <h3 className="font-semibold text-lg">{formatMonthYear(selectedDate)}のレッスン料支払い状況</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            支払い済み: {lessonPayments.filter((p) => p.paid).length} / {lessonPayments.length}件
                        </p>
                    </div>
                    {loadingLessons ? (
                        <div className="p-8 text-center text-slate-500">読み込み中...</div>
                    ) : lessonPayments.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">この月のレッスンはありません</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {lessonPayments.sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime()).map((payment, idx) => (
                                <div key={`${payment.studentId}-${payment.lessonDate}-${idx}`} className="p-4 flex items-center gap-4 hover:bg-slate-800/30">
                                    <button
                                        onClick={() => handleToggleLessonPayment(payment)}
                                        className={`p-2 rounded-lg transition-colors ${payment.paid ? "bg-emerald-500/20" : "bg-slate-800"}`}
                                    >
                                        {payment.paid ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-slate-500" />}
                                    </button>
                                    <div className="flex-1">
                                        <p className={`font-medium ${payment.paid ? "text-slate-300" : "text-white"}`}>{payment.studentName}</p>
                                        <p className="text-sm text-slate-500">{new Date(payment.lessonDate).toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}</p>
                                    </div>
                                    <input
                                        type="number"
                                        value={payment.amount}
                                        onChange={async (e) => {
                                            const newAmount = Number(e.target.value);
                                            await saveLessonPayment({ ...payment, amount: newAmount });
                                            await loadLessonPayments();
                                        }}
                                        className="w-24 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-right text-sm"
                                        placeholder="金額"
                                    />
                                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${payment.paid ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                                        {payment.paid ? "支払い済み" : "未払い"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "chart" && (
                <div className="glass-card p-6">
                    <h3 className="font-semibold text-lg mb-6">過去6ヶ月の収支推移</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="month" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px" }}
                                    labelStyle={{ color: "#f8fafc" }}
                                    formatter={(value) => [`¥${Number(value).toLocaleString()}`, ""]}
                                />
                                <Legend />
                                <Bar dataKey="income" name="収入" fill="#34d399" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="支出" fill="#f87171" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setEditingTransaction(null); }} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <button onClick={() => { setIsAddModalOpen(false); setEditingTransaction(null); }} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        <h3 className="text-2xl font-bold text-gradient mb-6">{editingTransaction ? "取引を編集" : "収支を記録"}</h3>
                        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl mb-6">
                            <button type="button" onClick={() => setAddType("income")} className={`flex-1 py-2.5 rounded-lg font-medium ${addType === "income" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500"}`}>収入</button>
                            <button type="button" onClick={() => setAddType("expense")} className={`flex-1 py-2.5 rounded-lg font-medium ${addType === "expense" ? "bg-rose-500/20 text-rose-300" : "text-slate-500"}`}>支出</button>
                        </div>
                        <form onSubmit={handleAddOrUpdateTransaction} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">日付</label>
                                <input name="date" type="date" defaultValue={editingTransaction?.date ? new Date(editingTransaction.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">カテゴリ</label>
                                <select name="category" defaultValue={editingTransaction?.category} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                    {addType === "income" ? <option value="月謝">月謝</option> : <><option value="交通費">交通費</option><option value="教材">教材</option><option value="その他">その他</option></>}
                                </select>
                            </div>
                            {addType === "income" && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">生徒名</label>
                                    <select name="studentName" defaultValue={editingTransaction?.studentName || ""} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">
                                        <option value="">選択してください</option>
                                        {students.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">内容</label>
                                <input name="description" required defaultValue={editingTransaction?.description} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder={addType === "income" ? "例: 2月分月謝" : "例: 清澄白河 往復"} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">金額</label>
                                <input name="amount" type="number" required defaultValue={editingTransaction?.amount} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 12000" />
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
