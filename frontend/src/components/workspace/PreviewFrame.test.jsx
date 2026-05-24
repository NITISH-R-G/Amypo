import { render, screen } from '@testing-library/react';
import PreviewFrame from './PreviewFrame';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./previewDocument', () => ({
  buildPreviewDocument: () => 'mocked content'
}));

// Need to mock URL.createObjectURL
if (typeof window.URL.createObjectURL === 'undefined') {
  window.URL.createObjectURL = () => 'mock-url';
}
if (typeof window.URL.revokeObjectURL === 'undefined') {
  window.URL.revokeObjectURL = () => {};
}

describe('PreviewFrame', () => {
  it('renders without crashing', () => {
    render(<PreviewFrame html="<h1>Test</h1>" css="" js="" />);
    expect(screen.getByText('sandbox.local')).toBeInTheDocument();
    expect(screen.getByTitle('Live Preview')).toBeInTheDocument();
  });
});
