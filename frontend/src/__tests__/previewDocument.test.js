import { describe, it, expect } from 'vitest';
import { buildPreviewDocument } from '../components/workspace/previewDocument';

describe('buildPreviewDocument', () => {
  it('builds an empty document by default', () => {
    const doc = buildPreviewDocument();
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('<style>\n\n    </style>');
    expect(doc).toContain('<body>\n\n    <script>');
  });

  it('builds a document with provided html, css, and js', () => {
    const html = '<h1>Test</h1>';
    const css = 'h1 { color: red; }';
    const js = 'console.log("test");';
    const doc = buildPreviewDocument({ html, css, js });

    expect(doc).toContain(html);
    expect(doc).toContain(css);
    expect(doc).toContain(js);
  });
});
