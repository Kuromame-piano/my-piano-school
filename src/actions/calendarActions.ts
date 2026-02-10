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

const calendarId = process.env.CALENDAR_ID || 'primary';

export async function getLessons(timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    try {
        const calendar = await getCalendarClient();

        // Default to "now until 2 weeks" if no range provided
        let minDate = new Date();
        let maxDate = new Date();
        maxDate.setDate(minDate.getDate() + 14);

        if (timeMin) minDate = new Date(timeMin);
        if (timeMax) maxDate = new Date(timeMax);

        try {
            const response = await calendar.events.list({
                calendarId: calendarId,
                timeMin: minDate.toISOString(),
                timeMax: maxDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 100,
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
            console.error(`Failed to fetch events for '${calendarId}'. Status: ${innerError.code}`);
            throw innerError;
        }

    } catch (error) {
        console.error("Error fetching calendar events:", error);
        return [];
    }
}

// Create a new lesson event
export async function createLesson(event: Omit<CalendarEvent, "id">) {
    try {
        const calendar = await getCalendarClient();

        const response = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: {
                summary: event.title,
                description: event.description,
                location: event.location,
                start: {
                    dateTime: event.start,
                    timeZone: 'Asia/Tokyo',
                },
                end: {
                    dateTime: event.end,
                    timeZone: 'Asia/Tokyo',
                },
            },
        });

        return { success: true, eventId: response.data.id };
    } catch (error: any) {
        console.error("Error creating calendar event:", error);
        const message = error?.message || "カレンダーイベントの作成に失敗しました";
        return { success: false, error: message };
    }
}

// Update an existing lesson event
export async function updateLesson(event: CalendarEvent) {
    try {
        const calendar = await getCalendarClient();

        await calendar.events.update({
            calendarId: calendarId,
            eventId: event.id,
            requestBody: {
                summary: event.title,
                description: event.description,
                location: event.location,
                start: {
                    dateTime: event.start,
                    timeZone: 'Asia/Tokyo',
                },
                end: {
                    dateTime: event.end,
                    timeZone: 'Asia/Tokyo',
                },
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating calendar event:", error);
        const message = error?.message || "カレンダーイベントの更新に失敗しました";
        return { success: false, error: message };
    }
}

// Delete a lesson event
export async function deleteLesson(eventId: string) {
    try {
        const calendar = await getCalendarClient();

        await calendar.events.delete({
            calendarId: calendarId,
            eventId: eventId,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting calendar event:", error);
        const message = error?.message || "カレンダーイベントの削除に失敗しました";
        return { success: false, error: message };
    }
}
