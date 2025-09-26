import React, { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import { createRoot } from "react-dom/client";

/**
 * =============================================================
 *  ZERO-DEP GEMINI CLIENT (REST via fetch)
 *  - No @google/genai on the client
 *  - Uses VITE_GEMINI_API_KEY
 *  - Works on Vite/React/TS
 * =============================================================
 */
const GEMINI_MODEL = "gemini-1.5-flash"; // change if you like
const getApiKey = () => {
  const k = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!k) console.warn("VITE_GEMINI_API_KEY is missing. Set it in your .env.");
  return k;
};
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${getApiKey()}`;

export async function geminiGenerateText(prompt: string, model = GEMINI_MODEL): Promise<string> {
  const res = await fetch(endpoint(model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${err}`);
  }
  const data = await res.json();
  const txt =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("") ?? "";
  return txt;
}

export async function fileToInlinePart(file: File) {
  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  return {
    inlineData: {
      mimeType: file.type || "application/octet-stream",
      data: await toBase64(file),
    },
  };
}

export async function geminiGenerateWithParts(
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>,
  model = GEMINI_MODEL
): Promise<string> {
  const res = await fetch(endpoint(model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${err}`);
  }
  const data = await res.json();
  const txt =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("") ?? "";
  return txt;
}

/**
 * =============================================================
 * Minimal types
 * =============================================================
 */
type Lang = "fa" | "en" | "uk";

type FormOption = {
  value: string;
  label_fa: string;
  label_en: string;
  label_uk: string;
  tip_fa?: string;
  tip_en?: string;
  tip_uk?: string;
};

type FormQuestion = {
  id: string;
  type:
    | "long-text"
    | "single-select"
    | "multi-select"
    | "short-text"
    | "file"
    | "group"
    | "currency"
    | "number"
    | "date";
  question_fa: string;
  question_en: string;
  question_uk: string;
  description_fa?: string;
  description_en?: string;
  description_uk?: string;
  options?: FormOption[];
  placeholder_fa?: string;
  placeholder_en?: string;
  placeholder_uk?: string;
  allowProof?: boolean;
  proof_hint_fa?: string;
  proof_hint_en?: string;
  proof_hint_uk?: string;
  starEnabled?: boolean;
  bookEnabled?: boolean;
  when?: { [key: string]: string };
  children?: FormQuestion[];
};

type FormModuleContent = {
  moduleId: string;
  title_fa: string;
  title_en: string;
  title_uk: string;
  intro_fa: string;
  intro_en: string;
  intro_uk: string;
  questions: FormQuestion[];
};

/**
 * =============================================================
 * Bring in your modules content from ./indexes
 *   - We don't assume named vs default export; we try both.
 *   - Your existing file should export an object like:
 *       export const formContent = { pip: {...}, uc: {...}, ... }
 *     or default export that object.
 * =============================================================
 */
// @ts-ignore - be flexible with user export style
import * as FC from "./indexes";
const formContent: Record<string, FormModuleContent> = (FC as any).formContent || (FC as any).default || (FC as any);

/**
 * =============================================================
 * Small UI helpers
 * =============================================================
 */
const Logo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="UK PIP Assist Logo">
    <defs>
      <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#00529F" />
        <stop offset="100%" stopColor="#002D62" />
      </linearGradient>
    </defs>
    <path
      d="M50 5 C 50 5, 95 15, 95 40 V 85 L 50 95 L 5 85 V 40 C 5 15, 50 5, 50 5 Z"
      fill="url(#shieldGrad)"
      stroke="#C41E3A"
      strokeWidth="3"
    />
    <path d="M35 25 H 65 V 75 H 35 V 25 Z" fill="#FFFFFF" stroke="#CCCCCC" strokeWidth="2" />
    <path d="M40 35 H 60" stroke="#00529F" strokeWidth="3" strokeLinecap="round" />
    <path d="M40 45 H 60" stroke="#00529F" strokeWidth="3" strokeLinecap="round" />
    <path d="M40 55 H 50" stroke="#00529F" strokeWidth="3" strokeLinecap="round" />
    <path d="M45 65 L 50 70 L 60 60" stroke="#007A33" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const modulesList = Object.keys(formContent).map((id) => ({
  id,
  name: {
    fa: (formContent[id] as any)?.title_fa || id,
    en: (formContent[id] as any)?.title_en || id,
    uk: (formContent[id] as any)?.title_uk || id,
  },
}));

const Card = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-xl shadow-md p-5 text-center hover:-translate-y-0.5 transition transform border border-slate-200"
  >
    <div className="w-10 h-10 rounded-full bg-blue-50 mx-auto mb-3 flex items-center justify-center">
      <span className="text-blue-600 font-bold">↗</span>
    </div>
    <div className="font-semibold text-slate-700">{label}</div>
  </button>
);

/**
 * =============================================================
 * Question Renderer
 * =============================================================
 */
const QuestionRenderer = ({
  question,
  answer,
  setAnswerProperty,
  lang,
}: {
  question: FormQuestion;
  answer: any;
  setAnswerProperty: (prop: string, value: any) => void;
  lang: Lang;
}) => {
  const handleMulti = (val: string) => {
    const current = answer.value || [];
    const next = current.includes(val) ? current.filter((v: string) => v !== val) : [...current, val];
    setAnswerProperty("value", next);
  };

  switch (question.type) {
    case "single-select":
      return (
        <div className="space-y-3">
          {question.options?.map((opt) => (
            <label key={opt.value} className="flex items-start p-3 bg-white rounded-lg border border-slate-300">
              <input
                type="radio"
                name={question.id}
                value={opt.value}
                checked={answer.value === opt.value}
                onChange={(e) => setAnswerProperty("value", e.target.value)}
                className="mt-1 h-5 w-5 text-blue-600"
              />
              <div className={lang === "fa" ? "mr-3" : "ml-3"}>
                <span className="font-medium text-slate-800">{(opt as any)[`label_${lang}`]}</span>
                {(opt as any)[`tip_${lang}`] && <p className="text-sm text-slate-500">{(opt as any)[`tip_${lang}`]}</p>}
              </div>
            </label>
          ))}
        </div>
      );
    case "multi-select":
      return (
        <div className="space-y-3">
          {question.options?.map((opt) => (
            <label key={opt.value} className="flex items-start p-3 bg-white rounded-lg border border-slate-300">
              <input
                type="checkbox"
                name={question.id}
                value={opt.value}
                checked={(answer.value || []).includes(opt.value)}
                onChange={() => handleMulti(opt.value)}
                className="mt-1 h-5 w-5 text-blue-600"
              />
              <div className={lang === "fa" ? "mr-3" : "ml-3"}>
                <span className="font-medium text-slate-800">{(opt as any)[`label_${lang}`]}</span>
                {(opt as any)[`tip_${lang}`] && <p className="text-sm text-slate-500">{(opt as any)[`tip_${lang}`]}</p>}
              </div>
            </label>
          ))}
        </div>
      );
    case "short-text":
      return (
        <input
          type="text"
          value={answer.value || ""}
          onChange={(e) => setAnswerProperty("value", e.target.value)}
          placeholder={(question as any)[`placeholder_${lang}`]}
          className="w-full p-2 border rounded-md bg-blue-50"
        />
      );
    case "long-text":
      return (
        <textarea
          value={answer.value || ""}
          onChange={(e) => setAnswerProperty("value", e.target.value)}
          placeholder={(question as any)[`placeholder_${lang}`]}
          rows={5}
          className="w-full p-2 border rounded-md bg-blue-50"
        />
      );
    case "currency":
    case "number":
      return (
        <div className="relative">
          {question.type === "currency" && (
            <span className={`absolute ${lang === "fa" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-slate-400`}>£</span>
          )}
          <input
            type={question.type === "number" ? "number" : "text"}
            value={answer.value || ""}
            onChange={(e) => setAnswerProperty("value", e.target.value)}
            placeholder={(question as any)[`placeholder_${lang}`]}
            className={`w-full p-2 border rounded-md bg-blue-50 ${question.type === "currency" ? (lang === "fa" ? "pr-7" : "pl-7") : ""}`}
          />
        </div>
      );
    case "group":
      return (
        <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
          {question.children?.map((child) => (
            <div key={child.id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{(child as any)[`question_${lang}`]}</label>
              <div className="relative">
                {child.type === "currency" && (
                  <span className={`absolute ${lang === "fa" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-slate-400`}>£</span>
                )}
                <input
                  type={child.type === "number" ? "number" : "text"}
                  value={(answer.value && answer.value[child.id]) || ""}
                  onChange={(e) => {
                    const next = { ...(answer.value || {}), [child.id]: e.target.value };
                    setAnswerProperty("value", next);
                  }}
                  placeholder={(child as any)[`placeholder_${lang}`]}
                  className={`w-full p-2 border rounded-md bg-blue-50 ${
                    child.type === "currency" ? (lang === "fa" ? "pr-7" : "pl-7") : ""
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      );
    case "file":
      return (
        <p className="text-slate-600 text-center py-4">
          {lang === "fa"
            ? "آپلود فایل از بخش بارگذاری مدرک انجام می‌شود."
            : lang === "uk"
            ? "Завантаження файлів виконується в завантажувачі доказів."
            : "File upload is handled by the proof uploader."}
        </p>
      );
    default:
      return null;
  }
};

/**
 * =============================================================
 * FormFlow: drives a module
 * =============================================================
 */
function FormFlow({ moduleContent, lang }: { moduleContent: FormModuleContent; lang: Lang }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    const makeDefault = () =>
      moduleContent.questions.map((q) => ({
        questionId: q.id,
        rating: q.starEnabled ? 1 : 0,
        length: 1,
        files: [] as File[],
        value: q.type === "multi-select" ? [] : q.type === "group" ? {} : "",
        aiResponse: null as any,
      }));

    try {
      const saved = localStorage.getItem(`form-progress-${moduleContent.moduleId}`);
      if (!saved) return makeDefault();
      const parsed = JSON.parse(saved);
      const def = makeDefault();
      return def.map((d) => {
        const s = parsed.find((x: any) => x.questionId === d.questionId);
        return s ? { ...d, rating: s.rating, length: s.length, value: s.value } : d;
      });
    } catch {
      return makeDefault();
    }
  });
  const [loading, setLoading] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    const store = answers.map(({ questionId, rating, length, value }) => ({ questionId, rating, length, value }));
    try {
      localStorage.setItem(`form-progress-${moduleContent.moduleId}`, JSON.stringify(store));
    } catch {}
  }, [answers, moduleContent.moduleId]);

  const visible = useMemo(() => {
    return moduleContent.questions.filter((q) => {
      if (!q.when) return true;
      const [k, v] = Object.entries(q.when)[0];
      const a = answers.find((x) => x.questionId === k);
      return a?.value === v;
    });
  }, [answers, moduleContent.questions]);

  const q = visible[currentIndex];
  const originalIndex = moduleContent.questions.findIndex((x) => x.id === q.id);
  const a = answers[originalIndex];

  const setProp = (prop: string, value: any) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[originalIndex] = { ...next[originalIndex], [prop]: value };
      return next;
    });
  };

  const generatePrompt = (question: FormQuestion, answer: any) => {
    const impactMap: Record<number, string> = {
      1: "very low impact",
      2: "low impact",
      3: "neutral impact",
      4: "somewhat impactful",
      5: "high impact",
      6: "maximum impact",
    };
    const lengthMap: Record<number, string> = {
      1: "1-2 sentences",
      2: "3-4 sentences",
      3: "a short paragraph",
      4: "a long paragraph",
    };
    const langMeta =
      lang === "fa"
        ? { name: "Farsi (RTL)", you: "Iranians" }
        : lang === "uk"
        ? { name: "Ukrainian", you: "Ukrainians" }
        : { name: "English", you: "users" };

    const module = moduleContent.moduleId;

    const base = `You are an expert assistant for UK government forms helping ${langMeta.you}.
Return a single valid JSON with keys "answer_${lang}" and "explanation_${lang}".
- "answer_${lang}": clear, professional ${langMeta.name}.
- "explanation_${lang}": short rationale referencing the user's input.`;

    const pipPrompt = `${base}
Generating ${langMeta.name} text for a PIP application.
Question: "${(question as any)[`question_${lang}`]}"
Description: "${(question as any)[`description_${lang}`] ?? ""}"
Impact: ${a.rating}/6 (${impactMap[a.rating]})
Length: ${a.length}/4 (${lengthMap[a.length]})
User input: ${JSON.stringify(a.value)}
Return ONLY JSON.`;

    if (module === "pip") return pipPrompt;

    const multi = `${base}
Provide "answer_${lang}", "evidence_checklist_${lang}", "next_steps_${lang}", "explanation_${lang}".
Question: "${(question as any)[`question_${lang}`]}"
User input: ${JSON.stringify(a.value)}
Return ONLY JSON.`;

    if (["uc", "immigration", "carers_allowance", "nhs_forms", "student_finance", "council_tax", "blue_badge", "dvla_forms", "hmrc_forms"].includes(module)) {
      return multi;
    }
    return pipPrompt;
  };

  useEffect(() => setShowWhy(false), [currentIndex]);

  useEffect(() => {
    if (!q || !a) return;
    const isEmpty =
      !a.value ||
      (Array.isArray(a.value) && a.value.length === 0) ||
      (typeof a.value === "object" && Object.keys(a.value).length === 0);
    const mustSkip = (q.starEnabled && a.rating === 0) || (!q.starEnabled && isEmpty);
    if (mustSkip) {
      setProp("aiResponse", null);
      return;
    }

    let timer = window.setTimeout(async () => {
      setLoading(true);
      setProp("aiResponse", null);
      try {
        const prompt = generatePrompt(q, a);
        const raw = await geminiGenerateText(prompt);
        try {
          const cleaned = raw.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          setProp("aiResponse", parsed);
        } catch {
          setProp("aiResponse", { [`answer_${lang}`]: raw || (lang === "fa" ? "پاسخی دریافت نشد." : lang === "uk" ? "Відповіді не отримано." : "No response.") });
        }
      } catch (e) {
        const errs = {
          fa: "خطا در تولید پاسخ. لطفاً دوباره تلاش کنید.",
          en: "Error generating response. Please try again.",
          uk: "Помилка під час генерації відповіді. Спробуйте ще раз.",
        };
        setProp("aiResponse", { error: (errs as any)[lang] });
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.rating, a?.length, a?.value, currentIndex, lang]);

  const labels = {
    fa: { prev: "قبلی", next: "بعدی", generating: "در حال تولید پاسخ...", why: "چرا این پاسخ؟", hide: "پنهان کردن", guidance: "راهنمایی:", checklist: "چک‌لیست مدارک:", steps: "مراحل بعدی:" },
    en: { prev: "Previous", next: "Next", generating: "Generating...", why: "Why this answer?", hide: "Hide", guidance: "Guidance:", checklist: "Evidence checklist:", steps: "Next steps:" },
    uk: { prev: "Назад", next: "Далі", generating: "Генерація...", why: "Чому така відповідь?", hide: "Сховати", guidance: "Рекомендація:", checklist: "Перелік доказів:", steps: "Наступні кроки:" },
  } as const;
  const t = labels[lang];

  const renderAI = () => {
    if (loading) return <div className="text-slate-500">{t.generating}</div>;
    if (!a.aiResponse) return <div className="text-slate-400 italic">...</div>;

    const ans = a.aiResponse[`answer_${lang}`];
    const exp = a.aiResponse[`explanation_${lang}`];
    const chk = a.aiResponse[`evidence_checklist_${lang}`];
    const steps = a.aiResponse[`next_steps_${lang}`];

    return (
      <div className="space-y-3">
        {ans && (
          <div>
            <p className="font-semibold">{t.guidance}</p>
            <p className="whitespace-pre-wrap">{ans}</p>
          </div>
        )}
        {chk && (
          <div>
            <p className="font-semibold border-t pt-2">{t.checklist}</p>
            <p className="whitespace-pre-wrap">{chk}</p>
          </div>
        )}
        {steps && (
          <div>
            <p className="font-semibold border-t pt-2">{t.steps}</p>
            <p className="whitespace-pre-wrap">{steps}</p>
          </div>
        )}

        {exp && (
          <div className="border-t pt-2">
            <button className="text-blue-600 text-xs font-semibold" onClick={() => setShowWhy((s) => !s)}>
              {showWhy ? t.hide : t.why}
            </button>
            {showWhy && <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded whitespace-pre-wrap mt-2">{exp}</p>}
          </div>
        )}
        {a.aiResponse.error && <p className="text-red-600">{a.aiResponse.error}</p>}
      </div>
    );
  };

  const total = visible.length;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-blue-600 font-semibold">
          {lang === "fa" ? "سوال" : lang === "uk" ? "Питання" : "Question"} {currentIndex + 1} / {total}
        </p>
        <h2 className="text-2xl font-bold text-slate-800">{(q as any)[`question_${lang}`]}</h2>
        {(q as any)[`description_${lang}`] && <p className="mt-1 text-slate-600">{(q as any)[`description_${lang}`]}</p>}
      </div>

      <QuestionRenderer question={q} answer={a} setAnswerProperty={setProp} lang={lang} />

      {(q.starEnabled || q.bookEnabled) && (
        <div className="p-4 rounded-lg border bg-slate-50 text-sm text-slate-700">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <button
                  key={s}
                  onClick={() => setProp("rating", s)}
                  className={`w-7 h-7 rounded-full ${a.rating >= s ? "bg-yellow-400" : "bg-slate-300"} focus:outline-none`}
                  title={`Impact ${s}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((b) => (
                <button
                  key={b}
                  onClick={() => setProp("length", b)}
                  className={`px-2 py-1 rounded ${a.length >= b ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-700"}`}
                  title={`Length ${b}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-lg border bg-blue-50">
        <h3 className="font-semibold text-blue-900 mb-2">{lang === "fa" ? "راهنمای هوشمند (AI)" : lang === "uk" ? "Підказки ШІ" : "AI Guidance"}</h3>
        {renderAI()}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          disabled={currentIndex === 0}
          className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold py-2 px-6 rounded disabled:opacity-50"
        >
          {t.prev}
        </button>
        <button
          onClick={() => setCurrentIndex((i) => Math.min(i + 1, total - 1))}
          disabled={currentIndex === total - 1}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
        >
          {t.next}
        </button>
      </div>
    </div>
  );
}

/**
 * =============================================================
 * App shell
 * =============================================================
 */
function App() {
  const [lang, setLang] = useState<Lang>("fa");
  const [active, setActive] = useState<string | null>(modulesList[0]?.id || null);

  const mod = active ? formContent[active] : null;

  return (
    <div className="min-h-screen bg-gray-100 text-slate-800">
      <header className="bg-white sticky top-0 z-10 shadow">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8" />
            <h1 className="font-bold text-lg">UK PIP Assist</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="border rounded px-2 py-1 bg-white"
              aria-label="language"
            >
              <option value="fa">فارسی</option>
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Module selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {modulesList.map((m) => (
            <Card key={m.id} onClick={() => setActive(m.id)} label={(m.name as any)[lang]} />
          ))}
        </div>

        {/* Module body */}
        {mod ? (
          <div className="bg-white rounded-xl p-5 shadow">
            <h2 className="text-xl font-bold mb-1">{(mod as any)[`title_${lang}`]}</h2>
            <p className="text-slate-600 mb-4">{(mod as any)[`intro_${lang}`]}</p>
            <FormFlow moduleContent={mod} lang={lang} />
          </div>
        ) : (
          <p className="text-slate-600">No module selected.</p>
        )}
      </main>

      <footer className="text-center text-xs text-slate-500 py-6">
        &copy; {new Date().getFullYear()} UK PIP Assist
      </footer>
    </div>
  );
}

export default App;

// Optional: If this file is used as an entry on its own (without main.tsx)
const rootEl = document.getElementById("root");
if (rootEl && rootEl.childElementCount === 0) {
  createRoot(rootEl).render(<App />);
}
