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
    email?: string;
    parentName?: string;
    parentPhone?: string;
    birthDate?: string;
    memo?: string;
}

const SHEET_NAME = "Students";

export async function getStudents(): Promise<Student[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:L`, // Expanded range for new columns
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
            email: row[7] || "",
            parentName: row[8] || "",
            parentPhone: row[9] || "",
            birthDate: row[10] || "",
            memo: row[11] || "",
        }));
    } catch (error) {
        console.error("Error fetching students:", error);
        return [];
    }
}

export async function saveStudent(student: Student) {
    try {
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
            JSON.stringify(student.pieces),
            student.email || "",
            student.parentName || "",
            student.parentPhone || "",
            student.birthDate || "",
            student.memo || ""
        ];

        if (existingIndex !== -1) {
            // Update
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
