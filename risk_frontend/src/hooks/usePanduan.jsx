import { useState } from "react";
import { BookOpen } from "lucide-react";
import PanduanModal from "../pages/Panduan/Panduan";

/**
 * Shared hook for PanduanModal state + trigger + render
 * Replaces the 4-line pattern repeated in 8+ files:
 *   const [isPanduanOpen, setIsPanduanOpen] = useState(false);
 *   <BookOpen onClick={() => setIsPanduanOpen(true)} />
 *   {isPanduanOpen && <PanduanModal isOpen={isPanduanOpen} onClose={() => setIsPanduanOpen(false)} />}
 *
 * Usage:
 *   const { openPanduan, PanduanTrigger, PanduanRenderer } = usePanduan();
 *   <PanduanTrigger />
 *   {PanduanRenderer}
 */
export function usePanduan() {
  const [isOpen, setIsOpen] = useState(false);

  const openPanduan = () => setIsOpen(true);
  const closePanduan = () => setIsOpen(false);

  const PanduanTrigger = (props) => (
    <BookOpen
      size={20}
      className="panduan-button"
      onClick={openPanduan}
      style={{ cursor: "pointer", color: "#3b82f6", ...props?.style }}
      {...props}
    />
  );

  const PanduanRenderer = isOpen ? (
    <PanduanModal isOpen={isOpen} onClose={closePanduan} />
  ) : null;

  return { isPanduanOpen: isOpen, openPanduan, closePanduan, PanduanTrigger, PanduanRenderer };
}
