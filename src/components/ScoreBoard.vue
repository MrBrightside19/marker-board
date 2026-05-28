<template>

  <div class="scoreboard-container font-digital">
    <a-button
      @click="openControlsInNewTab"
      type="primary"
      size="large"
      class="controls-button"
    >
      Controles
    </a-button>

    <div class="scoreboard-stage">
      <div class="scoreboard-content">
        <div class="team-score local-team">
          <div class="team-name">{{ localTeam }}</div>
          <div class="score">{{ goalLocal }}</div>
        </div>

        <div class="game-info">
          <div class="time">{{ formattedTime }}</div>
          <div class="period-container">
            <div class="label">Periodo</div>
            <div class="period">{{ gamePeriod }}</div>
          </div>
          <div class="penalty-container">
            <div class="label penalty-label">Penalidad</div>
            <div class="penalty">{{ formattedPenalty }}</div>
          </div>
        </div>

        <div class="team-score visit-team">
          <div class="team-name">{{ visitTeam }}</div>
          <div class="score">{{ goalVisit }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

const router = useRouter();

const openControlsInNewTab = () => {
  const route = router.resolve('/controls');
  const width = 800;
  const height = 600;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
  window.open(route.href, 'controlsWindow', features);
};

const localTeam = ref(localStorage.getItem("local-team") || "Equipo Local");
const visitTeam = ref(localStorage.getItem("visit-team") || "Equipo Visita");
const goalLocal = ref<number>(Number(localStorage.getItem("goal-local") || 0));
const goalVisit = ref<number>(Number(localStorage.getItem("goal-visit") || 0));
const gamePeriod = ref<number>(Number(localStorage.getItem("game-period") || 1));

const updateGoalLocal = () => {
  goalLocal.value = Number(localStorage.getItem("goal-local") || 0);
};
const updateGoalVisit = () => {
  goalVisit.value = Number(localStorage.getItem("goal-visit") || 0);
};
const updateGamePeriod = () => {
  gamePeriod.value = Number(localStorage.getItem("game-period") || 1);
};

const timeString = ref<string>(localStorage.getItem("time-game") || "20:00");
const timeMilliseconds = ref<number>(convertToMilliseconds(timeString.value));
let timerInterval: any = null;

const penaltyString = ref<string>(localStorage.getItem("penalty-game") || "0:00");
const penaltyMilliseconds = ref<number>(convertToMilliseconds(penaltyString.value));
let penaltyInterval: any = null;

const isPaused = ref(localStorage.getItem("isPaused") === "true");

// 🕐 Función que inicia el temporizador
const startTimer = () => {
  clearInterval(timerInterval); // Limpia cualquier temporizador previo

  timerInterval = setInterval(() => {
    if (!isPaused.value) {
      // 🔴 SOLO RESTA TIEMPO SI NO ESTÁ EN PAUSA
      timeMilliseconds.value -= 1000;
      if (timeMilliseconds.value <= 0) {
        clearInterval(timerInterval);
        timeMilliseconds.value = 0;
      }
      localStorage.setItem("time-game", formatTime(timeMilliseconds.value));
    }
  }, 1000);
};
const startPenalty = () => {
  clearInterval(penaltyInterval); // Limpia cualquier temporizador previo

  penaltyInterval = setInterval(() => {
    if (!isPaused.value) {
      // 🔴 SOLO RESTA TIEMPO SI NO ESTÁ EN PAUSA
      penaltyMilliseconds.value -= 1000;
      if (penaltyMilliseconds.value <= 0) {
        clearInterval(penaltyInterval);
        penaltyMilliseconds.value = 0;
      }
      localStorage.setItem("penalty-game", formatTime(penaltyMilliseconds.value));
    }
  }, 1000);
};

// 🔄 Detecta cambios en localStorage (para actualizar el temporizador si se reinicia)
const syncWithStorage = (event: StorageEvent) => {
  if (event.key === "time-game") {
    timeString.value = localStorage.getItem("time-game") || "20:00";
    timeMilliseconds.value = convertToMilliseconds(timeString.value);
    startTimer(); // Reinicia el temporizador con el nuevo tiempo
  }
  if (event.key === "penalty-game") {
    penaltyString.value = localStorage.getItem("penalty-game") || "00:00";
    penaltyMilliseconds.value = convertToMilliseconds(penaltyString.value);
    startPenalty(); // Reinicia el temporizador con el nuevo tiempo
  }
  if (event.key === "local-team") {
    localTeam.value = localStorage.getItem("local-team") || "";
  }
  if (event.key === "visit-team") {
    visitTeam.value = localStorage.getItem("visit-team") || "Equipo Visita";
  }
  if (event.key === "isPaused") {
    isPaused.value = localStorage.getItem("isPaused") === "true";
    if (isPaused.value) {
      clearInterval(timerInterval);
      clearInterval(penaltyInterval);
    } else {
      startTimer();
      startPenalty();
    }
  }
};

onMounted(() => {
  document.title = "Marcador";

  window.addEventListener("storage", updateGoalLocal);
  window.addEventListener("storage", updateGoalVisit);
  window.addEventListener("storage", updateGamePeriod);
  startTimer();
  startPenalty();
  window.addEventListener("storage", syncWithStorage); // Escucha cambios en localStorage
  updateGoalLocal(); // Actualiza el valor inicial al montar la vista
  updateGoalVisit();
  updateGamePeriod();
});

onUnmounted(() => {
  clearInterval(timerInterval);
  clearInterval(penaltyInterval);
  window.removeEventListener("storage", syncWithStorage);
  window.removeEventListener("storage", updateGoalLocal);
  window.removeEventListener("storage", updateGoalVisit);
  window.removeEventListener("storage", updateGamePeriod);
});

// 📌 Convertir "mm:ss" a milisegundos
function convertToMilliseconds(timeString: string): number {
  const [minutes, seconds] = timeString.split(":").map(Number);
  return dayjs.duration({ minutes, seconds }).asMilliseconds();
}

// 📌 Convertir milisegundos a "mm:ss"
function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// 📌 Formato del tiempo a mostrar en pantalla
const formattedTime = ref(formatTime(timeMilliseconds.value));
const formattedPenalty = ref(formatTime(penaltyMilliseconds.value));

watch(timeMilliseconds, (newVal) => {
  formattedTime.value = formatTime(newVal);
});

watch(penaltyMilliseconds, (newVal) => {
  formattedPenalty.value = formatTime(newVal);
});
</script>

<style scoped lang="scss">
.scoreboard-container {
  display: grid;
  place-items: center;
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  color: #fff;
}

.controls-button {
  position: absolute;
  top: clamp(8px, 2vh, 20px);
  right: clamp(8px, 2vh, 20px);
  z-index: 1000;
}

.scoreboard-stage {
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  position: relative;
  container-type: size;
}

.scoreboard-content {
  position: absolute;
  inset: 0;
}

.team-score {
  position: absolute;
  top: 42%;
  text-align: center;
  min-width: 16cqw;
  max-width: 42cqw;
}

.local-team {
  left: 4%;
}

.visit-team {
  right: 4%;
}

.team-name {
  font-size: clamp(18px, 10.4cqh, 220px);
  word-wrap: break-word;
  white-space: normal;
  max-width: 38cqw;
  display: block;
  line-height: 1.05;
  margin-bottom: clamp(8px, 3.5cqh, 50px);

}


.score {
  font-size: clamp(70px, 39.5cqh, 760px);
  transform: translateY(-20%);
  position: relative;
  top: 50%;
  line-height: 0.9;
}

.game-info {
  position: absolute;
  top: 1%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  width: 48cqw;
}

.time {
  font-size: clamp(64px, 34.5cqh, 700px);
  line-height: 0.9;
}

.period-container,
.penalty-container {
  margin-top: clamp(2px, 0.35cqh, 10px);
}

.label {
  font-size: clamp(14px, 6.25cqh, 130px);
  line-height: 1;
}

.period-container .label {
  min-height: clamp(18px, 5.55cqh, 90px);
}

.penalty-label {
  min-height: clamp(12px, 2.77cqh, 50px);
}

.period,
.penalty {
  font-size: clamp(24px, 13.9cqh, 340px);
  line-height: 0.95;
}
</style>
