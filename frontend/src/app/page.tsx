import { headers } from "next/headers";
import { Demo } from "@/components/Demo";

export default async function Page() {
  // Nonce lets this inline JSON-LD block pass the strict script-src CSP.
  const nonce = (await headers()).get("x-nonce") ?? "";
  const team = [
    { name: "Đỗ Đình Hoàng Anh", id: "do-dinh-hoang-anh" },
    { name: "Ngô Bình Quang Anh", id: "ngo-binh-quang-anh" },
    { name: "Mai Đức Minh", id: "mai-duc-minh" },
    { name: "Trần Lê Minh", id: "tran-le-minh" },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "ML-DSA Signature Demo",
    url: "http://localhost:3000/",
    datePublished: "2026-10-02",
    dateModified: "2026-10-02",
    author: team.map(({ name, id }) => ({
      "@type": "Person",
      "@id": `http://localhost:3000/about#team-${id}`,
      name,
      url: "http://localhost:3000/about",
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Demo />
    </>
  );
}
