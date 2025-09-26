// indexes.ts
// Minimal starter so the build won't fail if your dataset isn't wired yet.
export const formContent: any = {
  pip: {
    moduleId: 'pip',
    title_fa: 'فرم PIP (آزمایشی)',
    title_en: 'PIP Form (Starter)',
    title_uk: 'Форма PIP (Старт)',
    intro_fa: 'این یک محتوای آزمایشی است. بعداً محتوای کامل را جایگزین کنید.',
    intro_en: 'This is starter content. Replace with your full dataset later.',
    intro_uk: 'Це стартовий вміст. Згодом замініть на повний набір.',
    questions: [
      {
        id: 'preparing_food',
        type: 'long-text',
        question_fa: '۱. آماده کردن غذا',
        question_en: '1. Preparing food',
        question_uk: '1. Приготування їжі',
        description_fa: 'مشکلات هنگام پوست کندن/خرد کردن، استفاده از اجاق/مایکروویو و ایمنی را توضیح دهید.',
        description_en: 'Describe difficulties with peeling/chopping, using cooker/microwave, and safety.',
        description_uk: 'Опишіть труднощі з чищенням/нарізанням, користуванням плитою/мікрохвильовкою та безпекою.',
        allowProof: true,
        starEnabled: true,
        bookEnabled: true
      }
    ]
  }
};
export default formContent;
