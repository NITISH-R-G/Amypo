const fs = require('fs');

let code = fs.readFileSync('frontend/src/__tests__/use-toast.test.jsx', 'utf8');

// I will fix the stray `it` block
code = code.replace(`});
  it('should render ToastAction and ToastClose properly', async () => {
    const { ToastAction, ToastClose } = await import('../components/ui/toast');
    render(<ToastAction altText="Action">Action</ToastAction>);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
`, `
  it('should render ToastAction and ToastClose properly', async () => {
    const { ToastAction, ToastClose } = await import('../components/ui/toast');
    render(<ToastAction altText="Action">Action</ToastAction>);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});`);

fs.writeFileSync('frontend/src/__tests__/use-toast.test.jsx', code);
