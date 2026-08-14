# ResumeAI — AI Resume Assistant

A Vercel-ready Next.js application that lets users upload a PDF/DOCX resume, receive an ATS-oriented content score, chat with the resume using an LLM, and compare the resume with a job description.

## Features

- PDF and DOCX resume extraction
- AI resume chat
- ATS-oriented content checks
- Job description matching
- Missing/weak keyword suggestions
- Responsive UI
- Vercel-ready API routes
- API key kept server-side

## Run locally

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Put your OpenAI API key in `OPENAI_API_KEY`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Deploy to Vercel

Import this repository into Vercel and add:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)

Then deploy.

## Important

This project is an AI-assisted career tool, not a guarantee of ATS acceptance or employment. Users should review generated resume content before submitting it.`