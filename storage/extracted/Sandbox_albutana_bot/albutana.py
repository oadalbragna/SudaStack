import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TOKEN = "8301998893:AAEj7q00HvvwkRI4t1VKHmHBnfMRXInso4M"

subscribers = set()  # المشتركون


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """عند /start يبدأ الرد التلقائي كل 20 ثانية"""
    chat_id = update.effective_chat.id
    subscribers.add(chat_id)
    await update.message.reply_text("✅ تم التفعيل، ستصلك رسالة كل 20 ثانية")


async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """عند /stop يتوقف الرد"""
    chat_id = update.effective_chat.id
    subscribers.discard(chat_id)
    await update.message.reply_text("🛑 تم الإيقاف")


async def auto_send(context: ContextTypes.DEFAULT_TYPE):
    """يرسل رسالة كل 20 ثانية للمشتركين"""
    for chat_id in list(subscribers):
        try:
            await context.bot.send_message(chat_id, "⏰ رسالة تلقائية كل 20 ثانية")
        except:
            subscribers.discard(chat_id)


async def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("stop", stop))
    app.job_queue.run_repeating(auto_send, interval=20, first=1)

    print("✅ البوت يعمل عبر شبكة SudaStack (sudastack.iqra4you.com)...")
    try:
        await app.bot.delete_webhook(drop_pending_updates=True)
    except Exception:
        pass

    try:
        await app.initialize()
        await app.start()
        await app.updater.start_polling(drop_pending_updates=True)
        while True:
            await asyncio.sleep(1)
    except Exception as e:
        print(f"⚠️ خطأ في الاستماع: {e}")
        if "Conflict" in str(e) or "terminated by other getUpdates" in str(e):
            print("🔄 جاري حل التعارض وإعادة المحاولة...")
            try:
                await app.bot.delete_webhook(drop_pending_updates=True)
                await app.updater.start_polling(drop_pending_updates=True)
                while True:
                    await asyncio.sleep(1)
            except Exception as e2:
                print(f"❌ فشل تجاوز التعارض: {e2}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("🛑 توقف البوت.")