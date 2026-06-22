import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";

import {
  COLORS,
  FONT,
  SPACING,
  Trader,
  Lead,
  LeadStatus,
  LEAD_STATUSES,
  STATUS_COLORS,
} from "@/src/theme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

type FilterKey = "ALL" | "RATING4" | "PHONE" | "SHORTLISTED";
type SortKey = "DEFAULT" | "RATING_DESC";

function initials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function nextStatus(s: LeadStatus): LeadStatus {
  const i = LEAD_STATUSES.indexOf(s);
  return LEAD_STATUSES[(i + 1) % LEAD_STATUSES.length];
}

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
 const { traders: tradersParam, product, location } = useLocalSearchParams<{
  traders: string;
  product: string;
  location: string;
}>();
const [traders, setTraders] = useState<Trader[]>([]);
const [leads, setLeads] = useState<Record<string, Lead>>({});
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const [exporting, setExporting] = useState(false);
const [exportNote, setExportNote] = useState<string | null>(null);

const [filter, setFilter] = useState<FilterKey>("ALL");
const [sort, setSort] = useState<SortKey>("DEFAULT");
const [exportOnlyShortlisted, setExportOnlyShortlisted] = useState(false);

useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      const ts: Trader[] = tradersParam
        ? JSON.parse(decodeURIComponent(String(tradersParam)))
        : [];

      if (!mounted) return;

      setTraders(ts);

      const pids = ts
        .map((t) => t.place_id)
        .filter(Boolean)
        .join(",");

      if (pids) {
        const r2 = await fetch(
          `${BACKEND_URL}/api/leads?place_ids=${encodeURIComponent(pids)}`
        );

        if (r2.ok) {
          const arr: Lead[] = await r2.json();

          const map: Record<string, Lead> = {};
          arr.forEach((l) => {
            map[l.place_id] = l;
          });

          if (mounted) {
            setLeads(map);
          }
        }
      }
    } catch (e: any) {
      if (mounted) {
        setError(e?.message || "Load failed");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  })();

  return () => {
    mounted = false;
  };
}, [tradersParam]);
  // Derived list
  const visibleTraders = useMemo(() => {
    let list = [...traders];
    if (filter === "RATING4") list = list.filter((t) => (t.rating ?? 0) >= 4);
    if (filter === "PHONE") list = list.filter((t) => !!t.phone);
    if (filter === "SHORTLISTED")
      list = list.filter((t) => t.place_id && leads[t.place_id]?.shortlisted);
    if (sort === "RATING_DESC")
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [traders, leads, filter, sort]);

  const shortlistedCount = useMemo(
    () => Object.values(leads).filter((l) => l.shortlisted).length,
    [leads]
  );

  const updateLead = async (place_id: string, patch: Partial<Lead>) => {
    // optimistic
    setLeads((prev) => {
      const cur = prev[place_id] || {
        place_id,
        status: "NEW",
        shortlisted: false,
        updated_at: "",
      };
      return { ...prev, [place_id]: { ...cur, ...patch } as Lead };
    });
    try {
      await fetch(`${BACKEND_URL}/api/leads/${encodeURIComponent(place_id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      // ignore network failure for local optimistic state
    }
  };

  const cycleStatus = (t: Trader) => {
    if (!t.place_id) return;
    const cur = leads[t.place_id]?.status || "NEW";
    updateLead(t.place_id, { status: nextStatus(cur) });
  };

  const toggleShortlist = (t: Trader) => {
    if (!t.place_id) return;
    const cur = leads[t.place_id]?.shortlisted || false;
    updateLead(t.place_id, { shortlisted: !cur });
  };

  const buildExcel = async () => {
    const res = await fetch(`${BACKEND_URL}/api/export-excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product,
        location,
        traders,
        only_shortlisted: exportOnlyShortlisted,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "Export failed");
    }
    const data = await res.json();
    if (Platform.OS === "web") {
  const byteCharacters = atob(data.base64);

  const byteNumbers = Array.from(byteCharacters, (c) =>
    c.charCodeAt(0)
  );

  const blob = new Blob(
    [new Uint8Array(byteNumbers)],
    { type: data.mime_type }
  );

  const fileUri = URL.createObjectURL(blob);

  return {
    fileUri,
    filename: data.filename as string,
    mime: data.mime_type as string,
  };
}

const fileUri =
  (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "") +
  data.filename;

await FileSystem.writeAsStringAsync(fileUri, data.base64, {
  encoding: FileSystem.EncodingType.Base64,
});

return {
  fileUri,
  filename: data.filename as string,
  mime: data.mime_type as string,
};
};

const onShare = async () => {
    if (traders.length === 0) return;
    setExporting(true);
    setExportNote(null);
   try {
  const { fileUri, filename, mime } = await buildExcel();

  if (Platform.OS === "web") {
    const a = document.createElement("a");
    a.href = fileUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  const available = await Sharing.isAvailableAsync();

  if (!available) {
    setExportNote(`Saved to: ${fileUri}`);
    return;
  }

  await Sharing.shareAsync(fileUri, {
        mimeType: mime,
        dialogTitle: "Export Traders to Excel",
        UTI: "com.microsoft.excel.xlsx",
      });
    } catch (e: any) {
      setExportNote(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const onEmail = async () => {
    if (traders.length === 0) return;
    setExporting(true);
    setExportNote(null);
    try {
      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        setExportNote("Email not available on this device. Use EXPORT instead.");
        setExporting(false);
        return;
      }
      const { fileUri } = await buildExcel();
      await MailComposer.composeAsync({
        subject: `Traders: ${product} in ${location}`,
        body: `Attached: traders for "${product}" in "${location}".`,
        attachments: [fileUri],
      });
    } catch (e: any) {
      setExportNote(e?.message || "Email failed");
    } finally {
      setExporting(false);
    }
  };

  const callPhone = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  };

  const openWebsite = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url);
  };

  const renderItem = ({ item, index }: { item: Trader; index: number }) => {
    const pid = item.place_id || "";
    const lead = leads[pid];
    const status: LeadStatus = lead?.status || "NEW";
    const isShort = !!lead?.shortlisted;

    return (
      <View style={styles.row} testID={`trader-row-${index}`}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(item.name)}</Text>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.bizName} numberOfLines={2}>
              {item.name}
            </Text>
            <Pressable
              testID={`shortlist-${index}`}
              onPress={() => toggleShortlist(item)}
              hitSlop={8}
              style={styles.starBtn}
            >
              <Ionicons
                name={isShort ? "star" : "star-outline"}
                size={22}
                color={isShort ? COLORS.brand : COLORS.muted}
              />
            </Pressable>
          </View>

          {item.category ? (
            <Text style={styles.bizCategory} numberOfLines={1}>
              {item.category.toUpperCase()}
              {item.rating != null ? `  ★ ${item.rating.toFixed(1)}` : ""}
            </Text>
          ) : null}
          {item.phone ? (
            <Pressable onPress={() => callPhone(item.phone)} hitSlop={6}>
              <Text style={styles.bizPhone}>{item.phone}</Text>
            </Pressable>
          ) : null}
          {item.address ? (
            <Text style={styles.bizAddress} numberOfLines={3}>
              {item.address}
            </Text>
          ) : null}
          {item.website ? (
            <Pressable onPress={() => openWebsite(item.website)} hitSlop={4}>
              <Text style={styles.bizWeb} numberOfLines={1}>
                {item.website.replace(/^https?:\/\//, "")}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            testID={`status-${index}`}
            onPress={() => cycleStatus(item)}
            style={[
              styles.statusPill,
              { backgroundColor: STATUS_COLORS[status] },
            ]}
          >
            <Text style={styles.statusText}>{status}</Text>
            <Ionicons name="chevron-forward" size={12} color={COLORS.onBrand} />
          </Pressable>
        </View>
      </View>
    );
  };

  const FilterChip = ({
    keyId,
    label,
  }: {
    keyId: FilterKey;
    label: string;
  }) => {
    const active = filter === keyId;
    return (
      <Pressable
        testID={`filter-${keyId.toLowerCase()}`}
        onPress={() => setFilter(keyId)}
        style={[
          styles.chip,
          active && { backgroundColor: COLORS.onSurface },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            active && { color: COLORS.onSurfaceInverse },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Sticky header */}
      <View style={styles.header} testID="results-header">
        <Pressable
          testID="back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>RESULTS</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {(product || "").toUpperCase()}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {location} · {visibleTraders.length} of {traders.length} · ★{shortlistedCount}
          </Text>
        </View>
      </View>

      {/* Filter row */}
      <View style={styles.filterRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRowContent}
        >
          <FilterChip keyId="ALL" label="ALL" />
          <FilterChip keyId="RATING4" label="★ ≥ 4" />
          <FilterChip keyId="PHONE" label="HAS PHONE" />
          <FilterChip keyId="SHORTLISTED" label={`SHORTLIST · ${shortlistedCount}`} />
          <Pressable
            testID="sort-toggle"
            onPress={() =>
              setSort((s) => (s === "DEFAULT" ? "RATING_DESC" : "DEFAULT"))
            }
            style={[
              styles.chip,
              sort === "RATING_DESC" && { backgroundColor: COLORS.brand },
            ]}
          >
            <Ionicons
              name="swap-vertical"
              size={14}
              color={sort === "RATING_DESC" ? COLORS.onBrand : COLORS.onSurface}
            />
            <Text
              style={[
                styles.chipText,
                sort === "RATING_DESC" && { color: COLORS.onBrand },
                { marginLeft: 4 },
              ]}
            >
              {sort === "RATING_DESC" ? "SORTED ★" : "SORT ★"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brand} size="large" />
          <Text style={styles.loadingText}>Fetching traders…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>! {error}</Text>
          <Pressable onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>GO BACK</Text>
          </Pressable>
        </View>
      ) : visibleTraders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={COLORS.muted}
          />
          <Text style={styles.emptyText}>NO TRADERS MATCH</Text>
          <Text style={styles.emptySub}>Try changing filters.</Text>
        </View>
      ) : (
        <FlatList
          data={visibleTraders}
          keyExtractor={(item, i) => item.place_id || item.id || String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 220 + insets.bottom }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sticky export bar */}
      {!loading && !error && traders.length > 0 ? (
        <View
          style={[
            styles.exportBar,
            { paddingBottom: insets.bottom + SPACING.md },
          ]}
          testID="export-bar"
        >
          {exportNote ? (
            <Text style={styles.exportNote} numberOfLines={2}>
              {exportNote}
            </Text>
          ) : null}

          <Pressable
            testID="toggle-only-shortlist"
            onPress={() => setExportOnlyShortlisted((v) => !v)}
            style={styles.toggleRow}
          >
            <View
              style={[
                styles.checkbox,
                exportOnlyShortlisted && { backgroundColor: COLORS.onSurface },
              ]}
            >
              {exportOnlyShortlisted ? (
                <Ionicons name="checkmark" size={14} color={COLORS.onSurfaceInverse} />
              ) : null}
            </View>
            <Text style={styles.toggleText}>
              EXPORT SHORTLISTED ONLY ({shortlistedCount})
            </Text>
          </Pressable>

          <View style={styles.exportRow}>
            <Pressable
              testID="email-button"
              onPress={onEmail}
              disabled={exporting}
              style={({ pressed }) => [
                styles.emailBtn,
                pressed && { backgroundColor: COLORS.surfaceTertiary },
                exporting && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.onSurface} />
              <Text style={styles.emailBtnText}>EMAIL</Text>
            </Pressable>

            <Pressable
              testID="export-excel-button"
              onPress={onShare}
              disabled={exporting}
              style={({ pressed }) => [
                styles.exportBtn,
                pressed && { backgroundColor: COLORS.brandSecondary },
                exporting && { opacity: 0.7 },
              ]}
            >
              {exporting ? (
                <ActivityIndicator color={COLORS.onBrand} />
              ) : (
                <>
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={COLORS.onBrand}
                  />
                  <Text style={styles.exportBtnText}>EXPORT TO EXCEL</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: COLORS.muted,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  filterRowWrap: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: "center",
  },
  filterRowContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    alignItems: "center",
  },
  chip: {
    height: 36,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexShrink: 0,
  },
  chipText: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.onSurface,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  loadingText: { fontFamily: FONT.mono, fontSize: 12, color: COLORS.muted },
  errorText: { fontFamily: FONT.mono, fontSize: 13, color: COLORS.error },
  emptyText: {
    fontFamily: FONT.mono,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 1.5,
    color: COLORS.onSurface,
  },
  emptySub: { fontFamily: FONT.mono, fontSize: 12, color: COLORS.muted },
  retryBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    marginTop: SPACING.sm,
  },
  retryText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: COLORS.onSurface,
  },
  row: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
  },
  avatarText: {
    fontFamily: FONT.mono,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.brand,
    letterSpacing: 1,
  },
  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bizName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.onSurface,
    letterSpacing: -0.2,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  starBtn: {
    width: 28,
    alignItems: "flex-end",
  },
  bizCategory: {
    fontFamily: FONT.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.brand,
    marginTop: 2,
    fontWeight: "700",
  },
  bizPhone: {
    fontFamily: FONT.mono,
    fontSize: 13,
    color: COLORS.info,
    marginTop: SPACING.xs,
    textDecorationLine: "underline",
  },
  bizAddress: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.onSurfaceSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  bizWeb: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.info,
    marginTop: 4,
    textDecorationLine: "underline",
  },
  statusPill: {
    alignSelf: "flex-start",
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontFamily: FONT.mono,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: COLORS.onBrand,
  },
  sep: { height: 1, backgroundColor: COLORS.border },
  exportBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.borderStrong,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  exportNote: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.onSurface,
  },
  exportRow: { flexDirection: "row", gap: SPACING.sm },
  emailBtn: {
    width: 100,
    height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: SPACING.xs,
  },
  emailBtnText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: COLORS.onSurface,
  },
  exportBtn: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  exportBtnText: {
    color: COLORS.onBrand,
    fontFamily: FONT.mono,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
});
