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

export async function getUpcomingLessons(): Promise<CalendarEvent[]> {
    try {
        const calendar = await getCalendarClient();

        // Calculate timeMin (now) and timeMax (e.g., next 7 days)
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 14); // Fetch 2 weeks out

        const calendarId = process.env.CALENDAR_ID || 'primary';

        const response = await calendar.events.list({
            calendarId: calendarId,

            timeMin: now.toISOString(),
            timeMax: nextWeek.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 20,
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

    } catch (error) {
        console.error("Error fetching calendar events:", error);
        return [];
    }
}
