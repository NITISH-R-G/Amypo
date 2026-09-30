import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../pages/AdminDashboard';
import { BrowserRouter } from 'react-router-dom';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/api/health')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) });
      }
      if (url.includes('/api/admin/settings/whitelist')) {
        if (options && options.method === 'POST') {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ domains: [] }) });
      }
      return Promise.reject(new Error('not found: ' + url));
    });
  });

  const renderComponent = () => render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>
  );

  it('renders the dashboard and fetches data', async () => {
    renderComponent();

    expect(screen.getByText('System Administration')).toBeInTheDocument();
    expect(screen.getByText('Email Whitelist')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users');
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/settings/whitelist');
    });
  });

  it('adds a domain to whitelist', async () => {
    renderComponent();

    const input = screen.getByPlaceholderText('e.g., example.edu');
    const addButton = screen.getByRole('button', { name: /Add Domain/i });

    await userEvent.type(input, 'testdomain.com');
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/settings/whitelist', expect.objectContaining({
          method: 'POST'
      }));
    });
  });

  it('displays fetched domains and logs', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/api/submissions')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.includes('/api/health')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (url.includes('/api/admin/settings/whitelist')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ domains: ['allowed.com'] }) });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('allowed.com')).toBeInTheDocument();
    });
  });
});
