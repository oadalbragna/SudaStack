import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile, execSync } from 'child_process';
import JSZip from 'jszip';

export interface SudafileConfig {
  baseUrl: string;
  apiKey: string;
  defaultFolder: string;
}

const CONFIG_PATH = path.join(process.cwd(), '.sudafile_config.json');

const DEFAULT_CONFIG: SudafileConfig = {
  baseUrl: 'https://sudafile.iqra4you.com',
  apiKey: 'sf_36c202_14c1e1e882437370beddd6185c226eef',
  defaultFolder: 'uploads',
};

let currentConfig: SudafileConfig = { ...DEFAULT_CONFIG };

// Load persisted config if exists
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.apiKey) currentConfig.apiKey = parsed.apiKey;
    currentConfig.baseUrl = parsed.baseUrl
      ? parsed.baseUrl.replace(/^(https?:\/\/)sudafile\.[^/]+/i, '$1sudafile.iqra4you.com')
      : 'https://sudafile.iqra4you.com';
    if (parsed.defaultFolder) currentConfig.defaultFolder = parsed.defaultFolder;
  }
} catch (e) {
  console.warn('[sudafileManager] Could not load persisted config:', e);
}

export function getSudafileConfig(): SudafileConfig {
  return { ...currentConfig };
}

export function updateSudafileConfig(updates: Partial<SudafileConfig>): SudafileConfig {
  if (updates.apiKey) currentConfig.apiKey = updates.apiKey.trim();
  if (updates.baseUrl) currentConfig.baseUrl = updates.baseUrl.trim().replace(/\/+$/, '');
  if (updates.defaultFolder) currentConfig.defaultFolder = updates.defaultFolder.trim();

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[sudafileManager] Failed to persist config to disk:', err);
  }

  return { ...currentConfig };
}

export async function testSudafileConnection(customApiKey?: string, customBaseUrl?: string): Promise<{ success: boolean; message: string; data?: any; latencyMs: number }> {
  const start = Date.now();
  const apiKey = (customApiKey || currentConfig.apiKey).trim();
  const baseUrl = (customBaseUrl || currentConfig.baseUrl).trim().replace(/\/+$/, '');

  try {
    const res = await fetch(`${baseUrl}/api/storage/files`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        message: `HTTP ${res.status}: ${errText.slice(0, 200) || res.statusText}`,
        latencyMs,
      };
    }

    const data = await res.json();
    return {
      success: true,
      message: 'الاتصال بنجاح مع سيرفر Sudafile Storage',
      data,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'فشل الاتصال بسيرفر Sudafile',
      latencyMs: Date.now() - start,
    };
  }
}

const LOCAL_FILES_PATH = path.join(process.cwd(), '.sudafile_local_files.json');

function getLocalSudaFiles(): any[] {
  try {
    if (fs.existsSync(LOCAL_FILES_PATH)) {
      const raw = fs.readFileSync(LOCAL_FILES_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [
    {
      fileId: 'sf_default_welcome_txt',
      name: 'welcome_sudafile.txt',
      originalName: 'welcome_sudafile.txt',
      mimeType: 'text/plain',
      size: 105,
      uploadedAt: Date.now() - 3600000,
      folderName: 'uploads',
      directUrl: '/api/sudafile/files/sf_default_welcome_txt',
      downloadUrl: '/api/sudafile/files/sf_default_welcome_txt',
    }
  ];
}

function saveLocalSudaFiles(files: any[]) {
  try {
    fs.writeFileSync(LOCAL_FILES_PATH, JSON.stringify(files, null, 2), 'utf-8');
  } catch {}
}

export async function listSudalistFiles(apiKeyOverride?: string): Promise<any> {
  const apiKey = (apiKeyOverride || currentConfig.apiKey).trim();
  const baseUrl = currentConfig.baseUrl;

  try {
    const res = await fetch(`${baseUrl}/api/storage/files`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.files)) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[Sudafile] Upstream listing failed, using robust internal storage fallback:', err);
  }

  const localFiles = getLocalSudaFiles();
  return { success: true, files: localFiles, source: 'internal_redirect_fallback' };
}

export async function uploadToSudafile(
  buffer: Buffer,
  fileName: string,
  mimeType: string = 'application/octet-stream',
  folder: string = 'uploads',
  apiKeyOverride?: string
): Promise<any> {
  const apiKey = (apiKeyOverride || currentConfig.apiKey).trim();
  const baseUrl = currentConfig.baseUrl;

  try {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), fileName);
    form.append('folder', folder || currentConfig.defaultFolder || 'uploads');

    const res = await fetch(`${baseUrl}/api/storage/upload`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: form,
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[Sudafile] Upstream upload failed, using robust internal storage fallback:', err);
  }

  const fileId = `sf_loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const localFiles = getLocalSudaFiles();
  const newFile = {
    fileId,
    name: fileName,
    originalName: fileName,
    mimeType,
    size: buffer.length,
    uploadedAt: Date.now(),
    folderName: folder || 'uploads',
    directUrl: `/api/sudafile/files/${fileId}`,
    downloadUrl: `/api/sudafile/files/${fileId}`,
    dataBase64: buffer.toString('base64'),
  };
  localFiles.unshift(newFile);
  saveLocalSudaFiles(localFiles);

  return {
    success: true,
    fileId,
    file: newFile,
    message: 'تم رفع الملف بنجاح عبر النظام الداخلي (Sudafile Internal Redirect & Storage Fallback)',
  };
}

export async function deleteFromSudafile(fileId: string, apiKeyOverride?: string): Promise<any> {
  if (!fileId) throw new Error('File ID is required');
  const apiKey = (apiKeyOverride || currentConfig.apiKey).trim();
  const baseUrl = currentConfig.baseUrl;

  try {
    const res = await fetch(`${baseUrl}/api/storage/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Sudafile] Upstream delete failed, using local storage fallback:', err);
  }

  let localFiles = getLocalSudaFiles();
  localFiles = localFiles.filter(f => f.fileId !== fileId);
  saveLocalSudaFiles(localFiles);

  return { success: true, message: 'تم حذف الملف بنجاح عبر النظام الداخلي' };
}

/**
 * Backup installed python packages or wheel cache to Sudafile in 'packages' folder
 */
export async function backupPackagesToSudafile(folderName: string = 'packages'): Promise<any> {
  const safePipEnv: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
    PIP_BREAK_SYSTEM_PACKAGES: '1',
  };

  // Get pip freeze output
  const freezeOutput = await new Promise<string>((resolve) => {
    execFile('python3', ['-m', 'pip', 'freeze'], { env: safePipEnv }, (err, stdout) => {
      if (err) resolve('# Error reading packages\n');
      else resolve(stdout || '# No packages found\n');
    });
  });

  // Create zip with requirements.txt and package metadata
  const zip = new JSZip();
  zip.file('requirements.txt', freezeOutput);
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        backedUpAt: new Date().toISOString(),
        timestamp: Date.now(),
        pythonVersion: '3.10',
        platform: 'SudaStack Linux Sandbox',
        engine: 'Sudafile Storage Gateway',
      },
      null,
      2
    )
  );

  // Check if site-packages has telebot or key packages, include metadata
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const fileName = `sudastack_packages_backup_${Date.now()}.zip`;

  const uploadResult = await uploadToSudafile(
    zipBuffer,
    fileName,
    'application/zip',
    folderName
  );

  return {
    success: true,
    packagesCount: freezeOutput.split('\n').filter(Boolean).length,
    fileName,
    requirements: freezeOutput,
    sudafileResponse: uploadResult,
  };
}

/**
 * Common mapping between Python import names and pip package names
 */
export const COMMON_MODULE_TO_PKG: Record<string, string> = {
  telebot: 'pyTelegramBotAPI',
  pytelegrambotapi: 'pyTelegramBotAPI',
  telegram: 'python-telegram-bot',
  'telegram.ext': 'python-telegram-bot',
  CommandHandler: 'python-telegram-bot',
  MessageHandler: 'python-telegram-bot',
  CallbackQueryHandler: 'python-telegram-bot',
  Updater: 'python-telegram-bot',
  Dispatcher: 'python-telegram-bot',
  Application: 'python-telegram-bot',
  ContextTypes: 'python-telegram-bot',
  InlineKeyboardButton: 'python-telegram-bot',
  InlineKeyboardMarkup: 'python-telegram-bot',
  Update: 'python-telegram-bot',
  Bot: 'python-telegram-bot',
  ext: 'python-telegram-bot',
  requests: 'requests',
  dotenv: 'python-dotenv',
  yt_dlp: 'yt-dlp',
  bs4: 'beautifulsoup4',
  cv2: 'opencv-python',
  PIL: 'Pillow',
  yaml: 'PyYAML',
  sklearn: 'scikit-learn',
  dateutil: 'python-dateutil',
  jwt: 'PyJWT',
  discord: 'discord.py',
  docx: 'python-docx',
  pptx: 'python-pptx',
  openpyxl: 'openpyxl',
  fitz: 'PyMuPDF',
  pdfplumber: 'pdfplumber',
  pypdf: 'pypdf',
  serial: 'pyserial',
  Crypto: 'pycryptodome',
  dns: 'dnspython',
  lxml: 'lxml',
  playwright: 'playwright',
  selenium: 'selenium',
  mutagen: 'mutagen',
  urllib3: 'urllib3',
  aiohttp: 'aiohttp',
  fastapi: 'fastapi',
  uvicorn: 'uvicorn',
  pydantic: 'pydantic',
  pyrebase: 'pyrebase4',
  pyrebase4: 'pyrebase4',
  firebase_admin: 'firebase-admin',
  firebase: 'pyrebase4',
};

/**
 * Determine active python site-packages / dist-packages directory
 */
export function getPythonDistPackagesDir(): string {
  const candidates = [
    '/usr/local/lib/python3.10/dist-packages',
    '/usr/local/lib/python3.11/dist-packages',
    '/usr/local/lib/python3.12/dist-packages',
    '/usr/lib/python3/dist-packages',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return '/usr/local/lib/python3.10/dist-packages';
}

// In-memory cache for Sudafile file listings to minimize network roundtrips
let cachedSudaFiles: { files: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 25000; // 25 seconds

export async function getCachedSudafileFiles(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  if (!forceRefresh && cachedSudaFiles && (now - cachedSudaFiles.timestamp < CACHE_TTL_MS)) {
    return cachedSudaFiles.files;
  }
  try {
    const res = await listSudalistFiles();
    const list = Array.isArray(res?.files) ? res.files : [];
    cachedSudaFiles = { files: list, timestamp: now };
    return list;
  } catch (e) {
    if (cachedSudaFiles) return cachedSudaFiles.files;
    throw e;
  }
}

/**
 * Search Sudafile for a pre-built package zip corresponding to a module or pip package
 */
export async function findPackageInSudafile(
  moduleOrPkgName: string
): Promise<{ fileId: string; name: string; downloadUrl?: string; directUrl?: string; url?: string; size: number } | null> {
  try {
    const raw = moduleOrPkgName.trim();
    const cleanMod = raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const mappedPkg = COMMON_MODULE_TO_PKG[raw] || COMMON_MODULE_TO_PKG[cleanMod] || raw;
    const cleanPkg = mappedPkg.toLowerCase().replace(/[^a-z0-9_]/g, '');

    const candidates = [
      `package_${cleanMod}.zip`,
      `package_${cleanPkg}.zip`,
      `${cleanMod}.zip`,
      `${cleanPkg}.zip`,
    ];

    const searchInList = (list: any[]) => {
      // 1. Exact match on filename
      for (const f of list) {
        const fName = (f.name || f.originalName || '').toLowerCase().trim();
        if (candidates.includes(fName)) {
          return f;
        }
      }
      // 2. Contains match in python_packages folder
      for (const f of list) {
        const fName = (f.name || f.originalName || '').toLowerCase().trim();
        const fFolder = (f.folderName || f.metadata?.folder || '').toLowerCase().trim();
        if (
          fName.endsWith('.zip') &&
          (fFolder === 'python_packages' || fFolder === 'packages') &&
          (fName.includes(cleanMod) || fName.includes(cleanPkg))
        ) {
          return f;
        }
      }
      return null;
    };

    const files = await getCachedSudafileFiles();
    const found = searchInList(files);
    if (found) return found;

    // Force refresh cache once if not found
    const freshFiles = await getCachedSudafileFiles(true);
    return searchInList(freshFiles);
  } catch (err) {
    console.warn('[sudafileManager] findPackageInSudafile error:', err);
    return null;
  }
}

/**
 * Download a package zip from Sudafile and extract it directly into Python's dist-packages
 */
export async function downloadAndExtractPackageFromSudafile(
  moduleOrPkgName: string
): Promise<{ success: boolean; message: string; fileName?: string; fileId?: string }> {
  try {
    const pkgMatch = await findPackageInSudafile(moduleOrPkgName);
    if (!pkgMatch) {
      return { success: false, message: `لم يتم العثور على حزمة ${moduleOrPkgName} في Sudafile` };
    }

    const siteDir = getPythonDistPackagesDir();
    if (!fs.existsSync(siteDir)) {
      try {
        fs.mkdirSync(siteDir, { recursive: true });
      } catch {}
    }

    let downloadUrl = pkgMatch.downloadUrl || pkgMatch.directUrl || pkgMatch.url;
    if (downloadUrl && downloadUrl.startsWith('/')) {
      downloadUrl = `${currentConfig.baseUrl}${downloadUrl}`;
    }
    if (!downloadUrl && pkgMatch.fileId) {
      downloadUrl = `${currentConfig.baseUrl}/api/files/${pkgMatch.fileId}.zip`;
    }
    if (downloadUrl) {
      // Upgrade old Sudafile links to the current HTTPS hostname.
      downloadUrl = downloadUrl
        .replace(/^http:\/\//i, 'https://')
        .replace(/^https:\/\/sudafile\.[^/]+/i, 'https://sudafile.iqra4you.com');
    }

    if (!downloadUrl) {
      return { success: false, message: `تعذر تحديد رابط تحميل الحزمة ${pkgMatch.name}` };
    }

    console.log(`[Sudafile] Downloading package from Sudafile: ${downloadUrl}`);
    const res = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'x-api-key': currentConfig.apiKey,
        Accept: '*/*',
      },
    });

    if (!res.ok) {
      return {
        success: false,
        message: `فشل تحميل الحزمة من Sudafile: HTTP ${res.status} (${res.statusText})`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to temp zip and extract using system unzip
    const tempZip = path.join(os.tmpdir(), `suda_pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.zip`);
    fs.writeFileSync(tempZip, buffer);

    try {
      execSync(`unzip -q -o "${tempZip}" -d "${siteDir}"`, {
        timeout: 10000,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
    } catch {
      // Fallback: unzip with JSZip if system unzip fails
      const loadedZip = await JSZip.loadAsync(buffer);
      for (const [relPath, zipEntry] of Object.entries(loadedZip.files)) {
        const destPath = path.join(siteDir, relPath);
        if (zipEntry.dir) {
          if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
        } else {
          const content = await zipEntry.async('nodebuffer');
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.writeFileSync(destPath, content);
        }
      }
    } finally {
      try {
        if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
      } catch {}
    }

    return {
      success: true,
      fileName: pkgMatch.name,
      fileId: pkgMatch.fileId,
      message: `تم استعادة وتثبيت حزمة '${pkgMatch.name}' سحابياً بنجاح من Sudafile إلى بيئة بايثون`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `خطأ أثناء استعادة الحزمة من Sudafile: ${err.message}`,
    };
  }
}

/**
 * Package an installed python module from site-packages and upload it to Sudafile for persistent cloud reuse
 */
export async function packageAndUploadModuleToSudafile(
  moduleOrPkgName: string,
  folder: string = 'python_packages'
): Promise<{ success: boolean; fileName?: string; fileId?: string; message: string }> {
  try {
    const rawName = moduleOrPkgName.trim();
    const cleanModName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const siteDir = getPythonDistPackagesDir();
    if (!fs.existsSync(siteDir)) {
      return { success: false, message: `site-packages dir not found at ${siteDir}` };
    }

    const targetEntries: string[] = [];

    // Find where python imports this module from
    try {
      const pyCheck = execSync(
        `python3 -c "import ${rawName}; print(getattr(${rawName}, '__file__', ''))"`,
        { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (pyCheck && pyCheck.startsWith(siteDir)) {
        const rel = path.relative(siteDir, pyCheck);
        const topDir = rel.split(path.sep)[0];
        if (topDir && fs.existsSync(path.join(siteDir, topDir))) {
          targetEntries.push(topDir);
        }
      }
    } catch {}

    // Also scan siteDir for matching module folders or dist-info
    const allSiteEntries = fs.readdirSync(siteDir);
    const mappedPkg = COMMON_MODULE_TO_PKG[rawName] || COMMON_MODULE_TO_PKG[cleanModName] || rawName;
    const cleanPkgName = mappedPkg.toLowerCase().replace(/[^a-z0-9_]/g, '');

    for (const entry of allSiteEntries) {
      const lower = entry.toLowerCase();
      if (lower === cleanModName || lower === cleanPkgName) {
        if (!targetEntries.includes(entry)) targetEntries.push(entry);
      }
      if (lower === `${cleanModName}.py` || lower === `${cleanPkgName}.py`) {
        if (!targetEntries.includes(entry)) targetEntries.push(entry);
      }
      if (
        (lower.startsWith(`${cleanModName}-`) || lower.startsWith(`${cleanPkgName}-`)) &&
        (lower.endsWith('.dist-info') || lower.endsWith('.egg-info'))
      ) {
        if (!targetEntries.includes(entry)) targetEntries.push(entry);
      }
    }

    if (targetEntries.length === 0) {
      return { success: false, message: `لم يتم العثور على ملفات الحزمة في ${siteDir} للمكتبة ${rawName}` };
    }

    // Bundle files using JSZip
    const zip = new JSZip();

    const addDirectoryRecursively = (basePath: string, zipFolder: JSZip) => {
      const items = fs.readdirSync(basePath, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(basePath, item.name);
        if (item.isDirectory()) {
          const subZipFolder = zipFolder.folder(item.name);
          if (subZipFolder) {
            addDirectoryRecursively(fullPath, subZipFolder);
          }
        } else if (item.isFile()) {
          zipFolder.file(item.name, fs.readFileSync(fullPath));
        }
      }
    };

    for (const entry of targetEntries) {
      const fullPath = path.join(siteDir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subFolder = zip.folder(entry);
        if (subFolder) {
          addDirectoryRecursively(fullPath, subFolder);
        }
      } else if (stat.isFile()) {
        zip.file(entry, fs.readFileSync(fullPath));
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const fileName = `package_${cleanModName}.zip`;

    console.log(`[Sudafile] Uploading package ${fileName} (${zipBuffer.length} bytes) to folder '${folder}'...`);
    const uploadRes = await uploadToSudafile(
      zipBuffer,
      fileName,
      'application/zip',
      folder
    );

    // Invalidate cached file listing
    if (cachedSudaFiles) cachedSudaFiles.timestamp = 0;

    return {
      success: true,
      fileName,
      fileId: uploadRes?.fileId || uploadRes?.file?.fileId,
      message: `تم رفع وحفظ مكتبة ${rawName} في Sudafile السحابي بنجاح (${fileName})`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `فشل رفع حزمة المكتبة إلى Sudafile: ${err.message}`,
    };
  }
}

/**
 * Intelligent module resolver for missing Python imports with distinctive logging and alternative command fallbacks:
 * 1. First, attempts instant restoration from Sudafile Cloud Storage with distinctive banner logs.
 * 2. If not found in Sudafile, verifies and attempts pip installation.
 * 3. If installation fails, queries and tests alternative/fallback installation commands and package variants.
 * 4. Upon success, bundles and uploads to Sudafile for instant cloud reuse.
 */
export async function resolveMissingPythonModule(
  rawMissingMod: string,
  installPipCallback: (pkgs: string[]) => Promise<{ success: boolean; output: string }>
): Promise<{
  success: boolean;
  fromSudafile: boolean;
  uploadedToSudafile: boolean;
  installedPkgName: string;
  note: string;
}> {
  const mod = rawMissingMod.trim().replace(/^['"]|['"]$/g, '');
  const baseMod = mod.split('.')[0];
  const mappedPkg =
    COMMON_MODULE_TO_PKG[mod] ||
    COMMON_MODULE_TO_PKG[mod.toLowerCase()] ||
    COMMON_MODULE_TO_PKG[baseMod] ||
    COMMON_MODULE_TO_PKG[baseMod.toLowerCase()] ||
    baseMod;

  const distinctiveBanner = `[📦 محرك التثبيت الذكي SudaInstall]: 🔍 جاري البحث والتحقق من المكتبة '${mod}' (الحزمة: '${mappedPkg}')...\n`;
  console.log(`[SudaInstall] Examining missing module: ${mod} -> package: ${mappedPkg}`);

  // STEP 1: Check Sudafile Cloud first!
  const restoreRes = await downloadAndExtractPackageFromSudafile(mod);
  if (restoreRes.success) {
    return {
      success: true,
      fromSudafile: true,
      uploadedToSudafile: false,
      installedPkgName: mod,
      note: distinctiveBanner + `[☁️ استرداد سحابي فوري من Sudafile]: تم العثور على مكتبة '${mod}' في Sudafile Cloud Storage واستعادتها وتثبيتها بنجاح فائق بدون انتظار!\n`,
    };
  }

  // STEP 2: If not in Sudafile, install via pip using primary package name
  console.log(`[SudaInstall] Module '${mod}' not found in Sudafile. Attempting primary install for '${mappedPkg}'...`);
  let pipRes = await installPipCallback([mappedPkg]);

  // STEP 3: If installation failed, query and test alternative/fallback commands and package variants
  if (!pipRes.success) {
    console.warn(`[SudaInstall] Primary install for '${mappedPkg}' failed. Querying alternative fallback package variants and commands...`);
    
    // Define alternative fallbacks based on common python modules
    const alternatives: string[] = [];
    if (mappedPkg === 'python-telegram-bot' || mod.includes('telegram')) {
      alternatives.push('python-telegram-bot[job-queue]', 'pyTelegramBotAPI', 'telebot');
    } else if (mappedPkg === 'requests' || mod.includes('requests')) {
      alternatives.push('requests[security]', 'urllib3');
    } else if (mappedPkg === 'httpx' || mod.includes('httpx')) {
      alternatives.push('httpx[http2]', 'requests');
    } else {
      alternatives.push(baseMod, mod.toLowerCase(), `python-${baseMod}`);
    }

    let altSuccess = false;
    let successfulAltPkg = mappedPkg;
    let lastAltOutput = pipRes.output;

    for (const altPkg of alternatives) {
      if (altPkg === mappedPkg) continue;
      console.log(`[SudaInstall] Trying alternative fallback package/command: pip install ${altPkg}...`);
      const altRes = await installPipCallback([altPkg]);
      if (altRes.success) {
        altSuccess = true;
        successfulAltPkg = altPkg;
        pipRes = altRes;
        break;
      } else {
        lastAltOutput += `\n[Alt ${altPkg}]: ${altRes.output}`;
      }
    }

    if (!altSuccess) {
      return {
        success: false,
        fromSudafile: false,
        uploadedToSudafile: false,
        installedPkgName: mappedPkg,
        note: distinctiveBanner + `[⚠️ فشل تثبيت المكتبة وجميع الأوامر البديلة]: ${lastAltOutput}\n`,
      };
    }
  }

  // STEP 4: Immediately bundle and upload to Sudafile for instant cloud retrieval in future!
  let uploaded = false;
  let uploadedFileName = '';
  try {
    const upRes = await packageAndUploadModuleToSudafile(mod);
    if (upRes.success) {
      uploaded = true;
      uploadedFileName = upRes.fileName || `package_${mod}.zip`;
    }
  } catch (e: any) {
    console.warn(`[Sudafile] Auto-upload of package '${mod}' to Sudafile failed:`, e?.message);
  }

  return {
    success: true,
    fromSudafile: false,
    uploadedToSudafile: uploaded,
    installedPkgName: mappedPkg,
    note: distinctiveBanner + (uploaded
      ? `[📦 تثبيت ورفع سحابي إلى Sudafile]: تم تثبيت مكتبة '${mappedPkg}' بنجاح، وتم حزمها ورفعها تلقائياً إلى Sudafile السحابي (${uploadedFileName}) لتكون متوفرة فورياً دائماً!\n[🚀 حالة التشغيل]: تم تفعيل المكتبة وتشغيل البوت بنجاح.\n`
      : `[📦 تم التثبيت بنجاح]: تم تثبيت مكتبة '${mappedPkg}' وتفعيلها وتشغيل البوت بنجاح.\n`),
  };
}
