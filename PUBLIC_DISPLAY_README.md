# KRKL Tournament 2025 - Public Display

A dedicated public display system for tournament audiences to view live results, standings, and match graphs in real-time.

## Features

### 🎯 Core Functionality
- **Live Results**: Displays latest match results with winners and scores
- **Standings Table**: Real-time tournament standings with points, wins, losses
- **Match Graph**: Visual representation of completed matches
- **Auto-Refresh**: Automatically updates every 30 seconds
- **Manual Refresh**: Instant refresh button for immediate updates

### 🎨 Display Features
- **Responsive Design**: Optimized for all screen sizes
- **Large Screen Support**: Enhanced for projectors and big screens
- **Clean Interface**: Professional tournament display
- **Real-time Updates**: Shows last update time
- **Tab Navigation**: Easy switching between Live, Standings, and Match Graph

### 📊 Data Display
- **Match Results**: Latest 5 completed matches with scores
- **Upcoming Matches**: Next 5 scheduled matches
- **Tournament Standings**: Complete standings table with medals (🥇🥈🥉)
- **Spirit Points**: Displays sportsmanship scores
- **Game Statistics**: Points difference, games won/lost

## Installation & Usage

### Quick Start
1. Place `public-display.html` in your web server directory
2. Ensure the tournament API is accessible at `/krkl-tournament/api.php`
3. Open `public-display.html` in a web browser

### Requirements
- Modern web browser with JavaScript enabled
- Access to the KRKL Tournament API
- Web server (Apache, Nginx, or Laravel Herd)

### Configuration
The display automatically connects to:
- API Endpoint: `{current-domain}/krkl-tournament/api.php`
- Refresh Interval: 30 seconds (configurable)
- Timezone: Malaysia Time (ms-MY)

## Display Modes

### 📺 Live Tab
- **Latest Results**: Shows most recent completed matches
- **Upcoming Matches**: Displays next scheduled matches
- **Match Details**: Category, teams, scores, and winners
- **Real-time Updates**: Auto-refreshes for live tournament tracking

### 🏆 Standings Tab
- **Tournament Rankings**: Complete standings table
- **Point System**: League points, wins, draws, losses
- **Medal Display**: Gold, silver, bronze medals for top 3
- **Spirit Points**: Sportsmanship scores integrated
- **Game Difference**: Additional ranking criteria

### 📈 Match Graph Tab
- **Match History**: Chronological list of completed matches
- **Visual Results**: Team colors and match outcomes
- **Winner Highlights**: Trophy icons for winning teams
- **Category Filtering**: Match categories displayed

## Technical Details

### Frontend Technologies
- **React 18**: Modern component-based UI
- **Tailwind CSS**: Responsive styling framework
- **Lucide Icons**: Professional icon library
- **JavaScript ES6+**: Modern JavaScript features

### Data Flow
1. **API Calls**: Fetches data from tournament backend
2. **State Management**: React hooks for data state
3. **Real-time Updates**: Automatic data refresh
4. **Error Handling**: Graceful error management

### Performance Features
- **Optimized Rendering**: Efficient React components
- **Caching**: Smart data caching for performance
- **Responsive Images**: Optimized for all screen sizes
- **Minimal Dependencies**: Fast loading times

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Opera 76+

### Mobile Support
- ✅ Responsive design for tablets
- ✅ Touch-friendly interface
- ✅ Optimized for mobile viewing

## Display Recommendations

### For Projectors/Big Screens
- **Resolution**: 1920x1080 or higher
- **Browser**: Full screen mode (F11)
- **Zoom**: 100-125% for optimal viewing
- **Orientation**: Landscape (horizontal)

### For TVs/Monitors
- **Size**: 32" or larger recommended
- **Distance**: 6-10 feet viewing distance
- **Brightness**: High contrast mode
- **Refresh Rate**: 60Hz or higher

## Troubleshooting

### Common Issues

**Data Not Loading**
- Check API endpoint accessibility
- Verify internet connection
- Ensure CORS is configured properly

**Auto-refresh Not Working**
- Check browser JavaScript settings
- Verify API server is running
- Try manual refresh button

**Display Issues**
- Update browser to latest version
- Clear browser cache
- Try different browser

### Support
For technical support:
1. Check browser console for errors
2. Verify API connectivity
3. Ensure all files are properly deployed

## Security Notes

- **Public Display**: No authentication required
- **Read-only Access**: Cannot modify tournament data
- **API Security**: Follows tournament API security
- **HTTPS Recommended**: Use secure connections when possible

---

**KRKL Tournament 2025**
*Professional Tournament Management System*