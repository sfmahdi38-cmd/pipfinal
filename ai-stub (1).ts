// Lightweight local stub so the app can build/deploy without the real Google API.
type GenerateContentArgs = { model: string; contents: any; config?: any };

export class GoogleGenAI {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_: { apiKey?: string }) {}

  models = {
    generateContent: async (_args: GenerateContentArgs) => {
      // Return a deterministic JSON string so your UI can render something
      const payload = {
        answer_en: 'Demo response (stub). Replace ai-stub with @google/genai when you add a real API key.',
        explanation_en: 'This text is produced locally by ai-stub.ts (no network).',
        answer_fa: 'پاسخ نمایشی (استاب). وقتی کلید واقعی اضافه شد، ai-stub را با @google/genai عوض کنید.',
        explanation_fa: 'این متن به صورت محلی توسط ai-stub.ts تولید شده و به شبکه وصل نیست.',
        answer_uk: 'Демонстраційна відповідь (stub). Заміни ai-stub на @google/genai, коли додаси справжній API key.',
        explanation_uk: 'Текст згенеровано локально файлом ai-stub.ts без мережевих запитів.'
      };
      return { text: JSON.stringify(payload, null, 2) };
    },
  };
}
