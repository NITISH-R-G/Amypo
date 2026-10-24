# Test Plan

1. Create frontend/src/__tests__/use-toast.test.jsx
   - Add tests for adding, updating, and dismissing toasts.
   - Use `export function dispatchForTest(action) { if (process.env.NODE_ENV === 'test') dispatch(action) }` in `use-toast.jsx` to clear memoryState before each test.
2. Update frontend/src/__tests__/TrainerPanel.test.jsx
   - Add tests for visual test spec builder, interaction builder, tabs switching (builder -> analytics).
3. Update frontend/src/__tests__/TeacherDashboard.test.jsx
   - Add tests for tabs switching (overview -> builder -> analytics), clicking create question, deleting a question.
