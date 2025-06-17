document.addEventListener("DOMContentLoaded", () => {
  // ==================== ELEMENTOS DEL DOM ====================
  const video = document.getElementById("video");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.getElementById("progressContainer");
  const progressThumb = document.getElementById("progressThumb");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const volumeBtn = document.getElementById("volumeBtn");
  const volumeSlider = document.getElementById("volumeSlider");
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
  const epgUrlInput = document.getElementById("epgUrl");
  const loadEpgBtn = document.getElementById("loadEpgBtn");
  const xtreamServerUrlInput = document.getElementById("xtreamServerUrl");
  const xtreamUsernameInput = document.getElementById("xtreamUsername");
  const xtreamPasswordInput = document.getElementById("xtreamPassword");
  const loadXtreamUiBtn = document.getElementById("loadXtreamUiBtn");
  const settingsToggle = document.getElementById("settingsToggle");
  const themeToggle = document.getElementById("themeToggle");
  const modalThemeToggle = document.getElementById("modalThemeToggle");

  // Configuración
  const autoplayToggle = document.getElementById("autoplayToggle");
  const rememberLastChannelToggle = document.getElementById(
    "rememberLastChannelToggle"
  );
  const volumePersistenceToggle = document.getElementById(
    "volumePersistenceToggle"
  );
  const recentChannelsLimit = document.getElementById("recentChannelsLimit");
  const expandGroupsByDefault = document.getElementById(
    "expandGroupsByDefault"
  );
  const clearRecentChannelsBtn = document.getElementById(
    "clearRecentChannelsBtn"
  );
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const resetSettingsBtn = document.getElementById("resetSettingsBtn");

  // Modales
  const modalOverlay = document.getElementById("modalOverlay");
  const modalMessage = document.getElementById("modalMessage");
  const closeModal = document.getElementById("closeModal");
  const modalOkButton = document.getElementById("modalOkButton");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingMessage = document.getElementById("loadingMessage");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettingsModal = document.getElementById("closeSettingsModal");

  // ==================== VARIABLES DE ESTADO ====================
  let hls = null;
  let currentPlayingChannel = null;
  let allChannels = [];
  let filteredChannels = [];
  let epgData = {};
  let recentChannels = JSON.parse(localStorage.getItem("recentChannels")) || [];
  let isDarkMode = localStorage.getItem("darkMode") === "true";
  let isDraggingProgress = false;

  // Configuración por defecto
  const defaultSettings = {
    autoplay: false,
    rememberLastChannel: true,
    volumePersistence: true,
    recentChannelsLimit: 10,
    expandGroupsByDefault: true,
    bufferLength: 30,
    maxBufferSize: 60,
    maxBufferLength: 30,
    volume: 1.0,
    muted: false,
  };

  let appSettings = JSON.parse(localStorage.getItem("appSettings")) || {
    ...defaultSettings,
  };

  // ==================== FUNCIONES DE UTILIDAD ====================
  function showModal(message, isError = false) {
    modalMessage.textContent = message;
    modalOverlay.classList.add("active");
    modalOverlay.style.display = "flex";
  }

  function hideModal() {
    modalOverlay.classList.remove("active");
    setTimeout(() => (modalOverlay.style.display = "none"), 300);
  }

  function showLoading(message = "Cargando...") {
    loadingMessage.textContent = message;
    loadingOverlay.classList.add("active");
    loadingOverlay.style.display = "flex";
  }

  function hideLoading() {
    loadingOverlay.classList.remove("active");
    setTimeout(() => (loadingOverlay.style.display = "none"), 300);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem("darkMode", isDarkMode.toString());

    const icon = themeToggle.querySelector("i");
    icon.className = isDarkMode ? "fas fa-sun" : "fas fa-moon";

    const modalIcon = modalThemeToggle.querySelector("i");
    modalIcon.className = isDarkMode ? "fas fa-sun" : "fas fa-moon";
  }

  function saveCurrentChannel() {
    if (currentPlayingChannel) {
      localStorage.setItem(
        "lastPlayedChannel",
        JSON.stringify(currentPlayingChannel)
      );
      addRecentChannel(currentPlayingChannel);
    }
  }

  // ==================== FUNCIONES DEL REPRODUCTOR ====================
  function loadVideo(
    url,
    name = "Stream Desconocido",
    logo = "",
    group = "Otros",
    tvgId = "",
    backupUrl = ""
  ) {
    if (!url || !url.startsWith("http")) {
      showModal("URL no válida", true);
      return Promise.reject("URL inválida");
    }

    showLoading(`Cargando ${name}...`);

    return new Promise((resolve, reject) => {
      const tryLoad = (currentUrl, isRetry = false) => {
        // Limpiar instancia HLS anterior
        if (hls) {
          hls.destroy();
          hls = null;
        }

        const isHLS =
          currentUrl.includes(".m3u8") ||
          (currentUrl.includes("m3u8") && !currentUrl.includes(".mp4"));

        if (isHLS && Hls.isSupported()) {
          hls = new Hls({
            maxMaxBufferLength: appSettings.bufferLength,
            maxBufferSize: appSettings.maxBufferSize,
            maxBufferLength: appSettings.maxBufferLength,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
          });

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            hls.loadSource(currentUrl);
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            currentPlayingChannel = {
              url: currentUrl,
              name,
              logo,
              group,
              tvgId,
            };
            saveCurrentChannel();
            updateVideoControls();
            updateActiveChannel();
            if (appSettings.autoplay)
              video.play().catch((e) => console.error(e));
            hideLoading();
            resolve();
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (!isRetry && backupUrl) {
              // Intentar con URL alternativa
              tryLoad(backupUrl, true);
            } else {
              hideLoading();
              handlePlayerError(data);
              reject(data);
            }
          });

          hls.attachMedia(video);
        } else {
          // Manejo para navegadores sin HLS.js o formatos MP4
          video.src = currentUrl;
          video.addEventListener("loadedmetadata", () => {
            currentPlayingChannel = {
              url: currentUrl,
              name,
              logo,
              group,
              tvgId,
            };
            saveCurrentChannel();
            updateVideoControls();
            updateActiveChannel();
            if (appSettings.autoplay)
              video.play().catch((e) => console.error(e));
            hideLoading();
            resolve();
          });

          video.addEventListener("error", () => {
            if (!isRetry && backupUrl) {
              // Intentar con URL alternativa
              tryLoad(backupUrl, true);
            } else {
              hideLoading();
              showModal(
                "Error al cargar el video. Formato no soportado.",
                true
              );
              reject("Error de carga");
            }
          });
        }
      };

      // Iniciar con la URL principal
      tryLoad(url);
    });
  }

  function handlePlayerError(errorData) {
    console.error("Player Error:", errorData);
    hideLoading();

    let errorMessage = "Error en el reproductor";
    if (errorData.type === Hls.ErrorTypes.NETWORK_ERROR) {
      errorMessage = "Error de red. Verifica tu conexión.";
    } else if (errorData.type === Hls.ErrorTypes.MEDIA_ERROR) {
      errorMessage = "Error en el formato del video.";
      hls.recoverMediaError();
    }

    showModal(errorMessage, true);
  }

  function updateVideoControls() {
    const playPauseIcon = video.paused ? "fa-play" : "fa-pause";
    playPauseBtn.innerHTML = `<i class="fas ${playPauseIcon}"></i>`;
    updateVolumeUI();
    updateTimeDisplay();
  }

  function updateVolumeUI() {
    if (video.muted || video.volume === 0) {
      volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
      volumeSlider.value = 0;
    } else {
      let volumeIcon = "fa-volume-up";
      if (video.volume < 0.5) volumeIcon = "fa-volume-down";
      if (video.volume < 0.1) volumeIcon = "fa-volume-off";

      volumeBtn.innerHTML = `<i class="fas ${volumeIcon}"></i>`;
      volumeSlider.value = video.volume * 100;
    }
  }

  function updateTimeDisplay() {
    currentTimeEl.textContent = formatTime(video.currentTime);
    durationEl.textContent = formatTime(video.duration || 0);

    if (!isDraggingProgress) {
      const progressPercent = (video.currentTime / (video.duration || 1)) * 100;
      progressBar.style.width = `${progressPercent}%`;
      progressThumb.style.left = `${progressPercent}%`;
    }
  }

  function togglePlayPause() {
    if (video.paused) {
      video.play().catch((e) => {
        console.error("Play error:", e);
        showModal("Error al iniciar la reproducción", true);
      });
    } else {
      video.pause();
    }
    updateVideoControls();
  }

  function toggleMute() {
    video.muted = !video.muted;
    updateVolumeUI();

    if (appSettings.volumePersistence) {
      localStorage.setItem("volumeMuted", video.muted.toString());
    }
  }

  function handleVolumeChange() {
    video.volume = volumeSlider.value / 100;
    video.muted = false;
    updateVolumeUI();

    if (appSettings.volumePersistence) {
      localStorage.setItem("volumeLevel", video.volume.toString());
    }
  }

  function handleProgressClick(e) {
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }

  function handleProgressDragStart(e) {
    isDraggingProgress = true;
    document.addEventListener("mousemove", handleProgressDrag);
    document.addEventListener("mouseup", handleProgressDragEnd);
    handleProgressDrag(e);
  }

  function handleProgressDrag(e) {
    if (!isDraggingProgress) return;

    const rect = progressContainer.getBoundingClientRect();
    let pos = (e.clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));

    progressBar.style.width = `${pos * 100}%`;
    progressThumb.style.left = `${pos * 100}%`;
  }

  function handleProgressDragEnd(e) {
    if (!isDraggingProgress) return;

    isDraggingProgress = false;
    document.removeEventListener("mousemove", handleProgressDrag);
    document.removeEventListener("mouseup", handleProgressDragEnd);

    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      video.requestFullscreen().catch((err) => {
        showModal(`Error al entrar en pantalla completa: ${err.message}`, true);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // ==================== FUNCIONES DE LISTAS M3U ====================
  async function parseM3U(data) {
    showLoading("Procesando lista M3U...");
    try {
      const lines = data.split("\n");
      const channels = [];
      let currentChannel = {};
      let extM3uFound = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("#EXTM3U")) {
          extM3uFound = true;
          continue;
        }

        if (line.startsWith("#EXTINF:")) {
          currentChannel = {
            tvgId: line.match(/tvg-id="([^"]*)"/)?.[1] || "",
            tvgName: line.match(/tvg-name="([^"]*)"/)?.[1] || "",
            logo: line.match(/tvg-logo="([^"]*)"/)?.[1] || "",
            group: line.match(/group-title="([^"]*)"/)?.[1] || "Sin Grupo",
            name: line.split(/,(.*)$/)[1]?.trim() || "Canal Desconocido",
            url: "",
          };
        } else if (
          line.startsWith("http") ||
          line.startsWith("rtmp") ||
          line.startsWith("rtsp")
        ) {
          if (currentChannel.name) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {};
          }
        }
      }

      if (!extM3uFound) {
        showModal(
          "Advertencia: El archivo no comienza con #EXTM3U. Puede que no sea un archivo M3U válido.",
          true
        );
      }

      return channels;
    } catch (error) {
      console.error("Error parsing M3U:", error);
      throw error;
    } finally {
      hideLoading();
    }
  }

  async function loadM3UFromUrl(url) {
    showLoading("Cargando lista M3U desde URL...");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error de HTTP: ${response.status}`);
      const data = await response.text();
      allChannels = await parseM3U(data);
      filteredChannels = [...allChannels];
      localStorage.setItem("m3uUrl", url);
      renderChannelList();
      showModal(`Se cargaron ${allChannels.length} canales`);
    } catch (error) {
      console.error("Error al cargar M3U:", error);
      showModal(`Error al cargar M3U: ${error.message}`, true);
    } finally {
      hideLoading();
    }
  }

  function loadM3UFromFile(file) {
    showLoading("Cargando lista M3U desde archivo...");
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        allChannels = await parseM3U(data);
        filteredChannels = [...allChannels];
        renderChannelList();
        showModal(`Se cargaron ${allChannels.length} canales`);
      } catch (error) {
        console.error("Error al cargar M3U:", error);
        showModal(`Error al cargar M3U: ${error.message}`, true);
      } finally {
        hideLoading();
      }
    };

    reader.onerror = () => {
      showModal("Error al leer el archivo", true);
      hideLoading();
    };

    reader.readAsText(file);
  }

  function exportM3U() {
    if (allChannels.length === 0) {
      showModal("No hay canales para exportar", true);
      return;
    }

    let m3uContent = "#EXTM3U\n";

    allChannels.forEach((channel) => {
      m3uContent += `#EXTINF:-1 tvg-id="${channel.tvgId}" tvg-name="${channel.tvgName}" tvg-logo="${channel.logo}" group-title="${channel.group}",${channel.name}\n`;
      m3uContent += `${channel.url}\n`;
    });

    const blob = new Blob([m3uContent], { type: "application/x-mpegurl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lista_canales.m3u";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==================== FUNCIONES DE XTREAM UI ====================
  async function loadXtreamUI() {
    const serverUrl = xtreamServerUrlInput.value.trim();
    const username = xtreamUsernameInput.value.trim();
    const password = xtreamPasswordInput.value.trim();

    if (!serverUrl || !username || !password) {
      showModal("Por favor completa todos los campos", true);
      return;
    }

    showLoading("Conectando con Xtream UI...");
    try {
      // Guardar credenciales
      const credentials = { serverUrl, username, password };
      localStorage.setItem("xtreamUiCredentials", JSON.stringify(credentials));

      // Obtener categorías (grupos)
      const categoriesUrl = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_live_categories`;
      const categoriesResponse = await fetch(categoriesUrl);
      if (!categoriesResponse.ok)
        throw new Error("Error al obtener categorías");
      const categories = await categoriesResponse.json();

      // Obtener canales
      const channelsUrl = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
      const channelsResponse = await fetch(channelsUrl);
      if (!channelsResponse.ok) throw new Error("Error al obtener canales");
      const channelsData = await channelsResponse.json();

      // Transformar a formato M3U - Versión mejorada
      allChannels = channelsData.map((channel) => {
        // Crear URL alternativa en formato M3U8 si está disponible
        const m3u8Url = `${serverUrl}/live/${username}/${password}/${channel.stream_id}/index.m3u8`;
        const tsUrl = `${serverUrl}/live/${username}/${password}/${channel.stream_id}.ts`;

        return {
          tvgId: channel.epg_channel_id || "",
          tvgName: channel.name,
          logo: channel.stream_icon || "",
          group: channel.category_name || "Sin Grupo",
          name: channel.name,
          url: channel.stream_type === "live" ? m3u8Url : tsUrl, // Preferir M3U8 si es live
          backupUrl: tsUrl, // URL alternativa
        };
      });

      filteredChannels = [...allChannels];
      renderChannelList();
      showModal(`Se cargaron ${allChannels.length} canales desde Xtream UI`);
    } catch (error) {
      console.error("Error al cargar Xtream UI:", error);
      showModal(`Error al conectar con Xtream UI: ${error.message}`, true);
    } finally {
      hideLoading();
    }
  }

  // ==================== FUNCIONES DEL EPG ====================
  function parseXmltvDate(xmltvDate) {
    const year = parseInt(xmltvDate.substring(0, 4), 10);
    const month = parseInt(xmltvDate.substring(4, 6), 10) - 1;
    const day = parseInt(xmltvDate.substring(6, 8), 10);
    const hours = parseInt(xmltvDate.substring(8, 10), 10);
    const minutes = parseInt(xmltvDate.substring(10, 12), 10);
    const seconds = parseInt(xmltvDate.substring(12, 14), 10);
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  }

  async function parseXMLTV(xmlString) {
    showLoading("Procesando EPG...");
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const programmes = xmlDoc.getElementsByTagName("programme");
      const data = {};

      for (const programme of programmes) {
        const channelId = programme.getAttribute("channel");
        const start = parseXmltvDate(programme.getAttribute("start"));
        const stop = parseXmltvDate(programme.getAttribute("stop"));
        const title =
          programme.getElementsByTagName("title")[0]?.textContent ||
          "Sin título";
        const desc =
          programme.getElementsByTagName("desc")[0]?.textContent || "";

        if (!data[channelId]) {
          data[channelId] = [];
        }
        data[channelId].push({ start, stop, title, desc });
      }

      for (const channelId in data) {
        data[channelId].sort((a, b) => a.start - b.start);
      }

      return data;
    } catch (error) {
      console.error("Error parsing XMLTV:", error);
      throw error;
    } finally {
      hideLoading();
    }
  }

  async function loadEPGFromUrl(url) {
    showLoading("Cargando guía de programación (EPG)...");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Error de HTTP: ${response.status}`);
      const xmlString = await response.text();
      epgData = await parseXMLTV(xmlString);
      localStorage.setItem("epgUrl", url);
      renderChannelList();
      showModal(`EPG cargado para ${Object.keys(epgData).length} canales`);
    } catch (error) {
      console.error("Error al cargar EPG:", error);
      showModal(`Error al cargar EPG: ${error.message}`, true);
    } finally {
      hideLoading();
    }
  }

  function getCurrentAndNextProgram(channelId) {
    if (!channelId) return null;

    const programs = epgData[channelId];
    if (!programs || programs.length === 0) return null;

    const now = new Date();
    let currentProgram = null;
    let nextProgram = null;

    for (let i = 0; i < programs.length; i++) {
      if (programs[i].start <= now && programs[i].stop > now) {
        currentProgram = programs[i];
        if (i + 1 < programs.length) nextProgram = programs[i + 1];
        break;
      }
    }

    if (!currentProgram) {
      for (let i = 0; i < programs.length; i++) {
        if (programs[i].start > now) {
          nextProgram = programs[i];
          break;
        }
      }
    }

    return { now: currentProgram, next: nextProgram };
  }

  // ==================== FUNCIONES DE INTERFAZ ====================
  function renderChannels(channels, container, clickHandler) {
    container.innerHTML = "";

    if (!channels || channels.length === 0) {
      container.innerHTML =
        '<p class="no-results">No se encontraron canales</p>';
      return;
    }

    const groups = {};
    channels.forEach((channel) => {
      const groupName = channel.group || "Sin Grupo";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(channel);
    });

    Object.keys(groups)
      .sort()
      .forEach((groupName) => {
        const groupHeader = document.createElement("div");
        groupHeader.className = "group-header";
        groupHeader.innerHTML = `<i class="fas fa-folder"></i> ${groupName}`;
        container.appendChild(groupHeader);

        const groupContent = document.createElement("div");
        groupContent.className = "group-content";
        container.appendChild(groupContent);

        groups[groupName].forEach((channel, index) => {
          const channelItem = document.createElement("div");
          channelItem.className = "channel-item";
          channelItem.dataset.url = channel.url;
          channelItem.dataset.name = channel.name;
          channelItem.style.animationDelay = `${index * 0.03}s`;

          const channelInfo = document.createElement("div");
          channelInfo.className = "channel-info";
          channelInfo.innerHTML = `
            ${
              channel.logo
                ? `<img src="${channel.logo}" alt="${channel.name}" class="channel-logo" onerror="this.parentNode.innerHTML='<i class=\\'fas fa-tv channel-logo-placeholder\\'></i>${channel.name}'">`
                : `<i class="fas fa-tv channel-logo-placeholder"></i>`
            }
            <span class="channel-name">${channel.name}</span>
          `;
          channelItem.appendChild(channelInfo);

          // EPG Info
          const epgInfo = getCurrentAndNextProgram(channel.tvgId);
          if (epgInfo) {
            const epgDiv = document.createElement("div");
            epgDiv.className = "channel-epg";

            if (epgInfo.now) {
              const now = new Date();
              const progress =
                ((now - epgInfo.now.start) /
                  (epgInfo.now.stop - epgInfo.now.start)) *
                100;

              epgDiv.innerHTML += `
                <div class="epg-item">
                  <span class="epg-time">Ahora:</span>
                  <span>${epgInfo.now.title}</span>
                  <div class="epg-progress-container">
                    <div class="epg-progress" style="width: ${progress}%"></div>
                  </div>
                </div>
              `;
            }

            if (epgInfo.next) {
              const nextTime = epgInfo.next.start.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              epgDiv.innerHTML += `
                <div class="epg-item">
                  <span class="epg-time">Siguiente (${nextTime}):</span>
                  <span>${epgInfo.next.title}</span>
                </div>
              `;
            }

            channelItem.appendChild(epgDiv);
          }

          channelItem.addEventListener("click", () => {
            showLoading(`Cargando ${channel.name}...`);
            clickHandler(channel);
          });

          if (
            currentPlayingChannel &&
            currentPlayingChannel.url === channel.url
          ) {
            channelItem.classList.add("active");
          }

          groupContent.appendChild(channelItem);
        });
      });

    setupGroupToggle();
  }

  function renderChannelList() {
    renderChannels(filteredChannels, channelList, (channel) => {
      loadVideo(
        channel.url,
        channel.name,
        channel.logo,
        channel.group,
        channel.tvgId,
        channel.backupUrl // Pasar la URL alternativa
      );
    });
  }

  function renderRecentChannels() {
    renderChannels(recentChannels, recentList, (channel) => {
      loadVideo(channel.url, channel.name, channel.logo, channel.group);
    });
  }

  function setupGroupToggle() {
    document.querySelectorAll(".group-header").forEach((header) => {
      header.addEventListener("click", () => {
        const content = header.nextElementSibling;
        const isCollapsed = content.style.display === "none";

        if (isCollapsed) {
          content.style.display = "block";
          header.classList.remove("collapsed");
        } else {
          content.style.display = "none";
          header.classList.add("collapsed");
        }
      });

      // Aplicar configuración inicial
      const content = header.nextElementSibling;
      if (appSettings.expandGroupsByDefault) {
        content.style.display = "block";
        header.classList.remove("collapsed");
      } else {
        content.style.display = "none";
        header.classList.add("collapsed");
      }
    });
  }

  function addRecentChannel(channel) {
    // Eliminar si ya existe
    recentChannels = recentChannels.filter((c) => c.url !== channel.url);

    // Agregar al inicio
    recentChannels.unshift({
      url: channel.url,
      name: channel.name,
      logo: channel.logo,
      group: channel.group,
    });

    // Limitar según configuración
    recentChannels = recentChannels.slice(0, appSettings.recentChannelsLimit);
    localStorage.setItem("recentChannels", JSON.stringify(recentChannels));
    renderRecentChannels();
  }

  function clearRecentChannels() {
    recentChannels = [];
    localStorage.removeItem("recentChannels");
    renderRecentChannels();
    showModal("Canales recientes borrados");
  }

  function saveSettings() {
    appSettings = {
      autoplay: autoplayToggle.checked,
      rememberLastChannel: rememberLastChannelToggle.checked,
      volumePersistence: volumePersistenceToggle.checked,
      recentChannelsLimit: parseInt(recentChannelsLimit.value),
      expandGroupsByDefault: expandGroupsByDefault.checked,
      bufferLength: 30,
      maxBufferSize: 60,
      maxBufferLength: 30,
      volume: video.volume,
      muted: video.muted,
    };

    localStorage.setItem("appSettings", JSON.stringify(appSettings));
    showModal("Configuración guardada");
  }

  function resetSettings() {
    if (confirm("¿Estás seguro de que quieres restablecer la configuración?")) {
      localStorage.removeItem("appSettings");
      appSettings = { ...defaultSettings };

      // Actualizar UI
      autoplayToggle.checked = appSettings.autoplay;
      rememberLastChannelToggle.checked = appSettings.rememberLastChannel;
      volumePersistenceToggle.checked = appSettings.volumePersistence;
      recentChannelsLimit.value = appSettings.recentChannelsLimit;
      expandGroupsByDefault.checked = appSettings.expandGroupsByDefault;

      // Aplicar configuración
      video.volume = appSettings.volume;
      video.muted = appSettings.muted;
      updateVolumeUI();

      showModal("Configuración restablecida");
    }
  }

  function updateActiveChannel() {
    document.querySelectorAll(".channel-item").forEach((item) => {
      item.classList.remove("active");
    });

    if (currentPlayingChannel) {
      const activeElement = document.querySelector(
        `.channel-item[data-url="${CSS.escape(currentPlayingChannel.url)}"]`
      );
      if (activeElement) {
        activeElement.classList.add("active");
        activeElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  // ==================== EVENT LISTENERS ====================
  playPauseBtn.addEventListener("click", togglePlayPause);
  video.addEventListener("click", togglePlayPause);

  volumeBtn.addEventListener("click", toggleMute);
  volumeSlider.addEventListener("input", handleVolumeChange);

  progressContainer.addEventListener("click", handleProgressClick);
  progressContainer.addEventListener("mousedown", handleProgressDragStart);

  video.addEventListener("play", updateVideoControls);
  video.addEventListener("pause", updateVideoControls);
  video.addEventListener("volumechange", updateVolumeUI);
  video.addEventListener("timeupdate", updateTimeDisplay);

  fullscreenBtn.addEventListener("click", toggleFullscreen);

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;

    switch (e.key) {
      case " ":
      case "k":
        togglePlayPause();
        e.preventDefault();
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      case "ArrowLeft":
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case "ArrowRight":
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
        break;
      case "ArrowUp":
        video.volume = Math.min(1, video.volume + 0.1);
        updateVolumeUI();
        break;
      case "ArrowDown":
        video.volume = Math.max(0, video.volume - 0.1);
        updateVolumeUI();
        break;
    }
  });

  loadBtn.addEventListener("click", () => {
    const url = streamUrlInput.value.trim();
    if (url) {
      loadVideo(url, "Stream Directo");
    } else {
      showModal("Por favor ingresa una URL de stream", true);
    }
  });

  loadM3UUrlBtn.addEventListener("click", () => {
    const url = m3uUrlInput.value.trim();
    if (url) {
      loadM3UFromUrl(url);
    } else {
      showModal("Por favor ingresa una URL M3U", true);
    }
  });

  loadM3UFileBtn.addEventListener("click", () => {
    if (m3uFile.files.length > 0) {
      loadM3UFromFile(m3uFile.files[0]);
    } else {
      showModal("Por favor selecciona un archivo M3U", true);
    }
  });

  loadEpgBtn.addEventListener("click", () => {
    const url = epgUrlInput.value.trim();
    if (url) {
      loadEPGFromUrl(url);
    } else {
      showModal("Por favor ingresa una URL EPG", true);
    }
  });

  loadXtreamUiBtn.addEventListener("click", loadXtreamUI);
  exportM3UBtn.addEventListener("click", exportM3U);

  searchChannel.addEventListener("input", () => {
    const searchTerm = searchChannel.value.toLowerCase();
    if (searchTerm) {
      filteredChannels = allChannels.filter(
        (channel) =>
          channel.name.toLowerCase().includes(searchTerm) ||
          channel.group.toLowerCase().includes(searchTerm)
      );
      renderChannelList();
    } else {
      filteredChannels = [...allChannels];
      renderChannelList();
    }
  });

  // Configuración
  settingsToggle.addEventListener("click", () => {
    settingsModal.style.display = "flex";
    setTimeout(() => settingsModal.classList.add("active"), 10);
  });

  closeSettingsModal.addEventListener("click", () => {
    settingsModal.classList.remove("active");
    setTimeout(() => (settingsModal.style.display = "none"), 300);
  });

  themeToggle.addEventListener("click", toggleDarkMode);
  modalThemeToggle.addEventListener("click", toggleDarkMode);

  clearRecentChannelsBtn.addEventListener("click", clearRecentChannels);
  saveSettingsBtn.addEventListener("click", saveSettings);
  resetSettingsBtn.addEventListener("click", resetSettings);

  closeModal.addEventListener("click", hideModal);
  modalOkButton.addEventListener("click", hideModal);

  // ==================== INICIALIZACIÓN ====================
  function init() {
    // Aplicar tema oscuro si está activado
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      const icon = themeToggle.querySelector("i");
      icon.className = "fas fa-sun";
    }

    // Cargar configuración
    if (localStorage.getItem("appSettings")) {
      appSettings = JSON.parse(localStorage.getItem("appSettings"));
    } else {
      localStorage.setItem("appSettings", JSON.stringify(defaultSettings));
    }

    // Aplicar configuración
    autoplayToggle.checked = appSettings.autoplay;
    rememberLastChannelToggle.checked = appSettings.rememberLastChannel;
    volumePersistenceToggle.checked = appSettings.volumePersistence;
    recentChannelsLimit.value = appSettings.recentChannelsLimit;
    expandGroupsByDefault.checked = appSettings.expandGroupsByDefault;

    // Configurar volumen inicial
    if (appSettings.volumePersistence) {
      if (localStorage.getItem("volumeLevel")) {
        video.volume = parseFloat(localStorage.getItem("volumeLevel"));
      }
      if (localStorage.getItem("volumeMuted")) {
        video.muted = localStorage.getItem("volumeMuted") === "true";
      }
    }
    updateVolumeUI();

    // Cargar último canal si está configurado
    if (
      appSettings.rememberLastChannel &&
      localStorage.getItem("lastPlayedChannel")
    ) {
      const lastChannel = JSON.parse(localStorage.getItem("lastPlayedChannel"));
      loadVideo(
        lastChannel.url,
        lastChannel.name,
        lastChannel.logo,
        lastChannel.group,
        lastChannel.tvgId
      );
    }

    // Cargar EPG guardado
    if (localStorage.getItem("epgUrl")) {
      epgUrlInput.value = localStorage.getItem("epgUrl");
    }

    // Cargar credenciales Xtream UI
    if (localStorage.getItem("xtreamUiCredentials")) {
      const creds = JSON.parse(localStorage.getItem("xtreamUiCredentials"));
      xtreamServerUrlInput.value = creds.serverUrl;
      xtreamUsernameInput.value = creds.username;
      xtreamPasswordInput.value = creds.password;
    }

    // Renderizar listas
    renderChannelList();
    renderRecentChannels();
  }

  init();
});
