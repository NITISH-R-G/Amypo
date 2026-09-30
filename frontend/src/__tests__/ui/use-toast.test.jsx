import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useToast, toast, Toaster } from '../../components/ui/use-toast';
import { useEffect } from 'react';

const TestComponent = () => {
  const { toast: hookToast, toasts, dismiss } = useToast();

  return (
    <div>
      <button onClick={() => hookToast({ title: 'Hook Toast', description: 'desc' })}>Show Hook Toast</button>
      <button onClick={() => toast({ title: 'Global Toast', description: 'desc2' })}>Show Global Toast</button>
      <button onClick={() => toast({ title: 'Updatable', id: '1' })}>Add Updatable</button>
      <button onClick={() => toast({ title: 'Updated', id: '1' })}>Update To</button>
      <button onClick={() => dismiss()}>Dismiss All</button>

      <div data-testid="toast-count">{toasts.length}</div>
      {toasts.map(t => (
         <div key={t.id} data-testid={`toast-${t.id}`}>
           {t.title}
           <button onClick={() => dismiss(t.id)}>Dismiss Me</button>
         </div>
      ))}
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
  beforeEach(async () => {
    vi.useFakeTimers();
    render(<ResetComponent />);
    await act(async () => {
      vi.runAllTimers();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast via the global toast function', async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Global Toast', description: 'desc2' });
    });

    // allow portal render
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText('Global Toast')).toBeInTheDocument();
    expect(screen.getByText('desc2')).toBeInTheDocument();
  });

  it('limits toasts to TOAST_LIMIT', async () => {
    const { unmount } = render(<Toaster />);
    act(() => {
      toast({ title: 'Toast 1' });
      toast({ title: 'Toast 2' });
      toast({ title: 'Toast 3' });
      toast({ title: 'Toast 4' }); // Should push out Toast 1 if limit is 3
    });

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();
  });

  it('can update an existing toast', async () => {
    // The test sets title via toast(), but since our TestComponent uses static IDs for the button,
    // the global toast function generates a new ID internally inside `toast()`.
    // We should directly test update by capturing the toast return.

    let t;
    const TestComponentUpdate = () => {
       const { toasts } = useToast();
       return (
         <div>
           <button onClick={() => { t = toast({ title: 'Updatable' }); }}>Add Updatable</button>
           <button onClick={() => { if(t) t.update({ title: 'Updated' }); }}>Update To</button>
           {toasts.map(toastItem => (
             <div key={toastItem.id}>{toastItem.title}</div>
           ))}
         </div>
       );
    };

    render(<TestComponentUpdate />);

    act(() => {
        screen.getByText('Add Updatable').click();
    });

    expect(screen.getByText('Updatable')).toBeInTheDocument();

    act(() => {
        screen.getByText('Update To').click();
    });

    expect(screen.queryByText('Updatable')).not.toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('can dismiss all toasts or a specific toast', async () => {
    // For dismissal, since useToast sets open: false but doesn't immediately filter them in the reducer,
    // we need to verify the state changes.
    let currentToasts = [];
    const TestComponentDismiss = () => {
      const { toasts, dismiss } = useToast();
      currentToasts = toasts;
      return (
        <div>
          <button onClick={() => toast({ title: 'Test 1' })}>Add 1</button>
          <button onClick={() => toast({ title: 'Test 2' })}>Add 2</button>
          <button onClick={() => dismiss()}>Dismiss All</button>
          <button onClick={() => dismiss(toasts[0]?.id)}>Dismiss First</button>
          {toasts.map(t => (
            <div key={t.id} data-open={t.open}>{t.title}</div>
          ))}
        </div>
      );
    };

    render(<TestComponentDismiss />);

    act(() => {
      screen.getByText('Add 1').click();
      screen.getByText('Add 2').click();
    });

    expect(screen.getByText('Test 1')).toBeInTheDocument();
    expect(screen.getByText('Test 2')).toBeInTheDocument();

    // Verify both are open
    expect(currentToasts[0].open).toBe(true);
    expect(currentToasts[1].open).toBe(true);

    act(() => {
      screen.getByText('Dismiss First').click(); // Dismisses the most recent one (Test 2)
    });

    expect(currentToasts[0].open).toBe(false); // Test 2
    expect(currentToasts[1].open).toBe(true); // Test 1

    act(() => {
        screen.getByText('Dismiss All').click();
    });

    expect(currentToasts[0].open).toBe(false);
    expect(currentToasts[1].open).toBe(false);
  });

  it('returns correctly formed toast object from global toast()', () => {
     const t = toast({ title: 'Title' });
     expect(t).toHaveProperty('id');
     expect(t).toHaveProperty('dismiss');
     expect(t).toHaveProperty('update');
  });
});
