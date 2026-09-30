import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';
import * as React from 'react';
import userEvent from '@testing-library/user-event';

// Need to mock ResizeObserver for react-chartjs-2 from child component
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />
}));

vi.mock('../components/workspace/CodeEditor', () => {
  return {
    default: ({ code, onChange }) => (
      <textarea
        data-testid="mock-code-editor"
        value={code || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  };
});

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, question_id: 1, student_id: 1, total_score: 95 }])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    // Default confirmation mock
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <TeacherDashboard />
    </BrowserRouter>
  );

  it('renders the teacher dashboard and fetches course data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions?limit=200');
    });

    // Check elements after loading
    expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();
    expect(screen.getByText(/1 Questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 Students Enrolled/)).toBeInTheDocument();
  });

  it('renders empty states when no courses or submissions are available', async () => {
      global.fetch = vi.fn((url) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [] }) // Empty
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Empty
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    expect(await screen.findByText(/0 Questions/)).toBeInTheDocument();
    expect(await screen.findByText(/0 Students Enrolled/)).toBeInTheDocument();
  });

  it('handles error state properly', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network failure')));

      renderComponent();

      // Right now it just console.error's or leaves courses empty, but at least we can verify it handles rejection
      // and still renders without crashing.
      expect(await screen.findByText(/Teacher Portal/)).toBeInTheDocument();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it('simulates user deleting a course', async () => {
      global.fetch = vi.fn((url, options) => {
        if (url.includes('/api/questions')) {
          if (options && options.method === 'DELETE') {
             return Promise.resolve({
               ok: true,
               json: () => Promise.resolve({ success: true })
             });
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Q1' }] })
          });
        }
        if (url.includes('/api/submissions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
        return Promise.reject(new Error('not found: ' + url));
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));

      // Find the delete button. We can look for aria-label or title
      const deleteBtns = await screen.findAllByRole('button', { name: /Delete question/i });
      if(deleteBtns.length > 0) {
          await user.click(deleteBtns[0]);
          await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' })));
      }
  });
});
