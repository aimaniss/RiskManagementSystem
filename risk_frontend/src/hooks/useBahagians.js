import { useState, useEffect, useCallback } from "react";
import api from "../api/api";

/**
 * Shared hook for fetching bahagian/unit reference list
 */
export function useBahagians() {
  const [bahagianList, setBahagianList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBahagians = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/bahagian");
      setBahagianList(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      console.error("Gagal fetch bahagian:", err);
      setError(err);
      setBahagianList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBahagians();
  }, [fetchBahagians]);

  return { bahagianList, loading, error, refetch: fetchBahagians };
}
