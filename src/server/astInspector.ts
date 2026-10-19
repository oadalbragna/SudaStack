export interface AstCallSite {
  line: number;
  varName?: string;
  promptText?: string;
  inferredValue?: any;
}

export interface AstAnalysisResult {
  hasInteractiveInput: boolean;
  inputCallSites: AstCallSite[];
  inferredInputs: Record<string, any>;
  monkeypatchedCode: string;
  parameterizedCode: string;
  strategy: string;
  summary: string;
}

/**
 * Intelligent AST and Syntax Inspector for interactive inputs
 * Handles Python input(), sys.stdin, and interactive prompts without waiting for humans.
 */
export function inspectAndTransformInteractiveCode(
  code: string,
  userTaskDescription: string = '',
  knownInputs: Record<string, any> = {}
): AstAnalysisResult {
  const callSites: AstCallSite[] = [];
  const lines = code.split('\n');

  // Regex patterns detecting input() in Python
  const inputPattern = /(?:([a-zA-Z0-9_]+)\s*=\s*)?(?:[a-zA-Z0-9_.]+\s*\(\s*)?input\s*\(\s*(['"][^'"]*['"])?\s*\)/g;
  const sysStdinPattern = /sys\.stdin\.(?:readline|read)\s*\(\)/g;

  lines.forEach((lineText, idx) => {
    let match;
    while ((match = inputPattern.exec(lineText)) !== null) {
      const varName = match[1];
      const rawPrompt = match[2];
      const promptText = rawPrompt ? rawPrompt.slice(1, -1) : undefined;
      callSites.push({
        line: idx + 1,
        varName,
        promptText,
      });
    }

    if (sysStdinPattern.test(lineText)) {
      callSites.push({
        line: idx + 1,
        promptText: 'sys.stdin stream read',
      });
    }
  });

  const hasInteractiveInput = callSites.length > 0;

  if (!hasInteractiveInput) {
    return {
      hasInteractiveInput: false,
      inputCallSites: [],
      inferredInputs: {},
      monkeypatchedCode: code,
      parameterizedCode: code,
      strategy: 'none',
      summary: 'الكود جاهز للتنفيذ المباشر ولا يحتوي على دوال إدخال تفاعلي (input)',
    };
  }

  // 1. Semantic Inference from userTaskDescription and prompt texts
  const inferredInputs: Record<string, string> = { ...knownInputs };
  const inferredValuesList: string[] = [];

  const combinedContext = `${userTaskDescription} ${callSites.map((c) => c.promptText || '').join(' ')}`.toLowerCase();

  // URL matching
  const urlRegex = /https?:\/\/[^\s'"]+/i;
  const urlMatch = userTaskDescription.match(urlRegex);
  const detectedUrl = urlMatch ? urlMatch[0] : 'https://example.com';

  callSites.forEach((site, index) => {
    const key = site.varName || `input_${index + 1}`;
    let value = '';

    const p = (site.promptText || '').toLowerCase();

    if (p.includes('url') || p.includes('موقع') || p.includes('رابط') || p.includes('website') || p.includes('domain') || combinedContext.includes('موقع') || combinedContext.includes('url')) {
      value = detectedUrl;
    } else if (p.includes('email') || p.includes('بريد') || p.includes('إيميل')) {
      value = 'test_user@example.com';
    } else if (p.includes('pass') || p.includes('كلمة مرور') || p.includes('رمز')) {
      value = 'SecureP@ssw0rd123';
    } else if (p.includes('name') || p.includes('اسم') || p.includes('مستخدم') || p.includes('user')) {
      value = 'SudaUser';
    } else if (p.includes('age') || p.includes('عمر') || p.includes('سنة')) {
      value = '25';
    } else if (p.includes('num') || p.includes('رقم') || p.includes('عدد') || p.includes('count') || p.includes('amount')) {
      // Look for numbers in user description
      const numMatch = userTaskDescription.match(/\b\d+\b/);
      value = numMatch ? numMatch[0] : '10';
    } else if (p.includes('file') || p.includes('ملف') || p.includes('مسار') || p.includes('path')) {
      value = 'sample_data.txt';
    } else if (p.includes('city') || p.includes('مدينة') || p.includes('بلد') || p.includes('country')) {
      value = 'Khartoum';
    } else {
      // General heuristic
      value = `test_val_${index + 1}`;
    }

    inferredInputs[key] = value;
    site.inferredValue = value;
    inferredValuesList.push(value);
  });

  // 2. Build non-blocking Monkeypatch Preamble
  const safeJsonValues = JSON.stringify(inferredValuesList);
  const monkeypatchPreamble = `# ==============================================================================
# [SudaStack Autonomous AST Monkeypatch]
# Automatically injected to handle interactive input() non-blockingly without human stall.
# Inferred values from task context: ${JSON.stringify(inferredInputs)}
# ==============================================================================
import sys

class _SudaAutonomousInputManager:
    def __init__(self, values):
        self._values = list(values)
        self._index = 0

    def __call__(self, prompt=""):
        if prompt:
            sys.stdout.write(str(prompt))
            sys.stdout.flush()
        if self._index < len(self._values):
            val = str(self._values[self._index])
            self._index += 1
            sys.stdout.write(f"{val}\\n")
            sys.stdout.flush()
            return val
        sys.stdout.write("\\n")
        sys.stdout.flush()
        return ""

input = _SudaAutonomousInputManager(${safeJsonValues})
raw_input = input
# ==============================================================================

`;

  const monkeypatchedCode = monkeypatchPreamble + code;

  // 3. Generate Parameterized Function Variant
  const paramNames = callSites.map((c, i) => c.varName || `arg_${i + 1}`).join(', ');
  const parameterizedCode = `# [Parameterized Variant generated by Autonomous Coder]
def execute_task(${paramNames}):
    \"\"\"
    Refactored version of interactive script receiving arguments directly.
    \"\"\"
    # ... logic parameterized
    pass
`;

  return {
    hasInteractiveInput: true,
    inputCallSites: callSites,
    inferredInputs,
    monkeypatchedCode,
    parameterizedCode,
    strategy: 'monkeypatch',
    summary: `تم اكتشاف ${callSites.length} استدعاء تفاعلي لـ input() وتم حقن القيم المستنتجة تلقائياً [${inferredValuesList.join(', ')}] دون انتظار تدخل بشري.`,
  };
}
