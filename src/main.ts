import './style.css';
import { App } from './App';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Root element #app not found');
}

new App(root).mount();
