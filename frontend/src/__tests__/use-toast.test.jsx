import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useToast, toast, Toaster } from '../components/ui/use-toast';
import * as React from 'react';

describe('use-toast', () => {
  beforeEach(() => {
    // Clear the memory state
    const { result } = renderHook(() => useToast());
    act(() => {
      // Need to clear by returning dispatch to an empty state or dismissing all.
      // Since dismiss just sets open to false, we can't truly remove them without REMOVE_TOAST which isn't exported directly.
      // But we can clear it by rendering hook and setting a dummy variable or relying on our teardown.
      // The issue is state leaks across tests.
      // Let's manually trigger a fake action if we can't.
      // Since we can't clear the array completely via API, let's just assert relatively or track counts.
      // Wait, dismiss only sets open to false, it doesn't clear `toasts`.
      // The hook uses REMOVE_TOAST internally inside a setTimeout inside `Toast` component,
      // but without the component it stays in memoryState.
      // Wait! `toast` returns an id, `dismiss` just marks `open: false`.
    });
  });

  afterEach(() => {
    const { result } = renderHook(() => useToast());
    act(() => {
      // Dismiss all
      result.current.dismiss();
    });
  });

  it('should add a toast and dismiss it', () => {
    const { result } = renderHook(() => useToast());

    let initialLength = result.current.toasts.length;

    act(() => {
      toast({ title: 'Test Toast', description: 'This is a test' });
    });

    expect(result.current.toasts).toHaveLength(initialLength + 1);
    expect(result.current.toasts[0].title).toBe('Test Toast');
    expect(result.current.toasts[0].open).toBe(true);

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should dismiss all toasts when no id is passed', () => {
    const { result } = renderHook(() => useToast());

    let initialLength = result.current.toasts.length;

    act(() => {
      toast({ title: 'Toast A' });
      toast({ title: 'Toast B' });
    });

    expect(result.current.toasts).toHaveLength(initialLength + 2);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
    expect(result.current.toasts[1].open).toBe(false);
  });

  it('should dismiss toasts when closing through onOpenChange', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast 1' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.toasts[0].onOpenChange(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should respect TOAST_LIMIT', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast X1' });
      toast({ title: 'Toast X2' });
      toast({ title: 'Toast X3' });
      toast({ title: 'Toast X4' }); // Exceeds limit of 3
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].title).toBe('Toast X4');
  });

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast());

    let id;
    act(() => {
      const t = toast({ title: 'Test Toast To Update' });
      id = t.id;
    });

    expect(result.current.toasts[0].title).toBe('Test Toast To Update');

    act(() => {
      toast({ id, title: 'Updated Toast' }).update({ title: 'Updated Toast 2' });
    });

    expect(result.current.toasts[0].title).toBe('Updated Toast 2');
  });

  it('renders Toaster with toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Component Toast', description: 'Description' });
    });

    render(<Toaster />);
    expect(screen.getByText('Component Toast')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});
