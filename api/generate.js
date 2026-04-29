const MODEL_NAME = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const SECTION_RULES = {
  sahih: {
    name: 'Prophetic hadith only',
    allowed: 'Only authentic or well-known hadith attributed to Prophet Muhammad, peace and blessings be upon him.',
    forbidden: 'Do not include sayings of scholars, companions, followers, or general advice.'
  },
  athar: {
    name: 'Companion and early-generation athar only',
    allowed: 'Only narrations attributed to the Sahabah, Tabiin, or early Salaf.',
    forbidden: 'Do not include Prophetic hadith as the main text, and do not include later scholars.'
  },
  scholars: {
    name: 'Scholar sayings only',
    allowed: 'Only concise sayings from recognized Sunni scholars such as Ibn Taymiyyah, Ibn al-Qayyim, al-Nawawi, Ibn Rajab, Ibn Baz, Ibn Uthaymin, or similar scholars.',
    forbidden: 'Do not include Prophetic hadith, Quran verses, companion athar, or anonymous advice as the main text.'
  }
};

async function callGemini(model, body) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured in Vercel.');
    error.status = 500;
    throw error;
  }

  const geminiResponse = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await geminiResponse.json().catch(() => ({}));

  if (!geminiResponse.ok) {
    const error = new Error(data?.error?.message || `Gemini request failed with status ${geminiResponse.status}`);
    error.status = geminiResponse.status;
    throw error;
  }

  return data;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Only POST is supported for this endpoint.' });
    return;
  }

  try {
    const { activeTab = 'sahih', searchQuery = '', recentTexts = [] } = request.body || {};
    const cleanSearch = String(searchQuery).trim();
    const section = SECTION_RULES[activeTab] || SECTION_RULES.sahih;
    const history = Array.isArray(recentTexts) ? recentTexts.slice(-10).join(' | ') : '';

    const topicLine = cleanSearch
      ? `Topic/search query: ${cleanSearch}`
      : 'No specific topic. Choose varied beneficial texts.';

    const prompt = `
Return exactly 3 items for this section: ${section.name}.
${topicLine}

Allowed content: ${section.allowed}
Forbidden content: ${section.forbidden}

Each item must include:
- text_ar: the original Arabic text
- text_ku: accurate Sorani Kurdish translation
- narrator: the exact speaker or narrator
- source: precise source/book reference when known
- grading: authenticity/status; for scholar sayings write "قول عالم" or a cautious status

Avoid these recent texts: ${history}
`;

    const systemInstruction = `
You are a careful Islamic-text assistant for a Sunni educational app.
Never fabricate a quote, source, or authenticity grade.
Strictly obey the selected section rules.
If the selected section is "Prophetic hadith only", every item must be a hadith and the narrator/source must fit hadith usage.
If the selected section is "Scholar sayings only", no item may be a hadith, Quran verse, or companion athar.
If the selected section is "Companion and early-generation athar only", no item may be a later scholar saying.
Return JSON only, with no Markdown and no text outside the JSON array.
Required JSON shape:
[{"text_ar":"Arabic text","text_ku":"Sorani Kurdish translation","narrator":"speaker or narrator","source":"source","grading":"status"}]
`;

    const data = await callGemini(MODEL_NAME, {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35
      }
    });

    response.status(200).json(data);
  } catch (error) {
    console.error(error);
    response.status(error.status || 500).json({ error: error.message || 'Unexpected server error.' });
  }
}
