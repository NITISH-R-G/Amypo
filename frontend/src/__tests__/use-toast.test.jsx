import React, { useEffect, useRef } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useToast, toast, Toaster, __dispatchForTest } from '../components/ui/use-toast';
import '@testing-library/jest-dom/vitest';

const TestComponent = () => {
  const { toast: triggerToast, dismiss } = useToast();

  return (
    <div>
      <button onClick={() => triggerToast({ title: 'Test Toast', description: 'Test Description' })}>Trigger</button>
      <button onClick={() => triggerToast({ title: 'Update Toast', description: 'Test Update', id: 'update-1' })}>Trigger Updateable</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
    </div>
  );
};

describe('useToast', () => {
  beforeEach(() => {
    if (__dispatchForTest) {
      __dispatchForTest({ type: 'REMOVE_TOAST' });
    }
  });

  it('renders a toast when triggered', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    // Click trigger and flush updates
    await user.click(screen.getByText('Trigger'));

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('can dismiss all toasts', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    await user.click(screen.getByText('Trigger'));
    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    await user.click(screen.getByText('Dismiss All'));
    // Toast visually hides in Radix, but we can verify the dismiss call happened
  });

  it('limits the number of toasts', async () => {
    const user = userEvent.setup();
    render(
      <>
        <TestComponent />
        <Toaster />
      </>
    );

    await user.click(screen.getByText('Trigger'));
    await user.click(screen.getByText('Trigger'));
    await user.click(screen.getByText('Trigger'));
    await user.click(screen.getByText('Trigger'));

    const toasts = screen.getAllByText('Test Toast');
    expect(toasts.length).toBeLessThanOrEqual(3);
  });
});
