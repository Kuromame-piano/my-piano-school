"use server";

import { revalidatePath } from "next/cache";
import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";
import { getCachedData, setCachedData, invalidateCache, CACHE_KEYS, CACHE_TTL } from "../lib/dataCache";


export interface Recital {
    id: number;
    name: string;
    date: string;
    location: string;
    description: string;
    participants: RecitalParticipant[];
}

export interface RecitalParticipant {
    id?: string;
    studentId?: number;
    studentName: string;
    piece: string;
    order: number;
    isGuest?: boolean;
    studentRecitalRecordId?: number;
}

const SHEET_NAME = "Recitals";

// Get all recitals
export async function getRecitals(): Promise<Recital[]> {
    // キャッシュがあれば即時返却（2分キャッシュ）
    const cached = getCachedData<Recital[]>(CACHE_KEYS.RECITALS, CACHE_TTL.RECITALS);
    if (cached) {
        return cached;
    }

    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A2:F`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        const result = rows.map((row) => ({
            id: Number(row[0]),
            name: row[1] || "",
            date: row[2] || "",
            location: row[3] || "",
            description: row[4] || "",
            participants: row[5] ? JSON.parse(row[5]) : [],
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // キャッシュに保存
        setCachedData(CACHE_KEYS.RECITALS, result);

        return result;
    } catch (error) {
        console.error("Error fetching recitals:", error);
        return [];
    }
}

// Save recital
export async function saveRecital(recital: Recital) {
    try {
        const recitals = await getRecitals();
        const existingIndex = recitals.findIndex((r) => r.id === recital.id);

        const sheets = await getSheetsClient();
        const rowData = [
            recital.id,
            recital.name,
            recital.date,
            recital.location,
            recital.description,
            JSON.stringify(recital.participants),
        ];

        if (existingIndex !== -1) {
            const rowNumber = existingIndex + 2;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A${rowNumber}:F${rowNumber}`,
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

        // キャッシュを無効化
        invalidateCache(CACHE_KEYS.RECITALS);

        return { success: true };
    } catch (error) {
        console.error("Error saving recital:", error);
        return { success: false, error };
    }
}

// Delete recital
export async function deleteRecital(recitalId: number) {
    try {
        const recitals = await getRecitals();
        const existingIndex = recitals.findIndex((r) => r.id === recitalId);

        if (existingIndex === -1) {
            return { success: false, error: "Recital not found" };
        }

        const sheets = await getSheetsClient();
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const recitalsSheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === SHEET_NAME);
        if (!recitalsSheet?.properties?.sheetId) {
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
                                sheetId: recitalsSheet.properties.sheetId,
                                dimension: "ROWS",
                                startIndex: rowNumber - 1,
                                endIndex: rowNumber,
                            },
                        },
                    },
                ],
            },
        });

        // キャッシュを無効化
        invalidateCache(CACHE_KEYS.RECITALS);

        return { success: true };
    } catch (error) {
        console.error("Error deleting recital:", error);
        return { success: false, error };
    }
}
