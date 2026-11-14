import { init } from './store.js';
import { renderHome } from './home.js';
import { renderRent } from './rent.js';
import { renderKey } from './key.js';
import { renderReturn } from './return.js';

// 해시 형식: #/화면?이름=값  (예: #/rent?equipment=hdmi-gender-c)
// 화면 함수가 null을 돌려주면 그 화면을 보여 줄 조건이 안 된 것이라 홈으로 보낸다.
const routes = {
  '/home': renderHome,
  '/rent': renderRent,
  '/key': renderKey,
  '/return': renderReturn,
};

const app = document.getElementById('app');

function render() {
  const [path, query = ''] = location.hash.slice(1).split('?');
  const view = routes[path]?.(new URLSearchParams(query));
  if (!view) {
    location.replace('#/home'); // 주소의 ?locker= 쿼리는 그대로 남는다
    return;
  }
  app.replaceChildren(view);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);

try {
  await init();
  render();
} catch (err) {
  app.textContent = `데이터를 불러오지 못했습니다. ${err.message}`;
}
