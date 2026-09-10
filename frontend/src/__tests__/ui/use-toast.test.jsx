import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { expect, test, describe, beforeEach } from 'vitest';
import { useToast, toast, Toaster, dispatch } from '../../components/ui/use-toast';

function TestComponent() {
  const { toast: hookToast, toasts, dismiss } = useToast();

  return (
    <div>
      <button onClick={() => hookToast({ title: 'Hook Toast', description: 'desc' })}>
        Add Toast
      </button>
      <button onClick={() => dismiss(toasts[0]?.id)}>
        Dismiss Toast
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('useToast hook and Toaster', () => {
  beforeEach(() => {
    dispatch({ type: 'REMOVE_TOAST' });
  });

  test('adds a toast via toast function', () => {
    act(() => {
      toast({ title: 'Function Toast', description: 'function desc' });
    });

    render(<TestComponent />);
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  test('adds a toast via hook', () => {
    render(<TestComponent />);

    act(() => {
      screen.getByText('Add Toast').click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  test('dismisses a toast', () => {
    render(<TestComponent />);

    act(() => {
      screen.getByText('Add Toast').click();
    });

    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

    act(() => {
      screen.getByText('Dismiss Toast').click();
    });

    // Dismissing sets open to false, but it remains in state for animation
    expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
  });

  test('updates a toast via toast function returned object', () => {
    let toastRef;
    act(() => {
      toastRef = toast({ title: 'Initial Title', description: 'desc' });
    });

    act(() => {
      toastRef.update({ id: toastRef.id, title: 'Updated Title' });
    });

    render(<Toaster />);
    expect(screen.getByText('Updated Title')).toBeInTheDocument();
  });

  test('removes toast via dismiss all', () => {
    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
    });

    // Dismiss all sets open to false for all toasts
    act(() => {
      dispatch({ type: 'DISMISS_TOAST' });
    });

    render(<TestComponent />);
    expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
  });

  test('respects toast limit', () => {
    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' }); // Exceeds limit of 3
    });

    render(<TestComponent />);
    expect(screen.getByTestId('toast-count')).toHaveTextContent('3');
  });
});
