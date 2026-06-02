import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { BrowserRouter } from 'react-router-dom';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/users/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: 1, name: 'Student Test', tier: 'Pro' } })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Question 1' }, { id: 2, title: 'Test Question 2' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ submissions: [{ id: 1, question_id: 1, total_score: 100, status: 'completed' }] })
        });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );

  it('renders the dashboard and fetches data', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users/1');
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions?student_id=1&limit=200');
    });

    // Check elements after loading
    expect(await screen.findByText(/Welcome back/)).toBeInTheDocument();

    // Check if the dashboard components rendered with mock data
    expect(screen.getAllByText('Test Question 1')[0]).toBeInTheDocument();
  });
});
