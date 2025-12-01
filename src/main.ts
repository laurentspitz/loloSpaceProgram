import './style.css'
import { App } from './App'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <canvas id="gameCanvas"></canvas>
`

new App();
