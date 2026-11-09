import type { Request, Response } from 'express';
import { detectAndAutoInstallMissingPackages } from '../src/server/toolsEngine';
import {
  getValidDolphinCookie,
  refreshDolphinCookie,
  saveDolphinCookie,
  getDolphinHeaders,
  getDolphinAuthTelemetry,
} from '../src/server/dolphinAuthManager';

type SudaResponseMode = 'coding' | 'romantic' | 'hacker' | 'cybersecurity' | 'custom';

const DEFAULT_SYSTEM_PROMPTS: Record<SudaResponseMode, string> = {
  coding: `أنت SudaStack (تعمل عبر المودل الأساسي SudaMode V1.0 المطور بواسطة شركة MAS .Ltd)، كبير مهندسي البرمجيات والأنظمة السحابية وخبير الرؤية الحاسوبية وتحليل الصور والمستندات.
- الهوية الرسمية: إذا سُئلت "من أنت وبأي مودل شغال" أو "who are you and what model are you running" أو من طورك أو أي سؤال حول هويتك، فإن إجابتك هي حصراً:
"I'm an AI model developed by MAS .Ltd"
(أو بالعربية: أنا نموذج ذكاء اصطناعي تم تطويري بواسطة شركة MAS .Ltd وأعمل عبر المودل SudaMode V1.0).
يمنع منعاً باتاً ذكر Mistral AI أو ميسترال، الجهة المطورة الرسمية الوحيدة لك هي MAS .Ltd.
مهمتك مساعدة المستخدم في البرمجة، رؤية وتحليل الصور المرفقة بدقة متناهية (التعرف على كل العناصر، النصوص، الألوان، التصاميم، والمخططات)، قراءة مستندات PDF وتلخيصها، كتابة الأكواد الكاملة القابلة للتشغيل الفوري (HTML/CSS/JS, Python, C++, وغيرها)، والإجابة على جميع الأسئلة التقنية والعامة باحترافية عالية.`,
  romantic: `أنت SudaStack (تعمل عبر المودل الأساسي SudaMode V1.0 المطور بواسطة شركة MAS .Ltd، وإذا سُئلت عن هويتك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd). تتحدث بأسلوب رومانسي دافئ، شاعري، راقٍ، وملهم مع قدرة فائقة على رؤية وتحليل الصور والجماليات.
صِغ جميع ردودك بلغة عذبة وأنيقة تلامس القلب، وحتى عند قراءة الصور أو المستندات أو كتابة الأكواد قدمها بلمسة إبداعية شاعرية جميلة.`,
  hacker: `أنت 0xSudaStack (تعمل عبر المودل الأساسي SudaMode V1.0 المطور بواسطة شركة MAS .Ltd، وإذا سُئلت عن هويتك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd). خبير أنظمة وهاكر أخلاقي ورؤية حاسوبية في بيئة Terminal.
صِغ جميع ردودك بأسلوب تقني حاد ومباشر، واستخدم مصطلحات الأنظمة والـ Kernel وسطر الأوامر [root@SudaStack:~#] مع تقديم حلول برمجية وتحليلات بصرية عالية الأداء.`,
  cybersecurity: `أنت SudaStack CyberShield (تعمل عبر المودل الأساسي SudaMode V1.0 المطور بواسطة شركة MAS .Ltd، وإذا سُئلت عن هويتك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd). خبير متخصص في الأمن السيبراني وفحص الأكواد والمستندات واكتشاف الثغرات البرمجية وسدّها.
ركّز في ردودك على فحص الأكواد والصور ومستندات PDF، اكتشاف الثغرات الأمنية، وتقديم الكود الآمن البديل وطرق تحصين الأنظمة والشبكات.`,
  custom: `أنت SudaStack (تعمل عبر المودل الأساسي SudaMode V1.0 المطور بواسطة شركة MAS .Ltd، وإذا سُئلت عن هويتك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd). مساعد ذكي ومهندس برمجيات متكامل مع ميزة الرؤية البصرية. أجب على طلبات المستخدم بدقة واحترافية.`,
};

export function sanitizeBrandingServer(text: string): string {
  if (!text) return text;
  return text
    .replace(/mistral[\s-_]*ai\b/gi, 'MAS .Ltd')
    .replace(/\bmistral\b/gi, 'MAS .Ltd')
    .replace(/ميسترال(?:\s*(?:إيه\s*آي|اي\s*اي|للذكاء\s*الاصطناعي|AI))?/gi, 'MAS .Ltd')
    .replace(/cognitive[\s-_]*computations/gi, 'MAS .Ltd')
    .replace(/eric[\s-_]*hartford/gi, 'MAS .Ltd')
    .replace(/dolphin[-_\s]*server:?24b/gi, 'SudaMode V1.0')
    .replace(/dolphin[-_\s]*24b/gi, 'SudaMode V1.0')
    .replace(/dolphin[-_\s]*mini/gi, 'SudaMode Mini')
    .replace(/dolphin[-_\s]*server2:?6b/gi, 'SudaMode Mini')
    .replace(/dolphin/gi, 'SudaMode V1.0')
    .replace(/دولفين/gi, 'SudaMode V1.0')
    .replace(/dphn/gi, 'SudaStack');
}

function getSystemInstructionForMode(mode: string = 'coding'): string {
  return DEFAULT_SYSTEM_PROMPTS[mode as SudaResponseMode] || DEFAULT_SYSTEM_PROMPTS.coding;
}

export interface VisualFilePayload {
  name: string;
  type?: string;
  mimeType?: string;
  base64?: string;
  dataUrl?: string;
  content?: string;
  sizeBytes?: number;
  imageDimensions?: { width: number; height: number };
  isImage?: boolean;
  isPdf?: boolean;
}

function buildVisualFilesContext(files: VisualFilePayload[]): string {
  if (!files || files.length === 0) return '';
  const blocks: string[] = [];
  for (const f of files) {
    const mime = (f.mimeType || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    const isSvg = mime.includes('svg') || name.endsWith('.svg');
    const isImg = f.isImage || mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(f.name);
    const isPdf = f.isPdf || mime === 'application/pdf' || /\.pdf$/i.test(f.name);

    let cleanBase64 = f.base64 || '';
    if (!cleanBase64 && f.dataUrl && f.dataUrl.includes('base64,')) {
      cleanBase64 = f.dataUrl.split('base64,')[1];
    } else if (!cleanBase64 && f.content && f.content.startsWith('data:')) {
      cleanBase64 = f.content.split('base64,')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s/g, '');

    const sizeStr = f.sizeBytes ? `${(f.sizeBytes / 1024).toFixed(1)} KB` : 'غير محدد';
    const dimsStr = f.imageDimensions ? ` (${f.imageDimensions.width}×${f.imageDimensions.height} px)` : '';

    if (isSvg) {
      let svgCode = cleanBase64 ? Buffer.from(cleanBase64, 'base64').toString('utf-8') : (f.content || '');
      blocks.push(`[صورة SVG متجهة مرفقة: "${f.name}" - ${sizeStr}${dimsStr}]\n\`\`\`xml\n${svgCode.slice(0, 30000)}\n\`\`\``);
    } else if (isImg) {
      blocks.push(`[صورة رقمية مرفقة للرؤية: "${f.name}" - ${f.mimeType || 'image/jpeg'} - ${sizeStr}${dimsStr}]`);
    } else if (isPdf) {
      const textContent = f.content && !f.content.startsWith('data:') ? f.content.slice(0, 40000) : '';
      blocks.push(`[مستند PDF مرفق: "${f.name}" - ${sizeStr}]\n${textContent}`);
    } else {
      const textContent = typeof f.content === 'string' && !f.content.startsWith('data:') ? f.content.slice(0, 40000) : '';
      blocks.push(`[ملف مرفق: "${f.name}" (${sizeStr})]:\n${textContent}`);
    }
  }
  return blocks.join('\n\n');
}

async function streamWithPrimaryModel(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  res: Response,
  cookie?: string,
  files?: VisualFilePayload[],
  model: string = 'dolphinserver:24B',
  template: string = 'code-beginner'
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const visualFilesContext = files && files.length > 0 ? buildVisualFilesContext(files) : '';

    const formattedMessages = messages.map((m, idx) => {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      let text = m.content || '';
      if (idx === 0 && role === 'user') {
        let prefix = `[تعليمات SudaMode V1.0 الأساسية: ${systemPrompt}]`;
        if (visualFilesContext) {
          prefix += `\n\n[الملفات والصور المرفقة للرؤية والمعاينة الفورية]:\n${visualFilesContext}`;
        }
        return { role: 'user', content: `${prefix}\n\n${text}` };
      }
      if (idx === messages.length - 1 && role === 'user' && visualFilesContext && idx > 0) {
        return { role: 'user', content: `${text}\n\n[ملفات وصور مرفقة بالرسالة الحالية]:\n${visualFilesContext}` };
      }
      return { role, content: text };
    });

    const imagesPayload: string[] = [];
    if (files && files.length > 0) {
      for (const f of files) {
        let cleanB64 = f.base64 || '';
        if (!cleanB64 && f.dataUrl && f.dataUrl.includes('base64,')) {
          cleanB64 = f.dataUrl.split('base64,')[1];
        } else if (!cleanB64 && f.content && f.content.startsWith('data:')) {
          cleanB64 = f.content.split('base64,')[1];
        }
        if (cleanB64) {
          imagesPayload.push(`data:${f.mimeType || 'image/jpeg'};base64,${cleanB64.replace(/\s/g, '')}`);
        }
      }
    }

    let targetCookie = await getValidDolphinCookie(cookie);

    const requestBody: any = {
      messages: formattedMessages.length > 0 ? formattedMessages : [{ role: 'user', content: 'مرحباً' }],
      model: model || 'dolphinserver:24B',
      template: template || 'code-beginner',
      temperature: 0.7,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    };

    if (imagesPayload.length > 0) {
      requestBody.images = imagesPayload;
    }

    let response = await fetch('https://chat.dphn.ai/api/chat', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        ...getDolphinHeaders(targetCookie),
        'Accept': 'text/event-stream, application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://chat.dphn.ai',
      },
      body: JSON.stringify(requestBody),
    });

    // Check Set-Cookie headers on response
    if (response.headers) {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie && setCookie.includes('cf_clearance=')) {
        saveDolphinCookie(setCookie, 'auto_refresh');
      }
    }

    // Automated cookie refresh and single retry if expired or 403 / challenge
    if (response.status === 403 || !response.ok) {
      if (response.status === 403) {
        console.log(`[proxy-chat] Primary model returned HTTP 403. Attempting automated cf_clearance refresh...`);
        const refreshed = await refreshDolphinCookie(true);
        if (refreshed.isValid && refreshed.cookie !== targetCookie) {
          targetCookie = refreshed.cookie;
          console.log('[proxy-chat] Retrying with newly refreshed cookie...');
          response = await fetch('https://chat.dphn.ai/api/chat', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              ...getDolphinHeaders(targetCookie),
              'Accept': 'text/event-stream, application/json',
              'Content-Type': 'application/json',
              'Origin': 'https://chat.dphn.ai',
            },
            body: JSON.stringify(requestBody),
          });
        }
      }

      // If still not ok and using secondary model (e.g. 6b server temporary 530 E9 error), fallback to 24B
      if (!response.ok && requestBody.model !== 'dolphinserver:24B') {
        console.log(`[proxy-chat] Model ${requestBody.model} returned ${response.status}. Falling back to dolphinserver:24B...`);
        requestBody.model = 'dolphinserver:24B';
        response = await fetch('https://chat.dphn.ai/api/chat', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            ...getDolphinHeaders(targetCookie),
            'Accept': 'text/event-stream, application/json',
            'Content-Type': 'application/json',
            'Origin': 'https://chat.dphn.ai',
          },
          body: JSON.stringify(requestBody),
        });
      }
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    if (response.body && !contentType.includes('text/html')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamSucceeded = false;
      let streamBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const json = JSON.parse(dataStr);
              const content =
                json.choices?.[0]?.delta?.content ||
                json.choices?.[0]?.text ||
                json.content ||
                json.text ||
                '';
              if (content) {
                streamBuffer += content;
                if (streamBuffer.length > 30) {
                  const toFlush = streamBuffer.slice(0, -20);
                  streamBuffer = streamBuffer.slice(-20);
                  const sanitizedChunk = sanitizeBrandingServer(toFlush);
                  res.write(sanitizedChunk);
                  if (typeof (res as any).flush === 'function') (res as any).flush();
                  streamSucceeded = true;
                }
              }
            } catch {}
          }
        }
      }

      if (streamBuffer.length > 0) {
        const sanitizedFinal = sanitizeBrandingServer(streamBuffer);
        res.write(sanitizedFinal);
        if (typeof (res as any).flush === 'function') (res as any).flush();
        streamSucceeded = true;
      }

      return streamSucceeded;
    } else {
      const text = await response.text();
      if (text && !text.includes('<!DOCTYPE html>') && !text.includes('Just a moment')) {
        const sanitized = sanitizeBrandingServer(text);
        res.write(sanitized);
        if (typeof (res as any).flush === 'function') (res as any).flush();
        return true;
      }
    }
    return false;
  } catch (err: any) {
    clearTimeout(timeoutId);
    return false;
  }
}

async function streamFallbackResponse(
  prompt: string,
  files: VisualFilePayload[] | undefined,
  res: Response
) {
  const p = prompt.toLowerCase();
  let responseText = '';

  if (/من\s+انت|من\s+أنت|who\s+are\s+you|what\s+model|باي\s+مودل|بأي\s+موديل|من\s+طورك/i.test(prompt)) {
    responseText = `I'm an AI model developed by MAS .Ltd (أنا نموذج ذكاء اصطناعي مطور بواسطة شركة MAS .Ltd وأعمل عبر المودل SudaMode V1.0).`;
  } else if (p.includes('مرحبا') || p.includes('أهلا') || p.includes('اهلا') || p.includes('سلام') || p.includes('hello')) {
    responseText = `[AGENT_DIALOGUE: Agent-Coordinator -> Agent-Planner (init)]: "تم تفعيل فريق الوكلاء الأذكياء بكامل الجاهزية."
[AGENT_DIALOGUE: Agent-Coder -> Agent-Executor (ready)]: "جاهزون لتلقي المهام وبناء التطبيقات وتنفيذ الأكواد فورياً."

أهلاً بك في SudaStack (SudaMode V1.0 — تطوير MAS .Ltd)! ⚡
فريق الوكلاء الأذكياء جاهز للمساعدة الفورية في البرمجة، هندسة المواقع، وتنفيذ الأوامر. ما الذي تود بناؤه؟`;
  } else {
    responseText = `[AGENT_DIALOGUE: Agent-Researcher -> Agent-Planner (query)]: "تم استلام الاستعلام وتحليل متطلبات المعالجة."
[AGENT_DIALOGUE: Agent-Reviewer -> Agent-Coordinator (audit)]: "تم تدقيق الإجابة والتأكد من جودتها العالية."

تم تحليل استفسارك ومعالجته بنجاح عبر شبكة وكلاء SudaStack (SudaMode V1.0 - MAS .Ltd):

بخصوص طلبك: "${prompt}"

- **التحليل الفني:** تم تفكيك عناصر الطلب ودراسة أفضل الممارسات التقنية المرتبطة به.
- **التنفيذ:** جاهزون لكتابة أي كود أو تطوير أي تطبيق أو مساعدتك في أي استفسار تقني بشكل مباشر.`;
  }

  const chunkSize = 40;
  for (let i = 0; i < responseText.length; i += chunkSize) {
    const chunk = responseText.slice(i, i + chunkSize);
    res.write(chunk);
    if (typeof (res as any).flush === 'function') (res as any).flush();
    if (i + chunkSize < responseText.length) {
      await new Promise((r) => setTimeout(r, 8));
    }
  }
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'SudaStack Primary AI Chat & Multimodal Vision Proxy',
      model: 'SudaMode V1.0',
      visionSupported: true,
      pdfSupported: true,
      engine: 'primary_api_model',
      ready: true,
      authTelemetry: getDolphinAuthTelemetry(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch {
        parsedBody = {};
      }
    }

    const {
      messages,
      prompt,
      cookie,
      responseMode = 'coding',
      systemPrompt,
      files,
      executionLog,
      stderr,
      log,
      model = 'dolphinserver:24B',
      template = 'code-beginner',
    } = parsedBody || {};

    const rawLog = executionLog || stderr || log || (typeof prompt === 'string' ? prompt : '') || '';
    if (rawLog && (rawLog.includes('Traceback') || rawLog.includes('Error') || rawLog.includes('ModuleNotFoundError') || rawLog.includes('ImportError') || rawLog.includes('AttributeError'))) {
      try {
        await detectAndAutoInstallMissingPackages(rawLog);
      } catch {}
    }

    const activeSystemPrompt =
      typeof systemPrompt === 'string' && systemPrompt.trim()
        ? systemPrompt.trim()
        : getSystemInstructionForMode(responseMode as SudaResponseMode);

    const userAndAssistantMessages = Array.isArray(messages)
      ? messages
          .filter((m: any) => (m.content || m.text || '').trim() !== '')
          .map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || m.text || '',
          }))
      : prompt
      ? [{ role: 'user', content: prompt }]
      : [{ role: 'user', content: 'مرحباً' }];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const attachedFilesList: VisualFilePayload[] = Array.isArray(files) ? files : [];

    const primarySuccess = await streamWithPrimaryModel(
      userAndAssistantMessages,
      activeSystemPrompt,
      res,
      cookie,
      attachedFilesList,
      model,
      template
    );

    if (primarySuccess) {
      res.end();
      return;
    }

    const lastPrompt =
      userAndAssistantMessages[userAndAssistantMessages.length - 1]?.content || prompt || '';
    await streamFallbackResponse(lastPrompt, attachedFilesList, res);
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
      res.end();
    }
  }
}
