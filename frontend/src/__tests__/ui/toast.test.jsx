import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster, useToast } from '../../components/ui/use-toast';

function TestComponent() {
  const { toast } = useToast();
  return (
    <button onClick={() => toast({ title: 'Test Toast', description: 'This is a test toast' })}>
      Show Toast
    </button>
  );
}

function ClearComponent() {
  const { dismiss } = useToast();
  useEffect(() => {
    dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('Toast UI Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    render(<ClearComponent />);
  });

  it('renders and dismisses toasts', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    // Initial state: no toasts
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();

    // Trigger toast
    await act(async () => {
      await user.click(screen.getByText('Show Toast'));
    });

    // Check if toast appears
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('This is a test toast')).toBeInTheDocument();

    // Dismiss toast using fallback for close button
    const closeButton = document.querySelector('button[toast-close]');
    await act(async () => {
        closeButton.click();
    });

    // Verify it's removed
    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });
});
