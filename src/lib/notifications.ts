import { useEffect, useState } from "react";

export type Notice = { id: string; text: string; at: string; read: boolean };
const KEY = "raw-notifications";
const EVT = "raw-notifications-change";

function load(): Notice[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Notice[]; } catch { return []; }
}
function save(n: Notice[]) {
  localStorage.setItem(KEY, JSON.stringify(n.slice(0, 50)));
  window.dispatchEvent(new Event(EVT));
}
export function notify(text: string) {
  save([{ id: crypto.randomUUID(), text, at: new Date().toISOString(), read: false }, ...load()]);
}
export function markAllRead() { save(load().map(n => ({ ...n, read: true }))); }
export function clearAll() { save([]); }
export function useNotifications() {
  const [list, setList] = useState<Notice[]>([]);
  useEffect(() => {
    const r = () => setList(load());
    r();
    window.addEventListener(EVT, r);
    window.addEventListener("storage", r);
    return () => { window.removeEventListener(EVT, r); window.removeEventListener("storage", r); };
  }, []);
  return list;
}
