import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const { resumeText, jobDescription } = await request.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: "Resume and job description are required." },
        { status: 400 }
      );
    }

    const prompt = `
You are an ATS and recruitment analysis assistant.

Compare the candidate's resume with the job description.

Rules:
- Do not invent qualifications or experience.
- Use only information supported by the resume.
- Give a realistic score from 0 to 100.
- Identify strong matches.
- Identify missing or weak requirements.
- Suggest relevant keywords only when they are genuinely supported by the resume.
- Give practical recommendations.

Return ONLY valid JSON in exactly this format:

{
  "score": 0,
  "summary": "string",
  "strongMatches": ["string"],
  "missingOrWeak": ["string"],
  "keywordsToAdd": ["string"],
  "recommendedActions": ["string"]
}

RESUME:
${String(resumeText).slice(0, 60000)}

JOB DESCRIPTION:
${String(jobDescription).slice(0, 30000)}
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
    });

    let raw = response.text?.trim() || "";

    raw = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const data = JSON.parse(raw);

    return NextResponse.json(data);
  } catch (error) {
    console.error("ResumeAI Job Match Error:", error);

    return NextResponse.json(
      { error: "Could not calculate job match. Please try again." },
      { status: 500 }
    );
  }
}