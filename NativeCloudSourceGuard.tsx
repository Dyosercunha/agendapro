// @ts-nocheck
import { useEffect } from "react";

const STORAGE_PREFIX = "agendaProV3:";
const ALLOWED_NON_APP_KEYS = ["supabase", "sb-", "theme", "appearance"];

function clearAgendaProLocalCache() {
  if (typeof window === "undefined") return;

  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn("AgendaPro: não foi possível limpar cache local antigo.", error);
  }
}

function installLocalStorageWriteGuard() {
  if (typeof window === "undefined") return;
  if (window.__agendaProLocalStorageGuardInstalled) return;

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  const originalRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

  window.localStorage.setItem = (key, value) => {
    if (String(key || "").startsWith(STORAGE_PREFIX)) {
      console.info("AgendaPro: escrita local ignorada; Supabase é a fonte principal.", key);
      return;
    }
    return originalSetItem(key, value);
  };

  window.localStorage.removeItem = (key) => originalRemoveItem(key);
  window.__agendaProLocalStorageGuardInstalled = true;
}

export function prepareCloudFirstStorage() {
  clearAgendaProLocalCache();
  installLocalStorageWriteGuard();
}

export default function NativeCloudSourceGuard() {
  useEffect(() => {
    prepareCloudFirstStorage();
  }, []);

  return null;
}
