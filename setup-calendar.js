const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(__dirname, 'service-account.json');
const CALENDAR_ID = '116005eeac3600aee111394d70d00c27ff08689a086142a2049c6b2e9454cf77@group.calendar.google.com';

async function main() {
    console.log('Authenticating...');
    const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    console.log(`Adding calendar '${CALENDAR_ID}' to service account list...`);
    try {
        const res = await calendar.calendarList.insert({
            requestBody: {
                id: CALENDAR_ID
            }
        });
        console.log('Success! Calendar added:', res.data.summary);
    } catch (error) {
        console.error('Error adding calendar:', error.message);
        if (error.code === 409) {
            console.log('Note: Calendar was already in the list.');
        }
        if (error.response) {
            console.error('Details:', JSON.stringify(error.response.data, null, 2));
        }
    }

    console.log('Listing accessible calendars...');
    try {
        const list = await calendar.calendarList.list();
        if (list.data.items && list.data.items.length > 0) {
            list.data.items.forEach(c => {
                console.log(`- ${c.summary} (${c.id})`);
            });
        } else {
            console.log('(No calendars found in list)');
        }
    } catch (e) {
        console.error("Error listing:", e.message);
    }
}

main().catch(console.error);
