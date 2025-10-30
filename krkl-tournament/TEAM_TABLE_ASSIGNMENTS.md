# Team Table Assignment System

## Overview
This feature allows you to assign specific teams to preferred tables for both Mixed Doubles and Men's Doubles categories. This helps organizers plan and allocate tables efficiently before matches begin.

## Features Implemented

### 1. Database Schema
- **`team_table_assignments` table**: Tracks team-to-table assignments with categories and notes
- **`teams` table updated**: Added direct reference columns for quick access
- **Foreign key constraints**: Ensure data integrity

### 2. API Endpoints

#### GET Endpoints
- `GET /api.php?resource=teams` - Returns teams with their table assignments
- `GET /api.php?resource=tables` - Returns available tables
- `GET /api.php?resource=team_table_assignments` - Returns all team table assignments

#### POST Endpoints
- `POST /api.php` with `action: save_team_table_assignment`
  ```json
  {
    "action": "save_team_table_assignment",
    "teamId": 1,
    "category": "Mixed Doubles",
    "preferredTableId": 1,
    "tableNotes": "Optional notes about the assignment"
  }
  ```

- `POST /api.php` with `action: delete_team_table_assignment`
  ```json
  {
    "action": "delete_team_table_assignment",
    "assignmentId": 1,
    "teamId": 1,
    "category": "Mixed Doubles"
  }
  ```

### 3. User Interface

#### Team Card Enhancements
Each team card now shows:
- Table Assignment section with:
  - Mixed Doubles table assignment (purple theme)
  - Men's Doubles table assignment (blue theme)
  - Edit buttons for existing assignments
  - Plus buttons for new assignments

#### Table Assignment Modal
- Clean modal interface for assigning teams to tables
- Dropdown with available tables showing current status
- Optional notes field for additional information
- Save/Cancel functionality

## How to Use

### 1. Assign a Team to a Table
1. Navigate to the "Teams" section
2. Find the team you want to assign
3. In the "Table Assignment" section:
   - Click the "+" button next to Mixed or Men's Doubles
   - Select a table from the dropdown
   - Add optional notes
   - Click "Save Assignment"

### 2. Edit an Existing Assignment
1. Find the team with an existing assignment
2. Click the edit (✏️) button next to the assigned table
3. Change the table or notes as needed
4. Click "Save Assignment"

### 3. Remove an Assignment
Currently handled through the same modal by selecting "No table assigned"

## Current Data Structure

### Team Object with Table Assignments
```json
{
  "id": 1,
  "rumahName": "Rumah Kuning",
  "mixedPair": {
    "player1": "Rohana Azizan",
    "player2": "Sunilin Jatri Masinin"
  },
  "mensPair": {
    "player1": "Muhammad Hanafis Borhan",
    "player2": "Hamzah Jamad"
  },
  "tableAssignments": {
    "mixedDoubles": {
      "tableId": 1,
      "tableName": "Table A"
    },
    "mensDoubles": {
      "tableId": 2,
      "tableName": "Table B"
    }
  }
}
```

### Available Tables
```json
[
  {
    "id": 1,
    "name": "Table A",
    "assignedCategory": "Both",
    "currentAssignment": "Available",
    "priorityAssignment": "None",
    "notes": "Flexible table - can be assigned to either category"
  },
  {
    "id": 2,
    "name": "Table B",
    "assignedCategory": "Both",
    "currentAssignment": "Available",
    "priorityAssignment": "None",
    "notes": "Flexible table - can be assigned to either category"
  }
]
```

## Benefits

1. **Pre-match Planning**: Organizers can pre-assign teams to specific tables
2. **Efficient Resource Management**: Better utilization of available tables
3. **Clear Visual Indicators**: Easy to see which teams are assigned to which tables
4. **Flexible Assignment**: Teams can have different tables for different categories
5. **Notes Support**: Add context or special requirements for assignments

## Integration with Match System

This table assignment system integrates with the existing flexible table management system. When generating matches, the system can:
- Consider team preferences when assigning tables
- Balance assignments across available tables
- Use priority assignments when allocating resources

The assignments serve as preferences that can guide the automatic match scheduling process while maintaining flexibility for real-time adjustments.