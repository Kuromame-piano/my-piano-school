"use server";

import { getCalendarClient } from "../lib/google";

export interface CalendarEvent {
    id: string;
    title: string;
    start: string; // ISO string
    end: string;   // ISO string
    location?: string;
    description?: string;
}

export async function getLessons(timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    try {
        const calendar = await getCalendarClient();
        const calendarId = process.env.CALENDAR_ID || 'primary';

        // Default to "now until 2 weeks" if no range provided
        let minDate = new Date();
        let maxDate = new Date();
        maxDate.setDate(minDate.getDate() + 14);

        if (timeMin) minDate = new Date(timeMin);
        if (timeMax) maxDate = new Date(timeMax);

        console.log(`[DEBUG] Fetching events for ${calendarId} from ${minDate.toISOString()} to ${maxDate.toISOString()}`);

        try {
            const response = await calendar.events.list({
                calendarId: calendarId,
                timeMin: minDate.toISOString(),
                timeMax: maxDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 100, // Increased for full month views
            });

            const events = response.data.items;
            if (!events) return [];

            return events.map(event => ({
                id: event.id || "",
                title: event.summary || "No Title",
                start: event.start?.dateTime || event.start?.date || "",
                end: event.end?.dateTime || event.end?.date || "",
                location: event.location || "",
                description: event.description || ""
            }));
        } catch (innerError: any) {
            console.error(`[DEBUG] Failed to fetch events for '${calendarId}'. Status: ${innerError.code}`);
            // Try listing available calendars to see if permission is working at all
            try {
                const listResp = await calendar.calendarList.list();
                console.log("[DEBUG] Available Calendars for this Service Account:");
                listResp.data.items?.forEach(c => console.log(` - ${c.summary} (${c.id})`));
            } catch (listError) {
                console.error("[DEBUG] Could not list calendars either.", listError);
            }
            throw innerError;
        }

    } catch (error) {
        console.error("Error fetching calendar events:", error);
        return [];
    }
}
