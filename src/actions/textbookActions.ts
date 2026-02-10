"use server";

import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";
import { getCachedData, setCachedData, invalidateCache, CACHE_KEYS } from "../lib/dataCache";

export interface Textbook {
    id: number;
    title: string;
    level: string; // e.g., "Intro", "Beginner", "Intermediate"
    totalPages: number;
    publisher?: string;
    description?: string;
}

export interface TextbookProgress {
    studentId: number;
    textbookId: number;
    status: "in_progress" | "completed";
    currentPage: number;
    startDate: string;
    completedDate?: string;
    lastUpdated: string;
}

const TEXTBOOKS_SHEET = "Textbooks";
const PROGRESS_SHEET = "TextbookProgress";

// Master Data: Textbooks
export async function getTextbooks(): Promise<Textbook[]> {
    // キャッシュがあれば即時返却
    const cached = getCachedData<Textbook[]>(CACHE_KEYS.TEXTBOOKS);
    if (cached) {
        return cached;
    }

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TEXTBOOKS_SHEET}!A2:F`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        const textbooks = rows.map((row) => ({
            id: Number(row[0]),
            title: row[1],
            level: row[2],
            totalPages: Number(row[3]),
            publisher: row[4] || "",
            description: row[5] || "",
        }));

        // キャッシュに保存
        setCachedData(CACHE_KEYS.TEXTBOOKS, textbooks);

        return textbooks;
    } catch (error) {
        console.error("Error fetching textbooks:", error);
        return [];
    }
}

export async function addTextbook(textbook: Omit<Textbook, "id">) {
    try {
        const sheets = await getSheetsClient();
        const id = Date.now();

        const rowData = [
            id,
            textbook.title,
            textbook.level,
            textbook.totalPages,
            textbook.publisher || "",
            textbook.description || "",
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TEXTBOOKS_SHEET}!A:A`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [rowData],
            },
        });
        return { success: true, id };
    } catch (error) {
        console.error("Error adding textbook:", error);
        return { success: false, error };
    }
}

// Student Progress
export async function getTextbookProgress(studentId: number): Promise<(TextbookProgress & { textbookTitle: string; totalPages: number })[]> {
    try {
        const [progressRes, textbooks] = await Promise.all([
            (await getSheetsClient()).spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: `${PROGRESS_SHEET}!A2:G`,
            }),
            getTextbooks(),
        ]);

        const rows = progressRes.data.values;
        if (!rows) return [];

        const progressList = rows
            .filter((row) => Number(row[0]) === studentId)
            .map((row) => {
                const textbook = textbooks.find(t => t.id === Number(row[1]));
                return {
                    studentId: Number(row[0]),
                    textbookId: Number(row[1]),
                    status: row[2] as "in_progress" | "completed",
                    currentPage: Number(row[3]),
                    startDate: row[4],
                    completedDate: row[5] || undefined,
                    lastUpdated: row[6],
                    textbookTitle: textbook?.title || "Unknown Textbook",
                    totalPages: textbook?.totalPages || 100,
                };
            });

        return progressList;
    } catch (error) {
        console.error("Error fetching progress:", error);
        return [];
    }
}

export async function saveTextbookProgress(progress: TextbookProgress) {
    try {
        const sheets = await getSheetsClient();

        // Check for existing record to update
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${PROGRESS_SHEET}!A2:G`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex(
            (row) => Number(row[0]) === progress.studentId && Number(row[1]) === progress.textbookId
        );

        const rowData = [
            progress.studentId,
            progress.textbookId,
            progress.status,
            progress.currentPage,
            progress.startDate,
            progress.completedDate || "",
            new Date().toISOString(), // lastUpdated
        ];

        if (existingIndex !== -1) {
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${PROGRESS_SHEET}!A${rowNumber}:G${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        } else {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${PROGRESS_SHEET}!A:A`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving progress:", error);
        return { success: false, error };
    }
}

export async function updateTextbookCurrentPage(studentId: number, textbookId: number, currentPage: number) {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${PROGRESS_SHEET}!A2:G`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex(
            (row) => Number(row[0]) === studentId && Number(row[1]) === textbookId
        );

        if (existingIndex === -1) {
            return { success: false, error: "Progress not found" };
        }

        const rowNumber = existingIndex + 2;
        const existingRow = rows[existingIndex];
        const rowData = [
            studentId,
            textbookId,
            existingRow[2], // status
            currentPage,
            existingRow[4], // startDate
            existingRow[5] || "", // completedDate
            new Date().toISOString(), // lastUpdated
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${PROGRESS_SHEET}!A${rowNumber}:G${rowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [rowData],
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating textbook page:", error);
        return { success: false, error };
    }
}

export async function completeTextbook(studentId: number, textbookId: number) {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${PROGRESS_SHEET}!A2:G`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex(
            (row) => Number(row[0]) === studentId && Number(row[1]) === textbookId
        );

        if (existingIndex === -1) {
            return { success: false, error: "Progress not found" };
        }

        const rowNumber = existingIndex + 2;
        const existingRow = rows[existingIndex];
        const textbooks = await getTextbooks();
        const textbook = textbooks.find(t => t.id === textbookId);

        const rowData = [
            studentId,
            textbookId,
            "completed",
            textbook?.totalPages || existingRow[3], // Set to total pages
            existingRow[4], // startDate
            new Date().toISOString(), // completedDate
            new Date().toISOString(), // lastUpdated
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${PROGRESS_SHEET}!A${rowNumber}:G${rowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [rowData],
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error completing textbook:", error);
        return { success: false, error };
    }
}

export async function deleteTextbookProgress(studentId: number, textbookId: number) {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${PROGRESS_SHEET}!A2:G`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex(
            (row) => Number(row[0]) === studentId && Number(row[1]) === textbookId
        );

        if (existingIndex === -1) {
            return { success: false, error: "Progress not found" };
        }

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const progressSheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === PROGRESS_SHEET);
        if (!progressSheet?.properties?.sheetId) {
            return { success: false, error: "Sheet not found" };
        }

        const rowNumber = existingIndex + 2;
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: progressSheet.properties.sheetId,
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
        console.error("Error deleting textbook progress:", error);
        return { success: false, error };
    }
}

