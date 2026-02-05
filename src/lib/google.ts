import { google } from 'googleapis';
import path from 'path';

// Load the service account key file
// In production, you might want to load this from an environment variable directly
// but for this project we'll look for the file.
const keyFile = path.join(process.cwd(), 'service-account.json');

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];

const auth = new google.auth.GoogleAuth({
    keyFile: keyFile,
    scopes: SCOPES,
});

export const getSheetsClient = async () => {
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client as any });
};

export const getCalendarClient = async () => {
    const client = await auth.getClient();
    return google.calendar({ version: 'v3', auth: client as any });
};

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "";
