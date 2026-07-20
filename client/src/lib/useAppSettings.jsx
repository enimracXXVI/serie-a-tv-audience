import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchAppSettings, updateAppSettings, createAppSettings, APP_SETTINGS_ID } from './appSettings.js';

const AppSettingsContext = createContext(null);

// Shared across the whole app, same as the other Settings-backed providers -
// the `appSettings` tab is optional (added after this feature shipped) so a
// missing tab falls back to no logo configured rather than erroring.
export function AppSettingsProvider({ children }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAppSettings()
      .then((rows) => {
        if (!cancelled) setRow(rows.find((r) => r.id === APP_SETTINGS_ID) ?? null);
      })
      .catch(() => {
        // tab doesn't exist yet - not a real error, nothing configured yet
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveAppSettings = useCallback(
    async (fields, accessToken) => {
      if (!accessToken) throw new Error('UNAUTHENTICATED');
      if (row) {
        const { missingFields } = await updateAppSettings(APP_SETTINGS_ID, fields, accessToken);
        const missingHere = (missingFields ?? []).filter((f) => f in fields);
        const applied = { ...fields };
        for (const f of missingHere) delete applied[f];
        setRow((prev) => ({ ...prev, ...applied }));
        if (missingHere.length > 0) {
          throw new Error(`Saved, but the appSettings sheet has no column header for: ${missingHere.join(', ')}.`);
        }
        return;
      }
      const allFields = { id: APP_SETTINGS_ID, serieALogoUrl: '', ...fields };
      await createAppSettings(allFields, accessToken);
      setRow(allFields);
    },
    [row]
  );

  return (
    <AppSettingsContext.Provider value={{ serieALogoUrl: row?.serieALogoUrl || '', loading, saveAppSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within an AppSettingsProvider');
  return ctx;
}
