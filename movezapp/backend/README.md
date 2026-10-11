# MoveZapp Backend

## Overview
MoveZapp backend is an Express API mounted under `/api`.
Route files should NOT include a `/api` prefix.

## Base Setup
- Entry: `backend/index.js`
- Router: `backend/routes/index.js`

## Routes
- `GET /api/health`
- `POST /api/dev/token` (dev only)
- `GET /api/me` (auth required)

## Feature Routes (auth required)
- Training: `backend/routes/training.js`
- Activities: `backend/routes/activities.js`
- Today summary: `backend/routes/today.js`

## One-call workout save
`POST /api/training_sessions/full`

Example payload:
```json
{
	"session": {
		"started_at": "2026-03-03T12:00:00Z",
		"note": "Push day"
	},
	"exercises": [
		{
			"name": "Bench Press",
			"sort_order": 0,
			"sets": [
				{ "set_no": 1, "weight": 135, "reps": 8, "set_type": "normal" },
				{ "set_no": 2, "weight": 155, "reps": 6 }
			]
		},
		{
			"name": "Pushups",
			"sort_order": 1,
			"sets": [
				{ "set_no": 1, "reps": 15, "set_type": "bodyweight" }
			]
		}
	]
}
```

## Notes
- Keep `CORS` + `express.json()` middleware in `backend/index.js`.
- All route paths are relative to `/api`.
