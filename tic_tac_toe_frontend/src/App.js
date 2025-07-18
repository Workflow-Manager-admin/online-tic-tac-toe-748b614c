import React, { useState, useEffect } from "react";
import "./App.css";
import { getOpenAIMove } from "./openaiTicTacToe";

/**
 * Color palette used in UI:
 * --primary:   #1976d2 (main blue)
 * --accent:    #ff4081 (action/pink)
 * --secondary: #424242 (dark grey)
 */

// Helpers
function calculateWinner(cells) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6],            // Diagonals
  ];
  for (let [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a];
    }
  }
  return null;
}
function getAvailableMoves(cells) {
  return cells.map((v, idx) => (v ? null : idx)).filter((a) => a !== null);
}
// Simple AI: win/block/worst random
function bestMove(cells, ai, human) {
  // Try to win
  for (let idx of getAvailableMoves(cells)) {
    const testBoard = [...cells];
    testBoard[idx] = ai;
    if (calculateWinner(testBoard) === ai) return idx;
  }
  // Block human win
  for (let idx of getAvailableMoves(cells)) {
    const testBoard = [...cells];
    testBoard[idx] = human;
    if (calculateWinner(testBoard) === human) return idx;
  }
  // Center or corners preferred
  const favs = [4, 0, 2, 6, 8].filter((i) => !cells[i]);
  if (favs.length) return favs[Math.floor(Math.random() * favs.length)];
  // Pick random
  const moves = getAvailableMoves(cells);
  return moves[Math.floor(Math.random() * moves.length)];
}

/**
 * PUBLIC_INTERFACE
 * Main App Component: Provides full UI for Tic Tac Toe game
 */
export default function App() {
  const [mode, setMode] = useState(""); // "computer" | "two-player" | ""
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [status, setStatus] = useState("not_started"); // "not_started" / "playing" / "game_over"
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState("");
  const [theme] = useState("light"); // Keep only light theme for this app.
  const [aiLoading, setAiLoading] = useState(false);
  const [usingOpenAI, setUsingOpenAI] = useState(false);

  // Always apply custom theme variables for palette
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', "#1976d2");
    document.documentElement.style.setProperty('--accent', "#ff4081");
    document.documentElement.style.setProperty('--secondary', "#424242");
    document.documentElement.style.setProperty('--theme-bg', "#fff");
    document.documentElement.style.setProperty('--theme-txt', "#212121");
  }, []);

  // PUBLIC_INTERFACE
  // Start a game in the selected mode
  function handleStart(selected) {
    setMode(selected);
    setStatus("playing");
    setBoard(Array(9).fill(null));
    setWinner(null);
    setXIsNext(true);
    setAiLoading(false);
    // If OpenAI API key is present, use it for 'computer' mode moves
    if (selected === "computer" && process.env.REACT_APP_OPENAI_API_KEY) {
      setUsingOpenAI(true);
      setMessage("Your turn (X) [vs OpenAI]");
    } else {
      setUsingOpenAI(false);
      setMessage(selected === "computer" ? "Your turn (X)" : "Player X's turn");
    }
  }
  // PUBLIC_INTERFACE
  // Reset current game (same mode)
  function handleReset() {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setStatus("playing");
    setXIsNext(true);
    setMessage(mode === "computer" ? "Your turn (X)" : "Player X's turn");
  }
  // PUBLIC_INTERFACE
  // Start a new game (mode selection)
  function handleNewGame() {
    setMode("");
    setStatus("not_started");
    setBoard(Array(9).fill(null));
    setWinner(null);
    setMessage("");
    setXIsNext(true);
  }
  // PUBLIC_INTERFACE
  // Handle user clicking a cell
  function handleCellClick(idx) {
    if (board[idx] || winner || status !== "playing") return; // If already filled or over
    if (mode === "computer" && !xIsNext) return; // Block clicking during computer's turn
    const nextBoard = [...board];
    nextBoard[idx] = xIsNext ? "X" : "O";
    setBoard(nextBoard);
    setXIsNext(!xIsNext);
  }

  // PUBLIC_INTERFACE
  // Main game state effect: check results, trigger AI if needed
  useEffect(() => {
    // Calculate winner/draw
    const win = calculateWinner(board);
    if (win) {
      setWinner(win);
      setStatus("game_over");
      setAiLoading(false);
      setMessage(mode === "computer"
        ? (win === "X" ? "You win! 🎉" : (usingOpenAI ? "OpenAI wins! 🤖" : "Computer wins! 🤖"))
        : `Player ${win} wins! 🎉`);
      return;
    }
    if (getAvailableMoves(board).length === 0 && status === "playing") {
      setWinner(null);
      setStatus("game_over");
      setAiLoading(false);
      setMessage("It's a draw!");
      return;
    }

    // If computer mode, O's turn, and playing
    if (mode === "computer" && !xIsNext && status === "playing") {
      // If OpenAI integration, call it; otherwise use bestMove
      async function handleOpenAIMove() {
        setAiLoading(true);
        let move;
        try {
          move = await getOpenAIMove(board, "O");
        } catch (e) {
          // fallback to local AI if OpenAI fails
          move = bestMove(board, "O", "X");
        }
        setTimeout(() => {
          setBoard((cur) => {
            // Only update if the board hasn't changed
            if (cur !== board) return cur;
            const updated = [...cur];
            updated[move] = "O";
            return updated;
          });
          setXIsNext(true);
          setAiLoading(false);
        }, 750); // Small delay for realism
      }
      if (usingOpenAI) {
        setMessage("OpenAI is thinking...");
        handleOpenAIMove();
      } else {
        const move = bestMove(board, "O", "X");
        setTimeout(() => {
          setBoard((cur) => {
            if (cur !== board) return cur;
            const updated = [...cur];
            updated[move] = "O";
            return updated;
          });
          setXIsNext(true);
        }, 600);
      }
    } else if (mode === "computer" && xIsNext && status === "playing") {
      setMessage("Your turn (X)" + (usingOpenAI ? " [vs OpenAI]" : ""));
    } else if (mode === "two-player" && status === "playing") {
      setMessage(`Player ${xIsNext ? "X" : "O"}'s turn`);
    }
  }, [board, mode, status, xIsNext, usingOpenAI]);

  // --- UI COMPONENTS ---
  function renderMenu() {
    return (
      <div className="ttt-menu">
        <h1 className="ttt-title">Tic Tac Toe</h1>
        <p className="ttt-subtitle">Choose mode to start</p>
        <div className="ttt-mode-btns">
          <button className="ttt-btn ttt-btn-primary" data-testid="computer-btn" onClick={() => handleStart("computer")}>
            Play vs Computer
          </button>
          <button className="ttt-btn ttt-btn-secondary" data-testid="twoplayer-btn" onClick={() => handleStart("two-player")}>
            Two Player
          </button>
        </div>
        <footer className="ttt-footer">
          <span>
            <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer" style={{ color: "#1976d2", textDecoration: "none" }}>Built with React</a>
          </span>
        </footer>
      </div>
    );
  }

  function renderCell(idx) {
    const value = board[idx];
    return (
      <button
        className="ttt-cell"
        key={idx}
        data-testid={`cell-${idx}`}
        aria-label={`cell ${idx + 1} ${value ? `with ${value}` : "empty"}`}
        onClick={() => handleCellClick(idx)}
        disabled={
          !!board[idx] ||
          winner ||
          (mode === "computer" && !xIsNext && status === "playing")
        }
        style={{
          color: value === "X" ? "var(--primary)" : value === "O" ? "var(--accent)" : "",
          cursor: board[idx] || winner || (mode === "computer" && !xIsNext && status === "playing") ? "not-allowed" : "pointer",
        }}
      >
        {value}
      </button>
    );
  }

  function renderBoard() {
    return (
      <div className="ttt-board" data-testid="ttt-board" style={aiLoading ? {opacity: 0.7, pointerEvents: "none"} : {}}>
        {[0, 1, 2].map((row) => (
          <div className="ttt-row" key={row}>
            {renderCell(row * 3 + 0)}
            {renderCell(row * 3 + 1)}
            {renderCell(row * 3 + 2)}
          </div>
        ))}
        {aiLoading &&
          <div style={{
            position: "absolute", left: 0, right: 0, top: "-18px", textAlign: "center", color: "#424242", fontWeight: 600
          }}>
            <span role="status" data-testid="ai-spinner" style={{background: "white", fontSize: "1.07em", padding: "0.18em 1em", borderRadius: "18px", border: "1px solid #dee3e9"}}>
              <span className="ttt-loader" style={{marginRight: "6px"}}>🤖</span> AI thinking...
            </span>
          </div>
        }
      </div>
    );
  }

  function renderControls() {
    return (
      <div className="ttt-controls" style={{ marginTop: 24 }}>
        <button className="ttt-btn ttt-btn-secondary-outline" onClick={handleReset} data-testid="reset-btn">
          Reset Board
        </button>
        <button className="ttt-btn ttt-btn-accent" onClick={handleNewGame} data-testid="newgame-btn">
          New Game
        </button>
      </div>
    );
  }

  function renderResult() {
    if (status !== "game_over") return null;
    return (
      <div className="ttt-result" data-testid="ttt-result">
        {winner
          ? (
            <span>
              <span className={`ttt-winner ttt-winner-${winner}`}>{winner === "X" ? "X" : "O"}</span>
              {" "}
              wins!
            </span>
          ) : (
            <span>It's a draw!</span>
          )
        }
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="ttt-app-bg">
      <main className="ttt-main">
        {status === "not_started" ? (
          renderMenu()
        ) : (
          <div className="ttt-game-area">
            <h1 className="ttt-title">Tic Tac Toe</h1>
            <div className="ttt-mode-label">
              <span className="ttt-pill">
                Mode: {mode === "computer" ? "Vs Computer" : "Two Player"}
              </span>
            </div>
            {renderBoard()}
            <div className="ttt-message" data-testid="ttt-message">
              {message}
            </div>
            {renderResult()}
            {renderControls()}
          </div>
        )}
      </main>
    </div>
  );
}
