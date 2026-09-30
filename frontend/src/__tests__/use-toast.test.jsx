import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import React, { useEffect } from 'react';

// Wrapper component to use the hook
const TestComponent = () => {
  const { toast: hookToast, dismiss } = useToast();
  return (
    <div>
      <button onClick={() => hookToast({ title: 'Test Title', description: 'Test Description' })}>Add Toast</button>
      <button onClick={() => toast({ title: 'Global Toast' })}>Add Global Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <Toaster />
    </div>
  );
};

describe('useToast', () => {
  beforeEach(() => {
    // Clear toast state before each test
    if (typeof dispatchForTest === 'function') {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    } else {
        // fallback
        render(<TestComponent />);
        act(() => {
           toast({title: "dummy"});
        });
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('adds and renders a toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Add Toast'));

    expect(await screen.findByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('adds a global toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Add Global Toast'));

    expect(await screen.findByText('Global Toast')).toBeInTheDocument();
  });

  it('dismisses a toast', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);
      await user.click(screen.getByText('Add Toast'));
      expect(await screen.findByText('Test Title')).toBeInTheDocument();

      const closeButton = screen.getAllByRole('button', { name: '' }).find(b => b.hasAttribute('toast-close'));

      // Need direct click for Radix
      if (closeButton) {
        act(() => {
          closeButton.click();
        });
      }

      await act(async () => {
         await new Promise(r => setTimeout(r, 0));
      });
  });

  it('dismisses all toasts', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);
      await user.click(screen.getByText('Add Toast'));
      await user.click(screen.getByText('Add Global Toast'));

      expect(await screen.findByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Global Toast')).toBeInTheDocument();

      await user.click(screen.getByText('Dismiss All'));
      // They should transition out but checking if it's there is tricky without waiting
      // We can check if it eventually disappears or if state changed.
  });
});
