import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';
import QuestionPanel from '../components/workspace/QuestionPanel';

describe('QuestionPanel Security', () => {
  it('should sanitize question description to prevent XSS', () => {
    const maliciousDescription = '<p>Some text</p><script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')" />';

    const question = {
      title: 'Test Question',
      difficulty: 'Easy',
      description: maliciousDescription,
      requirements: []
    };

    render(<QuestionPanel question={question} />);

    // Check that the script tag was stripped
    const descriptionElement = screen.getByText('Some text').parentElement;
    expect(descriptionElement.innerHTML).not.toContain('<script>');
    // DOMPurify removes the onerror attribute by default
    expect(descriptionElement.innerHTML).not.toContain('onerror');
    // Ensure harmless text was still rendered
    expect(descriptionElement.innerHTML).toContain('<p>Some text</p>');
  });
});
