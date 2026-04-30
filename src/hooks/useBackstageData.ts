import { useEffect, useState } from "react";
import type { BackstageResponse } from "@/types/backstage";
import { backstageMock } from "@/data/backstageMock";

type State = {
  data: BackstageResponse | null;
  loading: boolean;
  error: string | null;
  usingMock: boolean;
};

const ENDPOINT = "/office/backstage";

export const useBackstageData = () => {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
    usingMock: false,
  });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const token = (import.meta as any).env?.VITE_BACKSTAGE_TOKEN as string | undefined;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(ENDPOINT, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as BackstageResponse;
      setState({ data: json, loading: false, error: null, usingMock: false });
    } catch (err) {
      // Fallback to local mock
      setState({
        data: backstageMock,
        loading: false,
        error: null,
        usingMock: true,
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { ...state, refetch: load };
};
