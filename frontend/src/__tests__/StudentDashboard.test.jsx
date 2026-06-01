import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentDashboard from '../pages/StudentDashboard';
import { BrowserRouter } from 'react-router-dom';

describe('StudentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url) => {
      if (url === '/api/questions') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Test Question' }] })
        });
      }
      if (url === '/api/questions/1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            question: { title: 'Test Question', description: 'Test Description' },
            testSpec: { difficulty: 'Easy' },
            files: [
              { type: 'html', content: '<div></div>' },
              { type: 'css', content: 'div { color: red; }' },
              { type: 'js', content: 'console.log("test");' }
            ]
          })
        });
      }
      return Promise.reject(new Error('not found'));
    });

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/1234');
    global.URL.revokeObjectURL = vi.fn();
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <StudentDashboard />
    </BrowserRouter>
  );

  it('renders the dashboard and fetches questions', async () => {
    renderComponent();

    const headers = screen.getAllByText('Practice Workspace');
    expect(headers.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1');
    });

    const questionTexts = await screen.findAllByText('Test Question');
    expect(questionTexts.length).toBeGreaterThan(0);
  });
});
