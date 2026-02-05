"use server";

import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";

interface Piece {
    id: number;
    title: string;
    progress: number;
    status: "active" | "completed";
    startedAt: string;
    completedAt?: string;
}

export interface Student {
    id: number;
    name: string;
    phone: string;
    address: string;
    lessonDay: string;
    pieces: Piece[];
    color: string;
}

const SHEET_NAME = "Students";

export async function getStudents(): Promise<Student[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:G`, // Assuming header row
        });

        const rows = response.data.values;
        if (!rows) return [];

        return rows.map((row) => ({
            id: Number(row[0]),
            name: row[1] || "",
            phone: row[2] || "",
            address: row[3] || "",
            lessonDay: row[4] || "",
            color: row[5] || "bg-gray-500",
            pieces: row[6] ? JSON.parse(row[6]) : [],
        }));
    } catch (error) {
        console.error("Error fetching students:", error);
        return [];
    }
}

export async function saveStudent(student: Student) {
    try {
        // In a real app with concurrent users, this simple "read all, find index, update" is risky for race conditions.
        // But for a single-user app or low volume, it's acceptable for now.
        // Better approach: Use row lookup or a dedicated ID column search.

        // For simplicity, we will just Append if ID doesn't exist, or Update if it does.
        // However, finding the ROW number is tricky without reading everything.
        // Le'ts read everything to find the row index.

        const students = await getStudents();
        const existingIndex = students.findIndex(s => s.id === student.id);

        const sheets = await getSheetsClient();

        const rowData = [
            student.id,
            student.name,
            student.phone,
            student.address,
            student.lessonDay,
            student.color,
            JSON.stringify(student.pieces)
        ];

        if (existingIndex !== -1) {
            // Update
            // precise range: A(2 + index)
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        } else {
            // Append
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A:A`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving student:", error);
        return { success: false, error };
    }
}
