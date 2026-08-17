import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeacherDashboard from '../pages/TeacherDashboard';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock TrainerPanel to avoid deeply rendering its fetch calls
vi.mock('../pages/TrainerPanel', () => ({
  default: ({ initialTab }) => <div data-testid="trainer-panel">{initialTab} panel</div>
}));

describe('TeacherDashboard', () => {
  const originalConfirm = window.confirm;
  const originalAlert = window.alert;

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn();
    window.alert = vi.fn();
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
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    window.alert = originalAlert;
  });

  const renderComponent = (initialEntries = ['/teacher']) => render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/editor" element={<div>Editor Page</div>} />
        <Route path="/teacher/editor/:id" element={<div>Edit Question Page</div>} />
        <Route path="/settings" element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>
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

  it('switches tabs correctly', async () => {
    const user = userEvent.setup();
    renderComponent();

    await screen.findByText(/Teacher Portal/);

    const builderTab = screen.getByRole('button', { name: /Spec Builder/i });
    await user.click(builderTab);
    expect(screen.getByTestId('trainer-panel')).toHaveTextContent('builder panel');

    const analyticsTab = screen.getByRole('button', { name: /Analytics/i });
    await user.click(analyticsTab);
    expect(screen.getByTestId('trainer-panel')).toHaveTextContent('analytics panel');

    const overviewTab = screen.getByRole('button', { name: /Overview/i });
    await user.click(overviewTab);
    expect(screen.getByText('Modern Frontend Fundamentals')).toBeInTheDocument();
  });

  it('navigates to create question and settings', async () => {
    const user = userEvent.setup();
    renderComponent();

    await screen.findByText(/Teacher Portal/);

    // Create Question top button
    const createBtn = screen.getByRole('button', { name: /Create Question/i });
    await user.click(createBtn);
    expect(screen.getByText('Editor Page')).toBeInTheDocument();

    // Rerender to reset navigation
    renderComponent();
    await screen.findByText(/Teacher Portal/);

    // Settings button
    const settingsBtn = screen.getByRole('button', { name: /Course settings/i });
    await user.click(settingsBtn);
    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('handles question deletion successfully', async () => {
    const user = userEvent.setup();

    // Override fetch for delete
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] }) });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.reject(new Error('not found'));
    });

    window.confirm.mockReturnValue(true);

    renderComponent();
    await screen.findByText('Q1');

    const deleteBtn = screen.getByTitle('Delete question');
    await user.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('Q1')).not.toBeInTheDocument();
    });
  });

  it('handles question deletion failure', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/questions/1') && options?.method === 'DELETE') {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Cannot delete' }) });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] }) });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.reject(new Error('not found'));
    });

    window.confirm.mockReturnValue(true);

    renderComponent();
    await screen.findByText('Q1');

    const deleteBtn = screen.getByTitle('Delete question');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Cannot delete');
    });
    // Question should still be there
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });

  it('cancels question deletion when confirm is false', async () => {
    const user = userEvent.setup();

    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] }) });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.reject(new Error('not found'));
    });

    window.confirm.mockReturnValue(false);

    renderComponent();
    await screen.findByText('Q1');

    const deleteBtn = screen.getByTitle('Delete question');
    await user.click(deleteBtn);

    // Fetch should not be called with DELETE
    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', expect.anything());
    expect(screen.getByText('Q1')).toBeInTheDocument();
  });
});
