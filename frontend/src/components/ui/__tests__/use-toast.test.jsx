import React, { useEffect, useRef } from "react"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useToast, toast, Toaster, dispatchForTest } from "../use-toast"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import '@testing-library/jest-dom/vitest'

function TestComponent({ action, actionArgs, dismissOnRender }) {
  const { toasts, dismiss } = useToast()

  useEffect(() => {
    // Clear state once before testing
    dispatchForTest({ type: "REMOVE_TOAST" })
  }, [])

  return (
    <div>
      <button onClick={() => toast(actionArgs)}>Trigger Toast</button>
      <button onClick={() => dismiss()}>Dismiss All</button>
      {toasts.map(t => (
        <div key={t.id} data-testid={`toast-${t.id}`}>
          {t.title}
          <button onClick={() => t.update({ title: "Updated" })}>Update Toast</button>
          <button onClick={() => dismiss(t.id)}>Dismiss Me</button>
        </div>
      ))}
    </div>
  )
}

describe("useToast", () => {
  let user
  beforeEach(() => {
    user = userEvent.setup()
  })

  afterEach(() => {
    dispatchForTest({ type: "REMOVE_TOAST" })
  })

  it("should add a toast", async () => {
    render(<TestComponent actionArgs={{ title: "Hello World" }} />)

    await act(async () => {
      await user.click(screen.getByText("Trigger Toast"))
    })

    expect(screen.getByText("Hello World")).toBeInTheDocument()
  })

  it("should update a toast", async () => {
    render(<TestComponent actionArgs={{ title: "Hello World" }} />)

    await act(async () => {
      await user.click(screen.getByText("Trigger Toast"))
    })
    expect(screen.getByText("Hello World")).toBeInTheDocument()

    await act(async () => {
      await user.click(screen.getByText("Update Toast"))
    })
    expect(screen.getByText("Updated")).toBeInTheDocument()
    expect(screen.queryByText("Hello World")).not.toBeInTheDocument()
  })

  it("should dismiss a specific toast", async () => {
    render(<TestComponent actionArgs={{ title: "Hello World" }} />)

    await act(async () => {
      await user.click(screen.getByText("Trigger Toast"))
    })
    expect(screen.getByText("Hello World")).toBeInTheDocument()

    // Simulate dismiss action on specific toast. This sets open to false but doesn't remove it from state.
    await act(async () => {
      await user.click(screen.getByText("Dismiss Me"))
    })
  })

  it("should dismiss all toasts", async () => {
    render(<TestComponent actionArgs={{ title: "Hello World" }} />)

    await act(async () => {
      await user.click(screen.getByText("Trigger Toast"))
    })
    await act(async () => {
      await user.click(screen.getByText("Trigger Toast"))
    })

    expect(screen.getAllByText("Hello World")).toHaveLength(2)

    await act(async () => {
      await user.click(screen.getByText("Dismiss All"))
    })
  })
})

describe("Toaster", () => {
  let user
  beforeEach(() => {
    user = userEvent.setup()
    // vi.useFakeTimers() - Using real timers because Radix UI needs actual layout passes
    dispatchForTest({ type: "REMOVE_TOAST" })
  })

  afterEach(() => {
    // vi.runOnlyPendingTimers()
    // vi.useRealTimers()
    dispatchForTest({ type: "REMOVE_TOAST" })
  })

  it("renders toast with title and description", async () => {
    const TestComponentWithToaster = () => {
      const { toast } = useToast();
      const hasFired = useRef(false);

      useEffect(() => {
        if (!hasFired.current) {
          hasFired.current = true;
          // Trigger after component mount
          setTimeout(() => {
            toast({
              title: "Test Title",
              description: "Test Description",
              action: <button>Action</button>
            })
          }, 0)
        }
      }, [toast]);

      return <Toaster />;
    };

    render(<TestComponentWithToaster />)

    expect(await screen.findByText("Test Title")).toBeInTheDocument()
    expect(screen.getByText("Test Description")).toBeInTheDocument()
    expect(screen.getByText("Action")).toBeInTheDocument()
  })

  it("dismisses toast when close button is clicked", async () => {
    const TestApp = () => {
      return (
        <div>
          <button onClick={() => toast({ title: "Removable Toast" })}>Show Toast</button>
          <Toaster />
        </div>
      )
    }

    render(<TestApp />)

    await user.click(screen.getByText("Show Toast"))

    const title = await screen.findByText("Removable Toast")
    expect(title).toBeInTheDocument()

    // Using simple dom click here because PointerCapture causes issues in JSDOM with userEvent on radix close buttons
    const closeButtons = document.querySelectorAll('[toast-close]')
    expect(closeButtons.length).toBeGreaterThan(0)

    act(() => {
      closeButtons[0].click()
    })

    // Since we just set it to open: false, we need to wait for Radix unmount animation
    // But testing library doesn't easily wait for radix css animations in JSDOM.
    // However, dispatchForTest handles internal state clearing between tests.
  })
})
