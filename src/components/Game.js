import * as Chess from "chess.js";
import { BehaviorSubject, map } from "rxjs";
import { auth } from "../firebase";
import { fromRef } from "rxfire/firestore";
import { getDoc, updateDoc } from "firebase/firestore";

// for check condition game result
/*
let promotion = "rnb2bnr/pppPkppp/8/4p3/7q/8/PPPP1PPP/RNBQKBNR w KQ - 1 5";
let staleMate = "4k3/4P3/4K3/8/8/8/8/8 b - - 0 78";
let checkMate = "rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3";
let insuficcientMaterial = "k7/8/n7/8/8/8/8/7K b - - 0 1";
*/

let gameRef;
let member;

const chess = new Chess();

export let gameSubject;

export async function initGame(gameRefFb) {
  const { currentUser } = auth;
  if (gameRefFb) {
    gameRef = gameRefFb;
    const initialGame = await getDoc(gameRef).then((doc) => doc.data());

    if (!initialGame) {
      return "not found";
    }

    const creator = initialGame.members.find((m) => m.creator === true);

    if (initialGame.status === "waiting" && creator.uid !== currentUser.uid) {
      const currUser = {
        uid: currentUser.uid,
        name: localStorage.getItem("userName"),
        piece: creator.piece === "w" ? "b" : "w",
      };

      const updatedMembers = [...initialGame.members, currUser];

      await updateDoc(gameRef, { members: updatedMembers, status: "ready" });
    } else if (
      !initialGame.members.map((m) => m.uid).includes(currentUser.uid)
    ) {
      return "intruder";
    }

    chess.reset();

    gameSubject = fromRef(gameRefFb).pipe(
      map((gameDoc) => {
        const game = gameDoc.data();
        const { pendingPromotion, gameData, ...restOfGame } = game;
        member = game.members.find((m) => m.uid === currentUser.uid);
        const openent = game.members.find((m) => m.uid !== currentUser.uid);

        if (gameData) {
          chess.load(gameData);
        }

        const isGameOver = chess.game_over();
        return {
          board: chess.board(),
          pendingPromotion,
          isGameOver,
          position: member.piece,
          member,
          openent,
          result: isGameOver ? getGameResult() : null,
          ...restOfGame,
        };
      })
    );
  } else {
    gameRef = null;
    gameSubject = new BehaviorSubject();

    const savedGame = localStorage.getItem("savedGame");
    if (savedGame) {
      chess.load(savedGame);
    }

    updateGame();
  }
}

export async function resetGame() {
  if (gameRef) {
    await updateGame(null, true);
    chess.reset();
  } else {
    chess.reset();
    updateGame();
  }
}

export function handleMove(from, to) {
  const promotions = chess.moves({ verbose: true }).filter((m) => m.promotion);
  let pendingPromotion;
  if (promotions.some((p) => `${p.from}:${p.to}` === `${from}:${to}`)) {
    const pendingPromotion = { from, to, color: promotions[0].color };
    updateGame(pendingPromotion);
  }
  // const { pendingPromotion } = gameSubject.getValue();s

  if (!pendingPromotion) {
    move(from, to);
  }
}

export function move(from, to, promotion) {
  let tempMove = { from, to };

  if (promotion) {
    tempMove.promotion = promotion;
  }

  if (gameRef) {
    if (member.piece === chess.turn()) {
      const legalMove = chess.move(tempMove);
      if (legalMove) {
        updateGame();
      }
    }
  } else {
    const legalMove = chess.move(tempMove);
    if (legalMove) {
      updateGame();
    }
  }
}

async function updateGame(pendingPromotion, reset) {
  const isGameOver = chess.game_over();

  if (gameRef) {
    const updatedData = {
      gameData: chess.fen(),
      pendingPromotio: pendingPromotion || null,
    };
    if (reset) {
      updatedData.status = "over";
    }
    await updateDoc(gameRef, updatedData);
  } else {
    const newGame = {
      board: chess.board(),
      pendingPromotion,
      isGameOver,
      position: chess.turn(),
      result: isGameOver ? getGameResult() : null,
    };

    localStorage.setItem("savedGame", chess.fen());
    gameSubject.next(newGame);
  }
}

function getGameResult() {
  if (chess.in_checkmate()) {
    const winner = chess.turn() === "W" ? "BLACK" : "WHITE";
    return `CHECKMATE - WINNER - ${winner}`;
  } else if (chess.in_draw()) {
    let reason = "50 - MOVES - RULE";

    if (chess.in_stalemate()) {
      reason = "STALEMATE";
    } else if (chess.in_threefold_repetition()) {
      reason = "REPITITION";
    } else if (chess.insufficient_material()) {
      reason = "INSUFFICIENT MATERIAL";
    }

    return `DRAW - ${reason}`;
  } else {
    return "UNKNOWN REASON";
  }
}
