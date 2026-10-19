import json
import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = "8301998893:AAHbH0hEUvCVeP8vXzIwWTzh_kji5BB7BsU"
SUBSCRIBERS_FILE = os.path.join(os.path.dirname(__file__), "subscribers.json")

# Configure logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)


def load_subscribers() -> set:
    """تحميل قائمة المشتركين من ملف دائم لضمان عدم ضياعهم عند إعادة تشغيل البوت"""
    try:
        if os.path.exists(SUBSCRIBERS_FILE):
            with open(SUBSCRIBERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return set(data)
    except Exception as e:
        logger.error(f"Error loading subscribers: {e}")
    return set()


def save_subscribers(subs: set):
    """حفظ المشتركين بشكل دائم في ملف subscribers.json"""
    try:
        with open(SUBSCRIBERS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(subs), f)
    except Exception as e:
        logger.error(f"Error saving subscribers: {e}")


subscribers = load_subscribers()
print(f"👥 [المشتركون الحاليون]: {len(subscribers)} مشترك مسجل.")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """عند إرسال /start يتم إضافة المستخدم للمشتركين والرد عليه فوراً"""
    chat_id = update.effective_chat.id
    first_name = update.effective_user.first_name if update.effective_user else "صديقنا"
    
    if chat_id not in subscribers:
        subscribers.add(chat_id)
        save_subscribers(subscribers)
        print(f"✅ [مشترك جديد]: {first_name} (ID: {chat_id}) تم تفعيله.")
    else:
        print(f"ℹ️ [مشترك مسجل مسبقاً]: {first_name} (ID: {chat_id})")

    await update.message.reply_text(
        f"مرحباً بك {first_name}! 👋\n"
        "✅ تم تفعيل اشتراكك بنجاح.\n"
        "⏰ ستصلك رسالة تذكير تلقائية كل 20 ثانية.\n"
        "للإلغاء في أي وقت، أرسل: /stop"
    )


async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """عند إرسال /stop يتوقف الرد ويتم إزالة المستخدم من القائمة"""
    chat_id = update.effective_chat.id
    if chat_id in subscribers:
        subscribers.discard(chat_id)
        save_subscribers(subscribers)
        print(f"🛑 [إلغاء اشتراك]: تم إيقاف الاشتراك للمستخدم ID: {chat_id}")
        await update.message.reply_text("🛑 تم إيقاف الرسائل التلقائية بنجاح.")
    else:
        await update.message.reply_text("ℹ️ أنت غير مشترك حالياً.")


async def auto_send(context: ContextTypes.DEFAULT_TYPE):
    """يرسل رسالة تلقائية كل 20 ثانية للمشتركين المسجلين"""
    current_subs = list(subscribers)
    if not current_subs:
        # تنبيه في شاشة السجلات في حال لم يشترك أحد بعد
        return

    for chat_id in current_subs:
        try:
            await context.bot.send_message(
                chat_id=chat_id,
                text="⏰ رسالة تلقائية كل 20 ثانية من البوت 🚀"
            )
            print(f"📤 [تم الإرسال]: رسالة تلقائية إلى {chat_id}")
        except Exception as e:
            print(f"⚠️ [فشل الإرسال]: إلى {chat_id} -> {e}")
            # إذا قام المستخدم بحظر البوت أو حذف الحساب
            subscribers.discard(chat_id)
            save_subscribers(subscribers)


def main():
    print("🚀 جاري بناء وتشغيل البوت...")
    app = Application.builder().token(TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("stop", stop))

    # إعداد جدول المهام: interval=20 ثانية، أول إرسال بعد 2 ثوانٍ
    if app.job_queue:
        app.job_queue.run_repeating(auto_send, interval=20, first=2)
        print("⏱️ [JobQueue]: تم تفعيل مؤقت الإرسال التلقائي كل 20 ثانية.")
    else:
        print("❌ [خطأ]: لم يتم تفعيل JobQueue.")

    print("✅ البوت متصل الآن بخوادم تيليجرام ويستمع للرسائل بنجاح...")
    # drop_pending_updates=True يمنع أخطاء Conflict ويفرغ التراكمات القديمة
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()