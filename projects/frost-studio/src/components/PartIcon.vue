<script setup lang="ts">
defineProps<{ category?: string }>();
</script>
<template>
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <g v-if="['机箱', '电源', '冰箱'].includes(category ?? '')">
      <rect x="14" y="7" width="36" height="50" rx="4" />
      <path d="M21 14h22M21 49h22M45 26v12" />
      <circle cx="31" cy="26" r="7" />
      <circle cx="31" cy="43" r="7" />
    </g>
    <g v-else-if="['显示器', '电视', '笔记本'].includes(category ?? '')">
      <rect x="6" y="10" width="52" height="34" rx="3" />
      <path d="M7 38h50M32 44v10m-12 0h24" />
    </g>
    <g v-else-if="['内存', '固态', '显卡', '键盘'].includes(category ?? '')">
      <rect x="5" y="21" width="54" height="24" rx="3" />
      <path d="M11 27h42M11 33h42M15 40v5m8-5v5m8-5v5m8-5v5m8-5v5" />
    </g>
    <g v-else-if="category === '鼠标'">
      <rect x="18" y="8" width="28" height="48" rx="14" />
      <path d="M32 8v18m-13 0h26" />
    </g>
    <g v-else-if="category === '风扇' || category === '散热'">
      <rect x="7" y="7" width="50" height="50" rx="5" />
      <circle cx="32" cy="32" r="20" />
      <circle cx="32" cy="32" r="5" />
      <path
        d="M32 27q-18-13-17 0m22 5q13-18 0-17M32 37q18 13 17 0m-22-5q-13 18 0 17"
      />
    </g>
    <g v-else-if="['桌子', '床', '沙发', '椅子'].includes(category ?? '')">
      <path
        d="M7 35h50v10H7zM13 45v12m38-12v12M12 35V16q20-8 40 0v19M27 16v19M37 16v19"
      />
    </g>
    <g v-else>
      <rect x="16" y="16" width="32" height="32" rx="4" />
      <rect x="23" y="23" width="18" height="18" rx="2" />
      <path
        d="M24 6v10m8-10v10m8-10v10M24 48v10m8-10v10m8-10v10M6 24h10M6 32h10M6 40h10m32-16h10M48 32h10M48 40h10"
      />
    </g>
  </svg>
</template>
