import { render, screen, act, fireEvent } from '@testing-library/react';
import { useToast, toast, Toaster } from '../../components/ui/use-toast';
import { useEffect } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const TestComponent = () => {
  const { toast: hookToast, dismiss } = useToast();
  return (
    <div>
      <button onClick={() => hookToast({ title: 'Hook Title', description: 'Hook Description', action: <button>Action</button> })}>Show Hook Toast</button>
      <button onClick={() => {
        const { id, update } = toast({ title: 'Direct Title', description: 'Direct Description' });
        setTimeout(() => update({ title: 'Updated Title' }), 100);
      }}>Show Direct Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      <button onClick={() => {
        const t1 = toast({ title: 'T1' });
        const t2 = toast({ title: 'T2' });
        const t3 = toast({ title: 'T3' });
        const t4 = toast({ title: 'T4' }); // Should push T1 out
        setTimeout(() => dismiss(t2.id), 50); // specific dismiss
      }}>Spam</button>
      <button onClick={() => dismiss('non-existent-id')}>Dismiss None</button>
      <Toaster />
    </div>
  );
};

const ResetComponent = () => {
    const { dismiss } = useToast();
    useEffect(() => {
        dismiss();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
};

describe('use-toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<ResetComponent />);
  });
  afterEach(() => {
      vi.useRealTimers();
  });

  it('renders, updates and dismisses toasts via hook', async () => {
    render(<TestComponent />);

    const showHookToast = screen.getByText('Show Hook Toast');

    act(() => {
      showHookToast.click();
    });

    expect(screen.getByText('Hook Title')).toBeInTheDocument();

    // Test auto-dismiss / onOpenChange
    act(() => {
        // The toast close button doesn't have an aria-label, using querySelector
        const closeBtn = document.querySelector('button[toast-close]');
        if(closeBtn) closeBtn.click();
    });

    const showDirectToast = screen.getByText('Show Direct Toast');
    act(() => {
      showDirectToast.click();
    });

    expect(screen.getByText('Direct Title')).toBeInTheDocument();

    act(() => {
        vi.advanceTimersByTime(200);
    });

    expect(screen.getByText('Updated Title')).toBeInTheDocument();

    const dismissAll = screen.getByText('Dismiss All');
    act(() => {
      dismissAll.click();
    });

    const spam = screen.getByText('Spam');
    act(() => {
        spam.click();
    });

    act(() => {
        vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('T1')).not.toBeInTheDocument(); // Limited to 3
    expect(screen.queryByText('T2')).not.toBeInTheDocument(); // Dismissed specific

    const dismissNone = screen.getByText('Dismiss None');
    act(() => {
        dismissNone.click();
    });

    // specifically target REMOVE_TOAST which isn't publicly exposed easily without waiting for Radix internal unmounts
    act(() => {
      vi.advanceTimersByTime(100000);
    });
  });
});
