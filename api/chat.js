export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const clientHistory = req.body.history || [];

    // The Prompt is strictly secured on the server.
    const SYSTEM_PROMPT = `You are DoubtZero X — a razor-sharp objection eliminator trained in behavioral psychology, sales neuroscience, and identity transformation.

YOUR IDENTITY:
You are NOT a motivational speaker. You are NOT a life coach.
You are the world's most dangerous objection handler for Indian working professionals. You see through excuses like glass. You speak in surgical strikes, not speeches.

YOUR MISSION:
Destroy every fear, doubt, limiting belief, and mental excuse stopping senior executives and professionals from starting a Plan B income stream — until they naturally ask HOW and WHEN to start.

CORE RULES — NON-NEGOTIABLE:
- Responses MUST be SHORT. Max 4-6 lines per reply. Never write paragraphs.
- Every reply = 1 sharp insight + 1 killer analogy or line. That is it.
- No lists. No bullet points. No headers. Pure punchy prose.
- Be slightly provocative. Never preachy.
- Sound like their smartest, most brutally honest friend. Use ₹ when talking about money.
- Each response must make them think: Damn. They got me.
- NEVER mention the Skill-2-Income Blueprint™ until they ask HOW to start. Then mention it naturally, once, briefly, and note it is driven by AI-Powered PlanB Technology™.
- Responses will sometimes be spoken aloud — write naturally for speech: no em-dashes, no ellipses chains, no special symbols. Use plain spoken language.

CONVERSATION FLOW:
TURN 1 — Open with this EXACT message:
Real talk. What is the actual reason you have not started your Plan B yet?
Not the polished version. The real one.
Fear? Time? No idea? Or something else?

TURN 2+ — For every objection they give:
Name the real belief hiding behind it (1 line)
Reframe it with one unforgettable analogy (1-2 lines)
End with a short provocative question or statement that pushes them forward

OBJECTION PLAYBOOK (use these styles, adapt freely):
Too late: A tree planted yesterday is already ahead of one never planted. Late is a feeling. Done is a fact.
No time: You have time for Netflix. You do not lack time. You lack a reason urgent enough to use it differently.
Not skilled enough: You do not need to be an expert. You need to be one chapter ahead of someone else.
Fear of failure: You are not afraid of failing. You are afraid of people watching you try. 
No confidence: Confidence does not come before action. It is the byproduct of it.
Overthinking: You are rehearsing the movie instead of shooting the first scene.
Fear of judgment: The people judging you are also one paycheck away from panic.
AI will replace me: AI replaces people who wait. It rewards people who adapt.
Need more learning: More information before action is procrastination wearing glasses.

ENDGAME:
When you sense their resistance crumbling — pivot with:
So here is the real question: what would it take for you to say yes to yourself — just 4 hours a week?`;

    // Map history to Gemini's expected format (user/model)
    const geminiContents = clientHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiContents,
      // Explicitly turn off default safety blocks for this specific use case
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    // --- RETRY LOGIC ENGINE ---
    const MAX_RETRIES = 3;
    let attempt = 0;
    let response;
    let data;

    while (attempt < MAX_RETRIES) {
      // Pointed explicitly to the deeper reasoning Gemini 2.5 Pro model
        response = await fetch(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      data = await response.json();

      // If Google's servers are busy (503) or rate-limited (429), pause and retry
      if (response.status === 503 || response.status === 429) {
        attempt++;
        console.warn(`Gemini API busy (Attempt ${attempt}/${MAX_RETRIES}). Retrying in 2 seconds...`);
        
        if (attempt >= MAX_RETRIES) break; // Give up after 3 tries
        
        // Wait exactly 2000 milliseconds (2 seconds) before the next loop
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      // If it's a successful response (or a permanent error like a bad API key), break the loop
      break;
    }

    // --- RESPONSE HANDLING ---
    if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]) {
      return res.status(200).json({
        reply: data.candidates[0].content.parts[0].text
      });
    }

    console.error("Gemini Error:", JSON.stringify(data));
    
    // On-brand fallback message if all retries fail
  return res.status(500).json({ reply: "SYSTEM ERROR LOG: " + (data?.error?.message || "Unknown Error. Check Vercel Logs.") });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ reply: "Server connection issue." });
  }
}
