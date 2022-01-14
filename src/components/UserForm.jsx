import React, { useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "../firebase";

export default function UserForm() {
  const [name, setName] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    localStorage.setItem("userName", name);

    console.log(auth.updateCurrentUser);
    await signInAnonymously(auth);
  }

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <h1>Enter your name to start</h1>
      <br />
      <div className="field">
        <p className="control">
          <input
            type="text"
            className="input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </p>
      </div>

      <div className="field">
        <p className="control">
          <button className="button is-success" type="submit">
            Start
          </button>
        </p>
      </div>
    </form>
  );
}
