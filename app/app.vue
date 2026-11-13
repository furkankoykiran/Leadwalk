<script setup lang="ts">
import { BRAND } from '#shared/brand'

// Pages that set their own title render as "<page> · Leadwalk". Lives here,
// not in nuxt.config: config head values must be serialisable.
useHead({ titleTemplate: title => (title ? `${title} · ${BRAND.name}` : BRAND.name) })
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ConfirmDialog />
</template>
