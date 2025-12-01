import './style.css'
import { Game } from './Game';

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <canvas id="gameCanvas"></canvas>
`

new Game();
