//
// PUBLIC_INTERFACE
// Utility for making OpenAI-powered Tic Tac Toe move suggestions (for TicTacToe AI opponent)
//
// Uses the OpenAI API and expects the API key to be defined in
// `REACT_APP_OPENAI_API_KEY` environment variable.
//
// Usage:
//   await getOpenAIMove(board, "O"); // for computer/O's move, returns the index for the move
//

const OPENAI_API_BASE = "https://api.openai.com/v1/chat/completions";

// Helper to convert board to string for prompt
function boardToPrompt(boardArray) {
  // Board: 0-8, X/O/null
  // Display for user prompt
  let s = "";
  for (let row = 0; row < 3; ++row) {
    let rowArr = [];
    for (let col = 0; col < 3; ++col) {
      let v = boardArray[row * 3 + col];
      rowArr.push(v ? v : ".");
    }
    s += rowArr.join(" ") + (row < 2 ? "\n" : "");
  }
  return s;
}

// PUBLIC_INTERFACE
export async function getOpenAIMove(board, aiSymbol) {
  /**
   * Requests next move from OpenAI given the board and AI's symbol.
   * Returns a 0-based index for the recommended move ("cell").
   * Throws for errors or invalid moves.
   */
  const key = process.env.REACT_APP_OPENAI_API_KEY;
  if (!key) {
    throw new Error("OpenAI API key not configured.");
  }

  // Only pass open slots. We'll instruct the LLM to choose a valid cell index (0-8).
  const prompt =
    `You are an expert tic tac toe player. You play as '${aiSymbol}' and the user is your opponent.\n` +
    "The board uses 0-based indexes. Format:\n" +
    "0 1 2\n3 4 5\n6 7 8\n" +
    "The current board (X = X, O = O, . = empty):\n" +
    boardToPrompt(board) +
    "\n\nWhat cell (number 0 to 8) should '" + aiSymbol + "' play to maximize their chance of winning? " +
    "DO NOT add commentary, explain, or provide anything except a single integer for your answer. Only reply with a single number for the cell index.";

  // Use OpenAI Chat API
  const response = await fetch(OPENAI_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert tic tac toe AI. Only respond with the move cell index.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Reduce randomness for reproducible AI moves
      max_tokens: 5, // Just a number
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to contact OpenAI API: " + response.statusText);
  }

  const data = await response.json();
  let answer = undefined;
  try {
    answer = data.choices?.[0]?.message?.content.trim();
    // Parse possible formats ("5", "Cell: 3", etc. should just be "5")
    const match = answer.match(/\d+/);
    if (!match) throw new Error();
    const move = parseInt(match[0], 10);
    if (!Number.isInteger(move) || move < 0 || move > 8 || board[move]) throw new Error();
    return move;
  } catch (e) {
    throw new Error("OpenAI AI returned invalid move: " + (answer || JSON.stringify(data)));
  }
}
