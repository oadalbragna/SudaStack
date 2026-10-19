import { TelegramStorageFile } from '../types';
import { sanitizeModelBranding, cleanUserFacingText } from './sudaEngine';

export interface DetectedAction {
  isCommandOrUrl: boolean;
  type: 'curl' | 'python' | 'web-scrape' | 'web-search' | 'web-explore';
  command: string;
  url?: string;
  code?: string;
  actionTarget?: string;
  wantsAnalysisFirst?: boolean;
}

export const detectCommandOrUrl = (input: string): DetectedAction | null => {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  const wantsAnalysisFirst =
    /(?:حلل|فحص|اشرح|تحليل|شرح|راجع|مراجعة).*(?:أولاً|اولا|قبل|ثم|ونفذ|نفذه|تشغيل|تنفيذ)/i.test(trimmed);

  // 0. Check web exploration and interactive action intent:
  // e.g. "خش هذا الموقع وبعدها اضغط علي زر تسجيل لدخول", "ادخل موقع ... واضغط تسجيل الدخول", "استكشف الموقع وسجل دخول"
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(?:com|org|net|io|co|ai|app|dev|me|tech)[^\s]*)/i;
  const isExploreActionIntent =
    /^(?:خش|ادخل|افتح|تصفح|استكشف|اذهب\s+إلى|انتقل\s+إلى|explore|browse|visit|navigate\s+to)\b/i.test(trimmed) ||
    /(?:واضغط|ثم\s+اضغط|واضغط\s+على|ثم\s+انقر|وانقر|وسجل\s+دخول|لتسجيل\s+الدخول|تسجيل\s+الدخول|زر|login|sign\s+in|click)\b/i.test(trimmed);

  if (isExploreActionIntent) {
    const urlMatch = trimmed.match(urlRegex);
    let targetUrl = urlMatch ? urlMatch[1] : '';
    if (targetUrl && !targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
    }

    // Extract action intent e.g. "اضغط علي زر تسجيل لدخول" or "تسجيل الدخول"
    const actionMatch = trimmed.match(
      /(?:واضغط\s+(?:لي\s+)?(?:على\s+|علي\s+)?(?:زر\s+)?|ثم\s+اضغط\s+(?:على\s+|علي\s+)?(?:زر\s+)?|وانقر\s+(?:على\s+|علي\s+)?|ثم\s+انقر\s+(?:على\s+|علي\s+)?|وسجل\s+|لتسجيل\s+|سجل\s+|click\s+(?:on\s+)?|press\s+)(.+)$/i
    );
    const actionTarget = actionMatch ? actionMatch[1].trim() : 'تسجيل الدخول';

    if (targetUrl || /موقع|منصة|رابط|صفحة|site|website|platform|خش|ادخل/i.test(trimmed)) {
      return {
        isCommandOrUrl: true,
        type: 'web-explore',
        command: targetUrl ? `${targetUrl} [الإجراء: ${actionTarget}]` : trimmed,
        url: targetUrl || undefined,
        actionTarget,
        wantsAnalysisFirst,
      };
    }
  }

  // 1. Check explicit web search intent: "ابحث عن ...", "ابحث في الإنترنت عن ...", "search for ...", "search ..."
  const searchExplicitMatch = trimmed.match(
    /^(?:ابحث\s+(?:لي\s+|بواسطة\s+الوكيل\s+|بالوكيل\s+)?(?:في\s+(?:الإنترنت|الانترنت|الويب|جوجل)\s+)?عن|قم\s+بالبحث\s+(?:في\s+(?:الإنترنت|الانترنت|الويب)\s+)?عن|بحث\s+(?:في\s+(?:الإنترنت|الانترنت|الويب)\s+)?عن|ابحث\s+في\s+(?:الإنترنت|الانترنت|الويب)\s+(?:عن|حول)?|search\s+(?:for|the\s+web\s+for|online\s+for)?|web_search:|web\s+search:)\s*:?\s*(.+)$/i
  );
  if (searchExplicitMatch) {
    const rawQuery = searchExplicitMatch[1].trim();
    if (rawQuery) {
      // Strip task instructions if present, e.g. "آخر أخبار الذكاء الاصطناعي واصنع جدولاً" -> "آخر أخبار الذكاء الاصطناعي"
      const taskSuffixMatch = rawQuery.match(
        /\s+(?:و|ثم)\s*(?:لخص(?:ها)?|اعمل|اصنع|ابن(?:ِ)?|اكتب|صمم|أنشئ|قم\s+ب|حول(?:ها)?|قدم|احفظ(?:ها)?).*$/i
      );
      const cleanSearchQuery = (taskSuffixMatch ? rawQuery.replace(taskSuffixMatch[0], '') : rawQuery).trim();

      return {
        isCommandOrUrl: true,
        type: 'web-search',
        command: cleanSearchQuery || rawQuery,
        wantsAnalysisFirst,
      };
    }
  }

  const searchCmdMatch = trimmed.match(/^(?:search|websearch|google)\s+(.+)$/i);
  if (searchCmdMatch) {
    const query = searchCmdMatch[1].trim();
    if (query) {
      return {
        isCommandOrUrl: true,
        type: 'web-search',
        command: query,
        wantsAnalysisFirst,
      };
    }
  }

  // 1. Check curl: Starts with curl, OR contains "curl https?://..." or "curl -..."
  const curlMatch = trimmed.match(/curl\s+([^\n\r]+)/i);
  if (/^curl(\s+.*)?$/i.test(trimmed) || curlMatch) {
    const fullCmd = curlMatch ? `curl ${curlMatch[1].trim()}` : trimmed;
    return {
      isCommandOrUrl: true,
      type: 'curl',
      command: fullCmd,
      wantsAnalysisFirst,
    };
  }

  // 2. Check python code snippet in markdown: ```python ... ```
  const pyBlockMatch = trimmed.match(/```(?:python|py)\n([\s\S]*?)```/i);
  if (pyBlockMatch) {
    const code = pyBlockMatch[1].trim();
    return {
      isCommandOrUrl: true,
      type: 'python',
      command: 'python3 script.py',
      code,
      wantsAnalysisFirst,
    };
  }

  // 3. Check python command: "python3 ...", "python ...", or "py ..."
  const pyCmdMatch = trimmed.match(/(?:python3|python|py)\s+([^\n\r]+)/i);
  if (pyCmdMatch) {
    const rawArgs = pyCmdMatch[1].trim();
    const codePart = rawArgs.replace(/^-c\s+['"]?|['"]?$/g, '');
    return {
      isCommandOrUrl: true,
      type: 'python',
      command: `python3 ${rawArgs}`,
      code: codePart,
      wantsAnalysisFirst,
    };
  }

  // 4. Check explicit request to run python: "نفذ كود بايثون: ..." or "شغل بايثون: ..."
  const pyExplicitMatch = trimmed.match(
    /(?:نفذ|شغل|تشغيل|تنفيذ|run|execute)\s*(?:كود|سكربت)?\s*(?:بايثون|python)\s*:?\s*([\s\S]+)/i
  );
  if (pyExplicitMatch) {
    const code = pyExplicitMatch[1].trim();
    return {
      isCommandOrUrl: true,
      type: 'python',
      command: code.length > 40 ? 'python3 script.py' : `python3 -c "${code}"`,
      code,
      wantsAnalysisFirst,
    };
  }

  // 5. Check web URL analysis (like Gemini):
  const standardUrlRegex = /(https?:\/\/[^\s]+)/i;
  const urlMatch = trimmed.match(standardUrlRegex);
  if (urlMatch) {
    const foundUrl = urlMatch[1];
    const isPureUrl = trimmed.length === foundUrl.length || /^https?:\/\/[^\s]+$/i.test(trimmed);
    const hasAnalyzeKeyword =
      /(?:حلل|فحص|استخرج|معاينة|افحص|اقرأ|موقع|رابط|تحليل|شرح|بيانات|analyze|inspect|scrape|fetch|read|check)\b/i.test(
        trimmed
      );

    if (isPureUrl || hasAnalyzeKeyword) {
      return {
        isCommandOrUrl: true,
        type: 'web-scrape',
        command: foundUrl,
        url: foundUrl,
        wantsAnalysisFirst,
      };
    }
  }

  return null;
};

// Helper to extract substantive code blocks into files and keep message text clean, structured and without code dumps
export const formatMessageWithFiles = (rawText: string, isArabic: boolean): { cleanText: string; files: TelegramStorageFile[] } => {
  const codeBlockRegex = /```([^\r\n]*)(?:\r?\n)([\s\S]*?)(?:```|$)/g;
  let match;
  let fileIdx = 1;
  const files: TelegramStorageFile[] = [];

  const INTERNAL_TOOL_LANGS = new Set([
    'search',
    'web_search',
    'web-search',
    'websearch',
    'explore',
    'web-explore',
    'web_explore',
    'browse',
    'web-action',
    'action',
    'terminal',
    'stdout',
    'stderr',
    'output',
    'bash',
    'sh',
    'shell',
    'curl',
    'pip',
    'pip3',
    'text',
    'txt',
  ]);

  let htmlCode = '';
  let cssCode = '';
  let jsCode = '';
  let jsonCode = '';
  let explicitPathHtml = '';
  let explicitPathCss = '';
  let explicitPathJs = '';

  // Helper to extract or derive a project folder name from text
  const extractProjectFolder = (text: string): string => {
    // 1. Look for explicit folder tag: e.g. 📁 **مجلد المشروع: [my-project]** or [FOLDER: my-project] or 📁 [my-project]
    const explicitFolderMatch = text.match(
      /(?:📁\s*(?:\*\*)?مجلد\s+(?:المشروع|المنصة)?:\s*\[?([a-zA-Z0-9_\u0600-\u06FF-]+)\]?|\[(?:FOLDER|PROJECT_FOLDER|مجلد):\s*([a-zA-Z0-9_\u0600-\u06FF-]+)\])/i
    );
    if (explicitFolderMatch) {
      const val = (explicitFolderMatch[1] || explicitFolderMatch[2]).trim().replace(/\s+/g, '-');
      if (val) return val;
    }

    // 2. Look for path in code blocks or headers: e.g. path="my-store/index.html" or ### `my-store/index.html`
    const pathMatch = text.match(
      /(?:path=["']|###\s*[`*]?|📁\s*[`*]?)([a-zA-Z0-9_\u0600-\u06FF-]+)\/(?:index\.html|style\.css|app\.js|main\.js)/i
    );
    if (pathMatch) {
      return pathMatch[1].trim();
    }

    // 3. Look for title tag inside HTML
    const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const titleClean = titleMatch[1].replace(/[-|•].*$/, '').trim();
      if (
        titleClean.length >= 3 &&
        titleClean.length < 30 &&
        !/document|untitled|my site/i.test(titleClean)
      ) {
        const slug = titleClean.replace(/\s+/g, '-').replace(/[^\w\u0600-\u06FF-]/g, '').toLowerCase();
        if (slug.length >= 3) return slug;
      }
    }

    // 4. Look for project topic in Arabic/English
    if (/متجر|تسوق|shopping|store|ecommerce/i.test(text)) return 'ecommerce-platform';
    if (/لوحة\s*تحكم|dashboard|admin/i.test(text)) return 'smart-dashboard';
    if (/تعليم|مدرسة|academy|learning|course|school/i.test(text)) return 'learning-hub';
    if (/معرض|بورتفوليو|portfolio|شخصي/i.test(text)) return 'portfolio-pro';
    if (/عيادة|طبي|clinic|hospital|صيدلية/i.test(text)) return 'clinic-system';
    if (/مطعم|وجبات|restaurant|food|كافيه|cafe/i.test(text)) return 'restaurant-site';
    if (/عقار|عقارات|real\s*estate/i.test(text)) return 'real-estate-hub';
    if (/شركة|مؤسسة|company|agency|corporate/i.test(text)) return 'company-portal';
    if (/دردشة|تواصل|chat|social|messenger/i.test(text)) return 'social-hub';
    if (/حجز|حجوزات|booking|hotel|فندق/i.test(text)) return 'booking-system';
    if (/ألعاب|game|arcade/i.test(text)) return 'gaming-portal';

    return 'web-platform';
  };

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    const rawHeader = (match[1] || '').trim();
    const rawLang = (rawHeader.split(/\s+/)[0] || '').toLowerCase().trim();
    const codeContent = match[2].trim();

    // Check if code fence has a path e.g. path="store/style.css"
    const pathAttrMatch = rawHeader.match(/(?:path|file)=["']?([^"'\s]+)["']?/i);
    const codeFencePath = pathAttrMatch ? pathAttrMatch[1].trim() : '';

    // Check if previous lines contain a header like ### `store/style.css`
    const preText = rawText.slice(Math.max(0, match.index - 120), match.index);
    const preHeaderMatch = preText.match(/###\s*[`*]?([a-zA-Z0-9_./\u0600-\u06FF-]+)[`*]?/i);
    const headerPath = preHeaderMatch ? preHeaderMatch[1].trim() : '';

    const effectivePath = codeFencePath || headerPath;

    // Skip internal tool syntax, search queries, or empty blocks
    if (
      INTERNAL_TOOL_LANGS.has(rawLang) ||
      /^(?:search|web_search|web-search|websearch|explore|web-explore|web_explore|browse|web-action|action|pip|pip3)\b/i.test(rawLang) ||
      codeContent.length < 25
    ) {
      continue;
    }

    // Determine actual language
    let lang = rawLang;
    if (!lang) {
      if (codeContent.includes('<!DOCTYPE') || (codeContent.includes('<html') && codeContent.includes('</html>'))) {
        lang = 'html';
      } else if (codeContent.includes('def ') || codeContent.includes('import ') || codeContent.includes('print(')) {
        lang = 'python';
      } else if (codeContent.includes('#include')) {
        lang = 'cpp';
      } else {
        continue; // Unlabelled text snippet, do not convert to a file
      }
    }

    if (lang === 'html' || lang === 'htm' || effectivePath.endsWith('.html')) {
      // Must look like an actual HTML web page/application
      if (
        codeContent.length > 80 &&
        (/<!doctype/i.test(codeContent) ||
          (/<html[\s>]/i.test(codeContent) && /<\/html>/i.test(codeContent)) ||
          (/<head[\s>]/i.test(codeContent) && /<body[\s>]/i.test(codeContent)) ||
          (/<div\s+id=["'](?:root|app)["']/i.test(codeContent) && /<(?:button|input|h1|h2|nav|header|footer)/i.test(codeContent)))
      ) {
        htmlCode = codeContent;
        if (effectivePath) explicitPathHtml = effectivePath;
      }
    } else if (lang === 'css' || effectivePath.endsWith('.css')) {
      if (codeContent.includes('{') && codeContent.includes('}')) {
        cssCode = codeContent;
        if (effectivePath) explicitPathCss = effectivePath;
      }
    } else if (lang === 'javascript' || lang === 'js' || effectivePath.endsWith('.js')) {
      if (codeContent.length > 30 && /(?:const |let |var |function |document\.|window\.|console\.)/.test(codeContent)) {
        jsCode = codeContent;
        if (effectivePath) explicitPathJs = effectivePath;
      }
    } else if (lang === 'json' || effectivePath.endsWith('.json')) {
      if (codeContent.startsWith('{') || codeContent.startsWith('[')) {
        jsonCode = codeContent;
      }
    } else if (lang === 'python' || lang === 'py') {
      if (codeContent.length > 35 && /(?:def |import |class |print\(|for |while |return )/.test(codeContent)) {
        files.push({
          id: `tg-ai-${Date.now()}-${fileIdx++}`,
          name: 'main.py',
          type: 'python',
          category: 'code',
          sizeBytes: codeContent.length,
          content: codeContent,
          createdAt: new Date().toISOString(),
          createdBy: 'ai',
          description: isArabic
            ? 'ملف Python مرمز ومجهز بالكامل في مساحة SudaStack'
            : 'Python file saved in SudaStack Cloud',
          telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
        });
      }
    } else if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
      if (codeContent.length > 30 && /(?:#include|int main)/.test(codeContent)) {
        files.push({
          id: `tg-ai-${Date.now()}-${fileIdx++}`,
          name: 'main.cpp',
          type: 'cpp',
          category: 'code',
          sizeBytes: codeContent.length,
          content: codeContent,
          createdAt: new Date().toISOString(),
          createdBy: 'ai',
          description: isArabic
            ? 'ملف C++ مرمز ومجهز بالكامل في مساحة SudaStack'
            : 'C++ file saved in SudaStack Cloud',
          telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
        });
      }
    }
  }

  // Intelligent Platform Decomposer:
  // If the user requested a full website/platform or the HTML is large, and contains internal <style> and <script>:
  // Automatically extract them into separate style.css and app.js files so it creates a proper multi-file project!
  const hasSubstantialInternalStyle =
    htmlCode && /<style[^>]*>([\s\S]{50,}?)<\/style>/i.test(htmlCode);
  const hasSubstantialInternalScript =
    htmlCode && /<script[^>]*>([\s\S]{40,}?)<\/script>/i.test(htmlCode);
  const isWebsiteRequest =
    /(?:موقع|منصة|متجر|dashboard|لوحة\s*تحكم|website|web\s*app|platform|نظام|portfolio|بورتفوليو)/i.test(
      rawText
    );

  if (htmlCode && (hasSubstantialInternalStyle || hasSubstantialInternalScript || isWebsiteRequest)) {
    // If no separate CSS was provided, extract it from <style>
    if (!cssCode && hasSubstantialInternalStyle) {
      const styleMatches = [...htmlCode.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
      const combinedStyle = styleMatches.map((m) => m[1].trim()).filter((s) => s.length > 20).join('\n\n');
      if (combinedStyle.length > 50) {
        cssCode = combinedStyle;
        htmlCode = htmlCode.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '  <link rel="stylesheet" href="style.css">');
      }
    }

    // If no separate JS was provided, extract it from <script>
    if (!jsCode && hasSubstantialInternalScript) {
      const scriptMatches = [...htmlCode.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
      const combinedScript = scriptMatches
        .map((m) => m[1].trim())
        .filter((s) => s.length > 20 && !s.includes('window.parent.postMessage'))
        .join('\n\n');
      if (combinedScript.length > 40) {
        jsCode = combinedScript;
        htmlCode = htmlCode.replace(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi, '');
      }
    }
  }

  // If HTML and companion files (CSS, JS, or JSON) exist, OR it's a website platform request:
  const isIntegratedProject = Boolean(
    (htmlCode && (cssCode || jsCode || jsonCode)) ||
    (htmlCode && isWebsiteRequest && htmlCode.length > 350)
  );

  if (isIntegratedProject) {
    const projectFolder = extractProjectFolder(rawText);

    // Ensure index.html references the companion style.css and app.js
    let projectHtml = htmlCode;
    if (cssCode && !projectHtml.includes('style.css')) {
      if (projectHtml.includes('</head>')) {
        projectHtml = projectHtml.replace('</head>', `  <link rel="stylesheet" href="style.css">\n</head>`);
      } else {
        projectHtml = `<link rel="stylesheet" href="style.css">\n` + projectHtml;
      }
    }
    if (jsCode && !projectHtml.includes('app.js')) {
      if (projectHtml.includes('</body>')) {
        projectHtml = projectHtml.replace('</body>', `  <script src="app.js"></script>\n</body>`);
      } else {
        projectHtml = projectHtml + `\n<script src="app.js"></script>`;
      }
    }

    // 1. Main Entrypoint HTML file
    files.push({
      id: `tg-ai-${Date.now()}-html`,
      name: 'index.html',
      type: 'html',
      category: 'web',
      folder: projectFolder,
      path: `${projectFolder}/index.html`,
      isProjectMain: true,
      sizeBytes: projectHtml.length,
      content: projectHtml,
      createdAt: new Date().toISOString(),
      createdBy: 'ai',
      description: isArabic
        ? `الصفحة الرئيسية لمنصة [${projectFolder}] جاهزة للمعاينة المباشرة وتعديل الأكواد`
        : `Main HTML entrypoint for [${projectFolder}] ready for Live Preview and Editing`,
      telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
    });

    // 2. Separate CSS stylesheet
    if (cssCode) {
      files.push({
        id: `tg-ai-${Date.now()}-css`,
        name: 'style.css',
        type: 'css',
        category: 'code',
        folder: projectFolder,
        path: `${projectFolder}/style.css`,
        sizeBytes: cssCode.length,
        content: cssCode,
        createdAt: new Date().toISOString(),
        createdBy: 'ai',
        description: isArabic
          ? `ملف التنسيقات والأنماط (CSS) لمشروع [${projectFolder}]`
          : `Stylesheet (CSS) for project [${projectFolder}]`,
        telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      });
    }

    // 3. Separate JavaScript application file
    if (jsCode) {
      files.push({
        id: `tg-ai-${Date.now()}-js`,
        name: 'app.js',
        type: 'javascript',
        category: 'code',
        folder: projectFolder,
        path: `${projectFolder}/app.js`,
        sizeBytes: jsCode.length,
        content: jsCode,
        createdAt: new Date().toISOString(),
        createdBy: 'ai',
        description: isArabic
          ? `ملف البرمجة التفاعلية (JavaScript) لمشروع [${projectFolder}]`
          : `Interactive Logic (JS) for project [${projectFolder}]`,
        telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      });
    }

    // 4. Companion Data JSON file (if generated)
    if (jsonCode) {
      files.push({
        id: `tg-ai-${Date.now()}-json`,
        name: 'data.json',
        type: 'json',
        category: 'data',
        folder: projectFolder,
        path: `${projectFolder}/data.json`,
        sizeBytes: jsonCode.length,
        content: jsonCode,
        createdAt: new Date().toISOString(),
        createdBy: 'ai',
        description: isArabic
          ? `ملف البيانات وقاعدة البيانات النموذجية (JSON) لمشروع [${projectFolder}]`
          : `Mock Data / Config (JSON) for project [${projectFolder}]`,
        telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      });
    }
  } else if (htmlCode) {
    // Single standalone HTML document
    files.unshift({
      id: `tg-ai-${Date.now()}-html`,
      name: 'index.html',
      type: 'html',
      category: 'web',
      sizeBytes: htmlCode.length,
      content: htmlCode,
      createdAt: new Date().toISOString(),
      createdBy: 'ai',
      description: isArabic
        ? 'صفحة HTML تفاعلية مع معاينة حية وتشغيل سحابي في SudaStack'
        : 'Interactive HTML file ready for Live Preview in SudaStack',
      telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
    });
  } else {
    // If only standalone CSS, JS or JSON was generated without HTML
    if (cssCode && cssCode.length > 50) {
      files.push({
        id: `tg-ai-${Date.now()}-css`,
        name: 'style.css',
        type: 'css',
        category: 'code',
        sizeBytes: cssCode.length,
        content: cssCode,
        createdAt: new Date().toISOString(),
        createdBy: 'ai',
        description: isArabic ? 'ملف CSS محفوظ في SudaStack' : 'CSS file saved in SudaStack',
        telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      });
    }
    if (jsCode && jsCode.length > 50) {
      files.push({
        id: `tg-ai-${Date.now()}-js`,
        name: 'script.js',
        type: 'javascript',
        category: 'code',
        sizeBytes: jsCode.length,
        content: jsCode,
        createdAt: new Date().toISOString(),
        createdBy: 'ai',
        description: isArabic ? 'ملف JavaScript محفوظ في SudaStack' : 'JavaScript file saved in SudaStack',
        telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      });
    }
    if (jsonCode && jsonCode.length > 20) {
      files.push({
        id: `tg-ai-${Date.now()}-json`,
        name: 'data.json',
        type: 'json',
        category: 'data',
        sizeBytes: jsonCode.length,
        content: jsonCode,
        createdAt: new Date().toISOString(),
        createdBy: 'ai',
        description: isArabic ? 'ملف JSON محفوظ في SudaStack' : 'JSON file saved in SudaStack',
        telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      });
    }
  }

  // Clean the response text from internal tokens, search blocks, and brand leakages
  let cleanText = cleanUserFacingText(rawText);

  // Add confirmation note ONLY if real substantive files were created
  if (files.length > 0) {
    const projectFolder = files[0].folder;
    if (projectFolder && files.length > 1) {
      const fileNamesList = files.map((f) => f.name).join(', ');
      const confirmationNote = isArabic
        ? `\n\n✨ **تم إنشاء منصة المشروع المتكاملة [📁 ${projectFolder}] بنجاح، ويحتوي المجلد على ${files.length} ملفات (${fileNamesList}).** يمكنك النقر على "تجربة المنصة مباشرة 🚀" لتشغيلها بكافة ملفاتها فورياً، أو التبديل وتعديل أكوادها بسهولة في محرر الأكواد.`
        : `\n\n✨ **Created integrated platform in folder [📁 ${projectFolder}] with ${files.length} files (${fileNamesList}).** Click "Run Live 🚀" to test immediately with all assets, or edit files easily in Code Editor.`;

      if (!cleanText.includes(projectFolder) && !cleanText.includes('تم إنشاء')) {
        cleanText += confirmationNote;
      }
    } else {
      const fileName = files[0].name;
      const confirmationNote = isArabic
        ? `\n\n✨ **تم حفظ الملف البرمجي [${fileName}] تلقائياً داخل مساحة SudaStack السحابية المرفقة أدناه.** يمكنك النقر على "معاينة وتشغيل" للمعاينة الفورية، أو فحص أسطر الكود والـline.`
        : `\n\n✨ **Saved code file [${fileName}] to SudaStack Cloud Space below.** Click "Run Live" or inspect lines.`;

      if (!cleanText.includes(fileName) && !cleanText.includes('تم حفظ')) {
        cleanText += confirmationNote;
      }
    }
  }

  return { cleanText, files };
};
