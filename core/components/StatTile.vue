<script setup>
// Small glass tile used by the system-stat widgets. Self-contained styling so
// it renders correctly when mounted inside the hub (no external widget.css).
// Defines theme tokens (--stat-*) that cascade into StatBar / StatRing.
defineProps({
  title:  { type: String, required: true },
  accent: { type: String, default: '#818cf8' },
  dark:   { type: Boolean, default: true },
})
</script>

<template>
  <div class="stat-tile" :class="{ light: !dark }">
    <div class="stat-head">
      <span class="stat-dot" :style="{ background: accent, color: accent }" />
      <span class="stat-title">{{ title }}</span>
      <span class="stat-meta"><slot name="meta" /></span>
    </div>
    <div class="stat-body"><slot /></div>
  </div>
</template>

<style scoped>
.stat-tile {
  /* Dark theme tokens (default) */
  --stat-bg: rgba(12, 12, 24, 0.82);
  --stat-border: rgba(255, 255, 255, 0.09);
  --stat-shadow: 0 14px 44px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.04) inset;
  --stat-text: #fff;
  --stat-dim: rgba(255, 255, 255, 0.55);
  --stat-title: rgba(255, 255, 255, 0.62);
  --stat-track: rgba(255, 255, 255, 0.09);

  width: 178px;
  background: var(--stat-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--stat-border);
  border-radius: 16px;
  padding: 12px 13px;
  box-shadow: var(--stat-shadow);
  color: var(--stat-text);
  line-height: normal;
}
.stat-tile.light {
  --stat-bg: rgba(255, 255, 255, 0.74);
  --stat-border: rgba(15, 23, 42, 0.1);
  --stat-shadow: 0 14px 44px rgba(15, 23, 42, 0.16), 0 0 0 0.5px rgba(255, 255, 255, 0.7) inset;
  --stat-text: #0f172a;
  --stat-dim: rgba(15, 23, 42, 0.55);
  --stat-title: rgba(15, 23, 42, 0.55);
  --stat-track: rgba(15, 23, 42, 0.1);
}
.stat-head { display: flex; align-items: center; gap: 7px; margin-bottom: 11px; }
.stat-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
.stat-title {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--stat-title);
}
.stat-meta { margin-left: auto; font-size: 10px; color: var(--stat-dim); }
.stat-body { display: flex; flex-direction: column; gap: 9px; }
</style>
