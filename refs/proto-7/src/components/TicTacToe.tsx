import React, { useState, useCallback } from 'react';
import { X, O, RefreshCw, Trophy } from 'lucide-react';
import { cn } from '../lib/cn';

interface Board {
  [key: number]: 'X' | 'O' | null;
}

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6], // diags
];

interface TicTacToeProps {}

export function TicTacToe({}: TicTacToeProps) {
  const [board, setBoard] = useState&lt;Board&gt;({});
  const [currentPlayer, setCurrentPlayer] = useState&lt;'X' | 'O'&gt;('X');
  const [winner, setWinner] = useState&lt;'X' | 'O' | null&gt;(null);
  const [draw, setDraw] = useState(false);
  const [winningCombo, setWinningCombo] = useState&lt;number[] | null&gt;(null);
  const [scores, setScores] = useState({ X: 0, O: 0 });

  const checkWinner = useCallback((newBoard: Board): 'X' | 'O' | null => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (newBoard[a] &&amp;&amp; newBoard[a] === newBoard[b] &amp;&amp; newBoard[a] === newBoard[c]) {
        setWinningCombo(combo);
        return newBoard[a]!;
      }
    }
    if (Object.values(newBoard).every((cell): cell is 'X' | 'O' =&gt; cell !== null)) {
      return 'draw';
    }
    return null;
  }, []);

  const onCellClick = useCallback((index: number) =&gt; {
    if (board[index] || winner !== null || draw) return;

    const newBoard = { ...board, [index]: currentPlayer };
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result === 'draw') {
      setDraw(true);
    } else if (result !== null) {
      setWinner(result);
      setScores((prev) =&gt; ({ ...prev, [result]: prev[result] + 1 }));
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  }, [board, currentPlayer, winner, draw, checkWinner]);

  const resetGame = useCallback(() =&gt; {
    setBoard({});
    setCurrentPlayer('X');
    setWinner(null);
    setDraw(false);
    setWinningCombo(null);
  }, []);

  const resetScores = useCallback(() =&gt; {
    setScores({ X: 0, O: 0 });
    resetGame();
  }, [resetGame]);

  const isWinningCell = useCallback((index: number) =&gt; {
    return winner !== null &amp;&amp; winningCombo ? winningCombo.includes(index) : false;
  }, [winner, winningCombo]);

  const statusText = winner ? `${winner} VENCEU!` : draw ? 'EMPATE!' : `Vez de ${currentPlayer}`;

  return (
    &lt;div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 flex items-center justify-center p-4 backdrop-blur-sm relative overflow-hidden"&gt;
      {/* Floating particles */}
      &lt;div className="absolute inset-0 pointer-events-none"&gt;
        &lt;div className="absolute -top-4 left-10 w-2 h-2 bg-cyan-400/80 rounded-full animate-ping [animation-delay:0s] [animation-duration:3s]" /&gt;
        &lt;div className="absolute top-20 right-20 w-1.5 h-1.5 bg-pink-400/80 rounded-full animate-ping [animation-delay:1s] [animation-duration:4s]" /&gt;
        &lt;div className="absolute bottom-20 left-1/4 w-2 h-2 bg-blue-400/80 rounded-full animate-pulse [animation-delay:0.5s] [animation-duration:2.5s]" /&gt;
        &lt;div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-emerald-400/80 rounded-full animate-bounce [animation-delay:2s] [animation-duration:2s]" /&gt;
      &lt;/div&gt;

      &lt;div className="w-full max-w-sm p-8 bg-black/30/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl relative z-10 md:max-w-md lg:max-w-lg neon-glow"&gt;
        {/* Header */}
        &lt;div className="text-center mb-8"&gt;
          &lt;h1 className="text-4xl md:text-5xl font-mono font-black uppercase tracking-widest bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl mb-4 animate-pulse [animation-duration:3s]"&gt;
            Jogo da Velha
          &lt;/h1&gt;
          &lt;p className={cn(
            "text-xl font-mono uppercase tracking-widest",
            winner ? "text-cyan-300" : draw ? "text-yellow-300" : "text-white/80"
          )}&gt;
            {statusText}
          &lt;/p&gt;
        &lt;/div&gt;

        {/* Scores */}
        &lt;div className="flex justify-center gap-6 mb-8"&gt;
          &lt;div className={cn(
            "p-6 rounded-2xl border-2 shadow-2xl backdrop-blur-md text-center transition-all hover:scale-105 duration-300 min-w-[90px]",
            "bg-gradient-to-b from-cyan-500/20 border-cyan-400/50 shadow-cyan-500/50",
            scores.X &gt; scores.O &amp;&amp; "ring-4 ring-cyan-400/30 scale-105"
          )}&gt;
            &lt;Trophy className="w-8 h-8 mx-auto mb-2 text-cyan-300 drop-shadow-lg" /&gt;
            &lt;div className="text-3xl font-black text-cyan-200 drop-shadow-md"&gt;{scores.X}&lt;/div&gt;
            &lt;div className="text-xs uppercase tracking-widest text-white/60"&gt;X&lt;/div&gt;
          &lt;/div&gt;
          &lt;div className={cn(
            "p-6 rounded-2xl border-2 shadow-2xl backdrop-blur-md text-center transition-all hover:scale-105 duration-300 min-w-[90px]",
            "bg-gradient-to-b from-pink-500/20 border-pink-400/50 shadow-pink-500/50",
            scores.O &gt; scores.X &amp;&amp; "ring-4 ring-pink-400/30 scale-105"
          )}&gt;
            &lt;Trophy className="w-8 h-8 mx-auto mb-2 text-pink-300 drop-shadow-lg" /&gt;
            &lt;div className="text-3xl font-black text-pink-200 drop-shadow-md"&gt;{scores.O}&lt;/div&gt;
            &lt;div className="text-xs uppercase tracking-widest text-white/60"&gt;O&lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;

        {/* Board */}
        &lt;div className="grid grid-cols-3 gap-4 max-w-xs mx-auto p-6 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner"&gt;
          {Array.from({ length: 9 }, (_, i) =&gt; (
            &lt;button
              key={i}
              onClick={() =&gt; onCellClick(i)}
              disabled={winner !== null || draw}
              className={cn(
                "aspect-square flex items-center justify-center",
                "border-4 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20",
                "font-mono text-4xl md:text-5xl font-black uppercase shadow-xl transition-all duration-300 hover:scale-110 hover:rotate-6",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                board[i] === 'X' &amp;&amp; "bg-gradient-to-br from-cyan-400/40 shadow-[0_0_20px_rgba(34,197,94,0.8)] text-cyan-200 animate-[bounce_0.5s]",
                board[i] === 'O' &amp;&amp; "bg-gradient-to-br from-pink-400/40 shadow-[0_0_20px_rgba(236,72,153,0.8)] text-pink-200 animate-[bounce_0.5s]",
                isWinningCell(i) &amp;&amp; "animate-pulse bg-white/30 shadow-[0_0_40px_currentColor] scale-110 ring-4 ring-white/50"
              )}
              aria-label={`Posição ${i + 1}`}
            &gt;
              {board[i] === 'X' &amp;&amp; &lt;X className="drop-shadow-2xl [&gt;path]:shadow-[0_0_10px_currentColor]" size={48} /&gt;}
              {board[i] === 'O' &amp;&amp; &lt;O className="drop-shadow-2xl [&gt;path]:shadow-[0_0_10px_currentColor]" size={48} /&gt;}
            &lt;/button&gt;
          ))}
        &lt;/div&gt;

        {/* Controls */}
        &lt;div className="flex flex-col sm:flex-row gap-4 mt-10 pt-6 border-t border-white/20"&gt;
          &lt;button
            onClick={resetGame}
            className="flex-1 py-4 px-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] transform hover:scale-105 transition-all duration-300 border border-white/20"
          &gt;
            &lt;RefreshCw className="w-5 h-5 mr-2 animate-spin [animation-duration:1s]" /&gt;
            Novo Jogo
          &lt;/button&gt;
          &lt;button
            onClick={resetScores}
            disabled={scores.X === 0 &amp;&amp; scores.O === 0}
            className="flex-1 py-4 px-8 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-mono font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] transform hover:scale-105 transition-all duration-300 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          &gt;
            Zerar Placar
          &lt;/button&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;style jsx global&gt;{`
        .neon-glow {
          box-shadow:
            0 0 20px rgba(59,130,246,0.4),
            0 0 40px rgba(168,85,247,0.3),
            inset 0 0 20px rgba(255,255,255,0.08);
        }
      `}&lt;/style&gt;
    &lt;/div&gt;
  );
}
