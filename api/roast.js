export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { resumeText } = req.body || {};

  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 40) {
    return res.status(400).json({
      error: "Paste a bit more of your resume — that's too short to roast fairly."
    });
  }

  const trimmedResume = resumeText.trim().slice(0, 6000);

  const systemPrompt = `You are a witty, sharp resume critic writing in the voice of a strict but fair high-school English teacher grading an essay.

Be funny but never cruel.

Return ONLY valid JSON matching the provided schema. Do not wrap the JSON in markdown.`;

  try {
    const model = "gemini-2.5-flash";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Resume:\n\n${trimmedResume}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
            temperature: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Gemini API Error:");
      console.error(errorText);

      return res.status(502).json({
        error: "Gemini API request failed.",
        details: errorText,
      });
    }

    const data = await response.json();

    console.log("FULL GEMINI RESPONSE:");
    console.log(JSON.stringify(data, null, 2));

    const textOut =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOut) {
      return res.status(500).json({
        error: "Gemini returned no text.",
        data,
      });
    }

    console.log("RAW TEXT:");
    console.log(textOut);

    // Remove markdown fences if present
    let cleaned = textOut.trim();

    cleaned = cleaned
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("JSON Parse Error");
      console.error(cleaned);

      return res.status(500).json({
        error: "Gemini returned invalid JSON.",
        raw: cleaned,
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Roast handler error:", err);

    return res.status(500).json({
      error: err.message,
    });
  }
}
