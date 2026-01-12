import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackUIException } from '@/lib/analytics/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Component name for error tracking */
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Track error for analytics
    trackUIException(error, this.props.componentName || 'ErrorBoundary', 'critical');
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Něco se pokazilo
              </h1>
              <p className="text-sm text-muted-foreground">
                Aplikace narazila na neočekávanou chybu. Zkuste obnovit stránku nebo se vrátit na úvodní stránku.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReload}
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Obnovit stránku
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Home className="w-4 h-4" />
                Úvodní stránka
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Pokud problém přetrvává, kontaktujte podporu.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
