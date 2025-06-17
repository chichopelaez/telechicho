document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const video = document.getElementById("video");
  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressContainer");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const volumeBtn = document.getElementById("volumeBtn");
  const volumeSlider = document.getElementById("volumeSlider");
  // const subtitleBtn = document.getElementById("subtitleBtn"); // Actualmente no usado
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const streamUrlInput = document.getElementById("streamUrl");
  const loadBtn = document.getElementById("loadBtn");
  const m3uUrlInput = document.getElementById("m3uUrl");
  const loadM3UUrlBtn = document.getElementById("loadM3UUrlBtn");
  const m3uFile = document.getElementById("m3uFile");
  const loadM3UFileBtn = document.getElementById("loadM3UFileBtn");
  const exportM3UBtn = document.getElementById("exportM3UBtn");
  const channelList = document.getElementById("channelList");
  const searchChannel = document.getElementById("searchChannel");
  const recentList = document.getElementById("recentList");
  // const addChannelBtn = document.getElementById("addChannelBtn"); // Actualmente comentado en HTML

  const xtreamUiServerInput = document.getElementById("xtreamUiServer");
  const xtreamUiUserInput = document.getElementById("xtreamUiUser");
  const xtreamUiPassInput = document.getElementById("xtreamUiPass");
  const loadXtreamUiBtn = document.getElementById("loadXtreamUiBtn");

  // Modales y Overlays
  const messageModal = document.getElementById("messageModal");
  const modalMessage = document.getElementById("modalMessage");
  const closeMessageModal = document.getElementById("closeMessageModal");
  const okMessageModal = document.getElementById("okMessageModal");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingMessage = document.getElementById("loadingMessage");

  // Botones de Tema
  const themeToggle = document.getElementById("themeToggle");

  // Elementos del Modal de Configuración (NUEVOS)
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsModal = document.getElementById("closeSettingsModal");
  const autoplayToggle = document.getElementById("autoplayToggle");
  const rememberLastChannelToggle = document.getElementById(
    "rememberLastChannelToggle"
  );
  const volumePersistenceToggle = document.getElementById(
    "volumePersistenceToggle"
  );
  const recentChannelsLimit = document.getElementById("recentChannelsLimit");
  const clearRecentChannelsBtn = document.getElementById(
    "clearRecentChannelsBtn"
  );
  const modalThemeToggle = document.getElementById("modalThemeToggle");
  const expandGroupsByDefault = document.getElementById(
    "expandGroupsByDefault"
  );
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const resetSettingsBtn = document.getElementById("resetSettingsBtn");

  // Variables de estado
  let hls;
  let currentPlayingChannel = null;
  let allChannels = [];
  let recentChannels = JSON.parse(localStorage.getItem("recentChannels")) || [];
  let currentPlayingGroup = null; // Para colapsar/expandir grupos

  // Configuración de la aplicación (NUEVO)
  const defaultSettings = {
    autoplay: false,
    rememberLastChannel: true,
    volumePersistence: true,
    recentChannelsLimit: 10,
    expandGroupsByDefault: true,
  };
  let appSettings =
    JSON.parse(localStorage.getItem("appSettings")) || defaultSettings;

  // Asegurarse de que `localStorage` tenga los valores iniciales si no existen
  for (const key in defaultSettings) {
    if (appSettings[key] === undefined) {
      appSettings[key] = defaultSettings[key];
    }
  }
  localStorage.setItem("appSettings", JSON.stringify(appSettings)); // Guardar los valores por defecto si se acaban de establecer

  // --- Funciones de Utilidad ---

  function showModal(message, isError = false) {
    modalMessage.textContent = message;
    if (isError) {
      modalMessage.style.color = "var(--danger)";
    } else {
      modalMessage.style.color = "inherit"; // Restablecer al color por defecto
    }
    messageModal.style.display = "flex";
    setTimeout(() => messageModal.classList.add("active"), 10);
  }

  function hideModal() {
    messageModal.classList.remove("active");
    setTimeout(() => (messageModal.style.display = "none"), 300); // Esperar que termine la animación
  }

  function showLoading(message = "Cargando...") {
    loadingMessage.textContent = message;
    loadingOverlay.style.display = "flex";
    setTimeout(() => loadingOverlay.classList.add("active"), 10);
  }

  function hideLoading() {
    loadingOverlay.classList.remove("active");
    setTimeout(() => (loadingOverlay.style.display = "none"), 300);
  }

  // Limpiar URL del servidor Xtream UI (asegura que no haya / al final)
  function cleanServerUrl(url) {
    return url.replace(/\/+$/, "");
  }

  // --- Funciones del Reproductor de Video ---

  function loadVideo(
    url,
    name = "Stream Desconocido",
    logo = "",
    group = "Otros"
  ) {
    if (hls) {
      hls.destroy();
    }

    currentPlayingChannel = { url, name, logo, group };
    localStorage.setItem(
      "lastPlayedChannel",
      JSON.stringify(currentPlayingChannel)
    );
    addRecentChannel(currentPlayingChannel);

    if (Hls.isSupported() && url.endsWith(".m3u8")) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (appSettings.autoplay) {
          // Usa la configuración de autoplay
          video.play();
        }
        playBtn.style.display = "none";
        pauseBtn.style.display = "inline-block";
        hideLoading();
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              showModal(
                `Error de red: ${data.details}. Intentando reconectar...`,
                true
              );
              hls.recoverMediaError();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              showModal(`Error de medios: ${data.details}.`, true);
              hls.recoverMediaError();
              break;
            default:
              showModal(`Error fatal de HLS: ${data.details}.`, true);
              hls.destroy();
              break;
          }
        }
      });
    } else if (
      video.canPlayType("application/vnd.apple.mpegurl") &&
      url.endsWith(".m3u8")
    ) {
      // Soporte nativo para iOS Safari
      video.src = url;
      if (appSettings.autoplay) {
        // Usa la configuración de autoplay
        video.play();
      }
      playBtn.style.display = "none";
      pauseBtn.style.display = "inline-block";
      hideLoading();
    } else {
      video.src = url;
      if (appSettings.autoplay) {
        // Usa la configuración de autoplay
        video.play();
      }
      playBtn.style.display = "none";
      pauseBtn.style.display = "inline-block";
      hideLoading();
    }

    document.querySelectorAll(".channel-item").forEach((item) => {
      item.classList.remove("active");
    });
    const activeChannelElement = document.querySelector(
      `.channel-item[data-url="${CSS.escape(url)}"]`
    );
    if (activeChannelElement) {
      activeChannelElement.classList.add("active");
      activeChannelElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  function playVideo() {
    video.play();
    playBtn.style.display = "none";
    pauseBtn.style.display = "inline-block";
  }

  function pauseVideo() {
    video.pause();
    playBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
  }

  function updateProgress() {
    progressBar.style.width = (video.currentTime / video.duration) * 100 + "%";
    currentTimeEl.textContent = formatTime(video.currentTime);
    durationEl.textContent = formatTime(video.duration);
  }

  function setProgress(e) {
    const newTime =
      (e.offsetX / progressContainer.offsetWidth) * video.duration;
    video.currentTime = newTime;
  }

  function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes < 10 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  }

  function updateVolumeIcon() {
    if (video.volume === 0 || video.muted) {
      volumeBtn.querySelector("i").className = "fas fa-volume-mute";
    } else if (video.volume < 0.5) {
      volumeBtn.querySelector("i").className = "fas fa-volume-down";
    } else {
      volumeBtn.querySelector("i").className = "fas fa-volume-up";
    }
  }

  function toggleMute() {
    video.muted = !video.muted;
    if (video.muted) {
      volumeSlider.value = 0;
    } else {
      volumeSlider.value = video.volume * 100; // Restaurar al volumen antes de mutear
    }
    updateVolumeIcon();
  }

  function setVolume() {
    video.volume = volumeSlider.value / 100;
    updateVolumeIcon();
  }

  function toggleFullscreen() {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.mozRequestFullScreen) {
      /* Firefox */
      video.mozRequestFullScreen();
    } else if (video.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      /* IE/Edge */
      video.msRequestFullscreen();
    }
  }

  // --- Funciones de Carga de Canales ---

  async function parseM3U(data) {
    const lines = data.split("\n");
    const channels = [];
    let currentChannel = {};

    for (const line of lines) {
      if (line.startsWith("#EXTINF:")) {
        // Nueva entrada de canal
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
        const groupTitleMatch = line.match(/group-title="([^"]*)"/);
        const nameMatch = line.match(/,(.*)$/); // Nombre después de la última coma

        currentChannel = {
          tvgId: tvgIdMatch ? tvgIdMatch[1] : "",
          tvgName: tvgNameMatch ? tvgNameMatch[1] : "",
          logo: tvgLogoMatch ? tvgLogoMatch[1] : "",
          group: groupTitleMatch ? groupTitleMatch[1] : "Sin Grupo",
          name: nameMatch ? nameMatch[1].trim() : "Canal Desconocido",
          url: "", // La URL se asignará en la siguiente línea
        };
      } else if (line.startsWith("http")) {
        // URL del stream
        currentChannel.url = line.trim();
        if (
          currentChannel.name === "Canal Desconocido" &&
          !currentChannel.tvgName
        ) {
          // Intentar inferir un nombre mejor de la URL si no hay info
          const urlParts = currentChannel.url.split("/");
          currentChannel.name =
            urlParts[urlParts.length - 1]
              .split("?")[0]
              .replace(/\.(m3u8|mp4|ts|flv)$/i, "") || "Canal Desconocido";
        }
        if (!currentChannel.logo && currentChannel.url.includes("logo")) {
          // Intento básico de extraer logo de la URL si no hay tvg-logo
          const logoMatch = currentChannel.url.match(/logo=([^&/]*)/i);
          if (logoMatch) currentChannel.logo = logoMatch[1];
        }
        channels.push(currentChannel);
        currentChannel = {}; // Reset para el siguiente canal
      }
    }
    return channels;
  }

  function renderChannels(channelsToRender, containerElement, clickHandler) {
    containerElement.innerHTML = "";
    if (channelsToRender.length === 0) {
      containerElement.innerHTML =
        '<p class="no-results">No se encontraron canales.</p>';
      return;
    }

    const groups = {};
    channelsToRender.forEach((channel) => {
      const groupName = channel.group || "Sin Grupo";
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(channel);
    });

    let delay = 0; // Inicializar retraso para animación

    for (const groupName in groups) {
      const groupHeader = document.createElement("div");
      groupHeader.classList.add("group-header");
      groupHeader.innerHTML = `<i class="fas fa-folder"></i> ${groupName}`;
      groupHeader.setAttribute("data-group", groupName);
      containerElement.appendChild(groupHeader);

      const groupContent = document.createElement("div");
      groupContent.classList.add("group-content");
      groupContent.setAttribute("data-group-content", groupName);
      containerElement.appendChild(groupContent);

      groups[groupName].forEach((channel) => {
        const channelDiv = document.createElement("div");
        channelDiv.classList.add("channel-item");
        channelDiv.setAttribute("data-url", channel.url); // Almacena la URL para fácil acceso
        channelDiv.setAttribute("data-name", channel.name);

        // Aplica el retardo de animación
        channelDiv.style.animationDelay = `${delay}s`;
        delay += 0.03; // Incrementa el retraso para el siguiente elemento (ajusta si es muy lento)

        channelDiv.innerHTML = `
                ${
                  channel.logo
                    ? `<img src="${channel.logo}" alt="${channel.name} logo" class="channel-logo">`
                    : '<i class="fas fa-tv channel-logo-placeholder"></i>'
                }
                <span class="channel-name">${channel.name}</span>
            `;

        channelDiv.addEventListener("click", () => clickHandler(channel));

        // Resaltar canal activo
        if (
          currentPlayingChannel &&
          currentPlayingChannel.url === channel.url
        ) {
          channelDiv.classList.add("active");
        }
        groupContent.appendChild(channelDiv);
      });
    }
    // Configurar la funcionalidad de colapso/expansión de grupos
    setupGroupToggle();
  }

  // Funcionalidad para colapsar/expandir grupos (NUEVO)
  function setupGroupToggle() {
    document.querySelectorAll(".group-header").forEach((header) => {
      const groupContent = header.nextElementSibling;
      // Remover cualquier listener previo para evitar duplicados al re-renderizar
      header.removeEventListener("click", toggleGroupVisibility);
      header.addEventListener("click", toggleGroupVisibility);

      // Aplicar el estado inicial basado en la configuración
      if (appSettings.expandGroupsByDefault) {
        groupContent.style.display = "block";
        header.classList.remove("collapsed");
      } else {
        groupContent.style.display = "none";
        header.classList.add("collapsed");
      }
    });
  }

  function toggleGroupVisibility(event) {
    const header = event.currentTarget;
    const groupContent = header.nextElementSibling;

    if (
      groupContent.style.display === "block" ||
      groupContent.style.display === ""
    ) {
      groupContent.style.display = "none";
      header.classList.add("collapsed");
    } else {
      groupContent.style.display = "block";
      header.classList.remove("collapsed");
    }
  }

  function addRecentChannel(channel) {
    // Eliminar si ya existe para moverlo al principio
    recentChannels = recentChannels.filter((c) => c.url !== channel.url);
    recentChannels.unshift(channel); // Añadir al principio

    const MAX_RECENT = appSettings.recentChannelsLimit; // Usar el límite de configuración
    if (recentChannels.length > MAX_RECENT) {
      recentChannels = recentChannels.slice(0, MAX_RECENT); // Mantener solo los N más recientes
    }
    localStorage.setItem("recentChannels", JSON.stringify(recentChannels));
    renderRecentChannels();
  }

  function renderRecentChannels() {
    // Asegurarse de que al cargar o renderizar, el número de canales recientes sea consistente con el límite
    if (recentChannels.length > appSettings.recentChannelsLimit) {
      recentChannels = recentChannels.slice(0, appSettings.recentChannelsLimit);
      localStorage.setItem("recentChannels", JSON.stringify(recentChannels));
    }
    renderChannels(recentChannels, recentList, (channel) => {
      showLoading(`Cargando ${channel.name}...`);
      loadVideo(channel.url, channel.name, channel.logo, channel.group);
      hideModal(); // Asegurarse de que el modal se cierre
    });
  }

  async function loadM3UFromUrl(url) {
    showLoading("Cargando lista M3U desde URL...");
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      allChannels = await parseM3U(data);
      renderChannels(allChannels, channelList, (channel) => {
        showLoading(`Cargando ${channel.name}...`);
        loadVideo(channel.url, channel.name, channel.logo, channel.group);
      });
      showModal(`Se cargaron ${allChannels.length} canales desde la URL.`);
    } catch (error) {
      console.error("Error al cargar M3U desde URL:", error);
      showModal(
        `Error al cargar la lista M3U desde la URL: ${error.message}`,
        true
      );
    } finally {
      hideLoading();
    }
  }

  async function loadM3UFromFile(file) {
    showLoading("Cargando lista M3U desde archivo...");
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target.result;
        allChannels = await parseM3U(data);
        renderChannels(allChannels, channelList, (channel) => {
          showLoading(`Cargando ${channel.name}...`);
          loadVideo(channel.url, channel.name, channel.logo, channel.group);
        });
        showModal(
          `Se cargaron ${allChannels.length} canales desde el archivo.`
        );
        hideLoading();
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error al cargar M3U desde archivo:", error);
      showModal(
        `Error al cargar la lista M3U desde el archivo: ${error.message}`,
        true
      );
      hideLoading();
    }
  }

  async function loadFromXtreamUI() {
    const serverUrl = cleanServerUrl(xtreamUiServerInput.value.trim());
    const username = xtreamUiUserInput.value.trim();
    const password = xtreamUiPassInput.value.trim();

    if (!serverUrl || !username || !password) {
      showModal(
        "Por favor, ingresa el servidor, usuario y contraseña de Xtream UI.",
        true
      );
      return;
    }

    showLoading("Conectando a Xtream UI...");
    try {
      // Obtener URL de M3U_PLUS
      const infoUrl = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
      const categoriesUrl = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
      const liveStreamsUrl = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;

      const [categoriesResponse, liveStreamsResponse] = await Promise.all([
        fetch(categoriesUrl),
        fetch(liveStreamsUrl),
      ]);

      if (!categoriesResponse.ok || !liveStreamsResponse.ok) {
        throw new Error(
          "Credenciales inválidas o error de servidor de Xtream UI."
        );
      }

      const categories = await categoriesResponse.json();
      const liveStreams = await liveStreamsResponse.json();

      const newChannels = [];
      liveStreams.forEach((stream) => {
        const category = categories.find(
          (cat) => cat.category_id === stream.category_id
        );
        newChannels.push({
          url: `${serverUrl}/live/${username}/${password}/${stream.stream_id}.m3u8`,
          name: stream.name,
          logo: stream.stream_icon,
          group: category ? category.category_name : "Sin Grupo",
          tvgId: stream.tvg_id || "",
          tvgName: stream.tvg_name || "",
        });
      });

      allChannels = newChannels;
      renderChannels(allChannels, channelList, (channel) => {
        showLoading(`Cargando ${channel.name}...`);
        loadVideo(channel.url, channel.name, channel.logo, channel.group);
      });
      showModal(`Se cargaron ${allChannels.length} canales desde Xtream UI.`);

      // Guardar credenciales para la próxima vez (opcional, considera seguridad)
      localStorage.setItem(
        "xtreamUiCredentials",
        JSON.stringify({ serverUrl, username, password })
      );
    } catch (error) {
      console.error("Error al cargar desde Xtream UI:", error);
      showModal(
        `Error al cargar desde Xtream UI: ${error.message}. Verifica las credenciales y la URL del servidor.`,
        true
      );
    } finally {
      hideLoading();
    }
  }

  function exportCurrentM3U() {
    if (allChannels.length === 0) {
      showModal("No hay canales cargados para exportar.", true);
      return;
    }

    let m3uContent = "#EXTM3U\n";
    allChannels.forEach((channel) => {
      let extinf = `#EXTINF:-1 tvg-id="${channel.tvgId || ""}"`;
      if (channel.tvgName) extinf += ` tvg-name="${channel.tvgName}"`;
      if (channel.logo) extinf += ` tvg-logo="${channel.logo}"`;
      if (channel.group) extinf += ` group-title="${channel.group}"`;
      extinf += `,${channel.name}\n`;
      m3uContent += extinf;
      m3uContent += `${channel.url}\n`;
    });

    const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iptv_playlist.m3u";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showModal("Lista M3U exportada como iptv_playlist.m3u");
  }

  // --- Event Listeners ---

  // Controles del video
  playBtn.addEventListener("click", playVideo);
  pauseBtn.addEventListener("click", pauseVideo);
  video.addEventListener("timeupdate", updateProgress);
  progressContainer.addEventListener("click", setProgress);
  video.addEventListener("ended", () => {
    playBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
  });
  video.addEventListener("play", () => {
    playBtn.style.display = "none";
    pauseBtn.style.display = "inline-block";
  });
  video.addEventListener("pause", () => {
    playBtn.style.display = "inline-block";
    pauseBtn.style.display = "none";
  });
  volumeBtn.addEventListener("click", toggleMute);
  volumeSlider.addEventListener("input", setVolume);
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  // Guardar el último volumen al cambiar
  video.addEventListener("volumechange", () => {
    if (appSettings.volumePersistence) {
      localStorage.setItem("lastVolume", video.volume);
    }
    updateVolumeIcon();
  });

  // Cargar stream individual
  loadBtn.addEventListener("click", () => {
    const url = streamUrlInput.value.trim();
    if (url) {
      showLoading("Cargando stream...");
      loadVideo(url);
    } else {
      showModal("Por favor, introduce una URL de stream.", true);
    }
  });

  // Cargar M3U desde URL
  loadM3UUrlBtn.addEventListener("click", () => {
    const url = m3uUrlInput.value.trim();
    if (url) {
      loadM3UFromUrl(url);
    } else {
      showModal("Por favor, introduce una URL de lista M3U.", true);
    }
  });

  // Cargar M3U desde archivo local
  m3uFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const fileNameDisplay = e.target.files[0].name;
      const fileLabel = document.querySelector('.file-label[for="m3uFile"]');
      if (fileLabel) {
        fileLabel.textContent = `Archivo: ${fileNameDisplay}`;
        fileLabel.innerHTML = `<i class="fas fa-file-upload"></i> ${fileNameDisplay}`;
      }
    } else {
      const fileLabel = document.querySelector('.file-label[for="m3uFile"]');
      if (fileLabel) {
        fileLabel.textContent = "Seleccionar archivo M3U";
        fileLabel.innerHTML = `<i class="fas fa-file-upload"></i> Seleccionar archivo M3U`;
      }
    }
  });
  loadM3UFileBtn.addEventListener("click", () => {
    if (m3uFile.files.length > 0) {
      loadM3UFromFile(m3uFile.files[0]);
    } else {
      showModal("Por favor, selecciona un archivo M3U.", true);
    }
  });

  // Búsqueda de canales (con debounce)
  let searchTimeout;
  searchChannel.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.toLowerCase();
    searchTimeout = setTimeout(() => {
      const filteredChannels = allChannels.filter(
        (channel) =>
          channel.name.toLowerCase().includes(searchTerm) ||
          channel.group.toLowerCase().includes(searchTerm) ||
          channel.tvgName.toLowerCase().includes(searchTerm)
      );
      renderChannels(filteredChannels, channelList, (channel) => {
        showLoading(`Cargando ${channel.name}...`);
        loadVideo(channel.url, channel.name, channel.logo, channel.group);
      });
    }, 300); // Retraso de 300ms
  });

  exportM3UBtn.addEventListener("click", exportCurrentM3U);

  // Event listener para Xtream UI
  loadXtreamUiBtn.addEventListener("click", loadFromXtreamUI);

  // --- Configuración de Tema (Dark/Light Mode) ---
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.querySelector("i").className = "fas fa-sun";
  } else {
    themeToggle.querySelector("i").className = "fas fa-moon";
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      themeToggle.querySelector("i").className = "fas fa-sun";
      localStorage.setItem("theme", "dark");
    } else {
      themeToggle.querySelector("i").className = "fas fa-moon";
      localStorage.setItem("theme", "light");
    }
  });

  // --- Lógica del Modal de Mensajes ---
  closeMessageModal.addEventListener("click", hideModal);
  okMessageModal.addEventListener("click", hideModal);
  // Cerrar modal al hacer clic fuera del contenido
  messageModal.addEventListener("click", (e) => {
    if (e.target === messageModal) {
      hideModal();
    }
  });

  // --- Lógica del Modal de Configuración (NUEVA) ---
  function showSettingsModal() {
    // Cargar las configuraciones actuales en los campos del modal
    autoplayToggle.checked = appSettings.autoplay;
    rememberLastChannelToggle.checked = appSettings.rememberLastChannel;
    volumePersistenceToggle.checked = appSettings.volumePersistence;
    recentChannelsLimit.value = appSettings.recentChannelsLimit;
    expandGroupsByDefault.checked = appSettings.expandGroupsByDefault;

    // Actualizar el icono del tema en el modal
    if (document.body.classList.contains("dark-mode")) {
      modalThemeToggle.querySelector("i").className = "fas fa-sun";
    } else {
      modalThemeToggle.querySelector("i").className = "fas fa-moon";
    }

    settingsModal.style.display = "flex";
    setTimeout(() => settingsModal.classList.add("active"), 10); // Animación de entrada
  }

  function hideSettingsModal() {
    settingsModal.classList.remove("active");
    setTimeout(() => (settingsModal.style.display = "none"), 300); // Esperar que termine la animación
  }

  settingsToggle.addEventListener("click", showSettingsModal);
  closeSettingsModal.addEventListener("click", hideSettingsModal);

  // Cerrar modal al hacer clic fuera del contenido
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      hideSettingsModal();
    }
  });

  // Guardar configuración
  saveSettingsBtn.addEventListener("click", () => {
    appSettings.autoplay = autoplayToggle.checked;
    appSettings.rememberLastChannel = rememberLastChannelToggle.checked;
    appSettings.volumePersistence = volumePersistenceToggle.checked;
    appSettings.recentChannelsLimit = parseInt(recentChannelsLimit.value, 10);
    appSettings.expandGroupsByDefault = expandGroupsByDefault.checked;

    localStorage.setItem("appSettings", JSON.stringify(appSettings));
    showModal("Configuración guardada exitosamente.");
    hideSettingsModal();
    // Recargar la lista de recientes si el límite cambió
    renderRecentChannels();
    // Aplicar la configuración de grupos al recargar/renderizar
    setupGroupToggle();
    // Forzar la re-carga del último canal si las opciones de persistencia cambian
    const lastPlayedChannel = JSON.parse(
      localStorage.getItem("lastPlayedChannel")
    );
    if (appSettings.rememberLastChannel && lastPlayedChannel) {
      // Si el canal está cargado y la opción se activó, re-aplicar autoplay/volumen
      if (!video.src || video.src !== lastPlayedChannel.url) {
        // Si no es el mismo canal, cargarlo
        loadVideo(
          lastPlayedChannel.url,
          lastPlayedChannel.name,
          lastPlayedChannel.logo,
          lastPlayedChannel.group
        );
      }
      if (appSettings.autoplay) {
        video.play();
      }
      if (appSettings.volumePersistence) {
        const lastVolume = parseFloat(localStorage.getItem("lastVolume")) || 1;
        video.volume = lastVolume;
        volumeSlider.value = lastVolume * 100;
        updateVolumeIcon();
      }
    }
  });

  // Restablecer configuración a valores por defecto
  resetSettingsBtn.addEventListener("click", () => {
    appSettings = { ...defaultSettings }; // Copia los valores por defecto
    localStorage.setItem("appSettings", JSON.stringify(appSettings));
    showModal("Configuración restablecida a los valores por defecto.");
    showSettingsModal(); // Vuelve a mostrar el modal con los valores por defecto
    renderRecentChannels(); // Recarga los recientes con el límite por defecto
    setupGroupToggle(); // Re-aplica la configuración de grupos
    // También restablecer el estado del reproductor si las opciones lo dictan
    if (!appSettings.rememberLastChannel) {
      localStorage.removeItem("lastPlayedChannel");
      currentPlayingChannel = null;
    }
    if (!appSettings.volumePersistence) {
      localStorage.removeItem("lastVolume");
      video.volume = 1; // Volumen a 100%
      volumeSlider.value = 100;
      updateVolumeIcon();
    }
  });

  // Borrar canales recientes
  clearRecentChannelsBtn.addEventListener("click", () => {
    localStorage.removeItem("recentChannels");
    recentChannels = []; // Limpiar array en memoria
    renderRecentChannels();
    showModal("Canales recientes borrados.");
  });

  // Alternar tema desde el modal (reutiliza la lógica existente)
  modalThemeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      themeToggle.querySelector("i").className = "fas fa-sun";
      modalThemeToggle.querySelector("i").className = "fas fa-sun";
      localStorage.setItem("theme", "dark");
    } else {
      themeToggle.querySelector("i").className = "fas fa-moon";
      modalThemeToggle.querySelector("i").className = "fas fa-moon";
      localStorage.setItem("theme", "light");
    }
  });

  // --- Inicialización al cargar la página ---
  const lastPlayedChannel = JSON.parse(
    localStorage.getItem("lastPlayedChannel")
  );
  const lastVolume = parseFloat(localStorage.getItem("lastVolume")) || 1; // Default a 1 (100%)

  // Cargar el último canal reproducido al inicio
  if (appSettings.rememberLastChannel && lastPlayedChannel) {
    showLoading(`Cargando último canal: ${lastPlayedChannel.name}...`);
    loadVideo(
      lastPlayedChannel.url,
      lastPlayedChannel.name,
      lastPlayedChannel.logo,
      lastPlayedChannel.group
    );
    if (appSettings.autoplay) {
      // Aplica autoplay desde settings
      video.autoplay = true; // Activa el autoplay
      video.muted = true; // Chrome y otros navegadores requieren mute para autoplay si no hubo interacción
      // showModal('Reproducción automática iniciada (silenciada).', false);
      // Podrías mostrar un botón de "Activar sonido"
    } else {
      video.autoplay = false;
    }
    if (appSettings.volumePersistence) {
      // Aplica persistencia de volumen
      video.volume = lastVolume;
      volumeSlider.value = lastVolume * 100;
      updateVolumeIcon();
    } else {
      video.volume = 1; // Si no persiste, ir a 100%
      volumeSlider.value = 100;
      updateVolumeIcon();
    }

    // Ocultar modal después de un tiempo si se carga automáticamente
    if (appSettings.autoplay) {
      setTimeout(() => hideLoading(), 3000); // Cierra el loading después de un breve tiempo
    } else {
      hideLoading(); // Si no hay autoplay, cierra el loading inmediatamente
    }
  } else {
    // Si no se recuerda el último canal, y si hay persistencia de volumen, aplica el último volumen
    if (appSettings.volumePersistence) {
      video.volume = lastVolume;
      volumeSlider.value = lastVolume * 100;
      updateVolumeIcon();
    } else {
      video.volume = 1;
      volumeSlider.value = 100;
      updateVolumeIcon();
    }
    hideLoading(); // Si no hay carga de canal, oculta el loading
  }

  // Carga inicial de canales recientes al cargar la página
  renderRecentChannels();
  // Aplicar configuración de grupos al cargar por primera vez
  setupGroupToggle();

  // Cargar credenciales Xtream UI guardadas si existen
  const savedXtreamUiCredentials = JSON.parse(
    localStorage.getItem("xtreamUiCredentials")
  );
  if (savedXtreamUiCredentials) {
    xtreamUiServerInput.value = savedXtreamUiCredentials.serverUrl;
    xtreamUiUserInput.value = savedXtreamUiCredentials.username;
    xtreamUiPassInput.value = savedXtreamUiCredentials.password;
  }
});
