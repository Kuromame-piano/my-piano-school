"use server";

import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";
import { getCachedData, setCachedData, invalidateCache, CACHE_KEYS } from "../lib/dataCache";

interface Piece {
    id: number;
    title: string;
    progress: number;
    status: "active" | "completed";
    startedAt: string;
    completedAt?: string;
    coverImage?: string;
    sheetMusicId?: number;  // Reference to sheet music library
}

interface LessonNote {
    id: number;
    date: string;
    content: string;
    pieces?: string[];
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
    archived?: boolean;
    lessonNotes?: LessonNote[];
    gradeLevel?: string;
    status?: string;
    recitalHistory?: RecitalRecord[];
    paymentType?: "monthly" | "per-lesson";  // 月謝制 or 都度払い
    monthlyFee?: number;  // 月謝額または1レッスンあたりの料金
}

export interface RecitalRecord {
    id: number;
    date: string;
    eventName?: string;
    piece?: string;
    venue?: string;
    memo?: string;
    recitalId?: number;
}

const SHEET_NAME = "Students";
const NOTES_SHEET = "LessonNotes";

export async function getStudents(includeArchived: boolean = false): Promise<Student[]> {
    const cacheKey = includeArchived ? CACHE_KEYS.STUDENTS_ALL : CACHE_KEYS.STUDENTS;

    // キャッシュがあれば即時返却
    const cached = getCachedData<Student[]>(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:R`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        const students = rows.map((row) => ({
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
            archived: row[12] === "TRUE" || row[12] === "true",
            gradeLevel: row[13] || "",
            status: row[14] || "継続中",
            recitalHistory: row[15] ? JSON.parse(row[15]) : [],
            paymentType: (row[16] as "monthly" | "per-lesson") || "monthly",
            monthlyFee: row[17] ? Number(row[17]) : 0,
        }));

        const result = includeArchived ? students : students.filter((s) => !s.archived);

        // キャッシュに保存
        setCachedData(cacheKey, result);

        return result;
    } catch (error) {
        console.error("Error fetching students:", error);
        return [];
    }
}

export async function saveStudent(student: Student) {
    try {
        const sheets = await getSheetsClient();

        // ID列のみ取得して行番号を効率的に特定（全データ取得を回避）
        const idsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:A`,
        });
        const ids = idsResponse.data.values?.map(row => Number(row[0])) || [];
        const existingIndex = ids.findIndex((id) => id === student.id);

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
            student.memo || "",
            student.archived || false,
            student.gradeLevel || "",
            student.status || "継続中",
            JSON.stringify(student.recitalHistory || []),
            student.paymentType || "monthly",
            student.monthlyFee || 0,
        ];

        if (existingIndex !== -1) {
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A${rowNumber}:R${rowNumber}`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        } else {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A:A`,
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [rowData],
                },
            });
        }

        // キャッシュを無効化（次回getStudents時に最新データを取得）
        invalidateCache(CACHE_KEYS.STUDENTS);
        invalidateCache(CACHE_KEYS.STUDENTS_ALL);

        return { success: true };
    } catch (error) {
        console.error("Error saving student:", error);
        return { success: false, error };
    }
}

export async function archiveStudent(studentId: number, archive: boolean = true) {
    try {
        const students = await getStudents(true);
        const student = students.find((s) => s.id === studentId);
        if (!student) {
            return { success: false, error: "Student not found" };
        }
        student.archived = archive;
        return await saveStudent(student);
    } catch (error) {
        console.error("Error archiving student:", error);
        return { success: false, error };
    }
}

// ===== Lesson Notes =====

export async function getLessonNotes(studentId: number): Promise<LessonNote[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${NOTES_SHEET}!A2:E`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        return rows
            .filter((row) => Number(row[0]) === studentId)
            .map((row) => ({
                id: Number(row[1]),
                date: row[2] || "",
                content: row[3] || "",
                pieces: row[4] ? JSON.parse(row[4]) : [],
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("Error fetching lesson notes:", error);
        return [];
    }
}

export async function addLessonNote(studentId: number, note: Omit<LessonNote, "id">) {
    try {
        const sheets = await getSheetsClient();
        const noteId = Date.now();

        const rowData = [
            studentId,
            noteId,
            note.date,
            note.content,
            JSON.stringify(note.pieces || []),
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${NOTES_SHEET}!A:A`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [rowData],
            },
        });
        return { success: true, noteId };
    } catch (error) {
        console.error("Error adding lesson note:", error);
        return { success: false, error };
    }
}

export async function deleteLessonNote(studentId: number, noteId: number) {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${NOTES_SHEET}!A2:E`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex(
            (row) => Number(row[0]) === studentId && Number(row[1]) === noteId
        );

        if (existingIndex === -1) {
            return { success: false, error: "Note not found" };
        }

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const notesSheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === NOTES_SHEET);
        if (!notesSheet?.properties?.sheetId) {
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
                                sheetId: notesSheet.properties.sheetId,
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
        console.error("Error deleting lesson note:", error);
        return { success: false, error };
    }
}

export async function updateLessonNote(studentId: number, noteId: number, date: string, content: string) {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${NOTES_SHEET}!A2:E`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex(
            (row) => Number(row[0]) === studentId && Number(row[1]) === noteId
        );

        if (existingIndex === -1) {
            return { success: false, error: "Note not found" };
        }

        const rowNumber = existingIndex + 2;
        const existingRow = rows[existingIndex];
        const rowData = [
            studentId,
            noteId,
            date,
            content,
            existingRow[4] || "[]", // Keep existing pieces
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${NOTES_SHEET}!A${rowNumber}:E${rowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [rowData],
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating lesson note:", error);
        return { success: false, error };
    }
}

// Update piece cover image
export async function updatePieceCoverImage(studentId: number, pieceId: number, imageUrl: string) {
    try {
        const students = await getStudents(true);
        const student = students.find((s) => s.id === studentId);
        if (!student) {
            return { success: false, error: "Student not found" };
        }

        const pieceIndex = student.pieces.findIndex((p) => p.id === pieceId);
        if (pieceIndex === -1) {
            return { success: false, error: "Piece not found" };
        }

        student.pieces[pieceIndex].coverImage = imageUrl;
        return await saveStudent(student);
    } catch (error) {
        console.error("Error updating piece cover image:", error);
        return { success: false, error };
    }
}

// Get student progress over time (for chart)
export async function getStudentProgress(studentId: number): Promise<{ month: string; completedCount: number }[]> {
    try {
        const students = await getStudents(true);
        const student = students.find((s) => s.id === studentId);
        if (!student) return [];

        const completedPieces = student.pieces.filter((p) => p.status === "completed" && p.completedAt);

        // Group by month
        const monthMap = new Map<string, number>();
        completedPieces.forEach((piece) => {
            if (piece.completedAt) {
                const date = new Date(piece.completedAt);
                const key = `${date.getFullYear()}/${date.getMonth() + 1}`;
                monthMap.set(key, (monthMap.get(key) || 0) + 1);
            }
        });

        // Get last 12 months
        const result: { month: string; completedCount: number }[] = [];
        const now = new Date();
        let cumulative = 0;

        for (let i = 11; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${targetDate.getFullYear()}/${targetDate.getMonth() + 1}`;
            cumulative += monthMap.get(key) || 0;
            result.push({ month: key, completedCount: cumulative });
        }

        return result;
    } catch (error) {
        console.error("Error getting student progress:", error);
        return [];
    }
}
