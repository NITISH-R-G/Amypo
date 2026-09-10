import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as React from 'react';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from '../../components/ui/toast';

describe('toast components', () => {
  it('renders all toast components without error', () => {
    // Radix requires ToastProvider around Toast to work, and normally needs open state
    // but the component might control open natively depending on how it's used
    render(
      <ToastProvider>
        <ToastViewport />
        <Toast variant="default" className="test-toast" open={true}>
          <ToastTitle>Title</ToastTitle>
          <ToastDescription>Description</ToastDescription>
          <ToastAction altText="Action">Action</ToastAction>
          <ToastClose />
        </Toast>
      </ToastProvider>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders destructive variant', () => {
    render(
      <ToastProvider>
        <ToastViewport />
        <Toast variant="destructive" open={true}>
          <ToastTitle>Destructive</ToastTitle>
        </Toast>
      </ToastProvider>
    );
    expect(screen.getByText('Destructive')).toBeInTheDocument();
  });
});
