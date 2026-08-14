import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs";

function cleanText(text: string) {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function calculateATS(text: string) {
  const lower = text.toLowerCase();
  const checks = [
    ["Contact information", /(email|e-mail|phone|mobile|linkedin|github)/i.test(text)],
    ["Professional summary", /(summary|objective|profile)/i.test(text)],
    ["Education", /(education|academic)/i.test(text)],
    ["Experience", /(experience|employment|internship)/i.test(text)],
    ["Projects", /(projects|project)/i.test(text)],
    ["Skills", /(skills|technical skills|core competencies)/i.test(text)],
    ["Certifications", /(certifications|certificates|certification)/i.test(text)],
    ["Action verbs", /(developed|created|built|implemented|analyzed|designed|managed|improved|led|automated)/i.test(text)],
    ["Quantified achievements", /(\d+%|\d+\+|\b\d{2,}\b|\₹|\$)/i.test(text)],
    ["Relevant keywords", /(python|sql|excel|power bi|tableau|javascript|react|java|machine learning|data analysis)/i.test(text)]
  ] as const;

  const score = Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100);
  const missing = checks.filter(([, ok]) => !ok).map(([name]) => name);

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = text.match(/(?:\+91[-\s]?)?[6-9]\d{9}\b/)?.[0] ?? null;

  return {
    score,
    checks: Object.fromEntries(checks),
    missing,
    contact: { email, phone },
    wordCount: text.split(/\s+/).filter(Boolean).length,
    lowerLength: lower.length
  };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a PDF or DOCX resume." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Maximum file size is 10 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (file.name.toLowerCase().endsWith(".docx")) {
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value;
    } else {
      return NextResponse.json({ error: "Only PDF and DOCX files are supported." }, { status: 400 });
    }

    text = cleanText(text);

    if (text.length < 80) {
      return NextResponse.json({ error: "Very little text was found. Please upload a text-based PDF/DOCX." }, { status: 422 });
    }

    return NextResponse.json({
      fileName: file.name,
      resumeText: text.slice(0, 60000),
      ats: calculateATS(text)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not read the resume. Please try another file." }, { status: 500 });
  }
}