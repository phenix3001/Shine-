import { Component } from 'react';
import type { ReactNode } from 'react';

type Props = { children: ReactNode; message: string; retryLabel: string };

export class RouteErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="market-page route-loading" tabIndex={-1}>
      <p role="alert">{this.props.message}</p>
      <button className="add-button" onClick={() => window.location.reload()}>{this.props.retryLabel}</button>
    </main>;
  }
}
