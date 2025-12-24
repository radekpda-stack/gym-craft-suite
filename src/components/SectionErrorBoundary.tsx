import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Section name for error reporting */
  section?: string;
  /** Compact mode for inline errors */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Section-level error boundary for graceful degradation.
 * Use this around dashboard widgets, forms, and other isolated sections.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SectionErrorBoundary${this.props.section ? ` - ${this.props.section}` : ''}]:`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    if (this.props.compact) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-muted-foreground">
            {this.props.section ? `Chyba v sekci "${this.props.section}"` : 'Něco se pokazilo'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleRetry}
            className="ml-auto h-7 px-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Zkusit znovu
          </Button>
        </div>
      );
    }

    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertCircle className="w-5 h-5" />
            {this.props.section ? `Chyba v sekci "${this.props.section}"` : 'Něco se pokazilo'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tato část aplikace narazila na problém. Zbytek aplikace funguje normálně.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
              {this.state.error.message}
            </pre>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Zkusit znovu
          </Button>
        </CardContent>
      </Card>
    );
  }
}

/**
 * HOC to wrap a component with SectionErrorBoundary
 */
export function withSectionErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  section?: string,
  compact?: boolean
) {
  return function WithErrorBoundary(props: P) {
    return (
      <SectionErrorBoundary section={section} compact={compact}>
        <WrappedComponent {...props} />
      </SectionErrorBoundary>
    );
  };
}
