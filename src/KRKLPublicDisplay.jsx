import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Trophy, GitBranch, RefreshCw, Settings, ArrowLeft, Network } from 'lucide-react';

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

  // API endpoint (use same as main system)
  const API_URL = 'http://pingpong.test/krkl-tournament/api.php';

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllData();
      setLastUpdate(new Date());
    }, 1000); // Refresh every 1 second

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    // Prevent multiple concurrent requests
    if (window.isFetching) return;
    window.isFetching = true;

    try {
      // Use same API endpoints as main system
      const [matchesRes, teamsRes, rumahRes, spiritRes, houseRes] = await Promise.all([
        fetch(`${API_URL}?action=matches`),
        fetch(`${API_URL}?action=teams`),
        fetch(`${API_URL}?action=rumah_sukan`),
        fetch(`${API_URL}?resource=spirit_marks`),
        fetch(`${API_URL}?resource=house_points`)
      ]);

      // Parse responses like main system does
      const matchesData = await matchesRes.json();
      const teamsData = await teamsRes.json();
      const rumahData = await rumahRes.json();
      const spiritData = await spiritRes.json();
      const houseData = await houseRes.json();

      // Set data directly (main system doesn't check for success field)
      if (Array.isArray(matchesData) && matchesData.length > 0) {
        const normalized = matchesData.map((match) => {
          const matchNumber = match.match_number ?? match.matchNumber ?? 0;
          const team1RumahId = match.team1_rumah_id ?? match.team1RumahId ?? null;
          const team2RumahId = match.team2_rumah_id ?? match.team2RumahId ?? null;

          // Find the correct team data using rumahSukanId
          const team1Data = teamsData.find(t => t.rumahSukanId === team1RumahId);
          const team2Data = teamsData.find(t => t.rumahSukanId === team2RumahId);

          // Use the direct team data from API response with proper player pairs
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

          return {
            id: match.id,
            matchNumber,
            team1,
            team2,
            category: match.category ?? '',
            status: match.status ?? 'pending',
            score1: match.score1 ?? 0,
            score2: match.score2 ?? 0,
            points1: match.points1,
            points2: match.points2,
            table: match.table ?? '',
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

      if (Array.isArray(teamsData) && teamsData.length > 0) {
        setTeams(teamsData);
      } else {
        setTeams([]);
      }

      if (Array.isArray(rumahData) && rumahData.length > 0) {
        setRumahSukan(rumahData);
      } else {
        setRumahSukan([]);
      }

      if (Array.isArray(spiritData)) {
        setSpiritMarks(spiritData);
      }

      if (Array.isArray(houseData)) {
        setHousePoints(houseData);
      }

      setIsOnline(true);
      setConnectionError(false);
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
  };

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
      .sort((a, b) => new Date(a.match_time || a.created_at) - new Date(b.match_time || b.created_at))
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
      const sportsmanship = spiritHouse ? spiritHouse.spiritPoints : 0;

      return {
        houseId,
        name: stat.name,
        color: stat.color,
        colorHex: stat.colorHex,
        matchWinPoints: matchWins,
        spiritPoints: sportsmanship,
        leaguePoints: stat.leaguePoints ?? 0,
        gamesDifference: stat.gamesDifference ?? 0,
        wins: stat.wins ?? 0,
        losses: stat.losses ?? 0,
        draws: stat.draws ?? 0,
        matchesPlayed: stat.matchesPlayed ?? 0,
        pointsFor: stat.pointsFor ?? 0,
        pointsAgainst: stat.pointsAgainst ?? 0,
      };
    });

    const sortedHousePoints = [...housePointsBase].sort((a, b) => {
      if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
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
          Graf Perlawanan (Match Connection Graph)
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          {graphData.map(rumah => (
            <div key={rumah.id} className="border-2 rounded-lg p-4" style={{ borderColor: rumah.colorHex }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`${rumah.color} w-4 h-4 rounded-full`}></div>
                <h4 className="font-bold text-lg">{rumah.name}</h4>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Bertemu dengan:</p>
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
                  <p className="text-sm text-gray-500">Tiada perlawanan lagi</p>
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
                    <p className="text-xs text-gray-600">Menang</p>
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
          <h4 className="font-bold text-lg mb-4 text-gray-800">Match Matrix (Siapa vs Siapa)</h4>
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Trophy className="w-10 h-10 text-yellow-400" />
                KRKL Tournament 2025
              </h1>
              <p className="text-blue-100 mt-2">Paparan Awam | Public Display</p>
            </div>
            <div className="text-right">
              {/* Admin Link */}
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors mb-3"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
                <ArrowLeft className="w-3 h-3" />
              </Link>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    autoRefresh
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                  Auto Refresh (1s)
                </button>
                <button
                  onClick={fetchAllData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Now
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-100 mt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} ${isOnline ? 'animate-pulse' : ''}`}></div>
                  <span>{isOnline ? 'Connected' : 'Offline'}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin text-green-400' : 'text-gray-400'}`} />
                  <span className="text-green-400 font-medium">LIVE</span>
                </div>
                <span>•</span>
                <span>Last Update: {lastUpdate.toLocaleTimeString('ms-MY')}</span>
              </div>
              {connectionError && (
                <div className="mt-2 p-2 bg-red-600 bg-opacity-20 border border-red-400 rounded text-sm text-red-100">
                  ⚠️ Connection error: Unable to fetch tournament data. Please check your network connection.
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
                { id: 'standings', label: 'Kedudukan', icon: Trophy, color: 'yellow' },
                { id: 'graph', label: 'Graf', icon: GitBranch, color: 'purple' }
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
                Keputusan Terkini
              </h2>
              {liveResults.length === 0 ? (
                <div className="text-center py-8">
                  {isOnline ? (
                    <>
                      <p className="text-gray-500 text-lg">Tiada keputusan lagi</p>
                      <p className="text-gray-400 text-sm mt-2">Perlawanan akan dimulakan tidak lama lagi</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-500 text-lg">Waiting for data...</p>
                      <p className="text-gray-400 text-sm mt-2">Sila pastikan sambungan internet dan server tersedia</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {liveResults.map(match => {
                    const rumah1 = match.team1?.rumahData;
                    const rumah2 = match.team2?.rumahData;
                    const winner = (match.completed_at && match.score1 > match.score2) ? rumah1 : (match.completed_at && match.score2 > match.score1) ? rumah2 : null;

                    return (
                      <div key={match.id} className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-green-700">Match #{match.matchNumber} - {match.category}</span>
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">SELESAI</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 items-center">
                          <div className={`${winner?.id === rumah1?.id ? 'font-bold' : ''}`}>
                            <span className={`${rumah1?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah1?.name || 'Team 1'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">
                              {match.team1?.mixedPair?.player1 && match.team1?.mixedPair?.player2 ?
                                `${match.team1.mixedPair.player1} & ${match.team1.mixedPair.player2}` :
                                match.team1?.mensPair?.player1 && match.team1?.mensPair?.player2 ?
                                `${match.team1.mensPair.player1} & ${match.team1.mensPair.player2}` :
                                'Players'
                              }
                            </div>
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
                            <div className="text-sm text-gray-600 mt-1">
                              {match.team2?.mixedPair?.player1 && match.team2?.mixedPair?.player2 ?
                                `${match.team2.mixedPair.player1} & ${match.team2.mixedPair.player2}` :
                                match.team2?.mensPair?.player1 && match.team2?.mensPair?.player2 ?
                                `${match.team2.mensPair.player1} & ${match.team2.mensPair.player2}` :
                                'Players'
                              }
                            </div>
                          </div>
                        </div>
                        {winner && (
                          <div className={`mt-3 text-center font-bold ${winner.color} bg-opacity-20 px-3 py-2 rounded-lg`}>
                            🏆 Pemenang: {winner.name}
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
                  Sedang Berlangsung
                </h2>
                <div className="space-y-4">
                  {ongoingMatches.map(match => {
                    const rumah1 = match.team1?.rumahData;
                    const rumah2 = match.team2?.rumahData;

                    return (
                      <div key={match.id} className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-lg border-2 border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-orange-700">Match #{match.matchNumber} - {match.category}</span>
                          <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded-full animate-pulse">SEDANG BERLANGSUNG</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 items-center">
                          <div>
                            <span className={`${rumah1?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah1?.name || 'Team 1'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">
                              {match.team1?.mixedPair?.player1 && match.team1?.mixedPair?.player2 ?
                                `${match.team1.mixedPair.player1} & ${match.team1.mixedPair.player2}` :
                                match.team1?.mensPair?.player1 && match.team1?.mensPair?.player2 ?
                                `${match.team1.mensPair.player1} & ${match.team1.mensPair.player2}` :
                                'Players'
                              }
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-orange-600">
                              {match.score1} - {match.score2}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(match.timestamp || match.created_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`${rumah2?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah2?.name || 'Team 2'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">
                              {match.team2?.mixedPair?.player1 && match.team2?.mixedPair?.player2 ?
                                `${match.team2.mixedPair.player1} & ${match.team2.mixedPair.player2}` :
                                match.team2?.mensPair?.player1 && match.team2?.mensPair?.player2 ?
                                `${match.team2.mensPair.player1} & ${match.team2.mensPair.player2}` :
                                'Players'
                              }
                            </div>
                          </div>
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
                Perlawanan Akan Datang
              </h2>
              {upcomingMatches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Tiada perlawanan dijadualkan</p>
              ) : (
                <div className="space-y-4">
                  {upcomingMatches.map(match => {
                    const rumah1 = match.team1?.rumahData;
                    const rumah2 = match.team2?.rumahData;

                    return (
                      <div key={match.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-blue-700">Match #{match.matchNumber} - {match.category}</span>
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">AKAN DATANG</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 items-center">
                          <div>
                            <span className={`${rumah1?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                              {rumah1?.name || 'Team 1'}
                            </span>
                            <div className="text-sm text-gray-600 mt-1">
                              {match.team1?.mixedPair?.player1 && match.team1?.mixedPair?.player2 ?
                                `${match.team1.mixedPair.player1} & ${match.team1.mixedPair.player2}` :
                                match.team1?.mensPair?.player1 && match.team1?.mensPair?.player2 ?
                                `${match.team1.mensPair.player1} & ${match.team1.mensPair.player2}` :
                                'Players'
                              }
                            </div>
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
                            <div className="text-sm text-gray-600 mt-1">
                              {match.team2?.mixedPair?.player1 && match.team2?.mixedPair?.player2 ?
                                `${match.team2.mixedPair.player1} & ${match.team2.mixedPair.player2}` :
                                match.team2?.mensPair?.player1 && match.team2?.mensPair?.player2 ?
                                `${match.team2.mensPair.player1} & ${match.team2.mensPair.player2}` :
                                'Players'
                              }
                            </div>
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
              Kedudukan Keseluruhan
            </h2>

            {standings.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Tiada data kedudukan lagi</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 text-lg font-semibold">#</th>
                      <th className="text-left py-4 px-4 text-lg font-semibold">Rumah</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Points</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Menang</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Seri</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Kalah</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Games Diff</th>
                      <th className="text-center py-4 px-4 text-lg font-semibold">Spirit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, index) => (
                      <tr key={team.houseId} className={`border-b hover:bg-gray-50 transition-colors ${index < 3 ? 'bg-gradient-to-r' : ''} ${
                        index === 0 ? 'from-yellow-50 to-amber-50' :
                        index === 1 ? 'from-gray-50 to-slate-50' :
                        index === 2 ? 'from-orange-50 to-amber-50' : ''
                      }`}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span className="text-2xl">🥇</span>}
                            {index === 1 && <span className="text-2xl">🥈</span>}
                            {index === 2 && <span className="text-2xl">🥉</span>}
                            <span className="text-lg font-bold">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`inline-block w-8 h-8 rounded-full ${team.color}`}></span>
                            <span className="text-lg font-bold">{team.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-2xl font-bold text-blue-600">{team.leaguePoints}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-green-600">{team.wins}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-gray-600">{team.draws}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-red-600">{team.losses}</span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className={`text-lg font-semibold ${team.gamesDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {team.gamesDifference > 0 ? '+' : ''}{team.gamesDifference}
                          </span>
                        </td>
                        <td className="text-center py-4 px-4">
                          <span className="text-lg font-semibold text-purple-600">{team.spiritPoints.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
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
          <p className="text-lg">KRKL Tournament 2025 - Public Display</p>
          <p className="text-gray-400 mt-2">Auto-refresh every 1 second</p>
        </div>
      </div>
    </div>
  );
};

export default KRKLPublicDisplay;