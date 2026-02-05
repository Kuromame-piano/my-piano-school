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
}

const SHEET_NAME = "Finance";

export async function getTransactions(): Promise<Transaction[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:G`,
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
        }));
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return [];
    }
}

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
            transaction.studentName || ""
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:A`,
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
