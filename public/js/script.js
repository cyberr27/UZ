document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  const profileEditForm = document.getElementById("profile-edit");
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

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle registration
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    // Client-side validation
    if (!isValidEmail(email)) {
      alert("Пожалуйста, введите корректный email");
      return;
    }
    if (password.length < 6) {
      alert("Пароль должен быть не короче 6 символов");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Регистрация успешна! Пожалуйста, войдите.");
        registerFormContainer.classList.add("hidden");
        loginFormContainer.classList.remove("hidden");
      } else {
        alert(data.error || "Ошибка регистрации");
      }
    } catch (error) {
      alert("Ошибка регистрации: " + error.message);
    }
  });

  // Handle login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!isValidEmail(email)) {
      alert("Пожалуйста, введите корректный email");
      return;
    }

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
          data.user.username || "Не указано";
        document.getElementById("profile-email").textContent = data.user.email;
        document.getElementById("profile-firstName").textContent =
          data.user.firstName || "Не указано";
        document.getElementById("profile-lastName").textContent =
          data.user.lastName || "Не указано";
        document.getElementById("profile-middleName").textContent =
          data.user.middleName || "Не указано";
        // Populate edit form
        document.getElementById("edit-username").value =
          data.user.username || "";
        document.getElementById("edit-firstName").value =
          data.user.firstName || "";
        document.getElementById("edit-lastName").value =
          data.user.lastName || "";
        document.getElementById("edit-middleName").value =
          data.user.middleName || "";
        loginFormContainer.classList.add("hidden");
        profileContainer.classList.remove("hidden");
      } else {
        alert(data.error || "Ошибка входа");
      }
    } catch (error) {
      alert("Ошибка входа: " + error.message);
    }
  });

  // Handle profile update
  profileEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("edit-username").value;
    const firstName = document.getElementById("edit-firstName").value;
    const lastName = document.getElementById("edit-lastName").value;
    const middleName = document.getElementById("edit-middleName").value;

    // Client-side validation for username
    if (username && username.length < 3) {
      alert("Имя пользователя должно быть не короче 3 символов");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, firstName, lastName, middleName }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Профиль обновлен!");
        document.getElementById("profile-username").textContent =
          data.user.username || "Не указано";
        document.getElementById("profile-firstName").textContent =
          data.user.firstName || "Не указано";
        document.getElementById("profile-lastName").textContent =
          data.user.lastName || "Не указано";
        document.getElementById("profile-middleName").textContent =
          data.user.middleName || "Не указано";
      } else {
        alert(data.error || "Ошибка обновления профиля");
      }
    } catch (error) {
      alert("Ошибка обновления профиля: " + error.message);
    }
  });

  // Handle logout
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    profileContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
  });
});
