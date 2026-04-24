// src/pages/api/chat.js
//
// Secure backend — runs on Vercel's servers only, never in the browser.
// Uses Google Gemini API.
// Receives: conversation history + which state + where in the form the user is.
// Returns: the AI's reply as plain text.

import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    messages,    // full conversation so far
    stateSlug,   // e.g. "california"
    formContext, // describes what's happening in the form right now
  } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // ── Load the state JSON data ──────────────────────────────────────────────
  let stateData = null;

  if (stateSlug) {
    try {
      const filePath = path.join(
        process.cwd(),
        "data",
        "states",
        `${stateSlug}.json`
      );
      const fileContents = fs.readFileSync(filePath, "utf8");
      stateData = JSON.parse(fileContents);
    } catch (e) {
      console.log(`No data file found for state: ${stateSlug}`);
    }
  }

  // ── Build the system prompt ───────────────────────────────────────────────
  let systemPrompt = "";

  if (stateData) {
    systemPrompt = `You are a warm, clear assistant for Paper Prisons — a nonprofit that
helps people recently released from incarceration get a government ID.

The person you are talking to may be in a stressful situation. They may not have
many documents. Always be encouraging, plain-spoken, and practical.

NEVER make up requirements. NEVER guess. If something is not in the data below,
say: "I don't have that specific detail — please check the official ${stateData.state}
DMV page: ${stateData.dmv_links[0]}"

The user is applying for an ID in: ${stateData.state}

OFFICIAL REQUIREMENTS DATA FOR ${stateData.state.toUpperCase()}:
${JSON.stringify(stateData, null, 2)}

CURRENT FORM CONTEXT (what the user is seeing right now on the page):
${formContext || "The user is browsing the ID requirements tool."}

HOW TO ANSWER:
- For questions about what a form question means: explain it simply in plain English.
  For example if they ask "what is an SSN?" explain it clearly.
- For questions about specific documents: give a direct bullet-point list from the data above.
- For questions about the final results they were shown: walk through each requirement
  step by step in plain English, as if talking to someone doing this for the first time.
- For "what if I don't have X": look in the data for alternatives. If none, say so and
  point to the DMV link.
- Keep responses concise. Use line breaks between points.
- End longer answers with: "Does that make sense, or do you have questions about any of these steps?"
- If the user mentions a prison release document or felon ID, check the state data
  for whether it is accepted and reference that specifically.`;
  } else {
    systemPrompt = `You are a friendly assistant for Paper Prisons — a nonprofit that
helps people recently released from incarceration get a government ID.

You currently don't know which state the user is applying in.
This tool has data for: California, Oregon, Washington, Nevada, and Utah.
Ask the user which of these states they are in so you can give them accurate information.
Be warm and brief.`;
  }

  // ── Convert messages to Gemini format ─────────────────────────────────────
  // Anthropic uses "assistant" — Gemini uses "model"
  // We also skip the very first assistant greeting since the system prompt covers it

  const geminiContents = messages
    .filter((m, i) => !(i === 0 && m.role === "assistant"))
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Gemini requires conversations to start with a user turn
  if (geminiContents.length === 0 || geminiContents[0].role === "model") {
    geminiContents.unshift({
      role: "user",
      parts: [{ text: "Hello, I need help getting an ID." }],
    });
  }

  // ── Call Gemini API ───────────────────────────────────────────────────────
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: geminiContents,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return res
        .status(500)
        .json({ error: "Failed to get a response. Please try again." });
    }

    const data = await response.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response. Please try again.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Server error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again in a moment." });
  }
}