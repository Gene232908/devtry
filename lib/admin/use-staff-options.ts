import { useState, useCallback, useEffect, useRef } from "react";
import type { StaffOption } from "./lead-assignment";

export function useStaffOptions() {
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff/options");
      if (res.ok) {
        const data = await res.json();
        setStaffOptions(data.data.staffOptions);
        setCanAssign(data.data.canAssign);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchOptions();
  }, [fetchOptions]);

  return { staffOptions, canAssign, loading };
}
