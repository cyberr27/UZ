document.addEventListener("DOMContentLoaded", () => {
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

        // Загрузка списка пользователей для чата
        await loadChatUsers(data.user.workerId);

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
          body.classList.add("profile-active");
        } else {
          loginFormContainer.classList.add("hidden");
          profileContainer.classList.remove("hidden");
          chatContainer.classList.add("hidden");
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

  // Функция для загрузки списка пользователей для чата
  const loadChatUsers = async (currentUserId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/chat/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const select = document.getElementById("chat-user-select");
        select.innerHTML = '<option value="">Оберіть користувача</option>';
        data.users.forEach((user) => {
          if (user.workerId !== currentUserId) {
            const option = document.createElement("option");
            option.value = user.workerId;
            option.textContent = `${user.firstName} ${user.lastName} (ID: ${user.workerId})`;
            select.appendChild(option);
          }
        });
      } else {
        alert(data.error || "Помилка завантаження користувачів");
      }
    } catch (error) {
      console.error("Помилка завантаження користувачів:", error);
      alert("Помилка: " + error.message);
    }
  };

  // Функция для загрузки сообщений чата
  const loadMessages = async (recipientId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/chat/messages?recipientId=${recipientId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        const chatMessages = document.getElementById("chat-messages");
        chatMessages.innerHTML = "";
        data.messages.forEach((message) => {
          const messageDiv = document.createElement("div");
          messageDiv.classList.add("message");
          const senderName = message.sender.firstName || "Користувач";
          const senderLastName = message.sender.lastName || "";
          const isSent = message.senderId === localStorage.getItem("userId");
          messageDiv.classList.add(isSent ? "sent" : "received");
          messageDiv.innerHTML = `
                  <p class="text-sm">${senderName} ${senderLastName} (${message.timestamp}):</p>
                  <p>${message.text}</p>
                `;
          chatMessages.appendChild(messageDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else {
        alert(data.error || "Помилка завантаження повідомлень");
      }
    } catch (error) {
      console.error("Помилка завантаження повідомлень:", error);
      alert("Помилка: " + error.message);
    }
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
  const backToProfileBtn = document.getElementById("back-to-profile");
  const chatBtn = document.getElementById("chat-btn");
  const backToProfileFromChatBtn = document.getElementById(
    "back-to-profile-from-chat"
  );
  const sendMessageBtn = document.getElementById("send-message-btn");
  const chatUserSelect = document.getElementById("chat-user-select");
  const body = document.body;

  // Переключение между формами входа и регистрации
  showRegister.addEventListener("click", () => {
    loginFormContainer.classList.add("hidden");
    registerFormContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    body.classList.remove("profile-active");
  });

  showLogin.addEventListener("click", () => {
    registerFormContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
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
        localStorage.setItem("userId", data.user.workerId);
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
          body.classList.add("profile-active");
        } else {
          loginFormContainer.classList.add("hidden");
          profileContainer.classList.remove("hidden");
          chatContainer.classList.add("hidden");
          body.classList.add("profile-active");
        }
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

  // Повернення до профілю з формы редагування
  backToProfileBtn.addEventListener("click", () => {
    profileEditContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

  // Показ чата
  chatBtn.addEventListener("click", () => {
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    body.classList.add("profile-active");
  });

  // Повернення до профілю з чата
  backToProfileFromChatBtn.addEventListener("click", () => {
    chatContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    profileEditContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

  // Выбор пользователя для чата
  chatUserSelect.addEventListener("change", (e) => {
    const recipientId = e.target.value;
    if (recipientId) {
      loadMessages(recipientId);
    } else {
      document.getElementById("chat-messages").innerHTML = "";
    }
  });

  // Отправка сообщения
  sendMessageBtn.addEventListener("click", async () => {
    const recipientId = chatUserSelect.value;
    const messageText = document
      .getElementById("chat-message-input")
      .value.trim();

    if (!recipientId) {
      alert("Будь ласка, оберіть користувача");
      return;
    }
    if (!messageText) {
      alert("Будь ласка, введіть повідомлення");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId,
          text: messageText,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        document.getElementById("chat-message-input").value = "";
        loadMessages(recipientId);
      } else {
        alert(data.error || "Помилка надсилання повідомлення");
      }
    } catch (error) {
      console.error("Помилка надсилання повідомлення:", error);
      alert("Помилка: " + error.message);
    }
  });

  // Обработка выхода
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    chatContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    body.classList.remove("profile-active");
  });
});
