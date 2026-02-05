"use server";

import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";

export interface ReportTemplate {
    id: number;
    label: string;
    text: string;
    isCustom: boolean;
}

export interface ReportHistory {
    id: number;
    studentId: number;
    studentName: string;
    date: string;
    message: string;
    templateLabel: string;
}

const TEMPLATES_SHEET = "ReportTemplates";
const HISTORY_SHEET = "ReportHistory";

// Default templates (built-in)
const DEFAULT_TEMPLATES: ReportTemplate[] = [
    { id: 1, label: "順調に進んでいます", text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、順調に進んでいます。特に{良かった点}が素晴らしかったです。\n\n次回も{次回の目標}を中心に練習してみてください。引き続きよろしくお願いいたします！", isCustom: false },
    { id: 2, label: "とても頑張りました", text: "本日のレッスンもお疲れ様でした！\n\n今日は{曲名}に集中して取り組みました。{良かった点}がとても良くなっていて、日々の練習の成果が出ていますね！\n\n次回のレッスンまでに{次回の目標}を意識して練習してみてください。", isCustom: false },
    { id: 3, label: "次回へ向けて", text: "本日のレッスンもお疲れ様でした！\n\n{曲名}、少し難しい箇所がありましたが、焦らずゆっくり進めていきましょう。{アドバイス}\n\n次回は{次回の目標}から始めますね。引き続きよろしくお願いいたします！", isCustom: false },
];

// Get all templates (default + custom)
export async function getTemplates(): Promise<ReportTemplate[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TEMPLATES_SHEET}!A2:D`,
        });

        const rows = response.data.values;
        const customTemplates: ReportTemplate[] = rows
            ? rows.map((row) => ({
                id: Number(row[0]),
                label: row[1] || "",
                text: row[2] || "",
                isCustom: true,
            }))
            : [];

        return [...DEFAULT_TEMPLATES, ...customTemplates];
    } catch (error) {
        console.error("Error fetching templates:", error);
        return DEFAULT_TEMPLATES;
    }
}

// Save custom template
export async function saveTemplate(template: Omit<ReportTemplate, "id" | "isCustom">) {
    try {
        const sheets = await getSheetsClient();
        const templateId = Date.now();

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TEMPLATES_SHEET}!A:A`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[templateId, template.label, template.text]],
            },
        });
        return { success: true, templateId };
    } catch (error) {
        console.error("Error saving template:", error);
        return { success: false, error };
    }
}

// Update custom template
export async function updateTemplate(template: ReportTemplate) {
    try {
        if (!template.isCustom) {
            return { success: false, error: "Cannot update default templates" };
        }

        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TEMPLATES_SHEET}!A2:D`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex((row) => Number(row[0]) === template.id);

        if (existingIndex === -1) {
            return { success: false, error: "Template not found" };
        }

        const rowNumber = existingIndex + 2;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TEMPLATES_SHEET}!A${rowNumber}:C${rowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[template.id, template.label, template.text]],
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating template:", error);
        return { success: false, error };
    }
}

// Delete custom template
export async function deleteTemplate(templateId: number) {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${TEMPLATES_SHEET}!A2:D`,
        });

        const rows = response.data.values || [];
        const existingIndex = rows.findIndex((row) => Number(row[0]) === templateId);

        if (existingIndex === -1) {
            return { success: false, error: "Template not found" };
        }

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const templatesSheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === TEMPLATES_SHEET);
        if (!templatesSheet?.properties?.sheetId) {
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
                                sheetId: templatesSheet.properties.sheetId,
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
        console.error("Error deleting template:", error);
        return { success: false, error };
    }
}

// ===== Report History =====

// Get report history
export async function getReportHistory(studentId?: number): Promise<ReportHistory[]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${HISTORY_SHEET}!A2:F`,
        });

        const rows = response.data.values;
        if (!rows) return [];

        let history = rows.map((row) => ({
            id: Number(row[0]),
            studentId: Number(row[1]),
            studentName: row[2] || "",
            date: row[3] || "",
            message: row[4] || "",
            templateLabel: row[5] || "",
        }));

        if (studentId) {
            history = history.filter((h) => h.studentId === studentId);
        }

        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("Error fetching report history:", error);
        return [];
    }
}

// Save report to history
export async function saveReportHistory(report: Omit<ReportHistory, "id">) {
    try {
        const sheets = await getSheetsClient();
        const reportId = Date.now();

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${HISTORY_SHEET}!A:A`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [[
                    reportId,
                    report.studentId,
                    report.studentName,
                    report.date,
                    report.message,
                    report.templateLabel,
                ]],
            },
        });
        return { success: true, reportId };
    } catch (error) {
        console.error("Error saving report history:", error);
        return { success: false, error };
    }
}
