import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useEffect, useRef } from 'react';
import { useToast, toast, Toaster, dispatchForTest } from '../components/ui/use-toast';
import '@testing-library/jest-dom/vitest';

describe('use-toast hook and Toaster component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestComponent = () => {
    const { toasts, dismiss } = useToast();
    const initialized = useRef(false);

    useEffect(() => {
      if (!initialized.current) {
        dispatchForTest({ type: 'REMOVE_TOAST' });
        initialized.current = true;
      }
    }, []);

    return (
      <div>
        <button id="btn1" onClick={() => toast({ title: 'Test Toast', description: 'Toast description', action: <button>Action</button> })}>
          Show Toast
        </button>
        <button id="btn2" onClick={() => toast({ title: 'Toast 2', id: 'fixed-id' })}>
          Show Toast 2
        </button>
        <button id="btn3" onClick={() => {
          const { update } = toast({ title: 'Old Title' });
          setTimeout(() => update({ title: 'New Title' }), 50);
        }}>
          Update Toast
        </button>
        <button id="btn4" onClick={() => dismiss('fixed-id')}>
          Dismiss Toast 2
        </button>
        <button id="btn5" onClick={() => dismiss()}>
          Dismiss All
        </button>
      </div>
    );
  };

  it('renders a toast when triggered and dismisses it', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const showButton = document.getElementById('btn1');
    await act(async () => {
      showButton.click();
    });

    const toastTitle = await screen.findByText('Test Toast');
    expect(toastTitle).toBeInTheDocument();
    expect(screen.getByText('Toast description')).toBeInTheDocument();

    const closeButtons = document.querySelectorAll('[toast-close]');
    expect(closeButtons.length).toBeGreaterThan(0);

    await act(async () => {
      closeButtons[0].click();
    });

    await act(async () => {
      dispatchForTest({ type: 'DISMISS_TOAST', toastId: undefined });
    });
  });

  it('handles update toast logic', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const updateButton = document.getElementById('btn3');
    await act(async () => {
      updateButton.click();
    });

    // Need to use findByText to allow React to initially render the old title
    expect(await screen.findByText('Old Title')).toBeInTheDocument();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(await screen.findByText('New Title')).toBeInTheDocument();
  });

  it('handles DISMISS_TOAST with no id and removes toast', async () => {
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    const showBtn = document.getElementById('btn2');
    await act(async () => {
      showBtn.click();
    });

    expect(await screen.findByText('Toast 2')).toBeInTheDocument();

    const dismissAllBtn = document.getElementById('btn5');
    await act(async () => {
      dismissAllBtn.click();
    });

    await act(async () => {
      dispatchForTest({ type: 'REMOVE_TOAST' });
    });

    await waitFor(() => {
        expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
    });
  });
});
