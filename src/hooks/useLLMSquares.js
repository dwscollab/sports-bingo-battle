// src/hooks/useLLMSquares.js
import { useState, useCallback } from 'react';
import { generateCard, FREE_SPACE } from '../data/bingoSquares.js';

/**
 * Calls the /api/generate-squares endpoint (Vercel function or local Vite proxy).
 * Falls back to static square generation if the API is unavailable.
 */
export function useLLMSquares() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'generating' | 'done' | 'fallback' | 'error'
  const [error, setError] = useState(null);

  const generateLLMCard = useCallback(async ({
    sport,
    myTeam,
    opponentTeam,
    location,
    gameDate,
  }) => {
    setStatus('generating');
    setError(null);

    try {
      const response = await fetch('/api/generate-squares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport, myTeam, opponentTeam, location, gameDate }),
        signal: AbortSignal.timeout(15_000), // 15 second timeout
      });

      if (!response.ok) throw new Error(`Server responded ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!Array.isArray(data.squares)) throw new Error('Invalid response format');

      // Shape squares to match the app's expected format
      const shaped = data.squares.slice(0, 24).map((sq, i) => ({
        id: `llm_${Date.now()}_${i}`,
        text: sq.text || `Square ${i + 1}`,
        battle: !!sq.battle,
        camera: !!sq.camera,
        index: i < 12 ? i : i + 1, // skip center
        isMarked: false,
        isBlocked: false,
        llmGenerated: true,
      }));

      // Build 5×5 card with FREE center at index 12
      const card = [
        ...shaped.slice(0, 12),
        { ...FREE_SPACE, index: 12 },
        ...shaped.slice(12, 24),
      ].map((sq, idx) => ({ ...sq, index: idx }));

      setStatus('done');
      return card;
    } catch (err) {
      console.warn('LLM square generation failed, using static fallback:', err.message);
      setError(err.message);
      setStatus('fallback');

      // Graceful fallback to static squares
      return generateCard(sport, location);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { generateLLMCard, status, error, reset };
}
