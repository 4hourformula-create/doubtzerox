export default async function handler(req, res) {

  try {

    const userMessage = req.body.message;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: userMessage
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log(JSON.stringify(data));

    if (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]) {

      return res.status(200).json({
        reply: data.candidates[0].content.parts[0].text
      });

    }

    return res.status(200).json({
      reply: "AI could not generate a response."
    });

  } catch (error) {

    return res.status(500).json({
      reply: "Server error.",
      error: error.message
    });

  }
}
