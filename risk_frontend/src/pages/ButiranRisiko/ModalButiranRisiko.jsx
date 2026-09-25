import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ButiranRisiko from "./ButiranRisiko";

/**
 * /risiko/:id sebagai modal besar di atas halaman latar (lihat
 * hooks/useBukaRisiko). Klik di luar tidak menutup modal supaya borang yang
 * sedang diisi tidak hilang; tutup melalui butang X, Escape atau Back pelayar.
 */
export default function ModalButiranRisiko() {
  const lokasi = useLocation();
  const navigate = useNavigate();
  const latar = lokasi.state?.latar;

  const tutup = () =>
    navigate(latar ? { pathname: latar.pathname, search: latar.search } : "/SenaraiRisiko", {
      replace: true,
    });

  return (
    <Dialog open onOpenChange={(buka) => !buka && tutup()}>
      <DialogContent
        aria-describedby={undefined}
        onInteractOutside={(e) => e.preventDefault()}
        className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[92vh] sm:w-[94vw] sm:max-w-6xl sm:rounded-xl"
      >
        <DialogTitle className="sr-only">Butiran risiko</DialogTitle>
        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-4 pb-6 pt-4 sm:px-6">
          <ButiranRisiko onTutup={tutup} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
