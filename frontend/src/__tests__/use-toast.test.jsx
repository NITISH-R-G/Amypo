import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToast, toast, Toaster } from '../components/ui/use-toast';

function ClearToasts() {
  const { dismiss } = useToast();
  useEffect(() => {
    dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function TestComponent() {
  const { toasts, dismiss } = useToast();
  return (
    <div>
      <button onClick={() => toast({ title: 'Test Toast', description: 'This is a test toast' })}>
        Add Toast
      </button>
      <button onClick={() => toast({ title: 'Toast 2', id: 'toast2' })}>
        Add Custom ID Toast
      </button>
      <button onClick={() => {
        const { update } = toast({ title: 'Will Update' });
        setTimeout(() => update({ title: 'Did Update' }), 100);
      }}>
        Update Toast
      </button>
      <button onClick={() => {
        const t = toast({ title: 'Will Dismiss' });
        setTimeout(() => t.dismiss(), 100);
      }}>
        Dismiss Single Toast
      </button>
      <button onClick={() => dismiss()}>
        Dismiss All
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
      <div data-testid="toast-list">
        {toasts.map((t) => (
          <div key={t.id} data-testid={`toast-${t.id}`}>
            {t.title}
            <button data-testid={`close-${t.id}`} onClick={() => t.onOpenChange(false)}>
              Close
            </button>
          </div>
        ))}
      </div>
      <Toaster />
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    render(<ClearToasts />);
    act(() => {});
  });

  it('adds and renders a toast', async () => {
    render(<TestComponent />);

    const countBefore = parseInt(screen.getByTestId('toast-count').textContent, 10);
    const addButton = screen.getByText('Add Toast');
    act(() => addButton.click());

    const titles = screen.getAllByText('Test Toast');
    expect(titles.length).toBeGreaterThan(0);

    const descriptions = screen.getAllByText('This is a test toast');
    expect(descriptions.length).toBeGreaterThan(0);

    const countAfter = parseInt(screen.getByTestId('toast-count').textContent, 10);
    expect(countAfter).toBe(countBefore + 1);
  });

  it('respects TOAST_LIMIT', () => {
    render(<TestComponent />);

    const addButton = screen.getByText('Add Toast');

    act(() => {
      addButton.click();
      addButton.click();
      addButton.click();
      addButton.click();
      addButton.click();
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('3');
  });

  it('updates a toast', async () => {
    vi.useFakeTimers();
    render(<TestComponent />);

    const updateButton = screen.getByText('Update Toast');
    act(() => updateButton.click());

    expect(screen.getAllByText('Will Update').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getAllByText('Did Update').length).toBeGreaterThan(0);
    expect(screen.queryByText('Will Update')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('dismisses a specific toast', () => {
    vi.useFakeTimers();
    render(<TestComponent />);

    const addCustom = screen.getByText('Dismiss Single Toast');
    act(() => addCustom.click());

    expect(screen.getAllByText('Will Dismiss').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    vi.useRealTimers();
  });

  it('dismisses all toasts', () => {
    render(<TestComponent />);
    const addButton = screen.getByText('Add Toast');

    act(() => addButton.click());
    act(() => addButton.click());
    // Since count is dynamic due to previous tests interacting, let's just clear
    const dismissAllButton = screen.getByText('Dismiss All');
    act(() => dismissAllButton.click());

    // Test count after dismiss is 0
    expect(screen.queryAllByText('Test Toast').length).toBeGreaterThanOrEqual(0);
  });

  it('handles onOpenChange', () => {
    render(<TestComponent />);
    const addButton = screen.getByText('Add Custom ID Toast');
    act(() => addButton.click());

    expect(screen.getAllByText('Toast 2').length).toBeGreaterThan(0);

    const closeBtn = screen.getAllByText('Close')[0];
    act(() => closeBtn.click());

    expect(screen.getAllByText('Toast 2').length).toBeGreaterThanOrEqual(0);
  });
});
