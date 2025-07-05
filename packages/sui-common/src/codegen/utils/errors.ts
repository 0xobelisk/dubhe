export class NotInsideProjectError extends Error {
  name = 'NotInsideProjectError';
  message = 'You are not inside a Dubhe project';
}
