<script setup lang="ts">
import {ref} from 'vue';
import axios from "axios";

const manage = ref<HTMLDivElement>();
axios.get('/user_login_request').then(
  res => {
    console.log('res', res)
  }
).catch(e => console.log(e))

interface ImgUrlArr {
  name: string
}

const img_url_arr = ref<ImgUrlArr[]>([{"name": "1"}, {"name": "2"}]);
axios.get('/get_image_url')
  .then(
    res => {
      img_url_arr.value = res.data
      console.log('res', res.data)
    }
  ).catch(e => console.log(e))

</script>

<template>
  <div ref="manage">manage</div>
  <div class="show_img">
    <div v-for="item in img_url_arr" :key="item.name">
      <img :src="'https://image.unrose.com/file/'+item.name" alt="">
    </div>
  </div>
</template>

<style scoped>
.show_img {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

img {
  max-width: 100%;
  height: auto;
}
</style>
