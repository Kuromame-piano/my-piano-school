
import { getSheetsClient, SPREADSHEET_ID } from "../lib/google";

async function listSheets() {
    try {
        console.log("Fetching sheets for ID:", SPREADSHEET_ID);
        const client = await getSheetsClient();
        const response = await client.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const sheets = response.data.sheets;
        if (!sheets) {
            console.log("No sheets found.");
            return;
        }

        console.log("Available sheets:");
        sheets.forEach((sheet) => {
            console.log(`- ${sheet.properties?.title} (ID: ${sheet.properties?.sheetId})`);
        });

    } catch (error) {
        console.error("Error listing sheets:", error);
    }
}

listSheets();
