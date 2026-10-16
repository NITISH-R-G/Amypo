/**
 * @vitest-environment jsdom
 */
import React, { useEffect, useRef } from 'react';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import '@testing-library/jest-dom/vitest';

function TestComponent() {
  const { toast } = useToast();
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    dispatchForTest({ type: "REMOVE_TOAST" });
  }, []);

  return (
    <div>
      <button onClick={() => toast({ title: "Test Toast", description: "Hello world!" })}>
        Show Toast
      </button>
      <Toaster />
    </div>
  );
}

describe('use-toast', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
  })

  it('adds and renders a toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await act(async () => {
      await user.click(screen.getByText('Show Toast'));
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
  });

  it('dismisses a toast', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await act(async () => {
      await user.click(screen.getByText('Show Toast'));
    });

    // Use querySelector to find the radix UI close button with toast-close attribute
    let closeBtn;
    await act(async () => {
      closeBtn = document.querySelector('[toast-close]');
    });
    expect(closeBtn).toBeInTheDocument();

    await act(async () => {
      closeBtn.click(); // direct click for pointercapture issues
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.queryByText('Hello world!')).not.toBeInTheDocument();
  });
});
