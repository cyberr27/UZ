window.chatSystem = window.chatSystem || {};
let webSocket = null;
let currentChatUserId = null;

// Функція для безпечної відправки повідомлень через WebSocket
function sendWhenReady(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  } else if (ws.readyState === WebSocket.CONNECTING) {
    const checkInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        clearInterval(checkInterval);
      }
    }, 100);
    setTimeout(() => clearInterval(checkInterval), 5000);
  } else {
    console.error("WebSocket не готовий для відправки:", ws.readyState);
  }
}

// Ініціалізація WebSocket для чату
window.chatSystem.initializeChat = function () {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Токен відсутній, чат недоступний");
    return;
  }

  // Встановлюємо з'єднання WebSocket
  webSocket = new WebSocket(`ws://${window.location.host}/ws?token=${token}`);

  webSocket.onopen = () => {
    console.log("WebSocket для чату підключено");
  };

  webSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "onlineUsers") {
      window.chatSystem.updateOnlineUsers(data.users);
    } else if (data.type === "chat") {
      window.chatSystem.handleChatMessage(data);
    }
  };

  webSocket.onclose = () => {
    console.log("WebSocket для чату відключено");
  };

  webSocket.onerror = (error) => {
    console.error("Помилка WebSocket:", error);
  };

  // Отримуємо елементи DOM для чату
  const chatBtn = document.getElementById("chat-btn");
  const chatContainer = document.getElementById("chat-container");
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");
  const sendChatBtn = document.getElementById("send-chat-btn");

  // Налаштування кнопки "Спілкування"
  chatBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isChatVisible = chatContainer.style.display === "flex";
    chatContainer.style.display = isChatVisible ? "none" : "flex";
    chatBtn.classList.toggle("active", !isChatVisible);
    if (!isChatVisible) chatInput.focus();
    else chatInput.blur();
  });

  // Закриття чату по клавіші Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chatContainer.style.display === "flex") {
      chatContainer.style.display = "none";
      chatBtn.classList.remove("active");
      chatInput.blur();
    }
  });

  // Відправка повідомлення по клавіші Enter
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && chatInput.value.trim() && currentChatUserId) {
      sendWhenReady(
        webSocket,
        JSON.stringify({
          type: "chat",
          toUserId: currentChatUserId,
          message: chatInput.value.trim(),
        })
      );
      // Додаємо своє повідомлення локально
      const messageEl = document.createElement("div");
      messageEl.textContent = `Ви: ${chatInput.value.trim()}`;
      messageEl.classList.add("chat-message", "self");
      chatMessages.appendChild(messageEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      chatInput.value = "";
    }
  });

  // Відправка повідомлення по натисканню кнопки "Надіслати"
  sendChatBtn.addEventListener("click", () => {
    if (chatInput.value.trim() && currentChatUserId) {
      sendWhenReady(
        webSocket,
        JSON.stringify({
          type: "chat",
          toUserId: currentChatUserId,
          message: chatInput.value.trim(),
        })
      );
      // Додаємо своє повідомлення локально
      const messageEl = document.createElement("div");
      messageEl.textContent = `Ви: ${chatInput.value.trim()}`;
      messageEl.classList.add("chat-message", "self");
      chatMessages.appendChild(messageEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      chatInput.value = "";
    }
  });
};

// Оновлення списку онлайн-користувачів
window.chatSystem.updateOnlineUsers = function (users) {
  const onlineUsersDiv = document.getElementById("online-users");
  onlineUsersDiv.innerHTML = "";
  users.forEach((user) => {
    if (user.id !== localStorage.getItem("workerId")) {
      // Виключаємо поточного користувача
      const userEl = document.createElement("div");
      userEl.classList.add("online-user");
      userEl.textContent = `${user.firstName || "Користувач"} ${
        user.lastName || ""
      } (ID: ${user.id})`;
      userEl.dataset.userId = user.id;
      if (user.id === currentChatUserId) {
        userEl.classList.add("active");
      }
      userEl.addEventListener("click", () => {
        // Очищаємо попередні повідомлення
        document.getElementById("chat-messages").innerHTML = "";
        currentChatUserId = user.id;
        // Оновлюємо активного користувача
        document.querySelectorAll(".online-user").forEach((el) => {
          el.classList.remove("active");
        });
        userEl.classList.add("active");
        // Запитуємо історію чату для цього користувача
        sendWhenReady(
          webSocket,
          JSON.stringify({
            type: "getChatHistory",
            toUserId: user.id,
          })
        );
      });
      onlineUsersDiv.appendChild(userEl);
    }
  });
};

// Обробка вхідних повідомлень чату
window.chatSystem.handleChatMessage = function (data) {
  const chatMessages = document.getElementById("chat-messages");
  const messageEl = document.createElement("div");
  messageEl.classList.add("chat-message");
  messageEl.textContent = `${data.fromFirstName || "Користувач"} ${
    data.fromLastName || ""
  } (ID: ${data.fromId}): ${data.message}`;
  if (data.fromId === currentChatUserId) {
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
};

// Функція для перевірки авторизації і отримання даних користувача
const checkAuth = async () => {
  const token = localStorage.getItem("token");
  const loginFormContainer = document.getElementById("login-form");
  const profileContainer = document.getElementById("profile");
  const profileEditContainer = document.getElementById(
    "profile-edit-container"
  );
  const body = document.body;

  if (!token) {
    loginFormContainer.classList.remove("hidden");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    body.classList.remove("profile-active");
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      // Оновлюємо дані профілю
      document.getElementById("profile-firstName").textContent =
        data.user.firstName || "Не вказано";
      document.getElementById("profile-lastName").textContent =
        data.user.lastName || "Не вказано";
      document.getElementById("profile-middleName").textContent =
        data.user.middleName || "Не вказано";
      document.getElementById("profile-position").textContent =
        data.user.position || "Не вказано";
      document.getElementById("profile-employeeId").textContent =
        data.user.employeeId || "Не вказано";
      document.getElementById("profile-workerId").textContent =
        data.user.workerId || "Не вказано";

      // Зберігаємо workerId для ідентифікації поточного користувача в чаті
      localStorage.setItem("workerId", data.user.workerId);

      // Оновлення фото профілю або заглушки
      const profilePhoto = document.getElementById("profile-photo");
      const placeholder = document.getElementById("profile-photo-placeholder");
      if (data.user.photo) {
        const photoUrl = `${data.user.photo}?t=${Date.now()}`;
        profilePhoto.src = photoUrl;
        profilePhoto.classList.remove("hidden");
        placeholder.classList.add("hidden");
        profilePhoto.onerror = () => {
          console.error(
            `Помилка завантаження зображення: ${photoUrl}. Перевірте, чи файл існує в /public/uploads/`
          );
          const initials = `${data.user.firstName?.charAt(0) || ""}${
            data.user.lastName?.charAt(0) || ""
          }`.toUpperCase();
          placeholder.textContent = initials || "НВ";
          placeholder.classList.remove("hidden");
          profilePhoto.classList.add("hidden");
        };
      } else {
        const initials = `${data.user.firstName?.charAt(0) || ""}${
          data.user.lastName?.charAt(0) || ""
        }`.toUpperCase();
        placeholder.textContent = initials || "НВ";
        placeholder.classList.remove("hidden");
        profilePhoto.classList.add("hidden");
      }

      // Заповнення форми редагування
      document.getElementById("edit-firstName").value =
        data.user.firstName || "";
      document.getElementById("edit-lastName").value = data.user.lastName || "";
      document.getElementById("edit-middleName").value =
        data.user.middleName || "";
      document.getElementById("edit-position").value = data.user.position || "";
      document.getElementById("edit-employeeId").value =
        data.user.employeeId || "";

      // Показуємо профіль або форму редагування
      if (
        !data.user.firstName &&
        !data.user.lastName &&
        !data.user.middleName &&
        !data.user.position &&
        !data.user.employeeId
      ) {
        loginFormContainer.classList.add("hidden");
        profileEditContainer.classList.remove("hidden");
        body.classList.add("profile-active");
      } else {
        loginFormContainer.classList.add("hidden");
        profileContainer.classList.remove("hidden");
        body.classList.add("profile-active");
        // Ініціалізуємо чат, коли користувач авторизований
        window.chatSystem.initializeChat();
      }
    } else {
      alert(data.error || "Помилка авторизації");
      localStorage.removeItem("token");
      loginFormContainer.classList.remove("hidden");
      profileContainer.classList.add("hidden");
      profileEditContainer.classList.add("hidden");
      body.classList.remove("profile-active");
    }
  } catch (error) {
    console.error("Помилка перевірки авторизації:", error);
    alert("Помилка перевірки авторизації: " + error.message);
    localStorage.removeItem("token");
    loginFormContainer.classList.remove("hidden");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    body.classList.remove("profile-active");
  }
};

// Викликаємо перевірку авторизації при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  const profileEditForm = document.getElementById("profile-edit");
  const loginFormContainer = document.getElementById("login-form");
  const registerFormContainer = document.getElementById("register-form");
  const profileEditContainer = document.getElementById(
    "profile-edit-container"
  );
  const profileContainer = document.getElementById("profile");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const logoutButton = document.getElementById("logout");
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const body = document.body;

  // Переключення між формами входу і реєстрації
  showRegister.addEventListener("click", () => {
    loginFormContainer.classList.add("hidden");
    registerFormContainer.classList.remove("hidden");
    body.classList.remove("profile-active");
  });

  showLogin.addEventListener("click", () => {
    registerFormContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    body.classList.remove("profile-active");
  });

  // Валідація email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Обробка реєстрації
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    if (!isValidEmail(email)) {
      alert("Будь ласка, введіть коректну електронну пошту");
      return;
    }
    if (password.length < 6) {
      alert("Пароль повинен містити не менше 6 символів");
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
        alert("Реєстрація успішна! Будь ласка, увійдіть.");
        registerFormContainer.classList.add("hidden");
        loginFormContainer.classList.remove("hidden");
        body.classList.remove("profile-active");
      } else {
        alert(data.error || "Помилка реєстрації");
      }
    } catch (error) {
      alert("Помилка реєстрації: " + error.message);
    }
  });

  // Обробка входу
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!isValidEmail(email)) {
      alert("Будь ласка, введіть коректну електронну пошту");
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
        document.getElementById("profile-firstName").textContent =
          data.user.firstName || "Не вказано";
        document.getElementById("profile-lastName").textContent =
          data.user.lastName || "Не вказано";
        document.getElementById("profile-middleName").textContent =
          data.user.middleName || "Не вказано";
        document.getElementById("profile-position").textContent =
          data.user.position || "Не вказано";
        document.getElementById("profile-employeeId").textContent =
          data.user.employeeId || "Не вказано";
        document.getElementById("profile-workerId").textContent =
          data.user.workerId || "Не вказано";

        // Зберігаємо workerId для ідентифікації в чаті
        localStorage.setItem("workerId", data.user.workerId);

        // Установка фото профілю або заглушки
        const profilePhoto = document.getElementById("profile-photo");
        const placeholder = document.getElementById(
          "profile-photo-placeholder"
        );
        if (data.user.photo) {
          const photoUrl = `${data.user.photo}?t=${Date.now()}`;
          profilePhoto.src = photoUrl;
          profilePhoto.classList.remove("hidden");
          placeholder.classList.add("hidden");
          profilePhoto.onerror = () => {
            console.error(
              `Помилка завантаження зображення: ${photoUrl}. Перевірте, чи файл існує в /public/uploads/`
            );
            const initials = `${data.user.firstName?.charAt(0) || ""}${
              data.user.lastName?.charAt(0) || ""
            }`.toUpperCase();
            placeholder.textContent = initials || "НВ";
            placeholder.classList.remove("hidden");
            profilePhoto.classList.add("hidden");
          };
        } else {
          const initials = `${data.user.firstName?.charAt(0) || ""}${
            data.user.lastName?.charAt(0) || ""
          }`.toUpperCase();
          placeholder.textContent = initials || "НВ";
          placeholder.classList.remove("hidden");
          profilePhoto.classList.add("hidden");
        }

        // Заповнення форми редагування
        document.getElementById("edit-firstName").value =
          data.user.firstName || "";
        document.getElementById("edit-lastName").value =
          data.user.lastName || "";
        document.getElementById("edit-middleName").value =
          data.user.middleName || "";
        document.getElementById("edit-position").value =
          data.user.position || "";
        document.getElementById("edit-employeeId").value =
          data.user.employeeId || "";

        if (
          !data.user.firstName &&
          !data.user.lastName &&
          !data.user.middleName &&
          !data.user.position &&
          !data.user.employeeId
        ) {
          loginFormContainer.classList.add("hidden");
          profileEditContainer.classList.remove("hidden");
          body.classList.add("profile-active");
        } else {
          loginFormContainer.classList.add("hidden");
          profileContainer.classList.remove("hidden");
          body.classList.add("profile-active");
          // Ініціалізуємо чат після успішного входу
          window.chatSystem.initializeChat();
        }
      } else {
        alert(data.error || "Помилка входу");
      }
    } catch (error) {
      alert("Помилка входу: " + error.message);
    }
  });

  // Обробка оновлення профілю
  profileEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("edit-firstName").value;
    const lastName = document.getElementById("edit-lastName").value;
    const middleName = document.getElementById("edit-middleName").value;
    const position = document.getElementById("edit-position").value;
    const employeeId = document.getElementById("edit-employeeId").value;
    const photoInput = document.getElementById("edit-photo");
    let photo = null;

    if (photoInput.files && photoInput.files[0]) {
      const formData = new FormData();
      formData.append("photo", photoInput.files[0]);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("Токен відсутній. Будь ласка, увійдіть знову.");
          return;
        }
        const uploadResponse = await fetch("/api/auth/upload-photo", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          photo = uploadData.photoUrl;
          photoInput.value = ""; // Сбрасываем поле файла
        } else {
          alert(uploadData.error || "Помилка завантаження фото");
          return;
        }
      } catch (error) {
        console.error("Помилка при завантаженні фото:", error);
        alert("Помилка завантаження фото: " + error.message);
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен відсутній. Будь ласка, увійдіть знову.");
        return;
      }
      const response = await fetch("/api/auth/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          middleName,
          position,
          employeeId,
          photo,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Профіль оновлено!");
        document.getElementById("profile-firstName").textContent =
          data.user.firstName || "Не вказано";
        document.getElementById("profile-lastName").textContent =
          data.user.lastName || "Не вказано";
        document.getElementById("profile-middleName").textContent =
          data.user.middleName || "Не вказано";
        document.getElementById("profile-position").textContent =
          data.user.position || "Не вказано";
        document.getElementById("profile-employeeId").textContent =
          data.user.employeeId || "Не вказано";
        document.getElementById("profile-workerId").textContent =
          data.user.workerId || "Не вказано";

        // Оновлення фото профілю або заглушки
        const profilePhoto = document.getElementById("profile-photo");
        const placeholder = document.getElementById(
          "profile-photo-placeholder"
        );
        if (data.user.photo) {
          const photoUrl = `${data.user.photo}?t=${Date.now()}`;
          profilePhoto.src = photoUrl;
          profilePhoto.classList.remove("hidden");
          placeholder.classList.add("hidden");
          profilePhoto.onerror = () => {
            console.error(
              `Помилка завантаження зображення: ${photoUrl}. Перевірте URL Cloudinary`
            );
            const initials = `${data.user.firstName?.charAt(0) || ""}${
              data.user.lastName?.charAt(0) || ""
            }`.toUpperCase();
            placeholder.textContent = initials || "НВ";
            placeholder.classList.remove("hidden");
            profilePhoto.classList.add("hidden");
          };
        } else {
          const initials = `${data.user.firstName?.charAt(0) || ""}${
            data.user.lastName?.charAt(0) || ""
          }`.toUpperCase();
          placeholder.textContent = initials || "НВ";
          placeholder.classList.remove("hidden");
          profilePhoto.classList.add("hidden");
        }

        profileEditContainer.classList.add("hidden");
        profileContainer.classList.remove("hidden");
        body.classList.add("profile-active");
      } else {
        alert(data.error || "Помилка оновлення профілю");
      }
    } catch (error) {
      console.error("Помилка при оновленні профілю:", error);
      alert("Помилка оновлення профілю: " + error.message);
    }
  });

  // Показ форми редагування профілю
  editProfileBtn.addEventListener("click", () => {
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.remove("hidden");
    body.classList.add("profile-active");
  });

  // Обробка виходу
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("workerId");
    if (webSocket) webSocket.close();
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    body.classList.remove("profile-active");
  });

  // Обробка кнопки "Повернутися"
  const backToProfileBtn = document.getElementById("back-to-profile");
  backToProfileBtn.addEventListener("click", () => {
    profileEditContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    body.classList.add("profile-active");
  });
});
