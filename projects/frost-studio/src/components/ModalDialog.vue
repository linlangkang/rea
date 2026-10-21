<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onUnmounted } from "vue";
const props = defineProps<{ label: string; returnFocus?: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
let previous: HTMLElement | null = null;
let overflow = "";
onMounted(() => {
  previous =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  overflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  dialog.value?.showModal();
});
onBeforeUnmount(() => {
  dialog.value?.close();
  document.body.style.overflow = overflow;
});
onUnmounted(() => {
  const restore =
    (props.returnFocus
      ? document.querySelector<HTMLElement>(props.returnFocus)
      : null) ??
    previous
      ?.closest("details:not([open])")
      ?.querySelector<HTMLElement>("summary") ??
    previous;
  if (restore?.isConnected) restore.focus();
});
function backdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return;
  const bounds = dialog.value.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    emit("close");
}
function keydown(event: KeyboardEvent) {
  if (event.key !== "Tab" || !dialog.value) return;
  const items = Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      "button,input,select,textarea,a[href],[tabindex]",
    ),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      element.getClientRects().length > 0,
  );
  const first = items[0],
    last = items.at(-1);
  if (!first || !last) {
    event.preventDefault();
    dialog.value.focus();
    return;
  }
  if (
    event.shiftKey &&
    (document.activeElement === first ||
      document.activeElement === dialog.value)
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="label"
    aria-modal="true"
    @cancel.prevent="emit('close')"
    @click="backdrop"
    @keydown="keydown"
  >
    <slot />
  </dialog>
</template>

<style scoped>
dialog {
  color: inherit;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
  margin: auto;
  overscroll-behavior: contain;
}
dialog::backdrop {
  background: #17171c66;
}
</style>
