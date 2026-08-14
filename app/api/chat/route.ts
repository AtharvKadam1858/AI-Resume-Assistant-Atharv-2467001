import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const resumeText = String(body.resumeText || "").slice(0, 60000);

    const messages = Array.isArray(body.messages)
      ? (body.messages as Message[]).slice(-12)
      : [];

    if (!resumeText) {
      return NextResponse.json(
        { error: "Upload a resume first." },
        { status: 400 }
      );
    }

    const conversation = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const prompt = `
You are ResumeAI, a professional resume and career assistant.

Use the uploaded resume as the primary source of truth.

IMPORTANT:
- Never invent facts.
- Never invent employers, degrees, dates, skills, achievements, projects, certifications or experience.
- If something is not present in the resume, clearly say that it is not mentioned.
- You may provide general career recommendations when appropriate.
- Be concise, practical and professional.
- Use bullet points when helpful.

UPLOADED RESUME:
${resumeText}

CONVERSATION:
${conversation}

Answer the user's latest question.
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({
      answer: response.text || "I could not generate an answer.",
    });
  } catch (error) {
    console.error("ResumeAI Chat Error:", error);

    return NextResponse.json(
      { error: "Gemini AI service error. Please try again." },
      { status: 500 }
    );
  }
}