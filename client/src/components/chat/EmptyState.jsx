import "../../styles/EmptyState.scss";

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🤖</div>

      <h1>YordamAI</h1>

      <p>
        Savolingizni yozing. Men sizga yordam berishga tayyorman.
      </p>
    </div>
  );
}

export default EmptyState;