import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractSection(resume: string, sectionNames: string[]): string {
  const lines = resume.split(/\r?\n/);

  const normalizedNames = sectionNames.map((name) =>
    name.toLowerCase().trim()
  );

  let startIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();

    if (
      normalizedNames.some(
        (name) =>
          line === name ||
          line === name + ":" ||
          line.startsWith(name + " ")
      )
    ) {
      startIndex = i + 1;
      break;
    }
  }

  if (startIndex === -1) {
    return "";
  }

  const sectionLines: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    const lowerLine = line.toLowerCase();

    const looksLikeHeading =
      line.length > 0 &&
      line.length < 60 &&
      (
        [
          "summary",
          "profile",
          "objective",
          "education",
          "skills",
          "technical skills",
          "projects",
          "experience",
          "work experience",
          "internship",
          "certifications",
          "certificates",
          "achievements",
          "contact",
          "contact information",
          "languages",
        ].includes(lowerLine)
      );

    if (looksLikeHeading) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines.join("\n").trim();
}

function findName(resume: string): string {
  const lines = resume
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 10)) {
    if (
      !line.includes("@") &&
      !line.match(/\d{10}/) &&
      line.length >= 3 &&
      line.length <= 60
    ) {
      return line;
    }
  }

  return "Your name is not clearly identified in the uploaded resume.";
}

function findContact(resume: string): string {
  const lines = resume.split(/\r?\n/);

  const contactLines = lines.filter((line) => {
    return (
      line.includes("@") ||
      /\b\d{10}\b/.test(line) ||
      /linkedin\.com/i.test(line) ||
      /github\.com/i.test(line)
    );
  });

  return contactLines.join("\n").trim();
}

function getRuleResponse(message: string, resume: string): string {
  const text = cleanText(message);

  /*
   * RULE 1 — GREETING
   */
  if (
    /^(hi|hello|hey|hii|hiii|good morning|good afternoon|good evening)\b/.test(
      text
    )
  ) {
    return "Hello! 👋 I am ResumeAI, a rule-based Resume Assistant. You can ask me about your name, education, skills, projects, experience, certifications, contact details, or resume summary.";
  }

  /*
   * RULE 2 — HELP
   */
  if (
    text.includes("help") ||
    text.includes("what can you do") ||
    text.includes("how can you help") ||
    text === "options"
  ) {
    return `I can answer predefined questions about your resume.

You can ask me:

• What is my name?
• What is my education?
• What are my skills?
• What projects have I done?
• What is my experience?
• What internships do I have?
• What certifications do I have?
• What are my achievements?
• What is my resume summary?
• What are my contact details?

I use predefined rules to identify your question and return the relevant information from your uploaded resume.`;
  }

  /*
   * RULE 3 — THANK YOU
   */
  if (
    text.includes("thank you") ||
    text.includes("thanks") ||
    text === "thank"
  ) {
    return "You're welcome! 😊 Feel free to ask another question about the resume.";
  }

  /*
   * RULE 4 — NAME
   */
  if (
    text.includes("your name") ||
    text.includes("my name") ||
    text.includes("candidate name") ||
    text.includes("student name") ||
    text === "name"
  ) {
    return `The candidate's name is: ${findName(resume)}`;
  }

  /*
   * RULE 5 — EDUCATION
   */
  if (
    text.includes("education") ||
    text.includes("degree") ||
    text.includes("college") ||
    text.includes("university") ||
    text.includes("qualification") ||
    text.includes("academic")
  ) {
    const education = extractSection(resume, [
      "education",
      "educational background",
      "academic background",
      "academic qualifications",
    ]);

    return education
      ? `Here is the education information from the resume:\n\n${education}`
      : "The education section was not clearly identified in the uploaded resume.";
  }

  /*
   * RULE 6 — SKILLS
   */
  if (
    text.includes("skill") ||
    text.includes("technical skill") ||
    text.includes("technologies") ||
    text.includes("technology") ||
    text.includes("tools")
  ) {
    const skills = extractSection(resume, [
      "skills",
      "technical skills",
      "technical skill",
      "skills & technologies",
      "technical skills & tools",
    ]);

    return skills
      ? `Here are the skills listed in the resume:\n\n${skills}`
      : "The skills section was not clearly identified in the uploaded resume.";
  }

  /*
   * RULE 7 — PROJECTS
   */
  if (
    text.includes("project") ||
    text.includes("projects") ||
    text.includes("built") ||
    text.includes("developed")
  ) {
    const projects = extractSection(resume, [
      "projects",
      "academic projects",
      "personal projects",
      "key projects",
    ]);

    return projects
      ? `Here are the projects listed in the resume:\n\n${projects}`
      : "The projects section was not clearly identified in the uploaded resume.";
  }

  /*
   * RULE 8 — EXPERIENCE
   */
  if (
    text.includes("experience") ||
    text.includes("work experience") ||
    text.includes("job experience") ||
    text.includes("employment")
  ) {
    const experience = extractSection(resume, [
      "experience",
      "work experience",
      "professional experience",
      "employment history",
    ]);

    return experience
      ? `Here is the experience information from the resume:\n\n${experience}`
      : "The experience section was not clearly identified in the uploaded resume.";
  }

  /*
   * RULE 9 — INTERNSHIP
   */
  if (
    text.includes("internship") ||
    text.includes("internships") ||
    text.includes("intern")
  ) {
    const internship = extractSection(resume, [
      "internship",
      "internships",
      "internship experience",
    ]);

    return internship
      ? `Here is the internship information from the resume:\n\n${internship}`
      : "No clearly labelled internship section was found in the uploaded resume.";
  }

  /*
   * RULE 10 — CERTIFICATIONS
   */
  if (
    text.includes("certification") ||
    text.includes("certifications") ||
    text.includes("certificate") ||
    text.includes("certificates")
  ) {
    const certifications = extractSection(resume, [
      "certifications",
      "certificates",
      "certification",
      "licenses & certifications",
    ]);

    return certifications
      ? `Here are the certifications listed in the resume:\n\n${certifications}`
      : "The certifications section was not clearly identified in the uploaded resume.";
  }

  /*
   * RULE 11 — ACHIEVEMENTS
   */
  if (
    text.includes("achievement") ||
    text.includes("achievements") ||
    text.includes("award") ||
    text.includes("awards")
  ) {
    const achievements = extractSection(resume, [
      "achievements",
      "awards",
      "honors",
    ]);

    return achievements
      ? `Here are the achievements listed in the resume:\n\n${achievements}`
      : "The achievements section was not clearly identified in the uploaded resume.";
  }

  /*
   * RULE 12 — SUMMARY
   */
  if (
    text.includes("summary") ||
    text.includes("profile") ||
    text.includes("objective") ||
    text.includes("about me") ||
    text.includes("introduce yourself")
  ) {
    const summary = extractSection(resume, [
      "summary",
      "professional summary",
      "profile",
      "career objective",
      "objective",
    ]);

    return summary
      ? `Here is the summary information from the resume:\n\n${summary}`
      : "A clearly labelled summary/profile section was not found in the uploaded resume.";
  }

  /*
   * RULE 13 — CONTACT
   */
  if (
    text.includes("contact") ||
    text.includes("email") ||
    text.includes("phone") ||
    text.includes("mobile") ||
    text.includes("linkedin") ||
    text.includes("github")
  ) {
    const contact = findContact(resume);

    return contact
      ? `Here are the contact details found in the resume:\n\n${contact}`
      : "Contact details were not clearly identified in the uploaded resume.";
  }

  /*
   * RULE 14 — RESUME
   */
  if (
    text === "resume" ||
    text.includes("about my resume") ||
    text.includes("resume details") ||
    text.includes("tell me about my resume")
  ) {
    return `I can provide information from your uploaded resume using predefined rules.

Try asking:
• What is my name?
• What are my skills?
• What is my education?
• What projects have I done?
• What is my experience?
• What certifications do I have?
• What are my contact details?`;
  }

  /*
   * RULE 15 — GOODBYE
   */
  if (
    text.includes("bye") ||
    text.includes("goodbye") ||
    text.includes("see you")
  ) {
    return "Goodbye! 👋 Best of luck with your career and job search.";
  }

  /*
   * DEFAULT FALLBACK RULE
   */
  return `Sorry, I don't have a predefined rule for that question.

I can answer questions about:

• Name
• Education
• Skills
• Projects
• Experience
• Internships
• Certifications
• Achievements
• Resume summary
• Contact details

Type "help" to see the available questions.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const resumeText = String(body.resumeText || "");

    const messages = Array.isArray(body.messages)
      ? (body.messages as Message[])
      : [];

    if (!resumeText.trim()) {
      return NextResponse.json(
        {
          error: "Please upload a resume first.",
        },
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: "Please enter a question.",
        },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!lastUserMessage?.content) {
      return NextResponse.json(
        {
          error: "Please enter a question.",
        },
        { status: 400 }
      );
    }

    const answer = getRuleResponse(
      lastUserMessage.content,
      resumeText
    );

    return NextResponse.json({
      answer,
      ruleBased: true,
    });
  } catch (error) {
    console.error("Rule-Based Chat Error:", error);

    return NextResponse.json(
      {
        error: "Unable to process the chatbot request.",
      },
      { status: 500 }
    );
  }
}