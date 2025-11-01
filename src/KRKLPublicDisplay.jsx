import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Eye, Trophy, GitBranch, RefreshCw, Network } from 'lucide-react';

const KRKLPublicDisplay = () => {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [rumahSukan, setRumahSukan] = useState([]);
  const [spiritMarks, setSpiritMarks] = useState([]);
  const [housePoints, setHousePoints] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const resolvedApiUrl = process.env.REACT_APP_API_URL ?? (typeof window !== 'undefined' ? window.PUBLIC_API_URL : undefined);
  const resolvedWsUrl = process.env.REACT_APP_WS_URL ?? (typeof window !== 'undefined' ? window.PUBLIC_WS_URL : undefined);

  const API_URL = resolvedApiUrl ?? 'https://pingpong-lfsa.ngrok.dev/api.php';
  const WS_URL = resolvedWsUrl ?? 'wss://pingpong-lfsa.ngrok.dev/ws';

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const fetchResource = useCallback(async (endpoint) => {
    const response = await fetch(endpoint, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        Accept: 'application/json',
      },
    });
    const contentType = response.headers?.get('content-type') || '';
    const body = await response.text();

    if (!response.ok) {
      const snippet = body.length > 160 ? `${body.slice(0, 160)}...` : body;
      throw new Error(`Request failed (${response.status}) for ${endpoint}: ${snippet}`);
    }

    try {
      if (!body) return null;
      return JSON.parse(body);
    } catch (parseError) {
      const snippet = body.length > 160 ? `${body.slice(0, 160)}...` : body;
      throw new Error(`Invalid JSON from ${endpoint} (content-type: ${contentType || 'unknown'}). Preview: ${snippet}`);
    }
  }, []);

  const applySnapshotData = useCallback((snapshot = {}) => {
    const matchesDataRaw = snapshot.matches ?? snapshot.matchesData;
    const teamsDataRaw = snapshot.teams ?? snapshot.teamsData;
    const rumahDataRaw = snapshot.rumahSukan ?? snapshot.rumahData;
    const spiritDataRaw = snapshot.spiritMarks ?? snapshot.spiritData;
    const houseDataRaw = snapshot.housePoints ?? snapshot.houseData;

    const matchesData = Array.isArray(matchesDataRaw) ? matchesDataRaw : [];
    const teamsData = Array.isArray(teamsDataRaw) ? teamsDataRaw : [];
    const rumahData = Array.isArray(rumahDataRaw) ? rumahDataRaw : [];
    const spiritData = Array.isArray(spiritDataRaw) ? spiritDataRaw : [];
    const houseData = Array.isArray(houseDataRaw) ? houseDataRaw : [];

    if (matchesData.length > 0) {
      const normalized = matchesData.map((match) => {
        const matchNumber = match.match_number ?? match.matchNumber ?? 0;
        const team1RumahId = match.team1_rumah_id ?? match.team1RumahId ?? null;
        const team2RumahId = match.team2_rumah_id ?? match.team2RumahId ?? null;

        const team1Data = teamsData.find(t => t.rumahSukanId === Number(team1RumahId));
        const team2Data = teamsData.find(t => t.rumahSukanId === Number(team2RumahId));

        const team1 = {
          id: team1Data?.id ?? Number(match.team1_id) ?? null,
          rumahSukanId: team1RumahId !== null ? Number(team1RumahId) : null,
          rumahName: match.team1_rumah_name ?? '',
          mixedPair: {
            player1: match.category === 'Mixed Doubles' ? match.pair1_player1 : team1Data?.mixedPair?.player1 ?? match.pair1_player1,
            player2: match.category === 'Mixed Doubles' ? match.pair1_player2 : team1Data?.mixedPair?.player2 ?? match.pair1_player2,
          },
          mensPair: {
            player1: match.category === "Men's Doubles" ? match.pair1_player1 : team1Data?.mensPair?.player1 ?? match.pair1_player1,
            player2: match.category === "Men's Doubles" ? match.pair1_player2 : team1Data?.mensPair?.player2 ?? match.pair1_player2,
          },
        };

        const team2 = {
          id: team2Data?.id ?? Number(match.team2_id) ?? null,
          rumahSukanId: team2RumahId !== null ? Number(team2RumahId) : null,
          rumahName: match.team2_rumah_name ?? '',
          mixedPair: {
            player1: match.category === 'Mixed Doubles' ? match.pair2_player1 : team2Data?.mixedPair?.player1 ?? match.pair2_player1,
            player2: match.category === 'Mixed Doubles' ? match.pair2_player2 : team2Data?.mixedPair?.player2 ?? match.pair2_player2,
          },
          mensPair: {
            player1: match.category === "Men's Doubles" ? match.pair2_player1 : team2Data?.mensPair?.player1 ?? match.pair2_player1,
            player2: match.category === "Men's Doubles" ? match.pair2_player2 : team2Data?.mensPair?.player2 ?? match.pair2_player2,
          },
        };

        const gamesRaw = Array.isArray(match.games)
          ? match.games
          : Array.from({ length: 5 }, (_, idx) => ({
              gameNumber: idx + 1,
              team1Score: match[`game${idx + 1}_team1`] ?? 0,
              team2Score: match[`game${idx + 1}_team2`] ?? 0,
            }));

        let computedTeam1Wins = 0;
        let computedTeam2Wins = 0;

        const games = gamesRaw.map((game, idx) => {
          const gameNumber = Number(game.gameNumber ?? game.game_number ?? idx + 1);
          const team1Score = Number.isFinite(Number(game.team1Score ?? game.team1_score))
            ? Number(game.team1Score ?? game.team1_score)
            : 0;
          const team2Score = Number.isFinite(Number(game.team2Score ?? game.team2_score))
            ? Number(game.team2Score ?? game.team2_score)
            : 0;
          const scoreDiff = Math.abs(team1Score - team2Score);
          const maxScore = Math.max(team1Score, team2Score);

          const completed =
            (game.completed ?? false) ||
            (maxScore >= 11 && scoreDiff >= 2);

          if (completed) {
            if (team1Score > team2Score) {
              computedTeam1Wins += 1;
            } else if (team2Score > team1Score) {
              computedTeam2Wins += 1;
            }
          }

          return {
            gameNumber,
            team1Score,
            team2Score,
            completed,
          };
        });

        const team1Wins =
          match.team1Wins !== undefined && match.team1Wins !== null
            ? Number(match.team1Wins)
            : computedTeam1Wins;
        const team2Wins =
          match.team2Wins !== undefined && match.team2Wins !== null
            ? Number(match.team2Wins)
            : computedTeam2Wins;

        const tableIdRaw = match.table_id ?? match.tableId ?? null;
        const tableNameRaw = match.table_name ?? match.tableName ?? null;
        const tableTextRaw = match.table ?? match.tableLabel ?? null;

        const deriveTableLabel = () => {
          if (typeof tableTextRaw === 'string' && tableTextRaw.trim() !== '') {
            const clean = tableTextRaw.trim();
            const single = clean.match(/^[A-Za-z]$/);
            if (single) return single[0].toUpperCase();
            const fromWord = clean.match(/table\s*([A-Za-z0-9]+)/i);
            if (fromWord) return fromWord[1].toUpperCase();
            return clean;
          }
          if (typeof tableNameRaw === 'string' && tableNameRaw.trim() !== '') {
            const clean = tableNameRaw.trim();
            const fromWord = clean.match(/table\s*([A-Za-z0-9]+)/i);
            if (fromWord) return fromWord[1].toUpperCase();
            return clean;
          }
          if (tableIdRaw !== undefined && tableIdRaw !== null) {
            const numericId = Number(tableIdRaw);
            if (Number.isInteger(numericId)) {
              if (numericId === 1) return 'A';
              if (numericId === 2) return 'B';
              return `${numericId}`;
            }
          }
          return null;
        };

        const tableLabel = deriveTableLabel();
        const tableId = tableIdRaw !== undefined && tableIdRaw !== null ? Number(tableIdRaw) : null;
        const tableName = typeof tableNameRaw === 'string' && tableNameRaw.trim() !== '' ? tableNameRaw.trim() : null;
        const tableDisplayName = tableName || (tableLabel ? `Table ${tableLabel}` : null);

        const pair1 = {
          player1: match.pair1_player1 ?? (match.pair1?.player1 ?? ''),
          player2: match.pair1_player2 ?? (match.pair1?.player2 ?? ''),
        };

        const pair2 = {
          player1: match.pair2_player1 ?? (match.pair2?.player1 ?? ''),
          player2: match.pair2_player2 ?? (match.pair2?.player2 ?? ''),
        };

        return {
          id: match.id,
          matchNumber,
          team1,
          team2,
          category: match.category ?? '',
          status: match.status ?? 'pending',
          score1: match.score1 !== undefined && match.score1 !== null ? Number(match.score1) : team1Wins,
          score2: match.score2 !== undefined && match.score2 !== null ? Number(match.score2) : team2Wins,
          team1Wins,
          team2Wins,
          games,
          currentGame: match.current_game !== undefined && match.current_game !== null
            ? Number(match.current_game)
            : match.currentGame !== undefined && match.currentGame !== null
            ? Number(match.currentGame)
            : games.find(game => !game.completed)?.gameNumber ?? 1,
          points1: match.points1,
          points2: match.points2,
          tableId,
          tableName: tableDisplayName,
          tableLabel,
          table: tableDisplayName,
          pair1,
          pair2,
          match_time: match.match_time,
          timestamp: match.timestamp ?? match.created_at,
          completed_at: match.completed_at,
          created_at: match.created_at,
          updated_at: match.updated_at,
        };
      });

      setMatches(normalized);
    } else {
      setMatches([]);
    }

    if (teamsData.length > 0) {
      setTeams(teamsData);
    } else {
      setTeams([]);
    }

    if (rumahData.length > 0) {
      setRumahSukan(rumahData);
    } else {
      setRumahSukan([]);
    }

    if (spiritData.length > 0) {
      setSpiritMarks(spiritData);
    } else {
      setSpiritMarks([]);
    }

    if (houseData.length > 0) {
      setHousePoints(houseData);
    } else {
      setHousePoints([]);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    // Prevent multiple concurrent requests
    if (window.isFetching) return;
    window.isFetching = true;

    try {
      // Use same API endpoints as main system with stronger validation
      const [matchesData, teamsData, rumahData, spiritData, houseData] = await Promise.all([
        fetchResource(`${API_URL}?action=matches`),
        fetchResource(`${API_URL}?action=teams`),
        fetchResource(`${API_URL}?action=rumah_sukan`),
        fetchResource(`${API_URL}?resource=spirit_marks`),
        fetchResource(`${API_URL}?resource=house_points`)
      ]);

      applySnapshotData({
        matches: matchesData,
        teams: teamsData,
        rumahSukan: rumahData,
        spiritMarks: spiritData,
        housePoints: houseData,
      });

      setIsOnline(true);
      setConnectionError(false);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching tournament data:', error);

      // Set empty state on error to prevent crashes
      setMatches([]);
      setTeams([]);
      setRumahSukan([]);
      setSpiritMarks([]);
      setHousePoints([]);

      // Set error states
      setIsOnline(false);
      setConnectionError(true);
    } finally {
      // Reset fetching flag
      window.isFetching = false;
    }
  }, [API_URL, applySnapshotData, fetchResource]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const formatScore = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    const rounded = parseFloat(numeric.toFixed(2));
    if (Object.is(rounded, -0)) return '0';
    return rounded.toString();
  };

  const getTableDisplayName = (match) => {
    if (!match) return null;
    const fromName = typeof match.tableName === 'string' && match.tableName.trim() !== '' ? match.tableName.trim() : null;
    if (fromName) return fromName;
    const label = match.tableLabel;
    if (label) return `Table ${label}`;
    if (match.category === 'Mixed Doubles') return 'Table A';
    if (match.category === "Men's Doubles") return 'Table B';
    return null;
  };
  useEffect(() => {
    if (!autoRefresh) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
      setSocketConnected(false);
      setConnectionError(false);
      return undefined;
    }

    let cancelled = false;

    const clearReconnectTimer = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    function scheduleReconnect() {
      if (cancelled || !autoRefresh) return;
      const attempt = reconnectAttemptsRef.current + 1;
      reconnectAttemptsRef.current = attempt;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 30000);
      clearReconnectTimer();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (cancelled || !autoRefresh) return;
        connect();
      }, delay);
    }

    function connect() {
      if (cancelled || !autoRefresh) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0;
          setSocketConnected(true);
          setIsOnline(true);
          setConnectionError(false);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message?.type === 'tournament-update') {
              applySnapshotData(message.payload || {});
              const fetchedAt = message.payload?.fetchedAt;
              if (fetchedAt) {
                const parsed = new Date(fetchedAt);
                setLastUpdate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
              } else {
                setLastUpdate(new Date());
              }
              setIsOnline(true);
              setConnectionError(false);
            }
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          setSocketConnected(false);
          if (cancelled || !autoRefresh) return;
          setIsOnline(false);
          setConnectionError(true);
          scheduleReconnect();
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionError(true);
          ws.close();
        };
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        setConnectionError(true);
        scheduleReconnect();
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [WS_URL, autoRefresh, applySnapshotData]);

  // Process matches for live display
  const { liveResults, upcomingMatches, ongoingMatches } = useMemo(() => {
    const completed = matches.filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.timestamp || b.created_at) - new Date(a.completed_at || a.timestamp || b.created_at))
      .slice(0, 5);

    // Ongoing matches: status is 'playing'
    const ongoing = matches.filter(m => m.status === 'playing')
      .sort((a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at))
      .slice(0, 3);

    // Upcoming matches: pending with no scores OR pending with scores but not playing
    const upcoming = matches.filter(m => m.status === 'pending')
      .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
      .slice(0, 5);

    return {
      liveResults: completed.map(match => {
        // Use the direct rumah data from match since it's already included in API response
        const rumah1 = rumahSukan.find(r => r.id === match.team1?.rumahSukanId);
        const rumah2 = rumahSukan.find(r => r.id === match.team2?.rumahSukanId);

        // Attach rumah data to teams
        const enrichedTeam1 = { ...match.team1, rumahData: rumah1 };
        const enrichedTeam2 = { ...match.team2, rumahData: rumah2 };

        return {
          ...match,
          team1: enrichedTeam1,
          team2: enrichedTeam2
        };
      }),
      ongoingMatches: ongoing.map(match => {
        // Same logic for ongoing matches
        const rumah1 = rumahSukan.find(r => r.id === match.team1?.rumahSukanId);
        const rumah2 = rumahSukan.find(r => r.id === match.team2?.rumahSukanId);

        const enrichedTeam1 = { ...match.team1, rumahData: rumah1 };
        const enrichedTeam2 = { ...match.team2, rumahData: rumah2 };

        return {
          ...match,
          team1: enrichedTeam1,
          team2: enrichedTeam2
        };
      }),
      upcomingMatches: upcoming.map(match => {
        // Same logic for upcoming matches
        const rumah1 = rumahSukan.find(r => r.id === match.team1?.rumahSukanId);
        const rumah2 = rumahSukan.find(r => r.id === match.team2?.rumahSukanId);

        const enrichedTeam1 = { ...match.team1, rumahData: rumah1 };
        const enrichedTeam2 = { ...match.team2, rumahData: rumah2 };

        return {
          ...match,
          team1: enrichedTeam1,
          team2: enrichedTeam2
        };
      })
    };
  }, [matches, teams, rumahSukan]);

  // Standings calculation
  const standingsSummary = useMemo(() => {
    const houseMetaById = new Map();
    rumahSukan.forEach((house) => {
      if (house?.id) {
        houseMetaById.set(house.id, house);
      }
    });

    const buildStatsFromMatches = (matchesSubset) => {
      const statsMap = new Map();

      const ensureHouse = (houseId) => {
        if (!houseId) return null;

        if (!statsMap.has(houseId)) {
          const meta = houseMetaById.get(houseId) || {};
          statsMap.set(houseId, {
            id: houseId,
            name: meta.name || `Rumah ${houseId}`,
            color: meta.color || 'bg-gray-500',
            colorHex: meta.colorHex || '#6b7280',
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            leaguePoints: 0,
            matchWinPoints: 0,
            gamesWon: 0,
            gamesLost: 0,
            gamesDifference: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointsDifference: 0,
            headToHead: {},
          });
        }

        return statsMap.get(houseId);
      };

      matchesSubset.forEach((match) => {
        if (!match || match.status !== 'completed') return;

        const team1HouseId = match.team1?.rumahSukanId;
        const team2HouseId = match.team2?.rumahSukanId;

        if (!team1HouseId || !team2HouseId) return;

        const house1 = ensureHouse(team1HouseId);
        const house2 = ensureHouse(team2HouseId);

        if (!house1 || !house2) return;

        const score1 = Number(match.score1 ?? 0);
        const score2 = Number(match.score2 ?? 0);
        const points1 = match.points1 !== undefined && match.points1 !== null ? Number(match.points1) : score1;
        const points2 = match.points2 !== undefined && match.points2 !== null ? Number(match.points2) : score2;

        house1.matchesPlayed += 1;
        house2.matchesPlayed += 1;

        house1.gamesWon += score1;
        house1.gamesLost += score2;
        house2.gamesWon += score2;
        house2.gamesLost += score1;

        house1.pointsFor += points1;
        house1.pointsAgainst += points2;
        house2.pointsFor += points2;
        house2.pointsAgainst += points1;

        if (score1 > score2) {
          house1.wins += 1;
          house1.leaguePoints += 1;
          house1.matchWinPoints += 1;
          house2.losses += 1;
        } else if (score2 > score1) {
          house2.wins += 1;
          house2.leaguePoints += 1;
          house2.matchWinPoints += 1;
          house1.losses += 1;
        } else {
          house1.draws += 1;
          house2.draws += 1;
        }
      });

      statsMap.forEach((stat) => {
        stat.gamesDifference = stat.gamesWon - stat.gamesLost;
        stat.pointsDifference = stat.pointsFor - stat.pointsAgainst;
      });

      return statsMap;
    };

    const overallStatsMap = buildStatsFromMatches(
      matches.map(m => ({
        ...m,
        team1: { rumahSukanId: m.team1?.rumahSukanId || Number(m.team1_rumah_id) },
        team2: { rumahSukanId: m.team2?.rumahSukanId || Number(m.team2_rumah_id) }
      }))
    );

    const resolveStandings = (statsMap) => {
      const entries = Array.from(statsMap.values());
      if (entries.length <= 1) return entries;

      const groupsByPoints = new Map();
      entries.forEach((entry) => {
        const key = entry.leaguePoints;
        if (!groupsByPoints.has(key)) {
          groupsByPoints.set(key, []);
        }
        groupsByPoints.get(key).push(entry);
      });

      const sortedPointLevels = Array.from(groupsByPoints.keys()).sort((a, b) => b - a);
      const resolved = [];

      sortedPointLevels.forEach((pointLevel) => {
        const tiedTeams = groupsByPoints.get(pointLevel);
        tiedTeams.sort((a, b) => {
          const gamesDiffA = a.gamesDifference ?? 0;
          const gamesDiffB = b.gamesDifference ?? 0;
          if (gamesDiffB !== gamesDiffA) return gamesDiffB - gamesDiffA;

          const pointsDiffA = a.pointsDifference ?? 0;
          const pointsDiffB = b.pointsDifference ?? 0;
          if (pointsDiffB !== pointsDiffA) return pointsDiffB - pointsDiffA;

          return (a.name || '').localeCompare(b.name || '');
        });
        resolved.push(...tiedTeams);
      });

      return resolved;
    };

    const standings = resolveStandings(overallStatsMap);

    // Calculate house points for display
    const allHouseIds = new Set();
    rumahSukan.forEach((house) => {
      if (house?.id) allHouseIds.add(house.id);
    });

    const housePointsBase = Array.from(allHouseIds).map((houseId) => {
      const stat = overallStatsMap.get(houseId) || {
        id: houseId,
        name: houseMetaById.get(houseId)?.name || `Rumah ${houseId}`,
        color: houseMetaById.get(houseId)?.color || 'bg-gray-500',
        colorHex: houseMetaById.get(houseId)?.colorHex || '#6b7280',
        leaguePoints: 0,
        matchWinPoints: 0,
        gamesDifference: 0,
        headToHead: {},
      };

      const matchWins = stat.matchWinPoints ?? stat.wins ?? 0;
      const spiritHouse = housePoints.find(hp => hp.rumahId === houseId);
      const sportsmanship = spiritHouse ? Number(spiritHouse.spiritPoints ?? 0) : 0;
      const participation = spiritHouse ? Number(spiritHouse.participationPoints ?? 0) : 0;
      const placement = spiritHouse ? Number(spiritHouse.placementPoints ?? 0) : 0;
      const totalPoints = spiritHouse
        ? Number(spiritHouse.totalPoints ?? (matchWins + participation + sportsmanship + placement))
        : (matchWins + participation + sportsmanship + placement);

      return {
        houseId,
        name: stat.name,
        color: stat.color,
        colorHex: stat.colorHex,
        matchWinPoints: matchWins,
        spiritPoints: sportsmanship,
        participationPoints: participation,
        placementPoints: placement,
        leaguePoints: stat.leaguePoints ?? 0,
        gamesDifference: stat.gamesDifference ?? 0,
        wins: stat.wins ?? 0,
        losses: stat.losses ?? 0,
        draws: stat.draws ?? 0,
        matchesPlayed: stat.matchesPlayed ?? 0,
        pointsFor: stat.pointsFor ?? 0,
        pointsAgainst: stat.pointsAgainst ?? 0,
        totalPoints,
      };
    });

    const sortedHousePoints = [...housePointsBase].sort((a, b) => {
      if ((b.totalPoints ?? 0) !== (a.totalPoints ?? 0)) return (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
      if ((b.spiritPoints ?? 0) !== (a.spiritPoints ?? 0)) return (b.spiritPoints ?? 0) - (a.spiritPoints ?? 0);
      if ((b.matchWinPoints ?? 0) !== (a.matchWinPoints ?? 0)) return (b.matchWinPoints ?? 0) - (a.matchWinPoints ?? 0);
      if ((b.gamesDifference ?? 0) !== (a.gamesDifference ?? 0)) return (b.gamesDifference ?? 0) - (a.gamesDifference ?? 0);
      return (a.name || '').localeCompare(b.name || '');
    });

    return {
      standings: sortedHousePoints,
      overallStatsMap,
    };
  }, [matches, rumahSukan, teams, housePoints]);

  const standings = standingsSummary?.standings || [];

  // Match Graph Component - IDENTICAL TO ADMIN
  const MatchGraph = () => {
    // Use standings directly like admin does
    const validStandings = standings.filter(s => s && s.houseId && s.name);

    const graphData = validStandings.map(s => ({
      id: s.houseId,
      name: s.name,
      color: s.color,
      colorHex: s.colorHex,
      matchesPlayed: s.matchesPlayed,
      wins: s.wins,
      leaguePoints: s.leaguePoints,
      opponents: []
    }));

    matches.forEach(match => {
      const team1HouseId = match.team1?.rumahSukanId || Number(match.team1_rumah_id);
      const team2HouseId = match.team2?.rumahSukanId || Number(match.team2_rumah_id);

      const rumah1 = graphData.find(g => g.id === team1HouseId);
      const rumah2 = graphData.find(g => g.id === team2HouseId);

      if (rumah1 && rumah2) {
        if (!rumah1.opponents.includes(rumah2.name)) rumah1.opponents.push(rumah2.name);
        if (!rumah2.opponents.includes(rumah1.name)) rumah2.opponents.push(rumah1.name);
      }
    });

    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600" />
          Match Connection Graph
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {graphData.map(rumah => (
            <div key={rumah.id} className="border-2 rounded-lg p-4" style={{ borderColor: rumah.colorHex }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${rumah.color} w-4 h-4 rounded-full`}></div>
                <h4 className="font-bold text-lg">{rumah.name}</h4>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Opponents:</p>
                {rumah.opponents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rumah.opponents.map((opp, idx) => {
                      const oppData = graphData.find(g => g.name === opp);
                      return (
                        <span key={idx} className="text-xs px-3 py-1 rounded-full" style={{
                          backgroundColor: oppData?.colorHex + '20',
                          color: oppData?.colorHex,
                          border: `1px solid ${oppData?.colorHex}`
                        }}>
                          {opp}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No matches yet</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: rumah.colorHex }}>{rumah.matchesPlayed}</p>
                    <p className="text-xs text-gray-600">Matches</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{rumah.wins}</p>
                    <p className="text-xs text-gray-600">Wins</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{rumah.leaguePoints ?? rumah.points ?? 0}</p>
                    <p className="text-xs text-gray-600">Points</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <h4 className="font-bold text-lg mb-4 text-gray-800">Match Matrix (Who vs Who)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">VS</th>
                  {validStandings.map(s => (
                    <th key={s.houseId} className="p-2 text-center">
                      <div className={`${s.color} w-3 h-3 rounded-full mx-auto mb-1`}></div>
                      <div className="text-xs">{s.name.split(' ')[1]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validStandings.map(s1 => (
                  <tr key={s1.houseId}>
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`${s1.color} w-3 h-3 rounded-full`}></div>
                        {s1.name.split(' ')[1]}
                      </div>
                    </td>
                    {validStandings.map(s2 => {
                      if (s1.houseId === s2.houseId) {
                        return <td key={`${s1.houseId}-${s2.houseId}-diagonal`} className="p-2 text-center bg-gray-100">-</td>;
                      }
                      const match = matches.find(m => {
                        const team1HouseId = m.team1?.rumahSukanId || Number(m.team1_rumah_id);
                        const team2HouseId = m.team2?.rumahSukanId || Number(m.team2_rumah_id);
                        return (
                          (team1HouseId === s1.houseId && team2HouseId === s2.houseId) ||
                          (team1HouseId === s2.houseId && team2HouseId === s1.houseId)
                        );
                      });
                      if (!match || match.status === 'pending') {
                        return <td key={`${s1.houseId}-${s2.houseId}-pending`} className="p-2 text-center text-gray-400">-</td>;
                      }
                      const team1HouseId = match.team1?.rumahSukanId || Number(match.team1_rumah_id);
                      const isTeam1 = team1HouseId === s1.houseId;
                      const score = isTeam1 ? `${match.score1}-${match.score2}` : `${match.score2}-${match.score1}`;
                      const won = isTeam1 ? match.score1 > match.score2 : match.score2 > match.score1;
                      return (
                        <td key={`${s1.houseId}-${s2.houseId}-${match.id}`} className={`p-2 text-center font-medium ${won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {score}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-purple-800 text-white shadow-xl">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-4xl font-bold flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                <Trophy className="w-6 h-6 sm:w-10 sm:h-10 text-yellow-400" />
                KRKL LFSATHLON 2025
              </h1>
              <p className="text-blue-100 mt-1 sm:mt-2 text-sm sm:text-base">Public Display</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="flex flex-row justify-center sm:flex-col sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm ${
                    autoRefresh
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  <Network className="w-4 h-4" />
                  <span className="hidden sm:inline">{autoRefresh ? 'Live Updates On' : 'Live Updates Off'}</span>
                  <span className="sm:hidden">{autoRefresh ? 'Live' : 'Off'}</span>
                </button>
                <button
                  onClick={fetchAllData}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Refresh Now</span>
                  <span className="sm:hidden">Refresh</span>
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100 mt-2">
                {/* <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} ${isOnline ? 'animate-pulse' : ''}`}></div>
                  <span className="sm:hidden">{isOnline ? '🟢' : '🔴'}</span>
                </div>
                <span className="hidden sm:inline">•</span> */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Network
                    className={`w-3 h-3 ${
                      socketConnected
                        ? 'text-green-400'
                        : autoRefresh
                        ? 'text-yellow-300'
                        : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      socketConnected
                        ? 'text-green-400'
                        : autoRefresh
                        ? 'text-yellow-200'
                        : 'text-gray-300'
                    }`}
                  >
                    {socketConnected ? 'LIVE' : autoRefresh ? 'CONNECTING…' : 'PAUSED'}
                  </span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Last Update: {lastUpdate.toLocaleTimeString('en-US')}</span>
                <span className="sm:hidden text-center">{lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {connectionError && (
                <div className="mt-2 p-2 bg-red-600 bg-opacity-20 border border-red-400 rounded text-xs sm:text-sm text-red-100">
                  ⚠️ Connection issue: Real-time updates unavailable. Please check the WebSocket bridge or network.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <div className="flex space-x-1">
              {[
                { id: 'live', label: 'Live', icon: Eye, color: 'red' },
                { id: 'standings', label: 'Standings', icon: Trophy, color: 'yellow' },
                { id: 'graph', label: 'Graph', icon: GitBranch, color: 'purple' }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all ${
                      activeTab === tab.id
                        ? `text-${tab.color}-600 border-b-3 border-${tab.color}-600 bg-${tab.color}-50`
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Live Tab */}
        {activeTab === 'live' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Latest Results */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-green-600 flex items-center gap-2">
                <Eye className="w-7 h-7" />
                Latest Results
              </h2>
              {liveResults.length === 0 ? (
                <div className="text-center py-8">
                  {isOnline ? (
                    <>
                      <p className="text-gray-500 text-lg">No results yet</p>
                      <p className="text-gray-400 text-sm mt-2">Matches will start soon</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-lg">Waiting for data...</p>
                      <p className="text-gray-400 text-sm mt-2">Please ensure internet connection and server are available</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {liveResults.map(match => {
                    const rumah1 = match.team1?.rumahData;
                    const rumah2 = match.team2?.rumahData;
                    const pair1 = match.pair1;
                    const pair2 = match.pair2;
                    const team1Players = pair1?.player1 && pair1?.player2
                      ? `${pair1.player1} & ${pair1.player2}`
                      : 'Players';
                    const team2Players = pair2?.player1 && pair2?.player2
                      ? `${pair2.player1} & ${pair2.player2}`
                      : 'Players';
                    const winner = (match.completed_at && match.score1 > match.score2) ? rumah1 : (match.completed_at && match.score2 > match.score1) ? rumah2 : null;

                    return (
                      <div key={match.id} className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-green-700">Match #{match.matchNumber} - {match.category}</span>
                          <div className="flex items-center gap-2">
                            {getTableDisplayName(match) && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                                {getTableDisplayName(match)}
                              </span>
                            )}
                            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">COMPLETED</span>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 items-center">
                          <div className={`${winner?.id === rumah1?.id ? 'font-bold' : ''}`}>
                            <span className={`${rumah1?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah1?.name || 'Team 1'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">{team1Players}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-800">
                              {match.score1} - {match.score2}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(match.timestamp || match.created_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className={`text-right ${winner?.id === rumah2?.id ? 'font-bold' : ''}`}>
                            <span className={`${rumah2?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah2?.name || 'Team 2'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">{team2Players}</div>
                          </div>
                        </div>
                        {winner && (
                          <div className={`mt-3 text-center font-bold ${winner.color} bg-opacity-20 px-3 py-2 rounded-lg`}>
                            🏆 Winner: {winner.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ongoing Matches */}
            {ongoingMatches.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6 text-orange-600 flex items-center gap-2">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                  Ongoing Matches
                </h2>
                <div className="space-y-5">
                  {ongoingMatches.map(match => {
                    const rumah1 = match.team1?.rumahData;
                    const rumah2 = match.team2?.rumahData;
                    const rumah1Name = rumah1?.name || match.team1?.rumahName || 'Team 1';
                    const rumah2Name = rumah2?.name || match.team2?.rumahName || 'Team 2';
                    const rumah1Color = rumah1?.color || 'bg-gray-400';
                    const rumah2Color = rumah2?.color || 'bg-gray-400';
                    const pair1 = match.pair1;
                    const pair2 = match.pair2;
                    const team1Players = pair1?.player1 && pair1?.player2
                      ? `${pair1.player1} & ${pair1.player2}`
                      : 'Players';
                    const team2Players = pair2?.player1 && pair2?.player2
                      ? `${pair2.player1} & ${pair2.player2}`
                      : 'Players';
                    const tableDisplay = getTableDisplayName(match);
                    const matchGames = Array.isArray(match.games) && match.games.length > 0
                      ? match.games
                      : Array.from({ length: 5 }, (_, index) => ({
                          gameNumber: index + 1,
                          team1Score: 0,
                          team2Score: 0,
                          completed: false,
                        }));
                    const firstIncompleteGame = matchGames.find(game => !game.completed) || null;
                    const normalizedCurrentGame = Number.isFinite(Number(match.currentGame))
                      ? Number(match.currentGame)
                      : null;
                    const activeGameNumber = match.status === 'completed'
                      ? null
                      : normalizedCurrentGame && normalizedCurrentGame > 0
                        ? normalizedCurrentGame
                        : (firstIncompleteGame ? firstIncompleteGame.gameNumber : null);
                    const matchCompleted = match.status === 'completed';
                    const normalizedScore1 = Number.isFinite(Number(match.score1)) ? Number(match.score1) : 0;
                    const normalizedScore2 = Number.isFinite(Number(match.score2)) ? Number(match.score2) : 0;
                    const hasGameWins = normalizedScore1 > 0 || normalizedScore2 > 0;

                    return (
                      <div key={match.id} className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-6 rounded-xl border-2 border-orange-200 shadow-inner">
                        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Match #{match.matchNumber}</span>
                            <span className="text-sm font-medium text-gray-700">{match.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tableDisplay && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold uppercase tracking-wide">
                                {tableDisplay}
                              </span>
                            )}
                            {match.status === 'playing' && (
                              <span className="text-xs bg-orange-600 text-white px-3 py-1 rounded-full font-semibold uppercase tracking-wide animate-pulse">
                                Playing
                              </span>
                            )}
                            {match.status === 'completed' && (
                              <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-semibold uppercase tracking-wide">
                                Completed
                              </span>
                            )}
                            {match.status === 'pending' && (
                              <span className="text-xs bg-gray-500 text-white px-3 py-1 rounded-full font-semibold uppercase tracking-wide">
                                Waiting
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 items-start pb-4 border-b border-orange-200">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`${rumah1Color} text-white px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide`}>
                                {rumah1Name}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-700">{team1Players}</p>
                          </div>
                          <div className="flex flex-col items-center gap-2 text-center">
                            {hasGameWins ? (
                              <>
                                <div className="flex items-center gap-3">
                                  <span className="text-3xl font-black text-orange-700 drop-shadow-sm">{normalizedScore1}</span>
                                  <span className="text-2xl font-bold text-orange-400">:</span>
                                  <span className="text-3xl font-black text-orange-700 drop-shadow-sm">{normalizedScore2}</span>
                                </div>
                                <p className="text-xs uppercase tracking-wide text-gray-600 font-semibold">Games Won</p>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs uppercase tracking-wide text-gray-600 font-semibold">Games Won</span>
                                <span className="text-sm font-semibold text-gray-500">No games won yet</span>
                              </div>
                            )}
                            {matchCompleted ? (
                              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Match Complete</span>
                            ) : (
                              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                                {activeGameNumber ? `Current Game: Game ${activeGameNumber}` : 'Waiting for Game 1 to start'}
                              </span>
                            )}
                            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Best of 5 · First to 11 · Win by 2</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-2 mb-1">
                              <span className={`${rumah2Color} text-white px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide`}>
                                {rumah2Name}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-700">{team2Players}</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          {matchGames.map((game) => {
                            const team1Score = Number.isFinite(Number(game.team1Score)) ? Number(game.team1Score) : 0;
                            const team2Score = Number.isFinite(Number(game.team2Score)) ? Number(game.team2Score) : 0;
                            const scoreDiff = Math.abs(team1Score - team2Score);
                            const maxScore = Math.max(team1Score, team2Score);
                            const hasRecordedScores = team1Score > 0 || team2Score > 0;
                            const meetsWinCondition = maxScore >= 11 && scoreDiff >= 2;
                            const needsTwoPointFinish = maxScore >= 10 && scoreDiff < 2 && hasRecordedScores;
                            const isCompleted = game.completed || meetsWinCondition;
                            const isActive = !isCompleted && activeGameNumber === game.gameNumber;
                            const winnerName = isCompleted
                              ? (team1Score > team2Score ? rumah1Name : rumah2Name)
                              : null;
                            const instructionText = needsTwoPointFinish
                              ? 'Need 2-point difference to finish game'
                              : 'Target 11 points, win by 2 after deuce';

                            return (
                              <div
                                key={`${match.id}-game-${game.gameNumber}`}
                                className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg ${
                                  isCompleted
                                    ? 'border-green-200 bg-green-50'
                                    : isActive
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-orange-100 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold text-gray-700">Game {game.gameNumber}</span>
                                  {isCompleted && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium uppercase tracking-wide">
                                      Complete
                                    </span>
                                  )}
                                  {!isCompleted && isActive && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium uppercase tracking-wide">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 text-center px-3 py-2 border border-gray-300 rounded-lg text-base font-bold bg-white shadow-sm">
                                    {team1Score}
                                  </div>
                                  <span className="font-semibold text-gray-500">:</span>
                                  <div className="w-16 text-center px-3 py-2 border border-gray-300 rounded-lg text-base font-bold bg-white shadow-sm">
                                    {team2Score}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 md:text-right font-medium">
                                  {isCompleted
                                    ? `Winner: ${winnerName}`
                                    : instructionText}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Matches */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-blue-600 flex items-center gap-2">
                <RefreshCw className="w-7 h-7" />
                Upcoming Matches
              </h2>
              {upcomingMatches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No matches scheduled</p>
              ) : (
                <div className="space-y-4">
                  {upcomingMatches.map(match => {
                    const rumah1 = match.team1?.rumahData;
                    const rumah2 = match.team2?.rumahData;
                    const tableDisplay = getTableDisplayName(match);
                    const team1Players = match.pair1?.player1 && match.pair1?.player2
                      ? `${match.pair1.player1} & ${match.pair1.player2}`
                      : 'Players';
                    const team2Players = match.pair2?.player1 && match.pair2?.player2
                      ? `${match.pair2.player1} & ${match.pair2.player2}`
                      : 'Players';

                    return (
                      <div key={match.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-700">Match #{match.matchNumber} - {match.category}</span>
                            <div className="flex items-center gap-2">
                              {tableDisplay && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                  {tableDisplay}
                                </span>
                              )}
                              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">UPCOMING</span>
                            </div>
                          </div>
                        <div className="grid md:grid-cols-3 gap-4 items-center">
                          <div>
                            <span className={`${rumah1?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah1?.name || 'Team 1'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">{team1Players}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              VS
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {match.match_time ? new Date(match.match_time).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`${rumah2?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah2?.name || 'Team 2'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">{team2Players}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Overall Standings
            </h2>

            {standings.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No standings data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 text-lg font-semibold">#</th>
                      <th className="text-left py-4 px-4 text-lg font-semibold">House</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Spirit</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Participation</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Wins</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Losses</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => {
                      const tournamentStarted = matches.some(m => m.status === 'completed');
                      return (
                      <tr key={team.houseId} className={`border-b hover:bg-gray-50 transition-colors ${index < 3 ? 'bg-gradient-to-r' : ''} ${
                        index === 0 ? 'from-yellow-50 to-amber-50' :
                        index === 1 ? 'from-gray-50 to-slate-50' :
                        index === 2 ? 'from-orange-50 to-amber-50' : ''
                      }`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {tournamentStarted && index === 0 && <span className="text-2xl">🥇</span>}
                            {tournamentStarted && index === 1 && <span className="text-2xl">🥈</span>}
                            {tournamentStarted && index === 2 && <span className="text-2xl">🥉</span>}
                            <span className="text-lg font-bold">{tournamentStarted ? `#${index + 1}` : '-'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`inline-block w-8 h-8 rounded-full ${team.color}`}></span>
                            <span className="text-lg font-bold">{team.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-purple-600">
                            {formatScore(team.spiritPoints)}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-orange-600">
                            {Number.isFinite(team.participationPoints) ? team.participationPoints : 0}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-green-600">{team.wins}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-red-600">{team.losses}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-indigo-600">
                            {formatScore(team.totalPoints)}
                          </span>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Match Graph Tab */}
        {activeTab === 'graph' && <MatchGraph />}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg">KRKL LFSATHLON 2025</p>
        </div>
      </div>
    </div>
  );
};

export default KRKLPublicDisplay;
