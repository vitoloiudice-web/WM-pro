import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  logError: (error: Error, componentStack: string | null) => void;
}

interface State {
  hasError: boolean;
}

// FIX: Changed to extend Component directly to resolve issue with 'this.props' not being found.
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.props.logError(error, errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <h2 className="text-lg font-bold">Oops! Qualcosa è andato storto.</h2>
          <p className="mt-2">
            Si è verificato un errore inaspettato. Prova a ricaricare la pagina.
          </p>
          <p className="mt-2 text-sm">
            L'errore è stato registrato e può essere visualizzato nella sezione Impostazioni &gt; Debug.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Ricarica Pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
