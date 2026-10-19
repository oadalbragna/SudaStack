import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0e0f12] text-slate-100 flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="w-full max-w-md bg-[#161822] border border-rose-500/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">حدث خطأ غير متوقع في الواجهة</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                تم التقاط الخطأ بنجاح لحماية بيئة العمل الخاصة بك. يمكنك إعادة تحميل الجلسة للمتابعة بأمان.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="text-[11px] font-mono text-rose-300 bg-black/50 p-2.5 rounded-lg border border-white/5 text-left max-h-24 overflow-y-auto" dir="ltr">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition active:scale-95 shadow-lg shadow-cyan-950/50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تشغيل بيئة العمل</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
