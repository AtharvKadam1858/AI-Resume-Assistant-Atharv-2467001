"use client";

import { useMemo, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Analysis = {
  score: number;
  missing: string[];
  wordCount: number;
  contact: { email: string | null; phone: string | null };
};

type Match = {
  score: number;
  summary: string;
  strongMatches: string[];
  missingOrWeak: string[];
  keywordsToAdd: string[];
  recommendedActions: string[];
};

export default function ResumeApp() {
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Welcome to ResumeAI. Upload your resume and ask me anything about it." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [tab, setTab] = useState<"chat" | "ats" | "match">("chat");

  const suggestions = useMemo(() => [
    "Summarize my resume in 5 bullet points.",
    "What are the biggest weaknesses in my resume?",
    "Rewrite my professional summary to be ATS-friendly.",
    "Generate 10 interview questions based on my resume."
  ], []);

  async function upload(file: File) {
    setLoading(true);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResumeText(data.resumeText);
      setAnalysis(data.ats);
      setMessages([{ role: "assistant", content: `I analyzed **${file.name}**. Your initial ATS-oriented content score is **${data.ats.score}/100**. Ask me anything about your resume.` }]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
      setFileName("");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text = input) {
    if (!text.trim() || !resumeText || loading) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, messages: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  async function runMatch() {
    if (!resumeText || !jobDescription.trim()) return;
    setMatchLoading(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Match failed");
      setMatch(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Match failed");
    } finally {
      setMatchLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <div className="logo">R</div>
          <div><strong>ResumeAI</strong><span>AI Resume Assistant</span></div>
        </div>
        <div className="badge">AI-Powered</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">RESUME INTELLIGENCE</p>
          <h1>Turn your resume into your <span>career advantage.</span></h1>
          <p className="sub">Upload a PDF or DOCX, analyze ATS readiness, match jobs, improve content, and practice interviews with an AI assistant.</p>
        </div>
      </section>

      <section className="uploadCard">
        <label className="dropzone">
          <input type="file" accept=".pdf,.docx" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <div className="uploadIcon">↑</div>
          <strong>{loading ? "Analyzing..." : "Upload your resume"}</strong>
          <span>PDF or DOCX • Maximum 10 MB</span>
          {fileName && <small>{fileName}</small>}
        </label>
      </section>

      {analysis && (
        <section className="stats">
          <div><span>ATS Score</span><b>{analysis.score}<em>/100</em></b></div>
          <div><span>Resume Words</span><b>{analysis.wordCount}</b></div>
          <div><span>Missing Areas</span><b>{analysis.missing.length}</b></div>
          <div><span>Contact Email</span><b>{analysis.contact.email ? "✓" : "—"}</b></div>
        </section>
      )}

      <section className="workspace">
        <aside className="sidebar">
          <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>💬 AI Chat</button>
          <button className={tab === "ats" ? "active" : ""} onClick={() => setTab("ats")}>🎯 ATS Analysis</button>
          <button className={tab === "match" ? "active" : ""} onClick={() => setTab("match")}>🔎 Job Match</button>
          <div className="sideNote"><b>Privacy-first</b><br/>Your resume is processed only for this session. Do not upload sensitive documents you do not want processed by an AI service.</div>
        </aside>

        <div className="panel">
          {!resumeText ? (
            <div className="empty"><div className="bigIcon">📄</div><h2>Upload a resume to begin</h2><p>Then ask questions, check ATS readiness, or compare it with a job description.</p></div>
          ) : tab === "chat" ? (
            <>
              <div className="panelHeader"><div><h2>Resume Chat</h2><p>Ask questions about your uploaded resume.</p></div></div>
              <div className="messages">
                {messages.map((m, i) => <div key={i} className={`message ${m.role}`}><div className="bubble">{m.content.split("\n").map((line, j) => <div key={j}>{line || <br/>}</div>)}</div></div>)}
                {loading && <div className="message assistant"><div className="bubble">Thinking…</div></div>}
              </div>
              <div className="suggestions">{suggestions.map((s) => <button key={s} onClick={() => sendMessage(s)}>{s}</button>)}</div>
              <div className="composer"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Ask anything about your resume..." /><button onClick={() => sendMessage()}>Send</button></div>
            </>
          ) : tab === "ats" ? (
            <div className="analysisPanel">
              <div className="panelHeader"><div><h2>ATS Analysis</h2><p>Content-oriented checks to improve recruiter and ATS readability.</p></div><div className="score">{analysis?.score}<small>/100</small></div></div>
              <div className="checkGrid">{Object.entries(analysis?.missing ? {} : {}).length === 0 && ["Contact information","Professional summary","Education","Experience","Projects","Skills","Certifications","Action verbs","Quantified achievements","Relevant keywords"].map((name) => {
                const missing = analysis?.missing.includes(name);
                return <div className="check" key={name}><span>{missing ? "!" : "✓"}</span><div><b>{name}</b><small>{missing ? "Needs attention" : "Detected"}</small></div></div>
              })}</div>
              <div className="recommendation"><b>Missing areas</b><p>{analysis?.missing.length ? analysis.missing.join(" • ") : "No major content sections were detected as missing."}</p></div>
            </div>
          ) : (
            <div className="matchPanel">
              <div className="panelHeader"><div><h2>Job Description Matcher</h2><p>Paste a job description to compare it with your resume.</p></div></div>
              <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the complete job description here..." />
              <button className="primary" disabled={matchLoading || !jobDescription.trim()} onClick={runMatch}>{matchLoading ? "Analyzing..." : "Analyze Job Match"}</button>
              {match && <div className="matchResult">
                <div className="matchScore">{match.score}<small>/100 match</small></div>
                <p>{match.summary}</p>
                <ResultList title="Strong Matches" items={match.strongMatches} />
                <ResultList title="Missing or Weak" items={match.missingOrWeak} />
                <ResultList title="Keywords to Consider" items={match.keywordsToAdd} />
                <ResultList title="Recommended Actions" items={match.recommendedActions} />
              </div>}
            </div>
          )}
        </div>
      </section>

      <footer>ResumeAI • Built for career preparation • AI-generated advice should be reviewed before use.</footer>
    </main>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return <div className="resultList"><h3>{title}</h3>{items?.length ? <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p>None identified.</p>}</div>;
}