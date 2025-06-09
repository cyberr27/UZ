document.addEventListener("DOMContentLoaded", () => {
  let ws = null;
  let currentUser = null;

  // Функция для проверки авторизации и получения данных пользователя
  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    const loginFormContainer = document.getElementById("login-form");
    const profileContainer = document.getElementById("profile");
    const profileEditContainer = document.getElementById(
      "profile-edit-container"
    );
    const chatContainer = document.getElementById("chat-container");
    const body = document.body;

    if (!token) {
      loginFormContainer.classList.remove("hidden");
      profileContainer.classList.add("hidden");
      profileEditContainer.classList.add("hidden");
      chatContainer.classList.add("hidden");
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
        currentUser = data.user;
        // Обновляем данные профиля
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

        // Обновление фото профиля или заглушки
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

        // Заполнение формы редактирования
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

        // Показываем профиль или форму редактирования
        if (
          !data.user.firstName &&
          !data.user.lastName &&
          !data.user.middleName &&
          !data.user.position &&
          !data.user.employeeId
        ) {
          loginFormContainer.classList.add("hidden");
          profileEditContainer.classList.remove("hidden");
          chatContainer.classList.add("hidden");
          profileContainer.classList.add("hidden");
          body.classList.add("profile-active");
        } else {
          loginFormContainer.classList.add("hidden");
          profileContainer.classList.remove("hidden");
          chatContainer.classList.add("hidden");
          profileEditContainer.classList.add("hidden");
          body.classList.add("profile-active");
        }
      } else {
        alert(data.error || "Помилка авторизації");
        localStorage.removeItem("token");
        loginFormContainer.classList.remove("hidden");
        profileContainer.classList.add("hidden");
        profileEditContainer.classList.add("hidden");
        chatContainer.classList.add("hidden");
        body.classList.remove("profile-active");
      }
    } catch (error) {
      console.error("Помилка перевірки авторизації:", error);
      alert("Помилка перевірки авторизації: " + error.message);
      localStorage.removeItem("token");
      loginFormContainer.classList.remove("hidden");
      profileContainer.classList.add("hidden");
      profileEditContainer.classList.add("hidden");
      chatContainer.classList.add("hidden");
      body.classList.remove("profile-active");
    }
  };

  // Инициализация WebSocket
  const initWebSocket = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Подключаемся к WebSocket с токеном для аутентификации
    ws = new WebSocket(`wss://${window.location.host}/ws?token=${token}`);

    ws.onopen = () => {
      console.log("WebSocket подключен");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        displayMessage(data);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket отключен");
    };

    ws.onerror = (error) => {
      console.error("WebSocket ошибка:", error);
    };
  };

  // Функция для получения данных пользователя по workerId
  const fetchUserProfile = async (workerId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/auth/user/${workerId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        return data.user;
      } else {
        alert(data.error || "Помилка завантаження профілю");
        return null;
      }
    } catch (error) {
      console.error("Помилка завантаження профілю:", error);
      alert("Помилка завантаження профілю: " + error.message);
      return null;
    }
  };

  // Функция для открытия профиля пользователя в новой вкладке
  const openUserProfileInNewTab = async (workerId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен відсутній. Будь ласка, увійдіть знову.");
        return;
      }
      // Формируем URL для страницы профиля пользователя
      const profileUrl = `/profile?workerId=${workerId}&token=${token}`;
      // Открываем новую вкладку
      const newWindow = window.open(profileUrl, "_blank");
      if (!newWindow) {
        alert(
          "Дозвольте спливаючі вікна у вашому браузері для перегляду профілю."
        );
      }
    } catch (error) {
      console.error("Помилка при відкритті профілю:", error);
      alert("Помилка при відкритті профілю: " + error.message);
    }
  };

  // Отображение сообщения в чате
  const displayMessage = (data) => {
    const chatMessages = document.getElementById("chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message");
    const isSent = data.senderId === currentUser.workerId;
    messageDiv.classList.add(isSent ? "sent" : "received");
    const senderNameSpan = document.createElement("span");
    senderNameSpan.classList.add("chat-username");
    senderNameSpan.textContent = data.senderName || "Анонім";
    // Открываем профиль в новой вкладке при клике на имя
    senderNameSpan.onclick = () => openUserProfileInNewTab(data.senderId);
    messageDiv.appendChild(senderNameSpan);
    messageDiv.innerHTML += `: ${data.message}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  // Вызываем проверку авторизации при загрузке страницы
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
  const chatContainer = document.getElementById("chat-container");
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const logoutButton = document.getElementById("logout");
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const chatBtn = document.getElementById("chat-btn");
  const sendChatBtn = document.getElementById("send-chat");
  const chatInput = document.getElementById("chat-input");
  const backToProfileFromChat = document.getElementById(
    "back-to-profile-from-chat"
  );
  const body = document.body;

  // Переключение между формами входа и регистрации
  showRegister.addEventListener("click", () => {
    loginFormContainer.classList.add("hidden");
    registerFormContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    profileContainer.classList.add("hidden");
    body.classList.remove("profile-active");
  });

  showLogin.addEventListener("click", () => {
    registerFormContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    profileContainer.classList.add("hidden");
    body.classList.remove("profile-active");
  });

  // Валидация email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Обработка регистрации
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
        chatContainer.classList.add("hidden");
        profileContainer.classList.add("hidden");
        body.classList.remove("profile-active");
      } else {
        alert(data.error || "Помилка реєстрації");
      }
    } catch (error) {
      alert("Помилка реєстрації: " + error.message);
    }
  });

  // Обработка входа
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
        currentUser = data.user;
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

        // Установка фото профиля или заглушки
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

        // Заполнение формы редактирования
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
          chatContainer.classList.add("hidden");
          profileContainer.classList.add("hidden");
          body.classList.add("profile-active");
        } else {
          loginFormContainer.classList.add("hidden");
          profileContainer.classList.remove("hidden");
          chatContainer.classList.add("hidden");
          profileEditContainer.classList.add("hidden");
          body.classList.add("profile-active");
        }
        initWebSocket();
      } else {
        alert(data.error || "Помилка входу");
      }
    } catch (error) {
      alert("Помилка входу: " + error.message);
    }
  });

  // Обработка обновления профиля
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
          photoInput.value = "";
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
        currentUser = data.user;
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

        // Обновление фото профиля или заглушки
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
        chatContainer.classList.add("hidden");
        body.classList.add("profile-active");
      } else {
        alert(data.error || "Помилка оновлення профілю");
      }
    } catch (error) {
      console.error("Помилка при оновленні профілю:", error);
      alert("Помилка оновлення профілю: " + error.message);
    }
  });

  // Показ формы редактирования профиля
  editProfileBtn.addEventListener("click", () => {
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

  // Показ чата
  chatBtn.addEventListener("click", () => {
    profileContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    profileEditContainer.classList.add("hidden");
    body.classList.add("profile-active");
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocket();
    }
  });

  // Возврат из чата в профиль
  backToProfileFromChat.addEventListener("click", () => {
    chatContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    profileEditContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

  // Отправка сообщения
  sendChatBtn.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (message && ws && ws.readyState === WebSocket.OPEN) {
      const data = {
        type: "message",
        message: message,
        senderId: currentUser.workerId,
        senderName:
          `${currentUser.firstName || ""} ${
            currentUser.lastName || ""
          }`.trim() || "Анонім",
      };
      ws.send(JSON.stringify(data));
      chatInput.value = "";
    }
  });

  // Отправка сообщения по Enter
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendChatBtn.click();
    }
  });

  // Обработка выхода
  logoutButton.addEventListener("click", () => {
    if (ws) {
      ws.close();
    }
    localStorage.removeItem("token");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    chatContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    body.classList.remove("profile-active");
  });

  // Обработка кнопки "Повернутися" из формы редактирования
  const backToProfileBtn = document.getElementById("back-to-profile");
  backToProfileBtn.addEventListener("click", () => {
    profileEditContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });
});
