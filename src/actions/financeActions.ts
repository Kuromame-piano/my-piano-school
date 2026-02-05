"use server";

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
}

const FINANCE_SHEET = "Finance";
const TUITION_SHEET = "TuitionPayments";
const LESSON_PAYMENTS_SHEET = "LessonPayments";

// Get all transactions
export async function getTransactions(): Promise<Transaction[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${FINANCE_SHEET}!A2:H`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        return rows.map((row) => ({
            id: Number(row[0]),
            type: row[1] as "income" | "expense",
            category: row[2] || "",
            description: row[3] || "",
            amount: Number(row[4]),
            date: row[5] || "",
            studentName: row[6] || undefined,
            studentId: row[7] ? Number(row[7]) : undefined,
        }));
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
        return { success: true };
    } catch (error) {
        console.error("Error adding transaction:", error);
        return { success: false, error };
    }
}

// Update transaction
export async function updateTransaction(transaction: Transaction) {
    try {
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
        return { success: true };
    } catch (error) {
        console.error("Error updating transaction:", error);
        return { success: false, error };
    }
}

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
        return { success: true };
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return { success: false, error };
    }
}

// ===== Tuition Payment Management =====

// Get tuition payments
export async function getTuitionPayments(year: number, month: number): Promise<TuitionPayment[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TUITION_SHEET}!A2:F`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        return rows
            .filter((row) => Number(row[2]) === year && Number(row[3]) === month)
            .map((row) => ({
                studentId: Number(row[0]),
                studentName: row[1] || "",
                year: Number(row[2]),
                month: Number(row[3]),
                paid: row[4] === "TRUE" || row[4] === "true",
                paidDate: row[5] || undefined,
                amount: Number(row[6]) || 0,
            }));
    } catch (error) {
        console.error("Error fetching tuition payments:", error);
        return [];
    }
}

// Save tuition payment status
export async function saveTuitionPayment(payment: TuitionPayment) {
    try {
        const sheets = await getSheetsClient();

        // Check if record exists
        const existingPayments = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TUITION_SHEET}!A2:F`,
        });

        const rows = existingPayments.data.values || [];
        const existingIndex = rows.findIndex(
            (row) =>
                Number(row[0]) === payment.studentId &&
                Number(row[2]) === payment.year &&
                Number(row[3]) === payment.month
        );

        const rowData = [
            payment.studentId,
            payment.studentName,
            payment.year,
            payment.month,
            payment.paid,
            payment.paidDate || "",
            payment.amount,
        ];

        if (existingIndex !== -1) {
            // Update
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${TUITION_SHEET}!A${rowNumber}:G${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        } else {
            // Append
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${TUITION_SHEET}!A:A`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving tuition payment:", error);
        return { success: false, error };
    }
}

// ===== Lesson Payment Management (都度払い) =====

// Get lesson payments for a specific month
export async function getLessonPayments(year: number, month: number): Promise<LessonPayment[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${LESSON_PAYMENTS_SHEET}!A2:G`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        return rows
            .filter((row) => {
                const lessonDate = new Date(row[3]);
                return lessonDate.getFullYear() === year && lessonDate.getMonth() + 1 === month;
            })
            .map((row) => ({
                id: Number(row[0]),
                studentId: Number(row[1]),
                studentName: row[2] || "",
                lessonDate: row[3] || "",
                amount: Number(row[4]) || 0,
                paid: row[5] === "TRUE" || row[5] === "true",
                paidDate: row[6] || undefined,
            }));
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
            range: `${LESSON_PAYMENTS_SHEET}!A2:G`,
        });

        const rows = existingPayments.data.values || [];
        const existingIndex = rows.findIndex((row) => Number(row[0]) === payment.id);

        const rowData = [
            payment.id,
            payment.studentId,
            payment.studentName,
            payment.lessonDate,
            payment.amount,
            payment.paid,
            payment.paidDate || "",
        ];

        if (existingIndex !== -1) {
            // Update
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${LESSON_PAYMENTS_SHEET}!A${rowNumber}:G${rowNumber}`,
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
