import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from './ai-stub';

type Lang = 'fa' | 'en' | 'uk';

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('en');
  const [aiMsg, setAiMsg] = useState<string>('');

  useEffect(() => {
    // Demo call to the AI stub (no real network call)
    const run = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: 'stub' });
        const res: any = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'demo',
        });
        setAiMsg(typeof res.text === 'string' ? res.text : String(res));
      } catch (e) {
        setAiMsg('AI stub is active.');
      }
    };
    run();
  }, []);

  const titles: Record<Lang, string> = {
    fa: 'UK PIP Assist راه‌اندازی شد',
    en: 'UK PIP Assist is up',
    uk: 'UK PIP Assist запущено',
  };

  const desc: Record<Lang, string> = {
    fa: 'این نسخه‌ی سبک فقط برای Deploy است. بخش هوش مصنوعی فعلاً غیرفعال/استاب شده است.',
    en: 'This lightweight version is for deploy only. The AI part is currently stubbed.',
    uk: 'Полегшена версія для деплою. Розділ ШІ тимчасово відключено (stub).',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
      <div className="max-w-xl w-full bg-white/90 rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-900">{titles[lang]}</h1>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="border rounded px-2 py-1"
          >
            <option value="fa">FA</option>
            <option value="en">EN</option>
            <option value="uk">UK</option>
          </select>
        </div>

        <p className="text-slate-600">{desc[lang]}</p>

        <div className="rounded-lg border bg-blue-50 p-4 text-sm">
          <div className="font-semibold text-blue-800 mb-1">AI (stub):</div>
          <pre className="whitespace-pre-wrap break-words text-blue-900">{aiMsg}</pre>
        </div>

        <div className="text-xs text-slate-400">
          When ready, replace <code>import &#123; GoogleGenAI &#125; from "./ai-stub"</code> with <code>@google/genai</code> and set your API key on Render as <code>API_KEY</code>.
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
