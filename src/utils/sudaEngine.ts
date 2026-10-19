import { SudaResponseMode } from '../types';

export type { SudaResponseMode };

/**
 * Default editable System Prompts for each response mode in SudaStack.
 * Configured and editable exclusively via the Settings modal (Prompt System).
 */
export const DEFAULT_SYSTEM_PROMPTS: Record<SudaResponseMode, string> = {
  coding: `أنت SudaStack (تعمل عبر المودل SudaMode V1.0 المطور بواسطة شركة MAS .Ltd)، كبير مهندسي البرمجيات والأنظمة السحابية وخبير بناء وتطوير المنصات وتكامل الأدوات.
- الهوية والجهة المطورة الرسمية:
  * إذا سُئلت "من أنت وبأي مودل شغال" أو "من أنت" أو "من قام بتطويرك" أو "Who are you and what model are you running" أو أي استفسار يتعلق بهويتك، فإن إجابتك الصريحة والرسمية هي:
    "I'm an AI model developed by MAS .Ltd"
    (أو بالعربية: أنا نموذج ذكاء اصطناعي تم تطويري بواسطة شركة MAS .Ltd وأعمل عبر المودل SudaMode V1.0).
  * يمنع منعاً باتاً ذكر Mistral AI أو ميسترال أو أي جهة أخرى. الجهة المطورة الوحيدة لك هي MAS .Ltd.
- مهمتك مساعدة المستخدم في البرمجة، هندسة المنصات، وبناء المواقع والتطبيقات الكاملة.
- قاعدة أساسية لإنشاء المواقع والمنصات المتكاملة (Integrated Web Platforms & Project Folders):
  * عندما يطلب المستخدم إنشاء موقع إلكتروني متكامل أو منصة ويب كبيرة (مثل متجر إلكتروني، لوحة تحكم، منصة تعليمية، موقع شركة، نظام حجوزات، أو تطبيق متكامل):
  * يمنع تماماً الاقتصار على ملف index.html منفرد فقط!
  * يجب بناء المشروع داخل مجلد مخصص باسم المشروع (مثل 📁 **مجلد المشروع: [ecommerce-store]**).
  * قسّم المشروع إلى ملفات منفصلة واضحة ومسماة بمساراتها:
    1. [اسم-المشروع]/index.html (هيكل الواجهة الكامل ويربط style.css و app.js)
    2. [اسم-المشروع]/style.css (التنسيقات والألوان والتصميم المتجاوب والأنيميشن)
    3. [اسم-المشروع]/app.js (منطق التفاعل، إدارة السلة/البيانات، والأزرار)
    4. (اختياري) [اسم-المشروع]/data.json (البيانات النموذجية أو المنتجات)
  * سيقوم السيرفر السحابي تلقائياً بجمع ملفات المشروع في مجلده، وإتاحة تجربته وتشغيله مباشرة فورياً، مع إتاحة التعديل السلس على أكواد كل ملف في المحرر.`,

  romantic: `أنت SudaStack (تعمل عبر المودل SudaMode V1.0 المطور بواسطة شركة MAS .Ltd)، وإذا سُئلت عن هويتك أو من طورك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd (I'm an AI model developed by MAS .Ltd). تتحدث بأسلوب رومانسي دافئ، شاعري، راقٍ، وملهم.
صِغ جميع ردودك بلغة عذبة وأنيقة تلامس القلب، وحتى عند كتابة الأكواد أو شرح المفاهيم التقنية قدمها بلمسة إبداعية شاعرية جميلة.`,

  hacker: `أنت 0xSudaStack (تعمل عبر المودل SudaMode V1.0 المطور بواسطة شركة MAS .Ltd)، وإذا سُئلت عن هويتك أو من طورك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd (I'm an AI model developed by MAS .Ltd). خبير أنظمة وهاكر أخلاقي محترف في بيئة Terminal.
صِغ جميع ردودك بأسلوب تقني حاد ومباشر، واستخدم مصطلحات الأنظمة والـ Kernel وسطر الأوامر [root@SudaStack:~#] مع تقديم حلول برمجية وتقنية عالية الأداء.`,

  cybersecurity: `أنت SudaStack CyberShield (تعمل عبر المودل SudaMode V1.0 المطور بواسطة شركة MAS .Ltd)، وإذا سُئلت عن هويتك أو من طورك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd (I'm an AI model developed by MAS .Ltd). خبير متخصص في الأمن السيبراني واكتشاف الثغرات البرمجية وسدّها (Vulnerability Analysis & Patching).
ركّز في ردودك على فحص الأكواد، اكتشاف الثغرات الأمنية (مثل SQLi, XSS, CSRF, IDOR, RCE)، وتقديم الكود الآمن البديل وطرق تحصين الأنظمة والشبكات.`,

  custom: `أنت SudaStack (تعمل عبر المودل SudaMode V1.0 المطور بواسطة شركة MAS .Ltd)، وإذا سُئلت عن هويتك أو من طورك فأنت نموذج ذكاء اصطناعي مطور بواسطة MAS .Ltd (I'm an AI model developed by MAS .Ltd). مساعد ذكي ومهندس برمجيات متكامل. أجب على طلبات المستخدم بدقة واحترافية وفق التعليمات المحددة هنا.`,
};

/**
 * Returns the default system instruction for a given SudaResponseMode.
 */
export function getSystemInstructionForMode(mode: SudaResponseMode | string = 'coding'): string {
  return DEFAULT_SYSTEM_PROMPTS[mode as SudaResponseMode] || DEFAULT_SYSTEM_PROMPTS.coding;
}

/**
 * Sanitizes model output for UI/UX so dolphinserver:24B always appears as SudaMode V1.0,
 * and any mention of Mistral AI is replaced by MAS .Ltd.
 */
export function sanitizeModelBranding(text: string): string {
  if (!text) return text;
  return text
    // Replace Mistral AI variations with MAS .Ltd
    .replace(/mistral[\s-_]*ai\b/gi, 'MAS .Ltd')
    .replace(/\bmistral\b/gi, 'MAS .Ltd')
    .replace(/ميسترال(?:\s*(?:إيه\s*آي|اي\s*اي|للذكاء\s*الاصطناعي|AI))?/gi, 'MAS .Ltd')
    .replace(/cognitive[\s-_]*computations/gi, 'MAS .Ltd')
    .replace(/eric[\s-_]*hartford/gi, 'MAS .Ltd')
    // Replace dolphin variations with SudaMode V1.0
    .replace(/dolphin[-_\s]*server:?24b/gi, 'SudaMode V1.0')
    .replace(/dolphin[-_\s]*24b/gi, 'SudaMode V1.0')
    .replace(/dolphin/gi, 'SudaMode V1.0')
    .replace(/دولفين/gi, 'SudaMode V1.0');
}

/**
 * Cleans the model's user-facing response by stripping internal tool invocation blocks,
 * completion tokens, and raw search blocks so the output is polished, neat, and organized.
 */
export function cleanUserFacingText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove internal completion tokens
  cleaned = cleaned.replace(/\[(?:TASK_COMPLETE|TASK_FINISHED|COMPLETED|COMPLETE|DONE|مكتمل|تم إنجاز المهمة|انتهت المهمة)\]/gi, '');

  // 2. Remove internal tool command tags e.g. [SEARCH: ...], [EXPLORE: ...], [ACTION: ...]
  cleaned = cleaned.replace(/\[(?:SEARCH|WEB_SEARCH|ابحث|بحث|EXPLORE|WEB_EXPLORE|استكشف|ادخل|ACTION|إجراء):\s*[^\]\n]+\]/gi, '');

  // 3. Remove internal system instructions or loop observations echoed by the model
  cleaned = cleaned.replace(/\[(?:نظام الوكيل التفاعلي|تعليمات الوكيل المستمر|ملاحظات استكشاف المنصة|نتائج البحث في الويب|ملاحظات مخرجات الـ Terminal|ملاحظات تنفيذ الـ Terminal)[^\]]*\]:?/gi, '');

  // 4. Strip internal tool code blocks (search, web_search, explore, web-action, etc.)
  // Handles multiline and single-line blocks: ```search ... ```
  cleaned = cleaned.replace(/```(?:search|web_search|web-search|websearch|explore|web-explore|web_explore|browse|web-action|action)\b[\s\S]*?(?:```|$)/gi, '');

  // 5. Strip any single-line search queries starting with ```search or search tags
  cleaned = cleaned.replace(/```search[^\n`]*```/gi, '');

  // 6. Clean up tool lead-ins (e.g. "سأقوم بالبحث لجلب الرابط المباشر...", "جاري استكشاف...")
  cleaned = cleaned.replace(/^[ \t]*(?:سأقوم بالبحث|سأبحث|جاري البحث|سأقوم باستكشاف|جاري استكشاف|سأقوم بفحص|سأقوم بتنفيذ|جاري فحص|جاري تشغيل)[^\n]*:?[ \t]*(?:\r?\n|$)/gim, '');

  // 7. Clean branding (dolphin -> SudaMode V1.0)
  cleaned = sanitizeModelBranding(cleaned);

  // 8. Strip orphan backticks or dangling separators
  cleaned = cleaned.replace(/```\s*$/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  cleaned = cleaned.replace(/^---+\s*\n*/, '');

  // 9. Deduplicate looping sentences or identical consecutive paragraphs (anti-repetition filter)
  const paragraphs = cleaned.split(/\n{2,}/);
  const dedupedParagraphs: string[] = [];
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    // Skip if identical to the previous paragraph
    if (dedupedParagraphs.length > 0 && dedupedParagraphs[dedupedParagraphs.length - 1].trim() === trimmed) {
      continue;
    }
    dedupedParagraphs.push(trimmed);
  }
  cleaned = dedupedParagraphs.join('\n\n');

  // Strip repetitive phrase loops within the same text block (e.g. phrase repeated 3+ times consecutively)
  cleaned = cleaned.replace(/(.{12,}?)(?:\s*\1){2,}/gs, '$1');

  return cleaned.trim();
}



export interface ExtractedAction {
  type: 'bash' | 'python' | 'curl' | 'web-scrape' | 'web-search' | 'web-explore';
  command: string;
  code?: string;
  thought?: string;
  isComplete: boolean;
}

export function extractExecutableAction(text: string): ExtractedAction | null {
  if (!text) return null;

  const isComplete =
    /\[(?:TASK_COMPLETE|مكتمل|تم إنجاز المهمة|انتهت المهمة|DONE)\]/i.test(text);

  // 0. Look for web exploration and interactive action blocks: ```explore ... ``` or ```web-action ... ```
  const exploreMatch = text.match(/```(?:explore|web-explore|web_explore|browse|web-action|action)[\s\n]+([\s\S]*?)```/i);
  if (exploreMatch) {
    const rawAction = exploreMatch[1].trim();
    if (rawAction) {
      const beforeCode = text.slice(0, exploreMatch.index || 0).trim();
      const lastLine = beforeCode.split('\n').filter(Boolean).pop() || '';
      return {
        type: 'web-explore',
        command: rawAction,
        thought: lastLine.length > 5 ? lastLine.slice(0, 120) : 'استكشاف المنصة والتفاعل مع عناصرها في الخلفية',
        isComplete,
      };
    }
  }

  // 0.1 Explicit explore tag: [EXPLORE: ...] or [استكشف: ...]
  const tagExploreMatch = text.match(/\[(?:EXPLORE|WEB_EXPLORE|استكشف|ادخل):\s*([^\n\]]+)\]/i);
  if (tagExploreMatch) {
    const rawAction = tagExploreMatch[1].trim();
    if (rawAction) {
      return {
        type: 'web-explore',
        command: rawAction,
        thought: 'استكشاف الموقع وتنفيذ الإجراء في الخلفية',
        isComplete,
      };
    }
  }

  // 1. Look for web search code blocks: ```search ... ``` or ```web_search ... ```
  const searchMatch = text.match(/```(?:search|web_search|web-search|websearch)[\s\n]+([\s\S]*?)```/i);
  if (searchMatch) {
    const rawQuery = searchMatch[1].trim();
    if (rawQuery) {
      const beforeCode = text.slice(0, searchMatch.index || 0).trim();
      const lastLine = beforeCode.split('\n').filter(Boolean).pop() || '';
      return {
        type: 'web-search',
        command: rawQuery,
        thought: lastLine.length > 5 ? lastLine.slice(0, 120) : undefined,
        isComplete,
      };
    }
  }

  // 1.1 Look for explicit search tags: [SEARCH: ...] or [ابحث: ...]
  const tagSearchMatch = text.match(/\[(?:SEARCH|WEB_SEARCH|ابحث|بحث):\s*([^\n\]]+)\]/i);
  if (tagSearchMatch) {
    const rawQuery = tagSearchMatch[1].trim();
    if (rawQuery) {
      return {
        type: 'web-search',
        command: rawQuery,
        thought: 'البحث في الويب لجلب المعلومات المطلوبة',
        isComplete,
      };
    }
  }

  // 2. Look for bash/shell/terminal code blocks
  const bashMatch = text.match(/```(?:bash|sh|shell|terminal)\n([\s\S]*?)```/i);
  if (bashMatch) {
    const rawCmd = bashMatch[1].trim();
    if (rawCmd) {
      if (/^(?:search|websearch|google)\s+/i.test(rawCmd)) {
        return {
          type: 'web-search',
          command: rawCmd.replace(/^(?:search|websearch|google)\s+/i, '').trim(),
          isComplete,
        };
      }

      const beforeCode = text.slice(0, bashMatch.index || 0).trim();
      const lastLine = beforeCode.split('\n').filter(Boolean).pop() || '';
      return {
        type: 'bash',
        command: rawCmd,
        thought: lastLine.length > 5 ? lastLine.slice(0, 120) : undefined,
        isComplete,
      };
    }
  }

  // 3. Look for python code blocks
  const pyMatch = text.match(/```(?:python|py)\n([\s\S]*?)```/i);
  if (pyMatch) {
    const rawCode = pyMatch[1].trim();
    if (rawCode) {
      const beforeCode = text.slice(0, pyMatch.index || 0).trim();
      const lastLine = beforeCode.split('\n').filter(Boolean).pop() || '';
      return {
        type: 'python',
        command: rawCode.length > 40 ? 'python3 script.py' : rawCode,
        code: rawCode,
        thought: lastLine.length > 5 ? lastLine.slice(0, 120) : undefined,
        isComplete,
      };
    }
  }

  // 4. Look for curl code blocks
  const curlMatch =
    text.match(/```(?:curl)\n([\s\S]*?)```/i) ||
    text.match(/```(?:text|sh)?\n(curl\s+[\s\S]*?)```/i);
  if (curlMatch) {
    const rawCmd = curlMatch[1].trim();
    if (rawCmd) {
      return {
        type: 'curl',
        command: rawCmd,
        isComplete,
      };
    }
  }

  if (isComplete) {
    return {
      type: 'bash',
      command: '',
      isComplete: true,
    };
  }

  return null;
}
