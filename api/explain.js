const MODEL_NAME = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(model, body) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error('لم يتم ضبط GEMINI_API_KEY في إعدادات Vercel.');
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
    const error = new Error(data?.error?.message || `فشل طلب Gemini برمز ${geminiResponse.status}`);
    error.status = geminiResponse.status;
    throw error;
  }

  return data;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'POST فقط مدعوم لهذا المسار.' });
    return;
  }

  try {
    const { text = '' } = request.body || {};
    const cleanText = String(text).trim();

    if (!cleanText) {
      response.status(400).json({ error: 'النص مطلوب.' });
      return;
    }

    const prompt = `اشرح الفوائد واللطائف العقدية والتربوية لهذا النص: "${cleanText}".
    ابدأ باللغة الكردية السورانية، ثم اذكر الفوائد باللغة العربية.`;

    const systemInstruction = `
      أنت مساعد علمي حذر.
      لا تنسب قولا لعالم أو كتاب إلا بصيغة تحفظ إن لم تكن متأكدا.
      اجعل الشرح مختصرا، واضحا، ومناسبا للقارئ العام.
    `;

    const data = await callGemini(MODEL_NAME, {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    });

    response.status(200).json(data);
  } catch (error) {
    console.error(error);
    response.status(error.status || 500).json({ error: error.message || 'حدث خطأ غير متوقع.' });
  }
}
