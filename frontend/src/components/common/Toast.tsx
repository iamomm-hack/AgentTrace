export function Toast({ message }: { message: string | null }) {
  return <div className="toast" id="toast" role="status" aria-live="polite" hidden={!message}>{message}</div>;
}
