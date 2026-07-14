import { useState, useEffect, useCallback } from "react";
import { getRiskMatrix } from "../constants/riskMatrix";
import api from "../api/api";

/**
 * Shared hook for fetching risk list with risk scores computed
 * Replaces duplicate fetchRisks patterns across 4+ files
 */
export function useRisks(dependencies = []) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/risiko");

      const risksWithColor = res.data.map((r) => {
        const k = parseInt(r.skor_kebarangkalian) || 0;
        const i = parseInt(r.skor_impak) || 0;
        const { label, color, textColor } = getRiskMatrix(k, i);

        const k_semasa = parseInt(r.semasa_skor_kebarangkalian) || 0;
        const i_semasa = parseInt(r.semasa_skor_impak) || 0;
        const {
          label: label_semasa,
          color: color_semasa,
          textColor: textColor_semasa,
        } = getRiskMatrix(k_semasa, i_semasa);

        return {
          ...r,
          tahap_risiko: label,
          risk_color: color,
          risk_text_color: textColor,
          tahap_risiko_semasa: label_semasa,
          risk_color_semasa: color_semasa,
          risk_text_color_semasa: textColor_semasa,
          status_pemantauan: r.status_pemantauan || "",
        };
      });

      setRisks(risksWithColor);
      setError(null);
    } catch (err) {
      console.error("Gagal fetch risiko:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  return { risks, setRisks, loading, error, refetch: fetchRisks };
}
