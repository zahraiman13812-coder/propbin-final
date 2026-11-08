// Match Next.js environment loading for standalone database commands.
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
