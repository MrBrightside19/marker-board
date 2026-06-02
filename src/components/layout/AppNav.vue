<template>
  <nav class="app-nav" aria-label="Navegación principal">
    <router-link to="/" class="nav-brand">Marcador Deportivo</router-link>

    <div class="nav-links">
      <template v-for="item in visibleItems" :key="item.key">
        <a
          v-if="item.openInNewTab"
          :href="resolveHref(item)"
          class="nav-link"
          target="_blank"
          rel="noopener noreferrer"
          @click.prevent="openInNewTab(item)"
        >
          {{ item.label }}
        </a>
        <router-link
          v-else
          :to="item.to"
          class="nav-link"
          :class="{ active: isActive(item) }"
        >
          {{ item.label }}
        </router-link>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { getStoredActiveMatchId } from "../../utils/activeMatch";
import {
  openBasketballBoardInNewTab,
  openBasketballControlsInNewTab,
  openHockeyBoardInNewTab,
  openHockeyControlsInNewTab,
} from "../../utils/operatorWindows";
import {
  boardRoute,
  controlsRoute,
  basketballBoardRoute,
  basketballControlsRoute,
} from "../../utils/routes";

type NavItem = {
  key: string;
  label: string;
  to: RouteLocationRaw;
  organizerOnly?: boolean;
  openInNewTab?: boolean;
};

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

onMounted(() => {
  void auth.init();
});

const visibleItems = computed((): NavItem[] => {
  const items: NavItem[] = [
    { key: "home", label: "Inicio", to: { path: "/" } },
    { key: "tournaments", label: "Torneos", to: { path: "/tournaments" }, organizerOnly: true },
  ];

  if (auth.isOrganizer) {
    const matchId = getStoredActiveMatchId();
    items.push(
      {
        key: "board",
        label: "Marcador TV",
        to: boardRoute(matchId ?? undefined),
        organizerOnly: true,
        openInNewTab: true,
      },
      {
        key: "controls",
        label: "Controles",
        to: controlsRoute(matchId ?? undefined),
        organizerOnly: true,
        openInNewTab: true,
      },
      {
        key: "basketball-board",
        label: "Marcador Básquet",
        to: basketballBoardRoute(matchId ?? undefined),
        organizerOnly: true,
        openInNewTab: true,
      },
      {
        key: "basketball-controls",
        label: "Controles Básquet",
        to: basketballControlsRoute(matchId ?? undefined),
        organizerOnly: true,
        openInNewTab: true,
      }
    );
  }

  return items.filter((item) => !item.organizerOnly || auth.isOrganizer);
});

function resolveHref(item: NavItem): string {
  return router.resolve(item.to).href;
}

function openInNewTab(item: NavItem) {
  const matchId = getStoredActiveMatchId() ?? undefined;
  switch (item.key) {
    case "board":
      openHockeyBoardInNewTab(router, matchId);
      break;
    case "controls":
      openHockeyControlsInNewTab(router, matchId);
      break;
    case "basketball-board":
      openBasketballBoardInNewTab(router, matchId);
      break;
    case "basketball-controls":
      openBasketballControlsInNewTab(router, matchId);
      break;
    default:
      window.open(resolveHref(item), "_blank", "noopener,noreferrer");
  }
}

function isActive(item: NavItem): boolean {
  const path = typeof item.to === "string" ? item.to : item.to.path ?? "";
  if (path === "/") return route.path === "/";
  return route.path === path || route.path.startsWith(`${path}/`);
}
</script>

<style scoped>
.app-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 20px;
  padding: 12px clamp(16px, 4vw, 48px);
  background: #141414;
  border-bottom: 1px solid #303030;
}

.nav-brand {
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  text-decoration: none;
  white-space: nowrap;
}

.nav-brand:hover {
  color: #69b1ff;
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 4px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.nav-link.active {
  color: #fff;
  background: #1677ff;
}
</style>
