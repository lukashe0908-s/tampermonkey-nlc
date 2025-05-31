// rollup.config.js
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";

export default {
  input: "index.js", // 主入口文件
  output: {
    file: "dist/bundle.js", // 输出为一个文件
    format: "cjs", // Node.js 支持的 CommonJS 格式
  },
  plugins: [
    resolve(), // 解析 node_modules
    commonjs(), // 支持 commonjs 模块
    json(),
  ],
  external: [], // 如果你要排除某些模块（例如原生模块），可以写在这里
};
