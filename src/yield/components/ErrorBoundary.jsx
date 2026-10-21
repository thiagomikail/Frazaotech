import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-full items-center justify-center bg-canvas p-6 text-ink">
                    <div className="w-full max-w-xl overflow-hidden rounded-sm border border-line border-l-4 border-l-red bg-surface">
                        <div className="flex h-8 items-center border-b border-line bg-strip px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-red-ink">
                            Fault
                        </div>
                        <div className="p-4">
                            <h1 className="text-[18px] font-semibold">Something went wrong.</h1>
                            <p className="mt-1 text-[14px] text-ink-2">Reload the page to start over. The details below help fix it.</p>
                            <details className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-sm border border-line bg-field p-3 font-mono text-[11px] text-red-ink">
                                {this.state.error && this.state.error.toString()}
                                <br />
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </details>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
