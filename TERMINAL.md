# تشغيل الطرفية وPython عبر بيئة Cloudflare الأصلية (Cloudflare-Native Runtime)

## المعمارية المعتمدة: Cloudflare Only

تعتمد المنصة معمارية سحابية موحدة ومستمرة (Stateful) تعتمد حصرياً على بيئة **Cloudflare** (Cloudflare Pages + Workers + Durable Objects + Containers):

1. **كائن دائم لكل مشروع (Durable Object - ProjectRuntime):**
   - يدير حالة المشروع وعملياته بشكل أحادي الخيط (Single-Threaded)، مما يمنع تكرار التنفيذ نهائياً (Idempotency).
   - يحتوي على مخزن SQLite مدمج لحفظ الملفات وسجلات الطرفية والأحداث.
   - يدعم اتصال WebSocket دائم مع وضع الإسبات (WebSocket Hibernation) لتوفير الموارد ومزامنة الحالة فورياً (Reactive State Sync).

2. **الاستماع المستمر لتيليجرام (Always-On Polling via Alarm):**
   - بدلاً من الـ `setInterval` في المتصفح الذي يتوقف عند إغلاق التبويب، تستخدم البيئة تقنية `setAlarm()` الخاصة بـ Durable Object.
   - يستمر البوت في استقبال التحديثات والرسائل على مدار الساعة في السحابة حتى بعد إغلاق المتصفح تماماً.

3. **مفتاح الإلغاء الفوري (Kill Switch / Immediate Abort):**
   - كل عملية تنفيذ تحمل معرّف تشغيل فريد `runId` ورمز إلغاء `abortToken`.
   - النقر على زر "Stop" يرسل إشارة إلغاء فورية عبر الـ WebSocket / API، وتتوقف العملية خلال أقل من ثانيتين مع إرسال تأكيد إلغاء فوري.

4. **منع التكرار (Idempotency):**
   - كل أمر طرفية يحمل `commandId` (UUID) فريداً، ويتم رفض أي أمر مكرر خلال 60 ثانية.
