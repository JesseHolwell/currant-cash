import { useCallback, useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const CLOUD_KEY = "app_state";

export type AppSnapshot = Record<string, unknown>;

export function useCloudSync(
  user: User | null,
  onRemoteChange?: (snapshot: AppSnapshot) => void
) {
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last time this session uploaded so we can suppress the
  // Realtime echo of our own writes (Supabase Realtime fires for all writers).
  const lastUploadRef = useRef<number>(0);
  // Keep callback stable across renders without re-subscribing.
  const onRemoteChangeRef = useRef(onRemoteChange);
  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  }, [onRemoteChange]);

  const uploadSnapshot = useCallback(async (snapshot: AppSnapshot): Promise<void> => {
    if (!user || !isSupabaseConfigured) return;
    lastUploadRef.current = Date.now();
    await supabase.from("user_data").upsert(
      { user_id: user.id, data_key: CLOUD_KEY, value: snapshot },
      { onConflict: "user_id,data_key" }
    );
  }, [user]);

  const downloadSnapshot = useCallback(async (): Promise<AppSnapshot | null> => {
    if (!user || !isSupabaseConfigured) return null;
    const { data, error } = await supabase
      .from("user_data")
      .select("value")
      .eq("user_id", user.id)
      .eq("data_key", CLOUD_KEY)
      .maybeSingle();
    if (error || !data) return null;
    return data.value as AppSnapshot;
  }, [user]);

  function scheduleSyncUpload(snapshot: AppSnapshot, delayMs = 3000): void {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      uploadSnapshot(snapshot);
    }, delayMs);
  }

  // Realtime: subscribe to remote changes from other sessions/devices.
  // Requires the user_data table to be added to the supabase_realtime publication
  // (see schema.sql).
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`user_data_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_data",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Suppress the Realtime echo of our own writes (allow up to 10s for
          // the network round-trip from upload → Realtime delivery).
          if (Date.now() - lastUploadRef.current < 10_000) return;
          const incoming = (payload.new as { value?: AppSnapshot }).value;
          if (incoming) onRemoteChangeRef.current?.(incoming);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, []);

  return { uploadSnapshot, downloadSnapshot, scheduleSyncUpload };
}
