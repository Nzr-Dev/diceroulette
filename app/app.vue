<template>
  <UApp>
    <!-- Adds the manifest link and registers the service worker (installable, works offline). -->
    <NuxtPwaManifest />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
