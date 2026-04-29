# ڕێنمایی

تطبيق React مع API خلفي صغير لإخفاء مفتاح Gemini عن المتصفح.

## التشغيل المحلي

1. انسخ `.env.example` إلى `.env.local`.
2. ضع مفتاح Gemini:

```env
GEMINI_API_KEY=your_key_here
```

3. ثبّت الحزم وشغل المشروع:

```bash
npm install
npm run dev
```

للتجربة المحلية مع دوال `/api` استخدم:

```bash
npx vercel dev
```

## النشر المجاني على Vercel

1. ارفع المشروع إلى GitHub.
2. افتح Vercel وأنشئ مشروعًا جديدًا من المستودع.
3. في إعدادات المشروع أضف Environment Variable باسم:

```txt
GEMINI_API_KEY
```

4. ضع قيمة مفتاح Gemini، ثم اضغط Deploy.

بهذه الطريقة لا يظهر المفتاح داخل كود الواجهة ولا يصل إلى المستخدمين.
