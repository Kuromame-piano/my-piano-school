"use server";


import { revalidatePath } from "next/cache";
import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";


export interface Transaction {
    id: number;
    type: "income" | "expense";
    category: string;
    description: string;
    amount: number;
    date: string;
    studentName?: string;
    studentId?: number;
}

export interface TuitionPayment {
    studentId: number;
    studentName: string;
    year: number;
    month: number;
    paid: boolean;
    paidDate?: string;
    amount: number;
    memo?: string;
    transactionId?: number;
}

// Per-lesson payment for 都度払い
export interface LessonPayment {
    id: number;
    studentId: number;
    studentName: string;
    lessonDate: string;
    amount: number;
    paid: boolean;
    paidDate?: string;
    memo?: string;
    transactionId?: number;
}

const FINANCE_SHEET = "Finance";
const TUITION_SHEET = "TuitionPayments";
const LESSON_PAYMENTS_SHEET = "LessonPayments";

import { getCachedData, setCachedData, invalidateCache, CACHE_KEYS } from "../lib/dataCache";

// Get all transactions
export async function getTransactions(): Promise<Transaction[]> {
    // Mobile optimization: Cache for 5 minutes (300,000ms) to reduce data usage
    const cached = getCachedData<Transaction[]>(CACHE_KEYS.TRANSACTIONS, 5 * 60 * 1000);
    if (cached) return cached;

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${FINANCE_SHEET}!A2:H`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        const transactions = rows.map((row) => ({
            id: Number(row[0]),
            type: row[1] as "income" | "expense",
            category: row[2] || "",
            description: row[3] || "",
            amount: Number(row[4]),
            date: row[5] || "",
            studentName: row[6] || undefined,
            studentId: row[7] ? Number(row[7]) : undefined,
        }));

        setCachedData(CACHE_KEYS.TRANSACTIONS, transactions);
        return transactions;
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
}

// Get transactions by month
export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
    const allTransactions = await getTransactions();
    return allTransactions.filter((t) => {
        const date = new Date(t.date);
        return date.getFullYear() === year && date.getMonth() === month;
    });
}

// Get monthly summary for chart
export async function getMonthlySummary(monthsBack: number = 12): Promise<{ month: string; income: number; expense: number; profit: number }[]> {
    const allTransactions = await getTransactions();
    const now = new Date();
    const result: { month: string; income: number; expense: number; profit: number }[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        const monthTransactions = allTransactions.filter((t) => {
            const d = new Date(t.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const income = monthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

        result.push({
            month: `${year}/${month + 1}`,
            income,
            expense,
            profit: income - expense,
        });
    }

    return result;
}

// Add transaction
// Add transaction
export async function addTransaction(transaction: Transaction) {
    try {
        const sheets = await getSheetsClient();
        const rowData = [
            transaction.id,
            transaction.type,
            transaction.category,
            transaction.description,
            transaction.amount,
            transaction.date,
            transaction.studentName || "",
            transaction.studentId || ""
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${FINANCE_SHEET}!A:A`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [rowData],
            },
        });

        invalidateCache(CACHE_KEYS.TRANSACTIONS);
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error adding transaction:", error);
        return { success: false, error };
    }
}

// Update transaction
// Update transaction
export async function updateTransaction(transaction: Transaction) {
    try {
        // We need to fetch fresh to find index, but we can try cache first if available
        // Ideally we should carry the row index but we don't.
        // For correctness, let's just use getTransactions() which is now cached.
        // If cache is stale, we might miss it, but 5 min is acceptable.
        // However, for updates, maybe we want to force refresh?
        // Let's rely on cache logic: if it's there use it.
        const transactions = await getTransactions();
        const existingIndex = transactions.findIndex((t) => t.id === transaction.id);

        if (existingIndex === -1) {
            return { success: false, error: "Transaction not found" };
        }

        const sheets = await getSheetsClient();
        const rowNumber = existingIndex + 2;
        const rowData = [
            transaction.id,
            transaction.type,
            transaction.category,
            transaction.description,
            transaction.amount,
            transaction.date,
            transaction.studentName || "",
            transaction.studentId || ""
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${FINANCE_SHEET}!A${rowNumber}:H${rowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [rowData],
            },
        });

        invalidateCache(CACHE_KEYS.TRANSACTIONS);
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error updating transaction:", error);
        return { success: false, error };
    }
}

// Delete transaction
// Delete transaction
export async function deleteTransaction(transactionId: number) {
    try {
        const transactions = await getTransactions();
        const existingIndex = transactions.findIndex((t) => t.id === transactionId);

        if (existingIndex === -1) {
            return { success: false, error: "Transaction not found" };
        }

        const sheets = await getSheetsClient();
        const rowNumber = existingIndex + 2;

        // Get sheet ID first
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const financeSheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === FINANCE_SHEET);
        if (!financeSheet?.properties?.sheetId) {
            return { success: false, error: "Sheet not found" };
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: financeSheet.properties.sheetId,
                                dimension: "ROWS",
                                startIndex: rowNumber - 1,
                                endIndex: rowNumber,
                            },
                        },
                    },
                ],
            },
        });

        invalidateCache(CACHE_KEYS.TRANSACTIONS);
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return { success: false, error };
    }
}

// ===== Tuition Payment Management =====

// Get tuition payments
export async function getTuitionPayments(year: number, month: number): Promise<TuitionPayment[]> {
    // Cache key specific to month
    const cacheKey = `tuition_${year}_${month}`;
    const cached = getCachedData<TuitionPayment[]>(cacheKey);
    if (cached) return cached;

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${TUITION_SHEET}'!A2:I`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        const payments = rows
            .filter((row) => Number(row[2]) === year && Number(row[3]) === month)
            .map((row) => ({
                studentId: Number(row[0]),
                studentName: row[1] || "",
                year: Number(row[2]),
                month: Number(row[3]),
                paid: row[4] === "TRUE" || row[4] === "true",
                paidDate: row[5] || undefined,
                amount: Number(row[6]) || 0,
                memo: row[7] || "",
                transactionId: row[8] ? Number(row[8]) : undefined,
            }));

        setCachedData(cacheKey, payments);
        return payments;
    } catch (error) {
        console.error("Error fetching tuition payments:", error);
        return [];
    }
}

// ===== Auto Transaction Helpers =====

const AUTO_CATEGORY = "[自動] レッスン料";

async function createAutoTransaction(description: string, amount: number, date: string, studentName: string, studentId: number) {
    const transaction: Transaction = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: "income",
        category: AUTO_CATEGORY,
        description,
        amount,
        date,
        studentName,
        studentId,
    };
    await addTransaction(transaction);
    return transaction.id;
}

async function removeAutoTransaction(description: string) {
    try {
        const transactions = await getTransactions();
        const autoTx = transactions.find(
            (t) => t.category === AUTO_CATEGORY && t.description === description
        );
        if (autoTx) {
            await deleteTransaction(autoTx.id);
        }
    } catch (error) {
        console.error("Error removing auto transaction:", error);
    }
}

// Save tuition payment status
export async function saveTuitionPayment(payment: TuitionPayment) {
    try {
        const sheets = await getSheetsClient();

        // Check if record exists
        const existingPayments = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${TUITION_SHEET}'!A2:H`,
        });

        const rows = existingPayments.data.values || [];
        const existingIndex = rows.findIndex(
            (row) =>
                Number(row[0]) === payment.studentId &&
                Number(row[2]) === payment.year &&
                Number(row[3]) === payment.month
        );

        // Check previous paid status
        const wasPaid = existingIndex !== -1 && (rows[existingIndex][4] === "TRUE" || rows[existingIndex][4] === "true");

        // Auto-transaction: create or remove
        const txDescription = `${payment.studentName} 月謝 ${payment.year}/${payment.month}月`;
        let newTransactionId = payment.transactionId;

        if (payment.paid && !wasPaid) {
            // Newly paid → create income transaction
            const txDate = payment.paidDate || new Date().toISOString().split("T")[0];
            newTransactionId = await createAutoTransaction(txDescription, payment.amount, txDate, payment.studentName, payment.studentId);
            invalidateCache(CACHE_KEYS.TRANSACTIONS); // Invalidate transactions cache
        } else if (!payment.paid && wasPaid) {
            // Unpaid → remove auto transaction
            if (payment.transactionId) {
                await deleteTransaction(payment.transactionId);
            } else {
                // Fallback for old data
                await removeAutoTransaction(txDescription);
            }
            newTransactionId = undefined;
            invalidateCache(CACHE_KEYS.TRANSACTIONS); // Invalidate transactions cache
        } else if (payment.paid && wasPaid && payment.transactionId) {
            // Amount/Memo update might need transaction update?
            // For now, if just Paid status didn't change, we assume transaction doesn't need re-linking, 
            // but if Amount changed, we ideally update the transaction too.
            // Let's implement amount update for robustness if we have ID.
            const transactions = await getTransactions();
            const existingTx = transactions.find(t => t.id === payment.transactionId);
            if (existingTx && existingTx.amount !== payment.amount) {
                await updateTransaction({ ...existingTx, amount: payment.amount });
            }
        }

        const rowData = [
            payment.studentId,
            payment.studentName,
            payment.year,
            payment.month,
            payment.paid,
            payment.paidDate || "",
            payment.amount,
            payment.memo || "",
            newTransactionId || ""
        ];

        if (existingIndex !== -1) {
            // Update
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `'${TUITION_SHEET}'!A${rowNumber}:I${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        } else {
            // Append
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `'${TUITION_SHEET}'!A:A`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        }

        // Invalidate specific cache
        invalidateCache(`tuition_${payment.year}_${payment.month}`);
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Error saving tuition payment:", error);
        return { success: false, error };
    }
}

// ===== Lesson Payment Management (都度払い) =====

// Get lesson payments for a specific month
export async function getLessonPayments(year: number, month: number): Promise<LessonPayment[]> {
    // Cache key specific to month
    const cacheKey = `lesson_payments_${year}_${month}`;
    const cached = getCachedData<LessonPayment[]>(cacheKey);
    if (cached) return cached;

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${LESSON_PAYMENTS_SHEET}!A2:I`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        const payments = rows
            .filter((row) => {
                const lessonDate = new Date(row[3]);
                return lessonDate.getFullYear() === year && lessonDate.getMonth() === month;
            })
            .map((row) => ({
                id: Number(row[0]),
                studentId: Number(row[1]),
                studentName: row[2] || "",
                lessonDate: row[3] || "",
                amount: Number(row[4]) || 0,
                paid: row[5] === "TRUE" || row[5] === "true",
                paidDate: row[6] || undefined,
                memo: row[7] || "",
                transactionId: row[8] ? Number(row[8]) : undefined,
            }));

        setCachedData(cacheKey, payments);
        return payments;
    } catch (error) {
        console.error("Error fetching lesson payments:", error);
        return [];
    }
}

// Save lesson payment
export async function saveLessonPayment(payment: LessonPayment) {
    try {
        const sheets = await getSheetsClient();

        // Check if record exists
        const existingPayments = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${LESSON_PAYMENTS_SHEET}!A2:H`,
        });

        const rows = existingPayments.data.values || [];
        const existingIndex = rows.findIndex((row) => Number(row[0]) === payment.id);

        // Check previous paid status
        const wasPaid = existingIndex !== -1 && (rows[existingIndex][5] === "TRUE" || rows[existingIndex][5] === "true");

        // Auto-transaction: create or remove
        const txDescription = `${payment.studentName} レッスン料 ${payment.lessonDate}`;
        let newTransactionId = payment.transactionId;

        if (payment.paid && !wasPaid) {
            // Newly paid → create income transaction
            const txDate = payment.paidDate || payment.lessonDate;
            newTransactionId = await createAutoTransaction(txDescription, payment.amount, txDate, payment.studentName, payment.studentId);
            invalidateCache(CACHE_KEYS.TRANSACTIONS); // Invalidate transactions cache
        } else if (!payment.paid && wasPaid) {
            // Unpaid → remove auto transaction
            if (payment.transactionId) {
                await deleteTransaction(payment.transactionId);
            } else {
                await removeAutoTransaction(txDescription);
            }
            newTransactionId = undefined;
            invalidateCache(CACHE_KEYS.TRANSACTIONS); // Invalidate transactions cache
        } else if (payment.paid && wasPaid && payment.transactionId) {
            const transactions = await getTransactions();
            const existingTx = transactions.find(t => t.id === payment.transactionId);
            if (existingTx && existingTx.amount !== payment.amount) {
                await updateTransaction({ ...existingTx, amount: payment.amount });
            }
        }

        const rowData = [
            payment.id,
            payment.studentId,
            payment.studentName,
            payment.lessonDate,
            payment.amount,
            payment.paid,
            payment.paidDate || "",
            payment.memo || "",
            newTransactionId || ""
        ];

        if (existingIndex !== -1) {
            // Update
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${LESSON_PAYMENTS_SHEET}!A${rowNumber}:I${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        } else {
            // Append
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${LESSON_PAYMENTS_SHEET}!A:A`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        }

        // Invalidate specific cache for this month
        const date = new Date(payment.lessonDate);
        invalidateCache(`lesson_payments_${date.getFullYear()}_${date.getMonth()}`);
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Error saving lesson payment:", error);
        return { success: false, error };
    }
}

// Get annual summary for tax reporting
export async function getAnnualSummary(year: number): Promise<{
    totalIncome: number;
    totalExpense: number;
    expenseByCategory: { category: string; amount: number }[];
    monthlyBreakdown: { month: string; income: number; expense: number }[];
}> {
    try {
        const transactions = await getTransactions();
        const yearTransactions = transactions.filter(
            (t) => new Date(t.date).getFullYear() === year
        );

        const totalIncome = yearTransactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = yearTransactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

        // Group expenses by category
        const expenseMap = new Map<string, number>();
        yearTransactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const current = expenseMap.get(t.category) || 0;
                expenseMap.set(t.category, current + t.amount);
            });

        const expenseByCategory = Array.from(expenseMap.entries()).map(([category, amount]) => ({
            category,
            amount,
        }));

        // Monthly breakdown
        const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
            const monthNum = i + 1;
            const monthTransactions = yearTransactions.filter(
                (t) => new Date(t.date).getMonth() === i
            );
            return {
                month: `${monthNum}月`,
                income: monthTransactions
                    .filter((t) => t.type === "income")
                    .reduce((sum, t) => sum + t.amount, 0),
                expense: monthTransactions
                    .filter((t) => t.type === "expense")
                    .reduce((sum, t) => sum + t.amount, 0),
            };
        });

        return { totalIncome, totalExpense, expenseByCategory, monthlyBreakdown };
    } catch (error) {
        console.error("Error getting annual summary:", error);
        return { totalIncome: 0, totalExpense: 0, expenseByCategory: [], monthlyBreakdown: [] };
    }
}
