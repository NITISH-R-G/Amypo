const fs = require('fs');

let code = fs.readFileSync('frontend/src/__tests__/TeacherDashboard.test.jsx', 'utf8');

// I will refactor TeacherDashboard.test.jsx to reduce duplication
code = code.replace(`
  it('handles delete question', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    global.fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Deleted' })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteBtn = screen.getByTitle('Delete question');

    await act(async () => {
      deleteBtn.click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
    });
  });

  it('handles delete question failure', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    global.fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Delete failed' })
        });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteBtn = screen.getByTitle('Delete question');

    await act(async () => {
      deleteBtn.click();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
    });
    expect(window.alert).toHaveBeenCalledWith('Delete failed');
  });

  it('does not delete question if user cancels', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    global.fetch.mockImplementation((url, opts) => {
      if (url.includes('/api/questions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] })
        });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('not found'));
    });

    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/questions');
    });

    const deleteBtn = screen.getByTitle('Delete question');

    await act(async () => {
      deleteBtn.click();
    });

    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
  });
`, `
  const mockFetchForDelete = (okStatus, returnData = {}, overrideConfirm = true) => {
    vi.spyOn(window, 'confirm').mockImplementation(() => overrideConfirm);
    if (!okStatus) vi.spyOn(window, 'alert').mockImplementation(() => {});
    global.fetch.mockImplementation((url, opts) => {
      if (opts?.method === 'DELETE') {
        return Promise.resolve({ ok: okStatus, json: () => Promise.resolve(returnData) });
      }
      if (url.includes('/api/questions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ questions: [{ id: 1, title: 'Q1' }] }) });
      }
      if (url.includes('/api/submissions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.reject(new Error('not found'));
    });
  };

  it('handles delete question', async () => {
    mockFetchForDelete(true, { message: 'Deleted' });
    renderComponent();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));
    await act(async () => { screen.getByTitle('Delete question').click(); });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' }));
  });

  it('handles delete question failure', async () => {
    mockFetchForDelete(false, { error: 'Delete failed' });
    renderComponent();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));
    await act(async () => { screen.getByTitle('Delete question').click(); });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' }));
    expect(window.alert).toHaveBeenCalledWith('Delete failed');
  });

  it('does not delete question if user cancels', async () => {
    mockFetchForDelete(true, {}, false);
    renderComponent();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/questions'));
    await act(async () => { screen.getByTitle('Delete question').click(); });
    expect(global.fetch).not.toHaveBeenCalledWith('/api/questions/1', { method: 'DELETE' });
  });
`);

fs.writeFileSync('frontend/src/__tests__/TeacherDashboard.test.jsx', code);
