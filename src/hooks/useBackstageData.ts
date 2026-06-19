import { useEffect, useRef, useState } from "react";
import type { BackstageResponse } from "@/types/backstage";
import { backstageMock } from "@/data/backstageMock";
import { supabase } from "@/integrations/supabase/client";

type State = {
  data: BackstageResponse | null;
  loading: boolean;
  error: string | null;
  usingMock: boolean;
};

const REFRESH_INTERVAL_MS = 60_000;

export const useBackstageData = () => {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
    usingMock: false,
  });
  const mounted = useRef(true);

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke("backstage-sync");
      if (error) throw error;
      if (!data || !Array.isArray((data as BackstageResponse).workflows)) {
        throw new Error("Respuesta inválida del backstage-sync");
      }
      if (!mounted.current) return;
      setState({
        data: data as BackstageResponse,
        loading: false,
        error: null,
        usingMock: false,
      });
    } catch (err) {
      console.warn("[backstage] usando mock por error:", err);
      if (!mounted.current) return;
      setState({
        data: backstageMock,
        loading: false,
        error: null,
        usingMock: true,
      });
    }
  };

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  return { ...state, refetch: load };
};
