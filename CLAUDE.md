# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack Next.js 16 + React 19 piano lesson management application for a Japanese piano teacher. Uses Google Sheets as database and Google Calendar for scheduling. Features include student management, lesson tracking, finance tracking, recital planning, sheet music library, and parent portal.

## Development Commands

```bash
# Development (uses Turbopack)
npm run dev

# Production build (uses Webpack - required for next-pwa)
npm run build
npm start

# Linting
npm run lint
```

## Architecture

### Data Flow Pattern

**Server Actions → Google APIs → In-Memory Cache**

- All data operations use Next.js Server Actions (files in `src/actions/`)
- Server Actions call Google Sheets API and Google Calendar API via `src/lib/google.ts`
- 30-second in-memory cache (`src/lib/dataCache.ts`) reduces API calls
- No traditional database - Google Sheets is the primary data store

### Google Sheets Structure

The application uses a single Google Spreadsheet (ID in `.env`) with multiple sheets:

- `Students` - Student records with embedded JSON in columns (pieces, lesson notes, recital history)
- `Textbooks` - Textbook catalog
- `TextbookProgress` - Student progress through textbooks
- `Transactions` - Financial records
- `LessonNotes` - Lesson notes (separate sheet for better querying)
- `ReportTemplates` - Report templates
- `Recitals` - Recital events and participants
- `SheetMusic` + `SheetMusicAssignments` - Sheet music library and assignments
- `ParentTokens` - Tokens for parent portal access

Initialize new sheets via: `GET /api/setup`

### Key Architectural Decisions

1. **Embedded JSON in Sheets**: Complex data (pieces array, lesson notes) stored as JSON strings in single cells. When updating, always parse → modify → stringify → save.

2. **Lazy Auth**: Google API authentication in `src/lib/google.ts` uses lazy initialization to avoid build-time errors. Credentials from env var `GOOGLE_SERVICE_ACCOUNT_KEY` (production) or `service-account.json` (local).

3. **Cache Invalidation**: Cache invalidated on write operations. Use `invalidateCache(CACHE_KEYS.STUDENTS)` after modifying student data.

4. **View-based Routing**: Single-page app pattern. Main page (`src/app/page.tsx`) renders different views via component switching, not Next.js routing.

5. **Parent Portal**: Separate route `/parent/[token]` provides read-only access for parents using token-based authentication (no login).

## Component Structure

### Main Application (`src/app/page.tsx`)

Client component managing view state. Renders one of:
- `DashboardView` - Overview with quick actions
- `StudentsView` - Student management (main feature)
- `ScheduleView` - Calendar integration
- `FinanceView` - Transaction tracking
- `ReportsView` - PDF report generation
- `RecitalView` - Recital planning
- `SheetMusicView` - Sheet music library

### StudentsView Pattern (applies to other views)

Large client component (~2000+ lines) with:
- Multiple modals for add/edit/detail operations
- Tab-based detail panel (active pieces, completed pieces, notes, progress, textbooks, recital history)
- Inline editing with optimistic updates
- Drag-and-drop for piece reordering (@dnd-kit)

When modifying: Find the relevant modal/tab section, update both UI and corresponding server action.

## Server Actions Guide

All server actions are in `src/actions/`:

- `studentActions.ts` - Student CRUD, pieces, lesson notes, progress
- `textbookActions.ts` - Textbook catalog and student progress
- `financeActions.ts` - Transaction management
- `calendarActions.ts` - Google Calendar events
- `reportActions.ts` - Report templates and generation
- `recitalActions.ts` - Recital events
- `sheetMusicActions.ts` - Sheet music library
- `parentActions.ts` - Parent portal token validation

### Common Patterns

**Reading data:**
```typescript
export async function getData(): Promise<Data[]> {
  const cached = getCachedData<Data[]>(CACHE_KEYS.DATA);
  if (cached) return cached;

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'SheetName!A2:Z',
  });

  const data = response.data.values?.map(row => ({...})) || [];
  setCachedData(CACHE_KEYS.DATA, data);
  return data;
}
```

**Updating data with embedded JSON:**
```typescript
// 1. Fetch entire row
const students = await getStudents();
const student = students.find(s => s.id === id);

// 2. Modify embedded JSON
const pieces = JSON.parse(student.piecesJson || '[]');
pieces.push(newPiece);

// 3. Stringify and update
const range = `Students!A${rowIndex}:P${rowIndex}`;
await sheets.spreadsheets.values.update({
  spreadsheetId: SPREADSHEET_ID,
  range,
  valueInputOption: 'USER_ENTERED',
  requestBody: {
    values: [[...row, JSON.stringify(pieces), ...]]
  }
});

// 4. Invalidate cache
invalidateCache(CACHE_KEYS.STUDENTS);
```

## Environment Variables

Required in `.env`:

```
SPREADSHEET_ID=<google_sheets_id>
CALENDAR_ID=<google_calendar_id>
GOOGLE_SERVICE_ACCOUNT_KEY=<json_string> # Production only (Vercel)
```

Local development also needs `service-account.json` in project root (gitignored).

## PWA Configuration

PWA enabled in production via `next-pwa`. Configured in `next.config.ts` with manifest at `public/manifest.json`. Disabled in development.

**Important**: Build must use Webpack (`npm run build --webpack`) because next-pwa doesn't support Turbopack. Dev uses Turbopack for speed.

## UI/UX Notes

- Japanese language UI (lang="ja" in layout)
- Dark theme (slate-950 background, slate-100 text)
- Mobile-responsive with sidebar drawer
- Color coding for students (purple/violet primary, warm tones in recent commits)
- "Glass card" aesthetic (semi-transparent backgrounds with borders)
- Double-click prevention on save buttons (implemented on many forms)

## Common Gotchas

1. **Row indices are 1-based in Sheets API** but student IDs are sequential. Always calculate: `rowIndex = studentId + 1` (assumes header row).

2. **JSON parsing errors**: Always handle empty/null values when parsing embedded JSON. Default to `[]` or `{}`.

3. **Cache stale data**: If data appears outdated, check cache invalidation after writes.

4. **API rate limits**: Google Sheets API has rate limits. Cache helps but bulk operations should be batched.

5. **Service account permissions**: The service account must have edit access to both the spreadsheet and calendar.

6. **TypeScript path alias**: `@/*` maps to `src/*`. Use for all imports.

## Testing Workflow

No automated tests currently. Manual testing workflow:
1. Test in development with `npm run dev`
2. Build locally with `npm run build` to verify production build
3. Deploy to Vercel (auto-deploy from git push)

## Deployment

Deployed on Vercel (project: "my-piano-project"). Commits to `master` auto-deploy. Current branch `vercel_umakuikanai` is for testing.

Ensure environment variables are set in Vercel dashboard before deploying.
