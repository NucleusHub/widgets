import { createRouter, createWebHistory } from 'vue-router'
import SpotifyView from '@/views/SpotifyView.vue'

export default createRouter({
  history: createWebHistory('/spotify/'),
  routes: [
    { path: '/', component: SpotifyView },
  ],
})
