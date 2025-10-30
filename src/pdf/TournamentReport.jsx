import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#1f2937',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  summaryRow: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 12,
    marginRight: 12,
  },
  summaryCardLast: {
    marginRight: 0,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderLeftStyle: 'solid',
    paddingLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  textMuted: {
    color: '#6b7280',
  },
  teamCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  teamHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  teamName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  playerList: {
    marginTop: 6,
  },
  listItem: {
    fontSize: 10,
    color: '#1f2937',
    marginBottom: 2,
  },
  pairRow: {
    fontSize: 10,
    color: '#1f2937',
  },
  matchesTable: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 6,
  },
  matchesHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
  },
  matchesHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  matchRow: {
    display: 'flex',
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  matchRowAlt: {
    backgroundColor: '#f9fafb',
  },
  matchCell: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
  },
});

const formatPair = (player1, player2) => {
  if (!player1 && !player2) {
    return '—';
  }
  if (!player1 || !player2) {
    return `${player1 || player2} (incomplete)`;
  }
  return `${player1} & ${player2}`;
};

const TournamentReport = ({
  rumahSukan = [],
  teams = [],
  matches = [],
  standings = [],
  housePoints = [],
  categoryStandings = {},
}) => {
  const completedMatches = matches.filter(match => match.status === 'completed');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>KRKL Ping Pong Tournament 2025</Text>
          <Text style={styles.subtitle}>Tournament overview and registrations summary</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard]}>
            <Text style={styles.summaryLabel}>Registered Houses</Text>
            <Text style={styles.summaryValue}>{rumahSukan.length}</Text>
          </View>
          <View style={[styles.summaryCard]}>
            <Text style={styles.summaryLabel}>Registered Teams</Text>
            <Text style={styles.summaryValue}>{teams.length}</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardLast]}>
            <Text style={styles.summaryLabel}>Completed Matches</Text>
            <Text style={styles.summaryValue}>
              {completedMatches.length}/{matches.length}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rumah Sukan</Text>
          {rumahSukan.length === 0 ? (
            <Text style={styles.textMuted}>No Rumah Sukan registered yet.</Text>
          ) : (
            rumahSukan.map(rumah => {
              const count = teams.filter(team => team.rumahSukanId === rumah.id).length;
              return (
                <View key={rumah.id} style={styles.teamCard}>
                  <View style={styles.teamHeader}>
                    <Text style={styles.teamName}>{rumah.name}</Text>
                    <Text style={styles.textMuted}>{count} team{count === 1 ? '' : 's'}</Text>
                  </View>
                  <Text style={styles.textMuted}>Theme color: {rumah.colorHex}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registered Teams</Text>
          {teams.length === 0 ? (
            <Text style={styles.textMuted}>No teams registered yet.</Text>
          ) : (
            teams.map(team => {
              const rumah = rumahSukan.find(r => r.id === team.rumahSukanId);
              return (
                <View key={team.id || team.teamId} style={styles.teamCard}>
                  <View style={styles.teamHeader}>
                    <Text style={styles.teamName}>{rumah?.name || 'Unknown Rumah'}</Text>
                    <Text style={styles.textMuted}>
                      {team.players?.length || 0} registered player{(team.players?.length || 0) === 1 ? '' : 's'}
                    </Text>
                  </View>

                  <Text style={styles.pairRow}>
                    Mixed Doubles: {formatPair(team.mixedPair?.player1, team.mixedPair?.player2)}
                  </Text>
                  <Text style={styles.pairRow}>
                    Men's Doubles: {formatPair(team.mensPair?.player1, team.mensPair?.player2)}
                  </Text>

                  <View style={styles.playerList}>
                    {(team.players || []).map(player => (
                      <Text key={player.id || player.name} style={styles.listItem}>
                        • {player.name} ({player.gender})
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League Standings</Text>
          {standings.length === 0 ? (
            <Text style={styles.textMuted}>No completed matches recorded yet.</Text>
          ) : (
            <View style={styles.matchesTable}>
              <View style={styles.matchesHeader}>
                <Text style={[styles.matchesHeaderCell, { flex: 0.6 }]}>Pos</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 2 }]}>Rumah</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 0.8 }]}>Pts</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 0.8 }]}>W</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 0.8 }]}>L</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 0.8 }]}>D</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 1.1 }]}>Games +/-</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 1.2 }]}>H2H pts</Text>
              </View>
              {standings.map((row, index) => {
                const isAlt = index % 2 === 1;
                const gamesDiff = row.gamesDifference ?? (row.gamesWon - row.gamesLost);
                const headPoints = standings.reduce((acc, opponent) => {
                  if (opponent.id === row.id) return acc;
                  return acc + (row.headToHead?.[opponent.id]?.wins ?? 0);
                }, 0);
                return (
                  <View
                    key={row.id || row.name || index}
                    style={[styles.matchRow, isAlt ? styles.matchRowAlt : null]}
                  >
                    <Text style={[styles.matchCell, { flex: 0.6 }]}>{index + 1}</Text>
                    <Text style={[styles.matchCell, { flex: 2 }]}>{row.name}</Text>
                    <Text style={[styles.matchCell, { flex: 0.8 }]}>{row.leaguePoints ?? row.points ?? 0}</Text>
                    <Text style={[styles.matchCell, { flex: 0.8 }]}>{row.wins}</Text>
                    <Text style={[styles.matchCell, { flex: 0.8 }]}>{row.losses}</Text>
                    <Text style={[styles.matchCell, { flex: 0.8 }]}>{row.draws}</Text>
                    <Text style={[styles.matchCell, { flex: 1.1 }]}>{gamesDiff >= 0 ? `+${gamesDiff}` : gamesDiff}</Text>
                    <Text style={[styles.matchCell, { flex: 1.2 }]}>{headPoints}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>House Points Summary</Text>
          {housePoints.length === 0 ? (
            <Text style={styles.textMuted}>House points have not been calculated yet.</Text>
          ) : (
            <View style={styles.matchesTable}>
              <View style={styles.matchesHeader}>
                <Text style={[styles.matchesHeaderCell, { flex: 2 }]}>Rumah</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 0.9 }]}>Place</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 1.2 }]}>Participation</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 1 }]}>Match Wins</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 0.9 }]}>Spirit</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 1 }]}>Cat Wins</Text>
                <Text style={[styles.matchesHeaderCell, { flex: 0.9 }]}>Total</Text>
              </View>
              {housePoints.map((house, index) => {
                const isAlt = index % 2 === 1;
                return (
                  <View
                    key={house.houseId || house.name || index}
                    style={[styles.matchRow, isAlt ? styles.matchRowAlt : null]}
                  >
                    <Text style={[styles.matchCell, { flex: 2 }]}>{house.name}</Text>
                    <Text style={[styles.matchCell, { flex: 0.9 }]}>{house.placementPoints}</Text>
                    <Text style={[styles.matchCell, { flex: 1.2 }]}>{house.participationPoints}</Text>
                    <Text style={[styles.matchCell, { flex: 1 }]}>{house.matchWinPoints}</Text>
                    <Text style={[styles.matchCell, { flex: 0.9 }]}>{house.sportsmanshipPoints}</Text>
                    <Text style={[styles.matchCell, { flex: 1 }]}>{house.categoryWins}</Text>
                    <Text style={[styles.matchCell, { flex: 0.9 }]}>{house.totalPoints}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Leaders</Text>
          {Object.keys(categoryStandings).length === 0 ? (
            <Text style={styles.textMuted}>No category standings available yet.</Text>
          ) : (
            Object.entries(categoryStandings).map(([category, list]) => {
              const leader = Array.isArray(list) && list.length > 0 ? list[0] : null;
              return (
                <View key={category} style={styles.teamCard}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151' }}>{category}</Text>
                  {leader ? (
                    <Text style={{ fontSize: 11, marginTop: 4, color: '#111827' }}>
                      Current Leader: {leader.name} ({leader.leaguePoints ?? leader.points ?? 0} pts, {leader.wins} wins)
                    </Text>
                  ) : (
                    <Text style={styles.textMuted}>No matches recorded in this category.</Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Schedule</Text>
          {matches.length === 0 ? (
            <Text style={styles.textMuted}>No matches have been generated yet.</Text>
          ) : (
            <View style={styles.matchesTable}>
              <View style={styles.matchesHeader}>
                <Text style={styles.matchesHeaderCell}>Match</Text>
                <Text style={styles.matchesHeaderCell}>Category</Text>
                <Text style={styles.matchesHeaderCell}>Team 1</Text>
                <Text style={styles.matchesHeaderCell}>Team 2</Text>
                <Text style={styles.matchesHeaderCell}>Status</Text>
              </View>
              {matches.slice(0, 40).map((match, index) => {
                const isAlt = index % 2 === 1;
                const team1 = teams.find(team => team.id === match.team1_id);
                const team2 = teams.find(team => team.id === match.team2_id);
                return (
                  <View
                    key={match.id || `${match.match_number}-${match.category}`}
                    style={[styles.matchRow, isAlt ? styles.matchRowAlt : null]}
                  >
                    <Text style={styles.matchCell}>#{match.match_number}</Text>
                    <Text style={styles.matchCell}>{match.category}</Text>
                    <Text style={styles.matchCell}>{team1?.rumahName || team1?.name || 'TBC'}</Text>
                    <Text style={styles.matchCell}>{team2?.rumahName || team2?.name || 'TBC'}</Text>
                    <Text style={styles.matchCell}>{match.status || 'pending'}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {matches.length > 40 && (
            <Text style={[styles.textMuted, { marginTop: 6 }]}>
              Showing first 40 matches. Export a filtered report for more detail.
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default TournamentReport;
