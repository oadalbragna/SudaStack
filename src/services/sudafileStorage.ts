export interface SudafileFileItem {
  fileId: string;
  name: string;
  originalName?: string;
  mimeType?: string;
  size: number;
  uploadMethod?: string;
  uploadedAt?: number;
  folderId?: string;
  folderName?: string;
  projectId?: string;
  projectName?: string;
  directUrl?: string;
  downloadUrl?: string;
  shareUrl?: string;
  viewUrl?: string;
  url?: string;
  extension?: string;
}

export interface SudafileConfigState {
  baseUrl: string;
  apiKey: string;
  defaultFolder: string;
}

export const DEFAULT_SUDAFILE_CONFIG: SudafileConfigState = {
  baseUrl: 'https://sudafile.iqra4you.com',
  apiKey: 'sf_36c202_14c1e1e882437370beddd6185c226eef',
  defaultFolder: 'uploads',
};

class SudafileStorageClient {
  private config: SudafileConfigState;

  constructor() {
    this.config = { ...DEFAULT_SUDAFILE_CONFIG };
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedKey = localStorage.getItem('sudafile_api_key');
      const savedUrl = localStorage.getItem('sudafile_base_url');
      if (savedKey) this.config.apiKey = savedKey.trim();
      const normalizedUrl = savedUrl?.trim().replace(
        /^(https?:\/\/)sudafile\.[^/]+/i,
        '$1sudafile.iqra4you.com',
      );
      this.config.baseUrl = normalizedUrl || 'https://sudafile.iqra4you.com';
      if (normalizedUrl !== savedUrl) {
        try {
          localStorage.setItem('sudafile_base_url', this.config.baseUrl);
        } catch {}
      }
    } catch {}
  }

  public getConfig(): SudafileConfigState {
    return { ...this.config };
  }

  public async setConfig(updates: Partial<SudafileConfigState>): Promise<SudafileConfigState> {
    if (updates.apiKey) {
      this.config.apiKey = updates.apiKey.trim();
      try {
        localStorage.setItem('sudafile_api_key', this.config.apiKey);
      } catch {}
    }
    if (updates.baseUrl) {
      this.config.baseUrl = updates.baseUrl.trim();
      try {
        localStorage.setItem('sudafile_base_url', this.config.baseUrl);
      } catch {}
    }
    if (updates.defaultFolder) {
      this.config.defaultFolder = updates.defaultFolder.trim();
    }

    // Sync with backend server
    try {
      await fetch('/api/sudafile/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config),
      });
    } catch {}

    return { ...this.config };
  }

  public async testConnection(apiKey?: string, baseUrl?: string): Promise<{ success: boolean; message: string; latencyMs: number }> {
    try {
      const res = await fetch('/api/sudafile/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey || this.config.apiKey,
          baseUrl: baseUrl || this.config.baseUrl,
        }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection test failed', latencyMs: 0 };
    }
  }

  public async listFiles(): Promise<SudafileFileItem[]> {
    try {
      const res = await fetch('/api/sudafile/files');
      if (!res.ok) {
        throw new Error(`Failed to fetch files: HTTP ${res.status}`);
      }
      const data = await res.json();
      return (data.files || []) as SudafileFileItem[];
    } catch (err) {
      console.error('[SudafileClient] listFiles error:', err);
      throw err;
    }
  }

  public async uploadFile(
    file: File | Blob | { name: string; content: string; type?: string },
    folder: string = 'uploads'
  ): Promise<any> {
    let fileName = 'file.txt';
    let fileBase64 = '';
    let mimeType = 'text/plain';

    if (file instanceof File || file instanceof Blob) {
      fileName = (file as File).name || 'uploaded_file';
      mimeType = file.type || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      fileBase64 = btoa(binary);
    } else {
      fileName = file.name;
      mimeType = file.type || 'text/plain';
      fileBase64 = btoa(unescape(encodeURIComponent(file.content)));
    }

    const res = await fetch('/api/sudafile/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        fileBase64,
        mimeType,
        folder,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    const res = await fetch(`/api/sudafile/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.success ?? true;
  }

  public async backupPackages(): Promise<any> {
    const res = await fetch('/api/sudafile/backup-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: 'packages' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Backup failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async restorePackage(moduleName: string): Promise<any> {
    const res = await fetch('/api/sudafile/restore-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Restore failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async uploadPackage(moduleName: string, folder: string = 'python_packages'): Promise<any> {
    const res = await fetch('/api/sudafile/upload-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleName, folder }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload package failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  public async resolveModule(moduleName: string): Promise<any> {
    const res = await fetch('/api/sudafile/resolve-module', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Module resolve failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }
}

export const sudafileStorage = new SudafileStorageClient();
