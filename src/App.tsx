// src/App.tsx
// Full, self-contained React + TS app component implementing
// multi-language forms, conditional questions, file/proof uploads,
// star/book sliders, AI review (backend or Gemini), and JSON/Markdown export.
//
// Requirements: Vite React-TS template, plus optional deps:
//   npm i @stripe/stripe-js @google/generative-ai
//
// Notes:
// - If VITE_API_URL is set, POSTs to `${VITE_API_URL}/form-check` with {language,module,answers,stars,books}.
// - Else, if VITE_GOOGLE_API_KEY is set, uses Gemini 1.5 Flash to generate a JSON review.
// - Else, shows a local default review.
// - The Stripe button is a demo; you must create a Checkout Session server-side.

// --- Ensure ImportMeta types for Vite envs ---
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_API_URL?: string;
      readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
      readonly VITE_GOOGLE_API_KEY?: string;
    };
  }
}

import React, { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// ---------- Types ----------
interface Improvement {
  section_id: string;
  before_fa?: string;
  after_fa?: string;
  rationale_fa?: string;
  before_en?: string;
  after_en?: string;
  rationale_en?: string;
  before_uk?: string;
  after_uk?: string;
  rationale_uk?: string;
}

type FormCheckerFormType =
  | 'pip'
  | 'uc'
  | 'carers_allowance'
  | 'nhs_forms'
  | 'student_finance'
  | 'immigration'
  | 'council_tax'
  | 'blue_badge'
  | 'dvla_forms'
  | 'hmrc_forms';

interface FormCheckerResponse {
  language: 'fa' | 'en' | 'uk';
  form_type: FormCheckerFormType;
  overall_stars: 1 | 2 | 3 | 4 | 5 | 6;
  scores: {
    completeness: number;
    consistency: number;
    evidence_linkage: number;
    relevance: number;
    tone_clarity: number;
    risk_flags: number;
  };
  translation_summary: string;
  key_findings: string[];
  missing_evidence: string[];
  improvements: Improvement[];
  per_question_scores?: { [key: string]: number };
  next_steps_fa: string[];
  next_steps_en: string[];
  next_steps_uk: string[];
  disclaimer_fa: string;
  disclaimer_en: string;
  disclaimer_uk: string;
}

interface FormOption {
  value: string;
  label_fa: string;
  label_en: string;
  label_uk: string;
  tip_fa?: string;
  tip_en?: string;
  tip_uk?: string;
}

type FormQuestion = {
  id: string;
  type:
    | 'long-text'
    | 'single-select'
    | 'multi-select'
    | 'short-text'
    | 'file'
    | 'group'
    | 'currency'
    | 'number'
    | 'date';
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

interface FormModuleContent {
  moduleId: string;
  title_fa: string;
  title_en: string;
  title_uk: string;
  intro_fa: string;
  intro_en: string;
  intro_uk: string;
  questions: FormQuestion[];
}

// ---------- Data store (modules & questions) ----------
const formContent: { [key: string]: FormModuleContent } = {
  // For brevity in this file, only PIP/UC/Immigration/Blue Badge/Council Tax/DVLA/HMRC/NHS
  // are included. (Matches your scaffold.)
  // --- PIP ---
  pip: {
    moduleId: 'pip',
    title_fa: 'فرم PIP (ارزیابی کامل)',
    title_en: 'PIP Form (Full Assessment)',
    title_uk: 'Форма PIP (Повна оцінка)',
    intro_fa:
      'این فرم جامع به شما کمک می‌کند تا تمام جنبه‌های تأثیر ناتوانی بر زندگی روزمره و تحرک خود را برای درخواست PIP شرح دهید. برای هر سوال، شدت اثر (⭐) و طول پاسخ (📚) را تنظیم کنید.',
    intro_en:
      'This comprehensive form helps you describe all aspects of how your disability affects your daily living and mobility for your PIP application. For each question, adjust the impact strength (⭐) and answer length (📚).',
    intro_uk:
      'Ця комплексна форма допоможе вам описати всі аспекти впливу вашої інвалідності на повсякденне життя та мобільність для вашої заявки на PIP. Для кожного питання налаштуйте силу впливу (⭐) та довжину відповіді (📚).',
    questions: [
      { id: 'preparing_food', type: 'long-text',
        question_fa: '۱. آماده کردن غذا',
        question_en: '1. Preparing food',
        question_uk: '1. Приготування їжі',
        description_fa: 'مشکلات خود را در پوست کندن و خرد کردن سبزیجات، باز کردن بسته‌بندی‌ها، استفاده از اجاق گاز یا مایکروویو، و نیاز به کمک یا وسایل کمکی توضیح دهید. به انگیزه و ایمنی نیز اشاره کنید.',
        description_en: 'Describe your difficulties with peeling/chopping vegetables, opening packaging, using a cooker or microwave, and any need for aids or assistance. Also mention motivation and safety.',
        description_uk: 'Опишіть свої труднощі з чищенням/нарізанням овочів, відкриттям упаковок, використанням плити або мікрохвильової печі, а також будь-яку потребу в допоміжних засобах чи допомозі. Також згадайте про мотивацію та безпеку.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'eating_drinking', type: 'long-text',
        question_fa: '۲. خوردن و آشامیدن',
        question_en: '2. Eating and drinking',
        question_uk: '2. Вживання їжі та пиття',
        description_fa: 'مشکلات مربوط به بریدن غذا، بردن غذا به دهان، جویدن، بلعیدن، یا نیاز به لوله‌های تغذیه را شرح دهید.',
        description_en: 'Describe problems with cutting food, bringing food to your mouth, chewing, swallowing, or needing feeding tubes.',
        description_uk: 'Опишіть проблеми з нарізанням їжі, піднесенням їжі до рота, жуванням, ковтанням або потребою в зондах для годування.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'managing_treatments', type: 'long-text',
        question_fa: '۳. مدیریت درمان‌ها',
        question_en: '3. Managing treatments',
        question_uk: '3. Керування лікуванням',
        description_fa: 'توضیح دهید که آیا برای مصرف دارو (قرص، تزریق)، انجام فیزیوتراپی در خانه، یا نظارت بر وضعیت سلامتی خود (مانند قند خون) به کمک یا یادآوری نیاز دارید.',
        description_en: 'Explain if you need help or reminders to take medication (pills, injections), do physiotherapy at home, or monitor a health condition (like blood sugar).',
        description_uk: "Поясніть, чи потрібна вам допомога або нагадування для прийому ліків (таблетки, ін'єкції), виконання фізіотерапії вдома або моніторингу стану здоров'я (наприклад, рівня цукру в крові).",
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'washing_bathing', type: 'long-text',
        question_fa: '۴. شست‌وشو و حمام کردن',
        question_en: '4. Washing and bathing',
        question_uk: '4. Миття та купання',
        description_fa: 'مشکلات مربوط به ورود و خروج از وان یا دوش، شستن کامل بدن، و ایمنی هنگام شست‌وشو را شرح دهید.',
        description_en: 'Describe difficulties getting in/out of a bath or shower, washing your whole body, and safety issues while washing.',
        description_uk: 'Опишіть труднощі з входом/виходом з ванни або душу, миттям всього тіла та питаннями безпеки під час миття.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'managing_toilet_needs', type: 'long-text',
        question_fa: '۵. مدیریت نیازهای توالت',
        question_en: '5. Managing toilet needs',
        question_uk: '5. Керування туалетними потребами',
        description_fa: 'مشکلات مربوط به رفتن به توالت، تمیز کردن خود، یا مدیریت بی‌اختیاری (استفاده از پد یا سوند) را توضیح دهید.',
        description_en: 'Explain problems with getting to/from the toilet, cleaning yourself, or managing incontinence (using pads or catheters).',
        description_uk: 'Поясніть проблеми з відвідуванням туалету, особистою гігієною або керуванням нетриманням (використання прокладок або катетерів).',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'dressing_undressing', type: 'long-text',
        question_fa: '۶. لباس پوشیدن و درآوردن',
        question_en: '6. Dressing and undressing',
        question_uk: '6. Одягання та роздягання',
        description_fa: 'مشکلات خود در پوشیدن و درآوردن لباس و کفش، بستن دکمه‌ها، زیپ‌ها، یا استفاده از وسایل کمکی را شرح دهید.',
        description_en: 'Describe difficulties with putting on/taking off clothes and shoes, doing up buttons, zips, or using any aids.',
        description_uk: 'Опишіть труднощі з одяганням/роздяганням одягу та взуття, застібанням ґудзиків, блискавок або використанням будь-яких допоміжних засобів.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'communicating_verbally', type: 'long-text',
        question_fa: '۷. ارتباط کلامی',
        question_en: '7. Communicating verbally',
        question_uk: '7. Вербальне спілкування',
        description_fa: 'مشکلاتی که در صحبت کردن، درک کردن صحبت دیگران، یا نیاز به وسایل کمکی برای برقراری ارتباط دارید را توضیح دهید.',
        description_en: 'Describe any problems you have with speaking, understanding what people say to you, or needing aids to communicate.',
        description_uk: 'Опишіть будь-які проблеми, які у вас є з мовленням, розумінням того, що вам кажуть люди, або потребою в допоміжних засобах для спілкування.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'using_telephone', type: 'long-text',
        question_fa: '۸. استفاده از تلفن',
        question_en: '8. Using a telephone',
        question_uk: '8. Користування телефоном',
        description_fa: 'مشکلات خود را در استفاده از تلفن استاندارد، مانند شماره‌گیری، شنیدن یا درک مکالمه، و اینکه آیا به کمک یا دستگاه‌های خاصی نیاز دارید، توضیح دهید.',
        description_en: 'Describe your difficulties using a standard telephone, such as dialling, hearing or understanding conversations, and whether you need help or special devices.',
        description_uk: 'Опишіть свої труднощі з використанням стандартного телефону, такі як набір номера, слухання або розуміння розмов, і чи потрібна вам допомога або спеціальні пристрої.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'reading_understanding', type: 'long-text',
        question_fa: '۹. خواندن و درک کردن',
        question_en: '9. Reading and understanding',
        question_uk: '9. Читання та розуміння',
        description_fa: 'مشکلات مربوط به خواندن و درک علائم، نمادها، و کلمات (مثلاً به دلیل مشکلات بینایی یا شناختی) را شرح دهید.',
        description_en: 'Describe difficulties with reading and understanding signs, symbols, and words (e.g., due to vision or cognitive issues).',
        description_uk: 'Опишіть труднощі з читанням і розумінням знаків, символів та слів (наприклад, через проблеми із зором або когнітивні проблеми).',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'managing_correspondence', type: 'long-text',
        question_fa: '۱۰. مدیریت نامه‌ها و مکاتبات',
        question_en: '10. Managing correspondence',
        question_uk: '10. Керування кореспонденцією',
        description_fa: 'مشکلات خود در خواندن، درک کردن و اقدام بر اساس نامه‌های رسمی، قبوض یا ایمیل‌ها را شرح دهید. به نیاز به کمک برای مدیریت این امور اشاره کنید.',
        description_en: 'Describe your problems with reading, understanding, and acting on official letters, bills, or emails. Mention any help you need to manage these tasks.',
        description_uk: 'Опишіть свої проблеми з читанням, розумінням та реагуванням на офіційні листи, рахунки або електронні листи. Згадайте будь-яку допомогу, яка вам потрібна для виконання цих завдань.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'engaging_socially', type: 'long-text',
        question_fa: '۱۱. تعامل با دیگران',
        question_en: '11. Engaging with other people',
        question_uk: '11. Соціальна взаємодія',
        description_fa: 'مشکلات مربوط به تعامل رو در رو با دیگران به دلیل اضطراب شدید، پریشانی روانی، یا مشکلات شناختی را توضیح دهید.',
        description_en: 'Explain difficulties with engaging face-to-face with others due to severe anxiety, psychological distress, or cognitive issues.',
        description_uk: 'Поясніть труднощі з особистою взаємодією з іншими через сильну тривогу, психологічний стрес або когнітивні проблеми.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'making_budgeting_decisions', type: 'long-text',
        question_fa: '۱۲. تصمیم‌گیری در مورد بودجه',
        question_en: '12. Making budgeting decisions',
        question_uk: '12. Прийняття бюджетних рішень',
        description_fa: 'مشکلات خود در مدیریت پول، پرداخت قبوض، یا تصمیم‌گیری‌های مالی پیچیده را به دلیل مشکلات شناختی یا روانی شرح دهید.',
        description_en: 'Describe your problems with managing money, paying bills, or making complex financial decisions due to cognitive or mental health issues.',
        description_uk: 'Опишіть свої проблеми з управлінням грошима, оплатою рахунків або прийняттям складних фінансових рішень через когнітивні проблеми або проблеми з психічним здоров\'ям.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'safety_awareness', type: 'long-text',
        question_fa: '۱۳. آگاهی از خطرات و ایمنی',
        question_en: '13. Safety awareness',
        question_uk: '13. Усвідомлення небезпеки та безпека',
        description_fa: 'توضیح دهید که آیا به دلیل وضعیت سلامتی خود در معرض خطر هستید، مثلاً در آشپزخانه، حمام، یا هنگام عبور از خیابان. به مواردی مانند فراموشی، سرگیجه یا سقوط اشاره کنید.',
        description_en: 'Explain if you are at risk due to your health condition, for example in the kitchen, bathroom, or when crossing roads. Mention issues like forgetfulness, dizziness, or falls.',
        description_uk: "Поясніть, чи наражаєтеся ви на ризик через стан свого здоров'я, наприклад, на кухні, у ванній або при переході дороги. Згадайте такі проблеми, як забудькуватість, запаморочення або падіння.",
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'planning_journeys', type: 'long-text',
        question_fa: '۱۴. برنامه‌ریزی و دنبال کردن سفر',
        question_en: '14. Planning and following journeys',
        question_uk: '14. Планування та дотримання маршруту',
        description_fa: 'مشکلات مربوط به برنامه‌ریزی یک مسیر، دنبال کردن آن (چه آشنا و چه ناآشنا)، یا نیاز به همراهی به دلیل اضطراب، سردرگمی، یا پریشانی روانی را توضیح دهید.',
        description_en: 'Describe difficulties with planning a route, following a route (both familiar and unfamiliar), or needing someone with you due to anxiety, disorientation, or psychological distress.',
        description_uk: 'Опишіть труднощі з плануванням маршруту, дотриманням маршруту (як знайомого, так і незнайомого) або потребою в супроводі через тривогу, дезорієнтацію або психологічний стрес.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'moving_around', type: 'long-text',
        question_fa: '۱۵. حرکت کردن در اطراف',
        question_en: '15. Moving around',
        question_uk: '15. Пересування',
        description_fa: 'توضیح دهید که چقدر می‌توانید راه بروید قبل از اینکه احساس درد، خستگی شدید، یا تنگی نفس کنید. به نوع سطح (صاف، شیب‌دار)، سرعت راه رفتن، و استفاده از وسایل کمکی (عصا، واکر، ویلچر) اشاره کنید.',
        description_en: 'Explain how far you can walk before feeling significant pain, severe fatigue, or breathlessness. Mention the type of surface (flat, sloped), your walking speed, and any aids you use (stick, walker, wheelchair).',
        description_uk: 'Поясніть, як далеко ви можете пройти, перш ніж відчуєте значний біль, сильну втому або задишку. Згадайте тип поверхні (рівна, похила), швидкість ходьби та будь-які допоміжні засоби, які ви використовуєте (палиця, ходунки, інвалідний візок).',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'walking_pain_details', type: 'long-text',
        question_fa: '۱۶. جزئیات درد هنگام راه رفتن',
        question_en: '16. Pain while walking',
        question_uk: '16. Деталі болю під час ходьби',
        description_fa: 'نوع، شدت و محل درد هنگام راه رفتن را توصیف کنید. توضیح دهید که درد چگونه بر سرعت، نحوه راه رفتن و توانایی شما برای ادامه دادن تأثیر می‌گذارد.',
        description_en: 'Describe the type, severity, and location of the pain you experience while walking. Explain how the pain affects your speed, gait, and ability to continue.',
        description_uk: 'Опишіть тип, інтенсивність та локалізацію болю, який ви відчуваєте під час ходьби. Поясніть, як біль впливає на вашу швидкість, ходу та здатність продовжувати.',
        allowProof: true, starEnabled: true, bookEnabled: true },
      { id: 'using_mobility_aids', type: 'long-text',
        question_fa: '۱۷. استفاده از وسایل کمکی حرکتی',
        question_en: '17. Using mobility aids',
        question_uk: '17. Використання допоміжних засобів для пересування',
        description_fa: 'توضیح دهید که چرا و چگونه از وسایل کمکی (مانند عصا، واکر، ویلچر) استفاده می‌کنید. آیا برای استفاده از آن‌ها به کمک نیاز دارید؟ این وسایل چقدر به شما کمک می‌کنند؟',
        description_en: 'Explain why and how you use mobility aids (like a stick, walker, wheelchair). Do you need help to use them? How much do they help you?',
        description_uk: 'Поясніть, чому і як ви використовуєте допоміжні засоби для пересування (наприклад, палицю, ходунки, інвалідний візок). Чи потрібна вам допомога для їх використання? Наскільки вони вам допомагають?',
        allowProof: true, starEnabled: true, bookEnabled: true },
    ]
  },

  // --- UC ---
  uc: {
    moduleId: 'uc',
    title_fa: 'یونیورسال کردیت (Universal Credit)',
    title_en: 'Universal Credit',
    title_uk: 'Універсальний кредит (Universal Credit)',
    intro_fa: 'این فرم به شما کمک می‌کند تا برای Universal Credit درخواست دهید یا حساب خود را مدیریت کنید.',
    intro_en: 'This form helps you apply for or manage your Universal Credit account.',
    intro_uk: 'Ця форма допоможе вам подати заявку або керувати своїм обліковим записом Universal Credit.',
    questions: [
      { id: 'claim_type', type: 'single-select',
        question_fa: 'نوع درخواست شما چیست؟', question_en: 'What is the type of your claim?', question_uk: 'Який тип вашої заявки?',
        options: [
          { value: 'new', label_fa: 'درخواست جدید', label_en: 'New claim', label_uk: 'Нова заявка' },
          { value: 'manage', label_fa: 'مدیریت حساب فعلی', label_en: 'Manage existing account', label_uk: 'Керувати існуючим обліковим записом' }
        ]},
      { id: 'household', type: 'single-select',
        question_fa: 'چه کسی در درخواست شما حضور دارد؟', question_en: 'Who is on your claim?', question_uk: 'Хто вказаний у вашій заявці?',
        options: [
          { value: 'single', label_fa: 'فقط من', label_en: 'Just me', label_uk: 'Тільки я' },
          { value: 'couple', label_fa: 'من و همسرم/پارتنرم', label_en: 'Me and my partner', label_uk: 'Я та мій партнер' }
        ]},
      { id: 'has_children', type: 'single-select',
        question_fa: 'آیا فرزندی دارید که با شما زندگی کند؟', question_en: 'Do you have any children who live with you?', question_uk: 'Чи є у вас діти, які проживають з вами?',
        options: [
          { value: 'yes', label_fa: 'بله', label_en: 'Yes', label_uk: 'Так' },
          { value: 'no', label_fa: 'خیر', label_en: 'No', label_uk: 'Ні' }
        ]},
      { id: 'housing_costs', type: 'single-select',
        question_fa: 'آیا برای خانه خود اجاره پرداخت می‌کنید؟', question_en: 'Do you pay rent for your home?', question_uk: 'Ви платите оренду за своє житло?',
        options: [
          { value: 'yes', label_fa: 'بله', label_en: 'Yes', label_uk: 'Так' },
          { value: 'no', label_fa: 'خیر', label_en: 'No', label_uk: 'Ні' }
        ],
        allowProof: true,
        proof_hint_fa: 'قرارداد اجاره یا نامه از صاحبخانه را بارگذاری کنید.',
        proof_hint_en: 'Upload your tenancy agreement or a letter from your landlord.',
        proof_hint_uk: 'Завантажте договір оренди або лист від орендодавця.'
      },
      { id: 'savings', type: 'currency',
        question_fa: 'مجموع پس‌انداز شما چقدر است؟', question_en: "What are your total savings?", question_uk: 'Які ваші загальні заощадження?',
        placeholder_fa: '£', placeholder_en: '£', placeholder_uk: '£', allowProof: true,
        proof_hint_fa: 'صورت‌حساب‌های بانکی اخیر را بارگذاری کنید.', proof_hint_en: 'Upload recent bank statements.', proof_hint_uk: 'Завантажте останні банківські виписки.' },
      { id: 'employment_status', type: 'single-select',
        question_fa: 'آیا شاغل هستید؟', question_en: 'Are you employed?', question_uk: 'Ви працевлаштовані?',
        options: [
          { value: 'yes', label_fa: 'بله', label_en: 'Yes', label_uk: 'Так' },
          { value: 'no', label_fa: 'خیر', label_en: 'No', label_uk: 'Ні' }
        ],
        allowProof: true, proof_hint_fa: 'آخرین فیش حقوقی خود را بارگذاری کنید.', proof_hint_en: 'Upload your most recent payslip.', proof_hint_uk: 'Завантажте свою останню платіжну відомість.'
      },
    ]
  },

  // --- Immigration (trimmed selection) ---
  immigration: {
    moduleId: 'immigration',
    title_fa: 'امور مهاجرت',
    title_en: 'Immigration Affairs',
    title_uk: 'Імміграційні справи',
    intro_fa: 'راهنمایی برای فرم‌های رایج مهاجرتی در UK.',
    intro_en: 'Guidance for common UK immigration forms.',
    intro_uk: 'Довідник щодо поширених імміграційних форм у Великобританії.',
    questions: [
      { id: 'application_type', type: 'single-select',
        question_fa: 'چه نوع درخواست مهاجرتی دارید؟', question_en: 'What type of immigration application are you making?', question_uk: 'Який тип імміграційної заявки ви подаєте?',
        options: [
          { value: 'visa_extension', label_fa: 'تمدید ویزا', label_en: 'Visa Extension', label_uk: 'Продовження візи' },
          { value: 'settlement', label_fa: 'اقامت دائم (ILR)', label_en: 'Settlement (ILR)', label_uk: 'Постійне проживання (ILR)' },
          { value: 'citizenship', label_fa: 'شهروندی (تابعیت)', label_en: 'Citizenship (Naturalisation)', label_uk: 'Громадянство (Натуралізація)' },
          { value: 'family_visa', label_fa: 'ویزای خانوادگی', label_en: 'Family Visa', label_uk: 'Сімейна віза' }
        ]},
      { id: 'current_visa', type: 'short-text',
        question_fa: 'نوع ویزای فعلی شما چیست؟', question_en: 'What is your current visa type?', question_uk: 'Який ваш поточний тип візи?',
        placeholder_fa: 'Skilled Worker, Student Visa', placeholder_en: 'Skilled Worker, Student Visa', placeholder_uk: 'Skilled Worker, Student Visa',
        allowProof: true, proof_hint_fa: 'کارت اقامت بیومتریک (BRP) خود را بارگذاری کنید.', proof_hint_en: 'Upload your BRP.', proof_hint_uk: 'Завантажте BRP.'
      },
      { id: 'time_in_uk', type: 'short-text',
        question_fa: 'چقدر مداوم در UK زندگی کرده‌اید؟', question_en: 'How long have you lived continuously in the UK?', question_uk: 'Як довго ви безперервно проживаєте у Великобританії?',
        placeholder_fa: 'مثلاً: ۵ سال و ۲ ماه', placeholder_en: 'e.g., 5 years 2 months', placeholder_uk: 'напр., 5 років і 2 місяці'
      },
      { id: 'english_test', type: 'single-select',
        question_fa: 'آیا آزمون انگلیسی را گذرانده‌اید؟', question_en: 'Have you passed an approved English language test?', question_uk: 'Чи склали ви затверджений тест з англійської?',
        options: [
          { value: 'yes', label_fa: 'بله', label_en: 'Yes', label_uk: 'Так' },
          { value: 'no', label_fa: 'خیر', label_en: 'No', label_uk: 'Ні' },
          { value: 'exempt', label_fa: 'معاف هستم', label_en: 'I am exempt', label_uk: 'Я звільнений(а)' }
        ],
        allowProof: true, proof_hint_fa: 'گواهی آزمون زبان خود را بارگذاری کنید.', proof_hint_en: 'Upload your language test certificate.', proof_hint_uk: 'Завантажте сертифікат мовного тесту.'
      }
    ]
  },

  // --- Blue Badge (trimmed) ---
  blue_badge: {
    moduleId: 'blue_badge',
    title_fa: 'بلیو بج (کارت پارکینگ معلولیت)',
    title_en: 'Blue Badge (Disability Parking Permit)',
    title_uk: 'Синій значок (Дозвіл на паркування)',
    intro_fa: 'ارزیابی شرایط برای Blue Badge.',
    intro_en: 'Assess eligibility for a Blue Badge.',
    intro_uk: 'Оцінка відповідності критеріям для Синього значка.',
    questions: [
      { id: 'local_council', type: 'single-select',
        question_fa: 'شورای محل سکونت شما کدام است؟', question_en: 'Which is your local council?', question_uk: 'Яка ваша місцева рада?',
        options: [
          { value: 'england', label_fa: 'England', label_en: 'England', label_uk: 'Англія' },
          { value: 'scotland', label_fa: 'Scotland', label_en: 'Scotland', label_uk: 'Шотландія' },
          { value: 'wales', label_fa: 'Wales', label_en: 'Wales', label_uk: 'Уельс' },
          { value: 'ni', label_fa: 'Northern Ireland', label_en: 'Northern Ireland', label_uk: 'Північна Ірландія' },
        ],
        starEnabled: true, bookEnabled: true
      },
      { id: 'walking_distance', type: 'single-select',
        question_fa: 'حداکثر مسافتی که می‌توانید بدون توقف راه بروید؟', question_en: 'Max distance you can walk without stopping?', question_uk: 'Макс відстань без зупинки?',
        options: [
          { value: 'under20m', label_fa: 'کمتر از ۲۰ متر', label_en: 'Less than 20m', label_uk: 'Менше 20 м' },
          { value: '20to50m', label_fa: '۲۰ تا ۵۰ متر', label_en: '20–50m', label_uk: '20–50 м' },
          { value: '50to100m', label_fa: '۵۰ تا ۱۰۰ متر', label_en: '50–100m', label_uk: '50–100 м' },
          { value: 'over100m', label_fa: 'بیش از ۱۰۰ متر', label_en: 'More than 100m', label_uk: 'Понад 100 м' },
        ],
        allowProof: true, proof_hint_fa: 'گزارش پزشک یا فیزیوتراپی را بارگذاری کنید.', proof_hint_en: 'Upload doctor/physio report.', proof_hint_uk: 'Завантажте звіт лікаря/фізіотерапевта.'
      }
    ]
  },

  // --- Council Tax (trimmed) ---
  council_tax: {
    moduleId: 'council_tax',
    title_fa: 'کاهش مالیات شورای محلی',
    title_en: 'Council Tax Reduction',
    title_uk: 'Знижка на муніципальний податок',
    intro_fa: 'فرم برای تخفیف Council Tax.',
    intro_en: 'Form for Council Tax Reduction.',
    intro_uk: 'Форма для знижки муніципального податку.',
    questions: [
      { id: 'local_council', type: 'short-text',
        question_fa: 'نام شورای محل سکونت شما چیست؟', question_en: 'What is your local council name?', question_uk: 'Як називається ваша місцева рада?',
        placeholder_fa: 'e.g., Camden', placeholder_en: 'e.g., Camden', placeholder_uk: 'напр., Camden' },
      { id: 'income', type: 'single-select',
        question_fa: 'منبع اصلی درآمد شما چیست؟', question_en: 'Main source of income?', question_uk: 'Основне джерело доходу?',
        options: [
          { value: 'job', label_fa: 'شغل/حقوق', label_en: 'Employment', label_uk: 'Робота' },
          { value: 'benefits', label_fa: 'کمک‌هزینه‌ها', label_en: 'Benefits', label_uk: 'Пільги' },
          { value: 'pension', label_fa: 'بازنشستگی', label_en: 'Pension', label_uk: 'Пенсія' },
          { value: 'none', label_fa: 'بدون درآمد', label_en: 'No income', label_uk: 'Без доходу' },
        ],
        allowProof: true, proof_hint_fa: 'فیش حقوقی/نامه مزایا/صورت‌حساب.', proof_hint_en: 'Payslip/benefit letter/bank statement.', proof_hint_uk: 'Платіжка/лист про пільги/виписка.'
      },
      { id: 'other_notes', type: 'long-text',
        question_fa: 'توضیحات اضافی', question_en: 'Additional notes', question_uk: 'Додаткові примітки',
        placeholder_fa: 'هر توضیحی که مفید است...' , placeholder_en: 'Anything helpful...', placeholder_uk: 'Будь-що корисне...' }
    ]
  },

  // --- DVLA (trimmed) ---
  dvla_forms: {
    moduleId: 'dvla_forms',
    title_fa: 'فرم‌های DVLA',
    title_en: 'DVLA Forms',
    title_uk: 'Форми DVLA',
    intro_fa: 'راهنمای فرم‌های گواهینامه رانندگی.',
    intro_en: 'Driving licence forms helper.',
    intro_uk: 'Довідник з форм посвідчення водія.',
    questions: [
      { id: 'application_type', type: 'single-select',
        question_fa: 'چه نوع درخواستی دارید؟', question_en: 'What type of application?', question_uk: 'Який тип заявки?',
        options: [
          { value: 'new_provisional', label_fa: 'گواهینامه جدید', label_en: 'New Provisional', label_uk: 'Нове тимчасове' },
          { value: 'exchange_foreign', label_fa: 'تعویض گواهینامه خارجی', label_en: 'Exchange foreign licence', label_uk: 'Обмін іноземного' },
          { value: 'renewal', label_fa: 'تمدید', label_en: 'Renewal', label_uk: 'Поновлення' },
        ]},
      { id: 'photo', type: 'file',
        question_fa: 'عکس پاسپورتی اخیر خود را بارگذاری کنید.', question_en: 'Upload a recent passport-style photo.', question_uk: 'Завантажте останнє фото паспортного формату.',
        proof_hint_fa: 'پس‌زمینه روشن، بدون عینک آفتابی یا کلاه.', proof_hint_en: 'Light background, no sunglasses/hat.', proof_hint_uk: 'Світлий фон, без окулярів/капелюха.',
        allowProof: true
      },
    ]
  },

  // --- HMRC (trimmed) ---
  hmrc_forms: {
    moduleId: 'hmrc_forms',
    title_fa: 'فرم‌های HMRC (مالیات)',
    title_en: 'HMRC Forms (Tax)',
    title_uk: 'Форми HMRC (Податки)',
    intro_fa: 'راهنمای Self Assessment یا Child Tax Credit.',
    intro_en: 'Self Assessment / Child Tax Credit helper.',
    intro_uk: 'Довідник Self Assessment / Child Tax Credit.',
    questions: [
      { id: 'hmrc_flow', type: 'single-select',
        question_fa: 'کدام مورد را نیاز دارید؟', question_en: 'Which do you need?', question_uk: 'Що вам потрібно?',
        options: [
          { value: 'self_assessment', label_fa: 'Self Assessment', label_en: 'Self Assessment', label_uk: 'Self Assessment' },
          { value: 'child_tax_credit', label_fa: 'Child Tax Credit', label_en: 'Child Tax Credit', label_uk: 'Child Tax Credit' },
        ]},
      { id: 'sa_utr', type: 'short-text', when: { hmrc_flow: 'self_assessment' },
        question_fa: 'آیا UTR دارید؟', question_en: 'Do you have a UTR?', question_uk: 'У вас є UTR?',
        placeholder_fa: '۱۰ رقمی یا بنویسید ندارم', placeholder_en: '10-digit or say none', placeholder_uk: '10 цифр або «немає»',
        allowProof: true, proof_hint_fa: 'نامه HMRC یا اسکرین‌شات اکانت.', proof_hint_en: 'HMRC letter or account screenshot.', proof_hint_uk: 'Лист HMRC або скрін акаунту.'
      },
    ]
  },

  // --- NHS (trimmed) ---
  nhs_forms: {
    moduleId: 'nhs_forms',
    title_fa: 'فرم‌های NHS',
    title_en: 'NHS Forms',
    title_uk: 'Форми NHS',
    intro_fa: 'ثبت GP و کمک‌هزینه درمان (HC1/HC2).',
    intro_en: 'GP registration & HC1/HC2 support.',
    intro_uk: 'Реєстрація у GP і форми HC1/HC2.',
    questions: [
      { id: 'form_type', type: 'single-select',
        question_fa: 'کدام فرم؟', question_en: 'Which form?', question_uk: 'Яка форма?',
        options: [
          { value: 'gp', label_fa: 'ثبت GP', label_en: 'GP registration', label_uk: 'Реєстрація GP' },
          { value: 'hc1', label_fa: 'فرم HC1/HC2', label_en: 'HC1/HC2', label_uk: 'HC1/HC2' },
        ]},
      { id: 'gp_address', type: 'short-text', when: { form_type: 'gp' },
        question_fa: 'آدرس کامل محل سکونت شما چیست؟', question_en: 'Your full home address?', question_uk: 'Ваша повна домашня адреса?',
        placeholder_fa: 'مثلاً: 123 King’s Road, Manchester', placeholder_en: 'e.g., 123 King’s Road, Manchester', placeholder_uk: 'напр., 123 King’s Road, Manchester',
        allowProof: true, proof_hint_fa: 'قبض آب/برق یا قرارداد اجاره.', proof_hint_en: 'Utility bill or tenancy.', proof_hint_uk: 'Комунальний рахунок або оренда.'
      },
    ]
  },
};

// ---------- Helpers ----------
type Lang = 'fa' | 'en' | 'uk';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

function getLabel(o: FormOption, lang: Lang) {
  return lang === 'fa' ? o.label_fa : lang === 'uk' ? o.label_uk : o.label_en;
}
function getQuestionText(q: FormQuestion, lang: Lang) {
  return lang === 'fa' ? q.question_fa : lang === 'uk' ? q.question_uk : q.question_en;
}
function getDescription(q: FormQuestion, lang: Lang) {
  return lang === 'fa' ? (q.description_fa ?? '') : lang === 'uk' ? (q.description_uk ?? '') : (q.description_en ?? '');
}
function getPlaceholder(q: FormQuestion, lang: Lang) {
  return lang === 'fa' ? (q.placeholder_fa ?? '') : lang === 'uk' ? (q.placeholder_uk ?? '') : (q.placeholder_en ?? '');
}
function getProofHint(q: FormQuestion, lang: Lang) {
  return lang === 'fa' ? (q.proof_hint_fa ?? '') : lang === 'uk' ? (q.proof_hint_uk ?? '') : (q.proof_hint_en ?? '');
}
function visibleByWhen(q: FormQuestion, answers: Record<string, any>): boolean {
  if (!q.when) return true;
  return Object.entries(q.when).every(([dep, val]) => String((answers as any)[dep]) === String(val));
}

// Simple slug
const slug = (s: string) =>
  s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');

// Download helper
function downloadBlob(filename: string, data: string | Blob) {
  const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain;charset=utf-8' }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Main Component ----------
const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('fa');
  const [moduleKey, setModuleKey] = useState<string>('pip');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [proofs, setProofs] = useState<Record<string, File | null>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [books, setBooks] = useState<Record<string, number>>({});
  const [review, setReview] = useState<FormCheckerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mod = useMemo(() => formContent[moduleKey], [moduleKey]);

  useEffect(() => {
    // reset on module or language change
    setAnswers({});
    setFiles({});
    setProofs({});
    setStars({});
    setBooks({});
    setReview(null);
    setError(null);
  }, [moduleKey, lang]);

  const onAnswerChange = (id: string, value: any) => {
    setAnswers((a) => ({ ...a, [id]: value }));
  };

  const onFileChange = (id: string, e: ChangeEvent<HTMLInputElement>, target: 'files'|'proofs') => {
    const f = e.target.files?.[0] || null;
    if (target === 'files') setFiles((prev) => ({ ...prev, [id]: f }));
    else setProofs((prev) => ({ ...prev, [id]: f }));
  };

  const genAssist = (q: FormQuestion) => {
    // Lightweight template helper for long-text fields using stars/books
    const s = stars[q.id] ?? 3;
    const b = books[q.id] ?? 2;
    const desc = getDescription(q, lang) || '';
    const base = desc.replace(/\s+/g, ' ').trim();
    const sentences = Math.max(2, b * 2);
    const emphasis =
      s >= 5 ? 'severe and frequent' :
      s >= 4 ? 'significant and recurring' :
      s >= 3 ? 'moderate and regular' :
      s >= 2 ? 'mild but noticeable' : 'intermittent and minor';

    const en = `Context: ${base || 'answer the question clearly.'}
Impact: ${emphasis}.
Include: frequency, duration, safety risks, aids, supervision, real examples.`;

    const fa = `زمینه: ${base || 'به‌طور واضح به سؤال پاسخ دهید.'}
شدت اثر: ${s >= 5 ? 'خیلی شدید و مکرر' : s >= 4 ? 'زیاد و تکرارشونده' : s >= 3 ? 'متوسط و معمول' : s >= 2 ? 'خفیف اما قابل توجه' : 'گاه‌به‌گاه و خفیف'}.
شامل: فراوانی، مدت، خطرات ایمنی، وسایل کمکی، نظارت، مثال‌های واقعی.`;

    const uk = `Контекст: ${base || 'Дайте чітку відповідь на запитання.'}
Вплив: ${s >= 5 ? 'дуже сильний і частий' : s >= 4 ? 'значний і повторюваний' : s >= 3 ? 'помірний і регулярний' : s >= 2 ? 'легкий, але помітний' : 'епізодичний і незначний'}.
Включіть: частоту, тривалість, ризики безпеки, допоміжні засоби, нагляд, реальні приклади.`;

    const seed = lang === 'fa' ? fa : lang === 'uk' ? uk : en;
    const paragraph = Array.from({ length: sentences })
      .map((_, i) => `- ${i === 0 ? seed : '• Example: describe a typical day and a specific incident.'}`)
      .join('\n');
    onAnswerChange(q.id, paragraph);
  };

  async function startCheckout() {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      alert('Stripe publishable key missing. Set VITE_STRIPE_PUBLISHABLE_KEY.');
      return;
    }
    const stripe = await stripePromise;
    if (!stripe) {
      alert('Stripe failed to initialize.');
      return;
    }
    // You must replace this with your own Checkout Session ID from your backend
    alert('Connect to your backend to create a Stripe Checkout session and redirect.');
  }

  // Lazy Gemini loader
  let geminiClient: any = null;
  async function ensureGemini(): Promise<any | null> {
    const geminiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!geminiKey) return null;
    try {
      const mod: any = await import('@google/generative-ai');
      const GoogleGenerativeAI = mod.GoogleGenerativeAI;
      geminiClient = new GoogleGenerativeAI(geminiKey);
      return geminiClient;
    } catch (e) {
      console.warn('Gemini import failed', e);
      return null;
    }
  }

  function buildPrompt(): string {
    // Compact JSON-ish prompt for the model
    const intro =
      lang === 'fa'
        ? 'شما نقش یک بازبین فرم‌های حمایتی در UK را دارید. بر اساس پاسخ‌ها و مدارک، امتیاز بده و خلاصه و قدم‌های بعدی بده. فقط JSON معتبر خروجی بده.'
        : lang === 'uk'
        ? 'Ви — перевіряєте заявки на пільги у Великобританії. Оцініть відповіді й докази, надайте підсумок і наступні кроки. Виведіть лише валідний JSON.'
        : 'You are a UK benefits forms reviewer. Score the answers and proofs, give a concise summary and actionable next steps. Output valid JSON only.';

    const schemaHint = {
      language: lang,
      form_type: moduleKey,
      want_fields: [
        'overall_stars (1..6)',
        'scores (completeness, consistency, evidence_linkage, relevance, tone_clarity, risk_flags)',
        'translation_summary',
        'key_findings[]',
        'missing_evidence[]',
        'improvements[] per answered question with before/after/rationale for current language',
        'per_question_scores{}',
        'next_steps_fa/en/uk',
        'disclaimer_fa/en/uk'
      ]
    };

    return [
      intro,
      'DATA:',
      JSON.stringify({ answers, stars, books }, null, 2),
      'SCHEMA_HINT:',
      JSON.stringify(schemaHint, null, 2),
      'Return ONLY JSON for FormCheckerResponse.'
    ].join('\n');
  }

  function safeDefaultReview(): FormCheckerResponse {
    return {
      language: lang,
      form_type: moduleKey as FormCheckerFormType,
      overall_stars: 4,
      scores: {
        completeness: 4,
        consistency: 4,
        evidence_linkage: 3,
        relevance: 4,
        tone_clarity: 4,
        risk_flags: 2
      },
      translation_summary:
        lang === 'fa'
          ? 'خلاصه اولیه براساس پاسخ‌های شما تولید شد.'
          : lang === 'uk'
          ? 'Попередній підсумок згенеровано на основі ваших відповідей.'
          : 'A preliminary summary was generated from your answers.',
      key_findings: [
        'Answers provided for most key areas.',
        'Consider linking proofs explicitly to claims.',
        'Tone is generally clear; add concrete daily examples.'
      ],
      missing_evidence: ['Recent medical letter', 'Proof of address (if applicable)'],
      improvements: Object.keys(answers).map((k) => ({
        section_id: k,
        [`before_${lang}`]: String((answers as any)[k] ?? ''),
        [`after_${lang}`]: '',
        [`rationale_${lang}`]: ''
      })) as any,
      per_question_scores: Object.fromEntries(Object.keys(answers).map((k) => [k, 4])),
      next_steps_fa: ['بازبینی پاسخ‌ها', 'افزودن مدارک', 'ارسال فرم'],
      next_steps_en: ['Review answers', 'Attach evidence', 'Submit the form'],
      next_steps_uk: ['Перевірити відповіді', 'Додати докази', 'Подати форму'],
      disclaimer_fa: 'این راهنما جایگزین مشاوره تخصصی نیست.',
      disclaimer_en: 'This guidance is not a substitute for professional advice.',
      disclaimer_uk: 'Це керівництво не є заміною професійної консультації.'
    };
  }

  async function buildAIReview(): Promise<FormCheckerResponse> {
    setError(null);
    const payload = {
      language: lang,
      module: moduleKey,
      answers,
      stars,
      books
    };

    // 1) Try backend if provided
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/form-check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          const merged = { ...safeDefaultReview(), ...data };
          return merged;
        } else {
          console.warn('Backend responded with status', res.status);
        }
      } catch (e) {
        console.warn('Backend review failed, falling back to Gemini/local.', e);
      }
    }

    // 2) Try Gemini
    try {
      const gem = await ensureGemini();
      if (gem) {
        const model = gem.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = buildPrompt();
        const result = await model.generateContent(prompt as any);
        const text = (result?.response?.text?.() ?? '').trim();
        if (text) {
          // Extract JSON (in case it's wrapped in markdown)
          const match = text.match(/\{[\s\S]*\}$/m);
          const jsonText = match ? match[0] : text;
          const parsed = JSON.parse(jsonText);
          const merged = { ...safeDefaultReview(), ...parsed };
          return merged;
        }
      }
    } catch (e) {
      console.warn('Gemini path failed, using default review.', e);
      setError('AI review fallback used (Gemini parsing failed).');
    }

    // 3) Default
    return safeDefaultReview();
  }

  function renderStarsAndBooks(q: FormQuestion) {
    const sVal = stars[q.id] ?? 3;
    const bVal = books[q.id] ?? 2;
    return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
        {q.starEnabled && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>⭐</span>
            <input
              type="range" min={1} max={5} step={1}
              value={sVal}
              onChange={(e) => setStars((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
            />
            <span>{sVal}</span>
          </label>
        )}
        {q.bookEnabled && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>📚</span>
            <input
              type="range" min={1} max={5} step={1}
              value={bVal}
              onChange={(e) => setBooks((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
            />
            <span>{bVal}</span>
          </label>
        )}
        {q.type === 'long-text' && (
          <button type="button" onClick={() => genAssist(q)} style={{ padding: '6px 10px' }}>
            Assist ✍️
          </button>
        )}
      </div>
    );
  }

  function renderQuestion(q: FormQuestion) {
    if (!visibleByWhen(q, answers)) return null;
    const desc = getDescription(q, lang);
    return (
      <div key={q.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, margin: '10px 0' }}>
        <label htmlFor={q.id} style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
          {getQuestionText(q, lang)}
        </label>
        {desc && <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>{desc}</div>}

        {/* Input by type */}
        {q.type === 'short-text' && (
          <input
            id={q.id}
            type="text"
            placeholder={getPlaceholder(q, lang)}
            value={answers[q.id] || ''}
            onChange={(e) => onAnswerChange(q.id, e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        )}

        {q.type === 'long-text' && (
          <textarea
            id={q.id}
            placeholder={getPlaceholder(q, lang) || ''}
            value={answers[q.id] || ''}
            onChange={(e) => onAnswerChange(q.id, e.target.value)}
            rows={6}
            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }}
          />
        )}

        {q.type === 'currency' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>£</span>
            <input
              id={q.id}
              type="number"
              placeholder={getPlaceholder(q, lang)}
              value={answers[q.id] ?? ''}
              onChange={(e) => onAnswerChange(q.id, Number(e.target.value))}
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
            />
          </div>
        )}

        {q.type === 'number' && (
          <input
            id={q.id}
            type="number"
            placeholder={getPlaceholder(q, lang)}
            value={answers[q.id] ?? ''}
            onChange={(e) => onAnswerChange(q.id, Number(e.target.value))}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        )}

        {q.type === 'date' && (
          <input
            id={q.id}
            type="date"
            value={answers[q.id] ?? ''}
            onChange={(e) => onAnswerChange(q.id, e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          />
        )}

        {q.type === 'single-select' && (
          <select
            id={q.id}
            value={answers[q.id] ?? ''}
            onChange={(e) => onAnswerChange(q.id, e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
          >
            <option value="" disabled>
              {lang === 'fa' ? 'انتخاب کنید…' : lang === 'uk' ? 'Виберіть…' : 'Select…'}
            </option>
            {(q.options || []).map((o) => (
              <option key={o.value} value={o.value} title={getLabel(o, lang)}>
                {getLabel(o, lang)}
              </option>
            ))}
          </select>
        )}

        {q.type === 'multi-select' && (
          <div style={{ display: 'grid', gap: 6 }}>
            {(q.options || []).map((o) => {
              const arr: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
              const checked = arr.includes(o.value);
              return (
                <label key={o.value} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(arr);
                      if (e.target.checked) next.add(o.value);
                      else next.delete(o.value);
                      onAnswerChange(q.id, Array.from(next));
                    }}
                  />
                  <span>{getLabel(o, lang)}</span>
                </label>
              );
            })}
          </div>
        )}

        {q.type === 'file' && (
          <input
            id={q.id}
            type="file"
            onChange={(e) => onFileChange(q.id, e, 'files')}
          />
        )}

        {q.type === 'group' && (
          <div style={{ borderLeft: '3px solid #e5e7eb', paddingLeft: 12, marginTop: 8 }}>
            {(q.children || []).map((child) => renderQuestion(child))}
          </div>
        )}

        {renderStarsAndBooks(q)}

        {q.allowProof && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
              {getProofHint(q, lang) || (lang === 'fa' ? 'آپلود مدرک (اختیاری)' : lang === 'uk' ? 'Завантажити доказ (необов’язково)' : 'Upload proof (optional)')}
            </div>
            <input type="file" onChange={(e) => onFileChange(q.id, e, 'proofs')} />
          </div>
        )}
      </div>
    );
  }

  async function onBuildReview() {
    setLoading(true);
    try {
      const r = await buildAIReview();
      setReview(r);
    } catch (e: any) {
      setError(e?.message || 'Failed to build review.');
    } finally {
      setLoading(false);
    }
  }

  function exportJSON() {
    const data = {
      language: lang,
      module: moduleKey,
      answers,
      files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v?.name || null])),
      proofs: Object.fromEntries(Object.entries(proofs).map(([k, v]) => [k, v?.name || null])),
      stars,
      books,
      review
    };
    downloadBlob(`form-${moduleKey}-${Date.now()}.json`, JSON.stringify(data, null, 2));
  }

  function exportMarkdown() {
    const lines: string[] = [];
    const title = lang === 'fa' ? mod.title_fa : lang === 'uk' ? mod.title_uk : mod.title_en;
    lines.push(`# ${title}`);
    lines.push('');
    lines.push(lang === 'fa' ? mod.intro_fa : lang === 'uk' ? mod.intro_uk : mod.intro_en);
    lines.push('');
    (mod.questions || []).forEach((q) => {
      if (!visibleByWhen(q, answers)) return;
      const qText = getQuestionText(q, lang);
      const val = answers[q.id];
      const sVal = stars[q.id];
      const bVal = books[q.id];
      lines.push(`## ${qText}`);
      if (sVal) lines.push(`- ⭐: ${sVal}`);
      if (bVal) lines.push(`- 📚: ${bVal}`);
      if (typeof val !== 'undefined') lines.push(`\n${String(val)}\n`);
      const fileName = files[q.id]?.name;
      const proofName = proofs[q.id]?.name;
      if (fileName) lines.push(`- 📎 File: ${fileName}`);
      if (proofName) lines.push(`- ✅ Proof: ${proofName}`);
      lines.push('');
    });
    if (review) {
      lines.push('---');
      lines.push('## AI Review');
      lines.push(`- Overall ⭐: ${review.overall_stars}`);
      lines.push(`- Scores: ${JSON.stringify(review.scores)}`);
      lines.push(`- Summary: ${review.translation_summary}`);
      if (review.key_findings?.length) {
        lines.push('\n### Key findings'); review.key_findings.forEach((k) => lines.push(`- ${k}`));
      }
      if (review.missing_evidence?.length) {
        lines.push('\n### Missing evidence'); review.missing_evidence.forEach((k) => lines.push(`- ${k}`));
      }
      lines.push('\n### Next steps (FA/EN/UK)');
      lines.push(`- FA: ${(review.next_steps_fa || []).join('; ')}`);
      lines.push(`- EN: ${(review.next_steps_en || []).join('; ')}`);
      lines.push(`- UK: ${(review.next_steps_uk || []).join('; ')}`);
      lines.push('\n> ' + (lang === 'fa' ? review.disclaimer_fa : lang === 'uk' ? review.disclaimer_uk : review.disclaimer_en));
    }
    downloadBlob(`form-${moduleKey}-${Date.now()}.md`, lines.join('\n'));
  }

  function hardReset() {
    if (!confirm('Reset all answers?')) return;
    setAnswers({});
    setFiles({});
    setProofs({});
    setStars({});
    setBooks({});
    setReview(null);
    setError(null);
  }

  const rtl = lang === 'fa';

  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto', padding: 16, maxWidth: 980, margin: '0 auto', direction: rtl ? 'rtl' as any : 'ltr' as any }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>📋 Form Helper</h1>
          <span style={{ fontSize: 12, color: '#6b7280' }}>v1</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="fa">FA</option>
            <option value="en">EN</option>
            <option value="uk">UK</option>
          </select>
          <select value={moduleKey} onChange={(e) => setModuleKey(e.target.value)}>
            {Object.keys(formContent).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </header>

      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          {lang === 'fa' ? mod.title_fa : lang === 'uk' ? mod.title_uk : mod.title_en}
        </div>
        <div style={{ color: '#374151' }}>
          {lang === 'fa' ? mod.intro_fa : lang === 'uk' ? mod.intro_uk : mod.intro_en}
        </div>
      </div>

      <main>
        {(mod.questions || []).map((q) => renderQuestion(q))}
      </main>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        <button onClick={onBuildReview} disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? (lang === 'fa' ? 'در حال ساخت بررسی…' : lang === 'uk' ? 'Створення огляду…' : 'Building review…')
                   : (lang === 'fa' ? 'ساخت بررسی هوشمند 🤖' : lang === 'uk' ? 'Створити AI-огляд 🤖' : 'Build AI Review 🤖')}
        </button>
        <button onClick={exportJSON} style={{ padding: '8px 12px' }}>Export JSON</button>
        <button onClick={exportMarkdown} style={{ padding: '8px 12px' }}>Export Markdown</button>
        <button onClick={startCheckout} style={{ padding: '8px 12px' }}>Pay (Stripe)</button>
        <button onClick={hardReset} style={{ padding: '8px 12px' }}>{lang === 'fa' ? 'ریست' : 'Reset'}</button>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: 10, borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      )}

      {review && (
        <section style={{ marginTop: 20, borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>{lang === 'fa' ? 'نتیجه بررسی' : lang === 'uk' ? 'Результат перевірки' : 'Review Result'}</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>⭐ Overall: {review.overall_stars}</div>
            <div><strong>Scores:</strong> {Object.entries(review.scores).map(([k,v]) => `${k}:${v}`).join(' | ')}</div>
            <div><strong>Summary:</strong> {review.translation_summary}</div>
            {review.key_findings?.length > 0 && (
              <div>
                <strong>Key findings:</strong>
                <ul>{review.key_findings.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </div>
            )}
            {review.missing_evidence?.length > 0 && (
              <div>
                <strong>Missing evidence:</strong>
                <ul>{review.missing_evidence.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </div>
            )}
            {review.per_question_scores && (
              <div style={{ fontSize: 13, color: '#374151' }}>
                <strong>Per-question:</strong>&nbsp;
                {Object.entries(review.per_question_scores).map(([k,v]) => <span key={k} style={{ marginRight: 8 }}>{k}:{v}</span>)}
              </div>
            )}
            <details>
              <summary>Improvements (raw)</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(review.improvements, null, 2)}</pre>
            </details>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              {lang === 'fa' ? review.disclaimer_fa : lang === 'uk' ? review.disclaimer_uk : review.disclaimer_en}
            </div>
          </div>
        </section>
      )}

      <footer style={{ marginTop: 28, fontSize: 12, color: '#6b7280' }}>
        {lang === 'fa'
          ? 'توجه: این ابزار جایگزین مشاوره حقوقی/حرفه‌ای نیست.'
          : lang === 'uk'
          ? 'Увага: цей інструмент не є заміною професійної консультації.'
          : 'Note: This tool is not a substitute for professional advice.'}
      </footer>
    </div>
  );
};

export default App;
