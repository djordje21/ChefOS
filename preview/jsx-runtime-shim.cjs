// Automatic JSX runtime on top of the React UMD global (props.children is honoured by createElement).
const R = window.React;
const jsx = (type, props, key) => R.createElement(type, key === undefined ? props : { ...props, key });
module.exports = { jsx, jsxs: jsx, Fragment: R.Fragment };
