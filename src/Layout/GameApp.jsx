import React, { useEffect, useState } from "react";
import Board from "../components/Board";
import { gameSubject, initGame, resetGame } from "../components/Game";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc } from "firebase/firestore";

function GameApp() {
  const [board, setBoard] = useState([]);
  const [isGameOver, setIsGameOver] = useState();
  const [result, setResult] = useState();
  const [position, setPosition] = useState();
  const { id } = useParams();
  const [initResult, setInitResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(true);
  const [game, setGame] = useState(true);
  const shareableLink = window.location.href;
  const navigate = useNavigate();

  useEffect(() => {
    let subscribe;

    async function init() {
      const res = await initGame(
        id !== "local" ? doc(db, "games", `${id}`) : null
      );
      setInitResult(res);
      setLoading(false);

      if (!res) {
        subscribe = gameSubject.subscribe((game) => {
          setBoard(game.board);
          setIsGameOver(game.isGameOver);
          setResult(game.result);
          setPosition(game.position);
          setStatus(game.status);
          setGame(game);
        });
      }
    }
    init();

    return () => subscribe && subscribe.unsubscribe();
  }, [id]);

  async function copytoClipboard() {
    await navigator.clipboard.writeText(shareableLink);
  }

  console.log(game);

  if (loading) {
    return "loading";
  }

  if (initResult === "not found") {
    return "Game not found";
  } else if (initResult === "intruder") {
    return "The game is already full";
  }

  return (
    <div className="app-container">
      {isGameOver && (
        <h2 className="vertical-text">
          GAME OVER
          <button
            onClick={async () => {
              await resetGame();
              navigate("/");
            }}
          >
            <span className="vertical-text">NEW GAME</span>
          </button>
        </h2>
      )}
      <div className="board-container">
        <span className="tag is-link">{game?.member?.name}</span>
        <Board board={board} position={position} />
        <span className="tag is-link">{game?.openent?.name}</span>
      </div>
      {result && <p className="vertical-text">{result}</p>}
      {status === "waiting" && (
        <div className="notification is-link share-game">
          <strong>Share this game to continue</strong>
          <br />
          <br />
          <div className="field has-addons">
            <div className="control is-expanded">
              <input
                type="text"
                className="input"
                readOnly
                value={shareableLink}
              />
            </div>
            <div className="control">
              <button className="button is-info" onClick={copytoClipboard}>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameApp;
