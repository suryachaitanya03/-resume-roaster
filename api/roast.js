// Vercel serverless function (Node.js runtime).
// This runs on the server, so process.env.ANTHROPIC_API_KEY is never
// exposed to the browser — that's the whole point of this file existing.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText } = req.body || {};

  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length < 40) {
    return res.status(400).json({ error: 'Paste a bit more of your resume — that\'s too short to roast fairly.' });
  }

  // Basic length guard so no one can send a huge payload and run up your bill.
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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Here is the resume to roast:\n\n${trimmedResume}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return res.status(502).json({ error: 'The grading service had a hiccup. Try again in a moment.' });
    }

    const data = await response.json();
    const textBlock = data.content.find((b) => b.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'No response from the model. Try again.' });
    }

    const cleaned = textBlock.text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Roast handler error:', err);
    return res.status(500).json({ error: 'Something went wrong grading this one. Try again in a moment.' });
  }
}
