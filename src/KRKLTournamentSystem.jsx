import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, Clock, MapPin, Plus, Trash2, Edit2, Save, X, Download, BarChart3, TrendingUp, Eye, FileText, Network, Star, Heart, Award, ExternalLink } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TournamentReport from './pdf/TournamentReport';

const getTodayLocalISODate = () => {
  const now = new Date();
  const offsetInMs = now.getTimezoneOffset() * 60 * 1000;
  const local = new Date(now.getTime() - offsetInMs);
  return local.toISOString().split('T')[0];
};

export default function KRKLTournamentSystem() {
  const [activeTab, setActiveTab] = useState('home');
  const [rumahSukan, setRumahSukan] = useState([]);

  const [editingRumah, setEditingRumah] = useState(null);
  const [newRumah, setNewRumah] = useState({ name: '', color: 'bg-purple-500', colorHex: '#a855f7' });

  const [teams, setTeams] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [newTeam, setNewTeam] = useState({
    rumahSukanId: '',
    players: [],
    mixedPair: { player1: '', player2: '' },
    mensPair: { player1: '', player2: '' },
  });

  const [matches, setMatches] = useState([]);
  const [editingGameScores, setEditingGameScores] = useState({});
  const [liveResults, setLiveResults] = useState([]);

  // Team table assignments state
  const [teamTableAssignments, setTeamTableAssignments] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [showTableAssignmentModal, setShowTableAssignmentModal] = useState(false);
  const [selectedTeamForAssignment, setSelectedTeamForAssignment] = useState(null);
  const [selectedCategoryForAssignment, setSelectedCategoryForAssignment] = useState('');

  // Spirit marks assessment state
  const [spiritMarks, setSpiritMarks] = useState([]);
  const [housePoints, setHousePoints] = useState([]);
  const [showSpiritMarksModal, setShowSpiritMarksModal] = useState(false);
  const [selectedRumahForSpirit, setSelectedRumahForSpirit] = useState(null);
  const [spiritAssessment, setSpiritAssessment] = useState({
    tournamentDate: getTodayLocalISODate(),
    assessorName: '',
    overallScore: 0,
    overallNotes: ''
  });

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

  // API endpoint (use local dev domain)
  const API_URL = 'http://pingpong.test/krkl-tournament/api.php';

  const hasReportData = rumahSukan.length > 0 || teams.length > 0 || matches.length > 0;
  const textReportDisabled = matches.length === 0;

  // Initialize data from database
  useEffect(() => {
    fetchRumahSukan();
    fetchTeams();
    fetchMatches();
    fetchTables();
    fetchTeamTableAssignments();
    fetchSpiritMarks();
    fetchHousePoints();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}?action=teams`);
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  };

  const fetchRumahSukan = async () => {
    try {
      const response = await fetch(`${API_URL}?action=rumah_sukan`);
      const data = await response.json();
      setRumahSukan(data);
    } catch (error) {
      console.error('Error fetching rumah sukan:', error);
      setRumahSukan([
        { id: 1, name: 'Rumah Merah', color: 'bg-red-500', colorHex: '#ef4444' },
        { id: 2, name: 'Rumah Biru', color: 'bg-blue-500', colorHex: '#3b82f6' },
        { id: 3, name: 'Rumah Hijau', color: 'bg-green-500', colorHex: '#22c55e' },
        { id: 4, name: 'Rumah Kuning', color: 'bg-yellow-500', colorHex: '#eab308' },
      ]);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch(`${API_URL}?action=matches`);
      const data = await response.json();
      const normalized = Array.isArray(data)
        ? data.map((match) => {
            const matchNumber = match.match_number ?? match.matchNumber ?? 0;
            const team1RumahId = match.team1_rumah_id ?? match.team1RumahId ?? null;
            const team2RumahId = match.team2_rumah_id ?? match.team2RumahId ?? null;

            const team1 = {
              id: match.team1_id ?? match.team1Id ?? null,
              rumahSukanId: team1RumahId !== null ? Number(team1RumahId) : null,
              rumahName: match.team1_rumah_name ?? match.team1RumahName ?? '',
            };

            const team2 = {
              id: match.team2_id ?? match.team2Id ?? null,
              rumahSukanId: team2RumahId !== null ? Number(team2RumahId) : null,
              rumahName: match.team2_rumah_name ?? match.team2RumahName ?? '',
            };

            const gamesFromApi = Array.isArray(match.games)
              ? match.games
              : Array.from({ length: 5 }, (_, index) => ({
                  gameNumber: index + 1,
                  team1Score: match[`game${index + 1}_team1`] ?? 0,
                  team2Score: match[`game${index + 1}_team2`] ?? 0,
                }));

            let computedTeam1Wins = 0;
            let computedTeam2Wins = 0;

            const games = gamesFromApi.map((game, index) => {
              const gameNumber = Number(game.gameNumber ?? game.game_number ?? index + 1);
              const rawTeam1Score = game.team1Score ?? game.team1_score ?? 0;
              const rawTeam2Score = game.team2Score ?? game.team2_score ?? 0;
              const team1Score = Number.isFinite(Number(rawTeam1Score)) ? Number(rawTeam1Score) : 0;
              const team2Score = Number.isFinite(Number(rawTeam2Score)) ? Number(rawTeam2Score) : 0;
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
                const matchLetter = clean.match(/^[A-Za-z]$/);
                if (matchLetter) return matchLetter[0].toUpperCase();
                const fromTableWord = clean.match(/table\s*([A-Za-z0-9]+)/i);
                if (fromTableWord) return fromTableWord[1].toUpperCase();
                return clean;
              }
              if (typeof tableNameRaw === 'string' && tableNameRaw.trim() !== '') {
                const clean = tableNameRaw.trim();
                const fromTableWord = clean.match(/table\s*([A-Za-z0-9]+)/i);
                if (fromTableWord) return fromTableWord[1].toUpperCase();
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
            const explicitTableName = typeof tableNameRaw === 'string' && tableNameRaw.trim() !== '' ? tableNameRaw.trim() : null;
            const tableDisplayName = explicitTableName || (tableLabel ? `Table ${tableLabel}` : null);
            const tableId = tableIdRaw !== undefined && tableIdRaw !== null ? Number(tableIdRaw) : null;

            return {
              id: match.id ?? match.match_id ?? null,
              matchNumber: Number(matchNumber),
              round: match.round !== undefined && match.round !== null ? Number(match.round) : 1,
              category: match.category ?? 'Mixed Doubles',
              team1Id: team1.id,
              team2Id: team2.id,
              team1,
              team2,
              pair1: {
                player1: match.pair1_player1 ?? (match.pair1?.player1 ?? ''),
                player2: match.pair1_player2 ?? (match.pair1?.player2 ?? ''),
              },
              pair2: {
                player1: match.pair2_player1 ?? (match.pair2?.player1 ?? ''),
                player2: match.pair2_player2 ?? (match.pair2?.player2 ?? ''),
              },
              tableId,
              tableName: tableDisplayName,
              tableLabel,
              table: tableDisplayName,
              games,
              currentGame: match.current_game !== undefined && match.current_game !== null
                ? Number(match.current_game)
                : match.currentGame !== undefined && match.currentGame !== null
                ? Number(match.currentGame)
                : games.find((game) => !game.completed)?.gameNumber ?? 1,
              score1: match.score1 !== undefined && match.score1 !== null ? Number(match.score1) : team1Wins,
              score2: match.score2 !== undefined && match.score2 !== null ? Number(match.score2) : team2Wins,
              team1Wins,
              team2Wins,
              points1: match.points1 !== undefined && match.points1 !== null ? Number(match.points1) : undefined,
              points2: match.points2 !== undefined && match.points2 !== null ? Number(match.points2) : undefined,
              status: match.status ?? 'pending',
              timestamp: match.timestamp ?? null,
              completed_at: match.completed_at,
              createdAt: match.created_at ?? match.createdAt ?? null,
            };
          })
        : [];
      setMatches(normalized);
      const initialScores = {};
      normalized.forEach((match) => {
        if (!match?.id) {
          return;
        }
        const scoreByGame = {};
        (match.games || []).forEach((game) => {
          const hasInput = (game?.team1Score ?? 0) !== 0 || (game?.team2Score ?? 0) !== 0;
          scoreByGame[game.gameNumber] = {
            team1: hasInput && game.team1Score !== undefined && game.team1Score !== null ? String(game.team1Score) : '',
            team2: hasInput && game.team2Score !== undefined && game.team2Score !== null ? String(game.team2Score) : '',
          };
        });
        initialScores[match.id] = scoreByGame;
      });
      setEditingGameScores(initialScores);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches([]);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch(`${API_URL}?resource=tables`);
      const data = await response.json();
      setAvailableTables(data);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setAvailableTables([]);
    }
  };

  const fetchTeamTableAssignments = async () => {
    try {
      const response = await fetch(`${API_URL}?resource=team_table_assignments`);
      const data = await response.json();
      setTeamTableAssignments(data);
    } catch (error) {
      console.error('Error fetching team table assignments:', error);
      setTeamTableAssignments([]);
    }
  };

  const fetchSpiritMarks = async () => {
    try {
      const response = await fetch(`${API_URL}?resource=spirit_marks`);
      const data = await response.json();
      setSpiritMarks(data);
    } catch (error) {
      console.error('Error fetching spirit marks:', error);
      setSpiritMarks([]);
    }
  };

  
  const fetchHousePoints = async () => {
    try {
      const response = await fetch(`${API_URL}?resource=house_points`);
      const data = await response.json();
      setHousePoints(data);
    } catch (error) {
      console.error('Error fetching house points:', error);
      setHousePoints([]);
    }
  };

  // Update live results when matches change
  useEffect(() => {
    const completed = matches.filter(m => m.status === 'completed').slice(-5).reverse();
    setLiveResults(completed);
  }, [matches]);

  // Rumah Sukan Management
  const addRumah = () => {
    if (!newRumah.name) {
      alert('Please enter Rumah Sukan name');
      return;
    }
    if (editingRumah) {
      setRumahSukan(rumahSukan.map(r => r.id === editingRumah.id ? { ...newRumah, id: editingRumah.id } : r));
      setEditingRumah(null);
    } else {
      setRumahSukan([...rumahSukan, { ...newRumah, id: Date.now() }]);
    }
    setNewRumah({ name: '', color: 'bg-purple-500', colorHex: '#a855f7' });
  };

  const editRumah = (rumah) => {
    setEditingRumah(rumah);
    setNewRumah(rumah);
  };

  const deleteRumah = (id) => {
    const hasTeams = teams.some(t => t.rumahSukanId === id);
    if (hasTeams) {
      alert('Cannot delete Rumah Sukan with registered teams');
      return;
    }
    if (confirm('Are you sure you want to delete this Rumah Sukan?')) {
      setRumahSukan(rumahSukan.filter(r => r.id !== id));
    }
  };

  // Player Management
  const addPlayer = (teamData, setTeamData) => {
    setTeamData({
      ...teamData,
      players: [...teamData.players, { name: '', gender: 'M' }],
    });
  };

  const updatePlayer = (index, field, value, teamData, setTeamData) => {
    const updatedPlayers = [...teamData.players];
    updatedPlayers[index][field] = value;
    setTeamData({ ...teamData, players: updatedPlayers });
  };

  const removePlayer = (index, teamData, setTeamData) => {
    const updatedPlayers = teamData.players.filter((_, i) => i !== index);
    setTeamData({ ...teamData, players: updatedPlayers });
  };

  const saveTeam = async () => {
    console.log('saveTeam called', { editingTeam, newTeam });
    const isUpdate = Boolean(editingTeam);

    if (!newTeam.rumahSukanId || newTeam.players.length < 2) {
      alert('Please select a Rumah Sukan and add at least 2 players');
      return;
    }

    const femaleCount = newTeam.players.filter(p => p.gender === 'F').length;
    if (femaleCount === 0) {
      alert('Must register at least 1 female player');
      return;
    }

    const payload = {
      action: isUpdate ? 'update_team' : 'save_team',
      teamId: editingTeam?.id ?? null,
      rumahSukanId: newTeam.rumahSukanId,
      players: newTeam.players,
      mixedPair: newTeam.mixedPair,
      mensPair: newTeam.mensPair,
    };

    console.log('saveTeam payload', payload);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('saveTeam raw response', response);

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        result = { success: false, parseError: e.message, rawText: text };
      }

      console.log('saveTeam parsed response', result);

      if (response.ok && result.success) {
        setEditingTeam(null);
        setNewTeam({
          rumahSukanId: '',
          players: [],
          mixedPair: { player1: '', player2: '' },
          mensPair: { player1: '', player2: '' },
        });

        alert(`Team ${isUpdate ? 'updated' : 'saved'} successfully!`);
        await fetchTeams(); // Refresh teams from database
      } else {
        const message = result && result.message ? result.message : (result.rawText ? result.rawText : 'Unknown error');
        console.warn('saveTeam failed', { responseStatus: response.status, message, result });
        alert('Error saving team: ' + message);
      }
    } catch (error) {
      console.error('Error saving team (network/exception):', error);
      // Show helpful message to user and point to console for details
      alert('Error saving team. Please check the backend server is running and see console for details.');
    }
  };

  const editTeam = (team) => {
    setEditingTeam({ id: team.id });
    setNewTeam({
      rumahSukanId: team.rumahSukanId ? Number(team.rumahSukanId) : '',
      players: (team.players || []).map(player => ({
        id: player.id ?? null,
        name: player.name ?? '',
        gender: player.gender ?? 'M',
      })),
      mixedPair: {
        player1: team.mixedPair?.player1 ?? '',
        player2: team.mixedPair?.player2 ?? '',
      },
      mensPair: {
        player1: team.mensPair?.player1 ?? '',
        player2: team.mensPair?.player2 ?? '',
      },
    });
    setActiveTab('register');
  };

  const deleteTeam = async (id) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_team',
          teamId: id,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Team deleted successfully');
        await fetchTeams();
        await fetchMatches();
      } else {
        const message = result && result.message ? result.message : 'Failed to delete team';
        alert(message);
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Error deleting team. Please try again.');
    }
  };

  // Team Table Assignment Functions
  const openTableAssignmentModal = (team, category) => {
    setSelectedTeamForAssignment(team);
    setSelectedCategoryForAssignment(category);
    setShowTableAssignmentModal(true);
  };

  const closeTableAssignmentModal = () => {
    setShowTableAssignmentModal(false);
    setSelectedTeamForAssignment(null);
    setSelectedCategoryForAssignment('');
  };

  const saveTeamTableAssignment = async (tableId, tableNotes) => {
    if (!selectedTeamForAssignment || !selectedCategoryForAssignment) return;

    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_team_table_assignment',
          teamId: selectedTeamForAssignment.id,
          category: selectedCategoryForAssignment,
          preferredTableId: tableId || null,
          tableNotes: tableNotes || ''
        })
      });

      const result = await response.json();
      if (result && result.success) {
        alert('Team table assignment saved successfully');
        await fetchTeams();
        await fetchTeamTableAssignments();
        closeTableAssignmentModal();
      } else {
        const message = result && result.message ? result.message : 'Failed to save team table assignment';
        alert(message);
      }
    } catch (error) {
      console.error('Error saving team table assignment:', error);
      alert('Error saving team table assignment. Please try again.');
    }
  };

  const deleteTeamTableAssignment = async (assignmentId, teamId, category) => {
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_team_table_assignment',
          assignmentId: assignmentId || 0,
          teamId: teamId || 0,
          category: category || ''
        })
      });

      const result = await response.json();
      if (result && result.success) {
        alert('Team table assignment deleted successfully');
        await fetchTeams();
        await fetchTeamTableAssignments();
      } else {
        const message = result && result.message ? result.message : 'Failed to delete team table assignment';
        alert(message);
      }
    } catch (error) {
      console.error('Error deleting team table assignment:', error);
      alert('Error deleting team table assignment. Please try again.');
    }
  };

  // Spirit Marks Management
  const openSpiritMarksModal = (rumah) => {
    setSelectedRumahForSpirit(rumah);

    // Find existing spirit marks for this rumah
    const existingMarks = spiritMarks.find(sm => sm.rumahId === rumah.id);

    if (existingMarks) {
      // Pre-fill form with existing data
      setSpiritAssessment({
        tournamentDate: existingMarks.tournamentDate || getTodayLocalISODate(),
        assessorName: existingMarks.assessorName,
        overallScore: Number(existingMarks.totalScore ?? 0),
        overallNotes: existingMarks.overallNotes || ''
      });
    } else {
      // Create new empty form
      setSpiritAssessment({
        tournamentDate: getTodayLocalISODate(),
        assessorName: '',
        overallScore: 0,
        overallNotes: ''
      });
    }

    setShowSpiritMarksModal(true);
  };

  const saveSpiritMarks = async () => {
    if (!selectedRumahForSpirit || !spiritAssessment.assessorName.trim()) {
      alert('Please enter assessor name');
      return;
    }

    try {
      const scoreValue = Number.isFinite(Number(spiritAssessment.overallScore))
        ? Math.max(0, Math.min(1, Number(spiritAssessment.overallScore)))
        : 0;

      const payload = {
        action: 'save_spirit_marks',
        rumahId: selectedRumahForSpirit.id,
        tournamentDate: spiritAssessment.tournamentDate,
        assessorName: spiritAssessment.assessorName,
        sportsmanshipScore: scoreValue,
        teamworkScore: 0,
        seatArrangementScore: 0,
        sportsmanshipNotes: '',
        teamworkNotes: '',
        seatArrangementNotes: '',
        overallNotes: spiritAssessment.overallNotes || ''
      };

      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result && result.success) {
        alert('Spirit marks saved successfully');
        setShowSpiritMarksModal(false);
        await fetchSpiritMarks();
        await fetchHousePoints();
      } else {
        const message = result && result.message ? result.message : 'Failed to save spirit marks';
        alert(message);
      }
    } catch (error) {
      console.error('Error saving spirit marks:', error);
      alert('Error saving spirit marks. Please try again.');
    }
  };

  const runHousePointsRecalc = async ({ silent = false } = {}) => {
    try {
      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'calculate_house_points',
          tournamentDate: new Date().toISOString().split('T')[0]
        })
      });

      const result = await response.json();
      if (result && result.success) {
        if (!silent) {
          alert('House points calculated successfully');
        }
        await fetchHousePoints();
      } else {
        const message = result && result.message ? result.message : 'Failed to calculate house points';
        if (!silent) {
          alert(message);
        }
      }
    } catch (error) {
      console.error('Error calculating house points:', error);
      if (!silent) {
        alert('Error calculating house points. Please try again.');
      }
    }
  };

  const calculateHousePoints = async () => {
    await runHousePointsRecalc({ silent: false });
  };

  // Match Management
  const generateBrackets = async () => {
    // Check if all teams have pairs assigned before generating brackets
    const teamsWithoutPairs = teams.filter(team =>
      !team.mixedPair.player1 || !team.mixedPair.player2 ||
      !team.mensPair.player1 || !team.mensPair.player2
    );
    
    if (teamsWithoutPairs.length > 0) {
      alert('Please assign pairs for all teams before generating brackets. Go to Register tab to complete pair assignments.');
      return;
    }
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate_matches'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchMatches(); // Refresh matches from database
        setActiveTab('brackets');
        alert('Matches generated successfully!');
      } else {
        alert('Error generating matches: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating matches:', error);
      alert('Error generating matches. Please try again.');
    }
  };

  const handleGameScoreChange = (matchId, gameNumber, teamKey, value) => {
    if (!/^\d*$/.test(value)) {
      return;
    }
    setEditingGameScores((prevScores) => {
      const matchScores = { ...(prevScores[matchId] || {}) };
      const gameScores = { team1: '', team2: '', ...(matchScores[gameNumber] || {}) };
      gameScores[teamKey] = value;

      return {
        ...prevScores,
        [matchId]: {
          ...matchScores,
          [gameNumber]: gameScores,
        },
      };
    });
  };

  const updateMatchGameScore = async (matchId, gameNumber, team1ScoreInput, team2ScoreInput) => {
    const parsedTeam1 = team1ScoreInput === '' ? NaN : parseInt(team1ScoreInput, 10);
    const parsedTeam2 = team2ScoreInput === '' ? NaN : parseInt(team2ScoreInput, 10);

    if (Number.isNaN(parsedTeam1) || Number.isNaN(parsedTeam2)) {
      alert('Sila masukkan markah untuk kedua-dua pasukan sebelum simpan.');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_match_score',
          matchId,
          gameNumber,
          team1Score: parsedTeam1,
          team2Score: parsedTeam2,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      if (result.success) {
        await fetchMatches();
        if (result.matchComplete || result.gameComplete) {
          await runHousePointsRecalc({ silent: true });
        }
        alert(result.message || `Skor Game ${gameNumber} berjaya dikemaskini.`);
      } else {
        alert('Error updating game score: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating game score:', error);
      alert('Error updating game score. Please try again.');
    }
  };

  const startMatch = async (matchId) => {
    if (!window.confirm('Start this match? This will mark it as "playing" and show it in the public display as ongoing.')) {
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_match',
          matchId: matchId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Raw start match API response:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error in start match:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      if (result.success) {
        await fetchMatches();
        alert('Match started successfully!');
      } else {
        alert('Error starting match: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error starting match:', error);
      alert('Error starting match. Please try again.');
    }
  };

  const finalizeMatch = async (matchId) => {
    if (!window.confirm('Are you sure you want to mark this match as completed? This will show the winner in the Live Results.')) {
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'finalize_match',
          matchId: matchId
        })
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Raw finalize API response:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error in finalize:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      if (result.success) {
        await fetchMatches(); // Refresh matches from database
        await runHousePointsRecalc({ silent: true });
        alert('Match marked as completed successfully!');
      } else {
        alert('Error finalizing match: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error finalizing match:', error);
      alert('Error finalizing match. Please try again.');
    }
  };

  const renderMatchCard = (match) => {
    if (!match) {
      return null;
    }

    const rumah1 = rumahSukan.find(r => r.id === match.team1?.rumahSukanId);
    const rumah2 = rumahSukan.find(r => r.id === match.team2?.rumahSukanId);
    const rumah1Name = rumah1?.name || match.team1?.rumahName || 'Team 1';
    const rumah2Name = rumah2?.name || match.team2?.rumahName || 'Team 2';
    const rumah1Color = rumah1?.color || 'bg-gray-400';
    const rumah2Color = rumah2?.color || 'bg-gray-400';
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
    const matchScores = editingGameScores[match.id] || {};
    const normalizedScore1 = Number.isFinite(Number(match.score1)) ? Number(match.score1) : 0;
    const normalizedScore2 = Number.isFinite(Number(match.score2)) ? Number(match.score2) : 0;
    const hasGameWins = normalizedScore1 > 0 || normalizedScore2 > 0;
    const matchCompleted = match.status === 'completed';

    const containerStateClass =
      match.status === 'completed'
        ? 'bg-green-50 border-green-200'
        : match.status === 'playing'
        ? 'bg-blue-50 border-blue-200'
        : (match.score1 > 0 || match.score2 > 0)
        ? 'bg-orange-50 border-orange-200'
        : 'bg-gray-50 border-gray-200';

    return (
      <div key={match.id} className={`p-4 rounded-lg border-2 ${containerStateClass}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-600">Match #{match.matchNumber}</span>
          <div className="flex items-center gap-2">
            {tableDisplay && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                {tableDisplay}
              </span>
            )}
            {match.status === 'completed' && (
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">Selesai</span>
            )}
            {match.status === 'playing' && (
              <>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full animate-pulse">Playing</span>
                <button
                  onClick={() => finalizeMatch(match.id)}
                  className="text-xs bg-orange-600 text-white px-3 py-1 rounded-full hover:bg-orange-700 transition-colors"
                >
                  Selesai
                </button>
              </>
            )}
            {match.status === 'pending' && (
              <>
                {(match.score1 > 0 || match.score2 > 0) ? (
                  <button
                    onClick={() => startMatch(match.id)}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Playing
                  </button>
                ) : (
                  <button
                    onClick={() => startMatch(match.id)}
                    className="text-xs bg-gray-600 text-white px-3 py-1 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    Start
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`${rumah1Color} text-white px-2 py-1 rounded text-xs font-medium`}>
                {rumah1Name}
              </span>
            </div>
            <p className="text-sm font-medium">
              {(match.pair1?.player1 || '-')}{' '}
              &amp; {(match.pair1?.player2 || '-')}
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            {hasGameWins ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-800">{normalizedScore1}</span>
                  <span className="text-2xl font-bold text-gray-400">:</span>
                  <span className="text-3xl font-bold text-gray-800">{normalizedScore2}</span>
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Games Won</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs uppercase tracking-wide text-gray-500">Games Won</span>
                <span className="text-sm font-semibold text-gray-500">Belum ada game dimenangi</span>
              </div>
            )}
            {matchCompleted ? (
              <span className="text-xs font-semibold text-green-600">Match Complete</span>
            ) : (
              <span className="text-xs font-semibold text-blue-600">
                {activeGameNumber ? `Game Semasa: Game ${activeGameNumber}` : 'Menunggu Game 1 bermula'}
              </span>
            )}
            <p className="text-[11px] text-gray-500">Best of 5 · First to 11 · Win by 2</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className={`${rumah2Color} text-white px-2 py-1 rounded text-xs font-medium`}>
                {rumah2Name}
              </span>
            </div>
            <p className="text-sm font-medium">
              {(match.pair2?.player1 || '-')}{' '}
              &amp; {(match.pair2?.player2 || '-')}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {matchGames.length === 0 ? (
            <p className="text-sm text-gray-500">Tiada rekod game lagi.</p>
          ) : (
            matchGames.map((game) => {
              const editingScoresForGame = matchScores[game.gameNumber] || { team1: '', team2: '' };
              const team1Value = editingScoresForGame.team1 ?? '';
              const team2Value = editingScoresForGame.team2 ?? '';
              const numericTeam1 = team1Value === '' ? NaN : parseInt(team1Value, 10);
              const numericTeam2 = team2Value === '' ? NaN : parseInt(team2Value, 10);
              const recordedTeam1 = game.team1Score ?? 0;
              const recordedTeam2 = game.team2Score ?? 0;
              const hasRecordedScores = (recordedTeam1 !== 0) || (recordedTeam2 !== 0);
              const scoreDiff = Math.abs(recordedTeam1 - recordedTeam2);
              const maxScore = Math.max(recordedTeam1, recordedTeam2);
              const meetsWinCondition = maxScore >= 11 && scoreDiff >= 2;
              const needsTwoPointFinish = maxScore >= 10 && scoreDiff < 2 && hasRecordedScores;
              const valuesUnchanged = hasRecordedScores &&
                !Number.isNaN(numericTeam1) &&
                !Number.isNaN(numericTeam2) &&
                numericTeam1 === recordedTeam1 &&
                numericTeam2 === recordedTeam2;
              const isCompleted = game.completed || meetsWinCondition;
              const isActive = !isCompleted && activeGameNumber === game.gameNumber;
              const disableInputs = matchCompleted;
              const disableSave = disableInputs || team1Value === '' || team2Value === '' || valuesUnchanged;
              const rowHighlight = isCompleted
                ? 'border-green-200 bg-green-50'
                : isActive
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-white';
              const winnerName = isCompleted
                ? (game.team1Score > game.team2Score ? rumah1Name : rumah2Name)
                : null;
              const instructionText = needsTwoPointFinish
                ? 'Perlu beza 2 mata untuk tamatkan game'
                : 'Sasaran 11 mata, menang beza 2 selepas deuce';

              return (
                <div
                  key={`${match.id}-game-${game.gameNumber}`}
                  className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border rounded-lg ${rowHighlight}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">Game {game.gameNumber}</span>
                    {isCompleted && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Selesai</span>
                    )}
                    {!isCompleted && isActive && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Aktif</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={team1Value}
                      disabled={disableInputs}
                      onChange={(e) => handleGameScoreChange(match.id, game.gameNumber, 'team1', e.target.value)}
                      className={`w-16 text-center px-2 py-2 border border-gray-300 rounded-lg text-base font-semibold focus:ring-2 focus:ring-blue-500 ${
                        disableInputs ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                      }`}
                    />
                    <span className="font-semibold text-gray-500">:</span>
                    <input
                      type="number"
                      min="0"
                      value={team2Value}
                      disabled={disableInputs}
                      onChange={(e) => handleGameScoreChange(match.id, game.gameNumber, 'team2', e.target.value)}
                      className={`w-16 text-center px-2 py-2 border border-gray-300 rounded-lg text-base font-semibold focus:ring-2 focus:ring-blue-500 ${
                        disableInputs ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => updateMatchGameScore(match.id, game.gameNumber, team1Value, team2Value)}
                      disabled={disableSave}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        disableSave
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Simpan
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 md:text-right">
                    {isCompleted
                      ? `Pemenang: ${winnerName}`
                      : instructionText}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const getUpcomingMatches = () => {
    return matches
      .filter(m => m.status === 'pending')
      .sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0))
      .slice(0, 5);
  };

  const getNextOpponents = (rumahId) => {
    const upcoming = matches.filter(m =>
      m.status === 'pending' &&
      (m.team1.rumahSukanId === rumahId || m.team2.rumahSukanId === rumahId)
    );
    return upcoming.map(m => {
      const opponent = m.team1.rumahSukanId === rumahId ? m.team2 : m.team1;
      return {
        category: m.category,
        opponent: rumahSukan.find(r => r.id === opponent.rumahSukanId)
      };
    });
  };

  // Statistics and Calculations
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
        if (!houseId) {
          return null;
        }

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
        if (!match || match.status !== 'completed') {
          return;
        }

        const team1HouseId = match.team1?.rumahSukanId;
        const team2HouseId = match.team2?.rumahSukanId;

        if (!team1HouseId || !team2HouseId) {
          return;
        }

        const house1 = ensureHouse(team1HouseId);
        const house2 = ensureHouse(team2HouseId);

        if (!house1 || !house2) {
          return;
        }

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

        const headKey12 = house2.id;
        const headKey21 = house1.id;

        if (!house1.headToHead[headKey12]) {
          house1.headToHead[headKey12] = { wins: 0, losses: 0, gamesFor: 0, gamesAgainst: 0, pointsFor: 0, pointsAgainst: 0, matches: 0 };
        }
        if (!house2.headToHead[headKey21]) {
          house2.headToHead[headKey21] = { wins: 0, losses: 0, gamesFor: 0, gamesAgainst: 0, pointsFor: 0, pointsAgainst: 0, matches: 0 };
        }

        const head12 = house1.headToHead[headKey12];
        const head21 = house2.headToHead[headKey21];

        head12.matches += 1;
        head21.matches += 1;
        head12.gamesFor += score1;
        head12.gamesAgainst += score2;
        head21.gamesFor += score2;
        head21.gamesAgainst += score1;
        head12.pointsFor += points1;
        head12.pointsAgainst += points2;
        head21.pointsFor += points2;
        head21.pointsAgainst += points1;

        if (score1 > score2) {
          house1.wins += 1;
          house1.leaguePoints += 1;
          house1.matchWinPoints += 1;
          house2.losses += 1;
          head12.wins += 1;
          head21.losses += 1;
        } else if (score2 > score1) {
          house2.wins += 1;
          house2.leaguePoints += 1;
          house2.matchWinPoints += 1;
          house1.losses += 1;
          head21.wins += 1;
          head12.losses += 1;
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

    const resolveStandings = (statsMap) => {
      const entries = Array.from(statsMap.values());

      if (entries.length <= 1) {
        return entries;
      }

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

      sortedPointLevels.forEach((pointsValue) => {
        const group = groupsByPoints.get(pointsValue) || [];
        if (group.length <= 1) {
          resolved.push(...group);
          return;
        }

        const headPoints = new Map();
        group.forEach((entry) => {
          let total = 0;
          group.forEach((opponent) => {
            if (entry.id === opponent.id) {
              return;
            }
            const record = entry.headToHead?.[opponent.id];
            total += record?.wins ?? 0;
          });
          headPoints.set(entry.id, total);
        });

        const sortedGroup = [...group].sort((a, b) => {
          const headDiff = (headPoints.get(b.id) ?? 0) - (headPoints.get(a.id) ?? 0);
          if (headDiff !== 0) return headDiff;

          const gamesDiff = (b.gamesDifference ?? 0) - (a.gamesDifference ?? 0);
          if (gamesDiff !== 0) return gamesDiff;

          const pointsDiff = (b.pointsDifference ?? 0) - (a.pointsDifference ?? 0);
          if (pointsDiff !== 0) return pointsDiff;

          return (a.name || '').localeCompare(b.name || '');
        });

        resolved.push(...sortedGroup);
      });

      return resolved;
    };

    const completedMatches = matches.filter(match => match && match.status === 'completed');
    const overallStatsMap = buildStatsFromMatches(completedMatches);

    // Ensure every Rumah Sukan represented even if no matches yet
    rumahSukan.forEach((house) => {
      if (house?.id && !overallStatsMap.has(house.id)) {
        overallStatsMap.set(house.id, {
          id: house.id,
          name: house.name,
          color: house.color,
          colorHex: house.colorHex,
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
    });

    const standings = resolveStandings(overallStatsMap);

    const categoryStandings = {};
    ['Mixed Doubles', "Men's Doubles"].forEach((category) => {
      const categoryMatches = completedMatches.filter(match => match.category === category);
      const categoryStats = buildStatsFromMatches(categoryMatches);
      categoryStandings[category] = resolveStandings(categoryStats);
    });

    const categoryTitlesCount = new Map();
    Object.values(categoryStandings).forEach((list) => {
      if (Array.isArray(list) && list.length > 0) {
        const top = list[0];
        if (top?.id) {
          categoryTitlesCount.set(top.id, (categoryTitlesCount.get(top.id) || 0) + 1);
        }
      }
    });

    const placementPoints = new Map();
    standings.forEach((entry, index) => {
      if (!entry?.id) return;
      if (index === 0) placementPoints.set(entry.id, 3);
      else if (index === 1) placementPoints.set(entry.id, 2);
      else if (index === 2) placementPoints.set(entry.id, 1);
      else placementPoints.set(entry.id, 0);
    });

    const participationPoints = new Map();
    teams.forEach((team) => {
      if (!team?.rumahSukanId) return;
      const hasMixed = Boolean(team.mixedPair?.player1 && team.mixedPair?.player2);
      const hasMens = Boolean(team.mensPair?.player1 && team.mensPair?.player2);
      if (hasMixed && hasMens) {
        participationPoints.set(team.rumahSukanId, 1);
      }
    });

    const allHouseIds = new Set();
    rumahSukan.forEach((house) => {
      if (house?.id) {
        allHouseIds.add(house.id);
      }
    });
    teams.forEach((team) => {
      if (team?.rumahSukanId) {
        allHouseIds.add(team.rumahSukanId);
      }
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

      const placement = placementPoints.get(houseId) ?? 0;
      const participation = participationPoints.get(houseId) ?? 0;
      const matchWins = stat.matchWinPoints ?? stat.wins ?? 0;

      // Get spirit points from housePoints state
      const spiritHouse = housePoints.find(hp => hp.rumahId === houseId);
      const sportsmanship = spiritHouse ? Number(spiritHouse.spiritPoints ?? 0) : 0;

      const categoryWins = categoryTitlesCount.get(houseId) ?? 0;
      const totalPoints = placement + participation + matchWins + sportsmanship;

      return {
        houseId,
        name: stat.name,
        color: stat.color,
        colorHex: stat.colorHex,
        placementPoints: placement,
        participationPoints: participation,
        matchWinPoints: matchWins,
        spiritPoints: sportsmanship,
        categoryWins,
        totalPoints,
        leaguePoints: stat.leaguePoints ?? 0,
        gamesDifference: stat.gamesDifference ?? 0,
        headToHead: stat.headToHead ?? {},
      };
    });

    const sortedHousePoints = [...housePointsBase].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if ((b.categoryWins ?? 0) !== (a.categoryWins ?? 0)) return (b.categoryWins ?? 0) - (a.categoryWins ?? 0);

      const statA = overallStatsMap.get(a.houseId);
      const statB = overallStatsMap.get(b.houseId);

      const headA = statA?.headToHead?.[statB?.id]?.wins ?? 0;
      const headB = statB?.headToHead?.[statA?.id]?.wins ?? 0;
      if (headA !== headB) return headB - headA;

      const gamesDiffA = statA?.gamesDifference ?? 0;
      const gamesDiffB = statB?.gamesDifference ?? 0;
      if (gamesDiffB !== gamesDiffA) return gamesDiffB - gamesDiffA;

      return (a.name || '').localeCompare(b.name || '');
    });

    return {
      standings,
      overallStatsMap,
      categoryStandings,
      housePoints: sortedHousePoints,
      rawHousePoints: housePointsBase,
      categoryTitlesCount,
    };
  }, [matches, rumahSukan, teams, housePoints]); // Added housePoints to dependency array

  const standings = standingsSummary?.standings ?? [];
  const overallStatsMap = standingsSummary?.overallStatsMap ?? new Map();
  const housePointsTable = standingsSummary?.housePoints ?? [];
  const categoryStandings = standingsSummary?.categoryStandings ?? {};
  const categoryTitlesCount = standingsSummary?.categoryTitlesCount ?? new Map();

  const housePointsById = useMemo(() => {
    const map = new Map();
    housePointsTable.forEach((entry) => {
      if (entry && entry.houseId != null) {
        map.set(Number(entry.houseId), entry);
      }
    });
    return map;
  }, [housePointsTable]);

  const pdfDocument = useMemo(() => (
    <TournamentReport
      rumahSukan={rumahSukan}
      teams={teams}
      matches={matches}
      standings={standings}
      housePoints={housePointsTable}
      categoryStandings={categoryStandings}
    />
  ), [rumahSukan, teams, matches, standings, housePoints, categoryStandings]);

  // Report Generation
  const generateReport = () => {
    const completedMatches = matches.filter(m => m.status === 'completed');
    const pendingMatches = matches.filter(m => m.status === 'pending');

    let report = '='.repeat(80) + '\n';
    report += 'KRKL LFSATHLON 2025 - OFFICIAL REPORT\n';
    report += '='.repeat(80) + '\n\n';
    report += 'Date: 1 November 2025\n';
    report += 'Venue: Labuan FSA, 17th Floor, Main Office Tower Financial Park Complex\n';
    report += 'Time: 9:00 AM - 1:30 PM\n\n';

    report += '-'.repeat(80) + '\n';
    report += 'TOURNAMENT OVERVIEW\n';
    report += '-'.repeat(80) + '\n';
    report += `Total Teams Registered: ${teams.length}\n`;
    report += `Total Matches: ${matches.length}\n`;
    report += `Completed Matches: ${completedMatches.length}\n`;
    report += `Pending Matches: ${pendingMatches.length}\n`;
    const progress = matches.length > 0 ? Math.round((completedMatches.length / matches.length) * 100) : 0;
    report += `Tournament Progress: ${progress}%\n\n`;

    report += '-'.repeat(80) + '\n';
    report += 'LEAGUE STANDINGS (Win = 1 point, Loss = 0 points)\n';
    report += 'Tie-Break: Head-to-head > Games diff > Points diff > Playoff\n';
    report += '-'.repeat(80) + '\n';
    report += ' Pos | Rumah Sukan        | W | L | Spirit | Total Pts\n';
    report += '-'.repeat(80) + '\n';
    standings.forEach((s, i) => {
      const houseSummary = housePointsById.get(Number(s.id)) || housePointsById.get(s.id);
      const spiritPoints = houseSummary?.spiritPoints ?? 0;
      const totalPoints = houseSummary?.totalPoints ?? (s.leaguePoints ?? s.points ?? 0);
      const spiritDisplay = formatScore(spiritPoints);
      const totalDisplay = formatScore(totalPoints);
      report += `${String(i + 1).padStart(4)} | ${s.name.padEnd(18)} | ${String(s.wins ?? 0).padStart(1)} | ${String(s.losses ?? 0).padStart(1)} | `;
      report += `${spiritDisplay.padStart(6)} | ${totalDisplay.padStart(9)}\n`;
    });
    report += '\n';

    report += '-'.repeat(80) + '\n';
    report += 'HOUSE POINTS SUMMARY (Section 10)\n';
    report += '-'.repeat(80) + '\n';
    report += ' Rumah Sukan        | Place | Participation | Match Wins | Spirit | Cat Wins | Total\n';
    report += '-'.repeat(80) + '\n';
    housePointsTable.forEach((house) => {
      report += `${house.name.padEnd(18)} | ${String(house.placementPoints).padStart(5)} | `;
      report += `${String(house.participationPoints).padStart(12)} | ${String(house.matchWinPoints).padStart(10)} | `;
      report += `${String(house.sportsmanshipPoints).padStart(6)} | ${String(house.categoryWins).padStart(8)} | `;
      report += `${String(house.totalPoints).padStart(5)}\n`;
    });
    report += '\n';

    report += '-'.repeat(80) + '\n';
    report += 'REGISTERED TEAMS & PLAYERS\n';
    report += '-'.repeat(80) + '\n';
    teams.forEach(team => {
      const rumah = rumahSukan.find(r => r.id === team.rumahSukanId);
      report += `\n${rumah?.name || 'Unknown'}\n`;
      report += `  Players:\n`;
      team.players.forEach(p => {
        report += `    - ${p.name} (${p.gender})\n`;
      });
      report += `  Mixed Doubles: ${team.mixedPair.player1} & ${team.mixedPair.player2}\n`;
      report += `  Men's Doubles: ${team.mensPair.player1} & ${team.mensPair.player2}\n`;
    });
    report += '\n';

    report += '-'.repeat(80) + '\n';
    report += 'MATCH RESULTS\n';
    report += '-'.repeat(80) + '\n';
    completedMatches.forEach(match => {
      const rumah1 = rumahSukan.find(r => r.id === match.team1.rumahSukanId);
      const rumah2 = rumahSukan.find(r => r.id === match.team2.rumahSukanId);
      report += `\nMatch #${match.matchNumber} - ${match.category}\n`;
      report += `  ${rumah1?.name}: ${match.pair1.player1} & ${match.pair1.player2}\n`;
      report += `  ${rumah2?.name}: ${match.pair2.player1} & ${match.pair2.player2}\n`;
      report += `  Score: ${match.score1} - ${match.score2}\n`;
      const winner = match.score1 > match.score2 ? rumah1?.name : match.score2 > match.score1 ? rumah2?.name : 'Draw';
      report += `  Winner: ${winner}\n`;
    });
    report += '\n';

    if (pendingMatches.length > 0) {
      report += '-'.repeat(80) + '\n';
      report += 'UPCOMING MATCHES\n';
      report += '-'.repeat(80) + '\n';
      pendingMatches.forEach(match => {
        const rumah1 = rumahSukan.find(r => r.id === match.team1.rumahSukanId);
        const rumah2 = rumahSukan.find(r => r.id === match.team2.rumahSukanId);
        report += `\nMatch #${match.matchNumber} - ${match.category}\n`;
        report += `  ${rumah1?.name} vs ${rumah2?.name}\n`;
        report += `  ${match.pair1.player1} & ${match.pair1.player2} vs ${match.pair2.player1} & ${match.pair2.player2}\n`;
      });
      report += '\n';
    }

    report += '='.repeat(80) + '\n';
    report += 'END OF REPORT\n';
    report += '='.repeat(80) + '\n';

    // Download report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KRKL_Tournament_Report_2025.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Match Graph Visualization
  const MatchGraph = () => {
    const graphData = standings.map(s => ({
      ...s,
      opponents: []
    }));

    matches.forEach(match => {
      const rumah1 = graphData.find(g => g.id === match.team1.rumahSukanId);
      const rumah2 = graphData.find(g => g.id === match.team2.rumahSukanId);
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
                  {standings.map(s => (
                    <th key={s.id} className="p-2 text-center">
                      <div className={`${s.color} w-3 h-3 rounded-full mx-auto mb-1`}></div>
                      <div className="text-xs">{s.name.split(' ')[1]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map(s1 => (
                  <tr key={s1.id}>
                    <td className="p-2 font-medium">
                      <div className="flex items-center gap-2">
                        <div className={`${s1.color} w-3 h-3 rounded-full`}></div>
                        {s1.name.split(' ')[1]}
                      </div>
                    </td>
                    {standings.map(s2 => {
                      if (s1.id === s2.id) {
                        return <td key={s2.id} className="p-2 text-center bg-gray-100">-</td>;
                      }
                      const match = matches.find(m =>
                        (m.team1.rumahSukanId === s1.id && m.team2.rumahSukanId === s2.id) ||
                        (m.team1.rumahSukanId === s2.id && m.team2.rumahSukanId === s1.id)
                      );
                      if (!match || match.status === 'pending') {
                        return <td key={s2.id} className="p-2 text-center text-gray-400">-</td>;
                      }
                      const isTeam1 = match.team1.rumahSukanId === s1.id;
                      const score = isTeam1 ? `${match.score1}-${match.score2}` : `${match.score2}-${match.score1}`;
                      const won = isTeam1 ? match.score1 > match.score2 : match.score2 > match.score1;
                      return (
                        <td key={s2.id} className={`p-2 text-center font-medium ${won ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="w-8 h-8" />
                KRKL LFSATHLON 2025
              </h1>
              <p className="text-blue-100 mt-1">Tournament Management System</p>
            </div>
            <div className="text-right">
              {/* Public Display Link */}
              <Link
                to="/public"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mb-3"
              >
                <Eye className="w-4 h-4" />
                Public Display
                <ExternalLink className="w-3 h-3" />
              </Link>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                <span>1 November 2025</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Clock className="w-4 h-4" />
                <span>9:00 AM - 1:30 PM</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                <span>Labuan FSA, 17th Floor</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {['home', 'rumah', 'register', 'brackets', 'live', 'standings', 'house-points', 'graph'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'rumah' ? 'Senarai Rumah' : tab === 'house-points' ? 'House Points' : tab === 'graph' ? 'Match Graph' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Tournament Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-blue-600">Purpose</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Foster healthy competition and sportsmanship</li>
                    <li>Promote teamwork, discipline, and perseverance</li>
                    <li>Strengthen camaraderie and Rumah Sukan spirit</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-3 text-blue-600">Eligibility</h3>
                  <p className="text-gray-700 mb-2">Each Rumah Sukan must field 2 pairs:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Mixed Doubles (M+F or F+F)</li>
                    <li>Men's Doubles (M+M)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-sm mb-2 text-gray-600">Rumah Sukan</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">{rumahSukan.length}</div>
                <p className="text-xs text-gray-600">registered houses</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-sm mb-2 text-gray-600">Teams</h3>
                <div className="text-4xl font-bold text-green-600 mb-2">{teams.length}</div>
                <p className="text-xs text-gray-600">teams registered</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-sm mb-2 text-gray-600">Matches</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">{matches.length}</div>
                <p className="text-xs text-gray-600">total matches</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-sm mb-2 text-gray-600">Progress</h3>
                <div className="text-4xl font-bold text-orange-600 mb-2">
                  {matches.length > 0 ? Math.round((matches.filter(m => m.status === 'completed').length / matches.length) * 100) : 0}%
                </div>
                <p className="text-xs text-gray-600">completed</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg shadow-lg p-8 text-white">
              <h3 className="font-semibold text-2xl mb-3 flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Prizes & Ranking
              </h3>
              <p className="text-lg">Awards for 1st, 2nd, and 3rd place based on overall tournament ranking</p>
              <p className="text-sm mt-2 opacity-90">Points System: Win = 3 points | Draw = 1 point | Loss = 0 points</p>
            </div>
          </div>
        )}

        {activeTab === 'rumah' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Senarai Rumah Sukan</h2>

              <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-semibold text-lg mb-4 text-blue-800">
                  {editingRumah ? 'Edit Rumah Sukan' : 'Tambah Rumah Sukan Baru'}
                </h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Rumah Sukan</label>
                    <input
                      type="text"
                      value={newRumah.name}
                      onChange={(e) => setNewRumah({ ...newRumah, name: e.target.value })}
                      placeholder="e.g. Rumah Merah"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warna</label>
                    <select
                      value={newRumah.color}
                      onChange={(e) => {
                        const colorMap = {
                          'bg-red-500': '#ef4444',
                          'bg-blue-500': '#3b82f6',
                          'bg-green-500': '#22c55e',
                          'bg-yellow-500': '#eab308',
                          'bg-purple-500': '#a855f7',
                          'bg-pink-500': '#ec4899',
                          'bg-indigo-500': '#6366f1',
                          'bg-orange-500': '#f97316',
                        };
                        setNewRumah({ ...newRumah, color: e.target.value, colorHex: colorMap[e.target.value] });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bg-red-500">🔴 Red</option>
                      <option value="bg-blue-500">🔵 Blue</option>
                      <option value="bg-green-500">🟢 Green</option>
                      <option value="bg-yellow-500">🟡 Yellow</option>
                      <option value="bg-purple-500">🟣 Purple</option>
                      <option value="bg-pink-500">🩷 Pink</option>
                      <option value="bg-indigo-500">🔵 Indigo</option>
                      <option value="bg-orange-500">🟠 Orange</option>
                    </select>
                  </div>
                  <button
                    onClick={addRumah}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingRumah ? 'Update' : 'Tambah'}
                  </button>
                  {editingRumah && (
                    <button
                      onClick={() => {
                        setEditingRumah(null);
                        setNewRumah({ name: '', color: 'bg-purple-500', colorHex: '#a855f7' });
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rumahSukan.map(rumah => {
                  const teamCount = teams.filter(t => t.rumahSukanId === rumah.id).length;
                  const nextOpponents = getNextOpponents(rumah.id);
                  return (
                    <div key={rumah.id} className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-md p-6 border-2 hover:shadow-lg transition-shadow" style={{ borderColor: rumah.colorHex }}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`${rumah.color} w-6 h-6 rounded-full`}></div>
                          <h3 className="font-bold text-lg">{rumah.name}</h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editRumah(rumah)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteRumah(rumah.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-gray-600" />
                          <span className="font-medium">{teamCount}</span>
                          <span className="text-gray-600">team{teamCount !== 1 ? 's' : ''} registered</span>
                        </div>
                        {nextOpponents.length > 0 && (
                          <div className="pt-3 border-t">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Akan bertemu:</p>
                            <div className="space-y-1">
                              {nextOpponents.slice(0, 3).map((opp, idx) => (
                                <div key={idx} className="text-xs flex items-center gap-2">
                                  <div className={`${opp.opponent?.color} w-2 h-2 rounded-full`}></div>
                                  <span className="text-gray-600">{opp.opponent?.name}</span>
                                  <span className="text-gray-400">({opp.category})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              {editingTeam ? 'Edit Team' : 'Daftar Team Baru'}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Rumah Sukan *
                </label>
                <select
                  value={newTeam.rumahSukanId}
                  onChange={(e) => setNewTeam({ ...newTeam, rumahSukanId: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Pilih Rumah Sukan --</option>
                  {rumahSukan.map(rumah => (
                    <option key={rumah.id} value={rumah.id}>{rumah.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Pemain (Min: 2, Max: 6) *
                  </label>
                  <button
                    onClick={() => addPlayer(newTeam, setNewTeam)}
                    disabled={newTeam.players.length >= 6}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Pemain
                  </button>
                </div>

                <div className="space-y-3">
                  {newTeam.players.map((player, index) => (
                    <div key={index} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg">
                      <input
                        type="text"
                        placeholder="Nama pemain"
                        value={player.name}
                        onChange={(e) => updatePlayer(index, 'name', e.target.value, newTeam, setNewTeam)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={player.gender}
                        onChange={(e) => updatePlayer(index, 'gender', e.target.value, newTeam, setNewTeam)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="M">Lelaki</option>
                        <option value="F">Perempuan</option>
                      </select>
                      <button
                        onClick={() => removePlayer(index, newTeam, setNewTeam)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  💡 Pemain lelaki yang join Men's Doubles boleh juga didaftarkan di Mixed Doubles
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <label className="block text-sm font-medium text-purple-800 mb-3">
                    Mixed Doubles Pair *
                  </label>
                  <select
                    value={newTeam.mixedPair.player1}
                    onChange={(e) => setNewTeam({ ...newTeam, mixedPair: { ...newTeam.mixedPair, player1: e.target.value } })}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg mb-2 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Pilih Pemain 1 --</option>
                    {newTeam.players.map((p, i) => (
                      <option key={i} value={p.name}>{p.name} ({p.gender})</option>
                    ))}
                  </select>
                  <select
                    value={newTeam.mixedPair.player2}
                    onChange={(e) => setNewTeam({ ...newTeam, mixedPair: { ...newTeam.mixedPair, player2: e.target.value } })}
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Pilih Pemain 2 --</option>
                    {newTeam.players.map((p, i) => (
                      <option key={i} value={p.name}>{p.name} ({p.gender})</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium text-blue-800 mb-3">
                    Men's Doubles Pair *
                  </label>
                  <select
                    value={newTeam.mensPair.player1}
                    onChange={(e) => setNewTeam({ ...newTeam, mensPair: { ...newTeam.mensPair, player1: e.target.value } })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Pemain 1 --</option>
                    {newTeam.players.map((p, i) => (
                      <option key={i} value={p.name}>{p.name} ({p.gender})</option>
                    ))}
                  </select>
                  <select
                    value={newTeam.mensPair.player2}
                    onChange={(e) => setNewTeam({ ...newTeam, mensPair: { ...newTeam.mensPair, player2: e.target.value } })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Pemain 2 --</option>
                    {newTeam.players.map((p, i) => (
                      <option key={i} value={p.name}>{p.name} ({p.gender})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveTeam}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Save className="w-4 h-4" />
                  {editingTeam ? 'Update Team' : 'Simpan Team'}
                </button>
                {editingTeam && (
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setNewTeam({
                        rumahSukanId: '',
                        players: [],
                        mixedPair: { player1: '', player2: '' },
                        mensPair: { player1: '', player2: '' },
                      });
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  >
                    <X className="w-4 h-4" />
                    Batal
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Teams Berdaftar</h3>
              <div className="space-y-3">
                {teams.map(team => {
                  const rumah = rumahSukan.find(r => r.id === team.rumahSukanId);
                  return (
                    <div key={team.id} className="bg-gray-50 p-4 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`${rumah?.color} text-white px-4 py-1 rounded-full text-sm font-medium`}>
                              {rumah?.name}
                            </span>
                            <span className="text-gray-600 text-sm">
                              {team.players.length} pemain
                            </span>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4 mt-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Senarai Pemain:</p>
                              <div className="text-sm space-y-1">
                                {team.players.map((p, i) => (
                                  <div key={i} className="text-gray-700">• {p.name} ({p.gender})</div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-purple-700 mb-1">Mixed Doubles:</p>
                              <p className="text-sm text-gray-700">
                                {team.mixedPair.player1} & {team.mixedPair.player2}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-blue-700 mb-1">Men's Doubles:</p>
                              <p className="text-sm text-gray-700">
                                {team.mensPair.player1} & {team.mensPair.player2}
                              </p>
                            </div>
                          </div>

                          {/* Table Assignment Section */}
                          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-2">Table Assignment:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                                <span className="text-xs text-purple-700">Mixed:</span>
                                {team.tableAssignments?.mixedDoubles?.tableName ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium text-purple-800">
                                      {team.tableAssignments.mixedDoubles.tableName}
                                    </span>
                                    <button
                                      onClick={() => openTableAssignmentModal(team, 'Mixed Doubles')}
                                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                                      title="Change table"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openTableAssignmentModal(team, 'Mixed Doubles')}
                                    className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                                    title="Assign table"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                <span className="text-xs text-blue-700">Men's:</span>
                                {team.tableAssignments?.mensDoubles?.tableName ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-medium text-blue-800">
                                      {team.tableAssignments.mensDoubles.tableName}
                                    </span>
                                    <button
                                      onClick={() => openTableAssignmentModal(team, 'Men\'s Doubles')}
                                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                      title="Change table"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openTableAssignmentModal(team, 'Men\'s Doubles')}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Assign table"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editTeam(team)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTeam(team.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'brackets' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Jadual Perlawanan</h2>
                <button
                  onClick={generateBrackets}
                  disabled={teams.length < 2}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  Jana Jadual
                </button>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Tiada jadual lagi. Daftar team dan klik "Jana Jadual".</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Mixed Doubles */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-purple-600">Mixed Doubles</h3>
                    <div className="space-y-3">
                      {matches
                        .filter(m => m.category === 'Mixed Doubles')
                        .map(match => renderMatchCard(match))}
                    </div>
                  </div>

                  {/* Men's Doubles */}
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-blue-600">Men's Doubles</h3>
                    <div className="space-y-3">
                      {matches
                        .filter(m => m.category === "Men's Doubles")
                        .map(match => renderMatchCard(match))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <Eye className="w-7 h-7 text-red-600" />
                Live Results & Upcoming Matches
              </h2>

              {/* Latest Results */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-green-600">Keputusan Terkini</h3>
                {liveResults.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Tiada keputusan lagi</p>
                ) : (
                  <div className="space-y-3">
                    {liveResults.map(match => {
                      const rumah1 = rumahSukan.find(r => r.id === match.team1.rumahSukanId);
                      const rumah2 = rumahSukan.find(r => r.id === match.team2.rumahSukanId);
                      const winner = (match.status === 'completed' && match.score1 > match.score2) ? rumah1 : (match.status === 'completed' && match.score2 > match.score1) ? rumah2 : null;
                      return (
                        <div key={match.id} className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-green-700">Match #{match.matchNumber} - {match.category}</span>
                            <div className="flex items-center gap-2">
                              {getTableDisplayName(match) && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                                  {getTableDisplayName(match)}
                                </span>
                              )}
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">SELESAI</span>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4 items-center">
                            <div className={`${winner?.id === rumah1?.id ? 'font-bold' : ''}`}>
                              <span className={`${rumah1?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                                {rumah1?.name}
                              </span>
                              <p className="text-sm mt-1">
                                {match.pair1?.player1 && match.pair1?.player2
                                  ? `${match.pair1.player1} & ${match.pair1.player2}`
                                  : 'Players'}
                              </p>
                            </div>
                            <div className="flex items-center justify-center gap-3">
                              <span className={`text-3xl font-bold ${winner?.id === rumah1?.id ? 'text-green-600' : 'text-gray-500'}`}>
                                {match.score1}
                              </span>
                              <span className="text-2xl font-bold text-gray-400">-</span>
                              <span className={`text-3xl font-bold ${winner?.id === rumah2?.id ? 'text-green-600' : 'text-gray-500'}`}>
                                {match.score2}
                              </span>
                            </div>
                            <div className={`text-right ${winner?.id === rumah2?.id ? 'font-bold' : ''}`}>
                              <span className={`${rumah2?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                                {rumah2?.name}
                              </span>
                              <p className="text-sm mt-1">
                                {match.pair2?.player1 && match.pair2?.player2
                                  ? `${match.pair2.player1} & ${match.pair2.player2}`
                                  : 'Players'}
                              </p>
                            </div>
                          </div>
                          {winner && (
                            <div className="mt-3 text-center">
                              <span className="text-sm font-bold text-green-700">
                                🏆 Pemenang: {winner.name}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming Matches */}
              <div>
                <h3 className="text-xl font-bold mb-4 text-blue-600">Perlawanan Akan Datang</h3>
                {getUpcomingMatches().length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Tiada perlawanan akan datang</p>
                ) : (
                  <div className="space-y-3">
                    {getUpcomingMatches().map(match => {
                      const rumah1 = rumahSukan.find(r => r.id === match.team1.rumahSukanId);
                      const rumah2 = rumahSukan.find(r => r.id === match.team2.rumahSukanId);
                      const tableDisplay = getTableDisplayName(match);
                      return (
                        <div key={match.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-700">Match #{match.matchNumber} - {match.category}</span>
                            <div className="flex items-center gap-2">
                                {tableDisplay && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                    {tableDisplay}
                                  </span>
                                )}
                                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">AKAN DATANG</span>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4 items-center">
                            <div>
                              <span className={`${rumah1?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                                {rumah1?.name}
                              </span>
                              <p className="text-sm mt-1">{match.pair1.player1} & {match.pair1.player2}</p>
                            </div>
                            <div className="flex items-center justify-center">
                              <span className="text-2xl font-bold text-blue-600">VS</span>
                            </div>
                            <div className="text-right">
                              <span className={`${rumah2?.color} text-white px-2 py-1 rounded text-xs font-medium`}>
                                {rumah2?.name}
                              </span>
                              <p className="text-sm mt-1">{match.pair2.player1} & {match.pair2.player2}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Next Opponents by Rumah */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4 text-purple-600">Jadual Lawan Setiap Rumah</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {rumahSukan.map(rumah => {
                    const nextOpps = getNextOpponents(rumah.id);
                    return (
                      <div key={rumah.id} className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border-2 border-purple-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`${rumah.color} w-4 h-4 rounded-full`}></div>
                          <h4 className="font-bold">{rumah.name}</h4>
                        </div>
                        {nextOpps.length === 0 ? (
                          <p className="text-sm text-gray-500">Tiada perlawanan akan datang</p>
                        ) : (
                          <div className="space-y-2">
                            {nextOpps.map((opp, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <div className={`${opp.opponent?.color} w-3 h-3 rounded-full`}></div>
                                <span>{opp.opponent?.name}</span>
                                <span className="text-xs text-gray-500">({opp.category})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Trophy className="w-7 h-7 text-yellow-500" />
                  Kedudukan Keseluruhan
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={generateReport}
                    disabled={textReportDisabled}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Muat Turun Report (TXT)
                  </button>
                  {hasReportData ? (
                    <PDFDownloadLink
                      document={pdfDocument}
                      fileName="KRKL_Tournament_Report_2025.pdf"
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                    >
                      {({ loading }) => (
                        <>
                          <FileText className="w-4 h-4" />
                          {loading ? 'Menjana PDF...' : 'Muat Turun PDF'}
                        </>
                      )}
                    </PDFDownloadLink>
                  ) : (
                    <button
                      disabled
                      className="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Muat Turun PDF
                    </button>
                  )}
                </div>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Tiada kedudukan lagi. Jana jadual dan rekod keputusan perlawanan.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-3">
                    {standings.map((standing, index) => {
                      const houseSummary = housePointsById.get(Number(standing.id)) || housePointsById.get(standing.id);
                      const wins = standing.wins ?? 0;
                      const losses = standing.losses ?? 0;
                      const spiritPoints = houseSummary?.spiritPoints ?? 0;
                      const totalPoints = houseSummary?.totalPoints ?? (standing.leaguePoints ?? standing.points ?? 0);
                      const formattedSpirit = formatScore(spiritPoints);
                      const formattedTotal = formatScore(totalPoints);

                      return (
                      <div
                        key={standing.name}
                        className={`p-6 rounded-lg border-2 ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400' :
                          index === 1 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400' :
                          index === 2 ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-400' :
                          'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`text-3xl font-bold ${
                              index === 0 ? 'text-yellow-600' :
                              index === 1 ? 'text-gray-600' :
                              index === 2 ? 'text-orange-600' :
                              'text-gray-400'
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className={`${standing.color} text-white px-4 py-2 rounded-lg font-bold text-lg`}>
                                  {standing.name}
                                </span>
                                {index < 3 && (
                                  <Trophy className={`w-6 h-6 ${
                                    index === 0 ? 'text-yellow-500' :
                                    index === 1 ? 'text-gray-500' :
                                    'text-orange-500'
                                  }`} />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-8">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">{formattedSpirit}</p>
                              <p className="text-sm text-gray-600">Spirit</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{wins}</p>
                              <p className="text-sm text-gray-600">Menang</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-red-600">{losses}</p>
                              <p className="text-sm text-gray-600">Kalah</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-indigo-600">{formattedTotal}</p>
                              <p className="text-sm text-gray-600">Total Points</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      House Points (Seksyen 10)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700">
                            <th className="p-2 text-left">Rumah</th>
                            <th className="p-2 text-center">Placement</th>
                            <th className="p-2 text-center">Participation</th>
                            <th className="p-2 text-center">Match Wins</th>
                            <th className="p-2 text-center">Spirit</th>
                            <th className="p-2 text-center">Category Wins</th>
                            <th className="p-2 text-center">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {housePointsTable.map((house, idx) => (
                            <tr key={house.houseId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="p-2 font-medium">
                                <div className="flex items-center gap-2">
                                  <span className={`${house.color} w-3 h-3 rounded-full`}></span>
                                  {house.name}
                                </div>
                              </td>
                              <td className="p-2 text-center">{house.placementPoints}</td>
                              <td className="p-2 text-center">{house.participationPoints}</td>
                              <td className="p-2 text-center">{house.matchWinPoints}</td>
                              <td className="p-2 text-center">{formatScore(house.spiritPoints)}</td>
                              <td className="p-2 text-center">{house.categoryWins}</td>
                              <td className="p-2 text-center font-semibold text-indigo-600">{formatScore(house.totalPoints)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {matches.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  Statistik Pertandingan
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {matches.filter(m => m.status === 'completed').length}
                    </p>
                    <p className="text-gray-600 mt-1">Selesai</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-yellow-600">
                      {matches.filter(m => m.status === 'pending').length}
                    </p>
                    <p className="text-gray-600 mt-1">Menunggu</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {Math.round((matches.filter(m => m.status === 'completed').length / matches.length) * 100)}%
                    </p>
                    <p className="text-gray-600 mt-1">Progress</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-600">
                      {matches.length}
                    </p>
                    <p className="text-gray-600 mt-1">Jumlah</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'graph' && (
          <MatchGraph />
        )}

        {activeTab === 'house-points' && (
          <div className="space-y-6">
            {/* Spirit Marks Assessment Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500" />
                  Spirit Marks Assessment
                </h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rumahSukan.map(rumah => {
                  const existingMarks = spiritMarks.find(sm => sm.rumahId === rumah.id);
                  return (
                    <div key={rumah.id} className={`border rounded-lg p-4 ${rumah.color} bg-opacity-10`}>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-lg">{rumah.name}</h3>
                        {existingMarks && (
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Total Score</div>
                            <div className="text-xl font-bold text-green-600">
                              {formatScore(existingMarks.totalScore)} / 1
                            </div>
                          </div>
                        )}
                      </div>

                      {existingMarks && (
                        <div className="mb-4 text-sm text-gray-600">
                          <span className="font-medium text-gray-700">Assessor:</span>{' '}
                          {existingMarks.assessorName || '—'}
                        </div>
                      )}

                      <button
                        onClick={() => openSpiritMarksModal(rumah)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        {existingMarks ? 'Edit Assessment' : 'Add Assessment'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* House Points Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  House Points Summary
                </h2>
                <button
                  onClick={calculateHousePoints}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Calculate Points
                </button>
              </div>

              {housePoints.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left">Rank</th>
                        <th className="px-4 py-3 text-left">Rumah</th>
                        <th className="px-4 py-3 text-center">Placement</th>
                        <th className="px-4 py-3 text-center">Participation</th>
                        <th className="px-4 py-3 text-center">Match Wins</th>
                        <th className="px-4 py-3 text-center">Spirit Marks</th>
                        <th className="px-4 py-3 text-center font-bold">Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {housePoints.map((house, index) => (
                        <tr key={house.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {house.finalPlacement && (
                              <div className="flex items-center gap-2">
                                {house.finalPlacement === 1 && <Trophy className="w-5 h-5 text-yellow-500" />}
                                {house.finalPlacement === 2 && <Award className="w-5 h-5 text-gray-400" />}
                                {house.finalPlacement === 3 && <Award className="w-5 h-5 text-amber-600" />}
                                <span className="font-bold">#{house.finalPlacement}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${house.rumahColor}`}>
                              {house.rumahName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">{house.placementPoints}</td>
                          <td className="px-4 py-3 text-center">{house.participationPoints}</td>
                          <td className="px-4 py-3 text-center">{house.matchWinPoints}</td>
                          <td className="px-4 py-3 text-center text-green-600 font-medium">
                            {formatScore(house.spiritPoints)}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-lg">
                            {formatScore(house.totalPoints)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No house points calculated yet.</p>
                  <p className="text-sm mt-2">Complete spirit marks assessments and calculate points to see standings.</p>
                </div>
              )}

              {/* TNC System Information */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  TNC Scoring System
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    <p><strong>Placement Points:</strong> 1st=3, 2nd=2, 3rd=1 point</p>
                    <p><strong>Participation:</strong> 1 point (both categories fielded)</p>
                  </div>
                  <div>
                    <p><strong>Match Wins:</strong> 1 point per victory</p>
                    <p><strong>Spirit Marks:</strong> Up to 1 point (assessed by committee)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-300">
            KRKL LFSATHLON 2025 - Conducted in the spirit of fair play, discipline, and respect
          </p>
        </div>
      </div>

      {/* Table Assignment Modal */}
      {showTableAssignmentModal && selectedTeamForAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Assign Table - {selectedTeamForAssignment.rumahName} ({selectedCategoryForAssignment})
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Table:
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  defaultValue=""
                  id="tableSelect"
                >
                  <option value="">No table assigned</option>
                  {availableTables.map(table => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({table.currentAssignment})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional):
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Add any notes about this table assignment..."
                  id="tableNotes"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeTableAssignmentModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const tableSelect = document.getElementById('tableSelect');
                  const tableNotes = document.getElementById('tableNotes');
                  const tableId = tableSelect.value ? parseInt(tableSelect.value) : null;
                  const notes = tableNotes.value;
                  saveTeamTableAssignment(tableId, notes);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spirit Marks Assessment Modal */}
      {showSpiritMarksModal && selectedRumahForSpirit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Spirit Marks Assessment - {selectedRumahForSpirit.name}
              </h3>
              <button
                onClick={() => setShowSpiritMarksModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Assessor Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tournament Date:
                  </label>
                  <input
                    type="date"
                    value={spiritAssessment.tournamentDate}
                    onChange={(e) => setSpiritAssessment({...spiritAssessment, tournamentDate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessor Name *:
                  </label>
                  <input
                    type="text"
                    value={spiritAssessment.assessorName}
                    onChange={(e) => setSpiritAssessment({...spiritAssessment, assessorName: e.target.value})}
                    placeholder="Enter assessor name"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Assessment Scores */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Spirit Score (Max 1 point)</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overall Spirit & Sportsmanship Score:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={spiritAssessment.overallScore}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        const clamped = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
                        setSpiritAssessment({
                          ...spiritAssessment,
                          overallScore: clamped
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Beri markah 0 hingga 1 (contoh: 1 = penuh).
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-md flex flex-col justify-center">
                    <span className="font-medium text-blue-800">Total Score</span>
                    <span className="text-2xl font-bold text-blue-800">
                      {formatScore(spiritAssessment.overallScore || 0)} / 1
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessment Notes */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Assessment Notes</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Notes:
                  </label>
                  <textarea
                    value={spiritAssessment.overallNotes}
                    onChange={(e) => setSpiritAssessment({...spiritAssessment, overallNotes: e.target.value})}
                    rows="3"
                    placeholder="Catatan ringkas tentang semangat rumah."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowSpiritMarksModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSpiritMarks}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
