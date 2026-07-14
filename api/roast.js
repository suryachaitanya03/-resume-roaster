// Vercel serverless function (Node.js runtime).
// Uses Groq's free API (OpenAI-compatible format). Groq serves open models
// (not a single vendor's proprietary model), which tend to stay stable
// under a given name for longer than closed-model API aliases.
// GROQ_API_KEY lives in Vercel's environment variables, never in code.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText } = req.body || {};

  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 40) {
    return res.status(400).json({ error: 'Paste a bit more of your resume — that\'s too short to roast fairly.' });
  }

  const trimmedResume = resumeText.trim().slice(0, 6000);

  const systemPrompt = `You are a witty, sharp resume critic writing in the voice of a strict but fair high-school English teacher grading an essay. Your tone is funny and pointedly honest about CLICHES, VAGUENESS, and WEAK PHRASING in the resume — never about the person's worth, intelligence, or career choices. Always find at least 2 genuinely good things, and always end with one concrete, actionable improvement.

Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:
{
  "grade": "a letter grade like B-, C+, D, etc",
  "headline": "one witty one-line overall verdict, under 18 words, in a teacher's red-pen voice",
  "critiques": [
    {"quote": "a short phrase (under 10 words) taken or closely paraphrased from the resume that is weak, vague, or cliche", "comment": "a witty red-pen style note, under 14 words, funny but constructive"}
  ],
  "strengths": ["a genuine specific compliment, under 20 words", "a second genuine specific compliment, under 20 words"],
  "tip": "one concrete, actionable next step to improve the resume, under 30 words"
}

Include 3 to 5 items in critiques. Be funny but never cruel, never comment on the person's identity, appearance, or worth — only on the writing and content choices in the document.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        response_format: { type: 'json_object' },
        reasoning_effort: 'low',
        max_completion_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the resume to roast:\n\n${trimmedResume}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);

      // Groq sometimes includes the model's raw (invalid-JSON) attempt in
      // a "failed_generation" field. Try to salvage it before giving up,
      // since it's often just missing a closing brace/quote.
      try {
        const errData = JSON.parse(errText);
        const salvage = errData?.error?.failed_generation;
        if (salvage) {
          const cleaned = salvage.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(cleaned);
          return res.status(200).json(parsed);
        }
      } catch (salvageErr) {
        // Salvage attempt failed too — fall through to the generic error below.
      }

      return res.status(502).json({ error: 'The grading service had a hiccup. Try again in a moment.' });
    }

    const data = await response.json();
    const textOut = data.choices?.[0]?.message?.content;
    if (!textOut) {
      console.error('Unexpected Groq response shape:', JSON.stringify(data));
      return res.status(502).json({ error: 'No response from the model. Try again.' });
    }

    const cleaned = textOut.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Roast handler error:', err);
    return res.status(500).json({ error: 'Something went wrong grading this one. Try again in a moment.' });
  }
}
