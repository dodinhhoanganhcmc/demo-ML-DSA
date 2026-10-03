/* Component tests for the live signing flow (rubric: frontend tests).
 *
 * `fetch` is mocked with a tiny fake backend that reproduces exactly the two
 * guarantees the real API makes: a signature verifies only against the key
 * pair that produced it, and only for the byte-identical message that was
 * signed. Everything else runs for real — the .ml-dsa container encode/decode,
 * the DOM flows, and the download plumbing (URL.createObjectURL + <a download>
 * are captured, not faked away).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Demo } from "./Demo";
import { decodeBundle } from "@/lib/bundle";

const API = "http://127.0.0.1:8000";

// jsdom's Blob historically lacks arrayBuffer(); the component calls it, so
// polyfill defensively (FileReader is always there).
if (typeof Blob.prototype.arrayBuffer !== "function") {
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    configurable: true,
    writable: true,
    value: function blobArrayBuffer(this: Blob): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    },
  });
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

const paramsFixture = {
  param_sets: [
    {
      name: "ML-DSA-44",
      security_category: 2,
      standard_reference: {
        public_key_bytes: 1312,
        secret_key_bytes: 2560,
        signature_bytes: 2420,
        source: "FIPS 204 Table 2, p.16",
      },
    },
    {
      name: "ML-DSA-65",
      security_category: 3,
      standard_reference: {
        public_key_bytes: 1952,
        secret_key_bytes: 4032,
        signature_bytes: 3309,
        source: "FIPS 204 Table 2, p.16",
      },
    },
    {
      name: "ML-DSA-87",
      security_category: 5,
      standard_reference: {
        public_key_bytes: 2592,
        secret_key_bytes: 4896,
        signature_bytes: 4627,
        source: "FIPS 204 Table 2, p.16",
      },
    },
  ],
  classical: [
    { name: "Ed25519", source: "RFC 8032" },
    { name: "RSA-2048", source: "RFC 8017" },
  ],
  max_message_bytes: 1_048_576,
};

interface FakeBackend {
  healthOk: boolean;
  currentPk: string;
  boundPk: string | null;
  lastMessage: string | null;
  lastSignature: string | null;
  keyCounter: number;
}

function installBackend(backend: FakeBackend) {
  const respond = (data: unknown, status = 200, statusText = "OK") => ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => data,
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input).replace(API, "");
      if (path === "/api/health" && !backend.healthOk) {
        throw new Error("network down");
      }
      const body = init?.body
        ? (JSON.parse(init.body as string) as Record<string, unknown>)
        : {};
      switch (path) {
        case "/api/health":
          return respond({ status: "ok" });
        case "/api/params":
          return respond(paramsFixture);
        case "/api/keys": {
          backend.keyCounter += 1;
          // valid base64: Specimen decodes keys during render, exactly as in
          // production where the real API always returns valid base64
          backend.currentPk = btoa(`public-key-${backend.keyCounter}`);
          return respond({
            param_set: body.param_set,
            public_key: backend.currentPk,
            secret_key: btoa(`secret-key-${backend.keyCounter}`),
            measured: { public_key_bytes: 1952, secret_key_bytes: 4032 },
            keygen_ms: 1.5,
          });
        }
        case "/api/signatures": {
          // a signature is bound to the key pair active at signing time
          backend.boundPk = backend.currentPk;
          backend.lastMessage = String(body.message);
          backend.lastSignature = "c2lnbmF0dXJlLWJ5dGVz";
          return respond({
            param_set: body.param_set,
            signature: backend.lastSignature,
            measured: { signature_bytes: 3309 },
            message_bytes: String(body.message).length,
            sign_ms: 0.5,
          });
        }
        case "/api/verifications": {
          const valid =
            body.public_key === backend.boundPk &&
            body.message === backend.lastMessage &&
            body.signature === backend.lastSignature;
          return respond({
            param_set: body.param_set,
            valid,
            verify_ms: 0.07,
            note: valid ? "signature verifies" : "signature does not verify",
          });
        }
        default:
          return respond(
            { title: "Not found", detail: `no mock for ${path}` },
            404,
            "Not Found",
          );
      }
    }),
  );
}

let backend: FakeBackend;
let createdBlobs: Blob[];
let downloads: { name: string; href: string }[];

beforeEach(() => {
  backend = {
    healthOk: true,
    currentPk: "",
    boundPk: null,
    lastMessage: null,
    lastSignature: null,
    keyCounter: 0,
  };
  installBackend(backend);

  createdBlobs = [];
  downloads = [];
  Object.assign(URL, {
    createObjectURL: vi.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return `blob:mock-${createdBlobs.length}`;
    }),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ name: this.download, href: this.href });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function verdict(state: "valid" | "invalid") {
  return document.querySelector(`[data-verdict="${state}"]`);
}

async function startSignedSession(
  user: ReturnType<typeof userEvent.setup>,
) {
  await screen.findByText("API online");
  await user.click(screen.getByTestId("keygen"));
  await user.click(screen.getByTestId("sign"));
}

describe("Demo — core signing flow", () => {
  it("boots online with the parameter reference loaded", async () => {
    render(<Demo />);
    expect(await screen.findByText("API online")).toBeInTheDocument();
    expect(screen.getByTestId("line-ML-DSA-65")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reports the API as offline when health fails", async () => {
    backend.healthOk = false;
    render(<Demo />);
    expect(await screen.findByText("API offline")).toBeInTheDocument();
  });

  it("keygens, signs and verifies a message (happy path)", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await screen.findByText("API online");
    await user.click(screen.getByTestId("keygen"));
    await user.click(screen.getByTestId("sign"));
    await user.click(screen.getByTestId("verify"));
    await waitFor(() => expect(verdict("valid")).not.toBeNull());
  });

  it("rejects a corrupted message (tamper drill)", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await startSignedSession(user);

    await user.click(screen.getByTestId("drill-message"));
    expect(screen.getByTestId("notice")).toHaveTextContent(/tampered/i);

    await user.click(screen.getByTestId("verify"));
    await waitFor(() => expect(verdict("invalid")).not.toBeNull());
  });

  it("rejects verification with a freshly generated key", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await startSignedSession(user);

    await user.click(screen.getByTestId("drill-wrong-key"));
    await waitFor(() => expect(verdict("invalid")).not.toBeNull());
    expect(screen.getByTestId("notice")).toHaveTextContent(/freshly generated/i);
  });

  it("refuses files above the 1 MiB demo guard before sending anything", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await screen.findByText("API online");
    await user.click(screen.getByRole("button", { name: "File" }));

    await user.upload(
      screen.getByLabelText("Choose a file to sign"),
      new File([new Uint8Array(1_048_577)], "huge.bin", {
        type: "application/octet-stream",
      }),
    );
    expect(await screen.findByTestId("error")).toHaveTextContent(
      /accepts files up to/,
    );
  });
});

describe("Demo — signed file interchange (.ml-dsa container)", () => {
  it("signs a file, downloads the container, verifies it and extracts the original", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await screen.findByText("API online");
    await user.click(screen.getByTestId("keygen"));

    // 1 · upload a file and sign it
    await user.click(screen.getByRole("button", { name: "File" }));
    const payload = new TextEncoder().encode(
      "quarterly report — numbers attached",
    );
    await user.upload(
      screen.getByLabelText("Choose a file to sign"),
      new File([new Uint8Array(payload)], "report.txt", {
        type: "text/plain",
      }),
    );
    await user.click(screen.getByTestId("sign"));

    // 2 · download the signed container (stateless: assembled in the browser)
    const downloadBtn = await screen.findByTestId("download-signed");
    await waitFor(() => expect(downloadBtn).toBeEnabled());
    await user.click(downloadBtn);

    expect(downloads.at(-1)?.name).toBe("report.txt.ml-dsa");
    const containerBytes = await blobBytes(createdBlobs.at(-1)!);
    const content = decodeBundle(containerBytes);
    expect(content.name).toBe("report.txt");
    expect(content.type).toBe("text/plain");
    expect(content.param_set).toBe("ML-DSA-65");
    expect(content.public_key).toBe(backend.currentPk);
    expect(Array.from(content.message)).toEqual(Array.from(payload));

    // 3 · the reverse direction: open the container and verify it standalone
    await user.upload(
      screen.getByLabelText("Open a signed .ml-dsa file"),
      new File([new Uint8Array(containerBytes)], "report.txt.ml-dsa", {
        type: "application/octet-stream",
      }),
    );
    expect(await screen.findByTestId("notice")).toHaveTextContent(
      "report.txt",
    );
    await user.click(screen.getByTestId("verify"));
    await waitFor(() => expect(verdict("valid")).not.toBeNull());

    // 4 · extract the original file, byte-identical
    const extractBtn = await screen.findByTestId("download-original");
    await user.click(extractBtn);
    expect(downloads.at(-1)?.name).toBe("report.txt");
    const extracted = await blobBytes(createdBlobs.at(-1)!);
    expect(Array.from(extracted)).toEqual(Array.from(payload));
  });

  it("fails verification when the container's message was tampered with", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await screen.findByText("API online");
    await user.click(screen.getByTestId("keygen"));
    await user.click(screen.getByRole("button", { name: "File" }));

    const payload = new TextEncoder().encode("integrity matters");
    await user.upload(
      screen.getByLabelText("Choose a file to sign"),
      new File([new Uint8Array(payload)], "doc.txt", { type: "text/plain" }),
    );
    await user.click(screen.getByTestId("sign"));
    const downloadBtn = await screen.findByTestId("download-signed");
    await waitFor(() => expect(downloadBtn).toBeEnabled());
    await user.click(downloadBtn);

    // flip one byte of the container's message area, then open it
    const containerBytes = await blobBytes(createdBlobs.at(-1)!);
    containerBytes[containerBytes.length - 1] ^= 0x01;
    await user.upload(
      screen.getByLabelText("Open a signed .ml-dsa file"),
      new File([new Uint8Array(containerBytes)], "doc.txt.ml-dsa", {
        type: "application/octet-stream",
      }),
    );
    await screen.findByTestId("notice");
    await user.click(screen.getByTestId("verify"));
    await waitFor(() => expect(verdict("invalid")).not.toBeNull());
    expect(screen.queryByTestId("download-original")).toBeNull();
  });

  it("shows a clear error for a file that is not a .ml-dsa container", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await screen.findByText("API online");

    await user.upload(
      screen.getByLabelText("Open a signed .ml-dsa file"),
      new File([new TextEncoder().encode("%PDF-1.7 fake")], "fake.ml-dsa", {
        type: "application/octet-stream",
      }),
    );
    expect(await screen.findByTestId("error")).toHaveTextContent(
      /magic header/i,
    );
    expect(screen.queryByTestId("download-original")).toBeNull();
  });
});
