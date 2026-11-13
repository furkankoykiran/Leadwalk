<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </template>
    <template v-else-if="name === 'list'">
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </template>
    <template v-else-if="name === 'map'">
      <path d="M9 20l-6 2V6l6-2m0 16l6 2m-6-2V4m6 18l6-2V4l-6 2m0 14V6" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" />
    </template>
    <template v-else-if="name === 'phone'">
      <path d="M4.5 4h2.7c.5 0 .9.3 1 .8l.9 3c.1.4 0 .9-.3 1.2L7.6 10.2c1 2.2 2.9 4.1 5.1 5.1l1.2-1.2c.3-.3.8-.4 1.2-.3l3 .9c.5.1.8.5.8 1v2.7c0 1.1-1 2-2.1 1.9C10.2 19.6 4.4 13.8 3.6 7.1 3.5 6 4.4 5 5.5 5" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m2 0l-.7 12.1a2 2 0 01-2 1.9H8.7a2 2 0 01-2-1.9L6 7h12z" />
    </template>
    <template v-else-if="name === 'sparkles'">
      <path d="M12 3l1.4 4.1L17.5 8.5 13.4 9.9 12 14l-1.4-4.1L6.5 8.5l4.1-1.4L12 3z" />
      <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </template>
    <template v-else-if="name === 'currency'">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9.3c0-1.1 1.3-1.9 3-1.9s3 .8 3 1.9-1.3 1.4-3 1.9-3 .8-3 1.9 1.3 1.9 3 1.9 3-.8 3-1.9M12 5.8v1.4M12 16.8v1.4" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12M18 6L6 18" />
    </template>
    <template v-else-if="name === 'star'">
      <path d="M12 3.5l2.6 5.6 6.1.6-4.5 4.1 1.3 6-5.5-3.1-5.5 3.1 1.3-6-4.5-4.1 6.1-.6L12 3.5z" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="M6 9l6 6 6-6" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </template>
    <template v-else-if="name === 'food'">
      <path d="M7 3v6.5a1.5 1.5 0 003 0V3M8.5 9.5V21M17 3c-1.4 0-2.5 2.1-2.5 5s1.1 5 2.5 5m0-10v16" />
    </template>
    <template v-else-if="name === 'lodging'">
      <path d="M3 19V6m0 6.5h18V19M3 12V9.5a2 2 0 012-2h6a2 2 0 012 2V12m7 0V9.5a2 2 0 00-2-2h-3" />
      <circle cx="7" cy="8.2" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'venue'">
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </template>
    <template v-else-if="name === 'shopping'">
      <path d="M6 8h12l-1 12a2 2 0 01-2 2H9a2 2 0 01-2-2L6 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </template>
    <template v-else-if="name === 'health'">
      <path d="M20.8 8.6a5.5 5.5 0 00-9.3-4 5.5 5.5 0 00-9.3 4.4c0 6 9.3 11 9.3 11s9.3-5 9.3-11c0-.14 0-.27-.01-.4z" />
      <path d="M9 12h5M11.5 9.5v5" />
    </template>
    <template v-else-if="name === 'briefcase'">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12.5h18" />
    </template>
    <template v-else-if="name === 'wrench'">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z" />
    </template>
    <template v-else-if="name === 'home'">
      <path d="M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5" />
    </template>
    <template v-else-if="name === 'route'">
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H15a3 3 0 000-6H9a3 3 0 010-6h6.8" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M4.5 19.5h15" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </template>
    <template v-else-if="name === 'calendar'">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </template>
    <template v-else-if="name === 'note'">
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M15 4v4h4M8.5 12.5h7M8.5 16h5" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </template>
    <template v-else-if="name === 'message'">
      <path d="M4 19.5l1.3-3.8A8 8 0 1112 20a8 8 0 01-3.9-1z" />
      <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" />
    </template>
    <template v-else-if="name === 'navigation'">
      <path d="M4 11l16-7-7 16-2-7-7-2z" />
    </template>
    <template v-else-if="name === 'external'">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
    </template>
    <template v-else-if="name === 'flame'">
      <path d="M12 21c-3.9 0-7-2.7-7-6.6 0-3 2-5.2 3.6-6.8.4 1.6 1.4 2.8 2.6 3.3 0-3.2 1.5-6 4.3-7.9-.4 2.8.8 4.6 2.2 6.2C19.2 10.8 19 12.5 19 14.4 19 18.3 15.9 21 12 21z" />
    </template>
    <template v-else-if="name === 'language'">
      <path d="M4 5h8M8 3v2M5.5 5c.5 3.5 3 6.5 6 8M10.5 5c-.5 3-3 6.5-6.5 8" />
      <path d="M12.5 21l4-9 4 9M14 17.5h5" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'layers'">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </template>
    <template v-else>
      <path d="M4 21V9l8-6 8 6v12M9 21v-7h6v7" />
    </template>
  </svg>
</template>
