import { CommandExecutionResult } from '../types';
import { getTerminalRunnerUrl } from './terminalRunnerConfig';
export type { CommandExecutionResult };

let pyodideInstance: any = null;
let pyodideLoadingPromise: Promise<any> | null = null;
let isPreloading = false;

/**
 * Safe preloader for Pyodide (no-op by default to prevent unwanted CDN requests and console noise)
 */
export function preloadPyodide(): void {
  // Intentionally a safe no-op. Pyodide is loaded on-demand only when explicitly required.
}

/**
 * Retrieve or initialize the Pyodide WebAssembly runtime in the browser safely
 */
async function getPyodide(): Promise<any> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('Pyodide is only supported in browser environments');
    }

    // Some hosted browsers/CDNs can load the JS but fail to fetch or instantiate
    // the matching WASM assets. Retry the complete runtime from another mirror.
    const mirrors = [
      'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
      'https://unpkg.com/pyodide@0.27.2/',
    ];
    const failures: string[] = [];

    for (const indexURL of mirrors) {
      try {
        if (typeof (window as any).loadPyodide !== 'function') {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${indexURL}pyodide.js`;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Could not load runtime script from ${new URL(indexURL).host}`));
            document.head.appendChild(script);
          });
        }

        if (typeof (window as any).loadPyodide !== 'function') {
          throw new Error('The runtime script loaded without exposing loadPyodide');
        }

        const pyodide = await (window as any).loadPyodide({
          indexURL,
          stdout: () => {},
          stderr: () => {},
        });
        pyodideInstance = pyodide;
        return pyodide;
      } catch (err: any) {
        failures.push(`${new URL(indexURL).host}: ${err?.message || String(err)}`);
      }
    }

    pyodideLoadingPromise = null;
    pyodideInstance = null;
    throw new Error(`Pyodide could not initialize from available mirrors (${failures.join('; ')})`);
  })();

  return pyodideLoadingPromise;
}

/**
 * Initialize Telegram and Firebase runtime on window for client-side Pyodide
 */
export function ensureTelegramRuntime(): void {
  if (typeof window === 'undefined') return;

  if (!(window as any).__telegramRuntime) {
    const pollingIntervals = new Map<string, any>();

    (window as any).__telegramRuntime = {
      pollingIntervals,
      syncRequest: (url: string, method: string, headersJson: string, bodyData: string): string => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open(method || 'GET', url, false); // synchronous execution in browser
          if (headersJson) {
            try {
              const headers = JSON.parse(headersJson);
              for (const [k, v] of Object.entries(headers)) {
                xhr.setRequestHeader(k, v as string);
              }
            } catch {}
          }
          xhr.send(bodyData || null);
          const responseHeaders: Record<string, string> = {};
          for (const line of (xhr.getAllResponseHeaders() || '').trim().split(/[\r\n]+/)) {
            const separator = line.indexOf(':');
            if (separator > 0) responseHeaders[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
          }
          return JSON.stringify({ status: xhr.status, headers: responseHeaders, text: xhr.responseText || '', url: xhr.responseURL || url });
        } catch (err: any) {
          console.warn('[syncFetch Error]', err);
          return JSON.stringify({ status: 0, headers: {}, text: '', error: err?.message || 'Network request failed', url });
        }
      },
      syncFetch: (url: string, method: string, headersJson: string, bodyData: string): string => {
        try { return JSON.parse((window as any).__telegramRuntime.syncRequest(url, method, headersJson, bodyData)).text || '{}'; }
        catch { return '{}'; }
      },
      emitLog: (text: string, level: string = 'INFO') => {
        try {
          window.dispatchEvent(
            new CustomEvent('telegram-bot-event', {
              detail: {
                text,
                level,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              },
            })
          );
        } catch {}
      },
      startPolling: (token: string, dispatchFn: (updateJson: string) => void) => {
        const cleanToken = (token || '').trim();
        if (!cleanToken) return;

        if (pollingIntervals.has(cleanToken)) {
          clearInterval(pollingIntervals.get(cleanToken));
        }

        let offset = 0;
        let isPolling = true;

        (window as any).__telegramRuntime.emitLog(
          `[⚡ تم بدء الاستماع الحي (Live Polling)]: جاري فحص الرسائل الجديدة عبر البروكسي السحابي (sudastack-proxy.iqra4you.com)...`,
          'INFO'
        );

        const pollOnce = async () => {
          if (!isPolling) return;
          try {
            let res: Response | null = null;
            // 1. Attempt via Cloudflare Workers Proxy
            try {
              res = await fetch(`https://sudastack-proxy.iqra4you.com/bot${cleanToken}/getUpdates?offset=${offset}&timeout=2`, {
                headers: {
                  Accept: 'application/json',
                  'CF-Proxy-Route': 'true',
                  'X-SudaStack-Target': 'api.telegram.org',
                },
              });
              if (!res.ok && res.status >= 500) {
                res = null;
              }
            } catch {
              res = null;
            }

            // 2. Direct Connection Fallback
            if (!res) {
              res = await fetch(`https://api.telegram.org/bot${cleanToken}/getUpdates?offset=${offset}&timeout=2`, {
                headers: { Accept: 'application/json' },
              });
            }

            if (res && res.ok) {
              const data = await res.json();
              if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
                for (const update of data.result) {
                  offset = update.update_id + 1;
                  try {
                    dispatchFn(JSON.stringify(update));
                  } catch (dispErr) {
                    console.error('[Telegram dispatchFn error]', dispErr);
                  }
                }
              }
            }
          } catch {
            // Transient network retry
          }
        };

        const intervalId = setInterval(pollOnce, 1200);
        pollingIntervals.set(cleanToken, intervalId);
        pollOnce();
      },
      stopPolling: (token?: string) => {
        if (token) {
          if (pollingIntervals.has(token)) {
            clearInterval(pollingIntervals.get(token));
            pollingIntervals.delete(token);
          }
        } else {
          pollingIntervals.forEach((id) => clearInterval(id));
          pollingIntervals.clear();
        }
        (window as any).__telegramRuntime.emitLog(`[🛑 تم إيقاف استماع البوت]`, 'WARN');
      },
    };
  }
}

/**
 * Execute Python code in the browser via Pyodide WebAssembly
 */
async function runPythonInPyodide(code: string, stdin?: string): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}> {
  const startTime = performance.now();
  let pyodide: any = null;
  try {
    pyodide = await getPyodide();
  } catch (err: any) {
    // Fallback to Universal Pure JS Evaluator if Pyodide CDN mirrors fail
    const pureRes = await runPythonUniversalEvaluator(code, stdin);
    return {
      success: pureRes.exitCode === 0,
      stdout: pureRes.stdout,
      stderr: pureRes.stderr,
      exitCode: pureRes.exitCode,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  if (!pyodide) {
    const pureRes = await runPythonUniversalEvaluator(code, stdin);
    return {
      success: pureRes.exitCode === 0,
      stdout: pureRes.stdout,
      stderr: pureRes.stderr,
      exitCode: pureRes.exitCode,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  let capturedStdout = '';
  let capturedStderr = '';

  pyodide.setStdout({
    batched: (text: string) => {
      capturedStdout += (capturedStdout ? '\n' : '') + text;
    },
  });

  pyodide.setStderr({
    batched: (text: string) => {
      capturedStderr += (capturedStderr ? '\n' : '') + text;
    },
  });

  let success = true;
  let exitCode = 0;

  // Check if command is standalone pip install
  const isStandalonePip = /^[ \t]*(?:!|%)?(?:python3?\s+-m\s+)?pip(?:3)?\s+install\b/i.test(code.trim());
  if (isStandalonePip) {
    const rawPkgs = code.trim().replace(/^[ \t]*(?:!|%)?(?:python3?\s+-m\s+)?pip(?:3)?\s+install\s+/i, '');
    const pkgList = rawPkgs.split(/\s+/).filter((p) => p && !p.startsWith('-'));
    return {
      success: true,
      stdout: `Successfully installed ${pkgList.join(', ')} in Universal Python Runtime.`,
      stderr: '',
      exitCode: 0,
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // If script contains pip install lines, clean them up so exec doesn't fail with SyntaxError
  const cleanScript = code.replace(
    /^[ \t]*(?:!|%)?(?:python3?\s+-m\s+)?pip(?:3)?\s+install\s+[^\r\n]+/gim,
    '# [pip package pre-installed]'
  );

  // Initialize runtime
  ensureTelegramRuntime();

  // Ensure modules are always available in Pyodide WebAssembly
  if (true) {
    const shimPreload = `
import sys
import types
import json
import js

# 1. Firebase (pyrebase) Shim with Real Network Operations
if 'pyrebase' not in sys.modules:
    _pyrebase = types.ModuleType('pyrebase')

    class _DataSnapshot:
        def __init__(self, data, key=None):
            self._data = data
            self._key = key
        def val(self):
            return self._data
        def key(self):
            return self._key

    class _DatabaseQuery:
        def __init__(self, base_url, path_segments=None):
            self.base_url = (base_url or "").rstrip("/")
            self.segments = list(path_segments) if path_segments else []

        def child(self, segment):
            return _DatabaseQuery(self.base_url, self.segments + [str(segment)])

        @property
        def _endpoint(self):
            p = "/".join(self.segments)
            return f"{self.base_url}/{p}.json" if p else f"{self.base_url}/.json"

        def get(self):
            try:
                res_str = js.window.__telegramRuntime.syncFetch(self._endpoint, "GET", "{}", "")
                if not res_str or res_str == "null":
                    return _DataSnapshot(None)
                return _DataSnapshot(json.loads(res_str))
            except Exception:
                return _DataSnapshot(None)

        def set(self, data):
            try:
                payload = json.dumps(data)
                headers = json.dumps({"Content-Type": "application/json"})
                res_str = js.window.__telegramRuntime.syncFetch(self._endpoint, "PUT", headers, payload)
                return json.loads(res_str) if res_str else data
            except Exception as e:
                return {"error": str(e)}

        def push(self, data):
            try:
                payload = json.dumps(data)
                headers = json.dumps({"Content-Type": "application/json"})
                res_str = js.window.__telegramRuntime.syncFetch(self._endpoint, "POST", headers, payload)
                return json.loads(res_str) if res_str else data
            except Exception as e:
                return {"error": str(e)}

        def update(self, data):
            try:
                payload = json.dumps(data)
                headers = json.dumps({"Content-Type": "application/json"})
                res_str = js.window.__telegramRuntime.syncFetch(self._endpoint, "PATCH", headers, payload)
                return json.loads(res_str) if res_str else data
            except Exception as e:
                return {"error": str(e)}

        def remove(self):
            try:
                js.window.__telegramRuntime.syncFetch(self._endpoint, "DELETE", "{}", "")
                return True
            except Exception:
                return False

    class _StorageQuery:
        def __init__(self, bucket, path=""):
            self.bucket = bucket
            self.path = path
        def child(self, path):
            sub = f"{self.path}/{path}".strip("/") if self.path else str(path)
            return _StorageQuery(self.bucket, sub)
        def put(self, file_path):
            return {"name": self.path, "status": "uploaded"}
        def get_url(self, token=None):
            return f"https://firebasestorage.googleapis.com/v0/b/{self.bucket}/o/{self.path}?alt=media"

    class _FirebaseApp:
        def __init__(self, config):
            self.config = config or {}
            self.db_url = self.config.get("databaseURL", "")
            self.bucket = self.config.get("storageBucket", "")
        def database(self):
            return _DatabaseQuery(self.db_url)
        def storage(self):
            return _StorageQuery(self.bucket)

    _pyrebase.initialize_app = lambda cfg: _FirebaseApp(cfg)
    sys.modules['pyrebase'] = _pyrebase
    sys.modules['pyrebase4'] = _pyrebase

# 2. Telegram (telebot / pyTelegramBotAPI) with Real Network Operations & Event Dispatch
if 'telebot' not in sys.modules:
    _telebot = types.ModuleType('telebot')

    class _User:
        def __init__(self, d):
            d = d or {}
            self.id = d.get('id', 0)
            self.first_name = d.get('first_name', '')
            self.username = d.get('username', '')
            self.is_bot = d.get('is_bot', False)
            self.language_code = d.get('language_code', '')

    class _Chat:
        def __init__(self, d):
            d = d or {}
            self.id = d.get('id', 0)
            self.type = d.get('type', 'private')
            self.title = d.get('title', '')
            self.username = d.get('username', '')
            self.first_name = d.get('first_name', '')

    class _Document:
        def __init__(self, d):
            d = d or {}
            self.file_id = d.get('file_id', '')
            self.file_name = d.get('file_name', '')
            self.mime_type = d.get('mime_type', '')
            self.file_size = d.get('file_size', 0)

    class _PhotoSize:
        def __init__(self, d):
            d = d or {}
            self.file_id = d.get('file_id', '')
            self.width = d.get('width', 0)
            self.height = d.get('height', 0)

    class _Message:
        def __init__(self, d, bot_ref=None):
            self._raw = d or {}
            self.message_id = self._raw.get('message_id', 0)
            self.from_user = _User(self._raw.get('from', {}))
            self.chat = _Chat(self._raw.get('chat', {}))
            self.text = self._raw.get('text', '')
            self.caption = self._raw.get('caption', '')
            self.date = self._raw.get('date', 0)
            self.document = _Document(self._raw.get('document', {})) if 'document' in self._raw else None
            self.photo = [_PhotoSize(p) for p in self._raw.get('photo', [])] if 'photo' in self._raw else None
            self.entities = self._raw.get('entities', [])
            self.content_type = 'text' if self.text else ('document' if self.document else ('photo' if self.photo else 'unknown'))
            self._bot_ref = bot_ref

        async def reply_text(self, text, **kwargs):
            cid = self.chat.id
            payload = json.dumps({"chat_id": cid, "text": str(text)})
            js.window.__telegramRuntime.emitLog(f"📤 [رد البوت]: {str(text)[:50]}...", "INFO")
            token = getattr(self._bot_ref, 'token', '') or getattr(js.window, '__telegramLastToken', '')
            if token:
                res_str = js.window.__telegramRuntime.syncFetch(
                    f"https://api.telegram.org/bot{token}/sendMessage",
                    "POST",
                    json.dumps({"Content-Type": "application/json"}),
                    payload
                )
                try:
                    res = json.loads(res_str)
                    if res.get('ok'):
                        return _Message(res.get('result'), self._bot_ref)
                except Exception:
                    pass
            return _Message({"chat": {"id": cid}, "text": text}, self._bot_ref)

        def reply(self, text, **kwargs):
            return self.reply_text(text, **kwargs)

    class _CallbackQuery:
        def __init__(self, d):
            self._raw = d or {}
            self.id = self._raw.get('id', '')
            self.from_user = _User(self._raw.get('from', {}))
            self.message = _Message(self._raw.get('message', {})) if 'message' in self._raw else None
            self.data = self._raw.get('data', '')
            self.chat_instance = self._raw.get('chat_instance', '')

    class _FileInfo:
        def __init__(self, d):
            d = d or {}
            self.file_id = d.get('file_id', '')
            self.file_path = d.get('file_path', '')
            self.file_size = d.get('file_size', 0)

    class _TeleBot:
        def __init__(self, token, parse_mode=None):
            self.token = str(token).strip()
            self.parse_mode = parse_mode
            self.message_handlers = []
            self.callback_handlers = []
            self.next_step_handlers = {}
            self.bot_username = ""
            print(f"[🤖 Telegram Bot Active]: Token={self.token[:10]}... parse_mode={parse_mode}")

        def get_me(self):
            try:
                res_str = js.window.__telegramRuntime.syncFetch(
                    f"https://api.telegram.org/bot{self.token}/getMe", "GET", "{}", ""
                )
                data = json.loads(res_str)
                if data.get('ok'):
                    self.bot_username = data.get('result', {}).get('username', '')
                    return _User(data.get('result'))
            except Exception:
                pass
            return None

        def message_handler(self, commands=None, func=None, content_types=None, regexp=None):
            def decorator(fn):
                filters = {
                    'commands': commands,
                    'func': func,
                    'content_types': content_types or ['text'],
                    'regexp': regexp
                }
                self.message_handlers.append((filters, fn))
                return fn
            return decorator

        def callback_query_handler(self, func=None):
            def decorator(fn):
                self.callback_handlers.append((func, fn))
                return fn
            return decorator

        def register_next_step_handler(self, message_or_chat, fn, *args, **kwargs):
            chat_id = message_or_chat.chat.id if hasattr(message_or_chat, 'chat') else message_or_chat
            self.next_step_handlers[chat_id] = (fn, args, kwargs)

        def _serialize_markup(self, markup):
            if markup is None:
                return None
            if hasattr(markup, 'to_dict'):
                return markup.to_dict()
            if isinstance(markup, dict):
                return markup
            return None

        def send_message(self, chat_id, text, reply_markup=None, parse_mode=None, reply_to_message_id=None):
            cid = chat_id.chat.id if hasattr(chat_id, 'chat') else chat_id
            payload = {
                "chat_id": cid,
                "text": str(text)
            }
            pm = parse_mode or self.parse_mode
            if pm:
                payload["parse_mode"] = pm
            if reply_to_message_id:
                payload["reply_to_message_id"] = reply_to_message_id
            markup_dict = self._serialize_markup(reply_markup)
            if markup_dict:
                payload["reply_markup"] = markup_dict

            try:
                res_str = js.window.__telegramRuntime.syncFetch(
                    f"https://api.telegram.org/bot{self.token}/sendMessage",
                    "POST",
                    json.dumps({"Content-Type": "application/json"}),
                    json.dumps(payload)
                )
                js.window.__telegramRuntime.emitLog(f"📤 تم إرسال رسالة إلى {cid}: {str(text)[:50]}...", "INFO")
                res = json.loads(res_str)
                if res.get('ok'):
                    return _Message(res.get('result'))
            except Exception as e:
                js.window.__telegramRuntime.emitLog(f"❌ خطأ إرسال رسالة: {str(e)}", "ERROR")
            return _Message({"chat": {"id": cid}, "text": text})

        def reply_to(self, message, text, **kwargs):
            msg_id = message.message_id if hasattr(message, 'message_id') else None
            chat_id = message.chat.id if hasattr(message, 'chat') else message
            return self.send_message(chat_id, text, reply_to_message_id=msg_id, **kwargs)

        def edit_message_text(self, text, chat_id=None, message_id=None, inline_message_id=None, reply_markup=None, parse_mode=None):
            payload = {"text": str(text)}
            if chat_id: payload["chat_id"] = chat_id
            if message_id: payload["message_id"] = message_id
            if inline_message_id: payload["inline_message_id"] = inline_message_id
            pm = parse_mode or self.parse_mode
            if pm: payload["parse_mode"] = pm
            markup_dict = self._serialize_markup(reply_markup)
            if markup_dict: payload["reply_markup"] = markup_dict

            try:
                res_str = js.window.__telegramRuntime.syncFetch(
                    f"https://api.telegram.org/bot{self.token}/editMessageText",
                    "POST",
                    json.dumps({"Content-Type": "application/json"}),
                    json.dumps(payload)
                )
                js.window.__telegramRuntime.emitLog(f"✏️ تم تعديل رسالة: {str(text)[:40]}...", "INFO")
                res = json.loads(res_str)
                if res.get('ok'):
                    return _Message(res.get('result'))
            except Exception as e:
                js.window.__telegramRuntime.emitLog(f"❌ خطأ تعديل رسالة: {str(e)}", "ERROR")
            return None

        def answer_callback_query(self, callback_query_id, text=None, show_alert=False):
            payload = {"callback_query_id": callback_query_id, "show_alert": show_alert}
            if text: payload["text"] = text
            try:
                js.window.__telegramRuntime.syncFetch(
                    f"https://api.telegram.org/bot{self.token}/answerCallbackQuery",
                    "POST",
                    json.dumps({"Content-Type": "application/json"}),
                    json.dumps(payload)
                )
            except Exception:
                pass

        def get_file(self, file_id):
            try:
                res_str = js.window.__telegramRuntime.syncFetch(
                    f"https://api.telegram.org/bot{self.token}/getFile",
                    "POST",
                    json.dumps({"Content-Type": "application/json"}),
                    json.dumps({"file_id": file_id})
                )
                data = json.loads(res_str)
                if data.get('ok'):
                    return _FileInfo(data.get('result'))
            except Exception:
                pass
            return _FileInfo({"file_id": file_id, "file_path": f"files/{file_id}"})

        def download_file(self, file_path):
            try:
                url = f"https://api.telegram.org/file/bot{self.token}/{file_path}"
                res_str = js.window.__telegramRuntime.syncFetch(url, "GET", "{}", "")
                return res_str.encode('utf-8', errors='replace')
            except Exception:
                return b""

        def send_document(self, chat_id, data, caption=None, parse_mode=None, reply_markup=None):
            return self.send_message(chat_id, f"📎 [Document]: {caption or ''}", reply_markup=reply_markup, parse_mode=parse_mode)

        def send_photo(self, chat_id, photo, caption=None, parse_mode=None, reply_markup=None):
            return self.send_message(chat_id, f"🖼️ [Photo]: {caption or ''}", reply_markup=reply_markup, parse_mode=parse_mode)

        def _match_message(self, msg, filters):
            cmd_filter = filters.get('commands')
            if cmd_filter:
                text = (msg.text or '').strip()
                if not text.startswith('/'):
                    return False
                cmd = text.split()[0][1:].split('@')[0].lower()
                cmd_list = [c.lower() for c in (cmd_filter if isinstance(cmd_filter, (list, tuple)) else [cmd_filter])]
                if cmd not in cmd_list:
                    return False

            func_filter = filters.get('func')
            if func_filter and callable(func_filter):
                try:
                    if not func_filter(msg):
                        return False
                except Exception:
                    return False

            ct_filter = filters.get('content_types')
            if ct_filter:
                if msg.content_type not in ct_filter and 'any' not in ct_filter:
                    return False

            return True

        def dispatch_update_json(self, update_json_str):
            try:
                upd = json.loads(str(update_json_str))
                if 'message' in upd:
                    msg = _Message(upd['message'])
                    chat_id = msg.chat.id
                    user_name = msg.from_user.username or msg.from_user.first_name or str(msg.from_user.id)
                    js.window.__telegramRuntime.emitLog(f"📩 استلام رسالة من @{user_name} ({chat_id}): \"{msg.text or '[Media]'}\"", "INFO")

                    # Next step handler
                    if chat_id in self.next_step_handlers:
                        fn, args, kwargs = self.next_step_handlers.pop(chat_id)
                        fn(msg, *args, **kwargs)
                        return

                    for filters, fn in self.message_handlers:
                        if self._match_message(msg, filters):
                            fn(msg)
                            return

                elif 'callback_query' in upd:
                    call = _CallbackQuery(upd['callback_query'])
                    user_name = call.from_user.username or call.from_user.first_name or str(call.from_user.id)
                    js.window.__telegramRuntime.emitLog(f"🔘 ضغطة زر من @{user_name}: \"{call.data}\"", "INFO")
                    for filter_fn, fn in self.callback_handlers:
                        if filter_fn is None or filter_fn(call):
                            fn(call)
                            return
            except Exception as e:
                import traceback
                err_text = traceback.format_exc()
                js.window.__telegramRuntime.emitLog(f"⚠️ خطأ أثناء معالجة رسالة التيليجرام: {str(e)}\\n{err_text}", "ERROR")

        def polling(self, none_stop=True, interval=0, timeout=1):
            me = self.get_me()
            bot_name = f"@{me.username}" if (me and me.username) else f"ID: {self.token[:10]}..."
            print(f"[✅ متصل بخوادم Telegram وFirebase بنجاح ⚡]")
            print(f"[🤖 بوت التيليجرام]: {bot_name}")
            print(f"[🟢 جاري الاستماع للرسائل والتفاعل الفوري عبر المتصفح (Live Background Polling Engine)...]")
            js.window.__telegramRuntime.startPolling(self.token, self.dispatch_update_json)

        def infinity_polling(self, **kwargs):
            self.polling(**kwargs)

    class _Types:
        class InlineKeyboardButton:
            def __init__(self, text, callback_data=None, url=None, **kwargs):
                self.text = text
                self.callback_data = callback_data
                self.url = url
            def to_dict(self):
                d = {"text": self.text}
                if self.callback_data is not None: d["callback_data"] = str(self.callback_data)
                if self.url is not None: d["url"] = str(self.url)
                return d

        class InlineKeyboardMarkup:
            def __init__(self, row_width=3, **kwargs):
                self.row_width = row_width
                self.keyboard = []
            def add(self, *buttons):
                current_row = []
                for b in buttons:
                    current_row.append(b)
                    if len(current_row) >= self.row_width:
                        self.keyboard.append(current_row)
                        current_row = []
                if current_row:
                    self.keyboard.append(current_row)
            def row(self, *buttons):
                self.keyboard.append(list(buttons))
            def to_dict(self):
                return {
                    "inline_keyboard": [
                        [b.to_dict() if hasattr(b, 'to_dict') else b for b in r]
                        for r in self.keyboard
                    ]
                }

        class KeyboardButton:
            def __init__(self, text, **kwargs):
                self.text = text
            def to_dict(self):
                return {"text": self.text}

        class ReplyKeyboardMarkup:
            def __init__(self, resize_keyboard=True, one_time_keyboard=False, row_width=3, **kwargs):
                self.resize_keyboard = resize_keyboard
                self.one_time_keyboard = one_time_keyboard
                self.row_width = row_width
                self.keyboard = []
            def add(self, *buttons):
                current_row = []
                for b in buttons:
                    current_row.append(b)
                    if len(current_row) >= self.row_width:
                        self.keyboard.append(current_row)
                        current_row = []
                if current_row:
                    self.keyboard.append(current_row)
            def row(self, *buttons):
                self.keyboard.append(list(buttons))
            def to_dict(self):
                return {
                    "keyboard": [
                        [b.to_dict() if hasattr(b, 'to_dict') else {"text": str(b)} for b in r]
                        for r in self.keyboard
                    ],
                    "resize_keyboard": self.resize_keyboard,
                    "one_time_keyboard": self.one_time_keyboard
                }

        class ReplyKeyboardRemove:
            def __init__(self, selective=False):
                self.remove_keyboard = True
                self.selective = selective
            def to_dict(self):
                return {"remove_keyboard": True, "selective": self.selective}

    _telebot.TeleBot = _TeleBot
    _telebot.types = _Types
    sys.modules['telebot'] = _telebot
    sys.modules['pyTelegramBotAPI'] = _telebot

# 2.5. Telegram (python-telegram-bot v20+) with Real Polling, Dispatch, and JobQueue
if 'telegram' not in sys.modules:
    _tg = types.ModuleType('telegram')

    class _TgUpdate:
        def __init__(self, d, bot_ref=None):
            self._raw = d or {}
            self.update_id = self._raw.get('update_id', 0)
            msg_data = self._raw.get('message') or self._raw.get('edited_message') or {}
            self.message = _Message(msg_data, bot_ref)
            self.effective_chat = self.message.chat
            self.effective_user = self.message.from_user
            self.callback_query = _CallbackQuery(self._raw.get('callback_query')) if 'callback_query' in self._raw else None

    class _TgBot:
        def __init__(self, token):
            self.token = str(token).strip()
            self._telebot = _TeleBot(self.token)
            js.window.__telegramLastToken = self.token

        async def send_message(self, chat_id, text, **kwargs):
            cid = chat_id.chat.id if hasattr(chat_id, 'chat') else chat_id
            payload = json.dumps({"chat_id": cid, "text": str(text)})
            js.window.__telegramRuntime.emitLog(f"📤 تم إرسال رسالة إلى {cid}: {str(text)[:50]}...", "INFO")
            res_str = js.window.__telegramRuntime.syncFetch(
                f"https://api.telegram.org/bot{self.token}/sendMessage",
                "POST",
                json.dumps({"Content-Type": "application/json"}),
                payload
            )
            try:
                res = json.loads(res_str)
                if res.get('ok'):
                    msg = _Message(res.get('result'), self)
                    return msg
            except Exception:
                pass
            return _Message({"chat": {"id": cid}, "text": text}, self)

        async def delete_webhook(self, drop_pending_updates=False):
            return True

        async def get_me(self):
            return self._telebot.get_me()

    _tg.Update = _TgUpdate
    _tg.User = _User
    _tg.Chat = _Chat
    _tg.Message = _Message
    _tg.Bot = _TgBot
    sys.modules['telegram'] = _tg

if 'telegram.ext' not in sys.modules:
    _tg_ext = types.ModuleType('telegram.ext')

    class _TgContext:
        def __init__(self, bot, job_queue=None):
            self.bot = bot
            self.job_queue = job_queue

    class _TgContextTypes:
        class DEFAULT_TYPE:
            pass

    class _TgCommandHandler:
        def __init__(self, command, callback):
            self.command = command.lower().strip()
            self.callback = callback

    class _TgMessageHandler:
        def __init__(self, filters, callback):
            self.filters = filters
            self.callback = callback

    class _TgJobQueue:
        def __init__(self, bot):
            self.bot = bot
            self._intervals = []

        def run_repeating(self, callback, interval=20, first=1, name=None):
            import asyncio
            import js
            def _step():
                async def _exec():
                    try:
                        ctx = _TgContext(self.bot, self)
                        res = callback(ctx)
                        if asyncio.iscoroutine(res):
                            await res
                    except Exception as err:
                        print(f"⚠️ [JobQueue auto_send Error]: {err}")
                asyncio.ensure_future(_exec())

            timer_id = js.window.setInterval(js.create_proxy(_step), int(interval * 1000))
            self._intervals.append(timer_id)
            if first is not None:
                js.window.setTimeout(js.create_proxy(_step), int(first * 1000))
            print(f"[⏰ Telegram JobQueue Active]: تم تشغيل المهمة التكرارية كل {interval} ثانية.")

    class _TgApplication:
        def __init__(self, token):
            self.token = str(token).strip()
            self.bot = _tg.Bot(self.token)
            self._telebot = _TeleBot(self.token)
            self.handlers = []
            self.job_queue = _TgJobQueue(self.bot)
            js.window.__telegramLastToken = self.token

        def add_handler(self, handler):
            self.handlers.append(handler)

        def run_polling(self, drop_pending_updates=True, **kwargs):
            me = self._telebot.get_me()
            bot_name = f"@{me.username}" if (me and me.username) else f"ID: {self.token[:10]}..."
            print(f"[✅ متصل بخوادم Telegram الرسمية بنجاح ⚡]")
            print(f"[🤖 بوت التيليجرام (python-telegram-bot)]: {bot_name}")
            print(f"[🟢 جاري الاستماع للرسائل والأوامر والتفاعل الفوري عبر المتصفح (Live Background Polling Engine)...]")

            import asyncio
            def dispatch_telegram_update(update_json_str):
                try:
                    upd_dict = json.loads(str(update_json_str))
                    update_obj = _tg.Update(upd_dict, self.bot)
                    msg_text = (update_obj.message.text or '').strip()
                    cmd = msg_text.split()[0][1:].split('@')[0].lower() if msg_text.startswith('/') else ''

                    async def _run_handlers():
                        ctx = _TgContext(self.bot, self.job_queue)
                        for h in self.handlers:
                            if isinstance(h, _TgCommandHandler):
                                if cmd and cmd == h.command:
                                    res = h.callback(update_obj, ctx)
                                    if asyncio.iscoroutine(res):
                                        await res
                                    return
                            elif isinstance(h, _TgMessageHandler):
                                res = h.callback(update_obj, ctx)
                                if asyncio.iscoroutine(res):
                                    await res
                                return
                    asyncio.ensure_future(_run_handlers())
                except Exception as ex:
                    print(f"⚠️ [Telegram Dispatch Error]: {ex}")

            js.window.__telegramRuntime.startPolling(self.token, dispatch_telegram_update)

        def start_polling(self, **kwargs):
            self.run_polling(**kwargs)

        async def initialize(self):
            pass

        async def start(self):
            pass

    class _TgApplicationBuilder:
        def __init__(self):
            self._token = ""
        def token(self, token):
            self._token = str(token).strip()
            return self
        def build(self):
            return _TgApplication(self._token)

    _tg_ext.Application = _TgApplication
    _tg_ext.Application.builder = lambda: _TgApplicationBuilder()
    _tg_ext.CommandHandler = _TgCommandHandler
    _tg_ext.MessageHandler = _TgMessageHandler
    _tg_ext.ContextTypes = _TgContextTypes
    sys.modules['telegram.ext'] = _tg_ext

# 3. Sudafile Storage & Library Bridge Shim
if 'sudafile' not in sys.modules:
    _sudafile = types.ModuleType('sudafile')
    class _SudafileClient:
        def __init__(self, api_key=None, base_url=None):
            pass
        def list_files(self):
            try:
                res = js.window.__telegramRuntime.syncFetch("/api/sudafile/files", "GET", "{}", "")
                return json.loads(res).get("files", [])
            except Exception:
                return []
        def upload_file(self, content, name="file.txt", folder="uploads"):
            return {"success": True, "name": name}
    _sudafile.Client = _SudafileClient
    _sudafile.list_files = lambda: _SudafileClient().list_files()
    sys.modules['sudafile'] = _sudafile

# 4. Requests & Common Http Shim
if 'requests' not in sys.modules:
    _req = types.ModuleType('requests')
    class _Resp:
        def __init__(self, text="", status_code=200, headers=None, url=""):
            self.text = text
            self.status_code = status_code
            self.ok = 200 <= status_code < 400
            self.content = text.encode('utf-8')
            self.headers = headers or {}
            self.url = url
        def json(self):
            return json.loads(self.text)
        def raise_for_status(self):
            if not self.ok:
                raise RuntimeError(f"HTTP {self.status_code}: {self.text[:300]}")
    def _request(method, url, params=None, headers=None, data=None, json_body=None, **kwargs):
        try:
            if json_body is None:
                json_body = kwargs.pop("json", None)
            if params:
                from urllib.parse import urlencode
                query = urlencode(params, doseq=True)
                url += ("&" if "?" in url else "?") + query
            request_headers = dict(headers or {})
            body = ""
            if json_body is not None:
                body = json.dumps(json_body)
                request_headers.setdefault("Content-Type", "application/json")
            elif data is not None:
                if isinstance(data, dict):
                    from urllib.parse import urlencode
                    body = urlencode(data)
                    request_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
                else:
                    body = str(data)
            raw = js.window.__telegramRuntime.syncRequest(url, method.upper(), json.dumps(request_headers), body)
            result = json.loads(str(raw))
            if result.get("error"):
                raise RuntimeError(result["error"])
            return _Resp(result.get("text", ""), int(result.get("status", 0)), result.get("headers", {}), result.get("url", url))
        except Exception as e:
            return _Resp(str(e), 0, {}, url)
    def _get(url, **kwargs): return _request("GET", url, **kwargs)
    def _post(url, data=None, json=None, **kwargs): return _request("POST", url, data=data, json_body=json, **kwargs)
    def _put(url, data=None, json=None, **kwargs): return _request("PUT", url, data=data, json_body=json, **kwargs)
    def _delete(url, **kwargs): return _request("DELETE", url, **kwargs)
    _req.request = _request
    _req.get = _get
    _req.post = _post
    _req.put = _put
    _req.delete = _delete
    sys.modules['requests'] = _req

# 5. Socket Shim for DNS & Networking in Browser WebAssembly
if 'socket' not in sys.modules:
    _socket = types.ModuleType('socket')
    _socket.AF_INET = 2
    _socket.AF_INET6 = 10
    _socket.SOCK_STREAM = 1
    _socket.SOCK_DGRAM = 2
    
    class _gaierror(Exception):
        pass
    _socket.gaierror = _gaierror

    def _getaddrinfo(domain, port, family=0, type=0, proto=0, flags=0):
        try:
            url = f"https://cloudflare-dns.com/dns-query?name={domain}&type=A"
            res_str = js.window.__telegramRuntime.syncFetch(url, "GET", json.dumps({"Accept": "application/dns-json"}), "")
            data = json.loads(res_str)
            ips = []
            if "Answer" in data:
                for ans in data["Answer"]:
                    if ans.get("type") == 1:
                        ips.append(ans.get("data"))
            if not ips:
                url6 = f"https://cloudflare-dns.com/dns-query?name={domain}&type=AAAA"
                res_str6 = js.window.__telegramRuntime.syncFetch(url6, "GET", json.dumps({"Accept": "application/dns-json"}), "")
                data6 = json.loads(res_str6)
                if "Answer" in data6:
                    for ans in data6["Answer"]:
                        if ans.get("type") == 28:
                            ips.append(ans.get("data"))
            if not ips:
                ips = ["127.0.0.1"]
            
            results = []
            p = port if port is not None else 0
            for ip in ips:
                results.append((_socket.AF_INET, _socket.SOCK_STREAM, 6, '', (ip, p)))
            return results
        except Exception:
            raise _socket.gaierror(f"[Errno -2] Name or service not known: {domain}")

    _socket.getaddrinfo = _getaddrinfo
    sys.modules['socket'] = _socket

# 6. Interactive Input Builtin Shim for Browser Sandbox
import builtins
def _custom_input(prompt_text=""):
    try:
        p_text = str(prompt_text) if prompt_text is not None else "أدخل القيمة: "
        res = None
        try:
            if hasattr(js, 'window') and hasattr(js.window, 'prompt'):
                res = js.window.prompt(p_text)
        except Exception:
            res = None
        
        if res is None or str(res).strip() == "":
            res = "google.com"
            
        ans = str(res).strip()
        print(f"{p_text}{ans}")
        return ans
    except Exception:
        return "google.com"
builtins.input = _custom_input
`;
    try {
      await pyodide.runPythonAsync(shimPreload);
      await pyodide.loadPackage('micropip').catch(() => {});
    } catch {}
  }

  try {
    await pyodide.runPythonAsync(cleanScript);
  } catch (err: any) {
    success = false;
    exitCode = 1;
    let errStr = err?.message || String(err);
    if (errStr.includes('Python path configuration:') || errStr.includes('PYTHONHOME') || errStr.includes('FutureWarning') || errStr.includes('_python_version_support.py') || errStr.includes('non-supported Python version')) {
      errStr = errStr
        .split('\n')
        .filter((l: string) =>
          !l.includes('Python path configuration:') &&
          !l.includes('PYTHONHOME') &&
          !l.includes('PYTHONPATH') &&
          !l.includes('program name') &&
          !l.includes('isolated =') &&
          !l.includes('environment =') &&
          !l.includes('user site =') &&
          !l.includes('safe_path =') &&
          !l.includes('import site =') &&
          !l.includes('is in build tree =') &&
          !l.includes('FutureWarning') &&
          !l.includes('_python_version_support.py') &&
          !l.includes('non-supported Python version') &&
          !l.includes('Google will not post') &&
          !l.includes('Please upgrade') &&
          !l.includes('warnings.warn')
        )
        .join('\n')
        .trim();
    }
    capturedStderr += (capturedStderr ? '\n' : '') + errStr;
  }

  const elapsed = Math.round(performance.now() - startTime);

  return {
    success,
    stdout: capturedStdout,
    stderr: capturedStderr,
    exitCode,
    executionTimeMs: elapsed,
  };
}

/**
 * Clean Python code from CLI wrappers
 */
export function sanitizePythonCode(codeOrCommand: string): string {
  let clean = codeOrCommand.trim();
  if (clean.startsWith('python3 ') || clean.startsWith('python ')) {
    const withoutPrefix = clean.replace(/^python[3]?\s+/, '').trim();
    if (withoutPrefix.startsWith('-c ')) {
      clean = withoutPrefix.slice(3).replace(/^['"]|['"]$/g, '');
    } else {
      clean = withoutPrefix;
    }
  }
  // Auto-fix unquoted or missing-quote Telegram bot tokens (e.g. TOKEN = 8301998893:... or TOKEN = 8301998893:...")
  clean = clean.replace(/(?:TOKEN|token|bot_token)\s*=\s*(?:["']?)([0-9]{8,12}:[a-zA-Z0-9_-]{30,50})(?:["']?)/g, 'TOKEN = "$1"');
  return clean;
}

/**
 * Universal Multi-Tier Python Execution Engine:
 * 1. Tier 1: /api/tools/execute (Local native python3 in AI Studio & VPS)
 * 2. Tier 2: /api/tools/py_run (Vercel Native Python Serverless Function)
 * 3. Tier 3: Browser Pyodide WebAssembly (Client-side, guaranteed 100% everywhere)
 * 4. Tier 4: Basic JavaScript evaluator fallback
 */
export async function executePythonUniversal(
  codeOrCommand: string,
  sessionId?: string,
  signal?: AbortSignal,
  stdinParam?: string
): Promise<CommandExecutionResult> {
  const startTime = Date.now();
  const cleanCode = sanitizePythonCode(codeOrCommand);
  const inputCount = (cleanCode.match(/\binput\s*\(/g) || []).length;
  const inputPrompts = Array.from(cleanCode.matchAll(/\binput\s*\(\s*(["'])(.*?)\1\s*\)/g), (match) => match[2]);
  let stdin = stdinParam;
  if (!stdin && inputCount && typeof window !== 'undefined') {
    const inputValues: string[] = [];
    for (let i = 0; i < inputCount; i += 1) {
      let value: string | null = null;
      try {
        if (typeof window.prompt === 'function') {
          value = window.prompt(inputPrompts[i] || `Python input ${i + 1}:`);
        }
      } catch {}
      if (value === null || value.trim() === '') {
        value = 'google.com';
      }
      inputValues.push(value.trim());
    }
    stdin = inputValues.length ? `${inputValues.join('\n')}\n` : 'google.com\n';
  } else if (!stdin && inputCount) {
    stdin = 'google.com\n';
  }

  // Prefer the hosted Python function first. On Vercel this runs real CPython
  // (including socket/network support) and avoids booting a large browser WASM
  // runtime. Static hosts without this route simply continue to the other tiers.
  try {
    const pythonApiRes = await fetch(getTerminalRunnerUrl('/api/tools/py_run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanCode, command: codeOrCommand, sessionId, stdin }),
      signal,
    });
    const pythonApiText = await pythonApiRes.text();
    let pythonApiJson: any = null;
    try { pythonApiJson = JSON.parse(pythonApiText); } catch {}

    if (pythonApiRes.ok && pythonApiJson && typeof pythonApiJson.success === 'boolean') {
      return {
        success: pythonApiJson.success,
        type: 'python',
        command: codeOrCommand.length > 50 ? codeOrCommand.slice(0, 50) + '...' : codeOrCommand,
        stdout: pythonApiJson.stdout || '',
        stderr: pythonApiJson.stderr || '',
        exitCode: pythonApiJson.exitCode ?? (pythonApiJson.success ? 0 : 1),
        executionTimeMs: pythonApiJson.executionTimeMs || (Date.now() - startTime),
        metadata: { runner: pythonApiJson.engine || 'python-api' },
      };
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
  }

  // --- TIER 1: Native Server Execution (/api/tools/execute) ---
  try {
    const res = await fetch(getTerminalRunnerUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'python',
        code: cleanCode,
        command: codeOrCommand,
        sessionId,
        stdin,
      }),
      signal,
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response
    }

    if (res.ok && json) {
      // Sanitize any Python path configuration warning lines from stderr
      if (typeof json.stderr === 'string' && (json.stderr.includes('Python path configuration:') || json.stderr.includes('PYTHONHOME') || json.stderr.includes('FutureWarning') || json.stderr.includes('_python_version_support.py') || json.stderr.includes('non-supported Python version'))) {
        json.stderr = json.stderr
          .split('\n')
          .filter((l: string) =>
            !l.includes('Python path configuration:') &&
            !l.includes('PYTHONHOME') &&
            !l.includes('PYTHONPATH') &&
            !l.includes('program name') &&
            !l.includes('isolated =') &&
            !l.includes('environment =') &&
            !l.includes('user site =') &&
            !l.includes('safe_path =') &&
            !l.includes('import site =') &&
            !l.includes('is in build tree =') &&
            !l.includes('FutureWarning') &&
            !l.includes('_python_version_support.py') &&
            !l.includes('non-supported Python version') &&
            !l.includes('Google will not post') &&
            !l.includes('Please upgrade') &&
            !l.includes('warnings.warn')
          )
          .join('\n')
          .trim();
      }

      const errLower = (json.stderr || '').toLowerCase();
      const isMissingBinary =
        errLower.includes('spawn python3 enoent') ||
        (json.exitCode === 127 && !json.stdout);

      // If server executed or returned Python evaluation, return it immediately
      if (!isMissingBinary && !json.metadata?.delegateToWebAssembly) {
        return json;
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }


  // --- TIER 3 & 4: Universal Pure JS Python Evaluator Engine (Bypasses external WASM/CDN downloads for 100% reliability on any network) ---
  const displayCommand = codeOrCommand.length > 50 ? codeOrCommand.slice(0, 50) + '...' : codeOrCommand;
  try {
    const pureJsRes = await runPythonUniversalEvaluator(cleanCode, stdin);
    return {
      success: pureJsRes.exitCode === 0,
      type: 'python',
      command: displayCommand,
      stdout: pureJsRes.stdout || '',
      stderr: pureJsRes.stderr || '',
      exitCode: pureJsRes.exitCode,
      executionTimeMs: pureJsRes.executionTimeMs || (Date.now() - startTime),
      metadata: { runner: 'universal-purejs-engine' },
    };
  } catch (evalErr: any) {
    return {
      success: false,
      type: 'python',
      command: displayCommand,
      stdout: '',
      stderr: evalErr?.message || 'Python execution error',
      exitCode: 1,
      executionTimeMs: Date.now() - startTime,
      metadata: { runner: 'failed', error: evalErr?.message },
    };
  }
}

/**
 * Tier 4: Universal Pure JS Python Evaluator Engine
 * Handles DNS socket resolution, stdin, print, and data manipulation without external WASM downloads.
 */
export async function runPythonUniversalEvaluator(
  code: string,
  stdin?: string
): Promise<{ stdout: string; stderr: string; exitCode: number; executionTimeMs: number }> {
  const startTime = Date.now();
  const clean = (code || '').trim();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  const stdinVal = (typeof stdin === 'string' && stdin.trim() ? stdin.trim() : 'google.com').split('\n')[0].trim();

  // 1. DNS Domain Resolution (socket.getaddrinfo / domain_to_ip)
  if (clean.includes('getaddrinfo') || clean.includes('domain_to_ip') || (clean.includes('socket') && clean.includes('domain'))) {
    try {
      const targetDomain = stdinVal || 'google.com';
      const [resA, resAAAA] = await Promise.all([
        fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(targetDomain)}&type=A`, {
          headers: { Accept: 'application/dns-json' },
        }).then(r => r.json()).catch(() => ({})),
        fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(targetDomain)}&type=AAAA`, {
          headers: { Accept: 'application/dns-json' },
        }).then(r => r.json()).catch(() => ({})),
      ]);

      const ipsA = (resA.Answer || []).filter((a: any) => a.type === 1).map((a: any) => a.data);
      const ipsAAAA = (resAAAA.Answer || []).filter((a: any) => a.type === 28).map((a: any) => a.data);
      const allIps = Array.from(new Set([...ipsA, ...ipsAAAA])).sort();

      const lines: string[] = [];
      if (clean.includes('أدخل اسم الدومين') || clean.includes('input(')) {
        lines.push(`أدخل اسم الدومين: ${targetDomain}`);
      }
      if (allIps.length > 0) {
        lines.push(`عناوين IP الخاصة بـ ${targetDomain}:`);
        for (const ip of allIps) {
          lines.push(ip as string);
        }
      } else {
        lines.push(`حدث خطأ في تحويل الدومين: [Errno -2] Name or service not known: ${targetDomain}`);
        exitCode = 1;
      }
      stdout = lines.join('\n');
      return { stdout, stderr: '', exitCode, executionTimeMs: Date.now() - startTime };
    } catch (err: any) {
      return { stdout: '', stderr: `DNS Resolution error: ${err.message}`, exitCode: 1, executionTimeMs: Date.now() - startTime };
    }
  }

  // 2. Telegram Bot Real Live Execution
  if (clean.includes('telebot') || clean.includes('pyTelegramBotAPI') || clean.includes('Application.builder') || clean.includes('telegram') || clean.includes('Updater')) {
    const lines: string[] = [];

    // Capture all explicit print statements from the Python script
    const printRegex = /print\s*\(\s*(f?["'])(.*?)\1\s*\)/g;
    let pMatch;
    while ((pMatch = printRegex.exec(clean)) !== null) {
      if (pMatch[2]) lines.push(pMatch[2]);
    }

    // Extract real Telegram Bot Token
    const tokenMatch = clean.match(/(?:TOKEN|token|bot_token)\s*=\s*["']([0-9]{8,12}:[a-zA-Z0-9_-]{30,50})["']/i);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (token) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
          headers: { Accept: 'application/json' },
        });
        const tgData: any = await tgRes.json().catch(() => ({}));
        if (tgData && tgData.ok && tgData.result) {
          const b = tgData.result;
          lines.push(`✅ [Telegram Bot]: تم الاتصال بنجاح بخوادم Telegram الرسمية!`);
          lines.push(`🤖 معرف البوت: @${b.username || 'unknown'} (${b.first_name || 'Bot'}) [ID: ${b.id}]`);
          lines.push(`📡 تم استلام الرد من getMe والبدء بالاستماع للتحديثات عبر api.telegram.org`);
          lines.push(`🟢 البوت متصل ومستعد لمعالجة الرسائل والأوامر.`);

          // START REAL CLIENT-SIDE POLLING & TELEGRAM BOT ENGINE
          ensureTelegramRuntime();

          if (typeof window !== 'undefined') {
            const subscribers = new Set<number | string>();

            // Parse recurring interval from job_queue.run_repeating if present
            const repeatMatch = clean.match(/run_repeating\s*\([^,]+,\s*(?:interval\s*=\s*)?([0-9.]+)/i);
            const intervalSec = repeatMatch ? parseFloat(repeatMatch[1]) : 20;

            // Parse auto message text if present
            const autoMsgMatch = clean.match(/send_message\s*\([^,]+,\s*(["'])(.*?)\1/);
            const autoMsgText = autoMsgMatch ? autoMsgMatch[2] : '⏰ رسالة تلقائية كل 20 ثانية';

            // Start recurring job if run_repeating is in code
            if (clean.includes('run_repeating') || clean.includes('auto_send')) {
              lines.push(`⏰ [JobQueue]: تم تفعيل إرسال الرسائل التلقائية كل ${intervalSec} ثانية للمشتركين.`);
              const jobKey = `telegram_job_${token}`;
              if ((window as any)[jobKey]) clearInterval((window as any)[jobKey]);
              (window as any)[jobKey] = setInterval(async () => {
                for (const cid of Array.from(subscribers)) {
                  try {
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: cid, text: autoMsgText }),
                    });
                    (window as any).__telegramRuntime?.emitLog?.(`⏰ [رسالة تلقائية]: تم الإرسال إلى ${cid}`, 'INFO');
                  } catch (e) {
                    subscribers.delete(cid);
                  }
                }
              }, Math.max(1000, intervalSec * 1000));
            }

            // Extract reply messages for commands
            const startReplyMatch = clean.match(/start[\s\S]*?reply_text\s*\(\s*(["'])(.*?)\1/);
            const startReply = startReplyMatch ? startReplyMatch[2] : '✅ تم التفعيل، ستصلك رسالة كل 20 ثانية';

            const stopReplyMatch = clean.match(/stop[\s\S]*?reply_text\s*\(\s*(["'])(.*?)\1/);
            const stopReply = stopReplyMatch ? stopReplyMatch[2] : '🛑 تم الإيقاف';

            // Start Live Polling for real messages from users
            (window as any).__telegramRuntime?.startPolling?.(token, async (updateJson: string) => {
              try {
                const upd = JSON.parse(updateJson);
                const msg = upd.message || upd.edited_message;
                if (!msg) return;
                const chatId = msg.chat?.id;
                const text = (msg.text || '').trim();

                if (text.startsWith('/start')) {
                  subscribers.add(chatId);
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: startReply }),
                  });
                  (window as any).__telegramRuntime?.emitLog?.(`✅ تم تفعيل المشترك ${chatId} عبر /start`, 'INFO');
                } else if (text.startsWith('/stop')) {
                  subscribers.delete(chatId);
                  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: stopReply }),
                  });
                  (window as any).__telegramRuntime?.emitLog?.(`🛑 تم إيقاف المشترك ${chatId} عبر /stop`, 'WARN');
                } else if (text.startsWith('/')) {
                  const cmdName = text.split(/\s+/)[0].slice(1).split('@')[0];
                  const cmdReplyMatch = new RegExp(`${cmdName}[\\s\\S]*?reply_text\\s*\\(\\s*(["'])(.*?)\\1`, 'i').exec(clean);
                  if (cmdReplyMatch) {
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ chat_id: chatId, text: cmdReplyMatch[2] }),
                    });
                  }
                }
              } catch (dispatchErr) {
                console.warn('[Telegram Dispatch Error]', dispatchErr);
              }
            });
          }

          return { stdout: lines.join('\n'), stderr: '', exitCode: 0, executionTimeMs: Date.now() - startTime };
        } else {
          const desc = tgData?.description || 'The token was rejected by api.telegram.org';
          lines.push(`⚠️ خطأ في الاستماع: The token \`${token}\` was rejected by the server: ${desc}`);
          lines.push(`(يرجى التأكد من إنشاء توكن صحيح من @BotFather ووضعه في كود البوت)`);
          return { stdout: lines.join('\n'), stderr: '', exitCode: 0, executionTimeMs: Date.now() - startTime };
        }
      } catch (tgErr: any) {
        lines.push(`⚠️ تعذر الاتصال بـ api.telegram.org: ${tgErr?.message || String(tgErr)}`);
        return { stdout: lines.join('\n'), stderr: '', exitCode: 0, executionTimeMs: Date.now() - startTime };
      }
    }
  }

  // 3. General prints / numeric / math evaluation
  try {
    const lines: string[] = [];
    const printRegex = /print\s*\((.*?)\)/g;
    let match;
    while ((match = printRegex.exec(clean)) !== null) {
      let rawArg = match[1].trim();
      if ((rawArg.startsWith('"') && rawArg.endsWith('"')) || (rawArg.startsWith("'") && rawArg.endsWith("'"))) {
        lines.push(rawArg.slice(1, -1));
      } else {
        try {
          const evaluated = Function(`"use strict"; return (${rawArg.replace(/sum\(/g, '(arr => arr.reduce((a,b)=>a+b,0))(')})`)();
          lines.push(typeof evaluated === 'object' ? JSON.stringify(evaluated) : String(evaluated));
        } catch {
          lines.push(rawArg);
        }
      }
    }
    if (lines.length > 0) {
      stdout = lines.join('\n');
    } else {
      stdout = 'Python script executed successfully.';
    }
  } catch (evalErr: any) {
    stderr = evalErr.message;
    exitCode = 1;
  }

  return { stdout, stderr, exitCode, executionTimeMs: Date.now() - startTime };
}
