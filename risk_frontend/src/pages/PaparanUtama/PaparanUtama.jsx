import { useState } from "react";
import DashboardHeader from "./DashboardHeader.jsx";
import DashboardBoxes from "./DashboardBoxes.jsx";
import FilterModal from "./FilterModal.jsx";
import "./PaparanUtama.css";
import LogoUKMH from "../../assets/images/Light Background/UKMH_light.png";

export default function PaparanUtama() {
  const [filterValues, setFilterValues] = useState({
    subsidiari: "Semua Subsidiari",
    tahunAsas: "2024",
    separuhAsas: "H1",
    tahunBanding: "2025",
    separuhBanding: "H2",
  });

  const [showModal, setShowModal] = useState(false);

  const boxes = [
    { title: "Jumlah Risiko", value: 0 },
    { title: "Risiko Aktif", value: 0 },
    { title: "Jenis Kawalan", value: 0 },
    { title: "Status Pemantauan", value: 0 },
    { title: "Kategori Risiko", value: 0 },
    { title: "Status Risiko", value: 0 },
  ];

  return (
    <div className="PaparanUtama">
      <DashboardHeader setShowModal={setShowModal} />
      <DashboardBoxes boxes={boxes} logo={LogoUKMH} />
      {showModal && (
        <FilterModal
          filterValues={filterValues}
          setFilterValues={setFilterValues}
          setShowModal={setShowModal}
        />
      )}
    </div>
  );
}
