
import { getSheetsClient, SPREADSHEET_ID } from '../lib/google';

const TUITION_SHEET = "TuitionPayments";
const LESSON_PAYMENTS_SHEET = "LessonPayments";

async function createSheets() {
    try {
        console.log("Checking sheets for ID:", SPREADSHEET_ID);
        const client = await getSheetsClient();
        const response = await client.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const existingSheets = response.data.sheets?.map(s => s.properties?.title) || [];
        const requests: any[] = [];

        // 1. Create TuitionPayments Sheet if missing
        if (!existingSheets.includes(TUITION_SHEET)) {
            console.log(`Preparing to create ${TUITION_SHEET}...`);
            requests.push({
                addSheet: {
                    properties: {
                        title: TUITION_SHEET,
                    },
                },
            });
        } else {
            console.log(`${TUITION_SHEET} already exists.`);
        }

        // 2. Create LessonPayments Sheet if missing
        if (!existingSheets.includes(LESSON_PAYMENTS_SHEET)) {
            console.log(`Preparing to create ${LESSON_PAYMENTS_SHEET}...`);
            requests.push({
                addSheet: {
                    properties: {
                        title: LESSON_PAYMENTS_SHEET,
                    },
                },
            });
        } else {
            console.log(`${LESSON_PAYMENTS_SHEET} already exists.`);
        }

        if (requests.length > 0) {
            await client.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests,
                },
            });
            console.log("Sheets created successfully.");
        }

        // 3. Add Headers
        // We do this after creation or if they exist (to ensure headers are present if empty? No, just if we created them or if they are empty. For now, let's just write to A1:G1)

        // TuitionPayments Headers
        console.log(`Updating headers for ${TUITION_SHEET}...`);
        await client.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${TUITION_SHEET}'!A1:G1`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    ["Student ID", "Student Name", "Year", "Month", "Paid", "Paid Date", "Amount"]
                ]
            }
        });

        // LessonPayments Headers
        console.log(`Updating headers for ${LESSON_PAYMENTS_SHEET}...`);
        await client.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${LESSON_PAYMENTS_SHEET}'!A1:G1`,
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    ["ID", "Student ID", "Student Name", "Lesson Date", "Amount", "Paid", "Paid Date"]
                ]
            }
        });

        console.log("Headers updated.");

    } catch (error) {
        console.error("Error creating sheets:", error);
    }
}

createSheets();
