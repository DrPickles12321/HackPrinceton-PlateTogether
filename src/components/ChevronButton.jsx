// Circular week-navigation arrow. Generous 44px tap target with a soft press state.
export default function ChevronButton({ dir = 'left', onClick, disabled = false, size = 44, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title || (dir === 'left' ? 'Previous week' : 'Next week')}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        border: '1.5px solid var(--border)',
        background: '#fff',
        color: disabled ? 'var(--border-mid)' : 'var(--coral)',
        fontSize: Math.round(size * 0.5),
        lineHeight: 1,
        fontWeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: '0 2px 8px rgba(39,23,6,0.08)',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease',
        padding: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.92)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#fff' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--coral-light)' }}
      onBlur={e => { e.currentTarget.style.background = '#fff' }}
    >
      <span style={{ display: 'block', marginTop: -2 }}>{dir === 'left' ? '‹' : '›'}</span>
    </button>
  )
}
