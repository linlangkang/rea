<script setup lang="ts">
defineProps<{ category?: string }>();
// Small, local outline icons keep the catalogue independent of font glyphs and icon runtimes.
const paths: Record<string, string> = {
  CPU: "M7 7h10v10H7zM9 2v5m6-5v5M9 17v5m6-5v5M2 9h5m-5 6h5m10-6h5m-5 6h5",
  显卡: "M3 6h18v11H3zM6 17v3m3-3v3M9 9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5m7 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5",
  主板: "M4 3h16v18H4zM8 7h6v6H8zM17 6v9M7 17h10",
  内存: "M3 7h18v9H3zM6 16v3m4-3v3m4-3v3m4-3v3M7 10v3m5-3v3m5-3v3",
  固态: "M5 3h14v18H5zM9 7h6v5H9zM8 17h8",
  电源: "M3 5h18v14H3zM10 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8m8 0v8",
  散热: "M5 4h14v16H5zM8 7v10m4-10v10m4-10v10M2 8h3m14 8h3",
  风扇: "M3 3h18v18H3zM12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6m0-4v4m0 6v4m-7-7h4m6 0h4",
  灯带: "M3 7h18v10H3zM7 11v2m5-2v2m5-2v2",
  机箱: "M5 2h14v20H5zM8 5h8m-8 4h8m-4 8h.01",
  显示器: "M2 4h20v13H2zM12 17v4m-5 0h10",
  笔记本: "M5 4h14v12H5zM2 20l3-4h14l3 4H2z",
  键盘: "M2 6h20v12H2zM6 10h.01m4 0h.01m4 0h.01m4 0h.01M7 14h10",
  鼠标: "M6 8a6 6 0 0 1 12 0v8a6 6 0 0 1-12 0V8zm6-6v8M6 10h12",
  耳机: "M4 14V10a8 8 0 0 1 16 0v4M3 12h4v8H3zm14 0h4v8h-4z",
  桌子: "M2 6h20v3H2zM5 9v12m14-12v12",
  椅子: "M7 3h10v10H7zM5 13h14v4H5zM12 17v5m-6 0h12M3 10v7m18-7v7",
  线材: "M3 4v4a4 4 0 0 0 8 0V5a4 4 0 0 1 8 0v15M1 2h4m12 20h4",
  扩展坞: "M2 7h20v10H2zM6 11h3v2H6zm7 0h5",
  床: "M3 8v13m18-13v13M3 18h18M3 11h18v7M6 7h5v4H6zm7 0h5v4h-5z",
  沙发: "M5 12V6h14v6M2 11h4v8H2zm16 0h4v8h-4zM6 15h12M5 19v3m14-3v3",
  电视: "M2 4h20v14H2zM8 21l4-3 4 3",
  冰箱: "M5 2h14v20H5zM5 9h14M8 5v2m0 5v4",
};
</script>
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[category ?? ''] ?? paths['机箱']" />
  </svg>
</template>
