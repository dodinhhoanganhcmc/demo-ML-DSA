import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Specimen } from "./Specimen";
import { bytesToB64 } from "@/lib/bytes";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const key = bytesToB64(Uint8Array.from({ length: 1312 }, (_, i) => i % 256));
const expected = Array.from({ length: 64 }, (_, i) => i.toString(16).padStart(2, "0")).join("");

describe("public key prefix", () => {
  it("keeps signature hex without rendering the signature byte chart", () => {
    const { container } = render(<Specimen publicKey={key} signature={btoa("signature")} />);
    expect(container.querySelector(".field-bars")).toBeNull();
    expect(screen.queryByText(/Signature bytes/)).not.toBeInTheDocument();
    expect(screen.getByText("73 69 67 6e 61 74 75 72 65")).toBeInTheDocument();
  });
  it("disables copying without a complete 64-byte prefix", () => {
    const { rerender } = render(<Specimen />);
    expect(screen.getByRole("button")).toBeDisabled();
    rerender(<Specimen publicKey={btoa("short")} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
  it("copies exactly 64 decoded bytes as 128 hex characters", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { rerender } = render(<Specimen publicKey={key} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copied 64 bytes"));
    expect(writeText).toHaveBeenCalledWith(expected);
    expect(screen.getByRole("textbox")).toHaveValue(expected);
    expect(expected).toHaveLength(128);
    rerender(<Specimen publicKey={bytesToB64(new Uint8Array(1312).fill(255))} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("textbox")).toHaveValue("ff".repeat(64));
  });
  it.each([undefined, { writeText: () => Promise.reject(new Error("denied")) }])("selects hex for manual copy when clipboard is unavailable: %s", async (clipboard) => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });
    render(<Specimen publicKey={key} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Ctrl+C"));
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(128);
  });
});
