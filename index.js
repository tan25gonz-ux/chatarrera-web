import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

document.getElementById("btnLogin").addEventListener("click", async () => {
  const email = document.getElementById("usuario").value;
  const pass = document.getElementById("password").value;
  const mensaje = document.getElementById("mensaje");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    sessionStorage.setItem("usuario", user.email);

    if (user.email === "tan25gonz@gmail.com") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "usuario.html";
    }
  } catch (error) {
    mensaje.innerText = "❌ " + error.message;
  }
});
