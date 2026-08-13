import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON request bodies
app.use(express.json());

/**
 * AI Socratic Tutor Endpoint using @google/genai securely on the server
 */
app.post('/api/tutor', async (req, res) => {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY environment variable is not configured. Please set your Gemini API key in the secrets panel.' 
    });
  }

  const { lessonTitle, userCode, studentMessage, errorState } = req.body;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a Socratic programming and technical tutor on an interactive learning platform.
Your goal is to guide students to understand concepts and find solutions on their own rather than providing the straight code or answers.
Active context:
- Current Lesson: ${lessonTitle || 'General Programming'}
- Student's Code:
\`\`\`python
${userCode || '# No code written yet'}
\`\`\`
- Recent Error/Traceback: ${errorState || 'None'}

Socratic Tutoring Rules:
1. Speak in a friendly, encouraging, and mentoring tone.
2. If the student asks for the answer ("What is the code?"), ask what they tried, point out the relevant concept, and give an intuitive hint.
3. If their code has an error, explain what the error means in beginner-friendly terms, but do not rewrite their entire program. Give them a guided path to correct it.
4. Keep explanations short, readable, and highly interactive (ask them a single, focused question to prompt their next step).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nStudent asks: ${studentMessage}` }] }
      ]
    });

    const reply = response.text || "I'm here to help! Could you explain what you are trying to accomplish?";
    return res.json({ reply });
  } catch (err: unknown) {
    console.error("Gemini API Error:", err);
    return res.status(500).json({ error: "Sorry, I had trouble contacting my brain. Please try again." });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
