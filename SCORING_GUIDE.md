# KRKL Ping Pong Tournament - Scoring Guide

## 🎯 **Tournament Format**
- **Best of 5 Games** per match
- **First to 3 Games** wins the match
- **Each Game**: First to 11 points, must win by **3 points**

## 📊 **How Scoring Works**

### **Individual Game Scoring**
1. **Input scores** for each game (Game 1-5)
2. **Auto-validation**: System checks if game meets winning criteria
   - Minimum 11 points
   - Must win by 3 points (11-8 ✅, 11-9 ❌, 14-11 ✅)
3. **Auto-completion**: Game marked as complete when criteria met

### **Match Progression**
- **Game 1**: Start with scores 0-0
- **Continue**: Progress to next game regardless of winner
- **Auto-stop**: Match ends when one team wins 3 games
- **Manual Finalize**: Click "Selesai" to confirm completion

### **Score Display Format**
```
Game 1:  [11-8]  ✓ (Completed - Team 1 wins)
Game 2:  [9-11]  ✓ (Completed - Team 2 wins)
Game 3:  [11-7]  ✓ (Completed - Team 1 wins)
Game 4:  [10-12] ✓ (Completed - Team 2 wins)
Game 5:  [14-11] ✓ (Completed - Team 1 wins)

Series Score: 3-2 (Team 1 Wins Match)
Status: Match Complete
```

## 🎮 **Step-by-Step Scoring Process**

### **Starting a Match:**
1. Click "Start" button
2. Status changes to "Playing"
3. Game 1 becomes active

### **Recording Game Scores:**
1. Enter Team 1 score (left input)
2. Enter Team 2 score (right input)
3. System validates scores automatically
4. Game marked complete when:
   - Both scores ≥ 11 points, AND
   - Score difference ≥ 3 points
5. Move to next game automatically

### **Match Completion:**
- **Automatic**: Match ends when 3 games won
- **Manual**: Click "Selesai" for final confirmation
- **Result**: Series score displayed (3-1, 2-3, etc.)

## ⚡ **Important Rules**

### **Game Completion Rules:**
- ✅ **Valid**: 11-8, 11-7, 14-11 (3+ point difference)
- ❌ **Invalid**: 11-9, 11-10 (less than 3 points)
- ✅ **Deuce**: 14-13, 15-12 (continues until 3-point lead)

### **Match Management:**
- **Editing**: Can only edit scores of current/unfinished games
- **Completion**: Matches auto-complete at 3 wins
- **Finalization**: Manual confirmation required for official completion

## 📱 **Live Updates**
- **Real-time**: Public display updates instantly
- **Status Tracking**: Shows "Playing", "Completed", "Pending"
- **Series Score**: Live game win tally displayed
- **Tournament Progress**: Overall completion percentage

## 🏆 **Scoring Examples**

### **Quick Match (3-0):**
```
Game 1: 11-5 ✓
Game 2: 11-3 ✓
Game 3: 11-7 ✓
Match Complete: 3-0 (No need for Games 4-5)
```

### **Full Match (3-2):**
```
Game 1: 11-8 ✓
Game 2: 9-11 ✗
Game 3: 11-7 ✓
Game 4: 10-12 ✗
Game 5: 14-11 ✓
Match Complete: 3-2 (Penultimate game)
```

### **Close Match (Extended):**
```
Game 1: 11-13 ✗
Game 2: 12-14 ✗
Game 3: 15-13 ✓
Game 4: 13-15 ✗
Game 5: 17-15 ✓
Match Complete: 3-2 (Extended deuce play)
```

---

**System ensures fair play and accurate tournament tracking! 🎾**