<template>
  <router-view />
</template>

<style>
/* Global resets */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Leaflet popup styling */
.kinshasa-popup .leaflet-popup-content-wrapper {
  border-radius: 8px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
}

.kinshasa-popup .leaflet-popup-content {
  margin: 0;
}

.popup-inner {
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
}

.popup-inner h3 {
  margin: 0 0 6px;
  font-size: 15px;
  color: #1a1a2e;
}

.popup-cluster {
  display: inline-block;
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  border-radius: 4px;
  padding: 1px 6px;
  margin-bottom: 6px;
}

.popup-inner table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.popup-inner td {
  padding: 2px 6px;
}

.popup-inner tr.current {
  background: #e3f2fd;
  font-weight: 600;
}
</style>
