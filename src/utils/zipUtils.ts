import JSZip from 'jszip';
import { ProjectFile, TelegramStorageFile, TelegramFileType } from '../types';

export function detectFileTypeAndCategory(filename: string): {
  type: TelegramFileType;
  category: TelegramStorageFile['category'];
  isBinaryImage: boolean;
} {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (['html', 'htm'].includes(ext)) {
    return { type: 'html', category: 'web', isBinaryImage: false };
  }
  if (['css', 'scss', 'sass', 'less'].includes(ext)) {
    return { type: 'css', category: 'code', isBinaryImage: false };
  }
  if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) {
    return { type: 'javascript', category: 'code', isBinaryImage: false };
  }
  if (['py', 'pyw'].includes(ext)) {
    return { type: 'python', category: 'code', isBinaryImage: false };
  }
  if (['json'].includes(ext)) {
    return { type: 'json', category: 'data', isBinaryImage: false };
  }
  if (['md', 'markdown'].includes(ext)) {
    return { type: 'markdown', category: 'docs', isBinaryImage: false };
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp'].includes(ext)) {
    return { type: 'image', category: 'other', isBinaryImage: true };
  }
  if (['svg'].includes(ext)) {
    return { type: 'image', category: 'other', isBinaryImage: false };
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return { type: 'document', category: 'docs', isBinaryImage: false };
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return { type: 'archive', category: 'other', isBinaryImage: false };
  }

  return { type: 'text', category: 'docs', isBinaryImage: false };
}

export interface ZipExtractionOutput {
  files: TelegramStorageFile[];
  isEncrypted: boolean;
  extractedCount: number;
  folderName: string;
  isPythonProject: boolean;
  entryFile?: string;
  procfileCommand?: string;
  detectedRequirements?: string[];
}

/**
 * Standard Python libraries requested for SudaStack Python projects
 */
export const SUDA_STANDARD_PYTHON_REQUIREMENTS = [
  'pyTelegramBotAPI>=4.12.0',
  'pyrebase==3.0.27',
  'requests>=2.31.0',
  'urllib3>=2.0.4',
  'setuptools>=67.0.0',
  'wheel>=0.40.0',
];

export const SUDA_STANDARD_PYTHON_RUNTIME = 'python-3.10.12';

/**
 * Extracts an uploaded ZIP file into TelegramStorageFile array for SudaStack storage.
 * Automatically extracts files into project folder (e.g. mubarak.zip -> folder 'mubarak'),
 * preserves subfolders (e.g. mubarak/assets, mubarak/image),
 * and auto-discovers/auto-completes Python configs (requirements.txt, runtime.txt, Procfile).
 */
export async function extractZipToStorageFiles(
  file: File,
  isArabic = false
): Promise<ZipExtractionOutput> {
  const readArchiveAsBase64 = async (): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve((ev.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const rawBaseName = file.name.replace(/\.[^/.]+$/, '').trim();
  const projectName = rawBaseName || 'project';
  const folderName = `Sandbox/${projectName}`;

  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const extractedFiles: TelegramStorageFile[] = [];
    const allKeys = Object.keys(loadedZip.files);

    // Filter out OS metadata files (__MACOSX, .DS_Store, Thumbs.db, .git/)
    const validKeys = allKeys.filter((k) => {
      const zipEntry = loadedZip.files[k];
      if (zipEntry.dir || zipEntry.name.endsWith('/')) return false;
      const clean = k.replace(/^\.\//, '');
      if (
        clean.startsWith('__MACOSX/') ||
        clean.includes('/.DS_Store') ||
        clean === '.DS_Store' ||
        clean.endsWith('Thumbs.db') ||
        clean.startsWith('.git/')
      ) {
        return false;
      }
      return true;
    });

    // Check if archive entries already start with the folder name (e.g. mubarak/...)
    // to avoid duplicating folder path like mubarak/mubarak/...
    const cleanedPaths = validKeys.map((k) => k.replace(/^\.\//, ''));
    let stripLeadingPrefix = '';
    if (cleanedPaths.length > 0) {
      const firstSegment = cleanedPaths[0].split('/')[0];
      if (
        firstSegment &&
        cleanedPaths.every((p) => p.startsWith(firstSegment + '/')) &&
        (firstSegment.toLowerCase() === folderName.toLowerCase() || cleanedPaths.length > 1)
      ) {
        stripLeadingPrefix = firstSegment + '/';
      }
    }

    for (const rawKey of validKeys) {
      const zipEntry = loadedZip.files[rawKey];
      let cleanRelPath = rawKey.replace(/^\.\//, '');
      if (stripLeadingPrefix && cleanRelPath.startsWith(stripLeadingPrefix)) {
        cleanRelPath = cleanRelPath.slice(stripLeadingPrefix.length);
      }

      if (!cleanRelPath) continue;

      // Extract filename, subfolder (e.g. 'assets' or 'image'), and full project path
      const pathParts = cleanRelPath.split('/');
      const fileName = pathParts.pop() || cleanRelPath;
      const subfolder = pathParts.join('/'); // e.g. 'assets' or 'image' or ''
      const fullPath = subfolder
        ? `${folderName}/${subfolder}/${fileName}`
        : `${folderName}/${fileName}`;

      const { type, category, isBinaryImage } = detectFileTypeAndCategory(fileName);

      let content = '';
      let isImg = isBinaryImage;
      let dataUrl: string | undefined = undefined;
      let base64Data: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      try {
        if (isBinaryImage) {
          const base64 = await zipEntry.async('base64');
          const ext = fileName.split('.').pop()?.toLowerCase() || '';
          mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
          dataUrl = `data:${mimeType};base64,${base64}`;
          base64Data = base64;
          content = dataUrl;
          isImg = true;
        } else {
          content = await zipEntry.async('string');
        }
      } catch (entryErr: any) {
        const msg = (entryErr?.message || '').toLowerCase();
        if (msg.includes('encrypt') || msg.includes('password')) {
          console.info('Encrypted ZIP entry detected:', cleanRelPath);
          const base64 = await readArchiveAsBase64();
          return {
            files: [
              {
                id: `tg-archive-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                name: file.name,
                type: 'archive',
                category: 'other',
                sizeBytes: file.size,
                content: base64,
                createdAt: new Date().toISOString(),
                createdBy: 'user',
                description: isArabic
                  ? `أرشيف مضغوط مشفر (${file.name}) محفوظ بأمان في سوداستاك SudaStack`
                  : `Encrypted ZIP archive (${file.name}) preserved in SudaStack`,
                telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
              },
            ],
            isEncrypted: true,
            extractedCount: 0,
            folderName,
            isPythonProject: false,
          };
        }
        continue;
      }

      extractedFiles.push({
        id: `tg-zip-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: fileName,
        folder: folderName,
        subfolder: subfolder || undefined,
        path: fullPath,
        type,
        category,
        sizeBytes: isBinaryImage ? file.size : content.length,
        content,
        dataUrl,
        base64: base64Data,
        mimeType,
        isImage: isImg,
        createdAt: new Date().toISOString(),
        createdBy: 'user',
        description: isArabic
          ? subfolder
            ? `مستخرج في المجلد [${folderName}/${subfolder}] من الأرشيف (${file.name})`
            : `مستخرج في مجلد المشروع [${folderName}] من الأرشيف (${file.name})`
          : subfolder
          ? `Extracted in [${folderName}/${subfolder}] from ZIP (${file.name})`
          : `Extracted in [${folderName}] from ZIP (${file.name})`,
        telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      });
    }

    if (extractedFiles.length === 0) {
      // Empty or non-extractable archive, preserve archive file itself
      const base64 = await readArchiveAsBase64();
      return {
        files: [
          {
            id: `tg-archive-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            folder: folderName,
            type: 'archive',
            category: 'other',
            sizeBytes: file.size,
            content: base64,
            createdAt: new Date().toISOString(),
            createdBy: 'user',
            description: isArabic
              ? `أرشيف مضغوط (${file.name}) محفوظ في سوداستاك SudaStack`
              : `ZIP archive (${file.name}) preserved in SudaStack`,
            telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
          },
        ],
        isEncrypted: false,
        extractedCount: 0,
        folderName,
        isPythonProject: false,
      };
    }

    // =========================================================================
    // PYTHON AUTO-DISCOVERY, AUTO-COMPLETION, AND CONFIG GENERATION ENGINE
    // =========================================================================
    const pythonFiles = extractedFiles.filter(
      (f) => f.type === 'python' || f.name.toLowerCase().endsWith('.py')
    );

    const hasPythonFiles = pythonFiles.length > 0;
    const hasRequirementsTxt = extractedFiles.some(
      (f) => f.name.toLowerCase() === 'requirements.txt'
    );
    const hasProcfile = extractedFiles.some(
      (f) => f.name.toLowerCase() === 'procfile'
    );
    const hasRuntimeTxt = extractedFiles.some(
      (f) => f.name.toLowerCase() === 'runtime.txt'
    );

    const isPythonProject =
      hasPythonFiles || hasRequirementsTxt || hasProcfile || hasRuntimeTxt;

    let entryFileName = 'main.py';
    let procfileCommand = 'worker: python main.py';
    const detectedDeps = new Set<string>();

    if (isPythonProject) {
      // 1. Scan all Python source files to discover imported packages
      for (const pyFile of pythonFiles) {
        const pyCode = typeof pyFile.content === 'string' ? pyFile.content : '';
        const importRegex =
          /^[ \t]*(?:import[ \t]+([a-zA-Z0-9_, \t]+)|from[ \t]+([a-zA-Z0-9_.]+)[ \t]+import)/gm;
        let match;
        while ((match = importRegex.exec(pyCode)) !== null) {
          const rawDirect = match[1];
          const rawFrom = match[2];

          if (rawDirect) {
            rawDirect.split(',').forEach((pkg) => {
              const name = pkg.trim().split(/\s+/)[0]?.split('.')[0];
              if (name) detectedDeps.add(name.toLowerCase());
            });
          }
          if (rawFrom) {
            const name = rawFrom.trim().split('.')[0];
            if (name) detectedDeps.add(name.toLowerCase());
          }
        }
      }

      // Map detected package imports to standard pip package definitions
      const packageMap: Record<string, string> = {
        telebot: 'pyTelegramBotAPI>=4.12.0',
        pytelegrambotapi: 'pyTelegramBotAPI>=4.12.0',
        telegram: 'python-telegram-bot>=20.0',
        pyrebase: 'pyrebase==3.0.27',
        firebase: 'pyrebase==3.0.27',
        firebase_admin: 'firebase-admin>=6.2.0',
        requests: 'requests>=2.31.0',
        urllib3: 'urllib3>=2.0.4',
        dotenv: 'python-dotenv>=1.0.0',
        flask: 'flask>=3.0.0',
        fastapi: 'fastapi>=0.100.0',
        uvicorn: 'uvicorn>=0.23.0',
        bs4: 'beautifulsoup4>=4.12.0',
        beautifulsoup4: 'beautifulsoup4>=4.12.0',
        aiohttp: 'aiohttp>=3.9.0',
        pydantic: 'pydantic>=2.0.0',
        numpy: 'numpy>=1.24.0',
        pandas: 'pandas>=2.0.0',
        PIL: 'pillow>=10.0.0',
        pillow: 'pillow>=10.0.0',
        colorama: 'colorama>=0.4.6',
      };

      // Assemble all required packages (Standard user requested packages + any detected imports)
      const allRequirementsList = [...SUDA_STANDARD_PYTHON_REQUIREMENTS];
      detectedDeps.forEach((dep) => {
        const mapped = packageMap[dep];
        if (mapped && !allRequirementsList.some((req) => req.toLowerCase().startsWith(dep))) {
          allRequirementsList.push(mapped);
        }
      });

      // 2. Auto-Complete or Generate requirements.txt
      const reqFileIndex = extractedFiles.findIndex(
        (f) => f.name.toLowerCase() === 'requirements.txt'
      );

      if (reqFileIndex >= 0) {
        // Merge missing standard packages into existing requirements.txt cleanly
        const existingReqContent = extractedFiles[reqFileIndex].content;
        const existingLines = existingReqContent.split('\n').map((l) => l.trim());
        const missingLines: string[] = [];

        allRequirementsList.forEach((req) => {
          const basePkg = req.split(/[>=<]/)[0].trim().toLowerCase();
          const exists = existingLines.some((line) => {
            const lineBase = line.split(/[>=<]/)[0].trim().toLowerCase();
            return lineBase === basePkg;
          });
          if (!exists) {
            missingLines.push(req);
          }
        });

        if (missingLines.length > 0) {
          const mergedReqs = `${existingReqContent.trim()}\n\n# تم إكمال المكتبات الضرورية تلقائياً بواسطة SudaStack:\n${missingLines.join('\n')}\n`;
          extractedFiles[reqFileIndex].content = mergedReqs;
          extractedFiles[reqFileIndex].sizeBytes = mergedReqs.length;
        }
      } else {
        // Create requirements.txt
        const newReqContent = `# متطلبات ومكتبات مشروع Python [${folderName}]
# تم إنشاؤها وتجهيزها تلقائياً بواسطة منصة SudaStack:
${allRequirementsList.join('\n')}
`;
        extractedFiles.push({
          id: `tg-req-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: 'requirements.txt',
          folder: folderName,
          path: `${folderName}/requirements.txt`,
          type: 'text',
          category: 'docs',
          sizeBytes: newReqContent.length,
          content: newReqContent,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          description: isArabic
            ? `ملف متطلبات ومكتبات بايثون لمشروع [${folderName}]`
            : `Python requirements for [${folderName}]`,
          telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
        });
      }

      // 3. Auto-Complete or Generate runtime.txt (python-3.10.12)
      const runtimeFileIndex = extractedFiles.findIndex(
        (f) => f.name.toLowerCase() === 'runtime.txt'
      );

      if (runtimeFileIndex < 0) {
        const runtimeContent = `${SUDA_STANDARD_PYTHON_RUNTIME}\n`;
        extractedFiles.push({
          id: `tg-runtime-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: 'runtime.txt',
          folder: folderName,
          path: `${folderName}/runtime.txt`,
          type: 'text',
          category: 'docs',
          sizeBytes: runtimeContent.length,
          content: runtimeContent,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          description: isArabic
            ? `إصدار بايثون المدعوم (${SUDA_STANDARD_PYTHON_RUNTIME}) لمشروع [${folderName}]`
            : `Python runtime specification (${SUDA_STANDARD_PYTHON_RUNTIME})`,
          telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
        });
      }

      // 4. Identify entry script (prioritize main.py > bot.py > app.py > server.py > first .py)
      const priorityEntryNames = ['main.py', 'bot.py', 'app.py', 'server.py', 'run.py', 'index.py'];
      let foundEntry = pythonFiles.find((f) =>
        priorityEntryNames.includes(f.name.toLowerCase())
      );
      if (!foundEntry && pythonFiles.length > 0) {
        foundEntry = pythonFiles[0];
      }

      if (foundEntry) {
        entryFileName = foundEntry.name;
        foundEntry.isProjectMain = true;
      } else {
        // If no python file at all exists, create a default main.py with telebot & requests starter
        entryFileName = 'main.py';
        const defaultMainPy = `# -*- coding: utf-8 -*-
"""
مشروع بايثون: ${folderName}
تم فك الضغط والتجهيز عبر منصة SudaStack
"""
import sys
import requests
import urllib3

print("🚀 SudaStack: تشغيل مشروع بايثون [${folderName}] بنجاح!")
print(f"🐍 إصدار بايثون الحالي: {sys.version.split()[0]}")
print("📦 المكتبات المثبتة: requests, urllib3, pyTelegramBotAPI, pyrebase")
`;
        extractedFiles.push({
          id: `tg-main-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: 'main.py',
          folder: folderName,
          path: `${folderName}/main.py`,
          type: 'python',
          category: 'code',
          sizeBytes: defaultMainPy.length,
          content: defaultMainPy,
          isProjectMain: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          description: isArabic
            ? `الملف البرمجي الرئيسي لمشروع [${folderName}]`
            : `Main entry script for [${folderName}]`,
          telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
        });
      }

      // 5. Auto-Complete or Generate Procfile (worker: python main.py)
      const procfileIndex = extractedFiles.findIndex(
        (f) => f.name.toLowerCase() === 'procfile'
      );

      if (procfileIndex >= 0) {
        const existingProc = extractedFiles[procfileIndex].content.trim();
        procfileCommand = existingProc || `worker: python ${entryFileName}`;
      } else {
        procfileCommand = `worker: python ${entryFileName}`;
        const procfileContent = `${procfileCommand}\n`;
        extractedFiles.push({
          id: `tg-proc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: 'Procfile',
          folder: folderName,
          path: `${folderName}/Procfile`,
          type: 'text',
          category: 'code',
          sizeBytes: procfileContent.length,
          content: procfileContent,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          description: isArabic
            ? `أمر التشغيل التلقائي (${procfileCommand}) لمشروع [${folderName}]`
            : `Execution command (${procfileCommand}) for [${folderName}]`,
          telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
        });
      }
    } else {
      // For non-python web projects, mark index.html or main html file as project main
      const htmlFile = extractedFiles.find(
        (f) => f.name.toLowerCase() === 'index.html' || f.type === 'html'
      );
      if (htmlFile) {
        htmlFile.isProjectMain = true;
      }
    }

    return {
      files: extractedFiles,
      isEncrypted: false,
      extractedCount: extractedFiles.length,
      folderName,
      isPythonProject,
      entryFile: entryFileName,
      procfileCommand,
      detectedRequirements: Array.from(detectedDeps),
    };
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    const isEncrypted = msg.includes('encrypt') || msg.includes('password');

    console.info(
      `ZIP extraction notice for "${file.name}": ${
        isEncrypted ? 'Encrypted archive' : err.message
      }. Preserving archive file in cloud storage.`
    );

    const base64 = await readArchiveAsBase64();
    const fallbackArchiveFile: TelegramStorageFile = {
      id: `tg-archive-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      folder: folderName,
      type: 'archive',
      category: 'other',
      sizeBytes: file.size,
      content: base64,
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      description: isArabic
        ? isEncrypted
          ? `أرشيف مضغوط مشفر (${file.name}) تم حفظه بأمان`
          : `ملف أرشيف مضغوط (${file.name})`
        : isEncrypted
        ? `Encrypted ZIP archive (${file.name}) preserved safely`
        : `ZIP archive (${file.name})`,
      telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
    };

    return {
      files: [fallbackArchiveFile],
      isEncrypted,
      extractedCount: 0,
      folderName,
      isPythonProject: false,
    };
  }
}

/**
 * Packs project files into a ZIP Blob and triggers browser download
 */
export async function downloadProjectAsZip(projectName: string, files: ProjectFile[]): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    if (file.isBinary && file.content) {
      // Decode base64 if binary
      zip.file(file.path, file.content, { base64: true });
    } else {
      zip.file(file.path, file.content || '');
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single file from the editor or workspace
 */
export function downloadSingleFile(filename: string, content: string, isBinary = false): void {
  const blob = isBinary
    ? new Blob([content], { type: 'application/octet-stream' })
    : new Blob([content], { type: 'text/plain;charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Extracts an uploaded ZIP file into ProjectFile array
 */
export async function extractZipToFiles(file: File): Promise<ProjectFile[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const extractedFiles: ProjectFile[] = [];

  const fileKeys = Object.keys(loadedZip.files);

  for (const relativePath of fileKeys) {
    const zipEntry = loadedZip.files[relativePath];
    if (zipEntry.dir) continue; // skip folder entries

    const filename = relativePath.split('/').pop() || relativePath;
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    let type: ProjectFile['type'] = 'text';
    let isBinary = false;
    let content = '';

    if (['html', 'htm'].includes(ext)) type = 'html';
    else if (['css', 'scss', 'sass'].includes(ext)) type = 'css';
    else if (['js', 'jsx'].includes(ext)) type = 'javascript';
    else if (['ts', 'tsx'].includes(ext)) type = 'typescript';
    else if (['json'].includes(ext)) type = 'json';
    else if (['md', 'markdown'].includes(ext)) type = 'markdown';
    else if (['php'].includes(ext)) type = 'php';
    else if (['py'].includes(ext)) type = 'python';
    else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      type = 'image';
      isBinary = true;
    } else {
      type = 'binary';
      isBinary = true;
    }

    if (isBinary) {
      content = await zipEntry.async('base64');
    } else {
      content = await zipEntry.async('string');
    }

    extractedFiles.push({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      path: relativePath,
      name: filename,
      type,
      content,
      sizeBytes: content.length,
      updatedAt: new Date().toISOString(),
      isBinary,
    });
  }

  return extractedFiles;
}

/**
 * Downloads an array of TelegramStorageFiles as a single ZIP archive
 */
export async function downloadFilesAsZip(files: TelegramStorageFile[], zipName: string = 'project'): Promise<void> {
  if (!files || files.length === 0) return;
  const zip = new JSZip();

  files.forEach((file) => {
    const filename = file.name || 'file.txt';
    // Preserve subfolder structure (e.g. assets/logo.png, image/photo.jpg)
    const relPath = file.subfolder ? `${file.subfolder}/${filename}` : filename;

    if (file.type === 'image' && file.content.startsWith('data:image/')) {
      const base64Data = file.content.split(',')[1];
      if (base64Data) {
        zip.file(relPath, base64Data, { base64: true });
        return;
      }
    }
    zip.file(relPath, file.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats bytes to human readable format (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
