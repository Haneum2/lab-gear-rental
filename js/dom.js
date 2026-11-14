// h('p', { className: 'x' }, '글자', 다른요소) 형태로 요소를 만든다.
export const h = (tag, props = {}, ...children) => {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...children);
  return el;
};
