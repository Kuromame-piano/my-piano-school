"use server";

import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";

export interface SheetMusic {
    id: number;
    title: string;
    composer: string;
    difficulty?: number; // 1-5, optional
    genre?: string;      // optional
    pdfUrl?: string;
    notes?: string;
}

export interface StudentAssignment {
    sheetMusicId: number;
    studentId: number;
    studentName: string;
    assignedAt: string;
    status: "practicing" | "completed";
}

const SHEET_MUSIC_SHEET = "SheetMusic";
const ASSIGNMENTS_SHEET = "SheetMusicAssignments";

// Get all sheet music
export async function getSheetMusic(): Promise<SheetMusic[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_MUSIC_SHEET}!A2:G`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        return rows.map((row) => ({
            id: Number(row[0]),
            title: row[1] || "",
            composer: row[2] || "",
            difficulty: row[3] ? Number(row[3]) : undefined,
            genre: row[4] || "",
            pdfUrl: row[5] || "",
            notes: row[6] || "",
        }));
    } catch (error) {
        console.error("Error fetching sheet music:", error);
        return [];
    }
}

// Save sheet music
export async function saveSheetMusic(music: SheetMusic) {
    try {
        const allMusic = await getSheetMusic();
        const existingIndex = allMusic.findIndex((m) => m.id === music.id);

        const sheets = await getSheetsClient();
        const rowData = [
            music.id,
            music.title,
            music.composer,
            music.difficulty,
            music.genre,
            music.pdfUrl || "",
            music.notes || "",
        ];

        if (existingIndex !== -1) {
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_MUSIC_SHEET}!A${rowNumber}:G${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [rowData] },
            });
        } else {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_MUSIC_SHEET}!A:A`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [rowData] },
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error saving sheet music:", error);
        return { success: false, error };
    }
}

// Delete sheet music
export async function deleteSheetMusic(musicId: number) {
    try {
        const allMusic = await getSheetMusic();
        const existingIndex = allMusic.findIndex((m) => m.id === musicId);

        if (existingIndex === -1) {
            return { success: false, error: "Sheet music not found" };
        }

        const sheets = await getSheetsClient();
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === SHEET_MUSIC_SHEET);

        if (!sheet?.properties?.sheetId) {
            return { success: false, error: "Sheet not found" };
        }

        const rowNumber = existingIndex + 2;
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheet.properties.sheetId,
                            dimension: "ROWS",
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber,
                        },
                    },
                }],
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error deleting sheet music:", error);
        return { success: false, error };
    }
}

// Get assignments for a sheet music
export async function getAssignments(sheetMusicId?: number): Promise<StudentAssignment[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${ASSIGNMENTS_SHEET}!A2:E`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        let assignments = rows.map((row) => ({
            sheetMusicId: Number(row[0]),
            studentId: Number(row[1]),
            studentName: row[2] || "",
            assignedAt: row[3] || "",
            status: (row[4] || "practicing") as "practicing" | "completed",
        }));

        if (sheetMusicId !== undefined) {
            assignments = assignments.filter((a) => a.sheetMusicId === sheetMusicId);
        }

        return assignments;
    } catch (error) {
        console.error("Error fetching assignments:", error);
        return [];
    }
}

// Assign sheet music to student
export async function assignToStudent(sheetMusicId: number, studentId: number, studentName: string) {
    try {
        const sheets = await getSheetsClient();
        const rowData = [
            sheetMusicId,
            studentId,
            studentName,
            new Date().toISOString().split("T")[0],
            "practicing",
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${ASSIGNMENTS_SHEET}!A:A`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [rowData] },
        });
        return { success: true };
    } catch (error) {
        console.error("Error assigning sheet music:", error);
        return { success: false, error };
    }
}

// Remove assignment
export async function removeAssignment(sheetMusicId: number, studentId: number) {
    try {
        const assignments = await getAssignments();
        const existingIndex = assignments.findIndex(
            (a) => a.sheetMusicId === sheetMusicId && a.studentId === studentId
        );

        if (existingIndex === -1) {
            return { success: false, error: "Assignment not found" };
        }

        const sheets = await getSheetsClient();
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === ASSIGNMENTS_SHEET);

        if (!sheet?.properties?.sheetId) {
            return { success: false, error: "Sheet not found" };
        }

        const rowNumber = existingIndex + 2;
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheet.properties.sheetId,
                            dimension: "ROWS",
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber,
                        },
                    },
                }],
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error removing assignment:", error);
        return { success: false, error };
    }
}
