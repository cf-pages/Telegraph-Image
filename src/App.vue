<script lang="ts">
export default {
  name: 'TestPerson1'
}
</script>

<script lang="ts" setup>
import IndexNavigate from "@/pages/IndexNavigate.vue";
import {RouterView} from "vue-router";

</script>

<template>
  <IndexNavigate></IndexNavigate>
  <RouterView></RouterView>
</template>

<style scoped>

</style>
