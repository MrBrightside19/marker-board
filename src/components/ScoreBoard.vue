<template>

  <div class="scoreboard-container font-digital">
    <a-button @click="openControlsInNewTab" type="primary" size="large" style="position: absolute; top: 20px; right: 20px; z-index: 1000;">
      Controles
    </a-button>
    
    <div class="team-score local-team">
      <div class="team-name">{{ localTeam }}</div>
      <div class="score">{{ goalLocal }}</div>
    </div>

    <div class="game-info">
      <div class="time">{{ formattedTime }}</div>
      <!-- <div class="period-container">
        <div class="label" style="height: 80px;">Periodo</div>
        <div class="period" style="height: 220px;">{{ gamePeriod }}</div>
      </div> -->
      <!-- <div class="penalty-container">
        <div class="label" style=" height:40px">Penalidad</div>
        <div class="penalty" style="font-size: 230px">{{ formattedPenalty }}</div>
      </div> -->
    </div>

    <div class="team-score visit-team">
      <div class="team-name">{{ visitTeam }}</div>
      <div class="score">{{ goalVisit }}</div>
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
// const gamePeriod = ref<number>(Number(localStorage.getItem("game-period") || 1));

const updateGoalLocal = () => {
  goalLocal.value = Number(localStorage.getItem("goal-local") || 0);
};
const updateGoalVisit = () => {
  goalVisit.value = Number(localStorage.getItem("goal-visit") || 0);
};
// const updateGamePeriod = () => {
//   gamePeriod.value = Number(localStorage.getItem("game-period") || 1);
// };

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
    localTeam.value = localStorage.getItem("local-team") || "Equipo Local";
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
  // window.addEventListener("storage", updateGamePeriod);
  startTimer();
  startPenalty();
  window.addEventListener("storage", syncWithStorage); // Escucha cambios en localStorage
  updateGoalLocal(); // Actualiza el valor inicial al montar la vista
  updateGoalVisit();
  // updateGamePeriod();
});

onUnmounted(() => {
  clearInterval(timerInterval);
  clearInterval(penaltyInterval);
  window.removeEventListener("storage", syncWithStorage);
  window.removeEventListener("storage", updateGoalLocal);
  window.removeEventListener("storage", updateGoalVisit);
  // window.removeEventListener("storage", updateGamePeriod);
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
// const formattedPenalty = ref(formatTime(penaltyMilliseconds.value));

watch(timeMilliseconds, (newVal) => {
  formattedTime.value = formatTime(newVal);
});

// watch(penaltyMilliseconds, (newVal) => {
//   formattedPenalty.value = formatTime(newVal);
// });
</script>

<style scoped lang="scss">
.scoreboard-container {
  position: relative;
  width: 100vw;
  height: 100vh;

}

.team-score {
  position: absolute;
  top:40%;
  text-align: center;
  min-width: 400px;
}

.local-team {
  left: 5%;
}

.visit-team {
  right: 5%;
}

.team-name {
  font-size: 150px;
  word-wrap: break-word;
  white-space: normal;
  max-width: 900px;
  display: block;
}


.score {
  font-size: 570px;
  transform: translateY(-20%);
  position: relative;
  top: 50%;
}

.game-info {
  position: absolute;
  top: -10%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.time {
  font-size:500px;
}

.period-container,
.penalty-container {
  margin-top: 5px;
}

.label {
  font-size: 90px;
}

.period,
.penalty {
  font-size: 200px;
}
</style>
