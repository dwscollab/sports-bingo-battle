// src/hooks/useLLMSquares.js
import { useState, useCallback } from 'react';
import { generateCard, FREE_SPACE } from '../data/bingoSquares.js';

/**
 * Calls the /api/generate-squares endpoint (Vercel function or local Vite proxy).
 * Falls back to static square generation if the API is unavailable.
 *
 * Accepts:
 *   homeTeam    — the home team in the actual game being watched (primary context)
 *   awayTeam    — the away team in the actual game being watched (primary context)
 *   sport, location, gameDate
 *   (myTeam is intentionally excluded — must not influence square topics)
 */
export function useLLMSquares() {
  const [status, setStatus] = useState('idle');
  const [error,  setError]  = useState(null);

  const generateLLMCard = useCallback(async ({
    sport,
    homeTeam,
    awayTeam,
    location,
    gameDate,
  }) => {
    setStatus('generating');
    setError(null);

    try {
      const response = await fetch('/api/generate-squares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport,
          homeTeam: homeTeam || null,
          awayTeam: awayTeam || null,
          location,
          gameDate,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) throw new Error(`Server responded ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!Array.isArray(data.squares)) throw new Error('Invalid response format');

      // Shape squares into the app's internal format
      const shaped = data.squares.slice(0, 24).map((sq, i) => ({
        id:          `llm_${Date.now()}_${i}`,
        text:        sq.text || `Square ${i + 1}`,
        battle:      !!sq.battle,
        camera:      !!sq.camera,
        isMarked:    false,
        isBlocked:   false,
        llmGenerated: true,
      }));

      // Insert FREE space at center (index 12)
      const card = [
        ...shaped.slice(0, 12),
        { ...FREE_SPACE, isMarked: false, isBlocked: false },
        ...shaped.slice(12, 24),
      ].map((sq, idx) => ({ ...sq, index: idx }));

      setStatus('done');
      return card;
    } catch (err) {
      console.warn('LLM generation failed, using static fallback:', err.message);
      setError(err.message);
      setStatus('fallback');
      return generateCard(sport, location);
    }
  }, []);

  const reset = useCallback(() => { setStatus('idle'); setError(null); }, []);

  return { generateLLMCard, status, error, reset };
}
