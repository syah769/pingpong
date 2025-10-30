# Flexible Table Management System

## Overview
The tournament system now supports flexible assignment of Table A and Table B for both Men's Doubles and Mixed Doubles categories.

## Database Changes

### New Table Fields
The `play_tables` table now includes:
- `assigned_category`: What categories the table can be used for ('Mixed Doubles', 'Men's Doubles', 'Both')
- `current_assignment`: What the table is currently assigned to ('Mixed Doubles', 'Men's Doubles', 'Both', 'Available')
- `priority_assignment`: Preferred category for this table ('Mixed Doubles', 'Men's Doubles', 'None')
- `notes`: Additional notes about table assignment
- `sort_order`: Order priority for table selection

## API Endpoints

### GET /?resource=tables
Returns all tables with their current assignments and settings.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Table A",
    "assignedCategory": "Both",
    "currentAssignment": "Available",
    "priorityAssignment": "None",
    "notes": "Flexible table - can be assigned to either category",
    "sortOrder": 1
  }
]
```

### POST - Manual Table Assignment
**Action:** `assign_table`

Assign a specific table to a category.

**Request:**
```json
{
  "action": "assign_table",
  "tableId": 1,
  "category": "Mixed Doubles",
  "notes": "Currently used for mixed doubles semi-finals"
}
```

### POST - Set Table Priority
**Action:** `set_table_priority`

Set a preferred category for a table (used in auto-assignment).

**Request:**
```json
{
  "action": "set_table_priority",
  "tableId": 1,
  "priorityCategory": "Mixed Doubles"
}
```

### POST - Auto-Assign Tables
**Action:** `auto_assign_tables`

Automatically assign all available tables to a category.

**Request:**
```json
{
  "action": "auto_assign_tables",
  "category": "Mixed Doubles"
}
```

### PUT - Assign Match to Table
**Action:** `assign_match_table`

Manually assign a specific match to a table.

**Request:**
```json
{
  "action": "assign_match_table",
  "matchId": 15,
  "tableId": 1
}
```

### PUT - Auto-Assign Matches
**Action:** `auto_assign_matches`

Automatically assign all pending matches to available tables for a category.

**Request:**
```json
{
  "action": "auto_assign_matches",
  "category": "Mixed Doubles"
}
```

## Usage Examples

### Scenario 1: Mixed Doubles Tournament Only
```javascript
// Auto-assign all tables for mixed doubles
fetch('/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'auto_assign_tables',
    category: 'Mixed Doubles'
  })
});
```

### Scenario 2: Both Categories Running Simultaneously
```javascript
// Assign Table A priority to Mixed Doubles
fetch('/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'set_table_priority',
    tableId: 1, // Table A
    priorityCategory: 'Mixed Doubles'
  })
});

// Assign Table B priority to Men's Doubles
fetch('/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'set_table_priority',
    tableId: 2, // Table B
    priorityCategory: 'Men\'s Doubles'
  })
});

// Auto-assign tables for each category
fetch('/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'auto_assign_tables',
    category: 'Mixed Doubles'
  })
});

fetch('/api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'auto_assign_tables',
    category: 'Men\'s Doubles'
  })
});
```

### Scenario 3: Manual Match Assignment
```javascript
// Get available tables
const tablesResponse = await fetch('/api.php?resource=tables');
const tables = await tablesResponse.json();

// Assign a specific match to Table A
fetch('/api.php', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'assign_match_table',
    matchId: 15,
    tableId: 1 // Table A
  })
});
```

## Auto-Assignment Logic

The system uses the following priority order when auto-assigning tables:
1. Tables with priority assignment matching the category
2. Tables assigned to 'Both' or the specific category
3. Tables marked as 'Available' that can be used for the category
4. Order by `sort_order` then `id`

## Validation Rules

- Tables can only be assigned to matches they support (based on `assigned_category`)
- Tables marked as 'Available' can be used if their `assigned_category` allows it
- Priority assignments are respected in auto-assignment
- Table assignments prevent conflicts between categories

## Migration

Run the `update_tables.sql` script to update your existing database:

```sql
-- Run this script on your existing database
SOURCE update_tables.sql;
```

This will:
- Make Table A and Table B flexible (can be assigned to either category)
- Add the new fields for current assignment and priority
- Add optional Table C and Table D for larger tournaments