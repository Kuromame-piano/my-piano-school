"use client";

import { Plus, Wallet, TrendingUp, TrendingDown, Download, X } from "lucide-react";
import { getTransactions, addTransaction, Transaction } from "../actions/financeActions"; // Import actions
import { useState, useEffect } from "react";




export default function FinanceView() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        getTransactions().then(setTransactions);
    }, []);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addType, setAddType] = useState<"income" | "expense">("expense");
    const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

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
        link.download = `収支_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gradient mb-2">月謝・経費管理</h2>
                    <p className="text-slate-400">収入と支出を記録・管理</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium text-slate-300"><Download className="w-4 h-4" />CSV出力</button>
                    <button onClick={() => { setAddType("expense"); setIsAddModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 premium-gradient rounded-xl font-medium text-white shadow-lg hover:shadow-xl"><Plus className="w-5 h-5" />記録を追加</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3"><div className="p-2.5 bg-emerald-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-400" /></div><span className="text-sm text-slate-400">今月の収入</span></div>
                    <p className="text-2xl font-bold text-emerald-400">¥{totalIncome.toLocaleString()}</p>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3"><div className="p-2.5 bg-rose-500/10 rounded-xl"><TrendingDown className="w-5 h-5 text-rose-400" /></div><span className="text-sm text-slate-400">今月の支出</span></div>
                    <p className="text-2xl font-bold text-rose-400">¥{totalExpense.toLocaleString()}</p>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3"><div className="p-2.5 bg-violet-500/10 rounded-xl"><Wallet className="w-5 h-5 text-violet-400" /></div><span className="text-sm text-slate-400">収支</span></div>
                    <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>¥{balance.toLocaleString()}</p>
                </div>
            </div>

            <div className="flex gap-2">
                {(["all", "income", "expense"] as const).map((type) => (
                    <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-2 rounded-lg font-medium text-sm ${filterType === type ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"}`}>
                        {type === "all" ? "すべて" : type === "income" ? "収入" : "支出"}
                    </button>
                ))}
            </div>

            <div className="glass-card divide-y divide-slate-800">
                {filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/30">
                        <div className={`p-2.5 rounded-xl ${tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                            {tx.type === "income" ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
                        </div>
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{tx.description}</p><p className="text-sm text-slate-500">{tx.category}{tx.studentName && ` • ${tx.studentName}`}</p></div>
                        <div className="text-right"><p className={`font-semibold ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>{tx.type === "income" ? "+" : "-"}¥{tx.amount.toLocaleString()}</p><p className="text-xs text-slate-500">{tx.date}</p></div>
                    </div>
                ))}
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-2xl font-bold text-gradient mb-6">収支を記録</h3>
                        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl mb-6">
                            <button onClick={() => setAddType("income")} className={`flex-1 py-2.5 rounded-lg font-medium ${addType === "income" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500"}`}>収入</button>
                            <button onClick={() => setAddType("expense")} className={`flex-1 py-2.5 rounded-lg font-medium ${addType === "expense" ? "bg-rose-500/20 text-rose-300" : "text-slate-500"}`}>支出</button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            const newTx: Transaction = {
                                id: Date.now(),
                                type: addType,
                                category: formData.get("category") as string,
                                description: formData.get("description") as string,
                                amount: parseInt(formData.get("amount") as string) || 0,
                                date: new Date().toLocaleDateString("ja-JP"),
                                studentName: addType === "income" ? (formData.get("studentName") as string) : undefined
                            };
                            setTransactions([newTx, ...transactions]);
                            setIsAddModalOpen(false);
                            await addTransaction(newTx);
                        }} className="space-y-5">
                            <div><label className="block text-sm font-medium text-slate-400 mb-2">カテゴリ</label><select name="category" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100">{addType === "income" ? <option value="月謝">月謝</option> : <><option value="交通費">交通費</option><option value="教材">教材</option><option value="その他">その他</option></>}</select></div>
                            {addType === "income" && <div><label className="block text-sm font-medium text-slate-400 mb-2">生徒名</label><input name="studentName" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 田中 美咲" /></div>}
                            <div><label className="block text-sm font-medium text-slate-400 mb-2">内容</label><input name="description" required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder={addType === "income" ? "例: 2月分月謝" : "例: 清澄白河 往復"} /></div>
                            <div><label className="block text-sm font-medium text-slate-400 mb-2">金額</label><input name="amount" type="number" required className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100" placeholder="例: 12000" /></div>
                            <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${addType === "income" ? "bg-gradient-to-r from-emerald-500 to-green-600" : "bg-gradient-to-r from-rose-500 to-red-600"}`}>記録する</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
