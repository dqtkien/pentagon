import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'build',
    preserveModules: false, // If will build to a single index.js file if it 'false'
    sourcemap: true,
  },
  plugins: [
    alias({
      entries: [
        { find: '@', replacement: 'src' },
        { find: '@data', replacement: 'src/data' },
        { find: '@helper', replacement: 'src/helper' },
      ],
    }),
    typescript({ sourceMap: true, tsconfig: 'tsconfig.json' }),
  ],
};
