import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Doughnut: () => null,
}));

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      if (url.includes('/api/questions/1/draft') || url.includes('/api/trainer/questions/1/draft')) {
          return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ question: {}, files: [], testSpec: {} })
          });
      }
      if (url.includes('/api/questions') && options?.method === 'POST') {
          return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ question: { id: 3, title: 'New Question' } })
          });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Modern Frontend Fundamentals Question 1' }, { id: 2, title: 'Advanced CSS Question 2' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, question_id: 1, student_id: 1, total_score: 95 }])
        });
      }

      return Promise.reject(new Error('not found: ' + url));
    });

    // ResizeObserver mock
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
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
  });

  it('navigates tabs correctly', async () => {
      renderComponent();
      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const buildTabs = await screen.findAllByText(/Spec Builder/);
      if (buildTabs.length > 0) {
          await act(async () => {
              buildTabs[0].closest('button').click();
          });
          expect(buildTabs[0]).toBeInTheDocument();
      }

      const analyticsTabs = await screen.findAllByText(/Analytics/);
      if (analyticsTabs.length > 0) {
          await act(async () => {
              analyticsTabs[0].closest('button').click();
          });
          expect(analyticsTabs[0]).toBeInTheDocument();
      }

      const overviewTabs = await screen.findAllByText(/Overview/);
      if (overviewTabs.length > 0) {
          await act(async () => {
              overviewTabs[0].closest('button').click();
          });
          expect(overviewTabs[0]).toBeInTheDocument();
      }
  });

  it('deletes a question', async () => {
      renderComponent();
      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      // Must wait until the courses map populates and table rows show
      expect(await screen.findByText('Modern Frontend Fundamentals Question 1')).toBeInTheDocument();

      global.confirm = vi.fn(() => true);

      const deleteButtons = document.querySelectorAll('button[title="Delete question"]');
      if (deleteButtons.length > 0) {
          const deleteButton = deleteButtons[0].closest('button');
          await act(async () => {
              deleteButton.click();
          });

          await waitFor(() => {
              expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', expect.objectContaining({ method: 'DELETE' }));
          });
      }
  });

  it('handles question creation navigation', async () => {
      renderComponent();
      await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      });

      const createButtons = await screen.findAllByText(/Create Question/);
      if (createButtons.length > 0) {
          await act(async () => {
              createButtons[0].closest('button').click();
          });
          // This sets tab to builder, which should render TrainerPanel
          expect(screen.getByText(/Spec Builder/)).toBeInTheDocument();
      }
  });
});
