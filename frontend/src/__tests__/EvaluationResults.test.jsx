import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EvaluationResults from '../pages/EvaluationResults';

// Mock matchMedia if it's used somewhere in charts
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

const mockResultData = {
  status: 'completed',
  submission_id: '123',
  total_score: 80,
  scores: { html: 20, css: 30, js: 20, visual: 10 },
  mismatchPercent: 5.0,
  visualArtifacts: {
    expected: '/mocks/expected.svg',
    actual: '/mocks/actual.svg',
    diff: '/mocks/diff.svg',
    boxes: []
  },
  failedTests: [
    { testId: 'css_flexbox', hint: 'Add flex', selector: '.card' }
  ],
  aiFeedback: {
    summary: 'Good job',
    suggestions: ['Keep it up']
  }
};

describe('EvaluationResults Component', () => {
  beforeEach(() => {
    vi.spyOn(window, 'fetch').mockImplementation(async (url) => {
      if (url.includes('/api/users/')) {
        return { ok: true, json: async () => ({ role: 'admin' }) };
      }
      if (url.includes('/api/submissions/123/result')) {
        return { ok: true, json: async () => mockResultData };
      }
      if (url.includes('/api/submissions/123/replay')) {
        return { ok: true, json: async () => ({ run_id: '456' }) };
      }
      return { ok: false, json: async () => ({ error: 'Not found' }) };
    });

    window.EventSource = vi.fn().mockImplementation(() => ({
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (id) => {
    return render(
      <MemoryRouter initialEntries={[`/results/${id}`]}>
        <Routes>
          <Route path="/results/:id" element={<EvaluationResults />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    renderComponent('123');
    // It's a bit tricky to find a specific loading element, but it has animate-spin
    const loadingDiv = document.querySelector('.animate-spin');
    expect(loadingDiv).toBeInTheDocument();
  });

  it('fetches and renders evaluation results successfully', async () => {
    renderComponent('123');

    await waitFor(() => {
      expect(screen.getByText('Evaluation Report')).toBeInTheDocument();
    });

    expect(screen.getByText('Overall Grade')).toBeInTheDocument();
    expect(screen.getByText('ID: 123')).toBeInTheDocument();
    expect(screen.getByText(/"Good job"/)).toBeInTheDocument();
    expect(screen.getByText(/Add flex/)).toBeInTheDocument();
  });

  it('handles demo-123 route correctly', async () => {
    renderComponent('demo-123');

    await waitFor(() => {
      expect(screen.getByText('Evaluation Report')).toBeInTheDocument();
    });

    expect(screen.getByText('ID: demo-123')).toBeInTheDocument();
    expect(screen.getByText(/Your JavaScript logic is perfect/)).toBeInTheDocument();
    expect(screen.getByText('The .card container needs display:flex to align children side-by-side.')).toBeInTheDocument();
  });

  it('allows admin to trigger replay evaluation', async () => {
    renderComponent('123');

    await waitFor(() => {
      expect(screen.getByText('Evaluation Report')).toBeInTheDocument();
    });

    const replayButton = screen.getByTitle('Replay evaluation for this submission');
    expect(replayButton).toBeInTheDocument();

    fireEvent.click(replayButton);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith(
        '/api/submissions/123/replay',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': '1',
            'x-user-role': 'admin'
          }
        })
      );
    });
  });

});
