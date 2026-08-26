# CA Progress — CA Intermediate Study Tracker

A deployable Next.js study tracker preloaded from your syllabus PDF.

## Current features
- All 6 papers and chapters from the supplied PDF
- Chapter Done, 1st Revision, 2nd Revision, Test Done
- Subject progress and overall analytics snapshot
- Search chapters
- Responsive minimal interface
- Supabase database schema with per-user RLS
- Study sessions table for time analytics

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Add your Supabase project URL and anon key
4. Run `supabase/schema.sql` in Supabase SQL Editor
5. `npm run dev`

## Next integration step
The included UI currently uses local React state so it can run immediately. Connect `components/Tracker.tsx` to `chapter_progress` and Supabase Auth for persistent login/data. The database schema is ready for this.
