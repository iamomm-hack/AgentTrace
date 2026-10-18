interface ApiAlertProps {
  message: string | null;
  onDismiss: () => void;
}

export function ApiAlert({ message, onDismiss }: ApiAlertProps) {
  if (!message) return null;
  return (
    <div className="api-alert" id="api-alert" role="status" hidden={!message}>
      <span className="alert-icon" aria-hidden="true">!</span>
      <div><strong id="api-alert-title">API unavailable</strong><span id="api-alert-message">{message}</span></div>
      <button className="alert-dismiss" type="button" data-action="dismiss-alert" onClick={onDismiss} aria-label="Dismiss API message">×</button>
    </div>
  );
}
