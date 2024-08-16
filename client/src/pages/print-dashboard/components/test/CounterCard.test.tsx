import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import CounterCard from "../CounterCard";

describe("CounterCard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with success color schema", () => {
    const color = "success";
    const value = "10";
    const caption = "Success caption";
    render(<CounterCard color={color} value={value} caption={caption} />);
    const cardWrapper = screen.getByTestId("card-wrapper");
    expect(cardWrapper).toHaveClass("border-green-400");
    expect(cardWrapper).toHaveClass("bg-green-100");
    const cardTitle = screen.getByTestId("card-title");
    expect(cardTitle).toHaveClass("text-green-800");
    expect(cardTitle).toHaveTextContent(caption);
    const cardValue = screen.getByTestId("card-value");
    expect(cardValue).toHaveTextContent(value);
  });

  it("renders with warning color schema", () => {
    const color = "warning";
    const value = "10";
    const caption = "Warning caption";
    render(<CounterCard color={color} value={value} caption={caption} />);
    const cardWrapper = screen.getByTestId("card-wrapper");
    expect(cardWrapper).toHaveClass("border-yellow-400");
    expect(cardWrapper).toHaveClass("bg-yellow-100");
    const cardTitle = screen.getByTestId("card-title");
    expect(cardTitle).toHaveClass("text-yellow-800");
    expect(cardTitle).toHaveTextContent(caption);
    const cardValue = screen.getByTestId("card-value");
    expect(cardValue).toHaveTextContent(value);
  });

  it("renders with danger color schema", () => {
    const color = "danger";
    const value = "10";
    const caption = "Danger caption";
    render(<CounterCard color={color} value={value} caption={caption} />);
    const cardWrapper = screen.getByTestId("card-wrapper");
    expect(cardWrapper).toHaveClass("border-red-400");
    expect(cardWrapper).toHaveClass("bg-red-100");
    const cardTitle = screen.getByTestId("card-title");
    expect(cardTitle).toHaveClass("text-red-800");
    expect(cardTitle).toHaveTextContent(caption);
    const cardValue = screen.getByTestId("card-value");
    expect(cardValue).toHaveTextContent(value);
  });

  it("renders with secondary color schema", () => {
    const color = "secondary";
    const value = "10";
    const caption = "Secondary caption";
    render(<CounterCard color={color} value={value} caption={caption} />);
    const cardWrapper = screen.getByTestId("card-wrapper");
    expect(cardWrapper).toHaveClass("border-gray-400");
    expect(cardWrapper).toHaveClass("bg-gray-100");
    const cardTitle = screen.getByTestId("card-title");
    expect(cardTitle).toHaveClass("text-gray-800");
    expect(cardTitle).toHaveTextContent(caption);
    const cardValue = screen.getByTestId("card-value");
    expect(cardValue).toHaveTextContent(value);
  });
});
