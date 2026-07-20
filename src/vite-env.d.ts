/// <reference types="vite/client" />
/// <reference types="tampermonkey" />

declare module "*.css?raw" {
  const content: string;
  export default content;
}
