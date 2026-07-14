import { useState, useEffect, useCallback } from "react";
import api from "../api/api";

/**
 * Shared hook for fetching syarikat list
 * Replaces duplicate fetchSyarikat patterns across 10+ files
 */
export function useSyarikats() {
  const [syarikatList, setSyarikatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSyarikats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/syarikat");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.syarikat || [];
      setSyarikatList(data);
      setError(null);
    } catch (err) {
      console.error("Gagal fetch syarikat:", err);
      setError(err);
      setSyarikatList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyarikats();
  }, [fetchSyarikats]);

  return { syarikatList, loading, error, refetch: fetchSyarikats };
}
