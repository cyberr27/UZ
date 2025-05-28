document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  const loginFormContainer = document.getElementById("login-form");
  const registerFormContainer = document.getElementById("register-form");
  const profileContainer = document.getElementById("profile");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const logoutButton = document.getElementById("logout");

  // Toggle between login and register forms
  showRegister.addEventListener("click", () => {
    loginFormContainer.classList.add("hidden");
    registerFormContainer.classList.remove("hidden");
  });

  showLogin.addEventListener("click", () => {
    registerFormContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
  });

  // Handle registration
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Регистрация успешна! Пожалуйста, войдите.");
        registerFormContainer.classList.add("hidden");
        loginFormContainer.classList.remove("hidden");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Ошибка регистрации");
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        document.getElementById("profile-username").textContent =
          data.user.username;
        document.getElementById("profile-email").textContent = data.user.email;
        loginFormContainer.classList.add("hidden");
        profileContainer.classList.remove("hidden");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Ошибка входа");
    }
  });

  // Handle logout
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    profileContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
  });
});
