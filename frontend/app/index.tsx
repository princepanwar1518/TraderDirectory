import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as Location from "expo-location";

import { COLORS, FONT, SPACING, HistoryItem } from "@/src/theme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const onUseGPS = async () => {
    setGpsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setGpsLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (places && places.length > 0) {
        const p = places[0];
        const text = [p.city || p.subregion || p.region, p.region, p.country]
          .filter(Boolean)
          .join(", ");
        setLocation(text);
      }
    } catch (e: any) {
      setError(e?.message || "GPS failed");
    } finally {
      setGpsLoading(false);
    }
  };

  const onSearch = async () => {
    if (!product.trim() || !location.trim()) {
      setError("Enter both product and location");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, location }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Search failed (${res.status})`);
      }
     const data = await res.json();

router.push({
  pathname: "/results",
  params: {
    product,
    location,
    traders: encodeURIComponent(JSON.stringify(data.traders))
  },
});
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const openHistory = (item: HistoryItem) => {
    router.push({
      pathname: "/results",
      params: { id: item.id, product: item.product, location: item.location },
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Brutalist header */}
        <View style={styles.header} testID="home-header">
          <View style={styles.headerRow}>
            <Text style={styles.headerTag}>// TRADER DIRECTORY</Text>
            <View style={styles.dot} />
          </View>
          <Text style={styles.headerTitle}>FIND{"\n"}TRADERS.</Text>
          <Text style={styles.headerSub}>
            Search local businesses by product & area.
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Inputs */}
          <View style={styles.inputBlock}>
            <Text style={styles.label}>PRODUCT</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="cube-outline" size={18} color={COLORS.onSurface} />
              <TextInput
                testID="product-input"
                value={product}
                onChangeText={setProduct}
                placeholder="e.g. steel traders, cement, plywood"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                returnKeyType="next"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.label}>LOCATION</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="location-outline" size={18} color={COLORS.onSurface} />
              <TextInput
                testID="location-input"
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Mumbai, Maharashtra"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={onSearch}
              />
              <Pressable
                testID="gps-button"
                onPress={onUseGPS}
                style={styles.gpsBtn}
                hitSlop={8}
              >
                {gpsLoading ? (
                  <ActivityIndicator color={COLORS.onBrand} size="small" />
                ) : (
                  <Ionicons name="navigate" size={16} color={COLORS.onBrand} />
                )}
              </Pressable>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBanner} testID="error-banner">
              <Text style={styles.errorText}>! {error}</Text>
            </View>
          ) : null}

          {/* SEARCH BUTTON */}
          <Pressable
            testID="search-button"
            onPress={onSearch}
            disabled={loading}
            style={({ pressed }) => [
              styles.searchBtn,
              pressed && { backgroundColor: COLORS.brandSecondary },
              loading && { opacity: 0.7 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.onBrand} />
            ) : (
              <>
                <Ionicons name="search" size={20} color={COLORS.onBrand} />
                <Text style={styles.searchBtnText}>SEARCH TRADERS</Text>
              </>
            )}
          </Pressable>

          {/* History */}
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>SEARCH HISTORY</Text>
            <Text style={styles.sectionMeta}>{history.length} entries</Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>
                No history yet. Run your first search.
              </Text>
            </View>
          ) : (
            <View>
              {history.map((item) => (
                <Pressable
                  key={item.id}
                  testID={`history-item-${item.id}`}
                  onPress={() => openHistory(item)}
                  style={({ pressed }) => [
                    styles.historyRow,
                    pressed && { backgroundColor: COLORS.surfaceTertiary },
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyProduct} numberOfLines={1}>
                      {item.product.toUpperCase()}
                    </Text>
                    <Text style={styles.historyMeta} numberOfLines={1}>
                      {item.location} · {item.count} results
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.onSurface}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  headerTag: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.onSurface,
    letterSpacing: 1,
  },
  dot: {
    width: 10,
    height: 10,
    backgroundColor: COLORS.brand,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: "900",
    color: COLORS.onSurface,
    lineHeight: 42,
    letterSpacing: -1,
  },
  headerSub: {
    marginTop: SPACING.sm,
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.muted,
  },
  inputBlock: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  label: {
    fontFamily: FONT.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    height: 52,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontFamily: FONT.mono,
    fontSize: 14,
    color: COLORS.onSurface,
    paddingVertical: 0,
  },
  gpsBtn: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: "#FEE2E2",
    padding: SPACING.md,
  },
  errorText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.error,
  },
  searchBtn: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    height: 60,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  searchBtnText: {
    color: COLORS.onBrand,
    fontFamily: FONT.mono,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  historyHeader: {
    marginTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surfaceSecondary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: FONT.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    color: COLORS.onSurface,
    fontWeight: "700",
  },
  sectionMeta: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.muted,
  },
  emptyHistory: {
    padding: SPACING.lg,
  },
  emptyText: {
    fontFamily: FONT.mono,
    fontSize: 12,
    color: COLORS.muted,
  },
  historyRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  historyLeft: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  historyProduct: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.onSurface,
    letterSpacing: 0.5,
  },
  historyMeta: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});
