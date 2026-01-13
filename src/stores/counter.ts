// stores/counter.js
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
    // count: localStorage.getItem('count') ? parseInt(localStorage.getItem('count')) : 0
  }),
  actions: {
    increment(value:number) {
      this.count++
      // localStorage.setItem('count', this.count)
    }
  }
})