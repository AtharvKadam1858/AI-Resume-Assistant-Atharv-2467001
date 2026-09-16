import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured in .env.local",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const resumeText =
      typeof body.resumeText === "string"
        ? body.resumeText.trim()
        : "";

    const messages: Message[] = Array.isArray(body.messages)
      ? body.messages.filter(
          (message: Message) =>
            message &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim()
        )
      : [];

    if (!resumeText) {
      return NextResponse.json(
        {
          error: "Please upload your resume first.",
        },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "user" && message.content.trim().length > 0
      );

    if (!lastUserMessage) {
      return NextResponse.json(
        {
          error: "Please enter a question.",
        },
        { status: 400 }
      );
    }

    /*
     * Keep the prompt size under control.
     * This prevents very long conversations/resumes from causing
     * unnecessary Gemini request failures.
     */

    const limitedResume = resumeText.slice(0, 50000);

    const recentMessages = messages.slice(-8);

    const conversation = recentMessages
      .map((message) => {
        const role =
          message.role === "user" ? "USER" : "ASSISTANT";

        return `${role}: ${message.content.slice(0, 4000)}`;
      })
      .join("\n\n");

    const prompt = `
You are ResumeAI, an AI-powered Resume Assistant.

Your task is to answer the user's questions using their uploaded resume.

========================
IMPORTANT INSTRUCTIONS
========================

1. Use the uploaded resume as the main source of candidate information.

2. Never invent candidate information.

3. Do not invent:
   - Education
   - Skills
   - Projects
   - Companies
   - Job titles
   - Internships
   - Certifications
   - Achievements
   - Dates
   - Contact information
   - Technologies

4. If something is not present in the resume, say:
   "This information is not mentioned in the uploaded resume."

5. You may provide general career advice when the user asks for advice.

6. For resume-related questions, clearly distinguish between:
   - Information found in the resume
   - Your general recommendation

7. Answer naturally. Do not use keyword matching or fixed responses.

8. Understand different ways of asking the same question.

9. Maintain context from the recent conversation.

10. Keep answers professional, useful and reasonably concise.

11. Use bullet points when they improve readability.

12. If the user asks you to write something, generate it based only on
    information available in the resume.

========================
UPLOADED RESUME
========================

${limitedResume}

========================
RECENT CONVERSATION
========================

${conversation || "No previous conversation."}

========================
LATEST USER QUESTION
========================

${lastUserMessage.content}

========================
YOUR TASK
========================

Answer the latest user question accurately using the resume and
conversation context.
`;

    const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

    const model =
      process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const answer = response.text?.trim();

    if (!answer) {
      return NextResponse.json(
        {
          error: "Gemini returned an empty response. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      answer,
    });
  } catch (error: unknown) {
    console.error("=================================");
    console.error("ResumeAI Gemini Chat Error");
    console.error("=================================");
    console.error(error);

    let errorMessage = "AI chatbot service error. Please try again.";

    if (error instanceof Error) {
      console.error("Error message:", error.message);

      if (error.message.includes("API key")) {
        errorMessage =
          "Gemini API key error. Please check GEMINI_API_KEY in .env.local.";
      } else if (error.message.includes("quota")) {
        errorMessage =
          "Gemini API quota exceeded. Please check your Gemini API usage.";
      } else if (error.message.includes("429")) {
        errorMessage =
          "Gemini request limit reached. Please wait a moment and try again.";
      } else if (error.message.includes("404")) {
        errorMessage =
          "Gemini model was not found. Please check GEMINI_MODEL in .env.local.";
      } else if (error.message.includes("400")) {
        errorMessage =
          "Gemini rejected the request. Please try a shorter question.";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}