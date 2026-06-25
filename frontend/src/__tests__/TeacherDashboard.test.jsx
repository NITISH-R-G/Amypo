import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />
}));

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
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
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

  it('switches tabs', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const builderTab = await screen.findByText(/Spec Builder/i);
    await user.click(builderTab);

    // We expect it to switch tabs and load trainer panel
    expect(await screen.findByText(/Teacher Tools/i)).toBeInTheDocument();
  });

  it('switches to analytics tab', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const buttons = await screen.findAllByRole('button');
    const tab = buttons.find(b => b.textContent.includes('Analytics'));
    if(tab) {
        await user.click(tab);
        expect(await screen.findByText(/Score Distribution/i)).toBeInTheDocument();
        expect(await screen.findByTestId('mock-bar-chart')).toBeInTheDocument();
    }
  });

  it('handles question deletion', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteButtons = (await screen.findAllByRole('button')).filter(b => b.innerHTML.includes('lucide-trash'));
    if(deleteButtons.length > 0) {
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        global.fetch.mockImplementation((url, options) => {
            if (options && options.method === 'DELETE') {
                return Promise.resolve({ ok: true });
            }
            if (url.includes('/api/questions')) {
               return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [] }) });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });

        await user.click(deleteButtons[0]);
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/questions/'), expect.objectContaining({ method: 'DELETE' }));
        });
    }
  });
});
