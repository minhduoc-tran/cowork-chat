import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { deserializeUrlToFilters, serializeFiltersToUrl } from "../helpers/serializer";
import { getValidFilterRows } from "../helpers/validators";
import type { FilterConfig, FilterState } from "../types";

export const useFilterUrlSync = (config: FilterConfig) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const isInitializing = useRef(true);

  const [syncedState, setSyncedState] = useState<FilterState>(() => {
    const params = new URLSearchParams(searchParams.toString());
    return deserializeUrlToFilters(params, config);
  });

  useEffect(() => {
    if (isInitializing.current) {
      isInitializing.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    setSyncedState(deserializeUrlToFilters(params, config));
  }, [searchParams, config]);

  const handleSync = useCallback(
    (currentState: FilterState) => {
      // preserve current non-filter params + search param
      const currentParams = new URLSearchParams(searchParams.toString());
      const newParams = serializeFiltersToUrl(currentState, config);

      // Keep searchParamName if it exists
      const searchParamName = config.searchParamName || "q";
      const currentSearchParam = currentParams.get(searchParamName);

      if (currentSearchParam) {
        newParams.set(searchParamName, currentSearchParam);
      }

      const queryStr = newParams.toString();
      const newPath = queryStr ? `${pathname}?${queryStr}` : pathname;

      navigate(newPath);
    },
    [config, pathname, navigate, searchParams],
  );

  const applyChanges = useCallback(
    (newState: FilterState) => {
      handleSync({ ...newState, rows: getValidFilterRows(newState.rows) });
    },
    [handleSync],
  );

  return {
    initialState: syncedState,
    applyChanges,
  };
};
