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
    const privateMessagesContainer = document.getElementById(
      "private-messages-container"
    );
    const body = document.body;

    if (!token) {
      loginFormContainer.classList.remove("hidden");
      profileContainer.classList.add("hidden");
      profileEditContainer.classList.add("hidden");
      chatContainer.classList.add("hidden");
      privateMessagesContainer.classList.add("hidden");
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

        // Автоматическая генерация QR-кода
        if (data.user.workerId) {
          const qrContainer = document.getElementById("qr-code-container");
          qrContainer.innerHTML = "";
          const profileUrl = `${window.location.origin}/profile.html?workerId=${data.user.workerId}`;
          QRCode.toCanvas(
            profileUrl,
            { width: 100, margin: 2 },
            (error, canvas) => {
              if (error) {
                console.error("Ошибка генерации QR-кода:", error);
                alert("Помилка генерації QR-коду");
                return;
              }
              qrContainer.appendChild(canvas);
            }
          );
        }

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
          privateMessagesContainer.classList.add("hidden");
          profileContainer.classList.add("hidden");
          body.classList.add("profile-active");
        } else {
          loginFormContainer.classList.add("hidden");
          profileContainer.classList.remove("hidden");
          chatContainer.classList.add("hidden");
          privateMessagesContainer.classList.add("hidden");
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
        privateMessagesContainer.classList.add("hidden");
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
      privateMessagesContainer.classList.add("hidden");
      body.classList.remove("profile-active");
    }
  };

  // Функция для скачивания QR-кода
  const downloadQRCode = () => {
    const qrContainer = document.getElementById("qr-code-container");
    const qrCanvas = qrContainer.querySelector("canvas");
    if (qrCanvas) {
      const link = document.createElement("a");
      link.href = qrCanvas.toDataURL("image/png");
      link.download = `qr-code-${currentUser?.workerId || "profile"}.png`;
      link.click();
    } else {
      alert("QR-код не сгенерирован");
    }
  };

  // Инициализация WebSocket
  const initWebSocket = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    ws = new WebSocket(`wss://${window.location.host}/ws?token=${token}`);

    ws.onopen = () => {
      console.log("WebSocket подключен");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        displayMessage(data);
      } else if (data.type === "private_message") {
        displayPrivateMessage(data);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket отключен");
    };

    ws.onerror = (error) => {
      console.error("WebSocket ошибка:", error);
    };
  };

  // Функция для открытия профиля пользователя в новой вкладке
  const openUserProfileInNewTab = (workerId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен відсутній. Будь ласка, увійдіть знову.");
        return;
      }
      const profileUrl = `/profile.html?workerId=${workerId}&token=${token}`;
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
    const isSent = data.senderId === currentUser?.workerId;
    messageDiv.classList.add(isSent ? "sent" : "received");

    const senderNameSpan = document.createElement("span");
    senderNameSpan.classList.add("chat-username");
    senderNameSpan.textContent = data.senderName || "Анонім";
    senderNameSpan.style.cursor = "pointer";
    senderNameSpan.title = "Натисніть, щоб переглянути профіль";

    senderNameSpan.addEventListener("click", () => {
      openUserProfileInNewTab(data.senderId);
    });

    messageDiv.appendChild(senderNameSpan);
    const messageText = document.createElement("span");
    messageText.textContent = `: ${data.message}`;
    messageDiv.appendChild(messageText);

    const timestamp = document.createElement("div");
    timestamp.style.fontSize = "0.75rem";
    timestamp.style.color = "#6b7280";
    timestamp.style.marginTop = "2px";
    timestamp.textContent = new Date(data.timestamp).toLocaleString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    messageDiv.appendChild(timestamp);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  // Отображение приватного сообщения
  const displayPrivateMessage = (data) => {
    const privateMessages = document.getElementById("private-messages");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("private-message");
    const isSent = data.senderId === currentUser?.workerId;
    messageDiv.classList.add(isSent ? "sent" : "received");

    const senderNameSpan = document.createElement("span");
    senderNameSpan.classList.add("private-username");
    senderNameSpan.textContent = data.senderName || "Анонім";
    senderNameSpan.style.cursor = "pointer";
    senderNameSpan.title = "Натисніть, щоб переглянути профіль";

    senderNameSpan.addEventListener("click", () => {
      openUserProfileInNewTab(data.senderId);
    });

    messageDiv.appendChild(senderNameSpan);
    const messageText = document.createElement("span");
    messageText.textContent = `: ${data.message}`;
    messageDiv.appendChild(messageText);

    const timestamp = document.createElement("div");
    timestamp.style.fontSize = "0.75rem";
    timestamp.style.color = "#6b7280";
    timestamp.style.marginTop = "2px";
    timestamp.textContent = new Date(data.timestamp).toLocaleString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    messageDiv.appendChild(timestamp);

    privateMessages.appendChild(messageDiv);
    privateMessages.scrollTop = privateMessages.scrollHeight;
  };

  // Загрузка приватных сообщений
  const loadPrivateMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен відсутній. Будь ласка, увійдіть знову.");
        return;
      }

      const response = await fetch("/api/messages/private", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const privateMessages = document.getElementById("private-messages");
        privateMessages.innerHTML = "";
        data.messages.forEach((msg) => {
          displayPrivateMessage({
            type: "private_message",
            senderId: msg.senderId,
            senderName: msg.senderName,
            message: msg.message,
            timestamp: msg.timestamp,
          });
        });
      } else {
        alert(data.error || "Помилка завантаження приватних повідомлень");
      }
    } catch (error) {
      console.error("Помилка завантаження приватних повідомлень:", error);
      alert("Помилка завантаження приватних повідомлень: " + error.message);
    }
  };

  // Функция для генерации QR-кода
  const generateQRCode = () => {
    if (!currentUser?.workerId) {
      alert("ID користувача недоступний. Спробуйте увійти знову.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Токен недоступний. Спробуйте увійти знову.");
      return;
    }
    const qrContainer = document.getElementById("qr-code-container");
    qrContainer.innerHTML = "";
    const profileUrl = `${window.location.origin}/profile.html?workerId=${
      currentUser.workerId
    }&token=${encodeURIComponent(token)}`;
    QRCode.toCanvas(profileUrl, { width: 200, margin: 2 }, (error, canvas) => {
      if (error) {
        console.error("Ошибка генерации QR-кода:", error);
        alert("Помилка генерації QR-коду");
        return;
      }
      qrContainer.appendChild(canvas);
    });
  };

  // Обновление QR-кода в checkAuth
  if (data.user.workerId) {
    const qrContainer = document.getElementById("qr-code-container");
    qrContainer.innerHTML = "";
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Токен недоступний. Спробуйте увійти знову.");
      return;
    }
    const profileUrl = `${window.location.origin}/profile.html?workerId=${
      data.user.workerId
    }&token=${encodeURIComponent(token)}`;
    QRCode.toCanvas(profileUrl, { width: 100, margin: 2 }, (error, canvas) => {
      if (error) {
        console.error("Ошибка генерации QR-кода:", error);
        alert("Помилка генерації QR-коду");
        return;
      }
      qrContainer.appendChild(canvas);
    });
  }

  // Вызываем проверку авторизации при загрузке страницы
  checkAuth();

  // Обработчики событий
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
  const privateMessagesContainer = document.getElementById(
    "private-messages-container"
  );
  const showRegister = document.getElementById("show-register");
  const showLogin = document.getElementById("show-login");
  const logoutButton = document.getElementById("logout");
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const downloadQrBtn = document.getElementById("download-qr-btn");
  const chatBtn = document.getElementById("chat-btn");
  const privateMessagesBtn = document.getElementById("private-messages-btn");
  const sendChatBtn = document.getElementById("send-chat");
  const chatInput = document.getElementById("chat-input");
  const backToProfileFromChat = document.getElementById(
    "back-to-profile-from-chat"
  );
  const backToProfileFromPrivate = document.getElementById(
    "back-to-profile-from-private"
  );
  const body = document.body;

  // Переключение между формами входа и регистрации
  showRegister.addEventListener("click", () => {
    loginFormContainer.classList.add("hidden");
    registerFormContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    profileContainer.classList.add("hidden");
    body.classList.remove("profile-active");
  });

  showLogin.addEventListener("click", () => {
    registerFormContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
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
        privateMessagesContainer.classList.add("hidden");
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
          privateMessagesContainer.classList.add("hidden");
          profileContainer.classList.add("hidden");
          body.classList.add("profile-active");
        } else {
          loginFormContainer.classList.add("hidden");
          profileContainer.classList.remove("hidden");
          chatContainer.classList.add("hidden");
          privateMessagesContainer.classList.add("hidden");
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
        privateMessagesContainer.classList.add("hidden");
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
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

  // Показ чата
  chatBtn.addEventListener("click", () => {
    profileContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    profileEditContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocket();
    }
  });

  // Показ приватных сообщений
  privateMessagesBtn.addEventListener("click", () => {
    profileContainer.classList.add("hidden");
    chatContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    privateMessagesContainer.classList.remove("hidden");
    body.classList.add("profile-active");
    loadPrivateMessages();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocket();
    }
  });

  // Возврат из чата в профиль
  backToProfileFromChat.addEventListener("click", () => {
    chatContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    profileEditContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

  // Возврат из приватных сообщений в чат
  backToProfileFromPrivate.addEventListener("click", () => {
    privateMessagesContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    body.classList.add("profile-active");
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocket();
    }
  });

  // Отправка сообщения
  sendChatBtn.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (message && ws && ws.readyState === WebSocket.OPEN) {
      // Проверяем, является ли сообщение приватным (начинается с ">ID")
      const privateMessageMatch = message.match(/^>(\d+)\s+(.+)/);
      if (privateMessageMatch) {
        const recipientId = parseInt(privateMessageMatch[1]);
        const messageText = privateMessageMatch[2];
        const data = {
          type: "private_message",
          message: messageText,
          senderId: currentUser.workerId,
          senderName:
            `${currentUser.firstName || ""} ${
              currentUser.lastName || ""
            }`.trim() || "Анонім",
          recipientId: recipientId,
          timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(data));
      } else {
        const data = {
          type: "message",
          message: message,
          senderId: currentUser.workerId,
          senderName:
            `${currentUser.firstName || ""} ${
              currentUser.lastName || ""
            }`.trim() || "Анонім",
          timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(data));
      }
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
    privateMessagesContainer.classList.add("hidden");
    loginFormContainer.classList.remove("hidden");
    body.classList.remove("profile-active");
  });

  // Обработка кнопки "Повернутися" из формы редактирования
  const backToProfileBtn = document.getElementById("back-to-profile");
  backToProfileBtn.addEventListener("click", () => {
    profileEditContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

  if (downloadQrBtn) {
    downloadQrBtn.addEventListener("click", downloadQRCode);
  }
});
