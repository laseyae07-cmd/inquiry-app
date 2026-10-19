export default function StatusBadge({ status }) {
  // "In Progress" becomes "In-Progress" so it works as a CSS class name
  return <span className={`badge ${status.replace(' ', '-')}`}>{status}</span>;
}