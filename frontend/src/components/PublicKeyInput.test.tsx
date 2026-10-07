import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublicKeyInput } from "./PublicKeyInput";
import { bytesToB64 } from "@/lib/bytes";
import { api } from "@/lib/api";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("rejects bad input without accepting it, then accepts a full key", () => {
  const onAccept = vi.fn();
  render(<PublicKeyInput line="ML-DSA-65" activeKey="" disabled={false} onAccept={onAccept} />);
  fireEvent.change(screen.getByLabelText("Enter complete public key"), { target: { value: "your public key" } });
  fireEvent.click(screen.getByText("Validate and use key"));
  expect(onAccept).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent("1952 bytes");
  const key = bytesToB64(new Uint8Array(1952).fill(23));
  fireEvent.change(screen.getByLabelText("Enter complete public key"), { target: { value: key } });
  fireEvent.click(screen.getByText("Validate and use key"));
  expect(onAccept).toHaveBeenCalledWith(key);
  fireEvent.click(screen.getByText("Use session / file key"));
  expect(onAccept).toHaveBeenLastCalledWith(null);
});

it("generates a real key pair through the API and only selects its public key", async () => {
  const key = bytesToB64(new Uint8Array(1952).fill(45));
  vi.spyOn(api, "keygen").mockResolvedValue({ param_set: "ML-DSA-65", public_key: key, secret_key: "private", measured: { public_key_bytes: 1952, secret_key_bytes: 4032 }, keygen_ms: 1 });
  const onAccept = vi.fn();
  render(<PublicKeyInput line="ML-DSA-65" activeKey="" disabled={false} onAccept={onAccept} />);
  fireEvent.click(screen.getByText("Generate random verification key"));
  await waitFor(() => expect(onAccept).toHaveBeenCalledWith(key));
  expect(api.keygen).toHaveBeenCalledWith("ML-DSA-65");
  expect(screen.getByLabelText("Enter complete public key")).toHaveValue(key);
});
