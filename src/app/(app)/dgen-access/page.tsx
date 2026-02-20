import { DGEN_ACCESS_URL } from "@/lib/constants";

export default function DgenAccessPage() {
  return (
    // Negative margins offset the content-area padding so the iframe fills edge-to-edge.
    // Height accounts for the sticky header (~5rem) plus some breathing room.
    <div className="h-[calc(100vh-8rem)] -m-3 sm:-m-4 md:-m-6 lg:-m-8">
      <iframe
        src={DGEN_ACCESS_URL}
        className="w-full h-full border-0"
        title="Dgen Access"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
