import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Header from "../Header";

// Mock the window resize event
const resizeWindowHeight = (height: number) => {
  window.innerHeight = height;
  window.dispatchEvent(new Event("resize"));
};

describe("Header Component", () => {
  beforeEach(() => {
    resizeWindowHeight(768);
  });
  it("should render header with correct content", () => {
    render(<Header />);

    // Check if the header is in the document
    const headerElement = screen.getByTestId("header-bar");
    expect(headerElement).toBeInTheDocument();

    // Check if the title is rendered
    expect(screen.getByText("Smile Coder")).toBeInTheDocument();

    // Check if the user profile image is rendered
    expect(screen.getByAltText("User Profile")).toBeInTheDocument();

    // Check if the user's name is rendered
    expect(screen.getByTestId("header-username")).toBeInTheDocument();
  });

  it("should hide header when in fullscreen mode", async () => {
    render(<Header />);

    const headerElement = screen.getByTestId("header-bar");

    // Check if the header is not hidden
    expect(headerElement).not.toHaveClass("hidden");

    // Simulate fullscreen mode
    resizeWindowHeight(window.screen.height);
    await waitFor(
      () => {
        headerElement.classList.contains("hidden");
      },
      { timeout: 1000 }
    );

    // Check if the header is hidden
    expect(headerElement).toHaveClass("hidden");
  });

  it("should show header when not in fullscreen mode", () => {
    render(<Header />);

    // Simulate normal window size
    resizeWindowHeight(768);

    // Check if the header is visible
    const headerElement = screen.getByTestId("header-bar");
    expect(headerElement).not.toHaveClass("hidden");
  });

  it("should add and remove resize event listener", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<Header />);

    expect(addEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
