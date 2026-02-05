import { google } from 'googleapis';
import path from 'path';

// Define scopes
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];

// Load credentials from Environment Variable (for Vercel) or File (for Local)
// Load credentials from Environment Variable (for Vercel) or File (for Local)
const getAuthOptions = () => {
    // 1. Try Environment Variable
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
            return {
                credentials,
                scopes: SCOPES,
            };
        } catch (error) {
            console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string.");
            // If the user provided the content without braces (common mistake), we could hint at that,
            // but for now, we just log the error and fall through to check for the file.
        }
    }

    // 2. Try Local File
    const filePath = path.join(process.cwd(), 'service-account.json');
    // We can't easily check for file existence synchronously in all environments without fs, 
    // but google-auth-library handles the file check internally if we pass keyFile. 
    // However, to provide a better error message, we rely on the library throwing if the file is missing.
    // Ideally, if we are in production (Vercel) and the Env Var failed or is missing, we should probably fail hard here 
    // if we know the file won't be there.

    return {
        keyFile: filePath,
        scopes: SCOPES,
    };
};

// Lazy initialization to avoid build failures
let auth: any = null;
const getAuth = () => {
    if (!auth) {
        auth = new google.auth.GoogleAuth(getAuthOptions());
    }
    return auth;
};

export const getSheetsClient = async () => {
    const client = await getAuth().getClient();
    return google.sheets({ version: 'v4', auth: client });
};

export const getCalendarClient = async () => {
    const client = await getAuth().getClient();
    return google.calendar({ version: 'v3', auth: client });
};

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "";
