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
    const { activeTab = 'sahih', searchQuery = '', recentTexts = [] } = request.body || {};
    const cleanSearch = String(searchQuery).trim();
    const history = Array.isArray(recentTexts) ? recentTexts.slice(-10).join(' | ') : '';

    const prompt = cleanSearch
      ? `ابحث عن 3 نصوص إسلامية دقيقة وموثوقة حول موضوع: "${cleanSearch}" للقسم: "${activeTab}".`
      : `ولد 3 نصوص إسلامية فريدة وموثوقة لقسم: "${activeTab}".`;

    const systemInstruction = `
      أنت مساعد متخصص في النقل من مصادر أهل السنة والجماعة.
      لا تخترع نصا ولا مصدرا ولا درجة صحة.
      إن لم تعرف المصدر الدقيق فاكتب "تحتاج إلى مراجعة" في grading.
      أعد JSON فقط، بدون Markdown أو شرح خارجي.
      الشكل المطلوب:
      [{"text_ar":"النص العربي","text_ku":"الترجمة الكردية السورانية","narrator":"القائل أو الراوي","source":"المصدر الدقيق","grading":"درجة الصحة"}]
      تجنب تكرار النصوص التالية: [${history}].
    `;

    const data = await callGemini(MODEL_NAME, {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { responseMimeType: 'application/json' }
    });

    response.status(200).json(data);
  } catch (error) {
    console.error(error);
    response.status(error.status || 500).json({ error: error.message || 'حدث خطأ غير متوقع.' });
  }
}
