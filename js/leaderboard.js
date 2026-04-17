// Leaderboard integration via PlaySDK. Two boards: 'solo' and 'coop'.
// Direction: 'desc' (higher kills = better). Degrades gracefully when
// PlaySDK is unavailable (local dev).

const BOARDS = { solo: 'solo', coop: 'coop' };

// Cached results for display on the menu.
export const leaderboardCache = {
  solo: { rank: null, total: null, best: 0, entries: [] },
  coop: { rank: null, total: null, best: 0, entries: [] },
  lastSubmit: null, // { rank, total, board }
};

function sdk() {
  return window.PlaySDK && PlaySDK.isSignedIn ? PlaySDK : null;
}

// Submit a score after game over. Returns { rank, total } or null.
export async function submitScore(board, kills, metadata = {}) {
  const s = sdk();
  if (!s || kills <= 0) return null;
  try {
    const result = await s.submitScore(board, kills, 'desc', metadata);
    leaderboardCache.lastSubmit = { rank: result.rank, total: result.total, board };
    // Update local best.
    const c = leaderboardCache[board];
    if (c && kills > c.best) c.best = kills;
    if (c) { c.rank = result.rank; c.total = result.total; }
    return result;
  } catch (e) {
    console.warn('Leaderboard submit failed:', e);
    return null;
  }
}

// Fetch entries around the current player. Returns entries[] or [].
export async function fetchAroundMe(board, limit = 3) {
  const s = sdk();
  if (!s) return [];
  try {
    const data = await s.getLeaderboardAroundMe(board, limit);
    const c = leaderboardCache[board];
    if (c && data.entries) c.entries = data.entries;
    return data.entries || [];
  } catch (e) {
    console.warn('Leaderboard fetch failed:', e);
    return [];
  }
}

// Fetch top N entries for the menu display.
export async function fetchTop(board, limit = 5) {
  const s = sdk();
  if (!s) return [];
  try {
    const data = await s.getLeaderboard(board, limit);
    return data.entries || [];
  } catch (e) {
    console.warn('Leaderboard top fetch failed:', e);
    return [];
  }
}

// Refresh the cached rank + best for both boards (call on menu load).
export async function refreshMenuData() {
  const s = sdk();
  if (!s) return;
  for (const board of [BOARDS.solo, BOARDS.coop]) {
    try {
      const data = await s.getLeaderboardAroundMe(board, 0);
      const c = leaderboardCache[board];
      if (data.entries) {
        const me = data.entries.find(e => e.isMe);
        if (me) {
          c.rank = me.rank;
          c.best = me.value;
          c.total = data.total;
        }
      }
    } catch (_) { /* ignore */ }
  }
}
