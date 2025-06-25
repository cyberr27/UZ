document.addEventListener("DOMContentLoaded", () => {
  let ws = null;
  let currentUser = null;
  let currentTopicId = null;
  const topicMessagesCache = new Map();

  // Функция генерации QR-кода
  const generateQRCode = () => {
    if (!currentUser?.workerId) {
      console.error("ID пользователя недоступен");
      alert("ID користувача недоступний. Спробуйте увійти знову.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Токен недоступен");
      alert("Токен недоступний. Спробуйте увійти знову.");
      return;
    }
    const qrContainer = document.getElementById("qr-code-container");
    if (!qrContainer) {
      console.error("Контейнер для QR-кода не найден");
      alert("Помилка: контейнер для QR-коду не знайдено");
      return;
    }
    qrContainer.innerHTML = ""; // Очищаем контейнер перед генерацией
    const profileUrl = `${window.location.origin}/profile.html?workerId=${
      currentUser.workerId
    }&token=${encodeURIComponent(token)}`;
    QRCode.toCanvas(profileUrl, { width: 100, margin: 2 }, (error, canvas) => {
      if (error) {
        console.error("Ошибка генерации QR-кода:", error);
        alert("Помилка генерації QR-коду");
        return;
      }
      qrContainer.appendChild(canvas);
    });
  };

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
        document.getElementById("like-count").textContent =
          data.user.likesCount || 0;

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
            console.error(`Помилка завантаження зображення: ${photoUrl}`);
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

        if (data.user.backgroundPhoto) {
          document.body.style.backgroundImage = `url('${
            data.user.backgroundPhoto
          }?t=${Date.now()}')`;
        } else {
          document.body.style.background = `white`; // Фон по умолчанию
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

        // Проверка текущей оценки пользователя
        const likeBtn = document.getElementById("like-btn");
        const dislikeBtn = document.getElementById("dislike-btn");
        likeBtn.disabled = true;
        dislikeBtn.disabled = true;

        // Показываем профиль или форму редактирования в зависимости от данных
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
          // Генерируем QR-код после отображения профиля
          setTimeout(generateQRCode, 0); // Вызываем в следующем цикле событий
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

  const downloadQRCode = () => {
    const qrContainer = document.getElementById("qr-code-container");
    const qrCanvas = qrContainer.querySelector("canvas");
    if (qrCanvas) {
      const link = document.createElement("a");
      link.href = qrCanvas.toDataURL("image/png");
      link.download = `qr-code-${currentUser?.workerId || "profile"}.png`;
      link.click();
    } else {
      console.error("QR-код не сгенерирован");
      alert("QR-код не сгенерирован");
      generateQRCode(); // Попытка повторной генерации
    }
  };

  const initWebSocket = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    ws = new WebSocket(`wss://${window.location.host}/ws?token=${token}`);

    ws.onopen = () => {
      console.log("WebSocket подключен");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          displayMessage(data);
        } else if (data.type === "private_message") {
          displayPrivateMessage(data);
        } else if (
          data.type === "topic_message" &&
          data.topicId === currentTopicId
        ) {
          // Проверяем, не существует ли сообщение в кэше
          const existingMessages = topicMessagesCache.get(data.topicId) || [];
          if (
            !existingMessages.some((msg) => msg.messageId === data.messageId)
          ) {
            displayTopicMessage(data);
          } else {
            console.log(
              `Игнорируется дублирующееся WebSocket сообщение ${data.messageId} для темы ${data.topicId}`
            );
          }
          // Уведомление о новых сообщениях
          if (
            document
              .getElementById("topic-chat-container")
              .classList.contains("hidden")
          ) {
            document.getElementById("chat-btn").textContent =
              "Спілкування (Нові повідомлення)";
            document
              .getElementById("chat-btn")
              .classList.add("bg-red-500", "hover:bg-red-600");
            document
              .getElementById("chat-btn")
              .classList.remove("bg-purple-500", "hover:bg-purple-600");
          }
        } else if (data.type === "error") {
          alert(data.message);
        }
      } catch (error) {
        console.error("Ошибка обработки WebSocket сообщения:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket отключен");
      setTimeout(initWebSocket, 5000); // Переподключение через 5 секунд
    };

    ws.onerror = (error) => {
      console.error("WebSocket ошибка:", error);
    };
  };

  const subscribeToTopic = (topicId) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "subscribe_topic",
          topicId: topicId,
        })
      );
    }
  };

  const unsubscribeFromTopic = (topicId) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "unsubscribe_topic",
          topicId: topicId,
        })
      );
    }
  };

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

  const loadTopics = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен отсутствует. Пожалуйста, войдите снова.");
        return;
      }

      const response = await fetch("/api/topics?page=1&limit=10", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const topicsList = document.getElementById("topics-list");
        topicsList.innerHTML = "";
        data.topics.forEach((topic) => {
          const topicDiv = document.createElement("div");
          topicDiv.classList.add("topic-item");
          if (topic.isClosed) topicDiv.classList.add("closed");

          const titleSpan = document.createElement("div");
          titleSpan.classList.add("title");
          titleSpan.textContent = topic.title;
          topicDiv.appendChild(titleSpan);

          const creatorSpan = document.createElement("div");
          creatorSpan.classList.add("creator");
          creatorSpan.textContent = `Создатель: ${topic.creatorName}`;
          topicDiv.appendChild(creatorSpan);

          const usersSpan = document.createElement("div");
          usersSpan.classList.add("users");
          usersSpan.textContent = `Участников: ${topic.uniqueUsersCount}`;
          topicDiv.appendChild(usersSpan);

          const messagesSpan = document.createElement("div");
          messagesSpan.classList.add("messages");
          messagesSpan.textContent = `Сообщений: ${topic.messageCount}`;
          topicDiv.appendChild(messagesSpan);

          if (!topic.isClosed) {
            topicDiv.addEventListener("click", () => {
              openTopicChat(topic._id, topic.title);
            });
          }

          topicsList.appendChild(topicDiv);
        });
      } else {
        alert(data.error || "Ошибка загрузки тем");
      }
    } catch (error) {
      console.error("Ошибка загрузки тем:", error);
      alert("Ошибка загрузки тем: " + error.message);
    }
  };

  const openTopicChat = async (topicId, title) => {
    console.log(`Открытие чата темы: topicId=${topicId}, title=${title}`);
    if (currentTopicId) {
      unsubscribeFromTopic(currentTopicId);
    }
    currentTopicId = topicId;
    subscribeToTopic(topicId);
    const topicChatTitle = document.getElementById("topic-chat-title");
    if (topicChatTitle) {
      topicChatTitle.textContent = title;
    } else {
      console.error("Элемент topic-chat-title не найден");
    }
    document.getElementById("chat-container").classList.add("hidden");
    document.getElementById("topic-chat-container").classList.remove("hidden");
    document.getElementById("create-topic-container").classList.add("hidden");
    document.getElementById("profile")?.classList.add("hidden");
    document.getElementById("profile-edit-container").classList.add("hidden");
    document
      .getElementById("private-messages-container")
      .classList.add("hidden");
    document.body.classList.add("profile-active");

    // Загружаем сообщения
    await loadTopicMessages(topicId, 1);

    // Сбрасываем уведомления о новых сообщениях
    document.getElementById("chat-btn").textContent = "Спілкування";
    document
      .getElementById("chat-btn")
      .classList.remove("bg-red-500", "hover:bg-red-600");
    document
      .getElementById("chat-btn")
      .classList.add("bg-purple-500", "hover:bg-purple-600");
  };

  const loadTopicMessages = async (topicId, append = false) => {
    const topicMessages = document.getElementById("topic-messages");

    if (!topicMessages) {
      console.error("Контейнер topic-messages не найден");
      alert("Ошибка: контейнер для сообщений темы не найден");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен отсутствует. Пожалуйста, войдите снова.");
        localStorage.removeItem("token");
        showLoginPage();
        return;
      }

      const response = await fetch(`/api/topics/${topicId}/messages`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        alert("Сессия завершена. Пожалуйста, войдите снова.");
        localStorage.removeItem("token");
        showLoginPage();
        return;
      }

      const data = await response.json();
      if (response.ok) {
        // Очищаем контейнер только если это первая загрузка
        const existingMessages = topicMessagesCache.get(topicId) || [];
        if (!append) {
          topicMessages.innerHTML = "";
        }

        if (data.messages.length === 0 && existingMessages.length === 0) {
          const noMessagesDiv = document.createElement("div");
          noMessagesDiv.textContent = "Сообщений в этой теме пока нет.";
          noMessagesDiv.style.color = "#666";
          noMessagesDiv.style.textAlign = "center";
          noMessagesDiv.style.padding = "10px";
          topicMessages.appendChild(noMessagesDiv);
          console.log(`Нет сообщений для темы ${topicId}`);
          return;
        }

        // Фильтруем новые сообщения, чтобы избежать дубликатов
        const newMessages = data.messages.map((msg) => ({
          ...msg,
          messageId: msg._id,
        }));

        const uniqueNewMessages = newMessages.filter(
          (newMsg) =>
            !existingMessages.some(
              (existingMsg) => existingMsg.messageId === newMsg.messageId
            )
        );

        // Обновляем кэш
        topicMessagesCache.set(
          topicId,
          append
            ? [...existingMessages, ...uniqueNewMessages]
            : uniqueNewMessages
        );

        // Отображаем сообщения из кэша
        const allMessages = topicMessagesCache.get(topicId);
        if (!append) {
          topicMessages.innerHTML = "";
        }

        allMessages.forEach((msg) => {
          displayTopicMessage({
            type: "topic_message",
            topicId: msg.topicId,
            messageId: msg.messageId,
            senderId: msg.senderId,
            senderName: msg.senderName,
            message: msg.message,
            timestamp: msg.timestamp,
          });
        });

        // Прокручиваем к последнему сообщению
        topicMessages.scrollTop = topicMessages.scrollHeight;

        console.log(
          `Загружено ${uniqueNewMessages.length} сообщений для темы ${topicId}, всего в кэше: ${allMessages.length}`
        );
      } else {
        alert(data.error || "Ошибка загрузки сообщений");
      }
    } catch (error) {
      console.error("Ошибка загрузки сообщений:", error);
      alert("Ошибка загрузки: " + error.message);
    }
  };

  const displayTopicMessage = (data) => {
    if (data.topicId !== currentTopicId) {
      console.log(
        `Игнорирование сообщения для topicId ${data.topicId}, текущий topicId: ${currentTopicId}`
      );
      return;
    }

    const topicMessages = document.getElementById("topic-messages");
    if (!topicMessages) {
      console.error("Контейнер topic-messages не найден");
      alert("Ошибка: контейнер для сообщений темы не найден");
      return;
    }

    const messageId = data.messageId;
    if (!messageId) {
      console.warn(`Сообщение без messageId в теме ${data.topicId}`);
      return;
    }

    // Проверяем, не отображено ли сообщение
    if (topicMessages.querySelector(`[data-message-id="${messageId}"]`)) {
      console.log(
        `Сообщение ${messageId} уже отображено в теме ${data.topicId}`
      );
      return;
    }

    const existingMessages = topicMessagesCache.get(data.topicId) || [];
    const isDuplicate = existingMessages.some(
      (msg) => msg.messageId === messageId
    );

    if (isDuplicate) {
      console.log(
        `Дублирующееся сообщение ${messageId} в теме ${data.topicId}`
      );
      return;
    }

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("topic-message");
    messageDiv.setAttribute("data-message-id", messageId); // Добавляем атрибут для идентификации
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

    topicMessages.appendChild(messageDiv);
    topicMessages.scrollTop = topicMessages.scrollHeight;

    // Сохраняем сообщение в кэш
    existingMessages.push({ ...data, messageId });
    topicMessagesCache.set(data.topicId, existingMessages);

    console.log(`Добавлено сообщение ${messageId} в теме ${data.topicId}`);
  };

  const showLoginPage = () => {
    document.getElementById("login-form").classList.remove("hidden");
    document.getElementById("profile").classList.add("hidden");
    document.getElementById("profile-edit-container").classList.add("hidden");
    document.getElementById("chat-container").classList.add("hidden");
    document
      .getElementById("private-messages-container")
      .classList.add("hidden");
    document.getElementById("create-topic-container").classList.add("hidden");
    document.getElementById("topic-chat-container").classList.add("hidden");
    document.body.classList.remove("profile-active");
  };

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
  const createTopicBtn = document.getElementById("create-topic-btn");
  const createTopicContainer = document.getElementById(
    "create-topic-container"
  );
  const submitTopic = document.getElementById("submit-topic");
  const topicTitleInput = document.getElementById("topic-title");
  const backToChatFromCreateTopic = document.getElementById(
    "back-to-chat-from-create-topic"
  );
  const sendTopicChatBtn = document.getElementById("send-topic-chat");
  const topicChatInput = document.getElementById("topic-chat-input");
  const backToChatFromTopic = document.getElementById(
    "back-to-chat-from-topic"
  );
  const topicChatContainer = document.getElementById("topic-chat-container");
  const body = document.body;

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

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
        document.getElementById("like-count").textContent =
          data.user.likesCount || 0;

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
            console.error(`Помилка завантаження зображення: ${photoUrl}`);
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
          setTimeout(generateQRCode, 0); // Генерируем QR-код после отображения профиля
        }
        initWebSocket();
      } else {
        alert(data.error || "Помилка входу");
      }
    } catch (error) {
      alert("Помилка входу: " + error.message);
    }
  });

  profileEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = document.getElementById("edit-firstName").value;
    const lastName = document.getElementById("edit-lastName").value;
    const middleName = document.getElementById("edit-middleName").value;
    const position = document.getElementById("edit-position").value;
    const employeeId = document.getElementById("edit-employeeId").value;
    const photoInput = document.getElementById("edit-photo");
    const backgroundPhotoInput = document.getElementById(
      "edit-background-photo"
    );
    let photo = null;
    let backgroundPhoto = null;

    // Загрузка фото профиля
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

    // Загрузка фонового изображения
    if (backgroundPhotoInput.files && backgroundPhotoInput.files[0]) {
      const formData = new FormData();
      formData.append("backgroundPhoto", backgroundPhotoInput.files[0]);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("Токен відсутній. Будь ласка, увійдіть знову.");
          return;
        }
        const uploadResponse = await fetch(
          "/api/auth/upload-background-photo",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );
        const uploadData = await uploadResponse.json();
        if (uploadResponse.ok) {
          backgroundPhoto = uploadData.backgroundPhotoUrl;
          backgroundPhotoInput.value = "";
        } else {
          alert(uploadData.error || "Помилка завантаження фонового зображення");
          return;
        }
      } catch (error) {
        console.error("Помилка при завантаженні фонового зображення:", error);
        alert("Помилка завантаження фонового зображення: " + error.message);
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
          backgroundPhoto,
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
        document.getElementById("like-count").textContent =
          data.user.likesCount || 0;

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
            console.error(`Помилка завантаження зображення: ${photoUrl}`);
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

        // Устанавливаем фоновое изображение
        if (data.user.backgroundPhoto) {
          document.body.style.backgroundImage = `url('${
            data.user.backgroundPhoto
          }?t=${Date.now()}')`;
        } else {
          document.body.style.backgroundImage = `url('/img/uzImg.jpg')`; // Фон по умолчанию
        }

        profileEditContainer.classList.add("hidden");
        profileContainer.classList.remove("hidden");
        chatContainer.classList.add("hidden");
        privateMessagesContainer.classList.add("hidden");
        body.classList.add("profile-active");
        setTimeout(generateQRCode, 0);
      } else {
        alert(data.error || "Помилка оновлення профілю");
      }
    } catch (error) {
      console.error("Помилка при оновленні профілю:", error);
      alert("Помилка оновлення профілю: " + error.message);
    }
  });

  editProfileBtn.addEventListener("click", () => {
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
  });

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

  backToProfileFromChat.addEventListener("click", () => {
    chatContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    profileEditContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
    setTimeout(generateQRCode, 0); // Генерируем QR-код при возврате к профилю
  });

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

  sendChatBtn.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (message && ws && ws.readyState === WebSocket.OPEN) {
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

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendChatBtn.click();
    }
  });

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

  const backToProfileBtn = document.getElementById("back-to-profile");
  backToProfileBtn.addEventListener("click", () => {
    profileEditContainer.classList.add("hidden");
    profileContainer.classList.remove("hidden");
    chatContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
    setTimeout(generateQRCode, 0); // Генерируем QR-код при возврате к профилю
  });

  if (downloadQrBtn) {
    downloadQrBtn.addEventListener("click", downloadQRCode);
  }

  // Emoji panel logic
  const emojiPanel = document.getElementById("emoji-panel");
  const emojiButtons = document.querySelectorAll(".emoji-btn");

  emojiButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const emoji = button.getAttribute("data-emoji");
      chatInput.value += emoji;
      chatInput.focus();
      button.classList.add("animate__bounce");
      setTimeout(() => {
        button.classList.remove("animate__bounce");
      }, 500);
    });

    button.addEventListener("mouseenter", () => {
      button.classList.add("animate__pulse");
    });

    button.addEventListener("mouseleave", () => {
      button.classList.remove("animate__pulse");
    });
  });

  createTopicBtn.addEventListener("click", () => {
    chatContainer.classList.add("hidden");
    createTopicContainer.classList.remove("hidden");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    topicChatContainer.classList.add("hidden");
    body.classList.add("profile-active");
    topicTitleInput.value = "";
    loadTopics();
    // Периодическое обновление списка тем
    const topicRefreshInterval = setInterval(loadTopics, 30000); // Каждые 30 секунд
    createTopicContainer.addEventListener(
      "transitionend",
      () => {
        if (createTopicContainer.classList.contains("hidden")) {
          clearInterval(topicRefreshInterval);
        }
      },
      { once: true }
    );
  });
  backToChatFromCreateTopic.addEventListener("click", () => {
    createTopicContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    topicChatContainer.classList.add("hidden");
    body.classList.add("profile-active");
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocket();
    }
  });

  submitTopic.addEventListener("click", async () => {
    const title = topicTitleInput.value.trim();
    if (!title || title.length < 3) {
      alert("Название темы должно содержать минимум 3 символа");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен отсутствует. Пожалуйста, войдите снова.");
        return;
      }

      const response = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Тема создана!");
        createTopicContainer.classList.add("hidden");
        chatContainer.classList.remove("hidden");
        profileContainer.classList.add("hidden");
        profileEditContainer.classList.add("hidden");
        privateMessagesContainer.classList.add("hidden");
        topicChatContainer.classList.add("hidden");
        body.classList.add("profile-active");
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          initWebSocket();
        }
        loadTopics();
      } else {
        alert(data.error || "Ошибка создания темы");
      }
    } catch (error) {
      console.error("Ошибка создания темы:", error);
      alert("Ошибка создания темы: " + error.message);
    }
  });

  sendTopicChatBtn.addEventListener("click", async () => {
    const message = topicChatInput.value.trim();
    if (!message) {
      alert("Повідомлення не може бути порожнім");
      return;
    }
    if (message.length > 500) {
      alert("Повідомлення занадто довге (макс. 500 символів)");
      return;
    }
    if (!currentTopicId) {
      alert("Тема не выбрана");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Токен відсутній. Будь ласка, увійдіть знову.");
        return;
      }

      // Проверяем статус темы
      const topicResponse = await fetch(`/api/topics/${currentTopicId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const topicData = await topicResponse.json();
      if (!topicResponse.ok) {
        alert(topicData.error || "Помилка перевірки статусу теми");
        return;
      }
      if (topicData.topic.isClosed) {
        alert("Ця тема закрита");
        return;
      }

      // Сохраняем сообщение через API
      const messageResponse = await fetch(
        `/api/topics/${currentTopicId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message,
            senderId: currentUser.workerId,
            senderName:
              `${currentUser.firstName || ""} ${
                currentUser.lastName || ""
              }`.trim() || "Анонім",
            timestamp: new Date().toISOString(),
          }),
        }
      );
      const messageData = await messageResponse.json();
      if (!messageResponse.ok) {
        alert(messageData.error || "Помилка відправки повідомлення");
        return;
      }

      // Отображаем сообщение локально, чтобы избежать задержки
      displayTopicMessage({
        type: "topic_message",
        topicId: currentTopicId,
        messageId: messageData.message._id,
        message,
        senderId: currentUser.workerId,
        senderName:
          `${currentUser.firstName || ""} ${
            currentUser.lastName || ""
          }`.trim() || "Анонім",
        timestamp: new Date().toISOString(),
      });

      topicChatInput.value = "";
    } catch (error) {
      console.error("Помилка відправки повідомлення:", error);
      alert("Помилка відправки повідомлення: " + error.message);
    }
  });

  topicChatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendTopicChatBtn.click();
    }
  });

  backToChatFromTopic.addEventListener("click", () => {
    if (currentTopicId) {
      unsubscribeFromTopic(currentTopicId);
      topicMessagesCache.delete(currentTopicId); // Очищаем кэш для темы
    }
    topicChatContainer.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    profileContainer.classList.add("hidden");
    profileEditContainer.classList.add("hidden");
    privateMessagesContainer.classList.add("hidden");
    body.classList.add("profile-active");
    currentTopicId = null;
  });

  document
    .getElementById("load-more-topic-messages")
    .addEventListener("click", () => {
      const nextPage = parseInt(
        document.getElementById("load-more-topic-messages").dataset.nextPage
      );
      if (currentTopicId && nextPage) {
        loadTopicMessages(currentTopicId, nextPage, true);
      }
    });
});
