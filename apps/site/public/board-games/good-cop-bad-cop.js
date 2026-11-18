// 独立版不含这款游戏：保留同名导出，让共用的大厅脚本照常加载。
export const COP_ID = 'good-cop-bad-cop';
const noop = () => null;
export const createCopViews = () => new Proxy({}, { get: () => noop });
