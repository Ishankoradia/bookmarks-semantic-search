import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { useBookmarkApi } from '../../hooks/useBookmarkApi';
import { ArticleCard } from '../../components/ArticleCard';
import { useNavigation } from '@react-navigation/native';

interface Stats {
  total: number;
  read: number;
  unread: number;
  categories: number;
  weekly_activity: { week: string; added: number; read: number }[];
  recent_bookmarks: {
    id: string;
    title: string;
    description: string | null;
    domain: string;
    url: string;
    tags: string[];
    category: string | null;
    is_read: boolean;
    reference: string | null;
    created_at: string | null;
  }[];
}

export function HomeScreen() {
  const { colors } = useTheme();
  const bookmarkApi = useBookmarkApi();
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await bookmarkApi.getStats();
      setStats(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadStats().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!stats) return null;

  const maxWeekly = Math.max(...stats.weekly_activity.map((w) => Math.max(w.added, w.read)), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Home</Text>

        {/* Quick Stats - 2 per row */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.foreground }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Bookmarks</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: '#ca8a04' }]}>{stats.unread}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Unread</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: '#16a34a' }]}>{stats.read}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Read</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNumber, { color: colors.foreground }]}>{stats.categories}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Categories</Text>
            </View>
          </View>
        </View>

        {/* Weekly Activity Line Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Weekly Activity</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Added</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Read</Text>
              </View>
            </View>
          </View>

          {(() => {
            const chartW = 300;
            const chartH = 140;
            const padL = 28;
            const padR = 10;
            const padT = 10;
            const padB = 24;
            const plotW = chartW - padL - padR;
            const plotH = chartH - padT - padB;
            const n = stats.weekly_activity.length;
            const stepX = plotW / (n - 1);

            const getY = (val: number) => padT + plotH - (maxWeekly > 0 ? (val / maxWeekly) * plotH : 0);
            const getX = (i: number) => padL + i * stepX;

            // Build smooth cubic bezier paths
            const smoothPath = (points: { x: number; y: number }[]) => {
              if (points.length < 2) return '';
              let d = `M ${points[0].x},${points[0].y}`;
              for (let i = 0; i < points.length - 1; i++) {
                const curr = points[i];
                const next = points[i + 1];
                const cpx = (curr.x + next.x) / 2;
                d += ` C ${cpx},${curr.y} ${cpx},${next.y} ${next.x},${next.y}`;
              }
              return d;
            };

            const addedPath = smoothPath(stats.weekly_activity.map((w, i) => ({ x: getX(i), y: getY(w.added) })));
            const readPath = smoothPath(stats.weekly_activity.map((w, i) => ({ x: getX(i), y: getY(w.read) })));

            // Y-axis ticks
            const yTicks = [];
            const tickCount = 4;
            for (let i = 0; i <= tickCount; i++) {
              const val = Math.round((maxWeekly / tickCount) * i);
              yTicks.push(val);
            }

            const selW = selectedWeek !== null ? stats.weekly_activity[selectedWeek] : null;

            return (
              <View>
                <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
                  {/* Grid lines */}
                  {yTicks.map((val, i) => {
                    const y = getY(val);
                    return (
                      <React.Fragment key={`grid-${i}`}>
                        <Line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke={colors.border} strokeWidth={0.5} strokeDasharray="3,3" />
                        <SvgText x={padL - 4} y={y + 3} fontSize={9} fill={colors.mutedForeground} textAnchor="end">
                          {val}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}

                  {/* Vertical highlight line */}
                  {selectedWeek !== null && (
                    <Line x1={getX(selectedWeek)} y1={padT} x2={getX(selectedWeek)} y2={padT + plotH} stroke={colors.border} strokeWidth={1} />
                  )}

                  {/* Added line */}
                  <Path d={addedPath} fill="none" stroke={colors.primary} strokeWidth={2} />
                  {stats.weekly_activity.map((w, i) => (
                    <Circle
                      key={`ad-${i}`}
                      cx={getX(i)}
                      cy={getY(w.added)}
                      r={selectedWeek === i ? 5 : 3}
                      fill={selectedWeek === i ? colors.primary : 'white'}
                      stroke={colors.primary}
                      strokeWidth={2}
                    />
                  ))}

                  {/* Read line */}
                  <Path d={readPath} fill="none" stroke="#16a34a" strokeWidth={2} />
                  {stats.weekly_activity.map((w, i) => (
                    <Circle
                      key={`rd-${i}`}
                      cx={getX(i)}
                      cy={getY(w.read)}
                      r={selectedWeek === i ? 5 : 3}
                      fill={selectedWeek === i ? '#16a34a' : 'white'}
                      stroke="#16a34a"
                      strokeWidth={2}
                    />
                  ))}

                  {/* X-axis labels */}
                  {stats.weekly_activity.map((w, i) => (
                    <SvgText key={`xl-${i}`} x={getX(i)} y={chartH - 4} fontSize={8} fill={selectedWeek === i ? colors.foreground : colors.mutedForeground} fontWeight={selectedWeek === i ? 'bold' : 'normal'} textAnchor="middle">
                      {w.week}
                    </SvgText>
                  ))}
                </Svg>

                {/* Tap targets (invisible pressable areas over each data point) */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
                  {stats.weekly_activity.map((_, i) => (
                    <Pressable
                      key={`tap-${i}`}
                      style={{ flex: 1 }}
                      onPress={() => setSelectedWeek(selectedWeek === i ? null : i)}
                    />
                  ))}
                </View>

                {/* Tooltip */}
                {selectedWeek !== null && selW && (
                  <View style={[
                    styles.tooltip,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      left: Math.min(Math.max(getX(selectedWeek) * 1.1 - 40, 8), chartW * 0.65),
                    },
                  ]}>
                    <Text style={[styles.tooltipTitle, { color: colors.foreground }]}>{selW.week}</Text>
                    <Text style={[styles.tooltipLine, { color: colors.primary }]}>Added : {selW.added}</Text>
                    <Text style={[styles.tooltipLine, { color: '#16a34a' }]}>Read : {selW.read}</Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>

        {/* Quick Links */}
        <View>
          <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 8 }]}>Quick Links</Text>
          <View style={styles.linksRow}>
            <Pressable onPress={() => navigation.navigate('Bookmarks')} style={styles.link}>
              <Ionicons name="search" size={14} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Search Bookmarks</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Explore')} style={styles.link}>
              <Ionicons name="compass-outline" size={14} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Explore Articles</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Social')} style={styles.link}>
              <Ionicons name="people-outline" size={14} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>Social Feed</Text>
            </Pressable>
          </View>
        </View>

        {/* Recently Added */}
        {stats.recent_bookmarks.length > 0 && (
          <View>
            <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 8 }]}>Recently Added</Text>
            {stats.recent_bookmarks.map((bookmark) => (
              <View key={bookmark.id} style={{ marginBottom: 8 }}>
                <ArticleCard
                  article={{ ...bookmark, type: 'bookmark' }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  statsGrid: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  tooltip: {
    position: 'absolute',
    top: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipLine: {
    fontSize: 11,
    fontWeight: '500',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
