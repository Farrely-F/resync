/**
 * Bundler `?raw` imports used by tests to load recorded HTML fixtures verbatim.
 */
declare module "*.html?raw" {
  const content: string;
  export default content;
}
